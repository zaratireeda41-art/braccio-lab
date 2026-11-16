// Braccio Lab · Officina 3D – il braccio 3D generato dal progetto del Costruttore
import * as THREE from "../vendor/three.module.min.js";
import { brushed, anodized, carbon, painted } from "./textures.js?v=4";

let M = null;
export function mats() {
  if (M) return M;
  const st = brushed("#a7afb7", 3), st2 = brushed("#6d757d", 8), al = anodized("#c4ccd4"), cf = carbon(), or = painted("#f06a1d");
  M = {
    paint: new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: or.map, metalness: 0.15, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.18 }),
    steel: new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: st.map, roughnessMap: st.rough, metalness: 1, roughness: 0.72 }),
    darkSteel: new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: st2.map, roughnessMap: st2.rough, metalness: 1, roughness: 0.85 }),
    alu: new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: al.map, metalness: 0.9, roughness: 0.34, clearcoat: 0.25 }),
    carbon: new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: cf.map, metalness: 0.2, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.05 }),
    pla: new THREE.MeshPhysicalMaterial({ color: 0xece4d6, metalness: 0, roughness: 0.62, sheen: 0.4 }),
    housing: new THREE.MeshPhysicalMaterial({ color: 0x2b3138, metalness: 0.55, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    motor: new THREE.MeshPhysicalMaterial({ color: 0x15181b, metalness: 0.35, roughness: 0.45 }),
    servoAc: new THREE.MeshPhysicalMaterial({ color: 0x23272c, metalness: 0.6, roughness: 0.3, clearcoat: 0.5 }),
    hobby: new THREE.MeshPhysicalMaterial({ color: 0x1f5fd6, metalness: 0, roughness: 0.4, clearcoat: 0.3 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x18191b, roughness: 0.9 }),
    copper: new THREE.MeshPhysicalMaterial({ color: 0xd9823b, metalness: 1, roughness: 0.25 }),
    brass: new THREE.MeshPhysicalMaterial({ color: 0xc9a24a, metalness: 1, roughness: 0.3 }),
    ceramic: new THREE.MeshPhysicalMaterial({ color: 0xf0d3c4, metalness: 0, roughness: 0.5 }),
    blue: new THREE.MeshPhysicalMaterial({ color: 0x1d6fe0, metalness: 0.3, roughness: 0.35, clearcoat: 0.6 }),
    yellow: new THREE.MeshPhysicalMaterial({ color: 0xf5c542, metalness: 0.1, roughness: 0.45 }),
    red: new THREE.MeshPhysicalMaterial({ color: 0xd8262b, metalness: 0.1, roughness: 0.4, clearcoat: 0.4 }),
    tungsten: new THREE.MeshStandardMaterial({ color: 0x8a8f95, metalness: 1, roughness: 0.2 }),
    carbide: new THREE.MeshPhysicalMaterial({ color: 0xb8bec4, metalness: 1, roughness: 0.18, iridescence: 0.4 })
  };
  return M;
}
function linkMat(id) { const m = mats(); return /^al/.test(id) ? m.alu : id === "cf" ? m.carbon : id === "pla" ? m.pla : m.paint; }
function mesh(g, mat, parent) { const o = new THREE.Mesh(g, mat); o.castShadow = true; o.receiveShadow = true; if (parent) parent.add(o); return o; }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* sezione del link (dimensioni reali in mm → m, con un minimo visibile) */
function linkGeo(link, L, vertical) {
  const D = (+link.D || 0) / 1000, B = (+link.B || 0) / 1000, H = (+link.H || 0) / 1000, Lm = Math.max(L, 0.001);
  if (link.sec === "round" || link.sec === "tube") { const r = Math.max(D / 2, 0.004), g = new THREE.CylinderGeometry(r, r, Lm, 40, 1, link.sec === "tube"); if (!vertical) g.rotateZ(-Math.PI / 2); g.translate(vertical ? 0 : Lm / 2, vertical ? Lm / 2 : 0, 0); return g; }
  const bb = Math.max(B, 0.006), hh = Math.max(H, 0.006), g = new THREE.BoxGeometry(vertical ? bb : Lm, vertical ? Lm : hh, vertical ? hh : bb, 1, 1, 1);
  g.translate(vertical ? 0 : Lm / 2, vertical ? Lm / 2 : 0, 0); return g;
}

export function buildArm(model, build, R) {
  const m = mats(), root = new THREE.Group(), joints = [], n = model.n, info = [];
  root.name = "braccio";
  // basamento
  const scale = clamp(model.reach, 0.25, 2.5), rb = clamp(0.09 * Math.sqrt(scale) + 0.02, 0.05, 0.3);
  mesh(new THREE.CylinderGeometry(rb * 1.25, rb * 1.4, 0.03 * Math.sqrt(scale) + 0.01, 48), m.darkSteel, root).position.y = (0.03 * Math.sqrt(scale) + 0.01) / 2;
  let parent = root;
  for (let k = 0; k < n; k++) {
    const o = R.J[k], kind = model.kinds[k], g = new THREE.Group(); g.name = "J" + (k + 1);
    parent.add(g); if (k > 0) g.position.set(model.links[k - 1 === 0 ? 0 : k - 1] * (k - 1 === 0 ? 0 : 1), k - 1 === 0 ? model.links[0] : 0, 0);
    joints.push({ g, kind });
    const hob = o.M.type === "servo_hobby", mj = o.mJoint;
    let rh = hob ? 0.016 : clamp(0.022 + 0.032 * Math.cbrt(mj), 0.02, 0.22), lh = rh * 1.25;
    info.push({ rh });
    // carcassa del giunto, orientata sull'asse di rotazione
    const hs = new THREE.Group(); g.add(hs);
    if (kind === "pitch") hs.rotation.x = Math.PI / 2; else if (kind === "roll") hs.rotation.z = -Math.PI / 2;
    if (hob) { const f = (o.M.frame || 23) / 1000; mesh(new THREE.BoxGeometry(f * 1.7, f * 1.25, f * 0.85), m.hobby, hs); mesh(new THREE.CylinderGeometry(f * 0.22, f * 0.22, f * 0.5, 20), m.pla, hs).position.y = f * 0.7; }
    else {
      mesh(new THREE.CylinderGeometry(rh, rh, lh, 56), m.housing, hs);
      const ring = mesh(new THREE.CylinderGeometry(rh * 1.04, rh * 1.04, lh * 0.16, 56), o.R && o.R.type !== "none" ? m.steel : m.darkSteel, hs); ring.position.y = lh * 0.5;
      // motore (dietro il riduttore)
      const mr = clamp(0.012 + 0.03 * Math.cbrt(o.M.mass || 0.5), 0.014, 0.09), ml = mr * (o.M.type === "ac" ? 3.2 : 2.2);
      const mot = mesh(new THREE.CylinderGeometry(mr, mr, ml, 32), o.M.type === "ac" ? m.servoAc : m.motor, hs); mot.position.y = -lh / 2 - ml / 2;
      const cap = mesh(new THREE.CylinderGeometry(mr * 0.98, mr * 0.98, ml * 0.12, 32), m.steel, hs); cap.position.y = -lh / 2 - ml + ml * 0.06;
      if (o.M.type === "ac") { const band = mesh(new THREE.CylinderGeometry(mr * 1.01, mr * 1.01, ml * 0.06, 32), m.blue, hs); band.position.y = -lh / 2 - ml * 0.35; }
      if (o.Br && o.Br.id !== "none") { const br = mesh(new THREE.CylinderGeometry(mr * 1.05, mr * 1.05, ml * 0.22, 32), m.red, hs); br.position.y = -lh / 2 - ml * 0.75; }
    }
    // link
    const L = model.links[k];
    if (L > 0.001) { const lm = mesh(linkGeo(build.joints[k].link, k === 0 ? L : L, k === 0), linkMat(build.joints[k].link.mat), g); if (k === 0) lm.position.y = 0; }
    parent = g;
  }
  // posizioni dei figli: rifaccio con la stessa logica della cinematica (k=0 traslazione Y, poi X)
  for (let k = 1; k < n; k++) { const g = joints[k].g; if (k === 1) g.position.set(0, model.links[0], 0); else g.position.set(model.links[k - 1], 0, 0); }
  const flange = new THREE.Group(); flange.position.set(model.links[n - 1], 0, 0); joints[n - 1].g.add(flange);
  mesh(new THREE.CylinderGeometry(0.025 * Math.sqrt(scale) + 0.01, 0.025 * Math.sqrt(scale) + 0.01, 0.012, 32).rotateZ(Math.PI / 2).translate(0.006, 0, 0), m.darkSteel, flange);
  const tool = new THREE.Group(); flange.add(tool);
  const tcp = new THREE.Object3D(); flange.add(tcp);
  const api = {
    root, joints, flange, tcp, tool, info, scale, fingers: null, spin: null,
    setQ(q) { for (let k = 0; k < n; k++) { const j = joints[k]; j.g.rotation.set(0, 0, 0); if (j.kind === "yaw") j.g.rotation.y = q[k]; else if (j.kind === "pitch") j.g.rotation.z = q[k]; else j.g.rotation.x = q[k]; } },
    setTool(kind, L, eff) { while (tool.children.length) tool.remove(tool.children[0]); api.fingers = null; api.spin = null; buildTool(api, kind, L, eff); tcp.position.set(L + 0.006, 0, 0); },
    grip(open) { if (!api.fingers) return; const s = api.fingers.stroke * (open ? 0.5 : 0.08); api.fingers.a.position.z = s; api.fingers.b.position.z = -s; },
    dispose() { root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  };
  return api;
}

/* utensili e teste di processo (asse lungo +X locale, la punta è il TCP) */
function buildTool(api, kind, L, eff) {
  const m = mats(), t = api.tool, s = clamp(L, 0.05, 0.4);
  const cyl = (r1, r2, l, mat, x, seg = 32) => { const o = mesh(new THREE.CylinderGeometry(r2, r1, l, seg).rotateZ(-Math.PI / 2), mat, t); o.position.x = x + l / 2; return o; };
  if (kind === "laser") { cyl(s * 0.16, s * 0.16, L * 0.55, m.housing, 0.012); cyl(s * 0.17, s * 0.17, L * 0.06, m.blue, L * 0.3); cyl(s * 0.14, s * 0.07, L * 0.3, m.darkSteel, L * 0.56); cyl(s * 0.07, s * 0.025, L * 0.13, m.copper, L * 0.86); }
  else if (kind === "mig") { cyl(s * 0.1, s * 0.1, L * 0.5, m.rubber, 0.012); cyl(s * 0.1, s * 0.085, L * 0.25, m.steel, L * 0.5); cyl(s * 0.085, s * 0.06, L * 0.2, m.copper, L * 0.74); cyl(s * 0.012, s * 0.012, L * 0.07, m.copper, L * 0.93, 12); }
  else if (kind === "tig") { cyl(s * 0.07, s * 0.07, L * 0.6, m.rubber, 0.012); cyl(s * 0.07, s * 0.05, L * 0.3, m.ceramic, L * 0.6); cyl(s * 0.008, s * 0.004, L * 0.12, m.tungsten, L * 0.88, 10); }
  else if (kind === "plasma") { cyl(s * 0.09, s * 0.09, L * 0.6, m.housing, 0.012); cyl(s * 0.09, s * 0.07, L * 0.3, m.copper, L * 0.6); cyl(s * 0.05, s * 0.03, L * 0.1, m.brass, L * 0.9); }
  else if (kind === "spray") { const b = mesh(new THREE.BoxGeometry(L * 0.5, s * 0.22, s * 0.16), m.steel, t); b.position.x = 0.012 + L * 0.25; cyl(s * 0.07, s * 0.07, L * 0.3, m.darkSteel, L * 0.5); cyl(s * 0.05, s * 0.02, L * 0.2, m.brass, L * 0.8); }
  else if (kind === "spindle") { cyl(s * 0.18, s * 0.18, L * 0.62, m.housing, 0.012); cyl(s * 0.185, s * 0.185, L * 0.05, m.steel, L * 0.12); cyl(s * 0.11, s * 0.08, L * 0.12, m.steel, L * 0.64); const sp = new THREE.Group(); sp.position.x = L * 0.76; t.add(sp); const tool = mesh(new THREE.CylinderGeometry(s * 0.035, s * 0.035, L * 0.24, 16).rotateZ(-Math.PI / 2).translate(L * 0.12, 0, 0), m.carbide, sp); tool.name = "fresa"; api.spin = sp; }
  else if (kind === "vac") { cyl(s * 0.05, s * 0.05, L * 0.6, m.steel, 0.012); cyl(s * 0.07, s * 0.16, L * 0.4, m.rubber, L * 0.6); }
  else if (kind === "mag") { const b = mesh(new THREE.BoxGeometry(L * 0.9, s * 0.5, s * 0.5), m.red, t); b.position.x = L * 0.45 + 0.012; const p = mesh(new THREE.BoxGeometry(L * 0.08, s * 0.52, s * 0.52), m.darkSteel, t); p.position.x = L * 0.96; }
  else { // pinza a due dita
    const body = mesh(new THREE.BoxGeometry(L * 0.5, s * 0.35, s * 0.55), kind === "pneu" ? m.alu : m.housing, t); body.position.x = 0.012 + L * 0.25;
    const stroke = clamp(((eff && eff.stroke) || 20) / 1000, 0.006, 0.08) + s * 0.08;
    const fg = () => { const f = mesh(new THREE.BoxGeometry(L * 0.5, s * 0.28, s * 0.06), m.steel, t); const pad = mesh(new THREE.BoxGeometry(L * 0.3, s * 0.26, s * 0.02), m.rubber, f); pad.position.set(L * 0.08, 0, 0); f.position.x = L * 0.75; return f; };
    const a = fg(), b = fg(); api.fingers = { a, b, stroke }; api.grip(true);
  }
}
