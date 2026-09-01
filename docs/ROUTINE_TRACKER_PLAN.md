# Routine Tracker — Plan de projet (v3, scope simplifié)

*Route `/routine` ajoutée au repo `portfolio` existant (même déploiement Vercel). Aucun stockage propre : deux lectures en temps réel, zéro écriture, zéro historique.*

## 1. Objectif

Un simple coup d'œil "où j'en suis maintenant" : le bloc de ton planning-type en cours, et l'état de tes tâches Notio (celles marquées "en cours"). Pas de suivi de complétion jour après jour, pas de streaks, pas de heatmap — volontairement écarté ("je m'en fous de suivre si j'ai coché ou pas, je veux juste voir où j'en suis").

## 2. Décisions prises (résumé, cumulatif avec les échanges précédents)

- Un seul déploiement Vercel : route intégrée au repo `portfolio` (Astro), pas de nouveau projet.
- Route `/routine` cachée, non listée dans la nav.
- **Aucune base Notion à créer.** Ta base de tâches existante (globale, avec vues + statut à faire/en cours/fait) est lue telle quelle, en lecture seule.
- **Aucun log, aucun historique.** Le dashboard n'enregistre rien, il affiche juste l'état courant à l'instant T.

## 3. Pourquoi c'est plus simple que prévu initialement

Les versions précédentes du plan proposaient une base Notion "Routine Log" pour suivre les complétions jour par jour. Ce n'est plus nécessaire : sans suivi historique, il n'y a rien à stocker. Le dashboard se contente de deux lectures à chaque visite :

1. **Bloc horaire actuel** — calculé côté serveur à partir de l'heure et du planning fixe (section 4), zéro dépendance externe.
2. **Tâches "en cours"** — lues directement dans ta base Notion de tâches existante via l'API Notion, filtrées sur le statut (ex. "En cours"), à chaque chargement de page. Rien n'est écrit, rien n'est dupliqué ailleurs.

## 4. Le planning (fixe, codé en dur)

*Inchangé — voir `src/data/schedule.ts` une fois créé.*

| Créneau | Bloc |
|---|---|
| 07h30–07h35 | Réveil & Déclencheurs |
| 07h35–08h05 | Petit-déjeuner |
| 08h05–08h25 | Deprivation |
| 08h25–08h30 | Priming |
| 08h30–10h00 | Session Flow 1 |
| 10h00–11h00 | Bible + Prière / Louange |
| 11h00–12h30 | Session Flow 2 |
| 12h30–13h30 | Pause déjeuner |
| 13h30–13h55 | Deprivation |
| 13h55–14h00 | Priming |
| 14h00–15h30 | Session Flow 3 |
| 15h30–16h00 | Transition & Préparation |
| 16h00–18h30 | Sport + Douche |
| 18h30–19h30 | Dîner |
| 19h30–23h30 | Tâches secondaires |
| 23h30–00h00 | Carnet & Déconnexion |
| 00h00 | Coucher |

## 5. Intégration Notion — lecture de la base de tâches existante

Pas de schéma à créer : on lit ta base telle qu'elle existe. La structure exacte (nom de la propriété statut, ses valeurs, présence d'une propriété date) n'est pas connue de ce côté-ci — plutôt que de la deviner ou de te la faire décrire à la main, l'étape d'implémentation inclut une **auto-découverte du schéma** : une fois le token et l'ID de base fournis, un appel à `GET /v1/databases/{database_id}` de l'API Notion renvoie la liste exacte des propriétés et leurs types, que le code utilise pour construire le filtre "tâches en cours" correctement.

## 6. Fonctionnalités V1 (scope final)

- Bloc horaire actuel mis en avant (à venir / en cours / passé, purement visuel, aucun état à cocher).
- Liste des tâches Notion au statut "en cours" (ou équivalent, à confirmer selon le schéma découvert).
- Rien d'autre : pas de progression, pas d'historique, pas de vue tâches "à faire" à ce stade (peut s'ajouter facilement plus tard si utile).

## 7. À préparer côté Notion

1. Créer une intégration Notion (https://www.notion.so/my-integrations) → token secret.
2. Partager ta base de tâches existante avec cette intégration (menu "..." → "Connexions" sur la base).
3. Récupérer l'ID de la base (dans l'URL Notion de la base).

Aucune nouvelle base à créer — juste partager l'existante avec l'intégration.

## 8. Changements techniques sur le repo `portfolio`

- `astro.config.mjs` : `output: 'hybrid'` + adaptateur `@astrojs/vercel/serverless`.
- `src/data/schedule.ts` : planning codé en dur (section 4).
- `src/lib/notion.ts` : client `@notionhq/client` — une fonction pour récupérer le schéma de la base (une fois, au moment du dev) et une fonction pour lire les tâches "en cours" à chaque requête.
- `src/pages/routine/index.astro` : `export const prerender = false`, affiche bloc actuel + tâches en cours.
- Variables d'env Vercel : `NOTION_TOKEN`, `NOTION_TASKS_DB_ID`.
- Aucun lien dans la nav du portfolio.

## 9. Prochaines étapes

1. Tu crées l'intégration Notion + partages ta base de tâches (section 7).
2. Tu donnes le token + l'ID de base à Claude Code (en local, jamais commité en clair).
3. Claude Code interroge d'abord le schéma de la base (`GET /v1/databases/{id}`) pour connaître les vrais noms de propriétés, puis code le filtre "en cours" en conséquence.
4. Implémentation du reste (planning + route + affichage).
