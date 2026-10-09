// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

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
