/* Données de la maquette du portfolio (/maquette), partagées par toutes ses pages.
 * Première ébauche de la source unique de données : le site, le CV et le README GitHub
 * en seront générés une fois le contenu figé. */

// Les trois maillons de la chaîne : l'objet, l'outillage, l'interface.
export type Cat = 'embarque' | 'python' | 'web';
export type Visual = 'routine' | 'risc' | 'irda' | 'schaeffler' | 'spotify' | 'narthex' | 'spotweb';

export interface Project {
  title: string;
  cats: Cat[];
  caseStudy?: boolean;
  status?: string;
  pitch: string;
  role: string;
  context: string;
  stack: string[];
  visual: Visual;
  repo?: string;
  site?: { label: string; url: string };
}

export const catLabel: Record<Cat, string> = { embarque: 'Embarqué', python: 'Python', web: 'Web' };

// Interrupteur à 3 positions, dans l'ordre de la chaîne : l'objet à gauche, l'interface à droite,
// et au centre « Tout », où l'outillage Python fait le lien entre les deux.
export const filters: { id: 'tout' | Cat; label: string }[] = [
  { id: 'embarque', label: 'Embarqué' },
  { id: 'tout', label: 'Tout' },
  { id: 'web', label: 'Web' },
];

// Ordre de la chaîne, comme les épingles GitHub. Schaeffler ouvre la partie « outillage ».
export const projects: Project[] = [
  {
    title: 'routine-station',
    cats: ['embarque', 'web'],
    status: 'En cours',
    pitch:
      "Station de supervision connectée : un ESP32 lit des capteurs, pilote un moteur pas-à-pas et envoie ses mesures en MQTT vers une page web qui les affiche en direct.",
    role: 'Conception et développement, seul',
    context: 'Projet personnel qui couvre toute la chaîne, construit étape par étape',
    stack: ['ESP32', 'C++', 'FreeRTOS', 'MQTT', 'Web'],
    visual: 'routine',
    repo: 'https://github.com/MatthiasGermain/routine-station',
  },
  {
    title: 'IRDA UrbanLoop',
    cats: ['embarque'],
    pitch:
      "Firmware ESP32 qui transmet une consigne de vitesse par infrarouge et la fait appliquer progressivement par une capsule UrbanLoop.",
    role: 'Développement des deux ESP32 et de leur communication',
    context: "Bureau d'études UrbanLoop, équipe de 4",
    stack: ['ESP32', 'C++', 'FreeRTOS', 'IrDA / UART', 'PlatformIO'],
    visual: 'irda',
    repo: 'https://github.com/MatthiasGermain/IRDA_FOR_BELOOP',
  },
  {
    title: 'RISC-V',
    cats: ['embarque', 'python'],
    pitch:
      'Processeur RISC-V 32 bits en VHDL, testé composant par composant, avec un modèle Python de référence et un simulateur web.',
    role: 'TP réalisé seul, simulateur web ajouté en plus de la consigne',
    context: 'TP, TÉLÉCOM Nancy',
    stack: ['VHDL', 'Quartus', 'Questa', 'Python', 'JavaScript'],
    visual: 'risc',
    repo: 'https://github.com/MatthiasGermain/RISC-V-Processor',
    site: { label: 'Simulateur', url: 'https://matthiasgermain.github.io/RISC-V-Processor/' },
  },
  {
    title: 'Schaeffler Automotive',
    cats: ['python', 'embarque'],
    caseStudy: true,
    pitch:
      "Six mois dans une équipe de logiciel embarqué automobile : un outil Python d'automatisation intégré au pipeline Jenkins, et l'automatisation de la configuration des ECU.",
    role: 'Stage ingénieur logiciel embarqué, 6 mois',
    context: 'Bühl (Allemagne), avr. - sept. 2025. Code interne, non publié',
    stack: ['Python', 'Jenkins', 'Jinja2', 'API REST', 'Windchill'],
    visual: 'schaeffler',
  },
  {
    title: 'spotify_report',
    cats: ['python'],
    pitch:
      "Script Python qui garde l'historique de mes écoutes Spotify et m'envoie chaque jour un rapport par e-mail.",
    role: 'Projet personnel',
    context: 'Lancé par GitHub Actions sur un runner auto-hébergé',
    stack: ['Python', 'Spotipy', 'GitHub Actions'],
    visual: 'spotify',
    repo: 'https://github.com/MatthiasGermain/spotify_report',
  },
  {
    title: 'narthex',
    cats: ['web'],
    status: 'En test',
    pitch:
      "Plateforme multi-tenant pour les églises : chaque église a son site public et un espace de gestion (membres, événements, cultes).",
    role: 'Conception et développement',
    context: 'En test avec une église',
    stack: ['Next.js', 'Payload CMS', 'PostgreSQL', 'Docker', 'GitHub Actions'],
    visual: 'narthex',
    repo: 'https://github.com/MatthiasGermain/narthex',
  },
  {
    title: 'spotlightcrea.fr',
    cats: ['web'],
    pitch:
      "Site de l'association Spotlight : site vitrine, formulaire de contact et newsletter en double opt-in.",
    role: 'Responsable web bénévole, développement du site public',
    context: 'Bénévolat, travail en équipe par pull requests',
    stack: ['Next.js', 'React', 'Tailwind CSS', 'Resend', 'Vercel'],
    visual: 'spotweb',
    repo: 'https://github.com/MatthiasGermain/spotweb',
    site: { label: 'Site', url: 'https://spotlightcrea.fr' },
  },
];

// Numérotation : les projets en PRJ-xx, les études de cas à part en CAS-xx.
export const refOf = (() => {
  const refs = new Map<Project, string>();
  let prj = 0;
  let cas = 0;
  for (const p of projects) {
    refs.set(p, p.caseStudy ? `CAS-${String(++cas).padStart(2, '0')}` : `PRJ-${String(++prj).padStart(2, '0')}`);
  }
  return (p: Project) => refs.get(p)!;
})();

export interface Step {
  when: string;
  title: string;
  where: string;
  line: string;
  current?: boolean;
}

export const steps: Step[] = [
  {
    when: 'Depuis janv. 2026',
    title: 'Développeur web freelance',
    where: 'Strasbourg',
    line: "Sites et plateformes web pour des clients, de l'architecture à la mise en production.",
    current: true,
  },
  {
    when: 'En parallèle',
    title: 'Responsable web bénévole',
    where: 'Association Spotlight',
    line: 'Développement et suivi de spotlightcrea.fr.',
  },
  {
    when: 'Avr. - sept. 2025',
    title: 'Stage ingénieur logiciel embarqué',
    where: 'Schaeffler Automotive, Bühl (Allemagne)',
    line: 'Outillage Python intégré au CI/CD Jenkins, configuration ECU, environnement automobile (CAN).',
  },
  {
    when: 'Nov. 2024 - fév. 2025',
    title: "Bureau d'études UrbanLoop",
    where: 'TÉLÉCOM Nancy',
    line: "Pilotage en vitesse d'une capsule : deux ESP32 reliés par infrarouge.",
  },
  {
    when: 'Juin - juil. 2024',
    title: 'Stage développeur embarqué temps réel',
    where: 'Maquette UrbanLoop, TÉLÉCOM Nancy',
    line: "Logique d'aiguillage sur ESP32 (FreeRTOS) et interface de supervision (Flask).",
  },
  {
    when: 'Formation',
    title: "Diplôme d'ingénieur",
    where: 'TÉLÉCOM Nancy',
    line: 'Filière systèmes et logiciels embarqués.',
  },
];

/* Sections du site, chacune au bout d'une broche de l'ESP32 (comme sur un schéma de brochage).
 * Sur l'accueil, `side` place l'étiquette autour de la carte ; sur les autres pages, les mêmes
 * broches forment la barrette de navigation. */
export type SectionId = 'projets' | 'etudes' | 'parcours' | 'contact';
export type PinTarget = { pin: string; row: 'front' | 'back' } | { feature: 'boot' | 'en' };

export interface Section {
  id: SectionId;
  label: string;
  pinLabel: string;
  href: string;
  side: 'top' | 'bottom' | 'left' | 'right';
  target: PinTarget;
  /** Pourquoi cette broche (affiché en sous-titre de la page) */
  why: string;
  led?: boolean;
}

export const BASE = '/maquette';

export const sections: Section[] = [
  {
    id: 'projets',
    label: 'Projets',
    pinLabel: 'P2',
    href: `${BASE}/projets`,
    side: 'bottom',
    target: { pin: 'P2', row: 'front' },
    why: 'GPIO2, la broche de la LED du programme « Blink » : ce que je construis.',
    led: true,
  },
  {
    id: 'etudes',
    label: 'Études',
    pinLabel: 'SD2',
    href: `${BASE}/etudes`,
    side: 'top',
    target: { pin: 'SD2', row: 'back' },
    why: 'SD0 à SD3, le bus de la mémoire flash : ce que j’ai appris et gardé.',
  },
  {
    id: 'parcours',
    label: 'Parcours',
    pinLabel: 'CLK',
    href: `${BASE}/parcours`,
    side: 'bottom',
    target: { pin: 'CLK', row: 'front' },
    why: 'CLK, l’horloge : le temps, donc la chronologie.',
  },
  {
    id: 'contact',
    label: 'Contact',
    pinLabel: 'TX / RX',
    href: `${BASE}/contact`,
    side: 'right',
    target: { pin: 'TX', row: 'front' },
    why: 'TX et RX, la liaison série : on émet, on reçoit.',
  },
];

// Les deux boutons de la carte : BOOT (mode programmation, on « flashe » le CV) et EN (le reset).
export const buttons = {
  boot: { label: 'Mode recruteur', pinLabel: 'BOOT', href: '/cv', side: 'left' as const, target: { feature: 'boot' as const } },
  en: { label: 'Relancer', pinLabel: 'EN', href: BASE, side: 'left' as const, target: { feature: 'en' as const } },
};

/* Accueil sur mobile (carte debout) : une rangée d'étiquettes au-dessus de la carte, une au-dessous,
 * dans l'ordre de lecture du site plutôt que dans celui des broches. La piste vers la broche ne se
 * dessine qu'au toucher. Les boutons sont en bas, du côté de la prise USB où ils se trouvent. */
export const portraitRows = {
  top: ['projets', 'etudes', 'parcours'],
  bottom: ['contact', 'boot', 'en'],
} as const;

export const DESCRIPTION =
  "Matthias Germain, ingénieur logiciel embarqué et IoT. Diplômé de TÉLÉCOM Nancy, basé à Strasbourg. Je travaille sur toute la chaîne d'un système connecté : le firmware, l'outillage Python qui l'entoure et l'interface web.";
