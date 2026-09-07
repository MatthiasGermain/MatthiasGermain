import { getCurrentBlockLabel } from './schedule';

/* ============================================================================
 *  SEMAINE TYPE — quel domaine occupe quel flow, jour par jour.
 * ----------------------------------------------------------------------------
 *  Flow 1 : messages (tous domaines) puis Pro — travail et recherche.
 *  Flow 2 : Pro tous les jours — la continuité va où vivent les échéances.
 *  Flow 3 : indicatif. L'après-midi suit les besoins réels ; ce plan sert de
 *           défaut auquel on déroge sciemment, pas de contrainte.
 *
 *  Règle d'urgence : un imprévu Pro un jour Associatif prend le tampon du
 *  vendredi. Tampon déjà consommé → il prend le Flow 3 du jour, et
 *  l'Associatif SAUTE (il ne glisse pas : un créneau reporté crée une dette
 *  qui s'accumule jusqu'à ce que le plan paraisse faux).
 * ========================================================================== */

export type Domain = 'pro' | 'asso' | 'perso' | 'tampon';

export const DOMAIN_LABELS: Record<Domain, string> = {
  pro: 'Pro',
  asso: 'Associatif',
  perso: 'Perso',
  tampon: 'Tampon',
};

/** Correspondance domaine → valeurs de la propriété "Espace" dans Notion. */
const DOMAIN_SPACES: Record<Domain, string[]> = {
  pro: ['Collaboration'],
  asso: ['Spotlight', 'Fortin'],
  perso: ['Alabama', 'Spirituel', 'Admin'],
  tampon: [],
};

/** Les trois créneaux profonds, dans l'ordre, tels que nommés dans le planning. */
export const FLOW_LABELS = ['Session Flow 1', 'Session Flow 2', 'Session Flow 3'] as const;

export const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V'] as const;

/** `weekPlan[jour 0=lundi][flow 0..2]`. Le week-end n'a pas de flow. */
export const weekPlan: Domain[][] = [
  ['pro', 'pro', 'asso'], // lundi
  ['pro', 'pro', 'perso'], // mardi
  ['pro', 'pro', 'asso'], // mercredi
  ['pro', 'pro', 'perso'], // jeudi
  ['pro', 'pro', 'tampon'], // vendredi
];

export interface CurrentSlot {
  /** 0 = lundi … 4 = vendredi. */
  dayIndex: number;
  /** 0 = Flow 1, 1 = Flow 2, 2 = Flow 3. */
  flowIndex: number;
  domain: Domain;
}

/**
 * Le créneau de semaine en cours, ou null hors flow (week-end, pauses, soirée).
 */
export function getCurrentSlot(now: Date = new Date()): CurrentSlot | null {
  const day = now.getDay(); // 0 = dimanche
  if (day < 1 || day > 5) return null;
  const dayIndex = day - 1;

  const label = getCurrentBlockLabel(now);
  if (!label) return null;
  const flowIndex = FLOW_LABELS.indexOf(label as (typeof FLOW_LABELS)[number]);
  if (flowIndex === -1) return null;

  return { dayIndex, flowIndex, domain: weekPlan[dayIndex][flowIndex] };
}

/** Le domaine auquel appartient un "Espace" Notion, ou null s'il n'est mappé nulle part. */
export function domainForSpace(space: string | null): Domain | null {
  if (!space) return null;
  for (const [domain, spaces] of Object.entries(DOMAIN_SPACES) as [Domain, string[]][]) {
    if (spaces.includes(space)) return domain;
  }
  return null;
}

export function isTaskInDomain(space: string | null, domain: Domain | null): boolean {
  if (!domain || domain === 'tampon') return false;
  return domainForSpace(space) === domain;
}

/**
 * Remonte les tâches du domaine courant en tête, sans rien masquer : le tri
 * choisi par l'utilisateur reste appliqué à l'intérieur de chaque groupe.
 */
export function prioritizeForDomain<T extends { space: string | null }>(tasks: T[], domain: Domain | null): T[] {
  if (!domain || domain === 'tampon') return tasks;
  const inDomain = tasks.filter((t) => isTaskInDomain(t.space, domain));
  if (inDomain.length === 0) return tasks;
  return [...inDomain, ...tasks.filter((t) => !isTaskInDomain(t.space, domain))];
}
