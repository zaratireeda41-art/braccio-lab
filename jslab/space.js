// Braccio Lab · Il mio spazio: laboratorio 3D personalizzabile con banco metalli e morsa, smerigliatrice,
// trapano a colonna, saldatura TIG/MIG manuale, mini tornio 180×300 e rastrelliera dei metalli. Usa window.MET.
import * as THREE from "../vendor/three.module.min.js";
import { OrbitControls } from "../vendor/three-addons.min.js";
import * as TX from "../js3d/textures.js?v=5";
import { mats } from "../js3d/armview.js?v=5";

const SKEY = "xentriq-braccio-lab-space-v1";
const FLOORS = { cemento: "Cemento industriale", resina: "Resina epossidica grigia", legno: "Parquet di rovere", piastrelle: "Piastrelle da officina" };
const WALLS = { bianco: "Intonaco bianco", mattoni: "Mattoni a vista", antracite: "Grigio antracite", blu: "Blu officina" };
const ITEMS = [
  { id: "elec", n: "Banco elettronica", st: "elec", x: -2.6, z: -2.0, r: 0 },
  { id: "metal", n: "Banco metalli + morsa + smerigliatrice", st: "grind", x: 0.2, z: -2.1, r: 0 },
  { id: "drill", n: "Trapano a colonna", st: "drill", x: 2.4, z: -2.2, r: 0 },
  { id: "lathe", n: "Mini tornio 180×300", st: "lathe", x: 2.6, z: 0.6, r: -Math.PI / 2 },
  { id: "weld", n: "Saldatrice TIG/MIG + tavolo", st: "weld", x: -0.4, z: 1.4, r: Math.PI },
  { id: "rack", n: "Rastrelliera dei metalli", st: "rack", x: -3.2, z: 1.0, r: Math.PI / 2 },
  { id: "tools", n: "Parete attrezzi", st: "tools", x: -1.0, z: -2.85, r: 0 },
  { id: "saw", n: "Sega a nastro", st: "saw", x: 1.4, z: 2.3, r: Math.PI }
];
const HAND = [["Martello da meccanico 500 g", "Per raddrizzare, piantare spine e usare il bulino."], ["Bulino automatico", "Segna il centro prima di forare: la punta non scivola."], ["Calibro a corsoio 150 mm (0,02 mm)", "Misure esterne, interne e di profondità."], ["Micrometro 0–25 mm", "Diametri precisi al centesimo: perni e cuscinetti."], ["Lime piatta, mezzatonda, tonda", "Sbavare e aggiustare: spingi in avanti, non strisciare indietro."], ["Seghetto per metalli 24 denti/pollice", "Lamiere e tubi sottili: almeno 3 denti sempre in presa."], ["Maschi e filiere M3–M12", "Filettature: foro M6 = punta 5 mm, M8 = 6,8 mm, M10 = 8,5 mm. Olio e mezzo giro indietro."], ["Chiavi combinate 6–24 mm, brugole", "Per i bulloni del braccio: rispetta la coppia di serraggio."], ["Squadra e truschino", "Tracciare righe parallele e controllare l'angolo retto."], ["Chiave dinamometrica 5–60 N·m", "M6 8.8 ≈ 10 N·m, M8 ≈ 25 N·m, M10 ≈ 49 N·m."]];
function loadS() { try { return JSON.parse(localStorage.getItem(SKEY) || "null"); } catch (e) { return null; } }
function cv(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
function rnd(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function ctex(c, rep) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function floorTex(kind) {
  if (kind === "cemento") return TX.concrete(21).map;
  const s = 512, c = cv(s, s), g = c.getContext("2d"), r = rnd(kind.length * 7);
  if (kind === "legno") { for (let i = 0; i < 8; i++) { const y = i * 64, base = 120 + Math.round(r() * 40); g.fillStyle = `rgb(${base + 40},${base},${base - 50})`; g.fillRect(0, y, s, 64); for (let k = 0; k < 40; k++) { g.strokeStyle = `rgba(60,30,10,${0.05 + r() * 0.1})`; g.beginPath(); g.moveTo(0, y + r() * 64); g.bezierCurveTo(s / 3, y + r() * 64, s * 2 / 3, y + r() * 64, s, y + r() * 64); g.stroke(); } g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(0, y, s, 2); g.fillRect((i * 173) % s, y, 2, 64); } return ctex(c, [4, 4]); }
  if (kind === "piastrelle") { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = 150 + Math.round(r() * 20); g.fillStyle = `rgb(${v},${v - 5},${v - 12})`; g.fillRect(i * 128, j * 128, 128, 128); g.fillStyle = "rgba(40,40,40,.9)"; g.fillRect(i * 128, j * 128, 128, 3); g.fillRect(i * 128, j * 128, 3, 128); } return ctex(c, [5, 5]); }
  g.fillStyle = "#6d737a"; g.fillRect(0, 0, s, s); for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${0.05 + r() * 0.08})`; g.fillRect(r() * s, r() * s, 2, 2); } return ctex(c, [4, 4]);
}
function wallTex(kind) {
  const s = 512, c = cv(s, s), g = c.getContext("2d"), r = rnd(kind.length * 13);
  if (kind === "mattoni") { g.fillStyle = "#c9c2b6"; g.fillRect(0, 0, s, s); for (let j = 0; j < 16; j++) for (let i = -1; i < 5; i++) { const x = i * 128 + (j % 2) * 64, y = j * 32, v = r(); g.fillStyle = `rgb(${150 + v * 40},${70 + v * 25},${50 + v * 20})`; g.fillRect(x + 3, y + 3, 122, 26); } return ctex(c, [3, 2]); }
  const base = { bianco: "#e9e7e2", antracite: "#3a3f45", blu: "#2c4f7a" }[kind] || "#e9e7e2"; g.fillStyle = base; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},0.025)`; g.beginPath(); g.arc(r() * s, r() * s, 1 + r() * 6, 0, 7); g.fill(); }
  if (kind !== "bianco") { g.fillStyle = "rgba(255,255,255,.08)"; g.fillRect(0, s * 0.62, s, 6); } return ctex(c, [3, 1.5]);
}
export function mountSpace(el, env) {
  const MET = env.MET, esc = env.esc, rm = !!env.reduced, test = !!env.testMode;
  const saved = loadS() || {};
  const S = { floor: saved.floor || "cemento", wall: saved.wall || "bianco", items: saved.items || {}, parts: saved.parts || [], metal: saved.metal || "s235", station: null, edit: false, sel: null, run: false, last: "", warn: [] };
  ITEMS.forEach(it => { if (!S.items[it.id]) S.items[it.id] = { x: it.x, z: it.z, r: it.r }; });
  function save() { try { localStorage.setItem(SKEY, JSON.stringify({ floor: S.floor, wall: S.wall, items: S.items, parts: S.parts.slice(-30), metal: S.metal })); } catch (e) { /* pieno */ } }
  el.innerHTML = `<div class="sp"><div class="sp-stage" id="spStage"><canvas id="spCv" aria-label="Il mio spazio: laboratorio 3D"></canvas>
    <div class="sp-top"><button type="button" class="btn sm" data-sp="back">← Torna alla tavola</button><button type="button" class="btn sm ghost" data-sp="edit" aria-pressed="false">Personalizza</button><button type="button" class="btn sm ghost" data-sp="overview">Vista d'insieme</button></div>
    <div class="sp-chips" id="spChips">${[["grind", "Smerigliatrice"], ["drill", "Trapano"], ["weld", "TIG / MIG"], ["lathe", "Tornio"], ["saw", "Sega a nastro"], ["rack", "Metalli"], ["tools", "Attrezzi"], ["elec", "Banco elettronica"]].map(([k, n]) => `<button type="button" class="chip" data-go="${k}">${n}</button>`).join("")}</div>
    <div class="sp-hint" id="spHint"></div></div>
    <div class="sp-panel card" id="spPanel"></div></div>`;
  const $ = s => el.querySelector(s), canvas = $("#spCv"), stage = $("#spStage");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: test, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, test ? 1 : 1.5)); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !test; renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x15181c); scene.fog = new THREE.Fog(0x15181c, 12, 26);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 60); camera.position.set(4.5, 4.2, 6.2);
  const controls = new OrbitControls(camera, canvas); controls.enableDamping = !rm; controls.dampingFactor = 0.08; controls.maxPolarAngle = Math.PI * 0.49; controls.minDistance = 0.18; controls.maxDistance = 14; controls.target.set(0, 0.8, 0);
  const M = mats();
  const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x2a2622, 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2e0, 1.6); sun.position.set(3, 6, 2.5); sun.castShadow = !test; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 20 }); scene.add(sun);
  [[-2, -1], [2, -1], [0, 1.5]].forEach(([x, z]) => { const l = new THREE.PointLight(0xfff5e6, 6, 7, 1.6); l.position.set(x, 3, z); scene.add(l); const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.16), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e0, emissiveIntensity: 2 })); lamp.position.set(x, 3.15, z); scene.add(lamp); });
  // stanza
  const RW = 8, RD = 6.4, RH = 3.2;
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex(S.floor), roughness: S.floor === "resina" ? 0.35 : 0.85, metalness: 0 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), floorMat); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex(S.wall), roughness: 0.92 });
  [[0, RH / 2, -RD / 2, 0, RW], [-RW / 2, RH / 2, 0, Math.PI / 2, RD], [RW / 2, RH / 2, 0, -Math.PI / 2, RD]].forEach(([x, y, z, ry, w]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, RH), wallMat); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; scene.add(m); });
  const skirt = new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.6 }); [[0, -RD / 2 + 0.01, RW, 0], [-RW / 2 + 0.01, 0, RD, Math.PI / 2], [RW / 2 - 0.01, 0, RD, Math.PI / 2]].forEach(([x, z, w, ry]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.02), skirt); b.position.set(x, 0.05, z); b.rotation.y = ry; scene.add(b); });
  function setFloor(k) { S.floor = k; floorMat.map = floorTex(k); floorMat.roughness = k === "resina" ? 0.35 : 0.85; floorMat.needsUpdate = true; save(); }
  function setWall(k) { S.wall = k; wallMat.map = wallTex(k); wallMat.needsUpdate = true; save(); }
  function box(w, h, d, mat, x, y, z, parent) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; (parent || scene).add(m); return m; }
  function cyl(rt, rb, h, mat, x, y, z, parent, seg) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 28), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; (parent || scene).add(m); return m; }
  const wood = new THREE.MeshStandardMaterial({ color: 0x9a7448, roughness: 0.75 }), green = new THREE.MeshStandardMaterial({ color: 0x2f6b4a, roughness: 0.6, metalness: 0.2 }), grey = new THREE.MeshStandardMaterial({ color: 0x5b636b, roughness: 0.5, metalness: 0.6 }), dark = new THREE.MeshStandardMaterial({ color: 0x24282d, roughness: 0.5, metalness: 0.5 }), cream = new THREE.MeshStandardMaterial({ color: 0xd8d2c0, roughness: 0.55, metalness: 0.2 }), orange = M.paint;
  function metalMat(id) { const m = MET.get(id) || MET.get("s235"); return new THREE.MeshPhysicalMaterial({ color: new THREE.Color(m.col), metalness: 1, roughness: /al|ti|aisi/.test(id) ? 0.32 : 0.45 }); }
  /* ---- oggetti del laboratorio ---- */
  const R = {}; const groups = {};
  function bench(g, w, d, h, topMat, legMat) { box(w, 0.05, d, topMat, 0, h - 0.025, 0, g); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(0.05, h - 0.05, 0.05, legMat, a * (w / 2 - 0.05), (h - 0.05) / 2, b * (d / 2 - 0.05), g)); box(w - 0.1, 0.03, d - 0.1, legMat, 0, 0.18, 0, g); }
  const build = {
    elec(g) { bench(g, 1.6, 0.75, 0.9, wood, dark); box(1.6, 0.6, 0.03, new THREE.MeshStandardMaterial({ color: 0xc9b38a, roughness: 0.9 }), 0, 1.2, -0.36, g);
      box(0.24, 0.1, 0.16, dark, -0.55, 0.95, 0.05, g); box(0.12, 0.04, 0.005, new THREE.MeshStandardMaterial({ color: 0x0b2a18, emissive: 0x1ee06a, emissiveIntensity: 0.6 }), -0.55, 0.96, 0.131, g);
      const pcb = box(0.22, 0.004, 0.15, new THREE.MeshStandardMaterial({ color: 0x1f7a3a, roughness: 0.45 }), 0.05, 0.927, 0.05, g); for (let i = 0; i < 6; i++) box(0.02, 0.012, 0.008, i % 2 ? M.ceramic : dark, -0.03 + i * 0.03, 0.935, 0.04, g);
      box(0.08, 0.15, 0.035, new THREE.MeshStandardMaterial({ color: 0xf5c542, roughness: 0.5 }), 0.45, 0.93, 0.1, g).rotation.x = -1.2;
      const arm = cyl(0.01, 0.01, 0.5, grey, 0.6, 1.15, -0.2, g); arm.rotation.z = 0.4; cyl(0.09, 0.09, 0.02, new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.8, roughness: 0.05, thickness: 0.01 }), 0.48, 1.38, -0.15, g); },
    metal(g) { bench(g, 1.8, 0.8, 0.9, grey, dark); box(1.8, 0.06, 0.8, new THREE.MeshStandardMaterial({ color: 0x4a4f55, roughness: 0.6, metalness: 0.7 }), 0, 0.93, 0, g);
      const vise = new THREE.Group(); vise.position.set(-0.45, 0.96, 0.12); g.add(vise); box(0.22, 0.08, 0.16, M.paint, 0, 0.04, 0, vise); box(0.2, 0.08, 0.04, grey, 0, 0.12, -0.04, vise); const jaw = box(0.2, 0.08, 0.04, grey, 0, 0.12, 0.05, vise); cyl(0.008, 0.008, 0.3, M.steel, 0, 0.1, 0.22, vise).rotation.x = Math.PI / 2;
      R.bar = cyl(0.012, 0.012, 0.6, metalMat(S.metal), 0.15, 0.13, 0.005, vise); R.bar.rotation.z = Math.PI / 2; R.barLen = 0.6; R.vise = vise;
      const gr = new THREE.Group(); gr.position.set(-0.05, 1.18, 0.12); g.add(gr); const body = cyl(0.035, 0.035, 0.28, new THREE.MeshStandardMaterial({ color: 0x1f5fb0, roughness: 0.45, metalness: 0.2 }), 0, 0.1, 0.0, gr); body.rotation.z = Math.PI / 2; body.position.set(0.16, 0.08, 0);
      box(0.06, 0.06, 0.06, dark, 0.0, 0.06, 0, gr); R.disc = cyl(0.0625, 0.0625, 0.003, new THREE.MeshStandardMaterial({ color: 0x7b5a3a, roughness: 0.9 }), 0, 0, 0, gr, 40); R.disc.rotation.x = Math.PI / 2; const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.02, 32, 1, true, 0, Math.PI), grey); guard.rotation.x = Math.PI / 2; guard.position.set(0, 0, -0.01); gr.add(guard); R.grinder = gr; R.gr0 = gr.position.clone(); },
    drill(g) { box(0.45, 0.06, 0.6, dark, 0, 0.03, 0, g); const col = cyl(0.04, 0.04, 1.55, M.steel, 0, 0.8, -0.18, g); box(0.3, 0.025, 0.3, grey, 0, 0.78, 0.05, g);
      R.dplate = box(0.16, 0.01, 0.1, metalMat(S.metal), 0, 0.8, 0.07, g); R.dholes = new THREE.Group(); g.add(R.dholes);
      box(0.24, 0.22, 0.42, cream, 0, 1.45, -0.05, g); cyl(0.07, 0.07, 0.22, cream, 0, 1.66, -0.2, g); for (let i = 0; i < 3; i++) { const h = cyl(0.006, 0.006, 0.18, M.steel, 0.15, 1.42, 0.0, g); h.rotation.z = Math.PI / 2; h.rotation.y = i * 2.1; }
      const q = new THREE.Group(); q.position.set(0, 1.32, 0.07); g.add(q); cyl(0.022, 0.022, 0.12, M.steel, 0, -0.03, 0, q); cyl(0.018, 0.012, 0.05, dark, 0, -0.11, 0, q); R.bitMat = new THREE.MeshPhysicalMaterial({ color: 0x9aa3ab, metalness: 1, roughness: 0.3 }); R.bit = cyl(0.004, 0.004, 0.12, R.bitMat, 0, -0.19, 0, q); R.quill = q; R.q0 = q.position.y; },
    lathe(g) { bench(g, 1.2, 0.5, 0.85, grey, dark); box(0.7, 0.05, 0.12, M.darkSteel, 0, 0.9, 0, g); box(0.2, 0.18, 0.18, cream, -0.3, 1.0, 0, g); box(0.08, 0.12, 0.12, cream, -0.3, 1.15, -0.05, g);
      const ch = new THREE.Group(); ch.position.set(-0.19, 1.02, 0); g.add(ch); const chuck = cyl(0.045, 0.045, 0.04, M.steel, 0, 0, 0, ch); chuck.rotation.z = Math.PI / 2; for (let i = 0; i < 3; i++) { const j = box(0.025, 0.02, 0.012, dark, 0.02, 0.03, 0, ch); j.position.set(0.02, Math.cos(i * 2.094) * 0.03, Math.sin(i * 2.094) * 0.03); j.rotation.x = i * 2.094; } R.chuck = ch;
      box(0.1, 0.12, 0.1, cream, 0.28, 0.98, 0, g); cyl(0.012, 0.012, 0.08, M.steel, 0.21, 1.02, 0, g).rotation.z = Math.PI / 2;
      const car = new THREE.Group(); car.position.set(0.05, 0.94, 0.07); g.add(car); box(0.12, 0.04, 0.12, cream, 0, 0, 0, car); box(0.05, 0.05, 0.05, dark, 0, 0.045, -0.02, car); R.tool = box(0.008, 0.008, 0.05, M.carbide, 0, 0.08, -0.045, car); R.car = car;
      R.workMat = metalMat(S.metal); R.work = new THREE.Mesh(new THREE.BufferGeometry(), R.workMat); R.work.castShadow = true; R.work.position.set(-0.17, 1.02, 0); R.work.rotation.order = "ZYX"; R.work.rotation.z = -Math.PI / 2; g.add(R.work); box(0.08, 0.08, 0.02, new THREE.MeshStandardMaterial({ color: 0xd8262b }), -0.36, 0.98, 0.1, g); },
    weld(g) { bench(g, 1.0, 0.6, 0.85, M.darkSteel, dark); for (let i = -4; i <= 4; i++) box(0.012, 0.004, 0.6, dark, i * 0.1, 0.851, 0, g);
      R.plateA = box(0.3, 0.004, 0.075, metalMat(S.metal), 0, 0.857, -0.0385, g); R.plateB = box(0.3, 0.004, 0.075, metalMat(S.metal), 0, 0.857, 0.0385, g);
      const mach = new THREE.Group(); mach.position.set(0.75, 0, -0.1); g.add(mach); box(0.3, 0.55, 0.55, new THREE.MeshStandardMaterial({ color: 0x1d6fe0, roughness: 0.45, metalness: 0.3 }), 0, 0.5, 0, mach); box(0.005, 0.12, 0.2, new THREE.MeshStandardMaterial({ color: 0x08121c, emissive: 0x2aa8ff, emissiveIntensity: 0.4 }), -0.153, 0.65, 0, mach); cyl(0.11, 0.11, 1.2, new THREE.MeshStandardMaterial({ color: 0x5d7c5a, roughness: 0.4, metalness: 0.4 }), 0.05, 0.6, 0.38, mach);
      const torch = new THREE.Group(); g.add(torch); const tb = cyl(0.012, 0.016, 0.16, dark, 0, 0.1, 0, torch); cyl(0.009, 0.012, 0.03, M.copper, 0, 0.01, 0, torch); R.torch = torch; R.torch.position.set(-0.2, 0.9, 0); R.torch.rotation.z = 0.35;
      R.beadMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.8 }); R.bead = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), R.beadMat, 500); R.bead.count = 0; R.bead.frustumCulled = false; R.bead.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(500 * 3), 3); g.add(R.bead); R.beadHeat = new Float32Array(500);
      R.arc = new THREE.PointLight(0x9fc8ff, 0, 2.5, 2); g.add(R.arc); R.weldG = g; },
    rack(g) { box(1.4, 0.05, 0.4, grey, 0, 0.02, 0, g); [-0.65, 0.65].forEach(x => box(0.05, 1.6, 0.05, grey, x, 0.8, 0, g)); for (let lv = 0; lv < 4; lv++) box(1.4, 0.02, 0.35, grey, 0, 0.35 + lv * 0.38, 0, g);
      R.rackBars = []; MET.METALS.forEach((m, i) => { const lv = i % 4, k = Math.floor(i / 4); const b = cyl(0.012 + (k % 3) * 0.004, 0.012 + (k % 3) * 0.004, 1.2, metalMat(m.id), 0, 0.37 + lv * 0.38 + 0.015, -0.13 + k * 0.06, g); b.rotation.z = Math.PI / 2; b.userData.metal = m.id; R.rackBars.push(b); }); },
    tools(g) { box(1.6, 0.9, 0.02, new THREE.MeshStandardMaterial({ color: 0xb08b5a, roughness: 0.85 }), 0, 1.45, 0, g); const tm = [M.paint, grey, M.red, M.blue, dark, M.yellow];
      for (let i = 0; i < 10; i++) { const x = -0.65 + (i % 5) * 0.32, y = 1.68 - Math.floor(i / 5) * 0.42; box(0.025, 0.24, 0.02, tm[i % tm.length], x, y, 0.03, g); box(0.09, 0.04, 0.025, grey, x, y + 0.12, 0.03, g); } box(1.6, 0.06, 0.25, grey, 0, 0.98, 0.12, g); },
    saw(g) { box(0.7, 0.55, 0.35, new THREE.MeshStandardMaterial({ color: 0x3c6e9e, roughness: 0.5, metalness: 0.3 }), 0, 0.28, 0, g); box(0.5, 0.04, 0.3, grey, 0, 0.58, 0, g); const arm = new THREE.Group(); arm.position.set(-0.25, 0.62, 0); g.add(arm); box(0.6, 0.08, 0.06, new THREE.MeshStandardMaterial({ color: 0x3c6e9e }), 0.3, 0.12, -0.08, arm); R.sawBlade = box(0.55, 0.012, 0.004, M.steel, 0.3, 0.06, 0.0, arm); R.sawArm = arm; cyl(0.08, 0.08, 0.03, grey, 0.02, 0.12, -0.05, arm).rotation.x = Math.PI / 2; cyl(0.08, 0.08, 0.03, grey, 0.58, 0.12, -0.05, arm).rotation.x = Math.PI / 2; R.sawBar = cyl(0.015, 0.015, 0.5, metalMat(S.metal), 0.0, 0.62, 0.0, g); R.sawBar.rotation.x = Math.PI / 2; }
  };
  ITEMS.forEach(it => { const g = new THREE.Group(); g.userData.item = it.id; build[it.id](g); const p = S.items[it.id]; g.position.set(p.x, 0, p.z); g.rotation.y = p.r; scene.add(g); groups[it.id] = g; });
  const VIEWS = { grind: ["metal", [0.05, 1.42, 0.95], [-0.25, 1.0, 0.1]], drill: ["drill", [0.35, 1.35, 0.85], [0, 0.95, 0.07]], lathe: ["lathe", [0.05, 1.22, 0.62], [-0.05, 1.0, 0]], weld: ["weld", [0, 1.12, 0.34], [0, 0.86, 0]], rack: ["rack", [0, 1.3, 1.9], [0, 0.9, 0]], tools: ["tools", [0, 1.45, 1.6], [0, 1.4, 0]], elec: ["elec", [0, 1.45, 1.1], [0, 0.95, 0]], saw: ["saw", [0.1, 1.25, 1.2], [0, 0.65, 0]] };
  /* ---- particelle (scintille, trucioli, spruzzi) ---- */
  const NP = test ? 300 : 900, pPos = new Float32Array(NP * 3), pCol = new Float32Array(NP * 3), pV = new Float32Array(NP * 3), pL = new Float32Array(NP), pG = new Float32Array(NP);
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
  const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.012, map: TX.sprite(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true })); pts.frustumCulled = false; scene.add(pts);
  for (let i = 0; i < NP; i++) pPos[i * 3 + 1] = -10;
  let pi = 0; const tmpC = new THREE.Color();
  function spawn(p, v, col, life, grav) { if (rm && Math.random() < 0.7) return; const i = pi = (pi + 1) % NP; pPos.set([p.x, p.y, p.z], i * 3); pV.set([v.x, v.y, v.z], i * 3); tmpC.set(col); pCol.set([tmpC.r, tmpC.g, tmpC.b], i * 3); pL[i] = life; pG[i] = grav == null ? 9.8 : grav; }
  function stepP(dt) { for (let i = 0; i < NP; i++) { if (pL[i] <= 0) continue; pL[i] -= dt; const k = i * 3; pV[k + 1] -= pG[i] * dt; pPos[k] += pV[k] * dt; pPos[k + 1] += pV[k + 1] * dt; pPos[k + 2] += pV[k + 2] * dt; if (pPos[k + 1] < 0.005) { pPos[k + 1] = 0.005; pV[k + 1] *= -0.3; pV[k] *= 0.5; pV[k + 2] *= 0.5; } const f = Math.max(0, Math.min(1, pL[i] * 2)); pCol[k] *= 0.985 + 0.015 * f; pCol[k + 1] *= 0.97 + 0.03 * f; pCol[k + 2] *= 0.95 + 0.05 * f; if (pL[i] <= 0) pPos[k + 1] = -10; } pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true; }
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  /* ---- volo della telecamera ---- */
  let fly = null;
  function flyTo(pos, tgt) { if (camera.aspect < 1 && S.station) { const k = Math.min(1.9, Math.pow(1 / camera.aspect, 0.7)); pos = tgt.clone().add(pos.clone().sub(tgt).multiplyScalar(k)); } if (rm || test) { camera.position.copy(pos); controls.target.copy(tgt); controls.update(); return; } fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: tgt, t: 0 }; }
  function overview() { S.station = null; flyTo(V3(4.6, 4.0, 6.0), V3(0, 0.7, 0)); panel(); }
  function go(st) { const v = VIEWS[st]; if (!v) return; S.station = st; const g = groups[v[0]]; g.updateMatrixWorld(); flyTo(g.localToWorld(V3(...v[1])), g.localToWorld(V3(...v[2]))); controls.enabled = st !== "weld" || S.orbitWeld; S.warn = []; panel(); hint(); }
  /* ---- tornio: profilo del pezzo ---- */
  const LT = { N: 80, L: 0.1, r: [], D0: 25, on: false, rpm: 800, f: 0.1, ap: 0.5, Lc: 40, tool: "hss", pass: null, burnt: false, res: null, target: 12, cuts: 0 };
  function latheStock(D) { LT.D0 = D; LT.r = new Array(LT.N + 1).fill(D / 2000); LT.cuts = 0; LT.burnt = false; latheGeo(); }
  function latheGeo() { const pts = [new THREE.Vector2(0.0001, 0)]; for (let i = 0; i <= LT.N; i++) { const y = i / LT.N * LT.L; pts.push(new THREE.Vector2(LT.r[i], y)); if (i < LT.N && Math.abs(LT.r[i] - LT.r[i + 1]) > 1e-6) pts.push(new THREE.Vector2(LT.r[i + 1], y + 1e-5)); } pts.push(new THREE.Vector2(0.0001, LT.L)); if (R.work.geometry) R.work.geometry.dispose(); R.work.geometry = new THREE.LatheGeometry(pts, 48); }
  function curD(fromEnd) { const i = Math.max(0, Math.min(LT.N, Math.round(LT.N - fromEnd / (LT.L * 1000) * LT.N))); return LT.r[i] * 2000; }
  function lathePart() { let V = 0; for (let i = 0; i < LT.N; i++) V += Math.PI * Math.pow(LT.r[i] * 1000, 2) * (LT.L * 1000 / LT.N); return V; }
  function latheStart() {
    if (!LT.on) { S.warn = ["Accendi il mandrino prima di avanzare con l'utensile."]; panel(); return; } if (LT.pass) return; if (LT.burnt) { S.warn = ["L'utensile è bruciato: premi \"Cambia utensile\"."]; panel(); return; }
    const res = MET.lathe({ metal: S.metal, D: Math.max(...LT.r) * 2000, rpm: LT.rpm, f: LT.f, ap: LT.ap, tool: LT.tool, L: LT.Lc }); LT.res = res;
    const i0 = Math.round(LT.N - LT.Lc / (LT.L * 1000) * LT.N); let rmax = 0; for (let i = Math.max(0, i0); i <= LT.N; i++) rmax = Math.max(rmax, LT.r[i]);
    const rt = Math.max(0.0015, rmax - LT.ap / 1000); LT.pass = { i0: Math.max(0, i0), rt, k: LT.N, dur: Math.max(1.2, Math.min(5, res.tmin * 60 / 8)) };
    S.warn = res.warn.slice(); if (res.vcReal > res.vc * 1.6 && LT.tool === "hss") { LT.burnt = true; S.warn.unshift("Utensile in HSS bruciato: velocità di taglio " + Math.round(res.vcReal) + " m/min, il doppio del consentito."); R.tool.material = new THREE.MeshStandardMaterial({ color: 0x2a3d8f, metalness: 1, roughness: 0.3 }); }
    panel();
  }
  function latheStep(dt) {
    if (LT.on) R.chuck.rotation.x += Math.min(LT.rpm, 600) / 60 * 2 * Math.PI * dt * (rm ? 0.2 : 1), R.work.rotation.y += Math.min(LT.rpm, 600) / 60 * 2 * Math.PI * dt * (rm ? 0.2 : 1);
    const P = LT.pass; if (!P) return;
    const speed = (LT.N - P.i0 + 1) / P.dur; P.k -= speed * dt; const k = Math.max(P.i0, Math.floor(P.k));
    let ch = false; for (let i = Math.min(LT.N, Math.ceil(P.k + speed * dt) + 1); i >= k; i--) if (LT.r[i] > P.rt) { LT.r[i] = P.rt; ch = true; }
    const zW = -0.17 + (k / LT.N) * LT.L; R.car.position.x = zW - 0.0; R.tool.position.z = -0.045 + 0.0;
    if (ch) { latheGeo(); const g = groups.lathe, cp = g.localToWorld(V3(zW, 1.02 + P.rt, 0.0)), steel = /s235|s355|c45|42cr/.test(S.metal), hot = LT.res && LT.res.vcReal > LT.res.vc * 1.2; for (let n = 0; n < 3; n++) spawn(cp, V3((Math.random() - 0.5) * 0.3, 0.3 + Math.random() * 0.4, 0.3 + Math.random() * 0.3), hot && steel ? "#3a62d8" : steel ? "#d9b26a" : "#e8ecef", 1.4, 6); }
    if (P.k <= P.i0) { LT.pass = null; LT.cuts++; const r = LT.res; S.last = "Passata " + LT.cuts + ": Ø" + curD(LT.Lc * 0.5).toFixed(2).replace(".", ",") + " mm · " + Math.round(LT.rpm) + " giri/min (ideale " + Math.round(r.n) + ") · Vc " + Math.round(r.vcReal) + " m/min · Ra ≈ " + r.Ra.toFixed(1).replace(".", ",") + " µm · " + Math.round(r.Pc * 1000) + " W"; R.car.position.x = 0.05; panel(); }
  }
  /* ---- smerigliatrice, trapano, sega ---- */
  const GR = { disc: "cut1", rpm: 11000, mode: "cut", safe: { occhiali: true, guanti: true, cuffie: false, carter: true }, prog: 0, hold: false };
  const DR = { d: 8, rpm: 880, lube: true, prog: 0, heat: 0, hold: false, burnt: false, holes: 0 };
  const SW = { vb: 50, prog: 0, hold: false, prof: "rt4040", L: 300 };
  // profili commerciali per la sega: il pezzo tagliato diventa un link utilizzabile nell'Area di assemblaggio
  const PROF = { rt4040: { n: "Tubo quadro 40×40×3", sec: "rtube", B: 40, H: 40, tw: 3 }, rt6040: { n: "Tubo rettangolare 60×40×3", sec: "rtube", B: 40, H: 60, tw: 3 }, rt5050: { n: "Tubo quadro 50×50×4", sec: "rtube", B: 50, H: 50, tw: 4 }, t50: { n: "Tubo tondo Ø50×4", sec: "tube", D: 50, tw: 4 }, t60: { n: "Tubo tondo Ø60×5", sec: "tube", D: 60, tw: 5 }, t80: { n: "Tubo tondo Ø80×5", sec: "tube", D: 80, tw: 5 }, p5012: { n: "Piatto 50×12", sec: "rect", B: 12, H: 50 }, r40: { n: "Tondo pieno Ø40", sec: "round", D: 40 } };
  function profArea(pr) { const d = pr.sec === "rtube" ? pr.B * pr.H - (pr.B - 2 * pr.tw) * (pr.H - 2 * pr.tw) : pr.sec === "tube" ? Math.PI / 4 * (pr.D * pr.D - Math.pow(pr.D - 2 * pr.tw, 2)) : pr.sec === "rect" ? pr.B * pr.H : Math.PI / 4 * pr.D * pr.D; return d; }
  function sawPart() { const pr = PROF[SW.prof] || PROF.rt4040, m = MET.get(S.metal), kg = m.rho * profArea(pr) * 1e-6 * SW.L / 1000; const part = { n: pr.n + " × " + SW.L + " mm", metal: m.n, metalId: S.metal, sec: pr.sec, D: pr.D, B: pr.B, H: pr.H, tw: pr.tw, L: SW.L, kg, use: "link / struttura del braccio", t: Date.now() }; S.parts.push(part); save(); env.onPart && env.onPart(part); env.toast && env.toast("Pezzo tagliato e salvato: " + part.n); return part; }
  function grindStep(dt) {
    R.disc.rotation.y += (GR.hold ? 60 : 0) * dt * (rm ? 0.1 : 1);
    if (!GR.hold) { R.grinder.position.lerp(R.gr0, Math.min(1, dt * 6)); return; }
    const res = MET.grinder({ disc: GR.disc, rpm: GR.rpm, metal: S.metal, mode: GR.mode }); const m = MET.get(S.metal);
    if (res.v > MET.DISCS[GR.disc].vmax) { GR.hold = false; S.warn = res.warn; panel(); return; }
    const tgt = R.gr0.clone(); tgt.y -= 0.06; R.grinder.position.lerp(tgt, Math.min(1, dt * 5));
    GR.prog += dt * (GR.mode === "cut" ? 0.35 : 0.6) * 200 / (m.HB + 60) * (GR.disc === "cut1" ? 1.2 : 1);
    const g = groups.metal, cp = g.localToWorld(V3(-0.05, 1.11, 0.12));
    if (res.spark > 0) for (let n = 0; n < 6 * res.spark; n++) spawn(cp, V3(0.4 + Math.random() * 1.2, 0.2 + Math.random() * 1.0, (Math.random() - 0.5) * 0.8).applyAxisAngle(V3(0, 1, 0), g.rotation.y), res.sparkCol, 0.6 + Math.random() * 0.5, 4);
    else if (Math.random() < 0.5) spawn(cp, V3(Math.random() * 0.3, 0.1, (Math.random() - 0.5) * 0.3), "#cfd4d8", 0.6, 9.8);
    if (GR.prog >= 1) { GR.prog = 0; GR.hold = false; if (GR.mode === "cut") { R.barLen = Math.max(0.15, R.barLen - 0.08); R.bar.scale.y = R.barLen / 0.6; R.bar.position.x = 0.15 - (0.6 - R.barLen) / 2; } S.last = (GR.mode === "cut" ? "Taglio completato" : "Sbavatura completata") + " su " + m.n + " · velocità periferica " + res.v.toFixed(0) + " m/s" + (res.spark ? " · scintille " + (m.id === "ti5" ? "bianche abbaglianti (titanio)" : m.id === "ghisa" ? "rosse corte (ghisa)" : "arancioni lunghe") : " · niente scintille: metallo non ferroso"); panel(); }
  }
  function drillStep(dt) {
    const ideal = MET.drill({ metal: S.metal, d: DR.d }), q = R.quill;
    if (!DR.hold) { q.position.y += (R.q0 - q.position.y) * Math.min(1, dt * 5); DR.heat = Math.max(0, DR.heat - dt * 0.3); return; }
    if (DR.burnt) { DR.hold = false; S.warn = ["Punta bruciata (colore blu): affilala o sostituiscila."]; panel(); return; }
    const ratio = DR.rpm / ideal.n, m = MET.get(S.metal); const rate = ideal.f * DR.rpm / 60 / 10 * (ratio < 0.5 ? 0.5 : 1); DR.prog += rate * dt;
    DR.heat += dt * Math.max(0, ratio - 1.1) * (DR.lube ? 0.6 : 1.4) * (m.HB / 150);
    if (DR.heat > 1) { DR.burnt = true; R.bitMat.color.set(0x2a3d8f); DR.hold = false; S.warn = ["Troppi giri: " + DR.rpm + " contro " + Math.round(ideal.n) + " ideali. La punta si è surriscaldata."]; panel(); }
    q.position.y = R.q0 - 0.03 - Math.min(1, DR.prog) * 0.012; R.bit.rotation.y += 30 * dt;
    const g = groups.drill, cp = g.localToWorld(V3(0, 0.81, 0.07)); if (Math.random() < 0.6) spawn(cp, V3((Math.random() - 0.5) * 0.4, 0.3, (Math.random() - 0.5) * 0.4), /al/.test(S.metal) ? "#e8ecef" : "#c9a46a", 1.2, 9.8);
    if (DR.prog >= 1) { DR.prog = 0; DR.hold = false; DR.holes++; const h = cyl(DR.d / 2000, DR.d / 2000, 0.012, new THREE.MeshBasicMaterial({ color: 0x050505 }), 0, 0.8, 0.07, R.dholes); h.position.x = -0.06 + (DR.holes % 5) * 0.03; R.dplate.position.x = 0; R.dholes.children.forEach((o, i) => { o.position.x = -0.06 + (i % 5) * 0.03; }); S.last = "Foro Ø" + DR.d + " mm in " + m.n + " a " + DR.rpm + " giri/min (ideale ≈ " + Math.round(ideal.n) + ", avanzamento " + ideal.f.toFixed(2).replace(".", ",") + " mm/giro, coppia " + ideal.torque.toFixed(1).replace(".", ",") + " N·m). Lubrificante consigliato: " + ideal.cool + "."; panel(); }
  }
  const SAWV = { s235: 45, s355: 40, c45: 35, "42crmo4": 30, aisi304: 25, aisi316: 22, ghisa: 30, al6082: 300, al6061: 300, al7075: 250, al5083: 300, cu: 120, ottone: 150, bronzo: 60, ti5: 15, pb: 200, w: 10, wcu: 20 };
  function sawStep(dt) {
    if (!SW.hold) { R.sawArm.rotation.z += (0 - R.sawArm.rotation.z) * Math.min(1, dt * 4); return; }
    const ideal = SAWV[S.metal] || 40, ratio = SW.vb / ideal; SW.prog += dt * 0.25 * (ratio > 1.5 ? 1.2 : ratio < 0.6 ? 0.4 : 1); R.sawArm.rotation.z = -Math.min(1, SW.prog) * 0.12; R.sawBlade.position.x = 0.3 + Math.sin(performance.now() / 30) * 0.002;
    const g = groups.saw, cp = g.localToWorld(V3(0, 0.62, 0)); if (Math.random() < 0.5) spawn(cp, V3((Math.random() - 0.5) * 0.2, 0.15, 0.2), "#c9a46a", 1, 9.8);
    if (SW.prog >= 1) { SW.prog = 0; SW.hold = false; const pt = sawPart(); S.last = "Taglio di " + pt.n + " con la sega a nastro a " + SW.vb + " m/min (consigliati ≈ " + ideal + " m/min per " + MET.get(S.metal).n + ")" + (ratio > 1.5 ? ": troppo veloce, la lama si scalda e perde i denti." : ratio < 0.6 ? ": lento ma sicuro." : ": ottimo."); panel(); }
  }
  /* ---- saldatura manuale ---- */
  const WD = { proc: "mig", t: 3, I: 0, stick: 12, pre: false, arc: false, path: [], lastX: null, lastT: 0, dist: 0, vs: [], res: null, orbit: false };
  function weldReset() { R.bead.count = 0; R.bead.instanceMatrix.needsUpdate = true; WD.res = null; WD.path = []; }
  function weldSet() { const s = MET.weldSetup(WD.proc, S.metal, WD.t); WD.I = s.I; WD.stick = Math.round((s.stick[0] + s.stick[1]) / 2); }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), mtx = new THREE.Matrix4(), tq = new THREE.Quaternion(), ts = new THREE.Vector3(), tp = new THREE.Vector3();
  function weldAt(ev, dtMs) {
    const rc = canvas.getBoundingClientRect(); ndc.set((ev.clientX - rc.left) / rc.width * 2 - 1, -(ev.clientY - rc.top) / rc.height * 2 + 1); ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects([R.plateA, R.plateB], false)[0]; if (!hit) { WD.arc = false; R.arc.intensity = 0; return; }
    const g = R.weldG, lp = g.worldToLocal(hit.point.clone()); lp.z = Math.max(-0.01, Math.min(0.01, lp.z)); lp.x = Math.max(-0.15, Math.min(0.15, lp.x));
    R.torch.position.set(lp.x, 0.859 + WD.stick / 1000, lp.z); R.torch.rotation.set(0, 0, 0.3);
    WD.arc = true; R.arc.position.set(lp.x, 0.87, lp.z);
    const now = performance.now(); if (WD.lastX != null) { const dx = Math.abs(lp.x - WD.lastX) * 1000, dt = Math.max(1, now - WD.lastT) / 1000; const v = dx / dt * 60 / 10; WD.vs.push(v); if (WD.vs.length > 12) WD.vs.shift(); WD.dist += dx; if (dx > 0.2) WD.path.push(v); }
    WD.lastX = lp.x; WD.lastT = now;
    const vAvg = WD.vs.length ? WD.vs.reduce((a, b) => a + b, 0) / WD.vs.length : 0, s = MET.weldSetup(WD.proc, S.metal, WD.t), b = MET.bead({ proc: WD.proc, metal: S.metal, t: WD.t, v: Math.max(1, vAvg), stick: WD.stick });
    const n = R.bead.count; if (n < 500 && (n === 0 || Math.abs(lp.x - (WD.bx || 0)) > 0.0025)) { WD.bx = lp.x; const w = Math.max(1.5, Math.min(12, b.width * Math.sqrt(WD.I / s.I))) / 1000; ts.set(w * 0.6, w * 0.32, w * 0.5); tp.set(lp.x, 0.859 + w * 0.12, 0); mtx.compose(tp, tq, ts); R.bead.setMatrixAt(n, mtx); R.beadHeat[n] = 1; R.bead.count = n + 1; R.bead.instanceMatrix.needsUpdate = true; }
    if (WD.proc === "mig") for (let k = 0; k < 2; k++) spawn(g.localToWorld(V3(lp.x, 0.862, lp.z)), V3((Math.random() - 0.5) * 0.8, 0.3 + Math.random() * 0.6, (Math.random() - 0.5) * 0.8), "#ffcf7a", 0.35, 9.8);
  }
  function weldEnd() {
    if (!WD.arc && !WD.path.length) return; WD.arc = false; R.arc.intensity = 0; WD.lastX = null;
    if (WD.path.length < 4) { S.warn = ["Passata troppo corta: trascina la torcia lungo il giunto tenendo premuto."]; WD.path = []; panel(); return; }
    const v = WD.path.reduce((a, b) => a + b, 0) / WD.path.length, sd = Math.sqrt(WD.path.reduce((a, b) => a + (b - v) * (b - v), 0) / WD.path.length), s = MET.weldSetup(WD.proc, S.metal, WD.t);
    const b = MET.bead({ proc: WD.proc, metal: S.metal, t: WD.t, v, stick: WD.stick, pre: WD.pre ? s.pre : 0 }); let score = b.score; const why = b.why.slice();
    if (sd > v * 0.45) { score -= 15; why.push("Velocità irregolare: il cordone viene a onde. Muovi la torcia con ritmo costante."); }
    if (WD.I < s.I * 0.75) { score -= 20; why.push("Corrente bassa (" + WD.I + " A, consigliati " + s.I + "): poca penetrazione, incollatura."); } else if (WD.I > s.I * 1.3) { score -= 20; why.push("Corrente alta (" + WD.I + " A): rischio di sfondare la lamiera da " + WD.t + " mm."); }
    score = Math.max(0, Math.min(100, score)); WD.res = { score, v, why, grade: score >= 85 ? "ottimo" : score >= 65 ? "buono" : score >= 40 ? "difettoso" : "da rifare", Q: MET.heatInput(s.U, WD.I, v, WD.proc) };
    S.last = "Cordone " + WD.proc.toUpperCase() + " " + WD.res.grade + " (" + score + "/100) · " + Math.round(v) + " mm/min (consigliati ≈ " + s.v + ") · apporto termico " + WD.res.Q.toFixed(2).replace(".", ",") + " kJ/mm"; S.warn = why; WD.path = []; WD.vs = []; panel();
  }
  /* ---- pannello della stazione ---- */
  const mOpts = () => MET.METALS.map(m => `<option value="${m.id}"${m.id === S.metal ? " selected" : ""}>${esc(m.n)}</option>`).join("");
  const sel = (id, arr, v) => `<select data-in="${id}">${arr.map(([a, b]) => `<option value="${a}"${String(a) === String(v) ? " selected" : ""}>${esc(b)}</option>`).join("")}</select>`;
  function hold(id, txt) { return `<button type="button" class="btn sp-hold" data-hold="${id}">${txt}</button>`; }
  function panel() {
    const p = $("#spPanel"), m = MET.get(S.metal); let h = "";
    const last = S.last ? `<p class="sp-last">${esc(S.last)}</p>` : "", warn = S.warn.length ? `<div class="sp-warn">${S.warn.map(w => `<p>⚠️ ${esc(w)}</p>`).join("")}</div>` : "";
    const metalRow = `<label class="lb-f"><span>Metallo</span><select data-in="metal">${mOpts()}</select></label>`;
    if (S.edit) {
      h = `<h3>Personalizza lo spazio</h3><div class="lb-fields"><label class="lb-f"><span>Pavimento</span>${sel("floor", Object.entries(FLOORS), S.floor)}</label><label class="lb-f"><span>Pareti</span>${sel("wall", Object.entries(WALLS), S.wall)}</label></div>
        <p class="note">${S.sel ? "Selezionato: <b>" + esc(ITEMS.find(i => i.id === S.sel).n) + "</b>. Trascina sul pavimento per spostarlo." : "Tocca un banco o una macchina per selezionarlo, poi trascinalo sul pavimento."}</p>
        <div class="row">${S.sel ? `<button type="button" class="btn sm" data-sp="rot">⟳ Ruota 90°</button>` : ""}<button type="button" class="btn sm ghost" data-sp="resetlay">Disposizione iniziale</button><button type="button" class="btn sm" data-sp="edit">Fatto</button></div>`;
    } else if (!S.station) {
      h = `<h3>Il mio spazio</h3><p>Il tuo laboratorio dei metalli: tocca una macchina nella stanza o un pulsante qui sopra per avvicinarti. Con <b>Personalizza</b> sposti i banchi e scegli pavimento e pareti (la disposizione viene salvata).</p><div class="kv"><div><small>Metallo attivo</small><b>${esc(m.n)}</b></div><div><small>Pezzi realizzati</small><b>${S.parts.length}</b></div></div>` + (S.parts.length ? `<h4>Inventario pezzi</h4><ul class="sp-inv">${S.parts.slice(-8).reverse().map(x => `<li><b>${esc(x.n)}</b> <small>${esc(x.metal)} · ${x.kg.toFixed(3).replace(".", ",")} kg · ${esc(x.use)}</small></li>`).join("")}</ul>` : "");
    } else if (S.station === "grind") {
      const r = MET.grinder({ disc: GR.disc, rpm: GR.rpm, metal: S.metal, mode: GR.mode }), miss = Object.keys(GR.safe).filter(k => !GR.safe[k]);
      h = `<h3>Banco metalli · smerigliatrice angolare 125 mm</h3><div class="lb-fields">${metalRow}<label class="lb-f"><span>Disco</span>${sel("disc", Object.entries(MET.DISCS).map(([k, d]) => [k, d.n]), GR.disc)}</label><label class="lb-f"><span>Giri/min</span>${sel("grpm", [[8500, "8 500"], [11000, "11 000"], [12000, "12 000"], [13300, "13 300 (oltre il limite dei dischi da 125)"]], GR.rpm)}</label><label class="lb-f"><span>Lavoro</span>${sel("gmode", [["cut", "Taglio"], ["grind", "Sbavatura"]], GR.mode)}</label></div>
        <div class="sp-safe">${Object.keys(GR.safe).map(k => `<label class="lb-f chk"><input type="checkbox" data-safe="${k}"${GR.safe[k] ? " checked" : ""}><span>${{ occhiali: "Occhiali", guanti: "Guanti", cuffie: "Cuffie antirumore", carter: "Carter di protezione" }[k]}</span></label>`).join("")}</div>
        <div class="kv"><div><small>Velocità periferica</small><b>${r.v.toFixed(0)} m/s</b></div><div><small>Massimo del disco</small><b>${MET.DISCS[GR.disc].vmax} m/s</b></div><div><small>Durezza</small><b>${m.HB} HB</b></div></div>
        ${miss.length ? `<div class="sp-warn"><p>⚠️ Mancano: ${miss.map(esc).join(", ")}. Una scheggia di disco viaggia a oltre 250 km/h.</p></div>` : ""}${r.warn.map(w => `<div class="sp-warn"><p>⚠️ ${esc(w)}</p></div>`).join("")}${hold("grind", GR.mode === "cut" ? "Tieni premuto per tagliare" : "Tieni premuto per sbavare")}<div class="lb-tbar"><i data-prog="grind"></i></div>`;
    } else if (S.station === "drill") {
      const id = MET.drill({ metal: S.metal, d: DR.d });
      h = `<h3>Trapano a colonna 16 mm</h3><div class="lb-fields">${metalRow}<label class="lb-f"><span>Punta HSS</span>${sel("dd", [3, 4, 5, 6, 6.8, 8, 8.5, 10, 12, 13, 16].map(v => [v, "Ø " + String(v).replace(".", ",") + " mm"]), DR.d)}</label><label class="lb-f"><span>Velocità (cinghia)</span>${sel("drpm", MET.DRILL.press.rpm.map(v => [v, v + " giri/min"]), DR.rpm)}</label><label class="lb-f chk"><input type="checkbox" data-in="lube"${DR.lube ? " checked" : ""}><span>Olio da taglio</span></label></div>
        <div class="kv"><div><small>Giri ideali</small><b>${Math.round(id.n)} giri/min</b></div><div><small>Avanzamento</small><b>${id.f.toFixed(2).replace(".", ",")} mm/giro</b></div><div><small>Coppia</small><b>${id.torque.toFixed(1).replace(".", ",")} N·m</b></div><div><small>Lubrificazione</small><b>${esc(id.cool)}</b></div>${id.pilot ? `<div><small>Foro pilota</small><b>Ø ${id.pilot} mm</b></div>` : ""}</div>
        ${DR.burnt ? `<button type="button" class="btn sm ghost" data-sp="newbit">Cambia punta</button>` : ""}${hold("drill", "Tieni premuto per forare")}<div class="lb-tbar"><i data-prog="drill"></i></div>`;
    } else if (S.station === "lathe") {
      const r = MET.lathe({ metal: S.metal, D: Math.max(...LT.r) * 2000, rpm: LT.rpm, f: LT.f, ap: LT.ap, tool: LT.tool, L: LT.Lc });
      h = `<h3>Mini tornio 180×300 · ${MET.LATHE.P} W</h3><div class="lb-fields">${metalRow}<label class="lb-f"><span>Barra grezza</span>${sel("stock", [10, 12, 16, 20, 25, 30, 40, 50].map(v => [v, "Ø " + v + " mm"]), LT.D0)}</label><label class="lb-f"><span>Utensile</span>${sel("ltool", [["hss", "HSS (acciaio rapido)"], ["hm", "Inserto in metallo duro"]], LT.tool)}</label>
        <label class="lb-f"><span>Giri mandrino <b>${LT.rpm}</b></span><input type="range" data-in="lrpm" min="50" max="2500" step="10" value="${LT.rpm}"></label><label class="lb-f"><span>Avanzamento</span>${sel("lf", MET.LATHE.feeds.map(v => [v, String(v).replace(".", ",") + " mm/giro"]), LT.f)}</label><label class="lb-f"><span>Profondità di passata</span>${sel("lap", [0.1, 0.2, 0.3, 0.5, 0.8, 1, 1.5, 2, 3].map(v => [v, String(v).replace(".", ",") + " mm"]), LT.ap)}</label><label class="lb-f"><span>Lunghezza da tornire</span>${sel("lc", [10, 20, 30, 40, 60, 80, 100].map(v => [v, v + " mm"]), LT.Lc)}</label></div>
        <div class="kv"><div><small>Giri ideali (Ø ${Math.round(Math.max(...LT.r) * 2000)})</small><b>${Math.round(r.n)}</b></div><div><small>Vc reale / consigliata</small><b>${Math.round(r.vcReal)} / ${r.vc} m/min</b></div><div><small>Potenza</small><b>${Math.round(r.Pc * 1000)} W</b></div><div><small>Rugosità teorica</small><b>Ra ${r.Ra.toFixed(1).replace(".", ",")} µm</b></div><div><small>Ø all'estremità</small><b>${curD(2).toFixed(2).replace(".", ",")} mm</b></div><div><small>Massa pezzo</small><b>${MET.mass(S.metal, lathePart()).toFixed(3).replace(".", ",")} kg</b></div></div>
        <div class="row"><button type="button" class="btn sm${LT.on ? " danger" : ""}" data-sp="spindle">${LT.on ? "■ Ferma mandrino" : "▶ Avvia mandrino"}</button><button type="button" class="btn sm" data-sp="pass">Esegui passata</button><button type="button" class="btn sm ghost" data-sp="newtool">Cambia utensile</button><button type="button" class="btn sm ghost" data-sp="savepart">Salva pezzo</button></div>`;
    } else if (S.station === "weld") {
      const s = MET.weldSetup(WD.proc, S.metal, WD.t);
      h = `<h3>Saldatura manuale ${WD.proc.toUpperCase()}</h3><div class="lb-fields">${metalRow}<label class="lb-f"><span>Processo</span>${sel("wproc", [["mig", "MIG/MAG (filo continuo)"], ["tig", "TIG (tungsteno + bacchetta)"]], WD.proc)}</label><label class="lb-f"><span>Spessore lamiera</span>${sel("wt", [1, 1.5, 2, 3, 4, 5, 6].map(v => [v, String(v).replace(".", ",") + " mm"]), WD.t)}</label>
        <label class="lb-f"><span>Corrente <b>${WD.I} A</b></span><input type="range" data-in="wI" min="10" max="300" step="5" value="${WD.I}"></label><label class="lb-f"><span>${WD.proc === "tig" ? "Distanza elettrodo-pezzo" : "Stick-out del filo"} <b>${WD.stick} mm</b></span><input type="range" data-in="wst" min="1" max="25" step="1" value="${WD.stick}"></label>${s.pre ? `<label class="lb-f chk"><input type="checkbox" data-in="wpre"${WD.pre ? " checked" : ""}><span>Preriscaldo a ${s.pre} °C</span></label>` : ""}</div>
        <div class="kv"><div><small>Consigliati</small><b>${s.I} A${WD.proc === "mig" ? " · " + s.U + " V · filo " + String(s.wfs).replace(".", ",") + " m/min" : ""}</b></div><div><small>Velocità</small><b>≈ ${s.v} mm/min</b></div><div><small>${WD.proc === "tig" ? "Distanza" : "Stick-out"}</small><b>${s.stick[0]}–${s.stick[1]} mm</b></div><div><small>Gas / filo</small><b>${esc(s.gas)} · ${esc(s.wire)}</b></div></div>
        <p class="note">Trascina il dito (o il mouse) sul giunto tra le due lamiere: tieni premuto per l'arco e muoviti con ritmo costante. Il tempo è accelerato ×10. ${m.weld === 0 ? "<b>Attenzione: " + esc(m.n) + " non è saldabile per fusione.</b>" : ""}</p>
        <div class="row"><button type="button" class="btn sm ghost" data-sp="wclr">Nuove lamiere</button><button type="button" class="btn sm ghost" data-sp="worbit" aria-pressed="${!!S.orbitWeld}">${S.orbitWeld ? "Blocca la vista" : "Ruota la vista"}</button></div>`;
    } else if (S.station === "saw") {
      h = `<h3>Sega a nastro</h3><div class="lb-fields">${metalRow}<label class="lb-f"><span>Velocità lama</span>${sel("vb", [20, 35, 50, 80, 150, 300].map(v => [v, v + " m/min"]), SW.vb)}</label><label class="lb-f"><span>Profilo</span>${sel("sprof", Object.entries(PROF).map(([k, x]) => [k, x.n]), SW.prof)}</label><label class="lb-f"><span>Lunghezza di taglio</span>${sel("sL", [60, 80, 120, 150, 200, 250, 300, 350, 400, 500].map(v => [v, v + " mm"]), SW.L)}</label></div><p class="note">Consigliati per ${esc(m.n)}: ≈ ${SAWV[S.metal] || 40} m/min, con lubrorefrigerante su acciai e inox. Almeno 3 denti sempre in presa.</p>${hold("saw", "Tieni premuto per tagliare")}<div class="lb-tbar"><i data-prog="saw"></i></div>`;
    } else if (S.station === "rack") {
      h = `<h3>Rastrelliera dei metalli</h3><p class="note">Tocca un metallo per usarlo in tutte le macchine.</p><div class="sp-metals">${MET.METALS.map(x => `<button type="button" class="sp-m${x.id === S.metal ? " on" : ""}" data-metal="${x.id}"><i data-col="${x.col}"></i><b>${esc(x.n)}</b><small>${x.rho} kg/m³ · ${x.HB} HB · Rm ${x.Rm} MPa · Vc ${x.vcH || "—"}/${x.vcC} m/min · saldabilità ${"●".repeat(x.weld)}${"○".repeat(3 - x.weld)}</small><small>${esc(x.note)}</small></button>`).join("")}</div>`;
    } else if (S.station === "tools") {
      h = `<h3>Parete attrezzi</h3><ul class="sp-inv">${HAND.map(([a, b]) => `<li><b>${esc(a)}</b><small>${esc(b)}</small></li>`).join("")}</ul>`;
    } else if (S.station === "elec") {
      h = `<h3>Banco elettronica</h3><p>Stazione saldante, multimetro e lente: qui progetti e saldi i circuiti.</p><button type="button" class="btn" data-sp="back">Siediti al banco (Tavola elettronica)</button>`;
    }
    p.innerHTML = h + (S.station && S.station !== "rack" && S.station !== "tools" ? last + warn : "");
    p.querySelectorAll("[data-col]").forEach(i => { i.style.background = i.getAttribute("data-col"); });
    env.onChange && env.onChange();
  }
  function hint() { $("#spHint").textContent = S.edit ? "Modalità personalizza: tocca e trascina i banchi." : S.station === "weld" && !S.orbitWeld ? "Trascina sul giunto per saldare." : S.station ? "" : "Trascina per girare la vista, pizzica per lo zoom."; }
  function setMetal(id) { S.metal = id; const mm = metalMat(id); R.bar.material = mm; R.dplate.material = mm; R.plateA.material = mm; R.plateB.material = mm; R.workMat.color.set(MET.get(id).col); R.workMat.roughness = /al|ti|aisi/.test(id) ? 0.32 : 0.45; R.sawBar.material = mm; latheStock(LT.D0); if (WD.I) weldSet(); save(); panel(); }
  /* ---- eventi ---- */
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let down = null;
  function pick(ev) { const rc = canvas.getBoundingClientRect(); ndc.set((ev.clientX - rc.left) / rc.width * 2 - 1, -(ev.clientY - rc.top) / rc.height * 2 + 1); ray.setFromCamera(ndc, camera); const hits = ray.intersectObjects(Object.values(groups), true); for (const h of hits) { let o = h.object; if (o.userData.metal) return { metal: o.userData.metal }; while (o && !o.userData.item) o = o.parent; if (o) return { item: o.userData.item }; } return null; }
  canvas.addEventListener("pointerdown", ev => {
    down = { x: ev.clientX, y: ev.clientY, moved: false, id: ev.pointerId };
    if (S.edit && S.sel) { const h = pick(ev); if (h && h.item === S.sel) { controls.enabled = false; down.drag = true; canvas.setPointerCapture(ev.pointerId); } }
    if (!S.edit && S.station === "weld" && !S.orbitWeld) { canvas.setPointerCapture(ev.pointerId); WD.vs = []; WD.path = []; WD.lastX = null; weldAt(ev); }
  });
  canvas.addEventListener("pointermove", ev => {
    if (!down) return; if (Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 6) down.moved = true;
    if (down.drag) { const rc = canvas.getBoundingClientRect(); ndc.set((ev.clientX - rc.left) / rc.width * 2 - 1, -(ev.clientY - rc.top) / rc.height * 2 + 1); ray.setFromCamera(ndc, camera); const p = new THREE.Vector3(); if (ray.ray.intersectPlane(floorPlane, p)) { const g = groups[S.sel], x = Math.max(-RW / 2 + 0.5, Math.min(RW / 2 - 0.5, p.x)), z = Math.max(-RD / 2 + 0.4, Math.min(RD / 2 - 0.4, p.z)); g.position.set(x, 0, z); S.items[S.sel].x = x; S.items[S.sel].z = z; } return; }
    if (!S.edit && S.station === "weld" && !S.orbitWeld) weldAt(ev);
  });
  function up(ev) {
    const d = down; down = null; if (!d) return;
    if (d.drag) { controls.enabled = true; save(); return; }
    if (!S.edit && S.station === "weld" && !S.orbitWeld) { weldEnd(); if (d.moved) return; }
    if (d.moved) return; const h = pick(ev); if (!h) return;
    if (S.edit) { S.sel = h.item || null; panel(); return; }
    if (h.metal) { setMetal(h.metal); env.toast && env.toast("Metallo: " + MET.get(h.metal).n); if (S.station !== "rack") return; }
    if (h.item) { const it = ITEMS.find(i => i.id === h.item); if (it && it.st !== S.station) go(it.st); }
  }
  canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", () => { if (S.station === "weld") weldEnd(); down = null; controls.enabled = S.station !== "weld" || S.orbitWeld; });
  const holdOn = (k, v) => { if (k === "grind") { if (v && Object.values(GR.safe).some(x => !x)) env.toast && env.toast("Attenzione: dispositivi di protezione mancanti"); GR.hold = v; } if (k === "drill") DR.hold = v; if (k === "saw") SW.hold = v; };
  el.addEventListener("pointerdown", e => { const b = e.target.closest("[data-hold]"); if (!b) return; e.preventDefault(); S.warn = []; holdOn(b.getAttribute("data-hold"), true); b.classList.add("on"); });
  const holdOff = e => { const b = e.target.closest && e.target.closest("[data-hold]"); el.querySelectorAll("[data-hold]").forEach(x => { holdOn(x.getAttribute("data-hold"), false); x.classList.remove("on"); }); };
  el.addEventListener("pointerup", holdOff); el.addEventListener("pointercancel", holdOff); el.addEventListener("pointerleave", holdOff);
  el.addEventListener("click", e => {
    const b = e.target.closest("[data-sp],[data-go],[data-metal]"); if (!b) return;
    if (b.hasAttribute("data-go")) { if (S.edit) { S.edit = false; } go(b.getAttribute("data-go")); el.querySelectorAll("[data-go]").forEach(x => x.classList.toggle("on", x === b)); return; }
    if (b.hasAttribute("data-metal")) { setMetal(b.getAttribute("data-metal")); return; }
    const k = b.getAttribute("data-sp");
    if (k === "back") { env.onBack && env.onBack(); return; }
    if (k === "edit") { S.edit = !S.edit; S.sel = null; $('[data-sp="edit"]').setAttribute("aria-pressed", String(S.edit)); if (S.edit) { S.station = null; flyTo(V3(0.01, 8.5, 2.6), V3(0, 0, 0)); controls.enabled = true; } else overview(); panel(); hint(); return; }
    if (k === "overview") { S.edit = false; overview(); hint(); el.querySelectorAll("[data-go]").forEach(x => x.classList.remove("on")); return; }
    if (k === "rot" && S.sel) { const it = S.items[S.sel]; it.r = (it.r || 0) + Math.PI / 2; groups[S.sel].rotation.y = it.r; save(); return; }
    if (k === "resetlay") { ITEMS.forEach(it => { S.items[it.id] = { x: it.x, z: it.z, r: it.r }; groups[it.id].position.set(it.x, 0, it.z); groups[it.id].rotation.y = it.r; }); save(); panel(); return; }
    if (k === "spindle") { LT.on = !LT.on; panel(); return; }
    if (k === "pass") { latheStart(); return; }
    if (k === "newtool") { LT.burnt = false; R.tool.material = M.carbide; S.warn = []; panel(); return; }
    if (k === "newbit") { DR.burnt = false; DR.heat = 0; R.bitMat.color.set(0x9aa3ab); S.warn = []; panel(); return; }
    if (k === "savepart") { if (!LT.cuts) { env.toast && env.toast("Fai almeno una passata prima di salvare il pezzo."); return; } const dmin = Math.min(...LT.r) * 2000, dmax = Math.max(...LT.r) * 2000, kg = MET.mass(S.metal, lathePart()); const part = { metalId: S.metal, sec: "round", D: Math.round(dmin * 10) / 10, L: Math.round(LT.L * 1000), n: (dmax - dmin > 0.5 ? "Albero a gradini Ø" + dmin.toFixed(1) + "/Ø" + dmax.toFixed(1) : "Perno Ø" + dmax.toFixed(1)) + " × " + LT.L * 1000 + " mm", metal: MET.get(S.metal).n, kg, use: dmin <= 12 ? "perno per giunto (cuscinetti 608/6001)" : "albero / distanziale", t: Date.now() }; S.parts.push(part); save(); env.onPart && env.onPart(part); env.toast && env.toast("Pezzo salvato nell'inventario: " + part.n); latheStock(LT.D0); panel(); return; }
    if (k === "wclr") { weldReset(); S.warn = []; S.last = ""; panel(); return; }
    if (k === "worbit") { S.orbitWeld = !S.orbitWeld; controls.enabled = S.orbitWeld; panel(); hint(); return; }
  });
  el.addEventListener("change", e => { const t = e.target, k = t.getAttribute("data-in"), sf = t.getAttribute("data-safe"); if (sf) { GR.safe[sf] = t.checked; panel(); return; } if (!k) return; const v = t.type === "checkbox" ? t.checked : t.value;
    switch (k) { case "metal": setMetal(v); return; case "floor": setFloor(v); return; case "wall": setWall(v); return; case "disc": GR.disc = v; break; case "grpm": GR.rpm = +v; break; case "gmode": GR.mode = v; break; case "dd": DR.d = +v; break; case "drpm": DR.rpm = +v; break; case "lube": DR.lube = v; break;
      case "stock": latheStock(+v); break; case "ltool": LT.tool = v; break; case "lf": LT.f = +v; break; case "lap": LT.ap = +v; break; case "lc": LT.Lc = +v; break; case "wproc": WD.proc = v; weldSet(); break; case "wt": WD.t = +v; weldSet(); break; case "wpre": WD.pre = v; break; case "vb": SW.vb = +v; break; case "sprof": SW.prof = v; break; case "sL": SW.L = +v; break; }
    panel(); });
  el.addEventListener("input", e => { const t = e.target, k = t.getAttribute("data-in"); if (k === "lrpm") { LT.rpm = +t.value; t.previousElementSibling.querySelector("b").textContent = LT.rpm; } else if (k === "wI") { WD.I = +t.value; t.previousElementSibling.querySelector("b").textContent = WD.I + " A"; } else if (k === "wst") { WD.stick = +t.value; t.previousElementSibling.querySelector("b").textContent = WD.stick + " mm"; R.torch.position.y = 0.859 + WD.stick / 1000; } });
  /* ---- ciclo ---- */
  function resize() { const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null; if (ro) ro.observe(stage);
  let raf = 0, last = 0;
  function frame(dt) {
    if (fly) { fly.t = Math.min(1, fly.t + dt / 0.9); const e = fly.t < 0.5 ? 2 * fly.t * fly.t : 1 - Math.pow(-2 * fly.t + 2, 2) / 2; camera.position.lerpVectors(fly.p0, fly.p1, e); controls.target.lerpVectors(fly.t0, fly.t1, e); if (fly.t >= 1) fly = null; }
    controls.update(); grindStep(dt); drillStep(dt); sawStep(dt); latheStep(dt); stepP(dt);
    if (WD.arc) R.arc.intensity = 3 + Math.random() * (rm ? 0 : 3);
    for (let i = 0; i < R.bead.count; i++) if (R.beadHeat[i] > 0) { R.beadHeat[i] = Math.max(0, R.beadHeat[i] - dt * 0.5); const h = R.beadHeat[i], c = tmpC.set(MET.get(S.metal).col); c.lerp(new THREE.Color(1.0, 0.55, 0.15), h * h); if (/aisi/.test(S.metal) && h < 0.5 && h > 0.1) c.lerp(new THREE.Color(0.75, 0.6, 0.3), 0.4); R.bead.setColorAt(i, c); R.bead.instanceColor.needsUpdate = true; }
    ["grind", "drill", "saw"].forEach(k => { const bar = el.querySelector(`[data-prog="${k}"]`); if (bar) bar.style.width = Math.round(Math.min(1, (k === "grind" ? GR : k === "drill" ? DR : SW).prog) * 100) + "%"; });
    renderer.render(scene, camera);
  }
  function tick(ts) { raf = 0; if (!S.run) return; const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts; frame(dt); raf = requestAnimationFrame(tick); }
  latheStock(25); weldSet(); resize(); overview(); hint();
  return {
    resume() { S.run = true; resize(); last = 0; if (!raf) raf = requestAnimationFrame(tick); },
    pause() { S.run = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    ctx() { const st = S.station, names = { grind: "smerigliatrice", drill: "trapano a colonna", lathe: "mini tornio", weld: "saldatura " + WD.proc.toUpperCase(), saw: "sega a nastro", rack: "rastrelliera metalli", tools: "parete attrezzi", elec: "banco elettronica" }; const tip = st === "lathe" ? "giri ideali " + Math.round(MET.lathe({ metal: S.metal, D: Math.max(...LT.r) * 2000, tool: LT.tool }).n) + " giri/min" : st === "drill" ? "giri ideali " + Math.round(MET.drill({ metal: S.metal, d: DR.d }).n) + " giri/min" : st === "weld" ? "consigliati " + MET.weldSetup(WD.proc, S.metal, WD.t).I + " A, " + MET.weldSetup(WD.proc, S.metal, WD.t).v + " mm/min" : ""; return { station: st ? names[st] : null, metal: MET.get(S.metal).n, last: S.last, warn: S.warn, tip, parts: S.parts.length }; },
    test: { go, setMetal, S, LT, WD, GR, DR, SW, sawPart, latheStart, frame, weldEnd, weldPath(vs) { WD.path = vs.slice(); WD.arc = true; weldEnd(); }, spindle(v) { LT.on = v; }, renderNow() { frame(0.016); }, hold: holdOn },
    dispose() { this.pause(); if (ro) ro.disconnect(); renderer.dispose(); }
  };
}
