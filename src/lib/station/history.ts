/* Historique de la station (étape 6 de routine-station) : les échantillons de 5 min, rangés dans la
 * table `station_samples` d'une base Postgres (Supabase, Francfort), côté serveur seulement.
 * Contrat : section « Historique : les échantillons » de docs/protocol.md (dépôt routine-station).
 *
 * Connexion : STATION_DB_POSTGRES_URL, l'adresse « poolée » (port 6543, mode transaction), adaptée
 * aux fonctions Vercel ; dans ce mode, pas de requêtes préparées (`prepare: false`). Les clés
 * Supabase ne servent pas : la table a la RLS activée sans règle, seul ce serveur y accède. */
import postgres from 'postgres';

export interface Sample {
  /** Début de la tranche de 5 min, ISO 8601 UTC à heure ronde (2026-10-09T10:05:00Z) */
  time: string;
  temperature_c: number;
  light_pct: number;
}

let sql: postgres.Sql | null = null;

/** Le client Postgres, créé au premier appel et réutilisé tant que la fonction reste chaude ; null
 *  si l'adresse de la base manque. */
export function database(): postgres.Sql | null {
  const url = import.meta.env.STATION_DB_POSTGRES_URL;
  if (!url) return null;
  if (!sql) {
    // On ne garde de l'adresse que l'hôte, le compte et la base : les paramètres ajoutés par
    // l'intégration Vercel (sslmode, supa…) ne sont pas tous compris par la bibliothèque, et le
    // chiffrement est imposé ci-dessous.
    const clean = new URL(url);
    clean.search = '';
    sql = postgres(clean.toString(), {
      prepare: false, // mode transaction du pooler
      ssl: 'require', // connexion chiffrée (le certificat du pooler Supabase n'est pas signé par une autorité publique)
      max: 1, // une fonction traite une requête à la fois
      connect_timeout: 5,
      idle_timeout: 20,
    });
  }
  return sql;
}

const SLOT_MS = 5 * 60 * 1000;
const MAX_FUTURE_MS = 5 * 60 * 1000;
const MAX_PAST_MS = 7 * 24 * 3600 * 1000;
// Heure ronde de 5 min, en UTC, secondes à zéro : 2026-10-09T10:05:00Z
const SLOT_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/;

export type SampleCheck = { ok: true; sample: Sample } | { ok: false; error: string };

/** Valide un échantillon reçu d'EMQX, strictement (rien d'autre que les trois champs prévus). */
export function checkSample(input: unknown, now = Date.now()): SampleCheck {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return { ok: false, error: 'invalid_sample' };
  const s = input as Record<string, unknown>;
  const keys = Object.keys(s);
  if (keys.length !== 3 || !['time', 'temperature_c', 'light_pct'].every((k) => k in s)) {
    return { ok: false, error: 'invalid_fields' };
  }

  const { time, temperature_c: t, light_pct: light } = s;
  if (typeof time !== 'string' || !SLOT_TIME.test(time)) return { ok: false, error: 'invalid_time' };
  const ms = Date.parse(time);
  // Date réelle (pas de 30 février) et tranche de 5 min exacte
  if (Number.isNaN(ms) || new Date(ms).toISOString() !== time.replace('Z', '.000Z') || ms % SLOT_MS !== 0) {
    return { ok: false, error: 'invalid_time' };
  }
  if (ms > now + MAX_FUTURE_MS) return { ok: false, error: 'time_in_future' };
  if (ms < now - MAX_PAST_MS) return { ok: false, error: 'time_too_old' };

  // Température de -40 à 125 °C, une décimale au plus (24.3 ; pas 24.35)
  if (typeof t !== 'number' || !Number.isFinite(t) || t < -40 || t > 125 || Math.round(t * 10) / 10 !== t) {
    return { ok: false, error: 'invalid_temperature' };
  }
  if (!Number.isInteger(light) || (light as number) < 0 || (light as number) > 100) {
    return { ok: false, error: 'invalid_light' };
  }
  return { ok: true, sample: { time, temperature_c: t, light_pct: light as number } };
}

/** Enregistre un échantillon. L'heure est la clé : un échantillon reçu deux fois n'est gardé
 *  qu'une fois. */
export async function insertSample(sql: postgres.Sql, sample: Sample): Promise<void> {
  await sql`
    insert into public.station_samples (time, temperature_c, light_pct)
    values (${sample.time}, ${sample.temperature_c}, ${sample.light_pct})
    on conflict (time) do nothing
  `;
}
