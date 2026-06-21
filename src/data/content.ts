/* ============================================================================
 *  CONTENU DU PORTFOLIO - source unique de vérité (FR + EN)
 * ----------------------------------------------------------------------------
 *  ⚠️  À RELIRE / COMPLÉTER PAR MATTHIAS :
 *   - Liens GitHub / LinkedIn (placeholders "#" pour l'instant).
 *   - Les `stack` des projets web sont DÉDUITS du rendu des sites (Next.js
 *     détecté sur Spotlight & ChuTTT) ou SUPPOSÉS. Corrige-les avec ta vraie
 *     stack avant de présenter à un recruteur.
 *   - Les liens `repo` des projets embarqués (placeholders).
 * ========================================================================== */

export const languages = ['fr', 'en'] as const;
export type Lang = (typeof languages)[number];

type L<T = string> = Record<Lang, T>;

/* ---------------------------------------------------------------- identité */
export const profile = {
  name: 'Matthias Germain',
  email: 'matthias.germain.pro@gmail.com',
  phone: '+33 6 02 32 17 20',
  github: 'https://github.com/MatthiasGermain',
  linkedin: 'https://www.linkedin.com/in/matthias-germain-98b3ba2a4/',
  location: { fr: 'France · mobile (Permis B)', en: 'France · mobile (driving licence)' } as L,
  role: {
    fr: 'Ingénieur logiciel embarqué temps réel',
    en: 'Real-time embedded software engineer',
  } as L,
  tagline: {
    fr: "Je conçois et fiabilise des logiciels embarqués temps réel - C/C++, FreeRTOS, microcontrôleurs. Et parce que je sais livrer un produit de bout en bout, je conçois aussi des applications web pour de vrais clients.",
    en: 'I design and harden real-time embedded software - C/C++, FreeRTOS, microcontrollers. And because I can ship a product end to end, I also build web applications for real clients.',
  } as L,
  available: {
    fr: 'Disponible - recherche un CDI en logiciel embarqué',
    en: 'Available - looking for a permanent embedded software role',
  } as L,
};

/* ------------------------------------------------------------- expériences */
export interface Experience {
  company: string;
  role: L;
  period: L;
  place: L;
  highlights: L<string[]>;
  stack: string[];
}

export const experiences: Experience[] = [
  {
    company: 'Schaeffler Automotive - Bühl',
    role: { fr: 'Stage ingénieur logiciel embarqué (6 mois)', en: 'Embedded software engineering intern (6 months)' },
    period: { fr: 'Avril – Septembre 2025', en: 'April – September 2025' },
    place: { fr: 'Bühl-Baden, Allemagne · automobile', en: 'Bühl-Baden, Germany · automotive' },
    highlights: {
      fr: [
        "Outil Python (POO) de génération de rapports d'erreurs intégré au CI/CD Jenkins : temps de traitement réduit de ~18 min à ~1 min.",
        'Automatisation de la validation et de la génération de configuration ECU (Python, API Confluence REST, Windchill PLM) : suppression des erreurs de saisie manuelle.',
        'Environnement embarqué automobile : ECU, ETAS, calibration, diagnostics, bus CAN.',
      ],
      en: [
        'Python (OOP) error-report generation tool integrated into the Jenkins CI/CD pipeline: processing time cut from ~18 min to ~1 min.',
        'Automated ECU configuration validation & generation (Python, Confluence REST API, Windchill PLM): eliminated manual data-entry errors.',
        'Automotive embedded environment: ECU, ETAS, calibration, diagnostics, CAN bus.',
      ],
    },
    stack: ['Python', 'CI/CD', 'Jenkins', 'Windchill (PLM)', 'API Confluence (REST)', 'ETAS', 'CAN'],
  },
  {
    company: 'Maquette Urbanloop - Télécom Nancy',
    role: { fr: 'Stage développeur embarqué temps réel (2 mois)', en: 'Real-time embedded developer intern (2 months)' },
    period: { fr: 'Juin – Juillet 2024', en: 'June – July 2024' },
    place: { fr: 'Nancy, France · mobilité', en: 'Nancy, France · mobility' },
    highlights: {
      fr: [
        "Refonte de la logique d'aiguillage temps réel (ESP32, FreeRTOS) : délai d'aiguillage réduit d'environ 2 s et fin des déraillements.",
        'Gestion de priorité inter-capsules via un 2ᵉ capteur IrDA (UART) et 2 piles LIFO : suppression d\'une variable d\'état source d\'erreurs.',
        'Interface de supervision temps réel (Flask, JavaScript) : suivi de 4 entités, détection des déconnexions Wi-Fi, modes manuel / automatique.',
      ],
      en: [
        'Reworked the real-time track-switching logic (ESP32, FreeRTOS): switching delay cut by ~2 s and derailments eliminated.',
        'Inter-capsule priority handling via a 2nd IrDA sensor (UART) and 2 LIFO stacks: removed an error-prone state variable.',
        'Real-time supervision interface (Flask, JavaScript): tracking of 4 entities, Wi-Fi disconnection detection, manual / automatic modes.',
      ],
    },
    stack: ['C/C++', 'FreeRTOS', 'ESP32', 'IrDA', 'UART', 'Flask', 'JavaScript', 'PlatformIO'],
  },
];

/* ------------------------------------------------------- projets embarqués */
export interface Project {
  title: string;
  category: L;
  summary: L;
  role: L;
  highlights: L<string[]>;
  stack: string[];
  url?: string;
  demoUrl?: string;
  repo?: string;
  /** Badge optionnel, ex. projet pas encore sorti. */
  status?: L;
  /** Chemin de la capture dans /public (ex. '/chuttt.png'). */
  screenshot?: string;
}

export const embeddedProjects: Project[] = [
  {
    title: 'Processeur RISC-V',
    category: { fr: 'Architecture matérielle · VHDL', en: 'Hardware architecture · VHDL' },
    summary: {
      fr: "Implémentation complète d'un processeur RISC-V en VHDL, avec une interface web de simulation d'instructions.",
      en: 'Complete implementation of a RISC-V processor in VHDL, with a web-based instruction simulation interface.',
    },
    role: { fr: 'Conception & implémentation', en: 'Design & implementation' },
    highlights: {
      fr: [
        'Jeu d\'instructions RISC-V implémenté et synthétisé en VHDL.',
        'Synthèse et validation sur FPGA (Quartus).',
        'Interface web de simulation publiée via GitHub Pages.',
      ],
      en: [
        'RISC-V instruction set implemented and synthesised in VHDL.',
        'Synthesis and validation on FPGA (Quartus).',
        'Web simulation interface published via GitHub Pages.',
      ],
    },
    stack: ['VHDL', 'FPGA', 'Quartus', 'RISC-V', 'Python'],
    repo: 'https://github.com/MatthiasGermain/RISC-V-Processor',
  },
  {
    title: 'Système embarqué sous FreeRTOS (ESP32)',
    category: { fr: 'Temps réel · capteurs', en: 'Real-time · sensors' },
    summary: {
      fr: "Mesure de CO₂, température et humidité, déclenchée par capteur ultrason, sur deux ESP32 communicants.",
      en: 'CO₂, temperature and humidity measurement, triggered by an ultrasonic sensor, across two communicating ESP32s.',
    },
    role: { fr: 'Conception & implémentation', en: 'Design & implementation' },
    highlights: {
      fr: [
        'Gestion de tâches concurrentes sous FreeRTOS selon un modèle producteur / consommateur.',
        'Déclenchement de la mesure par capteur ultrason.',
        'Communication inter-cartes entre deux ESP32 (UART).',
      ],
      en: [
        'Concurrent task management under FreeRTOS using a producer / consumer model.',
        'Measurement triggered by an ultrasonic sensor.',
        'Board-to-board communication between two ESP32s (UART).',
      ],
    },
    stack: ['C/C++', 'FreeRTOS', 'ESP32', 'UART'],
  },
];

/* ------------------------------------------------------------ projets web */
export const webProjects: Project[] = [
  {
    title: 'ChuTTT',
    category: { fr: 'Plateforme web · multilingue', en: 'Web platform · multilingual' },
    summary: {
      fr: 'Plateforme suisse de comparaison de devis et mise en relation avec des professionnels vérifiés, avec modèle de cashback et programme de parrainage.',
      en: 'Swiss platform for comparing quotes and connecting with vetted professionals, with a cashback model and referral programme.',
    },
    role: { fr: 'Développement front-end & intégration', en: 'Front-end development & integration' },
    highlights: {
      fr: [
        'Internationalisation sur 3 langues (FR / DE / EN).',
        'Parcours de soumission de projet multi-étapes (logement, services, voyage, immobilier).',
        'Logique métier de cashback et de parrainage.',
      ],
      en: [
        'Internationalisation across 3 languages (FR / DE / EN).',
        'Multi-step project-submission flow (housing, services, travel, real estate).',
        'Cashback and referral business logic.',
      ],
    },
    stack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'i18n'],
    url: 'https://chuttt.ch',
    screenshot: '/chuttt.png',
  },
  {
    title: 'Narthex',
    category: { fr: 'SaaS · plateforme multi-tenant', en: 'SaaS · multi-tenant platform' },
    summary: {
      fr: "Plateforme tout-en-un pour les églises : génération d'un site personnalisé et gestion de la communauté (cultes, événements, membres). Un même moteur produit le site de chaque église.",
      en: 'All-in-one platform for churches: generates a custom website and manages the community (services, events, members). A single engine powers each church\'s site.',
    },
    role: { fr: 'Produit personnel - conception & développement complet', en: 'Personal product - full design & development' },
    highlights: {
      fr: [
        'Architecture multi-tenant : un moteur unique, un site dédié par église.',
        'Back-office de gestion paroissiale (cultes, événements, membres).',
        'Instance de démonstration en ligne et fonctionnelle (church-test.dev).',
      ],
      en: [
        'Multi-tenant architecture: a single engine, one dedicated site per church.',
        'Parish-management back office (services, events, members).',
        'Live, working demo instance (church-test.dev).',
      ],
    },
    stack: ['Next.js', 'TypeScript', 'React', 'Tailwind CSS'],
    status: { fr: 'En cours', en: 'In progress' },
    url: 'https://narthex.dev',
    demoUrl: 'https://church-test.dev',
    screenshot: '/narthex.png',
  },
  {
    title: 'Spotlight',
    category: { fr: 'Site vitrine · agence', en: 'Showcase site · agency' },
    summary: {
      fr: "Site vitrine d'une agence de communication : services, équipe et réalisations, avec animations et intégrations média.",
      en: 'Showcase site for a communication agency: services, team and work, with animations and media integrations.',
    },
    role: { fr: 'Développement front-end · déploiement Vercel', en: 'Front-end development · deployed on Vercel' },
    highlights: {
      fr: [
        'Animations et carrousel de présentation de l\'équipe.',
        'Intégration vidéo et inscription newsletter.',
        'Optimisation des images et déploiement continu sur Vercel.',
      ],
      en: [
        'Animations and team-presentation carousel.',
        'Video embedding and newsletter sign-up.',
        'Image optimisation and continuous deployment on Vercel.',
      ],
    },
    stack: ['Next.js', 'React', 'Tailwind CSS', 'Vercel'],
    url: 'https://spotlightcrea.vercel.app',
    screenshot: '/spotlight.png',
  },
  {
    title: 'Fortin',
    category: { fr: 'Site vitrine · associatif', en: 'Showcase site · non-profit' },
    summary: {
      fr: "Site de l'association audiovisuelle Fortin (documentaire, mémoire intergénérationnelle) : projets de films, équipe, dons et contact.",
      en: 'Website of the Fortin audiovisual non-profit (documentary, intergenerational memory): film projects, team, donations and contact.',
    },
    role: { fr: 'Vice-président de l\'association - conception & développement', en: 'Vice-president of the non-profit - design & development' },
    highlights: {
      fr: [
        'Présentation des séries documentaires (ex. « Un Portrait du Temps »).',
        'Intégrations réseaux sociaux multiples.',
        'Pages dons et contact.',
      ],
      en: [
        'Showcase of documentary series (e.g. "Un Portrait du Temps").',
        'Multiple social-media integrations.',
        'Donation and contact pages.',
      ],
    },
    stack: ['Astro', 'Tailwind CSS'],
    url: 'https://fortin-projet.fr',
    screenshot: '/fortin.png',
  },
];

/* ----------------------------------------------------------- compétences */
export interface SkillGroup {
  label: L;
  items: string[];
}

export const skills: SkillGroup[] = [
  {
    label: { fr: 'Embarqué & temps réel', en: 'Embedded & real-time' },
    items: ['C', 'C++', 'FreeRTOS', 'ESP32', 'Microcontrôleurs', 'UART', 'IrDA', 'CAN', 'VHDL', 'FPGA'],
  },
  {
    label: { fr: 'Langages', en: 'Languages' },
    items: ['C / C++', 'Python', 'JavaScript / TypeScript', 'VHDL'],
  },
  {
    label: { fr: 'Web', en: 'Web' },
    items: ['React', 'Next.js', 'Astro', 'Tailwind CSS', 'Flask', 'HTML / CSS'],
  },
  {
    label: { fr: 'Outils & méthodes', en: 'Tools & methods' },
    items: ['Git / GitHub', 'CI/CD (Jenkins)', 'PlatformIO', 'Quartus', 'ETAS', 'Linux', 'LaTeX', 'Gestion de projet'],
  },
];

/* ------------------------------------------------------------- formation */
export interface EducationItem {
  title: L;
  school: string;
  period: string;
}

export const education: EducationItem[] = [
  {
    title: { fr: "Diplôme d'ingénieur en informatique - Systèmes & logiciels embarqués", en: 'Computer engineering degree - Embedded systems & software' },
    school: 'TÉLÉCOM Nancy',
    period: '2022 – 2025',
  },
  {
    title: { fr: 'Classe préparatoire PC (Physique-Chimie)', en: 'Preparatory class PC (Physics-Chemistry)' },
    school: 'Lycée Victor Hugo, Besançon',
    period: '2020 – 2022',
  },
];

export const certifications: L<string>[] = [
  { fr: 'MOOC Gestion de Projet - Centrale Lille', en: 'Project Management MOOC - Centrale Lille' },
  { fr: "BAFA - Brevet d'Aptitude aux Fonctions d'Animateur", en: 'BAFA - French youth-leader certification' },
];

/* --------------------------------------------------------- chaînes d'UI */
export const ui = {
  nav: {
    about: { fr: 'Profil', en: 'About' },
    experience: { fr: 'Expériences', en: 'Experience' },
    embedded: { fr: 'Projets embarqués', en: 'Embedded projects' },
    web: { fr: 'Réalisations web', en: 'Web work' },
    skills: { fr: 'Compétences', en: 'Skills' },
    contact: { fr: 'Contact', en: 'Contact' },
  },
  hero: {
    cta_contact: { fr: 'Me contacter', en: 'Get in touch' },
    cta_projects: { fr: 'Voir les projets', en: 'See the work' },
  },
  sections: {
    experience: { fr: 'Expériences', en: 'Experience' },
    embedded: { fr: 'Projets embarqués', en: 'Embedded projects' },
    embedded_sub: {
      fr: 'Au cœur de mon métier : conception matérielle et logiciel temps réel.',
      en: 'The core of my craft: hardware design and real-time software.',
    },
    web: { fr: 'Réalisations web', en: 'Web work' },
    web_sub: {
      fr: 'Des produits réels, livrés de bout en bout pour de vrais clients - la preuve que je sais concevoir, développer et déployer un produit complet, en autonomie.',
      en: 'Real products, shipped end to end for real clients - proof that I can design, build and deploy a complete product autonomously.',
    },
    skills: { fr: 'Compétences', en: 'Skills' },
    education: { fr: 'Formation', en: 'Education' },
    certifications: { fr: 'Certifications', en: 'Certifications' },
    contact: { fr: 'Contact', en: 'Contact' },
    contact_sub: {
      fr: 'Une opportunité en logiciel embarqué ? Écrivons-nous.',
      en: 'An opportunity in embedded software? Let\'s talk.',
    },
  },
  labels: {
    role: { fr: 'Rôle', en: 'Role' },
    stack: { fr: 'Stack', en: 'Stack' },
    visit: { fr: 'Visiter le site', en: 'Visit site' },
    demo: { fr: 'Voir la démo', en: 'View demo' },
    code: { fr: 'Code', en: 'Code' },
  },
} satisfies Record<string, Record<string, L>>;

export function path(lang: Lang): string {
  return lang === 'fr' ? '/' : '/en/';
}
