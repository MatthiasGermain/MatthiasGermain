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
    '/en': '/',
    '/en/web': '/',
    '/en/python': '/',
    '/en/cicd': '/',
  },
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
  },
});
