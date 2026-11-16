/* Braccio Lab · Il mio spazio – dati dei metalli (valori tipici da manuali e cataloghi utensili)
   e formule di officina: tornio, trapano, smerigliatrice, saldatura TIG/MIG. */
(function (root) {
  "use strict";
  // rho kg/m³, HB durezza Brinell, Rm MPa, Vc m/min (HSS, metallo duro), kc N/mm² (forza specifica di taglio),
  // weld: 0–3 saldabilità, tig/mig: note, melt °C, k W/m·K, col colore, preheat °C
  var METALS = [
    { id: "s235", n: "Acciaio S235JR (Fe360)", g: "Acciai da costruzione", rho: 7850, HB: 120, Rm: 360, vcH: 30, vcC: 200, kc: 1800, weld: 3, melt: 1500, k: 50, col: "#8a8f96", pre: 0, wire: "ER70S-6 (G3Si1)", gas: "Ar 82% + CO₂ 18%", eur: 1.3, note: "Il più comune: profilati, piastre, telai. Si salda benissimo con tutti i processi." },
    { id: "s355", n: "Acciaio S355J2", g: "Acciai da costruzione", rho: 7850, HB: 160, Rm: 510, vcH: 25, vcC: 180, kc: 2000, weld: 3, melt: 1500, k: 48, col: "#878c93", pre: 0, wire: "ER70S-6", gas: "Ar 82% + CO₂ 18%", eur: 1.5, note: "Strutturale più resistente; oltre 30 mm di spessore preriscalda a 100 °C." },
    { id: "c45", n: "Acciaio C45 (bonifica)", g: "Acciai da bonifica", rho: 7850, HB: 200, Rm: 650, vcH: 22, vcC: 160, kc: 2200, weld: 1, melt: 1490, k: 45, col: "#7f858c", pre: 250, wire: "ER80S-D2", gas: "Ar 82% + CO₂ 18%", eur: 1.8, note: "Alberi, perni, ingranaggi. Carbonio 0,45%: tempra in saldatura, preriscalda 200–300 °C." },
    { id: "42crmo4", n: "Acciaio 42CrMo4 (bonificato)", g: "Acciai da bonifica", rho: 7850, HB: 280, Rm: 1000, vcH: 15, vcC: 120, kc: 2500, weld: 1, melt: 1480, k: 42, col: "#767c83", pre: 300, wire: "ER80S-B2", gas: "Ar + 18% CO₂", eur: 2.6, note: "Alberi molto caricati e bulloneria 10.9. Difficile da saldare: preriscaldo e distensione." },
    { id: "aisi304", n: "Inox AISI 304 (1.4301)", g: "Acciai inossidabili", rho: 7900, HB: 190, Rm: 600, vcH: 15, vcC: 140, kc: 2400, weld: 3, melt: 1450, k: 16, col: "#b9bec4", pre: 0, wire: "ER308LSi", gas: "Ar 98% + CO₂ 2% (MIG) / Ar puro (TIG)", eur: 4.5, note: "Incrudisce: avanzamento costante, mai strisciare l'utensile. Bassa conducibilità: scalda in fretta." },
    { id: "aisi316", n: "Inox AISI 316L (1.4404)", g: "Acciai inossidabili", rho: 8000, HB: 180, Rm: 560, vcH: 14, vcC: 130, kc: 2450, weld: 3, melt: 1400, k: 16, col: "#bcc1c7", pre: 0, wire: "ER316LSi", gas: "Ar puro (TIG)", eur: 6.5, note: "Con molibdeno: resiste a cloruri e acqua di mare. Alimentare, chimico, nautico." },
    { id: "ghisa", n: "Ghisa grigia EN-GJL-250", g: "Ghise", rho: 7200, HB: 210, Rm: 250, vcH: 20, vcC: 150, kc: 1300, weld: 0, melt: 1200, k: 50, col: "#5d6166", pre: 400, wire: "ENi (elettrodo al nichel)", gas: "—", eur: 1.6, note: "Truciolo a polvere, smorza le vibrazioni (basamenti). Saldatura quasi impossibile: si cricca." },
    { id: "al6082", n: "Alluminio 6082-T6", g: "Leghe di alluminio", rho: 2700, HB: 95, Rm: 310, vcH: 200, vcC: 800, kc: 800, weld: 2, melt: 650, k: 170, col: "#d0d4d9", pre: 0, wire: "ER5356 (AlMg5)", gas: "Ar puro, TIG in corrente alternata", eur: 4.5, note: "Il profilato strutturale più usato. La saldatura dimezza la resistenza nella zona termicamente alterata." },
    { id: "al6061", n: "Alluminio 6061-T6", g: "Leghe di alluminio", rho: 2700, HB: 95, Rm: 310, vcH: 200, vcC: 800, kc: 800, weld: 2, melt: 650, k: 167, col: "#d3d7dc", pre: 0, wire: "ER4043 / ER5356", gas: "Ar puro, AC", eur: 5, note: "Equivalente americano del 6082; ottimo per staffe e flange del braccio." },
    { id: "al7075", n: "Ergal 7075-T6", g: "Leghe di alluminio", rho: 2810, HB: 150, Rm: 570, vcH: 150, vcC: 600, kc: 900, weld: 0, melt: 635, k: 130, col: "#c9cdd3", pre: 0, wire: "non saldabile per fusione", gas: "—", eur: 9, note: "Resistente quasi come l'acciaio a un terzo del peso. Non si salda: si avvita o si incolla." },
    { id: "al5083", n: "Alluminio 5083 (Peraluman)", g: "Leghe di alluminio", rho: 2660, HB: 75, Rm: 290, vcH: 180, vcC: 700, kc: 750, weld: 3, melt: 640, k: 120, col: "#cfd3d8", pre: 0, wire: "ER5183", gas: "Ar puro, AC", eur: 5.5, note: "Ottima saldabilità e resistenza alla corrosione: lamiere, serbatoi, nautica." },
    { id: "cu", n: "Rame Cu-ETP", g: "Rame e leghe", rho: 8940, HB: 50, Rm: 230, vcH: 60, vcC: 300, kc: 1100, weld: 1, melt: 1083, k: 390, col: "#c8744a", pre: 300, wire: "ERCu (CuSn1)", gas: "Ar/He (He aiuta)", eur: 11, note: "Conduce il calore 8 volte l'acciaio: per saldarlo servono preriscaldo e molta potenza. Impastante in tornitura." },
    { id: "ottone", n: "Ottone CW614N (OT58)", g: "Rame e leghe", rho: 8470, HB: 110, Rm: 400, vcH: 90, vcC: 400, kc: 780, weld: 0, melt: 900, k: 115, col: "#d4b24c", pre: 0, wire: "brasatura forte (Ag 40%)", gas: "—", eur: 7, note: "Con piombo: il truciolo si rompe da solo. Si lavora a velocità altissime. Lo zinco evapora: non si salda, si brasa." },
    { id: "bronzo", n: "Bronzo CuSn12 (fosforoso)", g: "Rame e leghe", rho: 8700, HB: 95, Rm: 300, vcH: 50, vcC: 250, kc: 1000, weld: 1, melt: 1000, k: 55, col: "#b0773a", pre: 200, wire: "ERCuSn-A", gas: "Ar", eur: 14, note: "Boccole e chiocciole: scorre bene sull'acciaio." },
    { id: "ti5", n: "Titanio Gr5 (Ti-6Al-4V)", g: "Titanio", rho: 4430, HB: 330, Rm: 950, vcH: 10, vcC: 60, kc: 1600, weld: 2, melt: 1660, k: 7, col: "#9ea3a8", pre: 0, wire: "ERTi-5", gas: "Ar puro + protezione al rovescio e posteriore", eur: 45, note: "Leggero e fortissimo. Truciolo che può incendiarsi, va lubrificato. In saldatura serve gas fino a sotto i 400 °C." },
    { id: "pb", n: "Piombo (lastra)", g: "Metalli pesanti", rho: 11340, HB: 5, Rm: 17, vcH: 100, vcC: 300, kc: 350, weld: 1, melt: 327, k: 35, col: "#6c7077", pre: 0, wire: "saldatura a cannello (piombo)", gas: "ossi-gas", eur: 4, note: "Tossico: guanti, niente cibo, aspirazione. Schermature e contrappesi." },
    { id: "w", n: "Tungsteno puro", g: "Metalli pesanti", rho: 19250, HB: 300, Rm: 1000, vcH: 0, vcC: 40, kc: 3500, weld: 0, melt: 3422, k: 173, col: "#7d8087", pre: 0, wire: "non saldabile", gas: "—", eur: 60, note: "Il più denso dei metalli comuni: contrappesi compatti. Fragile: si rettifica o si tornisce col diamante/CBN." },
    { id: "wcu", n: "Lega pesante W-Ni-Fe (Densimet)", g: "Metalli pesanti", rho: 17600, HB: 290, Rm: 850, vcH: 20, vcC: 90, kc: 2800, weld: 0, melt: 1450, k: 90, col: "#80838a", pre: 0, wire: "non saldabile", gas: "—", eur: 85, note: "Tornibile, densità quasi del tungsteno: contrappesi del braccio e smorzatori." }
  ];
  var BY = {}; METALS.forEach(function (m) { BY[m.id] = m; });
  function rpm(vc, Dmm) { return vc * 1000 / (Math.PI * Math.max(Dmm, 0.5)); }
  var LATHE = { name: "Mini tornio 180×300 (classe Optimum D180, Proxxon)", rpmMin: 50, rpmMax: 2500, P: 600, swing: 180, between: 300, feeds: [0.05, 0.08, 0.1, 0.15, 0.2], eta: 0.75 };
  var DRILL = { hand: { name: "Trapano a batteria 18 V", rpmMax: 2000, P: 500, dmax: 13 }, press: { name: "Trapano a colonna 16 mm", rpm: [210, 340, 540, 880, 1400, 2300], P: 550, dmax: 16 } };
  function lathe(o) {
    var m = BY[o.metal] || BY.s235, tool = o.tool || "hss", vc = tool === "hm" ? m.vcC : m.vcH, D = o.D || 20, n = rpm(vc, D), nUse = Math.max(LATHE.rpmMin, Math.min(LATHE.rpmMax, o.rpm || n));
    var vcReal = Math.PI * D * nUse / 1000, f = o.f || 0.1, ap = o.ap || 0.5, Fc = m.kc * f * ap, Pc = Fc * vcReal / 60000, Q = vcReal * f * ap; // kW, cm³/min
    var Ra = f * f / (8 * (o.r || 0.4)) * 1000; // µm (rugosità teorica, raggio punta mm)
    var warn = [];
    if (tool === "hss" && vc === 0) warn.push("Con un utensile in HSS questo metallo non si lavora: serve metallo duro o CBN.");
    if (vcReal > vc * 1.3) warn.push("Velocità di taglio troppo alta (" + Math.round(vcReal) + " m/min contro " + vc + "): l'utensile si brucia.");
    if (vcReal < vc * 0.5 && nUse < LATHE.rpmMax) warn.push("Velocità di taglio bassa: finitura ruvida e tagliente di riporto.");
    if (Pc > LATHE.P * LATHE.eta / 1000) warn.push("Potenza richiesta " + (Pc * 1000).toFixed(0) + " W oltre i " + Math.round(LATHE.P * LATHE.eta) + " W utili del mini tornio: riduci profondità o avanzamento.");
    if (ap > 2) warn.push("Profondità di passata alta per un tornio da banco: resta sotto 1–1,5 mm.");
    if (n > LATHE.rpmMax) warn.push("Il mini tornio arriva a " + LATHE.rpmMax + " giri/min: lavori sotto la velocità ideale.");
    return { n: n, nUse: nUse, vc: vc, vcReal: vcReal, Fc: Fc, Pc: Pc, Q: Q, Ra: Ra, tmin: (o.L || 50) / (f * nUse), warn: warn };
  }
  function drill(o) {
    var m = BY[o.metal] || BY.s235, d = o.d || 8, vc = (m.vcH || m.vcC * 0.2) * 0.8, n = rpm(vc, d), f = Math.max(0.02, Math.min(0.3, d * 0.015)), Fz = 0.5 * m.kc * f * d / 2 * 0.6, M = m.kc * f * d * d / 8000; // N·m
    var pr = DRILL.press.rpm.reduce(function (a, b) { return Math.abs(b - n) < Math.abs(a - n) ? b : a; });
    return { n: n, press: pr, f: f, thrust: Fz, torque: M, P: M * n * 2 * Math.PI / 60, pilot: d > 10 ? Math.round(d * 0.35) : 0, cool: /304|316|ti5|c45|42cr/.test(m.id) ? "olio da taglio" : m.id.indexOf("al") === 0 ? "petrolio/alcool o lubrorefrigerante" : m.id === "ghisa" || m.id === "ottone" ? "a secco" : "emulsione" };
  }
  var DISCS = { cut1: { n: "Disco da taglio 125×1,0 mm (inox/acciaio)", vmax: 80, D: 125, t: 1 }, cut16: { n: "Disco da taglio 125×1,6 mm", vmax: 80, D: 125, t: 1.6 }, grind: { n: "Disco da sbavo 125×6 mm", vmax: 80, D: 125, t: 6 }, flap: { n: "Disco lamellare grana 80", vmax: 80, D: 125, t: 10 }, wire: { n: "Spazzola a tazza in acciaio", vmax: 80, D: 100, t: 20 }, alu: { n: "Disco da taglio per alluminio", vmax: 80, D: 125, t: 1.2 } };
  function grinder(o) {
    var dk = DISCS[o.disc] || DISCS.cut1, rp = o.rpm || 11000, v = Math.PI * dk.D / 1000 * rp / 60, m = BY[o.metal] || BY.s235, warn = [];
    if (v > dk.vmax) warn.push("Velocità periferica " + v.toFixed(0) + " m/s oltre gli " + dk.vmax + " m/s ammessi dal disco: può esplodere.");
    if (dk.t > 3 && o.mode === "cut") warn.push("Non tagliare con il disco da sbavo: è spesso e si incastra.");
    if (dk.t <= 1.6 && o.mode === "grind") warn.push("Non sbavare di piatto con il disco da taglio: è sottile e si spacca.");
    if (m.id.indexOf("al") === 0 && o.disc !== "alu" && o.disc !== "flap") warn.push("Sull'alluminio i dischi normali si impastano: usa quello specifico.");
    var spark = /^(s235|s355|c45|42crmo4)$/.test(m.id) ? 1 : /aisi/.test(m.id) ? 0.6 : m.id === "ti5" ? 1.3 : m.id === "ghisa" ? 0.4 : 0;
    return { v: v, warn: warn, spark: spark, sparkCol: m.id === "ti5" ? "#ffffff" : m.id === "ghisa" ? "#ff7a2a" : /aisi/.test(m.id) ? "#ffc070" : "#ffb347" };
  }
  // saldatura: apporto termico Q = k·U·I·60/(v·1000) kJ/mm (EN 1011-1), k = 0,6 TIG, 0,8 MIG/MAG
  function heatInput(U, I, vmm_min, proc) { var k = proc === "tig" ? 0.6 : 0.8; return k * U * I * 60 / (Math.max(vmm_min, 1) * 1000); }
  function weldSetup(proc, metalId, t) {
    var m = BY[metalId] || BY.s235, al = metalId.indexOf("al") === 0, I, U, wfs = 0;
    if (proc === "tig") { I = Math.round((al ? 45 : 35) * t + 10); U = 10 + 0.04 * I; }
    else { I = Math.round((al ? 55 : 45) * t + 30); U = 14 + 0.05 * I; wfs = +(I / 30).toFixed(1); }
    var v = proc === "tig" ? 100 + 40 / Math.max(t, 0.5) : 250 + 100 / Math.max(t, 0.5);
    return { I: I, U: +U.toFixed(1), wfs: wfs, v: Math.round(v), stick: proc === "tig" ? [2, 5] : [10, 15], angle: proc === "tig" ? 75 : 75, Q: heatInput(U, I, v, proc), gas: m.gas, wire: m.wire, pre: m.pre, ok: m.weld > 0, ac: proc === "tig" && al };
  }
  // valutazione di un cordone: velocità reale vs ideale, distanza (stick-out / arco), angolo
  function bead(o) {
    var s = weldSetup(o.proc, o.metal, o.t), dv = (o.v - s.v) / s.v, so = o.stick, lo = s.stick[0], hi = s.stick[1], score = 100, why = [];
    if (dv > 0.35) { score -= 35; why.push("Troppo veloce: cordone stretto e alto, poca penetrazione (incollatura)."); } else if (dv > 0.15) { score -= 15; why.push("Un po' veloce: cordone sottile."); }
    if (dv < -0.35) { score -= 35; why.push("Troppo lento: troppo calore, cordone largo, rischio di sfondare e deformare."); } else if (dv < -0.15) { score -= 15; why.push("Un po' lento: cordone largo."); }
    if (so < lo) { score -= 20; why.push(o.proc === "tig" ? "Elettrodo troppo vicino: rischi di toccare il bagno e contaminare il tungsteno." : "Stick-out corto: spruzzi sulla torcia, ugello che si intasa."); }
    if (so > hi) { score -= 25; why.push(o.proc === "tig" ? "Arco troppo lungo: largo, instabile, ossidazione." : "Stick-out lungo: gas che non protegge, porosità e poca penetrazione."); }
    if (o.angle != null && Math.abs(o.angle - s.angle) > 20) { score -= 10; why.push("Angolo della torcia fuori da 60–80°: il gas protegge male."); }
    if (!s.ok) { score -= 40; why.push((BY[o.metal] || {}).n + " non è saldabile con questo processo: cricche sicure."); }
    if (o.pre != null && s.pre > 0 && o.pre < s.pre * 0.6) { score -= 20; why.push("Manca il preriscaldo (" + s.pre + " °C): rischio di cricche a freddo."); }
    score = Math.max(0, Math.min(100, score));
    return { score: score, grade: score >= 85 ? "ottimo" : score >= 65 ? "buono" : score >= 40 ? "difettoso" : "da rifare", why: why, setup: s, width: (o.proc === "tig" ? 4 : 6) * (1 - dv * 0.6) * (so > hi ? 1.2 : 1), Q: heatInput(s.U, s.I, o.v, o.proc) };
  }
  function mass(metalId, Vmm3) { var m = BY[metalId] || BY.s235; return m.rho * Vmm3 * 1e-9; }
  var API = { METALS: METALS, get: function (id) { return BY[id]; }, rpm: rpm, LATHE: LATHE, DRILL: DRILL, DISCS: DISCS, lathe: lathe, drill: drill, grinder: grinder, heatInput: heatInput, weldSetup: weldSetup, bead: bead, mass: mass };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.MET = API;
})(typeof window !== "undefined" ? window : this);
