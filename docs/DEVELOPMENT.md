# Portfolio - développement

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

## Déploiement

Déployé sur Vercel depuis la branche `main` (Astro détecté automatiquement, build `npm run build`, output `dist`).
La route `/routine` est rendue côté serveur et lit Notion : variables d'environnement à définir dans Vercel (voir `src/lib/notion.ts`).
