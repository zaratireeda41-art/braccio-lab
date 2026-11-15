/* XENTRIQ INDUSTRY · Braccio Lab — motore di calcolo.
   Formule coerenti con braccio-calcoli/j2core.js e sel-core.js (stessi modelli di coppia,
   torsione, Von Mises e torsione dei riduttori cicloidali/armonici). */
(function (root) {
  "use strict";
  var CAT = (typeof module !== "undefined" && module.exports) ? require("./catalog.js") : root.CAT;
  var g = 9.81, AM = Math.PI / 180 / 60, SF_DEF = 2.5, ECC = 0.03;
  var KINDS = { 4: ["yaw", "pitch", "pitch", "pitch"], 5: ["yaw", "pitch", "pitch", "pitch", "roll"], 6: ["yaw", "pitch", "pitch", "roll", "pitch", "roll"] };
  var KIND_IT = { yaw: "rotazione base (asse verticale)", pitch: "beccheggio (asse orizzontale, porta il peso)", roll: "rotolamento (asse lungo il braccio)" };

  function fmt(x, d) {
    if (x === Infinity) return "∞";
    if (x == null || !isFinite(x)) return "—";
    if (d == null) d = Math.abs(x) >= 100 ? 0 : Math.abs(x) >= 10 ? 1 : 2;
    var s = x.toFixed(d).split(".");
    s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return s.join(",");
  }

  /* ---- formule base (identiche a j2core) ---- */
  function loadsFromItems(items, omegaDeg, tAcc, F, R, SF) {
    var r = {};
    r.Mstat = 0; r.I = 0; r.mTot = 0;
    items.forEach(function (it) { r.Mstat += it.m * g * it.r; r.I += (it.Icg || 0) + it.m * it.r * it.r; r.mTot += it.m; });
    r.omega = omegaDeg * Math.PI / 180; r.alpha = r.omega / tAcc;
    r.Tdyn = r.I * r.alpha; r.Mproc = F * R;
    r.Mtot = r.Mstat + r.Tdyn + r.Mproc; r.Mdes = r.Mtot * (SF || SF_DEF);
    return r;
  }
  function shaftStrengthDiameter(TdesNm, tauAmm) { return Math.cbrt(16 * TdesNm * 1000 / (Math.PI * tauAmm)); }
  function hollowShaft(TNm, D, d) {
    var J = Math.PI * (Math.pow(D, 4) - Math.pow(d, 4)) / 32;
    return { J: J, tau: TNm * 1000 * (D / 2) / J, Wf: J / D };
  }
  function stiffDiameter(TNm, Lt, Gg, thetaMax) { var J = TNm * 1000 * Lt / (Gg * 1000 * thetaMax); return Math.pow(32 * J / Math.PI, 0.25); }
  function vonMises(s, t) { return Math.sqrt(s * s + 3 * t * t); }
  // torsione riduttori (rad) — modelli di sel-core.js
  function hdTwist(T, p) { T = Math.abs(T); var T1 = p[0], T2 = p[1], K1 = p[2], K2 = p[3], K3 = p[4];
    if (T <= T1) return T / K1; if (T <= T2) return T1 / K1 + (T - T1) / K2; return T1 / K1 + (T2 - T1) / K2 + (T - T2) / K3; }
  function cycTwist(T, LM, Tr, K) { T = Math.abs(T); var t3 = 0.03 * Tr;
    if (T <= t3) return (LM / 2) * (T / t3) * AM; return (LM / 2 + (T - t3) / K) * AM; }
  function linTwist(T, LM, K) { T = Math.abs(T); if (!isFinite(K)) return 0; return (T > 0 ? LM / 2 * AM : 0) + T / (K / AM); }

  function section(l) {
    var D = +l.D || 0, t = +l.t || 0, B = +l.B || 0, H = +l.H || 0, s = { ok: true };
    if (l.sec === "round") { s.A = Math.PI * D * D / 4; s.I = s.Iz = Math.PI * Math.pow(D, 4) / 64; s.J = 2 * s.I; s.W = s.Wz = s.I / (D / 2); s.Wt = s.J / (D / 2); s.h = D; s.desc = "tondo Ø" + fmt(D, 0); }
    else if (l.sec === "tube") { var d = D - 2 * t; if (!(t > 0) || d < 0) { s.ok = false; d = 0; }
      s.A = Math.PI * (D * D - d * d) / 4; s.I = s.Iz = Math.PI * (Math.pow(D, 4) - Math.pow(d, 4)) / 64; s.J = 2 * s.I; s.W = s.Wz = s.I / (D / 2); s.Wt = s.J / (D / 2); s.h = D; s.desc = "tubo Ø" + fmt(D, 0) + "×" + fmt(t, 1); }
    else if (l.sec === "rect") { s.A = B * H; s.I = B * H * H * H / 12; s.Iz = H * B * B * B / 12; s.W = B * H * H / 6; s.Wz = H * B * B / 6;
      var a = Math.max(B, H), b = Math.min(B, H); s.J = a * b * b * b * (1 / 3 - 0.21 * (b / a) * (1 - Math.pow(b, 4) / (12 * Math.pow(a, 4)))); s.Wt = a * b * b / (3 + 1.8 * b / a); s.h = H; s.desc = "barra " + fmt(B, 0) + "×" + fmt(H, 0); }
    else { var Bi = B - 2 * t, Hi = H - 2 * t; if (!(t > 0) || Bi < 0 || Hi < 0) { s.ok = false; Bi = Math.max(Bi, 0); Hi = Math.max(Hi, 0); }
      s.A = B * H - Bi * Hi; s.I = (B * H * H * H - Bi * Hi * Hi * Hi) / 12; s.Iz = (H * B * B * B - Hi * Bi * Bi * Bi) / 12; s.W = s.I / (H / 2); s.Wz = s.Iz / (B / 2);
      var Am = (B - t) * (H - t); s.J = 4 * Am * Am * t / (2 * (B + H - 2 * t)); s.Wt = 2 * Am * t; s.h = H; s.desc = "tubolare " + fmt(B, 0) + "×" + fmt(H, 0) + "×" + fmt(t, 1); }
    if (!(s.A > 0)) s.ok = false;
    return s;
  }
  function etaOf(R, i) {
    if (R.type === "planetary") return i <= 10 ? 0.95 : i <= 50 ? 0.92 : 0.88;
    if (R.type === "harmonic") return 0.70;
    if (R.type === "cyclo") return 0.75;
    if (R.type === "belt") return 0.96;
    if (R.type === "worm") return i <= 30 ? 0.65 : i <= 50 ? 0.55 : 0.45;
    return 1;
  }
  function twistOf(R, i, T) {
    if (R.type === "cyclo") return cycTwist(T, R.LM, R.Tr, R.K);
    if (R.type === "harmonic") return hdTwist(T, R.hd);
    if (R.type === "none") return 0;
    return linTwist(T, R.LM, R.K);
  }
  function wireFor(A) { for (var k = 0; k < CAT.WIRES.length; k++) if (CAT.WIRES[k].A >= A) return CAT.WIRES[k]; return CAT.WIRES[CAT.WIRES.length - 1]; }

  function analyze(build, mission) {
    mission = mission || {};
    var SF = mission.SF || SF_DEF;
    var n = build.axes, kinds = KINDS[n], issues = [], J = [];
    var F = mission.F || 0, lat = !!mission.lat, omegaDeg = mission.speed || 60, tAcc = mission.tAcc || 0.5;
    var omega = omegaDeg * Math.PI / 180, alpha = omega / tAcc;
    var E = build.elec, mcu = CAT.byId(CAT.MCUS, E.mcu), psu = CAT.byId(CAT.PSUS, E.psu), spsu = CAT.byId(CAT.SERVO_PSUS, E.servoPsu);
    var eff = CAT.byId(CAT.EFFECTORS, build.effector);
    var payload = mission.payload || 0;
    function add(sev, cat, joint, title, why, fix, calc) { issues.push({ sev: sev, cat: cat, joint: joint, title: title, why: why, fix: fix || "", calc: calc || "" }); }

    // ---- risolvi componenti
    for (var k = 0; k < n; k++) {
      var b = build.joints[k], o = { k: k, name: "J" + (k + 1), kind: kinds[k], b: b };
      o.M = CAT.byId(CAT.MOTORS, b.motor); o.R = CAT.byId(CAT.REDUCERS, b.reducer);
      o.i = o.R.ratios.indexOf(+b.ratio) >= 0 ? +b.ratio : o.R.ratios[0];
      o.eta = etaOf(o.R, o.i); o.selfLock = o.R.type === "worm" && o.i >= 50;
      o.S = CAT.byId(CAT.SUPPORTS, b.support); o.Br = CAT.byId(CAT.BRAKES, b.brake);
      o.D = CAT.byId(CAT.DRIVERS, b.driver); o.Enc = CAT.byId(CAT.ENCODERS, b.encoder);
      o.encOut = !!o.Enc.output;
      o.mat = CAT.byId(CAT.MATERIALS, b.link.mat); o.sec = section(b.link); o.L = Math.max(0, +b.link.L || 0);
      o.shaftMat = CAT.byId(CAT.MATERIALS, b.shaftMat || "c45");
      o.a = +b.a || 60; o.bb = +b.b || 100;
      var M = o.M, hob = M.type === "servo_hobby";
      if (hob) { o.Tn = 0.5 * M.Tstall; o.Tpk = 0.8 * M.Tstall; o.Jm = 0; }
      else if (M.type === "stepper" || M.type === "stepper_cl") { o.Jm = M.J; }
      else { o.Tn = M.Tn; o.Tpk = M.Tpk; o.Jm = M.J; }
      // masse
      var housing = hob ? 0.02 : 0.15 * (M.mass + o.R.mass) + 0.1;
      o.shaftMass = o.S.kind === "pair" ? o.shaftMat.rho * Math.PI * o.S.d * o.S.d / 4 * 1e-9 * (o.a + o.bb + 20) : 0;
      o.mJoint = M.mass + o.R.mass + o.Br.mass + o.S.mass + housing + o.shaftMass;
      o.mLink = o.mat.rho * o.sec.A * 1e-6 * o.L;
      J.push(o);
    }
    // ---- geometria (braccio orizzontale, caso peggiore per la gravità)
    var x = 0; J[0].x = 0; J[0].h = J[0].L;
    for (k = 1; k < n; k++) { J[k].x = x; x += J[k].L; }
    var xEnd = x, xEff = xEnd + eff.L / 2, xTip = xEnd + eff.L, reach = xTip, height = J[0].L;
    // elementi di massa
    function itemsOut(k, withPay, withArm) {
      var it = [];
      for (var j = k; j < n; j++) { if (j === 0) continue;
        if (withArm !== false) { if (j > k) it.push({ name: "Giunto " + J[j].name, m: J[j].mJoint, x: J[j].x, Icg: 0 });
          it.push({ name: "Link " + J[j].name, m: J[j].mLink, x: J[j].x + J[j].L / 2, Icg: J[j].mLink * J[j].L * J[j].L / 12, link: j }); } }
      if (withArm !== false) it.push({ name: eff.name, m: eff.mass, x: xEff, Icg: 0 });
      if (withPay !== false && payload > 0) it.push({ name: "Carico utile", m: payload, x: xTip, Icg: 0 });
      return it;
    }
    // ---- carichi per giunto
    J.forEach(function (o) {
      var k = o.k;
      if (o.kind === "pitch") {
        var it = itemsOut(k).map(function (q) { return { name: q.name, m: q.m, r: q.x - o.x, Icg: q.Icg }; });
        o.items = it; o.loads = loadsFromItems(it, omegaDeg, tAcc, F, xTip - o.x, SF);
        o.Wout = it.reduce(function (s, q) { return s + q.m * g; }, 0);
        o.MstatArm = loadsFromItems(itemsOut(k, false).map(function (q) { return { m: q.m, r: q.x - o.x, Icg: q.Icg }; }), omegaDeg, tAcc, 0, 0, SF).Mstat;
      } else if (o.kind === "yaw") {
        var it0 = itemsOut(1).map(function (q) { return { name: q.name, m: q.m, r: q.x, Icg: q.Icg }; });
        it0.push({ name: "Giunto J2", m: J[1].mJoint, r: 0, Icg: 0 });
        o.items = it0; var L0 = loadsFromItems(it0, omegaDeg, tAcc, lat ? F : 0, xTip, SF);
        o.MgravBase = L0.Mstat; o.loads = Object.assign({}, L0, { Mstat: 0 });
        o.loads.Mtot = o.loads.Tdyn + o.loads.Mproc; o.loads.Mdes = o.loads.Mtot * SF;
        o.Wout = it0.reduce(function (s, q) { return s + q.m * g; }, 0);
        o.MstatArm = 0;
      } else {
        var mE = eff.mass + payload, mo = 0;
        itemsOut(k).forEach(function (q) { mo += q.m; });
        var Ir = mo * 0.04 * 0.04 + mE * ECC * ECC;
        var Ms = mE * g * ECC;
        o.items = [{ name: "Utensile + carico eccentrici " + fmt(ECC * 1000, 0) + " mm", m: mE, r: ECC, Icg: 0 }];
        o.loads = { Mstat: Ms, I: Ir, omega: omega, alpha: alpha, Tdyn: Ir * alpha, Mproc: F * ECC };
        o.loads.Mtot = o.loads.Mstat + o.loads.Tdyn + o.loads.Mproc; o.loads.Mdes = o.loads.Mtot * SF;
        o.Wout = mo * g; o.MstatArm = eff.mass * g * ECC;
        o.cgDist = 0; itemsOut(k).forEach(function (q) { o.cgDist += q.m * (q.x - o.x); }); o.cgDist = mo > 0 ? o.cgDist / mo : 0;
      }
    });
    // ---- tensione PSU motori
    var Vbus = psu.V;
    // ---- motore, riduttore, velocità
    J.forEach(function (o) {
      var L = o.loads, M = o.M, R = o.R, i = o.i, eta = o.eta, tag = o.name;
      var hob = M.type === "servo_hobby", step = M.type === "stepper" || M.type === "stepper_cl";
      o.nOut = omegaDeg / 6; o.nMot = o.nOut * i;
      if (step) {
        var Vd = Vbus || 24, ncEff = M.nc * Math.min(3, Math.max(0.5, Vd / 24));
        var Ilim = (o.D.Icont && o.D.Icont !== "match") ? Math.min(1, o.D.Icont / M.I) : 1;
        o.Ilim = Ilim;
        var Tav = 0.85 * M.Th * Ilim * (o.nMot <= ncEff ? 1 : ncEff / o.nMot);
        o.Tn = o.Tpk = Tav; o.ncEff = ncEff;
      }
      o.TmCont = (L.Mstat + L.Mproc) / (i * eta);
      o.TmPeak = L.Mtot / (i * eta) + (o.Jm || 0) * alpha * i;
      o.mCont = o.TmCont > 0 ? o.Tn / o.TmCont : Infinity;
      o.mPeak = o.TmPeak > 0 ? o.Tpk / o.TmPeak : Infinity;
      var need = step && M.type === "stepper" ? 1.5 : 1.2;
      var mot = M.name;
      var calcT = "Coppia all'uscita: statica " + fmt(L.Mstat) + " + dinamica I·α = " + fmt(L.I, 3) + "·" + fmt(L.alpha, 3) + " = " + fmt(L.Tdyn) + " + processo " + fmt(L.Mproc) + " = " + fmt(L.Mtot) + " N·m. " +
        "Al motore: " + fmt(L.Mtot) + " / (i " + fmt(i, 1) + " · η " + fmt(eta, 2) + ")" + (o.Jm ? " + J_motore·α·i" : "") + " = " + fmt(o.TmPeak, 3) + " N·m di picco; continua " + fmt(o.TmCont, 3) + " N·m.";
      o.calcT = calcT;
      if (o.mPeak < 1 || o.mCont < 1) {
        add("err", "motore", tag, tag + ": motore troppo debole",
          (hob ? "La coppia scritta sui servo hobby è quella di stallo: in uso continuo regge circa la metà (" + fmt(o.Tn, 2) + " N·m). " : step ? "Lo stepper a " + fmt(o.nMot, 0) + " giri/min dà solo " + fmt(o.Tn, 2) + " N·m (la coppia cala con la velocità" + (o.Ilim < 1 ? " e il driver limita la corrente al " + fmt(o.Ilim * 100, 0) + "%" : "") + "). " : "") +
          "Serve " + fmt(o.TmPeak, 3) + " N·m di picco e " + fmt(o.TmCont, 3) + " N·m continui al motore; " + mot + " ne dà " + fmt(o.Tpk, 2) + " di picco e " + fmt(o.Tn, 2) + " continui.",
          "Aumenta il rapporto di riduzione, scegli un motore più forte, accorcia o alleggerisci i link a valle, oppure riduci velocità/accelerazione.", calcT);
      } else if (o.mPeak < need || o.mCont < need) {
        add("warn", "motore", tag, tag + ": margine di coppia basso (" + fmt(Math.min(o.mPeak, o.mCont), 2) + "×)",
          step && M.type === "stepper" ? "Uno stepper ad anello aperto che arriva al limite perde passi senza accorgersene: la posizione diventa sbagliata." : "Il motore lavora vicino al limite: si scalda e non ha riserva per urti o carichi imprevisti.",
          "Punta ad almeno " + fmt(need, 1) + "× di margine: rapporto più alto o motore più grande.", calcT);
      }
      // velocità
      var nMaxEff = M.nMax;
      if ((M.type === "dc" || M.type === "bldc") && Vbus) nMaxEff = M.nMax * Math.min(1, Vbus / M.V[1]);
      if (hob) {
        var degAvail = M.degps / i;
        o.speedOk = degAvail >= omegaDeg;
        if (!o.speedOk) add("err", "velocità", tag, tag + ": troppo lento", "Con questo servo" + (i > 1 ? " e riduzione " + i + ":1" : "") + " il giunto arriva a " + fmt(degAvail, 0) + " °/s, la missione chiede " + fmt(omegaDeg, 0) + " °/s.", "Riduci il rapporto o usa un servo più veloce.");
      } else {
        o.nMaxEff = nMaxEff;
        if (o.nMot > nMaxEff) add("err", "velocità", tag, tag + ": il motore non arriva alla velocità richiesta",
          "Per " + fmt(omegaDeg, 0) + " °/s al giunto il motore deve girare a " + fmt(o.nOut, 2) + " × " + fmt(i, 1) + " = " + fmt(o.nMot, 0) + " giri/min, ma il massimo è " + fmt(nMaxEff, 0) + " giri/min" + (nMaxEff < M.nMax ? " (ridotto dalla tensione di " + Vbus + " V)" : "") + ".",
          "Scegli un rapporto più basso o un motore più veloce" + (step ? " (o alza la tensione: gli stepper a 48 V tengono più coppia in velocità)" : "") + ".");
        else if (M.nN && o.nMot > M.nN) add("warn", "velocità", tag, tag + ": motore sopra la velocità nominale", "Gira a " + fmt(o.nMot, 0) + " giri/min, oltre i " + fmt(M.nN, 0) + " nominali: la coppia disponibile cala.", "Riduci il rapporto di qualche taglia.");
        if (o.nMot > R.nInMax) add("err", "velocità", tag, tag + ": riduttore troppo veloce in ingresso", "L'ingresso del riduttore gira a " + fmt(o.nMot, 0) + " giri/min, il massimo ammesso è " + fmt(R.nInMax, 0) + ".", "Scegli un rapporto più basso.");
      }
      // riduttore
      if (R.type !== "none") {
        o.calcR = "Coppia di lavoro " + fmt(L.Mtot) + " N·m contro nominale " + fmt(R.Tr) + " / avvio-arresto " + fmt(R.Tacc) + "; coppia di progetto (×" + fmt(SF, 1) + ") " + fmt(L.Mdes) + " N·m contro emergenza " + fmt(R.Tmom) + " N·m.";
        if (L.Mtot > R.Tacc) add("err", "riduttore", tag, tag + ": riduttore sovraccarico", "La coppia di lavoro (" + fmt(L.Mtot) + " N·m) supera anche quella ammessa in avvio/arresto (" + fmt(R.Tacc) + " N·m): i denti si rompono.", "Passa alla taglia superiore del riduttore.", o.calcR);
        else if (L.Mtot > R.Tr) add("warn", "riduttore", tag, tag + ": sopra la coppia nominale del riduttore", "Lavori a " + fmt(L.Mtot) + " N·m, oltre i " + fmt(R.Tr) + " N·m nominali: la vita si accorcia molto (va con la potenza 3–3,3 del rapporto).", "Va bene solo per cicli brevi; altrimenti taglia superiore.", o.calcR);
        if (L.Mdes > R.Tmom) add("err", "riduttore", tag, tag + ": non regge un urto", "La coppia di progetto con coefficiente " + fmt(SF, 1) + " (" + fmt(L.Mdes) + " N·m) supera il limite di emergenza (" + fmt(R.Tmom) + " N·m): in caso di collisione il riduttore si rompe.", "Taglia superiore, oppure limite di coppia nel drive e frizione di sicurezza.", o.calcR);
        else if (L.Mdes > R.Tacc) add("warn", "riduttore", tag, tag + ": coppia di progetto oltre quella di avvio/arresto", "Con il coefficiente " + fmt(SF, 1) + " servono " + fmt(L.Mdes) + " N·m, oltre i " + fmt(R.Tacc) + " di avvio/arresto (ma sotto l'emergenza).", "Accettabile se le accelerazioni sono dolci; meglio una taglia in più.", o.calcR);
        o.torqueLimit = null;
        if (!hob && isFinite(R.Tacc) && o.Tpk * i > R.Tacc) {
          o.torqueLimit = R.Tacc / i;   // prudente: rendimento 100% (come in sel-core: 1029/121 = 8,50 N·m)
          var brk = o.Tpk * i > R.Tmom && !E.torqueLimit;
          add(brk ? "warn" : "info", "riduttore", tag, tag + ": " + (brk ? "il motore può rompere il riduttore" : "imposta un limite di coppia"), "Al picco il motore può spingere fino a " + fmt(o.Tpk * i) + " N·m all'uscita (prudenzialmente senza perdite), più dei " + fmt(R.Tacc) + " N·m che il riduttore regge in avvio/arresto" + (brk ? " e perfino dei " + fmt(R.Tmom) + " N·m di emergenza." : "."), (E.torqueLimit ? "Limite attivo: nel drive imposta " + fmt(o.torqueLimit, 2) + " N·m lato motore (lo sketch generato lo riporta)." : "Attiva «Limiti di coppia nei drive» in Elettronica e imposta " + fmt(o.torqueLimit, 2) + " N·m lato motore."));
        }
        if (R.frames && M.frame && (M.frame < R.frames[0] * 0.8 || M.frame > R.frames[1] * 1.25)) add("warn", "meccanica", tag, tag + ": flangia motore-riduttore diversa", "Il motore ha flangia " + M.frame + " mm, il riduttore è pensato per " + R.frames[0] + "–" + R.frames[1] + " mm.", "Serve una flangia adattatrice e un giunto; oppure scegli componenti di taglia simile.");
        if (hob && R.type !== "belt" && R.type !== "planetary") add("warn", "meccanica", tag, tag + ": servo hobby con riduttore industriale", "Un servo hobby ha già la sua riduzione e un potenziometro sull'uscita: un riduttore esterno grande non ha senso.", "Usa cinghia/planetario piccolo o passa a stepper.");
      }
      // freno
      o.needsBrake = o.kind === "pitch" && L.Mstat > 0.5;
      o.brakeHold = o.Br.Tb * i;
      if (o.kind === "pitch") {
        if (o.Br.Tb > 0 && o.brakeHold < 1.5 * L.Mstat && !o.selfLock) add("err", "sicurezza", tag, tag + ": freno troppo debole", "Il freno tiene " + fmt(o.Br.Tb, 1) + " × " + fmt(i, 1) + " = " + fmt(o.brakeHold) + " N·m all'uscita; servono almeno 1,5 × " + fmt(L.Mstat) + " = " + fmt(1.5 * L.Mstat) + " N·m.", "Scegli un freno più grande.");
        if (o.needsBrake && o.Br.Tb === 0 && !o.selfLock) {
          var sev = mission.brakes ? "err" : (hob ? "info" : "warn");
          add(sev, "sicurezza", tag, tag + ": manca il freno su un asse che porta peso", "Se manca corrente, questo giunto deve tenere " + fmt(L.Mstat) + " N·m di gravità: senza freno " + (hob ? "il braccio cade appena spegni." : "il braccio crolla (i riduttori armonici, cicloidali e planetari sono reversibili)."),
            hob ? "Su un braccio da scrivania va bene; ricordati di appoggiarlo prima di spegnere." : "Aggiungi un freno a molla (si chiude senza corrente) oppure una vite senza fine autobloccante.");
        }
        if (o.selfLock && o.Br.Tb === 0 && o.needsBrake) add("info", "sicurezza", tag, tag + ": vite senza fine autobloccante", "Con rapporto " + i + ":1 la vite senza fine non torna indietro da sola: fa da freno statico, ma con vibrazioni può scivolare e rende solo il " + fmt(eta * 100, 0) + "%.", "Per macchine serie aggiungi comunque un freno.");
      }
      if (o.Br.Tb > 0 && (M.type === "servo_hobby")) add("warn", "meccanica", tag, tag + ": freno su servo hobby", "Non si monta un freno industriale su un servo hobby.", "Togli il freno o cambia motore.");
    });
    // ---- tensioni nei link e nella colonna
    J.forEach(function (o) {
      var tag = o.name, mat = o.mat, s = o.sec;
      if (!s.ok) { add("err", "struttura", tag, tag + ": sezione impossibile", "Lo spessore della parete è troppo grande rispetto alle dimensioni esterne (o una misura è zero).", "Correggi le misure del link."); o.stress = null; return; }
      var Mb, T, label;
      if (o.k === 0) { Mb = J[0].MgravBase + F * xTip; T = lat ? F * xTip : 0; label = "colonna"; }
      else { Mb = o.loads.Mtot; T = F > 0 ? F * ECC : 0; label = "link"; }
      if (o.L <= 0) { o.stress = null; return; }
      var sig = Mb * 1000 / s.W, tau = T * 1000 / s.Wt, vm = vonMises(sig, tau), amm = mat.Re / SF;
      o.stress = { Mb: Mb, T: T, sig: sig, tau: tau, vm: vm, amm: amm, m: amm / vm };
      var calc = "Momento flettente alla radice del " + label + " " + fmt(Mb) + " N·m → σ = M/W = " + fmt(Mb * 1000, 0) + " / " + fmt(s.W, 0) + " mm³ = " + fmt(sig, 1) + " MPa; torsione τ = " + fmt(tau, 1) + " MPa; Von Mises √(σ²+3τ²) = " + fmt(vm, 1) + " MPa ≤ Re/SF = " + fmt(mat.Re, 0) + "/" + fmt(SF, 1) + " = " + fmt(amm, 1) + " MPa.";
      o.calcS = calc;
      if (vm > amm) add("err", "struttura", tag, tag + ": " + label + " troppo debole (" + fmt(vm, 0) + " MPa)", "La tensione di Von Mises (" + fmt(vm, 1) + " MPa) supera quella ammessa con coefficiente " + fmt(SF, 1) + " (" + fmt(amm, 1) + " MPa) per " + mat.name + ".", "Aumenta l'altezza della sezione (conta al quadrato/cubo), usa un tubo più grande o un materiale più resistente.", calc);
      if (mat.brittle && vm > 0.6 * amm) add("warn", "struttura", tag, tag + ": carbonio vicino al limite", "Il carbonio non snerva: si rompe di colpo. Con " + fmt(vm, 0) + " MPa il margine è stretto per un materiale fragile.", "Usa coefficiente 3–4 o un tubo più grande; cura gli incollaggi con le flange.");
      if (mat.plastic && sig > 8) add("warn", "struttura", tag, tag + ": plastica sotto carico continuo", "Il PLA/PETG a " + fmt(sig, 1) + " MPa costanti si deforma lentamente nel tempo (creep).", "Tieni la tensione sotto 5–8 MPa o passa all'alluminio.");
      if ((o.b.link.sec === "tube" || o.b.link.sec === "rtube") && !mat.plastic && +o.b.link.t < 1.5) add("warn", "struttura", tag, tag + ": parete troppo sottile", "Con parete sotto 1,5 mm il tubo si ammacca nei morsetti e attorno alle viti.", "Parete ≥ 2 mm o inserti/flange incollate.");
    });
    // ---- cuscinetti / supporti
    J.forEach(function (o) {
      var tag = o.name, S = o.S, R = o.R, L = o.loads;
      var Fb, Mt, Fa = 0;
      if (o.kind === "pitch") { Fb = o.Wout + F; Mt = Fb * (o.bb / 1000) + (lat ? F * (xTip - o.x) : 0); Fa = lat ? F : 0; }
      else if (o.kind === "yaw") { Fa = o.Wout + J[0].mLink * g * 0; Fb = lat ? F : 0; Mt = J[0].MgravBase + F * xTip; }
      else { Fb = o.Wout + F; Mt = o.Wout * o.cgDist + F * (xTip - o.x); }
      o.bear = { Fb: Fb, Mt: Mt, Fa: Fa };
      var calc = "Forza radiale " + fmt(Fb, 0) + " N, momento ribaltante " + fmt(Mt, 1) + " N·m, forza assiale " + fmt(Fa, 0) + " N.";
      if (S.kind === "reducer") {
        if (R.Mc) { o.bear.cap = R.Mc; o.bear.m = R.Mc / Mt;
          calc += " Il riduttore ammette " + fmt(R.Mc, 0) + " N·m di momento sui suoi cuscinetti.";
          if (Mt > R.Mc) add("err", "cuscinetti", tag, tag + ": cuscinetti del riduttore sovraccarichi", "Il momento ribaltante (" + fmt(Mt) + " N·m) supera quello ammesso dal riduttore (" + fmt(R.Mc, 0) + " N·m).", "Avvicina il link alla flangia (riduci lo sbalzo), aggiungi un cuscinetto a rulli incrociati separato o prendi un riduttore più grande.", calc);
          else if (Mt * SF > R.Mc) add("warn", "cuscinetti", tag, tag + ": poco margine sui cuscinetti del riduttore", "Con coefficiente " + fmt(SF, 1) + " il momento (" + fmt(Mt * SF) + " N·m) supera i " + fmt(R.Mc, 0) + " N·m ammessi.", "Riduci lo sbalzo del link o aggiungi un supporto.", calc);
        } else if (R.Fr) { o.bear.cap = R.Fr; o.bear.m = R.Fr / Fb;
          calc += " Albero d'uscita: carico radiale ammesso " + fmt(R.Fr, 0) + " N.";
          if (Fb > R.Fr) add("err", "cuscinetti", tag, tag + ": troppo carico sull'albero del riduttore", "Il carico radiale (" + fmt(Fb, 0) + " N) supera quello ammesso (" + fmt(R.Fr, 0) + " N).", "Metti due cuscinetti propri e collega il riduttore con un giunto.", calc);
          if (o.kind !== "yaw" && Mt > R.Fr * 0.04) add("warn", "cuscinetti", tag, tag + ": carico a sbalzo sull'albero del riduttore", "I planetari e le viti senza fine non sono fatti per reggere momenti ribaltanti (" + fmt(Mt) + " N·m).", "Aggiungi un supporto con due cuscinetti o rulli incrociati.", calc);
          if (o.kind === "yaw") add("warn", "cuscinetti", tag, tag + ": base appoggiata sull'albero del riduttore", "Il peso del braccio crea " + fmt(Mt) + " N·m di ribaltamento sulla base: un albero di riduttore non è fatto per questo.", "Usa una ralla o un cuscinetto a rulli incrociati sotto la base.", calc);
        } else {
          add(o.M.type === "servo_hobby" ? "warn" : "err", "cuscinetti", tag, tag + ": nessun cuscinetto d'uscita", R.type === "none" ? "Senza riduttore il carico finisce sui cuscinetti del motore, che non sono fatti per questo." : "Questo riduttore (" + R.name + ") non ha cuscinetti d'uscita.", "Scegli un supporto: due cuscinetti con albero o rulli incrociati.", calc);
        }
      } else if (S.kind === "servo") {
        o.bear.cap = S.Mc; o.bear.m = Math.min(S.Mc / Math.max(Mt, 1e-9), S.FrMax / Math.max(Fb, 1e-9));
        if (Mt > S.Mc || Fb > S.FrMax) add(o.M.type === "servo_hobby" ? "err" : "warn", "cuscinetti", tag, tag + ": " + (S.id === "servo" ? "albero del servo sovraccarico" : "supporto del servo sovraccarico"), "Momento " + fmt(Mt, 2) + " N·m (ammesso ≈ " + fmt(S.Mc, 1) + ") e forza " + fmt(Fb, 0) + " N (ammessa ≈ " + fmt(S.FrMax, 0) + " N): il servo si scardina e i denti di plastica/metallo si spanano.", S.id === "servo" ? "Aggiungi un cuscinetto sul lato opposto del servo (staffa a U con 608)." : "Riduci il peso a sbalzo o passa a cuscinetti veri.", calc);
        if (o.M.type !== "servo_hobby") add("err", "cuscinetti", tag, tag + ": supporto da servo su un motore vero", "Questo supporto ha senso solo con i servo hobby.", "Scegli cuscinetti integrati, coppia di cuscinetti o rulli incrociati.");
      } else if (S.kind === "pair") {
        var a = o.a, bb = o.bb;
        var RB = Fb * (a + bb) / a, RA = Fb * bb / a, Mx = (o.kind === "pitch" && lat ? F * (xTip - o.x) : o.kind === "yaw" ? Mt : 0);
        RB += Mx * 1000 / a;
        var P = Math.max(RA, RB), s0 = S.C0 / P, Lh = Math.pow(S.C / (1.2 * P), 3) * 1e6 / (60 * 5);
        o.bear.RA = RA; o.bear.RB = RB; o.bear.s0 = s0; o.bear.Lh = Lh; o.bear.m = s0 / 2;
        calc += " Appoggi a " + a + " mm, sbalzo " + bb + " mm: R_B = F(a+b)/a = " + fmt(RB, 0) + " N, R_A = F·b/a = " + fmt(RA, 0) + " N. s₀ = C₀/P = " + fmt(S.C0, 0) + "/" + fmt(P, 0) + " = " + fmt(s0, 2) + "; durata L10 ≈ " + fmt(Lh, 0) + " h a 5 giri/min.";
        if (s0 < 1) add("err", "cuscinetti", tag, tag + ": cuscinetti schiacciati", "Il cuscinetto più caricato prende " + fmt(P, 0) + " N, più della sua capacità statica (" + fmt(S.C0, 0) + " N).", "Cuscinetti più grandi, più distanza fra i due (a) e meno sbalzo (b).", calc);
        else if (s0 < 2) add("warn", "cuscinetti", tag, tag + ": cuscinetti al limite (s₀ = " + fmt(s0, 2) + ")", "Per un braccio serve s₀ ≥ 2 per non segnare le piste negli urti.", "Aumenta la taglia o la distanza fra i cuscinetti.", calc);
        if (Lh < 10000 && s0 >= 1) add("warn", "cuscinetti", tag, tag + ": durata cuscinetti bassa", "Durata stimata " + fmt(Lh, 0) + " ore.", "Taglia superiore.", calc);
        if (o.kind === "yaw" && !S.taper) add("warn", "cuscinetti", tag, tag + ": base su cuscinetti radiali", "Sulla base gravano peso (assiale) e ribaltamento: i cuscinetti radiali semplici non sono adatti.", "Conici a O o rulli incrociati.");
        // albero
        var sm = o.shaftMat, d = S.d, Mf = Fb * bb, Tdes = L.Mdes * 1000;
        var sig = 32 * Mf / (Math.PI * d * d * d), tau = 16 * Tdes / (Math.PI * d * d * d), vm = vonMises(sig, tau), amm = sm.Re / SF;
        var dReq = shaftStrengthDiameter(L.Mdes, sm.Re / Math.sqrt(3) / SF);
        o.shaft = { d: d, sig: sig, tau: tau, vm: vm, amm: amm, dReq: dReq, m: amm / vm };
        var tw = L.Mtot * 1000 * a / (sm.G * 1000 * Math.PI * Math.pow(d, 4) / 32);
        o.shaft.theta = tw;
        var calcA = "Albero pieno Ø" + d + " in " + sm.name + ": flessione σ = 32·F·b/(πd³) = " + fmt(sig, 1) + " MPa, torsione con coppia di progetto τ = 16·T/(πd³) = " + fmt(tau, 1) + " MPa, Von Mises " + fmt(vm, 1) + " MPa (ammessa " + fmt(amm, 1) + "). Diametro minimo a sola torsione: " + fmt(dReq, 1) + " mm.";
        o.calcShaft = calcA;
        if (vm > amm) add("err", "struttura", tag, tag + ": albero Ø" + d + " troppo debole", "Von Mises " + fmt(vm, 1) + " MPa contro " + fmt(amm, 1) + " MPa ammessi.", "Cuscinetti con foro più grande (albero più grosso), materiale più resistente o meno sbalzo.", calcA);
      } else if (S.kind === "xroller") {
        var Feq = Fb + 2 * Mt / S.dp, Pc = Feq + 0.45 * Fa, Lh2 = Math.pow(S.C / (1.5 * Pc), 10 / 3) * 1e6 / (60 * 5), P0 = Feq + 0.44 * Fa, fs = S.C0 / P0;
        o.bear.Feq = Feq; o.bear.fs = fs; o.bear.Lh = Lh2; o.bear.m = fs / 2;
        calc += " Rulli incrociati: F_eq = F_r + 2M/d_p = " + fmt(Feq, 0) + " N, f_s = C₀/P₀ = " + fmt(fs, 2) + ", durata ≈ " + fmt(Lh2, 0) + " h.";
        if (fs < 1) add("err", "cuscinetti", tag, tag + ": rulli incrociati sovraccarichi", "Carico equivalente " + fmt(P0, 0) + " N oltre la capacità statica " + fmt(S.C0, 0) + " N.", "Taglia più grande.", calc);
        else if (fs < 2) add("warn", "cuscinetti", tag, tag + ": rulli incrociati al limite (f_s " + fmt(fs, 2) + ")", "Serve f_s ≥ 2.", "Taglia più grande o meno sbalzo.", calc);
      }
      o.calcB = calc;
    });
    // ---- deformazione in punta
    function beamTip(loadsPay, withF, plane) {
      // integrazione numerica della linea elastica dei link orizzontali
      var N = 400, dx = xEnd / N, th = 0, de = 0;
      var pts = []; // carichi concentrati (N) e posizione
      var pay = loadsPay, pl = plane || "v";
      if (pl === "v") {
        for (var j = 2; j < n; j++) pts.push([J[j].mJoint * g, J[j].x]);
        pts.push([eff.mass * g, xEff]);
        if (pay && payload) pts.push([payload * g, xTip]);
        if (withF) pts.push([F, xTip]);
      } else { if (withF) pts.push([F, xTip]); }
      for (var s = 0; s < N; s++) {
        var xm = (s + 0.5) * dx, Mx = 0, EI = 1e30;
        pts.forEach(function (p) { if (p[1] > xm) Mx += p[0] * (p[1] - xm); });
        for (var q = 1; q < n; q++) { var x0 = J[q].x, x1 = x0 + J[q].L;
          if (pl === "v") { var w = J[q].mLink * g / Math.max(J[q].L, 1e-9); if (x1 > xm) { var lo = Math.max(x0, xm); Mx += w * (x1 - lo) * ((x1 + lo) / 2 - xm); } }
          if (xm >= x0 && xm < x1) EI = J[q].mat.E * 1e9 * (pl === "v" ? J[q].sec.I : J[q].sec.Iz) * 1e-12; }
        var kap = Mx / EI; de += th * dx + kap * dx * dx / 2; th += kap * dx;
      }
      return de + th * (xTip - xEnd);
    }
    function jointTip(withPay, withF) {
      var tot = 0, parts = [];
      J.forEach(function (o) {
        if (o.kind !== "pitch") return;
        var Mo = withPay || withF ? (o.loads.Mstat + (withF ? o.loads.Mproc : 0) - (withPay ? 0 : payload * g * (xTip - o.x))) : o.MstatArm;
        var th = twistOf(o.R, o.i, Mo);
        if (o.M.type === "servo_hobby") th += linTwist(Mo, 0, o.M.Tstall / 20);
        if (o.M.type === "stepper") th += Mo / (o.eta * 50 * o.M.Th * o.i * o.i);
        if (o.shaft) th += Mo * 1000 * o.a / (o.shaftMat.G * 1000 * Math.PI * Math.pow(o.shaft.d, 4) / 32);
        if (o.encOut) th *= 0.2;
        var d = th * (xTip - o.x) * 1000; tot += d; parts.push([o.name, d]);
      });
      return { tot: tot, parts: parts };
    }
    var col = J[0], colEI = col.mat.E * 1e9 * col.sec.I * 1e-12, colGJ = col.mat.G * 1e9 * col.sec.J * 1e-12;
    function columnTip(withPay, withF) {
      if (!col.sec.ok || col.L <= 0) return 0;
      var Mc = J[0].MgravBase - (withPay ? 0 : payload * g * xTip) + (withF ? F * xTip : 0);
      return Mc * col.L / colEI * xTip * 1000;
    }
    var jAll = jointTip(true, true), jArm = jointTip(false, false);
    var bAll = beamTip(true, true, "v") * 1000, bArm = beamTip(false, false, "v") * 1000;
    var cAll = columnTip(true, true), cArm = columnTip(false, false);
    var defl = { total: jAll.tot + bAll + cAll, arm: jArm.tot + bArm + cArm };
    defl.vert = defl.total - defl.arm;
    defl.joints = jAll.parts.map(function (p, ix) { return [p[0], p[1] - jArm.parts[ix][1]]; });
    defl.beam = bAll - bArm; defl.column = cAll - cArm;
    defl.lat = 0;
    if (lat && F > 0) {
      var th1 = twistOf(J[0].R, J[0].i, F * xTip); if (J[0].encOut) th1 *= 0.2;
      var lJ1 = th1 * xTip * 1000, lCol = col.sec.ok && col.L > 0 ? F * xTip * col.L / colGJ * xTip * 1000 : 0, lBeam = beamTip(false, true, "h") * 1000, lTilt = 0;
      J.forEach(function (o) { if (o.kind === "pitch" && o.R.Km) lTilt += F * (xTip - o.x) / (o.R.Km / AM) * (xTip - o.x) * 1000; });
      defl.lat = lJ1 + lCol + lBeam + lTilt; defl.latParts = { J1: lJ1, colonna: lCol, link: lBeam, ribaltamento: lTilt };
    }
    var lmF = F > 0 ? 1 : 0.25, lm = 0;
    J.forEach(function (o) { if (o.kind !== "pitch") return; var LMo = (o.R.type === "none" ? 0 : o.R.LM) + (o.M.type === "servo_hobby" ? 60 : 0); if (o.encOut) LMo *= 0.2; lm += LMo * lmF * AM * (xTip - o.x) * 1000; });
    defl.lm = lm; defl.err = Math.max(defl.vert, defl.lat) + lm;
    // risoluzione
    var res = 0;
    J.forEach(function (o) { if (o.kind === "roll") return;
      var a;
      if (o.encOut) a = 2 * Math.PI / o.Enc.cpr;
      else if (o.Enc.cpr > 0 && o.Enc.iface !== "none") a = 2 * Math.PI / (o.Enc.cpr * (o.M.type === "servo_hobby" ? 1 : o.i));
      else if (o.M.type === "stepper") a = 2 * Math.PI / (200 * 4 * o.i);
      else a = 2 * Math.PI / 1024;
      res += a * (o.k === 0 ? xTip : xTip - o.x) * 1000; });
    defl.res = res;
    var tol = mission.tol || 1;
    var calcD = "Spostamento della punta dovuto a carico e forza di processo (il peso proprio del braccio si compensa con la calibrazione): giunti " + fmt(defl.joints.reduce(function (s, p) { return s + p[1]; }, 0), 3) + " mm, flessione dei link " + fmt(defl.beam, 3) + " mm, colonna " + fmt(defl.column, 3) + " mm" + (defl.lat ? "; laterale " + fmt(defl.lat, 3) + " mm" : "") + "; gioco (lost motion) " + fmt(lm, 3) + " mm. Errore stimato " + fmt(defl.err, 3) + " mm, tolleranza " + fmt(tol, 2) + " mm.";
    defl.calc = calcD;
    if (defl.err > tol) add("err", "precisione", "Punta", "Precisione insufficiente: " + fmt(defl.err, 2) + " mm (obiettivo " + fmt(tol, 2) + " mm)", "Sotto carico la punta si sposta troppo. Contributi: " + defl.joints.map(function (p) { return p[0] + " " + fmt(p[1], 3); }).join(", ") + " mm dai giunti, " + fmt(defl.beam, 3) + " mm dai link, " + fmt(defl.column, 3) + " mm dalla colonna" + (defl.lat ? ", " + fmt(defl.lat, 3) + " mm laterali" : "") + ", gioco " + fmt(lm, 3) + " mm.",
      "Agisci sul contributo più grande: riduttore più rigido (cicloidale), link più alti o in acciaio, braccio più corto, encoder sull'uscita.", calcD);
    else if (defl.err > 0.8 * tol) add("warn", "precisione", "Punta", "Precisione al limite: " + fmt(defl.err, 2) + " mm", "Sei sopra l'80% della tolleranza: basta poco (temperatura, montaggio) per uscire.", "Tieni un po' di riserva sulla rigidezza.", calcD);
    if (res > tol / 2) add("warn", "precisione", "Punta", "Risoluzione degli encoder grossolana", "Il passo minimo misurabile in punta è circa " + fmt(res, 3) + " mm: per tenere " + fmt(tol, 2) + " mm conviene almeno il doppio della finezza.", "Encoder con più impulsi/giro, rapporto più alto o encoder assoluto sull'uscita.");

    // ---- elettronica
    var pinsUsed = 0, pinNotes = [], stepRate = 0, abCount = 0, i2cDev = 0, as5600n = 0, spiDev = 0, needCan = false, needEcat = false, needI2C = false, bissN = 0;
    var enc5 = [], opto = [];
    var Pdc = 0, Pac = 0, brakeW = 0, servoRun = 0, servoStall = 0, maxImotor = 0, dcMotors = 0;
    J.forEach(function (o) {
      var tag = o.name, M = o.M, D = o.D, Enc = o.Enc;
      if (D.for.indexOf(M.type) < 0) { add("err", "elettronica", tag, tag + ": driver incompatibile col motore", D.name + " non comanda un motore di tipo " + typeLabel(M.type) + ".", "Scegli un driver per " + typeLabel(M.type) + "."); }
      if (D.speedOnly) add("err", "elettronica", tag, tag + ": driver solo di velocità", "Il " + D.name + " regola la velocità ma non sa tenere una posizione: il giunto si muove ma non si ferma dove vuoi.", "Usa un driver FOC con encoder (ODrive, moteus).");
      if (Enc.onlyFor && Enc.onlyFor.indexOf(M.type) < 0) add("err", "elettronica", tag, tag + ": encoder non adatto", Enc.name + " esiste solo per " + Enc.onlyFor.map(typeLabel).join("/") + ".", "Scegli un encoder esterno.");
      if (M.type === "dc" && (Enc.iface === "none")) add("err", "elettronica", tag, tag + ": motore DC senza encoder", "Un motore DC gira finché ha corrente: senza encoder non sai dov'è e non puoi fermarlo in posizione.", "Aggiungi un encoder (incrementale o magnetico) e un anello PID.");
      if (M.type === "bldc" && (Enc.iface === "none")) add("err", "elettronica", tag, tag + ": BLDC senza sensori", "Un BLDC ha bisogno di sapere la posizione del rotore per commutare.", "Aggiungi un encoder.");
      if (M.type === "bldc" && Enc.id === "hall" && D.closesLoop) add("warn", "elettronica", tag, tag + ": posizione solo dai sensori Hall", "I sensori Hall danno 24 passi a giro: posizionamento grossolano e coppia irregolare a bassa velocità.", "Aggiungi un encoder magnetico (AS5048A) o incrementale.");
      if (M.type === "stepper" && Enc.iface === "none" && (mission.level || 0) >= 2) add("warn", "elettronica", tag, tag + ": stepper ad anello aperto", "Se perde passi (urto, sovraccarico) il controllo non se ne accorge e continua a lavorare nella posizione sbagliata.", "Usa uno stepper closed-loop o aggiungi un encoder.");
      if (M.type === "ac" && Enc.id !== "delta17" && Enc.id !== "biss19") add("info", "elettronica", tag, tag + ": il servo Delta ha già l'encoder", "Il servo AC Delta usa il suo encoder integrato collegato al drive.", "Seleziona l'encoder integrato.");
      // interfaccia
      var iface = D.bus.indexOf(E.bus) >= 0 ? E.bus : D.bus[0]; o.iface = iface;
      if (iface === "pwm") pinsUsed += 1;
      else if (iface === "i2c") needI2C = true;
      else if (iface === "stepdir") { pinsUsed += 2; var spr = M.type === "ac" ? 1000 : 200 * (+E.micro || 16); stepRate += o.nMot / 60 * spr; o.stepHz = o.nMot / 60 * spr; }
      else if (iface === "pwmdir") pinsUsed += (D.pins || 3);
      else if (iface === "can") needCan = true;
      else if (iface === "ethercat") needEcat = true;
      else if (iface === "uart") pinsUsed += 0;
      // encoder sul MCU
      if (Enc.iface === "ab" && !(D.closesLoop)) { abCount++; pinsUsed += 2; o.encHz = Enc.cpr * (Enc.output ? o.nOut : o.nMot) / 60; }
      if (Enc.iface === "ab" && D.closesLoop) o.encToDriver = true;
      if (Enc.iface === "i2c") { needI2C = true; as5600n++; }
      if (Enc.iface === "spi") { spiDev++; pinsUsed += 1; }
      if (Enc.iface === "biss") { if (D.fullClosed) o.encToDriver = true; else { bissN++; pinsUsed += 2; } }
      if (Enc.iface === "ab" && !D.closesLoop && mcu.logic < 5 && !Enc.diff && !E.levelShift) enc5.push(tag);
      if (Enc.diff) add("info", "elettronica", tag, tag + ": encoder differenziale", "I segnali A+/A−, B+/B− vanno letti con un ricevitore di linea (AM26LS32): resistono ai disturbi dei motori.", "Prevedi il ricevitore e il cavo schermato.");
      if (o.Br.Tb > 0 && !D.brakeOut) { pinsUsed += 1; }
      if (mcu.logic < 5 && mcu.id !== "ipc" && D.opto5 && (iface === "stepdir") && !E.levelShift) opto.push(tag);
      // tensioni e correnti
      if (M.type === "servo_hobby") {
        servoRun += 0.4 * M.Istall; servoStall += M.Istall;
        if (spsu.V > 0 && spsu.V > M.V[1] + 0.05) add("err", "elettronica", tag, tag + ": tensione troppo alta per il servo", "Il servo regge " + M.V[0] + "–" + M.V[1] + " V, l'alimentatore servo dà " + spsu.V + " V: si brucia.", "Alimentatore servo alla tensione giusta.");
        else if (spsu.V > 0 && spsu.V < M.V[0]) add("warn", "elettronica", tag, tag + ": servo sotto-alimentato", "A " + spsu.V + " V il servo è sotto il minimo di " + M.V[0] + " V.", "Alza la tensione dell'alimentatore servo.");
        if (spsu.V > 0 && spsu.V < M.V[1] - 0.5) { /* coppia dichiarata alla tensione massima */ }
      } else if (M.type === "ac") {
        Pac += M.P; maxImotor = Math.max(maxImotor, M.I);
      } else {
        dcMotors++;
        var Vd = Vbus;
        if (!Vbus) add("err", "elettronica", tag, tag + ": manca l'alimentatore dei motori", "Il motore " + M.name + " ha bisogno di un alimentatore in continua.", "Scegli un alimentatore 24 o 48 V.");
        else {
          if (D.V && typeof D.V[0] === "number" && (Vd < D.V[0] || Vd > D.V[1])) add("err", "elettronica", tag, tag + ": tensione fuori dal range del driver", D.name + " accetta " + D.V[0] + "–" + D.V[1] + " V, l'alimentatore dà " + Vd + " V." + (Vd > D.V[1] ? " Il driver si brucia." : " Il driver non parte."), "Cambia driver o alimentatore.");
          if ((M.type === "dc" || M.type === "bldc") && Vd > M.V[1] * 1.1) add("err", "elettronica", tag, tag + ": tensione troppo alta per il motore", M.name + " è da " + M.V[0] + "–" + M.V[1] + " V: a " + Vd + " V gira troppo veloce e si brucia.", "Alimentatore alla tensione del motore.");
          if ((M.type === "dc" || M.type === "bldc") && Vd < M.V[0] * 0.9) add("warn", "elettronica", tag, tag + ": motore sotto tensione", "A " + Vd + " V il motore perde velocità massima.", "Alimentatore alla tensione nominale.");
          if ((M.type === "stepper" || M.type === "stepper_cl") && Vd < M.V[0]) add("warn", "elettronica", tag, tag + ": stepper a tensione bassa", "Uno stepper grande a " + Vd + " V perde coppia appena accelera.", "Per NEMA23/34 usa 48 V (con driver adatto).");
          if ((M.type === "stepper" || M.type === "stepper_cl") && Vd > M.V[1]) add("warn", "elettronica", tag, tag + ": tensione sopra il consigliato", "Oltre " + M.V[1] + " V l'isolamento dello stepper è stressato.", "Resta entro " + M.V[1] + " V.");
        }
        var Im = M.I;
        maxImotor = Math.max(maxImotor, Im);
        if (D.Icont !== "match" && D.for.indexOf(M.type) >= 0) {
          if ((M.type === "stepper" || M.type === "stepper_cl") && Im > D.Icont) add("warn", "elettronica", tag, tag + ": driver sottodimensionato", "Il motore vuole " + fmt(Im, 1) + " A, il driver ne dà " + fmt(D.Icont, 1) + " A: la coppia cala al " + fmt(D.Icont / Im * 100, 0) + "% (già considerato nei calcoli).", "Driver più potente (DM542T, DM860T).");
          if ((M.type === "dc" || M.type === "bldc") && Im > D.Icont) add("err", "elettronica", tag, tag + ": driver sottodimensionato", "Il motore assorbe " + fmt(Im, 1) + " A continui, il driver ne regge " + fmt(D.Icont, 1) + " A.", "Driver più potente.");
        }
        if (M.type === "stepper" || M.type === "stepper_cl") Pdc += (Vd || 24) * 0.67 * Math.min(Im, D.Icont === "match" ? Im : D.Icont);
        else { var wm = o.nMot * 2 * Math.PI / 60; Pdc += Math.max(10, (o.TmCont + o.TmPeak) / 2 * wm / 0.85); }
      }
      brakeW += o.Br.W;
      if (o.Br.Tb > 0 && !(D.brakeOut)) o.brakeRelay = true;
    });
    if (enc5.length) add("warn", "elettronica", enc5.join(", "), "Encoder a 5 V su ingressi a 3,3 V (" + enc5.join(", ") + ")", "Gli ingressi di " + mcu.name + " lavorano a 3,3 V" + (mcu.id === "teensy41" || mcu.id === "esp32" ? " e con 5 V si danneggiano" : "") + ".", "Attiva i traslatori di livello (o alimenta gli encoder a 3,3 V se lo permettono).");
    if (opto.length) add("warn", "elettronica", opto.join(", "), "Ingressi optoisolati a 5 V comandati a 3,3 V (" + opto.join(", ") + ")", "I driver con optoisolatori vogliono impulsi a 5 V (o 24 V): con 3,3 V possono perdere impulsi.", "Attiva i traslatori di livello (buffer 74HCT245 o line driver 26LS31).");
    // pin condivisi
    if (needI2C) { pinsUsed += 2; pinNotes.push("I²C 2 pin"); }
    if (spiDev) { pinsUsed += 3; pinNotes.push("SPI 3 pin + 1 CS per encoder"); }
    if (needCan) { pinsUsed += 2; if (mcu.can === "mcp2515") pinsUsed += 3; }
    var homingN = E.homing !== "none" ? n : 0; pinsUsed += homingN;
    var es = CAT.byId(CAT.ESTOPS, E.estop); if (es.level >= 1) pinsUsed += 1;
    var pinsAvail = mcu.pins;
    var elecCalc = { pinsUsed: pinsUsed, pinsAvail: pinsAvail, stepRate: stepRate, abCount: abCount };
    if (mcu.id === "ipc") {
      J.forEach(function (o) { if (o.iface !== "ethercat" && o.iface !== "can") add("err", "elettronica", o.name, o.name + ": il PC industriale non ha uscite " + (o.iface === "stepdir" ? "step/dir" : o.iface), "Con un PC industriale tutti i drive devono essere su bus (EtherCAT o CAN).", "Usa drive EtherCAT (Delta ASDA-B3-E) o aggiungi un modulo I/O EtherCAT."); });
    } else {
      if (pinsUsed > pinsAvail) add("err", "elettronica", "MCU", "Pin insufficienti sul microcontrollore", "Servono circa " + pinsUsed + " pin (step/dir, encoder, finecorsa, freni, emergenza" + (pinNotes.length ? ", " + pinNotes.join(", ") : "") + "), " + mcu.name + " ne ha " + pinsAvail + ".", "Passa a una scheda con più pin (Mega, STM32, Teensy) o usa drive su bus CAN.");
      var cap = mcu.hwEnc + Math.floor(mcu.intPins / 2);
      if (abCount > cap) add("err", "elettronica", "MCU", "Troppi encoder incrementali per " + mcu.name, abCount + " encoder A/B da leggere; " + mcu.name + " ne gestisce bene circa " + cap + " (servono pin di interrupt o contatori hardware).", "ESP32 (PCNT), STM32 o Teensy hanno contatori hardware; oppure encoder letti dal driver.");
      J.forEach(function (o) { if (o.encHz && mcu.hwEnc === 0 && o.encHz > mcu.countMax) add("err", "elettronica", o.name, o.name + ": encoder troppo veloce per gli interrupt", "A piena velocità l'encoder produce " + fmt(o.encHz, 0) + " impulsi/s: " + mcu.name + " con gli interrupt ne regge circa " + fmt(mcu.countMax, 0) + ".", "Encoder con meno impulsi, montato sull'uscita, o MCU con contatori hardware."); });
      if (stepRate > mcu.stepMax) add("err", "elettronica", "MCU", "Troppi impulsi step al secondo", "In totale servono " + fmt(stepRate, 0) + " impulsi/s (microstep " + E.micro + "; servo AC a 1000 impulsi/giro motore), " + mcu.name + " ne genera circa " + fmt(mcu.stepMax, 0) + ".", "Riduci i microstep, usa un MCU più veloce o drive su bus.");
      else if (stepRate > 0.7 * mcu.stepMax) add("warn", "elettronica", "MCU", "Generazione impulsi al limite", fmt(stepRate, 0) + " impulsi/s su " + fmt(mcu.stepMax, 0) + " possibili: poco margine per il resto del codice.", "Riduci i microstep o cambia MCU.");
      if (needEcat && !mcu.ethercat) add("err", "elettronica", "MCU", "Serve un master EtherCAT", "Arduino, ESP32 e simili non possono fare da master EtherCAT.", "PC industriale con SOEM/TwinCAT, oppure drive con step/dir o CAN.");
      if (needCan && mcu.can === "mcp2515") add("warn", "elettronica", "MCU", "CAN tramite modulo MCP2515", mcu.name + " non ha CAN interno: serve un modulo MCP2515 su SPI (lento per molti assi).", "ESP32, STM32 o Teensy hanno il CAN integrato.");
      if (needCan && mcu.can !== "mcp2515") add("info", "elettronica", "MCU", "Bus CAN", "Serve un transceiver (SN65HVD230/TJA1051) e due resistenze di terminazione da 120 Ω alle estremità.", "");
      if (as5600n > 1) add("warn", "elettronica", "MCU", "Più AS5600 con lo stesso indirizzo I²C", "Gli AS5600 hanno tutti l'indirizzo 0x36: sullo stesso bus si scontrano.", "Usa un multiplexer TCA9548A o passa agli AS5048A su SPI.");
      if (bissN && ["stm32", "teensy41"].indexOf(mcu.id) < 0) add("err", "elettronica", "MCU", "Encoder BiSS-C non supportato", "Il protocollo BiSS-C a 19 bit richiede SPI veloce + interfaccia RS-422.", "Usa STM32 o Teensy con transceiver RS-422.");
      J.forEach(function (o) { if (o.brakeRelay) { /* pin già contato */ } });
    }
    // alimentazione
    var hasHob = J.some(function (o) { return o.M.type === "servo_hobby"; });
    var hasAC = Pac > 0;
    var logicW = 3 + n * 1 + (hasAC ? 0 : 0) + 5;
    var Ptot = Pdc + brakeW + logicW;
    var psuW = psu.V * psu.A;
    var Ibus = psu.V ? Ptot / psu.V : 0;
    var power = { Pdc: Pdc, brakeW: brakeW, logicW: logicW, Ptot: Ptot, psuW: psuW, Ibus: Ibus, Pac: Pac, servoRun: servoRun, servoStall: servoStall };
    if (dcMotors || brakeW || hasAC) {
      if (!psu.V) { if (!dcMotors && !E.aux24) add("err", "elettronica", "Alimentazione", "Manca l'alimentatore 24 V", "Freni e logica dei drive AC lavorano a 24 V in continua.", "Aggiungi un alimentatore 24 V."); }
      else {
        var calcP = "Potenza stimata: motori " + fmt(Pdc, 0) + " W + freni " + fmt(brakeW, 0) + " W + elettronica " + fmt(logicW, 0) + " W = " + fmt(Ptot, 0) + " W; alimentatore " + fmt(psuW, 0) + " W (serve ≥ 1,25× = " + fmt(1.25 * Ptot, 0) + " W).";
        power.calc = calcP;
        if (psuW < Ptot) add("err", "elettronica", "Alimentazione", "Alimentatore troppo piccolo", "Servono circa " + fmt(Ptot, 0) + " W, l'alimentatore ne dà " + fmt(psuW, 0) + ": nelle accelerazioni la tensione crolla e i driver vanno in allarme.", "Alimentatore più potente.", calcP);
        else if (psuW < 1.25 * Ptot) add("warn", "elettronica", "Alimentazione", "Alimentatore con poco margine", "Usi " + fmt(Ptot / psuW * 100, 0) + "% della potenza disponibile.", "Tieni almeno il 25% di riserva.", calcP);
        if (brakeW && psu.V !== 24 && !E.aux24) add("warn", "elettronica", "Alimentazione", "I freni sono a 24 V", "L'alimentatore principale è a " + psu.V + " V.", "Aggiungi l'alimentatore ausiliario 24 V per freni e logica.");
      }
      if (hasAC) add("info", "elettronica", "Alimentazione", "Drive AC alimentati da rete 230 V", "Potenza servo " + fmt(Pac, 0) + " W → circa " + fmt(Pac / (230 * 0.9), 1) + " A dalla rete. Serve un quadro con magnetotermico, differenziale, filtro EMC e messa a terra.", (Pac / (230 * 0.9) > 16 ? "Oltre 16 A: serve una linea dedicata (o trifase con drive 400 V). " : "") + "Fai verificare l'impianto da un elettricista abilitato.");
    } else if (psu.V && !dcMotors) add("info", "elettronica", "Alimentazione", "Alimentatore motori non usato", "Nessun motore usa l'alimentatore principale.", "Puoi toglierlo e risparmiare.");
    if (hasHob) {
      if (!spsu.V) add("err", "elettronica", "Alimentazione", "Manca l'alimentatore dei servo", "I servo non vanno alimentati dal pin 5 V di Arduino: assorbono fino a " + fmt(servoStall, 1) + " A.", "Alimentatore servo 6 V 10 A con massa in comune con l'MCU.");
      else {
        if (spsu.A < servoRun) add("err", "elettronica", "Alimentazione", "Alimentatore servo troppo piccolo", "In movimento i servo assorbono circa " + fmt(servoRun, 1) + " A, l'alimentatore ne dà " + fmt(spsu.A, 1) + ": l'MCU si resetta e i servo tremano.", "Alimentatore servo più potente.");
        else if (spsu.A < servoStall) add("warn", "elettronica", "Alimentazione", "Picchi dei servo oltre l'alimentatore", "Se tutti i servo sforzano insieme arrivano a " + fmt(servoStall, 1) + " A (stallo).", "Alimentatore da almeno " + fmt(servoStall, 0) + " A o condensatore da 1000–2200 µF vicino ai servo.");
      }
    }
    // cavi e fusibile
    var wm = CAT.byId(CAT.WIRES, E.wireMotor), wp = CAT.byId(CAT.WIRES, E.wirePower), fuse = +E.fuse || 0;
    power.wire = { motor: wm, power: wp, fuse: fuse, Imax: maxImotor };
    if (maxImotor > wm.A) add("err", "cavi", "Cablaggio", "Cavi motore troppo sottili", "Il motore più assetato assorbe " + fmt(maxImotor, 1) + " A, il cavo da " + wm.mm2 + " mm² (AWG " + wm.awg + ") ne porta " + wm.A + " in fascio.", "Usa almeno " + wireFor(maxImotor).mm2 + " mm².");
    if (psu.V) {
      if (Ibus > wp.A) add("err", "cavi", "Cablaggio", "Cavo di alimentazione troppo sottile", "Sul bus passano circa " + fmt(Ibus, 1) + " A, il cavo da " + wp.mm2 + " mm² ne porta " + wp.A + ".", "Usa almeno " + wireFor(Ibus).mm2 + " mm².");
      if (!fuse) add((mission.level || 1) >= 2 ? "err" : "warn", "cavi", "Cablaggio", "Manca il fusibile sul bus", "Un cortocircuito su un alimentatore da " + fmt(psuW, 0) + " W scalda i cavi fino a fonderli.", "Fusibile da " + pickFuse(Ibus * 1.25, wp.A) + " A subito dopo l'alimentatore.");
      else {
        if (fuse > wp.A) add("err", "cavi", "Cablaggio", "Fusibile più grande del cavo", "Il fusibile da " + fuse + " A protegge un cavo che porta solo " + wp.A + " A: in caso di guasto brucia prima il cavo.", "Fusibile ≤ " + wp.A + " A oppure cavo più grosso.");
        if (fuse < Ibus) add("err", "cavi", "Cablaggio", "Fusibile troppo piccolo", "Il bus assorbe " + fmt(Ibus, 1) + " A: il fusibile da " + fuse + " A salta in uso normale.", "Fusibile da " + pickFuse(Ibus * 1.25, wp.A) + " A.");
        else if (fuse < 1.25 * Ibus) add("warn", "cavi", "Cablaggio", "Fusibile al limite", "Nei picchi può saltare.", "Fusibile da " + pickFuse(Ibus * 1.25, wp.A) + " A.");
      }
    }
    // sicurezza
    var needEs = mission.estop || 0;
    if (es.level < needEs) {
      var why = es.level === 1 ? "Un pulsante letto dal software non è un arresto di emergenza: se il programma si blocca, il braccio continua a muoversi." : "Un braccio con questa potenza può ferire: serve un arresto che tolga energia ai motori in hardware.";
      add(needEs >= 2 ? "err" : "warn", "sicurezza", "Sicurezza", "Arresto di emergenza insufficiente", why, needEs >= 3 ? "Per un robot industriale: relè di sicurezza + STO dei drive (EN ISO 10218, ISO 13849 PL d)." : "Fungo rosso NC che apre un contattore sulla potenza dei motori (freni che si chiudono).");
    }
    var needHome = J.some(function (o) { return (o.M.type === "stepper" || o.M.type === "stepper_cl" || ((o.Enc.iface === "ab" || o.Enc.iface === "driver") && o.Enc.id !== "delta17")) && o.M.type !== "servo_hobby"; });
    if (needHome && E.homing === "none") add((mission.level || 1) >= 2 ? "err" : "warn", "sicurezza", "Sicurezza", "Manca l'homing", "Con stepper o encoder incrementali all'accensione il controllo non sa dove sono gli assi.", "Finecorsa (meccanici o induttivi) su ogni asse e una routine di azzeramento.");
    if (J.some(function (o) { return o.Enc.id === "delta17"; })) add("info", "sicurezza", "Sicurezza", "Encoder assoluti Delta", "Gli encoder assoluti multigiro Delta tengono la posizione con una batteria nel cavo encoder.", "Controlla la batteria ogni 2–3 anni.");
    // missione
    var costs = costOf(build, J, eff, mcu, psu, spsu, es);
    var mass = J.reduce(function (s, o) { return s + o.mJoint + o.mLink; }, 0) + eff.mass;
    if (mission.reach && reach < mission.reach * 0.97) add("err", "missione", "Missione", "Braccio troppo corto", "Arrivi a " + fmt(reach * 1000, 0) + " mm dall'asse della spalla, la missione chiede " + fmt(mission.reach * 1000, 0) + " mm.", "Allunga i link.");
    if (mission.reach && reach > mission.reach * 1.35) add("warn", "missione", "Missione", "Braccio più lungo del necessario", "Ogni centimetro in più aumenta coppie e flessioni.", "Accorcia i link verso " + fmt(mission.reach * 1000, 0) + " mm.");
    if (mission.budget && costs.total > mission.budget) add("err", "missione", "Missione", "Fuori budget: " + fmt(costs.total, 0) + " €", "Il budget della missione è " + fmt(mission.budget, 0) + " €.", "Cerca componenti più economici (es. riduttori cinesi) o evita il sovradimensionamento.");
    if (mission.minAxes && n < mission.minAxes) add("err", "missione", "Missione", "Servono almeno " + mission.minAxes + " assi", "", "Aumenta il numero di assi.");

    var errs = issues.filter(function (q) { return q.sev === "err"; }).length, warns = issues.filter(function (q) { return q.sev === "warn"; }).length;
    // margine minimo
    var margins = [];
    J.forEach(function (o) {
      if (isFinite(o.mPeak)) margins.push(o.mPeak);
      if (isFinite(o.mCont)) margins.push(o.mCont);
      if (o.stress) margins.push(o.stress.m);
      if (o.R.type !== "none" && o.loads.Mtot > 0) margins.push(o.R.Tacc / o.loads.Mtot);
    });
    var minMargin = margins.length ? Math.min.apply(null, margins) : 0;
    var score = scoreOf(mission, errs, warns, costs.total, mass, minMargin, defl.err);
    return { J: J, issues: issues, errs: errs, warns: warns, reach: reach, height: height, xTip: xTip, xEnd: xEnd, xEff: xEff, eff: eff, defl: defl, power: power, cost: costs, mass: mass, minMargin: minMargin, score: score, elec: elecCalc, mcu: mcu, psu: psu, mission: mission };
  }
  function pickFuse(I, max) { for (var k = 0; k < CAT.FUSES.length; k++) if (CAT.FUSES[k] >= I) return Math.min(CAT.FUSES[k], max || 999); return 40; }
  function typeLabel(t) { return { servo_hobby: "servo hobby", stepper: "stepper", stepper_cl: "stepper closed-loop", dc: "DC a spazzole", bldc: "BLDC", ac: "servo AC" }[t] || t; }
  function costOf(build, J, eff, mcu, psu, spsu, es) {
    var c = { motori: 0, riduttori: 0, cuscinetti: 0, freni: 0, driver: 0, encoder: 0, struttura: 0, elettronica: 0, utensile: eff.price };
    var pca = 0;
    J.forEach(function (o) {
      c.motori += o.M.price; c.riduttori += o.R.price; c.cuscinetti += o.S.price + (o.shaftMass ? o.shaftMass * o.shaftMat.eur + 30 : 0);
      c.freni += o.Br.price; c.encoder += o.Enc.price;
      if (o.D.id === "pca9685") pca++; else c.driver += o.D.price;
      c.struttura += o.mLink * o.mat.eur + (o.L > 0 ? o.mat.mach : 0) + (o.M.type === "servo_hobby" ? 3 : 25);
    });
    c.driver += Math.ceil(pca / 16) * 6;
    var wires = build.axes * 2 * 1.5;
    c.elettronica = mcu.price + psu.price + spsu.price + es.price + CAT.byId(CAT.HOMING, build.elec.homing).price * build.axes + wires + (build.elec.fuse ? 6 : 0) + (build.elec.aux24 ? 30 : 0) + (build.elec.levelShift ? 5 : 0) + 25;
    c.total = 0; for (var k in c) if (k !== "total") c.total += c[k];
    return c;
  }
  function scoreOf(m, errs, warns, cost, mass, minMargin, err) {
    var budget = m.budget || 1000, massRef = m.massRef || 10, tol = m.tol || 1;
    var costS = Math.max(0, Math.min(1, 1.5 - cost / budget));
    var massS = Math.max(0, Math.min(1, massRef / Math.max(mass, 1e-6)));
    var marginS = minMargin < 1 ? 0 : minMargin <= 3 ? 1 : Math.max(0.4, 1 - (minMargin - 3) * 0.1);
    var precS = Math.max(0, Math.min(1, tol / Math.max(err, 1e-6) / 1.5));
    var pts = Math.round(400 * costS + 200 * massS + 200 * marginS + 200 * precS - 40 * warns);
    var pass = errs === 0;
    if (!pass) pts = Math.min(pts, 300) - 50 * errs;
    pts = Math.max(0, pts);
    var stars = !pass ? 0 : (cost <= budget * 0.85 && warns === 0 ? 3 : (warns <= 2 ? 2 : 1));
    return { pts: pts, pass: pass, stars: stars, costS: costS, massS: massS, marginS: marginS, precS: precS };
  }
  var api = { analyze: analyze, loadsFromItems: loadsFromItems, shaftStrengthDiameter: shaftStrengthDiameter, hollowShaft: hollowShaft, stiffDiameter: stiffDiameter, vonMises: vonMises, hdTwist: hdTwist, cycTwist: cycTwist, section: section, etaOf: etaOf, fmt: fmt, KINDS: KINDS, KIND_IT: KIND_IT, AM: AM, typeLabel: typeLabel };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.ENG = api;
})(this);
