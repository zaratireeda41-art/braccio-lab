/* Braccio Lab · Tavola da lavoro – libreria componenti e simulatore di circuiti (analisi nodale modificata).
   Modelli semplificati ma con numeri reali tipici; funziona nel browser (window.CIR) e in Node (require). */
(function (root) {
  "use strict";
  var node = typeof module !== "undefined" && module.exports;
  function fx(x, d) { if (x == null || !isFinite(x)) return "—"; var a = Math.abs(x); if (d == null) d = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3; var s = x.toFixed(d).split("."); s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, "."); return s.join(","); }
  function si(x, u, d) {
    if (x == null || !isFinite(x)) return "—"; var a = Math.abs(x), P = [[1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"]];
    if (a === 0) return "0 " + u;
    for (var i = 0; i < P.length; i++) if (a >= P[i][0] * 0.9999) { var v = x / P[i][0], s = fx(v, d != null ? d : (Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2)); if (s.indexOf(",") >= 0) s = s.replace(/0+$/, "").replace(/,$/, ""); return s + " " + P[i][1] + u; }
    return fx(x / 1e-12, 1) + " p" + u;
  }
  var E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
  var E24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
  function series(base, d0, d1) { var o = []; for (var d = d0; d <= d1; d++) base.forEach(function (b) { o.push(Number((b * Math.pow(10, d)).toPrecision(3))); }); return o; }
  var R_VALUES = series(E24, 0, 6).filter(function (v) { return v >= 1 && v <= 10e6; });
  var COLORS = ["nero", "marrone", "rosso", "arancio", "giallo", "verde", "blu", "viola", "grigio", "bianco"];
  var COLHEX = ["#111111", "#7b3f00", "#dd2222", "#ff8800", "#ffdd00", "#11aa11", "#2244ff", "#9933cc", "#888888", "#eeeeee"];
  function bands(R, tol) {
    var e = Math.floor(Math.log10(R) + 1e-9) - 1, m = Math.round(R / Math.pow(10, e)); if (m >= 100) { m = Math.round(m / 10); e++; }
    var d1 = Math.floor(m / 10), d2 = m % 10;
    var mc = e === -1 ? { n: "oro", h: "#c9a227" } : e === -2 ? { n: "argento", h: "#bbbbbb" } : { n: COLORS[e], h: COLHEX[e] };
    var tc = tol === 1 ? { n: "marrone", h: COLHEX[1] } : tol === 2 ? { n: "rosso", h: COLHEX[2] } : { n: "oro", h: "#c9a227" };
    return [{ n: COLORS[d1], h: COLHEX[d1] }, { n: COLORS[d2], h: COLHEX[d2] }, mc, tc];
  }
  var C_CER = series(E12, -12, -6).filter(function (v) { return v >= 1e-12 && v <= 10e-6; });
  var C_ELE = [1e-6, 2.2e-6, 4.7e-6, 10e-6, 22e-6, 47e-6, 100e-6, 220e-6, 470e-6, 1000e-6, 2200e-6, 4700e-6, 10000e-6];
  var C_V = [6.3, 10, 16, 25, 35, 50, 63, 100, 250, 400, 450];
  var LED_COL = { rosso: { Vf: 2.0, h: "#ff3030" }, arancio: { Vf: 2.05, h: "#ff8a1a" }, giallo: { Vf: 2.1, h: "#ffd21a" }, verde: { Vf: 2.2, h: "#2fe05a" }, "verde puro": { Vf: 3.0, h: "#19ff8a" }, blu: { Vf: 3.1, h: "#3a7bff" }, bianco: { Vf: 3.1, h: "#f4f7ff" }, UV: { Vf: 3.3, h: "#a35cff" }, IR: { Vf: 1.3, h: "#7a2a2a" } };
  var DIODES = { "1N4148": { Vf: 0.7, Rs: 2, Imax: 0.3, Vrrm: 100, name: "1N4148 segnale" }, "1N4007": { Vf: 0.75, Rs: 0.05, Imax: 1, Vrrm: 1000, name: "1N4007 raddrizzatore 1 A" }, "1N5819": { Vf: 0.35, Rs: 0.08, Imax: 1, Vrrm: 40, name: "1N5819 Schottky 1 A" }, "SS34": { Vf: 0.4, Rs: 0.04, Imax: 3, Vrrm: 40, name: "SS34 Schottky 3 A" }, "1N5408": { Vf: 0.8, Rs: 0.02, Imax: 3, Vrrm: 1000, name: "1N5408 3 A" } };
  var BJT = { "2N2222": { beta: 150, Vbe: 0.65, Icmax: 0.6, P: 0.5, Vceo: 40, name: "2N2222A NPN 600 mA" }, "BC547": { beta: 220, Vbe: 0.65, Icmax: 0.1, P: 0.5, Vceo: 45, name: "BC547B NPN 100 mA" }, "BD139": { beta: 60, Vbe: 0.7, Icmax: 1.5, P: 1.25, Vceo: 80, name: "BD139 NPN 1,5 A" }, "TIP120": { beta: 1000, Vbe: 1.3, Icmax: 5, P: 2, Vceo: 60, darl: true, name: "TIP120 Darlington 5 A" } };
  var MOS = { "IRLZ44N": { Vth: 1.5, Vfull: 4.5, Rds: 0.025, Id: 47, P: 2, Vds: 55, logic: true, name: "IRLZ44N logic level 55 V" }, "IRF540N": { Vth: 3.0, Vfull: 10, Rds: 0.044, Id: 33, P: 2, Vds: 100, logic: false, name: "IRF540N (gate 10 V)" }, "2N7000": { Vth: 2.1, Vfull: 4.5, Rds: 5, Id: 0.2, P: 0.4, Vds: 60, logic: true, name: "2N7000 piccolo segnale" }, "AO3400": { Vth: 1.05, Vfull: 2.5, Rds: 0.03, Id: 5.7, P: 1.4, Vds: 30, logic: true, name: "AO3400 SOT-23" } };
  var MCUS = {
    uno: { name: "Arduino Uno R3 (ATmega328P)", Vlog: 5, Rpin: 25, Irec: 0.02, Iabs: 0.04, vin: [7, 12], vinAbs: [6, 20], tol5: true, Iq: 0.05, i5: 0.5, pwmHz: 490, adc: 1023 },
    nano: { name: "Arduino Nano (ATmega328P)", Vlog: 5, Rpin: 25, Irec: 0.02, Iabs: 0.04, vin: [7, 12], vinAbs: [6, 20], tol5: true, Iq: 0.03, i5: 0.5, pwmHz: 490, adc: 1023 },
    esp32: { name: "ESP32 DevKit (3,3 V)", Vlog: 3.3, Rpin: 30, Irec: 0.012, Iabs: 0.04, vin: [5, 5.5], vinAbs: [4.5, 6], tol5: false, Iq: 0.08, i5: 0.5, pwmHz: 5000, adc: 4095 },
    stm32: { name: "STM32 Blue Pill (STM32F103)", Vlog: 3.3, Rpin: 40, Irec: 0.008, Iabs: 0.025, vin: [5, 5.5], vinAbs: [4.5, 6], tol5: true, Iq: 0.03, i5: 0.3, pwmHz: 1000, adc: 4095 },
    pico: { name: "Raspberry Pi Pico (RP2040)", Vlog: 3.3, Rpin: 40, Irec: 0.004, Iabs: 0.012, vin: [1.8, 5.5], vinAbs: [1.8, 5.5], tol5: false, Iq: 0.025, i5: 0.3, pwmHz: 1000, adc: 4095 },
    teensy: { name: "Teensy 4.1 (3,3 V)", Vlog: 3.3, Rpin: 40, Irec: 0.004, Iabs: 0.01, vin: [3.6, 5.5], vinAbs: [3.6, 6], tol5: false, Iq: 0.1, i5: 0.25, pwmHz: 4482, adc: 4095 }
  };
  var REGS = { "7805": { name: "7805 lineare 5 V 1,5 A (TO-220)", Vout: 5, drop: 2, Imax: 1.5, VinMax: 35, Iq: 0.005, Rth: 65, lin: true }, "AMS1117": { name: "AMS1117-3.3 lineare 1 A (SOT-223)", Vout: 3.3, drop: 1.1, Imax: 1, VinMax: 15, Iq: 0.005, Rth: 90, lin: true }, "LM2596": { name: "LM2596 step-down 3 A (modulo)", Vout: 5, drop: 1.5, Imax: 3, VinMax: 40, eta: 0.85, lin: false }, "MP1584": { name: "MP1584 step-down 3 A mini", Vout: 5, drop: 1, Imax: 3, VinMax: 28, eta: 0.9, lin: false } };
  var DRIVERS = { A4988: { name: "Pololu A4988", Vmot: [8, 35], Ipk: 2, Icool: 1.0, Rds: 0.8 }, DRV8825: { name: "Pololu DRV8825", Vmot: [8.2, 45], Ipk: 2.2, Icool: 1.5, Rds: 0.5 }, TMC2209: { name: "TMC2209 (StealthChop)", Vmot: [4.75, 29], Ipk: 2.8, Icool: 1.7, Rds: 0.2 }, DM542: { name: "DM542 driver industriale", Vmot: [20, 50], Ipk: 4.2, Icool: 4.2, Rds: 0.15 } };
  var STEPPERS = { nema17: { name: "NEMA 17 42×40 (1,5 A, 0,45 N·m)", I: 1.5, R: 1.8, L: 0.003, T: 0.45 }, nema17s: { name: "NEMA 17 42×48 (2 A, 0,55 N·m)", I: 2.0, R: 1.4, L: 0.003, T: 0.55 }, nema23: { name: "NEMA 23 57×76 (2,8 A, 1,9 N·m)", I: 2.8, R: 0.9, L: 0.0036, T: 1.9 }, nema34: { name: "NEMA 34 86×118 (6 A, 8,5 N·m)", I: 6, R: 0.45, L: 0.004, T: 8.5 }, "28byj": { name: "28BYJ-48 5 V (riduttore 1:64)", I: 0.24, R: 21, L: 0.02, T: 0.034 } };
  var DCMOT = { tt: { name: "Motoriduttore giallo TT 3–6 V", V: 6, R: 5, rpm: 200, I0: 0.15 }, "130": { name: "Motore 130 hobby 3 V", V: 3, R: 1.5, rpm: 12000, I0: 0.15 }, "775": { name: "Motore 775 12 V (≈ 150 W)", V: 12, R: 0.25, rpm: 12000, I0: 0.6 }, jgb37: { name: "Motoriduttore JGB37-520 12 V 100 giri/min", V: 12, R: 6, rpm: 100, I0: 0.1 }, rs555: { name: "Motore RS-555 24 V", V: 24, R: 2.2, rpm: 5500, I0: 0.25 }, bldc: { name: "BLDC 24 V 100 W con ESC (equivalente DC)", V: 24, R: 0.35, rpm: 3000, I0: 0.3 } };
  var SERVOS = { sg90: { name: "SG90 micro servo", V: [4.8, 6], Iidle: 0.01, Imove: 0.25, Istall: 0.7 }, mg996r: { name: "MG996R servo metallo", V: [4.8, 7.2], Iidle: 0.01, Imove: 0.9, Istall: 2.5 }, ds3218: { name: "DS3218 servo 20 kg", V: [5, 6.8], Iidle: 0.01, Imove: 1.2, Istall: 3 } };
  var ACDRV = { ac400: { name: "Servo AC 400 W 230 V + azionamento", P: 400, Vin: 230, PF: 0.9, eta: 0.9 }, ac750: { name: "Servo AC 750 W 230 V + azionamento", P: 750, Vin: 230, PF: 0.9, eta: 0.9 }, asy075: { name: "Asincrono 0,75 kW + inverter monofase", P: 750, Vin: 230, PF: 0.95, eta: 0.8 }, asy22: { name: "Asincrono 2,2 kW + inverter 400 V trifase", P: 2200, Vin: 400, PF: 0.95, eta: 0.83 } };
  var BATS = { aa: { name: "Pila AA alcalina 1,5 V", V: 1.5, r: 0.15, mAh: 2500, Imax: 1 }, "9v": { name: "Batteria 9 V alcalina", V: 9, r: 1.7, mAh: 550, Imax: 0.3 }, li18650: { name: "Cella Li-ion 18650 3,7 V", V: 3.7, r: 0.04, mAh: 3000, Imax: 10 }, lipo3s: { name: "LiPo 3S 11,1 V 2200 mAh", V: 11.1, r: 0.03, mAh: 2200, Imax: 50 }, pb12: { name: "Piombo 12 V 7 Ah", V: 12.6, r: 0.03, mAh: 7000, Imax: 20 }, aa4: { name: "Portapile 4×AA (6 V)", V: 6, r: 0.6, mAh: 2500, Imax: 1 } };
  var TYPES = {
    GND: { n: "Massa (GND)", g: "Alimentazione", pins: ["G"], p: {} },
    V: { n: "Alimentatore da banco", g: "Alimentazione", pins: ["+", "−"], p: { V: 5, Ilim: 1 } },
    BAT: { n: "Batteria", g: "Alimentazione", pins: ["+", "−"], p: { kind: "9v" } },
    MAINS: { n: "Rete elettrica", g: "Alimentazione", pins: ["L", "N"], p: { V: 230 } },
    I: { n: "Generatore di corrente", g: "Alimentazione", pins: ["+", "−"], p: { I: 0.02 } },
    R: { n: "Resistenza", g: "Passivi", pins: ["1", "2"], p: { R: 220, P: 0.25, tol: 5 } },
    POT: { n: "Potenziometro", g: "Passivi", pins: ["1", "W", "2"], p: { R: 10000, pos: 0.5, P: 0.25 } },
    LAMP: { n: "Lampadina", g: "Passivi", pins: ["1", "2"], p: { V: 12, P: 5 } },
    C: { n: "Condensatore", g: "Passivi", pins: ["+", "−"], p: { C: 100e-6, Vmax: 25, pol: true } },
    L: { n: "Induttanza", g: "Passivi", pins: ["1", "2"], p: { L: 0.01, R: 0.5, Imax: 1 } },
    LDR: { n: "Fotoresistenza LDR", g: "Sensori", pins: ["1", "2"], p: { lux: 300 } },
    NTC: { n: "Termistore NTC 10 kΩ", g: "Sensori", pins: ["1", "2"], p: { T: 25 } },
    D: { n: "Diodo", g: "Semiconduttori", pins: ["A", "K"], p: { kind: "1N4007" } },
    LED: { n: "LED", g: "Semiconduttori", pins: ["A", "K"], p: { color: "rosso", Imax: 0.02 } },
    NPN: { n: "Transistor NPN", g: "Semiconduttori", pins: ["B", "C", "E"], p: { kind: "2N2222" } },
    NMOS: { n: "MOSFET canale N", g: "Semiconduttori", pins: ["G", "D", "S"], p: { kind: "IRLZ44N" } },
    SW: { n: "Interruttore", g: "Comandi", pins: ["1", "2"], p: { on: false, Imax: 3 } },
    BTN: { n: "Pulsante", g: "Comandi", pins: ["1", "2"], p: { on: false, Imax: 0.05 } },
    RELAY: { n: "Relè", g: "Comandi", pins: ["A1", "A2", "COM", "NO"], p: { Vcoil: 5, Rcoil: 70, Imax: 10 } },
    FUSE: { n: "Fusibile", g: "Protezioni", pins: ["1", "2"], p: { In: 1 } },
    OPAMP: { n: "Amplificatore operazionale", g: "Integrati", pins: ["+", "−", "OUT", "V+", "V−"], p: { kind: "LM358" } },
    NE555: { n: "NE555 astabile", g: "Integrati", pins: ["VCC", "GND", "OUT"], p: { R1: 10000, R2: 68000, C: 10e-6 } },
    REG: { n: "Regolatore di tensione", g: "Integrati", pins: ["IN", "GND", "OUT"], p: { kind: "7805" } },
    ULN: { n: "ULN2003 (1 canale)", g: "Integrati", pins: ["IN", "OUT", "GND", "COM"], p: {} },
    L298: { n: "L298N ponte H", g: "Driver", pins: ["VS", "GND", "IN1", "IN2", "OUT1", "OUT2"], p: {} },
    MCU: { n: "Microcontrollore", g: "Microcontrollori", pins: ["VIN", "5V", "3V3", "GND", "D13", "D9", "D2", "A0"], p: { board: "uno", power: "usb", D13: "H", D9: "L", D2: "IN", pwm: 0.5 } },
    MOTOR: { n: "Motore DC", g: "Motori", pins: ["+", "−"], p: { kind: "tt", TL: 0.002 } },
    SERVO: { n: "Servo RC", g: "Motori", pins: ["V+", "GND", "SIG"], p: { kind: "sg90", load: "move" } },
    STEPDRV: { n: "Stepper + driver", g: "Motori", pins: ["VMOT", "GND", "VDD"], p: { drv: "A4988", motor: "nema17", Iset: 1.0, sps: 800 } },
    ACDRIVE: { n: "Motore industriale + azionamento", g: "Motori", pins: ["L", "N"], p: { kind: "ac400", load: 0.7 } }
  };
  function params(c) { var d = TYPES[c.t].p, o = {}, k; for (k in d) o[k] = d[k]; for (k in (c.p || {})) o[k] = c.p[k]; return o; }
  function ldrR(lux) { return Math.max(200, Math.min(1e6, 5e5 * Math.pow(Math.max(lux, 0.1), -0.8))); }
  function ntcR(T) { return 10000 * Math.exp(3950 * (1 / (T + 273.15) - 1 / 298.15)); }
  function motK(mt) { var w0 = mt.rpm * Math.PI / 30, ke = (mt.V - mt.I0 * mt.R) / w0; return { w0: w0, ke: ke, kt: ke, b: ke * mt.I0 / w0 }; }
  function diodeOf(c) { if (c.t === "LED") { var col = LED_COL[c.p.color] || LED_COL.rosso; return { Vf: col.Vf, Rs: 8, Imax: c.p.Imax || 0.02, Vrrm: 5 }; } return DIODES[c.p.kind] || DIODES["1N4007"]; }

  function gauss(A, b) {
    var n = b.length, i, j, k;
    for (k = 0; k < n; k++) { var p = k, m = Math.abs(A[k][k]); for (i = k + 1; i < n; i++) if (Math.abs(A[i][k]) > m) { m = Math.abs(A[i][k]); p = i; }
      if (m < 1e-18) return null; if (p !== k) { var t = A[k]; A[k] = A[p]; A[p] = t; t = b[k]; b[k] = b[p]; b[p] = t; }
      for (i = k + 1; i < n; i++) { var f = A[i][k] / A[k][k]; if (!f) continue; for (j = k; j < n; j++) A[i][j] -= f * A[k][j]; b[i] -= f * b[k]; } }
    var x = new Array(n); for (i = n - 1; i >= 0; i--) { var s = b[i]; for (j = i + 1; j < n; j++) s -= A[i][j] * x[j]; x[i] = s / A[i][i]; }
    return x;
  }
  var GOFF = 1e-9, GMIN = 1e-10;
  function prepare(circ) {
    var map = { "0": 0, GND: 0 }, names = ["0"];
    var comps = circ.comps.filter(function (c) { return TYPES[c.t]; }).map(function (c) { return { id: c.id, t: c.t, p: params(c), nodes: c.nodes.slice(), raw: c }; });
    comps.forEach(function (c) { if (c.t === "GND") map[c.nodes[0]] = 0; });
    if (!comps.some(function (c) { return c.t === "GND"; })) { var src = comps.filter(function (c) { return /^(V|BAT|MAINS)$/.test(c.t); })[0]; if (src) map[src.nodes[1]] = 0; }
    comps.forEach(function (c) { c.n = c.nodes.map(function (nm) { if (map[nm] === undefined) { map[nm] = names.length; names.push(nm); } return map[nm]; }); });
    return { comps: comps, map: map, names: names, N: names.length };
  }
  function initState(c) {
    var s = {};
    if (c.t === "D" || c.t === "LED") s.on = false;
    if (c.t === "NPN") s.m = "off";
    if (c.t === "NMOS") { s.R = 1e9; s.bd = false; }
    if (c.t === "RELAY") s.on = false;
    if (c.t === "FUSE") s.blown = false;
    if (c.t === "V") s.cc = false;
    if (c.t === "OPAMP") s.clamp = 0;
    if (c.t === "REG") { s.drop = false; s.io = 0; }
    if (c.t === "MOTOR") { s.dir = 1; s.w = 0; s.stall = false; }
    if (c.t === "C") s.v = 0;
    if (c.t === "L") s.i = 0;
    return s;
  }
  /* ---- assemblaggio della matrice MNA ---- */
  function nBranch(c) {
    switch (c.t) { case "V": case "OPAMP": case "REG": return 1; case "MCU": return 2; default: return 0; }
  }
  function build(P, st, tr) {
    var N = P.N - 1, k0 = N, nb = 0, i;
    P.comps.forEach(function (c) { c.k = k0 + nb; nb += nBranch(c); });
    var M = N + nb, A = [], b = new Array(M).fill(0);
    for (i = 0; i < M; i++) A.push(new Array(M).fill(0));
    function ix(n) { return n - 1; }
    function G(a, c2, g) { var x = ix(a), y = ix(c2); if (x >= 0) A[x][x] += g; if (y >= 0) A[y][y] += g; if (x >= 0 && y >= 0) { A[x][y] -= g; A[y][x] -= g; } }
    function inj(n, I) { var x = ix(n); if (x >= 0) b[x] += I; }
    function src(p, m, V, r) { G(p, m, 1 / r); inj(p, V / r); inj(m, -V / r); }   // Norton: generatore V con resistenza r
    function dio(a, k2, Vf, Rs) { G(a, k2, 1 / Rs); inj(a, Vf / Rs); inj(k2, -Vf / Rs); } // conduce da a a k con caduta Vf
    function bA(row, n, v) { var x = ix(n); if (x >= 0) A[row][x] += v; }
    function kA(n, col, v) { var x = ix(n); if (x >= 0) A[x][col] += v; }
    for (i = 0; i < N; i++) A[i][i] += GMIN;
    var dt = tr ? tr.dt : 0, t = tr ? tr.t : 0;
    P.comps.forEach(function (c) {
      var n = c.n, p = c.p, s = st[c.id], k = c.k, d;
      switch (c.t) {
        case "V":
          kA(n[0], k, 1); kA(n[1], k, -1);
          if (s.cc) { A[k][k] = 1; b[k] = -p.Ilim; }
          else { bA(k, n[0], 1); bA(k, n[1], -1); A[k][k] = -0.002; b[k] = p.V; }
          break;
        case "BAT": d = BATS[p.kind] || BATS["9v"]; src(n[0], n[1], d.V, d.r); break;
        case "MAINS": src(n[0], n[1], p.V, 0.5); break;
        case "I": inj(n[0], -p.I); inj(n[1], p.I); break;
        case "R": G(n[0], n[1], 1 / Math.max(p.R, 1e-3)); break;
        case "POT": G(n[0], n[1], 1 / Math.max(1, p.R * p.pos)); G(n[1], n[2], 1 / Math.max(1, p.R * (1 - p.pos))); break;
        case "LAMP": G(n[0], n[1], p.P / (p.V * p.V)); break;
        case "LDR": G(n[0], n[1], 1 / ldrR(p.lux)); break;
        case "NTC": G(n[0], n[1], 1 / ntcR(p.T)); break;
        case "C":
          if (tr) { var gc = p.C / dt; G(n[0], n[1], gc + GOFF); inj(n[0], gc * s.v); inj(n[1], -gc * s.v); }
          else G(n[0], n[1], GOFF);
          break;
        case "L":
          if (tr) { var gl = 1 / (p.R + p.L / dt), Ie = gl * p.L / dt * s.i; G(n[0], n[1], gl); inj(n[0], -Ie); inj(n[1], Ie); }
          else G(n[0], n[1], 1 / Math.max(p.R, 1e-3));
          break;
        case "D": case "LED":
          d = diodeOf(c); if (s.on) dio(n[0], n[1], d.Vf, d.Rs); else G(n[0], n[1], GOFF); break;
        case "NPN":
          d = BJT[p.kind] || BJT["2N2222"]; var Rb = 5, gm = d.beta / Rb, B = n[0], Cn = n[1], E = n[2];
          G(Cn, E, GOFF); G(B, E, GOFF);
          if (s.m === "act") { dio(B, E, d.Vbe, Rb); var xc = ix(Cn), xe = ix(E), xb = ix(B);
            if (xc >= 0) { if (xb >= 0) A[xc][xb] += gm; if (xe >= 0) A[xc][xe] -= gm; b[xc] += gm * d.Vbe; }
            if (xe >= 0) { if (xb >= 0) A[xe][xb] -= gm; A[xe][xe] += gm; b[xe] -= gm * d.Vbe; } }
          else if (s.m === "sat") { dio(B, E, d.Vbe, Rb); dio(Cn, E, d.darl ? 0.75 : 0.1, d.darl ? 0.15 : 0.25); }
          break;
        case "NMOS":
          d = MOS[p.kind] || MOS.IRLZ44N; G(n[1], n[2], 1 / s.R); G(n[0], n[2], GOFF);
          if (s.bd) dio(n[2], n[1], 0.7, 0.02);
          break;
        case "SW": case "BTN": G(n[0], n[1], p.on ? 50 : GOFF); break;
        case "FUSE": G(n[0], n[1], s.blown ? GOFF : 1 / (0.1 / Math.max(p.In, 0.05))); break;
        case "RELAY": G(n[0], n[1], 1 / p.Rcoil); G(n[2], n[3], s.on ? 100 : GOFF); break;
        case "OPAMP":
          var Vp = n[3], Vn = n[4], out = n[2];
          G(Vp, Vn, 1 / 7000); kA(out, k, 1);
          if (s.clamp > 0) { bA(k, out, 1); bA(k, Vp, -1); b[k] = -1.5; }
          else if (s.clamp < 0) { bA(k, out, 1); bA(k, Vn, -1); b[k] = 0.02; }
          else { bA(k, out, 1); bA(k, n[0], -1e5); bA(k, n[1], 1e5); bA(k, Vn, 0); }
          A[k][k] += -0.5; // resistenza d'uscita 0,5 Ω (in serie)
          break;
        case "NE555":
          var f = 1.44 / ((p.R1 + 2 * p.R2) * p.C), duty = (p.R1 + p.R2) / (p.R1 + 2 * p.R2), hi = true;
          if (tr) { var ph = (t * f) % 1; hi = ph < duty; }
          s.hi = hi; s.f = f; s.duty = duty;
          G(n[0], n[1], 1 / 1500); src(n[2], n[1], hi ? Math.max(0, (s.vcc || 5) - 1.7) : 0.1, 10);
          break;
        case "REG":
          d = REGS[p.kind] || REGS["7805"]; var IN = n[0], GN = n[1], OUT = n[2];
          kA(OUT, k, 1);
          if (d.lin || s.drop) kA(IN, k, -1); else { var Iin = d.Vout * Math.max(0, s.io) / (d.eta * Math.max(s.vin || 1, 1)); inj(IN, -Iin); inj(GN, Iin); }
          if (!s.drop) { bA(k, OUT, 1); bA(k, GN, -1); b[k] = d.Vout; }
          else { bA(k, OUT, 1); bA(k, IN, -1); b[k] = -d.drop; }
          A[k][k] += -0.02;
          G(IN, GN, 1 / 2400);
          break;
        case "ULN":
          G(n[0], n[2], GOFF);
          if (s.on) { dio(n[0], n[2], 1.4, 2700); dio(n[1], n[2], 0.9, 0.8); } else G(n[1], n[2], GOFF);
          if (s.fb) dio(n[1], n[3], 0.8, 0.3);
          break;
        case "L298":
          var VS = n[0], GG = n[1]; G(VS, GG, 1 / 900); G(n[2], GG, 1e-5); G(n[3], GG, 1e-5);
          [4, 5].forEach(function (j, q) { var h = s["h" + q]; if (h) dio(VS, n[j], 1.0, 0.8); else dio(n[j], GG, 0.9, 0.8); G(n[j], GG, GOFF); });
          break;
        case "MCU":
          d = MCUS[p.board] || MCUS.uno; var pVIN = n[0], p5 = n[1], p33 = n[2], pG = n[3], rail = d.Vlog === 5 ? p5 : p33;
          if (p.power === "usb") src(p5, pG, 5, 0.3);
          else if (p.power === "vin") { if (d.Vlog === 5) { if ((s.vvin || 0) > 6.6) src(p5, pG, 5, 0.05); else dio(pVIN, p5, 1.6, 0.3); inj(pVIN, -(s.i5out || 0)); inj(pG, (s.i5out || 0)); } else dio(pVIN, p5, 0.3, 0.2); }
          G(pVIN, pG, GOFF); G(p5, pG, GOFF);
          // regolatore 3,3 V di bordo (ramo k): 3V3 = min(3,3; 5V − 0,35)
          kA(p33, k, 1); kA(p5, k, -1);
          if ((s.v5 || 0) - 0.35 >= 3.3) { bA(k, p33, 1); bA(k, pG, -1); b[k] = 3.3; } else { bA(k, p33, 1); bA(k, p5, -1); b[k] = -0.35; }
          A[k][k] += -0.05;
          // ramo k+1 inutilizzato (riservato): equazione banale
          A[k + 1][k + 1] = 1; b[k + 1] = 0;
          G(rail, pG, d.Iq / d.Vlog);
          [["D13", 4], ["D9", 5], ["D2", 6]].forEach(function (pp) {
            var mode = p[pp[0]], nn = n[pp[1]];
            if (mode === "H") G(nn, rail, 1 / d.Rpin);
            else if (mode === "L") G(nn, pG, 1 / d.Rpin);
            else if (mode === "PWM") { var du = Math.max(0.001, Math.min(0.999, p.pwm)); if (tr) { var on = ((t * d.pwmHz) % 1) < du; G(nn, on ? rail : pG, 1 / d.Rpin); } else { G(nn, rail, du / d.Rpin); G(nn, pG, (1 - du) / d.Rpin); } }
            else G(nn, pG, 1e-7);
          });
          G(n[7], pG, 1e-8);
          break;
        case "MOTOR":
          d = DCMOT[p.kind] || DCMOT.tt; var K = motK(d);
          if (tr) { G(n[0], n[1], 1 / d.R); inj(n[0], K.ke * s.w / d.R); inj(n[1], -K.ke * s.w / d.R); }
          else if (s.stall) G(n[0], n[1], 1 / d.R);
          else { var D = K.b + K.kt * K.ke / d.R, Geq = 1 / d.R - K.ke * K.kt / (d.R * d.R * D), Io = K.ke * p.TL / (d.R * D) + d.I0 * 0; G(n[0], n[1], Math.max(Geq, 1e-6)); inj(n[0], -s.dir * Io); inj(n[1], s.dir * Io); }
          break;
        case "SERVO":
          d = SERVOS[p.kind] || SERVOS.sg90; var Is = p.load === "stall" ? d.Istall : p.load === "idle" ? d.Iidle : d.Imove; G(n[0], n[1], Is / 5); G(n[2], n[1], 1e-6); break;
        case "STEPDRV":
          d = DRIVERS[p.drv] || DRIVERS.A4988; var mt = STEPPERS[p.motor] || STEPPERS.nema17, Iph = Math.min(p.Iset, d.Ipk);
          var Psup = (Iph * Iph * (mt.R + d.Rds) + 0.3) / 0.9, Vm = Math.max(s.vm || 12, 1), en = (s.vdd || 0) > 2.5 && Vm > d.Vmot[0] * 0.9;
          s.Psup = en ? Psup : 0.05; G(n[0], n[1], 1e-6); inj(n[0], -s.Psup / Vm); inj(n[1], s.Psup / Vm); G(n[2], n[1], 0.005 / 5);
          break;
        case "ACDRIVE":
          d = ACDRV[p.kind] || ACDRV.ac400; var Pin = d.P * Math.max(0.02, p.load) / d.eta + 15; G(n[0], n[1], Pin / (d.Vin * d.Vin)); break;
      }
    });
    return { A: A, b: b, M: M, N: N };
  }
  /* ---- aggiornamento degli stati (modelli a tratti) ---- */
  function vOf(x, n) { return n === 0 ? 0 : x[n - 1]; }
  function update(P, st, x, tr) {
    var ch = 0;
    P.comps.forEach(function (c) {
      var n = c.n, p = c.p, s = st[c.id], V = function (j) { return vOf(x, n[j]); }, d, v;
      switch (c.t) {
        case "V": v = V(0) - V(1); var I = -x[c.k];
          if (!s.cc && I > p.Ilim * 1.0001) { s.cc = true; ch++; } else if (s.cc && v > p.V) { s.cc = false; ch++; } break;
        case "D": case "LED": d = diodeOf(c); v = V(0) - V(1);
          if (!s.on && v > d.Vf + 1e-6) { s.on = true; ch++; } else if (s.on && v < d.Vf - 1e-9) { s.on = false; ch++; } break;
        case "NPN": d = BJT[p.kind] || BJT["2N2222"];
          var vbe = V(0) - V(2), vce = V(1) - V(2), Ib = (vbe - d.Vbe) / 5, vs = d.darl ? 0.75 : 0.1, rs = d.darl ? 0.15 : 0.25, old = s.m;
          if (s.m === "off") { if (vbe > d.Vbe) s.m = "act"; }
          else if (Ib < 0) s.m = "off";
          else if (s.m === "act") { if (vce < vs) s.m = "sat"; }
          else { var Ics = (vce - vs) / rs; if (Ics > d.beta * Ib || Ics < 0) s.m = "act"; }
          if (s.m !== old) ch++; break;
        case "NMOS": d = MOS[p.kind] || MOS.IRLZ44N; var vgs = V(0) - V(2), vds = V(1) - V(2), tg;
          if (vgs <= d.Vth) tg = 1e8; else { var fr = Math.sqrt(Math.min(1, (vgs - d.Vth) / (d.Vfull - d.Vth))); tg = Math.exp(Math.log(2e3) * (1 - fr) + Math.log(d.Rds) * fr); }
          var nr = Math.exp((Math.log(s.R) + Math.log(tg)) / 2); if (Math.abs(Math.log(nr / s.R)) > 0.002) { s.R = nr; ch++; } else s.R = tg;
          if (!s.bd && vds < -0.7) { s.bd = true; ch++; } else if (s.bd && vds > -0.69) { s.bd = false; ch++; } break;
        case "FUSE": v = Math.abs(V(0) - V(1)); var If = s.blown ? 0 : v / (0.1 / Math.max(p.In, 0.05));
          if (!s.blown) { if (tr) { if (If > p.In) s.i2t = (s.i2t || 0) + (If * If - p.In * p.In) * tr.dt; if (If > 10 * p.In || (s.i2t || 0) > p.In * p.In * 0.1) { s.blown = true; ch++; } } else if (If > 1.35 * p.In) { s.blown = true; ch++; } } break;
        case "RELAY": v = Math.abs(V(0) - V(1)); if (!s.on && v > 0.75 * p.Vcoil) { s.on = true; ch++; } else if (s.on && v < 0.35 * p.Vcoil) { s.on = false; ch++; } break;
        case "OPAMP": var vo = V(2), lin = 1e5 * (V(0) - V(1)), hiR = V(3) - 1.5, loR = V(4) + 0.02, oc = s.clamp;
          if (s.clamp === 0) { if (vo > hiR + 1e-6) s.clamp = 1; else if (vo < loR - 1e-6) s.clamp = -1; }
          else if (s.clamp > 0 && lin < hiR) s.clamp = 0; else if (s.clamp < 0 && lin > loR) s.clamp = 0;
          if (oc !== s.clamp) ch++; break;
        case "NE555": v = V(0) - V(1); if (Math.abs(v - (s.vcc || 0)) > 1e-4) { s.vcc = v; ch++; } break;
        case "REG": d = REGS[p.kind] || REGS["7805"]; var vin = V(0) - V(1), io = -x[c.k], od = s.drop;
          if (!s.drop && vin < d.Vout + d.drop) s.drop = true; else if (s.drop && vin > d.Vout + d.drop + 0.01) s.drop = false;
          if (od !== s.drop) ch++;
          if (Math.abs(io - s.io) > 1e-5 + 1e-4 * Math.abs(io) || Math.abs(vin - (s.vin || 0)) > 1e-4) { s.io = io; s.vin = vin; if (!d.lin) ch++; } break;
        case "ULN": var on = V(0) - V(2) > 1.5, fb = V(1) - V(3) > 0.8; if (on !== !!s.on) { s.on = on; ch++; } if (fb !== !!s.fb) { s.fb = fb; ch++; } break;
        case "L298": [2, 3].forEach(function (j, q) { var h = V(j) - V(1) > 2.3; if (h !== !!s["h" + q]) { s["h" + q] = h; ch++; } }); break;
        case "MCU": var v5 = V(1) - V(3), vv = V(0) - V(3), i5 = (p.power === "vin" && vv > 6.6 && (MCUS[p.board] || MCUS.uno).Vlog === 5) ? Math.max(0, (5 - v5) / 0.05) : 0;
          if (Math.abs(v5 - (s.v5 || 0)) > 1e-4 || Math.abs(vv - (s.vvin || 0)) > 1e-4 || Math.abs(i5 - (s.i5out || 0)) > 1e-5) { s.v5 = v5; s.vvin = vv; s.i5out = i5; ch++; } break;
        case "MOTOR": if (tr) break; d = DCMOT[p.kind] || DCMOT.tt; var K = motK(d); v = V(0) - V(1);
          var dir = v >= 0 ? 1 : -1, stall = K.kt * Math.abs(v) / d.R <= p.TL * 1.0001;
          if (dir !== s.dir || stall !== s.stall) { s.dir = dir; s.stall = stall; ch++; } break;
        case "STEPDRV": var vm = V(0) - V(1), vd = V(2) - V(1);
          if (Math.abs(vm - (s.vm || 0)) > 1e-4 || Math.abs(vd - (s.vdd || 0)) > 1e-3) { s.vm = vm; s.vdd = vd; ch++; } break;
      }
    });
    return ch;
  }
  function iterate(P, st, tr, maxIt) {
    var x = null, it, ok = true;
    for (it = 0; it < (maxIt || 120); it++) {
      var S = build(P, st, tr); x = gauss(S.A, S.b); if (!x) { ok = false; break; }
      if (!update(P, st, x, tr)) break;
    }
    return { x: x, it: it, ok: ok && !!x, conv: it < (maxIt || 120) };
  }
  /* ---- misure per componente ---- */
  function measure(P, st, x, tr) {
    var out = {};
    P.comps.forEach(function (c) {
      var n = c.n, p = c.p, s = st[c.id], V = function (j) { return vOf(x, n[j]); }, m = { t: c.t, V: n.length > 1 ? V(0) - V(1) : 0, I: 0, P: 0 }, d, v;
      m.pins = n.map(function (q, j) { return V(j); });
      switch (c.t) {
        case "V": m.I = -x[c.k]; m.P = -m.I * m.V; m.cc = s.cc; break;
        case "BAT": d = BATS[p.kind] || BATS["9v"]; m.I = (d.V - m.V) / d.r; m.P = m.I * m.V; m.hours = m.I > 1e-6 ? d.mAh / 1000 / m.I : Infinity; break;
        case "MAINS": m.I = (p.V - m.V) / 0.5; m.P = m.I * m.V; break;
        case "I": m.I = p.I; m.P = m.V * p.I; break;
        case "R": m.I = m.V / Math.max(p.R, 1e-3); m.P = m.V * m.I; break;
        case "POT": var r1 = Math.max(1, p.R * p.pos), r2 = Math.max(1, p.R * (1 - p.pos)), i1 = (V(0) - V(1)) / r1, i2 = (V(1) - V(2)) / r2; m.I = i1; m.I2 = i2; m.P = i1 * i1 * r1 + i2 * i2 * r2; m.Vw = V(1); break;
        case "LAMP": m.I = m.V * p.P / (p.V * p.V); m.P = m.V * m.I; m.lum = Math.min(1.5, m.P / p.P); break;
        case "LDR": m.R = ldrR(p.lux); m.I = m.V / m.R; m.P = m.V * m.I; break;
        case "NTC": m.R = ntcR(p.T); m.I = m.V / m.R; m.P = m.V * m.I; break;
        case "C": m.I = tr ? p.C / tr.dt * (m.V - s.v) : 0; m.E = 0.5 * p.C * m.V * m.V; break;
        case "L": m.I = tr ? (m.V + p.L / tr.dt * s.i) / (p.R + p.L / tr.dt) : m.V / Math.max(p.R, 1e-3); m.P = m.I * m.I * p.R; break;
        case "D": case "LED": d = diodeOf(c); m.I = s.on ? (m.V - d.Vf) / d.Rs : m.V * GOFF; m.P = s.on ? d.Vf * m.I + m.I * m.I * d.Rs : 0; if (c.t === "LED") m.lum = Math.max(0, Math.min(1.6, m.I / (c.p.Imax || 0.02))); break;
        case "NPN": d = BJT[p.kind] || BJT["2N2222"]; var vbe = V(0) - V(2), vce = V(1) - V(2); m.Vbe = vbe; m.Vce = vce; m.mode = s.m;
          m.Ib = s.m === "off" ? 0 : Math.max(0, (vbe - d.Vbe) / 5); m.Ic = s.m === "act" ? d.beta * m.Ib : s.m === "sat" ? (vce - (d.darl ? 0.75 : 0.1)) / (d.darl ? 0.15 : 0.25) : 0;
          m.I = m.Ic; m.P = Math.max(0, vce * m.Ic + vbe * m.Ib); break;
        case "NMOS": var vds = V(1) - V(2); m.Vgs = V(0) - V(2); m.Vds = vds; m.Rds = s.R; m.I = vds / s.R + (s.bd ? (vds + 0.7) / 0.02 : 0); m.P = Math.abs(vds * m.I); break;
        case "SW": case "BTN": m.I = m.V * (p.on ? 50 : GOFF); m.P = m.V * m.I; break;
        case "FUSE": m.blown = s.blown; m.I = s.blown ? 0 : m.V / (0.1 / Math.max(p.In, 0.05)); m.P = m.V * m.I; break;
        case "RELAY": m.on = s.on; m.I = m.V / p.Rcoil; m.Ic = (V(2) - V(3)) * (s.on ? 100 : GOFF); m.P = m.V * m.I; break;
        case "OPAMP": m.Vout = V(2); m.I = -x[c.k]; m.clamp = s.clamp; m.Vs = V(3) - V(4); break;
        case "NE555": m.f = s.f; m.duty = s.duty; m.hi = s.hi; m.Vs = V(0) - V(1); m.Vout = V(2) - V(1); m.I = m.Vs / 1500; break;
        case "REG": d = REGS[p.kind] || REGS["7805"]; m.Vin = V(0) - V(1); m.Vout = V(2) - V(1); m.I = -x[c.k]; m.drop = s.drop;
          m.Iin = d.lin || s.drop ? m.I + m.Vin / 2400 : m.Vout * Math.max(0, m.I) / (d.eta * Math.max(m.Vin, 1)) + m.Vin / 2400;
          m.P = d.lin ? Math.max(0, (m.Vin - m.Vout) * m.I) : Math.max(0, m.Vout * m.I * (1 / d.eta - 1)); m.Tj = 25 + m.P * (d.Rth || 30); break;
        case "ULN": m.on = s.on; m.I = s.on ? Math.max(0, (V(1) - V(2) - 0.9) / 0.8) : 0; m.P = m.I * (V(1) - V(2)); break;
        case "L298": m.h = [!!s.h0, !!s.h1]; m.Vs = V(0) - V(1);
          m.Io = [4, 5].map(function (j, q) { return s["h" + q] ? (V(0) - V(j) - 1.0) / 0.8 : (V(j) - V(1) - 0.9) / 0.8; }).map(function (i) { return Math.max(0, i); });
          m.I = Math.max(m.Io[0], m.Io[1]); m.P = m.Io[0] * (1 + 0.8 * m.Io[0]) + m.Io[1] * (0.9 + 0.8 * m.Io[1]) + m.Vs * m.Vs / 900; break;
        case "MCU": d = MCUS[p.board] || MCUS.uno; var rail = d.Vlog === 5 ? 1 : 2, vr = V(rail) - V(3); m.v5 = V(1) - V(3); m.v33 = V(2) - V(3); m.vin = V(0) - V(3); m.vlog = vr; m.pin = {};
          [["D13", 4], ["D9", 5], ["D2", 6], ["A0", 7]].forEach(function (pp) {
            var mode = p[pp[0]] || "IN", vp = V(pp[1]) - V(3), ip = 0;
            if (mode === "H") ip = (vr - vp) / d.Rpin; else if (mode === "L") ip = -vp / d.Rpin; else if (mode === "PWM") ip = (p.pwm * vr - vp) / d.Rpin;
            m.pin[pp[0]] = { mode: pp[0] === "A0" ? "ADC" : mode, V: vp, I: ip, read: pp[0] === "A0" ? Math.round(Math.max(0, Math.min(1, vp / d.Vlog)) * d.adc) : vp > d.Vlog * 0.6 ? 1 : vp < d.Vlog * 0.3 ? 0 : -1 };
          });
          m.I = p.power === "usb" ? (5 - m.v5) / 0.3 : 0; m.Iusb = m.I; break;
        case "MOTOR": d = DCMOT[p.kind] || DCMOT.tt; var K = motK(d);
          if (tr) { m.w = s.w; m.I = (m.V - K.ke * s.w) / d.R; }
          else if (s.stall) { m.w = 0; m.I = m.V / d.R; }
          else { var D = K.b + K.kt * K.ke / d.R; m.w = s.dir * (K.kt * Math.abs(m.V) / d.R - p.TL) / D; m.I = (m.V - K.ke * m.w) / d.R; }
          m.rpm = m.w * 30 / Math.PI; m.Istall = Math.abs(m.V) / d.R; m.stall = !tr && s.stall && Math.abs(m.V) > 0.3; m.P = m.V * m.I; m.Pmech = K.kt * m.I * m.w; break;
        case "SERVO": d = SERVOS[p.kind] || SERVOS.sg90; m.I = m.V / (5 / (p.load === "stall" ? d.Istall : p.load === "idle" ? d.Iidle : d.Imove)); m.P = m.V * m.I; break;
        case "STEPDRV": d = DRIVERS[p.drv] || DRIVERS.A4988; var mt = STEPPERS[p.motor] || STEPPERS.nema17; m.Vm = V(0) - V(1); m.Vdd = V(2) - V(1);
          m.I = s.Psup / Math.max(m.Vm, 1); m.P = m.Vm * m.I; m.Iph = Math.min(p.Iset, d.Ipk); m.spsMax = Math.max(m.Vm, 0) / (2 * mt.L * Math.max(m.Iph, 0.05));
          m.Tavail = mt.T * Math.min(1, m.Iph / mt.I) * (p.sps > m.spsMax ? Math.max(0, 1 - (p.sps - m.spsMax) / m.spsMax) : 1); m.Pdrv = m.Iph * m.Iph * d.Rds * 2; m.Pmot = m.Iph * m.Iph * mt.R; break;
        case "ACDRIVE": d = ACDRV[p.kind] || ACDRV.ac400; m.Pin = m.V * m.V * (d.P * Math.max(0.02, p.load) / d.eta + 15) / (d.Vin * d.Vin); m.I = m.Pin / Math.max(1, m.V * d.PF); m.P = m.Pin; m.Pout = m.Pin * d.eta; break;
      }
      out[c.id] = m;
    });
    return out;
  }
  function solve(circ, opt) {
    opt = opt || {};
    var P = prepare(circ), st = opt.st || {};
    P.comps.forEach(function (c) { if (!st[c.id]) st[c.id] = initState(c); else if (c.t === "FUSE" && c.raw.blown) st[c.id].blown = true; });
    var r = iterate(P, st, null, 150);
    if (!r.ok) return { ok: false, err: "Circuito non risolvibile: controlla che ogni parte sia collegata a massa (GND) o a un generatore.", issues: [{ sev: "err", comp: null, t: "Circuito impossibile da risolvere", why: "La matrice è singolare: c'è un generatore ideale in corto, due generatori in parallelo con tensioni diverse o una parte isolata.", fix: "Aggiungi una massa, separa i generatori o metti una resistenza in serie." }] };
    var V = {}; P.names.forEach(function (nm, i) { V[nm] = vOf(r.x, i); }); for (var key in P.map) V[key] = vOf(r.x, P.map[key]);
    var res = { ok: true, conv: r.conv, iter: r.it, V: V, comps: measure(P, st, r.x, null), st: st, P: P };
    res.issues = check(circ, res);
    return res;
  }
  function tran(circ, opt) {
    opt = opt || {}; var P = prepare(circ), st = {}, tEnd = opt.tEnd || 1, dt = opt.dt || tEnd / 1000, steps = Math.min(20000, Math.ceil(tEnd / dt)), probes = opt.probes || [], cur = opt.cur || [];
    P.comps.forEach(function (c) { st[c.id] = initState(c); if (c.t === "C" && c.p.v0) st[c.id].v = c.p.v0; });
    var T = [], S = {}, last = null, every = Math.max(1, Math.floor(steps / (opt.samples || 1000)));
    probes.forEach(function (pr) { S[pr] = []; }); cur.forEach(function (id) { S["I:" + id] = []; });
    for (var k = 1; k <= steps; k++) {
      var tr = { dt: dt, t: k * dt }, r = iterate(P, st, tr, 40); if (!r.ok) return { ok: false, err: "Simulazione interrotta: circuito singolare." };
      var ms = measure(P, st, r.x, tr);
      P.comps.forEach(function (c) {
        var s = st[c.id], m = ms[c.id];
        if (c.t === "C") s.v = m.V;
        else if (c.t === "L") s.i = m.I;
        else if (c.t === "MOTOR") { var d = DCMOT[c.p.kind] || DCMOT.tt, K = motK(d), Dd = K.b + K.kt * K.ke / d.R, J = 0.05 * Dd, Tm = K.kt * m.I - K.b * s.w, fr = c.p.TL;
          if (Math.abs(s.w) < 1e-6 && Math.abs(Tm) <= fr) s.w = 0; else { s.w += dt * (Tm - fr * (s.w >= 0 ? 1 : -1)) / J; } }
      });
      if (k % every === 0 || k === steps) { T.push(tr.t); probes.forEach(function (pr) { S[pr].push(vOf(r.x, P.map[pr] || 0)); }); cur.forEach(function (id) { S["I:" + id].push(ms[id] ? ms[id].I : 0); }); }
      last = ms;
    }
    return { ok: true, t: T, s: S, comps: last, st: st };
  }
  /* ---- verifiche: errori con perché e come rimediare ---- */
  function check(circ, res) {
    var out = [], P = res.P, M = res.comps, cnt = {}, vmax = 0;
    function add(sev, c, t, why, fix) { out.push({ sev: sev, comp: c ? c.id : null, t: t, why: why, fix: fix }); }
    circ.comps.forEach(function (c) { c.nodes.forEach(function (nm) { cnt[nm] = (cnt[nm] || 0) + 1; }); });
    for (var nm in res.V) vmax = Math.max(vmax, res.V[nm]);
    function nodesOf(c) { return c.nodes.map(function (q) { return P.map[q]; }); }
    function hasAnti(a, k) { return P.comps.some(function (o) { return o.t === "D" && ((o.n[0] === a && o.n[1] === k) || (o.n[1] === a && o.n[0] === k)); }); }
    function drivenBySwitch(nodes) { return P.comps.some(function (o) { return (o.t === "NPN" && nodes.indexOf(o.n[1]) >= 0) || (o.t === "NMOS" && nodes.indexOf(o.n[1]) >= 0) || (o.t === "ULN" && nodes.indexOf(o.n[1]) >= 0 && !o.n[3]); }); }
    P.comps.forEach(function (c) {
      var m = M[c.id], p = c.p, d, A = Math.abs(m.I || 0), nm2 = (TYPES[c.t] || {}).n || c.t;
      if (/^(R|LED|D|C|L|LAMP|MOTOR|FUSE)$/.test(c.t)) c.raw.nodes.forEach(function (q, j) { if (cnt[q] === 1 && P.map[q] !== 0) add("info", c, nm2 + ": piedino " + TYPES[c.t].pins[j] + " scollegato", "Questo piedino non tocca nessun altro componente, quindi non scorre corrente.", "Collega il piedino con un filo o rimuovi il componente."); });
      switch (c.t) {
        case "LED": d = diodeOf(c);
          if (A > 2.5 * d.Imax) add("err", c, "LED bruciato (" + si(A, "A") + ")", "Un LED non limita da solo la corrente: oltre la tensione di soglia (" + fx(d.Vf, 1) + " V) la corrente sale quasi senza freni. Il massimo è " + si(d.Imax, "A") + ".", "Metti una resistenza in serie da almeno " + si(nextE((vmax - d.Vf) / (d.Imax * 0.75)), "Ω") + " (calcolo: (V − Vf) / I).");
          else if (A > 1.1 * d.Imax) add("warn", c, "LED sovraccarico (" + si(A, "A") + ")", "La corrente supera il valore nominale di " + si(d.Imax, "A") + ": durerà poco e scalderà.", "Aumenta la resistenza in serie fino a " + si(nextE((vmax - d.Vf) / (d.Imax * 0.75)), "Ω") + ".");
          if (m.V < -5) add("err", c, "LED in inversa oltre 5 V", "I LED reggono solo circa 5 V in inversa: oltre si rompono.", "Gira il LED (anodo, gamba lunga, verso il +) o metti un diodo in antiparallelo.");
          break;
        case "D": d = diodeOf(c);
          if (A > d.Imax) add("err", c, "Diodo oltre la corrente massima", nm2 + " " + (p.kind) + " regge " + si(d.Imax, "A") + ", qui passano " + si(A, "A") + ".", "Usa un diodo più grosso (1N5408 da 3 A, SS34 Schottky) o limita la corrente.");
          if (-m.V > d.Vrrm) add("err", c, "Diodo oltre la tensione inversa", "La tensione inversa " + fx(-m.V, 1) + " V supera Vrrm = " + d.Vrrm + " V.", "Scegli un diodo con Vrrm più alta, ad esempio 1N4007 (1000 V).");
          break;
        case "R":
          if (m.P > 2 * p.P) add("err", c, "Resistenza che brucia (" + si(m.P, "W") + ")", "Dissipa " + si(m.P, "W") + " ma è da " + si(p.P, "W") + ": P = V²/R = " + fx(m.V, 2) + "² / " + si(p.R, "Ω") + ".", "Usa una resistenza da almeno " + si(pRating(m.P * 1.6), "W") + " o aumenta il valore in ohm.");
          else if (m.P > 0.7 * p.P) add("warn", c, "Resistenza calda (" + si(m.P, "W") + ")", "È oltre il 70% della potenza nominale (" + si(p.P, "W") + "): scotta e si degrada.", "Passa a " + si(pRating(m.P * 1.6), "W") + ".");
          break;
        case "POT": if (m.P > p.P) add("warn", c, "Potenziometro sovraccarico", "Dissipa " + si(m.P, "W") + " oltre i " + si(p.P, "W") + " nominali.", "Usalo solo come partitore di segnale, non per far passare corrente di potenza."); break;
        case "LAMP": if (m.V > 1.1 * p.V) add("warn", c, "Lampadina sovratensione", "Funziona a " + p.V + " V, ne riceve " + fx(m.V, 1) + ": il filamento brucia presto.", "Alimenta con la tensione giusta o metti una resistenza in serie."); break;
        case "C":
          if (p.pol && m.V < -0.5) add("err", c, "Elettrolitico montato al contrario", "Un condensatore elettrolitico polarizzato in inversa (" + fx(m.V, 1) + " V) si scalda, si gonfia e può esplodere.", "Gira il condensatore: la striscia bianca (−) va verso massa.");
          if (Math.abs(m.V) > p.Vmax) add("err", c, "Condensatore oltre la tensione nominale", "Regge " + p.Vmax + " V, qui ne ha " + fx(Math.abs(m.V), 1) + ".", "Usa un condensatore da almeno " + (C_V.filter(function (v) { return v >= Math.abs(m.V) * 1.5; })[0] || 450) + " V (regola: 1,5–2 × la tensione di lavoro).");
          else if (Math.abs(m.V) > 0.8 * p.Vmax) add("warn", c, "Condensatore al limite di tensione", "Lavora oltre l'80% della tensione nominale: dura meno.", "Scegli la tensione superiore della serie (" + C_V.join(", ") + " V).");
          break;
        case "V": if (m.cc) add(m.V < 0.3 * p.V ? "err" : "warn", c, m.V < 0.3 * p.V ? "Cortocircuito sull'alimentatore" : "Alimentatore in limitazione di corrente", "L'alimentatore eroga il massimo impostato (" + si(p.Ilim, "A") + ") e la tensione crolla a " + fx(m.V, 2) + " V.", "Cerca un collegamento diretto tra + e − (filo, pista o goccia di stagno) o un carico troppo grosso."); break;
        case "BAT": d = BATS[p.kind] || BATS["9v"]; if (A > d.Imax) add("err", c, "Batteria in cortocircuito / sovraccarico", "Eroga " + si(A, "A") + " ma ne regge " + si(d.Imax, "A") + ": si scalda, si scarica subito e (Li-ion/LiPo) può prendere fuoco.", "Togli il corto, metti un fusibile vicino alla batteria e verifica il consumo del carico."); else if (A > 0.001 && m.hours < 1) add("info", c, "Autonomia batteria ≈ " + fx(m.hours * 60, 0) + " min", "Capacità " + d.mAh + " mAh con " + si(A, "A") + " assorbiti.", "Per durare di più usa una batteria più capiente o riduci il consumo."); break;
        case "MAINS": if (A > 16) add("err", c, "Sovraccarico sulla rete", "Oltre 16 A scatta l'interruttore magnetotermico.", "Riduci il carico o usa una linea dedicata."); break;
        case "FUSE": if (m.blown) add("err", c, "Fusibile bruciato", "È passata una corrente oltre " + si(p.In, "A") + " per troppo tempo: il fusibile si è aperto per proteggere il circuito.", "Trova la causa (corto, motore bloccato, carico eccessivo), poi premi 'Ripristina' o sostituisci il fusibile."); else if (A > 0.8 * p.In) add("warn", c, "Fusibile vicino al limite", "Lavora a " + fx(100 * A / p.In, 0) + "% della corrente nominale.", "Usa un fusibile del 25–50% sopra la corrente normale."); break;
        case "NPN": d = BJT[p.kind] || BJT["2N2222"];
          if (A > d.Icmax) add("err", c, "Transistor oltre la corrente massima", p.kind + " regge " + si(d.Icmax, "A") + " di collettore, qui " + si(A, "A") + ".", "Usa un TIP120 / BD139 o meglio un MOSFET logic level (IRLZ44N).");
          if (m.P > d.P) add("err", c, "Transistor surriscaldato (" + si(m.P, "W") + ")", "Dissipa più dei " + si(d.P, "W") + " consentiti senza dissipatore" + (m.mode === "act" ? ", perché lavora in zona attiva (non saturato)" : "") + ".", m.mode === "act" ? "Riduci la resistenza di base per saturarlo: Ib ≈ Ic / 10." : "Aggiungi un dissipatore o scegli un componente più grande.");
          else if (m.mode === "act" && A > 0.05) add("warn", c, "Transistor non saturato", "Con Ib = " + si(m.Ib, "A") + " e β = " + d.beta + " lavora in zona lineare: Vce = " + fx(m.Vce, 2) + " V e scalda.", "Per usarlo da interruttore abbassa la resistenza di base (Ib ≈ Ic/10).");
          if (m.Vce > d.Vceo) add("err", c, "Tensione Vce oltre il massimo", "Vce = " + fx(m.Vce, 1) + " V > " + d.Vceo + " V.", "Scegli un transistor con Vceo più alta.");
          break;
        case "NMOS": d = MOS[p.kind] || MOS.IRLZ44N;
          if (m.Vgs < d.Vfull && (A > 0.1 || (m.Vgs > d.Vth * 0.7 && Math.abs(m.Vds) > 0.5))) add("warn", c, "MOSFET non completamente acceso", "Vgs = " + fx(m.Vgs, 2) + " V ma per Rds(on) = " + si(d.Rds, "Ω") + " servono " + d.Vfull + " V" + (d.logic ? "" : " (non è logic level)") + ": Rds sale a " + si(m.Rds, "Ω") + ".", d.logic ? "Pilota il gate con una tensione più alta." : "Usa un MOSFET logic level (IRLZ44N, AO3400) o un driver di gate a 10–12 V.");
          if (m.P > d.P) add("err", c, "MOSFET surriscaldato (" + si(m.P, "W") + ")", "Senza dissipatore regge circa " + si(d.P, "W") + ".", "Aumenta Vgs, scegli Rds(on) più bassa o metti un dissipatore.");
          if (A > d.Id) add("err", c, "MOSFET oltre la corrente massima", "Id = " + si(A, "A") + " > " + d.Id + " A.", "Usa un MOSFET più grande o più in parallelo.");
          break;
        case "SW": case "BTN": if (A > p.Imax) add("warn", c, nm2 + " oltre la corrente dei contatti", "Passano " + si(A, "A") + ", i contatti reggono " + si(p.Imax, "A") + ": si anneriscono e saldano.", "Comanda il carico con un transistor, un MOSFET o un relè."); break;
        case "RELAY":
          if (Math.abs(m.Ic) > p.Imax) add("err", c, "Contatti del relè sovraccarichi", "Passano " + si(Math.abs(m.Ic), "A") + " sui contatti da " + p.Imax + " A.", "Usa un relè o un contattore più grande.");
          if (m.on && drivenBySwitch([c.n[0], c.n[1]]) && !hasAnti(c.n[0], c.n[1])) add("warn", c, "Manca il diodo di ricircolo sul relè", "Quando il transistor apre, la bobina genera un picco di centinaia di volt che lo distrugge.", "Metti un 1N4007 in parallelo alla bobina, catodo verso il +.");
          if (!m.on && Math.abs(m.V) > 0.2 * p.Vcoil) add("warn", c, "Bobina del relè sotto tensione", "La bobina riceve " + fx(Math.abs(m.V), 1) + " V su " + p.Vcoil + " V nominali: il relè non scatta.", "Alimenta la bobina con la tensione nominale.");
          break;
        case "OPAMP": if (m.Vs < 3) add("warn", c, "Operazionale non alimentato", "Tra V+ e V− ci sono solo " + fx(m.Vs, 1) + " V; l'LM358 vuole 3–32 V.", "Collega V+ all'alimentazione e V− a massa."); else if (m.clamp) add("info", c, "Uscita dell'operazionale in saturazione", "L'uscita è arrivata al limite " + (m.clamp > 0 ? "alto (V+ − 1,5 V)" : "basso (≈ V−)") + ".", "Riduci il guadagno o il segnale d'ingresso."); break;
        case "NE555": if (m.Vs < 4.5 || m.Vs > 16) add("err", c, "NE555 fuori alimentazione", "Funziona tra 4,5 e 16 V, qui " + fx(m.Vs, 1) + " V.", "Usa un'alimentazione 5–15 V (o il TLC555 da 2 V)."); break;
        case "REG": d = REGS[p.kind] || REGS["7805"];
          if (m.Vin > d.VinMax) add("err", c, "Regolatore: ingresso oltre il massimo", "Vin = " + fx(m.Vin, 1) + " V > " + d.VinMax + " V.", "Usa un regolatore adatto (LM2596 fino a 40 V).");
          if (m.drop && m.Vin > 0.5) add("warn", c, "Regolatore in dropout", "Servono almeno " + fx(d.Vout + d.drop, 1) + " V in ingresso, ce ne sono " + fx(m.Vin, 1) + ": l'uscita scende a " + fx(m.Vout, 2) + " V.", "Alza la tensione d'ingresso o usa un regolatore LDO / buck-boost.");
          if (m.I > d.Imax) add("err", c, "Regolatore oltre la corrente massima", "Eroga " + si(m.I, "A") + " su " + d.Imax + " A.", "Usa un buck LM2596 (3 A) o dividi il carico.");
          if (d.lin && m.Tj > 125) add("err", c, "Regolatore in protezione termica (Tj ≈ " + fx(m.Tj, 0) + " °C)", "Un lineare dissipa (Vin − Vout) × I = " + si(m.P, "W") + "; senza dissipatore (" + d.Rth + " °C/W) supera 125 °C.", "Metti un dissipatore, abbassa Vin o usa un regolatore switching (LM2596, MP1584).");
          else if (d.lin && m.P > 0.8) add("warn", c, "Regolatore lineare caldo (" + si(m.P, "W") + ")", "Tj stimata " + fx(m.Tj, 0) + " °C.", "Serve un dissipatore o un buck switching.");
          break;
        case "L298": if (m.Vs < 4.5 && m.I > 0.01) add("warn", c, "L298N con VS troppo bassa", "Il ponte H perde circa 2–3 V: con " + fx(m.Vs, 1) + " V al motore arriva pochissimo.", "Alimenta VS a 7–35 V o usa un driver MOSFET (TB6612, DRV8871)."); if (m.I > 2) add("err", c, "L298N oltre 2 A per canale", "Corrente d'uscita " + si(m.I, "A") + ".", "Usa un driver più robusto (BTS7960 da 43 A)."); break;
        case "ULN": if (m.I > 0.5) add("err", c, "ULN2003 oltre 500 mA per canale", "Uscita " + si(m.I, "A") + ".", "Metti canali in parallelo o usa un MOSFET."); break;
        case "MCU": d = MCUS[p.board] || MCUS.uno;
          ["D13", "D9", "D2"].forEach(function (pn) { var q = m.pin[pn], a = Math.abs(q.I);
            if (a > d.Iabs) add("err", c, "Pin " + pn + " oltre il massimo assoluto (" + si(a, "A") + ")", "Un pin di " + d.name + " regge al massimo " + si(d.Iabs, "A") + " (consigliati " + si(d.Irec, "A") + "): il pin o l'intero chip si danneggia.", "Non alimentare carichi dal pin: usa una resistenza più grande o un transistor/MOSFET come interruttore.");
            else if (a > d.Irec * 1.05) add("warn", c, "Pin " + pn + " oltre " + si(d.Irec, "A"), "Corrente " + si(a, "A") + " oltre il valore consigliato: la tensione del pin cala e il chip scalda.", "Aumenta la resistenza in serie (es. 330 Ω–1 kΩ per un LED).");
            if (q.mode === "IN" && q.V > d.Vlog + 0.5 && !d.tol5) add("err", c, "Tensione eccessiva sull'ingresso " + pn, d.name + " lavora a " + d.Vlog + " V e non tollera " + fx(q.V, 1) + " V.", "Usa un partitore (es. 10 kΩ / 20 kΩ) o un traslatore di livello.");
          });
          if (m.pin.A0.V > d.Vlog + 0.3) add("err", c, "A0 oltre la tensione dell'ADC", "L'ADC accetta 0–" + d.Vlog + " V, qui " + fx(m.pin.A0.V, 2) + " V.", "Riduci con un partitore di tensione.");
          if (p.power === "vin" && m.vin > 0.5) { if (m.vin > d.vinAbs[1] || m.vin < d.vinAbs[0]) add("err", c, "Tensione VIN errata (" + fx(m.vin, 1) + " V)", d.name + " accetta su VIN " + d.vin[0] + "–" + d.vin[1] + " V (assoluti " + d.vinAbs[0] + "–" + d.vinAbs[1] + " V).", "Porta l'alimentazione nel range corretto o usa un regolatore."); else if (m.vin > d.vin[1] || m.vin < d.vin[0]) add("warn", c, "VIN fuori dal range consigliato", "Consigliati " + d.vin[0] + "–" + d.vin[1] + " V: " + (m.vin > d.vin[1] ? "il regolatore di bordo scalda" : "il regolatore non riesce a dare 5 V stabili") + ".", "Usa " + d.vin[0] + "–" + d.vin[1] + " V."); }
          if (p.power === "5v" && m.v5 > 5.6) add("err", c, "Pin 5V oltre 5,5 V", "Il pin 5V è collegato direttamente al chip: " + fx(m.v5, 1) + " V lo bruciano.", "Usa VIN o un regolatore a 5 V.");
          if (m.vlog < d.Vlog * 0.85 && (p.power !== "5v" || m.v5 > 0.5)) add("warn", c, "Alimentazione logica bassa (" + fx(m.vlog, 2) + " V)", "Sotto il " + (85) + "% della tensione nominale il microcontrollore si resetta (brown-out).", "Alimenta motori e servo da una fonte separata con massa in comune.");
          if (p.power === "usb" && m.Iusb > d.i5) add("warn", c, "USB oltre " + si(d.i5, "A"), "Dalla presa USB stai prendendo " + si(m.Iusb, "A") + ": interviene il fusibile ripristinabile.", "Alimenta i carichi (servo, motori, strisce LED) da un alimentatore esterno.");
          break;
        case "MOTOR": d = DCMOT[p.kind] || DCMOT.tt;
          if (m.stall) add("warn", c, "Motore bloccato (corrente di stallo " + si(m.Istall, "A") + ")", "La tensione non basta a vincere il carico: il motore non gira e assorbe V/R.", "Aumenta la tensione, riduci il carico o usa un riduttore.");
          if (Math.abs(m.V) > d.V * 1.3) add("warn", c, "Motore sovralimentato", "Nominale " + d.V + " V, ne riceve " + fx(Math.abs(m.V), 1) + ".", "Riduci la tensione o usa il PWM.");
          if (A > 0.01 && drivenBySwitch([c.n[0], c.n[1]]) && !hasAnti(c.n[0], c.n[1])) add("warn", c, "Manca il diodo di ricircolo sul motore", "Il motore è un'induttanza: allo spegnimento genera un picco che rompe transistor o MOSFET.", "Metti un 1N4007 (o uno Schottky SS34) in parallelo al motore, catodo verso il +.");
          break;
        case "SERVO": d = SERVOS[p.kind] || SERVOS.sg90; if (m.V < d.V[0] * 0.95 && m.V > 0.5) add("warn", c, "Servo sottoalimentato", "Vuole " + d.V[0] + "–" + d.V[1] + " V, ne ha " + fx(m.V, 2) + ": trema e perde coppia.", "Alimenta il servo da un 5–6 V capace di " + si(d.Istall, "A") + " di picco."); if (m.V > d.V[1] * 1.05) add("err", c, "Servo sovralimentato", "Massimo " + d.V[1] + " V, qui " + fx(m.V, 1) + ".", "Usa un BEC/buck a 5–6 V."); break;
        case "STEPDRV": d = DRIVERS[p.drv] || DRIVERS.A4988; var mt = STEPPERS[p.motor] || STEPPERS.nema17;
          if (p.Iset > d.Ipk) add("err", c, "Corrente impostata oltre il driver", d.name + " arriva a " + d.Ipk + " A di picco, impostati " + p.Iset + " A.", "Usa un driver più grande (DM542 fino a 4,2 A) o riduci la corrente.");
          else if (p.Iset > d.Icool) add("warn", c, "Driver senza dissipazione adeguata", "Oltre " + d.Icool + " A " + d.name + " va in protezione termica senza dissipatore e ventola.", "Metti dissipatore + ventola o scegli TMC2209/DM542.");
          if (p.Iset > mt.I * 1.1) add("warn", c, "Corrente sopra quella del motore", "Il motore è da " + mt.I + " A per fase, ne imposti " + p.Iset + ": scalda oltre 80 °C.", "Regola Vref per " + fx(mt.I * 0.9, 2) + " A (A4988: Vref = I × 8 × Rs, Rs = 0,068 Ω → " + fx(mt.I * 0.9 * 8 * 0.068, 2) + " V).");
          else if (p.Iset < mt.I * 0.5) add("info", c, "Coppia ridotta", "Con " + p.Iset + " A su " + mt.I + " A la coppia è circa il " + fx(100 * p.Iset / mt.I, 0) + "%.", "Aumenta la corrente fino al 70–90% del nominale.");
          if (m.Vm > d.Vmot[1]) add("err", c, "VMOT oltre il massimo del driver", "Max " + d.Vmot[1] + " V, qui " + fx(m.Vm, 1) + ".", "Abbassa l'alimentazione motori."); else if (m.Vm < d.Vmot[0] && m.Vm > 0.3) add("err", c, "VMOT troppo bassa", "Il driver vuole almeno " + d.Vmot[0] + " V.", "Alimenta il motore a 12–24 V.");
          if (m.Vdd < 2.5) add("warn", c, "Logica del driver non alimentata", "Il pin VDD (3,3–5 V) è scollegato.", "Collega VDD al 5 V o 3,3 V del microcontrollore.");
          if (p.sps > m.spsMax && m.Vm > 1) add("warn", c, "Il motore perde passi", "A " + p.sps + " passi/s la corrente non fa in tempo a salire (massimo ≈ " + fx(m.spsMax, 0) + " passi/s con " + fx(m.Vm, 0) + " V).", "Alza VMOT (24 V), riduci la velocità o usa rampe di accelerazione.");
          break;
        case "ACDRIVE": d = ACDRV[p.kind] || ACDRV.ac400; if (Math.abs(m.V) > 20 && Math.abs(Math.abs(m.V) - d.Vin) > 0.15 * d.Vin) add("err", c, "Tensione di alimentazione errata", d.name + " vuole " + d.Vin + " V, collegato a " + fx(Math.abs(m.V), 0) + " V.", d.Vin === 400 ? "Serve la linea trifase 400 V o un inverter con ingresso monofase 230 V." : "Usa la rete 230 V monofase.");
          if (p.load > 1) add("warn", c, "Motore in sovraccarico", "Carico " + fx(p.load * 100, 0) + "% del nominale.", "Scegli una taglia più grande."); break;
      }
    });
    var order = { err: 0, warn: 1, info: 2 };
    return out.sort(function (a, b) { return order[a.sev] - order[b.sev]; });
  }
  function pRating(P) { var L = [0.125, 0.25, 0.5, 1, 2, 3, 5, 10, 25, 50, 100]; for (var i = 0; i < L.length; i++) if (L[i] >= P) return L[i]; return 100; }
  function nearestE(v, ser) { ser = ser || E24; var e = Math.floor(Math.log10(v)), best = null; [-1, 0, 1].forEach(function (k) { ser.forEach(function (b) { var c = Number((b * Math.pow(10, e + k)).toPrecision(3)); if (best === null || Math.abs(Math.log(c / v)) < Math.abs(Math.log(best / v))) best = c; }); }); return best; }
  function nextE(v, ser) { ser = ser || E12; if (!(v > 0)) return ser[0]; var e = Math.floor(Math.log10(v)); for (var k = 0; k < 3; k++) for (var i = 0; i < ser.length; i++) { var c = Number((ser[i] * Math.pow(10, e + k)).toPrecision(3)); if (c >= v * 0.999) return c; } return v; }
  var calc = {
    ohm: function (o) { var V = o.V, I = o.I, R = o.R; if (V == null) V = I * R; else if (I == null) I = V / R; else if (R == null) R = V / I; return { V: V, I: I, R: R, P: V * I }; },
    ledResistor: function (Vs, Vf, I) { var R = (Vs - Vf) / I; if (!(R > 0)) return { err: "La tensione di alimentazione deve superare la Vf del LED." }; var Rs = nextE(R), Ir = (Vs - Vf) / Rs, Pw = Ir * Ir * Rs; return { R: R, Rstd: Rs, I: Ir, P: Pw, Prated: pRating(Pw * 2), bands: bands(Rs, 5) }; },
    divider: function (Vin, R1, R2, Rload) { var R2e = Rload ? R2 * Rload / (R2 + Rload) : R2, Vo = Vin * R2e / (R1 + R2e); return { Vout: Vo, I: Vin / (R1 + R2e), ratio: R2e / (R1 + R2e), Rth: R1 * R2e / (R1 + R2e) }; },
    designDivider: function (Vin, Vout, R1) { R1 = R1 || 10000; var R2 = R1 * Vout / (Vin - Vout), R2s = nearestE(R2); return { R1: R1, R2: R2, R2std: R2s, Vreal: Vin * R2s / (R1 + R2s) }; },
    rc: function (R, C) { var tau = R * C; return { tau: tau, t63: tau, t99: 5 * tau, fc: 1 / (2 * Math.PI * tau), vAt: function (Vs, t) { return Vs * (1 - Math.exp(-t / tau)); } }; },
    t555: function (R1, R2, C) { var f = 1.44 / ((R1 + 2 * R2) * C); return { f: f, T: 1 / f, duty: (R1 + R2) / (R1 + 2 * R2), th: 0.693 * (R1 + R2) * C, tl: 0.693 * R2 * C }; },
    power: function (V, I) { return { P: V * I }; },
    baseResistor: function (Vdrive, Ic, beta, Vbe) { var Ib = Ic / 10, R = (Vdrive - (Vbe || 0.7)) / Ib; return { Ib: Ib, R: R, Rstd: nearestE(R, E12), forced: 10, betaMin: beta }; },
    vref: function (I, Rs) { Rs = Rs || 0.068; return { A4988: I * 8 * Rs, DRV8825: I / 2, TMC2209: I * 1.41 * 0.11 / 0.325 * 2.5 / 2.5 }; },
    nearestE: nearestE, nextE: nextE, bands: bands, pRating: pRating
  };
  function C(id, t, p, nodes, x, y, r) { return { id: id, t: t, p: p || {}, nodes: nodes, x: x, y: y, r: r || 0 }; }
  var EXAMPLES = [
    { id: "led", n: "LED con resistenza", d: "5 V → 150 Ω → LED rosso: I = (5 − 2) / 158 Ω ≈ 19 mA.", comps: [C("V1", "V", { V: 5, Ilim: 1 }, ["vcc", "0"], 2, 6), C("R1", "R", { R: 150 }, ["vcc", "a"], 6, 2), C("D1", "LED", { color: "rosso" }, ["a", "0"], 10, 4), C("G", "GND", {}, ["0"], 6, 8)] },
    { id: "ledko", n: "Errore: LED senza resistenza", d: "Il LED collegato direttamente a 5 V si brucia.", comps: [C("V1", "V", { V: 5, Ilim: 1 }, ["vcc", "0"], 2, 6), C("D1", "LED", { color: "verde" }, ["vcc", "0"], 8, 2), C("G", "GND", {}, ["0"], 5, 8)] },
    { id: "div", n: "Partitore di tensione", d: "12 V con 10 kΩ / 4,7 kΩ → 3,84 V.", comps: [C("V1", "V", { V: 12, Ilim: 1 }, ["vcc", "0"], 2, 6), C("R1", "R", { R: 10000 }, ["vcc", "out"], 6, 2), C("R2", "R", { R: 4700 }, ["out", "0"], 10, 4, 1), C("G", "GND", {}, ["0"], 6, 8)] },
    { id: "rc", n: "Carica RC (τ = 1 s)", d: "10 kΩ × 100 µF: dopo 1 s il condensatore è al 63% (3,16 V). Prova l'oscilloscopio.", tran: { tEnd: 5, probes: ["c"] }, comps: [C("V1", "V", { V: 5, Ilim: 1 }, ["vcc", "0"], 2, 6), C("R1", "R", { R: 10000 }, ["vcc", "c"], 6, 2), C("C1", "C", { C: 100e-6, Vmax: 16 }, ["c", "0"], 10, 4, 1), C("G", "GND", {}, ["0"], 6, 8)] },
    { id: "npnmot", n: "Motore DC con transistor", d: "2N2222 come interruttore, diodo di ricircolo 1N4007 sul motore.", comps: [C("V1", "V", { V: 6, Ilim: 2 }, ["vcc", "0"], 1, 5), C("S1", "SW", { on: true }, ["vcc", "sw"], 4, 1), C("R1", "R", { R: 470 }, ["sw", "b"], 8, 1), C("M1", "MOTOR", { kind: "tt" }, ["vcc", "c"], 12, 3, 1), C("D1", "D", { kind: "1N4007" }, ["c", "vcc"], 15, 3, 1), C("Q1", "NPN", { kind: "2N2222" }, ["b", "c", "0"], 10, 8), C("G", "GND", {}, ["0"], 6, 10)] },
    { id: "arduled", n: "Arduino: LED sul pin 13", d: "Pin D13 alto (5 V) → 220 Ω → LED: ≈ 11 mA, sotto i 20 mA consigliati.", comps: [C("U1", "MCU", { board: "uno", power: "usb", D13: "H", D9: "L", D2: "IN" }, ["vin", "5v", "3v3", "0", "d13", "d9", "d2", "a0"], 1, 2), C("R1", "R", { R: 220 }, ["d13", "a"], 10, 2), C("D1", "LED", { color: "rosso" }, ["a", "0"], 14, 4), C("G", "GND", {}, ["0"], 8, 9)] },
    { id: "step", n: "Stepper NEMA 17 + A4988", d: "12 V per VMOT, 5 V dall'Arduino per la logica. Corrente 1 A per fase.", comps: [C("V1", "V", { V: 12, Ilim: 3 }, ["vm", "0"], 1, 6), C("U1", "MCU", { board: "uno", power: "usb", D13: "L", D9: "PWM", D2: "IN" }, ["vin", "5v", "3v3", "0", "d13", "d9", "d2", "a0"], 1, 1), C("M1", "STEPDRV", { drv: "A4988", motor: "nema17", Iset: 1.0, sps: 800 }, ["vm", "0", "5v"], 11, 4), C("G", "GND", {}, ["0"], 7, 10)] },
    { id: "555", n: "NE555 lampeggiatore", d: "R1 10 kΩ, R2 68 kΩ, C 10 µF → f ≈ 0,99 Hz. Avvia la simulazione nel tempo.", tran: { tEnd: 4, probes: ["out"] }, comps: [C("V1", "V", { V: 9, Ilim: 1 }, ["vcc", "0"], 1, 4), C("U1", "NE555", { R1: 10000, R2: 68000, C: 10e-6 }, ["vcc", "0", "out"], 5, 3), C("R1", "R", { R: 470 }, ["out", "a"], 10, 2), C("D1", "LED", { color: "giallo" }, ["a", "0"], 14, 4), C("G", "GND", {}, ["0"], 7, 9)] },
    { id: "reg", n: "Regolatore 7805 da batteria 9 V", d: "Il lineare dissipa (Vin − Vout) × I: guarda la temperatura stimata.", comps: [C("B1", "BAT", { kind: "9v" }, ["bat", "0"], 1, 4), C("U1", "REG", { kind: "7805" }, ["bat", "0", "5v"], 5, 3), C("C1", "C", { C: 10e-6, Vmax: 16 }, ["5v", "0"], 9, 5, 1), C("R1", "R", { R: 100, P: 0.5 }, ["5v", "0"], 12, 5, 1), C("G", "GND", {}, ["0"], 7, 9)] },
    { id: "relay", n: "Relè con transistor e lampada 12 V", d: "Il pin dell'Arduino pilota un BC547 che eccita il relè; i contatti accendono la lampada.", comps: [C("U1", "MCU", { board: "nano", power: "usb", D13: "H", D9: "L", D2: "IN" }, ["vin", "5v", "3v3", "0", "d13", "d9", "d2", "a0"], 1, 1), C("R1", "R", { R: 1000 }, ["d13", "b"], 9, 1), C("Q1", "NPN", { kind: "BC547" }, ["b", "k", "0"], 12, 6), C("K1", "RELAY", { Vcoil: 5, Rcoil: 70, Imax: 10 }, ["5v", "k", "com", "lamp"], 15, 2), C("D1", "D", { kind: "1N4148" }, ["k", "5v"], 19, 1, 1), C("V2", "V", { V: 12, Ilim: 2 }, ["com", "0"], 22, 5), C("L1", "LAMP", { V: 12, P: 5 }, ["lamp", "0"], 18, 7, 1), C("G", "GND", {}, ["0"], 8, 10)] },
    { id: "opamp", n: "Operazionale non invertente (×2)", d: "LM358 con Rf = Rg = 10 kΩ: guadagno 2. Gira il potenziometro.", comps: [C("V1", "V", { V: 12, Ilim: 1 }, ["vcc", "0"], 1, 5), C("P1", "POT", { R: 10000, pos: 0.8 }, ["vcc", "in", "0"], 5, 3), C("U1", "OPAMP", { kind: "LM358" }, ["in", "fb", "out", "vcc", "0"], 10, 3), C("R1", "R", { R: 10000 }, ["out", "fb"], 14, 1), C("R2", "R", { R: 10000 }, ["fb", "0"], 8, 7, 1), C("R3", "R", { R: 10000 }, ["out", "0"], 17, 5, 1), C("G", "GND", {}, ["0"], 8, 10)] },
    { id: "ac", n: "Servo AC industriale 750 W", d: "Rete 230 V → fusibile 6 A → azionamento. Corrente ≈ P / (V × cosφ).", comps: [C("N1", "MAINS", { V: 230 }, ["l", "0"], 1, 4), C("F1", "FUSE", { In: 6 }, ["l", "lf"], 5, 2), C("M1", "ACDRIVE", { kind: "ac750", load: 0.8 }, ["lf", "0"], 10, 4), C("G", "GND", {}, ["0"], 5, 8)] },
    { id: "mosko", n: "Errore: MOSFET non logic level su ESP32", d: "IRF540N pilotato a 3,3 V: rimane semi-acceso e scalda.", comps: [C("U1", "MCU", { board: "esp32", power: "usb", D13: "H", D9: "L", D2: "IN" }, ["vin", "5v", "3v3", "0", "g", "d9", "d2", "a0"], 1, 1), C("V1", "V", { V: 12, Ilim: 5 }, ["vm", "0"], 18, 6), C("M1", "MOTOR", { kind: "775", TL: 0.02 }, ["vm", "dr"], 14, 2, 1), C("D1", "D", { kind: "SS34" }, ["dr", "vm"], 17, 2, 1), C("Q1", "NMOS", { kind: "IRF540N" }, ["g", "dr", "0"], 12, 6), C("G", "GND", {}, ["0"], 8, 10)] },
    { id: "short", n: "Errore: cortocircuito con fusibile", d: "Chiudi l'interruttore: il fusibile da 0,5 A interviene.", comps: [C("V1", "V", { V: 12, Ilim: 5 }, ["vcc", "0"], 1, 4), C("F1", "FUSE", { In: 0.5 }, ["vcc", "f"], 5, 2), C("S1", "SW", { on: true, Imax: 10 }, ["f", "0"], 10, 4, 1), C("G", "GND", {}, ["0"], 5, 8)] },
    { id: "l298", n: "Motore 12 V con L298N", d: "IN1 alto e IN2 basso dall'Arduino: il motore gira; il ponte perde circa 2–3 V.", comps: [C("U1", "MCU", { board: "uno", power: "usb", D13: "H", D9: "L", D2: "IN" }, ["vin", "5v", "3v3", "0", "in1", "in2", "d2", "a0"], 1, 1), C("V1", "V", { V: 12, Ilim: 3 }, ["vs", "0"], 10, 8), C("U2", "L298", {}, ["vs", "0", "in1", "in2", "o1", "o2"], 11, 2), C("M1", "MOTOR", { kind: "jgb37", TL: 0.05 }, ["o1", "o2"], 17, 3, 1), C("G", "GND", {}, ["0"], 7, 10)] }
  ];
  /* ---- disposizione sulla tavola: impronte, piedini, fili → elenco dei nodi ---- */
  var LINE3 = { POT: 1, NPN: 1, NMOS: 1, REG: 1, NE555: 1, SERVO: 1, STEPDRV: 1 };
  function footprint(t) {
    var T = TYPES[t], n = T.pins.length, pins = [];
    if (t === "GND") return { pins: [{ x: 0, y: 0 }], box: [-1, 0, 1, 1.4] };
    if (n === 2) return { pins: [{ x: 0, y: 0 }, { x: 4, y: 0 }], box: [0.6, -1, 3.4, 1] };
    if (LINE3[t]) return { pins: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 4, y: 0 }], box: [-0.6, -2.4, 4.6, -0.4] };
    var L = Math.ceil(n / 2);
    for (var i = 0; i < n; i++) pins.push(i < L ? { x: 0, y: 2 * i } : { x: 6, y: 2 * (i - L) });
    return { pins: pins, box: [1, -1, 5, 2 * (L - 1) + 1] };
  }
  function rot(p, r) { r = ((r || 0) % 4 + 4) % 4; return r === 0 ? { x: p.x, y: p.y } : r === 1 ? { x: -p.y, y: p.x } : r === 2 ? { x: -p.x, y: -p.y } : { x: p.y, y: -p.x }; }
  function pinPos(c) { return footprint(c.t).pins.map(function (p) { var q = rot(p, c.r); return { x: c.x + q.x, y: c.y + q.y }; }); }
  function netlist(L, opt) {
    opt = opt || {}; var par = {};
    function key(x, y) { return Math.round(x) + "," + Math.round(y); }
    function find(k) { if (par[k] === undefined) par[k] = k; while (par[k] !== k) { par[k] = par[par[k]]; k = par[k]; } return k; }
    function uni(a, b) { a = find(a); b = find(b); if (a !== b) par[a] = b; }
    var pk = {};
    L.comps.forEach(function (c) { pk[c.id] = pinPos(c).map(function (p) { var k = key(p.x, p.y); find(k); return k; }); });
    (L.wires || []).forEach(function (w) { uni(key(w.a[0], w.a[1]), key(w.b[0], w.b[1])); });
    var J = opt.joints || null, extra = [];
    if (J) L.comps.forEach(function (c) { if (c.t === "GND") return; pk[c.id].forEach(function (k, j) { var s = J[c.id + ":" + j]; if (s === "bridge") { var o = pk[c.id][j + 1 < pk[c.id].length ? j + 1 : j - 1]; if (o) uni(k, o); } }); });
    var gnd = {}; L.comps.forEach(function (c) { if (c.t === "GND") gnd[find(pk[c.id][0])] = 1; });
    var names = {}, cnt = 0;
    function nm(k) { var r = find(k); if (gnd[r]) return "0"; if (!names[r]) names[r] = "n" + (++cnt); return names[r]; }
    var comps = L.comps.map(function (c) {
      var nodes = pk[c.id].map(function (k, j) {
        var net = nm(k); if (!J || c.t === "GND") return net;
        var s = J[c.id + ":" + j];
        if (!s || s === "none" || s === "burnt") return "open_" + c.id + "_" + j;
        if (s === "cold") { var cn = "cj_" + c.id + "_" + j; extra.push({ id: "_cj_" + c.id + "_" + j, t: "R", p: { R: 33, P: 1 }, nodes: [cn, net], hidden: true }); return cn; }
        return net;
      });
      return { id: c.id, t: c.t, p: c.p, nodes: nodes };
    });
    var keyNode = {}; Object.keys(par).forEach(function (k) { keyNode[k] = nm(k); });
    return { comps: comps.concat(extra), keyNode: keyNode, pinKeys: pk };
  }
  function autoWire(comps) {
    var nets = {}, wires = [], all = [];
    comps.forEach(function (c) { pinPos(c).forEach(function (p, j) { var n = c.nodes[j]; (nets[n] = nets[n] || []).push(p); all.push({ x: p.x, y: p.y, n: n }); }); });
    function onSeg(p, x1, y1, x2, y2) { if (x1 === x2) return p.x === x1 && p.y > Math.min(y1, y2) && p.y < Math.max(y1, y2); return p.y === y1 && p.x > Math.min(x1, x2) && p.x < Math.max(x1, x2); }
    function crosses(a, b, n) { return all.some(function (p) { if (p.n === n) return false; if (p.x === b.x && p.y === a.y && !(a.x === b.x || a.y === b.y)) return true; return onSeg(p, a.x, a.y, b.x, a.y) || onSeg(p, b.x, a.y, b.x, b.y); }); }
    Object.keys(nets).forEach(function (n) {
      var ps = nets[n].slice().sort(function (a, b) { return a.x - b.x || a.y - b.y; }), seen = {};
      ps = ps.filter(function (p) { var k = p.x + "," + p.y; if (seen[k]) return false; seen[k] = 1; return true; });
      for (var i = 1; i < ps.length; i++) {
        var a = ps[i - 1], b = ps[i];
        // percorso a "L" (prima orizzontale da a): se passa sopra un pin di un'altra rete, parti dall'altro capo
        if (crosses(a, b, n) && !crosses(b, a, n)) { var t = a; a = b; b = t; }
        wires.push({ a: [a.x, a.y], b: [b.x, b.y] });
      }
    });
    return wires;
  }
  function fromExample(ex) {
    var comps = ex.comps.map(function (c) { return { id: c.id, t: c.t, p: JSON.parse(JSON.stringify(c.p || {})), x: c.x, y: c.y, r: c.r || 0, nodes: c.nodes }; });
    var w = autoWire(comps); comps.forEach(function (c) { delete c.nodes; });
    return { name: ex.n, comps: comps, wires: w, tran: ex.tran || null };
  }
  var CIR = { TYPES: TYPES, R_VALUES: R_VALUES, E12: E12, E24: E24, C_CER: C_CER, C_ELE: C_ELE, C_V: C_V, LED_COL: LED_COL, DIODES: DIODES, BJT: BJT, MOS: MOS, MCUS: MCUS, REGS: REGS, DRIVERS: DRIVERS, STEPPERS: STEPPERS, DCMOT: DCMOT, SERVOS: SERVOS, ACDRV: ACDRV, BATS: BATS,
    bands: bands, si: si, fx: fx, params: params, ldrR: ldrR, ntcR: ntcR, solve: solve, tran: tran, check: check, calc: calc, EXAMPLES: EXAMPLES, COLHEX: COLHEX, footprint: footprint, pinPos: pinPos, netlist: netlist, autoWire: autoWire, fromExample: fromExample, rot: rot };
  if (node) module.exports = CIR; else root.CIR = CIR;
})(typeof window !== "undefined" ? window : this);
