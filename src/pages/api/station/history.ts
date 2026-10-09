export const prerender = false;

import type { APIRoute } from 'astro';
import { database, isRange, readHistory } from '../../../lib/station/history';

/**
 * Lecture de l'historique de la station pour les graphes de la vue visiteur (étape 6) :
 * `GET /api/station/history?range=24h|7d|30d|1y`, publique, sans session.
 *
 * Réponse mise en cache 5 min par Vercel (puis servie encore 10 min pendant qu'elle se renouvelle) :
 * les visiteurs ne sollicitent pas la base. Tout autre paramètre est refusé (400), pour qu'une
 * adresse inventée ne contourne pas le cache.
 */
const json = (body: unknown, status: number, cache = 'no-store') =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': cache },
  });

export const GET: APIRoute = async ({ url }) => {
  const params = [...url.searchParams.keys()];
  const range = url.searchParams.get('range');
  if (params.length !== 1 || !isRange(range)) return json({ error: 'range' }, 400);

  const db = database();
  if (!db) {
    console.error('Station : STATION_DB_POSTGRES_URL manquant.');
    return json({ error: 'unconfigured' }, 503);
  }
  try {
    const history = await readHistory(db, range);
    return json(history, 200, 'public, s-maxage=300, stale-while-revalidate=600');
  } catch (err) {
    console.error('Station : lecture de l’historique impossible,', err instanceof Error ? err.message : err);
    return json({ error: 'database' }, 502);
  }
};

// Seul GET est permis
export const ALL: APIRoute = () => json({ error: 'method' }, 405);
