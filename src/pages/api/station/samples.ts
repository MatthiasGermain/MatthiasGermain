export const prerender = false;

import type { APIRoute } from 'astro';
import { createHash, timingSafeEqual } from 'node:crypto';
import { checkSample, database, insertSample } from '../../../lib/station/history';

/**
 * Enregistrement de l'historique de la station (étape 6 de routine-station).
 *
 * Appelée par EMQX (règle sur routine/station/samples, action « HTTP Server ») toutes les 5 min,
 * jamais par un navigateur : pas de session ici, un jeton secret dans `Authorization: Bearer …`.
 * Contrôles, dans l'ordre : jeton (401), taille (413), JSON (415), échantillon valide (400). Puis
 * insertion idempotente dans station_samples (lib/station/history.ts) : 204, que l'échantillon
 * soit nouveau ou déjà là. Base injoignable : 502, sans détail dans la réponse.
 *
 * Variables, côté serveur seulement : STATION_INGEST_TOKEN, STATION_DB_POSTGRES_URL.
 */
const TOKEN = import.meta.env.STATION_INGEST_TOKEN;
const MAX_BODY_BYTES = 1024;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

// Comparaison en temps constant, sur les empreintes (même longueur), comme lib/routine-auth.ts
const sameToken = (a: string, b: string) =>
  timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());

export const POST: APIRoute = async ({ request }) => {
  const db = database();
  if (!TOKEN || !db) {
    console.error('Station : STATION_INGEST_TOKEN ou STATION_DB_POSTGRES_URL manquant.');
    return json({ error: 'unconfigured' }, 503);
  }

  const auth = request.headers.get('authorization') ?? '';
  const [scheme, token] = auth.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token || !sameToken(token, TOKEN)) return json({ error: 'token' }, 401);

  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return json({ error: 'too_long' }, 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return json({ error: 'too_long' }, 413);
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    return json({ error: 'content_type' }, 415);
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const check = checkSample(body);
  if (!check.ok) return json({ error: check.error }, 400);

  try {
    await insertSample(db, check.sample);
  } catch (err) {
    console.error('Station : enregistrement impossible,', err instanceof Error ? err.message : err);
    return json({ error: 'database' }, 502);
  }
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
};

// Seul POST est permis
export const ALL: APIRoute = () => json({ error: 'method' }, 405);
