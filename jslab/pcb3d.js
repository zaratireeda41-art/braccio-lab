// Braccio Lab · Vista PCB 3D/4D: la scheda composta sulla Tavola da lavoro diventa un modello 3D (FR-4, rame sopra/sotto,
// piazzole e fori metallizzati, vias, solder mask, serigrafia, componenti, giunti di saldatura) e la 4ª dimensione è il tempo:
// correnti animate lungo le piste dalla simulazione nel tempo, LED che si accendono, vista termica, linea del tempo.
import * as THREE from "../vendor/three.module.min.js";
import { OrbitControls } from "../vendor/three-fx.min.js";
import * as GFX from "../js3d/gfx.js?v=6";
import * as P3 from "../js3d/parts3d.js?v=6";
import { pcbKit } from "./pcbparts.js?v=6";

const U = 2.54; // mm per passo di griglia
const PKG_RTH = { R: 300, POT: 200, LED: 350, D: 180, C: 120, L: 90, LDR: 300, NTC: 300, FUSE: 200, LAMP: 60, NPN: 200, NMOS: 62, REG: 62, NE555: 110, OPAMP: 110, ULN: 90, L298: 13, MCU: 40, RELAY: 60, MOTOR: 8, SERVO: 15, STEPDRV: 25, ACDRIVE: 2, SW: 300, BTN: 300, V: 0, BAT: 30, MAINS: 0, I: 0 };
const PKG_TAU = { R: 6, LED: 5, D: 6, C: 20, L: 25, NPN: 8, NMOS: 30, REG: 40, NE555: 25, OPAMP: 25, ULN: 30, L298: 60, MCU: 60, RELAY: 40, MOTOR: 120, SERVO: 90, STEPDRV: 30, ACDRIVE: 300 };
const heatCol = (T) => { const t = Math.max(0, Math.min(1, (T - 25) / 100)); const c = new THREE.Color(); c.setHSL(0.66 - 0.66 * t, 0.95, 0.42 + 0.18 * t); return c; };
function parseBoard(b) {
  const id = (b && b.id) || "", nm = (b && b.name) || "";
  const L = +((/(\d+)L/.exec(id) || [])[1] || b && b.layers || 2), th = /-(\d)(\d)-/.test(id) ? +(/-(\d)(\d)-/.exec(id)[1] + "." + /-(\d)(\d)-/.exec(id)[2]) : 1.6;
  const oz = +((/(\d+(?:\.\d+)?)oz/.exec(id) || [])[1] || 1), fin = /enig|enepig/i.test(id + nm) ? "enig" : /osp/i.test(id + nm) ? "osp" : "hasl", mat = /alu/.test(id) ? "alu" : /flex/.test(id) ? "flex" : /rogers/.test(id) ? "rogers" : "fr4";
  return { L: Math.max(1, Math.min(8, L)), th: th > 0 ? th : 1.6, oz, fin, mat, color: (b && b.color) || "#1f7a3a", name: nm || "PCB 2 strati FR-4" };
}
// larghezza minima della pista (IPC-2221, strato esterno, ΔT = 10 °C)
export function traceWidth(I, oz) { const A = Math.pow(Math.abs(I) / (0.048 * Math.pow(10, 0.44)), 1 / 0.725); return Math.max(0.25, A / (1.378 * (oz || 1)) * 0.0254); }
function segsOf(w) { const a = w.a, b = w.b, s = []; if (a[0] !== b[0]) s.push([[a[0], a[1]], [b[0], a[1]]]); if (a[1] !== b[1]) s.push([[b[0], a[1]], [b[0], b[1]]]); if (!s.length) s.push([[a[0], a[1]], [b[0], b[1]]]); return s; }
function segX(s1, s2) { // incrocio di due segmenti ortogonali (non agli estremi)
  const h1 = s1[0][1] === s1[1][1], h2 = s2[0][1] === s2[1][1]; if (h1 === h2) return false;
  const H = h1 ? s1 : s2, V = h1 ? s2 : s1, y = H[0][1], x = V[0][0];
  const inH = x > Math.min(H[0][0], H[1][0]) && x < Math.max(H[0][0], H[1][0]), inV = y > Math.min(V[0][1], V[1][1]) && y < Math.max(V[0][1], V[1][1]);
  return inH && inV;
}
export function layoutPcb(CIR, L, nl, board) {
  // assegna gli strati alle piste: GND sotto (se ≥ 2 strati), poi sposta sotto le piste che incrociano altre reti (con vias)
  const B = parseBoard(board), pins = {}, out = { traces: [], vias: [], drc: [], jumpers: [] };
  L.comps.forEach(c => CIR.pinPos(c).forEach(p => { pins[p.x + "," + p.y] = 1; }));
  const net = w => nl && nl.keyNode ? nl.keyNode[w.a.join(",")] : null;
  const T = L.wires.map((w, i) => ({ i, w, net: net(w), segs: segsOf(w), layer: B.L >= 2 && net(w) === "0" ? "bot" : "top" }));
  for (let pass = 0; pass < 2; pass++) T.forEach(t => { if (t.layer !== "top") return; const hit = T.some(o => o !== t && o.layer === "top" && o.net !== t.net && t.segs.some(s1 => o.segs.some(s2 => segX(s1, s2)))); if (hit) { if (B.L >= 2) t.layer = "bot"; else if (pass === 1 && !t.jump) { t.jump = true; out.jumpers.push(t.i); } } });
  T.forEach(t => { if (t.layer === "bot") [t.w.a, t.w.b].forEach(p => { if (!pins[p[0] + "," + p[1]]) out.vias.push({ x: p[0], y: p[1], net: t.net }); }); });
  if (out.jumpers.length) out.drc.push({ sev: "warn", t: out.jumpers.length + " piste incrociate su scheda a 1 strato", why: "Su una faccia sola due reti diverse non possono incrociarsi.", fix: "Ponticelli (resistenze 0 Ω) o scheda a 2 strati." });
  out.traces = T; out.B = B; return out;
}
export function mountPcb3d(el, env) {
  const CIR = env.CIR, esc = env.esc, rm = !!env.reduced, test = !!env.testMode;
  let T = GFX.tier(), lite = T.id === "bassa";
  const V = { mode: "normal", explode: 0, lay: { fr4: true, top: true, bot: true, mask: true, silk: true, comp: true, sol: true, via: true, flow: true }, play: !rm, k: 0, tl: null, spd: 1, sel: null, run: false, t: 0, dirty: true, ms: 0 };
  el.innerHTML = `<div class="p3"><div class="sp-stage p3-stage" id="p3Stage"><canvas id="p3Cv" aria-label="Scheda in 3D"></canvas>
    <div class="sp-top"><div class="lab-seg p3-mode">${[["normal", "Reale"], ["flow", "Correnti"], ["heat", "Termica"]].map(([k, n]) => `<button type="button" data-p3m="${k}"${k === "normal" ? ' class="on"' : ""}>${n}</button>`).join("")}</div><button type="button" class="btn sm ghost" data-p3="fit">Inquadra</button><button type="button" class="btn sm ghost" data-p3="top">Dall'alto</button></div>
    <div class="sp-hint" id="p3Hint"></div>
    <div class="p3-tl"><button type="button" class="btn sm" data-p3="play" aria-label="Avvia o ferma il tempo">${V.play ? "❚❚" : "▶"}</button><input type="range" id="p3T" min="0" max="119" value="0" aria-label="Linea del tempo"><span id="p3Tl">t = 0 s</span><select id="p3Spd" aria-label="Velocità"><option value="0.25">×0,25</option><option value="1" selected>×1</option><option value="4">×4</option></select></div></div>
    <div class="card p3-panel"><div class="p3-row"><label class="lb-f"><span>Vista esplosa <b id="p3Ev">0%</b></span><input type="range" id="p3E" min="0" max="1" step="0.01" value="0"></label></div>
      <div class="p3-lay">${[["fr4", "Substrato"], ["top", "Rame sopra"], ["bot", "Rame sotto"], ["mask", "Solder mask"], ["silk", "Serigrafia"], ["comp", "Componenti"], ["sol", "Saldature"], ["via", "Fori e vias"], ["flow", "Flusso di corrente"]].map(([k, n]) => `<label class="chip tog on"><input type="checkbox" data-lay="${k}" checked> ${n}</label>`).join("")}</div>
      <div id="p3Info"></div><div id="p3Sel"></div></div></div>`;
  const $ = s => el.querySelector(s), canvas = $("#p3Cv"), stage = $("#p3Stage");
  { const top = el.querySelector(".sp-top"); if (top) top.insertAdjacentHTML("beforeend", GFX.selectHtml("p3Q", "gfx-q")); }
  const renderer = GFX.makeRenderer(canvas, { test, tier: T, exposure: 1.0 });
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0c0f13);
  scene.environment = GFX.envMap(renderer, "studio"); scene.environmentIntensity = 0.9;
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 2000); camera.position.set(0, 40, 40);
  const controls = new OrbitControls(camera, canvas); controls.enableDamping = !rm; controls.dampingFactor = 0.08; controls.screenSpacePanning = true; controls.minDistance = 3; controls.maxDistance = 400; controls.addEventListener("change", () => { V.dirty = true; });
  scene.add(new THREE.HemisphereLight(0xe8f0ff, 0x1a1c20, 0.35)); const key = new THREE.DirectionalLight(0xfff6ea, 2.3); key.position.set(18, 42, 26); scene.add(key); scene.add(key.target); const rim = new THREE.DirectionalLight(0x9fc4ff, 0.7); rim.position.set(-30, 14, -22); scene.add(rim);
  const root = new THREE.Group(); scene.add(root);
  const G = {}; ["bot", "fr4", "top", "via", "mask", "maskB", "silk", "sol", "comp", "flow", "fx"].forEach(k => { G[k] = new THREE.Group(); root.add(G[k]); });
  // tappetino antistatico sotto la scheda + ombra di contatto
  const esdT = GFX.texSet("esd", T, [6, 6]); const mat = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: esdT.map, normalMap: esdT.normal, roughness: 0.82, metalness: 0 })); mat.rotation.x = -Math.PI / 2; mat.receiveShadow = true; scene.add(mat);
  if (esdT.map) { esdT.map.repeat.set(40, 40); if (esdT.normal) esdT.normal.repeat.set(40, 40); }
  let cs = null, pipe = null;
  function setupTier() {
    lite = T.id === "bassa"; GFX.setupShadow(key, T, 40, { bias: -0.0004, normalBias: 0.04, far: 160 });
    if (pipe) pipe.setTier(T); else pipe = new GFX.Pipeline(renderer, scene, camera, { tier: T, test, ao: { radius: 1.4, distanceFallOff: 1, thickness: 1.5, scale: 1 }, aoI: 0.95, bloom: [0.6, 0.5, 6], dof: true, focus: 50, aperture: 0.00035, maxblur: 0.005 });
    if (cs) { cs.dispose(); cs = null; } if (T.contact) cs = new GFX.ContactShadow(renderer, scene, { w: 80, d: 80, res: T.csRes, far: 14, blur: 3, opacity: 0.85, darkness: 1.4, every: 4 });
    V.dirty = true;
  }
  setupTier();
  const gov = new GFX.Governor(n => { env.toast && env.toast("Grafica ridotta a " + GFX.TIERS[n].n + " per restare fluida"); });
  const offGfx = GFX.onChange(id => { T = GFX.TIERS[id]; setupTier(); const s = el.querySelector("#p3Q"); if (s) s.value = GFX.setting(); if (built) { build(); setFrame(V.k); } });
  let built = null, disposables = [], kit = null;
  function track(x) { disposables.push(x); return x; }
  function clear() { Object.values(G).forEach(g => { g.traverse(o => { if (o.geometry && !o.geometry.userData.shared && disposables.indexOf(o.geometry) < 0) o.geometry.dispose(); }); while (g.children.length) g.remove(g.children[0]); }); disposables.forEach(d => d.dispose && d.dispose()); disposables = []; }
  const MAT0 = {
    cu: new THREE.MeshStandardMaterial({ color: 0xd88a4a, metalness: 1, roughness: 0.28 }),
    hasl: new THREE.MeshStandardMaterial({ color: 0xd6dade, metalness: 1, roughness: 0.16 }),
    enig: new THREE.MeshStandardMaterial({ color: 0xf0c45a, metalness: 1, roughness: 0.14 }),
    osp: new THREE.MeshStandardMaterial({ color: 0xe0915a, metalness: 1, roughness: 0.24 }),
    barrel: new THREE.MeshStandardMaterial({ color: 0xb8875a, metalness: 1, roughness: 0.35, side: THREE.DoubleSide }),
    hole: new THREE.MeshBasicMaterial({ color: 0x050505 }),
    cold: new THREE.MeshStandardMaterial({ color: 0x8e9196, metalness: 0.6, roughness: 0.8 }),
    burnt: new THREE.MeshStandardMaterial({ color: 0x2a1a10, metalness: 0.1, roughness: 0.95 }),
    lead: new THREE.MeshStandardMaterial({ color: 0xc9cdd2, metalness: 1, roughness: 0.3 })
  };
  function mesh(geo, mat, parent) { const m = new THREE.Mesh(track(geo), mat); m.castShadow = m.receiveShadow = true; (parent || root).add(m); return m; }
  function canvasTex(w, h, draw, srgb) { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); draw(g); const t = track(new THREE.CanvasTexture(c)); if (srgb !== false) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = T.aniso; t.userData.canvas = c; return t; }
  function rrShape(x0, y0, w, h, r) { const s = new THREE.Shape(); s.moveTo(x0 + r, y0); s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r); s.lineTo(x0 + w, y0 + h - r); s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h); s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0); return s; }
  function batch() { const m = new Map(); return { add(geo, mt) { if (!m.has(mt)) m.set(mt, []); m.get(mt).push(geo); }, flush(parent) { m.forEach((gs, mt) => { const g = gs.length > 1 ? P3.merge(gs) : gs[0]; mesh(g, mt, parent); }); m.clear(); } }; }
  /* ---------- costruzione della scheda ---------- */
  function build() {
    clear(); const bench = env.bench(), B = bench.state, L = B.L, nl = B.nl || (bench.solve(), B.nl);
    if (!L.comps.length) { built = null; $("#p3Info").innerHTML = `<div class="sp-warn"><p>La Tavola è vuota: componi un circuito (o carica un esempio) e torna qui per vederlo in 3D.</p></div>`; return; }
    const lay = layoutPcb(CIR, L, nl, B.board), Bd = lay.B, th = Bd.th / U, D = T.detail;
    kit = pcbKit({ CIR, T, track, th });
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; L.comps.forEach(c => { CIR.pinPos(c).forEach(p => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }); const fb = CIR.footprint(c.t).box; [[fb[0], fb[1]], [fb[2], fb[3]]].forEach(q => { const r = CIR.rot({ x: q[0], y: q[1] }, c.r); x0 = Math.min(x0, c.x + r.x); x1 = Math.max(x1, c.x + r.x); y0 = Math.min(y0, c.y + r.y); y1 = Math.max(y1, c.y + r.y); }); });
    L.wires.forEach(w => [w.a, w.b].forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }));
    x0 -= 3; y0 -= 3; x1 += 3; y1 += 3; const W = x1 - x0, H = y1 - y0, cx = (x0 + x1) / 2, cz = (y0 + y1) / 2;
    root.position.set(-cx, 0, -cz);
    // substrato con angoli arrotondati e bordo smussato: sul fianco si vede la pila degli strati
    const coreCol = Bd.mat === "alu" ? "#b8bcc2" : Bd.mat === "flex" ? "#d98c1f" : Bd.mat === "rogers" ? "#e7e0cf" : "#c8b46a";
    const bv = D ? Math.min(0.05, th * 0.08) : 0, shp = rrShape(-W / 2 + bv, -H / 2 + bv, W - 2 * bv, H - 2 * bv, 1.2);
    const sg = new THREE.ExtrudeGeometry(shp, { depth: Math.max(0.01, th - 2 * bv), bevelEnabled: bv > 0, bevelSize: bv, bevelThickness: bv, bevelSegments: 1, curveSegments: 10 }); sg.rotateX(-Math.PI / 2); sg.translate(cx, -(th - bv), cz);
    const fr4 = Bd.mat === "fr4" || Bd.mat === "rogers" ? GFX.texSet("fr4", T, [W / 6, H / 6]) : {}; Object.values(fr4).forEach(track);
    const capM = track(new THREE.MeshStandardMaterial({ color: fr4.map ? 0xffffff : coreCol, map: fr4.map || null, normalMap: fr4.normal || null, roughness: 0.7, metalness: Bd.mat === "alu" ? 0.7 : 0 }));
    const stack = canvasTex(16, 256, g => { const lay2 = [], cuN = Bd.L, mk2 = (c, f) => lay2.push([c, f]); mk2(Bd.color, 0.07); for (let i = 0; i < cuN; i++) { mk2("#d08a4c", 0.035); if (i < cuN - 1) mk2(Bd.mat === "alu" && i === cuN - 2 ? "#c4c8cc" : coreCol, (1 - 0.14 - cuN * 0.035) / Math.max(1, cuN - 1)); } mk2(Bd.color, 0.07); let y = 0; lay2.forEach(([c, f]) => { g.fillStyle = c; g.fillRect(0, y * 256, 16, f * 256 + 1); y += f; }); for (let k = 0; k < 90; k++) { g.fillStyle = "rgba(255,255,255," + (Math.random() * 0.08).toFixed(3) + ")"; g.fillRect(0, 18 + Math.random() * 220, 16, 1); } });
    stack.wrapS = stack.wrapT = THREE.RepeatWrapping; stack.repeat.set(0.25, -1 / th); stack.offset.set(0, 1 + (1 - th + bv) / th);
    const sideM = track(new THREE.MeshStandardMaterial({ map: stack, roughness: 0.55, metalness: 0.1 }));
    const sub = mesh(sg, [capM, sideM], G.fr4); void sub;
    const PXmax = { bassa: 12, media: 20, alta: 30, ultra: 42 }[T.id], CMAX = { bassa: 1024, media: 2048, alta: 3072, ultra: 4096 }[T.id];
    const PX = Math.max(6, Math.min(PXmax, Math.floor(CMAX / Math.max(W, H)))), cw = Math.ceil(W * PX), ch = Math.ceil(H * PX), mx = x => (x - x0) * PX, my = y => (y - y0) * PX;
    const padR = c => /^(MOTOR|STEPDRV|ACDRIVE|MAINS|REG|L298|BAT|V)$/.test(c.t) ? 1.0 : 0.72;
    const pads = []; L.comps.forEach(c => CIR.pinPos(c).forEach((p, j) => pads.push({ c, j, x: p.x, y: p.y, r: padR(c), sq: j === 0 && c.t !== "GND", key: c.id + ":" + j })));
    const holesM = []; if (W > 16 && H > 12) [[x0 + 1.6, y0 + 1.6], [x1 - 1.6, y0 + 1.6], [x0 + 1.6, y1 - 1.6], [x1 - 1.6, y1 - 1.6]].forEach(q => holesM.push({ x: q[0], y: q[1] }));
    const fids = D ? [[x0 + 3.4, y0 + 1.4], [x1 - 3.4, y1 - 1.4], [x1 - 3.4, y0 + 1.4]].map(q => ({ x: q[0], y: q[1] })) : [];
    lay.traces.forEach(t => { const I = Math.max(...[0].concat((B.flows && B.flows[t.i] != null) ? [Math.abs(B.flows[t.i])] : [])); t.I = I; t.wmm = Math.max(0.3, traceWidth(I, Bd.oz) * 1.25); t.need = traceWidth(I, Bd.oz); if (t.need > 3) lay.drc.push({ sev: "warn", t: "Pista con " + CIR.si(I, "A") + ": servono " + CIR.fx(t.need, 1) + " mm di larghezza", why: "IPC-2221 con " + Bd.oz + " oz di rame e 10 °C di riscaldamento.", fix: "Rame 2 oz, pista più larga o un piano di rame." }); });
    const path = (g, t) => { g.beginPath(); g.moveTo(mx(t.w.a[0]), my(t.w.a[1])); g.lineTo(mx(t.w.b[0]), my(t.w.a[1])); g.lineTo(mx(t.w.b[0]), my(t.w.b[1])); };
    const maskC = new THREE.Color(Bd.color), cuUnder = maskC.clone().lerp(new THREE.Color(0xc98a4a), 0.28).offsetHSL(0, 0.05, 0.1);
    function maskTex(side) { return canvasTex(cw, ch, g => { g.fillStyle = Bd.color; g.fillRect(0, 0, cw, ch);
      g.lineCap = "round"; g.lineJoin = "round"; lay.traces.forEach(t => { if ((t.layer === "bot") !== (side === "bot")) return; g.strokeStyle = "#" + cuUnder.getHexString(); g.lineWidth = Math.max(2, t.wmm / U * PX); path(g, t); g.stroke(); g.strokeStyle = "rgba(255,255,255,.08)"; g.lineWidth = Math.max(1, t.wmm / U * PX * 0.35); path(g, t); g.stroke(); });
      g.fillStyle = "#" + cuUnder.getHexString(); pads.forEach(p => { g.beginPath(); g.arc(mx(p.x), my(p.y), (p.r + 0.32) * PX, 0, 7); g.fill(); });
      g.globalCompositeOperation = "destination-out"; pads.forEach(p => { g.beginPath(); if (p.sq) g.rect(mx(p.x) - (p.r + 0.12) * PX, my(p.y) - (p.r + 0.12) * PX, (p.r + 0.12) * 2 * PX, (p.r + 0.12) * 2 * PX); else g.arc(mx(p.x), my(p.y), (p.r + 0.12) * PX, 0, 7); g.fill(); });
      lay.vias.forEach(v => { g.beginPath(); g.arc(mx(v.x), my(v.y), 0.46 * PX, 0, 7); g.fill(); }); holesM.forEach(h => { g.beginPath(); g.arc(mx(h.x), my(h.y), 1.35 * PX, 0, 7); g.fill(); }); if (side === "top") fids.forEach(f => { g.beginPath(); g.arc(mx(f.x), my(f.y), 0.8 * PX, 0, 7); g.fill(); }); g.globalCompositeOperation = "source-over"; }); }
    function heightTex(side) { const k = T.id === "ultra" ? 0.75 : 0.5; return track(GFX.normalFromCanvas(canvasTex(Math.ceil(cw * k), Math.ceil(ch * k), g => { const s = k; g.fillStyle = "#555"; g.fillRect(0, 0, cw * s, ch * s); g.lineCap = "round"; g.lineJoin = "round";
      lay.traces.forEach(t => { if ((t.layer === "bot") !== (side === "bot")) return; [[1.9, "#777"], [1.35, "#a0a0a0"], [1, "#d0d0d0"]].forEach(([wf, c]) => { g.strokeStyle = c; g.lineWidth = Math.max(1.5, t.wmm / U * PX * s * wf); g.beginPath(); g.moveTo(mx(t.w.a[0]) * s, my(t.w.a[1]) * s); g.lineTo(mx(t.w.b[0]) * s, my(t.w.a[1]) * s); g.lineTo(mx(t.w.b[0]) * s, my(t.w.b[1]) * s); g.stroke(); }); });
      pads.forEach(p => { g.fillStyle = "#b8b8b8"; g.beginPath(); g.arc(mx(p.x) * s, my(p.y) * s, (p.r + 0.32) * PX * s, 0, 7); g.fill(); }); }, false).userData.canvas, 2.2, 1)); }
    const mTopMat = track(new THREE.MeshPhysicalMaterial({ map: maskTex("top"), alphaTest: 0.5, roughness: 0.5, metalness: 0, clearcoat: T.phys ? 1 : 0, clearcoatRoughness: 0.1, normalMap: D ? heightTex("top") : null, normalScale: new THREE.Vector2(0.6, 0.6) }));
    const mTop = mesh(new THREE.PlaneGeometry(W, H), mTopMat, G.mask); mTop.rotation.x = -Math.PI / 2; mTop.position.set(cx, 0.03, cz); mTop.castShadow = false;
    const mBot = mesh(new THREE.PlaneGeometry(W, H), track(new THREE.MeshPhysicalMaterial({ map: maskTex("bot"), alphaTest: 0.5, roughness: 0.5, clearcoat: T.phys ? 0.8 : 0, clearcoatRoughness: 0.15, side: THREE.DoubleSide })), G.maskB); mBot.rotation.x = Math.PI / 2; mBot.position.set(cx, -th - 0.03, cz); mBot.castShadow = false;
    // serigrafia nitida: contorni, punto pin 1, polarità, sigle, logo, revisione
    const silk = canvasTex(cw, ch, g => { g.strokeStyle = "#f6f6f2"; g.fillStyle = "#f6f6f2"; g.lineWidth = Math.max(1.5, PX * 0.12); g.font = `700 ${Math.round(PX * 0.95)}px Inter, system-ui, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
      L.comps.forEach(c => { if (c.t === "GND") { g.fillText("GND", mx(c.x), my(c.y) + PX * 1.3); return; } const fb = CIR.footprint(c.t).box, a = CIR.rot({ x: fb[0], y: fb[1] }, c.r), b = CIR.rot({ x: fb[2], y: fb[3] }, c.r), X0 = Math.min(a.x, b.x) + c.x, X1 = Math.max(a.x, b.x) + c.x, Y0 = Math.min(a.y, b.y) + c.y, Y1 = Math.max(a.y, b.y) + c.y;
        if (/^(R|D|L|FUSE)$/.test(c.t)) { const pp = CIR.pinPos(c), r = PX * 0.7; g.beginPath(); g.moveTo(mx(X0) + r, my(Y0)); g.arcTo(mx(X1), my(Y0), mx(X1), my(Y1), r); g.arcTo(mx(X1), my(Y1), mx(X0), my(Y1), r); g.arcTo(mx(X0), my(Y1), mx(X0), my(Y0), r); g.arcTo(mx(X0), my(Y0), mx(X1), my(Y0), r); g.stroke(); void pp; }
        else if (/^(LED|C)$/.test(c.t) && !(c.t === "C" && (c.p || {}).pol === false)) { const m2 = [(mx(X0) + mx(X1)) / 2, (my(Y0) + my(Y1)) / 2], rr = Math.max(mx(X1) - mx(X0), my(Y1) - my(Y0)) * 0.45; g.beginPath(); g.arc(m2[0], m2[1], rr, 0.25, Math.PI * 2 - 0.25); g.stroke(); g.beginPath(); g.moveTo(m2[0] + rr * Math.cos(0.25), m2[1] + rr * Math.sin(0.25)); g.lineTo(m2[0] + rr * Math.cos(-0.25), m2[1] + rr * Math.sin(-0.25)); g.stroke(); }
        else { g.strokeRect(mx(X0), my(Y0), (X1 - X0) * PX, (Y1 - Y0) * PX); const p0 = CIR.pinPos(c)[0]; g.beginPath(); g.arc(mx(p0.x) - PX * 0.9, my(p0.y) - PX * 0.9, PX * 0.22, 0, 7); g.fill(); }
        g.fillText(c.id, mx((X0 + X1) / 2), my(Y0) - PX * 0.7);
        if (/^(LED|D|C)$/.test(c.t)) { const k = CIR.pinPos(c)[c.t === "C" ? 0 : 1]; g.fillText(c.t === "C" ? "+" : "K", mx(k.x) + PX * 1.2, my(k.y) - PX * 1.1); } });
      holesM.forEach(h => { g.beginPath(); g.arc(mx(h.x), my(h.y), 1.7 * PX, 0, 7); g.stroke(); });
      g.textAlign = "left"; g.font = `800 ${Math.round(PX * 0.78)}px Inter, system-ui, sans-serif`; const tx = PX * 3.6, ty = ch - PX * 1.0; g.fillText("XENTRIQ INDUSTRY · Braccio Lab", tx, ty); g.font = `600 ${Math.round(PX * 0.58)}px Inter, system-ui, sans-serif`; g.fillText(Bd.L + "L " + Bd.th.toString().replace(".", ",") + " mm " + Bd.oz + " oz " + Bd.fin.toUpperCase() + " · REV A · 2026", tx, ty - PX * 0.9);
      g.lineWidth = Math.max(1, PX * 0.1); g.strokeRect(PX * 1.0, ch - PX * 2.6, PX * 2.2, PX * 2.0); g.font = `800 ${Math.round(PX * 0.9)}px Inter, system-ui, sans-serif`; g.fillText("XQ", PX * 1.25, ch - PX * 1.55);
      g.textAlign = "right"; g.font = `600 ${Math.round(PX * 0.7)}px Inter, system-ui, sans-serif`; g.fillText("Made in Italy · RoHS ♻", cw - PX * 1.2, PX * 1.2); });
    const sk = mesh(new THREE.PlaneGeometry(W, H), track(new THREE.MeshStandardMaterial({ map: silk, alphaTest: 0.35, roughness: 0.75, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1 })), G.silk); sk.rotation.x = -Math.PI / 2; sk.position.set(cx, 0.055, cz); sk.castShadow = false;
    // rame: piste come nastri (spessore 35 µm × oz, esagerato ×4 per vederlo)
    const cuT = Math.max(0.035 * Bd.oz * 4 / U, 0.04), CB = { top: batch(), bot: batch() };
    lay.traces.forEach(t => { const grp = t.layer === "bot" ? G.bot : G.top, y = t.layer === "bot" ? -th - cuT / 2 : cuT / 2, wv = t.wmm / U; t.mesh = []; t.segs.forEach(s => { const len = Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]) + wv; const m = mesh(new THREE.BoxGeometry(s[0][1] === s[1][1] ? len : wv, cuT, s[0][1] === s[1][1] ? wv : len), MAT0.cu, grp); m.position.set((s[0][0] + s[1][0]) / 2, y, (s[0][1] + s[1][1]) / 2); m.castShadow = false; t.mesh.push(m); });
      if (t.jump) { const a = t.w.a, b = t.w.b; const c = new THREE.CatmullRomCurve3([new THREE.Vector3(a[0], 0, a[1]), new THREE.Vector3((a[0] + b[0]) / 2, 2.2, (a[1] + b[1]) / 2), new THREE.Vector3(b[0], 0, b[1])]); mesh(new THREE.TubeGeometry(c, 16, 0.12, 6), MAT0.lead, G.comp); } });
    // piazzole con anello e foro metallizzato (HASL a cupola, ENIG piatto dorato, OSP rame)
    const fin = Bd.fin === "enig" ? MAT0.enig : Bd.fin === "osp" ? MAT0.osp : MAT0.hasl, PB = batch(), VB = batch(), N = Math.max(10, Math.round(18 * T.seg)), hr = 0.42;
    const ring = (r, rin, h, dome) => { const pts = [[rin, 0], [r, 0], [r, h * 0.7]]; if (dome) pts.push([r * 0.8, h * 1.6], [rin * 1.2, h * 1.5]); pts.push([rin, h]); return P3.lathe(pts, N); };
    const sqPad = (r, h) => { const s = new THREE.Shape(); s.moveTo(-r, -r); s.lineTo(r, -r); s.lineTo(r, r); s.lineTo(-r, r); s.closePath(); const hp = new THREE.Path(); hp.absarc(0, 0, hr, 0, Math.PI * 2, true); s.holes.push(hp); const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 10 }); g.rotateX(-Math.PI / 2); return g; };
    pads.forEach(p => { [0, 1].forEach(i => { const gm = p.sq ? sqPad(p.r, cuT * 1.4) : ring(p.r, hr, cuT * 1.4, Bd.fin === "hasl" && D > 0); if (i) { gm.scale(1, -1, 1); gm.translate(p.x, -th, p.y); } else gm.translate(p.x, 0, p.y); PB.add(gm, fin); });
      const br = new THREE.CylinderGeometry(hr, hr, th, N, 1, true); br.translate(p.x, -th / 2, p.y); PB.add(br, MAT0.barrel); });
    lay.vias.forEach(v => { [0, 1].forEach(i => { const gm = ring(0.42, 0.2, cuT * 1.4, false); if (i) { gm.scale(1, -1, 1); gm.translate(v.x, -th, v.y); } else gm.translate(v.x, 0, v.y); VB.add(gm, fin); }); const br = new THREE.CylinderGeometry(0.2, 0.2, th, 10, 1, true); br.translate(v.x, -th / 2, v.y); VB.add(br, MAT0.barrel); const hd = new THREE.CircleGeometry(0.2, 10); hd.rotateX(-Math.PI / 2); hd.translate(v.x, -th * 0.5, v.y); VB.add(hd, MAT0.hole); });
    holesM.forEach(h => { [0, 1].forEach(i => { const gm = ring(1.35, 0.65, cuT * 1.4, false); if (i) { gm.scale(1, -1, 1); gm.translate(h.x, -th, h.y); } else gm.translate(h.x, 0, h.y); VB.add(gm, fin); }); const br = new THREE.CylinderGeometry(0.65, 0.65, th, N, 1, true); br.translate(h.x, -th / 2, h.y); VB.add(br, MAT0.barrel); });
    fids.forEach(f => { const gm = new THREE.CylinderGeometry(0.4, 0.4, cuT * 1.4, N); gm.translate(f.x, cuT * 0.7, f.y); VB.add(gm, fin); });
    PB.flush(G.top); VB.flush(G.via);
    // componenti
    const comps = []; const res = B.res && B.res.ok ? B.res : null;
    L.comps.forEach(c => { const p = Object.assign({}, CIR.TYPES[c.t].p, c.p || {}), info = { c, p }; const g = kit.buildComp(c, p, info); g.position.set(c.x, 0.06, c.y); g.rotation.y = -(c.r || 0) * Math.PI / 2; g.userData.comp = c.id; G.comp.add(g); info.g = g; info.leds = []; g.traverse(o => { if (o.userData && o.userData.powerLed) info.leds.push(o); });
      info.base = info.body.map(m => ({ m, col: m.material.color ? m.material.color.clone() : null, map: m.material.map || null })); comps.push(info);
      const iss = res ? (res.issues || []).filter(i => i.comp === c.id && i.sev === "err" && /bruciat|esplod|surriscald|fus/i.test(i.t)) : []; info.dead = iss.length > 0; });
    // giunti di saldatura secondo la qualità del banco di saldatura (sopra e, in Alta/Ultra, anche sotto)
    const J = B.joints || {}, sold = Object.keys(J).length > 0; let nOk = 0, nCold = 0, nBr = 0, nNone = 0, nBurn = 0;
    pads.forEach(p => { if (p.c.t === "GND") return; const st = J[p.key] || "none", y = cuT * 1.4, pc = CIR.pinPos(p.c), o = pc[p.j + 1 < pc.length ? p.j + 1 : p.j - 1];
      if (st === "ok") nOk++; else if (st === "cold") nCold++; else if (st === "bridge") nBr++; else if (st === "burnt") nBurn++; else { nNone++; return; }
      kit.joint(G.sol, p, st, y, o ? { x: o.x, y: o.y } : null, false); if (D >= 2 && (st === "ok" || st === "cold")) kit.joint(G.sol, p, st, -th - y, null, true); });
    // mappa termica sopra la scheda (solo in vista termica)
    const hc = document.createElement("canvas"); hc.width = 256; hc.height = Math.max(16, Math.round(256 * H / W)); hc.getContext("2d", { willReadFrequently: true }); const heatT = track(new THREE.CanvasTexture(hc)); heatT.colorSpace = THREE.SRGBColorSpace;
    const heat = mesh(new THREE.PlaneGeometry(W, H), track(new THREE.MeshBasicMaterial({ map: heatT, transparent: true, opacity: 0.78, depthWrite: false, toneMapped: false })), G.fx); heat.rotation.x = -Math.PI / 2; heat.position.set(cx, 0.1, cz); heat.visible = false; heat.castShadow = heat.receiveShadow = false;
    built = { lay, comps, W, H, cx, cz, th, Bd, pads, counts: { ok: nOk, cold: nCold, bridge: nBr, none: nNone, burnt: nBurn }, sold, heat: { mesh: heat, tex: heatT, c: hc, x0, y0 } };
    if (cs) cs.set({ w: W * 1.6, d: H * 1.6, x: 0, z: 0, y: -th - 0.04 - 0.01 });
    mat.position.y = -th - 0.06; key.target.position.set(0, 0, 0); GFX.setupShadow(key, T, Math.max(W, H) * 0.75, { bias: -0.0004, normalBias: 0.04, far: 160 });
    buildFlow(); timeline(); fit(); info(); applyLayers(); applyExplode(); V.dirty = true;
  }
  // correnti: punti luminosi con scia (additivi, HDR per il bloom), colore ∝ intensità
  let flow = null, flowSlots = [];
  function buildFlow() {
    flowSlots = []; const lay = built.lay; let total = 0;
    lay.traces.forEach(t => { const Lt = t.segs.reduce((s, q) => s + Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]), 0); t.Lt = Lt; t.nP = Math.max(1, Math.min(lite ? 6 : 12, Math.floor(Lt / 1.4))); t.ph = 0; total += t.nP; });
    total = Math.min(total, lite ? 300 : 900); let k = 0; lay.traces.forEach(t => { for (let i = 0; i < t.nP && k < total; i++, k++) flowSlots.push({ t, i }); });
    const TL = lite ? 1 : 3, n = Math.max(1, flowSlots.length * TL), pos = new Float32Array(n * 3), col = new Float32Array(n * 3), sz = new Float32Array(n), geo = track(new THREE.BufferGeometry());
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute("size", new THREE.BufferAttribute(sz, 1).setUsage(THREE.DynamicDrawUsage));
    const m = track(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, toneMapped: false, uniforms: { k: { value: 1 } },
      vertexShader: "attribute float size; uniform float k; varying vec3 vC; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = clamp(size * k / -mv.z, 0.0, 28.0); gl_Position = projectionMatrix * mv; }",
      fragmentShader: "varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); a = a * a; gl_FragColor = vec4(vC * a, a); }" }));
    const pts = new THREE.Points(geo, m); pts.frustumCulled = false; G.flow.add(pts); flow = { pts, pos, col, sz, TL };
  }
  function timeline() {
    const bench = env.bench(); let tl = null; try { tl = bench.timeline(null, lite ? 90 : 120); } catch (e) { tl = null; }
    if (!tl || !tl.ok || !tl.t.length) { const B = bench.state; tl = { ok: true, tEnd: 1, t: [0, 1], ms: [B.res && B.res.comps || {}, B.res && B.res.comps || {}], flows: [B.flows || [], B.flows || []] }; }
    // temperature: risposta del primo ordine a P(t) per ogni componente
    const T = {}; built.comps.forEach(ci => { const id = ci.c.id, R = PKG_RTH[ci.c.t] || 100, tau = PKG_TAU[ci.c.t] || 10; let Tc = 25; T[id] = tl.t.map((tt, k) => { const m = tl.ms[k][id] || {}, P = Math.abs(m.P != null ? m.P : (m.V || 0) * (m.I || 0)), dt = k ? tt - tl.t[k - 1] : 0, Tss = 25 + P * R; Tc += (Tss - Tc) * (1 - Math.exp(-dt * 8 / tau)); return Tc; }); });
    tl.T = T; V.tl = tl; V.k = 0; const sl = $("#p3T"); sl.max = String(tl.t.length - 1); sl.value = "0";
  }
  const tmpC = new THREE.Color(), cLo = new THREE.Color(0.2, 0.7, 2.2), cHi = new THREE.Color(2.6, 2.2, 1.0);
  function drawHeat(k) {
    const h = built.heat, c = h.c, g = c.getContext("2d"), w = c.width, hh = c.height, sx = w / built.W, sy = hh / built.H; g.globalCompositeOperation = "source-over"; g.fillStyle = "#000"; g.fillRect(0, 0, w, hh); g.globalCompositeOperation = "lighter";
    built.lay.traces.forEach(t => { const A = t.wmm / 0.0254 * 1.378 * built.Bd.oz, dT = Math.pow(Math.abs(t.f || 0) / (0.048 * Math.pow(A, 0.725)), 1 / 0.44), a = Math.min(1, dT / 100); if (a < 0.01) return; g.strokeStyle = "rgba(255,255,255," + a.toFixed(3) + ")"; g.lineWidth = Math.max(2, t.wmm / U * sx * 3); g.lineCap = "round"; g.beginPath(); g.moveTo((t.w.a[0] - h.x0) * sx, (t.w.a[1] - h.y0) * sy); g.lineTo((t.w.b[0] - h.x0) * sx, (t.w.a[1] - h.y0) * sy); g.lineTo((t.w.b[0] - h.x0) * sx, (t.w.b[1] - h.y0) * sy); g.stroke(); });
    built.comps.forEach(ci => { const a = Math.min(1, Math.max(0, ((ci.T || 25) - 25) / 100)); if (a < 0.01) return; const p0 = CIR.pinPos(ci.c), x = p0.reduce((s, p) => s + p.x, 0) / p0.length, y = p0.reduce((s, p) => s + p.y, 0) / p0.length, r = (2.5 + 5 * a) * sx, gr = g.createRadialGradient((x - h.x0) * sx, (y - h.y0) * sy, 0, (x - h.x0) * sx, (y - h.y0) * sy, r); gr.addColorStop(0, "rgba(255,255,255," + a.toFixed(3) + ")"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, hh); });
    const im = g.getImageData(0, 0, w, hh), d = im.data; for (let i = 0; i < d.length; i += 4) { const v = Math.min(1, d[i] / 255); const r = Math.min(1, v * 3), gg = Math.max(0, Math.min(1, v * 3 - 1)), b = v < 0.33 ? 0.35 + v * 1.5 : Math.max(0, 1 - (v - 0.33) * 2) * 0.85 + Math.max(0, v - 0.8) * 4; d[i] = r * 255; d[i + 1] = gg * 255; d[i + 2] = Math.min(1, v < 0.02 ? 0.25 : b) * 255; d[i + 3] = 255 * (0.35 + 0.65 * Math.min(1, v * 4)); }
    g.globalCompositeOperation = "source-over"; g.putImageData(im, 0, 0); h.tex.needsUpdate = true; void k;
  }
  function setFrame(k) {
    if (!built || !V.tl) return; const tl = V.tl; k = Math.max(0, Math.min(tl.t.length - 1, k | 0)); V.k = k; const ms = tl.ms[k] || {}, fl = tl.flows[k] || []; V.dirty = true;
    $("#p3Tl").textContent = "t = " + CIR.fx(tl.t[k], 2) + " s"; const sl = $("#p3T"); if (+sl.value !== k) sl.value = String(k);
    const heatOn = V.mode === "heat";
    built.comps.forEach(ci => { const m = ms[ci.c.id] || {}, Tc = tl.T[ci.c.id] ? tl.T[ci.c.id][k] : 25; ci.T = Tc; ci.m = m;
      if (ci.glow) { const lum = ci.dead ? 0 : Math.max(0, Math.min(1.4, m.lum || 0)); ci.glow.m.emissiveIntensity = lum * (ci.glow.lamp ? 2.2 : 1.1); if (ci.glow.die) ci.glow.die.emissiveIntensity = lum * (ci.glow.lamp ? 30 : 45); if (ci.glow.spr) ci.glow.spr.material.opacity = Math.min(1, lum * 0.9); }
      ci.leds.forEach(o => { o.material.emissiveIntensity = (Math.abs(m.I || 0) > 1e-4 || Math.abs(m.V || 0) > 0.5 || Math.abs(m.P || 0) > 1e-4) ? 8 : 0; });
      ci.body.forEach((b, i) => { const base = ci.base[i]; if (!b.material.color || !base.col) return; const want = heatOn ? null : base.map; if (b.material.map !== want) { b.material.map = want; b.material.needsUpdate = true; }
        if (heatOn) { b.material.color.copy(heatCol(Tc)); if (b.material.emissive && !ci.glow) b.material.emissive.copy(heatCol(Tc)).multiplyScalar(0.35); } else { b.material.color.copy(ci.dead ? new THREE.Color(0x241a14) : base.col); if (b.material.emissive && !ci.glow) b.material.emissive.set(0x000000); } }); });
    built.lay.traces.forEach(t => { t.f = fl[t.i] || 0; if (t.mesh) t.mesh.forEach(m => { if (heatOn) { const A = t.wmm / 0.0254 * 1.378 * built.Bd.oz, dT = Math.pow(Math.abs(t.f) / (0.048 * Math.pow(A, 0.725)), 1 / 0.44); m.material = heatMat(25 + Math.min(120, dT)); } else m.material = MAT0.cu; }); });
    built.heat.mesh.visible = heatOn; if (heatOn) drawHeat(k);
    selInfo();
  }
  const hm = {}; function heatMat(Tt) { const k = Math.round(Tt / 5) * 5; if (!hm[k]) hm[k] = new THREE.MeshStandardMaterial({ color: heatCol(k), emissive: heatCol(k), emissiveIntensity: 0.3, roughness: 0.5 }); return hm[k]; }
  function stepFlow(dt) {
    if (!flow || !built) return; const th = built.th, show = V.lay.flow && V.mode !== "heat", TL = flow.TL;
    built.lay.traces.forEach(t => { const a = Math.abs(t.f || 0); t.ph = (t.ph + (a > 2e-4 ? Math.sign(t.f) * dt * (0.25 + 0.35 * Math.log10(1 + a * 1000)) : 0) + 10) % 1; });
    flowSlots.forEach((s, k) => { const t = s.t, a = Math.abs(t.f || 0), on = show && a > 2e-4, I = Math.min(1, Math.log10(1 + a * 1000) / 3.5); tmpC.copy(cLo).lerp(cHi, I);
      for (let j = 0; j < TL; j++) { let d = ((((s.i + t.ph) / t.nP) - j * 0.012 * Math.sign(t.f || 1)) % 1 + 1) % 1 * t.Lt, x = t.w.a[0], z = t.w.a[1]; for (const q of t.segs) { const l = Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]); if (d <= l) { x = q[0][0] + (q[1][0] - q[0][0]) * (l ? d / l : 0); z = q[0][1] + (q[1][1] - q[0][1]) * (l ? d / l : 0); break; } d -= l; }
        const o = (k * TL + j) * 3, f = 1 - j / TL; flow.pos[o] = x; flow.pos[o + 1] = t.layer === "bot" ? -th - 0.25 : 0.25; flow.pos[o + 2] = z; flow.col[o] = tmpC.r * f; flow.col[o + 1] = tmpC.g * f; flow.col[o + 2] = tmpC.b * f; flow.sz[k * TL + j] = on ? (0.55 + 0.45 * I) * f * 9 : 0; } });
    const g = flow.pts.geometry; g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = g.attributes.size.needsUpdate = true; flow.pts.material.uniforms.k.value = renderer.getDrawingBufferSize(new THREE.Vector2()).y / 2 / Math.tan(camera.fov * Math.PI / 360) * 0.03;
  }
  function applyLayers() { const L2 = V.lay; G.fr4.visible = L2.fr4; G.top.visible = L2.top; G.bot.visible = L2.bot; G.mask.visible = L2.mask; G.maskB.visible = L2.mask; G.silk.visible = L2.silk; G.comp.visible = L2.comp; G.sol.visible = L2.sol; G.via.visible = L2.via; G.flow.visible = L2.flow; V.dirty = true; if (cs) cs.dirty = true; }
  function applyExplode() { const e = V.explode * 9; G.bot.position.y = -e * 0.9; G.maskB.position.y = -e * 1.4; G.via.position.y = 0; G.top.position.y = e * 0.5; G.mask.position.y = e * 1.0; G.silk.position.y = e * 1.4; G.sol.position.y = e * 0.5 + e * 0.35; G.comp.position.y = e * 2.6; G.flow.position.y = 0; G.fx.position.y = e * 1.4; $("#p3Ev").textContent = Math.round(V.explode * 100) + "%"; if (built) { mat.position.y = -built.th - 0.06 - e * 1.7; if (cs) cs.set({ y: -built.th - 0.05 - e * 1.7 }); } V.dirty = true; }
  function fit(top) { if (!built) return; root.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(G.fr4); if (V.lay.comp) { const cb = new THREE.Box3().setFromObject(G.comp), s0 = bb.getSize(new THREE.Vector3()), e = Math.max(s0.x, s0.z) * 0.12; cb.min.max(new THREE.Vector3(bb.min.x - e, bb.min.y - e, bb.min.z - e)); cb.max.min(new THREE.Vector3(bb.max.x + e, bb.max.y + Math.max(s0.x, s0.z) * 0.35, bb.max.z + e)); if (!cb.isEmpty()) bb.union(cb); } const c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3()); const a = Math.max(0.3, camera.aspect || 1), fv = Math.tan(camera.fov * Math.PI / 360), d = Math.max(sz.z / (2 * fv), sz.x / (2 * fv * a), sz.y * 0.8 / (2 * fv)) * 1.28 + 4; controls.target.set(c.x, Math.min(2, c.y * 0.3), c.z); if (top) camera.position.set(c.x + 0.001, d, c.z + 0.01); else camera.position.set(c.x + d * 0.12, d * 0.74, c.z + d * 0.66); controls.update(); V.dirty = true; }
  function info() {
    if (!built) return; const c = built.counts, B = env.bench().state, res = B.res, errs = res && res.ok ? res.issues.filter(i => i.sev === "err") : [];
    const lines = [`<div class="kv"><div><small>Scheda</small><b>${esc(built.Bd.L + " strati · " + CIR.fx(built.Bd.th, 1) + " mm · " + built.Bd.oz + " oz · " + built.Bd.fin.toUpperCase())}</b></div><div><small>Misure</small><b>${CIR.fx(built.W * U, 0)} × ${CIR.fx(built.H * U, 0)} mm</b></div><div><small>Piste</small><b>${built.lay.traces.filter(t => t.layer === "top").length} sopra · ${built.lay.traces.filter(t => t.layer === "bot").length} sotto</b></div><div><small>Vias</small><b>${built.lay.vias.length}</b></div><div><small>Giunti</small><b>${c.ok} ok · ${c.cold} freddi · ${c.bridge} ponti</b></div><div><small>Da saldare</small><b>${c.none}</b></div></div>`];
    if (!built.sold) lines.push(`<p class="note">La scheda non è ancora saldata: i piedini attraversano i fori senza stagno. Vai su <b>Saldatura</b>, salda i giunti e premi "Applica alla scheda": qui vedrai la forma reale di ogni giunto (lucido a vulcano, freddo opaco, ponte).</p>`);
    (built.lay.drc.concat(errs.slice(0, 3).map(i => ({ sev: "err", t: i.t, why: i.why, fix: i.fix })))).forEach(d => lines.push(`<div class="sp-warn"><p>${d.sev === "err" ? "⛔" : "⚠️"} <b>${esc(d.t)}</b><br>${esc(d.why)} ${d.fix ? "→ " + esc(d.fix) : ""}</p></div>`));
    lines.push(`<p class="note">4ª dimensione: la linea del tempo usa la simulazione nel tempo della Tavola (${CIR.fx(V.tl ? V.tl.tEnd : 0, 1)} s). I puntini scorrono nel verso convenzionale della corrente (velocità ∝ log I); la vista termica stima T = 25 °C + P·Rth con l'inerzia termica del contenitore. Tocca un componente per i valori.</p>`);
    $("#p3Info").innerHTML = lines.join("");
  }
  function selInfo() {
    const box2 = $("#p3Sel"); if (!V.sel || !built) { box2.innerHTML = ""; return; } const ci = built.comps.find(x => x.c.id === V.sel); if (!ci) { box2.innerHTML = ""; return; } const m = ci.m || {};
    box2.innerHTML = `<div class="sp-last"><b>${esc(ci.c.id)} · ${esc(CIR.TYPES[ci.c.t].n)}</b><br>V = ${CIR.fx(m.V || 0, 2)} V · I = ${CIR.si(Math.abs(m.I || 0), "A")} · P = ${CIR.si(Math.abs(m.P != null ? m.P : (m.V || 0) * (m.I || 0)), "W")} · T ≈ ${Math.round(ci.T || 25)} °C${ci.dead ? " · <b>bruciato</b>" : ""}</div>`;
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let down = null;
  canvas.addEventListener("pointerdown", e => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener("pointerup", e => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6 || !built) return; const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera); const h = ray.intersectObjects(G.comp.children, true)[0]; let o = h && h.object; while (o && !o.userData.comp) o = o.parent; V.sel = o ? o.userData.comp : null; selInfo(); });
  el.addEventListener("click", e => { const b = e.target.closest("[data-p3],[data-p3m]"); if (!b) return; const m = b.getAttribute("data-p3m"); if (m) { V.mode = m; el.querySelectorAll("[data-p3m]").forEach(x => x.classList.toggle("on", x === b)); if (m === "flow") { V.lay.flow = true; } setFrame(V.k); hint(); return; }
    const k = b.getAttribute("data-p3"); if (k === "fit") fit(); else if (k === "top") fit(true); else if (k === "play") { V.play = !V.play; b.textContent = V.play ? "❚❚" : "▶"; } });
  el.addEventListener("input", e => { const t = e.target; if (t.id === "p3T") { V.play = false; el.querySelector('[data-p3="play"]').textContent = "▶"; setFrame(+t.value); } else if (t.id === "p3E") { V.explode = +t.value; applyExplode(); } });
  el.addEventListener("change", e => { const t = e.target; if (t.id === "p3Spd") V.spd = +t.value; const ly = t.getAttribute && t.getAttribute("data-lay"); if (ly) { V.lay[ly] = t.checked; t.parentElement.classList.toggle("on", t.checked); applyLayers(); } });
  function hint() { $("#p3Hint").textContent = V.mode === "heat" ? "Vista termica: blu 25 °C → rosso ≥ 125 °C" : V.mode === "flow" ? "Correnti: i puntini seguono la corrente nelle piste" : "Un dito ruota · due dita zoom e spostamento"; }
  el.addEventListener("change", e => { const t = e.target; if (t.getAttribute && t.getAttribute("data-gfx") === "q") GFX.setSetting(t.value); });
  function resize() { const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight); camera.aspect = w / h; camera.updateProjectionMatrix(); pipe.setSize(w, h); V.dirty = true; }
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null; if (ro) ro.observe(stage);
  let raf = 0, last = 0, acc = 0;
  function frame(dt, force) {
    if (controls.update()) V.dirty = true;
    if (V.play && V.tl && V.tl.t.length > 1) { acc += dt * V.spd; const step = V.tl.tEnd / (V.tl.t.length - 1); while (acc >= step) { acc -= step; setFrame((V.k + 1) % V.tl.t.length); } }
    let anim = false; if (built) { built.comps.forEach(ci => { if (!ci.spin || !ci.m || ci.dead) return; const m = ci.m; let w = 0; if (ci.c.t === "MOTOR") w = (m.rpm || 0) / 60 * 2 * Math.PI * 0.05; else if (ci.c.t === "STEPDRV") w = m.Vm > 5 && m.Vdd > 2.5 ? 2 : 0; else if (ci.c.t === "SERVO") w = Math.abs(m.I || 0) > 0.02 ? 1.5 : 0; if (rm) w = 0; if (w) anim = true; ci.spin.o.rotation[ci.spin.ax] += w * dt; }); if (V.lay.flow && V.mode !== "heat" && flowSlots.length) anim = true; stepFlow(rm ? 0 : dt); }
    if (!force && !anim && !V.dirty && !V.play) return; V.dirty = false;
    if (cs) cs.update(); pipe.setFocus(camera.position.distanceTo(controls.target));
    const t0 = performance.now(); pipe.render(dt); V.ms = performance.now() - t0;
  }
  function tick(ts) { raf = 0; if (!V.run) return; const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts; gov.tick(dt); frame(dt); raf = requestAnimationFrame(tick); }
  resize(); hint();
  return {
    resume() { V.run = true; resize(); build(); setFrame(0); last = 0; if (!raf) raf = requestAnimationFrame(tick); },
    pause() { V.run = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    rebuild() { build(); setFrame(V.k); },
    ctx() { if (!built) return { empty: true }; const hot = built.comps.slice().sort((a, b) => (b.T || 0) - (a.T || 0))[0]; return { board: built.Bd.L + " strati " + built.Bd.fin.toUpperCase(), size: CIR.fx(built.W * U, 0) + "×" + CIR.fx(built.H * U, 0) + " mm", joints: built.counts, sold: built.sold, drc: built.lay.drc.map(d => d.t), vias: built.lay.vias.length, bottom: built.lay.traces.filter(t => t.layer === "bot").length, t: V.tl ? V.tl.t[V.k] : 0, mode: V.mode, hot: hot ? hot.c.id + " " + Math.round(hot.T || 25) + " °C" : "" }; },
    test: { V, setFrame, frame(n) { for (let i = 0; i < (n || 1); i++) frame(0.05, true); }, mode(m) { const b = el.querySelector(`[data-p3m="${m}"]`); if (b) b.click(); }, explode(v) { V.explode = v; applyExplode(); }, layer(k, on) { V.lay[k] = on; applyLayers(); }, built: () => built, render() { frame(0.016, true); },
      gfx: () => ({ tier: T.id, passes: pipe.passes.slice(), ms: V.ms, contact: !!cs, shadow: renderer.shadowMap.enabled, dpr: renderer.getPixelRatio() }), stats: () => GFX.pixelStats(renderer), setTier(id) { GFX.setSetting(id); } },
    dispose() { this.pause(); offGfx(); if (ro) ro.disconnect(); clear(); if (cs) cs.dispose(); pipe.dispose(); GFX.disposeEnv(renderer); renderer.dispose(); }
  };
}
