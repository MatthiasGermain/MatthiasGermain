/* Traduction anglaise des données du portfolio (maquette.ts). Seuls les textes sont ici : liens,
 * stacks, dates du chronogramme et visuels restent dans maquette.ts. content.ts assemble les deux.
 * Mêmes règles qu'en français : ne jamais nommer le client constructeur de Schaeffler, des
 * personnes, des numéros internes ni la bibliothèque interne d'accès à Windchill. */
import type { Cat, Lane, Project, SectionId, StepId, Visual } from './maquette';

type ProjectText = Partial<Pick<Project, 'title' | 'experience' | 'status' | 'pitch' | 'cv' | 'role' | 'context' | 'visualNote' | 'codeNote'>> & {
  siteLabel?: string;
};

export const projects: Partial<Record<Visual, ProjectText>> = {
  routine: {
    cv: 'Connected ESP32 station: sensors, motor and local alarm, readings sent over MQTT to a web page.',
    status: 'In progress',
    pitch:
      'Connected monitoring station: an ESP32 reads sensors, drives a stepper motor and sends its readings over MQTT to a web page that shows them live.',
    role: 'Design and development, on my own',
    context: 'Personal project covering the whole chain, built step by step',
  },
  irda: {
    cv: 'Speed setpoint sent over infrared between two ESP32 boards, applied gradually under FreeRTOS.',
    pitch:
      "Driving an UrbanLoop capsule: a radar ESP32 sends a speed setpoint over infrared, and the capsule's ESP32 applies it gradually, unless the obstacle detection sends a GO, SLOW or STOP order, which takes priority.",
    role: 'Development of both ESP32 boards and their communication',
    context:
      'UrbanLoop engineering project, TÉLÉCOM Nancy, team of 4: the team detects obstacles (LiDAR, cameras, YOLO), my ESP32 boards drive the capsule',
  },
  risc: {
    cv: '32-bit RISC-V processor in VHDL, tested component by component, Python model and web simulator.',
    pitch:
      '32-bit RISC-V processor in VHDL, tested component by component, with a Python reference model and a web simulator.',
    role: 'Lab assignment done alone, web simulator added beyond the brief',
    context: 'Lab assignment, TÉLÉCOM Nancy',
    siteLabel: 'Simulator',
  },
  web: {
    title: 'Freelance web development',
    experience: 'Ongoing',
    pitch:
      'Freelance web developer since January 2026: websites and web platforms for clients, from design to production. Among them, a Swiss platform for comparing quotes and the website of a dance studio, with its admin area.',
    role: 'Freelance web developer',
    context: 'Strasbourg, remote, since Jan. 2026',
    codeNote: 'Client code: no public repository',
  },
  schaeffler: {
    experience: 'Final-year internship',
    pitch:
      'Automating the toolchain that generates the technical documentation for the control units of the DHT hybrid transmission: error reports each team can act on, and a delivery configuration that is checked, then generated automatically.',
    role: 'Software engineer, automation (final-year internship), Tools/Script Developers team',
    context: 'Bühl (Germany), Apr. - Sept. 2025, in English. Internal code, not published',
  },
  urbanloop: {
    title: 'UrbanLoop scale model',
    experience: 'Internship',
    pitch:
      "Making TÉLÉCOM Nancy's new UrbanLoop scale model usable in lab sessions: a redesigned switch logic on ESP32 (priority to the capsule leaving its loop, idle switch closed again), and real-time monitoring added to the existing Flask site.",
    role: '2nd-year internship, 8 weeks, in a pair',
    context: 'TÉLÉCOM Nancy, June - July 2024. Model with 2 capsules and 2 stepper-motor switches',
    codeNote: "Code on the school's internal GitLab: no public repository",
  },
  freertos: {
    title: 'FreeRTOS measurements',
    cv: 'CO₂, temperature and humidity measurement on two ESP32 boards, triggered by ultrasound, FreeRTOS tasks in a producer / consumer pattern.',
    pitch:
      'CO₂, temperature and humidity measurement, triggered by an ultrasonic sensor, on two ESP32 boards linked over a serial line. The concurrent FreeRTOS tasks follow a producer / consumer pattern.',
    role: 'Design and development',
    context: 'School project',
    codeNote: 'School project: the repository is no longer available',
  },
  spotify: {
    cv: 'History of my Spotify listening and a daily email report, run by GitHub Actions.',
    pitch: 'Python script that keeps the history of my Spotify listening and emails me a report every day.',
    role: 'Personal project',
    context: 'Run by GitHub Actions on a self-hosted runner',
  },
  narthex: {
    cv: 'Multi-tenant platform for churches: public website and management area.',
    status: 'In testing',
    pitch:
      'Multi-tenant platform for churches: each church gets its own public website and a management area (members, events, services).',
    role: 'Design and development',
    context: 'Being tested with a church',
  },
  spotweb: {
    pitch: 'Website of the Spotlight association: showcase site, contact form and double opt-in newsletter.',
    role: 'Volunteer web lead, development of the public site',
    context: 'Volunteer work, teamwork through pull requests',
    visualNote: 'Scroll the page',
    siteLabel: 'Website',
  },
};

export const catLabel: Record<Cat, string> = { embarque: 'Embedded', python: 'Python', web: 'Web' };
export const filterLabel: Record<'tout' | Cat, string> = { embarque: 'Embedded', tout: 'All', web: 'Web', python: 'Python' };

export const steps: Record<StepId, { when?: string; cvWhen?: string; title?: string; where?: string; line?: string; chronoLabel?: string }> = {
  freelance: {
    when: 'Since Jan. 2026',
    title: 'Freelance web developer',
    line: 'chuttt.ch, a multilingual platform (FR, DE, EN) connecting individuals with tradespeople, built on my own: authentication, front-end, Payload CMS back office, Supabase, Vercel. In progress: the website of a dance studio.',
  },
  spotlight: {
    when: 'Since Oct. 2023',
    cvWhen: 'Since 2023',
    title: 'Volunteer web lead',
    where: 'Spotlight association',
    line: 'Development and upkeep of spotlightcrea.fr.',
  },
  schaeffler: {
    when: 'Apr. - Sept. 2025',
    title: 'Software engineer, automation (final-year internship)',
    where: 'Schaeffler, Bühl (Germany)',
    line: 'Automated the toolchain that generates the technical documentation for the DHT hybrid transmission control units: error reports per team, delivery configuration checked and generated (Python, Jenkins, Windchill, Confluence).',
  },
  urbanloop: {
    when: 'June - July 2024',
    title: 'Embedded systems engineering intern',
    where: 'UrbanLoop scale model, TÉLÉCOM Nancy',
    line: "In a pair: switch logic on ESP32 (FreeRTOS) and real-time monitoring added to the model's Flask site.",
  },
  diplome: {
    title: "Master's in Engineering",
    line: 'Embedded systems and software track.',
  },
  prepa: {
    title: 'Preparatory classes (CPGE)',
    line: 'Intensive physics and chemistry program.',
    chronoLabel: 'Prep classes',
  },
};

export const lanes: Record<Lane, string> = {
  formation: 'Education',
  stage: 'Internships',
  freelance: 'Freelance',
  asso: 'Volunteering',
};

export const sections: Record<SectionId, { label: string; why: string; meta: string }> = {
  projets: {
    label: 'Projects',
    why: 'GPIO2, the pin of the LED in the "Blink" program: what I build.',
    meta: 'Projects by Matthias Germain: ESP32 and FreeRTOS firmware, a RISC-V processor in VHDL, Python tooling, websites and web platforms.',
  },
  experiences: {
    label: 'Experience',
    why: 'SD0 to SD3, the flash memory bus: what I learned and kept.',
    meta: "Matthias Germain's experience: freelance web developer, final-year internship at Schaeffler on software documentation automation, internship on the UrbanLoop scale model.",
  },
  parcours: {
    label: 'Timeline',
    why: 'CLK, the clock: time, hence the timeline.',
    meta: 'Timeline of Matthias Germain, TÉLÉCOM Nancy engineer: automotive software tooling, real-time embedded work on UrbanLoop, web development.',
  },
  contact: {
    label: 'Contact',
    why: 'TX and RX, the serial link: we transmit, we receive.',
    meta: 'Contact Matthias Germain, embedded and IoT software engineer in Strasbourg: form, email, LinkedIn, GitHub and CV.',
  },
};

export const buttons = { boot: 'Recruiter mode', en: 'Restart' };

export const DESCRIPTION =
  'Matthias Germain, embedded and IoT software engineer. TÉLÉCOM Nancy graduate, based in Strasbourg. I work across the whole chain of a connected system: the firmware, the Python tooling around it and the web interface.';

export const PROFILE =
  'Engineering graduate from TÉLÉCOM Nancy, embedded systems and software track. I work across the whole chain of a connected system: the firmware, the Python tooling around it and the web interface. I am looking for a permanent position as a software engineer, embedded or web, in Strasbourg or Nancy, and I am available immediately.';

export const skillAreas: Record<string, string> = {
  Embarqué: 'Embedded',
  'Outillage Python': 'Python tooling',
  Web: 'Web',
  Outils: 'Tools',
};
// Compétences et étiquettes de stack dont le nom change en anglais
export const skillItems: Record<string, string> = { 'API REST': 'REST APIs', 'Confluence (API REST)': 'Confluence (REST API)' };

export const cvExtras = [
  'Fortin: vice-president of an association devoted to memory across generations, whose website I built.',
  'Project management MOOC, Centrale Lille.',
  "Driver's license (B).",
];
