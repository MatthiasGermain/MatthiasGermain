/* ============================================================================
 *  PLANNING-TYPE — fixe, codé en dur (voir docs/ROUTINE_TRACKER_PLAN.md, §4)
 * ========================================================================== */

export interface ScheduleBlock {
  /** Minutes depuis minuit (0-1440). */
  start: number;
  /** Minutes depuis minuit. Le dernier bloc (Coucher) a start === end. */
  end: number;
  label: string;
}

function toMinutes(h: number, m: number): number {
  return h * 60 + m;
}

export const weekdaySchedule: ScheduleBlock[] = [
  { start: toMinutes(7, 30), end: toMinutes(7, 35), label: 'Réveil & Déclencheurs' },
  { start: toMinutes(7, 35), end: toMinutes(8, 5), label: 'Petit-déjeuner' },
  { start: toMinutes(8, 5), end: toMinutes(8, 25), label: 'Deprivation' },
  { start: toMinutes(8, 25), end: toMinutes(8, 30), label: 'Priming' },
  { start: toMinutes(8, 30), end: toMinutes(10, 0), label: 'Session Flow 1' },
  { start: toMinutes(10, 0), end: toMinutes(11, 0), label: 'Bible + Prière / Louange' },
  { start: toMinutes(11, 0), end: toMinutes(12, 30), label: 'Session Flow 2' },
  { start: toMinutes(12, 30), end: toMinutes(13, 30), label: 'Pause déjeuner' },
  { start: toMinutes(13, 30), end: toMinutes(13, 55), label: 'Deprivation' },
  { start: toMinutes(13, 55), end: toMinutes(14, 0), label: 'Priming' },
  { start: toMinutes(14, 0), end: toMinutes(15, 30), label: 'Session Flow 3' },
  { start: toMinutes(15, 30), end: toMinutes(16, 0), label: 'Transition & Préparation' },
  { start: toMinutes(16, 0), end: toMinutes(18, 30), label: 'Sport + Douche' },
  { start: toMinutes(18, 30), end: toMinutes(19, 30), label: 'Dîner' },
  { start: toMinutes(19, 30), end: toMinutes(23, 30), label: 'Tâches secondaires' },
  { start: toMinutes(23, 30), end: toMinutes(24, 0), label: 'Carnet & Déconnexion' },
  { start: toMinutes(24, 0), end: toMinutes(24, 0), label: 'Coucher' },
];

/** Planning du week-end (samedi/dimanche) — volontairement vide à part. */
export const weekendSchedule: ScheduleBlock[] = [{ start: toMinutes(10, 0), end: toMinutes(11, 30), label: 'Rencontre' }];

function isWeekend(day: number): boolean {
  return day === 0 || day === 6;
}

/** Le planning applicable pour une date donnée (semaine ou week-end). */
export function getActiveSchedule(now: Date = new Date()): ScheduleBlock[] {
  return isWeekend(now.getDay()) ? weekendSchedule : weekdaySchedule;
}

export type BlockStatus = 'past' | 'current' | 'upcoming';

export interface ScheduleBlockWithStatus extends ScheduleBlock {
  status: BlockStatus;
}

/**
 * Détermine le statut visuel de chaque bloc pour une heure donnée
 * (par défaut l'heure courante). En dehors du planning (avant 07h30 ou après
 * minuit), tous les blocs sont considérés "upcoming"/"past" selon la position
 * relative à minuit.
 */
export function getScheduleWithStatus(now: Date = new Date()): ScheduleBlockWithStatus[] {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return getActiveSchedule(now).map((block) => {
    // Le dernier bloc ("Coucher") est ponctuel (start === end) : on ne peut
    // jamais être "dedans", seulement avant ou après.
    const isPunctual = block.start === block.end;
    let status: BlockStatus;

    if (isPunctual) {
      status = nowMinutes < block.start ? 'upcoming' : 'past';
    } else if (nowMinutes < block.start) {
      status = 'upcoming';
    } else if (nowMinutes >= block.end) {
      status = 'past';
    } else {
      status = 'current';
    }

    return { ...block, status };
  });
}

export function formatMinutes(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  return `${String(h).padStart(2, '0')}h${String(min).padStart(2, '0')}`;
}
