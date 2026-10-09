/* Graphes de l'historique de la station (vue visiteur, étape 6) : les calculs, sans DOM, testables à
 * part. Le dessin SVG est dans components/routine/StationHistory.astro. Les dates sont celles du
 * fuseau du navigateur. */
import type { HistoryPoint, Range } from './history';

const DAY_MS = 24 * 3600 * 1000;

/** Début de la période affichée : la même fenêtre que la route (`now() - interval`). */
export function periodStart(range: Range, now: number): number {
  if (range === '1y') {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - 1);
    return +d;
  }
  return now - { '24h': 1, '7d': 7, '30d': 30 }[range] * DAY_MS;
}

/** Abscisse d'un point : le milieu de sa tranche (c'en est la moyenne), sans dépasser maintenant
 *  pour la tranche en cours. */
export const pointTime = (point: { time: string }, bucketS: number, now: number) =>
  Math.min(Date.parse(point.time) + (bucketS * 1000) / 2, now);

/** Découpe les points en morceaux continus : deux points plus espacés qu'une tranche et demie
 *  encadrent un trou (station éteinte, coupure), que la courbe ne traverse pas. La marge couvre les
 *  jours de 23 h et de 25 h des changements d'heure. */
export function segments<T extends { time: string }>(points: T[], bucketS: number): T[][] {
  const out: T[][] = [];
  let previous = -Infinity;
  for (const point of points) {
    const time = Date.parse(point.time);
    if (time - previous > bucketS * 1500) out.push([]);
    out[out.length - 1].push(point);
    previous = time;
  }
  return out;
}

export interface Scale {
  min: number;
  max: number;
  ticks: number[];
}

/** Échelle « ronde » couvrant [min, max] : environ `count` graduations de 1, 2 ou 5 × 10^n, sur au
 *  moins `minSpan` (une température stable ne doit pas paraître agitée). */
export function niceScale(min: number, max: number, count = 4, minSpan = 0): Scale {
  if (max - min < minSpan) {
    const middle = (min + max) / 2;
    min = middle - minSpan / 2;
    max = middle + minSpan / 2;
  }
  if (max - min <= 0) {
    min -= 1;
    max += 1;
  }
  const raw = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((f) => f * magnitude).find((s) => s >= raw)!;
  const low = Math.floor(min / step + 1e-9);
  const high = Math.ceil(max / step - 1e-9);
  const ticks: number[] = [];
  for (let i = low; i <= high; i++) ticks.push(Math.round(i * step * 1e6) / 1e6);
  return { min: ticks[0], max: ticks[ticks.length - 1], ticks };
}

/** Échelle de la température : les mesures, minimums et maximums compris, et le seuil s'il est à
 *  moins de 5 °C d'elles. Plus loin, il écraserait la courbe : il est alors signalé à part. */
export function temperatureScale(points: HistoryPoint[], threshold: number | null): Scale & { thresholdShown: boolean } {
  let min = Math.min(...points.map((p) => p.temperature_min_c));
  let max = Math.max(...points.map((p) => p.temperature_max_c));
  const thresholdShown = threshold !== null && threshold >= min - 5 && threshold <= max + 5;
  if (thresholdShown) {
    min = Math.min(min, threshold);
    max = Math.max(max, threshold);
  }
  return { ...niceScale(min, max, 4, 3), thresholdShown };
}

/** Graduations du temps, aux heures rondes du fuseau du navigateur : toutes les 6 h sur 24 h, chaque
 *  minuit sur 7 jours, chaque lundi sur 30 jours, chaque 1er du mois sur un an. */
export function timeTicks(range: Range, start: number, end: number): number[] {
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  if (range === '30d') d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // le lundi d'avant
  if (range === '1y') d.setDate(1);
  const ticks: number[] = [];
  while (+d <= end) {
    if (+d >= start) ticks.push(+d);
    if (range === '24h') d.setHours(d.getHours() + 6);
    else if (range === '7d') d.setDate(d.getDate() + 1);
    else if (range === '30d') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
  }
  return ticks;
}

/** Étiquettes de l'axe du temps à garder pour qu'elles ne se chevauchent pas : une sur k, avec k le
 *  plus petit possible ; celles qui dépasseraient du graphe sont retirées. */
export function spread<T extends { x: number; width: number }>(labels: T[], left: number, right: number, gap = 10): T[] {
  const inside = labels.filter((l) => l.x - l.width / 2 >= left && l.x + l.width / 2 <= right);
  for (let k = 1; k <= inside.length; k++) {
    const kept = inside.filter((_, i) => i % k === 0);
    const fits = kept.every((l, i) => i === 0 || kept[i - 1].x + kept[i - 1].width / 2 + gap <= l.x - l.width / 2);
    if (fits) return kept;
  }
  return inside.slice(0, 1);
}

/** Indice de la valeur la plus proche de `x` dans `xs`, rangées par ordre croissant. */
export function nearest(xs: number[], x: number): number {
  let low = 0;
  let high = xs.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (xs[middle] < x) low = middle;
    else high = middle;
  }
  return Math.abs(xs[low] - x) <= Math.abs(xs[high] - x) ? low : high;
}
