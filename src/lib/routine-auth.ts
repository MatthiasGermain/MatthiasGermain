/* Accès privé à /routine (planning et tâches Notion) : un mot de passe, puis une session.
 *
 * - Le mot de passe (ROUTINE_PASSWORD) est comparé en temps constant.
 * - La session est un cookie sans état : sa date d'expiration et la signature HMAC-SHA256 de cette
 *   date avec ROUTINE_SESSION_SECRET. Rien n'est stocké côté serveur ; pour révoquer toutes les
 *   sessions, il suffit de changer ROUTINE_SESSION_SECRET.
 * - Pas de limite de tentatives (rien n'est stocké) : le mot de passe doit être long et aléatoire.
 *
 * `import.meta.env` comme dans lib/notion.ts : c'est lui qui lit le `.env` en dev. */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { AstroCookies } from 'astro';

const PASSWORD = import.meta.env.ROUTINE_PASSWORD;
const SECRET = import.meta.env.ROUTINE_SESSION_SECRET;

export const SESSION_COOKIE = 'routine_session';
const SESSION_DAYS = 30;

/** Les deux variables sont-elles définies ? Sinon, personne ne peut se connecter. */
export const authConfigured = () => Boolean(PASSWORD && SECRET);

// Égalité en temps constant : on compare les empreintes SHA-256 (même longueur), pour ne révéler
// ni le contenu ni la longueur du mot de passe par le temps de réponse.
const sameText = (a: string, b: string) =>
  timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());

const sign = (payload: string) => createHmac('sha256', SECRET!).update(payload).digest('base64url');

export function checkPassword(candidate: string): boolean {
  return authConfigured() && sameText(candidate, PASSWORD!);
}

/** Ouvre une session de 30 jours (cookie `HttpOnly`, `SameSite=Lax`, `Secure` hors dev local). */
export function openSession(cookies: AstroCookies) {
  const expires = String(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  cookies.set(SESSION_COOKIE, `${expires}.${sign(expires)}`, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    // En dev, la page est servie en http://localhost : un cookie `Secure` n'y serait pas renvoyé
    // par tous les navigateurs
    secure: !import.meta.env.DEV,
    maxAge: SESSION_DAYS * 24 * 3600,
  });
}

export function closeSession(cookies: AstroCookies) {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

/** Session valide : signature correcte et date d'expiration pas encore passée. */
export function isOwner(cookies: AstroCookies): boolean {
  const value = cookies.get(SESSION_COOKIE)?.value;
  if (!value || !authConfigured()) return false;
  const [expires, signature] = value.split('.');
  if (!expires || !signature || !/^\d+$/.test(expires)) return false;
  return sameText(signature, sign(expires)) && Number(expires) > Date.now();
}
