// @ts-check
import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// Variables côté serveur : lues à l'exécution (`.env` en local, réglages du projet sur Vercel), jamais
// recopiées dans le build. Toutes facultatives : le code gère leur absence (connexion impossible,
// formulaire en erreur, etc.).
const secret = () => envField.string({ context: 'server', access: 'secret', optional: true });

// https://astro.build/config
export default defineConfig({
  // Domaine de production (sert pour le SEO / sitemap).
  site: 'https://matthias-germain.vercel.app',
  // 'static' reste le mode par défaut (toutes les pages sont prérendues) ;
  // seules les pages avec `export const prerender = false` (ex. /routine)
  // sont rendues côté serveur grâce à l'adaptateur Vercel ci-dessous.
  output: 'static',
  // Anciennes URL du portfolio (liens présents dans les CV) : renvoyées vers l'accueil
  // le temps de la refonte.
  redirects: {
    '/web': '/',
    '/python': '/',
    '/cicd': '/',
    // Anciennes pages anglaises : vers l'accueil anglais
    '/en/web': '/en',
    '/en/python': '/en',
    '/en/cicd': '/en',
    // Adresses de la maquette, avant le passage du site à la racine
    '/maquette': '/',
    '/maquette/projets': '/projets',
    '/maquette/etudes': '/experiences',
    // Ancien nom de la section Expériences
    '/etudes': '/experiences',
    '/maquette/parcours': '/parcours',
    '/maquette/contact': '/contact',
  },
  adapter: vercel(),
  env: {
    schema: {
      // Accès privé à /routine (lib/routine-auth.ts)
      ROUTINE_PASSWORD: secret(),
      ROUTINE_SESSION_SECRET: secret(),
      // Tâches Notion (lib/notion.ts)
      NOTION_TOKEN: secret(),
      NOTION_TASKS_DB_ID: secret(),
      NOTION_STATUS_PROPERTY: secret(),
      NOTION_STATUS_IN_PROGRESS_VALUE: secret(),
      NOTION_STATUS_TODO_VALUE: secret(),
      // Formulaire de contact (pages/api/contact.ts)
      RESEND_API_KEY: secret(),
      CONTACT_TO: secret(),
      CONTACT_FROM: secret(),
      // Station : commandes (pages/api/station/command.ts) et historique (lib/station/history.ts)
      STATION_MQTT_URL: secret(),
      STATION_COMMAND_USERNAME: secret(),
      STATION_COMMAND_PASSWORD: secret(),
      STATION_INGEST_TOKEN: secret(),
      STATION_DB_POSTGRES_URL: secret(),
    },
  },
  // Espaces entre éléments en ligne gardés comme en HTML (Astro 7 les retire par défaut, à la
  // manière de JSX, ce qui collerait des mots autour des liens et des mises en valeur).
  compressHTML: true,
  security: {
    // Derrière Vercel, sans cette liste, Astro ignore `X-Forwarded-Host` et croit servir `localhost` :
    // sa protection CSRF compare alors l'origine du navigateur à `localhost` et rejette tous les
    // formulaires POST (« Cross-site POST form submissions are forbidden »), dont le formulaire de
    // contact et la connexion à /routine. Ajouter ici tout domaine réellement utilisé.
    allowedDomains: [{ hostname: 'matthias-germain.vercel.app', protocol: 'https' }],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
