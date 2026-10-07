/* Données du portfolio dans une langue : le français tel quel (maquette.ts), ou l'anglais, où les
 * textes de maquette.en.ts remplacent les textes français et les liens internes passent sous /en. */
import * as fr from './maquette';
import * as en from './maquette.en';
import { href, type Lang } from '../i18n';

export interface Content {
  projects: fr.Project[];
  steps: fr.Step[];
  sections: fr.Section[];
  buttons: typeof fr.buttons;
  lanes: typeof fr.lanes;
  filters: typeof fr.filters;
  catLabel: Record<fr.Cat, string>;
  skills: typeof fr.skills;
  cvExtras: string[];
  DESCRIPTION: string;
  PROFILE: string;
  HOME: string;
  portraitRows: typeof fr.portraitRows;
  links: typeof fr.links;
}

export const content = (lang: Lang): Content => {
  const links = { ...fr.links, phone: { ...fr.links.phone, display: lang === 'en' ? fr.links.phone.intl : fr.links.phone.display } };
  if (lang === 'fr') {
    return {
      projects: fr.projects,
      steps: fr.steps,
      sections: fr.sections,
      buttons: fr.buttons,
      lanes: fr.lanes,
      filters: fr.filters,
      catLabel: fr.catLabel,
      skills: fr.skills,
      cvExtras: fr.cvExtras,
      DESCRIPTION: fr.DESCRIPTION,
      PROFILE: fr.PROFILE,
      HOME: fr.HOME,
      portraitRows: fr.portraitRows,
      links,
    };
  }
  return {
    projects: fr.projects.map((p) => {
      const { siteLabel, ...text } = en.projects[p.visual] ?? {};
      return {
        ...p,
        ...text,
        stack: p.stack.map((i) => en.skillItems[i] ?? i),
        caseHref: p.caseHref && href('en', p.caseHref),
        site: p.site && { ...p.site, label: siteLabel ?? p.site.label },
      };
    }),
    steps: fr.steps.map((s) => {
      const { chronoLabel, ...text } = en.steps[s.id];
      return { ...s, ...text, chrono: { ...s.chrono, label: chronoLabel ?? s.chrono.label } };
    }),
    sections: fr.sections.map((s) => ({ ...s, ...en.sections[s.id], href: href('en', s.href) })),
    buttons: {
      boot: { ...fr.buttons.boot, label: en.buttons.boot, href: href('en', fr.buttons.boot.href) },
      en: { ...fr.buttons.en, label: en.buttons.en, href: href('en', fr.buttons.en.href) },
    },
    lanes: fr.lanes.map((l) => ({ ...l, label: en.lanes[l.id] })),
    filters: fr.filters.map((f) => ({ ...f, label: en.filterLabel[f.id] })),
    catLabel: en.catLabel,
    skills: fr.skills.map((g) => ({
      area: en.skillAreas[g.area] ?? g.area,
      items: g.items.map((i) => en.skillItems[i] ?? i),
    })),
    cvExtras: en.cvExtras,
    DESCRIPTION: en.DESCRIPTION,
    PROFILE: en.PROFILE,
    HOME: href('en', fr.HOME),
    portraitRows: fr.portraitRows,
    links,
  };
};

