export const prerender = false;

import type { APIRoute } from 'astro';
import { getInProgressTasks, getTodoTasks } from '../../lib/notion';
import { parseSortKey, sortTasks } from '../../lib/task-sort';
import { isOwner } from '../../lib/routine-auth';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
  });

/**
 * Rafraîchissement léger pour /routine : au lieu d'un `location.reload()`
 * complet toutes les 60s, le client interroge ce endpoint et ne repeint que
 * les listes de tâches. Réservé à la session de Matthias (lib/routine-auth.ts).
 */
export const GET: APIRoute = async ({ url, cookies }) => {
  if (!isOwner(cookies)) return json({ error: 'Session requise.' }, 401);
  const sortKey = parseSortKey(url.searchParams.get('sort'));

  try {
    const [inProgress, todo] = await Promise.all([getInProgressTasks(), getTodoTasks()]);

    return json({
      inProgress: sortTasks(inProgress, sortKey),
      todo: sortTasks(todo, sortKey),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue lors de la lecture Notion.';
    return json({ error: message }, 502);
  }
};
