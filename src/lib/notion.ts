import { Client } from '@notionhq/client';

/* ============================================================================
 *  Client Notion — lecture seule de la base de tâches existante.
 *  Voir docs/ROUTINE_TRACKER_PLAN.md, §5.
 * ----------------------------------------------------------------------------
 *  Schéma confirmé via GET /v1/databases/{id} sur la base "Suivi des tâches" :
 *   - Propriété statut : "État" (type Notion "status")
 *   - Valeurs : "Pas commencé" / "En cours" / "Terminé"
 *   - Titre : "Nom de la tâche" (peu importe, détecté par type "title")
 * ========================================================================== */

// `import.meta.env` (pas `process.env`) : Astro/Vite n'expose les variables
// non préfixées par PUBLIC_ sur `process.env` qu'en prod (Vercel les injecte
// au runtime) ; en dev, seul `import.meta.env` lit correctement le `.env`.
const NOTION_TOKEN = import.meta.env.NOTION_TOKEN;
const NOTION_TASKS_DB_ID = import.meta.env.NOTION_TASKS_DB_ID;

const STATUS_PROPERTY = import.meta.env.NOTION_STATUS_PROPERTY ?? 'État';
const IN_PROGRESS_VALUE = import.meta.env.NOTION_STATUS_IN_PROGRESS_VALUE ?? 'En cours';
const TODO_VALUE = import.meta.env.NOTION_STATUS_TODO_VALUE ?? 'Pas commencé';
const DONE_VALUE = import.meta.env.NOTION_STATUS_DONE_VALUE ?? 'Terminé';

// Page + vue Notion (Kanban "Suivi des tâches") depuis laquelle tu ouvres tes
// tâches normalement — utilisées pour que les liens ouvrent chaque tâche en
// "side-peek" dans le contexte de cette vue plutôt que la page brute isolée.
const NOTION_VIEW_PAGE_ID = import.meta.env.NOTION_VIEW_PAGE_ID ?? '0a2b272152698377b9c7813d7f7ea7ae';
const NOTION_VIEW_ID = import.meta.env.NOTION_VIEW_ID ?? '376b27215269832bb78a0845448b8124';

function taskViewUrl(taskId: string): string {
  const flatId = taskId.replace(/-/g, '');
  return `https://app.notion.com/p/${NOTION_VIEW_PAGE_ID}?v=${NOTION_VIEW_ID}&p=${flatId}&pm=s`;
}

let client: Client | null = null;

function getClient(): Client {
  if (!NOTION_TOKEN) {
    throw new Error('NOTION_TOKEN manquant (variable d\'environnement).');
  }
  if (!client) {
    client = new Client({ auth: NOTION_TOKEN });
  }
  return client;
}

/**
 * Récupère le schéma brut de la base (types + noms de propriétés).
 * Usage ponctuel en dev pour découvrir la propriété statut et ses valeurs
 * exactes avant de finaliser STATUS_PROPERTY / IN_PROGRESS_VALUE ci-dessus.
 */
export async function discoverSchema() {
  if (!NOTION_TASKS_DB_ID) {
    throw new Error('NOTION_TASKS_DB_ID manquant (variable d\'environnement).');
  }
  return getClient().databases.retrieve({ database_id: NOTION_TASKS_DB_ID });
}

export interface NotionTask {
  id: string;
  title: string;
  url: string;
  /** Valeur de la propriété "Espace" (catégorie), ou null si non renseignée. */
  space: string | null;
  /** Couleur Notion assignée à cette valeur d'"Espace" (ex. "purple", "green"), ou null. */
  spaceColor: string | null;
  /** Valeur de la propriété "Priorité" (1-3), ou null si non renseignée. */
  priority: number | null;
  /** Date ISO (YYYY-MM-DD) de la propriété "Date d'échéance", ou null. */
  due: string | null;
}

// Comparaison insensible aux accents/apostrophes : la base réelle utilise des
// apostrophes typographiques (’) qui varient selon la source d'édition — on
// évite de dépendre de leur forme exacte pour retrouver Espace/Priorité/Échéance.
function normalizePropName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function findProp(properties: Record<string, any>, name: string): any {
  const target = normalizePropName(name);
  for (const [key, value] of Object.entries(properties)) {
    if (normalizePropName(key) === target) return value;
  }
  return undefined;
}

async function queryTasksByStatus(
  statusValue: string,
  opts: { sortByRecentEdit?: boolean; pageSize?: number } = {},
): Promise<NotionTask[]> {
  if (!NOTION_TASKS_DB_ID) {
    throw new Error('NOTION_TASKS_DB_ID manquant (variable d\'environnement).');
  }

  const response = await getClient().databases.query({
    database_id: NOTION_TASKS_DB_ID,
    filter: {
      property: STATUS_PROPERTY,
      status: { equals: statusValue },
    },
    ...(opts.sortByRecentEdit && {
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
    }),
    ...(opts.pageSize && { page_size: opts.pageSize }),
  });

  return response.results.map((page: any) => {
    const titleProp = Object.values(page.properties).find((p: any) => p.type === 'title') as any;
    const title = titleProp?.title?.map((t: any) => t.plain_text).join('') ?? '(sans titre)';

    const spaceProp = findProp(page.properties, 'Espace');
    const priorityProp = findProp(page.properties, 'Priorité');
    const dueProp = findProp(page.properties, "Date d'échéance");

    return {
      id: page.id,
      title,
      url: taskViewUrl(page.id),
      space: spaceProp?.select?.name ?? null,
      spaceColor: spaceProp?.select?.color ?? null,
      priority: priorityProp?.select?.name ? Number(priorityProp.select.name) || null : null,
      due: dueProp?.date?.start ?? null,
    };
  });
}

export function getInProgressTasks(): Promise<NotionTask[]> {
  return queryTasksByStatus(IN_PROGRESS_VALUE);
}

export function getTodoTasks(): Promise<NotionTask[]> {
  return queryTasksByStatus(TODO_VALUE);
}

/** Les tâches terminées les plus récentes, pour un panneau "historique". */
export function getDoneTasks(limit = 12): Promise<NotionTask[]> {
  return queryTasksByStatus(DONE_VALUE, { sortByRecentEdit: true, pageSize: limit });
}
