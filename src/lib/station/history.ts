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
      max: 1, // une seule connexion par instance de fonction
      // Une requête à la fois sur la connexion, sans envoyer la suivante avant la réponse : le pooler
      // en mode transaction perd le fil quand deux requêtes se chevauchent (deux visiteurs, ou un
      // échantillon qui arrive pendant une lecture), et toutes les suivantes restaient bloquées
      max_pipeline: 0,
      connect_timeout: 5,
      idle_timeout: 20,
    });
  }
  return sql;
}

const QUERY_TIMEOUT_MS = 8000;

/** Garde-fou : sans réponse de la base en 8 s, le client est abandonné (le prochain appel de
 *  database() en crée un neuf) plutôt que de bloquer les requêtes qui attendent derrière lui. */
function guard<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      sql?.end({ timeout: 0 }).catch(() => {});
      sql = null;
      reject(new Error(`pas de réponse de la base en ${QUERY_TIMEOUT_MS / 1000} s`));
    }, QUERY_TIMEOUT_MS);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
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
  await guard(sql`
    insert into public.station_samples (time, temperature_c, light_pct)
    values (${sample.time}, ${sample.temperature_c}, ${sample.light_pct})
    on conflict (time) do nothing
  `);
}

/* ---- Lecture : les points des graphes ----------------------------------------------------- */

export type Range = '24h' | '7d' | '30d' | '1y';

/** Chaque période : sa durée, et la taille d'un point (les échantillons bruts sur 24 h, des
 *  moyennes par heure sur 7 et 30 jours, par jour de l'heure de Paris sur un an). */
export const RANGES: Record<Range, { interval: string; bucket: 'sample' | 'hour' | 'day'; bucketSeconds: number }> = {
  '24h': { interval: '24 hours', bucket: 'sample', bucketSeconds: 300 },
  '7d': { interval: '7 days', bucket: 'hour', bucketSeconds: 3600 },
  '30d': { interval: '30 days', bucket: 'hour', bucketSeconds: 3600 },
  '1y': { interval: '1 year', bucket: 'day', bucketSeconds: 86400 },
};

export const isRange = (value: unknown): value is Range => typeof value === 'string' && value in RANGES;

export interface HistoryPoint {
  /** Début du point (ISO 8601 UTC) : la tranche de 5 min, l'heure, ou minuit à Paris */
  time: string;
  /** Moyenne, minimum et maximum de la température sur le point (égaux pour un échantillon seul) */
  temperature_c: number;
  temperature_min_c: number;
  temperature_max_c: number;
  /** Moyenne de la lumière */
  light_pct: number;
  /** Nombre d'échantillons de 5 min dans le point */
  samples: number;
}

export interface History {
  range: Range;
  /** Taille d'un point, en secondes : un écart plus grand entre deux points est un trou */
  bucket_s: number;
  /** Heure du tout premier échantillon en base (null : historique vide) */
  since: string | null;
  points: HistoryPoint[];
}

const iso = (date: Date) => date.toISOString().replace('.000Z', 'Z');

export function readHistory(sql: postgres.Sql, range: Range): Promise<History> {
  return guard(queryHistory(sql, range));
}

async function queryHistory(sql: postgres.Sql, range: Range): Promise<History> {
  const { interval, bucket, bucketSeconds } = RANGES[range];
  // Moyennes calculées par Postgres ; numeric et bigint convertis en nombres JavaScript. La
  // température est un `real` (24.9 y vaut 24.8999996) : elle passe en numeric avant la moyenne,
  // pour que celle de 25.0 et 24.9 s'arrondisse bien à 25.0.
  const rows =
    bucket === 'sample'
      ? await sql`
          select time as bucket, temperature_c::float8 as t, temperature_c::float8 as t_min,
                 temperature_c::float8 as t_max, light_pct::float8 as light, 1 as n
          from public.station_samples
          where time >= now() - ${interval}::interval
          order by time`
      : await sql`
          select date_trunc(${bucket}, time, 'Europe/Paris') as bucket,
                 round(avg(temperature_c::numeric), 1)::float8 as t,
                 min(temperature_c)::float8 as t_min,
                 max(temperature_c)::float8 as t_max,
                 round(avg(light_pct))::float8 as light,
                 count(*)::int as n
          from public.station_samples
          where time >= now() - ${interval}::interval
          group by 1
          order by 1`;
  const [first] = await sql`select min(time) as since from public.station_samples`;

  return {
    range,
    bucket_s: bucketSeconds,
    since: first?.since ? iso(first.since as Date) : null,
    points: rows.map((r) => ({
      time: iso(r.bucket as Date),
      temperature_c: Math.round((r.t as number) * 10) / 10,
      temperature_min_c: Math.round((r.t_min as number) * 10) / 10,
      temperature_max_c: Math.round((r.t_max as number) * 10) / 10,
      light_pct: r.light as number,
      samples: r.n as number,
    })),
  };
}
