import { Renderer, Camera, Transform, Geometry, Program, Mesh, Texture, Plane, Vec3 } from 'ogl';

/* ============================================================================
 *  ESP32 en 3D, dessiné au trait (hero du portfolio).
 * ----------------------------------------------------------------------------
 *  Le modèle vient de `public/models/esp32.bin`, produit par
 *  `tools/esp32-model/build_model.py` à partir de « ESP32 Wroom » de TER1Z
 *  (Sketchfab, CC BY 4.0, https://sketchfab.com/3d-models/esp32-wroom-fd714190aacc4e3f9c26b8d7e27807fc) :
 *    u32 longueur de l'en-tête JSON | en-tête JSON
 *    | faces papier : positions Uint16 quantifiées, indices Uint16
 *    | faces encre (sérigraphie) : positions Uint16 quantifiées, indices Uint16
 *    | arêtes Uint16 (paires de sommets papier) | ordre de tracé Uint16 par arête
 *
 *  Rendu : faces couleur papier légèrement ombrées, arêtes en bleu nuit, sérigraphie
 *  imprimée en bleu nuit, et un marquage (signature + nom) sur le blindage du module.
 *  Animation (« démarrage ») : tracé des arêtes depuis la puce, ombrage, gravure
 *  du marquage, puis la LED d'alimentation s'allume ; ensuite léger balancement et
 *  inclinaison suivant la souris. Interactions : un clic sur la carte fait clignoter
 *  la LED bleue (GPIO2, celle du programme « Blink »), un clic sur un bouton (BOOT ou
 *  EN) relance le démarrage. L'intensité de la LED d'alimentation est transmise à la
 *  page (`onLed`) pour piloter la LED de l'étiquette « Disponible ».
 *  Avec `reducedMotion`, une seule image finale est rendue, LED allumée.
 * ========================================================================== */

type Point3 = [number, number, number];

interface Esp32Header {
  bbox: { min: number[]; max: number[] };
  paper: { vertices: number; triangles: number };
  ink: { vertices: number; triangles: number };
  edges: number;
  shieldTop: { min: number[]; max: number[] };
  pinsBelow: number;
  features: { boot: Point3; en: Point3; led: Point3; ledUser: Point3 };
  pins: { name: string; row: 'front' | 'back'; index: number; pos: Point3 }[];
  reveal: { center: [number, number]; radius: number };
}

export interface Esp32Model {
  header: Esp32Header;
  positions: Float32Array;
  indices: Uint16Array;
  inkPositions: Float32Array;
  inkIndices: Uint16Array;
  lineStart: Float32Array;
  lineEnd: Float32Array;
  lineReveal: Float32Array;
  center: [number, number, number];
}

export async function loadEsp32(url: string): Promise<Esp32Model> {
  const buf = await (await fetch(url)).arrayBuffer();
  const view = new DataView(buf);
  const headerLength = view.getUint32(0, true);
  const header: Esp32Header = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, headerLength)));
  let offset = 4 + headerLength;
  const take = (count: number) => {
    const arr = new Uint16Array(buf, offset, count);
    offset += arr.byteLength;
    return arr;
  };

  const q = take(header.paper.vertices * 3);
  const indices = take(header.paper.triangles * 3);
  const inkQ = take(header.ink.vertices * 3);
  const inkIndices = take(header.ink.triangles * 3);
  const edges = take(header.edges * 2);
  const reveal = take(header.edges);

  const { min, max } = header.bbox;
  const center: [number, number, number] = [0, 1, 2].map((i) => (min[i] + max[i]) / 2) as [number, number, number];
  const dequantize = (src: Uint16Array) => {
    const out = new Float32Array(src.length);
    for (let i = 0; i < src.length; i++) {
      const axis = i % 3;
      out[i] = min[axis] + (src[i] / 65535) * (max[axis] - min[axis]) - center[axis];
    }
    return out;
  };
  const positions = dequantize(q);
  const inkPositions = dequantize(inkQ);

  // Une instance par arête (début, fin, ordre de tracé) : chaque arête est dessinée comme un
  // petit rectangle tourné vers l'écran, pour des traits épais et lissés.
  const lineStart = new Float32Array(header.edges * 3);
  const lineEnd = new Float32Array(header.edges * 3);
  const lineReveal = new Float32Array(header.edges);
  for (let e = 0; e < header.edges; e++) {
    const a = edges[e * 2];
    const b = edges[e * 2 + 1];
    lineStart.set(positions.subarray(a * 3, a * 3 + 3), e * 3);
    lineEnd.set(positions.subarray(b * 3, b * 3 + 3), e * 3);
    lineReveal[e] = reveal[e] / 65535;
  }

  return { header, positions, indices, inkPositions, inkIndices, lineStart, lineEnd, lineReveal, center };
}

const hex = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];

const PAPER = hex('#faf7f3');
const SHADE = hex('#ddd4ca');
const INK = hex('#1e2952');
const SUN = hex('#fcca46');
const INDIGO = hex('#8b80f9');

// Sérigraphie : faces remplies en bleu nuit, qui apparaissent avec les faces papier.
const inkFragment = /* glsl */ `#version 300 es
precision highp float;
uniform vec3 uInk;
uniform float uFill;
out vec4 color;
void main() {
  color = vec4(uInk * uFill, uFill);
}`;

const meshVertex = /* glsl */ `#version 300 es
in vec3 position;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
out vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const meshFragment = /* glsl */ `#version 300 es
precision highp float;
in vec3 vWorld;
uniform vec3 uPaper;
uniform vec3 uShade;
uniform vec3 uLight;
uniform float uShadeAmount;
uniform float uFill;
out vec4 color;
void main() {
  // Normale plate calculée à partir des dérivées : pas besoin de normales dans le fichier.
  vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  float l = abs(dot(n, normalize(uLight)));
  vec3 c = mix(uShade, uPaper, mix(1.0, 0.35 + 0.65 * l, uShadeAmount));
  // Pendant le tracé, les faces écrivent la profondeur (elles masquent les arêtes cachées)
  // mais restent invisibles, puis apparaissent en fondu.
  color = vec4(c * uFill, uFill);
}`;

// Trait épais : le rectangle d'une arête est construit à l'écran, en pixels, autour du segment.
// corner.x choisit l'extrémité (0 = début, 1 = fin), corner.y le côté (-1 / +1).
const lineVertex = /* glsl */ `#version 300 es
in vec2 corner;
in vec3 start;
in vec3 end;
in float reveal;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec2 uResolution;
uniform float uWidth;
out float vReveal;
out float vSide;
void main() {
  vec4 a = projectionMatrix * modelViewMatrix * vec4(start, 1.0);
  vec4 b = projectionMatrix * modelViewMatrix * vec4(end, 1.0);
  vec2 sa = a.xy / a.w * 0.5 * uResolution;
  vec2 sb = b.xy / b.w * 0.5 * uResolution;
  vec2 d = sb - sa;
  float len = length(d);
  vec2 dir = len > 1e-4 ? d / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float hw = 0.5 * uWidth + 1.0; // +1 px pour adoucir les bords
  bool atStart = corner.x < 0.5;
  vec4 p = atStart ? a : b;
  vec2 off = nrm * corner.y * hw + dir * (atStart ? -0.5 : 0.5) * uWidth;
  p.xy += off / (0.5 * uResolution) * p.w;
  gl_Position = p;
  vSide = corner.y * hw;
  vReveal = reveal;
}`;

const lineFragment = /* glsl */ `#version 300 es
precision highp float;
in float vReveal;
in float vSide;
uniform vec3 uInk;
uniform float uProgress;
uniform float uWidth;
out vec4 color;
void main() {
  if (vReveal > uProgress) discard;
  float alpha = clamp(0.5 * uWidth + 0.5 - abs(vSide), 0.0, 1.0);
  color = vec4(uInk * alpha, alpha);
}`;

// Silhouette des broches (surfaces arrondies, sans arête vive) : « coque inversée ».
// On dessine les faces arrière, gonflées de quelques pixels le long de la normale, en bleu nuit.
const hullVertex = /* glsl */ `#version 300 es
in vec3 position;
in vec3 normal;
in float reveal;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec2 uResolution;
uniform float uWidth;
out float vReveal;
void main() {
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vec2 n = (projectionMatrix * modelViewMatrix * vec4(normal, 0.0)).xy;
  float l = length(n);
  if (l > 1e-5) p.xy += n / l * uWidth / (0.5 * uResolution) * p.w;
  gl_Position = p;
  vReveal = reveal;
}`;

const hullFragment = /* glsl */ `#version 300 es
precision highp float;
in float vReveal;
uniform vec3 uInk;
uniform float uProgress;
out vec4 color;
void main() {
  if (vReveal > uProgress) discard;
  color = vec4(uInk, 1.0);
}`;

/** Extrait les broches (sous la carte) avec des normales lissées, pour la coque inversée. */
function buildPinHull(model: Esp32Model, zMax: number) {
  const { positions, indices } = model;
  const keep: number[] = [];
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t], b = indices[t + 1], c = indices[t + 2];
    if (positions[a * 3 + 2] < zMax && positions[b * 3 + 2] < zMax && positions[c * 3 + 2] < zMax) keep.push(a, b, c);
  }
  const remap = new Map<number, number>();
  const idx = new Uint16Array(keep.length);
  keep.forEach((v, i) => {
    if (!remap.has(v)) remap.set(v, remap.size);
    idx[i] = remap.get(v)!;
  });
  const pos = new Float32Array(remap.size * 3);
  remap.forEach((n, v) => pos.set(positions.subarray(v * 3, v * 3 + 3), n * 3));

  // Normales lissées : somme des normales des faces voisines (pondérées par l'aire)
  const nrm = new Float32Array(pos.length);
  for (let t = 0; t < idx.length; t += 3) {
    const [i, j, k] = [idx[t] * 3, idx[t + 1] * 3, idx[t + 2] * 3];
    const ux = pos[j] - pos[i], uy = pos[j + 1] - pos[i + 1], uz = pos[j + 2] - pos[i + 2];
    const vx = pos[k] - pos[i], vy = pos[k + 1] - pos[i + 1], vz = pos[k + 2] - pos[i + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const o of [i, j, k]) {
      nrm[o] += nx;
      nrm[o + 1] += ny;
      nrm[o + 2] += nz;
    }
  }
  const reveal = new Float32Array(remap.size);
  const { center: rc, radius } = model.header.reveal;
  for (let v = 0; v < remap.size; v++) {
    const l = Math.hypot(nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2]) || 1;
    nrm[v * 3] /= l;
    nrm[v * 3 + 1] /= l;
    nrm[v * 3 + 2] /= l;
    // même ordre de tracé que les arêtes : depuis la puce vers l'extérieur
    const x = pos[v * 3] + model.center[0], y = pos[v * 3 + 1] + model.center[1];
    reveal[v] = Math.min(1, Math.hypot(x - rc[0], y - rc[1]) / radius);
  }
  return { pos, nrm, idx, reveal };
}

const decalVertex = /* glsl */ `#version 300 es
in vec3 position;
in vec2 uv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position.z -= 0.0003 * gl_Position.w;
}`;

const decalFragment = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D tMap;
uniform float uOpacity;
out vec4 color;
void main() {
  vec4 t = texture(tMap, vUv);
  float a = t.a * uOpacity;
  color = vec4(t.rgb * a, a);
}`;

// Halo de la LED et anneau de survol du bouton BOOT : un carré toujours face à l'écran,
// de taille fixe en pixels, centré sur un point de la carte.
const spriteVertex = /* glsl */ `#version 300 es
in vec2 corner;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 uCenter;
uniform vec2 uResolution;
uniform float uSize;
out vec2 vCorner;
void main() {
  vec4 p = projectionMatrix * modelViewMatrix * vec4(uCenter, 1.0);
  p.xy += corner * uSize / (0.5 * uResolution) * p.w;
  gl_Position = p;
  vCorner = corner;
}`;

const spriteFragment = /* glsl */ `#version 300 es
precision highp float;
in vec2 vCorner;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uRing;
out vec4 color;
void main() {
  float d = length(vCorner);
  float a;
  vec3 c = uColor;
  if (uRing > 0.5) {
    a = smoothstep(0.6, 0.7, d) * (1.0 - smoothstep(0.82, 0.92, d));
  } else {
    float core = 1.0 - smoothstep(0.12, 0.26, d);
    a = exp(-d * d * 4.0) * 0.9 + core;
    c = mix(uColor, vec3(1.0, 0.97, 0.86), core * 0.7);
  }
  a = clamp(a * uIntensity, 0.0, 1.0);
  if (a < 0.004) discard;
  color = vec4(c * a, a);
}`;

/* ---------------------------------------------------------------- marquage */

interface MarkingOptions {
  signaturePath: string;
  signatureViewBox: [number, number];
  /** Ligne gravée sous le nom (par défaut, en français) */
  tagline?: string;
}

/** Dessine le marquage complet (sans animation) sur un canevas hors écran. */
function drawMarking(w: number, h: number, opts: MarkingOptions): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const ink = '#1e2952';
  const pad = w * 0.07;
  const inner = w - pad * 2;

  // Réduit la taille de police jusqu'à ce que le texte tienne dans la largeur utile.
  const fit = (text: string, weight: number, family: string, size: number) => {
    ctx.font = `${weight} ${size}px ${family}`;
    const m = ctx.measureText(text).width;
    if (m > inner) ctx.font = `${weight} ${(size * inner) / m}px ${family}`;
  };

  // Cadre fin, comme le liseré d'un marquage laser
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = w * 0.006;
  ctx.strokeRect(pad * 0.45, pad * 0.45, w - pad * 0.9, h - pad * 0.9);
  ctx.globalAlpha = 1;

  // Signature, sur toute la largeur utile
  const [vbw, vbh] = opts.signatureViewBox;
  const s = inner / vbw;
  ctx.save();
  ctx.translate(pad, pad * 0.75);
  ctx.scale(s, s);
  ctx.fillStyle = ink;
  ctx.fill(new Path2D(opts.signaturePath), 'evenodd');
  ctx.restore();
  const sigBottom = pad * 0.75 + vbh * s;

  // Nom, calé sur la même largeur
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#c9a0dc';
  fit('GERMAIN', 900, "'Figtree Variable', system-ui, sans-serif", w * 0.2);
  const nameSize = parseFloat(ctx.font.split(' ')[1]);
  ctx.fillText('GERMAIN', pad, sigBottom + nameSize * 0.78);

  // Une seule ligne, assez grande pour rester lisible à l'échelle du hero
  ctx.fillStyle = ink;
  const tagline = opts.tagline ?? 'EMBARQUÉ & IoT';
  fit(tagline, 700, "'Montserrat Variable', system-ui, sans-serif", w * 0.085);
  ctx.fillText(tagline, pad, h - pad * 0.95);
  return c;
}

/* -------------------------------------------------------------------- scène */

export interface Esp32SceneOptions extends MarkingOptions {
  reducedMotion: boolean;
  /** Appelée à chaque changement d'intensité de la LED (0 = éteinte, 1 = pleine). */
  onLed?: (intensity: number) => void;
  /** Clic sur le bouton BOOT. Sans ce rappel, BOOT redémarre la carte comme EN. */
  onBoot?: () => void;
  /** Appelée à chaque redémarrage (EN, ou `restart()`). */
  onRestart?: () => void;
  /** Appelée après chaque image : `project` donne la position à l'écran (px, relative au cadre) d'un point du modèle. */
  onFrame?: (project: (p: Point3) => [number, number]) => void;
  /** Cadrage : angle de vue (degrés au-dessus de l'horizontale) et marges autour de la carte (fraction du cadre). */
  view?: { elevation?: number; marginX?: number; marginY?: number };
  /** Amplitude du balancement au repos (radians). */
  sway?: number;
  /** Carte debout (écran en hauteur) : USB en bas, antenne en haut, marquage tourné pour rester lisible. */
  portrait?: boolean;
  /** Mode économe (mobile) : une fois le démarrage terminé et sans interaction, plus aucune image n'est calculée. */
  idleStop?: boolean;
}

// Moments du démarrage (secondes)
const LINES_END = 1.8;
const LED_ON = 3.25;
const LED_RAMP = 0.15;
const BREATH = 2.4; // période de la respiration de la LED, comme celle de l'étiquette « Disponible »
const BLINK_STEP = 0.15; // 6 demi-périodes : allumée, éteinte... trois clignotements

export function createEsp32Scene(container: HTMLElement, model: Esp32Model, opts: Esp32SceneOptions) {
  // Alpha prémultiplié : sinon les bords lissés des faces virent au gris (liseré parasite autour
  // de la carte). Les shaders transparents sortent donc des couleurs multipliées par leur alpha.
  const renderer = new Renderer({
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
  });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);
  container.appendChild(gl.canvas);

  // Boucle de rendu : `wake()` relance le calcul des images (défini en fin d'initialisation)
  let raf = 0;
  let ready = false;
  let wake = () => {};

  const camera = new Camera(gl, { fov: 30, near: 10, far: 1000 });
  const scene = new Transform();
  const pivot = new Transform();
  pivot.setParent(scene);
  // Orientation de base : carte couchée (USB à gauche) ou debout (USB en bas, antenne en haut)
  const yaw = opts.portrait ? Math.PI / 2 : 0;
  const base = new Transform();
  base.rotation.y = yaw;
  base.setParent(pivot);
  const board = new Transform();
  board.rotation.x = -Math.PI / 2; // le Z du modèle (vers le haut de la carte) devient le Y de la scène
  board.setParent(base);
  // Point du modèle (repère centré) -> repère de la scène, sans le balancement
  const toScene = (p: Point3): Point3 => {
    const [x, y, z] = [p[0], p[2], -p[1]];
    return [x * Math.cos(yaw) + z * Math.sin(yaw), y, -x * Math.sin(yaw) + z * Math.cos(yaw)];
  };

  // Faces
  const meshProgram = new Program(gl, {
    vertex: meshVertex,
    fragment: meshFragment,
    cullFace: false,
    // Transparent pour le fondu d'apparition, mais dessiné en premier (renderOrder) et
    // en écrivant la profondeur, comme un objet opaque.
    transparent: true,
    depthWrite: true,
    uniforms: {
      uPaper: { value: PAPER },
      uShade: { value: SHADE },
      uLight: { value: [0.35, 1.0, 0.55] },
      uShadeAmount: { value: 0 },
      uFill: { value: 0 },
    },
  });
  const faces = new Mesh(gl, {
    geometry: new Geometry(gl, {
      position: { size: 3, data: model.positions },
      index: { data: model.indices },
    }),
    program: meshProgram,
    renderOrder: -1,
  });
  // Les faces sont repoussées en profondeur (proportionnellement à leur pente) pour que les
  // traits posés sur leurs arêtes ne soient jamais coupés, même vus de biais.
  faces.onBeforeRender(() => {
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.5, 3.0);
  });
  faces.onAfterRender(() => gl.disable(gl.POLYGON_OFFSET_FILL));
  faces.setParent(board);

  // Sérigraphie : en relief de quelques centièmes de millimètre sur le PCB, même décalage
  // de profondeur que les faces pour garder leur ordre.
  const inkProgram = new Program(gl, {
    vertex: meshVertex,
    fragment: inkFragment,
    cullFace: false,
    transparent: true,
    depthWrite: true,
    uniforms: { uInk: { value: INK }, uFill: { value: 0 } },
  });
  const ink = new Mesh(gl, {
    geometry: new Geometry(gl, {
      position: { size: 3, data: model.inkPositions },
      index: { data: model.inkIndices },
    }),
    program: inkProgram,
    renderOrder: -1,
  });
  ink.onBeforeRender(() => {
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.5, 3.0);
  });
  ink.onAfterRender(() => gl.disable(gl.POLYGON_OFFSET_FILL));
  ink.setParent(board);

  // Silhouette des broches : sous le support plastique (repère `pinsBelow` de l'en-tête)
  const hull = buildPinHull(model, model.header.pinsBelow - model.center[2]);
  const hullProgram = new Program(gl, {
    vertex: hullVertex,
    fragment: hullFragment,
    cullFace: gl.FRONT,
    uniforms: {
      uInk: { value: INK },
      uProgress: { value: 0 },
      uResolution: { value: [1, 1] },
      uWidth: { value: 1.2 },
    },
  });
  new Mesh(gl, {
    geometry: new Geometry(gl, {
      position: { size: 3, data: hull.pos },
      normal: { size: 3, data: hull.nrm },
      reveal: { size: 1, data: hull.reveal },
      index: { data: hull.idx },
    }),
    program: hullProgram,
    frustumCulled: false,
  }).setParent(board);

  // Arêtes : un rectangle instancié par arête
  const lineProgram = new Program(gl, {
    vertex: lineVertex,
    fragment: lineFragment,
    cullFace: false,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uInk: { value: INK },
      uProgress: { value: 0 },
      uResolution: { value: [1, 1] },
      uWidth: { value: 1.5 },
    },
  });
  new Mesh(gl, {
    geometry: new Geometry(gl, {
      corner: { size: 2, data: new Float32Array([0, -1, 1, -1, 1, 1, 0, 1]) },
      index: { data: new Uint16Array([0, 1, 2, 0, 2, 3]) },
      start: { instanced: 1, size: 3, data: model.lineStart },
      end: { instanced: 1, size: 3, data: model.lineEnd },
      reveal: { instanced: 1, size: 1, data: model.lineReveal },
    }),
    program: lineProgram,
    frustumCulled: false,
  }).setParent(board);

  // Marquage sur le dessus du blindage
  const { min, max } = model.header.shieldTop;
  const inset = 0.5;
  // Carte debout : le marquage est tourné d'un quart de tour pour se lire à l'horizontale,
  // sa largeur suit alors la profondeur du blindage.
  const shieldX = max[0] - min[0] - inset * 2;
  const shieldY = max[1] - min[1] - inset * 2;
  const [dw, dh] = opts.portrait ? [shieldY, shieldX] : [shieldX, shieldY];
  const texW = 1024;
  const texH = Math.round((texW * dh) / dw);
  const full = drawMarking(texW, texH, opts);
  const live = document.createElement('canvas');
  live.width = texW;
  live.height = texH;
  const liveCtx = live.getContext('2d')!;
  // Mipmaps indispensables : la texture est affichée bien plus petite que sa taille réelle,
  // sans elles la réduction crénèle les lettres et les rend illisibles.
  const texture = new Texture(gl, {
    image: live,
    generateMipmaps: true,
    minFilter: gl.LINEAR_MIPMAP_LINEAR,
    anisotropy: 8,
  });

  const drawEngraving = (p: number) => {
    liveCtx.fillStyle = '#faf7f3';
    liveCtx.fillRect(0, 0, texW, texH);
    if (p <= 0) return;
    const x = texW * p;
    liveCtx.drawImage(full, 0, 0, x, texH, 0, 0, x, texH);
    if (p < 1) {
      // Faisceau du « laser » à l'endroit où la gravure avance
      const g = liveCtx.createLinearGradient(x - 40, 0, x + 6, 0);
      g.addColorStop(0, 'rgba(252,202,70,0)');
      g.addColorStop(1, 'rgba(252,202,70,0.9)');
      liveCtx.fillStyle = g;
      liveCtx.fillRect(x - 40, 0, 46, texH);
    }
  };

  // Le marquage apparaît avec les faces.
  const decalOpacity = { value: 0 };
  const decal = new Mesh(gl, {
    geometry: new Plane(gl, { width: dw, height: dh }),
    program: new Program(gl, {
      vertex: decalVertex,
      fragment: decalFragment,
      cullFace: false,
      transparent: true,
      uniforms: { tMap: { value: texture }, uOpacity: decalOpacity },
    }),
    frustumCulled: false,
  });
  decal.position.set((min[0] + max[0]) / 2 - model.center[0], (min[1] + max[1]) / 2 - model.center[1], max[2] - model.center[2] + 0.03);
  if (opts.portrait) decal.rotation.z = -Math.PI / 2;
  decal.setParent(board);

  // Repères de la carte, dans le repère centré du modèle
  const local = (p: Point3): Point3 => [p[0] - model.center[0], p[1] - model.center[1], p[2] - model.center[2]];
  const { boot, en, led, ledUser } = model.header.features;

  // Halos des LED et anneaux des boutons
  const spriteGeometry = () =>
    new Geometry(gl, {
      corner: { size: 2, data: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]) },
      index: { data: new Uint16Array([0, 1, 2, 0, 2, 3]) },
    });
  const spriteProgram = (center: Point3, color: [number, number, number], ring: boolean) =>
    new Program(gl, {
      vertex: spriteVertex,
      fragment: spriteFragment,
      cullFace: false,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uCenter: { value: local(center) },
        uColor: { value: color },
        uIntensity: { value: 0 },
        uRing: { value: ring ? 1 : 0 },
        uResolution: { value: [1, 1] },
        uSize: { value: 1 },
      },
    });
  // LED d'alimentation (rouge sur la vraie carte) : en jaune, comme la LED « Disponible ».
  // LED de GPIO2 (bleue) : en indigo, elle clignote au clic.
  const ledProgram = spriteProgram([led[0], led[1], led[2] + 0.15], SUN, false);
  const userLedProgram = spriteProgram([ledUser[0], ledUser[1], ledUser[2] + 0.15], INDIGO, false);
  // Les deux boutons redémarrent la carte : BOOT (IO0, devant) et EN (le reset, derrière).
  const buttons = [boot, en].map((p) => ({ point: local(p), program: spriteProgram(p, SUN, true), hover: 0, target: 0 }));
  // Anneau de mise en évidence d'une broche (survol d'une étiquette de section)
  const pinRingProgram = spriteProgram([0, 0, 0], SUN, true);
  const pinRing = { value: 0, target: 0 };
  for (const program of [ledProgram, userLedProgram, pinRingProgram, ...buttons.map((b) => b.program)]) {
    new Mesh(gl, { geometry: spriteGeometry(), program, frustumCulled: false, renderOrder: 10 }).setParent(board);
  }

  // Cadrage : la carte entière tient dans le cadre avec les marges demandées, vue de devant et d'au-dessus.
  // Les 8 coins de la boîte englobante sont projetés et la distance de la caméra est ajustée en conséquence.
  const elevation = ((opts.view?.elevation ?? 34) * Math.PI) / 180;
  const marginX = opts.view?.marginX ?? 0.08;
  const marginY = opts.view?.marginY ?? 0.12;
  const { min: bmin, max: bmax } = model.header.bbox;
  const corners: Point3[] = [];
  for (const x of [bmin[0], bmax[0]]) for (const y of [bmin[1], bmax[1]]) for (const z of [bmin[2], bmax[2]]) corners.push(local([x, y, z]));
  let camDist = 100;
  let camTarget: Point3 = [0, 0, 0];
  // Caméra placée au-dessus de `target` (repère de la scène), à la distance `dist`
  const placeCamera = (target: Point3, dist: number) => {
    camera.position.set(target[0], target[1] + dist * Math.sin(elevation), target[2] + dist * Math.cos(elevation));
    camera.lookAt(target);
  };
  const fitCamera = () => {
    const target: Point3 = [0, 0, 0];
    let dist = 100;
    for (let i = 0; i < 6; i++) {
      placeCamera(target, dist);
      camera.updateMatrixWorld();
      let [x0, x1, y0, y1] = [Infinity, -Infinity, Infinity, -Infinity];
      for (const c of corners) {
        // repère du modèle -> scène : rotation de -90° autour de X (Z du modèle vers le haut)
        const v = new Vec3(...toScene(c));
        camera.project(v);
        [x0, x1, y0, y1] = [Math.min(x0, v.x), Math.max(x1, v.x), Math.min(y0, v.y), Math.max(y1, v.y)];
      }
      let mx = Math.max(-x0, x1);
      let my = Math.max(-y0, y1);
      if (opts.portrait) {
        // Carte debout : la perspective la décale vers le bas ; on la recentre dans le cadre (la cible
        // glisse le long des axes de l'écran) pour profiter de toute la hauteur.
        const half = dist * Math.tan((camera.fov * Math.PI) / 360);
        const m = camera.worldMatrix;
        const dx = ((x0 + x1) / 2) * half * camera.aspect;
        const dy = ((y0 + y1) / 2) * half;
        for (let k = 0; k < 3; k++) target[k] += m[k] * dx + m[4 + k] * dy;
        mx = (x1 - x0) / 2;
        my = (y1 - y0) / 2;
      }
      dist *= Math.max(mx / (1 - marginX), my / (1 - marginY));
    }
    camDist = dist;
    camTarget = target;
    placeCamera(camTarget, camDist);
  };

  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    lineProgram.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height];
    lineProgram.uniforms.uWidth.value = 1.5 * renderer.dpr;
    hullProgram.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height];
    hullProgram.uniforms.uWidth.value = 1.2 * renderer.dpr;
    const sprites: [Program, number][] = [
      [ledProgram, 24],
      [userLedProgram, 20],
      [pinRingProgram, 12],
      ...buttons.map((b): [Program, number] => [b.program, 15]),
    ];
    for (const [program, size] of sprites) {
      program.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height];
      program.uniforms.uSize.value = size * renderer.dpr;
    }
    camera.perspective({ aspect: w / h });
    fitCamera();
    // Le canevas est vidé quand sa taille change : il faut recalculer une image
    if (ready) wake();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // Souris : légère inclinaison
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e: PointerEvent) => {
    const r = container.getBoundingClientRect();
    pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    pointer.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  };

  const ease = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3));

  // Position à l'écran (px, relative au cadre) d'un point du modèle, d'après la dernière image
  const project = (p: Point3): [number, number] => {
    const v = new Vec3(...local(p)).applyMatrix4(board.worldMatrix);
    camera.project(v);
    return [(v.x * 0.5 + 0.5) * container.clientWidth, (0.5 - v.y * 0.5) * container.clientHeight];
  };
  const render = () => {
    renderer.render({ scene, camera });
    opts.onFrame?.(project);
  };

  // Quel bouton est sous le pointeur ? (test à l'écran, d'après la dernière image rendue)
  const buttonAt = (e: MouseEvent) => {
    const r = container.getBoundingClientRect();
    return buttons.find((b) => {
      const v = new Vec3(...b.point).applyMatrix4(board.worldMatrix);
      camera.project(v);
      const sx = (v.x * 0.5 + 0.5) * r.width;
      const sy = (0.5 - v.y * 0.5) * r.height;
      return Math.hypot(e.clientX - r.left - sx, e.clientY - r.top - sy) < 18;
    });
  };

  // Zoom de la caméra vers une broche (transition vers une autre page)
  let zoom: { from: number; dur: number; to: Point3 } | null = null;

  // Mise en évidence d'une broche et LED de GPIO2 allumée en continu, pilotées par la page
  let userLedHold = false;
  const api = {
    highlight(p: Point3 | null) {
      if (p) pinRingProgram.uniforms.uCenter.value = local(p);
      pinRing.target = p ? 1 : 0;
      if (opts.reducedMotion) pinRingProgram.uniforms.uIntensity.value = pinRing.target;
      wake();
    },
    userLed(on: boolean) {
      userLedHold = on;
      if (opts.reducedMotion) userLedProgram.uniforms.uIntensity.value = on ? 1 : 0;
      wake();
    },
    restart() {},
    /** Avance la caméra vers un point du modèle (repère d'origine) en `ms` millisecondes. */
    zoomTo(p: Point3, ms = 450) {
      zoom = { from: performance.now(), dur: ms, to: p };
      wake();
    },
    /** Revient au cadrage normal (par exemple au retour arrière depuis une autre page). */
    resetView() {
      zoom = null;
      fitCamera();
      wake();
    },
  };

  let lastLed = -1;
  const setLed = (v: number) => {
    ledProgram.uniforms.uIntensity.value = v;
    if (Math.abs(v - lastLed) > 0.01) {
      lastLed = v;
      opts.onLed?.(v);
    }
  };

  if (opts.reducedMotion) {
    lineProgram.uniforms.uProgress.value = 1;
    hullProgram.uniforms.uProgress.value = 1;
    meshProgram.uniforms.uShadeAmount.value = 1;
    meshProgram.uniforms.uFill.value = 1;
    inkProgram.uniforms.uFill.value = 1;
    decalOpacity.value = 1;
    drawEngraving(1);
    texture.needsUpdate = true;
    setLed(1);
    render();
    wake = render;
    ready = true;
    const onStaticClick = (e: MouseEvent) => {
      if (opts.onBoot && buttonAt(e) === buttons[0]) opts.onBoot();
    };
    container.addEventListener('click', onStaticClick);
    return {
      ...api,
      destroy: () => {
        ro.disconnect();
        container.removeEventListener('click', onStaticClick);
        gl.canvas.remove();
      },
    };
  }

  let start = performance.now();
  let blinkAt = -1;
  let flashAt = -1;
  let flashed: (typeof buttons)[number] | undefined;
  let engraved = -1;

  const onMove = (e: PointerEvent) => {
    const over = buttonAt(e);
    for (const b of buttons) b.target = b === over ? 1 : 0;
    container.style.cursor = over ? 'pointer' : '';
    if (over) wake();
  };
  const onLeave = () => {
    for (const b of buttons) b.target = 0;
    container.style.cursor = '';
    wake();
  };
  const restart = (now = performance.now()) => {
    // Redémarrage : tout le démarrage est rejoué, LED éteinte jusqu'à la fin
    start = now;
    blinkAt = -1;
    engraved = -1;
    opts.onRestart?.();
    wake();
  };
  api.restart = () => {
    flashAt = performance.now();
    flashed = buttons[1];
    restart();
  };
  const onClick = (e: MouseEvent) => {
    const now = performance.now();
    const pressed = buttonAt(e);
    if (pressed) {
      flashAt = now;
      flashed = pressed;
      // BOOT confié à la page s'il y a un rappel (mode programmation), sinon reset comme EN
      if (pressed === buttons[0] && opts.onBoot) opts.onBoot();
      else restart(now);
    } else if ((now - start) / 1000 > LED_ON + LED_RAMP) {
      blinkAt = now; // « Blink », le Hello World de l'embarqué
    }
    wake();
  };
  container.addEventListener('pointermove', onMove);
  container.addEventListener('pointerleave', onLeave);
  container.addEventListener('click', onClick);

  // LED d'alimentation : éteinte pendant le démarrage, puis respiration
  const ledAt = (now: number) => {
    const t = (now - start) / 1000;
    if (t < LED_ON) return 0;
    if (t < LED_ON + LED_RAMP) return (t - LED_ON) / LED_RAMP;
    // Mode économe : LED fixe (comme une vraie LED d'alimentation), pour pouvoir arrêter le rendu
    if (opts.idleStop) return 1;
    // respiration : pleine intensité, puis 45 % à mi-période, comme l'étiquette « Disponible »
    return 0.725 + 0.275 * Math.cos((2 * Math.PI * (t - LED_ON - LED_RAMP)) / BREATH);
  };
  // LED de GPIO2 : éteinte, sauf pendant les trois clignotements qui suivent un clic
  const userLedAt = (now: number) => {
    if (blinkAt < 0) return 0;
    const b = (now - blinkAt) / 1000;
    if (b < BLINK_STEP * 6) return Math.floor(b / BLINK_STEP) % 2 === 0 ? 1 : 0;
    blinkAt = -1;
    return 0;
  };

  window.addEventListener('pointermove', onPointer, { passive: true });
  let visible = true;
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(loop);
  });
  io.observe(container);

  function loop(now: number) {
    raf = 0;
    const t = (now - start) / 1000;

    // 1. tracé des arêtes depuis la puce, 2. ombrage des faces, 3. gravure du marquage, 4. LED
    lineProgram.uniforms.uProgress.value = ease(t / LINES_END);
    hullProgram.uniforms.uProgress.value = lineProgram.uniforms.uProgress.value;
    meshProgram.uniforms.uFill.value = ease((t - 0.5) / 0.9);
    inkProgram.uniforms.uFill.value = meshProgram.uniforms.uFill.value;
    decalOpacity.value = meshProgram.uniforms.uFill.value;
    meshProgram.uniforms.uShadeAmount.value = ease((t - 1.1) / 0.9);
    const engraving = Math.min(1, Math.max(0, (t - LINES_END) / 1.3));
    if (engraving !== engraved) {
      drawEngraving(engraving);
      texture.needsUpdate = true;
      engraved = engraving;
    }
    setLed(ledAt(now));
    userLedProgram.uniforms.uIntensity.value = Math.max(userLedAt(now), userLedHold && t > LED_ON ? 1 : 0);

    // Anneau des boutons : au survol, et un éclair quand on appuie ; anneau de la broche mise en évidence
    const flash = flashAt >= 0 ? Math.max(0, 1 - (now - flashAt) / 500) : 0;
    for (const b of buttons) {
      b.hover += (b.target - b.hover) * 0.2;
      b.program.uniforms.uIntensity.value = Math.max(b.hover * 0.9, b === flashed ? flash : 0);
    }
    pinRing.value += (pinRing.target - pinRing.value) * 0.2;
    pinRingProgram.uniforms.uIntensity.value = pinRing.value;

    // Au repos : balancement lent + inclinaison suivant la souris
    const sway = opts.sway ?? 0.15;
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;
    pivot.rotation.y = Math.sin(t * 0.45) * sway + pointer.x * sway * 0.66;
    pivot.rotation.x = pointer.y * sway * 0.45;

    // Zoom vers une broche : la cible glisse du centre vers la broche, la caméra s'approche
    if (zoom) {
      const k = ease((now - zoom.from) / zoom.dur);
      const l = local(zoom.to);
      const s = toScene(l);
      const lerp = (i: number) => camTarget[i] + (s[i] - camTarget[i]) * k;
      placeCamera([lerp(0), lerp(1), lerp(2)], camDist * (1 - 0.6 * k));
    }

    render();

    // Mode économe : une fois le démarrage fini et tout immobile, on arrête de calculer des images
    // (une interaction, un redimensionnement ou la page relancent la boucle avec `wake()`).
    const settled =
      t > LED_ON + LED_RAMP + 0.2 &&
      !zoom &&
      blinkAt < 0 &&
      flash === 0 &&
      Math.abs(pinRing.value - pinRing.target) < 0.01 &&
      buttons.every((b) => Math.abs(b.hover - b.target) < 0.01) &&
      (opts.sway ?? 0.15) === 0;
    if (opts.idleStop && settled) return;
    if (visible && !document.hidden) raf = requestAnimationFrame(loop);
  }
  wake = () => {
    if (!raf) raf = requestAnimationFrame(loop);
  };
  ready = true;
  const onVisibility = () => {
    if (!document.hidden && visible && !raf) raf = requestAnimationFrame(loop);
  };
  document.addEventListener('visibilitychange', onVisibility);
  raf = requestAnimationFrame(loop);

  return {
    ...api,
    destroy() {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
      container.removeEventListener('pointermove', onMove);
      container.removeEventListener('pointerleave', onLeave);
      container.removeEventListener('click', onClick);
      document.removeEventListener('visibilitychange', onVisibility);
      gl.canvas.remove();
    },
  };
}
