// Braccio Lab · Pezzi meccanici 3D dettagliati (v6), in metri, asse principale lungo +Y:
// viti a esagono incassato e testa esagonale, rondelle, motori AC con alette e connettori, passo-passo NEMA,
// servo hobby, riduttori con flangia e anello di tenuta, coperchi dei giunti, link lavorati (smussi, collari),
// basamento in ghisa con nervature, pinza parallela, catena portacavi e cavi flessibili che si piegano.
import * as THREE from "../vendor/three.module.min.js";
import { RoundedBoxGeometry, mergeGeometries } from "../vendor/three-fx.min.js";
import { materials, tier, labelTex } from "./gfx.js?v=6";

const V2 = (x, y) => new THREE.Vector2(x, y);
export const sg = (n, T) => Math.max(6, Math.round(n * (T || tier()).seg));
export function rbox(w, h, d, r, s) { const m = Math.min(w, h, d) / 2 - 1e-6; return new RoundedBoxGeometry(w, h, d, s || 2, Math.max(1e-5, Math.min(r, m))); }
export function lathe(pts, n, a0, al) { return new THREE.LatheGeometry(pts.map(p => V2(Math.max(0, p[0]), p[1])), n, a0, al); }
function mk(geo, mat, parent, cast) { const o = new THREE.Mesh(geo, mat); o.castShadow = cast !== false; o.receiveShadow = true; if (parent) parent.add(o); return o; }
function stripUv(g) { const ok = ["position", "normal", "uv"]; Object.keys(g.attributes).forEach(k => { if (ok.indexOf(k) < 0) g.deleteAttribute(k); }); if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g.index ? g.toNonIndexed() : g; }
export function merge(list, groups) { const gs = list.map(stripUv); const m = mergeGeometries(gs, !!groups); gs.forEach(g => g.dispose()); return m; }
function polyShape(pts) { const s = new THREE.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); s.closePath(); return s; }
function hexPts(r) { const p = []; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; p.push([Math.cos(a) * r, Math.sin(a) * r]); } return p; }
// estrusione lungo +Y (da y0 a y0+h), con smusso opzionale
export function extrudeY(shape, h, bevel, y0, curve) { const b = bevel || 0, g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(1e-5, h - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: b > 0 ? 1 : 0, curveSegments: curve || 12 }); g.translate(0, 0, b); g.rotateX(-Math.PI / 2); g.translate(0, y0 || 0, 0); return g; }

/* ---------------- viteria ---------------- */
const GC = {};
// vite a testa cilindrica con esagono incassato (ISO 4762): geometria unita con 2 gruppi (0 = testa, 1 = cava scura)
export function socketCapGeo(d, n) {
  const k = "sc" + d.toFixed(5) + "_" + (n || 0); if (GC[k]) return GC[k]; const r = d * 0.75, h = d, c = d * 0.08, rr = d * 0.46, N = n || sg(18);
  const head = lathe([[0, 0], [r - c, 0], [r, c], [r, h - c * 1.2], [r - c * 1.2, h], [rr * 1.12, h], [rr * 1.02, h - c], [rr * 1.02, h - d * 0.14], [0, h - d * 0.14]], N);
  const hx = new THREE.CircleGeometry(rr, 6); hx.rotateX(-Math.PI / 2); hx.rotateY(Math.PI / 6); hx.translate(0, h - d * 0.139, 0);
  const g = merge([head, hx], true); g.userData.shared = true; GC[k] = g; return g;
}
export function hexBoltGeo(d) {
  const k = "hx" + d.toFixed(5); if (GC[k]) return GC[k]; const s = d * 0.85;
  const hex = extrudeY(polyShape(hexPts(s)), d * 0.65, d * 0.05, d * 0.12), w = lathe([[d * 0.55, 0], [d * 0.98, 0], [d * 1.0, d * 0.04], [d * 0.98, d * 0.12], [d * 0.55, d * 0.12]], sg(20)), tip = lathe([[0, d * 0.77], [d * 0.5, d * 0.77], [d * 0.42, d * 0.9], [0, d * 0.9]], sg(10));
  const g = merge([hex, w, tip], false); g.userData.shared = true; GC[k] = g; return g;
}
export function washerGeo(d) { const k = "w" + d.toFixed(5); if (GC[k]) return GC[k]; const g = lathe([[d * 0.54, 0], [d * 1.0, 0], [d * 1.0, d * 0.16], [d * 0.54, d * 0.16], [d * 0.54, 0]], sg(20)); g.userData.shared = true; GC[k] = g; return g; }
// corona di viti (InstancedMesh): pos = { n, r, y, d, rotX } su piano XZ, testa verso +Y
export function boltRing(parent, n, r, y, d, mat, o) {
  o = o || {}; const M = materials(), g = o.hex ? hexBoltGeo(d) : socketCapGeo(d), mats = o.hex ? (mat || M.zinc) : [mat || M.oxide, M.black];
  const im = new THREE.InstancedMesh(g, mats, Math.max(1, n)), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  if (o.down) q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + (o.a0 || 0); p.set(Math.cos(a) * r, y, Math.sin(a) * r); m4.compose(p, q, s); im.setMatrixAt(i, m4); }
  im.castShadow = true; im.receiveShadow = true; parent.add(im);
  if (o.washer) { const w = new THREE.InstancedMesh(washerGeo(d), M.zinc, Math.max(1, n)); for (let i = 0; i < n; i++) { im.getMatrixAt(i, m4); w.setMatrixAt(i, m4); } w.position.y = o.down ? 0.0 : -d * 0.16; im.position.y = o.down ? -d * 0.16 : 0; w.receiveShadow = true; parent.add(w); }
  return im;
}

/* ---------------- motori ---------------- */
function finShape(a, fin, nf, rc) { // quadrato arrotondato con alette su ogni lato
  const pts = [], side = (ax, ay, bx, by, nx, ny) => { for (let i = 0; i < nf; i++) { const t0 = (i + 0.2) / nf, t1 = (i + 0.8) / nf, x0 = ax + (bx - ax) * t0, y0 = ay + (by - ay) * t0, x1 = ax + (bx - ax) * t1, y1 = ay + (by - ay) * t1; pts.push([x0, y0], [x0 + nx * fin, y0 + ny * fin], [x1 + nx * fin, y1 + ny * fin], [x1, y1]); } };
  const A = a - rc; pts.push([-A, -a]); side(-A, -a, A, -a, 0, -1); pts.push([A, -a], [a, -A]); side(a, -A, a, A, 1, 0); pts.push([a, A], [A, a]); side(A, a, -A, a, 0, 1); pts.push([-A, a], [-a, A]); side(-a, A, -a, -A, -1, 0); pts.push([-a, -A]);
  return polyShape(pts);
}
function connector(parent, M, pos, rot, r, label) { const g = new THREE.Group(); g.position.copy(pos); g.rotation.set(rot[0], rot[1], rot[2]); parent.add(g); mk(rbox(r * 2.4, r * 0.8, r * 2.4, r * 0.25), M.black, g).position.y = r * 0.4; mk(new THREE.CylinderGeometry(r * 0.9, r * 0.9, r * 1.4, sg(16)), M.steel, g).position.y = r * 1.5; mk(new THREE.CylinderGeometry(r * 1.05, r * 1.05, r * 0.9, sg(20)), M.knurl, g).position.y = r * 2.4; const cb = mk(new THREE.CylinderGeometry(r * 0.6, r * 0.6, r * 2.5, sg(10)), M.cable(0x1a1b1d), g); cb.position.y = r * 3.9; void label; return g; }
// servomotore AC: faccia della flangia a y = 0, corpo verso −Y, albero verso +Y. f = lato flangia (m)
export function acServo(f, len, o) {
  o = o || {}; const M = materials(), T = M.T, g = new THREE.Group(), body = o.mat || M.paint(0x22262b);
  mk(rbox(f, f * 0.16, f, f * 0.07, T.detail ? 3 : 1), M.alu(0x2b3036), g).position.y = -f * 0.08;
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([x, z]) => { const h = mk(new THREE.CylinderGeometry(f * 0.055, f * 0.055, f * 0.17, sg(10)), M.black, g); h.position.set(x * f * 0.38, -f * 0.08, z * f * 0.38); });
  mk(lathe([[0, 0], [f * 0.36, 0], [f * 0.36, f * 0.035], [f * 0.33, f * 0.05], [0, f * 0.05]], sg(28)), M.steel, g);
  const sh = mk(new THREE.CylinderGeometry(f * 0.095, f * 0.095, f * 0.36, sg(18)), M.steel, g); sh.position.y = f * 0.23; const key = mk(new THREE.BoxGeometry(f * 0.04, f * 0.22, f * 0.05), M.steel, g); key.position.set(0, f * 0.26, f * 0.09);
  const bl = len * 0.7, fins = T.detail ? extrudeY(finShape(f * 0.43, f * 0.035, T.detail >= 2 ? 6 : 4, f * 0.06), bl, 0, -f * 0.16 - bl) : new THREE.BoxGeometry(f * 0.9, bl, f * 0.9).translate(0, -f * 0.16 - bl / 2, 0);
  const b = mk(fins, body, g); b.userData.heat = true;
  const eh = len * 0.3 - f * 0.16, enc = mk(rbox(f * 0.86, eh, f * 0.86, f * 0.12, T.detail ? 3 : 1), M.plastic(0x15171a, 0.5), g); enc.position.y = -f * 0.16 - bl - eh / 2;
  mk(new THREE.CylinderGeometry(f * 0.3, f * 0.32, f * 0.03, sg(24)), M.alu(), g).position.y = -f * 0.16 - bl - eh - f * 0.012;
  if (T.detail) { const lb = mk(new THREE.PlaneGeometry(f * 0.62, bl * 0.42), M.label([o.name || "XQ-SV400", (o.kw || "0,4") + " kW · 3000 min⁻¹", (o.nm || "1,27") + " N·m · " + (o.amp || "2,8") + " A", "IP65 · Ins. F · CE"], { logo: "XENTRIQ", w: 512, h: 320, metal: 0.4 }), g, false); lb.position.set(0, -f * 0.16 - bl * 0.5, f * 0.466 + f * 0.036); }
  if (T.detail) { connector(g, M, new THREE.Vector3(f * 0.2, -f * 0.16 - bl - eh * 0.5, f * 0.43), [Math.PI / 2 - 0.5, 0, 0], f * 0.08); connector(g, M, new THREE.Vector3(-f * 0.2, -f * 0.16 - bl - eh * 0.5, f * 0.43), [Math.PI / 2 - 0.5, 0, 0], f * 0.06); }
  if (o.brake) { const br = mk(new THREE.BoxGeometry(f * 0.92, f * 0.12, f * 0.92), M.paint(0xb3262b), g); br.position.y = -f * 0.16 - bl * 0.9; }
  g.userData.len = len; return g;
}
// passo-passo NEMA: faccia anteriore a y = 0, corpo verso −Y
export function stepper(f, len, o) {
  o = o || {}; const M = materials(), T = M.T, g = new THREE.Group(), a = f / 2, c = f * 0.12;
  const oct = polyShape([[-a + c, -a], [a - c, -a], [a, -a + c], [a, a - c], [a - c, a], [-a + c, a], [-a, a - c], [-a, -a + c]]);
  const fb = len * 0.16, st = len * 0.66, rb = len * 0.18, sh = (y0, h, m, bev) => mk(extrudeY(oct, h, bev, y0), m, g);
  sh(-fb, fb, M.alu(), f * 0.012); const s = sh(-fb - st, st, M.oxide, 0); s.userData.heat = true; sh(-len, rb, M.alu(), f * 0.012);
  if (T.detail >= 2) [0.33, 0.66].forEach(t => { const r = mk(extrudeY(polyShape([[-a + c, -a], [a - c, -a], [a, -a + c], [a, a - c], [a - c, a], [-a + c, a], [-a, a - c], [-a, -a + c]].map(p => [p[0] * 1.004, p[1] * 1.004])), f * 0.012, 0, -fb - st * t), M.alu(), g); void r; });
  mk(lathe([[0, 0], [f * 0.25, 0], [f * 0.25, f * 0.04], [0, f * 0.04]], sg(24)), M.alu(), g);
  const shaft = mk(new THREE.CylinderGeometry(f * 0.06, f * 0.06, f * 0.5, sg(14)), M.steel, g); shaft.position.y = f * 0.27;
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([x, z]) => { const b = new THREE.Mesh(socketCapGeo(f * 0.07), [M.oxide, M.black]); b.position.set(x * f * 0.36, -len, z * f * 0.36); b.rotation.x = Math.PI; g.add(b); });
  if (T.detail) { const lb = mk(new THREE.PlaneGeometry(f * 0.7, st * 0.6), M.label([o.name || "NEMA " + Math.round(f * 1000 / 2.54 / 10 * 10) / 1, "1,8° · 2,0 A/fase", (o.nm || "0,45") + " N·m"], { bg: "#f2f2ee", w: 512, h: 300, logo: "XQ", metal: 0 }), g, false); lb.position.set(0, -fb - st / 2, a + 0.0008); const j = mk(rbox(f * 0.32, f * 0.14, f * 0.16, f * 0.02), M.plastic(0xf2f0e6, 0.5), g); j.position.set(0, -len + rb * 0.5, a + f * 0.06); }
  return g;
}
export function hobbyServo(f, o) {
  o = o || {}; const M = materials(), g = new THREE.Group(), w = f * 1.7, h = f * 1.55, d = f * 0.85;
  const b = mk(rbox(w, h, d, f * 0.06), M.plastic(o.col || 0x1f5fd6, 0.4), g); b.position.y = -h / 2; b.userData.heat = true;
  mk(rbox(w * 1.36, f * 0.1, d, f * 0.03), M.plastic(o.col || 0x1f5fd6, 0.4), g).position.y = -h * 0.22;
  const hb = mk(new THREE.CylinderGeometry(f * 0.24, f * 0.24, f * 0.22, sg(16)), M.plastic(0x1f5fd6, 0.4), g); hb.position.set(w * 0.22, f * 0.11, 0);
  const horn = mk(rbox(f * 1.1, f * 0.08, f * 0.22, f * 0.04), M.plastic(0xf2f2f2, 0.55), g); horn.position.set(w * 0.22, f * 0.26, 0);
  if (M.T.detail) { const lb = mk(new THREE.PlaneGeometry(w * 0.7, h * 0.4), M.label([o.name || "MG996R", "Metal Gear"], { bg: "#111", fg: "#eee", w: 256, h: 128, border: false, metal: 0 }), g, false); lb.position.set(0, -h * 0.55, d / 2 + 0.0006); }
  return g;
}
/* ---------------- riduttore e coperchi ---------------- */
// riduttore centrato in y = 0, alto hl, raggio rr; uscita verso +Y
export function reducer(rr, hl, o) {
  o = o || {}; const M = materials(), T = M.T, g = new THREE.Group(), c = rr * 0.04, N = sg(40), hm = o.mat || M.cast(0x2f353b);
  const prof = [[rr * 0.55, -hl / 2], [rr * 1.06 - c, -hl / 2], [rr * 1.06, -hl / 2 + c], [rr * 1.06, -hl / 2 + hl * 0.16], [rr, -hl / 2 + hl * 0.18], [rr, hl / 2 - hl * 0.28], [rr * 0.98, hl / 2 - hl * 0.26], [rr * 0.98, hl / 2 - hl * 0.24]];
  const h = mk(lathe(prof, N), hm, g); h.userData.heat = true;
  if (T.detail >= 2) for (let i = 0; i < 3; i++) { const gr = mk(new THREE.TorusGeometry(rr * 1.001, rr * 0.012, 4, N), M.black, g, false); gr.rotation.x = Math.PI / 2; gr.position.y = -hl / 2 + hl * (0.3 + i * 0.1); }
  mk(lathe([[rr * 0.5, hl / 2 - hl * 0.24], [rr * 0.95, hl / 2 - hl * 0.24], [rr * 0.95, hl / 2 - hl * 0.1], [rr * 0.5, hl / 2 - hl * 0.1]], N), M.steel, g);
  const seal = mk(new THREE.TorusGeometry(rr * 0.87, rr * 0.03, 8, N), M.rubber, g); seal.rotation.x = Math.PI / 2; seal.position.y = hl / 2 - hl * 0.095;
  const of = mk(lathe([[rr * 0.22, hl / 2 - hl * 0.1], [rr * 0.84, hl / 2 - hl * 0.1], [rr * 0.84, hl / 2 - c], [rr * 0.84 - c, hl / 2], [rr * 0.22, hl / 2], [rr * 0.22, hl / 2 - hl * 0.06], [0, hl / 2 - hl * 0.06]], N), M.steel, g); void of;
  boltRing(g, o.nOut || 8, rr * 0.62, hl / 2, Math.max(0.003, rr * 0.07), M.oxide);
  boltRing(g, o.nIn || 8, rr * 0.96, -hl / 2 + hl * 0.16, Math.max(0.003, rr * 0.065), M.oxide, { a0: Math.PI / 8 });
  if (T.detail) { const gn = new THREE.Group(); gn.position.set(rr * 0.99, hl * 0.02, 0); gn.rotation.z = -Math.PI / 2; g.add(gn); mk(extrudeY(polyShape(hexPts(rr * 0.05)), rr * 0.06, 0, 0), M.brass, gn); mk(new THREE.SphereGeometry(rr * 0.035, 10, 8), M.brass, gn).position.y = rr * 0.09; }
  return g;
}
export function jointCap(r, o) { o = o || {}; const M = materials(), g = new THREE.Group(); mk(lathe([[0, r * 0.32], [r * 0.5, r * 0.3], [r * 0.82, r * 0.2], [r * 0.97, r * 0.08], [r, 0], [r * 0.9, 0]], sg(36)), o.mat || M.paint(0xf06a1d), g); const s = mk(new THREE.TorusGeometry(r * 0.96, r * 0.025, 6, sg(36)), M.rubber, g, false); s.rotation.x = Math.PI / 2; mk(new THREE.CircleGeometry(r * 0.25, sg(24)).rotateX(-Math.PI / 2).translate(0, r * 0.321, 0), M.alu(0x1d1f22), g, false); return g; }

/* ---------------- link lavorati ---------------- */
// link centrato in y = 0, lungo L sull'asse Y. sec: rtube | rect | tube | round (mm come in PHY.partProps)
export function machinedLink(p, L, mat, o) {
  o = o || {}; const M = materials(), T = M.T, g = new THREE.Group(), c = Math.min(0.0015, L * 0.02);
  if (p.sec === "rtube" || p.sec === "rect") {
    const B = (p.B || 40) / 1000, H = (p.H || p.B || 40) / 1000, t = Math.max(0.0015, (p.t || 3) / 1000), rc = Math.min(B, H) * 0.12, sh = rrShape(B, H, rc);
    if (p.sec === "rtube") sh.holes.push(rrPath(B - 2 * t, H - 2 * t, Math.max(0.0005, rc - t)));
    mk(extrudeY(sh, L, c * 0.7, -L / 2, T.detail ? 6 : 2), mat, g);
  } else {
    const r = (p.D || 40) / 2000, ri = p.sec === "tube" ? Math.max(0, r - Math.max(0.0015, (p.t || 3) / 1000)) : 0, N = sg(36);
    const pts = ri ? [[ri, -L / 2], [r - c, -L / 2], [r, -L / 2 + c], [r, L / 2 - c], [r - c, L / 2], [ri, L / 2], [ri, -L / 2]] : [[0, -L / 2], [r - c, -L / 2], [r, -L / 2 + c], [r, L / 2 - c], [r - c, L / 2], [0, L / 2]];
    mk(lathe(pts, N), mat, g);
  }
  if (o.collars !== false && T.detail) { const w = Math.max((p.B || p.D || 40), (p.H || 0)) / 1000, cr = w * 0.62 + 0.004, ch = Math.min(L * 0.12, w * 0.5 + 0.006);
    [-1, 1].forEach(s => { const cl = mk(lathe([[cr * 0.82, -ch / 2], [cr - c, -ch / 2], [cr, -ch / 2 + c], [cr, ch / 2 - c], [cr - c, ch / 2], [cr * 0.82, ch / 2]], sg(32)), o.collar || M.alu(0x2d3238), g); cl.position.y = s * (L / 2 - ch / 2); boltRing(g, 2, cr * 0.92, s * (L / 2 - ch / 2), Math.max(0.0025, w * 0.08), M.oxide, { a0: Math.PI / 2 }).rotation.z = 0; }); }
  return g;
}
function rrDraw(p, w, h, r) { const x = -w / 2, y = -h / 2; p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r); p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h); p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r); p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y); return p; }
function rrPath(w, h, r) { return rrDraw(new THREE.Path(), w, h, r); }
function rrShape(w, h, r) { return rrDraw(new THREE.Shape(), w, h, r); }

/* ---------------- basamento in ghisa ---------------- */
export function pedestal(rb, hb, o) {
  o = o || {}; const M = materials(), g = new THREE.Group(), ci = o.mat || M.cast(0x3b4650), N = sg(48), fh = hb * 0.18;
  mk(lathe([[0, 0], [rb * 1.35, 0], [rb * 1.35, fh * 0.8], [rb * 1.3, fh], [rb * 0.9, fh * 1.25], [rb * 0.78, hb * 0.55], [rb * 0.74, hb * 0.92], [rb * 0.8, hb * 0.95], [rb * 0.8, hb], [0, hb]], N), ci, g).userData.heat = false;
  const nr = 6; for (let i = 0; i < nr; i++) { const a = (i + 0.5) / nr * Math.PI * 2, rg = new THREE.ExtrudeGeometry(polyShape([[0, 0], [rb * 0.5, 0], [rb * 0.5, fh * 0.3], [0, hb * 0.62]]), { depth: rb * 0.07, bevelEnabled: false }); rg.translate(0, 0, -rb * 0.035); const rib = mk(rg, ci, g); rib.rotation.y = -a; rib.position.set(Math.cos(a) * rb * 0.7, fh * 0.9, Math.sin(a) * rb * 0.7); }
  boltRing(g, 6, rb * 1.16, fh, Math.max(0.006, rb * 0.08), M.zinc, { hex: true, washer: true });
  const ring = mk(new THREE.TorusGeometry(rb * 0.8, rb * 0.02, 6, N), M.paint(0xf06a1d), g, false); ring.rotation.x = Math.PI / 2; ring.position.y = hb * 0.95;
  return g;
}

/* ---------------- pinza parallela ---------------- */
// base a y = 0, dita verso +Y. L = lunghezza utensile (m). ritorna { g, fingers: [a,b], stroke }
export function gripper(L, o) {
  o = o || {}; const M = materials(), T = M.T, g = new THREE.Group(), s = Math.max(0.035, Math.min(0.14, L * 0.6)), bw = s * 1.25, bh = L * 0.42, bd = s * 0.62;
  mk(new THREE.CylinderGeometry(s * 0.45, s * 0.45, s * 0.08, sg(28)), M.alu(0x2d3238), g).position.y = s * 0.04;
  boltRing(g, 4, s * 0.34, s * 0.08, Math.max(0.0025, s * 0.05), M.oxide, { a0: Math.PI / 4 });
  const body = mk(rbox(bw, bh, bd, s * 0.05, T.detail ? 3 : 1), o.mat || M.alu(0x8f9aa6), g); body.position.y = s * 0.08 + bh / 2;
  const rail = mk(rbox(bw * 1.02, s * 0.12, bd * 0.5, s * 0.015), M.steel, g); rail.position.y = s * 0.08 + bh + s * 0.06;
  if (T.detail) { [-1, 1].forEach(k => { const ft = new THREE.Group(); ft.position.set(k * bw * 0.3, s * 0.08 + bh * 0.55, bd / 2); g.add(ft); mk(extrudeY(polyShape(hexPts(s * 0.05)), s * 0.04, 0, 0).rotateX(Math.PI / 2), M.brass, ft); const tb = mk(new THREE.CylinderGeometry(s * 0.03, s * 0.03, s * 0.12, sg(10)), M.plastic(0x2a7fe0, 0.4), ft); tb.rotation.x = Math.PI / 2; tb.position.z = s * 0.1; }); const lb = mk(new THREE.PlaneGeometry(bw * 0.6, bh * 0.35), M.label(["PGN-" + Math.round(s * 1000), "Corsa " + Math.round((o.stroke || 0.02) * 1000) + " mm"], { w: 256, h: 128, bg: "#d9dde2", metal: 0.4 }), g, false); lb.position.set(0, s * 0.08 + bh * 0.4, -bd / 2 - 0.0005); lb.rotation.y = Math.PI; }
  const fl = L - bh - s * 0.2, fingers = [-1, 1].map(k => { const f = new THREE.Group(); g.add(f); f.position.y = s * 0.08 + bh + s * 0.12; mk(rbox(s * 0.16, s * 0.16, bd * 0.7, s * 0.02), M.steel, f).position.y = s * 0.08;
    const fg = mk(rbox(s * 0.1, Math.max(0.01, fl), bd * 0.55, s * 0.02), M.alu(0x3a3f46), f); fg.position.set(-k * s * 0.03, fl / 2 + s * 0.12, 0);
    if (T.detail >= 2) { const teeth = []; for (let i = 0; i < 6; i++) teeth.push(new THREE.BoxGeometry(s * 0.02, fl * 0.07, bd * 0.5).translate(-k * s * 0.09, s * 0.12 + fl * (0.45 + i * 0.09), 0)); mk(merge(teeth), M.rubber, f); }
    else { const pad = mk(new THREE.BoxGeometry(s * 0.02, fl * 0.5, bd * 0.5), M.rubber, f); pad.position.set(-k * s * 0.09, s * 0.12 + fl * 0.7, 0); }
    return f; });
  return { g, fingers, s, top: s * 0.08 + bh + s * 0.12 };
}

/* ---------------- catena portacavi ---------------- */
export class DragChain {
  constructor(n, w, h, pitch, mat) {
    this.n = n; this.pitch = pitch; const t = w * 0.12, M = materials();
    const geo = merge([rbox(pitch * 1.05, h, t, t * 0.4, 1).translate(0, 0, w / 2 - t / 2), rbox(pitch * 1.05, h, t, t * 0.4, 1).translate(0, 0, -w / 2 + t / 2), new THREE.BoxGeometry(pitch * 0.3, h * 0.14, w - t).translate(0, h * 0.43, 0), new THREE.BoxGeometry(pitch * 0.3, h * 0.14, w - t).translate(0, -h * 0.43, 0)]);
    this.mesh = new THREE.InstancedMesh(geo, mat || M.plastic(0x1b1c1e, 0.55), n); this.mesh.castShadow = this.mesh.receiveShadow = true; this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.frustumCulled = false;
    this._m = new THREE.Matrix4(); this._u = new THREE.Vector3(); this._p = new THREE.Vector3(); this._t = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1); this._q = new THREE.Quaternion(); this._x = new THREE.Vector3(1, 0, 0);
  }
  // pts: polilinea (Vector3[]); side = normale del piano della catena
  set(pts, side) {
    const L = []; let tot = 0; for (let i = 1; i < pts.length; i++) { tot += pts[i].distanceTo(pts[i - 1]); L.push(tot); } const n = Math.min(this.n, Math.max(1, Math.floor(tot / this.pitch))); this.mesh.count = n;
    let seg = 0; for (let k = 0; k < n; k++) { const d = (k + 0.5) * this.pitch; while (seg < L.length - 1 && L[seg] < d) seg++; const a = pts[seg], b = pts[seg + 1] || a, l0 = seg ? L[seg - 1] : 0, u = (d - l0) / Math.max(1e-6, (L[seg] - l0));
      this._p.lerpVectors(a, b, Math.min(1, u)); this._t.subVectors(b, a).normalize(); const z = side || this._u.set(0, 0, 1), y = new THREE.Vector3().crossVectors(z, this._t).normalize(), zz = new THREE.Vector3().crossVectors(this._t, y);
      this._m.makeBasis(this._t, y, zz).setPosition(this._p); this.mesh.setMatrixAt(k, this._m); }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
/* ---------------- cavo flessibile (geometria aggiornata sul posto) ---------------- */
export class FlexCable {
  constructor(r, mat, n, rad) {
    this.r = r; this.n = n || 26; this.rad = rad || 7; const N = (this.n + 1) * (this.rad + 1), g = new THREE.BufferGeometry(); this.pos = new Float32Array(N * 3); this.nor = new Float32Array(N * 3);
    const idx = []; for (let i = 0; i < this.n; i++) for (let j = 0; j < this.rad; j++) { const a = i * (this.rad + 1) + j, b = a + this.rad + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    g.setIndex(idx); g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute("normal", new THREE.BufferAttribute(this.nor, 3).setUsage(THREE.DynamicDrawUsage));
    this.mesh = new THREE.Mesh(g, mat); this.mesh.castShadow = true; this.mesh.frustumCulled = false; this.P = []; for (let i = 0; i <= this.n; i++) this.P.push(new THREE.Vector3());
  }
  // a, b estremi; da, db direzioni d'uscita (unitarie); sag = abbassamento al centro (m)
  update(a, b, da, db, sag, floorY) {
    const d = a.distanceTo(b), k = d * 0.4, p1 = a.clone().addScaledVector(da, k), p2 = b.clone().addScaledVector(db, k), P = this.P;
    for (let i = 0; i <= this.n; i++) { const t = i / this.n, u = 1 - t; P[i].set(0, 0, 0).addScaledVector(a, u * u * u).addScaledVector(p1, 3 * u * u * t).addScaledVector(p2, 3 * u * t * t).addScaledVector(b, t * t * t); P[i].y -= (sag || 0) * 4 * t * u; if (floorY != null && P[i].y < floorY + this.r) P[i].y = floorY + this.r; }
    let T0 = new THREE.Vector3().subVectors(P[1], P[0]).normalize(), N0 = Math.abs(T0.y) < 0.9 ? new THREE.Vector3(0, 1, 0).cross(T0).normalize() : new THREE.Vector3(1, 0, 0).cross(T0).normalize();
    const Tn = new THREE.Vector3(), B = new THREE.Vector3(), q = new THREE.Quaternion(), pos = this.pos, nor = this.nor, R = this.rad;
    for (let i = 0; i <= this.n; i++) { Tn.subVectors(P[Math.min(this.n, i + 1)], P[Math.max(0, i - 1)]).normalize(); q.setFromUnitVectors(T0, Tn); N0.applyQuaternion(q).normalize(); T0.copy(Tn); B.crossVectors(Tn, N0);
      for (let j = 0; j <= R; j++) { const v = j / R * Math.PI * 2, cx = Math.cos(v), cy = Math.sin(v), nx = cx * N0.x + cy * B.x, ny = cx * N0.y + cy * B.y, nz = cx * N0.z + cy * B.z, o = (i * (R + 1) + j) * 3; nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz; pos[o] = P[i].x + nx * this.r; pos[o + 1] = P[i].y + ny * this.r; pos[o + 2] = P[i].z + nz * this.r; } }
    const g = this.mesh.geometry; g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true; g.computeBoundingSphere();
  }
  dispose() { this.mesh.geometry.dispose(); }
}
export { labelTex };
