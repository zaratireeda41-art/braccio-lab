// Braccio Lab · Area di assemblaggio: componi un braccio robotico completo con i pezzi tagliati nel Mio spazio,
// la scheda della Tavola da lavoro e i motori/riduttori/driver della Dispensa. Ogni fissaggio va serrato con
// l'utensile e la coppia giusti (js/tools.js), la fisica (massa, baricentro, inerzia, coppie, flessione,
// ribaltamento, cablaggio) è calcolata da js/physics.js e la simulazione muove il braccio segnalando gli errori.
import * as THREE from "../vendor/three.module.min.js";
import { OrbitControls, RoomEnvironment } from "../vendor/three-addons.min.js";
import * as TX from "../js3d/textures.js?v=5";

const AKEY = "xentriq-braccio-lab-asm-v1", SPKEY = "xentriq-braccio-lab-space-v1", TKEY = "xentriq-braccio-lab-tools-v1";
const rd = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
const SIGS = [["", "— scollegato —"], ["stepdir", "STEP/DIR"], ["pwm", "PWM servo"], ["pwmdir", "PWM + DIR"], ["i2c", "I²C"], ["uart", "UART"], ["can", "CAN"], ["ethercat", "EtherCAT"]];
const POWS = [["", "— scollegato —"], ["psu", "Alimentatore DC (PSU)"], ["mains", "Rete 230 V (L/N + PE)"], ["logic", "5 V della logica"]];
const DEFL = ["st_col", "st_rt6040", "st_al60", "st_short", "st_short", "st_short"];
const BOARD_PINS = { uno: 18, nano: 18, mega: 66, esp32: 24, stm32: 50, pico: 26, teensy41: 55 };

export function mountAssembly(el, env) {
  const PHY = env.PHY, TLS = env.TLS, CAT = env.CAT, ENG = env.ENG, esc = env.esc, rm = !!env.reduced, test = !!env.testMode, lite = test || window.innerWidth < 760, f = PHY.f;
  const saved = rd(AKEY) || {};
  const S = { tab: saved.tab || "monta", sel: null, tool: saved.tool || null, topt: saved.topt || {}, stress: false, com: true, run: false, sim: null, simT: 0, play: false, ev: null, drop: {}, lastEvent: -1, flash: 0, res: null, last: null };
  let A = saved.asm && saved.asm.J ? saved.asm : PHY.defaults(4);
  function save() { try { localStorage.setItem(AKEY, JSON.stringify({ asm: A, tab: S.tab, tool: S.tool, topt: S.topt })); } catch (e) { /* pieno */ } }
  /* ---------- inventario ---------- */
  function spaceParts() { const s = rd(SPKEY); return (s && s.parts || []).map(PHY.fromSpace).filter(Boolean); }
  function inventory() { return { space: spaceParts(), stock: PHY.STOCK.map(x => Object.assign({ src: "stock" }, x)) }; }
  function linkFrom(v) { if (!v) return null; const inv = inventory(); if (v.indexOf("st:") === 0) { const x = inv.stock.find(p => p.id === v.slice(3)); return x ? Object.assign({}, x) : null; } if (v.indexOf("sp:") === 0) { const x = inv.space.find(p => p.id === v.slice(3)); return x ? Object.assign({}, x) : null; } return null; }
  const linkKey = l => !l ? "" : (l.src === "space" ? "sp:" : "st:") + l.id;
  /* ---------- scheda della Tavola da lavoro → contesto per la fisica ---------- */
  function benchCtx() {
    const b = env.bench && env.bench(); if (!b || !b.state) return null; const B = b.state, comps = B.L.comps || [], res = B.res || {};
    const mcu = comps.find(c => c.t === "MCU"), board = mcu ? (mcu.p && mcu.p.board) || "uno" : null, cm = board && CAT.MCUS.find(m => m.id === board);
    const iss = (res.issues || []).filter(x => x.sev === "err"), J = B.joints || {}, vals = Object.values(J);
    return { count: comps.length, mcu: !!mcu, board, mcuPins: cm && cm.pins || BOARD_PINS[board] || (mcu ? 18 : 0), errors: iss.length, issues: iss.map(x => x.t), bridge: vals.filter(v => v === "bridge").length, cold: vals.filter(v => v === "cold").length, burnt: vals.filter(v => v === "burnt").length, drivers: comps.filter(c => /STEPDRV|L298|ACDRIVE/.test(c.t)).length, name: B.L.name || "Il mio circuito", color: B.board && B.board.color || "#1f7a3a" };
  }
  const ctxPhy = () => ({ bench: benchCtx() });
  function evalNow() { S.res = PHY.evaluate(A, ctxPhy()); return S.res; }
  /* ---------- utensili per il serraggio ---------- */
  const DRIVE_TOOLS = TLS.TOOLS.filter(t => t.d && t.d.length);
  function slotBolts(slot) { if (slot === "base") return { b: A.base.bolts, head: "hex", get: () => A.base.tq, set: v => { A.base.tq = v; } }; if (slot === "eff") return { b: A.eff.bolts, head: "socket", get: () => A.eff.tq, set: v => { A.eff.tq = v; } };
    const m = /^([JL])(\d)$/.exec(slot); if (!m) return null; const j = A.J[+m[2] - 1]; if (!j) return null; return m[1] === "J" ? { b: j.bolts, head: "socket", get: () => j.tq, set: v => { j.tq = v; } } : { b: j.lbolts, head: "socket", get: () => j.ltq, set: v => { j.ltq = v; } }; }
  function boltTgt(slot) { const sb = slotBolts(slot); if (!sb) return null; const d = PHY.boltData(sb.b.size, sb.b.cls); return TLS.boltTarget(sb.b.size, sb.b.cls, d.MA, sb.head); }
  function recommend(slot) { const tg = boltTgt(slot); if (!tg) return null; const want = tg.drive.t + ":" + tg.drive.s;
    const tq = DRIVE_TOOLS.filter(t => t.tq && TLS.options(t).some(o => o.v === want) && tg.MA >= t.tq[0] && tg.MA <= t.tq[1]).sort((a, b) => Math.abs((a.tq[0] + a.tq[1]) / 2 - tg.MA) - Math.abs((b.tq[0] + b.tq[1]) / 2 - tg.MA))[0];
    return tq ? { tool: tq.id, opt: { opt: want, torque: Math.round(tg.MA * 10) / 10 } } : null; }
  function curTool() { if (!S.tool) { const ts = rd(TKEY); S.tool = ts && ts.tool && TLS.byId(ts.tool) && TLS.byId(ts.tool).d ? ts.tool : "dq_14"; } return TLS.byId(S.tool) || TLS.byId("dq_14"); }
  function tighten(slot, toolId, opt) {
    const sb = slotBolts(slot); if (!sb) return null; if (!mountedSlot(slot)) { const r0 = { sev: "err", ok: false, t: "Prima monta il pezzo", why: "Non puoi serrare viti su un pezzo che non è al suo posto.", fix: "Vai su Montaggio e monta " + slotName(slot) + "." }; S.last = { slot, r: r0 }; panel(); return r0; }
    const t = toolId ? TLS.byId(toolId) : curTool(), o = Object.assign({}, opt || S.topt[t.id] || {}), tg = boltTgt(slot), r = TLS.use(t.id, tg, o);
    if (!r.nofit && /screw/.test(tg.kind) && (r.torque != null || r.strip)) sb.set({ sev: r.sev, state: r.state || (r.strip ? "spanata" : ""), ratio: r.ratio, strip: !!r.strip, torque: r.torque, MA: r.MA, tool: t.n.split(" (")[0], n: sb.b.n });
    S.last = { slot, r, tool: t.n }; save(); evalNow(); build(); panel(); env.toast && env.toast((r.sev === "ok" ? "✅ " : r.sev === "warn" ? "⚠️ " : "⛔ ") + slotName(slot) + ": " + r.t); return r;
  }
  /* ---------- slot ---------- */
  const slotList = () => ["base"].concat(A.J.flatMap((j, i) => ["J" + (i + 1), "L" + (i + 1)])).concat(["eff", "ctrl"]);
  function slotName(s) { if (s === "base") return "Basamento"; if (s === "eff") return "Pinza"; if (s === "ctrl") return "Controllore"; const m = /^([JL])(\d)$/.exec(s); return m ? (m[1] === "J" ? "Giunto " + m[2] : "Link " + m[2]) : s; }
  function mountedSlot(s) { if (s === "base") return A.base.mounted; if (s === "eff") return A.eff.mounted; if (s === "ctrl") return A.ctrl.mounted; const m = /^([JL])(\d)$/.exec(s); if (!m) return false; const j = A.J[+m[2] - 1]; return m[1] === "J" ? j.mounted : !!j.link; }
  function slotSev(s) { const r = S.res || evalNow(), is = r.issues.filter(x => x.slot === s || (s === "ctrl" && /elettronica/.test(x.cat) && x.slot === "ctrl")); return is.some(x => x.sev === "err") ? "err" : is.some(x => x.sev === "warn") ? "warn" : mountedSlot(s) ? "ok" : ""; }
  function mount(s, on, val) {
    on = on !== false; S.drop[s] = on && !rm && !test ? 1 : 0; S.sim = null;
    if (s === "base") { A.base.mounted = on; if (!on) A.base.tq = null; }
    else if (s === "eff") { A.eff.mounted = on; if (val) A.eff.id = val; if (!on) A.eff.tq = null; }
    else if (s === "ctrl") { A.ctrl.mounted = on; }
    else { const m = /^([JL])(\d)$/.exec(s), j = A.J[+m[2] - 1]; if (m[1] === "J") { j.mounted = on; if (!on) j.tq = null; } else { const L = on ? (val ? linkFrom(val) : j.link || linkFrom("st:" + DEFL[+m[2] - 1])) : null; j.link = L; j.ltq = null; } }
    save(); evalNow(); build(); panel();
  }
  function setJ(i, k, v) { const j = A.J[i]; if (k === "motor" || k === "reducer") { j[k] = v; const R = PHY.by(CAT.REDUCERS, j.reducer), M = PHY.by(CAT.MOTORS, j.motor); if (R.ratios.indexOf(+j.ratio) < 0) j.ratio = R.ratios[R.ratios.length - 1]; j.bolts = PHY.suggestBolts("j", R, M); j.lbolts = PHY.suggestBolts("l", R, M); j.tq = null; j.ltq = null; if (j.mounted) { j.mounted = false; env.toast && env.toast("Giunto " + (i + 1) + " cambiato: rimontalo e riserra le viti"); } }
    else if (k === "ratio") j.ratio = +v; else if (k === "driver") j.driver = v; else if (k === "bsize" || k === "bcls" || k === "bn") { const key = k === "bsize" ? "size" : k === "bcls" ? "cls" : "n"; j.bolts[key] = key === "n" ? +v : v; j.tq = null; }
    else if (k === "lbsize" || k === "lbcls" || k === "lbn") { const key = k === "lbsize" ? "size" : k === "lbcls" ? "cls" : "n"; j.lbolts[key] = key === "n" ? +v : v; j.ltq = null; }
    else if (k === "mot" || k === "pow" || k === "sig") { j.wire = j.wire || {}; j.wire[k] = v; }
    S.sim = null; save(); evalNow(); build(); panel(); }
  function setAxes(n) { const old = A; A = PHY.defaults(n); ["psu", "estop", "payload", "speed", "tacc"].forEach(k => { A[k] = old[k]; }); A.eff.id = old.eff.id; A.ctrl = Object.assign({}, old.ctrl); A.base = old.base; S.sim = null; save(); evalNow(); build(); panel(); }
  function wireAuto() { A.J.forEach((j, i) => { const D = PHY.by(CAT.DRIVERS, j.driver), ac = String(D.V[0]).indexOf("ac") === 0; j.wire = { mot: "J" + (i + 1), pow: ac ? "mains" : "psu", sig: (D.bus || [])[0] || "stepdir" }; }); S.sim = null; save(); evalNow(); build(); panel(); }
  /* ---------- scena ---------- */
  el.innerHTML = `<div class="as-wrap"><div><div class="sp-stage as-stage" id="asStage"><canvas id="asCv" aria-label="Area di assemblaggio in 3D"></canvas>
      <div class="sp-top"><button type="button" class="btn sm ghost" data-as="view">Vista</button><button type="button" class="btn sm ghost" data-as="stress" aria-pressed="false">Sforzi</button><button type="button" class="btn sm ghost" data-as="com" aria-pressed="true">Baricentro</button></div>
      <div class="as-hud" id="asHud"></div><div class="sp-hint" id="asHint">Tocca un pezzo o uno slot per montarlo</div></div>
      <div class="card" id="asSim"></div></div>
    <div class="card"><div class="as-tabs" role="tablist">${[["monta", "Montaggio"], ["serra", "Serraggio"], ["cavi", "Cablaggio"], ["verifica", "Verifica fisica"]].map(([k, n]) => `<button type="button" class="chip" role="tab" data-tab="${k}">${n}</button>`).join("")}</div><div id="asPanel"></div></div></div>`;
  const $ = s => el.querySelector(s), canvas = $("#asCv"), stage = $("#asStage");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, preserveDrawingBuffer: test, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, test ? 1 : 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.enabled = !lite;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x14171b);
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(42, 1, 0.02, 40), controls = new OrbitControls(camera, canvas); controls.enableDamping = !rm; controls.maxPolarAngle = Math.PI * 0.495; controls.minDistance = 0.3; controls.maxDistance = 7;
  scene.add(new THREE.HemisphereLight(0xeef2ff, 0x2a2622, 0.75)); const sun = new THREE.DirectionalLight(0xfff2e0, 1.7); sun.position.set(1.6, 3.2, 1.8); sun.castShadow = !lite; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2 }); scene.add(sun);
  const SEG = lite ? 12 : 24, TY = -0.8;
  const mat = (c, m, r, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, metalness: m == null ? 0.3 : m, roughness: r == null ? 0.5 : r }, o || {}));
  const MT = { steel: mat(0xb9c0c7, 1, 0.32), alu: mat(0xd5dbe1, 1, 0.28), dark: mat(0x2b2f36, 0.4, 0.5), black: mat(0x141517, 0.3, 0.55), blue: mat(0x2a62c9, 0.3, 0.4), orange: mat(0xff7a2f, 0.2, 0.45), grey: mat(0x6d747c, 0.7, 0.4), ghost: new THREE.MeshBasicMaterial({ color: 0xff7a2f, wireframe: true, transparent: true, opacity: 0.35 }), cab: mat(0xd9dde2, 0.2, 0.6), pcb: mat(0x1f7a3a, 0.1, 0.6), copper: mat(0xc98b4a, 1, 0.35) };
  const BOLT = { none: mat(0x8a8f96, 0.9, 0.4), ok: mat(0x3ddc84, 0.6, 0.4, { emissive: 0x0b3d22 }), warn: mat(0xf5c542, 0.6, 0.4, { emissive: 0x3a2d05 }), err: mat(0xff5a5f, 0.5, 0.4, { emissive: 0x4a0d10 }) };
  function M(geo, m, p, x, y, z) { const o = new THREE.Mesh(geo, m); o.castShadow = o.receiveShadow = !lite; o.position.set(x || 0, y || 0, z || 0); (p || scene).add(o); return o; }
  const box = (w, h, d, m, p, x, y, z) => M(new THREE.BoxGeometry(w, h, d), m, p, x, y, z), cyl = (r1, r2, h, m, p, x, y, z, s) => M(new THREE.CylinderGeometry(r1, r2, h, s || SEG), m, p, x, y, z);
  // ambiente: pavimento, tavolo saldato, quadro elettrico
  const floor = M(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ map: TX.concrete(17).map, roughness: 0.92 })); floor.rotation.x = -Math.PI / 2; floor.position.y = TY;
  const top = box(2.2, 0.04, 1.4, mat(0x50565d, 0.8, 0.45), null, 0, -0.02, 0); top.userData.slot = null;
  [[-1.05, -0.65], [1.05, -0.65], [-1.05, 0.65], [1.05, 0.65]].forEach(([x, z]) => box(0.06, -TY - 0.04, 0.06, MT.dark, null, x, TY / 2 - 0.02, z));
  // griglia di fori del tavolo
  { const g = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006, 0.006, 0.002, 8), new THREE.MeshBasicMaterial({ color: 0x1a1c1f }), 220), m4 = new THREE.Matrix4(); let k = 0; for (let x = -1; x <= 1.001; x += 0.1) for (let z = -0.6; z <= 0.601; z += 0.12) if (k < 220) { m4.makeTranslation(x, 0.001, z); g.setMatrixAt(k++, m4); } g.count = k; scene.add(g); }
  const cab = new THREE.Group(); cab.position.set(-0.78, 0, -0.42); scene.add(cab); cab.userData.slot = "ctrl";
  box(0.5, 0.42, 0.2, MT.cab, cab, 0, 0.21, 0).userData.slot = "ctrl"; box(0.46, 0.38, 0.01, mat(0xf2f4f6, 0, 0.8), cab, 0, 0.21, 0.095);
  const estopG = new THREE.Group(); estopG.position.set(0.18, 0.36, 0.11); cab.add(estopG); box(0.07, 0.07, 0.03, mat(0xf5c542, 0.1, 0.5), estopG); const estopBtn = cyl(0.022, 0.026, 0.025, mat(0xd8262b, 0.1, 0.4), estopG, 0, 0, 0.025); estopBtn.rotation.x = Math.PI / 2; estopG.userData.slot = "estop";
  const cabIn = new THREE.Group(); cab.add(cabIn); cabIn.position.set(0, 0, 0.1);
  const arm = new THREE.Group(); scene.add(arm);
  const comM = M(new THREE.SphereGeometry(0.022, 16, 12), mat(0xff7a2f, 0.2, 0.3, { emissive: 0xff5a1f, emissiveIntensity: 0.6 })); const comLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineDashedMaterial({ color: 0xff7a2f, dashSize: 0.02, gapSize: 0.015 })); scene.add(comLine);
  const trailN = 160, trailPos = new Float32Array(trailN * 3), trail = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x5ab0ff, transparent: true, opacity: 0.8 })); trail.geometry.setAttribute("position", new THREE.BufferAttribute(trailPos, 3)); trail.geometry.setDrawRange(0, 0); scene.add(trail); let trailK = 0;
  const cables = new THREE.Group(); scene.add(cables);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z), UP = V3(0, 1, 0);
  let R = { joints: [], links: [], eff: null, base: null };
  /* modello di ogni slot, costruito dallo stato */
  function boltRing(g, n, r, y, st, slot) { const m = BOLT[st] || BOLT.none; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, b = cyl(0.0055, 0.0055, 0.006, m, g, Math.cos(a) * r, y, Math.sin(a) * r, 6); b.userData.slot = slot; } }
  function tqState(tq) { if (!tq) return "none"; if (tq.strip || /spanata|snervata/.test(tq.state || "")) return "err"; return tq.sev === "ok" ? "ok" : "warn"; }
  function build() {
    arm.clear(); cabIn.clear(); R = { joints: [], links: [], eff: null, base: null };
    const r = S.res || evalNow();
    // basamento
    const bg = new THREE.Group(); arm.add(bg); R.base = bg; bg.userData.slot = "base";
    if (A.base.mounted) { box(0.32, 0.02, 0.32, MT.dark, bg, 0, 0.01, 0).userData.slot = "base"; cyl(0.1, 0.11, 0.1, MT.orange, bg, 0, 0.07, 0).userData.slot = "base"; const st = tqState(A.base.tq); [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]].forEach(([x, z]) => { const b = cyl(0.009, 0.009, 0.008, BOLT[st] || BOLT.none, bg, x, 0.024, z, 6); b.userData.slot = "base"; }); }
    else { const g = box(0.32, 0.12, 0.32, MT.ghost, bg, 0, 0.06, 0); g.castShadow = false; g.userData.slot = "base"; }
    A.J.forEach((j, i) => {
      const jm = PHY.jointMass(j), Mo = jm.M, Re = jm.R, fr = (Re.frames ? Re.frames[1] : Mo.frame || 60) / 1000, g = new THREE.Group(); g.userData.slot = "J" + (i + 1); arm.add(g); R.joints.push(g);
      const rr = Math.max(0.03, fr * 0.62), hl = Math.max(0.05, fr * 0.9);
      if (j.mounted) { const red = cyl(rr, rr, hl, MT.grey, g, 0, 0, 0); red.userData.slot = g.userData.slot; red.userData.heat = true; const fl = cyl(rr * 0.82, rr * 0.82, 0.012, MT.steel, g, 0, hl / 2 + 0.006, 0); fl.userData.slot = g.userData.slot;
        const mf = Math.max(0.028, (Mo.frame || 42) / 1000), mot = box(mf, Math.max(0.06, Mo.mass * 0.05 + 0.05), mf, Mo.type === "ac" ? MT.blue : MT.black, g, 0, -(hl / 2 + Math.max(0.06, Mo.mass * 0.05 + 0.05) / 2), 0); mot.userData.slot = g.userData.slot; mot.userData.heat = true;
        boltRing(g, Math.min(12, j.bolts.n), rr * 0.82, -hl / 2 - 0.003, tqState(j.tq), g.userData.slot); }
      else { const gh = cyl(rr, rr, hl, MT.ghost, g, 0, 0, 0); gh.castShadow = false; gh.userData.slot = g.userData.slot; }
      g.userData.hl = hl; g.userData.rr = rr;
      const lg = new THREE.Group(); lg.userData.slot = "L" + (i + 1); arm.add(lg); R.links.push(lg);
      if (j.link) { const p = j.link, pp = PHY.partProps(p), al = /^al|ti/.test(p.metal), lm = mat(al ? 0xd5dbe1 : /ti/.test(p.metal) ? 0xa7a08f : 0x9aa3ab, 1, al ? 0.28 : 0.36); let mesh;
        if (p.sec === "rtube" || p.sec === "rect") mesh = box((p.B || 40) / 1000, 1, (p.H || p.B || 40) / 1000, lm, lg); else mesh = cyl((p.D || 40) / 2000, (p.D || 40) / 2000, 1, lm, lg, 0, 0, 0);
        mesh.userData.slot = lg.userData.slot; mesh.userData.link = true; lg.userData.mesh = mesh; lg.userData.mat = lm; lg.userData.L = pp.L / 1000;
        const st = tqState(j.ltq), pl = cyl((p.D || p.B || 40) / 1400 + 0.01, (p.D || p.B || 40) / 1400 + 0.01, 0.01, MT.steel, lg, 0, 0, 0); pl.userData.slot = lg.userData.slot; lg.userData.plate = pl; const bolts = new THREE.Group(); lg.add(bolts); lg.userData.bolts = bolts; boltRing(bolts, Math.min(8, j.lbolts.n), (p.D || p.B || 40) / 1400, 0.008, st, lg.userData.slot); }
      else { const gh = cyl(0.015, 0.015, 1, MT.ghost, lg, 0, 0, 0); gh.castShadow = false; gh.userData.slot = lg.userData.slot; lg.userData.mesh = gh; lg.userData.L = 0.05; }
    });
    // pinza
    const eg = new THREE.Group(); eg.userData.slot = "eff"; arm.add(eg); R.eff = eg; const E = PHY.by(CAT.EFFECTORS, A.eff.id);
    if (A.eff.mounted) { const m0 = /vac/.test(E.id) ? MT.black : /sp/.test(E.id) ? MT.blue : MT.dark; box(0.07, 0.05, 0.06, m0, eg, 0, 0.025, 0).userData.slot = "eff"; if (/vac/.test(E.id)) cyl(0.02, 0.03, 0.02, MT.black, eg, 0, E.L * 0.9, 0); else if (/sp/.test(E.id)) cyl(0.004, 0.004, E.L * 0.7, MT.steel, eg, 0, E.L * 0.6, 0); else { const fl = box(0.012, E.L * 0.6, 0.03, MT.steel, eg, -0.022, 0.05 + E.L * 0.3, 0), fr2 = box(0.012, E.L * 0.6, 0.03, MT.steel, eg, 0.022, 0.05 + E.L * 0.3, 0); fl.userData.slot = fr2.userData.slot = "eff"; eg.userData.fingers = [fl, fr2]; }
      if (A.payload > 0) { const s = Math.cbrt(A.payload / 2700) * 0.9; const pl = box(Math.min(0.04, s), Math.min(0.12, s * 1.4), Math.min(0.05, s), MT.orange, eg, 0, 0.05 + E.L * 0.5, 0); pl.userData.slot = "eff"; }
      boltRing(eg, A.eff.bolts.n, 0.022, 0.002, tqState(A.eff.tq), "eff"); }
    else { const gh = box(0.07, Math.max(0.08, E.L), 0.06, MT.ghost, eg, 0, Math.max(0.08, E.L) / 2, 0); gh.castShadow = false; gh.userData.slot = "eff"; }
    eg.userData.L = A.eff.mounted ? E.L : 0;
    // quadro: scheda della Tavola, driver e alimentatore
    const bc = benchCtx();
    if (A.ctrl.mounted) { const pcbM = A.ctrl.src === "bench" ? mat(new THREE.Color(bc && bc.color || "#1f7a3a"), 0.1, 0.6) : MT.blue; const brd = box(0.12, 0.08, 0.004, pcbM, cabIn, -0.15, 0.3, 0); brd.userData.slot = "ctrl"; for (let k = 0; k < 4; k++) box(0.014, 0.014, 0.004, MT.black, cabIn, -0.19 + k * 0.026, 0.3, 0.004); if (A.ctrl.src === "bench" && bc && (bc.cold || bc.bridge)) box(0.01, 0.01, 0.006, BOLT.warn, cabIn, -0.1, 0.27, 0.004); }
    A.J.forEach((j, i) => { const D = PHY.by(CAT.DRIVERS, j.driver), ac = String(D.V[0]).indexOf("ac") === 0; const d = box(ac ? 0.045 : 0.035, ac ? 0.12 : 0.08, 0.06, ac ? MT.black : MT.dark, cabIn, -0.04 + i * 0.05, 0.12, -0.04); d.userData.slot = "J" + (i + 1); d.userData.drv = i; });
    const PS = PHY.by(CAT.PSUS, A.psu); if (PS && PS.V) box(0.1, 0.06, 0.08, mat(0xb8c0c8, 0.9, 0.35), cabIn, 0.16, 0.06, -0.05);
    estopBtn.material.color.set(A.estop ? 0xd8262b : 0x553333); estopG.visible = true;
    pose(currentQ()); buildCables();
  }
  function currentQ() { if (S.sim && S.sim.frames.length) return frameAt(S.simT).q; return PHY.poses(A.axes)[0]; }
  function frameAt(t) { const fr = S.sim.frames, k = Math.max(0, Math.min(fr.length - 1, Math.round(t / S.sim.dt))); return fr[k]; }
  const q0 = new THREE.Quaternion(), tmpV = V3(0, 0, 0);
  function pose(q, fr) {
    const K = PHY.fk(A, q), kinds = PHY.KINDS[A.axes], yaw = q[0] || 0, side = V3(Math.sin(yaw), 0, Math.cos(yaw));
    R.joints.forEach((g, i) => { const p = K.joints[i], drop = (S.drop["J" + (i + 1)] || 0) * 0.35; g.position.set(p[0], p[1] + drop, p[2]); const kd = kinds[i]; let ax = kd === "yaw" ? UP : kd === "pitch" ? side : V3(...K.links[i].d); if (i === 0) ax = UP; g.quaternion.setFromUnitVectors(UP, ax.clone().normalize()); if (i === 0) g.position.y = 0.12 + drop; });
    R.links.forEach((g, i) => { const l = K.links[i], d = V3(...l.d).normalize(), drop = (S.drop["L" + (i + 1)] || 0) * 0.35, L = Math.max(0.01, l.L); const h0 = R.joints[i] ? R.joints[i].userData.hl / 2 : 0; g.position.set((l.a[0] + l.b[0]) / 2, (l.a[1] + l.b[1]) / 2 + drop + (i === 0 ? h0 * 0.5 : 0), (l.a[2] + l.b[2]) / 2); g.quaternion.setFromUnitVectors(UP, d); const m = g.userData.mesh; if (m) m.scale.set(1, L, 1); if (g.userData.plate) g.userData.plate.position.y = -L / 2; if (g.userData.bolts) g.userData.bolts.position.y = -L / 2; });
    const eg = R.eff; if (eg) { const last = K.links[K.links.length - 1], d = V3(...(last ? last.d : [1, 0, 0])).normalize(), e = K.joints[K.joints.length - 1], drop = (S.drop.eff || 0) * 0.35; eg.position.set(e[0], e[1] + drop, e[2]); eg.quaternion.setFromUnitVectors(UP, d); if (eg.userData.fingers && fr) { const o = 0.022 - 0.008 * (0.5 + 0.5 * Math.sin(fr.t * 2)); eg.userData.fingers[0].position.x = -o; eg.userData.fingers[1].position.x = o; } }
    const base = R.base; if (base) base.position.y = (S.drop.base || 0) * 0.35;
    // baricentro
    const L = PHY.loads(A, q, q.map(() => 0), ctxPhy()); comM.visible = comLine.visible = S.com && L.mass > 0; if (L.mass > 0) { comM.position.set(L.com[0], L.com[1], L.com[2]); comLine.geometry.setFromPoints([comM.position.clone(), V3(L.com[0], 0.002, L.com[2])]); comLine.computeLineDistances(); }
    // colori: sforzi o temperatura
    const r = S.res; R.links.forEach((g, i) => { const lm = g.userData.mat; if (!lm) return; if (S.stress && r) { const li = r.links.find(x => x.k === i), sf = li ? li.sf : Infinity; lm.color.set(sf < 1 ? 0xff3b3b : sf < 2.5 ? 0xf5c542 : sf < 6 ? 0x3ddc84 : 0x5ab0ff); lm.metalness = 0.2; } else { const al = /^al|ti/.test(A.J[i].link.metal); lm.color.set(al ? 0xd5dbe1 : 0x9aa3ab); lm.metalness = 1; } });
    R.joints.forEach((g, i) => { const t = fr ? fr.temp[i] : 25, h = Math.max(0, Math.min(1, (t - 30) / 70)); g.traverse(o => { if (o.userData.heat && o.material && o.material.emissive) { if (!o.material.userData.own) { o.material = o.material.clone(); o.material.userData.own = true; } o.material.emissive.setRGB(h * 0.9, h * 0.18, 0); } }); });
    return K;
  }
  function buildCables() {
    cables.children.forEach(c => c.geometry.dispose()); cables.clear(); const r = S.res || evalNow();
    A.J.forEach((j, i) => { if (!j.mounted || !j.wire || !j.wire.mot) return; const g = R.joints[i]; if (!g) return; const src = cab.localToWorld(V3(-0.04 + (+j.wire.mot.slice(1) - 1) * 0.05, 0.08, 0.06)), dst = g.position.clone(); const bad = r.issues.some(x => x.slot === "J" + (i + 1) && x.cat === "cablaggio" && x.sev === "err");
      const mid = V3((src.x + dst.x) / 2, Math.max(0.03, Math.min(src.y, dst.y) - 0.05), (src.z + dst.z) / 2 + 0.1); const curve = new THREE.CatmullRomCurve3([src, V3(src.x + 0.05, 0.01, src.z + 0.2), mid, V3(dst.x, Math.max(0.05, dst.y - 0.05), dst.z), dst]);
      const t = new THREE.Mesh(new THREE.TubeGeometry(curve, lite ? 18 : 32, 0.0045, 5, false), mat(bad ? 0xff5a5f : j.wire.pow === "mains" ? 0x1d1f22 : 0xff7a2f, 0.1, 0.6, bad ? { emissive: 0x5a0a0a } : {})); cables.add(t); });
  }
  /* ---------- simulazione ---------- */
  function runSim() { evalNow(); S.sim = PHY.simulate(A, ctxPhy(), {}); S.simT = 0; S.play = true; S.lastEvent = -1; trailK = 0; trail.geometry.setDrawRange(0, 0); simPanel(); hud(); return S.sim; }
  function seek(t) { if (!S.sim) return; S.simT = Math.max(0, Math.min(S.sim.tEnd, t)); applySim(true); }
  function applySim(force) { const fr = frameAt(S.simT); pose(fr.q, fr); if (frameCount % 3 === 0 || force) buildCables();
    const tp = fr.tip; if (trailK < trailN) { trailPos.set([tp[0], tp[1], tp[2]], trailK * 3); trailK++; } else { trailPos.copyWithin(0, 3); trailPos.set([tp[0], tp[1], tp[2]], (trailN - 1) * 3); } trail.geometry.attributes.position.needsUpdate = true; trail.geometry.setDrawRange(0, trailK);
    const evs = S.sim.events; for (let k = S.lastEvent + 1; k < evs.length; k++) { if (evs[k].time <= S.simT) { S.lastEvent = k; if (evs[k].sev === "err") S.flash = 1; $("#asHint").textContent = (evs[k].sev === "err" ? "⛔ " : "⚠️ ") + f(evs[k].time, 1) + " s · " + evs[k].t; } else break; }
    if (frameCount % 6 === 0 || force) simBars(fr); }
  function gstyle(box) { if (!box) return; box.querySelectorAll("[data-w]").forEach(i => { i.style.width = i.getAttribute("data-w") + "%"; }); box.querySelectorAll("[data-gl]").forEach(i => { i.style.left = i.getAttribute("data-gl") + "%"; }); }
  function simBars(fr) { const b = $("#asBars"); if (!b) return; b.innerHTML = A.J.map((j, i) => { const u = fr.util[i] || 0, t = fr.temp[i] || 25; return `<div class="as-bar"><b>J${i + 1}</b><div class="tb-gauge"><i data-w="${Math.round(Math.min(1.3, u) / 1.3 * 100)}"></i><b data-gl="${Math.round(1 / 1.3 * 100)}"></b></div><small>${Math.round(u * 100)}% · ${Math.round(t)} °C</small></div>`; }).join(""); gstyle(b); const r = $("#asT"); if (r && document.activeElement !== r) r.value = String(Math.round(S.simT * 100) / 100); const tt = $("#asTt"); if (tt) tt.textContent = f(S.simT, 1) + " / " + f(S.sim.tEnd, 1) + " s"; }
  /* ---------- pannelli ---------- */
  const opt = (list, v) => list.map(([a, b]) => `<option value="${esc(String(a))}"${String(a) === String(v) ? " selected" : ""}>${esc(b)}</option>`).join("");
  const selF = (lab, attr, list, v) => `<label class="lb-f"><span>${lab}</span><select ${attr}>${opt(list, v)}</select></label>`;
  const BSZ = CAT.BOLTS.map(b => [b.s, b.s]), BCL = CAT.BOLT_CLASSES.map(c => [c.id || c.n || c.s, c.id || c.n || c.s]);
  function stBadge(s) { const v = slotSev(s); return v === "ok" ? "✅" : v === "warn" ? "⚠️" : v === "err" ? "⛔" : "○"; }
  function tqTxt(tq) { if (!tq) return "non serrate"; return (tq.strip ? "spanate" : tq.state || tq.sev) + (tq.torque != null ? " · " + f(tq.torque, 1) + "/" + f(tq.MA, 1) + " N·m" : "") + (tq.tool ? " · " + tq.tool : ""); }
  function slotCard(s, body, actions) { return `<div class="as-slot ${slotSev(s)}${S.sel === s ? " on" : ""}" data-slot="${s}"><div><b>${stBadge(s)} ${esc(slotName(s))}</b>${body}</div><div class="row">${actions || ""}</div></div>`; }
  function panelMonta() {
    const inv = inventory(), linkOpts = [["", "— nessun pezzo —"]].concat(inv.space.map(p => ["sp:" + p.id, "🛠 " + p.n + " (" + (PHY.material(p.metal).n) + ")"])).concat(inv.stock.map(p => ["st:" + p.id, "📦 " + p.n + " · " + p.L + " mm"]));
    const MO = CAT.MOTORS.map(m => [m.id, m.name]), RE = CAT.REDUCERS.map(r => [r.id, r.name]), DR = CAT.DRIVERS.map(d => [d.id, d.name]);
    let h = `<div class="lb-fields">${selF("Assi del braccio", 'data-a="axes"', [3, 4, 5, 6].map(n => [n, n + " assi"]), A.axes)}</div><p class="note">Pezzi dal <b>Mio spazio</b>: ${inv.space.length ? inv.space.length + " tagliati/torniti" : "nessuno (taglia un profilo con la sega a nastro)"} · scheda della <b>Tavola da lavoro</b>: ${(benchCtx() || {}).count || 0} componenti.</p><div class="as-slots">`;
    h += slotCard("base", `<small>Piastra 320×320 + 4× ${A.base.bolts.size} ${A.base.bolts.cls} sul tavolo forato</small>`, `<button type="button" class="btn sm${A.base.mounted ? " ghost" : ""}" data-mount="base">${A.base.mounted ? "Smonta" : "Monta"}</button>`);
    A.J.forEach((j, i) => { const R2 = PHY.by(CAT.REDUCERS, j.reducer), jm = PHY.jointMass(j), D = PHY.by(CAT.DRIVERS, j.driver);
      h += slotCard("J" + (i + 1), `<small>${esc(PHY.KINDS[A.axes][i])} · ${f(jm.m, 2)} kg · driver ${esc(D.name.split(" (")[0])}</small><div class="lb-fields">${selF("Motore", `data-j="${i}" data-k="motor"`, MO, j.motor)}${selF("Riduttore", `data-j="${i}" data-k="reducer"`, RE, j.reducer)}${selF("Rapporto", `data-j="${i}" data-k="ratio"`, R2.ratios.map(x => [x, "i = " + x]), j.ratio)}${selF("Driver", `data-j="${i}" data-k="driver"`, DR, j.driver)}</div>`, `<button type="button" class="btn sm${j.mounted ? " ghost" : ""}" data-mount="J${i + 1}">${j.mounted ? "Smonta" : "Monta"}</button>`);
      const pp = j.link ? PHY.partProps(j.link) : null;
      h += slotCard("L" + (i + 1), `<small>${pp ? esc(pp.s.desc) + " · " + pp.L + " mm · " + f(pp.mass, 2) + " kg · " + esc(pp.mat.n) : "vuoto"}</small><div class="lb-fields">${selF("Pezzo", `data-l="${i}"`, linkOpts, linkKey(j.link))}</div>`, j.link ? `<button type="button" class="btn sm ghost" data-mount="L${i + 1}">Smonta</button>` : ""); });
    const E = PHY.by(CAT.EFFECTORS, A.eff.id);
    h += slotCard("eff", `<small>${f(E.mass, 2)} kg · portata ${E.pay != null ? f(E.pay, 1) + " kg" : "—"}</small><div class="lb-fields">${selF("Utensile finale", 'data-a="eff"', CAT.EFFECTORS.map(e => [e.id, e.name]), A.eff.id)}<label class="lb-f"><span>Carico <b>${f(A.payload, 1)} kg</b></span><input type="range" data-a="payload" min="0" max="25" step="0.1" value="${A.payload}"></label></div>`, `<button type="button" class="btn sm${A.eff.mounted ? " ghost" : ""}" data-mount="eff">${A.eff.mounted ? "Smonta" : "Monta"}</button>`);
    const bc = benchCtx();
    h += slotCard("ctrl", `<small>${A.ctrl.src === "bench" ? "La tua PCB: " + esc(bc ? bc.name + " · " + bc.count + " componenti" + (bc.mcu ? " · MCU " + bc.board + " (" + bc.mcuPins + " pin)" : " · senza MCU") : "nessuna") : esc(PHY.by(CAT.MCUS, A.ctrl.mcu).name)}</small><div class="lb-fields">${selF("Sorgente", 'data-a="csrc"', [["bench", "Scheda della Tavola da lavoro"], ["mcu", "Controllore a catalogo"]], A.ctrl.src)}${A.ctrl.src === "mcu" ? selF("Controllore", 'data-a="mcu"', CAT.MCUS.map(m => [m.id, m.name]), A.ctrl.mcu) : ""}${selF("Alimentatore", 'data-a="psu"', CAT.PSUS.map(p => [p.id, p.name]), A.psu)}<label class="lb-f chk"><input type="checkbox" data-a="estop"${A.estop ? " checked" : ""}><span>Arresto di emergenza cablato (fungo + relè di sicurezza → STO)</span></label></div>`, `<button type="button" class="btn sm${A.ctrl.mounted ? " ghost" : ""}" data-mount="ctrl">${A.ctrl.mounted ? "Smonta" : "Monta"}</button>${A.ctrl.src === "bench" ? `<button type="button" class="btn sm ghost" data-as="gobench">Apri la Tavola</button>` : ""}`);
    return h + `</div><div class="row"><button type="button" class="btn sm ghost" data-as="mountall">Monta tutto</button><button type="button" class="btn sm ghost" data-as="reset">Ricomincia</button></div>`;
  }
  function panelSerra() {
    const t = curTool(), o = S.topt[t.id] = S.topt[t.id] || {}, ops = TLS.options(t); if (ops.length && (!o.opt || !ops.some(x => x.v === o.opt))) o.opt = ops[0].v;
    let h = `<p class="note">Scegli l'utensile come al Tavolo utensili: impronta, misura e coppia devono essere giuste. ${S.sel && slotBolts(S.sel) ? "Consiglio per <b>" + esc(slotName(S.sel)) + "</b>: " + esc(boltTgt(S.sel).n) + " a " + f(boltTgt(S.sel).MA, 1) + " N·m." : ""}</p><div class="lb-fields">${selF("Utensile", 'data-t="tool"', DRIVE_TOOLS.map(x => [x.id, x.n]), t.id)}${ops.length ? selF("Inserto / misura", 'data-t="opt"', ops.map(x => [x.v, x.n]), o.opt) : ""}`;
    if (t.tq) { if (o.torque == null) o.torque = t.tq[0]; h += `<label class="lb-f"><span>Coppia impostata <b>${f(o.torque, 1)} N·m</b></span><input type="range" data-t="torque" min="${t.tq[0]}" max="${t.tq[1]}" step="${t.tq[1] > 50 ? 1 : 0.1}" value="${o.torque}"></label>`; }
    else if (t.clutch) { if (o.clutch == null) o.clutch = 5; h += `<label class="lb-f"><span>Frizione <b>${o.clutch}</b></span><input type="range" data-t="clutch" min="1" max="22" step="1" value="${o.clutch}"></label>`; }
    else { if (o.force == null) o.force = 0.4; h += `<label class="lb-f"><span>Forza della mano <b>${Math.round(o.force * 100)}%</b></span><input type="range" data-t="force" min="0.1" max="1" step="0.05" value="${o.force}"></label>`; }
    h += `</div><div class="as-slots">`;
    slotList().filter(s => slotBolts(s)).forEach(s => { const sb = slotBolts(s), d = PHY.boltData(sb.b.size, sb.b.cls), m = /^([JL])(\d)$/.exec(s), pre = m ? (m[1] === "J" ? "b" : "lb") : null, i = m ? +m[2] - 1 : -1;
      h += slotCard(s, `<small>${sb.b.n}× ${sb.b.size} ${sb.b.cls} ${sb.head === "hex" ? "testa esagonale" : "TCEI"} · MA ${f(d.MA, 1)} N·m · precarico ${f(d.FM / 1000, 1)} kN/vite</small><small>Stato: ${esc(tqTxt(sb.get()))}</small>${pre ? `<div class="lb-fields as-wire">${selF("Vite", `data-j="${i}" data-k="${pre}size"`, BSZ, sb.b.size)}${selF("Classe", `data-j="${i}" data-k="${pre}cls"`, BCL, sb.b.cls)}${selF("Numero", `data-j="${i}" data-k="${pre}n"`, [3, 4, 6, 8, 10, 12, 16].map(n => [n, n + " viti"]), sb.b.n)}</div>` : ""}`, `<button type="button" class="btn sm" data-tight="${s}"${mountedSlot(s) ? "" : " disabled"}>Serra</button><button type="button" class="btn sm ghost" data-rec="${s}">Utensile giusto?</button>`); });
    h += `</div>`;
    if (S.last) { const r = S.last.r; h += `<div class="tb-res ${r.sev}"><b>${r.sev === "ok" ? "✅" : r.sev === "warn" ? "⚠️" : "⛔"} ${esc(slotName(S.last.slot))}: ${esc(r.t)}</b><br>${esc(r.why || "")}${r.fix ? "<br>→ " + esc(r.fix) : ""}${r.torque != null && r.MA ? `<div class="tb-gauge"><i data-w="${Math.round(Math.min(1.6, r.torque / r.MA) / 1.6 * 100)}"></i><b data-gl="62"></b></div>` : ""}</div>`; }
    return h;
  }
  function panelCavi() {
    let h = `<p class="note">Collega ogni motore al <b>suo</b> driver, alimenta il driver dalla sorgente giusta e porta il segnale dal controllore. I cavi errati diventano rossi nella scena.</p><div class="as-slots">`;
    const mots = [["", "— scollegato —"]].concat(A.J.map((x, i) => ["J" + (i + 1), "uscita driver J" + (i + 1)]));
    A.J.forEach((j, i) => { const D = PHY.by(CAT.DRIVERS, j.driver), M2 = PHY.by(CAT.MOTORS, j.motor), w = j.wire || {}; h += slotCard("J" + (i + 1), `<small>${esc(M2.name.split(" (")[0])} → ${esc(D.name.split(" (")[0])} · ${D.V[0] === "ac230" || String(D.V[0]).indexOf("ac") === 0 ? "230 V AC" : D.V[0] + "–" + D.V[1] + " V DC"} · ${esc((D.bus || []).join("/"))}</small><div class="lb-fields as-wire">${selF("Cavo motore", `data-j="${i}" data-k="mot"`, mots, w.mot || "")}${selF("Potenza driver", `data-j="${i}" data-k="pow"`, POWS, w.pow || "")}${selF("Segnale", `data-j="${i}" data-k="sig"`, SIGS, w.sig || "")}</div>`); });
    const PS = PHY.by(CAT.PSUS, A.psu); h += `</div><p class="note">Alimentatore: <b>${esc(PS.name)}</b> (${PS.V} V × ${PS.A} A = ${f(PS.V * PS.A, 0)} W) · E-stop ${A.estop ? "cablato ✅" : "mancante ⛔"}</p><div class="row"><button type="button" class="btn sm ghost" data-as="wireauto">Cablaggio guidato</button></div>`;
    return h;
  }
  function panelVerifica() {
    const r = evalNow(), J = r.J;
    let h = `<div class="kv"><div><small>Massa totale</small><b>${f(r.mass, 2)} kg</b></div><div><small>Baricentro</small><b>${f(Math.hypot(r.com[0], r.com[2]) * 1000, 0)} mm dall'asse · h ${f(r.com[1] * 1000, 0)} mm</b></div><div><small>Cedimento in punta</small><b>${f(r.defl, 2)} mm</b></div><div><small>Momento ribaltante</small><b>${f(r.Mtilt, 0)} N·m</b></div><div><small>Errori / avvisi</small><b>${r.errors} / ${r.warns}</b></div></div>`;
    h += `<table class="tb-spec"><tr><td>Giunto</td><td>Coppia richiesta (gravità + I·α) / disponibile</td></tr>${J.map(o => `<tr><td>${o.tag} · ${esc(o.R.name.split(" (")[0])} i=${o.i}</td><td>${f(o.treq, 1)} / ${f(Math.min(o.tavail, o.R.Tacc), 1)} N·m (${Math.round(o.util * 100)}%) · I = ${f(o.I, 3)} kg·m²</td></tr>`).join("")}${r.links.filter(x => isFinite(x.sf)).map(x => `<tr><td>L${x.k + 1} · ${esc(x.pp.s.desc)}</td><td>σ ${f(x.sigma, 0)} MPa · Re ${x.pp.mat.Re} · SF ${f(x.sf, 1)}</td></tr>`).join("")}</table>`;
    h += `<ul class="as-ev">${r.issues.map(x => `<li>${x.sev === "err" ? "⛔" : "⚠️"} <b>${esc(x.t)}</b>${x.why ? `<small>${esc(x.why)}</small>` : ""}${x.fix ? `<small>→ ${esc(x.fix)}</small>` : ""}${x.calc ? `<small>${esc(x.calc)}</small>` : ""}</li>`).join("") || "<li>✅ Nessun problema: il braccio è pronto per la simulazione.</li>"}</ul>`;
    return h + (r.issues.length ? `<button type="button" class="btn sm ghost" data-as="ask">Chiedi all'assistente</button>` : "");
  }
  function panel() {
    el.querySelectorAll("[data-tab]").forEach(b => { const on = b.getAttribute("data-tab") === S.tab; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); });
    $("#asPanel").innerHTML = S.tab === "serra" ? panelSerra() : S.tab === "cavi" ? panelCavi() : S.tab === "verifica" ? panelVerifica() : panelMonta(); gstyle($("#asPanel"));
    simPanel(); hud();
  }
  function simPanel() {
    const r = S.res || evalNow(), top = r.issues.find(x => x.sev === "err") || r.issues[0], sm = S.sim;
    let h = `<h3>Simulazione</h3><div class="lb-fields as-wire"><label class="lb-f"><span>Velocità giunti <b>${A.speed} °/s</b></span><input type="range" data-a="speed" min="10" max="240" step="5" value="${A.speed}"></label><label class="lb-f"><span>Rampa <b>${f(A.tacc, 2)} s</b></span><input type="range" data-a="tacc" min="0.1" max="2" step="0.05" value="${A.tacc}"></label></div>`;
    h += `<div class="row"><button type="button" class="btn" data-as="run">▶ Avvia ciclo pick & place</button>${sm ? `<button type="button" class="btn sm ghost" data-as="play">${S.play ? "❚❚ Pausa" : "▶ Riprendi"}</button>` : ""}</div>`;
    if (sm) { h += `<div class="as-tl"><input type="range" id="asT" min="0" max="${sm.tEnd.toFixed(2)}" step="0.01" value="${S.simT}" aria-label="Tempo della simulazione"><small id="asTt"></small></div><div class="as-bars" id="asBars"></div><p class="note">Esito: ${sm.ok ? "✅ ciclo completato senza errori" : "⛔ " + sm.events.filter(x => x.sev === "err").length + " errori"} · coppia max ${Math.round(Math.max(...sm.peakUtil) * 100)}% · motore più caldo ${Math.round(Math.max(...sm.peakTemp))} °C (tempo termico ×${sm.thermalScale})</p><ul class="as-ev">${sm.events.slice(0, 8).map(x => `<li>${x.sev === "err" ? "⛔" : "⚠️"} <b>${f(x.time, 1)} s · ${esc(x.t)}</b>${x.why ? `<small>${esc(x.why)}</small>` : ""}${x.fix ? `<small>→ ${esc(x.fix)}</small>` : ""}</li>`).join("")}</ul>`; }
    if (top) h += `<div class="tb-res ${top.sev}"><b>💡 Suggerimento: ${esc(top.t)}</b>${top.fix ? "<br>" + esc(top.fix) : ""}<br><button type="button" class="btn sm ghost" data-as="ask">Chiedi all'assistente</button></div>`;
    $("#asSim").innerHTML = h; if (sm) simBars(frameAt(S.simT));
  }
  function hud() { const r = S.res || evalNow(); $("#asHud").innerHTML = `<b>${f(r.mass, 2)} kg</b> · CdM ${f(Math.hypot(r.com[0], r.com[2]) * 1000, 0)} mm<br>${r.errors ? "⛔ " + r.errors : "✅ 0"} errori · ⚠️ ${r.warns}${S.sim ? "<br>t " + f(S.simT, 1) + " s" : ""}`; if (!S.sim) $("#asHint").textContent = r.ready ? (r.errors ? "Montaggio completo: correggi " + r.errors + " problemi e avvia la simulazione" : "Pronto: avvia il ciclo") : "Tocca un pezzo o uno slot per montarlo"; }
  /* ---------- eventi ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let dn = null;
  canvas.addEventListener("pointerdown", e => { dn = [e.clientX, e.clientY]; });
  canvas.addEventListener("pointerup", e => { if (!dn || Math.hypot(e.clientX - dn[0], e.clientY - dn[1]) > 6) return; dn = null; const rc = canvas.getBoundingClientRect(); ndc.set((e.clientX - rc.left) / rc.width * 2 - 1, -(e.clientY - rc.top) / rc.height * 2 + 1); ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects([arm, cab], true); for (const h of hits) { let o = h.object; while (o && o.userData.slot === undefined) o = o.parent; if (o && o.userData.slot) { selectSlot(o.userData.slot === "estop" ? "ctrl" : o.userData.slot); return; } } });
  function selectSlot(s) { S.sel = s; if (S.tab === "verifica") S.tab = "monta"; panel(); const c = el.querySelector(`[data-slot="${s}"]`); if (c && c.scrollIntoView && !test) c.scrollIntoView({ block: "nearest", behavior: rm ? "auto" : "smooth" }); $("#asHint").textContent = slotName(s) + (mountedSlot(s) ? " · montato" : " · da montare"); }
  el.addEventListener("click", e => { const b = e.target.closest("[data-as],[data-tab],[data-mount],[data-tight],[data-rec],[data-slot]"); if (!b) return;
    if (b.hasAttribute("data-tab")) { S.tab = b.getAttribute("data-tab"); save(); panel(); return; }
    if (b.hasAttribute("data-mount")) { const s = b.getAttribute("data-mount"); mount(s, !mountedSlot(s)); return; }
    if (b.hasAttribute("data-tight")) { tighten(b.getAttribute("data-tight")); return; }
    if (b.hasAttribute("data-rec")) { const s = b.getAttribute("data-rec"), rc = recommend(s); S.sel = s; if (rc) { S.tool = rc.tool; S.topt[rc.tool] = rc.opt; save(); env.toast && env.toast("Utensile giusto: " + TLS.byId(rc.tool).n.split(" (")[0] + ", " + TLS.dname(rc.opt.opt.split(":")[0], +rc.opt.opt.split(":")[1]) + ", " + f(rc.opt.torque, 1) + " N·m"); } panel(); return; }
    if (b.hasAttribute("data-slot") && !e.target.closest("select,input,button")) { selectSlot(b.getAttribute("data-slot")); return; }
    const k = b.getAttribute("data-as"); if (!k) return;
    if (k === "view") overview(); else if (k === "stress") { S.stress = !S.stress; b.setAttribute("aria-pressed", String(S.stress)); pose(currentQ(), S.sim ? frameAt(S.simT) : null); }
    else if (k === "com") { S.com = !S.com; b.setAttribute("aria-pressed", String(S.com)); pose(currentQ(), S.sim ? frameAt(S.simT) : null); }
    else if (k === "run") runSim(); else if (k === "play") { S.play = !S.play; if (S.play && S.simT >= S.sim.tEnd) { S.simT = 0; S.lastEvent = -1; } simPanel(); }
    else if (k === "mountall") { slotList().forEach(s => { if (!mountedSlot(s)) mount(s, true); }); }
    else if (k === "reset") { A = PHY.defaults(A.axes); S.sim = null; S.last = null; save(); evalNow(); build(); panel(); }
    else if (k === "wireauto") wireAuto(); else if (k === "gobench") env.goto && env.goto("circ");
    else if (k === "ask" && env.ask) { const r = S.res || evalNow(), top = (S.sim && S.sim.events.find(x => x.sev === "err")) || r.issues.find(x => x.sev === "err") || r.issues[0]; env.ask(top ? "Area di assemblaggio: \"" + top.t + "\". Perché succede e come lo risolvo?" : "Area di assemblaggio: il braccio è pronto, cosa posso migliorare?"); } });
  el.addEventListener("change", e => { const t = e.target, v = t.type === "checkbox" ? t.checked : t.value;
    if (t.hasAttribute("data-j")) { setJ(+t.getAttribute("data-j"), t.getAttribute("data-k"), v); return; }
    if (t.hasAttribute("data-l")) { const i = +t.getAttribute("data-l"), L = linkFrom(v); A.J[i].link = L; A.J[i].ltq = null; S.drop["L" + (i + 1)] = L && !rm && !test ? 1 : 0; S.sim = null; save(); evalNow(); build(); panel(); return; }
    if (t.hasAttribute("data-t")) { const k = t.getAttribute("data-t"); if (k === "tool") { S.tool = v; } else { const o = S.topt[S.tool] = S.topt[S.tool] || {}; o[k] = isNaN(+v) ? v : +v; } save(); panel(); return; }
    const a = t.getAttribute("data-a"); if (!a) return;
    if (a === "axes") { setAxes(+v); return; } if (a === "eff") { A.eff.id = v; A.eff.tq = null; } else if (a === "csrc") A.ctrl.src = v; else if (a === "mcu") A.ctrl.mcu = v; else if (a === "psu") A.psu = v; else if (a === "estop") A.estop = !!v; else if (a === "payload" || a === "speed" || a === "tacc") A[a] = +v;
    S.sim = null; save(); evalNow(); build(); panel(); });
  el.addEventListener("input", e => { const t = e.target; if (t.id === "asT") { S.play = false; seek(+t.value); return; } const k = t.getAttribute("data-t"); if (k && t.type === "range") { const o = S.topt[S.tool] = S.topt[S.tool] || {}; o[k] = +t.value; const b2 = t.previousElementSibling && t.previousElementSibling.querySelector("b"); if (b2) b2.textContent = k === "torque" ? f(o[k], 1) + " N·m" : k === "force" ? Math.round(o[k] * 100) + "%" : o[k]; save(); return; }
    const a = t.getAttribute("data-a"); if (a && t.type === "range") { const b2 = t.previousElementSibling && t.previousElementSibling.querySelector("b"); A[a] = +t.value; if (b2) b2.textContent = a === "speed" ? A[a] + " °/s" : a === "tacc" ? f(A[a], 2) + " s" : f(A[a], 1) + " kg"; } });
  /* ---------- camera e ciclo ---------- */
  let fly = null;
  function flyTo(p, t) { if (rm || test) { camera.position.copy(p); controls.target.copy(t); controls.update(); return; } fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: p, t1: t, k: 0 }; }
  function overview() { const k = Math.max(1, 1.05 / Math.max(0.4, camera.aspect)); flyTo(V3(1.0 * k, 0.9 * k, 1.4 * k), V3(0.1, 0.32, 0)); }
  function resize() { const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null; if (ro) ro.observe(stage);
  let raf = 0, last = 0, frameCount = 0;
  function frame(dt) {
    frameCount++; if (fly) { fly.k = Math.min(1, fly.k + dt / 0.8); const e = fly.k * fly.k * (3 - 2 * fly.k); camera.position.lerpVectors(fly.p0, fly.p1, e); controls.target.lerpVectors(fly.t0, fly.t1, e); if (fly.k >= 1) fly = null; }
    let dropping = false; Object.keys(S.drop).forEach(k => { if (S.drop[k] > 0) { S.drop[k] = Math.max(0, S.drop[k] - dt * 2.2); dropping = true; } });
    if (S.sim && S.play) { S.simT += dt; if (S.simT >= S.sim.tEnd) { S.simT = S.sim.tEnd; S.play = false; simPanel(); } applySim(false); if (frameCount % 10 === 0) hud(); } else if (dropping) pose(currentQ());
    if (S.flash > 0) { S.flash = Math.max(0, S.flash - dt * 1.5); scene.background.setRGB(0.08 + S.flash * 0.25, 0.09, 0.105); }
    controls.update(); renderer.render(scene, camera);
  }
  function tick(ts) { raf = 0; if (!S.run) return; const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts; frame(dt); raf = requestAnimationFrame(tick); }
  resize(); evalNow(); build(); overview(); panel();
  function refresh() { evalNow(); build(); panel(); }
  return {
    resume() { S.run = true; resize(); overview(); refresh(); last = 0; if (!raf) raf = requestAnimationFrame(tick); },
    pause() { S.run = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    refresh,
    ctx() { const r = S.res || evalNow(), sm = S.sim; return { axes: A.axes, mounted: slotList().filter(mountedSlot).length + "/" + slotList().length, tight: slotList().filter(s => slotBolts(s) && slotBolts(s).get() && tqState(slotBolts(s).get()) === "ok").length, wired: A.J.filter(j => j.wire && j.wire.mot && j.wire.pow && j.wire.sig).length, errors: r.errors, warns: r.warns, issues: r.issues.slice(0, 6).map(x => ({ sev: x.sev, t: x.t, why: x.why, fix: x.fix, calc: x.calc })), mass: r.mass, com: r.com, defl: r.defl, J: r.J.map(o => ({ tag: o.tag, treq: o.treq, tavail: Math.min(o.tavail, o.R.Tacc), util: o.util })), sim: sm ? { ok: sm.ok, events: sm.events.slice(0, 6).map(x => ({ time: x.time, sev: x.sev, t: x.t, fix: x.fix })), peakUtil: Math.max(...sm.peakUtil), peakTemp: Math.max(...sm.peakTemp) } : null, sel: S.sel ? slotName(S.sel) : null, tool: curTool().n, bench: benchCtx() }; },
    test: { get A() { return A; }, S, mount, tighten, recommend, setJ, setAxes, wireAuto, runSim, seek, evaluate: evalNow, selectSlot,
      set(path, v) { const ks = path.split("."); let o = A; while (ks.length > 1) o = o[ks.shift()]; o[ks[0]] = v; S.sim = null; save(); evalNow(); build(); panel(); },
      setLink(i, key) { A.J[i].link = linkFrom(key); A.J[i].ltq = null; save(); evalNow(); build(); panel(); },
      mountAll() { slotList().forEach(s => { if (!mountedSlot(s)) mount(s, true); }); },
      tightenAll() { return slotList().filter(s => slotBolts(s)).map(s => { const rc = recommend(s); return rc ? tighten(s, rc.tool, rc.opt) : null; }); },
      tab(t) { S.tab = t; panel(); }, inventory, frame(n) { for (let i = 0; i < (n || 1); i++) frame(0.05); }, render() { frame(0.016); }, view: overview },
    dispose() { this.pause(); if (ro) ro.disconnect(); pmrem.dispose(); renderer.dispose(); }
  };
}
