/* Langues du site : le français à la racine, l'anglais sous /en, avec des adresses traduites.
 * Les pages françaises lisent leur langue dans l'adresse ; les pages anglaises les réutilisent
 * (src/pages/en), sauf les présentations détaillées, rédigées à part. */

export type Lang = 'fr' | 'en';

export const langOf = (url: URL): Lang => (/^\/en(\/|$)/.test(url.pathname) ? 'en' : 'fr');

/** Texte dans la langue de la page : `const t = tr(lang); t('Projets', 'Projects')` */
export const tr = (lang: Lang) => (fr: string, en: string) => (lang === 'en' ? en : fr);

/** Format des dates (`Intl`) */
export const localeOf = (lang: Lang) => (lang === 'en' ? 'en-GB' : 'fr-FR');

// Même page dans les deux langues
const pages: [fr: string, en: string][] = [
  ['/', '/en'],
  ['/projets', '/en/projects'],
  ['/experiences', '/en/experience'],
  ['/experiences/schaeffler', '/en/experience/schaeffler'],
  ['/experiences/urbanloop', '/en/experience/urbanloop'],
  ['/experiences/web', '/en/experience/web'],
  ['/parcours', '/en/timeline'],
  ['/contact', '/en/contact'],
  ['/cv', '/en/cv'],
  ['/mentions-legales', '/en/legal'],
  ['/routine', '/en/routine'],
];

/** Adresse d'une page du site, donnée en français, dans la langue voulue (l'ancre est gardée) */
export const href = (lang: Lang, fr: string) => {
  if (lang === 'fr') return fr;
  const [path, hash] = fr.split('#');
  const en = pages.find(([f]) => f === path)?.[1] ?? path;
  return hash ? `${en}#${hash}` : en;
};

/** La page courante dans les deux langues (sélecteur FR / EN, liens hreflang) */
export const alternates = (url: URL) => {
  const path = url.pathname.replace(/(.)\/$/, '$1');
  const pair = pages.find(([fr, en]) => fr === path || en === path);
  return pair ? { fr: pair[0], en: pair[1] } : undefined;
};
