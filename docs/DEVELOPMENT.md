# Portfolio - développement

Site Astro + Tailwind CSS v4 déployé sur Vercel. Le portfolio est en cours de refonte : pour l'instant le site contient une page d'accueil provisoire et la route `/routine` (planning + tâches Notion).

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
  pages/index.astro             <- accueil provisoire
  pages/routine/index.astro     <- page /routine (rendue côté serveur)
  pages/api/routine-tasks.json.ts
  data/schedule.ts, week-plan.ts <- planning-type
  lib/notion.ts                 <- lecture de la base Notion
  layouts/Base.astro, styles/global.css
```

## Déploiement

Déployé sur Vercel depuis la branche `main` (Astro détecté automatiquement, build `npm run build`, output `dist`).
La route `/routine` est rendue côté serveur et lit Notion : variables d'environnement à définir dans Vercel (voir `src/lib/notion.ts`).
