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

/**
 * Empreinte du contenu d'une liste. Calculée à l'identique au rendu serveur
 * (posée en `data-signature`) et au rafraîchissement client : tant qu'elles
 * coïncident, le client ne repeint rien.
 */
export function taskSignature(tasks: NotionTask[], compact = false): string {
  return JSON.stringify(tasks.map((t) => [t.id, t.title, compact ? null : t.space]));
}

export function sortTasks(tasks: NotionTask[], sortKey: SortKey): NotionTask[] {
  const compare = (a: NotionTask, b: NotionTask) =>
    sortKey === 'priority' ? (b.priority ?? -1) - (a.priority ?? -1) : a.title.localeCompare(b.title, 'fr');
  return [...tasks].sort(compare);
}
