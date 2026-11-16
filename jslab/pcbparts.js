// Braccio Lab · Componenti elettronici 3D dettagliati per la vista PCB (v6). Unità: passo di griglia 2,54 mm.
// Resistenze a osso di cane con bande e smalto epossidico, LED 5 mm con lente, telaio e chip luminoso,
// elettrolitici con guaina stampata e croce di sfiato, DIP con tacca e punto pin 1, TO-92/TO-220 con aletta,
// moduli MCU (QFP, quarzo, USB, LED, MLCC, regolatore SOT-223), driver passo-passo con dissipatore,
// morsettiere, relè, pulsanti, fusibili, giunti con menisco, residui di flussante, ponti e bruciature.
import * as THREE from "../vendor/three.module.min.js";
import { materials } from "../js3d/gfx.js?v=6";
import { merge, rbox, lathe, extrudeY, stepper, hobbyServo } from "../js3d/parts3d.js?v=6";

export function pcbKit(ctx) {
  const CIR = ctx.CIR, T = ctx.T, track = ctx.track, D = T.detail, M = materials(T), seg = n => Math.max(6, Math.round(n * T.seg));
  const std = (o) => track(new THREE.MeshStandardMaterial(o)), phy = (o) => track(T.phys ? new THREE.MeshPhysicalMaterial(o) : new THREE.MeshStandardMaterial(Object.fromEntries(Object.entries(o).filter(([k]) => !/clearcoat|transmission|thickness|ior|sheen|attenuation|iridescence/.test(k)))));
  const MAT = ctx.MAT = ctx.MAT || {};
  Object.assign(MAT, {
    lead: std({ color: 0xd4d8dc, metalness: 1, roughness: 0.22 }), gold: std({ color: 0xf2c35a, metalness: 1, roughness: 0.2 }), tin: std({ color: 0xc9ced3, metalness: 1, roughness: 0.32 }),
    mold: phy({ color: 0x18191c, metalness: 0, roughness: 0.62, clearcoat: 0.08 }), molds: phy({ color: 0x1d1e21, metalness: 0, roughness: 0.4, clearcoat: 0.25, clearcoatRoughness: 0.4 }),
    header: std({ color: 0x141416, metalness: 0, roughness: 0.5 }), ceramic: std({ color: 0xb59a6a, metalness: 0, roughness: 0.55 }), term: std({ color: 0xd0d4d8, metalness: 1, roughness: 0.25 }),
    shield: std({ color: 0xc7ccd1, metalness: 1, roughness: 0.3 }), heat: std({ color: 0x1b1c1f, metalness: 0.6, roughness: 0.45 }), alu: M.alu(), white: std({ color: 0xf1f1ec, metalness: 0, roughness: 0.5 }),
    rubber: M.rubber, black: std({ color: 0x0f1012, metalness: 0.1, roughness: 0.6 }), steel: M.steel, brass: M.brass, copper: M.copper
  });
  function canvasTex(w, h, draw, srgb) { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); draw(g, w, h); const t = track(new THREE.CanvasTexture(c)); if (srgb !== false) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = T.aniso; return t; }
  const FONT = (px, w) => (w || 600) + " " + Math.round(px) + "px Inter, system-ui, sans-serif";
  // raccoglitore di geometrie: una mesh per materiale (meno chiamate di disegno)
  function batch() { const m = new Map(); return { add(geo, mat) { if (!m.has(mat)) m.set(mat, []); m.get(mat).push(geo); return geo; }, flush(parent) { m.forEach((gs, mat) => { const g = gs.length > 1 ? merge(gs) : gs[0]; const o = new THREE.Mesh(track(g), mat); o.castShadow = o.receiveShadow = true; parent.add(o); }); m.clear(); } }; }
  function mk(geo, mat, parent) { const o = new THREE.Mesh(track(geo), mat); o.castShadow = o.receiveShadow = true; parent.add(o); return o; }
  const th = () => ctx.th || 0.63;
  // reoforo: attraversa il foro (spezzone sotto la scheda), sale e piega verso x1 con raggio
  function lead(B, x0, x1, hgt, z, r, mat) { z = z || 0; r = r || 0.11; const yb = -th() - 0.45, pts = [new THREE.Vector3(x0, yb, z), new THREE.Vector3(x0, Math.max(yb + 0.1, hgt - 0.35), z)];
    if (Math.abs(x1 - x0) > 0.05) { const s = Math.sign(x1 - x0); pts.push(new THREE.Vector3(x0 + s * 0.1, hgt - 0.1, z), new THREE.Vector3(x0 + s * 0.35, hgt, z), new THREE.Vector3(x1, hgt, z)); } else pts.push(new THREE.Vector3(x0, hgt, z));
    const cv = new THREE.CatmullRomCurve3(pts, false, "centripetal"); B.add(new THREE.TubeGeometry(cv, D >= 2 ? 18 : 8, r, D ? 6 : 4, false), mat || MAT.lead); }
  // reoforo piatto (DIP / TO-220): spalla larga poi piedino stretto
  function flatLeg(B, px, pz, ex, ez, y, w, mat) { const dx = px - ex, dz = pz - ez, L = Math.hypot(dx, dz), a = Math.atan2(dz, dx);
    if (L > 0.05) { const sh = new THREE.BoxGeometry(L + 0.12, 0.1, w); sh.rotateY(-a); sh.translate((px + ex) / 2, y, (pz + ez) / 2); B.add(sh, mat || MAT.tin); }
    const up = new THREE.BoxGeometry(w, y - 0.2, 0.1); up.rotateY(-a + Math.PI / 2); up.translate(px, (y + 0.2) / 2, pz); B.add(up, mat || MAT.tin);
    const pin = new THREE.BoxGeometry(w * 0.55, th() + 0.65, 0.1); pin.rotateY(-a + Math.PI / 2); pin.translate(px, 0.2 - (th() + 0.65) / 2, pz); B.add(pin, mat || MAT.tin); }
  function marking(lines, w, h, o) { o = o || {}; return canvasTex(256, Math.round(256 * h / w), (g, W, H) => { g.fillStyle = o.bg || "#17181b"; g.fillRect(0, 0, W, H);
    if (o.dot) { g.fillStyle = "rgba(0,0,0,.55)"; g.beginPath(); g.arc(W * 0.1, H * 0.78, Math.min(W, H) * 0.06, 0, 7); g.fill(); g.strokeStyle = "rgba(255,255,255,.08)"; g.lineWidth = 2; g.stroke(); }
    if (o.notch) { g.fillStyle = "rgba(0,0,0,.6)"; g.beginPath(); g.arc(0, H / 2, H * 0.14, -Math.PI / 2, Math.PI / 2); g.fill(); }
    g.fillStyle = o.fg || "rgba(214,218,222,.86)"; g.textAlign = "center"; g.textBaseline = "middle"; const lh = H / (lines.length + 0.8); lines.forEach((l, i) => { let fs = lh * (i ? 0.62 : 0.78); g.font = FONT(fs, i ? 500 : 700); const mw = g.measureText(l).width; if (mw > W * 0.88) { fs *= W * 0.88 / mw; g.font = FONT(fs, i ? 500 : 700); } g.fillText(l, W / 2, lh * (i + 0.9)); }); }); }
  function topLabel(g, tex, w, d, x, y, z, mat) { const m = new THREE.Mesh(track(new THREE.PlaneGeometry(w, d)), mat || std({ map: tex, roughness: 0.6, metalness: 0 })); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); g.add(m); return m; }
  let _glow = null; function glowTex() { if (_glow) return _glow; _glow = canvasTex(64, 64, c => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(255,255,255,.5)"); gr.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); }); return _glow; }
  // corpo assiale tornito (asse X) con texture lungo l'asse (bande, guaina)
  function axialBody(len, prof, mat, x0, y) { const N = 36, pts = []; for (let i = 0; i <= N; i++) { const t = i / N; pts.push([prof(t), -len / 2 + t * len]); } const geo = lathe(pts, seg(24)); geo.rotateZ(-Math.PI / 2); geo.translate(x0 + len / 2, y, 0); return geo; }
  const dog = (r) => t => { const e = Math.min(t, 1 - t); return e < 0.02 ? r * 0.55 + (e / 0.02) * r * 0.4 : e < 0.22 ? r * (0.95 + 0.05 * Math.sin(Math.min(1, (e - 0.02) / 0.2) * Math.PI)) : r * 0.86; };
  const capsule = (r) => t => { const e = Math.min(t, 1 - t); return e < 0.12 ? r * Math.sqrt(Math.max(0, 1 - Math.pow(1 - e / 0.12, 2))) * 0.98 + r * 0.02 : r; };
  function bandTex(base, bands, pos, w) { return canvasTex(16, 256, (g, W, H) => { g.fillStyle = base; g.fillRect(0, 0, W, H); const n = 30; for (let i = 0; i < n; i++) { g.fillStyle = "rgba(255,255,255," + (0.02 + 0.03 * Math.random()).toFixed(3) + ")"; g.fillRect(0, Math.random() * H, W, 2); } bands.forEach((b, i) => { g.fillStyle = b; const y = (1 - pos[i]) * H; g.fillRect(0, y - w * H / 2, W, w * H); }); }); }
  /* ------------------------------------------------------------------ */
  function buildComp(c, p, info) {
    const g = new THREE.Group(), t = c.t, B = batch(); info.body = []; info.glow = null; info.spin = null;
    const body = (m) => { info.body.push(m); return m; };
    switch (t) {
      case "R": { const bd = CIR.bands(p.R, p.tol), prec = (p.tol || 5) <= 1, len = 2.45, r = 0.46; lead(B, 0, 0.75, 0.72); lead(B, 4, 3.25, 0.72);
        const cols = bd.map(b => b.h), pos = prec ? [0.2, 0.3, 0.4, 0.5, 0.8] : [0.22, 0.34, 0.46, 0.78], tex = bandTex(prec ? "#4f8fd0" : "#d8c39a", cols, pos.slice(0, cols.length), 0.075);
        body(mk(axialBody(len, dog(r), 0, 0.775, 0.72), phy({ map: tex, roughness: 0.42, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.25 }), g)); break; }
      case "POT": { [0, 2, 4].forEach(x => lead(B, x, x, 0.5, 0, 0.12)); const b = body(mk(rbox(4.6, 2.4, 2.4, 0.15), phy({ color: 0x1d5fa8, roughness: 0.45, clearcoat: 0.3 }), g)); b.position.set(2, 1.6, -1.4);
        const rot = mk(new THREE.CylinderGeometry(1.0, 1.0, 0.5, seg(24)), MAT.white, g); rot.position.set(2, 3.0, -1.4); const sl = mk(new THREE.BoxGeometry(1.5, 0.2, 0.25), MAT.black, g); sl.position.set(2, 3.2, -1.4); const sl2 = sl.clone(); sl2.rotation.y = Math.PI / 2; g.add(sl2);
        if (D) topLabel(g, marking(["3296W", "103"], 4.2, 1.6, { bg: "#1d5fa8", fg: "rgba(240,240,240,.9)" }), 3.6, 0.9, 2, 2.81, -0.4); break; }
      case "LED": { const col = new THREE.Color((CIR.LED_COL[p.color] || CIR.LED_COL.rosso).h); lead(B, 0, 1.55, 1.3, 0, 0.1); lead(B, 4, 2.45, 1.3, 0, 0.1);
        const lens = phy({ color: col.clone().lerp(new THREE.Color(1, 1, 1), 0.35), roughness: 0.05, metalness: 0, transmission: T.phys ? 0.82 : 0, thickness: 1.2, ior: 1.52, attenuationColor: col, attenuationDistance: 1.6, emissive: col, emissiveIntensity: 0, transparent: !T.phys, opacity: T.phys ? 1 : 0.82 });
        const prof = [[0, 4.95], [0.55, 4.82], [0.85, 4.52], [0.98, 4.1], [0.98, 1.85], [1.12, 1.85], [1.12, 1.35], [0.95, 1.3], [0, 1.3]]; const ln = body(mk(lathe(prof, seg(32)), lens, g)); ln.position.set(2, 0, 0); ln.renderOrder = 2;
        if (D) { const fr = batch(); const anv = new THREE.BoxGeometry(0.7, 1.4, 0.1); anv.translate(1.7, 2.1, 0); fr.add(anv, MAT.tin); const cup = lathe([[0.12, 0], [0.32, 0.22], [0.3, 0.26], [0.1, 0.06]], 12); cup.translate(1.75, 2.8, 0); fr.add(cup, MAT.tin); const post = new THREE.BoxGeometry(0.4, 1.8, 0.1); post.translate(2.35, 2.2, 0); fr.add(post, MAT.tin); fr.flush(g); }
        const die = mk(new THREE.BoxGeometry(0.16, 0.08, 0.16), std({ color: 0x222222, emissive: col, emissiveIntensity: 0 }), g); die.position.set(1.75, 2.86, 0);
        let spr = null; if (!T.bloom) { spr = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: glowTex(), color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }))); spr.scale.set(7, 7, 1); spr.position.set(2, 3.6, 0); g.add(spr); }
        info.glow = { m: lens, die: die.material, spr, col }; break; }
      case "D": { lead(B, 0, 1.05, 0.62, 0, 0.12); lead(B, 4, 2.95, 0.62, 0, 0.12); const tx = bandTex("#1a1a1c", ["#c7ccd1"], [0.86], 0.12); body(mk(axialBody(1.9, capsule(0.42), 0, 1.05, 0.62), phy({ map: tx, roughness: 0.38, clearcoat: 0.5 }), g)); break; }
      case "C": { if (p.pol !== false) { const r = Math.max(0.9, Math.min(3.2, 0.9 + Math.log10(p.C * 1e6 + 1) * 0.55)), h = 1.8 + r * 1.6, y0 = 0.25; lead(B, 0, 0, 0.3, 0, 0.1); lead(B, 4, 4, 0.3, 0, 0.1);
          const uF = p.C * 1e6, val = (uF >= 1 ? CIR.fx(uF, uF < 10 ? 1 : 0) : CIR.fx(uF, 2)) + "µF", volt = (p.Vmax || 25) + "V";
          const sleeve = canvasTex(512, 256, (g2, W, H) => { g2.fillStyle = "#1c2a5a"; g2.fillRect(0, 0, W, H); g2.fillStyle = "#b8c2d6"; g2.fillRect(W * 0.62, 0, W * 0.16, H); g2.fillStyle = "#1c2a5a"; g2.font = FONT(H * 0.16, 800); g2.textAlign = "center"; for (let k = 0; k < 4; k++) g2.fillText("−", W * 0.7, H * (0.2 + k * 0.2));
            g2.save(); g2.translate(W * 0.3, H / 2); g2.rotate(-Math.PI / 2); g2.fillStyle = "#e7ecf5"; g2.font = FONT(H * 0.11, 700); g2.fillText(val + " " + volt, 0, -W * 0.02); g2.font = FONT(H * 0.08, 500); g2.fillText("105°C  XQ", 0, W * 0.06); g2.restore(); g2.fillStyle = "rgba(255,255,255,.08)"; g2.fillRect(0, H * 0.06, W, H * 0.02); });
          const prof = [[r * 0.84, 0], [r * 0.98, 0.04], [r, 0.12], [r, h - 0.55], [r * 0.93, h - 0.42], [r * 0.93, h - 0.32], [r, h - 0.22], [r, h - 0.08], [r * 0.94, h]];
          const sl = body(mk(lathe(prof, seg(36)), phy({ map: sleeve, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2 }), g)); sl.position.set(2, y0, 0); sl.rotation.y = Math.PI * 0.75;
          const vent = canvasTex(128, 128, (g2, W, H) => { g2.fillStyle = "#c3c9cf"; g2.fillRect(0, 0, W, H); g2.strokeStyle = "#5b6066"; g2.lineWidth = W * 0.035; g2.beginPath(); g2.moveTo(W * 0.15, H / 2); g2.lineTo(W * 0.85, H / 2); g2.moveTo(W / 2, H * 0.15); g2.lineTo(W / 2, H * 0.85); g2.stroke(); });
          const top = mk(new THREE.CircleGeometry(r * 0.94, seg(32)), std({ map: vent, metalness: 1, roughness: 0.3 }), g); top.rotation.x = -Math.PI / 2; top.position.set(2, y0 + h - 0.01, 0);
          const bung = mk(new THREE.CylinderGeometry(r * 0.86, r * 0.86, 0.24, seg(24)), MAT.rubber, g); bung.position.set(2, y0 - 0.06, 0); }
        else { lead(B, 0, 1.45, 1.1, 0, 0.09); lead(B, 4, 2.55, 1.1, 0, 0.09); const dsk = new THREE.SphereGeometry(1.05, seg(24), seg(14)); dsk.scale(1, 1, 0.32); const d = body(mk(dsk, phy({ color: 0xd28a2a, roughness: 0.55, clearcoat: 0.3 }), g)); d.position.set(2, 2.0, 0);
          if (D) { const nf = p.C ? Math.round(p.C * 1e12) : 100000, code = String(nf).slice(0, 2) + (String(nf).length - 2); const lb = new THREE.Mesh(track(new THREE.PlaneGeometry(1.3, 0.6)), std({ map: marking([code], 1.3, 0.6, { bg: "#d28a2a", fg: "#3a250c" }), roughness: 0.6 })); lb.position.set(2, 2.05, 0.345); g.add(lb); } } break; }
      case "L": { lead(B, 0, 0.9, 1.0, 0, 0.11); lead(B, 4, 3.1, 1.0, 0, 0.11); const core = mk(new THREE.CylinderGeometry(1.2, 1.2, 0.4, seg(24)), MAT.heat, g); core.position.set(2, 0.45, 0);
        const wind = []; for (let k = 0; k < (D >= 2 ? 9 : 4); k++) { const tg = new THREE.TorusGeometry(0.95, 0.12, 6, seg(20)); tg.rotateX(Math.PI / 2); tg.translate(2, 0.75 + k * (D >= 2 ? 0.2 : 0.45), 0); wind.push(tg); } body(mk(merge(wind), std({ color: 0xc8743a, metalness: 1, roughness: 0.25 }), g));
        const capT = mk(new THREE.CylinderGeometry(1.2, 1.2, 0.35, seg(24)), MAT.heat, g); capT.position.set(2, 0.75 + (D >= 2 ? 9 : 4) * (D >= 2 ? 0.2 : 0.45) + 0.05, 0); break; }
      case "LDR": case "NTC": { lead(B, 0, 1.6, 1.4, 0, 0.09); lead(B, 4, 2.4, 1.4, 0, 0.09);
        if (t === "LDR") { const tx = canvasTex(128, 128, (g2, W) => { g2.fillStyle = "#f2efe6"; g2.fillRect(0, 0, W, W); g2.strokeStyle = "#c2541c"; g2.lineWidth = W * 0.06; g2.beginPath(); for (let k = 0; k < 7; k++) { const y = W * (0.18 + k * 0.105); g2.moveTo(W * 0.2, y); g2.lineTo(W * 0.8, y); } g2.stroke(); }); const d = body(mk(new THREE.CylinderGeometry(1.0, 1.0, 0.5, seg(28)), [std({ color: 0xece6d6, roughness: 0.5 }), phy({ map: tx, roughness: 0.15, clearcoat: 1 }), std({ color: 0xece6d6 })], g)); d.rotation.x = Math.PI / 2; d.position.set(2, 2.3, 0); }
        else { const bd = new THREE.SphereGeometry(0.6, seg(18), seg(12)); bd.scale(1, 1.25, 0.7); const d = body(mk(bd, phy({ color: 0x1f3c7a, roughness: 0.3, clearcoat: 0.8 }), g)); d.position.set(2, 2.0, 0); } break; }
      case "FUSE": { lead(B, 0, 0.5, 0.95); lead(B, 4, 3.5, 0.95); const gl = mk(axialBody(2.6, () => 0.5, 0, 0.7, 0.95), phy({ color: 0xeef6ff, roughness: 0.03, transmission: T.phys ? 1 : 0, thickness: 0.2, ior: 1.5, transparent: !T.phys, opacity: T.phys ? 1 : 0.35 }), g); body(gl);
        [0.85, 3.15].forEach(x => { const e = mk(axialBody(0.5, () => 0.53, 0, x - 0.25, 0.95), MAT.tin, g); void e; }); const w = mk(new THREE.CylinderGeometry(0.03, 0.03, 2.1, 6), MAT.lead, g); w.rotation.z = Math.PI / 2; w.position.set(2, 0.95, 0); break; }
      case "LAMP": { lead(B, 0, 1.6, 0.9); lead(B, 4, 2.4, 0.9); const m = phy({ color: 0xfff6dc, emissive: 0xffc46a, emissiveIntensity: 0, roughness: 0.04, transmission: T.phys ? 0.9 : 0, thickness: 0.1, transparent: !T.phys, opacity: T.phys ? 1 : 0.5 }); const b2 = body(mk(lathe([[0, 4.2], [0.9, 4.0], [1.35, 3.3], [1.3, 2.4], [0.7, 1.6], [0.6, 1.1], [0, 1.1]], seg(28)), m, g)); b2.position.x = 2;
        const fil = mk(new THREE.TorusGeometry(0.35, 0.05, 4, 16, Math.PI), std({ color: 0x332211, emissive: 0xffaa44, emissiveIntensity: 0 }), g); fil.position.set(2, 2.7, 0); const base = mk(new THREE.CylinderGeometry(0.62, 0.62, 0.5, seg(16)), MAT.tin, g); base.position.set(2, 1.2, 0);
        info.glow = { m, die: fil.material, spr: null, lamp: true }; break; }
      case "SW": case "BTN": { [0, 4].forEach(x => lead(B, x, x, 0.4, 0, 0.12));
        if (t === "BTN") { const bs = body(mk(rbox(3.0, 1.1, 3.0, 0.08), MAT.black, g)); bs.position.set(2, 0.75, 0); const fr = mk(new THREE.BoxGeometry(3.0, 0.12, 3.0), MAT.shield, g); fr.position.set(2, 1.36, 0); const k = mk(new THREE.CylinderGeometry(0.75, 0.75, p.on ? 0.35 : 0.65, seg(20)), std({ color: 0x2b2b2e, roughness: 0.4 }), g); k.position.set(2, p.on ? 1.55 : 1.7, 0); }
        else { const sh = body(mk(rbox(3.4, 1.4, 1.6, 0.06), MAT.shield, g)); sh.position.set(2, 0.95, 0); const sl = mk(rbox(0.8, 0.9, 0.8, 0.1), std({ color: p.on ? 0x2fbf6a : 0xd44040, roughness: 0.4 }), g); sl.position.set(p.on ? 2.7 : 1.3, 1.9, 0); } break; }
      case "V": case "BAT": case "MAINS": case "I": case "ACDRIVE": case "MOTOR": {
        const col = t === "MAINS" || t === "ACDRIVE" ? 0x2a62c9 : 0x1f9a4a, m = phy({ color: col, roughness: 0.5, clearcoat: 0.2 });
        const tb = body(mk(rbox(5.8, 3.0, 3.0, 0.12), m, g)); tb.position.set(2, 1.5, -0.3);
        [0, 4].forEach(x => { lead(B, x, x, 0.3, 0, 0.16); const hole = mk(new THREE.BoxGeometry(1.4, 1.1, 0.1), MAT.black, g); hole.position.set(x, 1.25, 1.21); const sc = mk(lathe([[0, 0.25], [0.6, 0.22], [0.66, 0.1], [0.66, 0], [0, 0]], seg(18)), MAT.tin, g); sc.position.set(x, 2.78, -0.6); const sl = mk(new THREE.BoxGeometry(1.0, 0.12, 0.16), MAT.black, g); sl.position.set(x, 3.04, -0.6); sl.rotation.y = 0.4 + x * 0.1; });
        if (t === "MOTOR") { const can = lathe([[0, -2.6], [1.9, -2.6], [2.2, -2.3], [2.2, 2.3], [1.9, 2.6], [0.6, 2.6], [0.6, 2.9], [0, 2.9]], seg(32)); const mo = body(mk(can, std({ color: 0xb9bfc6, metalness: 1, roughness: 0.3 }), g)); mo.rotation.x = Math.PI / 2; mo.position.set(2, 2.4, -6.6);
          const ec = mk(new THREE.CylinderGeometry(2.0, 2.0, 0.6, seg(28)), std({ color: 0xece4d6, roughness: 0.6 }), g); ec.rotation.x = Math.PI / 2; ec.position.set(2, 2.4, -3.9);
          const sh = new THREE.Group(); sh.position.set(2, 2.4, -9.6); g.add(sh); const s1 = mk(new THREE.CylinderGeometry(0.2, 0.2, 1.2, 10), MAT.steel, sh); s1.rotation.x = Math.PI / 2; const fl = mk(new THREE.BoxGeometry(2.2, 0.25, 0.25), std({ color: 0xff7a2f, roughness: 0.4 }), sh); fl.position.z = -0.5; info.spin = { o: sh, ax: "z" };
          cable(g, [0, 3.0, -1.4], [1.4, 2.4, -3.6], 0xd63a2a); cable(g, [4, 3.0, -1.4], [2.6, 2.4, -3.6], 0x1a1a1a); }
        if (t === "ACDRIVE") { const d2 = body(mk(rbox(5, 8, 7, 0.25), phy({ color: 0x23272c, metalness: 0.3, roughness: 0.4, clearcoat: 0.4 }), g)); d2.position.set(2, 4, -8.5); const fins = []; for (let k = 0; k < 7; k++) fins.push(new THREE.BoxGeometry(0.2, 7, 5).translate(-0.6 + k * 0.4 - 0.1, 4, -8.5)); mk(merge(fins), M.alu(), g).position.x = 0; const dp = mk(new THREE.PlaneGeometry(2.6, 1.2), std({ color: 0x0a0a0a, emissive: 0x3dff9a, emissiveIntensity: 0.6, emissiveMap: marking(["0.0 Hz"], 2.6, 1.2, { bg: "#000", fg: "#3dff9a" }) }), g); dp.position.set(2, 6.5, -4.99); }
        if (t === "BAT") { const bt = body(mk(rbox(5.8, 2.8, 8.4, 0.3), phy({ color: /li/.test(p.kind) ? 0x2f5fb0 : 0x1c1c1c, roughness: 0.4, clearcoat: 0.4 }), g)); bt.position.set(2, 1.4, -7); if (D) topLabel(g, marking([/li/.test(p.kind) ? "Li-ion" : "9V", CIR.fx(p.V || 9, 1) + " V"], 5, 4, { bg: "#d9a321", fg: "#111" }), 4.8, 4, 2, 2.82, -7); }
        if (D) topLabel(g, marking([t === "V" ? "PWR " + CIR.fx(p.V || 5, 1) + "V" : t === "MAINS" ? "230V~" : t === "BAT" ? "BATT" : t === "MOTOR" ? "MOT" : t === "ACDRIVE" ? "AC DRIVE" : "I"], 4.4, 1.1, { bg: "#" + col.toString(16).padStart(6, "0"), fg: "#fff" }), 4.4, 1.1, 2, 3.01, 0.6); break; }
      case "GND": { const tp = mk(new THREE.CylinderGeometry(0.35, 0.35, 1.2, 10), MAT.black, g); tp.position.set(0, 0.6, 0); const lp = mk(new THREE.TorusGeometry(0.4, 0.07, 6, 16), MAT.tin, g); lp.position.set(0, 1.6, 0); break; }
      case "NPN": case "NMOS": case "REG": {
        const big = t === "REG" || (t === "NMOS" && /IRL|IRF/.test(p.kind)) || (t === "NPN" && /TIP|BD/.test(p.kind)), name = p.kind || (t === "REG" ? "LM7805" : t);
        if (big) { [0, 2, 4].forEach(x => { flatLeg(B, x, 0, x, -0.4, 1.7, 0.32); }); const b2 = body(mk(rbox(4.0, 3.6, 1.8, 0.12), MAT.molds, g)); b2.position.set(2, 3.5, -0.75);
          const tabS = new THREE.Shape(); tabS.moveTo(-2, 0); tabS.lineTo(2, 0); tabS.lineTo(2, 5.6); tabS.lineTo(1.6, 6.1); tabS.lineTo(-1.6, 6.1); tabS.lineTo(-2, 5.6); tabS.closePath(); const hp = new THREE.Path(); hp.absarc(0, 4.7, 0.62, 0, Math.PI * 2, true); tabS.holes.push(hp);
          const tg = new THREE.ExtrudeGeometry(tabS, { depth: 0.5, bevelEnabled: D > 0, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 1, curveSegments: seg(12) }); tg.translate(2, 1.7, -1.9); mk(tg, MAT.tin, g);
          const lb = new THREE.Mesh(track(new THREE.PlaneGeometry(3.4, 2.4)), std({ map: marking([name, "XQ 26 · 1A"], 3.4, 2.4, { bg: "#1d1e21" }), roughness: 0.6 })); lb.position.set(2, 3.5, 0.16); g.add(lb); }
        else { [0, 2, 4].forEach(x => { lead(B, x, x === 2 ? 2 : x < 2 ? 1.2 : 2.8, 1.25, 0, 0.09); }); const half = lathe([[0, 0], [1.0, 0], [1.0, 2.0], [0, 2.0]], seg(24), 0, Math.PI); half.rotateY(Math.PI / 2); const b2 = body(mk(half, MAT.mold, g)); b2.position.set(2, 1.6, 0.0);
          const fl = mk(new THREE.PlaneGeometry(2.0, 2.0), std({ map: marking([name.slice(0, 7), "XQ"], 2, 2, { bg: "#17181b" }), roughness: 0.6 }), g); fl.position.set(2, 2.6, 0.001); }
        break; }
      case "SERVO": case "STEPDRV": {
        [0, 2, 4].forEach(x => lead(B, x, x, 1.0, 0, 0.13, MAT.gold));
        if (t === "STEPDRV") { const pcbCol = /TMC/.test(p.drv) ? 0x1a1a1a : /DRV/.test(p.drv) ? 0x5c2a8c : 0xb3262b; const pc = body(mk(rbox(6.2, 0.6, 8, 0.08), phy({ color: pcbCol, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15 }), g)); pc.position.set(2, 3.3, -3);
          const hd = mk(new THREE.BoxGeometry(6.2, 1.0, 1.0), MAT.header, g); hd.position.set(2, 2.5, 0.2); const pins = []; for (let k = 0; k < 8; k++) pins.push(new THREE.BoxGeometry(0.25, 2.8, 0.25).translate(-1.0 + k * 0.85 + 0.2, 2.6, 0.2)); mk(merge(pins), MAT.gold, g);
          const chip = mk(rbox(2.0, 0.35, 2.0, 0.05), MAT.molds, g); chip.position.set(2, 3.78, -3); const hs = new THREE.Group(); hs.position.set(2, 3.96, -3); g.add(hs); const fins = [mk(new THREE.BoxGeometry(3.4, 0.4, 3.4), MAT.alu, hs)]; for (let k = 0; k < 7; k++) { const f = mk(new THREE.BoxGeometry(0.22, 2.0, 3.4), MAT.alu, hs); f.position.set(-1.5 + k * 0.5, 1.2, 0); fins.push(f); }
          const tp = mk(new THREE.CylinderGeometry(0.55, 0.55, 0.35, 16), MAT.brass, g); tp.position.set(3.9, 3.8, -5.9); [[0.6, -5.6], [1.2, -5.6]].forEach(([x, z]) => { const rs = mk(new THREE.BoxGeometry(0.5, 0.18, 0.3), MAT.black, g); rs.position.set(x, 3.7, z); });
          const mo = new THREE.Group(); mo.position.set(2, 0.2, -16); g.add(mo); const st = stepper(16.5, 16, { name: (p.motor || "nema17").toUpperCase() }); st.position.y = 16.2; mo.add(st); st.traverse(o => { if (o.isMesh && o.userData.heat) body(o); });
          const sh = new THREE.Group(); sh.position.set(0, 16.2 + 4.4, 0); mo.add(sh); const flag = mk(new THREE.BoxGeometry(3.2, 0.3, 0.6), std({ color: 0xff7a2f, roughness: 0.4 }), sh); flag.position.y = 0.2; info.spin = { o: sh, ax: "y" };
          cable(g, [2, 3.6, -7], [2, 8, -8.2], 0x1a1a1a); if (D) topLabel(g, marking([p.drv || "A4988"], 4, 1, { bg: "#" + pcbCol.toString(16).padStart(6, "0"), fg: "#f4f4f4" }), 4, 1, 2, 3.61, -0.9); }
        else { const sv = hobbyServo(9.0, { name: "MG996R" }); sv.position.set(2, 14.2, -9); g.add(sv); sv.traverse(o => { if (o.isMesh && o.userData.heat) body(o); }); const hr = new THREE.Group(); hr.position.set(2 + 3.4, 14.2 + 2.4, -9); g.add(hr); mk(rbox(7, 0.5, 1.2, 0.2), MAT.white, hr); info.spin = { o: hr, ax: "y", servo: true }; cable(g, [2, 1.2, -1], [0.5, 8, -9], 0xd5a321); }
        break; }
      default: dip(c, t, p, g, B, body, info);
    }
    B.flush(g); return g;
  }
  function cable(g, a, b, col) { const cv = new THREE.CatmullRomCurve3([new THREE.Vector3(...a), new THREE.Vector3((a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 1, (a[2] + b[2]) / 2), new THREE.Vector3(...b)]); mk(new THREE.TubeGeometry(cv, 16, 0.22, 6), M.cable(col || 0x202020), g); }
  // DIP / moduli multi-piedino (NE555, OPAMP, ULN, L298, MCU, RELAY)
  function dip(c, t, p, g, B, body, info) {
    const fp = CIR.footprint(t), bx = fp.box, cx = (bx[0] + bx[2]) / 2, cz = (bx[1] + bx[3]) / 2, bw = bx[2] - bx[0], bd = bx[3] - bx[1];
    if (t === "MCU") return mcu(c, p, g, B, body, fp);
    if (t === "L298") return l298(g, B, body, fp);
    if (t === "RELAY") { fp.pins.forEach(pp => lead(B, pp.x, pp.x, 0.4, pp.y, 0.14)); const rb = body(mk(rbox(bw + 2.2, 6.0, bd + 1.6, 0.2), phy({ color: 0x2a62c9, roughness: 0.45, clearcoat: 0.4 }), g)); rb.position.set(cx, 3.2, cz);
      if (D) topLabel(g, marking(["SONGLE", "SRD-" + (p.Vcoil || 5) + "VDC-SL-C", "10A 250VAC"], bw + 2, bd + 1.2, { bg: "#2a62c9", fg: "rgba(255,255,255,.92)" }), bw + 1.8, bd + 1.2, cx, 6.21, cz); return; }
    // DIP plastico con gambe a spalla
    const W2 = Math.max(2.6, bw), Dp = Math.max(1.6, bd), y = 1.15, bb = body(mk(rbox(W2, 1.3, Dp, 0.12, 2), MAT.mold, g)); bb.position.set(cx, y + 0.65, cz);
    fp.pins.forEach(pp => { const ex = Math.max(cx - W2 / 2, Math.min(cx + W2 / 2, pp.x)), ez = Math.max(cz - Dp / 2, Math.min(cz + Dp / 2, pp.y)); flatLeg(B, pp.x, pp.y, ex, ez, y + 0.35, 0.5); });
    const name = t === "NE555" ? "NE555P" : t === "OPAMP" ? (p.kind || "LM358N") : t === "ULN" ? "ULN2003A" : t; topLabel(g, marking([name, "XQ 2614"], W2, Dp, { dot: true, notch: true }), W2 * 0.96, Dp * 0.96, cx, y + 1.31, cz);
  }
  function smdR(B, x, z, y, rot, col) { const b = new THREE.BoxGeometry(0.62, 0.18, 0.32); b.rotateY(rot || 0); b.translate(x, y + 0.09, z); B.add(b, col === "cap" ? MAT.ceramic : MAT.black); [-1, 1].forEach(s => { const e = new THREE.BoxGeometry(0.12, 0.2, 0.34); e.translate(s * 0.31, 0, 0); e.rotateY(rot || 0); e.translate(x, y + 0.1, z); B.add(e, MAT.term); }); }
  function header(g, B, x, z0, n, y, rows) { for (let r = 0; r < (rows || 1); r++) { const hd = new THREE.BoxGeometry(0.95, 1.0, n * 1 - 0.05); hd.translate(x + r, y + 0.5, z0 + (n - 1) / 2); B.add(hd, MAT.header); for (let k = 0; k < n; k++) { const pn = new THREE.BoxGeometry(0.25, 3.0, 0.25); pn.translate(x + r, y + 0.2, z0 + k); B.add(pn, MAT.gold); } } void g; }
  function mcu(c, p, g, B, body, fp) {
    const Lr = Math.max(...fp.pins.map(q => q.y)) / 2 + 1, h = 2 * (Lr - 1), board = p.board || "uno", col = { uno: 0x1b6e8f, nano: 0x1b5f8f, esp32: 0x1c1c1e, stm32: 0x1d4fa3, pico: 0x1f7a3a, teensy: 0x2a6a2a }[board] || 0x1b6e8f, W2 = 9, Dp = h + 6, yb = 2.1;
    fp.pins.forEach(pp => lead(B, pp.x, pp.x, 1.8, pp.y, 0.13, MAT.gold)); [0, 6].forEach(x => header(g, B, x - 0.5, -1, h + 3, 0.6, 1));
    const pc = body(mk(rbox(W2, 0.5, Dp, 0.15), phy({ color: col, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.12 }), g)); pc.position.set(3, yb, h / 2);
    const top = yb + 0.25;
    if (board === "esp32") { const can = mk(rbox(5.2, 0.6, 5.6, 0.06), MAT.shield, g); can.position.set(3, top + 0.3, h / 2 + 0.4); topLabel(g, marking(["ESP32-WROOM-32E", "XQ · CE FCC"], 5, 5.4, { bg: "#c7ccd1", fg: "#2a2d31" }), 4.8, 5.2, 3, top + 0.61, h / 2 + 0.4, std({ map: marking(["ESP32-WROOM-32E", "CE  FCC  XQ"], 5, 5.4, { bg: "#c7ccd1", fg: "#2a2d31" }), metalness: 0.9, roughness: 0.32 }));
      const ant = canvasTex(256, 64, (g2, W, H) => { g2.fillStyle = "#1c1c1e"; g2.fillRect(0, 0, W, H); g2.strokeStyle = "#d9a441"; g2.lineWidth = 6; g2.beginPath(); g2.moveTo(10, H - 8); for (let k = 0; k < 8; k++) { const x = 20 + k * 28; g2.lineTo(x, 10); g2.lineTo(x + 14, 10); g2.lineTo(x + 14, H - 8); g2.lineTo(x + 28, H - 8); } g2.stroke(); }); topLabel(g, ant, 5, 1.3, 3, top + 0.005, h / 2 + 3.8, std({ map: ant, roughness: 0.3, metalness: 0.2 })); }
    else { // QFP con gambe ad ala di gabbiano su 4 lati e punto pin 1
      const q = 3.0, n = D >= 2 ? 8 : 5, cz = h / 2 - 0.6; const qb = mk(rbox(q, 0.38, q, 0.04), MAT.molds, g); qb.position.set(3, top + 0.24, cz);
      for (let s = 0; s < 4; s++) for (let k = 0; k < n; k++) { const u = -q / 2 + q * (k + 0.5) / n, lg = new THREE.BoxGeometry(0.55, 0.06, 0.12); lg.translate(q / 2 + 0.2, top + 0.06, 0); lg.applyMatrix4(new THREE.Matrix4().makeRotationY(s * Math.PI / 2)); const off = new THREE.Vector3(0, 0, u).applyAxisAngle(new THREE.Vector3(0, 1, 0), s * Math.PI / 2); lg.translate(3 + off.x, 0, cz + off.z); B.add(lg, MAT.tin); }
      topLabel(g, marking([board === "stm32" ? "STM32F411" : board === "pico" ? "RP2040" : board === "teensy" ? "IMXRT1062" : "ATMEGA328P", "AU 2614"], q, q, { dot: true }), q * 0.94, q * 0.94, 3, top + 0.435, cz);
      const xt = mk(lathe([[0, 0], [0.55, 0], [0.55, 0.55], [0.4, 0.7], [0, 0.7]], seg(16)), MAT.shield, g); xt.scale.set(1, 1, 0.45); xt.position.set(5.1, top, cz + 2.3);
      for (let k = 0; k < (D >= 2 ? 8 : 4); k++) smdR(B, 0.9 + (k % 4) * 0.55 + (k > 3 ? 4.5 : 0), cz - 2.5 + (k % 2) * 0.6, top, Math.PI / 2, k % 2 ? "cap" : "res");
      const reg = mk(rbox(1.6, 0.4, 1.3, 0.05), MAT.molds, g); reg.position.set(1.3, top + 0.2, cz + 3.4); const tab = mk(new THREE.BoxGeometry(1.4, 0.06, 0.5), MAT.tin, g); tab.position.set(1.3, top + 0.03, cz + 4.2); }
    const usb = mk(rbox(2.4, 0.95, 2.0, 0.25), MAT.shield, g); usb.position.set(3, top + 0.48, -1.6); const mouth = mk(new THREE.PlaneGeometry(1.7, 0.45), MAT.black, g); mouth.position.set(3, top + 0.48, -2.61); mouth.rotation.y = Math.PI;
    const btn = mk(rbox(1.0, 0.4, 1.0, 0.1), MAT.shield, g); btn.position.set(4.9, top + 0.2, h / 2 + 2.4); const bt2 = mk(new THREE.CylinderGeometry(0.28, 0.28, 0.25, 12), MAT.black, g); bt2.position.set(4.9, top + 0.5, h / 2 + 2.4);
    const pw = mk(new THREE.BoxGeometry(0.5, 0.2, 0.3), std({ color: 0x1a3a1a, emissive: 0x3dff6a, emissiveIntensity: 0 }), g); pw.position.set(1.2, top + 0.1, h / 2 + 2.6); info_led(pw, 0x3dff6a);
    if (D) topLabel(g, marking([(CIR.MCUS[board] || {}).name ? CIR.MCUS[board].name.split(" (")[0] : "MCU"], 7, 1.1, { bg: "#" + col.toString(16).padStart(6, "0"), fg: "#f2f2f2" }), 7, 1.1, 3, top + 0.004, h / 2 + 3.6);
    function info_led(m, cc) { m.userData.powerLed = cc; }
  }
  function l298(g, B, body, fp) {
    const h = Math.max(...fp.pins.map(q => q.y)), yb = 2.1, Dp = h + 6;
    fp.pins.forEach(pp => lead(B, pp.x, pp.x, 1.8, pp.y, 0.13, MAT.gold)); [0, 6].forEach(x => header(g, B, x - 0.5, -1, h + 3, 0.6, 1));
    const pc = body(mk(rbox(9.5, 0.5, Dp, 0.15), phy({ color: 0xb3262b, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.12 }), g)); pc.position.set(3, yb, h / 2);
    const top = yb + 0.25, hs = new THREE.Group(); hs.position.set(3, top, h / 2 + 0.5); g.add(hs); const base = mk(new THREE.BoxGeometry(6, 0.6, 3.2), MAT.heat, hs); base.position.y = 0.3; const fins = []; for (let k = 0; k < 9; k++) fins.push(new THREE.BoxGeometry(0.28, 5.2, 3.2).translate(-2.8 + k * 0.7, 3.2, 0)); body(mk(merge(fins), MAT.heat, hs));
    const ic = mk(rbox(4.2, 3.6, 0.9, 0.06), MAT.molds, g); ic.position.set(3, top + 2.2, h / 2 - 1.6); topLabel(g, marking(["L298N"], 3.5, 1.2), 3.4, 1.0, 3, top + 4.02, h / 2 - 1.6);
    [[1.2, h / 2 + 3.6], [4.8, h / 2 + 3.6]].forEach(([x, z]) => { const r = 0.8, cp = mk(lathe([[0, 0], [r, 0], [r, 2.4], [r * 0.9, 2.5], [0, 2.5]], seg(20)), phy({ color: 0x1c2a5a, roughness: 0.32, clearcoat: 0.6 }), g); cp.position.set(x, top, z); });
    const tb = mk(rbox(8.2, 2.2, 1.6, 0.1), phy({ color: 0x2a62c9, roughness: 0.5 }), g); tb.position.set(3, top + 1.1, -0.8);
  }
  /* ---------------- giunti di saldatura ---------------- */
  // menisco concavo (buono), goccia convessa opaca (freddo) con flussante, ponte, bruciatura
  const JG = {};
  function fillet(rp, rl, h, n) { const k = rp.toFixed(2) + rl.toFixed(2) + h.toFixed(2) + n; if (JG[k]) return JG[k]; const pts = []; const N = 10; for (let i = 0; i <= N; i++) { const s = i / N, r = rl + (rp - rl) * Math.pow(1 - s, 2.4); pts.push([r, s * h]); } pts.push([rl * 0.98, h + 0.08]); pts.push([0, h + 0.08]); const geo = track(lathe(pts, n)); JG[k] = geo; return geo; }
  function coldGeo(rp, n) { const k = "cold" + rp.toFixed(2) + n; if (JG[k]) return JG[k]; const pts = []; for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI / 2; pts.push([Math.cos(a) * rp * 0.88 + 0.05, Math.sin(a) * rp * 0.9 * (1 + 0.06 * Math.sin(i * 2.3))]); } pts.push([0, rp * 0.92]); const geo = track(lathe(pts, n)); JG[k] = geo; return geo; }
  let fluxT = null, burnT = null;
  function fluxTex() { if (fluxT) return fluxT; fluxT = canvasTex(128, 128, (g2, W) => { const gr = g2.createRadialGradient(W / 2, W / 2, W * 0.15, W / 2, W / 2, W / 2); gr.addColorStop(0, "rgba(190,120,30,.75)"); gr.addColorStop(0.55, "rgba(170,100,20,.45)"); gr.addColorStop(0.8, "rgba(150,90,20,.25)"); gr.addColorStop(1, "rgba(150,90,20,0)"); g2.fillStyle = gr; g2.fillRect(0, 0, W, W); for (let k = 0; k < 40; k++) { g2.fillStyle = "rgba(240,200,120," + (Math.random() * 0.25).toFixed(2) + ")"; g2.beginPath(); g2.arc(Math.random() * W, Math.random() * W, Math.random() * 4, 0, 7); g2.fill(); } }); return fluxT; }
  function burnTex() { if (burnT) return burnT; burnT = canvasTex(128, 128, (g2, W) => { const gr = g2.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); gr.addColorStop(0, "rgba(10,6,3,.95)"); gr.addColorStop(0.5, "rgba(45,25,10,.7)"); gr.addColorStop(1, "rgba(80,50,20,0)"); g2.fillStyle = gr; g2.fillRect(0, 0, W, W); }); return burnT; }
  const JM = {};
  function jmat(k) { if (JM[k]) return JM[k]; const m = {
      ok: () => std({ color: 0xe1e5ea, metalness: 1, roughness: 0.1 }), cold: () => std({ color: 0x9a9da2, metalness: 0.75, roughness: 0.68, normalMap: M.rubber.normalMap || null, normalScale: new THREE.Vector2(1.2, 1.2) }),
      flux: () => track(new THREE.MeshPhysicalMaterial({ map: fluxTex(), transparent: true, depthWrite: false, roughness: 0.08, metalness: 0, clearcoat: 1, polygonOffset: true, polygonOffsetFactor: -2 })),
      burn: () => track(new THREE.MeshStandardMaterial({ map: burnTex(), transparent: true, depthWrite: false, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -3 })) }[k](); JM[k] = m; return m; }
  function joint(parent, pd, st, y, other, bottom) {
    const n = seg(16), rp = pd.r * 0.95, s = bottom ? -1 : 1, grp = new THREE.Group(); grp.position.set(pd.x, y, pd.y); if (bottom) grp.scale.y = -1; parent.add(grp);
    const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = !bottom; m.receiveShadow = true; grp.add(m); return m; };
    if (st === "ok") add(fillet(rp, 0.13, 0.5, n), jmat("ok"));
    else if (st === "cold") { const m = add(coldGeo(rp, n), jmat("cold")); m.position.x = 0.05; m.scale.set(1, 0.9, 1.08); if (!bottom) { const f = add(track(new THREE.CircleGeometry(rp * 2.1, 20)), jmat("flux")); f.rotation.x = -Math.PI / 2; f.position.y = 0.012; } }
    else if (st === "bridge") { add(fillet(rp, 0.13, 0.5, n), jmat("ok")); if (other) { const dx = other.x - pd.x, dz = other.y - pd.y, d = Math.hypot(dx, dz), cap = new THREE.Mesh(track(new THREE.CapsuleGeometry(0.42, Math.max(0.1, d - 0.4), 4, 10)), jmat("ok")); cap.rotation.z = Math.PI / 2; cap.rotation.y = -Math.atan2(dz, dx); cap.position.set(dx / 2, 0.3, dz / 2); cap.scale.set(1, 1, 0.75); grp.add(cap); } }
    else if (st === "burnt") { const f = add(track(new THREE.CircleGeometry(pd.r * 3.2, 24)), jmat("burn")); f.rotation.x = -Math.PI / 2; f.position.y = 0.015; const lump = add(coldGeo(rp * 0.8, n), std({ color: 0x2a1a10, roughness: 0.95 })); lump.scale.set(1, 0.6, 1); }
    void s; return grp;
  }
  return { buildComp, joint, glowTex, canvasTex };
}
