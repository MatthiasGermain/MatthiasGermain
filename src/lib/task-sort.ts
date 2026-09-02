import type { NotionTask } from './notion';

/* ============================================================================
 *  Tri des tâches — module pur (aucune dépendance réseau/env), partagé entre
 *  la page /routine (rendu initial), l'API JSON (rafraîchissement) et le
 *  script client (repli si besoin). L'import de NotionTask est type-only et
 *  n'embarque donc pas @notionhq/client côté navigateur.
 * ========================================================================== */

export type SortKey = 'priority' | 'alpha';

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'priority', label: 'Priorité' },
  { key: 'alpha', label: 'A → Z' },
];

export function parseSortKey(value: string | null): SortKey {
  return value === 'alpha' ? 'alpha' : 'priority';
}

export function sortTasks(tasks: NotionTask[], sortKey: SortKey): NotionTask[] {
  const compare = (a: NotionTask, b: NotionTask) =>
    sortKey === 'priority' ? (b.priority ?? -1) - (a.priority ?? -1) : a.title.localeCompare(b.title, 'fr');
  return [...tasks].sort(compare);
}
