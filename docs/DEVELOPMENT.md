# Portfolio - développement

Site Astro + Tailwind CSS v4 déployé sur Vercel : le portfolio (en français à la racine, en anglais sous `/en`) et la route `/routine` (station connectée en vue publique, planning et tâches Notion derrière un mot de passe).

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
  pages/index.astro             <- accueil (ESP32 en 3D)
  pages/routine/index.astro     <- /routine (rendue côté serveur) : tableau de bord ou vue visiteur
  pages/routine/login.ts, logout.ts <- connexion et déconnexion de /routine
  pages/en/routine.astro        <- /en/routine : vue visiteur en anglais
  components/routine/           <- Dashboard.astro (vue propriétaire), Visitor.astro (vue visiteur)
  lib/routine-auth.ts           <- mot de passe et cookie de session de /routine
  pages/api/routine-tasks.json.ts <- tâches Notion, réservées à la session
  data/schedule.ts, week-plan.ts <- planning-type
  lib/notion.ts                 <- lecture de la base Notion
  layouts/Base.astro, styles/global.css
```

## Déploiement

Déployé sur Vercel depuis la branche `main` (Astro détecté automatiquement, build `npm run build`, output `dist`).
La route `/routine` est rendue côté serveur et lit Notion : variables d'environnement à définir dans Vercel (voir `src/lib/notion.ts`).

## Accès privé à `/routine`

- **Sans session** : vue visiteur « Station connectée » (aussi sous `/en/routine`, en anglais), sans planning ni tâches. Le lien « Accès privé » ouvre le formulaire de mot de passe.
- **Avec session** : le tableau de bord (planning, tâches Notion), en `noindex`, avec un bouton de déconnexion.
- `/api/routine-tasks.json` répond `401` sans session.
- Les réponses de `/routine` portent `Cache-Control: private, no-store` : Vercel ne doit jamais servir la vue propriétaire à un visiteur.

Deux variables d'environnement, dans `.env` en local et dans Vercel :

| Variable | Rôle |
|----------|------|
| `ROUTINE_PASSWORD` | le mot de passe. Pas de limite de tentatives (rien n'est stocké) : il doit être long et aléatoire, tiré du gestionnaire de mots de passe. |
| `ROUTINE_SESSION_SECRET` | la clé qui signe le cookie de session (HMAC-SHA256 de sa date d'expiration, valable 30 jours). La changer révoque toutes les sessions. |

Pour générer la clé :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Sans ces deux variables, personne ne peut se connecter : `/routine` affiche la vue visiteur.

## Commandes de la station (`/api/station/command`)

Les boutons de la vue propriétaire (moteur, alarme, seuil de température) appellent `POST /api/station/command` avec la commande en JSON. La route refuse, avant de rien publier : sans session (401), d'une autre origine (403), autre chose que du JSON (415), plus de 1 Ko (413), commande non prévue ou hors bornes (400 ; liste dans `src/lib/station/commands.ts`). Sinon, elle publie en MQTT sur TLS avec l'utilisateur `web-command` (publication sur `routine/station/commands` seulement), attend l'accusé du broker et répond `202 { id }`. La réponse de la station arrive à la page par le topic `replies`, retrouvée par cet id.

Trois variables côté serveur, sans préfixe `PUBLIC_` (type « Sensitive » dans Vercel) :

| Variable | Rôle |
|----------|------|
| `STATION_MQTT_URL` | `mqtts://<adresse du broker>:8883` |
| `STATION_COMMAND_USERNAME` | `web-command` |
| `STATION_COMMAND_PASSWORD` | son mot de passe |

La page, elle, lit la station avec `web-viewer` (variables `PUBLIC_STATION_MQTT_URL`, `_USERNAME`, `_PASSWORD`, type « Config » : elles partent dans le navigateur, et cet utilisateur ne peut que lire).

Les formulaires POST (connexion, contact) passent la protection CSRF d'Astro grâce à `security.allowedDomains` dans `astro.config.mjs` : tout domaine réellement utilisé doit y figurer.
