export const prerender = false;

import type { APIRoute } from 'astro';
import { checkPassword, openSession } from '../../lib/routine-auth';

/**
 * Formulaire « Accès privé » de la vue visiteur : bon mot de passe → session et retour sur
 * /routine (vue propriétaire, en français) ; sinon retour sur la vue visiteur de la langue du
 * formulaire, avec un message d'erreur.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const form = await request.formData().catch(() => null);
  const password = String(form?.get('password') ?? '');
  const back = form?.get('lang') === 'en' ? '/en/routine' : '/routine';

  if (checkPassword(password)) {
    openSession(cookies);
    return redirectTo('/routine');
  }
  return redirectTo(`${back}?acces=refuse#acces-prive`);
};

// Visite directe de l'adresse : retour à la page
export const GET: APIRoute = () => redirectTo('/routine');

const redirectTo = (location: string) =>
  new Response(null, { status: 303, headers: { Location: location, 'Cache-Control': 'private, no-store' } });
