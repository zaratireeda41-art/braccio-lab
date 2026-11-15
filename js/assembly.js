/* XENTRIQ INDUSTRY · Braccio Lab — controlli di montaggio, Dispensa e distinta (BOM).
   Viti delle flange (VDI 2230 semplificata), attrezzi, PLC e I/O, cavi e catene, pinze, pneumatica. */
(function (root) {
  "use strict";
  var node = typeof module !== "undefined" && module.exports;
  var CAT = node ? require("./catalog.js") : root.CAT;
  var PAN = node ? require("./pantry.js") : root.PAN;
  var g = 9.81;
  function fmt(x, d) { if (x === Infinity) return "∞"; if (x == null || isNaN(x)) return "—"; d = d == null ? 2 : d; var s = (+x).toFixed(d).replace(".", ","); var p = s.split(","); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, "."); return p.join(","); }

  function shopList(build) { var out = [], s = build.shop || {}; for (var id in s) { var it = PAN.byId(id); if (it && s[id] > 0) out.push({ it: it, q: +s[id] }); } return out; }
  function roleQ(list, role) { return list.filter(function (x) { return x.it.role === role; }); }
  function sumQ(list) { return list.reduce(function (s, x) { return s + x.q; }, 0); }
  function fingersOf(build) { return CAT.byId(CAT.FINGERS, build.fingers || "rubber"); }
  function effWithFlange(eff, build) {
    var ex = roleQ(shopList(build), "flange"); if (!ex.length) return eff;
    var o = {}; for (var k in eff) o[k] = eff[k];
    ex.forEach(function (x) { o.mass += (x.it.flangeMass || 0) * x.q; o.L += (x.it.flangeL || 0) * x.q; });
    o.extras = ex.map(function (x) { return x.it.name; });
    return o;
  }
  function boltOf(jb) {
    if (!jb || !jb.bolt || !jb.bolt.s) return null;
    var B = null; CAT.BOLTS.forEach(function (x) { if (x.s === jb.bolt.s) B = x; }); if (!B) return null;
    var C = CAT.byId(CAT.BOLT_CLASSES, jb.bolt.c || "8.8");
    return { B: B, C: C, n: Math.max(3, Math.round(+jb.bolt.n || 8)), pcd: Math.max(20, +jb.bolt.pcd || 80), MA: B.MA[C.i], FM: B.FM[C.i] * 1000, eur: B.eur[C.i] };
  }
  function toolCovers(t, kind, val) {
    if (kind === "hex") return t.hex && t.hex.indexOf(val) >= 0;
    if (kind === "torque") return t.range && val >= t.range[0] && val <= t.range[1];
    return t.kind === kind;
  }
  function suggestTool(kind, val) {
    for (var i = 0; i < PAN.ITEMS.length; i++) { var t = PAN.ITEMS[i]; if (t.role !== "tool") continue; if ((kind === "hex" || kind === "torque") ? (t.kind === kind && toolCovers(t, kind, val)) : t.kind === kind) return t; }
    return null;
  }

  /* ---------- controllo principale (chiamato da ENG.analyze) ---------- */
  function check(c) {
    var build = c.build, mission = c.mission, J = c.J, E = build.elec, mcu = c.mcu, psu = c.psu, add = c.add, opt = c.opt || {};
    var level = mission.level || 1, shop = shopList(build), eff = c.eff, out = { cost: 0, lines: [], bolts: [], tools: null, io: null, grip: null, air: null, chain: null };
    var has = function (role) { return roleQ(shop, role).length > 0; };
    var plc = !!mcu.plc, ipc = mcu.id === "ipc", micro = !plc && !ipc;
    var has24 = !!E.aux24 || psu.V === 24 || has("psu24");
    var nonHob = J.filter(function (o) { return o.M.type !== "servo_hobby"; });
    var toolsKnown = Array.isArray(opt.tools), tools = (opt.tools || []).map(function (id) { return PAN.byId(id); }).filter(Boolean);
    var haveTool = function (kind, val) { return tools.some(function (t) { return toolCovers(t, kind, val); }); };

    /* --- pinza: forza di presa (formula SCHUNK: F·μ ≥ m·(g+a)·S, S = 2) --- */
    var reachTip = c.xTip, aT = c.alpha * reachTip, aC = c.omega * c.omega * reachTip, acc = Math.sqrt(aT * aT + aC * aC), m = mission.payload || 0;
    if (m > 0 && eff.kind && eff.kind !== "spindle") {
      var hold = m * (g + acc), S = 2, need, calc, fing = fingersOf(build);
      if (eff.kind === "vac") {
        var Fv = 0.06 * Math.PI * eff.dc * eff.dc / 4 * eff.cups; // 0,6 bar di vuoto
        need = m * (g + acc / 0.5) * S;
        calc = "Ventose: F = Δp·A·n = 0,06 N/mm² × π·" + eff.dc + "²/4 × " + eff.cups + " = " + fmt(Fv, 0) + " N. Serve m·(g + a/μ)·S = " + fmt(m, 1) + " × (9,81 + " + fmt(acc, 2) + "/0,5) × 2 = " + fmt(need, 0) + " N (carico orizzontale, μ ventosa 0,5).";
        out.grip = { F: Fv, need: need, acc: acc, calc: calc };
        if (Fv < need) add("err", "pinza", "Pinza", "Le ventose non tengono il pezzo", "Con l'accelerazione del braccio (" + fmt(acc, 2) + " m/s² in punta) servono " + fmt(need, 0) + " N, le ventose ne danno " + fmt(Fv, 0) + ".", "Più ventose o più grandi (la forza cresce col quadrato del diametro), oppure una pinza.", calc);
        else if (Fv < need * 1.25) add("warn", "pinza", "Pinza", "Ventose al limite", "Margine " + fmt(Fv / need, 2) + "×: polvere o superfici porose fanno perdere il vuoto.", "Aggiungi una ventosa o riduci l'accelerazione.", calc);
      } else {
        var mu = eff.kind === "mag" ? 1 : fing.mu;
        need = eff.kind === "mag" ? hold * 2 : hold * S / mu;
        calc = eff.kind === "mag" ? "Magnete: serve 2 × m·(g+a) = 2 × " + fmt(m, 1) + " × (9,81 + " + fmt(acc, 2) + ") = " + fmt(need, 0) + " N; forza dichiarata " + fmt(eff.F, 0) + " N su acciaio spesso."
          : "Presa per attrito (come SCHUNK): F ≥ m·(g + a)·S / μ = " + fmt(m, 2) + " × (9,81 + " + fmt(acc, 2) + ") × 2 / " + fmt(mu, 1) + " = " + fmt(need, 0) + " N. a = √((α·r)² + (ω²·r)²) con r = " + fmt(reachTip * 1000, 0) + " mm. Pinza: " + fmt(eff.F, 0) + " N.";
        out.grip = { F: eff.F, need: need, acc: acc, mu: mu, calc: calc };
        if (eff.F < need) add("err", "pinza", "Pinza", "Pinza troppo debole: il pezzo scivola", "Per tenere " + fmt(m, 2) + " kg mentre il braccio accelera servono " + fmt(need, 0) + " N di presa" + (eff.kind === "mag" ? "" : " con " + fing.name.toLowerCase()) + "; la pinza ne dà " + fmt(eff.F, 0) + ".", eff.kind === "mag" ? "Magnete più forte o pezzo più spesso." : (fing.id !== "form" ? "Dita sagomate (presa di forma) o in gomma, oppure " : "") + "una pinza più forte.", calc);
        else if (eff.F < need * 1.25) add("warn", "pinza", "Pinza", "Pinza con poco margine", "Margine " + fmt(eff.F / need, 2) + "×: con dita usurate o olio sul pezzo scivola.", "Pinza più forte o dita sagomate.", calc);
        if (eff.pay && m > eff.pay * 1.6 && fing.id !== "form") add("info", "pinza", "Pinza", "Carico oltre il consigliato dal costruttore", "Il costruttore consiglia " + fmt(eff.pay, 1) + " kg in presa per attrito (μ 0,1).", "Con dita sagomate o in gomma si può andare oltre, ma verifica i momenti sulle griffe.");
      }
      if (eff.v24 && !has24) add("err", "pinza", "Pinza", "La pinza vuole 24 V", eff.name + " si alimenta a 24 V DC.", "Attiva l'alimentatore ausiliario 24 V o aggiungi un alimentatore DIN 24 V dalla Dispensa.");
    }
    if (eff.kind === "spindle") {
      if (eff.vfd && !has("vfd")) add("err", "pinza", "Utensile", "Manca l'inverter del mandrino", "Un elettromandrino non si attacca alla rete: vuole un inverter (VFD) che gli dia la frequenza giusta.", "Aggiungi l'inverter dalla Dispensa (Elettronica e PLC).");
      if (eff.water && !has("pump")) add("warn", "pinza", "Utensile", "Raffreddamento del mandrino mancante", "Il mandrino è raffreddato ad acqua: senza pompa si surriscalda in pochi minuti.", "Pompa + radiatore dalla Dispensa.");
    }

    /* --- pneumatica --- */
    var comps = roleQ(shop, "comp"), valves = roleQ(shop, "valve"), hoses = roleQ(shop, "hose");
    var airUser = eff.kind === "pneu" || (eff.kind === "vac" && !has("vpump")) || shop.some(function (x) { return x.it.air; });
    if (airUser) {
      var comp = comps.map(function (x) { return x.it; }).sort(function (a, b) { return b.fad - a.fad; })[0];
      var pn = eff.air ? eff.air.pnom : 6, cpm = mission.cpm || 6;
      var cons = eff.air ? (eff.air.V ? eff.air.V * (pn + 1) / 1000 * cpm : eff.air.ejector * 0.5) : 5;
      var acalc = eff.air ? (eff.air.V ? "Consumo: " + eff.air.V + " cm³ × (" + pn + " + 1) bar × " + cpm + " cicli/min = " + fmt(cons, 1) + " Nl/min." : "Eiettore: " + eff.air.ejector + " Nl/min × 50% del tempo = " + fmt(cons, 0) + " Nl/min.") : "";
      out.air = { cons: cons, comp: comp, calc: acalc };
      if (!comp) add("err", "pneumatica", "Pneumatica", "Manca l'aria compressa", "La " + (eff.kind === "vac" ? "ventosa con eiettore" : "pinza pneumatica") + " si muove solo con aria a " + pn + " bar.", "Aggiungi un compressore dalla Dispensa (Pneumatica).", acalc);
      else {
        if (comp.pmax < pn) add("err", "pneumatica", "Pneumatica", "Pressione insufficiente", "Il compressore arriva a " + comp.pmax + " bar, l'utensile vuole " + pn + " bar.", "Compressore da 8–10 bar.");
        if (comp.fad < cons) add("err", "pneumatica", "Pneumatica", "Compressore troppo piccolo", "Consumi " + fmt(cons, 1) + " Nl/min, il compressore ne rende " + comp.fad + ".", "Compressore più grande.", acalc);
        else if (comp.fad < cons * 1.5) add("warn", "pneumatica", "Pneumatica", "Compressore al limite", "Lavora quasi sempre: si scalda e si usura.", "Tieni almeno il 50% di riserva.", acalc);
      }
      if (!valves.length) add("err", "pneumatica", "Pneumatica", "Manca l'elettrovalvola", "Senza valvola l'aria non sa quando aprire e chiudere la pinza.", eff.kind === "vac" ? "Valvola 3/2 per l'eiettore." : "Valvola 5/2 (meglio bistabile) o 5/3 a centri chiusi.");
      if (!hoses.length) add("err", "pneumatica", "Pneumatica", "Mancano i tubi dell'aria", "Compressore, valvola e pinza vanno collegati.", "Tubo PU del diametro consigliato e raccordi istantanei.");
      else if (eff.air && Math.max.apply(null, hoses.map(function (x) { return x.it.od; })) < eff.air.hose) add("warn", "pneumatica", "Pneumatica", "Tubi troppo sottili", "La pinza vuole tubo Ø" + eff.air.hose + ": con tubi più piccoli si chiude lentamente.", "Tubo PU Ø" + eff.air.hose + ".");
      if (!has("fitting")) add("warn", "pneumatica", "Pneumatica", "Mancano i raccordi", "Tubi e valvole si collegano con raccordi istantanei.", "Set di raccordi dalla Dispensa.");
      if (!has("frl")) add("warn", "pneumatica", "Pneumatica", "Aria non trattata", "Senza filtro e regolatore la pinza riceve condensa e pressione variabile: dura meno e la forza cambia.", "Gruppo FRL 1/4\" dopo il compressore.");
      if (eff.kind === "pneu" && (mission.estop || 0) >= 2 && m >= 2 && !eff.spring && !has("checkvalve") && !valves.some(function (x) { return x.it.vt === "52b" || x.it.vt === "53"; }))
        add("warn", "pneumatica", "Pneumatica", "All'emergenza il pezzo può cadere", "Con una valvola monostabile e senza ritegno, se manca corrente o aria la pinza si apre.", "Valvola 5/2 bistabile o 5/3 a centri chiusi, valvola di ritegno pilotata, o pinza con molla (-AS).");
      if (valves.length && !has24 && !plc) add("err", "pneumatica", "Pneumatica", "Le valvole sono a 24 V", "Le bobine delle elettrovalvole vogliono 24 V DC.", "Alimentatore 24 V (ausiliario o DIN dalla Dispensa).");
      if (valves.length && micro && !has("relay") && !has("mosfet") && !has("relay24")) add("err", "pneumatica", "Pneumatica", "Un pin dell'MCU non accende una valvola", "Un pin dà 5 V/20 mA (o 3,3 V), la bobina vuole 24 V e circa 80 mA: il pin si brucia.", "Modulo relè o MOSFET con diodo dalla Dispensa.");
    } else if (comps.length || valves.length) add("info", "pneumatica", "Pneumatica", "Pneumatica senza utilizzatore", "Hai compressore o valvole ma l'utensile non usa aria.", "Toglili dalla distinta o scegli una pinza pneumatica.");

    /* --- cavi e catene --- */
    var cable = CAT.byId(CAT.CABLES, E.cable || ""), chains = roleQ(shop, "chain"), prot = chains.length || has("wrap") || has("sleeve");
    var feedN = J.filter(function (o) { return o.Enc.iface !== "none" && o.Enc.iface !== "internal"; }).length;
    if (level >= 2 && !prot) add("warn", "cavi", "Cablaggio", "Cablaggio non protetto", "Cavi liberi lungo un braccio che si muove si impigliano, si tagliano sugli spigoli e tirano i connettori.", "Catena portacavi (igus E2 o triflex per robot) o guaina spiralata dalla Dispensa.");
    if (E.cable && cable.id && !cable.sh && level >= 2 && J.some(function (o) { return ["ac", "stepper", "stepper_cl", "bldc"].indexOf(o.M.type) >= 0; }))
      add("warn", "cavi", "Cablaggio", "Cavo motore non schermato", "I drive alimentano i motori con impulsi PWM ripidi: un cavo non schermato disturba encoder e segnali.", "Cavo motore schermato con lo schermo a terra a 360° ai due capi.");
    if (chains.length) {
      var ch = chains.map(function (x) { return x.it; }).sort(function (a, b) { return b.bi * b.hi - a.bi * a.hi; })[0];
      var nMot = nonHob.length, ods = [];
      for (var q = 0; q < nMot; q++) ods.push(cable.od);
      for (q = 0; q < feedN; q++) ods.push(6.5);
      hoses.forEach(function (x) { ods.push(x.it.od, x.it.od); });
      var Rmin = cable.od * cable.bendF, ccalc = "Cavo motore Ø" + fmt(cable.od, 1) + " mm × " + fmt(cable.bendF, 1) + " = raggio minimo " + fmt(Rmin, 0) + " mm; catena R " + ch.R + " mm. Nella catena: " + nMot + " cavi motore, " + feedN + " cavi encoder (Ø6,5), " + (hoses.length * 2) + " tubi aria.";
      out.chain = { it: ch, Rmin: Rmin, ods: ods, calc: ccalc };
      if (cable.flex === "fixed") add("warn", "cavi", "Cablaggio", "Cavo non adatto alla catena", (cable.id ? cable.name : "Il cavo generico") + " è per posa fissa: in catena i conduttori si spezzano dopo poche decine di migliaia di piegature.", "Cavo per catena portacavi (classe chainflex) o cavo robot.", ccalc);
      if (ch.R < Rmin) add("err", "cavi", "Cablaggio", "Catena con raggio troppo stretto per il cavo", "Il cavo vuole un raggio di almeno " + fmt(Rmin, 0) + " mm, la catena curva a " + ch.R + " mm: il cavo si rompe in poche settimane.", "Catena con raggio maggiore o cavo più sottile/flessibile.", ccalc);
      var odMax = Math.max.apply(null, ods.concat([0]));
      if (odMax > 0.9 * ch.hi) add("err", "cavi", "Cablaggio", "Il cavo non entra nella catena", "Diametro " + fmt(odMax, 1) + " mm in uno spazio di " + ch.hi + " mm (serve ≤ 90%).", "Catena più alta.", ccalc);
      if (ch.kind === "3d") { var area = ods.reduce(function (s, d) { return s + d * d; }, 0), cap = 0.6 * ch.hi * ch.hi; if (area > cap) add("warn", "cavi", "Cablaggio", "Catena 3D troppo piena", "Riempimento " + fmt(area / (ch.hi * ch.hi) * 100, 0) + "% (massimo consigliato 60%).", "Catena più grande o meno cavi (bus di campo al posto di cavi singoli).", ccalc); }
      else { var w = ods.reduce(function (s, d) { return s + d * 1.1; }, 0); if (w > ch.bi) add("warn", "cavi", "Cablaggio", "Catena troppo stretta", "Affiancati i cavi occupano " + fmt(w, 0) + " mm su " + ch.bi + " mm: si sovrappongono e si consumano.", "Catena più larga o separatori a ripiani.", ccalc);
        if (build.axes >= 5) add("info", "cavi", "Cablaggio", "La catena E2 lavora su un piano", "Sui giunti di rotazione (J1, J4, J6) una catena piana si torce.", "Per bracci a 6 assi usa una catena 3D (triflex) o fascette rotanti.", ccalc); }
    }
    var cpls = roleQ(shop, "coupling");
    if (cpls.length && nonHob.length) {
      var Tmax = Math.max.apply(null, nonHob.map(function (o) { return o.Tpk || 0; })), Tk = Math.max.apply(null, cpls.map(function (x) { return x.it.Tk; }));
      if (Tk < Tmax) add("warn", "montaggio", "Montaggio", "Giunto di accoppiamento sottodimensionato", "Il motore più forte arriva a " + fmt(Tmax, 2) + " N·m di picco, il giunto regge " + fmt(Tk, 0) + " N·m.", "Giunto più grande (classe ROTEX 24) o motore flangiato direttamente al riduttore.");
    }

    /* --- viti delle flange --- */
    var boltsUsed = [];
    J.forEach(function (o) {
      if (o.M.type === "servo_hobby") return;
      var bo = boltOf(o.b), tag = o.name;
      if (!bo) { if (level >= 2) add("info", "montaggio", tag, tag + ": viti della flangia non scelte", "Le viti fissano il riduttore alla struttura e trasmettono tutta la coppia del giunto.", "Scegli misura, classe e numero nel pannello del giunto o dalla Dispensa (Bulloneria)."); return; }
      boltsUsed.push(bo);
      var T = o.loads ? o.loads.Mtot : 0, Mt = o.bear ? (o.bear.Mt || 0) : 0, Fr = o.bear ? (o.bear.Fb || 0) : 0;
      var r = bo.pcd / 2000, muT = 0.15, Ss = 1.8;
      var Fslip = (T * Ss / r + Fr * Ss) / (muT * bo.n), Ftilt = 4 * Mt / (bo.n * bo.pcd / 1000), FKreq = Fslip + Ftilt;
      var wrench = !toolsKnown || haveTool("torque", bo.MA), aA = wrench ? 1.6 : 3.0, FMmin = bo.FM / aA, mg = FMmin / Math.max(FKreq, 1e-6);
      var FSmax = bo.FM + 0.1 * Ftilt, Fyield = bo.B.As * bo.C.Rp;
      var bcalc = bo.n + "× " + bo.B.s + " " + bo.C.id + " su Ø" + fmt(bo.pcd, 0) + " mm. Coppia giunto " + fmt(T, 1) + " N·m × 1,8 (sicurezza allo slittamento) / (μ 0,15 × " + bo.n + " × " + fmt(r * 1000, 0) + " mm) + taglio " + fmt(Fr, 0) + " N → " + fmt(Fslip, 0) + " N per vite; momento ribaltante " + fmt(Mt, 1) + " N·m → 4M/(n·D) = " + fmt(Ftilt, 0) + " N. Serraggio minimo richiesto " + fmt(FKreq, 0) + " N. Precarico " + fmt(bo.FM / 1000, 1) + " kN / αA " + fmt(aA, 1) + (wrench ? " (chiave dinamometrica)" : " (serraggio a mano: dispersione ±50%)") + " = " + fmt(FMmin, 0) + " N → margine " + fmt(mg, 2) + "×. Coppia di serraggio " + fmt(bo.MA, 1) + " N·m.";
      o.boltCheck = { bo: bo, Fslip: Fslip, Ftilt: Ftilt, FKreq: FKreq, FMmin: FMmin, m: mg, calc: bcalc, aA: aA };
      if (mg < 1) add("err", "montaggio", tag, tag + ": viti della flangia insufficienti", "Il serraggio non basta a tenere la flangia ferma: con la coppia del giunto e il momento ribaltante la flangia slitta o si apre, le viti lavorano a taglio e si allentano.", "Più viti, diametro primitivo maggiore, classe più alta" + (wrench ? "" : " o serraggio con chiave dinamometrica") + ". Aggiungi due spine di centraggio.", bcalc);
      else if (mg < 1.3) add("warn", "montaggio", tag, tag + ": viti della flangia con poco margine", "Margine " + fmt(mg, 2) + "× sul serraggio necessario.", "Una misura in più o due viti in più.", bcalc);
      if (FSmax > Fyield) add("warn", "montaggio", tag, tag + ": viti oltre lo snervamento", "Precarico + carico supera lo snervamento della vite.", "Classe più alta o diametro maggiore.", bcalc);
      if (/^al/.test(o.mat.id) && bo.C.i >= 1 && !has("insert")) add("warn", "montaggio", tag, tag + ": filetti nell'alluminio", "Una vite " + bo.C.id + " avvitata direttamente nell'alluminio strappa il filetto prima di arrivare alla coppia giusta.", "Inserti Helicoil (Dispensa · Bulloneria) o avvitamento ≥ 2·d = " + 2 * bo.B.d + " mm.", bcalc);
      if (o.mat.plastic && !has("insert_pla")) add("warn", "montaggio", tag, tag + ": viti nella plastica", "I filetti nel PLA/PETG si rovinano al primo smontaggio.", "Inserti a caldo in ottone.", bcalc);
    });
    if (J.some(function (o) { return o.mat.id === "al6063"; }) && !has("tnut")) add("warn", "montaggio", "Montaggio", "Profilati senza dadi a T", "I profilati a cava si montano con dadi a T e angolari.", "Dadi a T cava 8 dalla Dispensa.");
    out.bolts = boltsUsed;

    /* --- attrezzi (solo se il gioco passa il banco attrezzi) --- */
    if (toolsKnown) {
      var req = [];
      function need(kind, val, sev, why) { var ok = haveTool(kind, val), s = suggestTool(kind, val); req.push({ kind: kind, val: val, ok: ok, sev: sev, why: why, sug: s ? s.id : null, sugName: s ? s.name : kind }); }
      var hexes = {}, mas = {};
      boltsUsed.forEach(function (bo) { hexes[bo.B.hex] = 1; var k = fmt(bo.MA, 1); if (!mas[k] || bo.C.i > mas[k].C.i) mas[k] = bo; });
      if (J.some(function (o) { return o.mat.id === "al6063"; })) hexes[5] = 1;
      Object.keys(hexes).forEach(function (h) { need("hex", +h, "err", "Chiave a brugola da " + h + " mm per le viti dei giunti"); });
      Object.keys(mas).forEach(function (k) { var bo = mas[k]; need("torque", bo.MA, bo.C.i >= 1 ? "err" : "warn", "Serraggio " + bo.B.s + " " + bo.C.id + " a " + fmt(bo.MA, 1) + " N·m" + (bo.C.i >= 1 ? " (le 10.9/12.9 vanno serrate a coppia)" : "")); });
      if (boltsUsed.some(function (bo) { return bo.MA > 3; })) need("hexbits", 0, "warn", "Bussole a brugola da montare sulla chiave dinamometrica");
      need("screwdrivers", 0, "warn", "Morsetti, carter e coperture");
      need("multimeter", 0, "warn", "Controllare tensioni e polarità prima di accendere");
      need("caliper", 0, "warn", "Misurare pezzi, fori e spessori");
      if (nonHob.length) need("crimp_ferrule", 0, "warn", "Puntalini sui cavi flessibili nei morsetti dei driver");
      if (micro) need("solder", 0, "warn", "Saldare pin header e connettori della scheda");
      if ((mission.tol || 5) <= 1) need("dial", 0, "warn", "Misurare gioco e allineamento al centesimo nel collaudo");
      if (J.some(function (o) { return !o.mat.plastic && o.L > 0 && o.M.type !== "servo_hobby"; })) { need("drillpress", 0, "warn", "Forare le flange dritte"); need("tap", 0, "warn", "Filettare i fori delle flange (M8 → punta 6,8 mm)"); }
      if (c.power && c.power.Pac > 0) need("vde", 0, "warn", "Lavorare sul quadro a 230 V (sezionato e lucchettato)");
      if (J.some(function (o) { return o.mJoint + o.mLink > 25; })) need("hoist", 0, "warn", "Sollevare giunti oltre 25 kg");
      if ((c.elec && c.elec.stepRate > 20000) || J.some(function (o) { return o.iface === "can" || o.iface === "ethercat"; })) need("scope", 0, "info", "Vedere impulsi e segnali del bus");
      out.tools = req;
      var miss = req.filter(function (x) { return !x.ok; });
      var eg = {}, eo = [];
      miss.filter(function (x) { return x.sev === "err"; }).forEach(function (x) { var key = x.sugName; if (!eg[key]) { eg[key] = []; eo.push(key); } eg[key].push(x.why); });
      eo.forEach(function (key) { add("err", "montaggio", "Attrezzi", "Attrezzo mancante: " + key, eg[key].join("; ") + ".", "Aggiungilo al banco attrezzi dalla Dispensa (Attrezzi)."); });
      var mw = miss.filter(function (x) { return x.sev === "warn"; });
      if (mw.length) add("warn", "montaggio", "Attrezzi", "Banco attrezzi incompleto (" + mw.length + ")", mw.map(function (x) { return x.sugName + " – " + x.why.toLowerCase(); }).join("; ") + ".", "Aggiungi gli attrezzi dalla Dispensa: restano sul banco per tutte le missioni.");
    }

    /* --- PLC / PC industriale: I/O --- */
    var sens = shop.filter(function (x) { return ["sensor", "gripsensor", "vacsw", "safetysensor"].indexOf(x.it.role) >= 0; });
    var es = CAT.byId(CAT.ESTOPS, E.estop);
    var di = 0, dq = 0, ai = 0, hscN = 0, pto = [], diL = [], dqL = [];
    function dI(n, why) { if (n > 0) { di += n; diL.push(n + " " + why); } }
    function dQ(n, why) { if (n > 0) { dq += n; dqL.push(n + " " + why); } }
    dI(es.level >= 1 ? 1 : 0, "emergenza"); dI(es.level >= 3 ? 1 : 0, "reset sicurezza");
    dI(E.homing !== "none" ? build.axes : 0, "finecorsa di homing");
    sens.forEach(function (x) { var n = x.it.io === "DI" ? 1 : x.it.io === "D2" ? 2 : 0; if (x.it.role === "gripsensor") n = 2; dI(n * x.q, x.it.name.split(" (")[0].toLowerCase()); if (x.it.io === "AI") ai += x.q; });
    shop.forEach(function (x) { if (x.it.di && x.it.role !== "module") dI(x.it.di * x.q, x.it.name.toLowerCase()); if (x.it.dq && x.it.role !== "module") dQ(x.it.dq * x.q, x.it.name.toLowerCase()); });
    var coils = valves.reduce(function (s, x) { return s + (x.it.coils || 1) * x.q; }, 0); dQ(coils, "bobine elettrovalvole");
    if (eff.io) { dI(eff.io.di, "segnali pinza"); dQ(eff.io.dq, "comandi pinza"); }
    J.forEach(function (o) {
      if (o.iface === "stepdir") { pto.push(o); dQ(plc ? 3 : 1, o.name + (plc ? " impulsi/direzione/abilitazione" : " abilitazione")); if (o.D.closesLoop) dI(1, o.name + " allarme drive"); }
      if (o.brakeRelay) dQ(1, o.name + " freno");
      if (o.Enc.iface === "ab" && !o.D.closesLoop) hscN++;
    });
    if (plc || ipc) {
      var mods = roleQ(shop, "module"), bad = mods.filter(function (x) { return x.it.fam.indexOf(mcu.fam) < 0; });
      bad.forEach(function (x) { add("err", "plc", "PLC", "Modulo non compatibile: " + x.it.name, "Si collega solo a " + x.it.fam.join(", ") + "; il tuo controllore è " + mcu.name + ".", "Scegli moduli della stessa famiglia."); });
      var okm = mods.filter(function (x) { return x.it.fam.indexOf(mcu.fam) >= 0; });
      var elTerm = okm.filter(function (x) { return x.it.fam[0] === "ethercat" && !x.it.coupler; });
      if (elTerm.length && !mcu.ebus && !okm.some(function (x) { return x.it.coupler; })) add("err", "plc", "PLC", "Morsetti EtherCAT senza accoppiatore", "I morsetti EL si agganciano a un accoppiatore EK1100 (o direttamente a un Beckhoff CX).", "Aggiungi l'EK1100 dalla Dispensa.");
      var aDI = (mcu.di || 0) + okm.reduce(function (s, x) { return s + x.it.di * x.q; }, 0), aDQ = (mcu.dq || 0) + okm.reduce(function (s, x) { return s + x.it.dq * x.q; }, 0), aAI = (mcu.ai || 0) + okm.reduce(function (s, x) { return s + x.it.ai * x.q; }, 0), aHSC = (mcu.hsc || 0) + okm.reduce(function (s, x) { return s + (x.it.hsc || 0) * x.q; }, 0);
      out.io = { di: di, dq: dq, ai: ai, hsc: hscN, pto: pto.length, aDI: aDI, aDQ: aDQ, aAI: aAI, aHSC: aHSC, aPTO: mcu.pto || 0, diL: diL, dqL: dqL };
      var iocalc = "Ingressi: " + (diL.join(", ") || "nessuno") + " = " + di + " su " + aDI + ". Uscite: " + (dqL.join(", ") || "nessuna") + " = " + dq + " su " + aDQ + ".";
      if (di > aDI) add("err", "plc", "PLC", "Ingressi digitali insufficienti (" + di + " / " + aDI + ")", "Ogni sensore, finecorsa, pulsante e segnale di drive occupa un ingresso.", ipc ? "Aggiungi morsetti EtherCAT EL1008 (con accoppiatore EK1100)." : "Aggiungi un modulo di ingressi della stessa famiglia.", iocalc);
      if (dq > aDQ) add("err", "plc", "PLC", "Uscite digitali insufficienti (" + dq + " / " + aDQ + ")", "Valvole, freni, abilitazioni e impulsi occupano uscite.", ipc ? "Aggiungi morsetti EtherCAT EL2008." : "Aggiungi un modulo di uscite della stessa famiglia.", iocalc);
      if (ai > aAI) add("err", "plc", "PLC", "Ingressi analogici insufficienti", ai + " sensori analogici su " + aAI + " ingressi.", "Modulo AI.", iocalc);
      if (!has24 && mcu.id !== "s7_1214r") add("err", "plc", "PLC", "Il " + (ipc ? "PC industriale" : "PLC") + " si alimenta a 24 V DC", "PLC, sensori e moduli lavorano a 24 V in continua.", "Alimentatore DIN 24 V (Mean Well HDR/SDR) o l'ausiliario 24 V.");
      if (plc) {
        J.forEach(function (o) {
          if (o.iface === "pwm" || o.iface === "i2c") add("err", "plc", o.name, o.name + ": il PLC non comanda servo hobby", "I servo hobby vogliono un PWM a 5 V da 50 Hz: le uscite del PLC sono a 24 V.", "Usa stepper o servo con drive industriale, oppure un microcontrollore.");
          if (o.iface === "pwmdir") add("warn", "plc", o.name, o.name + ": ponte H a 5 V comandato a 24 V", "Il driver DC/BLDC economico ha ingressi logici a 5 V.", "Interfaccia 24 → 5 V (optoisolatori) o driver con ingressi 24 V.");
          if (o.iface === "can" && !has("canmod")) add("err", "plc", o.name, o.name + ": il PLC non ha il CAN", mcu.name + " non parla CANopen.", "Modulo CANopen per PLC o drive su " + mcu.net + ".");
          if (o.iface === "ethercat" && !mcu.ethercat) add("err", "plc", o.name, o.name + ": drive EtherCAT su un PLC " + mcu.net, mcu.name + " non è un master EtherCAT.", "Omron NX1P2, Beckhoff CX o drive per " + mcu.net + ".");
          if (["spi", "i2c"].indexOf(o.Enc.iface) >= 0 || (o.Enc.iface === "biss" && !o.encToDriver)) add("err", "plc", o.name, o.name + ": encoder " + o.Enc.iface.toUpperCase() + " non leggibile dal PLC", "Il PLC legge encoder A/B (contatori veloci) o assoluti su bus, non SPI/I²C.", "Encoder A/B a 24 V, oppure encoder collegato al drive.");
          if (o.iface === "stepdir" && mcu.pto && o.stepHz > mcu.ptoHz) add("err", "plc", o.name, o.name + ": impulsi troppo veloci per il PLC", "Servono " + fmt(o.stepHz, 0) + " impulsi/s, le uscite PTO arrivano a " + fmt(mcu.ptoHz, 0) + ".", "Meno microstep o drive su bus.");
          if (o.iface === "stepdir" && o.D.opto5 && !E.levelShift && o.M.type !== "ac") add("warn", "plc", o.name, o.name + ": impulsi a 24 V su ingressi da 5 V", o.D.name + " ha ingressi optoisolati a 5 V.", "Resistenze in serie da 2,2 kΩ (o attiva gli adattatori di livello) se il driver non accetta 24 V.");
        });
        if (pto.length > (mcu.pto || 0)) add("err", "plc", "PLC", mcu.relay ? "Uscite a relè: niente impulsi" : "Uscite impulsi insufficienti (" + pto.length + " / " + (mcu.pto || 0) + ")", mcu.relay ? "I relè scattano al massimo qualche volta al secondo: non possono generare migliaia di impulsi step." : "Ogni asse step/dir occupa un'uscita a treno di impulsi (PTO).", "PLC con uscite a transistor e più PTO, o drive su bus (EtherCAT con Omron NX1P2 / Beckhoff).");
        if (hscN > aHSC) add("err", "plc", "PLC", "Contatori veloci insufficienti", hscN + " encoder A/B su " + aHSC + " contatori.", "Encoder collegati ai drive o modulo contatori.");
        J.forEach(function (o) { if (o.encHz && mcu.hscHz && o.encHz > mcu.hscHz) add("err", "plc", o.name, o.name + ": encoder troppo veloce per i contatori", fmt(o.encHz, 0) + " impulsi/s, i contatori arrivano a " + fmt(mcu.hscHz, 0) + ".", "Encoder con meno impulsi o sull'uscita."); });
        if (sens.some(function (x) { return x.it.io === "I2C"; })) add("err", "plc", "PLC", "Sensori I²C su un PLC", "Il PLC non ha il bus I²C delle schede maker.", "Sensori industriali 24 V (digitali, 4–20 mA o IO-Link).");
        if (sens.some(function (x) { return x.it.v && x.it.v < 12 && (x.it.io === "DI" || x.it.io === "D2"); })) add("warn", "plc", "PLC", "Sensori a 5 V su ingressi a 24 V", "Un sensore da 5 V non porta l'ingresso del PLC sopra la soglia (≈ 15 V).", "Sensori a 24 V.");
        add("info", "plc", "PLC", "Software del PLC", { "s7-1200": "TIA Portal STEP 7 Basic (licenza a pagamento).", "s7-1500": "TIA Portal STEP 7 Professional (licenza a pagamento).", micro800: "Connected Components Workbench (gratuito).", nx: "Sysmac Studio (licenza).", cp: "CX-Programmer (CX-One, licenza).", dvp: "ISPSoft (gratuito).", ethercat: "TwinCAT 3 (sviluppo gratuito, licenza runtime).", opta: "Arduino PLC IDE o IDE Arduino (gratuiti).", controllino: "IDE Arduino (gratuito, C++)." }[mcu.fam] || "", "Lo trovi nella lezione «PLC o microcontrollore?» della sezione C++.");
      }
    } else {
      var extraPins = 0;
      sens.forEach(function (x) { extraPins += (x.it.io === "DI" ? 1 : x.it.io === "D2" ? 2 : 0) * x.q; if (x.it.role === "gripsensor") extraPins += 1 * x.q; });
      extraPins += coils;
      shop.forEach(function (x) { if (x.it.role !== "module") extraPins += ((x.it.di || 0) + (x.it.dq || 0)) * x.q; });
      if (eff.io) extraPins += eff.io.di + eff.io.dq;
      out.io = { extraPins: extraPins };
      if (c.elec && c.elec.pinsUsed <= c.elec.pinsAvail && c.elec.pinsUsed + extraPins > c.elec.pinsAvail) add("err", "elettronica", "MCU", "Pin insufficienti con i componenti della Dispensa", "Giunti e sicurezza usano " + c.elec.pinsUsed + " pin, sensori/valvole/pinza altri " + extraPins + ": " + mcu.name + " ne ha " + c.elec.pinsAvail + ".", "Scheda con più pin, espansore I/O (MCP23017) o un PLC.");
      var s24 = sens.filter(function (x) { return x.it.v === 24 && (x.it.io === "DI" || x.it.io === "D2"); }).length + ((eff.io && eff.v24) ? 1 : 0);
      if (s24 && !has("opto") && !E.levelShift) add("warn", "elettronica", "MCU", "Sensori a 24 V sull'MCU", "Un'uscita a 24 V su un pin da 3,3/5 V lo brucia.", "Modulo optoisolatore 24 V → 3,3/5 V dalla Dispensa.");
      if (sens.some(function (x) { return x.it.io === "USB"; }) && !has("sbc")) add("err", "elettronica", "MCU", "La telecamera vuole un computer", mcu.name + " non elabora immagini.", "Raspberry Pi 5 (Dispensa) che parla con l'MCU via seriale.");
      if (sens.some(function (x) { return x.it.io === "ETH"; }) && ["teensy41", "esp32"].indexOf(mcu.id) < 0 && !has("sbc")) add("err", "elettronica", "MCU", "Sensore Ethernet su una scheda senza rete", mcu.name + " non ha Ethernet.", "Teensy 4.1, Raspberry Pi o un PLC.");
    }
    if (shop.some(function (x) { return x.it.io === "eth"; }) && micro && ["teensy41", "esp32"].indexOf(mcu.id) < 0 && !has("sbc")) add("err", "elettronica", "MCU", "Sensore forza/coppia senza Ethernet", "Il sensore F/T comunica in Ethernet.", "Teensy 4.1, Raspberry Pi, PLC o PC industriale.");

    /* --- scorte --- */
    shop.forEach(function (x) { if (x.q > x.it.stock) add("info", "montaggio", "Dispensa", "Scorta insufficiente: " + x.it.name, "Ne servono " + x.q + ", in magazzino " + x.it.stock + ".", "Ordine con consegna in circa " + x.it.lead + " settimane."); });

    /* --- costi Dispensa --- */
    var lines = [];
    shop.forEach(function (x) { if (x.it.role !== "tool") lines.push({ name: x.it.name, q: x.q, unit: x.it.unit, p: x.it.p, tot: x.it.p * x.q, mass: (x.it.mass || 0) * x.q, id: x.it.id, cat: x.it.cat }); });
    J.forEach(function (o) { if (o.boltCheck) { var bo = o.boltCheck.bo; lines.push({ name: o.name + " · " + 2 * bo.n + "× vite ISO 4762 " + bo.B.s + " " + bo.C.id, q: 2 * bo.n, unit: "pz", p: bo.eur, tot: 2 * bo.n * bo.eur, mass: 0, id: "iso4762_" + bo.B.s.toLowerCase(), cat: "bulloneria", bolt: o.k }); } });
    if (E.cable && cable.id) { var Lc = Math.round((c.reach + 1.5) * build.axes); lines.push({ name: cable.name + " · cavi motore", q: Lc, unit: "m", p: cable.eurm, tot: Lc * cable.eurm, mass: 0, id: "cab_" + cable.id, cat: "flessibili" }); }
    var fg = fingersOf(build); if (eff.kind && ["elec", "pneu"].indexOf(eff.kind) >= 0 && fg.price) lines.push({ name: fg.name, q: 1, unit: "pz", p: fg.price, tot: fg.price, mass: 0, id: null, cat: "pinze" });
    out.lines = lines; out.cost = lines.reduce(function (s, l) { return s + l.tot; }, 0);
    return out;
  }

  /* ---------- distinta completa per la UI ---------- */
  function bom(build, R) {
    var L = [], E = build.elec;
    function push(grp, name, q, unit, p, mass, id, extra) { var o = { grp: grp, name: name, q: q, unit: unit || "pz", p: p, tot: p * q, mass: mass || 0, id: id || null }; if (extra) for (var k in extra) o[k] = extra[k]; L.push(o); }
    R.J.forEach(function (o) {
      push("Motori", o.name + " · " + o.M.name, 1, "pz", o.M.price, o.M.mass, "mot_" + o.M.id);
      if (o.R.type !== "none") push("Riduttori", o.name + " · " + o.R.name + " " + o.i + ":1", 1, "pz", o.R.price, o.R.mass, "red_" + o.R.id);
      if (o.S.price) push("Cuscinetti e freni", o.name + " · " + o.S.name, 1, "pz", o.S.price, o.S.mass, "sup_" + o.S.id);
      if (o.Br.price) push("Cuscinetti e freni", o.name + " · " + o.Br.name, 1, "pz", o.Br.price, o.Br.mass, "brk_" + o.Br.id);
      if (o.D.price) push("Elettronica", o.name + " · " + o.D.name, 1, "pz", o.D.price, 0, "drv_" + o.D.id);
      if (o.Enc.price) push("Sensori", o.name + " · " + o.Enc.name, 1, "pz", o.Enc.price, 0, "enc_" + o.Enc.id);
      if (o.L > 0) push("Struttura", o.name + " · " + o.mat.name.split(" (")[0] + " " + secName(o.b.link) + " L " + Math.round(o.L * 1000) + " mm", 1, "pz", Math.round(o.mLink * o.mat.eur + o.mat.mach), o.mLink, null);
    });
    push("Pinze e utensili", R.eff.name, 1, "pz", R.eff.price, R.eff.mass, "eff_" + R.eff.id);
    var mcu = R.mcu; push("Elettronica", mcu.name, 1, "pz", mcu.price, 0, "mcu_" + mcu.id);
    if (R.psu && R.psu.price) push("Elettronica", "Alimentatore " + R.psu.name, 1, "pz", R.psu.price, 0, "psu_" + R.psu.id);
    var sp = CAT.byId(CAT.SERVO_PSUS, E.servoPsu); if (sp.price) push("Elettronica", "Alimentatore servo " + sp.name, 1, "pz", sp.price, 0, "spsu_" + sp.id);
    var es = CAT.byId(CAT.ESTOPS, E.estop); if (es.price) push("Sicurezza", es.name, 1, "pz", es.price, 0, "es_" + es.id);
    var hm = CAT.byId(CAT.HOMING, E.homing); if (hm.price) push("Sicurezza", hm.name, build.axes, "pz", hm.price, 0, "hom_" + hm.id);
    if (R.asm) R.asm.lines.forEach(function (l) { push(l.cat === "bulloneria" ? "Bulloneria" : "Dalla Dispensa", l.name, l.q, l.unit, l.p, l.mass, l.id, { shop: !!(l.id && build.shop && build.shop[l.id]) }); });
    return L;
  }
  function secName(l) { return l.sec === "round" ? "Ø" + l.D : l.sec === "tube" ? "Ø" + l.D + "×" + l.t : l.sec === "rect" ? l.B + "×" + l.H : l.B + "×" + l.H + "×" + l.t; }

  /* ---------- passi di montaggio con gli attrezzi ---------- */
  function steps(build, R, toolIds) {
    var T = (toolIds || []).map(function (id) { return PAN.byId(id); }).filter(Boolean);
    function ok(kind, val) { return T.some(function (t) { return toolCovers(t, kind, val); }); }
    var S = [], metal = R.J.some(function (o) { return !o.mat.plastic && o.L > 0; });
    S.push({ t: "Taglia a misura e sbava tubi e profilati" + (metal ? "" : " (o stampa i pezzi in 3D)"), k: metal ? [["saw"], ["deburr"], ["caliper"]] : [["caliper"]] });
    var bs = R.asm ? R.asm.bolts : [];
    if (bs.length) {
      var sizes = {}; bs.forEach(function (b) { sizes[b.B.s] = b.B; });
      S.push({ t: "Fora e filetta le flange: " + Object.keys(sizes).map(function (s) { return s + " → punta Ø" + fmt(sizes[s].tap, 1); }).join(", "), k: [["drillpress"], ["tap"], ["caliper"]] });
      R.J.forEach(function (o) { if (!o.boltCheck) return; var b = o.boltCheck.bo; S.push({ t: o.name + ": monta il riduttore con " + b.n + "× " + b.B.s + " " + b.C.id + " a " + fmt(b.MA, 1) + " N·m, a croce, in 3 passate (30% · 70% · 100%)", k: [["hex", b.B.hex], ["torque", b.MA], ["hexbits"]] }); });
    }
    if ((R.mission.tol || 5) <= 1) S.push({ t: "Controlla gioco e allineamento dei giunti con il comparatore", k: [["dial"]] });
    S.push({ t: "Cabla: puntalini, schermi a terra a 360°, cavi in catena senza fascette", k: [["stripper"], ["crimp_ferrule"], ["screwdrivers"]] });
    S.push({ t: "Prima accensione senza motori: tensioni, polarità e continuità della terra", k: [["multimeter"], ["benchpsu"]] });
    if (R.mcu && !R.mcu.plc && R.mcu.id !== "ipc") S.push({ t: "Salda header e connettori della scheda di controllo", k: [["solder"], ["crimp_dupont"]] });
    S.push({ t: "Prova movimenti lenti, emergenza e homing; controlla gli impulsi", k: [["scope"]] });
    S.push({ t: "Collaudo: misura il cedimento in punta con il carico", k: [["dial"], ["caliper"]] });
    S.forEach(function (s) { s.tools = s.k.map(function (k) { var sg = suggestTool(k[0], k[1]); return { kind: k[0], val: k[1], ok: ok(k[0], k[1]), name: sg ? sg.name : k[0], id: sg ? sg.id : null }; }); s.ready = s.tools.every(function (t) { return t.ok; }); });
    return S;
  }
  var api = { check: check, bom: bom, steps: steps, effWithFlange: effWithFlange, boltOf: boltOf, shopList: shopList, fingersOf: fingersOf, suggestTool: suggestTool };
  if (node) module.exports = api; else root.ASM = api;
})(this);
