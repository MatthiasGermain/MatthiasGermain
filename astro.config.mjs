// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // ⚠️ Remplace par ton vrai domaine une fois déployé (sert pour le SEO / sitemap).
  site: 'https://matthias-germain.dev',
  vite: {
    plugins: [tailwindcss()],
  },
});
