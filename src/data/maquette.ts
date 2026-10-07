/* Données du portfolio, partagées par toutes ses pages.
 * Première ébauche de la source unique de données : le site, le CV et le README GitHub
 * en seront générés une fois le contenu figé. */

// Les trois maillons de la chaîne : l'objet, l'outillage, l'interface.
export type Cat = 'embarque' | 'python' | 'web';
export type Visual = 'routine' | 'risc' | 'irda' | 'schaeffler' | 'urbanloop' | 'web' | 'spotify' | 'narthex' | 'spotweb';

export interface Project {
  title: string;
  cats: Cat[];
  /** Expérience présentée dans la section Expériences (et non dans Projets) : son étiquette, ex. « Stage » */
  experience?: string;
  status?: string;
  pitch: string;
  /** Version courte du pitch, pour le CV (une ligne) */
  cv?: string;
  role: string;
  context: string;
  stack: string[];
  visual: Visual;
  /** Petite étiquette sur le visuel (ex. « Architecture visée » pour un projet en construction) */
  visualNote?: string;
  repo?: string;
  /** Page de présentation détaillée (stages) */
  caseHref?: string;
  /** Sans dépôt public : où est le code (par défaut, code propriétaire) */
  codeNote?: string;
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
    cv: 'Station connectée ESP32 : capteurs, moteur et alarme locale, mesures en MQTT vers une page web.',
    cats: ['embarque', 'web'],
    status: 'En cours',
    pitch:
      "Station de supervision connectée : un ESP32 lit des capteurs, pilote un moteur pas-à-pas et envoie ses mesures en MQTT vers une page web qui les affiche en direct.",
    role: 'Conception et développement, seul',
    context: 'Projet personnel qui couvre toute la chaîne, construit étape par étape',
    stack: ['ESP32', 'C++', 'FreeRTOS', 'MQTT', 'Web'],
    visual: 'routine',
    visualNote: 'Architecture visée',
    repo: 'https://github.com/MatthiasGermain/routine-station',
  },
  {
    title: 'IRDA UrbanLoop',
    cv: 'Consigne de vitesse envoyée par infrarouge entre deux ESP32, appliquée progressivement sous FreeRTOS.',
    cats: ['embarque'],
    pitch:
      "Pilotage d'une capsule UrbanLoop : un ESP32 « radar » transmet une consigne de vitesse par infrarouge, et l'ESP32 de la capsule l'applique progressivement, sauf ordre GO, SLOW ou STOP de la détection d'obstacles, prioritaire.",
    role: 'Développement des deux ESP32 et de leur communication',
    context: "Bureau d'études UrbanLoop, TÉLÉCOM Nancy, équipe de 4 : l'équipe détecte les obstacles (LiDAR, caméras, YOLO), mes ESP32 pilotent la capsule",
    stack: ['ESP32', 'C++', 'FreeRTOS', 'IrDA / UART', 'PlatformIO'],
    visual: 'irda',
    repo: 'https://github.com/MatthiasGermain/IRDA_FOR_BELOOP',
  },
  {
    title: 'RISC-V',
    cv: 'Processeur RISC-V 32 bits en VHDL, testé composant par composant, modèle Python et simulateur web.',
    cats: ['embarque', 'python'],
    pitch:
      'Processeur RISC-V 32 bits en VHDL, testé composant par composant, avec un modèle Python de référence et un simulateur web.',
    role: 'TP réalisé seul, simulateur web ajouté en plus de la consigne',
    context: 'TP, TÉLÉCOM Nancy',
    stack: ['VHDL', 'Quartus', 'Questa', 'Python', 'JavaScript'],
    visual: 'risc',
    visualNote: 'Schéma à valider',
    repo: 'https://github.com/MatthiasGermain/RISC-V-Processor',
    site: { label: 'Simulateur', url: 'https://matthiasgermain.github.io/RISC-V-Processor/' },
  },
  // Activité de développeur web freelance
  {
    title: 'Freelance web',
    cats: ['web'],
    experience: 'En cours',
    pitch:
      "Développeur web freelance depuis janvier 2026 : des sites et des plateformes web pour des clients, de la conception à la mise en production. Parmi eux, une plateforme suisse de comparaison de devis et le site d'un studio de danse, avec son espace d'administration.",
    role: 'Développeur web freelance',
    context: 'Strasbourg, à distance, depuis janv. 2026',
    stack: ['Next.js', 'TypeScript', 'Payload CMS', 'PostgreSQL', 'Tailwind CSS', 'Vercel'],
    visual: 'web',
    caseHref: '/experiences/web',
    codeNote: 'Code des clients : pas de dépôt public',
  },
  // Ne jamais nommer le client constructeur, des personnes, des numéros internes ni la bibliothèque
  // interne d'accès à Windchill.
  {
    title: 'Schaeffler Automotive',
    cats: ['python'],
    experience: "Stage de fin d'études",
    pitch:
      "Automatiser la chaîne qui génère la documentation technique des calculateurs de la transmission hybride DHT : des rapports d'erreurs exploitables par chaque équipe, et une configuration des livraisons vérifiée puis générée automatiquement.",
    role: "Ingénieur logiciel, automatisation (stage de fin d'études), équipe Tools/Script Developers",
    context: 'Bühl (Allemagne), mars - sept. 2025, en anglais. Code interne, non publié',
    stack: ['Python', 'Jenkins', 'Windchill', 'Confluence (API REST)', 'ETAS eHandbook'],
    visual: 'schaeffler',
    caseHref: '/experiences/schaeffler',
  },
  {
    title: 'Maquette UrbanLoop',
    cats: ['embarque', 'python'],
    experience: 'Stage',
    pitch:
      "Rendre la nouvelle maquette UrbanLoop de TÉLÉCOM Nancy exploitable en TP : une logique d'aiguillage repensée sur ESP32 (priorité à la capsule qui sort de sa boucle, aiguillage inactif refermé), et une supervision en temps réel ajoutée au site Flask existant.",
    role: 'Stage de 2e année, 8 semaines, en binôme',
    context: 'TÉLÉCOM Nancy, juin - juil. 2024. Maquette de 2 capsules et 2 aiguillages à moteur pas à pas',
    stack: ['ESP32', 'FreeRTOS', 'C++', 'IrDA', 'Flask', 'JavaScript'],
    visual: 'urbanloop',
    caseHref: '/experiences/urbanloop',
    codeNote: "Code sur le GitLab interne de l'école : pas de dépôt public",
  },
  {
    title: 'spotify_report',
    cv: 'Historique de mes écoutes Spotify et rapport quotidien par email, lancé par GitHub Actions.',
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
    cv: 'Plateforme multi-tenant pour les églises : site public et espace de gestion.',
    cats: ['web'],
    status: 'En test',
    pitch:
      "Plateforme multi-tenant pour les églises : chaque église a son site public et un espace de gestion (membres, événements, cultes).",
    role: 'Conception et développement',
    context: 'En test avec une église',
    stack: ['Next.js', 'Payload CMS', 'PostgreSQL', 'Docker', 'GitHub Actions'],
    visual: 'narthex',
    visualNote: 'Capture à venir',
    repo: 'https://github.com/MatthiasGermain/narthex',
  },
  {
    title: 'spotlightcrea.fr',
    cv: "Site de l'association Spotlight : vitrine, contact et newsletter en double opt-in.",
    cats: ['web'],
    pitch:
      "Site de l'association Spotlight : site vitrine, formulaire de contact et newsletter en double opt-in.",
    role: 'Responsable web bénévole, développement du site public',
    context: 'Bénévolat, travail en équipe par pull requests',
    stack: ['Next.js', 'React', 'Tailwind CSS', 'Resend', 'Vercel'],
    visual: 'spotweb',
    visualNote: 'Faites défiler la page',
    repo: 'https://github.com/MatthiasGermain/spotweb',
    site: { label: 'Site', url: 'https://spotlightcrea.fr' },
  },
];

// Numérotation : les projets en PRJ-xx, les expériences à part en EXP-xx.
export const refOf = (() => {
  const refs = new Map<Project, string>();
  let prj = 0;
  let exp = 0;
  for (const p of projects) {
    refs.set(p, p.experience ? `EXP-${String(++exp).padStart(2, '0')}` : `PRJ-${String(++prj).padStart(2, '0')}`);
  }
  return (p: Project) => refs.get(p)!;
})();

export interface Step {
  when: string;
  title: string;
  where: string;
  line: string;
  current?: boolean;
  /** Formation (rubrique à part sur le CV) */
  formation?: boolean;
  /** Absente du CV (reste dans le parcours du site) */
  cv?: false;
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
    when: 'Mars - sept. 2025',
    title: "Ingénieur logiciel, automatisation (stage de fin d'études)",
    where: 'Schaeffler, Bühl (Allemagne)',
    line: "Automatisation de la chaîne qui génère la documentation technique des calculateurs de la transmission hybride DHT : rapports d'erreurs par équipe, configuration des livraisons vérifiée et générée (Python, Jenkins, Windchill, Confluence).",
  },
  {
    when: 'Nov. 2024 - fév. 2025',
    title: "Bureau d'études UrbanLoop",
    cv: false,
    where: 'TÉLÉCOM Nancy',
    line: "Pilotage en vitesse d'une capsule : deux ESP32 reliés par infrarouge.",
  },
  {
    when: 'Juin - juil. 2024',
    title: 'Stage ingénieur systèmes embarqués',
    where: 'Maquette UrbanLoop, TÉLÉCOM Nancy',
    line: "En binôme : logique d'aiguillage sur ESP32 (FreeRTOS) et supervision en temps réel ajoutée au site Flask de la maquette.",
  },
  {
    when: '2025',
    title: "Diplôme d'ingénieur",
    formation: true,
    where: 'TÉLÉCOM Nancy',
    line: 'Filière systèmes et logiciels embarqués.',
  },
];

/* Sections du site, chacune au bout d'une broche de l'ESP32 (comme sur un schéma de brochage).
 * Sur l'accueil, `side` place l'étiquette autour de la carte ; sur les autres pages, les mêmes
 * broches forment la barrette de navigation. */
export type SectionId = 'projets' | 'experiences' | 'parcours' | 'contact';
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
  /** Description pour les moteurs de recherche et les aperçus de lien */
  meta: string;
  led?: boolean;
}

// Préfixe des pages de section (vide : le site est à la racine) et adresse de l'accueil
export const BASE = '';
export const HOME = '/';

export const sections: Section[] = [
  {
    id: 'projets',
    label: 'Projets',
    pinLabel: 'P2',
    href: `${BASE}/projets`,
    side: 'bottom',
    target: { pin: 'P2', row: 'front' },
    why: 'GPIO2, la broche de la LED du programme « Blink » : ce que je construis.',
    meta: 'Projets de Matthias Germain : firmware ESP32 et FreeRTOS, processeur RISC-V en VHDL, outillage Python, sites et plateformes web.',
    led: true,
  },
  {
    id: 'experiences',
    label: 'Expériences',
    pinLabel: 'SD2',
    href: `${BASE}/experiences`,
    side: 'top',
    target: { pin: 'SD2', row: 'back' },
    why: 'SD0 à SD3, le bus de la mémoire flash : ce que j’ai appris et gardé.',
    meta: 'Expériences de Matthias Germain : développeur web freelance, stage de fin d’études chez Schaeffler sur l’automatisation de la documentation logicielle, stage sur la maquette UrbanLoop.',
  },
  {
    id: 'parcours',
    label: 'Parcours',
    pinLabel: 'CLK',
    href: `${BASE}/parcours`,
    side: 'bottom',
    target: { pin: 'CLK', row: 'front' },
    why: 'CLK, l’horloge : le temps, donc la chronologie.',
    meta: 'Parcours de Matthias Germain, ingénieur TÉLÉCOM Nancy : embarqué automobile et temps réel, bureau d’études UrbanLoop, développement web.',
  },
  {
    id: 'contact',
    label: 'Contact',
    pinLabel: 'TX / RX',
    href: `${BASE}/contact`,
    side: 'right',
    target: { pin: 'TX', row: 'front' },
    why: 'TX et RX, la liaison série : on émet, on reçoit.',
    meta: 'Contacter Matthias Germain, ingénieur logiciel embarqué et IoT à Strasbourg : formulaire, email, LinkedIn, GitHub et CV.',
  },
];

// Les deux boutons de la carte : BOOT (mode programmation, on « flashe » le CV) et EN (le reset).
export const buttons = {
  boot: { label: 'Mode recruteur', pinLabel: 'BOOT', href: '/cv', side: 'left' as const, target: { feature: 'boot' as const } },
  en: { label: 'Relancer', pinLabel: 'EN', href: HOME, side: 'left' as const, target: { feature: 'en' as const } },
};

/* Accueil sur mobile (carte debout) : une rangée d'étiquettes au-dessus de la carte, une au-dessous,
 * dans l'ordre de lecture du site plutôt que dans celui des broches. La piste vers la broche ne se
 * dessine qu'au toucher. Les boutons sont en bas, du côté de la prise USB où ils se trouvent. */
export const portraitRows = {
  top: ['projets', 'experiences', 'parcours'],
  bottom: ['contact', 'boot', 'en'],
} as const;

export const DESCRIPTION =
  "Matthias Germain, ingénieur logiciel embarqué et IoT. Diplômé de TÉLÉCOM Nancy, basé à Strasbourg. Je travaille sur toute la chaîne d'un système connecté : le firmware, l'outillage Python qui l'entoure et l'interface web.";

/* CV (page /cv et sa version PDF). Les compétences reprennent le tableau du README GitHub. */
export const PROFILE =
  "Ingénieur diplômé de TÉLÉCOM Nancy, filière systèmes et logiciels embarqués. Je travaille sur toute la chaîne d'un système connecté : le firmware, l'outillage Python qui l'entoure et l'interface web. Je cherche un poste d'ingénieur logiciel, embarqué ou web, à Strasbourg ou à Nancy.";

export const skills: { area: string; items: string[] }[] = [
  { area: 'Embarqué', items: ['C / C++', 'ESP32', 'Arduino', 'PlatformIO', 'FreeRTOS', 'VHDL (Quartus)', 'RISC-V'] },
  { area: 'Outillage Python', items: ['Python', 'Flask', 'Jinja2', 'API REST'] },
  { area: 'Web', items: ['TypeScript', 'React', 'Next.js', 'Astro', 'Tailwind CSS', 'Payload CMS', 'Supabase'] },
  { area: 'Outils', items: ['Git', 'GitHub Actions', 'Jenkins', 'Docker', 'Vercel', 'DigitalOcean', 'Linux'] },
];

export const links = {
  email: 'matthias.germain.pro@gmail.com',
  linkedin: 'https://www.linkedin.com/in/matthias-germain-98b3ba2a4/',
  github: 'https://github.com/MatthiasGermain',
  site: 'https://matthias-germain.vercel.app',
};
