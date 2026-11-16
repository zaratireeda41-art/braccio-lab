// Braccio Lab · Grafica v6 condivisa da tutte le scene 3D:
// livelli di qualità adattivi (Bassa/Media/Alta/Ultra + Auto), renderer, ambienti procedurali (studio/officina) in PMREM,
// post-processing (GTAO, bloom, SMAA/FXAA, profondità di campo, aria calda), ombre di contatto, texture procedurali
// generate solo quando servono, libreria materiali fisici, scintille con scia. Nessuna risorsa esterna (CSP stretta).
import * as THREE from "../vendor/three.module.min.js";
import { EffectComposer, RenderPass, ShaderPass, UnrealBloomPass, OutputPass, GTAOPass, SMAAPass, FXAAPass, BokehPass } from "../vendor/three-fx.min.js";

/* ====================== livelli di qualità ====================== */
export const TIERS = {
  bassa: { id: "bassa", n: "Bassa", dpr: 1, shadow: 0, radius: 1, post: false, ao: false, bloom: false, aa: "none", msaa: 0, dof: false, contact: false, tex: 256, seg: 0.55, parts: 0.4, aniso: 2, phys: false, detail: 0, haze: false, csRes: 0 },
  media: { id: "media", n: "Media", dpr: 1.5, shadow: 1024, radius: 3, post: true, ao: false, bloom: true, aa: "fxaa", msaa: 0, dof: false, contact: true, tex: 512, seg: 1, parts: 0.7, aniso: 4, phys: true, detail: 1, haze: true, csRes: 256 },
  alta: { id: "alta", n: "Alta", dpr: 2, shadow: 2048, radius: 4, post: true, ao: true, aoSamples: 12, bloom: true, aa: "smaa", msaa: 0, dof: false, contact: true, tex: 1024, seg: 1.4, parts: 1, aniso: 8, phys: true, detail: 2, haze: true, csRes: 512 },
  ultra: { id: "ultra", n: "Ultra", dpr: 2.5, shadow: 4096, radius: 5, post: true, ao: true, aoSamples: 16, bloom: true, aa: "smaa", msaa: 4, dof: true, contact: true, tex: 2048, seg: 2, parts: 1.5, aniso: 16, phys: true, detail: 3, haze: true, csRes: 1024 }
};
export const ORDER = ["bassa", "media", "alta", "ultra"];
export const LABELS = [["auto", "Auto"], ["bassa", "Bassa"], ["media", "Media"], ["alta", "Alta"], ["ultra", "Ultra"]];
const KEY = "xentriq-braccio-gfx-v1";
const W = typeof window !== "undefined" ? window : {};
let SET = null, gpuName = null, autoCap = null;
function load() { if (SET) return SET; SET = { q: "auto", dof: true }; try { const s = JSON.parse(W.localStorage.getItem(KEY) || "null"); if (s && (s.q === "auto" || TIERS[s.q])) SET = Object.assign(SET, s); } catch (e) { /* nessun salvataggio */ } return SET; }
function save() { try { W.localStorage.setItem(KEY, JSON.stringify(SET)); } catch (e) { /* memoria piena o privata */ } }
export function gpu() {
  if (gpuName != null) return gpuName; gpuName = "";
  try { const c = document.createElement("canvas"), gl = c.getContext("webgl2") || c.getContext("webgl"); if (gl) { const x = gl.getExtension("WEBGL_debug_renderer_info"); gpuName = String(x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) || ""); const l = gl.getExtension("WEBGL_lose_context"); if (l) l.loseContext(); } } catch (e) { gpuName = ""; }
  return gpuName;
}
// stima del livello giusto per il dispositivo (Ultra solo su scelta esplicita)
export function detectTier(info) {
  const I = info || {}, nav = W.navigator || {}, ua = I.ua != null ? I.ua : nav.userAgent || "", g = (I.gpu != null ? I.gpu : gpu()).toLowerCase();
  if (I.test != null ? I.test : W.__O3TEST) return "bassa";
  if (/swiftshader|llvmpipe|softpipe|software|microsoft basic/.test(g)) return "bassa";
  const coarse = I.coarse != null ? I.coarse : !!(W.matchMedia && W.matchMedia("(pointer: coarse)").matches), sw = I.screen != null ? I.screen : Math.min((W.screen || {}).width || 1200, (W.screen || {}).height || 800);
  const phone = /iphone|ipod|android.*mobile|mobile safari/i.test(ua) || (coarse && sw < 820), mem = I.mem != null ? I.mem : nav.deviceMemory || 8, cores = I.cores != null ? I.cores : nav.hardwareConcurrency || 8;
  if (phone) return mem <= 2 || cores <= 2 ? "bassa" : "media";
  if (coarse) return "media";
  if (/intel.*(hd|uhd) graphics|mali|adreno [1-5]|powervr/.test(g) || cores <= 4 || mem <= 4) return "media";
  return "alta";
}
export function setting() { return load().q; }
export function dofOn() { return load().dof !== false; }
export function resolve(q) { q = q || setting(); if (q !== "auto") return TIERS[q] ? q : "media"; let t = detectTier(); if (autoCap && ORDER.indexOf(autoCap) < ORDER.indexOf(t)) t = autoCap; return t; }
export function tier(q) { return TIERS[resolve(q)]; }
export function setSetting(q, extra) { load(); if (q === "auto" || TIERS[q]) SET.q = q; if (extra && "dof" in extra) SET.dof = !!extra.dof; if (q !== "auto") autoCap = null; save(); try { W.dispatchEvent(new CustomEvent("braccio-gfx", { detail: { q: SET.q, tier: resolve() } })); } catch (e) { /* Node */ } return resolve(); }
export function onChange(cb) { if (!W.addEventListener) return () => {}; const f = e => cb(e.detail.tier, e.detail.q); W.addEventListener("braccio-gfx", f); return () => W.removeEventListener("braccio-gfx", f); }
export function selectHtml(id, cls) { const q = setting(); return '<label class="' + (cls || "gfx-q") + '"><span class="sr-only">Qualità grafica</span><select id="' + id + '" data-gfx="q" aria-label="Qualità grafica">' + LABELS.map(([k, n]) => '<option value="' + k + '"' + (q === k ? " selected" : "") + ">Grafica " + n + (k === "auto" ? " (" + TIERS[resolve("auto")].n + ")" : "") + "</option>").join("") + "</select></label>"; }
export const seg = (base, t) => Math.max(4, Math.round(base * (t || tier()).seg));

// riduzione automatica se il dispositivo non regge (solo in Auto): media fps < 26 per 4 s di fila
export class Governor {
  constructor(onDrop) { this.acc = 0; this.n = 0; this.slow = 0; this.onDrop = onDrop; this.fps = 60; }
  tick(dt) { this.acc += dt; this.n++; if (this.acc < 1) return; this.fps = Math.round(this.n / this.acc); this.acc = 0; this.n = 0;
    if (setting() !== "auto" || W.__O3TEST || (W.document && document.visibilityState !== "visible")) { this.slow = 0; return; }
    this.slow = this.fps < 26 ? this.slow + 1 : 0; if (this.slow >= 4) { this.slow = 0; const cur = resolve(), i = ORDER.indexOf(cur); if (i > 0) { autoCap = ORDER[i - 1]; setSetting("auto"); this.onDrop && this.onDrop(autoCap); } } }
}

/* ====================== renderer ====================== */
export function makeRenderer(canvas, o) {
  o = o || {}; const T = o.tier || tier();
  const r = new THREE.WebGLRenderer({ canvas, antialias: T.id !== "bassa", alpha: !!o.alpha, preserveDrawingBuffer: !!o.test, powerPreference: "high-performance", stencil: false });
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = o.exposure || 1.0;
  r.shadowMap.type = THREE.PCFShadowMap; applyTier(r, T, o.test); return r;
}
export function applyTier(r, T, test) { r.setPixelRatio(Math.min(W.devicePixelRatio || 1, test ? Math.min(T.dpr, 1.25) : T.dpr)); r.shadowMap.enabled = T.shadow > 0; r.shadowMap.needsUpdate = true; }
export function setupShadow(light, T, size, opts) {
  opts = opts || {}; light.castShadow = T.shadow > 0; if (!T.shadow) return; const ms = Math.min(T.shadow, opts.max || 4096);
  light.shadow.mapSize.set(ms, ms); if (light.shadow.map) { light.shadow.map.dispose(); light.shadow.map = null; }
  const c = light.shadow.camera; if (c.isOrthographicCamera && size) { c.left = c.bottom = -size; c.right = c.top = size; c.near = opts.near || 0.1; c.far = opts.far || size * 8; c.updateProjectionMatrix(); }
  light.shadow.radius = T.radius; light.shadow.blurSamples = 12; light.shadow.bias = opts.bias != null ? opts.bias : -0.0003; light.shadow.normalBias = opts.normalBias != null ? opts.normalBias : 0.02;
}

/* ====================== ambienti procedurali (PMREM) ====================== */
const ENV = new WeakMap();
function gradSphere(top, mid, bot, mul) {
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { a: { value: new THREE.Color(top).multiplyScalar(mul) }, b: { value: new THREE.Color(mid).multiplyScalar(mul) }, c: { value: new THREE.Color(bot).multiplyScalar(mul) } },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 a; uniform vec3 b; uniform vec3 c; varying vec3 vP; void main(){ float h = vP.y; vec3 col = h > 0.0 ? mix(b, a, pow(h, 0.6)) : mix(b, c, pow(-h, 0.45)); gl_FragColor = vec4(col, 1.0); }" });
  return new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), m);
}
function light(s, w, h, I, pos, look, col) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col || 0xffffff).multiplyScalar(I), side: THREE.DoubleSide, toneMapped: false })); m.position.set(...pos); m.lookAt(...(look || [0, 0, 0])); s.add(m); return m; }
export function envScene(kind) {
  const s = new THREE.Scene();
  if (kind === "studio") { // studio fotografico: grande softbox in alto, due strisce laterali, controluce freddo, pavimento scuro
    s.add(gradSphere(0x3a4049, 0x22262c, 0x0b0c0e, 1));
    light(s, 16, 10, 2.6, [0, 18, 6]); light(s, 3, 14, 2.0, [-16, 6, 2]); light(s, 3, 14, 1.6, [16, 7, -3]);
    light(s, 20, 2.2, 2.2, [0, 5, -18], null, 0xbfd8ff); light(s, 8, 4, 1.2, [6, 3, 16], null, 0xffe2c4);
  } else { // officina: tubi fluorescenti a soffitto, finestre a nord, pareti grigio-calde, macchine colorate
    s.add(gradSphere(0x55565a, 0x3b3833, 0x1d1b19, 1));
    for (let i = -2; i <= 2; i++) for (let j = -1; j <= 1; j++) light(s, 0.6, 7, 4.2, [i * 6, 16, j * 9], [i * 6, 0, j * 9], 0xf3f6ff);
    light(s, 12, 6, 3, [-24, 9, 0], null, 0xcfe4ff); light(s, 9, 5, 2.5, [10, 8, -24], null, 0xd8ebff);
    [[0xffb02e, [24, 2, 6]], [0x2c73d2, [20, 2, -14]], [0x3a8a46, [-10, 2, 22]]].forEach(([c, p]) => light(s, 6, 3, 0.55, p, null, c));
    light(s, 30, 30, 0.35, [0, -1.5, 0], [0, 10, 0], 0x6c665e);
  }
  return s;
}
export function envMap(renderer, kind) {
  let m = ENV.get(renderer); if (!m) { m = {}; ENV.set(renderer, m); }
  if (m[kind]) return m[kind];
  const pm = new THREE.PMREMGenerator(renderer), sc = envScene(kind), rt = pm.fromScene(sc, 0.035, 0.1, 100);
  sc.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); pm.dispose(); m[kind] = rt.texture; return rt.texture;
}
export function disposeEnv(renderer) { const m = ENV.get(renderer); if (m) Object.values(m).forEach(t => t.dispose()); ENV.delete(renderer); }

/* ====================== post-processing ====================== */
export const HazeShader = {
  uniforms: { tDiffuse: { value: null }, center: { value: new THREE.Vector2(0.5, 0.5) }, radius: { value: 0.15 }, strength: { value: 0 }, time: { value: 0 }, aspect: { value: 1 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 center; uniform float radius; uniform float strength; uniform float time; uniform float aspect; varying vec2 vUv;
    float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hs(i), hs(i + vec2(1,0)), f.x), mix(hs(i + vec2(0,1)), hs(i + vec2(1,1)), f.x), f.y); }
    void main(){ vec2 d = vUv - center; d.x *= aspect; float up = clamp(d.y / radius + 0.35, 0.0, 1.6); float k = smoothstep(radius, 0.0, length(d * vec2(1.0, 0.55))) * strength * (0.4 + up);
      vec2 q = vUv * vec2(38.0, 26.0) + vec2(0.0, -time * 2.6); vec2 o = vec2(vn(q) - 0.5, vn(q + 7.3) - 0.5);
      gl_FragColor = texture2D(tDiffuse, vUv + o * k * 0.014); }`
};
export class Pipeline {
  constructor(renderer, scene, camera, opt) { this.r = renderer; this.scene = scene; this.camera = camera; this.o = Object.assign({ bloom: [0.35, 0.45, 5], ao: { radius: 0.25, distanceFallOff: 1, thickness: 1 }, aoI: 0.9, dof: false, focus: 1, aperture: 0.002, maxblur: 0.006 }, opt || {}); this.w = 1; this.h = 1; this.t = 0; this.haze = null; this.passes = []; this.setTier(this.o.tier || tier()); }
  setTier(T) {
    this.T = T; this.dispose(true); applyTier(this.r, T, this.o.test); const o = this.o; this.passes = [];
    if (!T.post) return;
    const sz = new THREE.Vector2(); this.r.getDrawingBufferSize(sz);
    const rt = new THREE.WebGLRenderTarget(Math.max(1, sz.x), Math.max(1, sz.y), { type: THREE.HalfFloatType, samples: T.msaa || 0 });
    const c = this.composer = new EffectComposer(this.r, rt); c.addPass(new RenderPass(this.scene, this.camera)); this.passes.push("render");
    if (T.ao && o.ao !== false) { const g = this.gtao = new GTAOPass(this.scene, this.camera, Math.max(1, this.w), Math.max(1, this.h)); g.updateGtaoMaterial(Object.assign({ samples: T.aoSamples || 12, scale: 1 }, o.ao)); g.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, rings: 2, samples: 16 }); g.blendIntensity = o.aoI; c.addPass(g); this.passes.push("gtao"); }
    if (T.bloom && o.bloom) { const b = this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), o.bloom[0], o.bloom[1], o.bloom[2]); c.addPass(b); this.passes.push("bloom"); }
    if (T.haze && o.haze !== false) { const hz = this.hazePass = new ShaderPass(HazeShader); hz.enabled = false; c.addPass(hz); this.passes.push("haze"); }
    if (T.dof && o.dof && dofOn()) { const bk = this.bokeh = new BokehPass(this.scene, this.camera, { focus: o.focus, aperture: o.aperture, maxblur: o.maxblur }); c.addPass(bk); this.passes.push("dof"); }
    c.addPass(new OutputPass()); this.passes.push("output");
    if (T.aa === "smaa") { c.addPass(new SMAAPass()); this.passes.push("smaa"); } else if (T.aa === "fxaa") { c.addPass(new FXAAPass()); this.passes.push("fxaa"); }
    this.setSize(this.w, this.h);
  }
  setSize(w, h) { this.w = w; this.h = h; this.r.setSize(w, h, false); if (this.composer) { this.composer.setPixelRatio(this.r.getPixelRatio()); this.composer.setSize(w, h); } if (this.hazePass) this.hazePass.uniforms.aspect.value = w / Math.max(1, h); }
  setHaze(p, strength, radius) { if (!this.hazePass) return; if (!p || !(strength > 0)) { this.hazePass.enabled = false; return; } const v = (p.isVector3 ? p.clone() : new THREE.Vector3(...p)).project(this.camera); if (v.z > 1) { this.hazePass.enabled = false; return; } const u = this.hazePass.uniforms; u.center.value.set(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5); u.strength.value = strength; u.radius.value = radius || 0.14; this.hazePass.enabled = true; }
  setFocus(d, aperture) { if (!this.bokeh) return; this.bokeh.uniforms.focus.value = d; if (aperture != null) this.bokeh.uniforms.aperture.value = aperture; }
  render(dt) { this.t += dt || 0.016; if (this.hazePass) this.hazePass.uniforms.time.value = this.t; if (this.composer) this.composer.render(dt); else this.r.render(this.scene, this.camera); }
  dispose(keep) { if (this.composer) { this.composer.passes.forEach(p => p.dispose && p.dispose()); this.composer.renderTarget1.dispose(); this.composer.renderTarget2.dispose(); } this.composer = this.gtao = this.bloom = this.hazePass = this.bokeh = null; void keep; }
}

/* ====================== ombre di contatto (morbide, sotto gli oggetti) ====================== */
const BlurShader = (dir) => ({ uniforms: { tDiffuse: { value: null }, h: { value: 1 / 512 } }, vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: `uniform sampler2D tDiffuse; uniform float h; varying vec2 vUv; void main(){ vec4 s = vec4(0.0); vec2 d = ${dir}; 
    s += texture2D(tDiffuse, vUv - 4.0*h*d) * 0.051; s += texture2D(tDiffuse, vUv - 3.0*h*d) * 0.0918; s += texture2D(tDiffuse, vUv - 2.0*h*d) * 0.12245; s += texture2D(tDiffuse, vUv - h*d) * 0.1531;
    s += texture2D(tDiffuse, vUv) * 0.1633; s += texture2D(tDiffuse, vUv + h*d) * 0.1531; s += texture2D(tDiffuse, vUv + 2.0*h*d) * 0.12245; s += texture2D(tDiffuse, vUv + 3.0*h*d) * 0.0918; s += texture2D(tDiffuse, vUv + 4.0*h*d) * 0.051; gl_FragColor = s; }` });
export class ContactShadow {
  constructor(renderer, scene, o) {
    o = Object.assign({ w: 2, d: 2, y: 0.001, res: 512, blur: 2.5, opacity: 0.75, far: 0.6, darkness: 1.2, x: 0, z: 0, every: 2 }, o || {}); this.o = o; this.r = renderer; this.scene = scene; this.n = 0; this.dirty = true;
    const g = this.group = new THREE.Group(); g.position.set(o.x, o.y, o.z); scene.add(g);
    const rt = this.rt = new THREE.WebGLRenderTarget(o.res, o.res); rt.texture.generateMipmaps = false; this.rtb = new THREE.WebGLRenderTarget(o.res, o.res); this.rtb.texture.generateMipmaps = false;
    const pg = new THREE.PlaneGeometry(o.w, o.d).rotateX(Math.PI / 2);
    this.plane = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ map: rt.texture, opacity: o.opacity, transparent: true, depthWrite: false })); this.plane.renderOrder = 1; this.plane.scale.y = -1; this.plane.userData.noShadow = true; g.add(this.plane);
    this.blurPlane = new THREE.Mesh(pg); this.blurPlane.visible = false; g.add(this.blurPlane);
    const cam = this.cam = new THREE.OrthographicCamera(-o.w / 2, o.w / 2, o.d / 2, -o.d / 2, 0, o.far); cam.rotation.x = Math.PI / 2; g.add(cam);
    const dm = this.depth = new THREE.MeshDepthMaterial(); dm.userData.dark = { value: o.darkness }; dm.depthTest = dm.depthWrite = false;
    dm.onBeforeCompile = sh => { sh.uniforms.darkness = dm.userData.dark; sh.fragmentShader = "uniform float darkness;\n" + sh.fragmentShader.replace("gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );", "gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );"); };
    this.hb = new THREE.ShaderMaterial(BlurShader("vec2(1.0,0.0)")); this.vb = new THREE.ShaderMaterial(BlurShader("vec2(0.0,1.0)")); this.hb.depthTest = this.vb.depthTest = false;
  }
  blur(a) { const bp = this.blurPlane, r = this.r; bp.visible = true; bp.material = this.hb; this.hb.uniforms.tDiffuse.value = this.rt.texture; this.hb.uniforms.h.value = a / 256; r.setRenderTarget(this.rtb); r.render(bp, this.cam);
    bp.material = this.vb; this.vb.uniforms.tDiffuse.value = this.rtb.texture; this.vb.uniforms.h.value = a / 256; r.setRenderTarget(this.rt); r.render(bp, this.cam); bp.visible = false; }
  update(force) {
    if (!force && !this.dirty && (this.n++ % this.o.every)) return; this.dirty = false; const r = this.r, s = this.scene, bg = s.background, fog = s.fog, ov = s.overrideMaterial;
    this.plane.visible = false; s.background = null; s.fog = null; s.overrideMaterial = this.depth; const cc = r.getClearAlpha(), ccol = r.getClearColor(new THREE.Color()); r.setClearColor(0x000000, 0);
    const hid = []; s.traverse(o => { if ((o.isPoints || o.isSprite || o.isLine || o.userData.noShadow) && o.visible && o !== this.plane) { hid.push(o); o.visible = false; } });
    const old = r.getRenderTarget(), sm = r.shadowMap.autoUpdate; r.shadowMap.autoUpdate = false; r.setRenderTarget(this.rt); r.clear(); r.render(s, this.cam);
    s.overrideMaterial = ov; hid.forEach(o => { o.visible = true; }); this.blur(this.o.blur); this.blur(this.o.blur * 0.4);
    r.setRenderTarget(old); r.shadowMap.autoUpdate = sm; r.setClearColor(ccol, cc); s.background = bg; s.fog = fog; this.plane.visible = true;
  }
  set(o) { Object.assign(this.o, o); if (o.x != null || o.z != null || o.y != null) this.group.position.set(this.o.x, this.o.y, this.o.z); this.dirty = true; }
  dispose() { this.scene.remove(this.group); this.rt.dispose(); this.rtb.dispose(); this.plane.geometry.dispose(); this.plane.material.dispose(); this.depth.dispose(); this.hb.dispose(); this.vb.dispose(); }
}

/* ====================== texture procedurali (pigre, in cache) ====================== */
const TXC = {};
function cnv(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h || w; return c; }
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; }; }
// rumore a valori, ripetibile senza cuciture: celle = numero di celle per lato
function vnoise(S, cells, seed) { const R = rng(seed), g = new Float32Array(cells * cells); for (let i = 0; i < g.length; i++) g[i] = R(); const out = new Float32Array(S * S), k = cells / S;
  for (let y = 0; y < S; y++) { const fy = y * k, iy = fy | 0, ty = fy - iy, sy = ty * ty * (3 - 2 * ty), y0 = iy % cells, y1 = (iy + 1) % cells;
    for (let x = 0; x < S; x++) { const fx = x * k, ix = fx | 0, tx = fx - ix, sx = tx * tx * (3 - 2 * tx), x0 = ix % cells, x1 = (ix + 1) % cells; const a = g[y0 * cells + x0], b = g[y0 * cells + x1], c = g[y1 * cells + x0], d = g[y1 * cells + x1]; out[y * S + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; } }
  return out; }
function fbm(S, cells, oct, seed, gain) { const out = new Float32Array(S * S); let amp = 1, tot = 0; for (let o = 0; o < oct; o++) { const n = vnoise(S, Math.min(S, cells << o), seed + o * 101); for (let i = 0; i < out.length; i++) out[i] += n[i] * amp; tot += amp; amp *= gain || 0.5; } for (let i = 0; i < out.length; i++) out[i] /= tot; return out; }
function normalFrom(h, S, str) { const c = cnv(S), g = c.getContext("2d"), im = g.createImageData(S, S), d = im.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const l = h[y * S + (x + S - 1) % S], r = h[y * S + (x + 1) % S], u = h[((y + S - 1) % S) * S + x], dn = h[((y + 1) % S) * S + x]; let nx = (l - r) * str, ny = (u - dn) * str, nz = 1; const il = 1 / Math.hypot(nx, ny, nz); const i = (y * S + x) * 4; d[i] = (nx * il * 0.5 + 0.5) * 255; d[i + 1] = (ny * il * 0.5 + 0.5) * 255; d[i + 2] = (nz * il * 0.5 + 0.5) * 255; d[i + 3] = 255; }
  g.putImageData(im, 0, 0); return c; }
function grayCanvas(v, S, lo, hi) { const c = cnv(S), g = c.getContext("2d"), im = g.createImageData(S, S), d = im.data; for (let i = 0; i < S * S; i++) { const q = (lo + (hi - lo) * v[i]) * 255; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = q; d[i * 4 + 3] = 255; } g.putImageData(im, 0, 0); return c; }
function tex(c, srgb, rep, T) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = (T || tier()).aniso; if (rep) t.repeat.set(rep[0], rep[1]); return t; }
function cached(name, S, make) { const k = name + "@" + S; if (!TXC[k]) TXC[k] = make(S); return TXC[k]; }
export function texSize(max, T) { return Math.min(max || 4096, (T || tier()).tex); }
// set di texture: { map, normal, rough } (ognuno opzionale)
export const TEX = {
  brushed(S) { return cached("brushed", S, S => { const h = new Float32Array(S * S), R = rng(7); const row = new Float32Array(S); for (let y = 0; y < S; y++) row[y] = R();
    const n = vnoise(S, 64, 3); for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const i = y * S + x; h[i] = row[y] * 0.65 + row[(y + 1) % S] * 0.2 + n[i] * 0.15; }
    const scr = cnv(S).getContext("2d"); void scr; return { normal: tex(normalFrom(h, S, 1.2)), rough: tex(grayCanvas(h, S, 0.22, 0.42)) }; }); },
  castIron(S) { return cached("cast", S, S => { const a = fbm(S, 16, 5, 11, 0.55), p = vnoise(S, Math.max(32, S / 6), 19), h = new Float32Array(S * S); for (let i = 0; i < h.length; i++) h[i] = a[i] * 0.7 + (p[i] > 0.82 ? -0.35 : 0) + p[i] * 0.1;
    return { normal: tex(normalFrom(h, S, 4)), rough: tex(grayCanvas(a, S, 0.5, 0.78)) }; }); },
  rubber(S) { return cached("rubber", S, S => { const a = vnoise(S, Math.max(32, S / 5), 23); return { normal: tex(normalFrom(a, S, 1.6)) }; }); },
  orangePeel(S) { return cached("peel", S, S => { const a = fbm(S, 24, 3, 29, 0.5); return { normal: tex(normalFrom(a, S, 0.7)) }; }); },
  knurl(S) { return cached("knurl", S, S => { const h = new Float32Array(S * S), f = 24 * Math.PI * 2 / S; for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) h[y * S + x] = Math.abs(Math.sin((x + y) * f / 2)) * Math.abs(Math.sin((x - y) * f / 2)); return { normal: tex(normalFrom(h, S, 2.5)) }; }); },
  carbon(S) { return cached("carbon", S, S => { const c = cnv(S), g = c.getContext("2d"), im = g.createImageData(S, S), d = im.data, h = new Float32Array(S * S), N = 16, cs = S / N;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const cx = Math.floor(x / cs), cy = Math.floor(y / cs), u = (x % cs) / cs, v = (y % cs) / cs, over = ((cx + Math.floor(cy / 2) * 2 + cy) % 4) < 2; const tw = over ? Math.sin(v * Math.PI) : Math.sin(u * Math.PI), sh = over ? 0.5 + 0.5 * Math.sin(u * Math.PI * 6) : 0.5 + 0.5 * Math.sin(v * Math.PI * 6);
      const val = 18 + tw * 30 + sh * 14; const i = (y * S + x) * 4; d[i] = val; d[i + 1] = val; d[i + 2] = val + 4; d[i + 3] = 255; h[y * S + x] = tw * 0.7 + sh * 0.1; }
    g.putImageData(im, 0, 0); return { map: tex(c, true), normal: tex(normalFrom(h, S, 2)) }; }); },
  fr4(S) { return cached("fr4", S, S => { const c = cnv(S), g = c.getContext("2d"), im = g.createImageData(S, S), d = im.data, h = new Float32Array(S * S), n = fbm(S, 8, 3, 31), P = S / 24;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const wu = Math.sin(x / P * Math.PI), wv = Math.sin(y / P * Math.PI), over = (Math.floor(x / P) + Math.floor(y / P)) % 2 === 0; const tw = Math.abs(over ? wu : wv) * 0.8 + 0.2; const i = (y * S + x) * 4, k = 0.75 + tw * 0.25 + (n[y * S + x] - 0.5) * 0.18;
      d[i] = 205 * k; d[i + 1] = 190 * k; d[i + 2] = 118 * k; d[i + 3] = 255; h[y * S + x] = tw; }
    g.putImageData(im, 0, 0); return { map: tex(c, true), normal: tex(normalFrom(h, S, 1.5)) }; }); },
  concrete(S) { return cached("concrete", S, S => { const n = fbm(S, 6, 6, 41, 0.55), f = fbm(S, 48, 2, 43), st = fbm(S, 3, 3, 47), c = cnv(S), g = c.getContext("2d"), im = g.createImageData(S, S), d = im.data, R = rng(53), h = new Float32Array(S * S), ro = new Float32Array(S * S);
    for (let i = 0; i < S * S; i++) { const stain = Math.max(0, st[i] - 0.55) * 2.2, v = 118 + (n[i] - 0.5) * 50 + (f[i] - 0.5) * 18 - stain * 40; d[i * 4] = v * 1.0; d[i * 4 + 1] = v * 0.985; d[i * 4 + 2] = v * 0.95; d[i * 4 + 3] = 255; h[i] = f[i] * 0.4 + n[i] * 0.6; ro[i] = 0.72 + (f[i] - 0.5) * 0.25 - stain * 0.4; }
    g.putImageData(im, 0, 0);
    for (let k = 0; k < 7; k++) { const x = R() * S, y = R() * S, r = S * (0.03 + R() * 0.07), gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(28,24,20,.42)"); gr.addColorStop(1, "rgba(28,24,20,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    g.strokeStyle = "rgba(40,38,34,.55)"; g.lineWidth = Math.max(1, S / 700); for (let k = 0; k < 5; k++) { let x = R() * S, y = R() * S; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 14; j++) { x += (R() - 0.5) * S * 0.06; y += (R() - 0.3) * S * 0.05; g.lineTo(x, y); } g.stroke(); }
    g.strokeStyle = "rgba(20,20,20,.12)"; g.lineWidth = S / 60; for (let k = 0; k < 3; k++) { g.beginPath(); const y = R() * S; g.moveTo(0, y); g.bezierCurveTo(S * 0.3, y + (R() - 0.5) * S * 0.4, S * 0.7, y + (R() - 0.5) * S * 0.4, S, y); g.stroke(); }
    g.fillStyle = "rgba(60,58,54,.6)"; g.fillRect(0, 0, S, Math.max(1, S / 512)); g.fillRect(0, 0, Math.max(1, S / 512), S);
    return { map: tex(c, true), normal: tex(normalFrom(h, S, 2.2)), rough: tex(grayCanvas(ro, S, 0, 1)) }; }); },
  wood(S) { return cached("wood", S, S => { const n = fbm(S, 4, 4, 61), f = vnoise(S, 128, 67), c = cnv(S), g = c.getContext("2d"), im = g.createImageData(S, S), d = im.data, h = new Float32Array(S * S), R = rng(71);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const i = y * S + x, ring = 0.5 + 0.5 * Math.sin((y / S * 34 + n[i] * 6) * Math.PI * 2), v = 0.78 + ring * 0.16 + (f[i] - 0.5) * 0.1; d[i * 4] = 182 * v; d[i * 4 + 1] = 128 * v; d[i * 4 + 2] = 78 * v; d[i * 4 + 3] = 255; h[i] = ring * 0.3 + f[i] * 0.1; }
    g.putImageData(im, 0, 0);
    g.lineCap = "round"; for (let k = 0; k < 60; k++) { const x = R() * S, y = R() * S, l = S * (0.02 + R() * 0.12), a = (R() - 0.5) * 0.8; g.strokeStyle = "rgba(60,36,18," + (0.12 + R() * 0.25).toFixed(2) + ")"; g.lineWidth = Math.max(1, S / 1500 + R() * S / 900); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    for (let k = 0; k < 4; k++) { const x = R() * S, y = R() * S, r = S * (0.015 + R() * 0.03), gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(25,14,6,.75)"); gr.addColorStop(0.6, "rgba(50,28,12,.35)"); gr.addColorStop(1, "rgba(50,28,12,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
    for (let k = 0; k < 3; k++) { const x = R() * S, y = R() * S, r = S * (0.05 + R() * 0.05); g.strokeStyle = "rgba(40,26,14,.18)"; g.lineWidth = S / 200; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); }
    return { map: tex(c, true), normal: tex(normalFrom(h, S, 1.4)) }; }); },
  wall(S) { return cached("wall", S, S => { const n = fbm(S, 8, 5, 81), c = cnv(S), g = c.getContext("2d"), im = g.createImageData(S, S), d = im.data, R = rng(83);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const i = y * S + x, low = y > S * 0.62, gr = Math.max(0, (y / S - 0.75)) * 1.6, v = (low ? 0.62 : 0.9) + (n[i] - 0.5) * 0.08 - gr * 0.35; d[i * 4] = (low ? 96 : 196) * v / (low ? 0.62 : 0.9); d[i * 4 + 1] = (low ? 112 : 192) * v / (low ? 0.62 : 0.9); d[i * 4 + 2] = (low ? 124 : 182) * v / (low ? 0.62 : 0.9); d[i * 4 + 3] = 255; }
    g.putImageData(im, 0, 0); g.fillStyle = "#c79a2a"; g.fillRect(0, S * 0.615, S, S * 0.012);
    for (let k = 0; k < 40; k++) { const x = R() * S, y = S * (0.65 + R() * 0.35); g.fillStyle = "rgba(30,30,30," + (0.05 + R() * 0.15).toFixed(2) + ")"; g.fillRect(x, y, S * (0.01 + R() * 0.05), S * 0.002 + R() * S * 0.004); }
    for (let k = 0; k < 12; k++) { const x = R() * S, y0 = R() * S * 0.4; const gr = g.createLinearGradient(0, y0, 0, y0 + S * 0.2); gr.addColorStop(0, "rgba(90,80,60,.10)"); gr.addColorStop(1, "rgba(90,80,60,0)"); g.fillStyle = gr; g.fillRect(x, y0, S * 0.01, S * 0.2); }
    return { map: tex(c, true), normal: tex(normalFrom(n, S, 1.2)) }; }); },
  esd(S) { return cached("esd", S, S => { const n = fbm(S, 32, 3, 91), c = cnv(S), g = c.getContext("2d"), im = g.createImageData(S, S), d = im.data;
    for (let i = 0; i < S * S; i++) { const v = 0.92 + (n[i] - 0.5) * 0.12; d[i * 4] = 44 * v; d[i * 4 + 1] = 72 * v; d[i * 4 + 2] = 96 * v; d[i * 4 + 3] = 255; }
    g.putImageData(im, 0, 0); g.strokeStyle = "rgba(170,200,230,.16)"; g.lineWidth = Math.max(1, S / 512); const st = S / 16; for (let k = 0; k <= 16; k++) { g.beginPath(); g.moveTo(k * st, 0); g.lineTo(k * st, S); g.moveTo(0, k * st); g.lineTo(S, k * st); g.stroke(); }
    return { map: tex(c, true), normal: tex(normalFrom(n, S, 0.6)) }; }); },
  worn(S) { return cached("worn", S, S => { const n = fbm(S, 8, 4, 97), c = cnv(S), g = c.getContext("2d"), R = rng(101); g.drawImage(grayCanvas(n, S, 0.3, 0.5), 0, 0);
    g.lineCap = "round"; for (let k = 0; k < 220; k++) { const x = R() * S, y = R() * S, l = S * (0.01 + R() * 0.08), a = R() * Math.PI; g.strokeStyle = "rgba(255,255,255," + (0.08 + R() * 0.2).toFixed(2) + ")"; g.lineWidth = Math.max(1, S / 1200); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    return { rough: tex(c) }; }); }
};
export function texSet(name, T, rep) { const S = texSize(name === "concrete" || name === "wood" ? 2048 : 1024, T), base = TEX[name](S), out = {}; Object.keys(base).forEach(k => { const t = base[k].clone(); t.needsUpdate = true; if (rep) t.repeat.set(rep[0], rep[1]); out[k] = t; }); return out; }
// targhetta / etichetta su canvas (testo nitido)
export function labelTex(lines, o) {
  o = Object.assign({ w: 512, h: 256, bg: "#d9dde2", fg: "#14171a", accent: "#e8541c", border: true, logo: "" }, o || {}); const c = cnv(o.w, o.h), g = c.getContext("2d");
  g.fillStyle = o.bg; g.fillRect(0, 0, o.w, o.h); if (o.border) { g.strokeStyle = o.fg; g.lineWidth = o.h / 40; g.strokeRect(o.h / 40, o.h / 40, o.w - o.h / 20, o.h - o.h / 20); }
  if (o.logo) { g.font = "800 " + Math.round(o.h * 0.15) + "px Inter, system-ui, sans-serif"; const lw = g.measureText(o.logo).width + o.h / 10; g.fillStyle = o.accent; g.fillRect(o.h / 14, o.h / 14, lw, o.h * 0.22); g.fillStyle = "#fff"; g.textBaseline = "middle"; g.fillText(o.logo, o.h / 10, o.h / 14 + o.h * 0.115); }
  g.fillStyle = o.fg; g.textBaseline = "top"; const y0 = o.logo ? o.h * 0.36 : o.h * 0.12, lh = (o.h - y0 - o.h * 0.08) / Math.max(1, lines.length);
  lines.forEach((l, i) => { g.font = (i === 0 ? "700 " : "500 ") + Math.round(lh * 0.72) + "px Inter, system-ui, sans-serif"; g.fillText(l, o.h / 10, y0 + i * lh); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = tier().aniso; return t;
}

// normal map da un canvas in scala di grigi (bordi non ripetuti)
export function normalFromCanvas(src, str, scale) {
  const k = scale || 1, w = Math.max(2, Math.round(src.width * k)), h = Math.max(2, Math.round(src.height * k)), c = cnv(w, h), g = c.getContext("2d"); g.drawImage(src, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data, H = new Float32Array(w * h); for (let i = 0; i < w * h; i++) H[i] = d[i * 4] / 255;
  const im = g.createImageData(w, h), o = im.data, s = (str || 2) * k;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const l = H[y * w + Math.max(0, x - 1)], r = H[y * w + Math.min(w - 1, x + 1)], u = H[Math.max(0, y - 1) * w + x], dn = H[Math.min(h - 1, y + 1) * w + x]; const nx = (l - r) * s, ny = (u - dn) * s, il = 1 / Math.hypot(nx, ny, 1), i = (y * w + x) * 4; o[i] = (nx * il * 0.5 + 0.5) * 255; o[i + 1] = (ny * il * 0.5 + 0.5) * 255; o[i + 2] = (il * 0.5 + 0.5) * 255; o[i + 3] = 255; }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.anisotropy = tier().aniso; return t;
}

/* ====================== libreria materiali ====================== */
const MATC = {};
export function materials(T) {
  T = T || tier(); const key = T.id; if (MATC[key]) return MATC[key];
  const P = T.phys, D = T.detail, cache = {};
  const br = D ? texSet("brushed", T, [3, 1]) : null, ci = D ? texSet("castIron", T, [2, 2]) : null, rb = D >= 2 ? texSet("rubber", T, [4, 4]) : null, kn = D >= 2 ? texSet("knurl", T, [6, 1]) : null, cb = D ? texSet("carbon", T, [4, 4]) : null;
  const std = (o) => { const m = new THREE.MeshStandardMaterial(o); m.userData.shared = true; return m; };
  const phy = (o) => { if (!P) { ["clearcoat", "clearcoatRoughness", "anisotropy", "anisotropyRotation", "sheen", "sheenColor", "sheenRoughness", "transmission", "thickness", "ior", "iridescence", "iridescenceIOR", "clearcoatNormalMap", "clearcoatNormalScale", "specularIntensity", "attenuationColor", "attenuationDistance"].forEach(k => delete o[k]); return std(o); } const m = new THREE.MeshPhysicalMaterial(o); m.userData.shared = true; return m; };
  const L = {
    T,
    alu(col) { const k = "alu" + col; return cache[k] || (cache[k] = phy({ color: col != null ? col : 0xc9ced4, metalness: 0.92, roughness: 0.38, roughnessMap: br && br.rough, normalMap: br && br.normal, normalScale: new THREE.Vector2(0.25, 0.25), anisotropy: 0,  clearcoat: col != null ? 0.3 : 0, clearcoatRoughness: 0.25 })); },
    steel: phy({ color: 0xb9bec4, metalness: 1, roughness: 0.32, roughnessMap: br && br.rough, normalMap: br && br.normal, normalScale: new THREE.Vector2(0.15, 0.15) }),
    chrome: std({ color: 0xe3e6ea, metalness: 1, roughness: 0.06 }),
    oxide: phy({ color: 0x232427, metalness: 0.85, roughness: 0.36, clearcoat: 0.25, clearcoatRoughness: 0.4 }),
    zinc: phy({ color: 0xc6ccd3, metalness: 1, roughness: 0.34, iridescence: 0.25, iridescenceIOR: 1.6 }),
    yzinc: phy({ color: 0xd8c27a, metalness: 1, roughness: 0.3, iridescence: 0.6, iridescenceIOR: 1.8 }),
    cast(col) { const k = "cast" + col; return cache[k] || (cache[k] = std({ color: col || 0x4c5963, metalness: 0.35, roughness: 0.62, normalMap: ci && ci.normal, normalScale: new THREE.Vector2(0.6, 0.6), roughnessMap: ci && ci.rough })); },
    paint(col) { const k = "paint" + col; return cache[k] || (cache[k] = phy({ color: col, metalness: 0.15, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.18 })); },
    plastic(col, r) { const k = "pl" + col + "_" + r; return cache[k] || (cache[k] = phy({ color: col, metalness: 0, roughness: r != null ? r : 0.45, specularIntensity: 0.6 })); },
    rubber: std({ color: 0x17181a, metalness: 0, roughness: 0.85, normalMap: rb && rb.normal, normalScale: new THREE.Vector2(0.4, 0.4) }),
    carbon: phy({ color: 0xffffff, map: cb && cb.map, normalMap: cb && cb.normal, normalScale: new THREE.Vector2(0.4, 0.4), metalness: 0.3, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.06 }),
    knurl: std({ color: 0x2a2b2e, metalness: 0.9, roughness: 0.4, normalMap: kn && kn.normal }),
    brass: std({ color: 0xd2a74e, metalness: 1, roughness: 0.25 }),
    copper: std({ color: 0xd2804a, metalness: 1, roughness: 0.28 }),
    gold: std({ color: 0xf0c25a, metalness: 1, roughness: 0.18 }),
    glass: phy({ color: 0xffffff, metalness: 0, roughness: 0.03, transmission: 0.95, thickness: 0.01, ior: 1.5, transparent: !P, opacity: P ? 1 : 0.25 }),
    lens(col) { const k = "lens" + col; return cache[k] || (cache[k] = phy({ color: col, metalness: 0, roughness: 0.06, transmission: 0.85, thickness: 0.5, ior: 1.52, attenuationColor: new THREE.Color(col), attenuationDistance: 2, emissive: new THREE.Color(col), emissiveIntensity: 0, transparent: !P, opacity: P ? 1 : 0.8 })); },
    emit(col, I) { const k = "em" + col + "_" + I; return cache[k] || (cache[k] = std({ color: 0x111111, emissive: col, emissiveIntensity: I != null ? I : 2, toneMapped: true })); },
    black: std({ color: 0x0e0f11, metalness: 0.2, roughness: 0.55 }),
    cable(col) { const k = "cab" + col; return cache[k] || (cache[k] = phy({ color: col, metalness: 0, roughness: 0.5, sheen: 0.3, sheenRoughness: 0.6, sheenColor: new THREE.Color(0x777777), clearcoat: 0.25, clearcoatRoughness: 0.5 })); },
    label(lines, o) { const t = labelTex(lines, o); return std({ map: t, metalness: (o && o.metal) || 0.25, roughness: 0.4 }); }
  };
  MATC[key] = L; return L;
}

/* ====================== scintille con scia (additive, HDR per il bloom) ====================== */
export class Sparks {
  constructor(n, o) {
    o = Object.assign({ size: 0.012, streak: 0.022, grav: 9.8, drag: 0.7, bounce: 0.35, floor: 0 }, o || {}); this.o = o; this.n = n; this.i = 0; this.live = 0;
    this.P = new Float32Array(n * 3); this.Vl = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n); this.hot = new Float32Array(n);
    this.lp = new Float32Array(n * 6); this.lc = new Float32Array(n * 6); this.pc = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) this.P[k * 3 + 1] = -999;
    const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.BufferAttribute(this.lp, 3).setUsage(THREE.DynamicDrawUsage)); lg.setAttribute("color", new THREE.BufferAttribute(this.lc, 3).setUsage(THREE.DynamicDrawUsage));
    this.lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(this.P, 3).setUsage(THREE.DynamicDrawUsage)); pg.setAttribute("color", new THREE.BufferAttribute(this.pc, 3).setUsage(THREE.DynamicDrawUsage));
    this.pts = new THREE.Points(pg, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, toneMapped: false, uniforms: { size: { value: o.size * 420 } },
      vertexShader: "uniform float size; varying vec3 vC; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = clamp(size / -mv.z, 1.0, 10.0); gl_Position = projectionMatrix * mv; }",
      fragmentShader: "varying vec3 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(d)); gl_FragColor = vec4(vC * a, a); }" }));
    this.obj = new THREE.Group(); this.obj.add(this.lines, this.pts); this.lines.frustumCulled = this.pts.frustumCulled = false; this.obj.userData.noShadow = true;
  }
  // p posizione, d direzione media, spread (0..1), v velocità, n quante, life, temp (0..1: 1 = bianco-giallo)
  emit(p, d, spread, v, cnt, life, temp) { for (let c = 0; c < cnt; c++) { const k = this.i, j = k * 3; this.i = (this.i + 1) % this.n; const sx = (Math.random() - 0.5) * 2 * spread, sy = (Math.random() - 0.5) * 2 * spread, sz = (Math.random() - 0.5) * 2 * spread, s = v * (0.45 + Math.random() * 0.8);
    this.P[j] = p[0]; this.P[j + 1] = p[1]; this.P[j + 2] = p[2]; this.Vl[j] = (d[0] + sx) * s; this.Vl[j + 1] = (d[1] + sy) * s; this.Vl[j + 2] = (d[2] + sz) * s; this.life[k] = this.max[k] = (life || 0.6) * (0.5 + Math.random() * 0.7); this.hot[k] = temp != null ? temp : 1; } this.live = 2; }
  update(dt, floorFn) {
    if (!this.live) return; const o = this.o, n = this.n, P = this.P, Vl = this.Vl; let alive = 0; const dr = Math.exp(-o.drag * dt);
    for (let k = 0; k < n; k++) { const j = k * 3, j6 = k * 6; if (this.life[k] <= 0) { if (P[j + 1] > -900) { P[j + 1] = -999; for (let q = 0; q < 6; q++) { this.lc[j6 + q] = 0; this.lp[j6 + q] = -999; } this.pc[j] = this.pc[j + 1] = this.pc[j + 2] = 0; } continue; }
      alive++; this.life[k] -= dt; Vl[j] *= dr; Vl[j + 2] *= dr; Vl[j + 1] = Vl[j + 1] * dr - o.grav * dt; P[j] += Vl[j] * dt; P[j + 1] += Vl[j + 1] * dt; P[j + 2] += Vl[j + 2] * dt;
      const fy = floorFn ? floorFn(P[j], P[j + 2]) : o.floor; if (P[j + 1] < fy) { P[j + 1] = fy; Vl[j + 1] = -Vl[j + 1] * o.bounce; Vl[j] *= 0.6; Vl[j + 2] *= 0.6; }
      const t = Math.max(0, this.life[k] / this.max[k]), h = this.hot[k] * (0.35 + 0.65 * t), r = 1.0 + 1.5 * h, g = 0.18 + 1.25 * h * h, b = 0.02 + 0.75 * Math.pow(h, 4), fade = Math.min(1, t * 3);
      this.pc[j] = r * fade; this.pc[j + 1] = g * fade; this.pc[j + 2] = b * fade;
      const sl = o.streak / Math.max(0.5, Math.hypot(Vl[j], Vl[j + 1], Vl[j + 2]));
      this.lp[j6] = P[j]; this.lp[j6 + 1] = P[j + 1]; this.lp[j6 + 2] = P[j + 2]; this.lp[j6 + 3] = P[j] - Vl[j] * sl; this.lp[j6 + 4] = P[j + 1] - Vl[j + 1] * sl; this.lp[j6 + 5] = P[j + 2] - Vl[j + 2] * sl;
      this.lc[j6] = r * fade; this.lc[j6 + 1] = g * fade; this.lc[j6 + 2] = b * fade; this.lc[j6 + 3] = r * 0.15 * fade; this.lc[j6 + 4] = g * 0.08 * fade; this.lc[j6 + 5] = 0; }
    this.live = alive ? 2 : this.live - 1; const lg = this.lines.geometry, pg = this.pts.geometry; lg.attributes.position.needsUpdate = lg.attributes.color.needsUpdate = true; pg.attributes.position.needsUpdate = pg.attributes.color.needsUpdate = true;
  }
  count() { let a = 0; for (let k = 0; k < this.n; k++) if (this.life[k] > 0) a++; return a; }
  dispose() { this.lines.geometry.dispose(); this.lines.material.dispose(); this.pts.geometry.dispose(); this.pts.material.dispose(); }
}

/* ====================== utilità ====================== */
// misura semplice: varianza dei pixel di un canvas WebGL (per i test: scena non vuota)
export function pixelStats(renderer) { const gl = renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, n = 64, px = new Uint8Array(4); let s = 0, s2 = 0, c = 0;
  for (let i = 0; i < n; i++) { const x = Math.floor((i % 8 + 0.5) / 8 * w), y = Math.floor((Math.floor(i / 8) + 0.5) / 8 * h); gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const l = (px[0] + px[1] + px[2]) / 3; s += l; s2 += l * l; c++; }
  const m = s / c; return { mean: m, std: Math.sqrt(Math.max(0, s2 / c - m * m)) }; }
export function disposeTree(o) { o.traverse(x => { if (x.geometry && !x.geometry.userData.shared) x.geometry.dispose(); if (x.material) [].concat(x.material).forEach(m => { if (m.userData && m.userData.shared) return; ["map", "normalMap", "roughnessMap", "emissiveMap", "alphaMap", "metalnessMap"].forEach(k => { if (m[k] && !m[k].userData.shared) m[k].dispose(); }); m.dispose(); }); }); }
