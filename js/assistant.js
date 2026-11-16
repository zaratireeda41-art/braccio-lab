/* Braccio Lab · Assistente. Funziona OFFLINE: base di conoscenza in italiano, ricerca per intenti
   e parole chiave (anche con errori di battitura), calcolatori e lettura del contesto (circuito,
   spazio di lavoro, braccio). Un fornitore LLM esterno è OPZIONALE, spento di default: la chiave,
   se l'utente la incolla, resta solo nel localStorage di questo browser. */
(function (root) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var CIR = isNode ? require("./circuit.js") : root.CIR, MET = isNode ? require("./metals.js") : root.MET;
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[µμ]/g, "u").replace(/Ω/gi, "ohm").replace(/[^a-z0-9.,%°/+\-× ]+/g, " ").replace(/\s+/g, " ").trim(); }
  var STOP = "il lo la i gli le un uno una di a da in con su per tra fra e o ma se che come cosa quale quali quanto quanta quanti mi ti si ci vi del dello della dei degli delle al allo alla ai agli alle dal dalla nel nella sul sulla mio mia tuo tua è e' sono ho hai ha fare fa posso puoi devo voglio vorrei serve servono non piu molto poco questo questa quello quella cos dove quando perche".split(" ");
  var STOPS = {}; STOP.forEach(function (w) { STOPS[w] = 1; });
  function toks(s) { return norm(s).split(/[ ,.]+/).filter(function (w) { return w.length > 1 && !STOPS[w]; }); }
  function lev(a, b) { if (Math.abs(a.length - b.length) > 2) return 9; var m = a.length, n = b.length, d = [], i, j; for (i = 0; i <= m; i++) d[i] = [i]; for (j = 0; j <= n; j++) d[0][j] = j; for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; }
  function stem(w) { return w.length > 5 ? w.replace(/(azioni|azione|amenti|amento|ature|atura|mente|ando|endo|are|ere|ire|ati|ate|ato|ata|ori|ore|ice|ici|i|e|o|a)$/, "") : w; }
  /* --- lettura di numeri con unità: 4,7k  220Ω  100uF  12 V  20 mA  Ø20 --- */
  var PRE = { p: 1e-12, n: 1e-9, u: 1e-6, m: 1e-3, k: 1e3, M: 1e6, G: 1e9 };
  function nums(text) {
    var out = [], m, t = String(text).replace(/[µμ]/g, "u").replace(/Ω/g, "ohm");
    var re = /(ø\s*|diametro\s*)?(-?\d+(?:[.,]\d+)?)(?:\s*(mm\/min|m\/min|mm|cm|rpm|giri|°c|oz|%)|(?:\s?([kKMmunpG])(\d+)?)?\s*(ohm|hz|v|a|f|h|w)?)(?![a-z])/gi;
    while ((m = re.exec(t))) {
      var v = parseFloat(m[2].replace(",", ".")), u1 = (m[3] || "").toLowerCase(), p = m[4] || "", tail = m[5] || "", u = (m[6] || "").toLowerCase();
      if (u1) { if (u1 === "cm") { v *= 10; u1 = "mm"; } if (u1 === "giri") u1 = "rpm"; out.push({ v: v, u: u1, raw: m[0], dia: !!m[1] }); continue; }
      if (tail && p) v = parseFloat(m[2].replace(",", ".") + (m[2].indexOf(",") < 0 && m[2].indexOf(".") < 0 ? "." : "") + tail);
      if (p === "K") p = "k";
      if (u === "a" && m[6] === "a" && !p) u = "";
      if (p && !u) { if (p === "k" || p === "M") u = "ohm"; else if (p === "m") { u = "m"; p = ""; } }
      if (!p && !u && m[1]) u = "mm";
      out.push({ v: v * (p ? PRE[p] : 1), u: u, raw: m[0], dia: !!m[1] });
    }
    return out;
  }
  function pick(ns, u) { return ns.filter(function (x) { return x.u === u; }).map(function (x) { return x.v; }); }
  var si = CIR ? CIR.si : function (x, u) { return x + " " + u; }, fx = CIR ? CIR.fx : function (x) { return String(x); };
  function metalIn(q) {
    if (!MET) return null; var n = norm(q), best = null;
    var AL = [["s235", /s235|fe ?360|ferro|acciaio dolce|acciaio comune/], ["s355", /s355/], ["c45", /c45/], ["42crmo4", /42 ?cr ?mo|bonificato/], ["aisi316", /316/], ["aisi304", /inox|304|acciaio inossidabile/], ["ghisa", /ghisa/], ["al7075", /7075|ergal/], ["al5083", /5083|peraluman/], ["al6061", /6061/], ["al6082", /alluminio|6082|anticorodal/], ["ottone", /ottone/], ["bronzo", /bronzo/], ["cu", /\brame\b/], ["ti5", /titanio/], ["pb", /piombo/], ["w", /tungsteno/]];
    for (var i = 0; i < AL.length; i++) if (AL[i][1].test(n)) { best = AL[i][0]; break; }
    return best;
  }
  /* --- calcolatori in linguaggio naturale --- */
  // coppie di serraggio VDI 2230 (μ ≈ 0,12, viti zincate/brunite non lubrificate) – stessi valori della Dispensa
  var MA = { M3: [1.1, 1.6, 1.9], M4: [2.6, 3.9, 4.5], M5: [5.2, 7.6, 8.9], M6: [9, 13.2, 15.4], M8: [21.6, 31.8, 37.2], M10: [43, 63, 73], M12: [73, 108, 126], M16: [180, 264, 309] };
  var CATx = isNode ? (function () { try { return require("./catalog.js"); } catch (e) { return null; } })() : root.CAT;
  function boltMA(size, ci) { if (CATx && CATx.BOLTS) { var b = CATx.BOLTS.filter(function (x) { return x.s === size; })[0]; if (b) return { MA: b.MA[ci], FM: b.FM[ci], hex: b.hex, tap: b.tap }; } var m = MA[size]; return m ? { MA: m[ci], FM: null, hex: null, tap: null } : null; }
  var CALCS = [
    { id: "bolt", re: /\b(coppia|serraggio|serrare|stringere|dinamometric\w*)\b.*\bm(3|4|5|6|8|10|12|16)\b|\bm(3|4|5|6|8|10|12|16)\b.*\b(coppia|serraggio|serrare|stringere|dinamometric\w*)\b/, run: function (q) {
      var n = norm(q), m = /\bm(3|4|5|6|8|10|12|16)\b/.exec(n), size = "M" + m[1], ci = /12[.,]9/.test(n) ? 2 : /10[.,]9/.test(n) ? 1 : 0, cls = ["8.8", "10.9", "12.9"][ci], d = boltMA(size, ci); if (!d) return "Non conosco la vite " + size + ".";
      return "**Vite " + size + " classe " + cls + "**: coppia di serraggio ≈ **" + fx(d.MA, 1) + " N·m**" + (d.FM ? " (precarico ≈ " + fx(d.FM, 1) + " kN, attrito μ ≈ 0,12)" : "") + "." + (d.hex ? " Testa cilindrica TCEI (ISO 4762): brugola **" + fx(d.hex, 1) + " mm**." : "") + (d.tap ? " Foro da filettare: punta Ø" + fx(d.tap, 1) + " mm." : "") + " Serra con una chiave dinamometrica il cui campo contenga il valore nel 20–100%, in croce e in due passate (50% poi 100%). Oltre ≈ 135% la vite si snerva e va buttata; sotto ≈ 60% si allenta con le vibrazioni.";
    } },
    { id: "trace", re: /\b(larghezza|largh|pista|piste)\b.*\b(\d+[.,]?\d*)\s*a\b|\b(\d+[.,]?\d*)\s*a\b.*\b(pista|piste)\b/, run: function (q, ns) {
      var n = norm(q), mI = /(\d+(?:[.,]\d+)?)\s*a\b/.exec(n), I = mI ? parseFloat(mI[1].replace(",", ".")) : 1, oz = /2 ?oz/.test(n) ? 2 : 1, dT = 10, inner = /intern/.test(n), k = inner ? 0.024 : 0.048;
      var A = Math.pow(I / (k * Math.pow(dT, 0.44)), 1 / 0.725), w = A / (1.378 * oz) * 0.0254;
      return "**Larghezza pista per " + fx(I, 1) + " A** (IPC-2221, rame " + oz + " oz, strato " + (inner ? "interno" : "esterno") + ", ΔT 10 °C): sezione " + fx(A, 0) + " mil² → **" + fx(w, 2) + " mm**. Arrotonda per eccesso e aggiungi vie in parallelo se cambi strato; con ΔT 20 °C la pista può essere ≈ 25% più stretta.";
    } },
    { id: "led", re: /\b(resisten\w*|ohm)\b.*\bled\b|\bled\b.*\b(resisten\w*)\b/, run: function (q, ns) {
      var V = pick(ns, "v"), I = pick(ns, "a"), n = norm(q), col = null;
      for (var c in CIR.LED_COL) if (n.indexOf(norm(c)) >= 0) col = c;
      var Vs = V.length ? Math.max.apply(null, V) : 5, Vf = V.length > 1 ? Math.min.apply(null, V) : CIR.LED_COL[col || "rosso"].Vf, Ia = I.length ? I[0] : 0.015;
      var r = CIR.calc.ledResistor(Vs, Vf, Ia); if (r.err) return r.err;
      return "**Resistenza per LED**" + (col ? " " + col : "") + ": R = (V − Vf) / I = (" + fx(Vs) + " − " + fx(Vf) + ") / " + si(Ia, "A") + " = **" + si(r.R, "Ω") + "** → valore commerciale **" + si(r.Rstd, "Ω") + "** (E12, colori " + r.bands.map(function (b) { return b.n; }).join("-") + "). Corrente reale " + si(r.I, "A") + ", potenza " + si(r.P, "W") + " → resistenza da " + si(r.Prated, "W") + ".";
    } },
    { id: "div", re: /partitor\w*|divisore di tensione/, run: function (q, ns) {
      var V = pick(ns, "v"), R = pick(ns, "ohm");
      if (V.length >= 2 && R.length < 2) { var d = CIR.calc.designDivider(Math.max(V[0], V[1]), Math.min(V[0], V[1]), R[0] || 10000); return "**Partitore**: con R1 = " + si(d.R1, "Ω") + " serve R2 = " + si(d.R2, "Ω") + " → standard **" + si(d.R2std, "Ω") + "**, uscita reale " + fx(d.Vreal, 2) + " V. Formula: Vout = Vin × R2 / (R1 + R2)."; }
      if (V.length && R.length >= 2) { var r = CIR.calc.divider(V[0], R[0], R[1]); return "**Partitore**: Vout = " + fx(V[0]) + " × " + si(R[1], "Ω") + " / (" + si(R[0], "Ω") + " + " + si(R[1], "Ω") + ") = **" + fx(r.Vout, 2) + " V**, corrente " + si(r.I, "A") + ", impedenza d'uscita " + si(r.Rth, "Ω") + " (il carico deve essere almeno 10 volte più grande)."; }
      return "Per il partitore dimmi Vin e le due resistenze (es. \"partitore 12 V 10k 4,7k\") oppure Vin e Vout (\"partitore da 12 V a 3,3 V\").";
    } },
    { id: "rc", re: /\brc\b|costante di tempo|\btau\b|carica (del )?condensator/, run: function (q, ns) {
      var R = pick(ns, "ohm"), C = pick(ns, "f"); if (!R.length || !C.length) return "Dimmi R e C, per esempio \"costante di tempo 10k 100uF\".";
      var r = CIR.calc.rc(R[0], C[0]); return "**Circuito RC**: τ = R × C = " + si(R[0], "Ω") + " × " + si(C[0], "F") + " = **" + si(r.tau, "s") + "**. Dopo τ il condensatore è al 63%, dopo 5τ (" + si(r.t99, "s") + ") è carico al 99%. Frequenza di taglio fc = 1/(2πRC) = " + si(r.fc, "Hz") + ".";
    } },
    { id: "555", re: /\b555\b/, run: function (q, ns) {
      var R = pick(ns, "ohm"), C = pick(ns, "f"); if (R.length < 2 || !C.length) return "Per il 555 astabile dimmi R1, R2 e C (es. \"555 10k 68k 10uF\"). f = 1,44 / ((R1 + 2·R2)·C).";
      var r = CIR.calc.t555(R[0], R[1], C[0]); return "**NE555 astabile**: f = 1,44 / ((R1 + 2R2)·C) = **" + si(r.f, "Hz") + "** (periodo " + si(r.T, "s") + "), duty cycle " + fx(r.duty * 100, 0) + "%: alto " + si(r.th, "s") + ", basso " + si(r.tl, "s") + ".";
    } },
    { id: "ohm", re: /legge di ohm|\bohm\b|quanta corrente|che corrente|quanti volt|potenza dissipat/, run: function (q, ns) {
      var V = pick(ns, "v"), I = pick(ns, "a"), R = pick(ns, "ohm"), o = {};
      if (V.length) o.V = V[0]; if (I.length) o.I = I[0]; if (R.length) o.R = R[0];
      if (Object.keys(o).length < 2) return "**Legge di Ohm**: V = R × I, I = V / R, R = V / I; potenza P = V × I = R × I² = V² / R. Dammi due valori (es. \"ohm 12 V 220 Ω\").";
      var r = CIR.calc.ohm(o); return "**Legge di Ohm**: V = " + fx(r.V, 3) + " V, I = " + si(r.I, "A") + ", R = " + si(r.R, "Ω") + ", potenza P = " + si(r.P, "W") + (r.P > 0.25 ? " → serve una resistenza da almeno " + si(CIR.calc.pRating(r.P * 1.6), "W") : "") + ".";
    } },
    { id: "lathe", re: /tornio|tornire|tornitura|giri.*(tornio|pezzo|diametro)|velocita di taglio/, run: function (q, ns) {
      var mm = pick(ns, "mm"), m = metalIn(q) || "s235", D = mm.length ? mm[0] : 20, hm = /metallo duro|widia|inserto|hm\b/.test(norm(q)), r = MET.lathe({ metal: m, D: D, tool: hm ? "hm" : "hss", f: 0.1, ap: 0.5 }), M = MET.get(m);
      return "**Tornio – " + M.n + ", Ø" + fx(D, 0) + " mm, utensile " + (hm ? "metallo duro" : "HSS") + "**: n = Vc × 1000 / (π × D) = " + r.vc + " × 1000 / (π × " + fx(D, 0) + ") ≈ **" + Math.round(r.n) + " giri/min**" + (r.n > MET.LATHE.rpmMax ? " (il mini tornio arriva a " + MET.LATHE.rpmMax + ": usa il massimo)" : "") + ". Avanzamento 0,1 mm/giro, passata 0,5 mm → forza " + Math.round(r.Fc) + " N, potenza " + Math.round(r.Pc * 1000) + " W. " + r.warn.join(" ");
    } },
    { id: "drill", re: /trapan\w*|forare|foratura|punta da|\bforo\b|\bfori\b/, run: function (q, ns) {
      var mm = pick(ns, "mm"), m = metalIn(q) || "s235", d = mm.length ? mm[0] : 8, r = MET.drill({ metal: m, d: d }), M = MET.get(m);
      return "**Foratura Ø" + fx(d, 1) + " in " + M.n + "**: ≈ **" + Math.round(r.n) + " giri/min** (sul trapano a colonna scegli " + r.press + "), avanzamento ≈ " + fx(r.f, 2) + " mm/giro, coppia " + fx(r.torque, 1) + " N·m. Lubrificazione: " + r.cool + "." + (r.pilot ? " Prima fai un foro pilota da " + r.pilot + " mm." : "") + " Fissa sempre il pezzo in morsa e punta prima con il bulino.";
    } },
    { id: "heat", re: /apporto termico|heat input|energia lineare/, run: function (q, ns) {
      var V = pick(ns, "v"), I = pick(ns, "a"), v = pick(ns, "mm/min"), tig = /tig/.test(norm(q));
      if (!V.length || !I.length || !v.length) return "Apporto termico Q = k × U × I × 60 / (v × 1000) [kJ/mm], k = 0,6 TIG e 0,8 MIG/MAG. Dammi tensione, corrente e velocità (es. \"apporto termico MIG 22 V 160 A 300 mm/min\").";
      return "**Apporto termico** (" + (tig ? "TIG" : "MIG/MAG") + "): Q = " + (tig ? "0,6" : "0,8") + " × " + fx(V[0]) + " × " + fx(I[0]) + " × 60 / (" + fx(v[0]) + " × 1000) = **" + fx(MET.heatInput(V[0], I[0], v[0], tig ? "tig" : "mig"), 2) + " kJ/mm**. Per acciai al carbonio stai tra 0,5 e 2 kJ/mm; per inox sotto 1,5.";
    } },
    { id: "weldset", re: /(regola\w*|parametri|ampere|corrente).*(tig|mig|mag|saldatrice)|(tig|mig|mag).*(spessore|lamiera|regol|ampere|parametri)/, run: function (q, ns) {
      var mm = pick(ns, "mm"), m = metalIn(q) || "s235", t = mm.length ? mm[0] : 2, tig = /tig/.test(norm(q)), s = MET.weldSetup(tig ? "tig" : "mig", m, t), M = MET.get(m);
      return "**" + (tig ? "TIG" : "MIG/MAG") + " su " + M.n + " da " + fx(t, 1) + " mm**: circa **" + s.I + " A**" + (tig ? "" : ", " + s.U + " V, filo a " + s.wfs + " m/min") + ", avanzamento ≈ " + s.v + " mm/min, " + (tig ? "distanza elettrodo-pezzo " : "stick-out ") + s.stick[0] + "–" + s.stick[1] + " mm, torcia a 70–80°. Filo/bacchetta: " + s.wire + "; gas: " + s.gas + "." + (s.ac ? " Alluminio: TIG in corrente alternata (AC)." : "") + (s.pre ? " Preriscalda a " + s.pre + " °C." : "") + (!s.ok ? " Attenzione: questo metallo non è saldabile per fusione." : "");
    } },
    { id: "mass", re: /quanto pesa|peso di|massa di/, run: function (q, ns) {
      var mm = pick(ns, "mm"), m = metalIn(q) || "s235", M = MET.get(m);
      if (mm.length >= 2) { var D = mm[0], L = mm[1], V = Math.PI * D * D / 4 * L, kg = MET.mass(m, V); return "**Tondo Ø" + fx(D, 0) + " × " + fx(L, 0) + " mm in " + M.n + "**: volume " + fx(V / 1000, 1) + " cm³ × densità " + M.rho + " kg/m³ = **" + fx(kg, 3) + " kg**."; }
      return "Densità di " + M.n + ": " + M.rho + " kg/m³. Dimmi diametro e lunghezza (es. \"quanto pesa un tondo di alluminio 30 mm 100 mm\").";
    } }
  ];
  /* --- base di conoscenza: [id, parole chiave, risposta] --- */
  var KB = [
    ["led", "led diodo luminoso anodo catodo gamba lunga polarita accendere led", "Il **LED** conduce solo da anodo (gamba lunga, +) a catodo (gamba corta, lato piatto, −). Ha una tensione di soglia Vf (rosso ≈ 2 V, verde ≈ 2,2 V, blu/bianco ≈ 3 V) e va SEMPRE messo in serie a una resistenza: R = (Valim − Vf) / I, con I = 5–20 mA. Esempio: 5 V, LED rosso, 15 mA → 200 Ω → 220 Ω."],
    ["ledbrucia", "led bruciato brucia senza resistenza si rompe led si e spento", "Un LED senza resistenza si brucia perché sopra la soglia la sua corrente cresce in modo esponenziale: a 5 V passerebbero centinaia di mA contro i 20 previsti. Metti una resistenza in serie (es. 220–330 Ω a 5 V) e controlla la polarità."],
    ["resistenza", "resistenza resistore codice colori bande valore tolleranza e12 e24", "**Codice colori** (4 bande): 1ª e 2ª cifra, moltiplicatore, tolleranza. Nero 0, marrone 1, rosso 2, arancio 3, giallo 4, verde 5, blu 6, viola 7, grigio 8, bianco 9; oro = ×0,1 o ±5%, argento ±10%. Esempio: rosso-rosso-marrone-oro = 220 Ω ±5%. I valori commerciali seguono le serie E12 (10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82) ed E24."],
    ["potenzares", "potenza resistenza scalda brucia watt 1/4 dissipazione", "Una resistenza dissipa P = V²/R = R·I². Quelle comuni sono da 0,25 W: tieniti sotto il 50–70%. Se P supera il valore nominale fuma e cambia valore: scegli 0,5 W, 1 W, 2 W, 5 W a filo, oppure aumenta R."],
    ["condensatore", "condensatore capacita elettrolitico ceramico polarizzato farad uf nf pf", "Il **condensatore** accumula carica: Q = C·V. Ceramici (pF–µF) non polarizzati, per disaccoppiare (100 nF vicino a ogni integrato). Elettrolitici (µF–mF) polarizzati: la striscia indica il −; montati al contrario si gonfiano o esplodono. Scegli una tensione nominale 1,5–2 volte quella di lavoro."],
    ["elettroliticoinv", "elettrolitico al contrario invertito gonfio esploso striscia", "Un elettrolitico polarizzato in inversa fa scorrere corrente nell'ossido, si scalda, si gonfia e può scoppiare. La striscia bianca/grigia con il segno − va verso massa (il lato a tensione più bassa)."],
    ["induttanza", "induttanza bobina induttore henry choke", "L'**induttanza** si oppone alle variazioni di corrente: V = L·dI/dt. Con un interruttore che apre, genera un picco di tensione: per questo bobine, relè e motori vogliono un diodo di ricircolo. Usata in alimentatori switching e filtri."],
    ["diodo", "diodo 1n4007 1n4148 schottky raddrizzatore polarita striscia", "Il **diodo** fa passare la corrente solo dall'anodo al catodo (lato con la striscia). 1N4148: segnali veloci, 300 mA. 1N4007: raddrizzatore 1 A, 1000 V. Schottky (1N5819, SS34): caduta bassa 0,3–0,4 V, ideale per protezioni e ricircolo dei motori."],
    ["ricircolo", "diodo ricircolo flyback volano relè bobina motore picco transistor rotto", "Il **diodo di ricircolo** (flyback) si mette in parallelo a una bobina (relè, motore, elettrovalvola) con il catodo verso il +. Quando il transistor apre, l'energia della bobina circola nel diodo invece di creare un picco di centinaia di volt che rompe il transistor."],
    ["transistor", "transistor npn bjt 2n2222 bc547 base collettore emettitore saturazione interruttore", "Un **NPN** come interruttore: emettitore a massa, carico tra + e collettore, base pilotata con una resistenza. Per saturarlo scegli Ib ≈ Ic / 10: Rb = (Vpin − 0,7) / Ib. Esempio: 200 mA da un pin a 5 V → Ib = 20 mA, già al limite del pin: per carichi così usa un TIP120 Darlington o meglio un MOSFET logic level."],
    ["mosfet", "mosfet irlz44n irf540 logic level gate vgs rds on canale n", "Un **MOSFET canale N** come interruttore: source a massa, carico sul drain, gate pilotato dal pin con 100–220 Ω in serie e 10–100 kΩ verso massa (pull-down). Con microcontrollori a 3,3–5 V servono modelli **logic level** (IRLZ44N, AO3400): l'IRF540N vuole 10 V al gate, altrimenti resta semi-acceso e scalda."],
    ["opamp", "operazionale op amp lm358 guadagno invertente non invertente comparatore", "L'**amplificatore operazionale** confronta + e −. Non invertente: guadagno = 1 + Rf/Rg. Invertente: −Rf/Rin. L'LM358 funziona da 3 a 32 V con singola alimentazione, ma l'uscita arriva solo a circa V+ − 1,5 V. Senza retroazione è un comparatore."],
    ["555", "555 ne555 timer astabile monostabile lampeggiatore", "Il **NE555** in astabile: f = 1,44 / ((R1 + 2·R2)·C), duty = (R1+R2)/(R1+2R2). In monostabile: T = 1,1·R·C. Alimentazione 4,5–16 V, uscita fino a 200 mA. Esempio: 10 kΩ, 68 kΩ, 10 µF → circa 1 Hz."],
    ["regolatore", "regolatore 7805 ams1117 lm2596 tensione 5v 3.3v lineare switching buck dropout", "Un **regolatore lineare** (7805, AMS1117) butta via in calore (Vin − Vout) × I: da 12 V a 5 V con 1 A sono 7 W, serve un dissipatore grosso. Il 7805 vuole Vin ≥ 7 V (dropout ≈ 2 V). Uno **switching buck** (LM2596, MP1584) ha rendimento 85–90%: scalda poco ed è la scelta giusta per motori e Raspberry."],
    ["arduino", "arduino uno nano pin corrente 20 ma 40 ma massimo uscita", "Un pin di **Arduino Uno/Nano** (ATmega328P) dà al massimo 40 mA (assoluto), consigliati 20 mA, e 200 mA in totale per tutto il chip. Basta per un LED con resistenza, NON per motori, relè o strisce LED: usa transistor, MOSFET o moduli driver. Alimentazione: USB 5 V oppure VIN 7–12 V."],
    ["esp32", "esp32 3.3v 3,3 v tollerante 5v pin corrente", "L'**ESP32** lavora a 3,3 V e i pin NON tollerano 5 V: per leggere un segnale a 5 V usa un partitore (es. 10 kΩ / 20 kΩ) o un traslatore di livello. Corrente consigliata per pin ≈ 12 mA. Si alimenta dal 5 V/USB (regolatore interno) o direttamente a 3,3 V."],
    ["stm32", "stm32 blue pill black pill nucleo", "L'**STM32F103 (Blue Pill)** è a 3,3 V, molti pin sono 5 V tolleranti (FT), corrente per pin 8 mA consigliati (25 max). Più potente di Arduino: 72 MHz, timer avanzati per encoder e PWM motori."],
    ["pico", "raspberry pi pico rp2040 rp2350", "Il **Raspberry Pi Pico (RP2040)**: due core a 133 MHz, 3,3 V NON tollerante 5 V, corrente per pin 4 mA di default (fino a 12 mA). Le PIO sono perfette per generare impulsi di step precisi."],
    ["teensy", "teensy 4.1 600 mhz", "Il **Teensy 4.1** ha un Cortex-M7 a 600 MHz, 3,3 V non tollerante 5 V: ottimo per cinematica inversa in tempo reale e controllo di molti stepper."],
    ["stepper", "stepper passo passo nema 17 23 34 motore a passi coppia fase corrente", "Un **motore passo-passo** (stepper) fa 200 passi/giro (1,8°). NEMA 17: 0,4–0,6 N·m, 1,5–2 A per fase; NEMA 23: 1–3 N·m; NEMA 34: 4–12 N·m. Si pilota SEMPRE con un driver a corrente costante (A4988, DRV8825, TMC2209, DM542) impostando la corrente con il trimmer Vref. Alta velocità = coppia bassa: serve tensione alta (24–48 V)."],
    ["a4988", "a4988 drv8825 tmc2209 vref corrente driver regolare trimmer", "**Regolare la corrente del driver**: A4988 con Rs = 0,068 Ω → Vref = I × 8 × Rs (1,5 A → 0,82 V). DRV8825: Vref = I / 2. TMC2209: Vref ≈ Irms × 2,5 / 1,77 (o via UART). Imposta 70–90% della corrente nominale del motore; oltre 1 A sull'A4988 serve dissipatore e ventola. Collega sempre un elettrolitico da 100 µF vicino a VMOT."],
    ["perdepassi", "perde passi stepper salta vibra fischia velocita", "Uno stepper **perde passi** se la coppia richiesta supera quella disponibile: velocità troppo alta (la corrente non fa in tempo a salire: serve più tensione), accelerazione senza rampa, corrente impostata bassa o carico eccessivo. Rimedi: rampe di accelerazione, VMOT 24 V, microstepping, riduttore."],
    ["motoredc", "motore dc spazzole corrente stallo velocita pwm controemf", "Un **motore DC** a spazzole: velocità ≈ proporzionale alla tensione, coppia ≈ proporzionale alla corrente. Allo spunto o bloccato assorbe la **corrente di stallo** V/R (anche 10 volte quella a vuoto). Si regola con PWM tramite MOSFET o ponte H (L298N, TB6612, BTS7960) e va protetto con un diodo di ricircolo."],
    ["pontehl298", "l298n ponte h due motori invertire senso caduta tensione", "Il **ponte H** inverte la polarità del motore: IN1 alto / IN2 basso = avanti, al contrario = indietro, entrambi uguali = freno. L'L298N è vecchio (bipolare): perde 2–3 V e scalda; per motori moderni meglio TB6612FNG (1,2 A) o BTS7960 (fino a 43 A)."],
    ["servo", "servo sg90 mg996r servomotore pwm 50 hz trema", "Un **servo RC** vuole un impulso ogni 20 ms (50 Hz): 1 ms = 0°, 1,5 ms = 90°, 2 ms = 180°. SG90: picchi 0,7 A; MG996R: fino a 2,5 A in stallo. Non alimentarli dal 5 V di Arduino: usa un alimentatore 5–6 V da 2–5 A con massa in comune, e un condensatore da 470–1000 µF."],
    ["bldc", "bldc brushless esc foc odrive", "Il **motore brushless (BLDC)** non ha spazzole: rendimento alto e lunga vita. Serve un ESC o un controllore FOC (ODrive, SimpleFOC) con encoder per posizionarlo come un servo. Ottimo per giunti a trasmissione diretta o con riduttore planetario."],
    ["servoac", "servo ac industriale azionamento drive yaskawa delta encoder assoluto", "I **servomotori AC industriali** (100 W–5 kW) con azionamento (es. classe Delta, Yaskawa, Siemens) hanno encoder assoluto, freno opzionale e anello di posizione nell'azionamento: si comandano con impulsi step/dir, EtherCAT o Modbus. Vanno alimentati a 230 V monofase o 400 V trifase come da targa."],
    ["inverter", "inverter vfd asincrono trifase frequenza motore induzione", "Un **motore asincrono** gira a n ≈ 60·f / coppie polari (1450 giri/min a 50 Hz per 4 poli). L'**inverter (VFD)** cambia la frequenza e quindi la velocità. Attenzione alla tensione: un inverter con ingresso 400 V trifase non funziona su 230 V monofase."],
    ["fusibile", "fusibile protezione corto rapido ritardato polyfuse", "Il **fusibile** si sceglie 25–50% sopra la corrente normale e va messo vicino alla sorgente (batteria/alimentatore). Rapido per elettronica, ritardato per motori (spunto). I PTC (polyfuse) si ripristinano da soli raffreddandosi."],
    ["corto", "cortocircuito corto circuito alimentatore limitazione corrente scintilla", "Un **cortocircuito** collega + e − con resistenza quasi zero: la corrente è limitata solo dall'alimentatore o dalla batteria. Cause tipiche: ponte di stagno tra piste, filo spellato, condensatore al tantalio rotto. Usa un alimentatore da banco con limitazione di corrente durante i test e cerca il corto con il multimetro in continuità a circuito spento."],
    ["multimetro", "multimetro tester misurare tensione corrente continuita", "**Multimetro**: tensione in parallelo (puntali ai due punti), corrente in SERIE (aprendo il circuito e usando la boccola A o mA), resistenza e continuità solo a circuito spento. Sulla Tavola: scegli la modalità e tocca i due punti con i puntali rosso e nero."],
    ["oscilloscopio", "oscilloscopio forma d onda segnale tempo pwm", "L'**oscilloscopio** mostra la tensione nel tempo: utile per PWM, 555, carica RC e disturbi. Regola la base dei tempi (s/div) e la scala in volt (V/div). Sulla Tavola: aggiungi una sonda su un nodo e premi \"Simula nel tempo\"."],
    ["massa", "massa gnd comune riferimento alimentazioni separate", "Due circuiti alimentati separatamente (es. Arduino via USB e motori a 12 V) devono avere la **massa in comune**, altrimenti i segnali non hanno riferimento. Unica eccezione: optoisolatori, che servono proprio a separarle."],
    ["breadboard", "breadboard basetta sperimentale righe colonne binari alimentazione", "La **breadboard** ha strisce di 5 fori collegati in verticale (colonne a–e e f–j) e due binari di alimentazione per lato. Il solco centrale separa i due lati: gli integrati DIP vanno a cavallo. I binari lunghi a volte sono interrotti a metà."],
    ["pcb", "pcb circuito stampato strati layer fr4 spessore rame oz", "Un **PCB** è un supporto isolante (di solito FR-4) con piste di rame. 1 oz di rame = 35 µm; spessore standard 1,6 mm. 2 strati bastano per quasi tutto l'hobby; 4 strati (segnale-massa-alimentazione-segnale) per MCU veloci, USB, Ethernet e meno disturbi. Pista per 1 A con 1 oz: circa 0,3–0,5 mm all'esterno."],
    ["finitura", "finitura hasl enig osp oro chimico stagno", "**Finiture PCB**: HASL (stagno a caldo) economica ma non piana; ENIG (nichel + oro chimico) piana e durevole, ideale per componenti a passo fine e QFN/BGA; OSP economica e piana ma si ossida dopo qualche mese."],
    ["pcbmateriale", "alluminio ims flex flessibile rogers rf materiale tg", "**Materiali PCB**: FR-4 TG135 standard; TG170 per saldature ripetute e calore; alluminio IMS per LED di potenza e MOSFET (dissipa); flex in poliimmide per parti che si piegano (cavi nei giunti del braccio); Rogers RO4350B per radiofrequenza e antenne."],
    ["saldare", "saldare saldatura stagno saldatore come si salda giunto", "**Come saldare (THT)**: 1) punta pulita e stagnata, 2) appoggia la punta su piazzola E piedino insieme per 1–2 s, 3) aggiungi lo stagno sul lato opposto (non sulla punta), 4) togli lo stagno, poi la punta, 5) non muovere per 2 s. Un buon giunto è lucido e a forma di vulcano concavo. In tutto 2–4 s: di più bruci la piazzola."],
    ["temperatura", "temperatura saldatore gradi 63/37 sac305 piombo senza piombo", "**Temperatura del saldatore**: lega 63/37 (Sn63Pb37, fonde a 183 °C) → 300–330 °C; senza piombo SAC305 (217–220 °C) → 340–370 °C. Per piazzole grandi o masse di rame alza di 20–30 °C o usa una punta più grossa, non solo più temperatura."],
    ["giuntofreddo", "giunto freddo opaco granuloso saldatura fredda non tiene", "Un **giunto freddo** è opaco, granuloso o a palla: lo stagno non ha bagnato la piazzola perché era fredda (poco tempo, punta sporca o troppo piccola). Rimedio: aggiungi flussante, riscalda piazzola e piedino insieme e lascia fluire."],
    ["ponte", "ponte di stagno corto tra piedini bridge", "Un **ponte di stagno** unisce due piazzole vicine: crea un corto. Toglilo con la treccia dissaldante e flussante (premi la treccia con la punta), oppure trascina la punta pulita con flussante tra i piedini."],
    ["flussante", "flussante flux colofonia pasta", "Il **flussante** pulisce gli ossidi e fa scorrere lo stagno. Il filo ne contiene già un'anima; per SMD e dissaldature aggiungine (penna o gel no-clean). Fumi: usa un aspiratore, non respirarli."],
    ["dissaldare", "dissaldare treccia pompetta aspirastagno togliere componente", "**Dissaldare**: pompetta aspirastagno (scalda, avvicina la pompetta, premi) oppure treccia di rame con flussante. Per integrati con molti piedini: aria calda o lega a basso punto di fusione."],
    ["filo", "filo stagno diametro 0.5 0.8 1 mm", "**Diametro del filo**: 0,5 mm per SMD e passo fine, 0,8 mm uso generale THT, 1–1,2 mm per cavi grossi e connettori di potenza."],
    ["sicurezzasald", "sicurezza saldatore fumi ustione piombo occhiali", "Sicurezza al banco: saldatore sempre nel suo supporto, occhiali, aspiratore fumi, lavati le mani dopo lo stagno con piombo e non mangiare al banco. Lo stagno può schizzare quando tagli i reofori: tienili con un dito."],
    ["tig", "tig saldatura tungsteno argon elettrodo bacchetta", "**TIG**: arco tra elettrodo di tungsteno e pezzo, protetto da argon puro; il materiale d'apporto (bacchetta) si aggiunge a mano. Pulito e preciso: inox, alluminio (in AC), titanio, spessori sottili. Distanza elettrodo-pezzo 2–5 mm, torcia a 70–80°, corrente ≈ 35–40 A per mm di spessore (acciaio)."],
    ["mig", "mig mag filo continuo torcia gas co2 stickout", "**MIG/MAG**: filo continuo che fa da elettrodo, gas Ar+CO₂ (MAG, acciaio) o Ar (MIG, alluminio). Veloce, facile per carpenteria. Stick-out (filo fuori dall'ugello) 10–15 mm, torcia a 70–80°, avanzamento costante. Troppo veloce = cordone alto e stretto; troppo lento = largo, sfondamento."],
    ["porosita", "porosita buchi cordone saldatura spruzzi difetti", "**Porosità** (buchi nel cordone): manca gas (bombola vuota, vento, ugello sporco, stick-out troppo lungo) o pezzo sporco/oleoso. **Spruzzi**: tensione o velocità filo sbagliate. **Incollatura**: corrente bassa o troppo veloce. **Sfondamento**: troppa corrente o troppo lento."],
    ["saldalluminio", "saldare alluminio ac ossido", "L'**alluminio** si salda in TIG AC (la fase positiva rompe l'ossido) o MIG pulsato con filo ER4043/ER5356 e argon puro. Spazzola inox dedicata, pulizia accurata, molta corrente perché conduce il calore. Il 7075 (Ergal) non è saldabile."],
    ["maschera", "maschera saldatura protezione raggi uv occhi dpi", "In saldatura: maschera autoscurente DIN 9–13, guanti in pelle, giacca ignifuga, niente sintetici. Mai guardare l'arco senza protezione: ustiona la retina. Ventila: i fumi di zincato e inox sono tossici."],
    ["tornio", "tornio mini tornio tornitura mandrino utensile avanzamento passata", "**Tornio**: n = Vc × 1000 / (π × D). Vc tipica con HSS: acciaio dolce 25–30 m/min, inox 15, alluminio 150–200, ottone 90; con metallo duro 4–6 volte di più. Su un mini tornio 180×300: passate 0,2–1 mm, avanzamento 0,05–0,15 mm/giro, utensile in asse."],
    ["truciolo", "truciolo lungo spezzato colore blu tornio", "Il **truciolo** racconta il taglio: argento/giallino ok; blu su acciaio con HSS = troppo veloce; lungo e filante = serve rompitruciolo o più avanzamento; polvere = ghisa o ottone (normale). Non toglierlo mai con le mani: usa l'uncino."],
    ["trapano", "trapano colonna punta foro giri velocita", "**Trapano**: n = Vc × 1000 / (π × d), con HSS su acciaio Vc ≈ 25 m/min → punta da 8 mm ≈ 1000 giri/min, da 13 mm ≈ 600. Bulina il centro, morsa sempre, foro pilota per Ø > 10 mm, olio da taglio su acciaio e inox."],
    ["smerigliatrice", "smerigliatrice flessibile disco taglio sbavo sicurezza", "**Smerigliatrice angolare**: disco da taglio sottile (1–1,6 mm) solo per tagliare, disco da sbavo (6 mm) solo di piatto a 30°. Controlla che i giri massimi del disco siano ≥ quelli della macchina (125 mm → 80 m/s ≈ 12 200 giri/min). Protezione montata, occhiali, guanti, scintille lontano da persone e infiammabili."],
    ["metalli", "metalli materiali densita acciaio alluminio inox ottone titanio quale scegliere", "Per il braccio: **alluminio 6082/6061** per bracci e staffe (leggero, lavorabile, 2700 kg/m³); **C45/42CrMo4** per alberi e perni; **inox 304** dove c'è umidità; **ottone/bronzo** per boccole; **titanio Gr5** quando serve leggerezza estrema; **tungsteno/leghe pesanti** per contrappesi compatti."],
    ["morsa", "morsa banco ganasce fissare pezzo", "Fissa sempre il pezzo in **morsa** prima di forare, limare o smerigliare: tieni il pezzo basso vicino alle ganasce per evitare vibrazioni e usa ganasce morbide (alluminio) su superfici finite."],
    ["sicurezzaoff", "sicurezza officina dpi guanti occhiali tornio capelli", "Regole d'officina: occhiali sempre; al tornio e al trapano NIENTE guanti, braccialetti o capelli sciolti (si avvolgono); chiave del mandrino mai lasciata inserita; estintore vicino quando saldi o smerigli."],
    ["esci", "esci dal banco mio spazio stanza laboratorio metalli", "Con **Esci dal banco** passi a **Il mio spazio**: una stanza 3D personalizzabile con banco metalli, morsa, smerigliatrice, trapano a colonna, saldatrici TIG/MIG e mini tornio. Puoi spostare i banchi, cambiare pavimento e pareti; la disposizione viene salvata."],
    ["usotavola", "come si usa tavola componenti fili collegare editor circuito", "**Tavola elettronica**: scegli un componente dalla libreria e tocca la tavola per posarlo; per un filo tocca un piedino e poi un altro. Tocca un componente per cambiarne i valori, ruotarlo o eliminarlo. Il simulatore ricalcola subito tensioni e correnti, colora i fili e segnala gli errori con la spiegazione."],
    ["usosaldatura", "come gioco saldatura minigioco piazzole", "**Banco di saldatura**: scegli lega, temperatura e filo, poi per ogni piazzola tieni premuto per scaldarla e premi \"Stagno\" quando la barra è nella zona verde. Troppo poco = giunto freddo, troppo = piazzola bruciata, troppo stagno = ponte. Usa pompetta o treccia per correggere."],
    ["braccio", "braccio robot giunto j2 coppia riduttore motore cuscinetti", "Per i **giunti del braccio**: coppia richiesta = massa × g × braccio di leva + accelerazioni. Di solito si usa uno stepper NEMA 17/23 o un servo AC con riduttore (cicloidale, planetario o strain-wave 50–100:1). I cuscinetti a contatto obliquo o a rulli incrociati reggono i momenti ribaltanti. Nella scheda Progetto trovi i calcoli del tuo braccio."],
    ["batteria", "batteria pila lipo li ion 18650 autonomia capacita mah", "**Autonomia** ≈ capacità (Ah) / corrente (A): 2200 mAh con 1 A → circa 2 ore (meno ai carichi alti). Li-ion/LiPo: mai sotto 3,0 V per cella, mai in corto, carica con un caricatore apposito (TP4056, bilanciatore) e un fusibile vicino alla batteria."],
    ["relè", "rele relay contatti bobina modulo comandare 230v", "Il **relè** è un interruttore comandato da una bobina: separa il circuito di comando (5 V) da quello di potenza (12–230 V). Pilotalo con un transistor + diodo di ricircolo o usa un modulo già pronto. Per 230 V servono isolamento, scatola e competenza: rischio folgorazione."],
    ["pwm", "pwm duty cycle modulazione velocita luminosita", "Il **PWM** accende e spegne velocemente un'uscita: il valore medio è V × duty. Arduino: analogWrite(pin, 0–255) a circa 490 Hz; per motori meglio 20 kHz (silenziosi)."],
    ["ohmlegge", "legge di ohm tensione corrente resistenza formula", "**Legge di Ohm**: V = R·I. Potenza: P = V·I = R·I² = V²/R. Esempio: 12 V su 220 Ω → 54,5 mA e 0,65 W (serve una resistenza da 1 W)."],
    ["kirchhoff", "kirchhoff nodi maglie serie parallelo", "**Serie**: stessa corrente, le resistenze si sommano. **Parallelo**: stessa tensione, 1/R = 1/R1 + 1/R2. Kirchhoff: in un nodo la somma delle correnti entranti è uguale a quella delle uscenti; in una maglia la somma delle tensioni è zero."],
    ["phpz", "ph pz phillips pozidriv croce differenza cacciavite impronta", "**Phillips (PH)** e **Pozidriv (PZ)** sembrano uguali ma non lo sono: la PH ha ali coniche e il cacciavite tende a uscire (cam-out) – spingi forte; la PZ ha le ali parallele e 4 tacche sottili a 45° sulla testa della vite. Un PH in una vite PZ (o viceversa) tocca solo in punta: spana l'impronta. Usa sempre la misura giusta: PH2/PZ2 per viti M4–M5."],
    ["torx", "torx tx stella esalobata t20 t25 t30", "Il **Torx (TX)** ha 6 lobi: trasmette più coppia senza uscire e si usa su viti per elettronica, auto e macchine. Misure tipiche: TX20 per M4, TX25 per M5, TX30 per M6, TX40 per M8. Un TX troppo piccolo gira a vuoto e arrotonda i lobi."],
    ["brugola", "brugola esagono incassato tcei chiave a l 2.5 3 4 5 6 8", "La **brugola** (esagono incassato) delle viti TCEI ISO 4762: M3 → 2,5 mm, M4 → 3, M5 → 4, M6 → 5, M8 → 6, M10 → 8, M12 → 10. Infilala fino in fondo e mai una brugola in pollici in una vite metrica: gioca e spana la sede."],
    ["dinamometrica", "chiave dinamometrica coppia serraggio clic campo taratura", "La **chiave dinamometrica** a scatto si regola sulla scala e fa \"clic\" alla coppia impostata: fermati al primo clic. Scegli quella il cui campo contiene il valore nel 20–100% (precisione ±4% secondo ISO 6789), riportala al minimo dopo l'uso e non usarla per svitare."],
    ["preforo", "preforo foro filettare maschio punta m6 m8 m5 filettatura", "**Fori da filettare** (passo grosso): M3 → Ø2,5, M4 → Ø3,3, M5 → Ø4,2, M6 → Ø5, M8 → Ø6,8, M10 → Ø8,5, M12 → Ø10,2. Maschio dritto, olio da taglio, mezzo giro avanti e un quarto indietro per rompere il truciolo."],
    ["seghetto", "seghetto sega ferro lama tpi denti tubo lamiera", "**Seghetto**: almeno 3 denti sempre in presa. Lame da 18 TPI per pieno e spessori grossi, 24 TPI per tubi e profilati, 32 TPI per lamiere e tubi sottili. I denti guardano avanti: si taglia spingendo, con colpi lunghi e lenti (≈ 1 al secondo)."],
    ["calibro", "calibro micrometro misurare precisione nonio centesimi", "**Calibro**: risoluzione 0,02–0,01 mm, per misure generali. **Micrometro**: 0,001–0,01 mm, per alberi e sedi di cuscinetti (tolleranze h6/k6). Misura a pezzo freddo, con la frizione del micrometro e senza forzare."],
    ["comparatore", "comparatore eccentricita runout centratura albero", "Il **comparatore** misura spostamenti (0,01 mm): su base magnetica, con il tastatore perpendicolare e un po' di precarico. Ruotando l'albero leggi l'eccentricità (TIR = massimo − minimo)."],
    ["montaggio", "area assemblaggio montaggio braccio monta slot link flangia", "Nell'**Area di assemblaggio** monti in ordine: basamento (4 viti M10 sul tavolo), giunti (motore + riduttore), link (barre tagliate nel Mio spazio o a magazzino), pinza e controllore. Ogni fissaggio va **serrato** con l'utensile e la coppia giusti, poi **cablaggio** (motore → suo driver, driver → alimentazione giusta, segnale dal controllore) e **E-stop**. Infine la verifica fisica e la simulazione."],
    ["baricentro", "baricentro centro di massa ribaltamento momento base", "Il **baricentro** del braccio teso si sposta lontano dalla base: il momento ribaltante M = Σ m·g·d deve essere minore di quello che resiste (precarico delle viti del basamento × braccio + peso). Link leggeri, motori vicino alla base e un basamento largo e ben serrato tengono il braccio a terra."],
    ["inerzia", "inerzia momento d inerzia accelerazione rampa coppia dinamica", "La coppia di un giunto è **gravità + inerzia**: T = Σ m·g·d + I·α, con I = Σ m·r² (+ m·L²/12 per ogni link). Accelerazioni brusche (rampa corta) moltiplicano la coppia: allunga la rampa o alleggerisci la punta prima di cambiare motore."],
    ["flessione", "flessione cedimento rigidezza link sezione deflessione punta", "Il **cedimento in punta** somma la flessione dei link (δ = F·L³ / 3EI) e la torsione dei riduttori. Raddoppiare l'altezza della sezione rende il link circa 8 volte più rigido; l'alluminio è 3 volte meno rigido dell'acciaio a parità di sezione."],
    ["cablaggio", "cablaggio cavo motore driver segnale alimentazione step dir", "**Cablaggio**: ogni motore va all'uscita del **suo** driver (cavi incrociati = un asse muove l'altro), i driver DC dall'alimentatore nel loro campo di tensione, gli azionamenti AC dalla rete 230 V con magnetotermico, il segnale (STEP/DIR, PWM, CAN, EtherCAT) dal controllore e la massa in comune. Mai prendere la potenza dai 5 V della logica."],
    ["estop", "emergenza e-stop fungo arresto sto relè sicurezza", "L'**arresto di emergenza** (EN ISO 13850) deve togliere energia ai motori: pulsante a fungo → relè di sicurezza → ingresso STO/ENABLE dei driver (categoria 0 o 1). Un E-stop solo software non basta."],
    ["privacy", "chiave api openai llm online intelligenza artificiale esterna privacy", "Questo assistente funziona **offline**: risponde con la sua base di conoscenza e i calcolatori, senza inviare dati. Se vuoi, nelle impostazioni puoi collegare un servizio esterno compatibile OpenAI incollando la TUA chiave: resta solo in questo browser (localStorage), ma chi usa questo dispositivo può leggerla. Di default è spento."]
  ];
  var IDX = KB.map(function (e) { var ks = toks(e[1]); return { id: e[0], keys: ks, stems: ks.map(stem), a: e[2], title: e[2].replace(/\*\*/g, "").split(/[.:]/)[0].slice(0, 60) }; });
  function search(q, n) {
    var qt = toks(q), qs = qt.map(stem), res = [];
    IDX.forEach(function (e) {
      var sc = 0;
      qt.forEach(function (w, i) {
        if (e.keys.indexOf(w) >= 0) sc += 3;
        else if (e.stems.indexOf(qs[i]) >= 0) sc += 2;
        else if (w.length >= 4) { for (var j = 0; j < e.keys.length; j++) { var k = e.keys[j]; if (k.length >= 4 && (k.indexOf(w) === 0 || w.indexOf(k) === 0)) { sc += 1.5; break; } if (k.length >= 5 && lev(w, k) <= (w.length > 7 ? 2 : 1)) { sc += 1.2; break; } } }
      });
      if (sc > 0) res.push({ e: e, s: sc / Math.sqrt(1 + 0.04 * e.keys.length) });
    });
    res.sort(function (a, b) { return b.s - a.s; });
    return res.slice(0, n || 3);
  }
  function issuesText(iss, max) {
    return iss.slice(0, max || 6).map(function (i) { return (i.sev === "err" ? "⛔ " : i.sev === "warn" ? "⚠️ " : "ℹ️ ") + "**" + i.t + "**" + (i.comp ? " (" + i.comp + ")" : "") + "\n   Perché: " + i.why + "\n   Come rimediare: " + i.fix; }).join("\n");
  }
  function ctxAnswer(q, ctx) {
    var n = norm(q); if (!ctx) return null;
    var c = ctx.circuit, sp = ctx.space, sol = ctx.solder;
    var wantErr = /errore|errori|cosa non va|non funziona|non va|problem|sbagli|guasto|bruciat|perche|spiega|controlla|verifica|diagnos|aiut/.test(n);
    if (c && (wantErr || /circuito|tavola|schema/.test(n)) && (ctx.view === "bench" || /circuito|tavola|schema|led|resisten|motore|pin/.test(n))) {
      var iss = c.issues || [];
      if (!c.count) return "La tavola è vuota: carica un esempio (pulsante \"Esempi\") o aggiungi componenti dalla libreria.";
      var head = "Ho letto il tuo circuito \"" + (c.name || "senza nome") + "\" (" + c.count + " componenti" + (c.summary ? "; " + c.summary : "") + ").\n";
      if (!iss.length) return head + "✅ Non vedo errori: correnti e tensioni sono nei limiti dei componenti.";
      var e = iss.filter(function (i) { return i.sev === "err"; }).length, w = iss.filter(function (i) { return i.sev === "warn"; }).length;
      return head + "Ho trovato " + e + " errori e " + w + " avvisi:\n" + issuesText(iss);
    }
    if (sol && /saldatur|giunt|stagno|piazzol/.test(n) && (wantErr || ctx.view === "solder")) {
      var b = sol.bad || [];
      return "Banco di saldatura: lega " + sol.alloy + " a " + sol.temp + " °C (ideale " + sol.ideal + " °C), " + sol.done + "/" + sol.total + " giunti." + (b.length ? "\n" + b.map(function (x) { return "• " + x; }).join("\n") : " Tutto bene finora.");
    }
    if (sp && (ctx.view === "space" || /stazione|spazio|banco metalli/.test(n)) && (wantErr || /qui|stazione|ora|adesso|cosa (devo|posso)/.test(n))) {
      return "Sei in **Il mio spazio**" + (sp.station ? ", stazione **" + sp.station + "**" : "") + (sp.metal ? ", metallo **" + sp.metal + "**" : "") + "." + (sp.last ? "\nUltimo risultato: " + sp.last : "") + (sp.warn && sp.warn.length ? "\n⚠️ " + sp.warn.join("\n⚠️ ") : "") + (sp.tip ? "\nSuggerimento: " + sp.tip : "");
    }
    var p3 = ctx.pcb3d, tl = ctx.tools, as = ctx.asm;
    if (p3 && ctx.view === "pcb3d" && !p3.empty && (wantErr || /vedo|termic|calore|scheda|pista|via|strat|giunt|corrente|flusso|tempo/.test(n))) {
      return "**Scheda 3D**: " + p3.board + ", " + p3.size + (p3.vias ? ", " + p3.vias + " vie" : "") + (p3.bottom ? ", " + p3.bottom + " piste sullo strato inferiore" : "") + ". Vista: " + ({ normal: "normale", flow: "flusso di corrente", heat: "termica" }[p3.mode] || p3.mode) + (p3.hot ? ", componente più caldo " + p3.hot : "") + "." + (p3.drc && p3.drc.length ? "\n⚠️ " + p3.drc.join("\n⚠️ ") : "") + "\nNella vista termica i colori vanno dal blu (25 °C) al rosso: le piste si scaldano con R·I², i componenti con la loro potenza. Le piste che si incrociano passano sotto con una via.";
    }
    if (tl && ctx.view === "tools" && (wantErr || /utensil|uso|qui|cacciavit|chiave|coppia|vite|successo/.test(n)) && !/\bm(3|4|5|6|8|10|12|16)\b/.test(n)) {
      return "Al **Tavolo utensili** hai in mano: **" + tl.tool + "** sul pezzo **" + tl.target + "**." + (tl.last ? "\nUltimo esito: " + (tl.last.sev === "ok" ? "✅ " : tl.last.sev === "warn" ? "⚠️ " : "⛔ ") + "**" + tl.last.t + "**" + (tl.last.why ? "\nPerché: " + tl.last.why : "") + (tl.last.fix ? "\nCome si fa bene: " + tl.last.fix : "") : "\nScegli inserto/misura e coppia e premi Usa: ti dico se è l'utensile giusto.") + "\nEsiti finora: ✅ " + tl.stats.ok + " · ⚠️ " + tl.stats.warn + " · ⛔ " + tl.stats.err + (tl.damaged ? " · pezzi rovinati: " + tl.damaged : "");
    }
    if (as && ctx.view === "asm" && (wantErr || /manca|montaggio|braccio|sovraccaric|cablaggio|serrag|simulaz|pronto|giunto/.test(n)) && !/\bm(3|4|5|6|8|10|12|16)\b/.test(n)) {
      var head2 = "**Area di assemblaggio** (" + as.axes + " assi): montati " + as.mounted + ", fissaggi serrati bene " + as.tight + ", giunti cablati " + as.wired + "/" + as.axes + ". Massa " + fx(as.mass, 2) + " kg, cedimento in punta " + fx(as.defl, 2) + " mm.";
      var sm = as.sim && as.sim.events && as.sim.events.length ? "\nDalla simulazione:\n" + as.sim.events.slice(0, 4).map(function (e) { return (e.sev === "err" ? "⛔ " : "⚠️ ") + fx(e.time, 1) + " s · **" + e.t + "**" + (e.fix ? " → " + e.fix : ""); }).join("\n") : as.sim ? "\nSimulazione: ✅ ciclo completato (coppia max " + Math.round(as.sim.peakUtil * 100) + "%, motore più caldo " + Math.round(as.sim.peakTemp) + " °C)." : "";
      var jt = as.J && as.J.length ? "\nCoppie: " + as.J.map(function (j) { return j.tag + " " + fx(j.treq, 1) + "/" + fx(j.tavail, 1) + " N·m"; }).join(" · ") : "";
      return head2 + (as.issues.length ? "\nDa sistemare (" + as.errors + " errori, " + as.warns + " avvisi):\n" + issuesText(as.issues, 5) : "\n✅ Nessun problema statico.") + jt + sm;
    }
    if (ctx.arm && /mio braccio|progetto|giunt|riduttor|cuscinett/.test(n) && wantErr !== null) {
      var a = ctx.arm; if (a.summary) return "Sul tuo braccio: " + a.summary + (a.issues && a.issues.length ? "\nDa sistemare:\n• " + a.issues.slice(0, 5).join("\n• ") : "");
    }
    return null;
  }
  function answer(q, ctx) {
    q = String(q || "").trim(); if (!q) return { text: "Scrivimi una domanda: per esempio \"resistenza per LED blu a 12 V\" oppure \"cosa non va nel mio circuito?\".", src: "none", sug: [] };
    var n = norm(q), ns = nums(q);
    if (/^(ciao|salve|buongiorno|buonasera|hey|ehi)\b/.test(n)) return { text: "Ciao! Sono l'assistente del laboratorio (offline). Posso spiegarti gli errori del circuito, calcolare resistenze, partitori, RC, giri del tornio e del trapano, parametri TIG/MIG, e rispondere su saldatura, PCB, motori e metalli.", src: "kb", sug: ["Cosa non va nel mio circuito?", "Resistenza per LED rosso a 5 V", "Giri tornio Ø20 alluminio"] };
    var c = ctxAnswer(q, ctx); if (c) return { text: c, src: "ctx", sug: [] };
    for (var i = 0; i < CALCS.length; i++) if (CALCS[i].re.test(n)) { var hasN = ns.length > 0 || CALCS[i].id === "lathe" || CALCS[i].id === "drill" || CALCS[i].id === "weldset"; if (hasN || /calcol|quant/.test(n)) return { text: CALCS[i].run(q, ns), src: "calc", calc: CALCS[i].id, sug: [] }; }
    var r = search(q, 3);
    if (r.length && r[0].s >= 1.4) return { text: r[0].e.a, src: "kb", id: r[0].e.id, sug: r.slice(1).filter(function (x) { return x.s >= 1; }).map(function (x) { return x.e.title; }) };
    return { text: "Non ho trovato una risposta sicura. Prova a riformulare con parole chiave (es. \"giunto freddo\", \"vref A4988\", \"TIG alluminio 2 mm\") oppure chiedimi di controllare il circuito." + (r.length ? "\nForse cercavi: " + r.map(function (x) { return x.e.title; }).join(" · ") : ""), src: "none", sug: r.map(function (x) { return x.e.title; }) };
  }
  /* --- fornitori: offline (predefinito) e compatibile OpenAI (opzionale) --- */
  var SKEY = "xentriq-braccio-ai";
  function loadCfg() { try { var o = JSON.parse(root.localStorage.getItem(SKEY) || "{}"); return { on: !!o.on, url: o.url || "https://api.openai.com/v1", model: o.model || "gpt-4o-mini", key: o.key || "" }; } catch (e) { return { on: false, url: "https://api.openai.com/v1", model: "gpt-4o-mini", key: "" }; } }
  function saveCfg(c) { try { if (!c.on && !c.key) root.localStorage.removeItem(SKEY); else root.localStorage.setItem(SKEY, JSON.stringify({ on: !!c.on, url: c.url, model: c.model, key: c.key })); } catch (e) {} }
  function ctxSummary(ctx) {
    if (!ctx) return ""; var s = [];
    if (ctx.view) s.push("Vista: " + ctx.view);
    if (ctx.circuit && ctx.circuit.count) s.push("Circuito: " + ctx.circuit.count + " componenti. " + (ctx.circuit.summary || "") + " Errori: " + (ctx.circuit.issues || []).map(function (i) { return i.t; }).join("; "));
    if (ctx.space) s.push("Spazio: stazione " + (ctx.space.station || "-") + ", metallo " + (ctx.space.metal || "-") + ". " + (ctx.space.last || ""));
    if (ctx.pcb3d && !ctx.pcb3d.empty) s.push("PCB 3D: " + ctx.pcb3d.board + " " + ctx.pcb3d.size + ", vista " + ctx.pcb3d.mode + (ctx.pcb3d.hot ? ", più caldo " + ctx.pcb3d.hot : ""));
    if (ctx.tools) s.push("Tavolo utensili: " + ctx.tools.tool + " su " + ctx.tools.target + (ctx.tools.last ? " → " + ctx.tools.last.t : ""));
    if (ctx.asm) s.push("Assemblaggio: " + ctx.asm.axes + " assi, montati " + ctx.asm.mounted + ", " + ctx.asm.errors + " errori: " + (ctx.asm.issues || []).map(function (i) { return i.t; }).join("; ") + (ctx.asm.sim ? ". Simulazione: " + (ctx.asm.sim.events || []).map(function (e) { return e.t; }).join("; ") : ""));
    if (ctx.arm && ctx.arm.summary) s.push("Braccio: " + ctx.arm.summary);
    return s.join("\n");
  }
  var PROVIDERS = {
    offline: { id: "offline", label: "Offline (sul dispositivo)", ask: function (q, ctx) { return Promise.resolve(answer(q, ctx)); } },
    openai: { id: "openai", label: "Compatibile OpenAI (chiave tua)", ask: function (q, ctx, hist, cfg) {
      cfg = cfg || loadCfg(); if (!cfg.on || !cfg.key) return Promise.reject(new Error("Fornitore esterno spento."));
      if (typeof fetch !== "function") return Promise.reject(new Error("fetch non disponibile"));
      var local = answer(q, ctx), msgs = [{ role: "system", content: "Sei l'assistente del laboratorio Braccio Lab (elettronica, saldatura PCB, officina metalli, braccio robotico). Rispondi in italiano, conciso e pratico, con numeri e sicurezza. Contesto attuale:\n" + ctxSummary(ctx) + "\nRisposta della base offline (usala se corretta):\n" + local.text }];
      (hist || []).slice(-6).forEach(function (h) { msgs.push({ role: h.me ? "user" : "assistant", content: h.text }); });
      msgs.push({ role: "user", content: q });
      return fetch(cfg.url.replace(/\/+$/, "") + "/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.key }, body: JSON.stringify({ model: cfg.model, messages: msgs, temperature: 0.3, max_tokens: 600 }) })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (j) { var t = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content; if (!t) throw new Error("risposta vuota"); return { text: t, src: "llm", sug: [] }; });
    } }
  };
  function ask(q, ctx, hist) {
    var cfg = loadCfg();
    if (cfg.on && cfg.key) return PROVIDERS.openai.ask(q, ctx, hist, cfg).catch(function (e) { var a = answer(q, ctx); a.text += "\n\n(Servizio esterno non raggiungibile: " + e.message + ". Ho risposto offline.)"; return a; });
    return PROVIDERS.offline.ask(q, ctx);
  }
  var API = { KB: KB, search: search, answer: answer, ask: ask, nums: nums, norm: norm, PROVIDERS: PROVIDERS, loadCfg: loadCfg, saveCfg: saveCfg, issuesText: issuesText, ctxSummary: ctxSummary, CALCS: CALCS.map(function (c) { return c.id; }) };
  if (isNode) module.exports = API; else root.AST = API;
})(typeof window !== "undefined" ? window : this);
