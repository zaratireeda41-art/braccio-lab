// Braccio Lab · Tavolo utensili: banco separato con pannello forato, morsa, trapano a colonna e pezzo di prova.
// Ogni utensile ha dati reali (js/tools.js → window.TLS): scegli utensile, inserto/misura, coppia o forza e usalo
// sul pezzo. L'esito (vite serrata, lenta, snervata, impronta spanata, rischio) viene spiegato e salvato.
import * as THREE from "../vendor/three.module.min.js";
import { OrbitControls, RoomEnvironment } from "../vendor/three-addons.min.js";
import * as TX from "../js3d/textures.js?v=5";

const SKEY = "xentriq-braccio-lab-tools-v1";
export function loadToolState() { try { return JSON.parse(localStorage.getItem(SKEY) || "null") || {}; } catch (e) { return {}; } }
const HANDLE = { cacc: 0xe8452c, chiavi: 0xb8c0c8, dina: 0x2a62c9, pinze: 0xd9262b, batt: 0x8a5a2b, lime: 0x2b2f36, misura: 0xc9a227, filett: 0x3a3f45, serr: 0x1d6fe0, elett: 0x1f8a5a, elettr: 0xf0b429 };
export function mountTools(el, env) {
  const TLS = env.TLS, MET = env.MET, esc = env.esc, rm = !!env.reduced, test = !!env.testMode, lite = test || window.innerWidth < 760, f = TLS.f;
  const saved = loadToolState();
  const S = { g: saved.g || "cacc", tool: saved.tool || "cs_ph", target: saved.target || "v_ph2", o: saved.o || {}, log: saved.log || [], q: "", run: false, res: null, anim: 0, stats: saved.stats || { ok: 0, warn: 0, err: 0 }, dmg: saved.dmg || {} };
  function save() { try { localStorage.setItem(SKEY, JSON.stringify({ g: S.g, tool: S.tool, target: S.target, o: S.o, log: S.log.slice(-30), stats: S.stats, dmg: S.dmg })); } catch (e) { /* pieno */ } }
  el.innerHTML = `<div class="tb-wrap"><div><div class="sp-stage tb-stage" id="tbStage"><canvas id="tbCv" aria-label="Tavolo utensili in 3D"></canvas>
      <div class="sp-top"><button type="button" class="btn sm ghost" data-tb="view">Vista banco</button><button type="button" class="btn sm ghost" data-tb="wall">Pannello attrezzi</button><button type="button" class="btn sm ghost" data-tb="piece">Pezzo</button></div>
      <div class="sp-hint" id="tbHint">Tocca un utensile sul pannello o un pezzo sul banco</div></div>
      <div class="card" id="tbUse"></div></div>
    <div class="card"><h3>Catalogo utensili <span class="badge">${TLS.TOOLS.length}</span></h3><input type="text" id="tbQ" placeholder="Cerca: torx, dinamometrica, seeger…" aria-label="Cerca utensile" class="tb-q">
      <div class="tb-tg" id="tbG">${TLS.GROUPS.map(g => `<button type="button" class="chip" data-tbg="${g.id}">${esc(g.n)}</button>`).join("")}</div><div class="tb-cat" id="tbCat"></div>
      <h3>Registro</h3><div id="tbLog"></div></div></div>`;
  const $ = s => el.querySelector(s), canvas = $("#tbCv"), stage = $("#tbStage");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, preserveDrawingBuffer: test, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, test ? 1 : 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.enabled = !lite;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x15181c);
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5;
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 40); const controls = new OrbitControls(camera, canvas); controls.enableDamping = !rm; controls.maxPolarAngle = Math.PI * 0.49; controls.minDistance = 0.12; controls.maxDistance = 5;
  scene.add(new THREE.HemisphereLight(0xeef2ff, 0x2a2622, 0.7)); const sun = new THREE.DirectionalLight(0xfff2e0, 1.6); sun.position.set(1.2, 2.6, 1.6); sun.castShadow = !lite; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -1.5, right: 1.5, top: 1.5, bottom: -1.5 }); scene.add(sun);
  const lamp = new THREE.PointLight(0xfff0d8, 1.2, 3); lamp.position.set(0, 1.7, 0.2); scene.add(lamp);
  const SEG = lite ? 10 : 20, Y = 0.9;
  const mat = (c, m, r) => new THREE.MeshStandardMaterial({ color: c, metalness: m == null ? 0.2 : m, roughness: r == null ? 0.5 : r });
  const steel = mat(0xb9c0c7, 1, 0.3), dark = mat(0x2b2f36, 0.3, 0.5), black = mat(0x141517, 0.2, 0.6), chrome = mat(0xe6eaee, 1, 0.12), brass = mat(0xc9a24a, 1, 0.3);
  function M(geo, m, p, x, y, z) { const o = new THREE.Mesh(geo, m); o.castShadow = o.receiveShadow = !lite; o.position.set(x || 0, y || 0, z || 0); (p || scene).add(o); return o; }
  const box = (w, h, d, m, p, x, y, z) => M(new THREE.BoxGeometry(w, h, d), m, p, x, y, z), cyl = (r1, r2, h, m, p, x, y, z, s) => M(new THREE.CylinderGeometry(r1, r2, h, s || SEG), m, p, x, y, z);
  // stanza e banco
  const floor = M(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ map: TX.concrete(31).map, roughness: 0.9 })); floor.rotation.x = -Math.PI / 2;
  const wood = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#a9773f"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(70,40,15,${0.05 + Math.random() * 0.12})`; g.beginPath(); const y = Math.random() * 256; g.moveTo(0, y); g.bezierCurveTo(80, y + 6, 170, y - 6, 256, y + 3); g.stroke(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1); return t; })();
  box(1.9, 0.05, 0.8, new THREE.MeshStandardMaterial({ map: wood, roughness: 0.7 }), null, 0, Y - 0.025, 0);
  [[-0.9, -0.35], [0.9, -0.35], [-0.9, 0.35], [0.9, 0.35]].forEach(([x, z]) => box(0.06, Y - 0.05, 0.06, dark, null, x, (Y - 0.05) / 2, z));
  box(1.8, 0.03, 0.7, dark, null, 0, 0.25, 0);
  const peg = (() => { const c = document.createElement("canvas"); c.width = 512; c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#c7b18a"; g.fillRect(0, 0, 512, 256); g.fillStyle = "#3b3226"; for (let x = 8; x < 512; x += 16) for (let y = 8; y < 256; y += 16) { g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  box(1.9, 0.9, 0.02, new THREE.MeshStandardMaterial({ map: peg, roughness: 0.8 }), null, 0, Y + 0.55, -0.41);
  box(4, 3, 0.05, mat(0x3a3f45, 0, 0.9), null, 0, 1.5, -0.45);
  // morsa da banco e trapano a colonna (fissi)
  const vise = new THREE.Group(); vise.position.set(0.72, Y, 0.12); scene.add(vise); box(0.16, 0.05, 0.2, mat(0x1d4fa3, 0.4, 0.4), vise, 0, 0.025, 0); box(0.14, 0.09, 0.04, mat(0x1d4fa3, 0.4, 0.4), vise, 0, 0.1, -0.05); box(0.14, 0.09, 0.04, mat(0x1d4fa3, 0.4, 0.4), vise, 0, 0.1, 0.05); cyl(0.008, 0.008, 0.22, steel, vise, 0, 0.07, 0.17).rotation.x = Math.PI / 2;
  const press = new THREE.Group(); press.position.set(-0.75, Y, -0.22); scene.add(press); box(0.24, 0.03, 0.3, dark, press, 0, 0.015, 0.02); cyl(0.022, 0.022, 0.62, chrome, press, 0, 0.32, -0.1); box(0.14, 0.14, 0.24, mat(0x2a7a4a, 0.3, 0.4), press, 0, 0.58, 0.0); const chuck = cyl(0.016, 0.01, 0.06, steel, press, 0, 0.47, 0.07); const bit = cyl(0.0034, 0.0034, 0.07, mat(0x9aa3ab, 1, 0.3), press, 0, 0.41, 0.07, 8);
  const pTable = box(0.16, 0.012, 0.16, dark, press, 0, 0.2, 0.07); const plate = box(0.1, 0.01, 0.06, mat(0x8a8f96, 1, 0.45), press, 0, 0.212, 0.07);
  /* ---------- utensili procedurali sul pannello ---------- */
  function toolMesh(t) {
    const g = new THREE.Group(), hc = mat(HANDLE[t.g] || 0xe8452c, 0.1, 0.45);
    switch (t.icon) {
      case "screwdriver": cyl(0.014, 0.012, 0.1, hc, g, 0, 0.05, 0); cyl(0.0035, 0.0035, 0.12, chrome, g, 0, 0.16, 0, 8); cyl(0.0035, 0.0012, 0.012, chrome, g, 0, 0.226, 0, 8); break;
      case "hexkey": box(0.006, 0.12, 0.006, mat(0x222, 0.8, 0.4), g, 0, 0.06, 0); box(0.035, 0.006, 0.006, mat(0x222, 0.8, 0.4), g, 0.017, 0.12, 0); break;
      case "wrench": box(0.016, 0.17, 0.004, chrome, g, 0, 0.085, 0); M(new THREE.TorusGeometry(0.012, 0.004, 6, SEG), chrome, g, 0, 0.18, 0); box(0.026, 0.02, 0.004, chrome, g, 0, -0.006, 0); break;
      case "socket": box(0.016, 0.16, 0.008, chrome, g, 0, 0.08, 0); cyl(0.016, 0.016, 0.012, chrome, g, 0, 0.17, 0).rotation.x = Math.PI / 2; for (let i = 0; i < 4; i++) cyl(0.007 + i * 0.002, 0.007 + i * 0.002, 0.025, chrome, g, 0.04 + i * 0.03, 0.05, 0); break;
      case "torque": box(0.018, 0.3, 0.012, hc, g, 0, 0.15, 0); cyl(0.014, 0.014, 0.016, chrome, g, 0, 0.31, 0).rotation.x = Math.PI / 2; box(0.012, 0.06, 0.013, mat(0xffffff, 0, 0.4), g, 0, 0.08, 0.001); break;
      case "pliers": case "crimp": { const a = box(0.012, 0.13, 0.006, hc, g, -0.012, 0.065, 0); a.rotation.z = 0.12; const b = box(0.012, 0.13, 0.006, hc, g, 0.012, 0.065, 0); b.rotation.z = -0.12; box(0.016, 0.05, 0.007, chrome, g, 0, 0.155, 0); cyl(0.005, 0.005, 0.01, chrome, g, 0, 0.13, 0).rotation.x = Math.PI / 2; break; }
      case "hammer": cyl(0.009, 0.009, 0.3, mat(t.soft ? 0x222 : 0xb08a5a, 0.1, 0.6), g, 0, 0.15, 0); (t.soft ? cyl(0.022, 0.022, 0.1, mat(0xd8262b, 0, 0.5), g, 0, 0.3, 0) : box(0.1, 0.03, 0.03, steel, g, 0, 0.3, 0)).rotation.z = Math.PI / 2; break;
      case "punch": cyl(0.006, 0.004, 0.13, steel, g, 0, 0.065, 0); break;
      case "file": box(0.018, 0.2, 0.004, mat(0x5a5f66, 1, 0.8), g, 0, 0.14, 0); cyl(0.01, 0.012, 0.08, hc, g, 0, 0.0, 0); break;
      case "saw": { box(0.32, 0.01, 0.006, hc, g, 0, 0.11, 0); box(0.01, 0.1, 0.006, hc, g, -0.155, 0.06, 0); box(0.01, 0.1, 0.006, hc, g, 0.155, 0.06, 0); box(0.3, 0.012, 0.001, mat(0x9aa3ab, 1, 0.3), g, 0, 0.012, 0); cyl(0.012, 0.014, 0.08, hc, g, -0.19, 0.04, 0).rotation.z = Math.PI / 2; break; }
      case "caliper": box(0.012, 0.22, 0.003, chrome, g, 0, 0.11, 0); box(0.05, 0.01, 0.003, chrome, g, 0.02, 0.215, 0); box(0.05, 0.01, 0.003, chrome, g, 0.02, 0.16, 0); box(0.03, 0.04, 0.01, mat(0x222, 0, 0.4), g, 0, 0.12, 0.004); break;
      case "micrometer": M(new THREE.TorusGeometry(0.035, 0.007, 6, SEG, Math.PI), mat(0xd8262b, 0.2, 0.4), g, 0, 0.05, 0).rotation.z = Math.PI / 2; cyl(0.007, 0.007, 0.06, chrome, g, 0, 0.05, 0).rotation.z = 0; break;
      case "dial": cyl(0.025, 0.025, 0.012, chrome, g, 0, 0.09, 0).rotation.x = Math.PI / 2; cyl(0.003, 0.003, 0.04, chrome, g, 0, 0.05, 0); box(0.04, 0.04, 0.05, mat(0x222, 0.4, 0.4), g, 0, 0.0, 0); break;
      case "square": box(0.15, 0.012, 0.004, steel, g, 0.06, 0.006, 0); box(0.012, 0.1, 0.006, mat(0x222, 0.6, 0.4), g, 0, 0.05, 0); break;
      case "tape": box(0.06, 0.06, 0.03, mat(0xf5c542, 0.1, 0.5), g, 0, 0.03, 0); break;
      case "level": box(0.2, 0.025, 0.02, mat(0x2a62c9, 0.6, 0.3), g, 0, 0.012, 0); cyl(0.005, 0.005, 0.03, mat(0x7cff7c, 0, 0.1), g, 0, 0.026, 0).rotation.z = Math.PI / 2; break;
      case "tap": box(0.18, 0.01, 0.01, dark, g, 0, 0.1, 0); cyl(0.004, 0.004, 0.06, chrome, g, 0, 0.06, 0, 8); break;
      case "rivet": { const a = box(0.014, 0.2, 0.01, hc, g, -0.015, 0.1, 0); a.rotation.z = 0.1; box(0.014, 0.18, 0.01, hc, g, 0.015, 0.09, 0); cyl(0.008, 0.004, 0.03, chrome, g, -0.02, 0.21, 0); break; }
      case "vise": case "clamp": { box(0.012, 0.12, 0.01, hc, g, 0, 0.06, 0); box(0.07, 0.012, 0.01, hc, g, 0.035, 0.12, 0); box(0.07, 0.012, 0.01, hc, g, 0.035, 0.0, 0); cyl(0.004, 0.004, 0.08, steel, g, 0.06, 0.04, 0); break; }
      case "grinder": { cyl(0.03, 0.03, 0.24, mat(0x1f8a5a, 0.2, 0.4), g, 0, 0.12, 0); box(0.06, 0.06, 0.06, dark, g, 0, 0.26, 0); const d = cyl(0.0625, 0.0625, 0.003, mat(0x6b5a4a, 0.1, 0.8), g, 0.0, 0.26, 0.04); d.rotation.x = Math.PI / 2; g.userData.disc = d; M(new THREE.CylinderGeometry(0.068, 0.068, 0.02, SEG, 1, true, 0, Math.PI), steel, g, 0, 0.26, 0.05).rotation.x = Math.PI / 2; break; }
      case "drill": { box(0.05, 0.17, 0.05, mat(0x1f8a5a, 0.2, 0.4), g, 0, 0.085, 0); box(0.07, 0.04, 0.06, black, g, 0, -0.01, 0); box(0.16, 0.06, 0.055, mat(0x1f8a5a, 0.2, 0.4), g, 0.05, 0.19, 0); const ch = cyl(0.016, 0.012, 0.04, chrome, g, 0.15, 0.19, 0); ch.rotation.z = Math.PI / 2; g.userData.chuck = ch; break; }
      case "drillpress": box(0.06, 0.1, 0.06, mat(0x2a7a4a, 0.3, 0.4), g, 0, 0.05, 0); cyl(0.006, 0.006, 0.12, chrome, g, 0, 0.12, 0); break;
      case "heatgun": box(0.05, 0.12, 0.05, mat(0xf0b429, 0.1, 0.5), g, 0, 0.06, 0); cyl(0.022, 0.016, 0.16, mat(0x2b2f36, 0.3, 0.4), g, 0.06, 0.13, 0).rotation.z = Math.PI / 2; break;
      case "meter": box(0.08, 0.15, 0.03, mat(0xf0b429, 0.1, 0.5), g, 0, 0.075, 0); box(0.06, 0.04, 0.005, mat(0x9fd8a8, 0, 0.2), g, 0, 0.11, 0.016); cyl(0.012, 0.012, 0.006, black, g, 0, 0.06, 0.016).rotation.x = Math.PI / 2; break;
      case "solder": box(0.12, 0.08, 0.1, mat(0x2b2f36, 0.3, 0.4), g, 0, 0.04, 0); cyl(0.008, 0.004, 0.16, mat(0x1d6fe0, 0.2, 0.4), g, 0.08, 0.1, 0).rotation.z = 0.6; break;
      default: box(0.03, 0.12, 0.03, hc, g, 0, 0.06, 0);
    }
    return g;
  }
  const toolObj = {}, groups = TLS.GROUPS.map(x => x.id);
  TLS.TOOLS.forEach((t, i) => { const g = toolMesh(t), gi = groups.indexOf(t.g), row = Math.floor(gi / 6), col = gi % 6, idx = TLS.TOOLS.filter(x => x.g === t.g).indexOf(t);
    const x = -0.84 + col * 0.31 + (idx % 4) * 0.07, y = Y + 0.93 - row * 0.45 - Math.floor(idx / 4) * 0.17 - 0.2; g.position.set(x, y, -0.385); g.scale.setScalar(t.icon === "torque" || t.icon === "saw" || t.icon === "hammer" ? 0.55 : t.icon === "grinder" || t.icon === "drill" ? 0.6 : 0.8);
    g.userData.tool = t.id; g.userData.home = g.position.clone(); g.userData.homeRot = g.rotation.clone(); g.userData.homeS = g.scale.x; scene.add(g); toolObj[t.id] = g; });
  /* ---------- pezzi sul banco (bersagli) ---------- */
  function headTex(d) { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"); g.fillStyle = "#c0c6cc"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#1b1d20"; g.strokeStyle = "#1b1d20"; g.lineWidth = 14; g.lineCap = "butt"; const t = d.t;
    if (t === "slot") { g.fillRect(14, 56, 100, 16); } else if (t === "PH" || t === "PZ") { g.fillRect(56, 18, 16, 92); g.fillRect(18, 56, 92, 16); if (t === "PZ") { g.lineWidth = 3; g.beginPath(); g.moveTo(40, 40); g.lineTo(52, 52); g.moveTo(88, 40); g.lineTo(76, 52); g.moveTo(40, 88); g.lineTo(52, 76); g.moveTo(88, 88); g.lineTo(76, 76); g.stroke(); } }
    else if (t === "TX") { g.beginPath(); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, r = i % 2 ? 22 : 40; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } g.closePath(); g.fill(); }
    else if (t === "hex") { g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.lineTo(64 + Math.cos(a) * 34, 64 + Math.sin(a) * 34); } g.closePath(); g.fill(); }
    else if (t === "rob") { g.fillRect(44, 44, 40, 40); }
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx; }
  const tgObj = {}, TG = TLS.TARGETS;
  const fixture = box(0.62, 0.012, 0.16, mat(0x8a8f96, 1, 0.45), null, -0.12, Y + 0.006, 0.2);
  TG.forEach((t, i) => { const g = new THREE.Group(); g.userData.target = t.id; let pos;
    if (t.kind === "screw" || t.kind === "bolt" || t.kind === "nut") { const k = TG.filter(x => /screw|bolt|nut/.test(x.kind)).indexOf(t); pos = [-0.4 + (k % 6) * 0.11, Y + 0.012, 0.15 + Math.floor(k / 6) * 0.08]; const big = /M8|M10|M16/.test(t.th), r = big ? 0.011 : 0.0075;
      if (t.drive.t === "hexhead") { const h = cyl(r * 1.1, r * 1.1, 0.008, steel, g, 0, 0.004, 0, 6); h.userData.head = true; } else { const m2 = new THREE.MeshStandardMaterial({ map: headTex(t.drive), metalness: 0.9, roughness: 0.35 }); const h = cyl(r, r, 0.006, [steel, m2, steel], g, 0, 0.003, 0); h.material = [steel, m2, steel]; h.userData.head = true; }
      if (t.live) { box(0.05, 0.04, 0.03, mat(0x2a62c9, 0.1, 0.5), g, 0, -0.01, 0); const z = box(0.012, 0.001, 0.012, mat(0xffd21a, 0, 0.5), g, 0.018, 0.0105, 0.0); void z; } }
    else { const o = { hole: [-0.75, Y + 0.212, -0.15], thread: [0.72, Y + 0.2, 0.12], tube: [0.72, Y + 0.17, 0.12], bar: [0.5, Y + 0.012, -0.05], shaft: [0.25, Y + 0.03, -0.12], runout: [0.08, Y + 0.03, -0.18], rivet: [-0.45, Y + 0.005, -0.1], bearing: [0.32, Y + 0.012, 0.06], seeger: [0.15, Y + 0.03, 0.05], shrink: [-0.25, Y + 0.01, -0.12], live: [-0.15, Y + 0.04, -0.25], edge: [0.86, Y + 0.17, 0.12] }[t.id] || [0, Y + 0.02, 0]; pos = o;
      switch (t.kind) {
        case "hole": cyl(0.0034, 0.0034, 0.011, black, g, 0, 0, 0, 10); break;
        case "thread": cyl(0.004, 0.004, 0.02, black, g, 0, 0.05, 0, 10); break;
        case "cut": if (t.id === "tube") { const tb = box(0.4, 0.03, 0.03, mat(0x7f858c, 1, 0.5), g, 0.0, 0.0, 0); tb.rotation.y = Math.PI / 2; } else { const b2 = cyl(0.01, 0.01, 0.3, mat(0x7f858c, 1, 0.45), g, 0, 0.0, 0); b2.rotation.z = Math.PI / 2; } break;
        case "measure": case "runout": { const s2 = cyl(0.01, 0.01, 0.22, chrome, g, 0, 0.01, 0); s2.rotation.z = Math.PI / 2; box(0.03, 0.02, 0.04, dark, g, -0.08, -0.01, 0); box(0.03, 0.02, 0.04, dark, g, 0.08, -0.01, 0); break; }
        case "rivet": box(0.1, 0.003, 0.05, mat(0xd3d7dc, 0.9, 0.3), g, 0, 0, 0); box(0.1, 0.003, 0.05, mat(0xd3d7dc, 0.9, 0.3), g, 0.03, 0.003, 0.01); break;
        case "bearing": M(new THREE.TorusGeometry(0.018, 0.006, 8, SEG), chrome, g, 0, 0.006, 0).rotation.x = Math.PI / 2; break;
        case "circlip": { const s3 = cyl(0.01, 0.01, 0.12, chrome, g, 0, 0.01, 0); s3.rotation.z = Math.PI / 2; M(new THREE.TorusGeometry(0.0105, 0.0018, 6, SEG, Math.PI * 1.8), black, g, 0.03, 0.01, 0).rotation.y = Math.PI / 2; break; }
        case "shrink": { const c2 = cyl(0.003, 0.003, 0.25, mat(0xd8262b, 0.1, 0.6), g, 0, 0.004, 0, 8); c2.rotation.z = Math.PI / 2; const sh = cyl(0.006, 0.006, 0.04, mat(0x111111, 0, 0.6), g, 0, 0.004, 0, 10); sh.rotation.z = Math.PI / 2; g.userData.shrink = sh; break; }
        case "volt": box(0.16, 0.06, 0.1, mat(0x30353c, 0.4, 0.4), g, 0, 0, 0); cyl(0.005, 0.005, 0.01, mat(0xd8262b, 0.2, 0.4), g, 0.04, 0.035, 0.05).rotation.x = Math.PI / 2; cyl(0.005, 0.005, 0.01, black, g, 0.06, 0.035, 0.05).rotation.x = Math.PI / 2; break;
        case "burr": box(0.005, 0.034, 0.034, mat(0xa0a6ac, 1, 0.8), g, 0, 0, 0); break;
      } }
    g.position.set(pos[0], pos[1], pos[2]); scene.add(g); tgObj[t.id] = g; const ring = M(new THREE.RingGeometry(0.016, 0.02, 24), new THREE.MeshBasicMaterial({ color: 0xff7a2f, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }), g, 0, 0.012, 0); ring.rotation.x = -Math.PI / 2; g.userData.ring = ring; });
  // scintille e trucioli
  const NP = lite ? 120 : 300, pGeo = new THREE.BufferGeometry(), pPos = new Float32Array(NP * 3), pVel = new Float32Array(NP * 3), pLife = new Float32Array(NP); pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  const sparks = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xffb347, size: 0.006, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(sparks);
  function burst(p, n, col, sp) { sparks.material.color.set(col); for (let i = 0, k = 0; i < NP && k < n; i++) if (pLife[i] <= 0) { k++; pPos[i * 3] = p.x; pPos[i * 3 + 1] = p.y; pPos[i * 3 + 2] = p.z; pVel[i * 3] = (Math.random() - 0.5) * sp; pVel[i * 3 + 1] = Math.random() * sp; pVel[i * 3 + 2] = (Math.random() * 0.5 + 0.5) * sp; pLife[i] = 0.4 + Math.random() * 0.6; } }
  /* ---------- camera ---------- */
  let fly = null; const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  function flyTo(p, t) { if (rm || test) { camera.position.copy(p); controls.target.copy(t); controls.update(); return; } fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: p, t1: t, k: 0 }; }
  function overview() { flyTo(V3(0.0, Y + 0.85, 1.45), V3(0, Y + 0.2, -0.05)); }
  function focusTarget() { const g = tgObj[S.target]; if (!g) return; const p = g.position; flyTo(V3(p.x + 0.12, p.y + 0.26, p.z + 0.34), V3(p.x, p.y, p.z)); }
  /* ---------- pannello ---------- */
  const tool = () => TLS.byId(S.tool), target = () => TLS.target(S.target);
  function optsFor(t, tg) {
    const o = S.o[t.id] = S.o[t.id] || {}, h = [];
    const sel = (k, list, v, lab) => `<label class="lb-f"><span>${lab}</span><select data-to="${k}">${list.map(([a, b]) => `<option value="${esc(String(a))}"${String(a) === String(v) ? " selected" : ""}>${esc(b)}</option>`).join("")}</select></label>`;
    const ops = TLS.options(t); if (ops.length) { if (!o.opt || !ops.some(x => x.v === o.opt)) o.opt = ops[0].v; h.push(sel("opt", ops.map(x => [x.v, x.n]), o.opt, t.icon === "socket" || t.icon === "torque" ? "Bussola / inserto" : "Inserto / misura")); }
    if (t.tq) { if (o.torque == null) o.torque = Math.max(t.tq[0], Math.min(t.tq[1], tg && tg.MA || t.tq[0])); h.push(`<label class="lb-f"><span>Coppia impostata <b>${f(o.torque, 1)} N·m</b></span><input type="range" data-to="torque" min="${t.tq[0]}" max="${t.tq[1]}" step="${t.tq[1] > 50 ? 1 : 0.1}" value="${o.torque}"></label>`); }
    else if (t.clutch) { if (o.clutch == null) o.clutch = 5; h.push(`<label class="lb-f"><span>Frizione <b>${o.clutch >= 22 ? "foratura" : o.clutch}</b></span><input type="range" data-to="clutch" min="1" max="22" step="1" value="${o.clutch}"></label>`); }
    else if (t.d || t.hand) { if (o.force == null) o.force = 0.4; h.push(`<label class="lb-f"><span>Forza della mano <b>${Math.round(o.force * 100)}%</b></span><input type="range" data-to="force" min="0.1" max="1" step="0.05" value="${o.force}"></label>`); }
    if (t.power === "press" || t.power === "drill") { if (o.d == null) o.d = 6.8; if (o.rpm == null) o.rpm = t.power === "press" ? 880 : 1800; h.push(sel("d", [3, 3.3, 4.2, 5, 6, 6.8, 8, 8.5, 10, 10.2].map(v => [v, "Punta Ø" + f(v, 1) + " mm"]), o.d, "Punta")); h.push(sel("rpm", (t.power === "press" ? MET.DRILL.press.rpm : [450, 900, 1400, 1800]).map(v => [v, v + " giri/min"]), o.rpm, "Giri")); h.push(`<label class="lb-f chk"><input type="checkbox" data-to="lube"${o.lube ? " checked" : ""}><span>Olio da taglio</span></label>`); }
    if (t.taps) { if (o.M == null) o.M = 8; h.push(sel("M", t.taps.map(v => [v, "Maschio M" + v]), o.M, "Maschio")); h.push(`<label class="lb-f chk"><input type="checkbox" data-to="lube"${o.lube ? " checked" : ""}><span>Olio da taglio</span></label>`); }
    if (t.tpi) { if (o.tpi == null) o.tpi = t.tpi[0]; h.push(sel("tpi", t.tpi.map(v => [v, "Lama " + v + " TPI (denti/pollice)"]), o.tpi, "Lama")); }
    if (t.power === "grind") { if (!o.disc) o.disc = "cut1"; o.ppe = o.ppe || {}; h.push(sel("disc", Object.entries(MET.DISCS).map(([k, d]) => [k, d.n]), o.disc, "Disco")); h.push(`<div class="sp-safe">${["occhiali", "guanti", "cuffie", "carter"].map(k => `<label class="lb-f chk"><input type="checkbox" data-ppe="${k}"${o.ppe[k] ? " checked" : ""}><span>${k}</span></label>`).join("")}</div>`); }
    if (t.rivets) { if (o.d == null || t.rivets.indexOf(+o.d) < 0) o.d = t.rivets[0]; h.push(sel("d", t.rivets.map(v => [v, "Rivetto Ø" + f(v, 1)]), o.d, "Rivetto")); }
    if (t.heat) { if (o.temp == null) o.temp = 300; h.push(`<label class="lb-f"><span>Temperatura <b>${o.temp} °C</b></span><input type="range" data-to="temp" min="50" max="600" step="10" value="${o.temp}"></label>`); }
    if (t.meter && t.id === "e_multi") { if (!o.meter) o.meter = "VDC"; h.push(sel("meter", [["VDC", "V ⎓ (continua)"], ["VAC", "V ~ (alternata)"], ["A", "A (corrente)"], ["OHM", "Ω (resistenza)"]], o.meter, "Selettore")); }
    return h.join("");
  }
  function panel() {
    const t = tool(), tg = target(), r = S.res;
    const gauge = r && r.torque != null && r.MA ? (() => { const x = Math.min(1.6, r.torque / r.MA); return `<div class="tb-gauge" aria-label="Coppia"><i data-w="${Math.round(x / 1.6 * 100)}"></i><b data-gl="${Math.round(1 / 1.6 * 100)}"></b></div><small>Coppia data ${f(r.torque, 1)} N·m · consigliata ${f(r.MA, 1)} N·m (${Math.round(x * 100)}%)</small>`; })() : "";
    $("#tbUse").innerHTML = `<h3>${esc(t.n)}</h3><table class="tb-spec">${t.spec.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("")}</table><p class="note">✅ Uso corretto: ${esc(t.use)}</p>
      <label class="lb-f"><span>Pezzo su cui lavori</span><select data-tsel="1">${TLS.TARGETS.map(x => `<option value="${x.id}"${x.id === S.target ? " selected" : ""}>${esc(x.n)}${S.dmg[x.id] ? " · " + esc(S.dmg[x.id]) : ""}</option>`).join("")}</select></label>
      <div class="lb-fields">${optsFor(t, tg)}</div>
      <button type="button" class="btn big" data-tb="use">Usa ${esc(t.n.split(" (")[0].toLowerCase())}</button>
      ${r ? `<div class="tb-res ${r.sev}"><b>${r.sev === "ok" ? "✅" : r.sev === "warn" ? "⚠️" : "⛔"} ${esc(r.t)}</b>${r.reading ? `<br>Lettura: <b>${esc(r.reading)}</b>` : ""}<br>${esc(r.why)}${r.fix ? `<br>→ ${esc(r.fix)}` : ""}${gauge}</div><button type="button" class="btn sm ghost" data-tb="ask">Chiedi all'assistente</button> ${S.dmg[S.target] ? `<button type="button" class="btn sm ghost" data-tb="fix">Sostituisci il pezzo</button>` : ""}` : ""}`;
    gstyle($("#tbUse"));
    $("#tbHint").textContent = "Utensile: " + t.n.split(" (")[0] + " · Pezzo: " + tg.n.split(" (")[0];
  }
  function gstyle(box) { box.querySelectorAll("[data-w]").forEach(i => { i.style.width = i.getAttribute("data-w") + "%"; }); box.querySelectorAll("[data-gl]").forEach(i => { i.style.left = i.getAttribute("data-gl") + "%"; }); }
  function catalog() {
    const list = S.q ? TLS.search(S.q) : TLS.TOOLS.filter(t => t.g === S.g);
    el.querySelectorAll("[data-tbg]").forEach(b => b.classList.toggle("on", !S.q && b.getAttribute("data-tbg") === S.g));
    $("#tbCat").innerHTML = list.map(t => `<button type="button" class="tb-it${t.id === S.tool ? " on" : ""}" data-tool="${t.id}"><b>${esc(t.n)}</b><small>${esc(t.spec[0] ? t.spec[0].join(": ") : "")}</small></button>`).join("") || `<p class="note">Nessun utensile trovato.</p>`;
  }
  function log() { $("#tbLog").innerHTML = `<p class="note">Esiti: ✅ ${S.stats.ok} · ⚠️ ${S.stats.warn} · ⛔ ${S.stats.err}</p><ul class="as-ev">${S.log.slice(-8).reverse().map(l => `<li>${l.sev === "ok" ? "✅" : l.sev === "warn" ? "⚠️" : "⛔"} <b>${esc(l.t)}</b><small>${esc(l.tool)} → ${esc(l.tg)}</small></li>`).join("")}</ul>`; }
  function selectTool(id) { if (!TLS.byId(id)) return; S.tool = id; S.res = null; const t = tool(); S.g = t.g; save(); highlight(); panel(); catalog(); }
  function selectTarget(id) { if (!TLS.target(id)) return; S.target = id; S.res = null; save(); highlight(); panel(); focusTarget(); }
  function highlight() { Object.entries(tgObj).forEach(([id, g]) => { g.userData.ring.material.opacity = id === S.target ? 0.9 : 0; const h = g.children.find(c => c.userData.head); if (h) { const ms = Array.isArray(h.material) ? h.material : [h.material]; ms.forEach(m => { if (!m.userData.c0) m.userData.c0 = m.color.clone(); m.color.copy(S.dmg[id] ? new THREE.Color(0xb05040) : m.userData.c0); }); } }); }
  function use() {
    const t = tool(), tg = target(), o = Object.assign({}, S.o[t.id] || {}); const r = TLS.use(t.id, tg.id, o); S.res = r; S.stats[r.sev] = (S.stats[r.sev] || 0) + 1;
    if (r.strip || /snervata|spanata/.test(r.state || "")) S.dmg[tg.id] = r.state || "rovinato"; else if (r.ok && /screw|bolt|nut/.test(tg.kind)) delete S.dmg[tg.id];
    if (tg.kind === "shrink" && r.ok) { const sh = tgObj.shrink.userData.shrink; if (sh) sh.scale.set(1, 1, 1), sh.scale.y = 1, sh.scale.x = 1, sh.scale.z = 1, sh.geometry.scale(1, 1, 1); }
    S.log.push({ t: r.t, sev: r.sev, tool: t.n.split(" (")[0], tg: tg.n.split(" (")[0], at: Date.now() }); save(); animateUse(t, tg, r); highlight(); panel(); log();
    env.toast && env.toast((r.sev === "ok" ? "✅ " : r.sev === "warn" ? "⚠️ " : "⛔ ") + r.t);
    return r;
  }
  let A = null;
  function animateUse(t, tg, r) {
    const g = toolObj[t.id], tgo = tgObj[tg.id]; if (!g || !tgo) return; Object.values(toolObj).forEach(o => { if (o !== g) { o.position.copy(o.userData.home); o.rotation.copy(o.userData.homeRot); o.scale.setScalar(o.userData.homeS); } });
    const p = tgo.position.clone(); const screw = /screw|bolt|nut/.test(tg.kind); const hand = screw ? p.clone().add(V3(0, 0.01, 0)) : p.clone().add(V3(0.02, 0.04, 0.03));
    g.scale.setScalar(1); g.rotation.set(0, 0, 0); if (!screw && (t.icon === "grinder" || t.icon === "drill")) g.rotation.set(0, 0, Math.PI / 2);
    A = { g, from: g.userData.home.clone(), to: hand, k: 0, dur: rm ? 0.01 : 1.4, t, tg, r, spun: 0 };
  }
  function animStep(dt) {
    if (!A) return; A.k += dt / A.dur; const e = Math.min(1, A.k * 2.2), g = A.g;
    g.position.lerpVectors(A.from, A.to, e < 1 ? e * e * (3 - 2 * e) : 1);
    if (e >= 1) { const ph = (A.k - 0.45) * 1.8; if (/screwdriver|hexkey|torque|socket|wrench/.test(A.t.icon)) g.rotation.y += dt * (A.r.strip ? 14 : 5); if (A.t.icon === "grinder" || A.t.icon === "drill") { if (g.userData.disc) g.userData.disc.rotation.y += dt * 40; if (Math.random() < 0.8 && !rm) burst(A.to, A.t.icon === "grinder" ? 6 : 2, A.t.icon === "grinder" ? 0xffb347 : 0xcfd6dc, A.t.icon === "grinder" ? 1.4 : 0.3); } if (A.t.power === "press") { bit.position.y = 0.41 - Math.min(1, ph) * 0.15; bit.rotation.y += dt * 30; if (!rm) burst(V3(press.position.x, Y + 0.22, press.position.z + 0.07), 1, 0xcfd6dc, 0.25); } if (A.t.heat && A.tg.kind === "shrink") { const sh = tgObj.shrink.userData.shrink; if (sh && A.r.ok) { const s = Math.max(0.55, 1 - ph * 0.45); sh.scale.x = 1; sh.scale.z = s; sh.scale.x = s; } } }
    if (A.k >= 1) { bit.position.y = 0.41; A = null; }
  }
  function sparksStep(dt) { let any = false; for (let i = 0; i < NP; i++) if (pLife[i] > 0) { any = true; pLife[i] -= dt; pVel[i * 3 + 1] -= 9.8 * dt * 0.6; pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt; if (pPos[i * 3 + 1] < Y) { pPos[i * 3 + 1] = Y; pVel[i * 3 + 1] *= -0.3; } if (pLife[i] <= 0) pPos[i * 3 + 1] = -10; } if (any) pGeo.attributes.position.needsUpdate = true; }
  /* ---------- eventi ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let dn = null;
  canvas.addEventListener("pointerdown", e => { dn = [e.clientX, e.clientY]; });
  canvas.addEventListener("pointerup", e => { if (!dn || Math.hypot(e.clientX - dn[0], e.clientY - dn[1]) > 6) return; const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera); const hits = ray.intersectObjects(Object.values(toolObj).concat(Object.values(tgObj)), true); for (const h of hits) { let o = h.object; while (o && !o.userData.tool && !o.userData.target) o = o.parent; if (o && o.userData.tool) { selectTool(o.userData.tool); return; } if (o && o.userData.target) { selectTarget(o.userData.target); return; } } });
  el.addEventListener("click", e => { const b = e.target.closest("[data-tb],[data-tool],[data-tbg]"); if (!b) return;
    if (b.hasAttribute("data-tool")) { selectTool(b.getAttribute("data-tool")); return; }
    if (b.hasAttribute("data-tbg")) { S.g = b.getAttribute("data-tbg"); S.q = ""; $("#tbQ").value = ""; catalog(); return; }
    const k = b.getAttribute("data-tb"); if (k === "use") use(); else if (k === "view") overview(); else if (k === "wall") flyTo(V3(0, Y + 0.6, 0.75), V3(0, Y + 0.5, -0.4)); else if (k === "piece") focusTarget();
    else if (k === "fix") { delete S.dmg[S.target]; S.res = null; save(); highlight(); panel(); } else if (k === "ask" && env.ask && S.res) env.ask("Ho usato " + tool().n + " su \"" + target().n + "\": " + S.res.t + ". Spiegami cosa è successo e come si fa bene."); });
  el.addEventListener("change", e => { const t = e.target; if (t.hasAttribute("data-tsel")) { selectTarget(t.value); return; } const k = t.getAttribute("data-to"), pp = t.getAttribute("data-ppe"), o = S.o[S.tool] = S.o[S.tool] || {};
    if (pp) { o.ppe = o.ppe || {}; o.ppe[pp] = t.checked; save(); return; } if (!k) return; o[k] = t.type === "checkbox" ? t.checked : (isNaN(+t.value) ? t.value : +t.value); save(); panel(); });
  el.addEventListener("input", e => { const t = e.target; if (t.id === "tbQ") { S.q = t.value; catalog(); return; } const k = t.getAttribute("data-to"); if (k && t.type === "range") { const o = S.o[S.tool] = S.o[S.tool] || {}; o[k] = +t.value; const b2 = t.previousElementSibling && t.previousElementSibling.querySelector("b"); if (b2) b2.textContent = k === "torque" ? f(o[k], 1) + " N·m" : k === "force" ? Math.round(o[k] * 100) + "%" : k === "clutch" ? (o[k] >= 22 ? "foratura" : o[k]) : k === "temp" ? o[k] + " °C" : o[k]; save(); } });
  function resize() { const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null; if (ro) ro.observe(stage);
  let raf = 0, last = 0;
  function frame(dt) { if (fly) { fly.k = Math.min(1, fly.k + dt / 0.8); const e = fly.k * fly.k * (3 - 2 * fly.k); camera.position.lerpVectors(fly.p0, fly.p1, e); controls.target.lerpVectors(fly.t0, fly.t1, e); if (fly.k >= 1) fly = null; } controls.update(); animStep(dt); sparksStep(dt); Object.values(tgObj).forEach(g => { if (g.userData.ring.material.opacity > 0 && !rm) g.userData.ring.scale.setScalar(1 + 0.15 * Math.sin(performance.now() / 250)); }); renderer.render(scene, camera); }
  function tick(ts) { raf = 0; if (!S.run) return; const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts; frame(dt); raf = requestAnimationFrame(tick); }
  camera.position.set(0, Y + 0.85, 1.45); controls.target.set(0, Y + 0.2, -0.05); controls.update(); resize(); highlight(); panel(); catalog(); log();
  return {
    resume() { S.run = true; resize(); last = 0; if (!raf) raf = requestAnimationFrame(tick); },
    pause() { S.run = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    ctx() { const t = tool(), tg = target(); return { tool: t.n, target: tg.n, opt: S.o[t.id] || {}, last: S.res ? { sev: S.res.sev, t: S.res.t, why: S.res.why, fix: S.res.fix } : null, stats: S.stats, damaged: Object.keys(S.dmg).length }; },
    test: { S, selectTool, selectTarget, use, setOpt(k, v) { const o = S.o[S.tool] = S.o[S.tool] || {}; o[k] = v; panel(); }, frame(n) { for (let i = 0; i < (n || 1); i++) frame(0.05); }, render() { frame(0.016); }, focus: focusTarget },
    dispose() { this.pause(); if (ro) ro.disconnect(); pmrem.dispose(); renderer.dispose(); }
  };
}
