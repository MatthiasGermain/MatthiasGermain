# Portfolio - Matthias Germain

Portfolio bilingue (FR/EN) construit avec **Astro + Tailwind CSS v4**.
Positionnement : ingénieur logiciel embarqué, avec les réalisations web comme preuve de polyvalence.

## Commandes

```bash
npm install      # installer les dépendances (une seule fois)
npm run dev      # serveur local → http://localhost:4321
npm run build    # build de production → dossier dist/
npm run preview  # prévisualiser le build de production
```

> Node est géré par **fnm** sur cette machine. Si `node` n'est pas reconnu dans un
> nouveau terminal PowerShell, lance d'abord :
> `fnm env --use-on-cd | Out-String | Invoke-Expression; fnm use default`

## Structure

```
src/
  data/content.ts        ← TOUT le contenu (FR + EN). C'est ici qu'on édite.
  layouts/Base.astro     ← <head>, polices, SEO
  components/Page.astro  ← mise en page (sections), rendue en FR et EN
  pages/index.astro      ← route FR  (/)
  pages/en/index.astro   ← route EN  (/en/)
  styles/global.css      ← thème (couleurs, polices)
public/favicon.svg
```

## ✅ À compléter avant de diffuser (cherche les `⚠️ TODO` dans `src/data/content.ts`)

1. **Liens GitHub / LinkedIn** - actuellement des `#` (voir `profile.github` / `profile.linkedin`).
2. **Stacks des projets web** - déduites du rendu (Next.js confirmé sur Spotlight & ChuTTT)
   ou supposées (Narthex, Fortin). **Corrige-les avec ta vraie stack.**
3. **Lien du dépôt RISC-V** (`embeddedProjects[0].repo`).
4. **Captures d'écran** - générées en direct via `image.thum.io`. Pour des images
   nettes et rapides, fais de vraies captures, place-les dans `public/`
   (ex. `public/shots/narthex.png`) et remplace le champ `screenshot` par
   `/shots/narthex.png`.
5. **Domaine** - mets ton vrai domaine dans `astro.config.mjs` (`site`).

## Déploiement (Vercel, recommandé)

1. Pousser le repo sur GitHub.
2. Sur [vercel.com](https://vercel.com) → New Project → importer le repo.
   Astro est détecté automatiquement (build `npm run build`, output `dist`).
3. (Optionnel) brancher un domaine personnalisé.
