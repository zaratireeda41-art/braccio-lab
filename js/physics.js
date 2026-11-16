/* Braccio Lab · Area di assemblaggio – fisica del braccio composto: masse, baricentro, inerzie, coppie ai giunti
   (stessi modelli di engine.js: rendimento e torsione dei riduttori, sezioni dei link), flessione e tensioni,
   bulloneria con precarico reale, cablaggio, collisioni e simulazione nel tempo. Browser: window.PHY · Node: require. */
(function (root) {
  "use strict";
  var node = typeof module !== "undefined" && module.exports;
  var CAT = node ? require("./catalog.js") : root.CAT, ENG = node ? require("./engine.js") : root.ENG, MET = node ? require("./metals.js") : root.MET;
  var g = 9.81, MU = 0.12, KINDS = { 3: ["yaw", "pitch", "pitch"], 4: ["yaw", "pitch", "pitch", "pitch"], 5: ["yaw", "pitch", "pitch", "pitch", "roll"], 6: ["yaw", "pitch", "pitch", "roll", "pitch", "roll"] };
  function f(x, d) { return ENG ? ENG.fmt(x, d) : String(Math.round(x * 100) / 100); }
  function by(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return list[0]; }
  var EF = { "Acciai da costruzione": 210, "Acciai da bonifica": 210, "Acciai inossidabili": 193, "Ghise": 110, "Leghe di alluminio": 70, "Rame e leghe": 110, "Titanio": 114, "Metalli pesanti": 360 };
  function material(id) {
    var c = CAT && CAT.MATERIALS.filter(function (m) { return m.id === id; })[0]; if (c) return { id: id, n: c.name, rho: c.rho, E: c.E, Re: c.Re };
    var m = MET && MET.get(id); if (m) return { id: id, n: m.n, rho: m.rho, E: id === "pb" ? 16 : id === "w" ? 411 : EF[m.g] || 200, Re: Math.round(m.Rm * (/al|ti/.test(id) ? 0.85 : 0.6)) };
    return { id: "s235", n: "Acciaio S235", rho: 7850, E: 210, Re: 235 };
  }
  // barre a magazzino (sempre disponibili) – misure commerciali reali
  var STOCK = [
    { id: "st_rt4040", n: "Tubo quadro 40×40×3 S235", metal: "s235", sec: "rtube", B: 40, H: 40, t: 3, L: 300 },
    { id: "st_rt6040", n: "Tubo rettangolare 60×40×3 S355", metal: "s355", sec: "rtube", B: 40, H: 60, t: 3, L: 350 },
    { id: "st_al50", n: "Tubo tondo Ø50×4 Al 6082-T6", metal: "al6082", sec: "tube", D: 50, t: 4, L: 300 },
    { id: "st_al60", n: "Tubo tondo Ø60×5 Al 6082-T6", metal: "al6082", sec: "tube", D: 60, t: 5, L: 400 },
    { id: "st_alr", n: "Piatto 50×12 Al 6082-T6", metal: "al6082", sec: "rect", B: 12, H: 50, L: 250 },
    { id: "st_7075", n: "Tubo quadro 50×50×4 Ergal 7075", metal: "al7075", sec: "rtube", B: 50, H: 50, t: 4, L: 300 },
    { id: "st_col", n: "Colonna tubo Ø80×5 S355", metal: "s355", sec: "tube", D: 80, t: 5, L: 250 },
    { id: "st_ti", n: "Tubo tondo Ø40×2 titanio Gr5", metal: "ti5", sec: "tube", D: 40, t: 2, L: 300 },
    { id: "st_short", n: "Tondo Ø40 C45 (polso corto)", metal: "c45", sec: "round", D: 40, L: 80 }
  ];
  function partProps(p) {
    var mat = material(p.metal), s = ENG.section({ sec: p.sec, D: p.D, t: p.t, B: p.B, H: p.H });
    var L = Math.max(1, +p.L || 100); return { mat: mat, s: s, L: L, kgm: mat.rho * s.A * 1e-6, mass: mat.rho * s.A * 1e-6 * L / 1000, EI: mat.E * 1e3 * s.I, r: Math.max(s.h || 20, (+p.B || 0)) / 2000 };
  }
  // parte tagliata nel Mio spazio → descrittore geometrico
  function fromSpace(sp) {
    if (!sp) return null; if (sp.sec) return { id: "sp_" + (sp.t || 0), src: "space", n: sp.n, metal: sp.metalId || sp.metal || "s235", sec: sp.sec, D: sp.D, t: sp.tw != null ? sp.tw : sp.t2, B: sp.B, H: sp.H, L: sp.L, when: sp.t };
    var m = /Ø\s*([\d.,]+)/.exec(sp.n || ""), L = /×\s*([\d.,]+)\s*mm/.exec(sp.n || ""), D = m ? parseFloat(m[1].replace(",", ".")) : 20;
    var mid = MET ? (MET.METALS.filter(function (x) { return x.n === sp.metal; })[0] || {}).id : null;
    return { id: "sp_" + (sp.t || 0), src: "space", n: sp.n, metal: sp.metalId || mid || "s235", sec: "round", D: sp.Dmax || D, L: sp.L || (L ? parseFloat(L[1].replace(",", ".")) : 100), when: sp.t };
  }
  function boltData(size, cls) { var B = by(CAT.BOLTS.map(function (b) { b.id = b.s; return b; }), size), C = by(CAT.BOLT_CLASSES, cls); return { B: B, C: C, MA: B.MA[C.i], FM: B.FM[C.i] * 1000 }; }
  function frameOf(R, M) { return R && R.frames ? R.frames[1] : M.frame || 42; }
  function suggestBolts(kind, R, M) { if (kind === "base") return { size: "M10", cls: "8.8", n: 4 }; if (kind === "eff") return { size: "M5", cls: "8.8", n: 4 }; var fr = frameOf(R, M); return fr <= 45 ? { size: "M4", cls: "8.8", n: 4 } : fr <= 60 ? { size: "M5", cls: "10.9", n: 6 } : fr <= 90 ? { size: "M6", cls: "10.9", n: 8 } : fr <= 130 ? { size: "M8", cls: "10.9", n: 12 } : { size: "M10", cls: "12.9", n: 12 }; }
  var DEFJ = [
    { motor: "ac400", reducer: "rv6e", ratio: 79, driver: "b3a" },
    { motor: "ac750", reducer: "rv20e", ratio: 121, driver: "b3a" },
    { motor: "ac400", reducer: "rv6e", ratio: 103, driver: "b3a" },
    { motor: "n23b", reducer: "csf20", ratio: 100, driver: "dm542" },
    { motor: "n23a", reducer: "csf14", ratio: 100, driver: "dm542" },
    { motor: "n17b", reducer: "csf14", ratio: 50, driver: "tmc2209" }
  ];
  var DEFL = ["st_col", "st_rt6040", "st_al60", "st_short", "st_short", "st_short"];
  function defaults(axes) {
    axes = Math.max(3, Math.min(6, +axes || 4));
    var J = []; for (var i = 0; i < axes; i++) { var d = DEFJ[i], R = by(CAT.REDUCERS, d.reducer), M = by(CAT.MOTORS, d.motor); J.push({ motor: d.motor, reducer: d.reducer, ratio: d.ratio, driver: d.driver, mounted: false, bolts: suggestBolts("j", R, M), tq: null, link: null, lbolts: suggestBolts("l", R, M), ltq: null, wire: { mot: "", pow: "", sig: "" } }); }
    return { v: 1, axes: axes, base: { mounted: false, bolts: suggestBolts("base"), tq: null }, J: J, eff: { id: "grip", mounted: false, bolts: suggestBolts("eff"), tq: null }, ctrl: { src: "bench", mcu: "esp32", mounted: false }, psu: "p48a", estop: false, payload: 1, speed: 60, tacc: 0.5, ppe: false };
  }
  function linkPart(L, stockList) { if (!L) return null; return L; }
  /* cinematica diretta: posizioni dei giunti (m) in 3D. Y verso l'alto. */
  function fk(asm, q) {
    var kinds = KINDS[asm.axes], P = [[0, 0, 0]], dir = [0, 1, 0], yaw = q[0] || 0, pitch = 0, pos = [0, 0.12, 0], out = { joints: [], links: [] };
    out.joints.push([0, 0.12, 0]);
    for (var i = 0; i < asm.axes; i++) {
      var L = asm.J[i].link ? partProps(asm.J[i].link).L / 1000 : 0.05;
      if (i > 0 && kinds[i] === "pitch") pitch += q[i] || 0;
      // link 0: colonna verticale; gli altri seguono l'angolo di beccheggio cumulato (0 = orizzontale)
      var d = i === 0 ? [0, 1, 0] : [Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), -Math.cos(pitch) * Math.sin(yaw)];
      var a = pos.slice(), b = [pos[0] + d[0] * L, pos[1] + d[1] * L, pos[2] + d[2] * L];
      out.links.push({ a: a, b: b, L: L, d: d }); pos = b; out.joints.push(b.slice());
    }
    var e = by(CAT.EFFECTORS, asm.eff.id), eL = asm.eff.mounted ? e.L : 0, d2 = out.links.length ? out.links[out.links.length - 1].d : [1, 0, 0];
    if (asm.axes > 0 && out.links.length === 1) d2 = [Math.cos(yaw), 0, -Math.sin(yaw)];
    out.tcp = [pos[0] + d2[0] * eL, pos[1] + d2[1] * eL, pos[2] + d2[2] * eL];
    return out;
  }
  function motorTorque(M) { var hob = M.type === "servo_hobby"; if (hob) return { Tn: 0.5 * M.Tstall, Tpk: 0.8 * M.Tstall }; if (M.type === "stepper" || M.type === "stepper_cl") return { Tn: M.Th * 0.7, Tpk: M.Th * (M.type === "stepper_cl" ? 1 : 0.85) }; return { Tn: M.Tn, Tpk: M.Tpk }; }
  function motorSpeed(M) { return M.type === "servo_hobby" ? M.degps / 6 : M.nMax || M.nN || (M.type === "ac" ? 3000 : M.type === "bldc" ? 3000 : M.type === "dc" ? 3000 : 1000); }
  function masses(asm, ctx) {
    // elenco masse puntiformi (kg) con posizione per la posa q
    var it = [];
    return it;
  }
  function jointMass(j) { var M = by(CAT.MOTORS, j.motor), R = by(CAT.REDUCERS, j.reducer); return { M: M, R: R, m: M.mass + R.mass + 0.15 * (M.mass + R.mass) + 0.1 }; }
  /* stato statico/dinamico per una posa q, velocità w e accelerazione a (rad, rad/s, rad/s²) */
  function loads(asm, q, a, ctx) {
    var K = fk(asm, q), kinds = KINDS[asm.axes], n = asm.axes, pts = [];
    for (var i = 0; i < n; i++) {
      var j = asm.J[i], jm = jointMass(j);
      if (j.mounted) pts.push({ m: jm.m, p: K.joints[i], k: i, what: "J" + (i + 1) });
      if (j.link) { var pp = partProps(j.link), A = K.links[i].a, B = K.links[i].b; pts.push({ m: pp.mass, p: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2], k: i, link: true, Icg: pp.mass * pp.L * pp.L / 12e6, what: "L" + (i + 1) }); }
    }
    var e = by(CAT.EFFECTORS, asm.eff.id); if (asm.eff.mounted) { pts.push({ m: e.mass, p: K.tcp, k: n, what: "pinza" }); if (asm.payload > 0) pts.push({ m: +asm.payload, p: K.tcp, k: n, what: "carico" }); }
    var mt = 0, com = [0, 0, 0]; pts.forEach(function (x) { mt += x.m; com[0] += x.m * x.p[0]; com[1] += x.m * x.p[1]; com[2] += x.m * x.p[2]; }); if (mt > 0) com = com.map(function (v) { return v / mt; });
    var T = [];
    for (var i2 = 0; i2 < n; i2++) {
      var O = K.joints[i2], down = pts.filter(function (x) { return x.k > i2 || (x.k === i2 && x.link) || (x.k === i2 && !x.link && false); }), tg = 0, I = 0;
      if (kinds[i2] === "pitch") down.forEach(function (x) { var dx = Math.hypot(x.p[0] - O[0], x.p[2] - O[2]); tg += x.m * g * dx; var r2 = Math.pow(x.p[0] - O[0], 2) + Math.pow(x.p[1] - O[1], 2) + Math.pow(x.p[2] - O[2], 2); I += x.m * r2 + (x.Icg || 0); });
      else if (kinds[i2] === "yaw") down.forEach(function (x) { var r2 = Math.pow(x.p[0] - O[0], 2) + Math.pow(x.p[2] - O[2], 2); I += x.m * r2 + (x.Icg || 0) * 0.5; });
      else down.forEach(function (x) { I += x.m * 0.0012; });
      T.push({ tg: tg, I: I, td: I * Math.abs(a[i2] || 0), M: tg });
    }
    return { K: K, pts: pts, mass: mt, com: com, T: T };
  }
  function boltState(b, tq) {
    var d = boltData(b.size, b.cls), st = !tq ? "none" : tq.state || "none", k = !tq ? 0 : /spanata|nofit/.test(st) || tq.strip ? 0 : /snervata/.test(st) ? 0.55 : Math.max(0, Math.min(1.1, tq.ratio || (tq.sev === "ok" ? 1 : 0.6)));
    return { d: d, st: st, F: d.FM * k * b.n, k: k };
  }
  function segDist(p1, q1, p2, q2) { // distanza minima tra due segmenti 3D
    var d1 = [q1[0] - p1[0], q1[1] - p1[1], q1[2] - p1[2]], d2 = [q2[0] - p2[0], q2[1] - p2[1], q2[2] - p2[2]], r = [p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]];
    var dot = function (u, v) { return u[0] * v[0] + u[1] * v[1] + u[2] * v[2]; }, a = dot(d1, d1), e = dot(d2, d2), ff = dot(d2, r), s, t;
    if (a < 1e-9 && e < 1e-9) return Math.sqrt(dot(r, r)); var c = dot(d1, r), b = dot(d1, d2), den = a * e - b * b;
    s = den > 1e-9 ? Math.max(0, Math.min(1, (b * ff - c * e) / den)) : 0; t = (b * s + ff) / e; if (t < 0) { t = 0; s = Math.max(0, Math.min(1, -c / a)); } else if (t > 1) { t = 1; s = Math.max(0, Math.min(1, (b - c) / a)); }
    var dx = [p1[0] + d1[0] * s - p2[0] - d2[0] * t, p1[1] + d1[1] * s - p2[1] - d2[1] * t, p1[2] + d1[2] * s - p2[2] - d2[2] * t]; return Math.sqrt(dot(dx, dx));
  }
  function busOf(D) { return D.bus || []; }
  /* verifica completa del montaggio (posa peggiore: braccio orizzontale teso) */
  function evaluate(asm, ctx) {
    ctx = ctx || {}; var iss = [], n = asm.axes, kinds = KINDS[n];
    function add(sev, cat, slot, t, why, fix, calc) { iss.push({ sev: sev, cat: cat, slot: slot, t: t, why: why, fix: fix || "", calc: calc || "" }); }
    // montaggio e bulloneria
    if (!asm.base.mounted) add("err", "montaggio", "base", "Basamento non montato", "Senza basamento fissato al banco il braccio si ribalta appena si allunga.", "Monta il basamento e serra le 4 viti M10 sul tavolo.");
    else if (!asm.base.tq) add("err", "bulloni", "base", "Viti del basamento non serrate", "Il basamento appoggia ma non è fissato: il momento ribaltante lo solleva.", "Serra le viti " + asm.base.bolts.size + " con il dinamometrico.");
    var w = Math.PI / 180 * (asm.speed || 60), al = w / Math.max(0.1, asm.tacc || 0.5), qH = []; for (var i = 0; i < n; i++) qH.push(0);
    var LD = loads(asm, qH, qH.map(function () { return al; }), ctx), J = [], tip = 0, posTip = 0;
    for (var k = 0; k < n; k++) {
      var j = asm.J[k], jm = jointMass(j), M = jm.M, R = jm.R, tag = "J" + (k + 1), ratio = R.ratios.indexOf(+j.ratio) >= 0 ? +j.ratio : R.ratios[0], eta = ENG.etaOf(R, ratio), mT = motorTorque(M);
      var o = { k: k, tag: tag, M: M, R: R, i: ratio, eta: eta, tg: LD.T[k].tg, td: LD.T[k].td, I: LD.T[k].I };
      o.treq = o.tg + o.td; o.tavail = mT.Tpk * ratio * eta; o.tcont = mT.Tn * ratio * eta; o.util = o.treq / Math.max(1e-6, Math.min(o.tavail, R.Tacc)); J.push(o);
      if (!j.mounted) { add("err", "montaggio", tag, tag + ": motore e riduttore non montati", "Il giunto è vuoto: niente muove il link successivo.", "Tocca lo slot " + tag + " e monta il gruppo motore + riduttore."); continue; }
      if (!j.tq) add("err", "bulloni", tag, tag + ": viti della flangia non serrate", "Il riduttore è appoggiato ma non fissato alla struttura: alla prima accelerazione ruota su se stesso.", "Serra " + j.bolts.n + "× " + j.bolts.size + " " + j.bolts.cls + " a " + f(boltData(j.bolts.size, j.bolts.cls).MA, 1) + " N·m in croce.");
      else { var bs = boltState(j.bolts, j.tq), rb = frameOf(R, M) * 0.38 / 1000, Tslip = bs.F * MU * rb;
        if (bs.k === 0) add("err", "bulloni", tag, tag + ": viti spanate", "Con l'impronta o il filetto rovinati la vite non tiene più il precarico.", "Viti nuove e l'utensile della misura giusta.");
        else if (Tslip < 1.5 * o.treq && kinds[k] !== "roll") add(bs.k < 0.9 ? "err" : "warn", "bulloni", tag, tag + ": la flangia può slittare", "Coppia trasmessa per attrito " + f(Tslip, 1) + " N·m contro " + f(o.treq, 1) + " N·m richiesti × 1,5 (precarico " + f(bs.F / 1000, 1) + " kN totali" + (bs.k < 0.9 ? ", viti poco serrate" : "") + ").", "Più viti o di classe superiore, serraggio a coppia e 2 spine di centraggio.", "T_attrito = n·F_M·μ·r = " + j.bolts.n + "·" + f(bs.d.FM * bs.k / 1000, 1) + " kN·0,12·" + f(rb * 1000, 0) + " mm");
        else if (/snervata/.test(bs.st)) add("err", "bulloni", tag, tag + ": viti snervate", "Una vite oltre lo snervamento ha perso precarico e va sostituita.", "Viti nuove serrate a " + f(bs.d.MA, 1) + " N·m."); else if (/lenta|poco/.test(bs.st)) add("warn", "bulloni", tag, tag + ": viti poco serrate", "Con vibrazioni e inversioni di coppia si allentano.", "Ripassa a " + f(bs.d.MA, 1) + " N·m."); }
      if (!j.link) add("err", "montaggio", "L" + (k + 1), "Link " + (k + 1) + " mancante", "Il giunto " + tag + " non ha il pezzo da muovere.", "Monta una barra tagliata nel Mio spazio o una barra a magazzino.");
      else if (!j.ltq) add("err", "bulloni", "L" + (k + 1), "Link " + (k + 1) + " non fissato alla flangia di uscita", "Il link è appoggiato: cade appena il giunto si muove.", "Serra " + j.lbolts.n + "× " + j.lbolts.size + " sulla flangia di uscita.");
      else if (boltState(j.lbolts, j.ltq).k === 0) add("err", "bulloni", "L" + (k + 1), "Link " + (k + 1) + ": viti spanate", "Il link non è più fissato.", "Viti nuove con l'utensile giusto.");
      if (o.treq > o.tavail) add("err", "coppia", tag, tag + ": coppia insufficiente (" + f(o.treq, 1) + " > " + f(o.tavail, 1) + " N·m)", "Gravità " + f(o.tg, 1) + " N·m + accelerazione " + f(o.td, 1) + " N·m (I = " + f(o.I, 3) + " kg·m²) superano la coppia di picco disponibile: motore " + f(mT.Tpk, 2) + " N·m × " + ratio + " × η " + f(eta, 2) + ".", "Rapporto più alto, motore più grande, link più leggeri o carico minore.", "T = Σ m·g·d + I·α");
      else if (o.tg > o.tcont) add("warn", "coppia", tag, tag + ": la gravità supera la coppia continua", "Tenere il braccio teso richiede " + f(o.tg, 1) + " N·m, il motore in continuo ne dà " + f(o.tcont, 1) + ": scalda in posa.", "Freno di stazionamento o contrappeso, motore più grande.");
      if (o.treq > R.Tacc) add("err", "coppia", tag, tag + ": riduttore oltre la coppia di avvio/arresto", R.name + " ammette " + f(R.Tacc, 0) + " N·m in accelerazione, qui " + f(o.treq, 1) + ".", "Riduttore della taglia superiore.");
      else if (o.tg > R.Tr) add("warn", "coppia", tag, tag + ": riduttore oltre la coppia nominale", "In continuo " + f(o.tg, 1) + " N·m su " + f(R.Tr, 0) + " nominali: usura rapida.", "Taglia superiore o meno massa a sbalzo.");
      var nIn = (asm.speed || 60) / 6 * ratio; if (nIn > motorSpeed(M) * 1.02) add("err", "velocita", tag, tag + ": il motore non raggiunge la velocità", (asm.speed || 60) + " °/s all'uscita = " + f(nIn, 0) + " giri/min al motore, il massimo è " + f(motorSpeed(M), 0) + ".", "Rapporto più basso o velocità del braccio minore.");
      // cablaggio
      var D = by(CAT.DRIVERS, j.driver), wr = j.wire || {};
      if (D.for.indexOf(M.type) < 0) add("err", "cablaggio", tag, tag + ": driver incompatibile con il motore", D.name + " pilota " + D.for.join("/") + ", il motore è " + ENG.typeLabel(M.type) + ".", "Scegli un driver per " + ENG.typeLabel(M.type) + ".");
      if (!wr.mot) add("err", "cablaggio", tag, tag + ": fasi del motore non collegate", "Il motore non riceve corrente.", "Collega il cavo motore al driver di " + tag + ".");
      else if (wr.mot !== tag) add("err", "cablaggio", tag, tag + ": cavo motore sul driver sbagliato (" + wr.mot + ")", "Il motore di " + tag + " è collegato all'uscita del driver di " + wr.mot + ": i comandi di un asse muovono l'altro e la corrente impostata non è quella del motore.", "Sposta il connettore sull'uscita del driver di " + tag + ".");
      if (!wr.pow) add("err", "cablaggio", tag, tag + ": driver non alimentato", "", "Collega il driver all'alimentazione giusta.");
      else { var ac = String(D.V[0]).indexOf("ac") === 0 || D.V === "ac230" || (D.V && D.V[0] === "ac230"); var PS = by(CAT.PSUS, asm.psu);
        if (ac && wr.pow !== "mains") add("err", "cablaggio", tag, tag + ": l'azionamento AC va sulla rete", "I servoazionamenti AC si alimentano a 230 V monofase, non dall'alimentatore DC.", "Collega L/N dal sezionatore e dal magnetotermico.");
        else if (!ac && wr.pow === "mains") add("err", "cablaggio", tag, tag + ": 230 V su un driver DC", D.name + " lavora a " + D.V[0] + "–" + D.V[1] + " V DC: con la rete esplode.", "Alimentalo dal PSU DC.");
        else if (!ac && wr.pow === "logic") add("err", "cablaggio", tag, tag + ": potenza presa dai 5 V della logica", "Il pin 5 V del controllore dà poche centinaia di mA: il motore lo fa crollare (o brucia il regolatore).", "Alimentazione di potenza separata, massa in comune.");
        else if (!ac && wr.pow === "psu" && (PS.V < D.V[0] || PS.V > D.V[1])) add("err", "cablaggio", tag, tag + ": tensione del PSU fuori dal campo del driver", "PSU " + PS.V + " V, il driver accetta " + D.V[0] + "–" + D.V[1] + " V.", "Scegli un alimentatore nel campo del driver.");
        else if (!ac && M.V && wr.pow === "psu" && PS.V > M.V[1] * 1.05 && M.type !== "stepper" && M.type !== "stepper_cl") add("warn", "cablaggio", tag, tag + ": tensione oltre quella del motore", "PSU " + PS.V + " V, motore " + M.V[0] + "–" + M.V[1] + " V.", "Limita il PWM o usa un PSU più basso."); }
      if (!wr.sig) add("err", "cablaggio", tag, tag + ": segnale di comando non collegato", "Il driver non riceve i comandi.", "Collega " + busOf(D).join(" o ") + " dal controllore.");
      else if (busOf(D).indexOf(wr.sig) < 0) add("err", "cablaggio", tag, tag + ": segnale sbagliato (" + wr.sig + ")", D.name + " accetta " + busOf(D).join(", ") + ".", "Collega il tipo di segnale corretto.");
      if ((M.type === "stepper" || M.type === "stepper_cl") && M.I > D.Icont * 1.05) add("warn", "cablaggio", tag, tag + ": il driver non dà tutta la corrente", "Motore " + f(M.I, 1) + " A, driver " + f(D.Icont, 1) + " A continui: perdi " + Math.round((1 - D.Icont / M.I) * 100) + "% di coppia o il driver va in protezione termica.", "Driver più grande (DM542/DM860).");
    }
    if (!asm.eff.mounted) add("warn", "montaggio", "eff", "Pinza non montata", "Il braccio si muove ma non può prendere niente.", "Monta la pinza sulla flangia ISO 9409 dell'ultimo giunto.");
    else if (!asm.eff.tq) add("err", "bulloni", "eff", "Pinza non fissata", "La pinza appoggiata sulla flangia vola via alla prima accelerazione.", "Serra " + asm.eff.bolts.n + "× " + asm.eff.bolts.size + " a " + f(boltData(asm.eff.bolts.size, asm.eff.bolts.cls).MA, 1) + " N·m.");
    else if (boltState(asm.eff.bolts, asm.eff.tq).k === 0) add("err", "bulloni", "eff", "Viti della pinza spanate", "", "Viti nuove.");
    if (asm.eff.mounted && asm.payload > by(CAT.EFFECTORS, asm.eff.id).pay) add("err", "coppia", "eff", "Carico oltre la portata della pinza", "La pinza tiene " + f(by(CAT.EFFECTORS, asm.eff.id).pay, 1) + " kg, il pezzo ne pesa " + f(asm.payload, 1) + ": scivola.", "Pinza più forte o dita con presa di forma.");
    // flessione in punta (braccio teso) e tensioni nei link
    var defl = 0, links = [], tor = 0;
    for (var m = 0; m < n; m++) { var jj = asm.J[m]; if (!jj.link) continue; var pp = partProps(jj.link), Lm = pp.L / 1000, Kp = LD.K, dist = 0;
      if (m === 0) { links.push({ k: m, pp: pp, sigma: 0, sf: Infinity }); continue; }
      var down = LD.pts.filter(function (x) { return x.k > m; }), F = down.reduce(function (s, x) { return s + x.m * g; }, 0), wq = pp.kgm * g, EI = pp.EI * 1e-6; // N·m²
      for (var z = m + 1; z <= n; z++) if (asm.J[z] && asm.J[z].link) dist += partProps(asm.J[z].link).L / 1000;
      dist += asm.eff.mounted ? by(CAT.EFFECTORS, asm.eff.id).e || by(CAT.EFFECTORS, asm.eff.id).L : 0;
      var d1 = F * Math.pow(Lm, 3) / (3 * EI) + wq * Math.pow(Lm, 4) / (8 * EI), th = F * Lm * Lm / (2 * EI) + wq * Math.pow(Lm, 3) / (6 * EI); defl += d1 + th * dist;
      var Mr = F * Lm + wq * Lm * Lm / 2 + LD.T[m].td, sig = Mr * 1000 / pp.s.W, sf = pp.mat.Re / Math.max(sig, 1e-6); links.push({ k: m, pp: pp, sigma: sig, sf: sf, M: Mr });
      if (!pp.s.ok) add("err", "struttura", "L" + (m + 1), "Sezione impossibile", "Lo spessore è maggiore della metà della sezione.", "Correggi le misure.");
      else if (sf < 1) add("err", "struttura", "L" + (m + 1), "Link " + (m + 1) + " si snerva (σ " + f(sig, 0) + " MPa > " + pp.mat.Re + ")", "Momento alla radice " + f(Mr, 1) + " N·m su " + pp.s.desc + ".", "Sezione più alta o materiale più resistente.", "σ = M/W");
      else if (sf < 2.5) add("warn", "struttura", "L" + (m + 1), "Link " + (m + 1) + ": margine basso (SF " + f(sf, 1) + ")", "σ = " + f(sig, 0) + " MPa con Re = " + pp.mat.Re + " MPa: con urti e fatica serve SF ≥ 2,5.", "Sezione più alta.", "σ = M/W"); }
    for (var r2 = 1; r2 < n; r2++) { var o2 = J[r2]; if (!o2 || kinds[r2] !== "pitch") continue; var tw = ENG.twistOf ? 0 : 0; }
    // torsione dei riduttori → spostamento in punta
    for (var r = 1; r < n; r++) { var oj = J[r]; if (!oj || kinds[r] !== "pitch") continue; var reach = 0; for (var z2 = r; z2 < n; z2++) if (asm.J[z2].link) reach += partProps(asm.J[z2].link).L / 1000; var th2 = oj.R.type === "cyclo" ? ENG.cycTwist(oj.tg, oj.R.LM, oj.R.Tr, oj.R.K) : oj.R.type === "harmonic" ? ENG.hdTwist(oj.tg, oj.R.hd) : oj.R.type === "none" ? 0 : (oj.R.LM / 2 * ENG.AM + oj.tg / (oj.R.K / ENG.AM)); if (isFinite(th2)) tor += th2 * reach; }
    var tipTot = (defl + tor) * 1000;
    if (n && asm.J.every(function (x) { return x.link; })) { if (tipTot > 2) add("warn", "struttura", "TCP", "Cedimento in punta " + f(tipTot, 2) + " mm", "Flessione dei link " + f(defl * 1000, 2) + " mm + torsione dei riduttori " + f(tor * 1000, 2) + " mm.", "Link più rigidi (sezione più alta) o riduttori più rigidi."); }
    // ribaltamento sul basamento
    var Mtilt = LD.pts.reduce(function (s, x) { return s + x.m * g * Math.hypot(x.p[0], x.p[2]); }, 0), bb = boltState(asm.base.bolts, asm.base.tq), Mres = bb.F * 0.09 + LD.mass * g * 0.09;
    if (asm.base.mounted && asm.base.tq && Mtilt > Mres) add("err", "struttura", "base", "Il basamento si solleva", "Momento ribaltante " + f(Mtilt, 0) + " N·m contro " + f(Mres, 0) + " N·m dati dalle viti (precarico " + f(bb.F / 1000, 1) + " kN) e dal peso.", "Viti più grosse/più serrate o basamento più largo.");
    // controllore ed elettronica (scheda della Tavola da lavoro)
    var b = ctx.bench || null, used = {}; asm.J.forEach(function (x) { if (x.wire && x.wire.sig) used[x.wire.sig] = (used[x.wire.sig] || 0) + 1; });
    if (!asm.ctrl.mounted) add("err", "elettronica", "ctrl", "Controllore non montato", "Nessuno manda i comandi ai driver.", "Monta la scheda della Tavola da lavoro o un controllore a catalogo nel quadro.");
    else if (asm.ctrl.src === "bench") {
      if (!b || !b.count) add("err", "elettronica", "ctrl", "La scheda della Tavola è vuota", "Hai scelto come controllore la tua PCB, ma sulla Tavola non c'è un circuito.", "Componi il circuito (es. Arduino + driver stepper) o scegli un controllore a catalogo.");
      else { if (!b.mcu) add("err", "elettronica", "ctrl", "La tua scheda non ha un microcontrollore", "Senza MCU non può generare STEP/DIR o PWM.", "Aggiungi un microcontrollore sulla Tavola.");
        if (b.errors) add("err", "elettronica", "ctrl", "La scheda ha " + b.errors + " errori elettrici", (b.issues || []).slice(0, 2).join("; "), "Correggi il circuito sulla Tavola da lavoro.");
        if (b.bridge) add("err", "elettronica", "ctrl", "Ponti di stagno sulla scheda", b.bridge + " giunti in corto.", "Togli i ponti con la treccia dissaldante.");
        if (b.cold) add("warn", "elettronica", "ctrl", "Giunti freddi sulla scheda (" + b.cold + ")", "Con le vibrazioni del braccio i contatti diventano intermittenti: scatti e perdite di passo.", "Rifai i giunti al banco di saldatura.");
        if (used.can || used.ethercat) add("err", "elettronica", "ctrl", "Il tuo microcontrollore non ha " + (used.ethercat ? "EtherCAT" : "CAN"), "La scheda della Tavola ha solo pin digitali (STEP/DIR, PWM, I²C).", "Scegli un controllore a catalogo con il bus giusto.");
        var pins = (used.stepdir || 0) * 2 + (used.pwm || 0) + (used.pwmdir || 0) * 2 + (used.i2c ? 2 : 0); if (b.mcuPins && pins > b.mcuPins) add("err", "elettronica", "ctrl", "Pin insufficienti (" + pins + " / " + b.mcuPins + ")", "", "Microcontrollore con più pin o driver su bus."); }
    } else { var mc = by(CAT.MCUS, asm.ctrl.mcu); if (used.ethercat && !mc.ethercat) add("err", "elettronica", "ctrl", mc.name + " non ha EtherCAT", "", "Controllore EtherCAT (classe Beckhoff/IPC)."); if (used.can && !mc.can) add("err", "elettronica", "ctrl", mc.name + " non ha CAN", "", "Aggiungi un transceiver CAN o scegli un'altra scheda."); var pn = (used.stepdir || 0) * 2 + (used.pwm || 0) + (used.pwmdir || 0) * 2; if (pn > mc.pins) add("err", "elettronica", "ctrl", "Pin insufficienti su " + mc.name, pn + " pin richiesti, " + mc.pins + " disponibili.", "Scheda con più pin."); }
    // alimentazione
    var PSx = by(CAT.PSUS, asm.psu), Pdc = 0; J.forEach(function (o3) { var Mx = o3.M; if (asm.J[o3.k].wire && asm.J[o3.k].wire.pow === "psu") Pdc += Mx.type === "stepper" || Mx.type === "stepper_cl" ? Mx.I * Mx.I * 2.5 + 15 : Math.min(400, o3.treq / o3.i / o3.eta * (asm.speed || 60) / 6 * o3.i * Math.PI / 30 + 10); });
    if (Pdc > 0 && Pdc > PSx.V * PSx.A) add("err", "alimentazione", "psu", "Alimentatore sottodimensionato", "Servono ≈ " + f(Pdc, 0) + " W, il PSU ne dà " + f(PSx.V * PSx.A, 0) + ".", "PSU più potente.");
    if (!asm.estop) add(J.some(function (o4) { return o4.M.type === "ac" || o4.M.type === "bldc" || o4.M.mass > 1; }) ? "err" : "warn", "sicurezza", "estop", "Manca il circuito di arresto di emergenza", "Un braccio con motori di potenza deve poter essere fermato togliendo energia ai driver (categoria 0/1, EN ISO 13850 – EN 60204-1).", "Collega il pulsante a fungo al relè di sicurezza e all'ingresso STO/ENABLE dei driver.");
    var ready = !iss.some(function (x) { return x.sev === "err" && /montaggio|bulloni/.test(x.cat); });
    return { issues: iss, J: J, links: links, mass: LD.mass, com: LD.com, pts: LD.pts, K: LD.K, defl: tipTot, Mtilt: Mtilt, ready: ready, errors: iss.filter(function (x) { return x.sev === "err"; }).length, warns: iss.filter(function (x) { return x.sev === "warn"; }).length };
  }
  /* traiettoria pick & place: profilo cosinusoidale tra pose; restituisce q, w, a per ogni giunto */
  function poses(n) { var D = Math.PI / 180; return [new Array(n).fill(0).map(function (x, i) { return i === 0 ? 0 : i === 1 ? 50 * D : i === 2 ? -80 * D : 0; }), new Array(n).fill(0).map(function (x, i) { return i === 0 ? 60 * D : i === 1 ? 5 * D : i === 2 ? -25 * D : i === 3 ? -20 * D : 0; }), new Array(n).fill(0).map(function (x, i) { return i === 0 ? 60 * D : i === 1 ? 25 * D : i === 2 ? -40 * D : i === 3 ? -30 * D : 0; }), new Array(n).fill(0).map(function (x, i) { return i === 0 ? -70 * D : i === 1 ? 0 : i === 2 ? -10 * D : i === 3 ? -35 * D : 0; }), new Array(n).fill(0).map(function (x, i) { return i === 0 ? 0 : i === 1 ? 50 * D : i === 2 ? -80 * D : 0; })]; }
  // alza il giunto k quanto basta perché tutti i punti a valle restino sopra il tavolo (bisezione sull'angolo)
  function restOnTable(asm, q, k, qc) {
    var minY = function (qq) { var K = fk(asm, qq), m = 1e9; for (var i = k + 1; i < K.joints.length; i++) { var lk = asm.J[i - 1] && asm.J[i - 1].link, r = lk ? partProps(lk).r || 0.015 : 0.015; m = Math.min(m, K.joints[i][1] - r); } return Math.min(m, K.tcp[1] - 0.01); };
    if (minY(q) >= 0) return false; var lo = q[k], hi = Math.max(q[k], qc || 0), qq = q.slice(); qq[k] = hi; if (minY(qq) < 0) hi = Math.PI / 2;
    for (var it = 0; it < 22; it++) { var mid = (lo + hi) / 2; qq[k] = mid; if (minY(qq) < 0) lo = mid; else hi = mid; }
    q[k] = hi; return true;
  }
  function simulate(asm, ctx, opt) {
    opt = opt || {}; var n = asm.axes, P = opt.poses || poses(n), w = Math.PI / 180 * (asm.speed || 60), segs = [], t0 = 0, kinds = KINDS[n];
    for (var s = 0; s < P.length - 1; s++) { var dq = 0; for (var i = 0; i < n; i++) dq = Math.max(dq, Math.abs(P[s + 1][i] - P[s][i])); var T = Math.max(asm.tacc || 0.5, dq * Math.PI / (2 * w)); segs.push({ a: P[s], b: P[s + 1], t0: t0, T: T }); t0 += T + 0.25; }
    var tEnd = t0, dt = opt.dt || 1 / 30, frames = [], ev = [], seen = {}, temp = new Array(n).fill(25), tmScale = opt.thermal || 40, ev0 = evaluate(asm, ctx);
    function flag(t, sev, key, title, why, fix) { if (seen[key]) return; seen[key] = 1; ev.push({ time: t, sev: sev, key: key, t: title, why: why || "", fix: fix || "" }); }
    var b = ctx && ctx.bench, cold = asm.ctrl.src === "bench" && b && b.cold;
    for (var t = 0; t <= tEnd + 1e-9; t += dt) {
      var q = [], wv = [], av = [], sg = segs[segs.length - 1];
      for (var z = 0; z < segs.length; z++) if (t <= segs[z].t0 + segs[z].T + 0.25) { sg = segs[z]; break; }
      var u = Math.max(0, Math.min(1, (t - sg.t0) / sg.T));
      for (var k = 0; k < n; k++) { var D = sg.b[k] - sg.a[k]; q.push(sg.a[k] + D * (1 - Math.cos(Math.PI * u)) / 2); wv.push(u > 0 && u < 1 ? D * Math.PI / (2 * sg.T) * Math.sin(Math.PI * u) : 0); av.push(u > 0 && u < 1 ? D * Math.PI * Math.PI / (2 * sg.T * sg.T) * Math.cos(Math.PI * u) : 0); }
      // un giunto senza motore o senza link fissato non segue la traiettoria (cade per gravità)
      var qCmd = q.slice(), fell = [];
      for (var k1 = 0; k1 < n; k1++) { var jj = asm.J[k1]; if (k1 > 0 && kinds[k1] === "pitch" && (!jj.mounted || !jj.tq || !jj.link || !jj.ltq || (jj.wire || {}).mot !== "J" + (k1 + 1))) { q[k1] = Math.max(-1.45, (q[k1] || 0) - Math.min(1, t / 0.6) * 1.2); fell.push(k1); } }
      // ...ma si ferma appoggiato sul tavolo (nessun pezzo attraversa il piano y = 0)
      for (var kf = 0; kf < fell.length; kf++) if (restOnTable(asm, q, fell[kf], qCmd[fell[kf]])) flag(t, "err", "rest" + fell[kf], "Link " + (fell[kf] + 1) + " caduto sul tavolo", "Il giunto J" + (fell[kf] + 1) + " non è fissato o non è alimentato: il braccio cade per gravità e si appoggia sul piano di lavoro.", "Monta il link, serra le viti con la coppia giusta e collega il motore al suo driver.");
      if (cold && Math.sin(t * 23) > 0.92) q[1] += 0.03;
      var LD = loads(asm, q, av, ctx), fr = { t: t, q: q.slice(), tau: [], util: [], temp: [], tip: LD.K.tcp, com: LD.com, K: LD.K, flags: [] };
      for (var k2 = 0; k2 < n; k2++) {
        var jm = jointMass(asm.J[k2]), M = jm.M, R = jm.R, i2 = R.ratios.indexOf(+asm.J[k2].ratio) >= 0 ? +asm.J[k2].ratio : R.ratios[0], eta = ENG.etaOf(R, i2), mT = motorTorque(M);
        var sgn = kinds[k2] === "pitch" ? 1 : 0, tr = LD.T[k2].tg * sgn + LD.T[k2].I * Math.abs(av[k2]), avail = mT.Tpk * i2 * eta, cont = mT.Tn * i2 * eta, ut = tr / Math.max(1e-6, Math.min(avail, R.Tacc));
        var Pr = (M.type === "stepper" || M.type === "stepper_cl") ? 0.55 : Math.pow(tr / Math.max(cont, 1e-6), 2);
        temp[k2] += (25 + 75 * Pr - temp[k2]) * (1 - Math.exp(-dt * tmScale / 600)); fr.tau.push(tr); fr.util.push(ut); fr.temp.push(temp[k2]);
        if (asm.J[k2].mounted) { if (tr > avail) flag(t, "err", "ov" + k2, "Sovraccarico J" + (k2 + 1), "Coppia richiesta " + f(tr, 1) + " N·m oltre il picco " + f(avail, 1) + " N·m: il motore perde la posizione" + (M.type === "stepper" ? " (passi persi)" : " e l'azionamento va in allarme di sovraccorrente") + ".", "Rapporto più alto, motore più grande o movimento più lento."); if (tr > R.Tacc) flag(t, "err", "rd" + k2, "Riduttore J" + (k2 + 1) + " oltre il limite", f(tr, 1) + " N·m > " + f(R.Tacc, 0) + " N·m di avvio/arresto.", "Riduttore più grande o rampe più lunghe."); if (temp[k2] > 100) flag(t, "err", "th" + k2, "Surriscaldamento motore J" + (k2 + 1) + " (" + Math.round(temp[k2]) + " °C)", "Il ciclo chiede in media più della coppia continua: la carcassa supera i 100 °C e la protezione termica interviene.", "Motore più grande, pause nel ciclo, rapporto più alto o contrappeso.");
          else if (temp[k2] > 80) flag(t, "warn", "tw" + k2, "Motore J" + (k2 + 1) + " caldo (" + Math.round(temp[k2]) + " °C)", "Vicino al limite termico.", "Riduci velocità o carico."); }
      }
      // collisioni
      var Kx = LD.K; for (var a = 0; a < Kx.links.length; a++) { var L1 = Kx.links[a]; if (a > 0 && Math.min(L1.b[1], L1.a[1]) < 0.02) flag(t, "err", "fl" + a, "Collisione con il tavolo (link " + (a + 1) + ")", "Il link scende sotto il piano di lavoro.", "Cambia le pose o limita l'asse (finecorsa software)."); for (var c = a + 2; c < Kx.links.length; c++) { var L2 = Kx.links[c], ra = asm.J[a].link ? partProps(asm.J[a].link).r : 0.02, rc = asm.J[c].link ? partProps(asm.J[c].link).r : 0.02; if (segDist(L1.a, L1.b, L2.a, L2.b) < ra + rc + 0.005) { flag(t, "err", "sc" + a + c, "Autocollisione link " + (a + 1) + " / link " + (c + 1), "I due link si toccano durante il movimento.", "Limiti di giunto o geometria diversa."); fr.flags.push("col"); } } }
      if (Kx.tcp[1] < 0.0) flag(t, "err", "tcp", "La pinza tocca il tavolo", "", "Alza la posa di presa.");
      frames.push(fr);
    }
    ev0.issues.forEach(function (x) { if (x.sev === "err" && /montaggio|bulloni|cablaggio|elettronica|sicurezza/.test(x.cat)) flag(0, "err", "s_" + x.t, x.t, x.why, x.fix); });
    if (cold) flag(0.5, "warn", "cold", "Scatti dovuti ai giunti freddi della scheda", "Contatti intermittenti sulla tua PCB: il segnale STEP salta.", "Rifai i giunti.");
    ev.sort(function (x, y) { return x.time - y.time; });
    var mx = new Array(n).fill(0), mt = new Array(n).fill(0); frames.forEach(function (fr2) { fr2.util.forEach(function (u2, k3) { mx[k3] = Math.max(mx[k3], u2); }); fr2.temp.forEach(function (tt, k3) { mt[k3] = Math.max(mt[k3], tt); }); });
    return { frames: frames, events: ev, tEnd: tEnd, dt: dt, peakUtil: mx, peakTemp: mt, ok: !ev.some(function (x) { return x.sev === "err"; }), thermalScale: tmScale };
  }
  var API = { KINDS: KINDS, STOCK: STOCK, material: material, partProps: partProps, fromSpace: fromSpace, boltData: boltData, suggestBolts: suggestBolts, defaults: defaults, fk: fk, loads: loads, evaluate: evaluate, simulate: simulate, restOnTable: restOnTable, poses: poses, motorTorque: motorTorque, jointMass: jointMass, segDist: segDist, by: by, f: f };
  if (node) module.exports = API; else root.PHY = API;
})(typeof window !== "undefined" ? window : this);
