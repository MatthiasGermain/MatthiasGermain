export const prerender = false;

import type { APIRoute } from 'astro';
import { BASE } from '../../data/maquette';

/**
 * Formulaire de contact : le message est envoyé par Resend à l'adresse de Matthias, avec l'adresse
 * du visiteur en « Répondre à ». Le formulaire marche aussi sans JavaScript (envoi classique puis
 * redirection vers la page Contact, où une ancre affiche le résultat) ; avec JavaScript, la page
 * envoie en arrière-plan et reçoit du JSON.
 *
 * Variables d'environnement (`.env` en local, réglages du projet sur Vercel) :
 * - RESEND_API_KEY : clé Resend (obligatoire) ;
 * - CONTACT_TO : destinataire (par défaut, l'adresse publique de Matthias) ;
 * - CONTACT_FROM : expéditeur. Sans domaine vérifié chez Resend, seule l'adresse de test
 *   onboarding@resend.dev est permise, et elle n'envoie qu'à l'adresse du compte Resend.
 */
// `import.meta.env` comme dans lib/notion.ts : c'est lui qui lit le `.env` en dev.
const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
const CONTACT_TO = import.meta.env.CONTACT_TO ?? 'matthias.germain.pro@gmail.com';
const CONTACT_FROM = import.meta.env.CONTACT_FROM ?? 'Portfolio <onboarding@resend.dev>';

const LIMITS = { name: 100, email: 200, message: 5000 };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Result = { ok: true } | { ok: false; error: string; field?: 'name' | 'email' | 'message' };

// Messages affichés sous le formulaire, dans la langue de la page qui l'envoie (champ caché `lang`)
const MESSAGES = {
  fr: {
    unreadable: 'Formulaire illisible.',
    name: 'Indiquez votre nom.',
    email: 'Cette adresse email ne semble pas valide.',
    message: 'Le message doit faire entre 10 et 5000 caractères.',
    unavailable: 'L’envoi est indisponible pour le moment.',
    failed: 'Le message n’est pas parti.',
  },
  en: {
    unreadable: 'The form could not be read.',
    name: 'Please enter your name.',
    email: 'This email address does not look valid.',
    message: 'The message must be between 10 and 5,000 characters.',
    unavailable: 'Sending is unavailable for the moment.',
    failed: "The message didn't go through.",
  },
};

// Visite directe de l'adresse (lien, robot) : retour au formulaire. Sans ce cas, Vercel tente
// d'afficher la page 404, prérendue donc absente de la fonction, et répond par une erreur 500.
export const GET: APIRoute = () =>
  new Response(null, { status: 303, headers: { Location: `${BASE}/contact` } });

export const POST: APIRoute = async ({ request }) => {
  const wantsJson = request.headers.get('accept')?.includes('application/json') ?? false;
  let lang: 'fr' | 'en' = 'fr';
  const reply = (result: Result, status: number) =>
    wantsJson
      ? new Response(JSON.stringify(result), { status, headers: { 'Content-Type': 'application/json' } })
      : // Sans JavaScript : retour sur la page Contact, l'ancre affiche le bon message (CSS :target)
        new Response(null, {
          status: 303,
          headers: { Location: `${lang === 'en' ? '/en' : BASE}/contact#${result.ok ? 'message-envoye' : 'message-erreur'}` },
        });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply({ ok: false, error: MESSAGES[lang].unreadable }, 400);
  }
  const field = (key: string) => String(form.get(key) ?? '').trim();
  if (field('lang') === 'en') lang = 'en';
  const msg = MESSAGES[lang];

  // Champ piège invisible : seuls les robots le remplissent. On leur répond « envoyé » sans rien envoyer.
  if (field('site')) return reply({ ok: true }, 200);

  // Le nom sert dans l'objet du mail : pas de retour à la ligne
  const name = field('name').replace(/[\r\n]+/g, ' ');
  const email = field('email');
  const message = field('message');
  if (!name || name.length > LIMITS.name) return reply({ ok: false, error: msg.name, field: 'name' }, 400);
  if (!EMAIL.test(email) || email.length > LIMITS.email)
    return reply({ ok: false, error: msg.email, field: 'email' }, 400);
  if (message.length < 10 || message.length > LIMITS.message)
    return reply({ ok: false, error: msg.message, field: 'message' }, 400);

  if (!RESEND_API_KEY) {
    console.error('Contact : RESEND_API_KEY manquant (variable d’environnement).');
    return reply({ ok: false, error: msg.unavailable }, 503);
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: CONTACT_FROM,
        to: [CONTACT_TO],
        reply_to: email,
        subject: `Portfolio${lang === 'en' ? ' (EN)' : ''} : message de ${name}`,
        text: `${name} <${email}>\n\n${message}\n\n--\nEnvoyé depuis le formulaire de contact du portfolio.`,
      }),
    });
    if (!res.ok) {
      console.error('Contact : Resend a refusé l’envoi', res.status, await res.text());
      return reply({ ok: false, error: msg.failed }, 502);
    }
  } catch (err) {
    console.error('Contact : Resend injoignable', err);
    return reply({ ok: false, error: msg.failed }, 502);
  }

  return reply({ ok: true }, 200);
};
