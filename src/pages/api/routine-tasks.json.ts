export const prerender = false;

import type { APIRoute } from 'astro';
import { getInProgressTasks, getTodoTasks } from '../../lib/notion';
import { parseSortKey, sortTasks } from '../../lib/task-sort';

/**
 * Rafraîchissement léger pour /routine : au lieu d'un `location.reload()`
 * complet toutes les 60s, le client interroge ce endpoint et ne repeint que
 * les listes de tâches.
 */
export const GET: APIRoute = async ({ url }) => {
  const sortKey = parseSortKey(url.searchParams.get('sort'));

  try {
    const [inProgress, todo] = await Promise.all([getInProgressTasks(), getTodoTasks()]);

    return new Response(
      JSON.stringify({
        inProgress: sortTasks(inProgress, sortKey),
        todo: sortTasks(todo, sortKey),
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue lors de la lecture Notion.';
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
