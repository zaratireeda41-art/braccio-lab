// Braccio Lab · Officina 3D – scena, processi e comandi. Caricato solo quando apri la scheda 3D.
import * as THREE from "../vendor/three.module.min.js";
import { OrbitControls, RoomEnvironment, EffectComposer, RenderPass, UnrealBloomPass, OutputPass } from "../vendor/three-addons.min.js";
import * as TX from "./textures.js?v=3";
import { buildArm, mats } from "./armview.js?v=3";
import { PROCS, PARAMS, DEF, SAFETY, QUAL } from "./procdata.js?v=3";

const D2R = Math.PI / 180, G = 9.81;

export function mount(el, api) {
  const SIM = api.SIM, ENG = api.ENG, CAT = api.CAT, fmt = ENG.fmt, esc = api.esc;
  const rm = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const st = api.store();
  st.proc = st.proc || "arm"; st.quality = st.quality || "auto"; st.p = st.p || {}; PROCS.forEach(p => { st.p[p.id] = Object.assign({}, DEF[p.id], st.p[p.id] || {}); });
  st.mode = st.mode || "joint"; st.env = st.env !== false; st.mult = st.mult || "auto"; st.estop = 0;
  const touch = matchMedia("(pointer: coarse)").matches || innerWidth < 700;
  let qname = st.quality === "auto" ? (touch ? "media" : "alta") : st.quality, Q = QUAL[qname];

  /* ---------------- DOM ---------------- */
  el.innerHTML = '<div class="o3"><div class="o3-stage" id="o3stage"><div class="o3-hud" id="o3hud"></div>' +
    '<div class="o3-top"><label class="o3-q"><span class="sr-only">Qualità grafica</span><select id="o3qual">' + [["auto", "Auto"], ["alta", "Alta"], ["media", "Media"], ["bassa", "Bassa"]].map(x => '<option value="' + x[0] + '"' + (st.quality === x[0] ? " selected" : "") + ">Qualità " + x[1] + "</option>").join("") + '</select></label><button type="button" class="o3b" data-o3="cam" aria-label="Rimetti la vista">⟲</button><button type="button" class="o3b' + (st.env ? " on" : "") + '" data-o3="env" aria-label="Mostra l\'area di lavoro">◍</button></div>' +
    '<div class="o3-banner" id="o3ban" hidden></div><div class="o3-msg" id="o3msg" hidden></div>' +
    '<button type="button" class="o3-estop" data-o3="estop" aria-label="Arresto di emergenza"><span>STOP</span></button>' +
    '<div class="o3-panel' + (st.panel === false ? " min" : "") + '" id="o3panel"><button type="button" class="o3-grab" data-o3="panel"><span></span>Comandi</button><div class="o3-pbody" id="o3pbody"></div></div></div></div>';
  const stage = el.querySelector("#o3stage"), hud = el.querySelector("#o3hud"), pbody = el.querySelector("#o3pbody"), ban = el.querySelector("#o3ban"), msgEl = el.querySelector("#o3msg");

  /* ---------------- renderer e scena ---------------- */
  let renderer, composer, bloom, scene, camera, controls, pmrem, keyLight, arcLight, raf = 0, running = false, lastT = 0;
  function makeRenderer() {
    if (renderer) { renderer.dispose(); renderer.domElement.remove(); }
    renderer = new THREE.WebGLRenderer({ antialias: Q.aa, powerPreference: "high-performance", preserveDrawingBuffer: !!api.testMode });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, Q.dpr));
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = Q.shadow > 0; renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.className = "o3-canvas"; stage.insertBefore(renderer.domElement, stage.firstChild);
    renderer.domElement.setAttribute("aria-label", "Officina 3D: trascina per ruotare, pizzica per lo zoom");
    if (controls) { controls.dispose(); controls = null; }
  }
  makeRenderer();
  scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a0d11);
  pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.42;
  camera = new THREE.PerspectiveCamera(42, 1, 0.01, 200);

  let world = null, arm = null, model = null, R = null, build = null, mission = null, scale = 1, work = null, piece = null;
  const T = {};
  const parts = { spark: null, smoke: null, chip: null, mist: null };

  /* ---------------- particelle (scintille, fumo, trucioli, nebbia) ---------------- */
  class PS {
    constructor(n, tex, add, size) {
      this.n = n; this.i = 0; this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.base = new Float32Array(n * 3); this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n);
      for (let k = 0; k < n; k++) this.pos[k * 3 + 1] = -99;
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(this.col, 3));
      this.mat = new THREE.PointsMaterial({ size, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: !add, opacity: add ? 1 : 0.55 });
      this.obj = new THREE.Points(g, this.mat); this.obj.frustumCulled = false; this.add = add; this.drag = 0; this.grav = 1; this.bounce = 0.3; this.live = 0;
    }
    emit(p, v, c, life) { const k = this.i, j = k * 3; this.i = (this.i + 1) % this.n; this.pos.set(p, j); this.vel.set(v, j); this.base.set(c, j); this.col.set(c, j); this.life[k] = this.max[k] = life; this.live = 2; }
    update(dt, floors) {
      if (!this.live) return; let alive = 0; const n = this.n, P = this.pos, V = this.vel;
      for (let k = 0; k < n; k++) { if (this.life[k] <= 0) continue; const j = k * 3; this.life[k] -= dt;
        if (this.life[k] <= 0) { P[j + 1] = -99; continue; } alive++;
        V[j + 1] -= G * this.grav * dt; const d = 1 - this.drag * dt; V[j] *= d; V[j + 1] *= d; V[j + 2] *= d;
        P[j] += V[j] * dt; P[j + 1] += V[j + 1] * dt; P[j + 2] += V[j + 2] * dt;
        const fy = floors(P[j], P[j + 2]); if (P[j + 1] < fy) { P[j + 1] = fy; V[j + 1] = -V[j + 1] * this.bounce; V[j] *= 0.6; V[j + 2] *= 0.6; }
        const f = this.life[k] / this.max[k], ff = this.add ? f * f : 1; this.col[j] = this.base[j] * ff; this.col[j + 1] = this.base[j + 1] * ff * (this.add ? f : 1); this.col[j + 2] = this.base[j + 2] * ff * (this.add ? f * f : 1); }
      this.obj.geometry.attributes.position.needsUpdate = true; this.obj.geometry.attributes.color.needsUpdate = true;
      if (!alive) this.live = Math.max(0, this.live - 1);
    }
    clear() { this.life.fill(0); for (let k = 0; k < this.n; k++) this.pos[k * 3 + 1] = -99; this.obj.geometry.attributes.position.needsUpdate = true; this.live = 0; }
  }

  /* ---------------- costruzione del mondo ---------------- */
  function disposeGroup(g) { g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => { if (m.userData && m.userData.shared) return; if (m.map && m.map.isCanvasTexture) m.map.dispose(); if (m.emissiveMap && m.emissiveMap.isCanvasTexture) m.emissiveMap.dispose(); m.dispose(); }); }); }
  function stdMesh(geo, mat, parent, shadow = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m; }
  function buildWorld(quiet) {
    if (world) { scene.remove(world); disposeGroup(world); }
    T.beam = null; T.arc = null; T.drop = null; T.pathLine = null; piece = null;
    world = new THREE.Group(); scene.add(world);
    build = api.build(); R = api.R(); mission = api.mission();
    model = SIM.model(build, R); scale = Math.max(0.3, model.reach);
    const cell = Math.max(1.2, model.reach * 1.55 + 0.5), lvl = mission.level || 1, fenceH = lvl >= 2 ? 2.0 : 0.65;
    scene.fog = new THREE.Fog(0x0a0d11, cell * 3, cell * 9); T.cell = cell;
    const cc = TX.concrete(); const floorMat = new THREE.MeshStandardMaterial({ map: cc.map, roughnessMap: cc.rough, roughness: 0.9, metalness: 0.05 });
    const fl = stdMesh(new THREE.PlaneGeometry(cell * 8, cell * 8), floorMat, world, false); fl.rotation.x = -Math.PI / 2;
    const ep = stdMesh(new THREE.PlaneGeometry(cell * 2, cell * 2), new THREE.MeshPhysicalMaterial({ color: 0x2c3a46, roughness: 0.35, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.55 }), world, false); ep.rotation.x = -Math.PI / 2; ep.position.y = 0.001;
    const hzMat = new THREE.MeshStandardMaterial({ map: TX.hazard(), roughness: 0.6 });
    [[0, cell], [0, -cell], [cell, 0], [-cell, 0]].forEach(([x, z], i) => { const s = stdMesh(new THREE.PlaneGeometry(cell * 2.08, 0.08), hzMat, world, false); s.rotation.x = -Math.PI / 2; if (i > 1) s.rotation.z = Math.PI / 2; s.position.set(x * 1.04, 0.002, z * 1.04); });
    const fenceTex = TX.fence(); fenceTex.repeat.set(cell * 4, fenceH * 2);
    const panelMat = lvl >= 2 ? new THREE.MeshStandardMaterial({ map: fenceTex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.45, color: 0x3a3f46 })
      : new THREE.MeshPhysicalMaterial({ color: 0xd7ecff, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
    const fence = new THREE.Group(); world.add(fence); fence.name = "recinzione";
    [[0, cell, 0], [0, -cell, 0], [cell, 0, 1], [-cell, 0, 1]].forEach(([x, z, r], i) => {
      const w = cell * 2, pn = stdMesh(new THREE.PlaneGeometry(i === 0 ? w * 0.62 : w, fenceH), panelMat, fence, false); pn.position.set(i === 0 ? -w * 0.19 : x, fenceH / 2 + 0.05, z); if (r) pn.rotation.y = Math.PI / 2;
      const np = Math.max(2, Math.round(w / 1.2)); for (let k = 0; k <= np; k++) { const u = -cell + 2 * cell * k / np, q2 = stdMesh(new THREE.BoxGeometry(0.04, fenceH + 0.05, 0.04), mats().yellow, fence); q2.position.set(r ? x : u, (fenceH + 0.05) / 2, r ? u : z); }
    });
    if (lvl >= 2) { const gate = stdMesh(new THREE.BoxGeometry(0.08, 0.12, 0.06), mats().red, fence); gate.position.set(cell * 0.43, 1.1, cell); const es = stdMesh(new THREE.BoxGeometry(0.12, 0.12, 0.08), mats().yellow, fence); es.position.set(cell * 0.6, 1.2, cell + 0.06); const mush = stdMesh(new THREE.CylinderGeometry(0.035, 0.03, 0.04, 24).rotateX(Math.PI / 2), mats().red, es); mush.position.z = 0.06; }
    scene.children.filter(o => o.isLight).forEach(l => scene.remove(l));
    scene.add(new THREE.HemisphereLight(0xc9dcff, 0x2a1d12, 0.35));
    keyLight = new THREE.DirectionalLight(0xfff1de, 2.2); keyLight.position.set(cell * 0.9, cell * 2.2, cell * 0.6); keyLight.castShadow = Q.shadow > 0;
    { keyLight.shadow.mapSize.set(Q.shadow || 1024, Q.shadow || 1024); const sc = keyLight.shadow.camera; sc.left = sc.bottom = -cell; sc.right = sc.top = cell; sc.near = 0.1; sc.far = cell * 6; keyLight.shadow.bias = -0.0004; keyLight.shadow.normalBias = 0.02; keyLight.shadow.radius = 4; }
    scene.add(keyLight);
    const rim = new THREE.DirectionalLight(0x7fb8ff, 0.8); rim.position.set(-cell, cell, -cell * 1.2); scene.add(rim);
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xeaf3ff, emissiveIntensity: 1.4 });
    [-0.5, 0.5].forEach(z => { const lamp = stdMesh(new THREE.BoxGeometry(cell * 1.1, 0.03, 0.12), lampMat, world, false); lamp.position.set(0, Math.max(fenceH + 0.6, model.reach + model.height + 0.6), z * cell); });
    arcLight = new THREE.PointLight(0xbfd8ff, 0, scale * 3, 2); world.add(arcLight);
    arm = buildArm(model, build, R); world.add(arm.root);
    const sp = TX.sprite("rgba(255,255,255,1)"), sm = TX.sprite("rgba(190,190,190,.9)", "rgba(120,120,120,0)");
    const n = Math.round(Q.parts * (rm ? 0.4 : 1)), sq = Math.sqrt(scale);
    parts.spark = new PS(n, sp, true, 0.005 * sq + 0.002); parts.spark.drag = 0.6; parts.spark.bounce = 0.35;
    parts.smoke = new PS(Math.round(n / 3), sm, false, 0.07 * sq); parts.smoke.grav = -0.012; parts.smoke.drag = 1.5; parts.smoke.bounce = 0;
    parts.chip = new PS(Math.round(n / 2), sp, false, 0.008 * sq + 0.003); parts.chip.bounce = 0.2; parts.chip.mat.opacity = 1;
    parts.mist = new PS(n, sm, false, 0.03 * sq); parts.mist.grav = 0.05; parts.mist.drag = 3; parts.mist.bounce = 0; parts.mist.mat.opacity = 0.35;
    Object.values(parts).forEach(p => world.add(p.obj));
    const env = new THREE.Group(); env.name = "inviluppo"; world.add(env);
    const shY = model.links[0];
    const sh = new THREE.Mesh(new THREE.SphereGeometry(model.reach, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.75), new THREE.MeshBasicMaterial({ color: 0x5cc8ff, transparent: true, opacity: 0.025, side: THREE.DoubleSide, depthWrite: false }));
    sh.position.set(0, shY, 0); env.add(sh);
    const wf = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(model.reach, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.75)), new THREE.LineBasicMaterial({ color: 0x5cc8ff, transparent: true, opacity: 0.09 })); wf.position.copy(sh.position); env.add(wf);
    const ringR = Math.sqrt(Math.max(model.reach * model.reach - shY * shY, 0.0001)); const ring = new THREE.Mesh(new THREE.RingGeometry(ringR * 0.985, ringR, 96), new THREE.MeshBasicMaterial({ color: 0x5cc8ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.004; env.add(ring);
    env.visible = st.env; T.env = env;
    T.target = new THREE.Mesh(new THREE.SphereGeometry(0.012 * sq + 0.006, 24, 16), new THREE.MeshBasicMaterial({ color: 0x3ddc84, toneMapped: false })); world.add(T.target);
    setupProcess(!quiet, quiet);
  }
  function camHome() {
    const c = work ? work.center : [scale * 0.5, 0.2, 0], asp = stage.clientWidth / Math.max(1, stage.clientHeight), d = Math.max(0.7, scale * 1.9);
    camera.fov = asp < 1 ? 58 : 42; camera.near = 0.004 * scale; camera.far = scale * 60;
    const tg = new THREE.Vector3(c[0] * 0.6, Math.max(0.05, c[1] + 0.12 * scale), c[2]);
    const dir = new THREE.Vector3(c[0] + d * 0.85, Math.max(model.height, c[1]) + d * 0.55, d * 0.8).sub(tg), lim = (T.cell || 2) * 0.9;
    let k = 1; if (Math.abs(dir.x) > 1e-6) k = Math.min(k, (lim - Math.abs(tg.x)) / Math.abs(dir.x)); if (Math.abs(dir.z) > 1e-6) k = Math.min(k, (lim - Math.abs(tg.z)) / Math.abs(dir.z));
    camera.position.copy(tg).addScaledVector(dir, Math.max(0.3, k)); camera.updateProjectionMatrix();
    if (!controls) { controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = !rm; controls.dampingFactor = 0.08; controls.maxPolarAngle = Math.PI * 0.495; }
    controls.minDistance = scale * 0.2; controls.maxDistance = scale * 8; controls.target.copy(tg); controls.update();
  }

  /* ---------------- utensile, pezzo e percorso del processo ---------------- */
  const cur = () => st.p[st.proc];
  const effById = id => CAT.byId(CAT.EFFECTORS, id);
  function toolFor(pr) {
    const e = R.eff || effById(build.effector);
    if (SIM.HEADS[pr]) { const h = SIM.HEADS[pr]; return { kind: pr, L: h.L, mass: h.mass, head: h, eff: null }; }
    if (pr === "mill" || pr === "drill") { const sp = e.kind === "spindle" ? e : effById("sp08"); return { kind: "spindle", L: sp.L, mass: sp.mass, eff: sp, auto: e.kind !== "spindle" }; }
    if (pr === "pick") { const g = e.kind === "spindle" ? effById("grip") : e; return { kind: g.kind === "vac" ? "vac" : g.kind === "mag" ? "mag" : g.kind, L: g.L, mass: g.mass, eff: g, auto: e.kind === "spindle" }; }
    return { kind: e.kind === "spindle" ? "spindle" : e.kind === "vac" ? "vac" : e.kind === "mag" ? "mag" : e.kind, L: e.L, mass: e.mass, eff: e };
  }
  function pmodel(tl) { const m = Object.assign({}, model); m.effL = tl.L + 0.006; m.effMass = tl.mass; m.reach = model.reach - model.effL + m.effL; return m; }
  const MATCOL = { acciaio: "#7d858c", s235: "#7d858c", s355: "#737b83", c45: "#80878e", inox: "#b7bec5", alluminio: "#c9d0d6", ottone: "#c9a24a", pom: "#ece9e2" };
  function standoff(pr, p) { return pr === "laser" ? 0.001 : pr === "plasma" ? 0.003 : pr === "mig" ? 0.015 : pr === "tig" ? 0.003 : pr === "spray" ? p.dist / 1000 : pr === "mill" ? -p.ap / 1000 : 0; }
  function pathOf(pr, p) {
    if (pr === "drill") { const r = p.size / 2000, k = p.path === "circle" ? 6 : 4, P = []; for (let i = 0; i < k; i++) { const a = i / k * Math.PI * 2; P.push(p.path === "circle" ? [r * Math.cos(a), r * Math.sin(a)] : [(i % 2 ? 1 : -1) * r, (i < 2 ? -1 : 1) * r * 0.6]); } return { holes: P, pts: P };
    }
    const pts = p.path === "custom" ? SIM.parsePoints(p.pts) : null;
    return SIM.path(pr === "pick" ? "line" : p.path, p.size / 1000, pts);
  }
  function extent(pts) { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; pts.forEach(q => { a = Math.min(a, q[0]); b = Math.max(b, q[0]); c = Math.min(c, q[1]); d = Math.max(d, q[1]); }); return { x0: a, x1: b, z0: c, z1: d, w: b - a, h: d - c }; }
  const DOWN = [0, -1, 0];
  function findWork(pm, pts, so, pr) {
    const fr = [0.58, 0.5, 0.66, 0.44, 0.74, 0.38, 0.82, 0.3], H = model.height;
    const ys = pr === "pick" ? [0.25 * scale, H * 0.4, 0.05] : [H * 0.45, Math.max(0.02, H * 0.15), H * 0.8, H * 1.1, 0.02];
    const sub = pts.filter((q, i) => i % Math.max(1, Math.floor(pts.length / 10)) === 0).concat([pts[pts.length - 1]]);
    const lift = pr === "pick" ? 0.06 * scale + 0.05 : 0.04 * Math.sqrt(scale) + 0.01;
    for (const f of fr) for (const y of ys) {
      const cx = f * pm.reach; let q = pm.home, ok = true;
      for (const s of sub) { const r = SIM.ik(pm, [cx + s[0], y + so, s[1]], DOWN, q, { iter: 50 }); if (!r.ok) { ok = false; break; } q = r.q;
        if (lift) { const r2 = SIM.ik(pm, [cx + s[0], y + so + lift, s[1]], DOWN, q, { iter: 50 }); if (!r2.ok) { ok = false; break; } } }
      if (ok) return { cx, cy: y, ok: true };
    }
    return { cx: 0.55 * pm.reach, cy: Math.max(0.02, H * 0.45), ok: false };
  }
  function clearWork() { if (work && work.group) { world.remove(work.group); disposeGroup(work.group); } work = null; Object.values(parts).forEach(p => p && p.clear()); }
  function setupProcess(resetQ, quiet) {
    stop(); clearWork();
    const pr = st.proc, p = cur(), tl = toolFor(pr), pm = pmodel(tl), maxS = Math.max(20, Math.round(pm.reach * 1000 * 0.42 / 5) * 5);
    if (!st.chal && p.size > maxS && p.path !== "custom") { p.size = maxS; if (!quiet) setTimeout(() => msg("Percorso ridotto a " + maxS + " mm per stare nella portata del tuo braccio."), 0); }
    const pth = pathOf(pr, p), so = standoff(pr, p);
    arm.setTool(tl.kind, tl.L, tl.eff); if (arm.fingers) arm.grip(true);
    const pts = pr === "pick" ? [pth.pts[0], pth.pts[pth.pts.length - 1]] : pth.pts;
    const fw = findWork(pm, pts, so, pr), ex = extent(pts), g = new THREE.Group(); world.add(g);
    work = { pr, p, tl, pm, pth, so, fw, ex, group: g, center: [fw.cx, fw.cy, 0], y: fw.cy };
    const cx = fw.cx, cy = fw.cy, mat = p.mat;
    // tavolo sotto il pezzo
    const tw = Math.max(ex.w, 0.05) + 0.12 * Math.sqrt(scale) + 0.06, td = Math.max(ex.h, 0.05) + 0.12 * Math.sqrt(scale) + 0.06;
    const pieceT = pr === "mill" || pr === "drill" ? Math.max(0.02, (p.depth || 10) / 1000 + 0.01) : pr === "pick" ? 0.01 : Math.max(0.0015, (p.t || 3) / 1000);
    const topY = cy - (pr === "mill" || pr === "drill" ? pieceT : pr === "pick" ? 0 : pieceT);
    work.table = { min: [cx - tw / 2, 0, -td / 2], max: [cx + tw / 2, Math.max(0.001, topY), td / 2] };
    if (topY > 0.012) {
      const tm = new THREE.Group(); g.add(tm);
      if (pr === "laser" || pr === "plasma") { const n = Math.max(6, Math.round(tw / 0.025)); for (let i = 0; i <= n; i++) { const s = stdMesh(new THREE.BoxGeometry(0.003, 0.04, td), mats().darkSteel, tm); s.position.set(cx - tw / 2 + tw * i / n, topY - 0.02, 0); } const frame = stdMesh(new THREE.BoxGeometry(tw + 0.02, Math.max(0.005, topY - 0.04), td + 0.02), mats().housing, tm); frame.position.set(cx, (topY - 0.04) / 2, 0); }
      else { const top = stdMesh(new THREE.BoxGeometry(tw, 0.02, td), mats().darkSteel, tm); top.position.set(cx, topY - 0.01, 0); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const l = stdMesh(new THREE.BoxGeometry(0.03, topY - 0.02, 0.03), mats().housing, tm); l.position.set(cx + a * (tw / 2 - 0.03), (topY - 0.02) / 2, b * (td / 2 - 0.03)); }); }
    }
    const W = Math.max(ex.w, ex.h, 0.04) + (pr === "spray" ? p.dist / 1000 * 1.2 : 0.06), sz = Q.sheet;
    work.W = W; work.x0 = cx - W / 2; work.z0 = -W / 2;
    if (pr === "laser" || pr === "plasma" || pr === "mig" || pr === "tig" || pr === "spray") {
      const ws = TX.workSheet(pr === "spray" ? "#9aa1a7" : MATCOL[mat] || "#8e979f", sz, 9); work.ws = ws;
      const top = new THREE.Mesh(new THREE.PlaneGeometry(W, W).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ map: ws.map, emissiveMap: ws.heat, emissive: 0xffffff, emissiveIntensity: 2.2, metalness: mat === "pom" ? 0 : 0.85, roughness: 0.38, clearcoat: pr === "spray" ? 0.3 : 0 }));
      top.position.set(cx, cy + 0.0002, 0); top.receiveShadow = true; g.add(top); work.top = top;
      const body = stdMesh(new THREE.BoxGeometry(W, pieceT, W), new THREE.MeshPhysicalMaterial({ color: MATCOL[mat] || "#8e979f", metalness: 0.85, roughness: 0.4 }), g); body.position.set(cx, cy - pieceT / 2, 0); work.body = body;
      if (pr === "mig" || pr === "tig") {
        const bead = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 14, 8), new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.8, roughness: 0.35, emissive: 0xffffff, emissiveIntensity: 0, vertexColors: false }), 1600);
        bead.count = 0; bead.castShadow = true; bead.instanceMatrix.setUsage(THREE.DynamicDrawUsage); g.add(bead); work.bead = bead; work.beadBorn = []; work.beadLast = null;
        const glow = new THREE.InstancedMesh(new THREE.SphereGeometry(0.62, 10, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), 1600); glow.count = 0; g.add(glow); work.glow = glow;
      }
    } else if (pr === "mill" || pr === "drill") {
      const n = pr === "mill" ? Q.hm : 2, geo = new THREE.PlaneGeometry(W, W, n, n).rotateX(-Math.PI / 2);
      const col = new Float32Array(geo.attributes.position.count * 3).fill(1); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const top = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: MATCOL[mat] || "#c9d0d6", vertexColors: true, metalness: mat === "pom" ? 0 : 0.8, roughness: 0.42 })); top.position.set(cx, cy, 0); top.receiveShadow = true; top.castShadow = false; g.add(top); work.top = top; work.hmN = n;
      const body = stdMesh(new THREE.BoxGeometry(W, pieceT, W), new THREE.MeshPhysicalMaterial({ color: MATCOL[mat] || "#c9d0d6", metalness: mat === "pom" ? 0 : 0.8, roughness: 0.45 }), g); body.position.set(cx, cy - pieceT / 2 - 0.0003, 0);
      [-1, 1].forEach(s => { const v = stdMesh(new THREE.BoxGeometry(0.03, 0.03, W * 0.5), mats().blue, g); v.position.set(cx + s * (W / 2 + 0.015), cy - 0.015, 0); });
      work.holes = [];
    } else if (pr === "pick") {
      const A = pts[0], B = pts[1], side = Math.min(Math.max(Math.cbrt(p.m / 1500), 0.015), tl.eff && tl.eff.stroke ? Math.max(0.015, tl.eff.stroke / 1000 * 0.9) : 0.2);
      const conv = stdMesh(new THREE.BoxGeometry(side * 4, 0.02, side * 2.2), mats().rubber, g); conv.position.set(cx + A[0], cy - 0.01, A[1]);
      const pal = stdMesh(new THREE.BoxGeometry(side * 3, 0.015, side * 3), new THREE.MeshStandardMaterial({ color: 0xb98a55, roughness: 0.8 }), g); pal.position.set(cx + B[0], cy - 0.0075, B[1]);
      const box = stdMesh(new THREE.BoxGeometry(side, side, side), new THREE.MeshPhysicalMaterial({ color: 0x3a7bd5, metalness: 0.1, roughness: 0.5, clearcoat: 0.4 }), g); box.position.set(cx + A[0], cy + side / 2, A[1]);
      work.box = box; work.side = side; work.A = A; work.B = B; work.so = side; work.boxVel = null;
    }
    // linea del percorso
    if (pr !== "drill" && pr !== "pick") { const lp = pth.pts.map(q => new THREE.Vector3(cx + q[0], cy + Math.max(so, 0) + 0.0015, q[1])); const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(lp), new THREE.LineDashedMaterial({ color: fw.ok ? 0x5cc8ff : 0xff5a5a, dashSize: 0.006 * Math.sqrt(scale), gapSize: 0.004 * Math.sqrt(scale), transparent: true, opacity: 0.85 })); ln.computeLineDistances(); g.add(ln); T.pathLine = ln; }
    else { pts.forEach(q => { const mk = new THREE.Mesh(new THREE.RingGeometry(0.004, 0.006, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: fw.ok ? 0x5cc8ff : 0xff5a5a })); mk.position.set(cx + q[0], cy + 0.0012, q[1]); g.add(mk); }); }
    // fascio laser / plasma, arco di saldatura
    if (pr === "laser" || pr === "plasma") { const bm = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 12, 1, true), new THREE.MeshBasicMaterial({ color: pr === "laser" ? 0xff3b1e : 0x9fc4ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); bm.visible = false; g.add(bm); T.beam = bm; }
    if (pr === "mig" || pr === "tig" || pr === "plasma" || pr === "laser") { const ar = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.sprite("rgba(255,255,255,1)"), color: pr === "laser" ? 0xffb060 : 0xcfe4ff, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); ar.visible = false; g.add(ar); T.arc = ar; }
    piece = null; T.drop = null;
    res = computeResult(); planned = plan();
    if (resetQ || !q) q = pm.home.slice();
    applyQ(q); if (resetQ || !controls) camHome(); if (!quiet) renderPanel(); renderHud();
  }

  /* ---------------- pianificazione (IK lungo il percorso) ---------------- */
  let res = null, planned = null, q = null, play = null;
  function ikPath(pm, P3, q0) { const out = []; let qq = q0, bad = 0, worst = 0;
    for (const p of P3) { const r = SIM.ik(pm, p, DOWN, qq, { iter: 40 }); out.push(r.q); qq = r.q; if (!r.ok) bad++; worst = Math.max(worst, r.err); }
    return { qs: out, bad, worst }; }
  function cartSeg(pm, P3, v, a, active, q0, tag) {
    const cum = [0]; for (let i = 1; i < P3.length; i++) cum.push(cum[i - 1] + Math.hypot(P3[i][0] - P3[i - 1][0], P3[i][1] - P3[i - 1][1], P3[i][2] - P3[i - 1][2]));
    const L = cum[cum.length - 1], n = Math.max(2, Math.min(240, Math.ceil(L / (0.003 * Math.sqrt(scale))) + 1)), S = [];
    for (let i = 0; i < n; i++) { const s = L * i / (n - 1); let k = 1; while (k < cum.length - 1 && cum[k] < s) k++; const u = (s - cum[k - 1]) / ((cum[k] - cum[k - 1]) || 1); S.push([0, 1, 2].map(j => P3[k - 1][j] + (P3[k][j] - P3[k - 1][j]) * u)); }
    const ik = ikPath(pm, S, q0), prof = SIM.trapezoid(L, Math.max(v, 1e-4), Math.max(a, 0.01));
    return { type: "cart", P: S, qs: ik.qs, bad: ik.bad, worst: ik.worst, L, prof, T: Math.max(prof.T, 0.05), active, tag, end: ik.qs[ik.qs.length - 1] };
  }
  function jointSeg(qa, qb, T, tag) { return { type: "joint", qa: qa.slice(), qb: qb.slice(), T, tag, end: qb.slice() }; }
  function actSeg(T, tag) { return { type: "act", T, tag }; }
  function procSpeed(pr, p) { // m/s
    return pr === "laser" || pr === "plasma" ? p.v / 60 : pr === "mig" || pr === "tig" ? p.v / 60000 : pr === "mill" ? p.vf / 60000 : pr === "spray" || pr === "arm" || pr === "pick" ? p.v / 1000 : 0.05; }
  function plan() {
    const w = work, pm = w.pm, pr = w.pr, p = w.p, cx = w.fw.cx, cy = w.fw.cy, so = w.so, up = 0.04 * Math.sqrt(scale) + 0.01;
    const v = procSpeed(pr, p), a = pr === "arm" || pr === "pick" ? p.a : pr === "laser" || pr === "plasma" ? 4 : 1.5, vRap = Math.min(0.5, 0.5 * scale), segs = [];
    const P = (x, z, dy) => [cx + x, cy + dy, z];
    let qc = pm.home.slice();
    const toJ = (target, T, tag) => { const r = SIM.ik(pm, target, DOWN, qc, { iter: 60 }); const T2 = T || Math.max(0.5, Math.max(...r.q.map((x, i) => Math.abs(x - qc[i]))) / 1.2); segs.push(jointSeg(qc, r.q, T2, tag)); qc = r.q; return r.ok; };
    const lin = (A, B, vv, aa, active, tag) => { const s = cartSeg(pm, Array.isArray(A[0]) ? A : [A, B], vv, aa, active, qc, tag); segs.push(s); qc = s.end; return s; };
    if (pr === "drill") {
      const feed = p.f * p.n / 60000, d = p.depth / 1000;
      w.pth.holes.forEach((h, i) => { toJ(P(h[0], h[1], up), null, "rapido"); lin(P(h[0], h[1], up), P(h[0], h[1], 0.002), vRap * 0.3, 2, false, "avvicinamento"); lin(P(h[0], h[1], 0.002), P(h[0], h[1], -d), feed, 0.5, true, "foro" + i); lin(P(h[0], h[1], -d), P(h[0], h[1], up), vRap * 0.4, 2, false, "risalita"); });
    } else if (pr === "pick") {
      const A = w.A, B = w.B, sd = w.side, hz = 0.06 * scale + sd;
      toJ(P(A[0], A[1], sd + hz), null, "rapido"); lin(P(A[0], A[1], sd + hz), P(A[0], A[1], sd * 0.55), v * 0.4, p.a, false, "discesa");
      segs.push(actSeg(0.35, "chiudi")); lin(P(A[0], A[1], sd * 0.55), P(A[0], A[1], sd + hz), v * 0.6, p.a, false, "carico:sollevo");
      lin([P(A[0], A[1], sd + hz), P((A[0] + B[0]) / 2, (A[1] + B[1]) / 2, sd + hz * 1.3), P(B[0], B[1], sd + hz)], null, v, p.a, false, "carico:trasferisco");
      lin(P(B[0], B[1], sd + hz), P(B[0], B[1], sd * 0.55 + 0.002), v * 0.4, p.a, false, "carico:appoggio"); segs.push(actSeg(0.35, "apri")); lin(P(B[0], B[1], sd * 0.55 + 0.002), P(B[0], B[1], sd + hz), v * 0.6, p.a, false, "risalita");
    } else {
      const pts = w.pth.pts, s0 = pts[0], s1 = pts[pts.length - 1];
      toJ(P(s0[0], s0[1], so + up), null, "rapido"); lin(P(s0[0], s0[1], so + up), P(s0[0], s0[1], so), Math.min(vRap * 0.3, 0.1), 2, false, "avvicinamento");
      if (pr !== "arm") segs.push(actSeg(pr === "laser" || pr === "plasma" ? 0.3 : 0.25, "innesco"));
      lin(pts.map(q2 => P(q2[0], q2[1], so)), null, v, a, pr !== "arm", "processo");
      if (pr !== "arm") segs.push(actSeg(pr === "mig" || pr === "tig" ? 0.4 : 0.15, "spegni"));
      lin(P(s1[0], s1[1], so), P(s1[0], s1[1], so + up), vRap * 0.3, 2, false, "risalita");
    }
    segs.push(jointSeg(qc, pm.home, Math.max(0.6, Math.max(...pm.home.map((x, i) => Math.abs(x - qc[i]))) / 1.2), "casa")); qc = pm.home.slice();
    const T = segs.reduce((s, x) => s + x.T, 0), bad = segs.reduce((s, x) => s + (x.bad || 0), 0), worst = segs.reduce((s, x) => Math.max(s, x.worst || 0), 0);
    const procT = segs.filter(x => x.active).reduce((s, x) => s + x.T, 0);
    // collisioni a campione
    const coll = new Set(); segs.forEach(sg => { const arr = sg.qs || (sg.qa ? [sg.qa, sg.qb] : []); arr.forEach((qq, i) => { if (i % 6) return; SIM.collisions(pm, qq, work.table).forEach(h => coll.add(h.what)); }); });
    const reachOk = bad === 0 && work.fw.ok;
    return { segs, T, procT, bad, worst, reachOk, coll: [...coll], mult: st.mult === "auto" || !st.mult ? autoMult(T) : +st.mult };
  }
  function autoMult(T) { const m = [1, 2, 5, 10, 20, 50]; for (const x of m) if (T / x <= 14) return x; return 50; }

  /* ---------------- risultati del processo e del braccio ---------------- */
  function gripForce(e) { if (!e) return 0; if (e.kind === "vac") { const A = Math.PI * Math.pow((e.dc || 40) / 2000, 2); return (e.cups || 1) * A * 60000; } return e.F || 0; }
  function computeResult() {
    const pr = st.proc, p = cur(), tl = work ? work.tl : toolFor(pr); let r = {}, F = 0, lat = false, Fvec = null, payload = 0;
    if (pr === "laser") r = SIM.laser({ mat: p.mat, gas: p.gas, P: p.P, t: p.t, v: p.v });
    else if (pr === "plasma") r = SIM.plasma({ I: +p.I, t: p.t, v: p.v });
    else if (pr === "mig") r = SIM.weld({ proc: "mig", mat: p.mat, t: p.t, U: p.U, wfs: p.wfs, v: p.v, wire: +p.wire });
    else if (pr === "tig") r = SIM.weld({ proc: "tig", mat: p.mat, t: p.t, U: p.U, I: p.I, wfs: p.wfs, v: p.v, wire: 1.6 });
    else if (pr === "mill") { r = SIM.mill({ mat: p.mat, D: p.D, z: p.z, n: p.n, vf: p.vf, ap: p.ap, ae: p.ae, P: tl.eff.P }); F = r.F; lat = true; }
    else if (pr === "drill") { r = SIM.drill({ mat: p.mat, D: p.D, f: p.f, n: p.n, P: tl.eff.P }); F = r.Ff; }
    else if (pr === "spray") r = SIM.spray({ Q: p.Q, v: p.v, dist: p.dist, gun: p.gun, solids: p.solids / 100, overlap: p.overlap / 100 });
    else if (pr === "pick") { const e = tl.eff, mu = +p.mu, need = e.kind === "vac" || e.kind === "mag" ? p.m * (G + p.a) * 2 : SIM.gripNeed(p.m, p.a, mu), Fg = gripForce(e); payload = p.m;
      r = { need, F: Fg, ok: Fg >= need, eff: e, issues: [] };
      if (!r.ok) r.issues.push({ sev: "err", t: "Il pezzo scivola", d: "Servono " + fmt(need, 0) + " N di presa (m·(g+a)·2" + (e.kind === "vac" || e.kind === "mag" ? "" : "/μ") + "), " + esc(e.name) + " ne dà " + fmt(Fg, 0) + " N. In accelerazione il pezzo cade." });
      else if (Fg < 1.3 * need) r.issues.push({ sev: "warn", t: "Presa con poco margine", d: "Solo " + fmt((Fg / need - 1) * 100, 0) + "% oltre il necessario: con olio o polvere sulle dita il pezzo scivola." }); }
    else { payload = mission.payload || 0; r = { issues: [] }; }
    const o = tl.head ? { head: tl.head, F, lat } : { effector: tl.eff.id, payload, F, lat };
    const wp = SIM.withProcess(build, mission, o);
    return { pr, r, wp, F, lat, payload: tl.head ? 0 : payload, toolMass: tl.mass };
  }

  /* ---------------- pannello comandi ---------------- */
  const kv = (k, v, cls) => '<div class="o3kv-r' + (cls ? " " + cls : "") + '"><span>' + esc(k) + "</span><b>" + v + "</b></div>";
  const f = (x, d) => fmt(x, d);
  function issuesAll() {
    const out = (res.r.issues || []).slice(), wp = res.wp, pl = planned;
    if (!pl.reachOk) out.unshift({ sev: "err", t: "Fuori portata", d: work.fw.ok ? pl.bad + " punti del percorso non si raggiungono con l'utensile verso il basso (errore max " + f(pl.worst * 1000, 1) + " mm). Riduci la dimensione del percorso." : "Con questo braccio (portata " + f(work.pm.reach * 1000, 0) + " mm compreso l'utensile) il percorso non entra nell'area di lavoro. Riduci la dimensione o allunga i link nel Costruttore." });
    pl.coll.forEach(c => out.push({ sev: "warn", t: "Collisione: " + c, d: c === "pavimento" ? "Un tratto del braccio scende sotto il pavimento: alza il pezzo o cambia la postura." : "Un link attraversa il tavolo: allontana il pezzo dalla base o usa un link più corto." }));
    if (!wp.ok) { const js = (wp.R.defl.joints || []).slice().sort((a, b) => b[1] - a[1]), top = js[0]; out.push({ sev: st.proc === "mill" || st.proc === "drill" ? "err" : "warn", t: "Precisione in punta: " + f(wp.err, 2) + " mm (tolleranza " + f(wp.tol, 2) + ")", d: "Con la " + (res.F ? "forza di processo di " + f(res.F, 0) + " N" : "testa di processo") + " la punta si sposta troppo. Contributo più grande: " + (top ? top[0] + " (" + f(top[1], 3) + " mm)" : "link") + ". Sul J2 serve un riduttore più rigido (cicloidale/RV) o un braccio più corto." }); }
    wp.jointErrs.forEach(e => out.push({ sev: "err", t: e.joint + ": " + e.title, d: esc(e.why || "") + (e.fix ? " " + esc(e.fix) : "") }));
    if (work.tl.auto) out.push({ sev: "info", t: "Utensile di prova", d: st.proc === "pick" ? "Il progetto ha un mandrino: per il pick & place uso la pinza elettrica da 300 N." : "Il progetto non ha un mandrino: per la simulazione monto " + esc(work.tl.eff.name) + "." });
    return out;
  }
  function resultHtml() {
    const r = res.r, p = cur(), pr = st.proc, wp = res.wp; let h = "";
    if (pr === "laser") h = kv("Velocità massima tipica", r.vmax ? f(r.vmax, 2) + " m/min" : "non taglia") + kv("Tua velocità", f(p.v, 2) + " m/min · " + (isFinite(r.ratio) ? f(r.ratio * 100, 0) + "%" : "—"), r.through ? (r.ratio > 0.95 || r.ratio < 0.5 ? "warn" : "ok") : "err") + kv("Spessore massimo con " + p.P + " kW " + p.gas, f(r.tmax, 1) + " mm") + kv("Solco di taglio (kerf)", f(r.kerf, 2) + " mm") + kv("Pressione del gas", r.press) + kv("Energia per mm", f(r.E, 1) + " J/mm") + '<p class="o3-ex">La tabella è quella tipica dei laser in fibra: con O₂ l\'ossigeno brucia il ferro e aggiunge calore (taglia spesso ma lento), con N₂ il metallo fuso viene solo soffiato via (bordo lucido, serve più potenza). Lavora intorno all\'85% della velocità massima.</p>';
    else if (pr === "plasma") h = kv("Velocità massima tipica", r.vmax ? f(r.vmax, 2) + " m/min" : "non taglia") + kv("Tua velocità", f(p.v, 2) + " m/min", r.through ? "ok" : "err") + kv("Solco", f(r.kerf, 1) + " mm") + '<p class="o3-ex">Il plasma ad aria scioglie il metallo con un arco a 20 000 °C ristretto da un ugello. Solco largo e bordo un po\' inclinato, ma costa poco e taglia spesso.</p>';
    else if (pr === "mig" || pr === "tig") { const range = r.range; h = kv("Corrente", f(r.I, 0) + " A" + (pr === "mig" ? " (dal filo " + p.wfs + " m/min Ø" + p.wire + ")" : "")) + kv("Tensione", f(r.U, 1) + " V" + (pr === "mig" ? " · sinergica ≈ " + f(r.Usyn, 1) + " V" : ""), pr === "mig" && Math.abs(r.U - r.Usyn) > 2.5 ? "warn" : "") + kv("Apporto termico Q", f(r.Q, 2) + " kJ/mm", r.Q > range[1] || r.Q < range[0] ? "warn" : "ok") + kv("Campo consigliato", f(range[0], 1) + "–" + f(range[1], 1) + " kJ/mm") + kv("Cordone (largo × alto)", f(r.beadW, 1) + " × " + f(r.beadH, 1) + " mm") + kv("Penetrazione stimata", f(r.pen, 1) + " mm su " + p.t + " mm", r.pen < 0.3 * p.t ? "warn" : r.pen > 1.25 * p.t ? "err" : "ok") + (pr === "mig" ? kv("Trasferimento", r.mode) + kv("Deposito", f(r.kgh, 2) + " kg/h") : "") + '<p class="o3-ex">Q = η·U·I·60 / (v·1000) = ' + f(r.eta, 1) + "·" + f(r.U, 1) + "·" + f(r.I, 0) + "·60 / (" + p.v + "·1000) = <b>" + f(r.Q, 2) + " kJ/mm</b> (EN 1011-1, η " + (pr === "mig" ? "0,8 per MIG/MAG" : "0,6 per TIG") + "). Troppo calore: deformazioni e grano grosso; troppo poco: incollature.</p>"; }
    else if (pr === "mill") h = kv("Velocità di taglio vc", f(r.vc, 0) + " m/min", r.vc < r.mat.vc[0] || r.vc > r.mat.vc[1] ? "warn" : "ok") + kv("Avanzamento per dente fz", f(r.fz, 3) + " mm", r.fz < r.mat.fz[0] || r.fz > r.mat.fz[1] ? "warn" : "ok") + kv("Spessore medio truciolo hm", f(r.hm, 3) + " mm") + kv("Pressione di taglio kc", f(r.kc, 0) + " N/mm²") + kv("Asportazione Q", f(r.Q, 1) + " cm³/min") + kv("Potenza al mandrino", f(r.Pc, 2) + " kW / " + f(work.tl.eff.P / 1000, 2) + " kW", r.Pc * 1000 > work.tl.eff.P ? "err" : "ok") + kv("Forza di taglio Fc / avanzamento Ff", f(r.Fc, 0) + " / " + f(r.Ff, 0) + " N") + kv("Deviazione della punta", f(wp.err, 3) + " mm / " + f(wp.tol, 2) + " mm", wp.ok ? "ok" : "err") + '<p class="o3-ex">Kienzle: kc = kc1.1 · hm<sup>−mc</sup>, Pc = Q·kc / (60 000·η). La forza Fc spinge la punta del braccio: quella deviazione entra nel calcolo di precisione (giunti, link, gioco), soprattutto sul J2.</p>';
    else if (pr === "drill") h = kv("Velocità di taglio vc", f(r.vc, 1) + " m/min") + kv("Coppia di foratura Mc", f(r.Mc, 2) + " N·m") + kv("Spinta assiale Ff", f(r.Ff, 0) + " N", wp.ok ? "ok" : "err") + kv("Potenza", f(r.Pc, 2) + " kW") + kv("Avanzamento", f(r.vf, 0) + " mm/min") + kv("Deviazione della punta", f(wp.err, 3) + " mm", wp.ok ? "ok" : "err") + '<p class="o3-ex">Mc = kc·f·D² / 8000, spinta ≈ 0,43·kc·D·f. La spinta assiale spinge il braccio verso l\'alto: per i robot si preferiscono punte piccole o pre-fori.</p>';
    else if (pr === "spray") h = kv("Larghezza del ventaglio", f(r.W, 0) + " mm") + kv("Passo tra le passate", f(r.pitch, 0) + " mm") + kv("Film umido", f(r.wet, 0) + " µm", r.wet > 120 ? "err" : "ok") + kv("Film secco", f(r.dry, 0) + " µm", r.dry < 20 ? "warn" : "ok") + kv("Efficienza di trasferimento", f(r.TE * 100, 0) + "%") + kv("Vernice persa (overspray)", f(r.waste, 0) + " ml/min") + '<p class="o3-ex">Film umido = Q·TE / (v·passo). Il film secco è quello umido per il residuo secco della vernice.</p>';
    else if (pr === "pick") h = kv("Presa necessaria", f(r.need, 0) + " N") + kv("Presa disponibile", f(r.F, 0) + " N · " + esc(r.eff.name), r.ok ? "ok" : "err") + kv("Carico al polso", f(p.m + work.tl.mass, 2) + " kg") + '<p class="o3-ex">Pinza a dita: F = m·(g+a)·2/μ (sicurezza 2, regola SCHUNK). Ventose e magneti: F = m·(g+a)·2.</p>';
    else h = kv("Portata con l'utensile", f(work.pm.reach * 1000, 0) + " mm") + kv("Carico della missione", f(mission.payload || 0, 2) + " kg") + kv("Precisione stimata", f(wp.err, 3) + " / " + f(wp.tol, 2) + " mm", wp.ok ? "ok" : "warn");
    h += kv("Tempo ciclo", f(planned.T, 1) + " s" + (planned.procT ? " (processo " + f(planned.procT, 1) + " s)" : ""));
    const iss = issuesAll();
    h += iss.length ? '<div class="o3i">' + iss.map(i => '<div class="o3i-r ' + i.sev + '"><b>' + esc(i.t) + "</b><small>" + i.d + "</small></div>").join("") + "</div>" : '<div class="o3i"><div class="o3i-r ok"><b>Parametri corretti</b><small>Nessun problema: avvia il ciclo.</small></div></div>';
    return h;
  }
  function paramHtml(pr) {
    const p = st.p[pr];
    return PARAMS[pr].map(d => {
      if (d.type === "sel") return '<label class="o3s"><span>' + esc(d.n) + '</span><select data-o3p="' + d.k + '">' + d.opts.map(o => '<option value="' + o[0] + '"' + (String(p[d.k]) === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>").join("") + "</select></label>";
      return '<label class="o3s"><span>' + esc(d.n) + ' <b data-o3v="' + d.k + '">' + f(p[d.k], d.d) + " " + d.u + '</b></span><input type="range" min="' + d.min + '" max="' + d.max + '" step="' + d.step + '" value="' + p[d.k] + '" data-o3p="' + d.k + '"></label>';
    }).join("");
  }
  function jointsHtml() {
    const pm = work.pm;
    return '<div class="o3-seg"><button type="button" data-o3mode="joint" class="' + (st.mode === "joint" ? "on" : "") + '">Giunti</button><button type="button" data-o3mode="ik" class="' + (st.mode === "ik" ? "on" : "") + '">Punta (IK)</button></div>' +
      (st.mode === "joint" ? '<div id="o3jl">' + pm.kinds.map((k, i) => '<div class="o3j"><span>J' + (i + 1) + " <small>" + (k === "yaw" ? "rotazione" : k === "pitch" ? "beccheggio" : "rollio") + '</small></span><button type="button" class="o3jog" data-jog="' + i + ':-1" aria-label="J' + (i + 1) + ' meno">−</button><input type="range" min="' + pm.lim[i][0] + '" max="' + pm.lim[i][1] + '" step="0.5" value="' + (q[i] / D2R).toFixed(1) + '" data-o3q="' + i + '" aria-label="Angolo J' + (i + 1) + '"><button type="button" class="o3jog" data-jog="' + i + ':1" aria-label="J' + (i + 1) + ' più">+</button><b data-o3qv="' + i + '">' + f(q[i] / D2R, 1) + "°</b></div>").join("") + "</div>"
        : '<p class="o3-ex">Trascina la pallina verde nella scena oppure usa i cursori: la cinematica inversa trova gli angoli con l\'utensile verso il basso.</p>' + ["x", "y", "z"].map((a, i) => { const tp = SIM.fk(pm, q).tip; return '<label class="o3s"><span>' + a.toUpperCase() + ' <b data-o3tv="' + i + '">' + f(tp[i] * 1000, 0) + ' mm</b></span><input type="range" min="' + (i === 1 ? 0 : -pm.reach * 1000).toFixed(0) + '" max="' + (pm.reach * 1000 + (i === 1 ? model.height * 1000 : 0)).toFixed(0) + '" step="1" value="' + (tp[i] * 1000).toFixed(0) + '" data-o3t="' + i + '"></label>'; }).join(""));
  }
  function renderPanel() {
    const pr = st.proc, p = cur(), chal = SIM.CHALLENGES;
    let h = '<div class="o3c-row" role="tablist" aria-label="Processo">' + PROCS.map(x => '<button type="button" class="o3c' + (x.id === pr ? " on" : "") + '" data-o3proc="' + x.id + '" title="' + esc(x.t) + '">' + esc(x.n) + "</button>").join("") + "</div>";
    h += '<details class="o3d" open><summary>Sfide 3D</summary><div class="o3c-row">' + chal.map(c => { const b = api.best(c.id); return '<button type="button" class="o3c ch' + (st.chal === c.id ? " on" : "") + '" data-o3chal="' + c.id + '">' + esc(c.title) + (b ? ' <span class="stars s' + b.stars + '"></span> ' + b.score : "") + "</button>"; }).join("") + "</div>" + (st.chal ? '<p class="o3-ex"><b>Obiettivo:</b> ' + esc(chal.filter(c => c.id === st.chal)[0].goal) + ' <button type="button" class="o3l" data-o3="nochal">Esci dalla sfida</button></p>' : "") + "</details>";
    h += '<details class="o3d" open><summary>' + esc(PROCS.filter(x => x.id === pr)[0].t) + "</summary>" + paramHtml(pr);
    if (pr !== "pick") h += '<label class="o3s"><span>' + (pr === "drill" ? "Fori" : "Percorso") + '</span><select data-o3p="path">' + (pr === "drill" ? [["circle", "6 fori su un cerchio"], ["rect", "4 fori a rettangolo"]] : [["line", "Linea"], ["circle", "Cerchio"], ["rect", "Rettangolo"], ["zigzag", "Zig-zag"], ["custom", "Punti miei"]]).map(o => '<option value="' + o[0] + '"' + (p.path === o[0] ? " selected" : "") + ">" + o[1] + "</option>").join("") + "</select></label>";
    h += '<label class="o3s"><span>' + (pr === "pick" ? "Distanza presa → deposito" : "Dimensione") + ' <b data-o3v="size">' + f(p.size, 0) + ' mm</b></span><input type="range" min="20" max="' + Math.max(60, Math.round(model.reach * 1000 * 0.9 / 10) * 10) + '" step="5" value="' + p.size + '" data-o3p="size"></label>';
    if (p.path === "custom" && pr !== "drill" && pr !== "pick") h += '<label class="o3s"><span>Punti X,Z in mm (separati da ;)</span><input type="text" inputmode="decimal" data-o3p="pts" value="' + esc(p.pts || "-60,0; 0,40; 60,0; 0,-40; -60,0") + '"></label>';
    h += "</details>";
    h += '<div class="o3-run"><button type="button" class="btn" data-o3="play">▶ Avvia ciclo</button><button type="button" class="btn ghost" data-o3="stop">■ Stop</button><button type="button" class="btn ghost" data-o3="home">⌂ Casa</button><label class="o3s sm"><span>Tempo</span><select id="o3mult">' + ["auto", "1", "2", "5", "10", "20", "50"].map(x => '<option value="' + x + '"' + (String(st.mult) === x ? " selected" : "") + ">" + (x === "auto" ? "Auto (" + planned.mult + "×)" : x + "×") + "</option>").join("") + '</select></label></div><div class="bar sm"><i id="o3prog"></i></div>';
    h += '<div id="o3score"></div><details class="o3d" open><summary>Risultato e calcoli</summary><div class="o3kv" id="o3res">' + resultHtml() + "</div></details>";
    h += '<details class="o3d"' + (pr === "arm" ? " open" : "") + '><summary>Muovi il braccio</summary><div id="o3joints">' + jointsHtml() + "</div></details>";
    h += '<details class="o3d"><summary>Sicurezza</summary><ul class="o3safe">' + SAFETY.arm.concat(pr === "arm" ? [] : SAFETY[pr]).map(s => "<li>" + esc(s) + "</li>").join("") + "<li>Fungo rosso = arresto di emergenza di categoria 0 (EN ISO 13850): toglie subito la coppia ai motori. Per ripartire: sblocca il fungo, poi reset.</li></ul></details>";
    pbody.innerHTML = h;
  }
  function refreshResult() { res = computeResult(); planned = plan(); const el2 = el.querySelector("#o3res"); if (el2) el2.innerHTML = resultHtml(); const m = el.querySelector('#o3mult option[value="auto"]'); if (m) m.textContent = "Auto (" + planned.mult + "×)"; if (T.pathLine) T.pathLine.material.color.set(planned.reachOk ? 0x5cc8ff : 0xff5a5a); renderHud(); }

  /* ---------------- HUD in sovrimpressione ---------------- */
  let hudT = 0, lastTorq = null;
  function renderHud() {
    if (!work) return; const pm = work.pm, payload = play && play.carry ? cur().m : res.payload;
    const Fv = play && play.active && res.F ? (st.proc === "drill" ? [0, res.F, 0] : [-(play.dir ? play.dir[0] : 1) * res.r.Ff, 0.3 * res.r.Fc, -(play.dir ? play.dir[2] : 0) * res.r.Ff]) : null;
    const tq = SIM.torques(pm, q, payload, Fv, res.toolMass), lim = SIM.atLimit(pm, q); lastTorq = tq;
    const tip = SIM.fk(pm, q).tip;
    hud.innerHTML = tq.map((t, i) => '<span class="o3h ' + (lim[i] ? "lim" : t.cls) + '" title="Coppia J' + (i + 1) + '">J' + (i + 1) + " " + f(Math.min(t.u, 9.99) * 100, 0) + "%" + (lim[i] ? " ⟂" : "") + "</span>").join("") + '<span class="o3h tcp">' + f(tip[0] * 1000, 0) + " · " + f(tip[1] * 1000, 0) + " · " + f(tip[2] * 1000, 0) + " mm</span>" + (play ? '<span class="o3h st">' + esc(play.label || "") + " " + (play.mult > 1 ? play.mult + "×" : "") + "</span>" : "") + (!api.testMode && fpsShow ? '<span class="o3h fps">' + fpsShow + " fps · " + qname + "</span>" : "");
    arm.joints.forEach((j, i) => { const c = lim[i] ? 0x8a5cff : tq[i].cls === "err" ? 0xff3b3b : tq[i].cls === "warn" ? 0xffb020 : 0x2bd67b; j.ring = j.ring || addRing(j, i); j.ring.material.color.setHex(c); });
  }
  function addRing(j, i) { const r = arm.info[i].rh * 1.12; const m = new THREE.Mesh(new THREE.TorusGeometry(r, Math.max(0.0015, r * 0.06), 8, 48), new THREE.MeshBasicMaterial({ color: 0x2bd67b, toneMapped: false })); if (j.kind === "yaw") m.rotation.x = Math.PI / 2; else if (j.kind === "roll") m.rotation.y = Math.PI / 2; m.position.y = j.kind === "yaw" ? arm.info[i].rh * 0.2 : 0; if (j.kind === "pitch") m.position.z = arm.info[i].rh * 0.66; j.g.add(m); return m; }
  function applyQ(qq) { q = qq.slice(); arm.setQ(q); const tp = SIM.fk(work.pm, q).tip; if (st.mode !== "ik" || !drag) T.target.position.set(tp[0], tp[1], tp[2]); }

  /* ---------------- riproduzione del ciclo ---------------- */
  let drag = null, fpsShow = 0, falling = [];
  const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  function stop() { if (play) { play = null; effectsOff(); } setProgress(0); }
  function startPlay() {
    if (st.estop) { msg("Arresto di emergenza attivo: sblocca e fai reset."); return; }
    if (!planned.reachOk) { msg("Il percorso esce dall'area di lavoro: il ciclo parte ma il braccio non arriva su tutti i punti."); }
    const keepQ = q.slice(); setupProcess(false, true); applyQ(keepQ);
    planned.segs[0].qa = keepQ.slice(); if (planned.segs[0].type === "joint") planned.segs[0].T = Math.max(0.5, Math.max(...planned.segs[0].qb.map((x, i) => Math.abs(x - keepQ[i]))) / 1.2);
    play = { i: 0, t: 0, el: 0, mult: planned.mult, label: "", active: false, dir: null, carry: false, prevTip: null, on: false, sOld: 0 };
    if (T.trail) { world.remove(T.trail); T.trail.geometry.dispose(); }
    if (st.proc === "arm") { const g2 = new THREE.BufferGeometry(); g2.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3 * 2000), 3)); g2.setDrawRange(0, 0); T.trail = new THREE.Line(g2, new THREE.LineBasicMaterial({ color: 0x3ddc84, toneMapped: false })); T.trail.frustumCulled = false; world.add(T.trail); T.trailN = 0; }
    el.querySelector("#o3score").innerHTML = "";
  }
  const smooth = u => u * u * (3 - 2 * u);
  function evalSeg(sg, t) {
    if (sg.type === "joint") { const u = smooth(Math.min(1, t / sg.T)); return sg.qa.map((a, i) => a + (sg.qb[i] - a) * u); }
    if (sg.type === "cart") { const s = sg.prof.s(t), x = sg.L ? s / sg.L * (sg.qs.length - 1) : 0, k = Math.min(sg.qs.length - 2, Math.floor(x)), u = x - k; play.sNow = s; play.vNow = sg.prof.v(t);
      if (sg.qs.length < 2) return sg.qs[0].slice(); return sg.qs[k].map((a, i) => a + (sg.qs[k + 1][i] - a) * u); }
    return q;
  }
  function tickPlay(dt) {
    let rem = dt * play.mult; const simDt = rem;
    while (rem > 1e-9 && play) {
      const sg = planned.segs[play.i], step = Math.min(rem, sg.T - play.t); play.t += step; rem -= step; play.el += step;
      play.label = sg.tag.split(":").pop(); play.active = !!sg.active && play.on !== false;
      if (sg.type !== "act") { const qq = evalSeg(sg, play.t); applyQ(qq); }
      const tip = SIM.fk(work.pm, q).tip;
      if (sg.active || play.carry) { if (play.prevTip) { const d = [tip[0] - play.prevTip[0], tip[1] - play.prevTip[1], tip[2] - play.prevTip[2]], l = Math.hypot(d[0], d[1], d[2]); if (l > 1e-7) play.dir = d.map(x => x / l); } }
      if (sg.active) processDraw(play.prevTip || tip, tip, sg);
      if (play.carry) carryTick(sg, tip);
      play.prevTip = tip;
      if (play.t >= sg.T - 1e-9) { segEnd(sg); play.i++; play.t = 0; play.prevTip = null; if (play.i >= planned.segs.length) { finishProcess(); break; } }
    }
    if (play) { const sg = planned.segs[play.i]; processFx(dt, simDt, sg && sg.active); setProgress(play.el / planned.T); }
  }
  function segEnd(sg) {
    if (sg.tag === "innesco") play.on = true;
    if (sg.tag === "spegni") { play.on = false; effectsOff(); }
    if (sg.tag === "chiudi") { if (arm.fingers) arm.grip(false); play.carry = true; play.slipped = false; }
    if (sg.tag === "apri") { if (arm.fingers) arm.grip(true); play.carry = false; }
    if (/^foro/.test(sg.tag)) effectsOff();
  }
  function setProgress(u) { const b = el.querySelector("#o3prog"); if (b) b.style.width = (Math.max(0, Math.min(1, u)) * 100).toFixed(1) + "%"; }
  function effectsOff() { if (T.beam) T.beam.visible = false; if (T.arc) T.arc.visible = false; if (arcLight) arcLight.intensity = 0; }
  const rnd = (a, b) => a + Math.random() * (b - a);
  function uv(x, z, size) { return [(x - work.x0) / work.W * size, (z - work.z0) / work.W * size]; }
  function processDraw(a, b, sg) {
    const pr = st.proc, p = cur(), r = res.r, ws = work.ws;
    if (pr === "laser" || pr === "plasma") {
      const [x0, y0] = uv(a[0], a[2], ws.size), [x1, y1] = uv(b[0], b[2], ws.size), kpx = Math.max(1.6, r.kerf / 1000 / work.W * ws.size);
      ws.ctx.strokeStyle = r.through ? "#07090b" : "#3a2b22"; ws.ctx.lineCap = "round"; ws.ctx.lineWidth = r.through ? kpx : kpx * 0.7; ws.ctx.beginPath(); ws.ctx.moveTo(x0, y0); ws.ctx.lineTo(x1, y1); ws.ctx.stroke();
      if (r.through) { ws.ctx.strokeStyle = "rgba(80,60,120,.25)"; ws.ctx.lineWidth = kpx * 3; ws.ctx.stroke(); }
      ws.map.needsUpdate = true; heatLine(a, b, kpx * 2.2, r.through ? 1 : 0.7);
    } else if (pr === "mig" || pr === "tig") beadDraw(a, b);
    else if (pr === "mill") millCut(b);
    else if (pr === "drill") drillTick(b, sg);
    else if (pr === "spray") paintDraw(a, b);
    else if (pr === "arm" && T.trail && T.trailN < 2000) { T.trail.geometry.attributes.position.setXYZ(T.trailN++, b[0], b[1], b[2]); T.trail.geometry.setDrawRange(0, T.trailN); T.trail.geometry.attributes.position.needsUpdate = true; }
  }
  function heatLine(a, b, w, k) { const ws = work.ws, s = ws.heatCanvas.width, [x0, y0] = uv(a[0], a[2], s), [x1, y1] = uv(b[0], b[2], s), g = ws.heatCtx; g.lineCap = "round";
    g.strokeStyle = "rgba(255,120,30," + 0.5 * k + ")"; g.lineWidth = Math.max(2, w * s / ws.size * 2.2); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = "rgba(255,230,160," + 0.9 * k + ")"; g.lineWidth = Math.max(1, w * s / ws.size * 0.8); g.stroke(); ws.heat.needsUpdate = true; work.hot = 6; }
  const tmpM = new THREE.Matrix4(), tmpC = new THREE.Color(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3();
  function beadDraw(a, b) {
    const r = res.r, w = Math.max(r.beadW, 1.5) / 1000, h = Math.max(r.beadH, 0.4) / 1000, step = w * 0.3, bd = work.bead;
    let last = work.beadLast; if (!last) { last = a; addBead(a, w, h); }
    let d = Math.hypot(b[0] - last[0], b[2] - last[2]);
    while (d >= step && bd.count < bd.instanceMatrix.count) { const u = step / d; last = [last[0] + (b[0] - last[0]) * u, 0, last[2] + (b[2] - last[2]) * u]; addBead(last, w, h); d = Math.hypot(b[0] - last[0], b[2] - last[2]); }
    work.beadLast = last; heatLine(a, b, w / work.W * work.ws.size * 3, 0.9);
    const ws = work.ws, [x0, y0] = uv(a[0], a[2], ws.size), [x1, y1] = uv(b[0], b[2], ws.size), g = ws.ctx, bw = w / work.W * ws.size;
    g.lineCap = "round"; [[4.2, cur().mat === "inox" ? "rgba(60,80,190,.10)" : "rgba(40,40,60,.10)"], [2.6, "rgba(190,140,60,.14)"], [1.7, "rgba(120,80,40,.2)"]].forEach(([k, c]) => { g.strokeStyle = c; g.lineWidth = bw * k; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }); ws.map.needsUpdate = true;
  }
  function addBead(p, w, h) { const bd = work.bead, i = bd.count; tmpM.compose(tmpP.set(p[0], work.y + h * 0.15, p[2]), tmpQ.identity(), tmpS.set(w, h * 1.7, w)); bd.setMatrixAt(i, tmpM); bd.setColorAt(i, tmpC.setRGB(1, 1, 1)); work.glow.setMatrixAt(i, tmpM); work.glow.setColorAt(i, tmpC.setRGB(1, 0.9, 0.6)); bd.count = work.glow.count = i + 1; work.beadBorn[i] = 0; bd.instanceMatrix.needsUpdate = work.glow.instanceMatrix.needsUpdate = true; if (bd.instanceColor) bd.instanceColor.needsUpdate = true; if (work.glow.instanceColor) work.glow.instanceColor.needsUpdate = true; }
  const FINAL = { s235: [0.42, 0.40, 0.38], s355: [0.4, 0.38, 0.36], inox: [0.75, 0.62, 0.42], alluminio: [0.82, 0.84, 0.86] };
  function coolBead(simDt) {
    const bd = work.bead; if (!bd || !bd.count) return; let any = false; const fin = FINAL[cur().mat] || FINAL.s235, tau = st.proc === "tig" ? 1.2 : 1.8;
    for (let i = Math.max(0, bd.count - 400); i < bd.count; i++) { if (work.beadBorn[i] > 30) continue; work.beadBorn[i] += simDt; any = true; const Tm = 1500 * Math.exp(-work.beadBorn[i] / tau);
      const k = Math.max(0, Math.min(1, (Tm - 450) / 1050)); tmpC.setRGB(1 * Math.min(1, k * 1.6), 0.25 + 0.75 * k * k, k * k * k * 0.8).multiplyScalar(k * 3); work.glow.setColorAt(i, tmpC);
      const tt = Math.max(0, Math.min(1, (Tm - 250) / 800)); bd.setColorAt(i, tmpC.setRGB(fin[0] + (0.25 - fin[0]) * tt, fin[1] + (0.12 - fin[1]) * tt, fin[2] + (0.08 - fin[2]) * tt)); }
    if (any) { bd.instanceColor.needsUpdate = true; work.glow.instanceColor.needsUpdate = true; }
  }
  function millCut(tip) {
    const top = work.top, pos = top.geometry.attributes.position, col = top.geometry.attributes.color, p = cur(), r = p.D / 2000, lx = tip[0] - top.position.x, lz = tip[2], floorY = tip[1] - work.y, n = work.hmN, W = work.W, step = W / n;
    const i0 = Math.max(0, Math.floor((lx - r + W / 2) / step)), i1 = Math.min(n, Math.ceil((lx + r + W / 2) / step)), j0 = Math.max(0, Math.floor((lz - r + W / 2) / step)), j1 = Math.min(n, Math.ceil((lz + r + W / 2) / step));
    let ch = false;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const k = j * (n + 1) + i, x = pos.getX(k), z = pos.getZ(k); if ((x - lx) * (x - lx) + (z - lz) * (z - lz) <= r * r && pos.getY(k) > floorY) { pos.setY(k, floorY); col.setXYZ(k, 1.25, 1.25, 1.3); ch = true; } }
    if (ch) { pos.needsUpdate = true; col.needsUpdate = true; work.normT = (work.normT || 0) + 1; }
  }
  function drillTick(tip, sg) {
    const idx = +sg.tag.slice(4), p = cur(); let h = work.holes[idx];
    if (!h) { h = new THREE.Mesh(new THREE.CylinderGeometry(p.D / 2000, p.D / 2000, 1, 24), new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.9 })); h.position.set(tip[0], work.y, tip[2]); work.group.add(h); work.holes[idx] = h; h.scale.y = 0.0001; }
    const d = Math.max(0.0001, work.y - tip[1]); h.scale.y = d; h.position.y = work.y - d / 2 + 0.0004;
  }
  function paintDraw(a, b) {
    const ws = work.ws, p = cur(), r = res.r, rad = r.W / 2000 / work.W * ws.size, [x1, y1] = uv(b[0], b[2], ws.size), g = ws.ctx, al = Math.min(0.5, r.wet / 400);
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) / (r.W / 2000) * 3));
    for (let s = 1; s <= steps; s++) { const u = s / steps, [x, y] = uv(a[0] + (b[0] - a[0]) * u, a[2] + (b[2] - a[2]) * u, ws.size); const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, hexA(p.col, al)); gr.addColorStop(0.7, hexA(p.col, al * 0.5)); gr.addColorStop(1, hexA(p.col, 0)); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rad, rad * 0.35, Math.atan2(b[2] - a[2], b[0] - a[0]) + Math.PI / 2, 0, 7); g.fill(); }
    if (r.wet > 120 && Math.random() < 0.08) { g.fillStyle = hexA(p.col, 0.8); g.beginPath(); g.ellipse(x1 + rnd(-rad, rad), y1 + rnd(-rad * 0.3, rad * 0.3), 2, 6 + Math.random() * 8, 0, 0, 7); g.fill(); }
    ws.map.needsUpdate = true;
  }
  function hexA(h, a) { const n = parseInt(h.slice(1), 16); return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a.toFixed(3) + ")"; }
  function carryTick(sg, tip) {
    const b = work.box; if (!b || play.slipped) return;
    b.position.set(tip[0], tip[1] - work.side * 0.45, tip[2]);
    if (!res.r.ok && /^carico/.test(sg.tag) && sg.type === "cart" && play.vNow > 0.05 && play.t < sg.prof.ta + 0.01) { play.slipped = true; play.carry = false; falling.push({ o: b, v: [(play.dir ? play.dir[0] : 0) * play.vNow, -0.2, (play.dir ? play.dir[2] : 0) * play.vNow], floor: work.side / 2, spin: rnd(-4, 4) }); msg("Il pezzo è scivolato dalla pinza durante l'accelerazione!"); }
  }
  function emitAt(ps, p, n, fn) { for (let i = 0; i < n; i++) { const o = fn(i); ps.emit(o.p || p, o.v, o.c, o.l); } }
  function processFx(dt, simDt, active) {
    const pr = st.proc, r = res.r, tip = SIM.fk(work.pm, q).tip, nm = rm ? 0.35 : 1, sq = Math.sqrt(scale);
    const on = active && play && play.on !== false;
    if ((pr === "laser" || pr === "plasma") && T.beam) {
      T.beam.visible = on; T.arc.visible = on; arcLight.intensity = on ? (pr === "laser" ? 0.05 : 0.14) * (0.85 + Math.random() * 0.3) * scale * scale : 0;
      if (on) { const top = 0.05 * sq, rr = Math.max(r.kerf / 2000, 0.0007 * sq); T.beam.position.set(tip[0], work.y + top / 2, tip[2]); T.beam.scale.set(rr, top, rr); T.arc.position.set(tip[0], work.y + 0.001, tip[2]); const s = (pr === "laser" ? 0.012 : 0.02) * sq * (0.8 + Math.random() * 0.4); T.arc.scale.set(s, s, s); arcLight.position.set(tip[0], work.y + 0.06 * sq, tip[2]); arcLight.color.setHex(pr === "laser" ? 0xffa050 : 0xb8d0ff);
        const n = Math.round((pr === "plasma" ? 26 : 18) * nm * Q.parts / 1200), by = r.through ? work.y - (cur().t || 3) / 1000 : work.y + 0.001, back = play.dir || [1, 0, 0];
        emitAt(parts.spark, [tip[0], by, tip[2]], n, () => ({ v: r.through ? [-back[0] * rnd(0.2, 1.5) + rnd(-0.3, 0.3), -rnd(1, 4), -back[2] * rnd(0.2, 1.5) + rnd(-0.3, 0.3)] : [rnd(-1, 1), rnd(0.5, 2.5), rnd(-1, 1)], c: [1, rnd(0.55, 0.85), rnd(0.2, 0.4)], l: rnd(0.25, 0.8) }));
        if (Math.random() < 0.5) parts.smoke.emit([tip[0], work.y + 0.004, tip[2]], [rnd(-0.02, 0.02), rnd(0.03, 0.08), rnd(-0.02, 0.02)], [0.45, 0.45, 0.47], rnd(1, 2.4)); }
    } else if ((pr === "mig" || pr === "tig") && T.arc) {
      T.arc.visible = on; arcLight.intensity = on ? (pr === "mig" ? rnd(0.08, 0.22) : rnd(0.08, 0.11)) * scale * scale : 0;
      if (on) { const s = (pr === "mig" ? 0.03 : 0.022) * sq * rnd(0.7, 1.3); T.arc.position.set(tip[0], work.y + 0.003, tip[2]); T.arc.scale.set(s, s, s); T.arc.material.color.setHex(pr === "mig" ? 0xd8e8ff : 0xc0d4ff); arcLight.position.set(tip[0], work.y + 0.06 * sq, tip[2]); arcLight.color.setHex(0xbfd8ff);
        const n = Math.round((pr === "mig" ? (r.mode === "short arc" ? 16 : 8) : 1) * nm * Q.parts / 1200);
        emitAt(parts.spark, [tip[0], work.y + 0.003, tip[2]], n, () => ({ v: [rnd(-1.4, 1.4), rnd(0.3, 2.2), rnd(-1.4, 1.4)], c: [1, rnd(0.6, 0.9), rnd(0.25, 0.5)], l: rnd(0.2, 0.7) }));
        if (pr === "mig" && Math.random() < 0.7) parts.smoke.emit([tip[0], work.y + 0.01, tip[2]], [rnd(-0.02, 0.02), rnd(0.04, 0.1), rnd(-0.02, 0.02)], [0.5, 0.5, 0.52], rnd(1.2, 2.6)); }
    } else if (pr === "mill" || pr === "drill") {
      if (arm.spin) arm.spin.rotation.x += dt * Math.min(cur().n, 1500) / 60 * Math.PI * 2;
      if (on) { const n = Math.round(6 * nm * Q.parts / 1200), c = cur().mat === "ottone" ? [0.85, 0.7, 0.3] : cur().mat === "pom" ? [0.95, 0.94, 0.9] : [0.82, 0.85, 0.88];
        emitAt(parts.chip, [tip[0], work.y + 0.002, tip[2]], n, () => { const a = Math.random() * Math.PI * 2, s = rnd(0.3, 1.6); return { v: [Math.cos(a) * s, rnd(0.3, 1.5), Math.sin(a) * s], c, l: rnd(0.8, 2) }; }); }
    } else if (pr === "spray") {
      if (on) { const r2 = res.r, cc = hexToRgb(cur().col); for (let i = 0; i < Math.round(14 * nm * Q.parts / 1200); i++) { const a = Math.random() * Math.PI * 2, s = Math.random(), down = rnd(1.2, 2.2); parts.mist.emit([tip[0], tip[1] + 0.002, tip[2]], [Math.cos(a) * s * r2.W / 2000 * down * 2.2 / (cur().dist / 1000) * 0.6, -down, Math.sin(a) * s * r2.W / 2000 * down * 0.8 / (cur().dist / 1000) * 0.6], cc, rnd(0.15, 0.35)); } }
    }
    if (pr === "mig" || pr === "tig") coolBead(simDt);
  }
  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  function finishProcess() {
    const pr = st.proc, r = res.r, p = cur(); play = null; effectsOff(); setProgress(1); if (arm.fingers) arm.grip(true);
    if ((pr === "laser" || pr === "plasma") && r.through && (p.path === "circle" || p.path === "rect")) dropPiece();
    let txt = "Ciclo completato in " + f(planned.T, 1) + " s";
    if (pr === "pick" && work.box && !res.r.ok) txt = "Ciclo finito, ma il pezzo è caduto: serve più forza di presa";
    if (st.chal) { const c = SIM.CHALLENGES.filter(x => x.id === st.chal)[0]; if (c && c.proc === pr) { const sc = SIM.scoreOf(c.id, { res: r, reach: planned.reachOk, err: res.wp.err, tol: res.wp.tol }); api.saveBest(c.id, sc); if (sc.stars >= 2) api.award("o3d");
      el.querySelector("#o3score").innerHTML = '<div class="o3-score"><div><b>' + esc(c.title) + '</b><span class="stars s' + sc.stars + '"></span></div><div class="big">' + sc.score + "<small>/100</small></div>" + sc.notes.map(n => '<div class="o3i-r ' + (n.ok ? "ok" : n.pts ? "warn" : "err") + '"><b>' + esc(n.t) + "</b><small>" + n.pts + " / " + n.max + " punti</small></div>").join("") + "</div>"; txt = "Sfida: " + sc.score + "/100"; } }
    api.toast(txt); renderHud();
  }
  function dropPiece() {
    const p = cur(), sz = p.size / 1000, tt = Math.max(0.0015, p.t / 1000), m = new THREE.MeshPhysicalMaterial({ color: MATCOL[p.mat] || "#7d858c", metalness: 0.85, roughness: 0.4, emissive: 0xff5a10, emissiveIntensity: 0.6 });
    const geo = p.path === "circle" ? new THREE.CylinderGeometry(sz / 2 - 0.0005, sz / 2 - 0.0005, tt, 64) : new THREE.BoxGeometry(sz - 0.001, tt, sz * 0.7 - 0.001);
    const o = stdMesh(geo, m, work.group); o.position.set(work.fw.cx, work.y - tt / 2 + 0.0001, 0);
    const ws = work.ws, g = ws.ctx, [x, y] = uv(work.fw.cx, 0, ws.size), rr = sz / 2 / work.W * ws.size; g.fillStyle = "#06080a"; g.beginPath(); if (p.path === "circle") g.arc(x, y, rr, 0, 7); else g.rect(x - rr, y - rr * 0.7, rr * 2, rr * 1.4); g.fill(); ws.map.needsUpdate = true;
    falling.push({ o, v: [0, 0, 0], floor: tt / 2, spin: 0.6, mat: m });
  }
  function fallTick(dt) {
    falling = falling.filter(fo => { fo.v[1] -= G * dt; fo.o.position.x += fo.v[0] * dt; fo.o.position.y += fo.v[1] * dt; fo.o.position.z += fo.v[2] * dt; fo.o.rotation.z += fo.spin * dt; if (fo.mat) fo.mat.emissiveIntensity = Math.max(0, fo.mat.emissiveIntensity - dt * 0.4);
      if (fo.o.position.y <= fo.floor) { fo.o.position.y = fo.floor; if (Math.abs(fo.v[1]) > 0.4) { fo.v[1] = -fo.v[1] * 0.25; fo.v[0] *= 0.5; fo.v[2] *= 0.5; fo.spin *= 0.4; return true; } fo.o.rotation.z = Math.round(fo.o.rotation.z / Math.PI) * Math.PI; return !!fo.mat && fo.mat.emissiveIntensity > 0; } return true; });
  }
  function msg(t) { msgEl.textContent = t; msgEl.hidden = false; clearTimeout(msg.t); msg.t = setTimeout(() => { msgEl.hidden = true; }, 4200); }

  /* ---------------- arresto di emergenza (categoria 0, reset in due passi) ---------------- */
  function estop() {
    if (st.estop) return; st.estop = 1; effectsOff(); if (play) play.frozen = true;
    el.querySelector(".o3").classList.add("estop"); banner();
  }
  function banner() {
    if (!st.estop) { ban.hidden = true; el.querySelector(".o3").classList.remove("estop"); return; }
    ban.hidden = false;
    ban.innerHTML = '<b>ARRESTO DI EMERGENZA</b><small>Categoria 0: tolta la coppia ai motori, freni inseriti, ciclo interrotto. Prima di ripartire controlla che nessuno sia nella cella.</small><div class="o3-ban-b">' +
      (st.estop === 1 ? '<button type="button" class="btn ghost" data-o3="unlock">1 · Sblocca il fungo</button><button type="button" class="btn ghost" disabled>2 · Reset</button>' : '<button type="button" class="btn ghost" disabled>1 · Fungo sbloccato ✓</button><button type="button" class="btn" data-o3="reset">2 · Reset</button>') + "</div>";
  }
  function estopStep() {
    if (st.estop === 1) { st.estop = 2; banner(); return 2; }
    if (st.estop === 2) { st.estop = 0; play = null; setProgress(0); banner(); api.toast("Reset fatto: il braccio è fermo dove si trovava. Avvia di nuovo il ciclo."); renderHud(); return 0; }
    return st.estop;
  }

  /* ---------------- eventi ---------------- */
  const GEOM = { path: 1, size: 1, pts: 1, mat: 1, t: 1, depth: 1, dist: 1, m: 1, mu: 0, D: 0, ap: 0 };
  function setProc(id) { st.proc = id; if (st.chal && SIM.CHALLENGES.filter(c => c.id === st.chal)[0].proc !== id) st.chal = null; api.save(); setupProcess(true); }
  function setChal(id) {
    const c = SIM.CHALLENGES.filter(x => x.id === id)[0]; if (!c) return; st.chal = id; st.proc = c.proc; const p = st.p[c.proc];
    for (const k in c.set) p[k] = k === "size" ? Math.round(c.set[k] * 1000) : c.set[k];
    api.save(); setupProcess(true); msg(c.goal);
  }
  el.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b || !el.contains(b)) return;
    const a = b.getAttribute("data-o3");
    if (a === "estop") return estop();
    if (a === "unlock" || a === "reset") return estopStep();
    if (a === "cam") return camHome();
    if (a === "env") { st.env = !st.env; T.env.visible = st.env; b.classList.toggle("on", st.env); api.save(); return; }
    if (a === "panel") { const pn = el.querySelector("#o3panel"); pn.classList.toggle("min"); st.panel = !pn.classList.contains("min"); api.save(); resize(); return; }
    if (a === "play") return startPlay();
    if (a === "stop") return stop();
    if (a === "home") { if (st.estop) return msg("Prima fai il reset dell'emergenza."); stop(); applyQ(work.pm.home); renderJointsVals(); renderHud(); return; }
    if (a === "nochal") { st.chal = null; api.save(); renderPanel(); return; }
    if (b.hasAttribute("data-o3proc")) return setProc(b.getAttribute("data-o3proc"));
    if (b.hasAttribute("data-o3chal")) return setChal(b.getAttribute("data-o3chal"));
    if (b.hasAttribute("data-o3mode")) { st.mode = b.getAttribute("data-o3mode"); api.save(); el.querySelector("#o3joints").innerHTML = jointsHtml(); return; }
    if (b.hasAttribute("data-jog")) { const [i, s] = b.getAttribute("data-jog").split(":").map(Number); jog(i, s); }
  });
  function jog(i, s) { if (st.estop) return msg("Emergenza attiva: il braccio non si muove."); if (play) stop(); const pm = work.pm, qq = q.slice(); qq[i] = Math.max(pm.lim[i][0] * D2R, Math.min(pm.lim[i][1] * D2R, qq[i] + s * 2 * D2R)); applyQ(qq); renderJointsVals(); renderHud(); }
  function renderJointsVals() { q.forEach((x, i) => { const r = el.querySelector('[data-o3q="' + i + '"]'), v = el.querySelector('[data-o3qv="' + i + '"]'); if (r) r.value = (x / D2R).toFixed(1); if (v) v.textContent = f(x / D2R, 1) + "°"; }); const tp = SIM.fk(work.pm, q).tip; tp.forEach((x, i) => { const r = el.querySelector('[data-o3t="' + i + '"]'), v = el.querySelector('[data-o3tv="' + i + '"]'); if (r) r.value = (x * 1000).toFixed(0); if (v) v.textContent = f(x * 1000, 0) + " mm"; }); }
  let inT = 0;
  function onParam(e, commit) {
    const t = e.target, k = t.getAttribute("data-o3p");
    if (k) { const p = cur(), d = PARAMS[st.proc].filter(x => x.k === k)[0], num = t.type === "range"; p[k] = num ? +t.value : t.value;
      const lab = el.querySelector('[data-o3v="' + k + '"]'); if (lab) lab.textContent = f(+t.value, d ? d.d : 0) + " " + (d ? d.u : "mm");
      if (k === "path" || k === "pts") { api.save(); setupProcess(false); return; }
      clearTimeout(inT); if (play) stop();
      inT = setTimeout(() => { api.save(); if (GEOM[k] && commit !== false) setupProcess(false); else refreshResult(); }, GEOM[k] ? 250 : 60); return; }
    const qi = t.getAttribute("data-o3q"); if (qi != null) { if (st.estop) { renderJointsVals(); return msg("Emergenza attiva."); } if (play) stop(); const qq = q.slice(); qq[+qi] = +t.value * D2R; applyQ(qq); renderJointsVals(); renderHud(); return; }
    const ti = t.getAttribute("data-o3t"); if (ti != null) { if (st.estop) return; const tp = SIM.fk(work.pm, q).tip; tp[+ti] = +t.value / 1000; doIK(tp); return; }
    if (t.id === "o3mult") { st.mult = t.value; api.save(); planned.mult = st.mult === "auto" ? autoMult(planned.T) : +st.mult; if (play) play.mult = planned.mult; return; }
    if (t.id === "o3qual") { st.quality = t.value; api.save(); setQuality(t.value === "auto" ? (touch ? "media" : "alta") : t.value); }
  }
  el.addEventListener("input", e => onParam(e));
  el.addEventListener("change", e => { if (e.target.tagName === "SELECT" || e.target.type === "text") onParam(e); });
  function doIK(t) { if (play) stop(); const r = SIM.ik(work.pm, t, DOWN, q, { iter: 40 }); applyQ(r.q); T.target.position.set(t[0], t[1], t[2]); T.target.material.color.setHex(r.ok ? 0x3ddc84 : 0xff4d4d); renderJointsVals(); renderHud(); }
  // trascinamento della pallina (IK)
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(), hit = new THREE.Vector3();
  function setNdc(e) { const r = renderer.domElement.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera); }
  function onDown(e) { if (st.mode !== "ik" || st.estop) return; setNdc(e); ray.params.Points = { threshold: 0 }; const hs = ray.intersectObject(T.target, false); if (!hs.length) { const sp = T.target.position.clone().project(camera); if (Math.hypot(sp.x - ndc.x, sp.y - ndc.y) > 0.08) return; }
    drag = { id: e.pointerId }; plane.set(new THREE.Vector3(0, 1, 0), -T.target.position.y); controls.enabled = false; renderer.domElement.setPointerCapture(e.pointerId); e.preventDefault(); }
  function onMove(e) { if (!drag) return; setNdc(e); if (ray.ray.intersectPlane(plane, hit)) doIK([hit.x, T.target.position.y, hit.z]); }
  function onUp() { if (!drag) return; drag = null; controls.enabled = true; }
  function bindCanvas() { const c = renderer.domElement; c.addEventListener("pointerdown", onDown); c.addEventListener("pointermove", onMove); c.addEventListener("pointerup", onUp); c.addEventListener("pointercancel", onUp); }
  bindCanvas();

  /* ---------------- composer, qualità, dimensioni ---------------- */
  function makeComposer() {
    if (composer) composer.dispose && composer.dispose(); composer = null; bloom = null; if (!Q.bloom) return;
    composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.38, 0.32, 0.95); composer.addPass(bloom); composer.addPass(new OutputPass());
  }
  function resize() { const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight); renderer.setSize(w, h); camera.aspect = w / h; const pn = el.querySelector("#o3panel"), open = pn && !pn.classList.contains("min"); if (open && w >= 1000) camera.setViewOffset(w, h, pn.offsetWidth / 2, 0, w, h); else if (open) camera.setViewOffset(w, h, 0, pn.offsetHeight * 0.45, w, h); else camera.clearViewOffset(); camera.updateProjectionMatrix(); if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); } }
  function setQuality(name) {
    if (!QUAL[name]) return; qname = name; Q = QUAL[name]; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, Q.dpr)); renderer.shadowMap.enabled = Q.shadow > 0;
    if (keyLight) { keyLight.castShadow = Q.shadow > 0; if (Q.shadow) { keyLight.shadow.mapSize.set(Q.shadow, Q.shadow); if (keyLight.shadow.map) { keyLight.shadow.map.dispose(); keyLight.shadow.map = null; } } }
    scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); });
    makeComposer(); resize(); const s = el.querySelector("#o3qual"); if (s && st.quality !== "auto") s.value = name;
  }

  Object.values(mats()).forEach(m => { m.userData.shared = true; });
  makeComposer();
  const ro = new ResizeObserver(() => resize()); ro.observe(stage);

  /* ---------------- ciclo di disegno ---------------- */
  let fpsAcc = 0, fpsN = 0, slow = 0, normAcc = 0;
  function step(dt) {
    let simDt = dt;
    if (play && !st.estop) { tickPlay(dt); simDt = dt * (play ? play.mult : 1); } else if (work && (st.proc === "mig" || st.proc === "tig")) coolBead(dt);
    Object.values(parts).forEach(p => p.update(dt, (x, z) => work && work.table && x > work.table.min[0] && x < work.table.max[0] && z > work.table.min[2] && z < work.table.max[2] && !(work.ws && (res.r.through)) ? work.y : 0.002));
    if (work && work.ws && work.hot > 0) { work.hot -= simDt; const g = work.ws.heatCtx; g.fillStyle = "rgba(0,0,0," + Math.min(1, 1 - Math.exp(-simDt * 0.9)).toFixed(4) + ")"; g.fillRect(0, 0, work.ws.heatCanvas.width, work.ws.heatCanvas.height); work.ws.heat.needsUpdate = true; }
    if (work && work.normT) { normAcc += dt; if (normAcc > 0.15) { normAcc = 0; work.normT = 0; work.top.geometry.computeVertexNormals(); } }
    if (falling.length) fallTick(dt);
    hudT += dt; if (hudT > 0.12) { hudT = 0; renderHud(); }
    if (controls) controls.update();
  }
  function draw() { if (composer) composer.render(); else renderer.render(scene, camera); }
  function frame(now) {
    if (!running) return; raf = requestAnimationFrame(frame); const dt = Math.min(0.05, lastT ? (now - lastT) / 1000 : 0.016); lastT = now;
    step(dt); draw();
    fpsAcc += dt; fpsN++; if (fpsAcc >= 1) { fpsShow = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0;
      if (st.quality === "auto" && !api.testMode && document.visibilityState === "visible") { slow = fpsShow < 24 ? slow + 1 : 0; if (slow >= 3 && qname !== "bassa") { slow = 0; const nx = qname === "alta" ? "media" : "bassa"; setQuality(nx); api.toast("Grafica ridotta a " + nx + " per restare fluida"); } } }
  }
  function resume() { if (running) return; running = true; lastT = 0; resize(); raf = requestAnimationFrame(frame); }
  function pause() { running = false; cancelAnimationFrame(raf); }
  let key = "";
  function designKey() { return JSON.stringify(api.build()) + "|" + JSON.stringify(api.mission()); }
  function refresh() { const k = designKey(); if (k !== key) { key = k; buildWorld(); } resume(); }
  function dispose() { pause(); ro.disconnect(); if (world) disposeGroup(world); if (composer && composer.dispose) composer.dispose(); pmrem.dispose(); renderer.dispose(); el.innerHTML = ""; }

  key = designKey(); buildWorld(); resize(); camHome(); if (!api.testMode) resume(); else { running = false; }
  return {
    resume, pause, refresh, dispose,
    test: { st, scene, work: () => work, play: () => play, plan: () => planned, res: () => res, proc2: setProc, setProc, setChal, start: startPlay, estop, estopStep, quality: () => qname, setQuality, fk: () => SIM.fk(work.pm, q), q: () => q,
      runTo(sec) { const n = Math.round(sec * 30); for (let i = 0; i < n; i++) step(1 / 30); draw(); return { playing: !!play, el: play ? play.el : null }; },
      renderNow() { resize(); draw(); } }
  };
}
