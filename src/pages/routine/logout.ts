export const prerender = false;

import type { APIRoute } from 'astro';
import { closeSession } from '../../lib/routine-auth';

/** Bouton « Se déconnecter » du tableau de bord : efface le cookie de session. */
export const POST: APIRoute = ({ cookies }) => {
  closeSession(cookies);
  return redirectTo('/routine');
};

// En POST seulement : un lien ou un préchargement ne doit pas pouvoir déconnecter
export const GET: APIRoute = () => redirectTo('/routine');

const redirectTo = (location: string) =>
  new Response(null, { status: 303, headers: { Location: location, 'Cache-Control': 'private, no-store' } });
