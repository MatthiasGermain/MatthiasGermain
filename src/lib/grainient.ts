import { Renderer, Program, Mesh, Triangle } from 'ogl';

/* ============================================================================
 *  Grainient — dégradé animé grainé (fond de /routine).
 * ----------------------------------------------------------------------------
 *  Port vanilla du composant React de reactbits.dev : le projet est en Astro
 *  sans intégration React, et le composant n'est qu'un setup `ogl` impératif.
 *  Les shaders sont repris tels quels, le rendu est donc identique.
 *
 *  Différences volontaires avec l'original :
 *   - API impérative (`createGrainient` → `{ update, destroy }`) au lieu de props ;
 *   - `prefers-reduced-motion` : une seule image rendue, pas de boucle.
 *  Comme l'original : la boucle est mise en pause hors écran et onglet masqué.
 * ========================================================================== */

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];
  return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
};

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uTimeSpeed;
uniform float uColorBalance;
uniform float uWarpStrength;
uniform float uWarpFrequency;
uniform float uWarpSpeed;
uniform float uWarpAmplitude;
uniform float uBlendAngle;
uniform float uBlendSoftness;
uniform float uRotationAmount;
uniform float uNoiseScale;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainAnimated;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;
uniform vec2 uCenterOffset;
uniform float uZoom;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uLightMode;
out vec4 fragColor;
#define S(a,b,t) smoothstep(a,b,t)
mat2 Rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
vec2 hash(vec2 p){p=vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37)));return fract(sin(p)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);float n=mix(mix(dot(-1.0+2.0*hash(i+vec2(0.0,0.0)),f-vec2(0.0,0.0)),dot(-1.0+2.0*hash(i+vec2(1.0,0.0)),f-vec2(1.0,0.0)),u.x),mix(dot(-1.0+2.0*hash(i+vec2(0.0,1.0)),f-vec2(0.0,1.0)),dot(-1.0+2.0*hash(i+vec2(1.0,1.0)),f-vec2(1.0,1.0)),u.x),u.y);return 0.5+0.5*n;}
void mainImage(out vec4 o, vec2 C){
  float t=iTime*uTimeSpeed;
  vec2 uv=C/iResolution.xy;
  float ratio=iResolution.x/iResolution.y;
  vec2 tuv=uv-0.5+uCenterOffset;
  tuv/=max(uZoom,0.001);

  float degree=noise(vec2(t*0.1,tuv.x*tuv.y)*uNoiseScale);
  tuv.y*=1.0/ratio;
  tuv*=Rot(radians((degree-0.5)*uRotationAmount+180.0));
  tuv.y*=ratio;

  float frequency=uWarpFrequency;
  float ws=max(uWarpStrength,0.001);
  float amplitude=uWarpAmplitude/ws;
  float warpTime=t*uWarpSpeed;
  tuv.x+=sin(tuv.y*frequency+warpTime)/amplitude;
  tuv.y+=sin(tuv.x*(frequency*1.5)+warpTime)/(amplitude*0.5);

  vec3 colLav=uColor1;
  vec3 colOrg=uColor2;
  vec3 colDark=uColor3;
  float b=uColorBalance;
  float s=max(uBlendSoftness,0.0);
  mat2 blendRot=Rot(radians(uBlendAngle));
  float blendX=(tuv*blendRot).x;
  float edge0=-0.3-b-s;
  float edge1=0.2-b+s;
  float v0=0.5-b+s;
  float v1=-0.3-b-s;
  vec3 layer1=mix(colDark,colOrg,S(edge0,edge1,blendX));
  vec3 layer2=mix(colOrg,colLav,S(edge0,edge1,blendX));
  vec3 col=mix(layer1,layer2,S(v0,v1,tuv.y));

  vec2 grainUv=uv*max(uGrainScale,0.001);
  if(uGrainAnimated>0.5){grainUv+=vec2(iTime*0.05);}
  float grain=fract(sin(dot(grainUv,vec2(12.9898,78.233)))*43758.5453);
  col+=(grain-0.5)*uGrainAmount;

  col=(col-0.5)*uContrast+0.5;
  float luma=dot(col,vec3(0.2126,0.7152,0.0722));
  col=mix(vec3(luma),col,uSaturation);
  col=pow(max(col,0.0),vec3(1.0/max(uGamma,0.001)));
  col=clamp(col,0.0,1.0);
  if(uLightMode>0.5){
    float energy=max(max(col.r,col.g),col.b);
    vec3 hue=col/max(energy,0.001);
    float chroma=length(col-vec3(dot(col,vec3(0.333333))));
    float coverage=clamp(0.12+chroma*1.15+energy*0.18,0.0,0.88);
    col=mix(vec3(1.0),clamp(hue*0.58+col*0.18,0.0,1.0),coverage);
  }

  o=vec4(col,1.0);
}
void main(){
  vec4 o=vec4(0.0);
  mainImage(o,gl_FragCoord.xy);
  fragColor=o;
}
`;

export interface GrainientOptions {
  color1: string;
  color2: string;
  color3: string;
  lightMode: boolean;
  timeSpeed: number;
  colorBalance: number;
  warpStrength: number;
  warpFrequency: number;
  warpSpeed: number;
  warpAmplitude: number;
  blendAngle: number;
  blendSoftness: number;
  rotationAmount: number;
  noiseScale: number;
  grainAmount: number;
  grainScale: number;
  grainAnimated: boolean;
  contrast: number;
  gamma: number;
  saturation: number;
  centerX: number;
  centerY: number;
  zoom: number;
}

const DEFAULTS: GrainientOptions = {
  color1: '#FF9FFC',
  color2: '#5227FF',
  color3: '#B497CF',
  lightMode: false,
  timeSpeed: 0.25,
  colorBalance: 0.0,
  warpStrength: 1.0,
  warpFrequency: 5.0,
  warpSpeed: 2.0,
  warpAmplitude: 50.0,
  blendAngle: 0.0,
  blendSoftness: 0.05,
  rotationAmount: 500.0,
  noiseScale: 2.0,
  grainAmount: 0.1,
  grainScale: 2.0,
  grainAnimated: false,
  contrast: 1.5,
  gamma: 1.0,
  saturation: 1.0,
  centerX: 0.0,
  centerY: 0.0,
  zoom: 0.9,
};

export interface GrainientHandle {
  /** Met à jour tout ou partie des options (aucun coût GPU, pas de recréation). */
  update(options: Partial<GrainientOptions>): void;
  destroy(): void;
}

export function createGrainient(container: HTMLElement, options: Partial<GrainientOptions> = {}): GrainientHandle | null {
  let renderer: Renderer;
  try {
    renderer = new Renderer({
      webgl: 2,
      alpha: true,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    });
  } catch {
    // WebGL2 indisponible : on laisse simplement le fond uni du thème.
    return null;
  }

  const gl = renderer.gl;
  const canvas = gl.canvas as HTMLCanvasElement;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  container.appendChild(canvas);

  const geometry = new Triangle(gl);
  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      iTime: { value: 0 },
      iResolution: { value: new Float32Array([1, 1]) },
      uTimeSpeed: { value: DEFAULTS.timeSpeed },
      uColorBalance: { value: DEFAULTS.colorBalance },
      uWarpStrength: { value: DEFAULTS.warpStrength },
      uWarpFrequency: { value: DEFAULTS.warpFrequency },
      uWarpSpeed: { value: DEFAULTS.warpSpeed },
      uWarpAmplitude: { value: DEFAULTS.warpAmplitude },
      uBlendAngle: { value: DEFAULTS.blendAngle },
      uBlendSoftness: { value: DEFAULTS.blendSoftness },
      uRotationAmount: { value: DEFAULTS.rotationAmount },
      uNoiseScale: { value: DEFAULTS.noiseScale },
      uGrainAmount: { value: DEFAULTS.grainAmount },
      uGrainScale: { value: DEFAULTS.grainScale },
      uGrainAnimated: { value: 0.0 },
      uContrast: { value: DEFAULTS.contrast },
      uGamma: { value: DEFAULTS.gamma },
      uSaturation: { value: DEFAULTS.saturation },
      uCenterOffset: { value: new Float32Array([0, 0]) },
      uZoom: { value: DEFAULTS.zoom },
      uColor1: { value: new Float32Array([1, 1, 1]) },
      uColor2: { value: new Float32Array([1, 1, 1]) },
      uColor3: { value: new Float32Array([1, 1, 1]) },
      uLightMode: { value: 0.0 },
    },
  });

  const mesh = new Mesh(gl, { geometry, program });

  const setSize = () => {
    const rect = container.getBoundingClientRect();
    renderer.setSize(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)));
    const res = program.uniforms.iResolution.value as Float32Array;
    res[0] = gl.drawingBufferWidth;
    res[1] = gl.drawingBufferHeight;
    renderer.render({ scene: mesh });
  };

  const ro = new ResizeObserver(setSize);
  ro.observe(container);
  setSize();

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let raf = 0;
  let isVisible = true;
  let isPageVisible = !document.hidden;
  const t0 = performance.now();

  const loop = (t: number) => {
    program.uniforms.iTime.value = (t - t0) * 0.001;
    renderer.render({ scene: mesh });
    raf = requestAnimationFrame(loop);
  };

  const tryStart = () => {
    if (reducedMotion) return;
    if (isVisible && isPageVisible && raf === 0) raf = requestAnimationFrame(loop);
  };
  const tryStop = () => {
    if (raf !== 0) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  const io = new IntersectionObserver(
    ([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) tryStart();
      else tryStop();
    },
    { threshold: 0 },
  );
  io.observe(container);

  const onVisibility = () => {
    isPageVisible = !document.hidden;
    if (isPageVisible) tryStart();
    else tryStop();
  };
  document.addEventListener('visibilitychange', onVisibility);

  const update = (next: Partial<GrainientOptions>) => {
    const u = program.uniforms;
    if (next.timeSpeed !== undefined) u.uTimeSpeed.value = next.timeSpeed;
    if (next.colorBalance !== undefined) u.uColorBalance.value = next.colorBalance;
    if (next.warpStrength !== undefined) u.uWarpStrength.value = next.warpStrength;
    if (next.warpFrequency !== undefined) u.uWarpFrequency.value = next.warpFrequency;
    if (next.warpSpeed !== undefined) u.uWarpSpeed.value = next.warpSpeed;
    if (next.warpAmplitude !== undefined) u.uWarpAmplitude.value = next.warpAmplitude;
    if (next.blendAngle !== undefined) u.uBlendAngle.value = next.blendAngle;
    if (next.blendSoftness !== undefined) u.uBlendSoftness.value = next.blendSoftness;
    if (next.rotationAmount !== undefined) u.uRotationAmount.value = next.rotationAmount;
    if (next.noiseScale !== undefined) u.uNoiseScale.value = next.noiseScale;
    if (next.grainAmount !== undefined) u.uGrainAmount.value = next.grainAmount;
    if (next.grainScale !== undefined) u.uGrainScale.value = next.grainScale;
    if (next.grainAnimated !== undefined) u.uGrainAnimated.value = next.grainAnimated ? 1.0 : 0.0;
    if (next.contrast !== undefined) u.uContrast.value = next.contrast;
    if (next.gamma !== undefined) u.uGamma.value = next.gamma;
    if (next.saturation !== undefined) u.uSaturation.value = next.saturation;
    if (next.centerX !== undefined || next.centerY !== undefined) {
      const offset = u.uCenterOffset.value as Float32Array;
      if (next.centerX !== undefined) offset[0] = next.centerX;
      if (next.centerY !== undefined) offset[1] = next.centerY;
    }
    if (next.zoom !== undefined) u.uZoom.value = next.zoom;
    if (next.color1 !== undefined) u.uColor1.value = new Float32Array(hexToRgb(next.color1));
    if (next.color2 !== undefined) u.uColor2.value = new Float32Array(hexToRgb(next.color2));
    if (next.color3 !== undefined) u.uColor3.value = new Float32Array(hexToRgb(next.color3));
    if (next.lightMode !== undefined) u.uLightMode.value = next.lightMode ? 1.0 : 0.0;

    // Sans boucle d'animation, il faut repeindre pour voir le changement.
    if (raf === 0) renderer.render({ scene: mesh });
  };

  update({ ...DEFAULTS, ...options });
  tryStart();

  return {
    update,
    destroy() {
      tryStop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.remove();
    },
  };
}
