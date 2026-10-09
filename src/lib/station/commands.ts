/* Commandes que le site peut envoyer à la station, en miroir de la section « Commandes » de
 * docs/protocol.md (dépôt routine-station). Partagé par la route API (qui refuse tout le reste avant
 * de rien publier) et par les boutons de la vue propriétaire. La station revalide chaque commande :
 * cette liste ne la protège pas, elle évite seulement d'envoyer ce qu'elle refuserait. */
import { THRESHOLD_MAX, THRESHOLD_MIN, isThreshold } from './protocol';

export type Command =
  | { type: 'motor'; action: 'start'; direction: 'forward' | 'backward' }
  | { type: 'motor'; action: 'stop' }
  | { type: 'alarm'; action: 'test' }
  | { type: 'alarm'; action: 'silence' }
  | { type: 'threshold'; action: 'set'; temperature_c: number };

export type CommandCheck = { ok: true; command: Command } | { ok: false; error: 'invalid_command' | 'out_of_range' };

const hasExactly = (o: Record<string, unknown>, keys: string[]) =>
  Object.keys(o).length === keys.length && keys.every((k) => k in o);

/** Valide une commande reçue du navigateur (sans `id` : c'est le serveur qui le crée). Aucun champ
 *  en plus de ceux prévus n'est accepté. */
export function checkCommand(input: unknown): CommandCheck {
  const invalid = { ok: false, error: 'invalid_command' } as const;
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return invalid;
  const c = input as Record<string, unknown>;

  if (c.type === 'motor' && c.action === 'start' && hasExactly(c, ['type', 'action', 'direction'])) {
    return c.direction === 'forward' || c.direction === 'backward'
      ? { ok: true, command: { type: 'motor', action: 'start', direction: c.direction } }
      : invalid;
  }
  if (c.type === 'motor' && c.action === 'stop' && hasExactly(c, ['type', 'action'])) {
    return { ok: true, command: { type: 'motor', action: 'stop' } };
  }
  if (c.type === 'alarm' && (c.action === 'test' || c.action === 'silence') && hasExactly(c, ['type', 'action'])) {
    return { ok: true, command: { type: 'alarm', action: c.action } };
  }
  if (c.type === 'threshold' && c.action === 'set' && hasExactly(c, ['type', 'action', 'temperature_c'])) {
    // Un entier (28) ; 28.5 ou "28" sont refusés comme par la station. Le message publié est
    // réécrit par le serveur, donc toujours sans décimale.
    if (!Number.isInteger(c.temperature_c)) return invalid;
    if (!isThreshold(c.temperature_c)) return { ok: false, error: 'out_of_range' };
    return { ok: true, command: { type: 'threshold', action: 'set', temperature_c: c.temperature_c } };
  }
  return invalid;
}

/** Motifs de refus, ceux de la route comme ceux de la station (topic replies), en clair pour la vue
 *  propriétaire (en français). */
export const REFUSALS: Record<string, string> = {
  too_long: 'commande trop longue',
  invalid_json: 'commande illisible',
  invalid_id: 'identifiant de commande invalide',
  invalid_command: 'commande non reconnue',
  out_of_range: `seuil hors de ${THRESHOLD_MIN} à ${THRESHOLD_MAX} °C`,
  alarm_active: "refusé pendant un arrêt d'urgence ou un test d'alarme",
  nothing_to_silence: 'aucune alarme ne sonne',
};
