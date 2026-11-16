// Braccio Lab · Tavola da lavoro elettronica: editor di circuiti su breadboard / PCB con simulazione in tempo reale,
// multimetro, oscilloscopio ed errori spiegati. Usa window.CIR (js/circuit.js).
const G = 24; // pixel per passo di griglia (2,54 mm) a zoom 1
const VCOL = (v, vmax) => { const t = Math.max(0, Math.min(1, v / Math.max(vmax, 1))); const h = 220 - 220 * t; return `hsl(${h},85%,${52 + 8 * t}%)`; };
const NETPAL = ["#e8463c", "#2f6fe0", "#21a35a", "#f0b429", "#8e44ad", "#e67e22", "#16a6b6", "#e84393", "#7f8c8d", "#2ecc71"];
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function label(ctx, t, x, y, col, size, align) { const k = 20; ctx.save(); ctx.translate(x, y); ctx.scale(1 / k, 1 / k); ctx.font = `600 ${(size || 0.5) * k}px Inter, system-ui, sans-serif`; ctx.textAlign = align || "center"; ctx.textBaseline = "middle"; ctx.fillStyle = col || "#222"; ctx.fillText(t, 0, 0); ctx.restore(); }
function valueText(CIR, c) {
  const p = c.p || {}, si = CIR.si, d = CIR.TYPES[c.t].p;
  const q = Object.assign({}, d, p);
  switch (c.t) {
    case "R": return si(q.R, "Ω"); case "POT": return si(q.R, "Ω") + " " + Math.round(q.pos * 100) + "%"; case "C": return si(q.C, "F") + " " + q.Vmax + "V"; case "L": return si(q.L, "H");
    case "V": return CIR.fx(q.V, 1) + " V"; case "BAT": return (CIR.BATS[q.kind] || {}).V + " V"; case "MAINS": return q.V + " V~"; case "I": return si(q.I, "A");
    case "LED": return "LED " + q.color; case "D": return q.kind; case "NPN": case "NMOS": return q.kind; case "REG": return q.kind; case "FUSE": return si(q.In, "A");
    case "LAMP": return q.V + "V " + q.P + "W"; case "MCU": return (CIR.MCUS[q.board] || {}).name.split(" (")[0]; case "MOTOR": return (CIR.DCMOT[q.kind] || {}).name.split(" ")[0] + " " + q.kind;
    case "SERVO": return q.kind.toUpperCase(); case "STEPDRV": return q.drv + " · " + q.motor; case "ACDRIVE": return q.kind; case "RELAY": return q.Vcoil + " V"; case "NE555": return "NE555"; case "OPAMP": return q.kind;
    case "LDR": return Math.round(q.lux) + " lx"; case "NTC": return q.T + " °C"; case "SW": return q.on ? "chiuso" : "aperto"; case "BTN": return q.on ? "premuto" : "rilasciato";
    default: return "";
  }
}
/* disegna il corpo del componente in coordinate locali (unità = passo griglia), già ruotato dal chiamante */
function drawBody(ctx, CIR, c, m, st, pcb, t) {
  const p = Object.assign({}, CIR.TYPES[c.t].p, c.p || {}); const u = 1;
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  const leads = (a, b) => { ctx.strokeStyle = pcb ? "#c8ccd2" : "#b8bcc2"; ctx.lineWidth = 0.12; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(a, 0); ctx.moveTo(b, 0); ctx.lineTo(4, 0); ctx.stroke(); };
  switch (c.t) {
    case "R": case "POT": {
      if (c.t === "POT") { ctx.fillStyle = "#1d5fa8"; rr(ctx, -0.5, -2.6, 5, 2.4, 0.3); ctx.fill(); ctx.fillStyle = "#ddd"; ctx.beginPath(); ctx.arc(2, -1.4, 0.8, 0, 7); ctx.fill(); ctx.strokeStyle = "#333"; ctx.lineWidth = 0.15; const a = -Math.PI * 0.75 + p.pos * Math.PI * 1.5; ctx.beginPath(); ctx.moveTo(2, -1.4); ctx.lineTo(2 + Math.cos(a - Math.PI / 2) * 0.7, -1.4 + Math.sin(a - Math.PI / 2) * 0.7); ctx.stroke(); break; }
      leads(0.9, 3.1); const hot = m && m.P > (p.P || 0.25) * 0.7;
      ctx.fillStyle = hot ? "#c98e5a" : "#e3cf9f"; rr(ctx, 0.9, -0.42, 2.2, 0.84, 0.38); ctx.fill();
      const b = CIR.bands(p.R, p.tol); [1.25, 1.6, 1.95, 2.65].forEach((x, i) => { ctx.fillStyle = b[i].h; ctx.fillRect(x - 0.09, -0.42, 0.18, 0.84); });
      break; }
    case "LED": case "D": case "LDR": case "NTC": case "FUSE": case "LAMP": case "L": case "C": case "SW": case "BTN": case "I": {
      if (c.t === "LED") { leads(1.4, 2.6); const col = (CIR.LED_COL[p.color] || CIR.LED_COL.rosso).h, lum = m ? m.lum || 0 : 0, burnt = m && m.I > 2.5 * (p.Imax || 0.02);
        if (lum > 0.02 && !burnt) { const g = ctx.createRadialGradient(2, 0, 0.1, 2, 0, 1.2 + 1.6 * Math.min(lum, 1.4)); g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.globalAlpha = Math.min(1, 0.35 + lum * 0.7); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(2, 0, 3, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
        ctx.fillStyle = burnt ? "#3a2a22" : col; ctx.globalAlpha = burnt ? 1 : 0.55 + Math.min(0.45, lum); ctx.beginPath(); ctx.arc(2, 0, 0.75, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 0.08; ctx.beginPath(); ctx.arc(2, 0, 0.75, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
        ctx.strokeStyle = "rgba(0,0,0,.45)"; ctx.beginPath(); ctx.moveTo(2.6, -0.5); ctx.lineTo(2.6, 0.5); ctx.stroke(); break; }
      if (c.t === "D") { leads(1.1, 2.9); ctx.fillStyle = "#1b1b1b"; rr(ctx, 1.1, -0.35, 1.8, 0.7, 0.2); ctx.fill(); ctx.fillStyle = "#c9c9c9"; ctx.fillRect(2.45, -0.35, 0.22, 0.7); break; }
      if (c.t === "LDR") { leads(1.3, 2.7); ctx.fillStyle = "#c63"; ctx.beginPath(); ctx.arc(2, 0, 0.7, 0, 7); ctx.fill(); ctx.strokeStyle = "#e7c89a"; ctx.lineWidth = 0.1; ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(1.55, i * 0.22); ctx.lineTo(2.45, i * 0.22); } ctx.stroke(); break; }
      if (c.t === "NTC") { leads(1.4, 2.6); ctx.fillStyle = "#2c4c8a"; ctx.beginPath(); ctx.arc(2, 0, 0.55, 0, 7); ctx.fill(); break; }
      if (c.t === "FUSE") { leads(0.8, 3.2); ctx.fillStyle = "rgba(210,230,255,.45)"; rr(ctx, 0.8, -0.45, 2.4, 0.9, 0.2); ctx.fill(); ctx.fillStyle = "#c0c4ca"; ctx.fillRect(0.8, -0.45, 0.35, 0.9); ctx.fillRect(2.85, -0.45, 0.35, 0.9); ctx.strokeStyle = st && st.blown ? "#3a3a3a" : "#8a8f96"; ctx.lineWidth = 0.07; ctx.beginPath(); if (st && st.blown) { ctx.moveTo(1.15, 0); ctx.lineTo(1.8, 0.1); ctx.moveTo(2.25, -0.1); ctx.lineTo(2.85, 0); } else { ctx.moveTo(1.15, 0); ctx.lineTo(2.85, 0); } ctx.stroke(); break; }
      if (c.t === "LAMP") { leads(1.2, 2.8); const lum = m ? m.lum || 0 : 0; if (lum > 0.02) { const g = ctx.createRadialGradient(2, 0, 0.1, 2, 0, 2.5); g.addColorStop(0, "rgba(255,230,150,.95)"); g.addColorStop(1, "rgba(255,200,80,0)"); ctx.globalAlpha = Math.min(1, lum); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(2, 0, 2.5, 0, 7); ctx.fill(); ctx.globalAlpha = 1; } ctx.fillStyle = "rgba(255,250,235,.8)"; ctx.beginPath(); ctx.arc(2, 0, 0.85, 0, 7); ctx.fill(); ctx.strokeStyle = "#a77"; ctx.lineWidth = 0.08; ctx.beginPath(); ctx.moveTo(1.6, 0.2); ctx.lineTo(1.8, -0.25); ctx.lineTo(2.2, 0.25); ctx.lineTo(2.4, -0.2); ctx.stroke(); break; }
      if (c.t === "L") { leads(1, 3); ctx.fillStyle = "#3d7a4a"; rr(ctx, 1, -0.45, 2, 0.9, 0.3); ctx.fill(); ctx.strokeStyle = "#c58b3a"; ctx.lineWidth = 0.12; ctx.beginPath(); for (let x = 1.2; x < 2.9; x += 0.3) { ctx.moveTo(x, -0.45); ctx.lineTo(x + 0.15, 0.45); } ctx.stroke(); break; }
      if (c.t === "C") { leads(1.2, 2.8); if (p.pol) { ctx.fillStyle = "#1f3f8a"; ctx.beginPath(); ctx.arc(2, 0, 0.95, 0, 7); ctx.fill(); ctx.fillStyle = "#c9d3e6"; ctx.beginPath(); ctx.arc(2, 0, 0.95, -0.6 + Math.PI * 0, 0.6); ctx.lineTo(2, 0); ctx.fill(); ctx.strokeStyle = "#9aa"; ctx.lineWidth = 0.06; ctx.beginPath(); ctx.moveTo(1.6, -0.4); ctx.lineTo(2.4, 0.4); ctx.moveTo(2.4, -0.4); ctx.lineTo(1.6, 0.4); ctx.stroke(); } else { ctx.fillStyle = "#d9822b"; ctx.beginPath(); ctx.ellipse(2, 0, 0.6, 0.42, 0, 0, 7); ctx.fill(); } break; }
      if (c.t === "SW" || c.t === "BTN") { leads(1, 3); ctx.fillStyle = "#2b2f36"; rr(ctx, 1, -0.7, 2, 1.4, 0.2); ctx.fill(); ctx.fillStyle = p.on ? "#3ddc84" : "#ff5a5f"; if (c.t === "BTN") { ctx.beginPath(); ctx.arc(2, 0, p.on ? 0.42 : 0.5, 0, 7); ctx.fill(); } else { rr(ctx, p.on ? 2 : 1.2, -0.3, 0.8, 0.6, 0.15); ctx.fill(); } break; }
      if (c.t === "I") { leads(1.2, 2.8); ctx.strokeStyle = "#333"; ctx.lineWidth = 0.12; ctx.beginPath(); ctx.arc(2, 0, 0.8, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(1.5, 0); ctx.lineTo(2.5, 0); ctx.lineTo(2.2, -0.25); ctx.moveTo(2.5, 0); ctx.lineTo(2.2, 0.25); ctx.stroke(); break; }
      break; }
    case "V": case "BAT": case "MAINS": {
      if (c.t === "V") { ctx.fillStyle = "#2c3138"; rr(ctx, 0.3, -2.8, 3.4, 2.4, 0.25); ctx.fill(); ctx.fillStyle = "#0b1a10"; rr(ctx, 0.6, -2.5, 2.8, 1.1, 0.12); ctx.fill(); label(ctx, CIR.fx(m ? m.V : p.V, 2) + "V", 2, -2.15, m && m.cc ? "#ff5a5f" : "#3ddc84", 0.55); label(ctx, CIR.si(m ? Math.abs(m.I) : 0, "A"), 2, -1.65, "#9fd", 0.42); ctx.fillStyle = "#d33"; ctx.beginPath(); ctx.arc(0.0, 0, 0.3, 0, 7); ctx.fill(); ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(4, 0, 0.3, 0, 7); ctx.fill(); ctx.strokeStyle = "#d33"; ctx.lineWidth = 0.1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0.8, -0.4); ctx.stroke(); ctx.strokeStyle = "#111"; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(3.2, -0.4); ctx.stroke(); break; }
      if (c.t === "BAT") { const k = CIR.BATS[p.kind] || {}; ctx.fillStyle = /li|lipo/.test(p.kind) ? "#2f5fb0" : p.kind === "pb12" ? "#333" : "#1c1c1c"; rr(ctx, 0.5, -1.0, 3, 2, 0.25); ctx.fill(); ctx.fillStyle = "#c79a2a"; ctx.fillRect(0.5, -1.0, 0.7, 2); label(ctx, k.V + "V", 2.4, 0, "#fff", 0.6); ctx.strokeStyle = "#d33"; ctx.lineWidth = 0.12; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0.5, 0); ctx.stroke(); ctx.strokeStyle = "#222"; ctx.beginPath(); ctx.moveTo(3.5, 0); ctx.lineTo(4, 0); ctx.stroke(); break; }
      ctx.fillStyle = "#e9e9e9"; rr(ctx, 0.6, -1.2, 2.8, 2.4, 0.4); ctx.fill(); ctx.fillStyle = "#333"; ctx.beginPath(); ctx.arc(1.5, 0, 0.25, 0, 7); ctx.arc(2.5, 0, 0.25, 0, 7); ctx.fill(); label(ctx, "230V~", 2, 0.85, "#c00", 0.45); ctx.strokeStyle = "#7a4a2a"; ctx.lineWidth = 0.14; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0.6, 0); ctx.stroke(); ctx.strokeStyle = "#2a5aa8"; ctx.beginPath(); ctx.moveTo(3.4, 0); ctx.lineTo(4, 0); ctx.stroke(); break; }
    case "MOTOR": case "ACDRIVE": {
      leads(0.8, 3.2); const big = c.t === "ACDRIVE"; ctx.fillStyle = big ? "#3a4a5a" : "#b9bfc6"; ctx.beginPath(); ctx.arc(2, 0, big ? 1.6 : 1.3, 0, 7); ctx.fill(); ctx.strokeStyle = "#666"; ctx.lineWidth = 0.08; ctx.stroke();
      const ang = (st && st.ang) || 0; ctx.fillStyle = "#e8e8e8"; ctx.beginPath(); ctx.arc(2, 0, 0.35, 0, 7); ctx.fill(); ctx.strokeStyle = "#ff7a2f"; ctx.lineWidth = 0.14; ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(2 + Math.cos(ang) * 0.9, Math.sin(ang) * 0.9); ctx.stroke();
      if (big) label(ctx, "AC", 2, 1.1, "#fff", 0.45); break; }
    case "GND": { ctx.strokeStyle = pcb ? "#eee" : "#333"; ctx.lineWidth = 0.14; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 0.6); ctx.moveTo(-0.8, 0.6); ctx.lineTo(0.8, 0.6); ctx.moveTo(-0.5, 0.9); ctx.lineTo(0.5, 0.9); ctx.moveTo(-0.2, 1.2); ctx.lineTo(0.2, 1.2); ctx.stroke(); break; }
    case "NPN": case "NMOS": case "REG": case "NE555": case "SERVO": case "STEPDRV": {
      ctx.strokeStyle = "#b8bcc2"; ctx.lineWidth = 0.12; ctx.beginPath(); [0, 2, 4].forEach(x => { ctx.moveTo(x, 0); ctx.lineTo(x, -0.8); }); ctx.stroke();
      if (c.t === "NPN") { ctx.fillStyle = "#1c1c1c"; ctx.beginPath(); ctx.moveTo(0.2, -0.8); ctx.lineTo(3.8, -0.8); ctx.arc(2, -0.8, 1.8, 0, Math.PI, true); ctx.closePath(); ctx.fill(); label(ctx, p.kind, 2, -1.5, "#ddd", 0.42); label(ctx, "B C E", 2, -0.6 - 0.0, "#888", 0.32); }
      else if (c.t === "NMOS" || c.t === "REG") { ctx.fillStyle = "#c0c5cb"; rr(ctx, 0.2, -3.2, 3.6, 1.2, 0.1); ctx.fill(); ctx.fillStyle = "#666"; ctx.beginPath(); ctx.arc(2, -2.6, 0.32, 0, 7); ctx.fill(); ctx.fillStyle = "#1c1c1c"; rr(ctx, 0.2, -2.1, 3.6, 1.4, 0.1); ctx.fill(); label(ctx, p.kind, 2, -1.4, "#ddd", 0.42); }
      else if (c.t === "NE555") { ctx.fillStyle = "#1c1c1c"; rr(ctx, -0.3, -2.6, 4.6, 1.9, 0.15); ctx.fill(); ctx.fillStyle = "#444"; ctx.beginPath(); ctx.arc(-0.3, -1.65, 0.3, -Math.PI / 2, Math.PI / 2); ctx.fill(); label(ctx, "NE555", 2, -1.65, "#ddd", 0.5); if (m && m.hi && st) { ctx.fillStyle = "#3ddc84"; ctx.beginPath(); ctx.arc(3.8, -2.3, 0.15, 0, 7); ctx.fill(); } }
      else if (c.t === "SERVO") { ctx.fillStyle = "#1f5ca8"; rr(ctx, -0.2, -3.4, 4.4, 2.6, 0.2); ctx.fill(); ctx.fillStyle = "#eee"; ctx.beginPath(); ctx.arc(1.2, -2.1, 0.55, 0, 7); ctx.fill(); label(ctx, p.kind.toUpperCase(), 2.8, -2.1, "#fff", 0.45); }
      else { ctx.fillStyle = "#1a1a1a"; rr(ctx, -0.4, -4.6, 4.8, 3.8, 0.3); ctx.fill(); ctx.fillStyle = "#555"; ctx.beginPath(); ctx.arc(2, -2.7, 1.0, 0, 7); ctx.fill(); ctx.fillStyle = "#ccc"; ctx.beginPath(); ctx.arc(2, -2.7, 0.3, 0, 7); ctx.fill(); const a = (st && st.ang) || 0; ctx.strokeStyle = "#ff7a2f"; ctx.lineWidth = 0.12; ctx.beginPath(); ctx.moveTo(2, -2.7); ctx.lineTo(2 + Math.cos(a) * 0.8, -2.7 + Math.sin(a) * 0.8); ctx.stroke(); ctx.fillStyle = "#1e7b3c"; rr(ctx, 0.2, -1.3, 3.6, 0.6, 0.08); ctx.fill(); label(ctx, p.drv, 2, -1.0, "#fff", 0.38); }
      break; }
    default: { // scatole: MCU, OPAMP, RELAY, ULN, L298
      const fp = CIR.footprint(c.t), b = fp.box, n = fp.pins.length;
      ctx.strokeStyle = "#b8bcc2"; ctx.lineWidth = 0.12; ctx.beginPath(); fp.pins.forEach(q => { ctx.moveTo(q.x, q.y); ctx.lineTo(q.x === 0 ? b[0] : b[2], q.y); }); ctx.stroke();
      const col = c.t === "MCU" ? ({ uno: "#1b6e8f", nano: "#1b5f8f", esp32: "#202020", stm32: "#1d4fa3", pico: "#1f7a3a", teensy: "#2a6a2a" }[p.board] || "#1b6e8f") : c.t === "L298" ? "#b3262b" : c.t === "RELAY" ? "#2a5fb0" : "#1c1c1c";
      ctx.fillStyle = col; rr(ctx, b[0], b[1], b[2] - b[0], b[3] - b[1], 0.3); ctx.fill();
      if (c.t === "L298") { ctx.fillStyle = "#222"; for (let i = 0; i < 5; i++) ctx.fillRect(b[0] + 0.6 + i * 0.6, b[1] + 0.3, 0.35, 1.6); }
      if (c.t === "MCU") { ctx.fillStyle = "#111"; rr(ctx, 2.1, 1.6, 1.8, 1.8, 0.1); ctx.fill(); ctx.fillStyle = "#c0c5cb"; rr(ctx, 2.3, b[1] + 0.2, 1.4, 0.9, 0.1); ctx.fill(); const pm = p.D13 === "H"; ctx.fillStyle = m && m.pin && m.pin.D13 && m.pin.D13.V > 2 ? "#ffb347" : "#553"; ctx.beginPath(); ctx.arc(4.4, 0, 0.18, 0, 7); ctx.fill(); ctx.fillStyle = m && m.vlog > 2.5 ? "#3ddc84" : "#353"; ctx.beginPath(); ctx.arc(4.4, 0.6, 0.18, 0, 7); ctx.fill(); }
      const names = CIR.TYPES[c.t].pins; fp.pins.forEach((q, i) => label(ctx, names[i], q.x === 0 ? b[0] + 0.25 : b[2] - 0.25, q.y, "#e9eef3", 0.38, q.x === 0 ? "left" : "right"));
      label(ctx, c.t === "MCU" ? (CIR.MCUS[p.board] || {}).name.split(" (")[0] : c.t === "OPAMP" ? p.kind : c.t === "RELAY" ? "RELÈ " + p.Vcoil + "V" : c.t === "ULN" ? "ULN2003" : "L298N", (b[0] + b[2]) / 2, b[3] - 0.5, "#fff", 0.42);
      if (c.t === "RELAY" && st) { ctx.fillStyle = st.on ? "#3ddc84" : "#334"; ctx.beginPath(); ctx.arc(b[2] - 0.6, b[1] + 0.6, 0.2, 0, 7); ctx.fill(); }
    }
  }
}
const SKEY = "xentriq-braccio-lab-bench-v1";
function load() { try { return JSON.parse(localStorage.getItem(SKEY) || "null"); } catch (e) { return null; } }
function persist(o) { try { localStorage.setItem(SKEY, JSON.stringify(o)); } catch (e) { /* pieno */ } }
const PARAM_UI = {
  R: ["R", "P", "tol"], POT: ["R", "pos", "P"], C: ["C", "pol", "Vmax"], L: ["L", "R", "Imax"], V: ["V", "Ilim"], BAT: ["kind"], MAINS: ["V"], I: ["I"],
  LED: ["color", "Imax"], D: ["kind"], NPN: ["kind"], NMOS: ["kind"], SW: ["on", "Imax"], BTN: ["on", "Imax"], RELAY: ["Vcoil", "Rcoil", "Imax"], FUSE: ["In"],
  OPAMP: [], NE555: ["R1", "R2", "C"], REG: ["kind"], ULN: [], L298: [], MCU: ["board", "power", "D13", "D9", "D2", "pwm"], MOTOR: ["kind", "TL"], SERVO: ["kind", "load"],
  STEPDRV: ["drv", "motor", "Iset", "sps"], ACDRIVE: ["kind", "load"], LAMP: ["V", "P"], LDR: ["lux"], NTC: ["T"], GND: []
};
function pDef(CIR, t, k) {
  const si = CIR.si, opts = (o, f) => Object.keys(o).map(id => [id, f ? f(o[id], id) : (o[id].name || id)]);
  const kinds = { BAT: CIR.BATS, D: CIR.DIODES, NPN: CIR.BJT, NMOS: CIR.MOS, REG: CIR.REGS, MOTOR: CIR.DCMOT, SERVO: CIR.SERVOS, ACDRIVE: CIR.ACDRV };
  switch (k) {
    case "R": return t === "L" ? { l: "Resistenza avvolgimento", sel: [0.05, 0.1, 0.5, 1, 2, 5, 10].map(v => [v, si(v, "Ω")]) } : { l: "Resistenza", sel: CIR.R_VALUES.map(v => [v, si(v, "Ω")]) };
    case "R1": case "R2": return { l: k, sel: CIR.R_VALUES.filter(v => v >= 1000).map(v => [v, si(v, "Ω")]) };
    case "P": return t === "LAMP" ? { l: "Potenza", sel: [0.5, 1, 3, 5, 10, 21, 55].map(v => [v, v + " W"]) } : { l: "Potenza nominale", sel: [0.125, 0.25, 0.5, 1, 2, 5, 10].map(v => [v, si(v, "W")]) };
    case "tol": return { l: "Tolleranza", sel: [[1, "±1%"], [2, "±2%"], [5, "±5%"]] };
    case "pos": return { l: "Posizione cursore", range: [0, 1, 0.01], f: v => Math.round(v * 100) + "%" };
    case "C": return { l: "Capacità", sel: CIR.C_CER.concat(CIR.C_ELE.filter(v => v > 10e-6)).map(v => [v, si(v, "F")]) };
    case "pol": return { l: "Elettrolitico (polarizzato)", chk: 1 };
    case "Vmax": return { l: "Tensione nominale", sel: CIR.C_V.map(v => [v, v + " V"]) };
    case "L": return { l: "Induttanza", sel: [1e-6, 10e-6, 100e-6, 1e-3, 10e-3, 100e-3, 1].map(v => [v, si(v, "H")]) };
    case "Imax": return t === "LED" ? { l: "Tipo LED", sel: [[0.02, "5 mm standard (20 mA)"], [0.03, "alta luminosità (30 mA)"], [0.35, "LED di potenza 1 W (350 mA)"]] } : { l: "Corrente max", sel: [0.05, 0.5, 1, 2, 3, 5, 10, 16].map(v => [v, si(v, "A")]) };
    case "V": return t === "MAINS" ? { l: "Tensione di rete", sel: [[230, "230 V monofase"], [400, "400 V trifase"], [120, "120 V (USA)"]] } : t === "LAMP" ? { l: "Tensione lampada", sel: [3.7, 6, 12, 24, 230].map(v => [v, v + " V"]) } : { l: "Tensione", num: [0, 60, 0.1], u: "V" };
    case "Ilim": return { l: "Limite di corrente", num: [0.01, 10, 0.01], u: "A" };
    case "I": return { l: "Corrente", num: [0.0001, 5, 0.001], u: "A" };
    case "kind": return t === "OPAMP" ? null : { l: "Modello", sel: opts(kinds[t]) };
    case "color": return { l: "Colore", sel: Object.keys(CIR.LED_COL).map(c => [c, c + " (Vf " + CIR.fx(CIR.LED_COL[c].Vf, 1) + " V)"]) };
    case "on": return { l: t === "BTN" ? "Premuto" : "Chiuso", chk: 1 };
    case "Vcoil": return { l: "Tensione bobina", sel: [[5, "5 V"], [12, "12 V"], [24, "24 V"]] };
    case "Rcoil": return { l: "Resistenza bobina", sel: [[70, "70 Ω (5 V)"], [400, "400 Ω (12 V)"], [1600, "1,6 kΩ (24 V)"]] };
    case "In": return { l: "Corrente nominale", sel: [0.1, 0.25, 0.5, 1, 2, 3, 5, 6, 10, 16].map(v => [v, si(v, "A")]) };
    case "board": return { l: "Scheda", sel: opts(CIR.MCUS) };
    case "power": return { l: "Alimentazione", sel: [["usb", "USB (5 V dal PC)"], ["vin", "pin VIN (esterna)"], ["5v", "pin 5V (esterna)"]] };
    case "D13": case "D9": case "D2": return { l: "Pin " + k, sel: [["H", "uscita ALTA"], ["L", "uscita BASSA"], ["PWM", "PWM"], ["IN", "ingresso"]] };
    case "pwm": return { l: "Duty cycle PWM", range: [0, 1, 0.01], f: v => Math.round(v * 100) + "%" };
    case "TL": return { l: "Carico sull'albero", sel: [[0.0005, "a vuoto"], [0.002, "leggero"], [0.01, "medio"], [0.05, "pesante"], [0.2, "molto pesante"], [2, "bloccato"]] };
    case "load": return t === "SERVO" ? { l: "Stato", sel: [["idle", "fermo"], ["move", "in movimento"], ["stall", "bloccato"]] } : { l: "Carico", range: [0, 1.2, 0.05], f: v => Math.round(v * 100) + "%" };
    case "drv": return { l: "Driver", sel: opts(CIR.DRIVERS) };
    case "motor": return { l: "Motore", sel: opts(CIR.STEPPERS) };
    case "Iset": return { l: "Corrente impostata (Vref)", num: [0.1, 6, 0.05], u: "A" };
    case "sps": return { l: "Velocità", num: [50, 20000, 50], u: "passi/s" };
    case "lux": return { l: "Luce", range: [1, 10000, 1], f: v => Math.round(v) + " lx" };
    case "T": return { l: "Temperatura", range: [-20, 120, 1], f: v => v + " °C" };
  }
  return null;
}
export function mountBench(el, env) {
  const CIR = env.CIR, esc = env.esc, rm = !!env.reduced;
  const saved = load() || {};
  const B = {
    L: saved.L || CIR.fromExample(CIR.EXAMPLES[0]), view: saved.view || "bb", tool: "sel", place: null, sel: null, wire0: null, hover: null,
    joints: saved.joints || {}, needSolder: !!saved.needSolder, board: saved.board || { id: "pcb-2L-fr4-16-1oz-hasllf-100x100", name: "PCB 2 strati FR-4 1,6 mm HASL 10×10 cm", color: "#1f7a3a", layers: 2 },
    blown: {}, res: null, nl: null, flows: [], meter: { mode: "V", red: null, black: null, comp: null }, scope: { ch: [], tEnd: 1, data: null, busy: false },
    cam: saved.cam || { x: 40, y: 60, z: 1 }, undo: [], run: false, t0: 0, phase: 0, smoke: [], anim: {}
  };
  el.innerHTML = `<div class="lb-bench">
    <div class="lb-tools" role="toolbar" aria-label="Strumenti della tavola">
      <button type="button" class="btn sm" data-bt="add">＋ Componente</button>
      <button type="button" class="tb" data-bt="sel" aria-pressed="true">Sposta</button>
      <button type="button" class="tb" data-bt="wire">Filo</button>
      <button type="button" class="tb" data-bt="meter">Multimetro</button>
      <button type="button" class="tb" data-bt="scope">Oscilloscopio</button>
      <button type="button" class="tb" data-bt="del">Elimina</button>
      <button type="button" class="tb" data-bt="undo" aria-label="Annulla">↶</button>
      <button type="button" class="tb" data-bt="view">Vista: Breadboard</button>
      <button type="button" class="tb" data-bt="ex">Esempi</button>
      <button type="button" class="tb" data-bt="clear">Svuota</button>
    </div>
    <div class="lb-stage" id="lbStage"><canvas id="lbCv" aria-label="Tavola di lavoro: circuito"></canvas><div class="lb-hint" id="lbHint"></div>
      <div class="lb-meter" id="lbMeter" hidden><div class="lb-lcd" id="lbLcd">—</div><div class="lb-mm"><button type="button" data-mm="V" class="on">V</button><button type="button" data-mm="A">A</button><button type="button" data-mm="R">Ω</button></div><small id="lbMhint"></small></div>
      <div class="lb-zoom"><button type="button" data-bt="zin" aria-label="Ingrandisci">＋</button><button type="button" data-bt="zout" aria-label="Rimpicciolisci">－</button><button type="button" data-bt="fit" aria-label="Adatta">⤢</button></div>
    </div>
    <div class="lb-sum" id="lbSum"></div>
    <div class="lb-scope card" id="lbScope" hidden><div class="lb-sh"><b>Oscilloscopio</b><small id="lbScInfo">Tocca fino a 2 punti del circuito per collegare le sonde.</small></div><canvas id="lbScCv" aria-label="Oscilloscopio"></canvas>
      <div class="lb-scb"><label>Durata <select id="lbScT"><option value="0.01">10 ms</option><option value="0.1">100 ms</option><option value="1" selected>1 s</option><option value="5">5 s</option></select></label><button type="button" class="btn sm" data-bt="tran">▶ Simula nel tempo</button><button type="button" class="btn sm ghost" data-bt="scclr">Togli sonde</button></div></div>
    <div id="lbProps"></div>
    <div id="lbIssues"></div>
    <div class="lb-sheet" id="lbSheet" hidden></div>
  </div>`;
  const $ = s => el.querySelector(s), cv = $("#lbCv"), ctx = cv.getContext("2d"), stage = $("#lbStage");
  function save() { persist({ L: B.L, view: B.view, joints: B.joints, needSolder: B.needSolder, board: B.board, cam: B.cam }); }
  function snap() { B.undo.push(JSON.stringify(B.L)); if (B.undo.length > 40) B.undo.shift(); }
  function nextId(t) { const pre = { R: "R", POT: "P", C: "C", L: "L", V: "V", BAT: "B", MAINS: "N", I: "I", LED: "D", D: "D", NPN: "Q", NMOS: "Q", SW: "S", BTN: "S", RELAY: "K", FUSE: "F", OPAMP: "U", NE555: "U", REG: "U", ULN: "U", L298: "U", MCU: "U", MOTOR: "M", SERVO: "M", STEPDRV: "M", ACDRIVE: "M", LAMP: "LP", LDR: "LDR", NTC: "TH", GND: "G" }[t] || "X"; let i = 1; while (B.L.comps.some(c => c.id === pre + i)) i++; return pre + i; }
  function compById(id) { return B.L.comps.find(c => c.id === id); }
  /* --- simulazione --- */
  function pinInj(c, m) {
    if (!m) return [];
    const n = CIR.footprint(c.t).pins.length, z = new Array(n).fill(0), I = m.I || 0;
    if (/^(V|BAT|MAINS)$/.test(c.t)) return [I, -I];
    if (n === 2) return [-I, I];
    if (c.t === "NPN") return [-(m.Ib || 0), -(m.Ic || 0), (m.Ib || 0) + (m.Ic || 0)];
    if (c.t === "NMOS") return [0, -I, I];
    if (c.t === "MCU" && m.pin) { ["D13", "D9", "D2"].forEach((k, j) => { z[4 + j] = m.pin[k].I; }); z[1] = (m.Iusb || 0) - [4, 5, 6].reduce((s, j) => s + z[j], 0) * 0; return z; }
    if (c.t === "REG") return [-(m.Iin || 0), (m.Iin || 0) - (m.I || 0), m.I || 0];
    if (c.t === "STEPDRV") return [-I, I, 0];
    if (c.t === "SERVO") return [-I, I, 0];
    return z;
  }
  function solve() {
    const nl = CIR.netlist(B.L, { joints: B.view === "pcb" && B.needSolder ? B.joints : null });
    nl.comps.forEach(c => { if (c.t === "FUSE" && B.blown[c.id]) c.blown = true; });
    B.nl = nl; const res = CIR.solve({ comps: nl.comps }); B.res = res;
    if (res.ok) for (const id in res.st) if (res.st[id].blown) B.blown[id] = true;
    // flussi di corrente nei fili (eliminazione delle foglie sull'albero dei fili)
    const inj = {}; B.flows = B.L.wires.map(() => 0);
    if (res.ok) B.L.comps.forEach(c => { const k = nl.pinKeys[c.id], v = pinInj(c, res.comps[c.id]); k.forEach((kk, j) => { inj[kk] = (inj[kk] || 0) + (v[j] || 0); }); });
    const adj = {}; B.L.wires.forEach((w, i) => { const a = w.a.join(","), b = w.b.join(","); (adj[a] = adj[a] || []).push(i); (adj[b] = adj[b] || []).push(i); });
    const deg = {}; for (const k in adj) deg[k] = adj[k].length; const used = new Array(B.L.wires.length).fill(false), q = Object.keys(deg).filter(k => deg[k] === 1);
    while (q.length) { const k = q.pop(); if (deg[k] !== 1) continue; const wi = adj[k].find(i => !used[i]); if (wi == null) continue; used[wi] = true; const w = B.L.wires[wi], a = w.a.join(","), o = a === k ? w.b.join(",") : a, f = inj[k] || 0; B.flows[wi] = a === k ? f : -f; inj[o] = (inj[o] || 0) + f; inj[k] = 0; deg[k]--; deg[o]--; if (deg[o] === 1) q.push(o); }
    renderSum(); renderIssues(); updateProps(); updateMeter(); env.onChange && env.onChange();
    return res;
  }
  function changed() { save(); solve(); draw(); }
  function nodeAt(key) { return B.nl ? B.nl.keyNode[key] : null; }
  function vAtKey(key) { const n = nodeAt(key); if (!n || !B.res || !B.res.ok) return null; return n === "0" ? 0 : B.res.V[n]; }
  function vmax() { let m = 1; if (B.res && B.res.ok) for (const k in B.res.V) m = Math.max(m, B.res.V[k]); return m; }
  function burnt(id) { return B.res && B.res.ok && B.res.issues.some(i => i.comp === id && i.sev === "err" && /brucia|bruciat|surriscald|esplod|contrario|protezione termica|oltre il massimo|sovraccarico/i.test(i.t)); }
  /* --- geometria --- */
  function w2s(x, y) { return [x * G * B.cam.z + B.cam.x, y * G * B.cam.z + B.cam.y]; }
  function s2w(px, py) { return [(px - B.cam.x) / (G * B.cam.z), (py - B.cam.y) / (G * B.cam.z)]; }
  function local(c, x, y) { const dx = x - c.x, dy = y - c.y, r = ((c.r || 0) % 4 + 4) % 4; return r === 0 ? [dx, dy] : r === 1 ? [dy, -dx] : r === 2 ? [-dx, -dy] : [-dy, dx]; }
  function bbox(c) { const fp = CIR.footprint(c.t), b = fp.box; let x0 = Math.min(b[0], 0), x1 = b[2], y0 = b[1], y1 = b[3]; fp.pins.forEach(p => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }); if (c.t === "V") y0 = -2.9; return [x0 - 0.3, y0 - 0.3, x1 + 0.3, y1 + 0.3]; }
  function hitComp(x, y) { for (let i = B.L.comps.length - 1; i >= 0; i--) { const c = B.L.comps[i], [lx, ly] = local(c, x, y), b = bbox(c); if (lx >= b[0] && lx <= b[2] && ly >= b[1] && ly <= b[3]) return c; } return null; }
  function segD(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L2)); return Math.hypot(px - ax - t * dx, py - ay - t * dy); }
  function hitWire(x, y) { let best = -1, bd = 0.45; B.L.wires.forEach((w, i) => { const d = Math.min(segD(x, y, w.a[0], w.a[1], w.b[0], w.a[1]), segD(x, y, w.b[0], w.a[1], w.b[0], w.b[1])); if (d < bd) { bd = d; best = i; } }); return best; }
  function pinKeysAll() { const s = {}; B.L.comps.forEach(c => CIR.pinPos(c).forEach(p => { s[p.x + "," + p.y] = 1; })); B.L.wires.forEach(w => { s[w.a.join(",")] = 1; s[w.b.join(",")] = 1; }); return s; }
  /* --- disegno --- */
  let W = 0, H = 0, dpr = 1;
  function resize() { const r = stage.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + "px"; cv.style.height = H + "px"; draw(); }
  function fit() {
    const pts = []; B.L.comps.forEach(c => { const b = bbox(c); [[b[0], b[1]], [b[2], b[3]], [b[0], b[3]], [b[2], b[1]]].forEach(([lx, ly]) => { const q = CIR.rot({ x: lx, y: ly }, c.r); pts.push([c.x + q.x, c.y + q.y]); }); });
    if (!pts.length) { B.cam = { x: W / 2, y: H / 2, z: 1 }; return; }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
    const z = Math.max(0.45, Math.min(2.2, Math.min((W - 30) / ((x1 - x0 + 2) * G), (H - 30) / ((y1 - y0 + 3) * G))));
    B.cam = { z, x: W / 2 - (x0 + x1) / 2 * G * z, y: H / 2 - (y0 + y1) / 2 * G * z };
  }
  function bg() {
    const pcb = B.view === "pcb", s = G * B.cam.z;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = pcb ? B.board.color || "#1f7a3a" : "#e7e2d4"; ctx.fillRect(0, 0, W, H);
    if (pcb) { const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, "rgba(255,255,255,.06)"); g.addColorStop(1, "rgba(0,0,0,.18)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    const [gx0, gy0] = s2w(0, 0), [gx1, gy1] = s2w(W, H);
    if (s > 7) {
      ctx.fillStyle = pcb ? "rgba(255,255,255,.10)" : "rgba(60,50,30,.28)";
      for (let x = Math.floor(gx0); x <= gx1; x++) for (let y = Math.floor(gy0); y <= gy1; y++) { const [px, py] = w2s(x, y); ctx.fillRect(px - 1.2, py - 1.2, 2.4, 2.4); }
    }
    if (!pcb) { // binari di alimentazione decorativi della breadboard
      ctx.lineWidth = 2; [[-3, "#d33"], [-2.4, "#2a5bd7"]].forEach(([yy, col]) => { const [, py] = w2s(0, yy); ctx.strokeStyle = col; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke(); ctx.globalAlpha = 1; });
    } else { label2("XENTRIQ · " + (B.board.layers || 2) + "L · " + (B.board.name || "PCB").split(" · ").slice(0, 2).join(" · "), 10, H - 12, "rgba(255,255,255,.55)", 11, "left"); }
  }
  function label2(t, x, y, col, size, al) { ctx.font = `600 ${size}px Inter, system-ui, sans-serif`; ctx.fillStyle = col; ctx.textAlign = al || "center"; ctx.textBaseline = "middle"; ctx.fillText(t, x, y); }
  function wirePath(w) { ctx.beginPath(); ctx.moveTo(w.a[0], w.a[1]); ctx.lineTo(w.b[0], w.a[1]); ctx.lineTo(w.b[0], w.b[1]); }
  function draw() {
    if (!W) return; const pcb = B.view === "pcb", vm = vmax(), ok = B.res && B.res.ok;
    bg();
    const s = G * B.cam.z; ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * B.cam.x, dpr * B.cam.y);
    // fili / piste
    B.L.wires.forEach((w, i) => {
      const v = ok ? vAtKey(w.a.join(",")) : null, col = v == null ? "#888" : VCOL(v, vm);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      if (pcb) { ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 0.42; wirePath(w); ctx.stroke(); ctx.strokeStyle = "#d9a35a"; ctx.lineWidth = 0.34; wirePath(w); ctx.stroke(); ctx.strokeStyle = col; ctx.globalAlpha = 0.35; ctx.lineWidth = 0.14; wirePath(w); ctx.stroke(); ctx.globalAlpha = 1; }
      else { ctx.strokeStyle = "rgba(0,0,0,.22)"; ctx.lineWidth = 0.34; ctx.save(); ctx.translate(0.06, 0.08); wirePath(w); ctx.stroke(); ctx.restore(); ctx.strokeStyle = col; ctx.lineWidth = 0.26; wirePath(w); ctx.stroke(); ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 0.07; wirePath(w); ctx.stroke(); }
      const f = B.flows[i] || 0;
      if (ok && Math.abs(f) > 2e-4) { // pallini che si muovono nel verso della corrente
        const L1 = Math.abs(w.b[0] - w.a[0]), L2 = Math.abs(w.b[1] - w.a[1]), Lt = L1 + L2; if (Lt < 0.01) return;
        const sp = 0.8, ph = rm ? 0.5 : ((B.phase * sp * Math.min(3, 0.6 + Math.log10(1 + Math.abs(f) * 1000))) % 1), n = Math.max(1, Math.floor(Lt / 1.2));
        ctx.fillStyle = pcb ? "#fff6c8" : "#fff8d0";
        for (let k = 0; k < n; k++) { let d = ((k + (f > 0 ? ph : 1 - ph)) / n) * Lt, x, y; if (d <= L1) { x = w.a[0] + Math.sign(w.b[0] - w.a[0]) * d; y = w.a[1]; } else { x = w.b[0]; y = w.a[1] + Math.sign(w.b[1] - w.a[1]) * (d - L1); } ctx.beginPath(); ctx.arc(x, y, 0.09, 0, 7); ctx.fill(); }
      }
    });
    // componenti
    B.L.comps.forEach(c => {
      const m = ok ? B.res.comps[c.id] : null, st = Object.assign({}, ok ? B.res.st[c.id] : {}, B.anim[c.id] || {});
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate((c.r || 0) * Math.PI / 2);
      if (pcb && c.t !== "GND") { const b = bbox(c); ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 0.06; ctx.strokeRect(b[0] + 0.15, b[1] + 0.15, b[2] - b[0] - 0.3, b[3] - b[1] - 0.3); }
      drawBody(ctx, CIR, c, m, st, pcb, B.phase);
      if (burnt(c.id)) { const b = bbox(c); ctx.fillStyle = "rgba(30,20,10,.45)"; ctx.beginPath(); ctx.ellipse((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, (b[2] - b[0]) / 2.2, (b[3] - b[1]) / 2.2, 0, 0, 7); ctx.fill(); }
      if (B.sel === c.id) { const b = bbox(c); ctx.setLineDash([0.3, 0.2]); ctx.strokeStyle = "#ff7a2f"; ctx.lineWidth = 0.09; ctx.strokeRect(b[0], b[1], b[2] - b[0], b[3] - b[1]); ctx.setLineDash([]); }
      ctx.restore();
      // etichetta
      const b = bbox(c), cx = (b[0] + b[2]) / 2, cy = b[3] + 0.45, q = CIR.rot({ x: cx, y: cy }, c.r), qq = CIR.rot({ x: (b[0] + b[2]) / 2, y: (b[1] + b[3]) / 2 }, c.r);
      if (c.t !== "GND") { const lx = (c.r % 2) ? c.x + qq.x + (b[3] - b[1]) / 2 + 0.6 : c.x + q.x, ly = (c.r % 2) ? c.y + qq.y : c.y + q.y; label(ctx, c.id + "  " + valueText(CIR, c), lx, ly, pcb ? "#f4f4f4" : "#2a2a2a", 0.42, (c.r % 2) ? "left" : "center"); }
    });
    // piedini e giunti
    const J = pcb && B.needSolder ? B.joints : null;
    B.L.comps.forEach(c => CIR.pinPos(c).forEach((p, j) => {
      const k = c.id + ":" + j, js = J ? J[k] : "ok";
      if (pcb) { ctx.fillStyle = "#d9a35a"; ctx.beginPath(); ctx.arc(p.x, p.y, 0.26, 0, 7); ctx.fill();
        if (J && c.t !== "GND") { const col = { ok: "#e9eef3", cold: "#8d918f", bridge: "#c9ced4", burnt: "#5a3a22" }[js]; if (col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, js === "cold" ? 0.3 : 0.24, 0, 7); ctx.fill(); if (js === "ok") { ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.beginPath(); ctx.arc(p.x - 0.07, p.y - 0.07, 0.07, 0, 7); ctx.fill(); } } else { ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(p.x, p.y, 0.1, 0, 7); ctx.fill(); } }
        else { ctx.fillStyle = "#eef1f4"; ctx.beginPath(); ctx.arc(p.x, p.y, 0.2, 0, 7); ctx.fill(); } }
      else { ctx.fillStyle = "#333"; ctx.beginPath(); ctx.arc(p.x, p.y, 0.14, 0, 7); ctx.fill(); }
      if (J && js === "bridge") { const pp = CIR.pinPos(c), o = pp[j + 1 < pp.length ? j + 1 : j - 1]; ctx.strokeStyle = "#c9ced4"; ctx.lineWidth = 0.32; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(o.x, o.y); ctx.stroke(); }
    }));
    // filo in costruzione
    if (B.wire0) { ctx.strokeStyle = "#ff7a2f"; ctx.lineWidth = 0.18; ctx.setLineDash([0.3, 0.2]); const h = B.hover || B.wire0; wirePath({ a: B.wire0, b: h }); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = "#ff7a2f"; ctx.beginPath(); ctx.arc(B.wire0[0], B.wire0[1], 0.25, 0, 7); ctx.fill(); }
    if (B.hover && (B.tool === "wire" || B.tool === "meter" || B.tool === "scope" || B.place)) { ctx.strokeStyle = "rgba(255,122,47,.8)"; ctx.lineWidth = 0.08; ctx.beginPath(); ctx.arc(B.hover[0], B.hover[1], 0.38, 0, 7); ctx.stroke(); }
    // sonde
    const probe = (key, col, txt) => { if (!key) return; const [x, y] = key.split(",").map(Number); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.5, y - 1.2); ctx.lineTo(x + 0.9, y - 1.0); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.arc(x, y, 0.16, 0, 7); ctx.fill(); label(ctx, txt, x + 1.1, y - 1.3, col, 0.45, "left"); };
    if (B.tool === "meter" || B.meter.red || B.meter.black) { probe(B.meter.red, "#e23b3b", "+"); probe(B.meter.black, "#111", "COM"); }
    B.scope.ch.forEach((k, i) => probe(k, i ? "#38d6ff" : "#f5d142", "CH" + (i + 1)));
    // fumo
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    B.smoke.forEach(p => { ctx.globalAlpha = Math.max(0, p.a); ctx.fillStyle = "#cfcfcf"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }); ctx.globalAlpha = 1;
    if (B.place) label2("Tocca la tavola per posare: " + CIR.TYPES[B.place].n, W / 2, 16, pcb ? "#fff" : "#222", 12);
  }
  /* --- pannelli --- */
  function renderSum() {
    const r = B.res, si = CIR.si; let h = "";
    if (!r || !r.ok) h = `<span class="pill err"><b>Circuito non risolvibile</b></span>`;
    else {
      let Pin = 0, Pd = 0; B.L.comps.forEach(c => { const m = r.comps[c.id]; if (!m) return; if (/^(V|BAT|MAINS)$/.test(c.t) || (c.t === "MCU" && c.p.power === "usb")) Pin += (c.t === "MCU" ? 5 * Math.abs(m.Iusb || 0) : Math.max(0, -(m.P || 0))); });
      const e = r.issues.filter(i => i.sev === "err").length, w = r.issues.filter(i => i.sev === "warn").length;
      h = `<span class="pill"><b>${B.L.comps.length}</b> parti</span><span class="pill"><b>${B.L.wires.length}</b> fili</span><span class="pill"><b>${si(Pin, "W")}</b> erogati</span>` +
        `<span class="pill ${e ? "err" : w ? "warn" : "ok"}"><b>${e ? e + " errori" : w ? w + " avvisi" : "OK"}</b></span>` + (B.view === "pcb" ? `<span class="pill"><b>${esc(B.board.name.split(" · ")[0])}</b></span>` + (B.needSolder ? `<span class="pill ${solderState().todo ? "warn" : "ok"}"><b>${solderState().done}/${solderState().total}</b> giunti</span>` : "") : "");
    }
    $("#lbSum").innerHTML = h;
  }
  function renderIssues() {
    const r = B.res; if (!r) return; const iss = r.ok ? r.issues : r.issues || [];
    $("#lbIssues").innerHTML = `<div class="card lb-iss"><h3>Controlli del circuito</h3>` + (iss.length ? iss.map((i, n) => `<details class="iss ${i.sev}"${n < 2 && i.sev !== "info" ? " open" : ""}><summary><span class="dot"></span><b>${esc(i.t)}</b>${i.comp ? ` <small>${esc(i.comp)}</small>` : ""}</summary><p><b>Perché:</b> ${esc(i.why)}</p><p><b>Come rimediare:</b> ${esc(i.fix)}</p><button type="button" class="btn sm ghost" data-ask="${n}">Chiedi all'assistente</button></details>`).join("") : `<p class="ok-line">✓ Nessun errore: tensioni, correnti e potenze sono nei limiti.</p>`) + `</div>`;
  }
  function measText(c, m) {
    if (!m) return ""; const si = CIR.si, fx = CIR.fx, rows = [];
    const add = (k, v) => rows.push(`<div><small>${k}</small><b>${v}</b></div>`);
    if (c.t === "MCU") { add("5V", fx(m.v5, 2) + " V"); add("3V3", fx(m.v33, 2) + " V"); ["D13", "D9", "D2"].forEach(k => add(k + " (" + m.pin[k].mode + ")", fx(m.pin[k].V, 2) + " V · " + si(Math.abs(m.pin[k].I), "A"))); add("A0", fx(m.pin.A0.V, 2) + " V = " + m.pin.A0.read); if (c.p.power === "usb") add("Da USB", si(m.Iusb, "A")); }
    else if (c.t === "NPN") { add("Modo", { off: "interdetto", act: "zona attiva", sat: "saturo" }[m.mode]); add("Ib", si(m.Ib, "A")); add("Ic", si(m.Ic, "A")); add("Vce", fx(m.Vce, 2) + " V"); add("Potenza", si(m.P, "W")); }
    else if (c.t === "NMOS") { add("Vgs", fx(m.Vgs, 2) + " V"); add("Id", si(m.I, "A")); add("Rds", si(m.Rds, "Ω")); add("Potenza", si(m.P, "W")); }
    else if (c.t === "REG") { add("Ingresso", fx(m.Vin, 2) + " V"); add("Uscita", fx(m.Vout, 2) + " V"); add("Corrente", si(m.I, "A")); add("Dissipa", si(m.P, "W")); add("Tj stimata", fx(m.Tj, 0) + " °C"); }
    else if (c.t === "STEPDRV") { add("VMOT", fx(m.Vm, 1) + " V"); add("Dall'alimentatore", si(m.I, "A")); add("Corrente di fase", si(m.Iph, "A")); add("Coppia disponibile", fx(m.Tavail, 2) + " N·m"); add("Max passi/s", fx(m.spsMax, 0)); add("Calore motore", si(m.Pmot, "W")); }
    else if (c.t === "MOTOR") { add("Tensione", fx(m.V, 2) + " V"); add("Corrente", si(m.I, "A")); add("Velocità", fx(Math.abs(m.rpm), 0) + " giri/min"); add("Stallo", si(m.Istall, "A")); add("Potenza meccanica", si(Math.abs(m.Pmech), "W")); }
    else if (c.t === "ACDRIVE") { add("Tensione", fx(m.V, 0) + " V"); add("Corrente (rms)", si(m.I, "A")); add("Assorbita", si(m.Pin, "W")); add("All'albero", si(m.Pout, "W")); }
    else if (c.t === "OPAMP" || c.t === "NE555") { add("Uscita", fx(m.Vout, 2) + " V"); add("Alimentazione", fx(m.Vs, 1) + " V"); if (c.t === "NE555") { add("Frequenza", si(m.f, "Hz")); add("Duty", fx(m.duty * 100, 0) + "%"); } }
    else if (c.t === "L298") { add("VS", fx(m.Vs, 1) + " V"); add("OUT1 / OUT2", (m.h[0] ? "ALTO" : "BASSO") + " / " + (m.h[1] ? "ALTO" : "BASSO")); add("Corrente", si(m.I, "A")); add("Dissipa", si(m.P, "W")); }
    else if (c.t !== "GND") { add("Tensione", fx(m.V, 3) + " V"); add("Corrente", si(m.I, "A")); if (m.P != null) add("Potenza", si(Math.abs(m.P), "W")); if (c.t === "LED") add("Luminosità", fx(Math.min(100, (m.lum || 0) * 100), 0) + "%"); if (c.t === "BAT" && m.hours !== Infinity) add("Autonomia", fx(m.hours, 1) + " h"); if (c.t === "C") add("Energia", si(m.E, "J")); }
    return rows.join("");
  }
  function renderProps() {
    const c = compById(B.sel), box = $("#lbProps"); if (!c) { box.innerHTML = ""; return; }
    const T = CIR.TYPES[c.t], q = Object.assign({}, T.p, c.p);
    const fields = (PARAM_UI[c.t] || []).map(k => { const d = pDef(CIR, c.t, k); if (!d) return ""; const v = q[k];
      if (d.sel) return `<label class="lb-f"><span>${esc(d.l)}</span><select data-pk="${k}">${d.sel.map(([val, txt]) => `<option value="${esc(String(val))}"${String(val) === String(v) ? " selected" : ""}>${esc(txt)}</option>`).join("")}</select></label>`;
      if (d.chk) return `<label class="lb-f chk"><input type="checkbox" data-pk="${k}"${v ? " checked" : ""}><span>${esc(d.l)}</span></label>`;
      if (d.range) return `<label class="lb-f"><span>${esc(d.l)} <b data-rv="${k}">${d.f(v)}</b></span><input type="range" data-pk="${k}" min="${d.range[0]}" max="${d.range[1]}" step="${d.range[2]}" value="${v}"></label>`;
      return `<label class="lb-f"><span>${esc(d.l)} (${esc(d.u)})</span><input type="number" inputmode="decimal" data-pk="${k}" min="${d.num[0]}" max="${d.num[1]}" step="${d.num[2]}" value="${v}"></label>`; }).join("");
    let extra = "";
    if (c.t === "R") { const b = CIR.bands(q.R, q.tol); extra = `<div class="lb-bands">${b.map(x => `<i data-col="${x.h}" title="${esc(x.n)}"></i>`).join("")}<small>${b.map(x => x.n).join(" · ")}</small></div>`; }
    if (c.t === "FUSE" && B.blown[c.id]) extra = `<button type="button" class="btn sm" data-bt="refuse">Ripristina il fusibile</button>`;
    if (c.t === "SW" || c.t === "BTN") extra = `<button type="button" class="btn sm" data-bt="toggle">${q.on ? "Apri" : "Chiudi"} ${c.t === "BTN" ? "pulsante" : "interruttore"}</button>`;
    box.innerHTML = `<div class="card lb-props"><div class="lb-ph"><div><small>${esc(T.g)}</small><h3>${esc(c.id)} · ${esc(T.n)}</h3></div><div class="lb-pb"><button type="button" class="btn sm ghost" data-bt="rot">⟳ Ruota</button><button type="button" class="btn sm ghost" data-bt="dup">Duplica</button><button type="button" class="btn sm ghost danger" data-bt="rm">Elimina</button><button type="button" class="x" data-bt="desel" aria-label="Chiudi">✕</button></div></div>
      <div class="lb-fields">${fields || '<p class="note">Nessun parametro da regolare.</p>'}</div>${extra}<div class="kv lb-meas" id="lbMeas">${measText(c, B.res && B.res.ok ? B.res.comps[c.id] : null)}</div><p class="note">Piedini: ${T.pins.map(esc).join(" · ")}</p></div>`;
    box.querySelectorAll(".lb-bands i").forEach(i => { i.style.background = i.getAttribute("data-col"); });
  }
  function updateProps() { const m = $("#lbMeas"), c = compById(B.sel); if (m && c) m.innerHTML = measText(c, B.res && B.res.ok ? B.res.comps[c.id] : null); }
  function staticR(c) { const q = Object.assign({}, CIR.TYPES[c.t].p, c.p), m = B.res && B.res.ok ? B.res.comps[c.id] : {}; switch (c.t) { case "R": return q.R; case "POT": return q.R; case "LDR": return CIR.ldrR(q.lux); case "NTC": return CIR.ntcR(q.T); case "LAMP": return q.V * q.V / q.P / 10; case "MOTOR": return (CIR.DCMOT[q.kind] || {}).R; case "FUSE": return B.blown[c.id] ? Infinity : 0.1 / q.In; case "SW": case "BTN": return q.on ? 0.02 : Infinity; case "L": return q.R; case "RELAY": return q.Rcoil; default: return null; } }
  function updateMeter() {
    const mm = B.meter, lcd = $("#lbLcd"), hint = $("#lbMhint"); if (!lcd) return; let t = "—", h = "";
    if (mm.mode === "V") { const a = mm.red ? vAtKey(mm.red) : null, b = mm.black ? vAtKey(mm.black) : 0; if (mm.red && a != null) t = CIR.fx(a - (b || 0), 3) + " V"; h = !mm.red ? "Tocca il punto per il puntale ROSSO" : !mm.black ? "Ora il puntale NERO (o lascialo: è a massa)" : "Tocca altri punti per spostare i puntali"; }
    else if (mm.mode === "A") { const c = compById(mm.comp), m = c && B.res && B.res.ok ? B.res.comps[c.id] : null; if (m) t = CIR.si(Math.abs(m.I), "A"); h = "In serie: tocca un componente per leggere la corrente che lo attraversa"; }
    else { const c = compById(mm.comp); if (c) { const r = staticR(c); t = r == null ? "n.d." : r === Infinity ? "OL" : CIR.si(r, "Ω"); if (r != null && r < 1) t += " 🔊"; } h = "A circuito spento: tocca un componente per misurarne la resistenza"; }
    lcd.textContent = t; hint.textContent = h;
  }
  function solderState() { let total = 0, done = 0; B.L.comps.forEach(c => { if (c.t === "GND") return; CIR.footprint(c.t).pins.forEach((p, j) => { total++; if (B.joints[c.id + ":" + j] === "ok") done++; }); }); return { total, done, todo: total - done }; }
  function setTool(t) {
    B.tool = t; B.wire0 = null; B.place = null; el.querySelectorAll("[data-bt]").forEach(b => { const k = b.getAttribute("data-bt"); if (["sel", "wire", "meter", "scope", "del"].includes(k)) b.setAttribute("aria-pressed", String(k === t)); });
    $("#lbMeter").hidden = t !== "meter"; if (t === "scope") $("#lbScope").hidden = false;
    $("#lbHint").textContent = { sel: "Trascina per spostare i componenti o la tavola, tocca un componente per i valori. Pizzica per lo zoom.", wire: "Tocca un piedino, poi il punto di arrivo: il filo si piega ad angolo retto.", meter: "", scope: "Tocca un punto per collegare la sonda CH1, poi CH2.", del: "Tocca un componente o un filo per eliminarlo." }[t] || "";
    updateMeter(); draw();
  }
  function sheet(html) { const s = $("#lbSheet"); s.innerHTML = `<div class="lb-sin" role="dialog">${html}</div>`; s.hidden = false; }
  function libSheet() {
    const groups = {}; Object.keys(CIR.TYPES).forEach(t => { const T = CIR.TYPES[t]; (groups[T.g] = groups[T.g] || []).push(t); });
    const variants = { R: CIR.R_VALUES.length + " valori E24", C: (CIR.C_CER.length + CIR.C_ELE.length) + " valori", LED: Object.keys(CIR.LED_COL).length + " colori", D: Object.keys(CIR.DIODES).length + " modelli", NPN: Object.keys(CIR.BJT).length + " modelli", NMOS: Object.keys(CIR.MOS).length + " modelli", MCU: Object.keys(CIR.MCUS).length + " schede", REG: Object.keys(CIR.REGS).length + " modelli", MOTOR: Object.keys(CIR.DCMOT).length + " motori", SERVO: Object.keys(CIR.SERVOS).length + " servo", STEPDRV: Object.keys(CIR.STEPPERS).length + " motori × " + Object.keys(CIR.DRIVERS).length + " driver", ACDRIVE: Object.keys(CIR.ACDRV).length + " taglie", BAT: Object.keys(CIR.BATS).length + " tipi" };
    sheet(`<div class="sh-h"><h3>Libreria componenti</h3><button type="button" class="x" data-bt="shclose" aria-label="Chiudi">✕</button></div><input type="search" id="lbLibQ" placeholder="Cerca (es. mosfet, stepper, led…)" aria-label="Cerca componente"><div id="lbLib">` +
      Object.keys(groups).map(g => `<h4>${esc(g)}</h4><div class="lb-lib">` + groups[g].map(t => `<button type="button" class="lb-li" data-addt="${t}" data-s="${esc((CIR.TYPES[t].n + " " + t + " " + g).toLowerCase())}"><b>${esc(CIR.TYPES[t].n)}</b><small>${esc(variants[t] || CIR.TYPES[t].pins.length + " piedini")}</small></button>`).join("") + `</div>`).join("") + `</div>`);
    const qi = $("#lbLibQ"); qi.addEventListener("input", () => { const q = qi.value.toLowerCase().trim(); el.querySelectorAll(".lb-li").forEach(b => { b.hidden = q && b.getAttribute("data-s").indexOf(q) < 0; }); });
  }
  function exSheet() { sheet(`<div class="sh-h"><h3>Circuiti di esempio</h3><button type="button" class="x" data-bt="shclose" aria-label="Chiudi">✕</button></div>` + CIR.EXAMPLES.map(e => `<button type="button" class="mrow" data-ex="${e.id}"><div><b>${esc(e.n)}</b><small>${esc(e.d)}</small></div></button>`).join("")); }
  function loadExample(id) { const ex = CIR.EXAMPLES.find(e => e.id === id); if (!ex) return; snap(); B.L = CIR.fromExample(ex); B.sel = null; B.blown = {}; B.joints = {}; B.scope.ch = []; B.scope.data = null; B.meter.red = B.meter.black = null; if (ex.tran) { B.scope.tEnd = ex.tran.tEnd; const sel = $("#lbScT"); if (sel) sel.value = String(ex.tran.tEnd); } fit(); renderProps(); changed(); if (ex.tran) { const nl = CIR.netlist(B.L); const want = ex.tran.probes[0]; const comp = ex.comps.find(c => c.nodes.indexOf(want) >= 0); if (comp) { const j = comp.nodes.indexOf(want), p = CIR.pinPos(B.L.comps.find(c => c.id === comp.id))[j]; B.scope.ch = [p.x + "," + p.y]; $("#lbScope").hidden = false; } draw(); } }
  /* --- oscilloscopio --- */
  function runTran() {
    if (!B.scope.ch.length) { env.toast && env.toast("Collega prima una sonda: scegli Oscilloscopio e tocca un punto"); setTool("scope"); return; }
    const nl = CIR.netlist(B.L, { joints: B.view === "pcb" && B.needSolder ? B.joints : null }), names = B.scope.ch.map(k => nl.keyNode[k] || "0"), tEnd = +$("#lbScT").value;
    const r = CIR.tran({ comps: nl.comps }, { tEnd, dt: tEnd / 1500, probes: names, samples: 600 });
    B.scope.data = r.ok ? { t: r.t, s: names.map(n => r.s[n]), tEnd, names } : null; drawScope();
    if (!r.ok) env.toast && env.toast(r.err);
  }
  function drawScope() {
    const c = $("#lbScCv"); if (!c || $("#lbScope").hidden) return; const w = c.clientWidth || 300, h = c.clientHeight || 160, d = Math.min(2, window.devicePixelRatio || 1); c.width = w * d; c.height = h * d; const g = c.getContext("2d"); g.setTransform(d, 0, 0, d, 0, 0);
    g.fillStyle = "#04140c"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(80,255,160,.14)"; g.lineWidth = 1; for (let i = 1; i < 10; i++) { g.beginPath(); g.moveTo(i * w / 10, 0); g.lineTo(i * w / 10, h); g.stroke(); } for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(0, i * h / 8); g.lineTo(w, i * h / 8); g.stroke(); }
    const D = B.scope.data, info = $("#lbScInfo"); if (!D) { info.textContent = B.scope.ch.length ? "Sonde collegate: premi ▶ Simula nel tempo." : "Tocca fino a 2 punti del circuito per collegare le sonde."; return; }
    let mx = 0.5, mn = 0; D.s.forEach(a => a.forEach(v => { mx = Math.max(mx, v); mn = Math.min(mn, v); })); const span = (mx - mn) * 1.15 || 1, vdiv = span / 8, base = mn - span * 0.05;
    D.s.forEach((a, k) => { g.strokeStyle = k ? "#38d6ff" : "#f5d142"; g.lineWidth = 1.6; g.beginPath(); a.forEach((v, i) => { const x = D.t[i] / D.tEnd * w, y = h - (v - base) / span * h; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); });
    const a = D.s[0], avg = a.reduce((s, v) => s + v, 0) / a.length; let cr = 0; for (let i = 1; i < a.length; i++) if (a[i - 1] < avg && a[i] >= avg) cr++;
    info.textContent = `${CIR.si(vdiv, "V")}/div · ${CIR.si(D.tEnd / 10, "s")}/div · CH1 max ${CIR.fx(Math.max(...a), 2)} V, min ${CIR.fx(Math.min(...a), 2)} V` + (cr >= 2 ? ` · f ≈ ${CIR.si(cr / D.tEnd, "Hz")}` : "") + ` · a t = ${CIR.si(D.tEnd / 5, "s")}: ${CIR.fx(a[Math.round(a.length / 5) - 1], 2)} V`;
  }
  /* --- eventi --- */
  const ptrs = new Map(); let drag = null, pinch = null;
  function evW(e) { const r = cv.getBoundingClientRect(); return s2w(e.clientX - r.left, e.clientY - r.top); }
  function nearestKey(x, y) { const keys = pinKeysAll(); let best = null, bd = 0.7; for (const k in keys) { const [a, b] = k.split(",").map(Number), d = Math.hypot(a - x, b - y); if (d < bd) { bd = d; best = k; } } return best; }
  cv.addEventListener("pointerdown", e => {
    cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: B.cam.z, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, cam: Object.assign({}, B.cam) }; drag = null; return; }
    const [wx, wy] = evW(e), c = B.tool === "sel" && !B.place ? hitComp(wx, wy) : null;
    drag = { sx: e.clientX, sy: e.clientY, moved: false, c, cam: Object.assign({}, B.cam), wx, wy, ox: c ? c.x : 0, oy: c ? c.y : 0, pins: c ? CIR.pinPos(c) : null, snapDone: false };
  });
  cv.addEventListener("pointermove", e => {
    const [wx, wy] = evW(e); B.hover = [Math.round(wx), Math.round(wy)];
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), z = Math.max(0.35, Math.min(3.5, pinch.z * d / pinch.d)), r = cv.getBoundingClientRect(), cx = pinch.cx - r.left, cy = pinch.cy - r.top; B.cam.z = z; B.cam.x = cx - (cx - pinch.cam.x) * z / pinch.z; B.cam.y = cy - (cy - pinch.cam.y) * z / pinch.z; draw(); return; }
    if (!drag) { if (B.tool !== "sel" || B.place) draw(); return; }
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) drag.moved = true;
    if (!drag.moved) return;
    if (drag.c) {
      if (!drag.snapDone) { snap(); drag.snapDone = true; }
      const nx = Math.round(drag.ox + wx - drag.wx), ny = Math.round(drag.oy + wy - drag.wy), c = drag.c;
      if (nx !== c.x || ny !== c.y) { const old = CIR.pinPos(c); c.x = nx; c.y = ny; const nw = CIR.pinPos(c); B.L.wires.forEach(w => { old.forEach((p, j) => { if (w.a[0] === p.x && w.a[1] === p.y) w.a = [nw[j].x, nw[j].y]; else if (w.b[0] === p.x && w.b[1] === p.y) w.b = [nw[j].x, nw[j].y]; }); }); solve(); draw(); }
    } else { B.cam.x = drag.cam.x + e.clientX - drag.sx; B.cam.y = drag.cam.y + e.clientY - drag.sy; draw(); }
  });
  function endPtr(e) {
    ptrs.delete(e.pointerId); if (pinch) { if (ptrs.size < 2) { pinch = null; save(); } drag = null; return; }
    const d = drag; drag = null; if (!d) return;
    if (d.moved) { save(); if (d.c) changed(); return; }
    const [wx, wy] = evW(e), gx = Math.round(wx), gy = Math.round(wy);
    if (B.place) { snap(); const t = B.place, c = { id: nextId(t), t, p: {}, x: gx, y: gy, r: 0 }; B.L.comps.push(c); B.place = null; B.sel = c.id; setTool("sel"); renderProps(); changed(); return; }
    if (B.tool === "sel") { const c = hitComp(wx, wy); if (c && c.id === B.sel && (c.t === "SW" || c.t === "BTN")) { snap(); c.p.on = !Object.assign({}, CIR.TYPES[c.t].p, c.p).on; renderProps(); changed(); return; } B.sel = c ? c.id : null; renderProps(); draw(); if (c) { const pp = $("#lbProps"); if (pp && pp.scrollIntoView && window.innerWidth < 1000) pp.scrollIntoView({ block: "nearest", behavior: rm ? "auto" : "smooth" }); } return; }
    if (B.tool === "wire") { if (!B.wire0) { B.wire0 = [gx, gy]; draw(); return; } if (B.wire0[0] === gx && B.wire0[1] === gy) { B.wire0 = null; draw(); return; } snap(); B.L.wires.push({ a: B.wire0, b: [gx, gy] }); B.wire0 = null; changed(); return; }
    if (B.tool === "del") { const c = hitComp(wx, wy); if (c) { snap(); B.L.comps = B.L.comps.filter(x => x !== c); if (B.sel === c.id) B.sel = null; renderProps(); changed(); return; } const wi = hitWire(wx, wy); if (wi >= 0) { snap(); B.L.wires.splice(wi, 1); changed(); } return; }
    if (B.tool === "meter") { const mm = B.meter; if (mm.mode === "V") { const k = nearestKey(wx, wy); if (!k) return; if (!mm.red || (mm.red && mm.black)) { mm.red = k; mm.black = null; } else mm.black = k; } else { const c = hitComp(wx, wy); mm.comp = c ? c.id : null; } updateMeter(); draw(); return; }
    if (B.tool === "scope") { const k = nearestKey(wx, wy); if (!k) return; const i = B.scope.ch.indexOf(k); if (i >= 0) B.scope.ch.splice(i, 1); else { B.scope.ch.push(k); if (B.scope.ch.length > 2) B.scope.ch.shift(); } B.scope.data = null; drawScope(); draw(); return; }
  }
  cv.addEventListener("pointerup", endPtr); cv.addEventListener("pointercancel", endPtr);
  cv.addEventListener("pointerleave", () => { B.hover = null; if (B.tool !== "sel") draw(); });
  cv.addEventListener("wheel", e => { e.preventDefault(); const r = cv.getBoundingClientRect(), cx = e.clientX - r.left, cy = e.clientY - r.top, z0 = B.cam.z, z = Math.max(0.35, Math.min(3.5, z0 * Math.exp(-e.deltaY * 0.0015))); B.cam.x = cx - (cx - B.cam.x) * z / z0; B.cam.y = cy - (cy - B.cam.y) * z / z0; B.cam.z = z; draw(); clearTimeout(B.wt); B.wt = setTimeout(save, 400); }, { passive: false });
  function zoom(f) { const cx = W / 2, cy = H / 2, z0 = B.cam.z, z = Math.max(0.35, Math.min(3.5, z0 * f)); B.cam.x = cx - (cx - B.cam.x) * z / z0; B.cam.y = cy - (cy - B.cam.y) * z / z0; B.cam.z = z; draw(); save(); }
  el.addEventListener("click", e => {
    const b = e.target.closest("[data-bt],[data-addt],[data-ex],[data-mm],[data-ask]"); if (!b) return;
    if (b.hasAttribute("data-addt")) { B.place = b.getAttribute("data-addt"); $("#lbSheet").hidden = true; B.tool = "sel"; draw(); env.toast && env.toast("Tocca la tavola dove vuoi posare il componente"); return; }
    if (b.hasAttribute("data-ex")) { $("#lbSheet").hidden = true; loadExample(b.getAttribute("data-ex")); return; }
    if (b.hasAttribute("data-mm")) { B.meter.mode = b.getAttribute("data-mm"); el.querySelectorAll("[data-mm]").forEach(x => x.classList.toggle("on", x === b)); updateMeter(); return; }
    if (b.hasAttribute("data-ask")) { const i = B.res && B.res.issues[+b.getAttribute("data-ask")]; if (i && env.ask) env.ask("Spiegami l'errore \"" + i.t + "\" sul componente " + (i.comp || "") + " del mio circuito"); return; }
    const k = b.getAttribute("data-bt"), c = compById(B.sel);
    switch (k) {
      case "add": libSheet(); break; case "ex": exSheet(); break; case "shclose": $("#lbSheet").hidden = true; break;
      case "sel": case "wire": case "meter": case "scope": case "del": setTool(k); break;
      case "undo": if (B.undo.length) { B.L = JSON.parse(B.undo.pop()); B.sel = null; renderProps(); changed(); } else env.toast && env.toast("Niente da annullare"); break;
      case "view": B.view = B.view === "bb" ? "pcb" : "bb"; b.textContent = "Vista: " + (B.view === "bb" ? "Breadboard" : "PCB"); changed(); break;
      case "clear": if (window.confirm("Svuotare la tavola?")) { snap(); B.L = { name: "Il mio circuito", comps: [], wires: [] }; B.sel = null; B.joints = {}; B.blown = {}; renderProps(); changed(); } break;
      case "zin": zoom(1.25); break; case "zout": zoom(0.8); break; case "fit": fit(); draw(); save(); break;
      case "tran": runTran(); break; case "scclr": B.scope.ch = []; B.scope.data = null; drawScope(); draw(); break;
      case "rot": if (c) { snap(); const old = CIR.pinPos(c); c.r = ((c.r || 0) + 1) % 4; const nw = CIR.pinPos(c); B.L.wires.forEach(w => old.forEach((p, j) => { if (w.a[0] === p.x && w.a[1] === p.y) w.a = [nw[j].x, nw[j].y]; else if (w.b[0] === p.x && w.b[1] === p.y) w.b = [nw[j].x, nw[j].y]; })); changed(); } break;
      case "dup": if (c) { snap(); const n = JSON.parse(JSON.stringify(c)); n.id = nextId(c.t); n.x += 2; n.y += 3; B.L.comps.push(n); B.sel = n.id; renderProps(); changed(); } break;
      case "rm": if (c) { snap(); B.L.comps = B.L.comps.filter(x => x !== c); B.sel = null; renderProps(); changed(); } break;
      case "desel": B.sel = null; renderProps(); draw(); break;
      case "refuse": if (c) { delete B.blown[c.id]; renderProps(); changed(); } break;
      case "toggle": if (c) { snap(); c.p.on = !Object.assign({}, CIR.TYPES[c.t].p, c.p).on; renderProps(); changed(); } break;
    }
  });
  el.addEventListener("input", e => { const t = e.target, k = t.getAttribute && t.getAttribute("data-pk"); if (!k) return; const c = compById(B.sel); if (!c) return; const d = pDef(CIR, c.t, k); let v = t.type === "checkbox" ? t.checked : t.value;
    if (d && (d.range || d.num)) v = parseFloat(v); else if (d && d.sel && typeof d.sel[0][0] === "number") v = parseFloat(v);
    if (typeof v === "number" && !isFinite(v)) return; if (d && d.num) v = Math.max(d.num[0], Math.min(d.num[1], v));
    c.p[k] = v; const rv = el.querySelector(`[data-rv="${k}"]`); if (rv && d.f) rv.textContent = d.f(v);
    if (t.tagName === "SELECT" || t.type === "checkbox") { snap(); renderProps(); }
    changed(); });
  $("#lbScT").addEventListener("change", () => { B.scope.data = null; drawScope(); });
  /* --- animazione --- */
  let raf = 0, last = 0;
  function tick(ts) {
    raf = 0; if (!B.run) return; const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts; B.phase += dt;
    let busy = false; const r = B.res && B.res.ok ? B.res : null;
    if (r) B.L.comps.forEach(c => { const m = r.comps[c.id]; if (!m) return; const a = B.anim[c.id] = B.anim[c.id] || { ang: 0 };
      if (c.t === "MOTOR" && Math.abs(m.rpm) > 1) { a.ang += Math.sign(m.rpm) * Math.min(Math.abs(m.rpm), 240) / 60 * 2 * Math.PI * dt; busy = true; }
      if (c.t === "STEPDRV" && m.Vm > 5 && m.Vdd > 2.5) { a.ang += (c.p.sps || 800) / 200 * Math.min(1, m.spsMax / Math.max(1, c.p.sps || 800)) * 2 * Math.PI * dt * 0.5; busy = true; }
      if (c.t === "ACDRIVE" && m.V > 100) { a.ang += 8 * dt; busy = true; }
      if (burnt(c.id) && !rm && Math.random() < dt * 9) { const b = bbox(c), q = CIR.rot({ x: (b[0] + b[2]) / 2, y: (b[1] + b[3]) / 2 }, c.r), [sx, sy] = w2s(c.x + q.x, c.y + q.y); B.smoke.push({ x: sx + (Math.random() - 0.5) * 10, y: sy, r: 3 + Math.random() * 3, a: 0.6, vx: (Math.random() - 0.5) * 8, vy: -18 - Math.random() * 14 }); }
    });
    B.smoke.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.r += 6 * dt; p.a -= 0.45 * dt; }); B.smoke = B.smoke.filter(p => p.a > 0); if (B.smoke.length) busy = true;
    if (B.flows.some(f => Math.abs(f) > 2e-4) && !rm) busy = true;
    if (busy || B.wire0) draw();
    raf = requestAnimationFrame(tick);
  }
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => { resize(); drawScope(); }) : null; if (ro) ro.observe(stage);
  function ctxInfo() {
    const r = B.res, parts = []; if (r && r.ok) { B.L.comps.forEach(c => { const m = r.comps[c.id]; if (!m) return; if (c.t === "V" || c.t === "BAT") parts.push(c.id + " " + CIR.fx(m.V, 1) + " V / " + CIR.si(m.I, "A")); if (c.t === "LED") parts.push(c.id + " " + CIR.si(m.I, "A")); if (c.t === "MOTOR") parts.push(c.id + " " + CIR.fx(Math.abs(m.rpm), 0) + " giri/min"); }); }
    return { name: B.L.name || "Il mio circuito", count: B.L.comps.length, issues: r ? r.issues || [] : [], summary: parts.slice(0, 6).join(", "), view: B.view };
  }
  resize(); if (!saved.cam) fit(); solve(); draw(); setTool("sel"); { const vb = el.querySelector('[data-bt="view"]'); if (vb) vb.textContent = "Vista: " + (B.view === "bb" ? "Breadboard" : "PCB"); }
  return {
    resume() { B.run = true; resize(); if (!raf) raf = requestAnimationFrame(tick); },
    pause() { B.run = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    ctx: ctxInfo, loadExample, state: B, solve, draw, setTool, runTran,
    pads() { const out = []; B.L.comps.forEach(c => { if (c.t === "GND") return; CIR.pinPos(c).forEach((p, j) => out.push({ key: c.id + ":" + j, comp: c.id, t: c.t, pin: CIR.TYPES[c.t].pins[j], x: p.x, y: p.y, big: /^(MOTOR|STEPDRV|ACDRIVE|MAINS|REG|L298|BAT)$/.test(c.t), smd: false })); }); return out; },
    joints() { return B.joints; },
    setJoints(j, need) { B.joints = Object.assign({}, j); if (need != null) B.needSolder = !!need; B.view = "pcb"; const vb = el.querySelector('[data-bt="view"]'); if (vb) vb.textContent = "Vista: PCB"; changed(); },
    setBoard(p) { B.board = { id: p.id, name: p.name, color: p.color || "#1f7a3a", layers: p.layers || 2 }; B.view = "pcb"; const vb = el.querySelector('[data-bt="view"]'); if (vb) vb.textContent = "Vista: PCB"; changed(); },
    dispose() { this.pause(); if (ro) ro.disconnect(); }
  };
}
