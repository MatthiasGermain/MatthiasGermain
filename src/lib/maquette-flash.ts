/* BOOT : sur une vraie carte, BOOT au démarrage = mode programmation, on flashe un nouveau
 * firmware. Ici, on « flashe » le CV : courte séquence façon esptool, puis le mode recruteur.
 * Partagé par toutes les pages de la maquette. Un clic ou Échap passe la séquence. */

const LINES: [string, number][] = [
  ['esptool.py v4.7.0', 60],
  ['Serial port /dev/ttyMATTHIAS', 60],
  ['Connecting....', 220],
  ['Chip is ESP32-D0WD-V3 (revision v3.1)', 60],
  ['Uploading stub... Running stub...', 120],
  ['Compressed firmware: cv-matthias-germain.bin', 80],
  ['Writing at 0x00010000... (25 %)', 90],
  ['Writing at 0x00020000... (50 %)', 90],
  ['Writing at 0x00030000... (75 %)', 90],
  ['Writing at 0x00040000... (100 %)', 90],
  ['Hash of data verified.', 80],
  ['Hard resetting via RTS pin...', 250],
];

let overlay: HTMLElement | null = null;
let running = false;

function ensureOverlay() {
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'flash';
  overlay.hidden = true;
  overlay.innerHTML =
    '<div class="flash-term" role="status" aria-live="polite">' +
    '<p class="flash-title">Mode programmation · BOOT</p>' +
    '<pre class="flash-log"></pre>' +
    '<p class="flash-skip">Clic ou Échap pour passer</p>' +
    '</div>';
  document.body.append(overlay);
  return overlay;
}

export function runFlash(href = '/cv') {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    location.href = href;
    return;
  }
  if (running) return;
  running = true;
  const el = ensureOverlay();
  const log = el.querySelector<HTMLElement>('.flash-log')!;
  el.hidden = false;
  log.textContent = '';
  let i = 0;
  let timer = 0;
  const go = () => {
    clearTimeout(timer);
    window.removeEventListener('keydown', onKey);
    location.href = href;
  };
  const onKey = (e: KeyboardEvent) => e.key === 'Escape' && go();
  el.addEventListener('click', go, { once: true });
  window.addEventListener('keydown', onKey);
  const next = () => {
    if (i >= LINES.length) return go();
    const [line, delay] = LINES[i++];
    log.textContent += (log.textContent ? '\n' : '') + line;
    timer = window.setTimeout(next, delay);
  };
  next();
}

/** Branche la séquence sur les liens `[data-flash]`, et la referme au retour arrière (cache de page). */
export function bindFlashLinks(root: ParentNode = document) {
  root.querySelectorAll<HTMLAnchorElement>('a[data-flash]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      runFlash(a.getAttribute('href') ?? '/cv');
    }),
  );
  window.addEventListener('pageshow', () => {
    if (overlay) overlay.hidden = true;
    running = false;
  });
}
