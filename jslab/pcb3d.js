// Braccio Lab · Vista PCB 3D/4D: la scheda composta sulla Tavola da lavoro diventa un modello 3D (FR-4, rame sopra/sotto,
// piazzole e fori metallizzati, vias, solder mask, serigrafia, componenti, giunti di saldatura) e la 4ª dimensione è il tempo:
// correnti animate lungo le piste dalla simulazione nel tempo, LED che si accendono, vista termica, linea del tempo.
import * as THREE from "../vendor/three.module.min.js";
import { OrbitControls, RoomEnvironment } from "../vendor/three-addons.min.js";

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
  const CIR = env.CIR, esc = env.esc, rm = !!env.reduced, test = !!env.testMode, lite = test || window.innerWidth < 760, SEG = lite ? 12 : 24;
  const V = { mode: "normal", explode: 0, lay: { fr4: true, top: true, bot: true, mask: true, silk: true, comp: true, sol: true, via: true, flow: true }, play: !rm, k: 0, tl: null, spd: 1, sel: null, run: false, t: 0 };
  el.innerHTML = `<div class="p3"><div class="sp-stage p3-stage" id="p3Stage"><canvas id="p3Cv" aria-label="Scheda in 3D"></canvas>
    <div class="sp-top"><div class="lab-seg p3-mode">${[["normal", "Reale"], ["flow", "Correnti"], ["heat", "Termica"]].map(([k, n]) => `<button type="button" data-p3m="${k}"${k === "normal" ? ' class="on"' : ""}>${n}</button>`).join("")}</div><button type="button" class="btn sm ghost" data-p3="fit">Inquadra</button><button type="button" class="btn sm ghost" data-p3="top">Dall'alto</button></div>
    <div class="sp-hint" id="p3Hint"></div>
    <div class="p3-tl"><button type="button" class="btn sm" data-p3="play" aria-label="Avvia o ferma il tempo">${V.play ? "❚❚" : "▶"}</button><input type="range" id="p3T" min="0" max="119" value="0" aria-label="Linea del tempo"><span id="p3Tl">t = 0 s</span><select id="p3Spd" aria-label="Velocità"><option value="0.25">×0,25</option><option value="1" selected>×1</option><option value="4">×4</option></select></div></div>
    <div class="card p3-panel"><div class="p3-row"><label class="lb-f"><span>Vista esplosa <b id="p3Ev">0%</b></span><input type="range" id="p3E" min="0" max="1" step="0.01" value="0"></label></div>
      <div class="p3-lay">${[["fr4", "Substrato"], ["top", "Rame sopra"], ["bot", "Rame sotto"], ["mask", "Solder mask"], ["silk", "Serigrafia"], ["comp", "Componenti"], ["sol", "Saldature"], ["via", "Fori e vias"], ["flow", "Flusso di corrente"]].map(([k, n]) => `<label class="chip tog on"><input type="checkbox" data-lay="${k}" checked> ${n}</label>`).join("")}</div>
      <div id="p3Info"></div><div id="p3Sel"></div></div></div>`;
  const $ = s => el.querySelector(s), canvas = $("#p3Cv"), stage = $("#p3Stage");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, preserveDrawingBuffer: test, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, test ? 1 : lite ? 1.5 : 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x101318);
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000); camera.position.set(0, 40, 40);
  const controls = new OrbitControls(camera, canvas); controls.enableDamping = !rm; controls.dampingFactor = 0.08; controls.screenSpacePanning = true; controls.minDistance = 3; controls.maxDistance = 400;
  scene.add(new THREE.HemisphereLight(0xe8f0ff, 0x202428, 1.0)); const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(20, 40, 25); scene.add(key); const rim = new THREE.DirectionalLight(0x9fc4ff, 0.6); rim.position.set(-30, 15, -20); scene.add(rim);
  const root = new THREE.Group(); scene.add(root);
  const G = {}; ["bot", "fr4", "top", "via", "mask", "maskB", "silk", "sol", "comp", "flow"].forEach(k => { G[k] = new THREE.Group(); root.add(G[k]); });
  let built = null, disposables = [];
  function track(x) { disposables.push(x); return x; }
  function clear() { Object.values(G).forEach(g => { while (g.children.length) g.remove(g.children[0]); }); disposables.forEach(d => d.dispose && d.dispose()); disposables = []; }
  const MAT = {
    cu: new THREE.MeshStandardMaterial({ color: 0xd88a4a, metalness: 1, roughness: 0.3 }),
    hasl: new THREE.MeshStandardMaterial({ color: 0xd2d6da, metalness: 1, roughness: 0.22 }),
    enig: new THREE.MeshStandardMaterial({ color: 0xe6b84e, metalness: 1, roughness: 0.2 }),
    solder: new THREE.MeshStandardMaterial({ color: 0xdfe3e8, metalness: 1, roughness: 0.12 }),
    cold: new THREE.MeshStandardMaterial({ color: 0x8e9196, metalness: 0.6, roughness: 0.8 }),
    burnt: new THREE.MeshStandardMaterial({ color: 0x2a1a10, metalness: 0.1, roughness: 0.95 }),
    hole: new THREE.MeshBasicMaterial({ color: 0x050505 }),
    lead: new THREE.MeshStandardMaterial({ color: 0xc9cdd2, metalness: 1, roughness: 0.3 }),
    epoxy: new THREE.MeshStandardMaterial({ color: 0x1b1c1f, metalness: 0.1, roughness: 0.55 }),
    tab: new THREE.MeshStandardMaterial({ color: 0xbfc4c9, metalness: 1, roughness: 0.28 }),
    flow: new THREE.MeshBasicMaterial({ color: 0xfff1a8 })
  };
  function mesh(geo, mat, parent) { const m = new THREE.Mesh(track(geo), mat); (parent || root).add(m); return m; }
  function own(mat) { return track(mat.clone()); }
  function canvasTex(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); draw(g); const t = track(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
  function cyl(r1, r2, h, mat, parent, seg) { return mesh(new THREE.CylinderGeometry(r1, r2, h, seg || SEG), mat, parent); }
  function box(w, h, d, mat, parent) { return mesh(new THREE.BoxGeometry(w, h, d), mat, parent); }
  /* ---------- componenti 3D (coordinate locali in passi di griglia: piedino 0 all'origine, asse x verso il piedino 1) ---------- */
  function lead(g, x0, x1, hgt) { const v = cyl(0.11, 0.11, hgt, MAT.lead, g, 6); v.position.set(x0, hgt / 2, 0); if (x1 !== x0) { const h = cyl(0.11, 0.11, Math.abs(x1 - x0), MAT.lead, g, 6); h.rotation.z = Math.PI / 2; h.position.set((x0 + x1) / 2, hgt, 0); } }
  function label3(g, text, x, y, z, w, col) { const t = canvasTex(256, 64, c => { c.fillStyle = col || "#f1f1f1"; c.font = "600 34px Inter, system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, 128, 34); }); const m = mesh(new THREE.PlaneGeometry(w, w / 4), track(new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })), g); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); return m; }
  function axial(g, len, r, mat, x0) { const b = cyl(r, r, len, mat, g); b.rotation.z = Math.PI / 2; b.position.set(x0 + len / 2, 0.7, 0); return b; }
  function buildComp(c, p, info) {
    const g = new THREE.Group(), t = c.t; info.body = []; info.glow = null; info.spin = null;
    const body = (m) => { info.body.push(m); return m; };
    switch (t) {
      case "R": { lead(g, 0, 0.9, 0.7); lead(g, 4, 3.1, 0.7); const bm = own(new THREE.MeshStandardMaterial({ color: 0xd9c39a, roughness: 0.6 })); const b = body(axial(g, 2.2, 0.45, bm, 0.9)); const bd = CIR.bands(p.R, p.tol); [1.25, 1.6, 1.95, 2.65].forEach((x, i) => { const r = cyl(0.47, 0.47, 0.16, track(new THREE.MeshStandardMaterial({ color: bd[i].h, roughness: 0.5 })), g); r.rotation.z = Math.PI / 2; r.position.set(x, 0.7, 0); }); break; }
      case "POT": { [0, 2, 4].forEach(x => lead(g, x, x, 0.5)); body(box(4.6, 2.2, 2.2, own(new THREE.MeshStandardMaterial({ color: 0x1d5fa8, roughness: 0.5 })), g)).position.set(2, 1.6, -1.4); const k = cyl(0.8, 0.8, 1.2, MAT.tab, g); k.position.set(2, 3.2, -1.4); break; }
      case "LED": { const col = new THREE.Color((CIR.LED_COL[p.color] || CIR.LED_COL.rosso).h); lead(g, 0, 1.6, 1.2); lead(g, 4, 2.4, 1.2); const m = own(new THREE.MeshPhysicalMaterial({ color: col, transmission: 0.2, roughness: 0.15, emissive: col, emissiveIntensity: 0, transparent: true, opacity: 0.85 })); const base = body(cyl(1.0, 1.0, 2.6, m, g)); base.position.set(2, 2.5, 0); const dome = body(mesh(new THREE.SphereGeometry(1.0, SEG, SEG / 2, 0, Math.PI * 2, 0, Math.PI / 2), m, g)); dome.position.set(2, 3.8, 0); const rim2 = cyl(1.12, 1.12, 0.25, m, g); rim2.position.set(2, 1.3, 0);
        const spr = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: glowTex(), color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }))); spr.scale.set(7, 7, 1); spr.position.set(2, 3.6, 0); g.add(spr); info.glow = { m, spr }; break; }
      case "D": { lead(g, 0, 1.1, 0.6); lead(g, 4, 2.9, 0.6); body(axial(g, 1.8, 0.4, own(MAT.epoxy), 1.1)); const s = cyl(0.42, 0.42, 0.25, MAT.tab, g); s.rotation.z = Math.PI / 2; s.position.set(2.55, 0.6, 0); break; }
      case "C": { if (p.pol !== false) { const r = Math.max(0.9, Math.min(3.2, 0.9 + Math.log10(p.C * 1e6 + 1) * 0.55)), h = 1.8 + r * 1.6; lead(g, 0, 0.6, 0.3); lead(g, 4, 3.4, 0.3); const m = own(new THREE.MeshStandardMaterial({ color: 0x1f3f8a, roughness: 0.35 })); const b = body(cyl(r, r, h, m, g)); b.position.set(2, 0.3 + h / 2, 0); const top = cyl(r * 0.98, r * 0.98, 0.06, MAT.tab, g); top.position.set(2, 0.3 + h + 0.02, 0); const st = box(0.5, h * 0.98, 0.1, track(new THREE.MeshStandardMaterial({ color: 0xc9d3e6 })), g); st.position.set(2 + r * 0.7, 0.3 + h / 2, r * 0.72); st.rotation.y = -Math.PI / 4; }
        else { lead(g, 0, 1.5, 1.2); lead(g, 4, 2.5, 1.2); const d = body(cyl(1.1, 1.1, 0.5, own(new THREE.MeshStandardMaterial({ color: 0xd98b2a, roughness: 0.6 })), g)); d.rotation.x = Math.PI / 2; d.position.set(2, 1.9, 0); } break; }
      case "L": { lead(g, 0, 1, 0.8); lead(g, 4, 3, 0.8); body(axial(g, 2, 0.55, own(new THREE.MeshStandardMaterial({ color: 0x3d7a4a, roughness: 0.5 })), 1)); break; }
      case "LDR": case "NTC": { lead(g, 0, 1.6, 1.4); lead(g, 4, 2.4, 1.4); const d = body(cyl(0.8, 0.8, 0.4, own(new THREE.MeshStandardMaterial({ color: t === "LDR" ? 0xcc6633 : 0x2c4c8a })), g)); d.rotation.x = Math.PI / 2; d.position.set(2, 2.2, 0); break; }
      case "FUSE": { lead(g, 0, 0.8, 0.9); lead(g, 4, 3.2, 0.9); const gl = axial(g, 2.4, 0.5, track(new THREE.MeshPhysicalMaterial({ color: 0xdfefff, transmission: 0.9, roughness: 0.05, transparent: true, opacity: 0.45 })), 0.8); body(gl); [0.95, 3.05].forEach(x => { const e = cyl(0.53, 0.53, 0.3, MAT.tab, g); e.rotation.z = Math.PI / 2; e.position.set(x, 0.9, 0); }); break; }
      case "LAMP": { lead(g, 0, 1.6, 1.0); lead(g, 4, 2.4, 1.0); const m = own(new THREE.MeshPhysicalMaterial({ color: 0xfff4d0, emissive: 0xffcc66, emissiveIntensity: 0, transmission: 0.6, transparent: true, opacity: 0.7, roughness: 0.05 })); const b = body(mesh(new THREE.SphereGeometry(1.4, SEG, SEG), m, g)); b.position.set(2, 2.6, 0); info.glow = { m, spr: null, lamp: true }; break; }
      case "SW": case "BTN": { [0, 4].forEach(x => lead(g, x, x, 0.4)); body(box(3.2, 1.4, 2.4, own(new THREE.MeshStandardMaterial({ color: 0x2b2f36 })), g)).position.set(2, 0.9, 0); const k = t === "BTN" ? cyl(0.7, 0.7, 0.8, MAT.epoxy, g) : box(0.9, 0.9, 0.6, track(new THREE.MeshStandardMaterial({ color: p.on ? 0x3ddc84 : 0xff5a5f })), g); k.position.set(t === "SW" ? (p.on ? 2.6 : 1.4) : 2, t === "BTN" ? (p.on ? 1.7 : 2.0) : 1.9, 0); break; }
      case "V": case "BAT": case "MAINS": case "I": case "ACDRIVE": case "MOTOR": {
        // morsettiera a vite 5,08 mm per i collegamenti esterni
        const col = t === "MAINS" || t === "ACDRIVE" ? 0x2a62c9 : 0x1f9a4a, m = own(new THREE.MeshStandardMaterial({ color: col, roughness: 0.55 }));
        const tb = body(box(5.6, 2.6, 2.8, m, g)); tb.position.set(2, 1.3, -0.3); [0, 4].forEach(x => { const s = cyl(0.55, 0.55, 0.3, MAT.tab, g); s.position.set(x, 2.66, -0.3); const sl = box(0.9, 0.08, 0.16, MAT.epoxy, g); sl.position.set(x, 2.83, -0.3); lead(g, x, x, 0.3); });
        if (t === "MOTOR") { const mm = own(new THREE.MeshStandardMaterial({ color: 0xb9bfc6, metalness: 0.8, roughness: 0.35 })); const mo = body(cyl(2.2, 2.2, 5, mm, g)); mo.rotation.x = Math.PI / 2; mo.position.set(2, 2.4, -6.5); const sh = new THREE.Group(); sh.position.set(2, 2.4, -9.2); g.add(sh); const s1 = cyl(0.2, 0.2, 1.2, MAT.tab, sh); s1.rotation.x = Math.PI / 2; const fl = box(2.2, 0.25, 0.25, track(new THREE.MeshStandardMaterial({ color: 0xff7a2f })), sh); fl.position.z = -0.5; info.spin = { o: sh, ax: "z" }; cableTo(g, [0, 2.7, -1.6], [2, 2.4, -4]); cableTo(g, [4, 2.7, -1.6], [2, 2.4, -4]); }
        if (t === "ACDRIVE") { const d = body(box(5, 8, 7, own(new THREE.MeshStandardMaterial({ color: 0x23272c, metalness: 0.4, roughness: 0.4 })), g)); d.position.set(2, 4, -8.5); info.spin = null; }
        if (t === "BAT") { const bt = body(box(5.6, 2.6, 8.2, own(new THREE.MeshStandardMaterial({ color: /li/.test(p.kind) ? 0x2f5fb0 : 0x1c1c1c })), g)); bt.position.set(2, 1.3, -7); }
        label3(g, t === "V" ? "PWR " + CIR.fx(p.V || 5, 1) + "V" : t === "MAINS" ? "230V~" : t === "BAT" ? "BATT" : t === "MOTOR" ? "MOT" : t === "ACDRIVE" ? "AC DRIVE" : "I", 2, 2.9, 1.0, 4.5, "#ffffff"); break; }
      case "GND": { const tp = cyl(0.35, 0.35, 1.4, track(new THREE.MeshStandardMaterial({ color: 0x111111 })), g); tp.position.set(0, 0.7, 0); const lp = mesh(new THREE.TorusGeometry(0.35, 0.08, 6, 12), MAT.lead, g); lp.position.set(0, 1.6, 0); break; }
      case "NPN": case "NMOS": case "REG": {
        const big = t === "REG" || (t === "NMOS" && /IRL|IRF/.test(p.kind)) || (t === "NPN" && /TIP|BD/.test(p.kind));
        [0, 2, 4].forEach(x => { lead(g, x, x, big ? 1.6 : 1.4); });
        if (big) { const b = body(box(4, 3.6, 1.8, own(MAT.epoxy), g)); b.position.set(2, 3.4, -0.6); const tab = box(4, 5.2, 0.5, MAT.tab, g); tab.position.set(2, 4.2, -1.65); const hole = cyl(0.6, 0.6, 0.6, MAT.hole, g); hole.rotation.x = Math.PI / 2; hole.position.set(2, 5.6, -1.65); }
        else { const b = body(mesh(new THREE.CylinderGeometry(1.0, 1.0, 2.0, SEG, 1, false, 0, Math.PI), own(MAT.epoxy), g)); b.position.set(2, 2.4, 0); b.rotation.y = Math.PI; const fl = box(2.0, 2.0, 0.05, own(MAT.epoxy), g); fl.position.set(2, 2.4, 0); }
        label3(g, p.kind || t, 2, 0.05, 1.6, 4.4); break; }
      case "SERVO": case "STEPDRV": {
        [0, 2, 4].forEach(x => lead(g, x, x, 1.0));
        if (t === "STEPDRV") { const pc = body(box(6, 0.6, 8, own(new THREE.MeshStandardMaterial({ color: /TMC/.test(p.drv) ? 0x1a1a1a : /DRV/.test(p.drv) ? 0x5c2a8c : 0x1f7a3a })), g)); pc.position.set(2, 3.3, -3); const hs = box(3.6, 2, 3.6, track(new THREE.MeshStandardMaterial({ color: 0x8a96a3, metalness: 0.9, roughness: 0.4 })), g); hs.position.set(2, 4.6, -3); for (let i = 0; i < 5; i++) { const fn = box(0.25, 1.4, 3.6, hs.material, g); fn.position.set(0.6 + i * 0.7, 6, -3); }
          const mo = new THREE.Group(); mo.position.set(2, 3.3, -16); g.add(mo); const mm = own(new THREE.MeshStandardMaterial({ color: 0x1b1d20, metalness: 0.4, roughness: 0.4 })); body(box(16.5, 16.5, 16, mm, mo)).position.set(0, 5, 0); const sh = new THREE.Group(); sh.position.set(0, 13.6, 0); mo.add(sh); cyl(0.98, 0.98, 4, MAT.tab, sh).position.y = 0; const flat = box(0.4, 3.6, 1.9, MAT.tab, sh); flat.position.set(0.8, 0, 0); info.spin = { o: sh, ax: "y" }; cableTo(g, [2, 3.6, -7], [2, 6, -8]); label3(g, p.drv || "A4988", 2, 3.7, 0.2, 5); label3(mo, (p.motor || "nema17").toUpperCase(), 0, 13.05, 6, 10); }
        else { const sv = body(box(9, 9.4, 4.8, own(new THREE.MeshStandardMaterial({ color: 0x1f5fd6, roughness: 0.4 })), g)); sv.position.set(2, 4.8, -9); const hr = new THREE.Group(); hr.position.set(4.5, 9.8, -9); g.add(hr); box(7, 0.5, 1.2, track(new THREE.MeshStandardMaterial({ color: 0xf2f2f2 })), hr); info.spin = { o: hr, ax: "y", servo: true }; cableTo(g, [2, 1.2, -1], [2, 3, -6.6]); }
        break; }
      default: { // DIP / moduli multi-piedino (NE555, OPAMP, ULN, L298, MCU, RELAY)
        const fp = CIR.footprint(t), n = fp.pins.length, Lr = Math.ceil(n / 2), h = 2 * (Lr - 1);
        fp.pins.forEach(pp => lead(g, pp.x, pp.x, t === "MCU" || t === "L298" ? 1.8 : 0.9));
        if (t === "MCU") { const col = { uno: 0x1b6e8f, nano: 0x1b5f8f, esp32: 0x202020, stm32: 0x1d4fa3, pico: 0x1f7a3a, teensy: 0x2a6a2a }[p.board] || 0x1b6e8f; const pc = body(box(9, 0.6, h + 6, own(new THREE.MeshStandardMaterial({ color: col, roughness: 0.45 })), g)); pc.position.set(3, 2.2, h / 2); const chip = box(4, 0.7, 4, own(MAT.epoxy), g); chip.position.set(3, 2.8, h / 2); body(chip); [0, 6].forEach(x => { const hd = box(1, 1.6, h + 2, own(MAT.epoxy), g); hd.position.set(x, 1, h / 2); }); const usb = box(3, 1.4, 2.6, MAT.tab, g); usb.position.set(3, 3.2, -1.6); label3(g, (CIR.MCUS[p.board] || {}).name ? (CIR.MCUS[p.board].name.split(" (")[0]) : "MCU", 3, 2.55, h / 2 + 3.4, 7); }
        else if (t === "L298") { const pc = body(box(9, 0.6, h + 6, own(new THREE.MeshStandardMaterial({ color: 0xb3262b })), g)); pc.position.set(3, 2.2, h / 2); const hs = box(5, 5, 2, track(new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.5 })), g); hs.position.set(3, 5, h / 2); body(hs); label3(g, "L298N", 3, 2.55, h / 2 + 2.6, 5); }
        else if (t === "RELAY") { const rb = body(box(7.6, 6, h + 3, own(new THREE.MeshStandardMaterial({ color: 0x2a62c9, roughness: 0.5 })), g)); rb.position.set(3, 3.9, h / 2); label3(g, "SRD-" + (p.Vcoil || 5) + "VDC", 3, 6.95, h / 2, 6.5, "#ffffff"); }
        else { const b = body(box(5.2, 1.4, h + 1.6, own(MAT.epoxy), g)); b.position.set(3, 1.6, h / 2); const notch = cyl(0.35, 0.35, 0.1, MAT.tab, g); notch.position.set(3, 2.31, -0.3); label3(g, t === "NE555" ? "NE555P" : t === "OPAMP" ? (p.kind || "LM358") : t === "ULN" ? "ULN2003A" : t, 3, 2.32, h / 2, 4.2, "#d7d7d7"); }
      }
    }
    return g;
  }
  function cableTo(g, a, b) { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(...a), new THREE.Vector3((a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 1, (a[2] + b[2]) / 2), new THREE.Vector3(...b)]); mesh(new THREE.TubeGeometry(c, 12, 0.22, 6), track(new THREE.MeshStandardMaterial({ color: 0x202020, roughness: 0.7 })), g); }
  let _glow = null; function glowTex() { if (_glow) return _glow; _glow = canvasTex(64, 64, c => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(255,255,255,.5)"); gr.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); }); return _glow; }
  /* ---------- costruzione della scheda ---------- */
  function build() {
    clear(); _glow = null; const bench = env.bench(), B = bench.state, L = B.L, nl = B.nl || (bench.solve(), B.nl);
    if (!L.comps.length) { built = null; $("#p3Info").innerHTML = `<div class="sp-warn"><p>La Tavola è vuota: componi un circuito (o carica un esempio) e torna qui per vederlo in 3D.</p></div>`; return; }
    const lay = layoutPcb(CIR, L, nl, B.board), Bd = lay.B, th = Bd.th / U;
    // ingombro della scheda
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; L.comps.forEach(c => { CIR.pinPos(c).forEach(p => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }); const fb = CIR.footprint(c.t).box; [[fb[0], fb[1]], [fb[2], fb[3]]].forEach(q => { const r = CIR.rot({ x: q[0], y: q[1] }, c.r); x0 = Math.min(x0, c.x + r.x); x1 = Math.max(x1, c.x + r.x); y0 = Math.min(y0, c.y + r.y); y1 = Math.max(y1, c.y + r.y); }); });
    L.wires.forEach(w => [w.a, w.b].forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }));
    x0 -= 3; y0 -= 3; x1 += 3; y1 += 3; const W = x1 - x0, H = y1 - y0, cx = (x0 + x1) / 2, cz = (y0 + y1) / 2;
    root.position.set(-cx, 0, -cz);
    // substrato FR-4 (anima giallo-verde visibile sul bordo)
    const coreCol = Bd.mat === "alu" ? 0xb8bcc2 : Bd.mat === "flex" ? 0xd98c1f : Bd.mat === "rogers" ? 0xe7e0cf : 0xc8b46a;
    const fr = box(W, th, H, track(new THREE.MeshStandardMaterial({ color: coreCol, roughness: 0.8 })), G.fr4); fr.position.set(cx, -th / 2, cz);
    // canvas della solder mask (sopra e sotto) e della serigrafia
    const PX = Math.max(8, Math.min(24, Math.floor(2048 / Math.max(W, H)))), cw = Math.ceil(W * PX), ch = Math.ceil(H * PX), mx = x => (x - x0) * PX, my = y => (y - y0) * PX;
    const padR = c => /^(MOTOR|STEPDRV|ACDRIVE|MAINS|REG|L298|BAT|V)$/.test(c.t) ? 1.0 : 0.72;
    const pads = []; L.comps.forEach(c => CIR.pinPos(c).forEach((p, j) => pads.push({ c, j, x: p.x, y: p.y, r: padR(c), sq: j === 0 && c.t !== "GND", key: c.id + ":" + j })));
    function maskTex(side) { return canvasTex(cw, ch, g => { const col = new THREE.Color(Bd.color); g.fillStyle = Bd.color; g.fillRect(0, 0, cw, ch);
      // piste sotto la maschera: più chiare
      g.strokeStyle = "rgba(255,255,255,.22)"; g.lineCap = "round"; g.lineJoin = "round"; lay.traces.forEach(t => { if ((t.layer === "bot") !== (side === "bot")) return; g.lineWidth = Math.max(2, t.wmm / U * PX); g.beginPath(); g.moveTo(mx(t.w.a[0]), my(t.w.a[1])); g.lineTo(mx(t.w.b[0]), my(t.w.a[1])); g.lineTo(mx(t.w.b[0]), my(t.w.b[1])); g.stroke(); });
      g.globalCompositeOperation = "destination-out"; pads.forEach(p => { g.beginPath(); g.arc(mx(p.x), my(p.y), (p.r + 0.12) * PX, 0, 7); g.fill(); }); lay.vias.forEach(v => { g.beginPath(); g.arc(mx(v.x), my(v.y), 0.42 * PX, 0, 7); g.fill(); }); g.globalCompositeOperation = "source-over"; void col; }); }
    lay.traces.forEach(t => { const I = Math.max(...[0].concat((B.flows && B.flows[t.i] != null) ? [Math.abs(B.flows[t.i])] : [])); t.I = I; t.wmm = Math.max(0.3, traceWidth(I, Bd.oz) * 1.25); t.need = traceWidth(I, Bd.oz); if (t.need > 3) lay.drc.push({ sev: "warn", t: "Pista con " + CIR.si(I, "A") + ": servono " + CIR.fx(t.need, 1) + " mm di larghezza", why: "IPC-2221 con " + Bd.oz + " oz di rame e 10 °C di riscaldamento.", fix: "Rame 2 oz, pista più larga o un piano di rame." }); });
    const mTop = mesh(new THREE.PlaneGeometry(W, H), track(new THREE.MeshStandardMaterial({ map: maskTex("top"), transparent: true, roughness: 0.35, metalness: 0.05, depthWrite: false })), G.mask); mTop.rotation.x = -Math.PI / 2; mTop.position.set(cx, 0.03, cz);
    const mBot = mesh(new THREE.PlaneGeometry(W, H), track(new THREE.MeshStandardMaterial({ map: maskTex("bot"), transparent: true, roughness: 0.35, depthWrite: false })), G.maskB); mBot.rotation.x = Math.PI / 2; mBot.scale.x = 1; mBot.position.set(cx, -th - 0.03, cz);
    const silk = canvasTex(cw, ch, g => { g.strokeStyle = "#f4f4f4"; g.fillStyle = "#f4f4f4"; g.lineWidth = Math.max(1.5, PX * 0.12); g.font = `700 ${Math.round(PX * 0.95)}px Inter, system-ui, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
      L.comps.forEach(c => { if (c.t === "GND") { g.fillText("GND", mx(c.x), my(c.y) + PX * 1.3); return; } const fb = CIR.footprint(c.t).box, a = CIR.rot({ x: fb[0], y: fb[1] }, c.r), b = CIR.rot({ x: fb[2], y: fb[3] }, c.r), X0 = Math.min(a.x, b.x) + c.x, X1 = Math.max(a.x, b.x) + c.x, Y0 = Math.min(a.y, b.y) + c.y, Y1 = Math.max(a.y, b.y) + c.y; g.strokeRect(mx(X0), my(Y0), (X1 - X0) * PX, (Y1 - Y0) * PX); g.fillText(c.id, mx((X0 + X1) / 2), my(Y0) - PX * 0.7);
        if (/^(LED|D|C)$/.test(c.t)) { const k = CIR.pinPos(c)[c.t === "C" ? 0 : 1]; g.fillText(c.t === "C" ? "+" : "K", mx(k.x) + PX * 1.2, my(k.y) - PX * 1.1); } });
      g.textAlign = "left"; g.font = `700 ${Math.round(PX * 1.1)}px Inter, system-ui, sans-serif`; g.fillText("XENTRIQ INDUSTRY · Braccio Lab · " + Bd.L + "L " + Bd.th.toString().replace(".", ",") + " mm " + Bd.oz + " oz " + Bd.fin.toUpperCase(), PX * 1, ch - PX * 1); });
    const sk = mesh(new THREE.PlaneGeometry(W, H), track(new THREE.MeshBasicMaterial({ map: silk, transparent: true, depthWrite: false, alphaTest: 0.02 })), G.silk); sk.rotation.x = -Math.PI / 2; sk.position.set(cx, 0.06, cz);
    // rame: piste come nastri (spessore reale 35 µm × oz, esagerato ×4 per vederlo)
    const cuT = Math.max(0.035 * Bd.oz * 4 / U, 0.04);
    lay.traces.forEach(t => { const grp = t.layer === "bot" ? G.bot : G.top, y = t.layer === "bot" ? -th - cuT / 2 : cuT / 2, wv = t.wmm / U; t.mesh = []; t.segs.forEach(s => { const len = Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]) + wv; const m = box(s[0][1] === s[1][1] ? len : wv, cuT, s[0][1] === s[1][1] ? wv : len, MAT.cu, grp); m.position.set((s[0][0] + s[1][0]) / 2, y, (s[0][1] + s[1][1]) / 2); t.mesh.push(m); });
      if (t.jump) { const a = t.w.a, b = t.w.b; const c = new THREE.CatmullRomCurve3([new THREE.Vector3(a[0], 0, a[1]), new THREE.Vector3((a[0] + b[0]) / 2, 2.2, (a[1] + b[1]) / 2), new THREE.Vector3(b[0], 0, b[1])]); mesh(new THREE.TubeGeometry(c, 16, 0.12, 6), MAT.lead, G.comp); } });
    // piazzole (sopra e sotto), fori metallizzati
    const fin = Bd.fin === "enig" ? MAT.enig : Bd.fin === "osp" ? MAT.cu : MAT.hasl;
    pads.forEach(p => { [cuT, -th - cuT].forEach((y, i) => { const m = p.sq ? box(p.r * 2, cuT * 1.4, p.r * 2, fin, i ? G.bot : G.top) : cyl(p.r, p.r, cuT * 1.4, fin, i ? G.bot : G.top); m.position.set(p.x, y, p.y); }); const hl = cyl(0.42, 0.42, th + 0.02, MAT.hole, G.via, 10); hl.position.set(p.x, -th / 2, p.y); });
    lay.vias.forEach(v => { [cuT, -th - cuT].forEach(y => { const r = cyl(0.42, 0.42, cuT * 1.4, fin, G.via); r.position.set(v.x, y, v.y); }); const h2 = cyl(0.2, 0.2, th + 0.04, MAT.hole, G.via, 8); h2.position.set(v.x, -th / 2, v.y); });
    // componenti
    const comps = []; const res = B.res && B.res.ok ? B.res : null;
    L.comps.forEach(c => { const p = Object.assign({}, CIR.TYPES[c.t].p, c.p || {}), info = { c, p }; const g = buildComp(c, p, info); g.position.set(c.x, 0.06, c.y); g.rotation.y = -(c.r || 0) * Math.PI / 2; g.userData.comp = c.id; G.comp.add(g); info.g = g; info.base = info.body.map(m => ({ m, col: m.material.color ? m.material.color.clone() : null })); comps.push(info);
      const iss = res ? (res.issues || []).filter(i => i.comp === c.id && i.sev === "err" && /bruciat|esplod|surriscald|fus/i.test(i.t)) : []; info.dead = iss.length > 0; if (info.dead) info.body.forEach(m => { m.material.color && m.material.color.set(0x241a14); }); });
    // giunti di saldatura secondo la qualità del banco di saldatura
    const J = B.joints || {}, sold = Object.keys(J).length > 0; let nOk = 0, nCold = 0, nBr = 0, nNone = 0, nBurn = 0;
    pads.forEach(p => { if (p.c.t === "GND") return; const st = J[p.key] || (sold ? "none" : "none"); const y = cuT * 1.4;
      if (st === "ok") { nOk++; const m = mesh(new THREE.CylinderGeometry(0.16, p.r * 0.95, 0.55, SEG), MAT.solder, G.sol); m.position.set(p.x, y + 0.27, p.y); }
      else if (st === "cold") { nCold++; const m = mesh(new THREE.SphereGeometry(p.r * 0.75, 10, 8), MAT.cold, G.sol); m.scale.set(1, 0.85, 1.1); m.position.set(p.x + 0.08, y + 0.42, p.y); }
      else if (st === "bridge") { nBr++; const pc = CIR.pinPos(p.c), o = pc[p.j + 1 < pc.length ? p.j + 1 : p.j - 1]; const dx = o.x - p.x, dz = o.y - p.y, d = Math.hypot(dx, dz); const m = mesh(new THREE.CapsuleGeometry(0.5, Math.max(0.1, d), 4, 10), MAT.solder, G.sol); m.rotation.z = Math.PI / 2; m.rotation.y = -Math.atan2(dz, dx); m.position.set(p.x + dx / 2, y + 0.35, p.y + dz / 2); }
      else if (st === "burnt") { nBurn++; const m = cyl(p.r * 1.1, p.r * 1.1, 0.12, MAT.burnt, G.sol); m.position.set(p.x, y + 0.08, p.y); m.rotation.z = 0.25; }
      else nNone++; });
    built = { lay, comps, W, H, cx, cz, th, Bd, pads, counts: { ok: nOk, cold: nCold, bridge: nBr, none: nNone, burnt: nBurn }, sold };
    // particelle per il flusso di corrente
    buildFlow(); timeline(); fit(); info(); applyLayers(); applyExplode();
  }
  let flowMesh = null, flowSlots = [];
  function buildFlow() {
    flowSlots = []; const lay = built.lay; let total = 0;
    lay.traces.forEach(t => { const Lt = t.segs.reduce((s, q) => s + Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]), 0); t.Lt = Lt; t.nP = Math.max(1, Math.min(lite ? 6 : 12, Math.floor(Lt / 1.4))); t.ph = 0; total += t.nP; });
    total = Math.min(total, lite ? 300 : 900);
    flowMesh = new THREE.InstancedMesh(track(new THREE.SphereGeometry(0.16, 6, 4)), MAT.flow, Math.max(1, total)); flowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); G.flow.add(flowMesh);
    let k = 0; lay.traces.forEach(t => { for (let i = 0; i < t.nP && k < total; i++, k++) flowSlots.push({ t, i }); }); flowMesh.count = flowSlots.length;
  }
  function timeline() {
    const bench = env.bench(); let tl = null; try { tl = bench.timeline(null, lite ? 90 : 120); } catch (e) { tl = null; }
    if (!tl || !tl.ok || !tl.t.length) { const B = bench.state; tl = { ok: true, tEnd: 1, t: [0, 1], ms: [B.res && B.res.comps || {}, B.res && B.res.comps || {}], flows: [B.flows || [], B.flows || []] }; }
    // temperature: risposta del primo ordine a P(t) per ogni componente
    const T = {}; built.comps.forEach(ci => { const id = ci.c.id, R = PKG_RTH[ci.c.t] || 100, tau = PKG_TAU[ci.c.t] || 10; let Tc = 25; T[id] = tl.t.map((tt, k) => { const m = tl.ms[k][id] || {}, P = Math.abs(m.P != null ? m.P : (m.V || 0) * (m.I || 0)), dt = k ? tt - tl.t[k - 1] : 0, Tss = 25 + P * R; Tc += (Tss - Tc) * (1 - Math.exp(-dt * 8 / tau)); return Tc; }); });
    tl.T = T; V.tl = tl; V.k = 0; const sl = $("#p3T"); sl.max = String(tl.t.length - 1); sl.value = "0";
  }
  function setFrame(k) {
    if (!built || !V.tl) return; const tl = V.tl; k = Math.max(0, Math.min(tl.t.length - 1, k | 0)); V.k = k; const ms = tl.ms[k] || {}, fl = tl.flows[k] || [];
    $("#p3Tl").textContent = "t = " + CIR.fx(tl.t[k], 2) + " s"; const sl = $("#p3T"); if (+sl.value !== k) sl.value = String(k);
    built.comps.forEach(ci => { const m = ms[ci.c.id] || {}, Tc = tl.T[ci.c.id] ? tl.T[ci.c.id][k] : 25; ci.T = Tc; ci.m = m;
      if (ci.glow) { const lum = ci.dead ? 0 : Math.max(0, Math.min(1.4, m.lum || 0)); ci.glow.m.emissiveIntensity = lum * (ci.glow.lamp ? 2.5 : 3); if (ci.glow.spr) ci.glow.spr.material.opacity = Math.min(1, lum * 0.9); }
      ci.body.forEach((b, i) => { const base = ci.base[i]; if (!b.material.color || !base.col) return; if (V.mode === "heat") { b.material.color.copy(heatCol(Tc)); if (b.material.emissive) { b.material.emissive.copy(heatCol(Tc)).multiplyScalar(0.35); } } else { b.material.color.copy(ci.dead ? new THREE.Color(0x241a14) : base.col); if (b.material.emissive && !ci.glow) b.material.emissive.set(0x000000); } }); });
    built.lay.traces.forEach(t => { t.f = fl[t.i] || 0; if (t.mesh) t.mesh.forEach(m => { if (V.mode === "heat") { const A = t.wmm / 0.0254 * 1.378 * built.Bd.oz, dT = Math.pow(Math.abs(t.f) / (0.048 * Math.pow(A, 0.725)), 1 / 0.44); m.material = heatMat(25 + Math.min(120, dT)); } else m.material = MAT.cu; }); });
    selInfo();
  }
  const hm = {}; function heatMat(T) { const k = Math.round(T / 5) * 5; if (!hm[k]) hm[k] = new THREE.MeshStandardMaterial({ color: heatCol(k), emissive: heatCol(k), emissiveIntensity: 0.3, roughness: 0.5 }); return hm[k]; }
  const tmpM = new THREE.Matrix4(), tmpV = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), zero = new THREE.Vector3(0, 0, 0), q0 = new THREE.Quaternion();
  function stepFlow(dt) {
    if (!flowMesh || !built) return; const th = built.th;
    built.lay.traces.forEach(t => { const a = Math.abs(t.f || 0); t.ph = (t.ph + (a > 2e-4 ? Math.sign(t.f) * dt * (0.25 + 0.35 * Math.log10(1 + a * 1000)) : 0) + 10) % 1; });
    flowSlots.forEach((s, k) => { const t = s.t, a = Math.abs(t.f || 0); let d = ((s.i + t.ph) / t.nP) % 1 * t.Lt, x = t.w.a[0], z = t.w.a[1]; for (const q of t.segs) { const l = Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]); if (d <= l) { x = q[0][0] + (q[1][0] - q[0][0]) * (l ? d / l : 0); z = q[0][1] + (q[1][1] - q[0][1]) * (l ? d / l : 0); break; } d -= l; }
      const y = t.layer === "bot" ? -th - 0.25 : 0.25; tmpV.set(x, y, z); tmpM.compose(tmpV, q0, a > 2e-4 && V.lay.flow && V.mode !== "heat" ? one : zero); flowMesh.setMatrixAt(k, tmpM); });
    flowMesh.instanceMatrix.needsUpdate = true;
  }
  function applyLayers() { const L2 = V.lay; G.fr4.visible = L2.fr4; G.top.visible = L2.top; G.bot.visible = L2.bot; G.mask.visible = L2.mask; G.maskB.visible = L2.mask; G.silk.visible = L2.silk; G.comp.visible = L2.comp; G.sol.visible = L2.sol; G.via.visible = L2.via; G.flow.visible = L2.flow; }
  function applyExplode() { const e = V.explode * 9; G.bot.position.y = -e * 0.9; G.maskB.position.y = -e * 1.4; G.via.position.y = 0; G.top.position.y = e * 0.5; G.mask.position.y = e * 1.0; G.silk.position.y = e * 1.4; G.sol.position.y = e * 0.5 + e * 0.35; G.comp.position.y = e * 2.6; G.flow.position.y = 0; $("#p3Ev").textContent = Math.round(V.explode * 100) + "%"; }
  function fit(top) { if (!built) return; const a = Math.max(0.3, camera.aspect || 1), fv = Math.tan(camera.fov * Math.PI / 360), d = Math.max(built.H / (2 * fv), built.W / (2 * fv * a)) * 1.15 + 4; controls.target.set(0, 0, 0); if (top) camera.position.set(0.001, d, 0.01); else camera.position.set(d * 0.12, d * 0.78, d * 0.62); controls.update(); }
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
  function resize() { const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null; if (ro) ro.observe(stage);
  let raf = 0, last = 0, acc = 0;
  function frame(dt) {
    controls.update();
    if (V.play && V.tl && V.tl.t.length > 1) { acc += dt * V.spd; const step = V.tl.tEnd / (V.tl.t.length - 1); while (acc >= step) { acc -= step; setFrame((V.k + 1) % V.tl.t.length); } }
    if (built) { built.comps.forEach(ci => { if (!ci.spin || !ci.m || ci.dead) return; const m = ci.m; let w = 0; if (ci.c.t === "MOTOR") w = (m.rpm || 0) / 60 * 2 * Math.PI * 0.05; else if (ci.c.t === "STEPDRV") w = m.Vm > 5 && m.Vdd > 2.5 ? 2 : 0; else if (ci.c.t === "SERVO") w = Math.abs(m.I || 0) > 0.02 ? 1.5 : 0; if (rm) w = 0; ci.spin.o.rotation[ci.spin.ax] += w * dt; }); stepFlow(rm ? 0 : dt); }
    renderer.render(scene, camera);
  }
  function tick(ts) { raf = 0; if (!V.run) return; const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts; frame(dt); raf = requestAnimationFrame(tick); }
  resize(); hint();
  return {
    resume() { V.run = true; resize(); build(); setFrame(0); last = 0; if (!raf) raf = requestAnimationFrame(tick); },
    pause() { V.run = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    rebuild() { build(); setFrame(V.k); },
    ctx() { if (!built) return { empty: true }; const hot = built.comps.slice().sort((a, b) => (b.T || 0) - (a.T || 0))[0]; return { board: built.Bd.L + " strati " + built.Bd.fin.toUpperCase(), size: CIR.fx(built.W * U, 0) + "×" + CIR.fx(built.H * U, 0) + " mm", joints: built.counts, sold: built.sold, drc: built.lay.drc.map(d => d.t), vias: built.lay.vias.length, bottom: built.lay.traces.filter(t => t.layer === "bot").length, t: V.tl ? V.tl.t[V.k] : 0, mode: V.mode, hot: hot ? hot.c.id + " " + Math.round(hot.T || 25) + " °C" : "" }; },
    test: { V, setFrame, frame(n) { for (let i = 0; i < (n || 1); i++) frame(0.05); }, mode(m) { const b = el.querySelector(`[data-p3m="${m}"]`); if (b) b.click(); }, explode(v) { V.explode = v; applyExplode(); }, layer(k, on) { V.lay[k] = on; applyLayers(); }, built: () => built, render() { frame(0.016); } },
    dispose() { this.pause(); if (ro) ro.disconnect(); clear(); pmrem.dispose(); renderer.dispose(); }
  };
}
