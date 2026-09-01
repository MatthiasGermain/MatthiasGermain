import { Client } from '@notionhq/client';

/* ============================================================================
 *  Client Notion — lecture seule de la base de tâches existante.
 *  Voir docs/ROUTINE_TRACKER_PLAN.md, §5.
 * ----------------------------------------------------------------------------
 *  ⚠️  TODO (une fois NOTION_TOKEN / NOTION_TASKS_DB_ID fournis) :
 *   Appeler `discoverSchema()` (ou `GET /v1/databases/{id}` directement) pour
 *   connaître le vrai nom de la propriété "statut" et ses valeurs exactes,
 *   puis ajuster STATUS_PROPERTY / IN_PROGRESS_VALUE ci-dessous en
 *   conséquence. Les valeurs par défaut ("Statut" / "En cours") sont des
 *   suppositions non vérifiées — ne pas les considérer correctes tant que le
 *   schéma réel n'a pas été inspecté.
 * ========================================================================== */

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_TASKS_DB_ID = process.env.NOTION_TASKS_DB_ID;

// À corriger après découverte du schéma réel (voir TODO ci-dessus).
const STATUS_PROPERTY = process.env.NOTION_STATUS_PROPERTY ?? 'Statut';
const IN_PROGRESS_VALUE = process.env.NOTION_STATUS_IN_PROGRESS_VALUE ?? 'En cours';

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
}

/**
 * Type Notion réel à confirmer via `discoverSchema()` : "status" (nouveau
 * type dédié) ou "select" (ancien type). Le filtre ci-dessous suppose
 * "status" ; à ajuster selon le résultat de la découverte.
 */
export async function getInProgressTasks(): Promise<NotionTask[]> {
  if (!NOTION_TASKS_DB_ID) {
    throw new Error('NOTION_TASKS_DB_ID manquant (variable d\'environnement).');
  }

  const response = await getClient().databases.query({
    database_id: NOTION_TASKS_DB_ID,
    filter: {
      property: STATUS_PROPERTY,
      status: { equals: IN_PROGRESS_VALUE },
    },
  });

  return response.results.map((page) => {
    // @ts-expect-error — la forme exacte des propriétés dépend du schéma réel,
    // à affiner une fois celui-ci découvert.
    const titleProp = Object.values(page.properties).find((p: any) => p.type === 'title');
    const title = titleProp?.title?.map((t: any) => t.plain_text).join('') ?? '(sans titre)';

    return {
      id: page.id,
      title,
      // @ts-expect-error — `url` existe sur les pages Notion classiques.
      url: page.url ?? '',
    };
  });
}
