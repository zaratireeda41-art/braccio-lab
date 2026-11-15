/* XENTRIQ INDUSTRY · Braccio Lab — la Dispensa (magazzino).
   Tutti i dati sono VALORI TIPICI (cataloghi, listini e annunci, arrotondati) e i marchi sono
   solo esempi della classe di prodotto: prima di ordinare controlla la scheda del produttore. */
(function (root) {
  "use strict";
  var CAT = (typeof module !== "undefined" && module.exports) ? require("./catalog.js") : root.CAT;
  var CATS = [
    { id: "metalli", name: "Metalli e profili", icon: "rtube" },
    { id: "bulloneria", name: "Bulloneria e fissaggi", icon: "bolt" },
    { id: "flessibili", name: "Materiale flessibile", icon: "chain" },
    { id: "attrezzi", name: "Attrezzi", icon: "wrench" },
    { id: "motori", name: "Motori", icon: "motor" },
    { id: "riduttori", name: "Riduttori", icon: "gear" },
    { id: "cuscinetti", name: "Cuscinetti e freni", icon: "bearing" },
    { id: "pinze", name: "Pinze e utensili", icon: "gripper" },
    { id: "sensori", name: "Sensori ed encoder", icon: "sensor" },
    { id: "plc", name: "Elettronica e PLC", icon: "plc" },
    { id: "pneumatica", name: "Pneumatica", icon: "valve" }
  ];
  var ITEMS = [];
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; } return h; }
  function r0(x) { return x >= 100 ? Math.round(x / 5) * 5 : x >= 10 ? Math.round(x) : x >= 1 ? Math.round(x * 10) / 10 : Math.round(x * 100) / 100; }
  function add(o) {
    if (!o.act) o.act = { t: "shop" };
    if (!o.pr) o.pr = [Math.min(o.p, r0(o.p * 0.8)), Math.max(o.p, r0(o.p * 1.3))];
    var h = hash(o.id);
    if (o.stock == null) o.stock = o.cat === "attrezzi" ? 1 + h % 4 : (o.p > 1000 ? h % 3 : o.p > 200 ? 1 + h % 6 : 5 + h % 60);
    if (o.lead == null) o.lead = /cines|Cina|SHPR|LHSG|Huandong|Leaderdrive/i.test(o.name + " " + (o.brand || "")) ? 4 + h % 3 : o.p > 1500 ? 6 + h % 6 : 1 + h % 2;
    o.unit = o.unit || "pz"; o.spec = o.spec || []; o.tips = o.tips || ""; o.brand = o.brand || "";
    ITEMS.push(o); return o;
  }
  function f(x, d) { if (x == null || x === Infinity) return "—"; var s = (+x).toFixed(d == null ? 2 : d); s = s.replace(".", ","); return s.replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function secArea(sec, d) {
    if (sec === "round") return Math.PI * d.D * d.D / 4;
    if (sec === "tube") return Math.PI * (d.D * d.D - Math.pow(d.D - 2 * d.t, 2)) / 4;
    if (sec === "rect") return d.B * d.H;
    return d.B * d.H - (d.B - 2 * d.t) * (d.H - 2 * d.t);
  }
  function mat(id) { return CAT.byId(CAT.MATERIALS, id); }

  /* ---------------- METALLI E PROFILI ---------------- */
  function bar(id, mid, sec, dims, name, brand, eurm, tips, fit, icon) {
    var m = mat(mid), A = secArea(sec, dims), kgm = m.rho * A * 1e-6;
    return add({ id: id, cat: "metalli", role: "link", icon: icon || sec, name: name, brand: brand, p: eurm || r0(kgm * m.eur + 4), unit: "m", mass: kgm,
      spec: [["Materiale", m.name], ["Peso al metro", f(kgm, 2) + " kg/m"], ["Area sezione", f(A, 0) + " mm²"], ["Snervamento Rₑ", m.Re + " MPa"], ["Modulo E", m.E + " GPa"], ["Densità", f(m.rho, 0) + " kg/m³"]],
      tips: tips, fit: fit, act: { t: "link", mat: mid, sec: sec, dims: dims } });
  }
  bar("tb_s355_219", "s355", "tube", { D: 219.1, t: 8 }, "Tubo tondo S355 Ø219,1×8 (EN 10210)", "acciaierie EU (Marcegaglia, Tenaris Dalmine)", 0, "Il tubo della colonna del tuo J2: rigidissimo a torsione e flessione. Si salda alle flange: dopo la saldatura spiana le facce al tornio.", "Missione 3–4 · colonna J1");
  bar("tb_s235_114", "s235", "tube", { D: 114.3, t: 6.3 }, "Tubo tondo S235 Ø114,3×6,3", "commercianti di ferro", 0, "Misura commerciale (4\" schedula). Buono per colonne di bracci medi.", "Missione 2–3 · colonna");
  bar("tb_s235_60", "s235", "tube", { D: 60.3, t: 4 }, "Tubo tondo S235 Ø60,3×4", "commercianti di ferro", 0, "Economico, si trova ovunque. Pesante per i link lontani dalla spalla.", "Missione 2 · link corti");
  bar("rt_s235_40", "s235", "rtube", { B: 40, H: 40, t: 3 }, "Tubo quadro S235 40×40×3", "commercianti di ferro", 0, "Il classico 'tubolare' da carpenteria. Per telai e basi.", "Telai e basi");
  bar("rt_s235_60", "s235", "rtube", { B: 60, H: 60, t: 3 }, "Tubo quadro S235 60×60×3", "commercianti di ferro", 0, "Rigido e saldabile; per link d'acciaio di media lunghezza.", "Missione 2–3 · link");
  bar("rt_s235_80", "s235", "rtube", { B: 80, H: 80, t: 4 }, "Tubo quadro S235 80×80×4", "commercianti di ferro", 0, "Per basi e link pesanti.", "Missione 3–4");
  bar("rt_s355_100", "s355", "rtube", { B: 100, H: 100, t: 5 }, "Tubo quadro S355 100×100×5", "commercianti di ferro", 0, "Per link d'acciaio molto caricati (robot industriale).", "Missione 4 · link J2");
  bar("tb_al_50", "al6061", "tube", { D: 50, t: 4 }, "Tubo tondo alluminio 6061-T6 Ø50×4", "Alcoa, Aluminium Ferro, Misumi", 0, "Leggero; si lavora al tornio. Per polsi e link terminali.", "Polso J4–J6");
  bar("tb_al_80", "al6061", "tube", { D: 80, t: 5 }, "Tubo tondo alluminio 6061-T6 Ø80×5", "Alcoa, Misumi", 0, "Per colonne leggere e link a sezione tonda.", "Missione 2 · colonna");
  bar("tb_al_100", "al6061", "tube", { D: 100, t: 5 }, "Tubo tondo alluminio 6061-T6 Ø100×5", "Alcoa, Misumi", 0, "La colonna della soluzione di missione 2.", "Missione 2 · J1");
  bar("rt_al_6080", "al6061", "rtube", { B: 60, H: 80, t: 4 }, "Tubo rettangolare alluminio 6061 60×80×4", "Misumi, metallo al taglio", 0, "Mettilo con il lato da 80 in verticale: il momento d'inerzia cresce col cubo dell'altezza.", "Missione 2 · link J2");
  bar("rt_al_100120", "al6061", "rtube", { B: 100, H: 120, t: 6 }, "Tubo rettangolare alluminio 6061 100×120×6", "Misumi, metallo al taglio", 0, "Link di bracci da fresatura (rigidezza prima della resistenza).", "Missione 3 · link J3");
  bar("rt_al_120160", "al6061", "rtube", { B: 120, H: 160, t: 8 }, "Tubo rettangolare alluminio 6061 120×160×8", "Misumi, metallo al taglio", 0, "Il link J2 del tuo braccio da fresatura (soluzione missione 3).", "Missione 3 · link J2");
  bar("fl_al_4010", "al6082", "rect", { B: 40, H: 10 }, "Piatto alluminio 6082 40×10", "metallo al taglio", 0, "Per staffe, polsi corti e flange semplici.", "Polso J4–J5");
  bar("fl_al_3010", "al6082", "rect", { B: 30, H: 10 }, "Piatto alluminio 6082 30×10", "metallo al taglio", 0, "Staffe leggere.", "Polso");
  bar("fl_s235_5010", "s235", "rect", { B: 50, H: 10 }, "Piatto acciaio S235 50×10", "commercianti di ferro", 0, "Staffe e rinforzi saldati.", "Staffe");
  bar("rd_c45_30", "c45", "round", { D: 30 }, "Tondo C45 bonificato Ø30", "acciai speciali (Lucchini, Ovako)", 0, "Per alberi e perni: si tornisce bene. Prevedi la sede chiavetta o un calettatore.", "Alberi giunti medi");
  bar("rd_c45_50", "c45", "round", { D: 50 }, "Tondo C45 bonificato Ø50", "acciai speciali", 0, "Alberi di giunti con coppia di cuscinetti.", "Alberi");
  bar("rd_42_40", "42crmo4", "round", { D: 40 }, "Tondo 42CrMo4 bonificato Ø40", "acciai speciali (Ovako, Lucchini)", 0, "L'acciaio del tuo albero J2 (Rₑ 650 MPa).", "Albero J2");
  bar("rd_42_60", "42crmo4", "round", { D: 60 }, "Tondo 42CrMo4 bonificato Ø60", "acciai speciali", 0, "Alberi cavi grandi (si fora al centro per far passare i cavi).", "Alberi grandi");
  function prof(id, B, H, t, slot, name, brand, eurm) {
    return bar(id, "al6063", "rtube", { B: B, H: H, t: t }, name, brand, eurm, "Profilato a cava " + slot + ": si taglia a misura e si monta con dadi a T e angolari, senza saldare. Nei calcoli è modellato come tubo " + B + "×" + H + "×" + t + " con area e inerzia simili.", "Telai, basi, bracci da scrivania", "profile");
  }
  prof("pr_2020", 20, 20, 2, "6 (tipo B)", "Profilato alluminio 20×20 cava 6", "classe Misumi HFS5 / item / Motedis", 6);
  prof("pr_3030", 30, 30, 2.5, "8", "Profilato alluminio 30×30 cava 8", "classe item / Bosch Rexroth / Misumi", 9);
  prof("pr_4040", 40, 40, 3, "8", "Profilato alluminio 40×40 cava 8 (leggero)", "classe item 8 / Bosch Rexroth / Misumi", 14);
  prof("pr_4080", 40, 80, 4, "8", "Profilato alluminio 40×80 cava 8", "classe item 8 / Bosch Rexroth", 26);
  prof("pr_4545", 45, 45, 3.5, "10", "Profilato alluminio 45×45 cava 10", "classe Bosch Rexroth / item", 18);
  bar("cf_40", "cf", "tube", { D: 40, t: 2 }, "Tubo fibra di carbonio Ø40×2 (avvolto)", "Easy Composites, Dragonplate, cinesi", 0, "Leggerissimo; incollalo a manicotti in alluminio con epossidica strutturale (3M DP490) e non forarlo.", "Bracci leggeri, polsi");
  bar("cf_60", "cf", "tube", { D: 60, t: 2 }, "Tubo fibra di carbonio Ø60×2 (avvolto)", "Easy Composites, Dragonplate", 0, "Rigidità specifica altissima; occhio agli incollaggi e agli urti.", "Link leggeri");
  function plate(id, mid, th, name, p, tips) { var m = mat(mid), kg = m.rho * 0.3 * 0.3 * th / 1000; return add({ id: id, cat: "metalli", role: "plate", icon: "plate", name: name, brand: "metallo al taglio / laser", p: p, mass: kg, unit: "pz", spec: [["Formato", "300 × 300 × " + th + " mm"], ["Materiale", m.name], ["Massa", f(kg, 2) + " kg"], ["Snervamento", m.Re + " MPa"]], tips: tips, fit: "Flange e piastre di collegamento" }); }
  plate("pl_al_15", "al6082", 15, "Piastra alluminio 6082 300×300×15", 45, "Per flange di adattamento motore–riduttore–link. Spessore ≥ 1,5× il diametro delle viti.");
  plate("pl_7075_15", "al7075", 15, "Piastra Ergal 7075 300×300×15", 110, "Flange molto caricate dove serve resistenza (non rigidezza).");
  plate("pl_s355_10", "s355", 10, "Piastra acciaio S355 300×300×10", 25, "Flange saldate sulla colonna: rettifica dopo la saldatura.");
  add({ id: "fil_pla", cat: "metalli", role: "filament", icon: "spool", name: "Filamento PLA 1,75 mm (1 kg)", brand: "Prusament, Bambu, eSun", p: 22, mass: 1, spec: [["Rₑ tipico stampato", "35–50 MPa"], ["Temperatura max", "≈ 55 °C"]], tips: "Facile da stampare. Cede col caldo e nel tempo (creep): per pezzi caricati usa PETG o PA-CF.", fit: "Missione 1" });
  add({ id: "fil_petg", cat: "metalli", role: "filament", icon: "spool", name: "Filamento PETG 1,75 mm (1 kg)", brand: "Prusament, Bambu, eSun", p: 24, mass: 1, spec: [["Rₑ tipico stampato", "40–50 MPa"], ["Temperatura max", "≈ 75 °C"]], tips: "Più tenace del PLA, meno fragile.", fit: "Missione 1" });
  add({ id: "fil_pacf", cat: "metalli", role: "filament", icon: "spool", name: "Filamento PA-CF nylon caricato carbonio (0,5 kg)", brand: "Bambu, Polymaker", p: 45, mass: 0.5, spec: [["Rigidezza", "≈ 2× PETG"], ["Note", "va asciugato, ugello temprato"]], tips: "Il migliore per pezzi strutturali stampati.", fit: "Missione 1–2 · staffe" });

  /* ---------------- BULLONERIA ---------------- */
  CAT.BOLTS.forEach(function (B) {
    add({ id: "iso4762_" + B.s.toLowerCase(), cat: "bulloneria", role: "bolt", icon: "bolt", name: "Vite a testa cilindrica ISO 4762 " + B.s + " (8.8 / 10.9 / 12.9)", brand: "Würth, Bossard, Fabory, Misumi", p: B.eur[1], mass: 0.0001 * B.d * B.d * 2.5, unit: "pz",
      spec: [["Chiave a brugola", B.hex + " mm"], ["Passo", f(B.pitch, 2) + " mm · foro per maschiare Ø" + f(B.tap, 1)], ["Area resistente Aₛ", f(B.As, 1) + " mm²"], ["Precarico FM 8.8/10.9/12.9", B.FM.map(function (x) { return f(x, 1); }).join(" / ") + " kN"], ["Coppia di serraggio MA", B.MA.map(function (x) { return f(x, 1); }).join(" / ") + " N·m"], ["Norma dati", "VDI 2230, μ 0,12 (filetto lubrificato leggermente)"]],
      tips: "Serra con la chiave dinamometrica alla coppia indicata, a croce, in 3 passate (30% · 70% · 100%). Le 10.9 e 12.9 non si serrano 'a sentimento'.", fit: "Flange dei giunti", act: { t: "bolt", s: B.s }, bolt: B });
  });
  var FAST = [
    ["iso4032_m8", "nut", "nut", "Dado esagonale ISO 4032 M8 classe 8", 0.05, "Per viti passanti. La classe del dado deve essere ≥ a quella della vite (8.8 → dado 8, 10.9 → 10)."],
    ["iso7089_m8", "washer", "washer", "Rondella piana ISO 7089 M8 (200 HV)", 0.03, "Sotto la testa sull'alluminio: distribuisce la pressione e non rovina la superficie."],
    ["dowel_6", "dowel", "pin", "Spina cilindrica ISO 8734 Ø6 m6 (temprata)", 0.35, "Due spine per flangia centrano i pezzi e prendono il taglio: le viti tengono solo il serraggio."],
    ["dowel_8", "dowel", "pin", "Spina cilindrica ISO 8734 Ø8 m6 (temprata)", 0.45, "Foro alesato H7 sui due pezzi forati insieme."],
    ["helicoil", "insert", "insert", "Inserti filettati Helicoil (assortimento M5–M12) + utensili", 85, "Nell'alluminio un filetto di vite 10.9/12.9 si strappa: con l'Helicoil il filetto è in acciaio inox e regge la vite."],
    ["heatset_m3", "insert_pla", "insert", "Inserti a caldo in ottone M3 (×100) per stampa 3D", 9, "Si piantano col saldatore nei pezzi stampati: filetti robusti e smontabili."],
    ["tnut_m6", "tnut", "nut", "Dadi a T cava 8 M6 (×50) con molla", 18, "Per montare staffe e angolari sui profilati a cava."],
    ["nordlock_m8", "lockw", "washer", "Rondelle di sicurezza a cuneo M8 (classe Nord-Lock, ×20)", 16, "Contro l'allentamento da vibrazioni (elettromandrino, motori a passo)."],
    ["loctite243", "threadlock", "bottle", "Frenafiletti medio (classe Loctite 243, 10 ml)", 12, "Una goccia sulle viti che vibrano; smontabile con utensili normali."],
    ["iso4026_m5", "grub", "bolt", "Grani a punta piana ISO 4026 M5 (×20)", 4, "Per bloccare pulegge e giunti sull'albero (meglio su una spianatura)."],
    ["iso7380_m5", "bolt_misc", "bolt", "Viti a testa bombata ISO 7380 M5 (×50)", 8, "Per carter e coperture, non per le flange strutturali."],
    ["anchor_m12", "anchor", "bolt", "Ancoranti chimici M12 per fissare la base a terra (×4)", 35, "Il robot va ancorato: la base deve reggere il momento ribaltante con il braccio steso."]
  ];
  FAST.forEach(function (x) { add({ id: x[0], cat: "bulloneria", role: x[1], icon: x[2], name: x[3], brand: "Würth, Bossard, Misumi", p: x[4], mass: 0.05, tips: x[5], fit: "Montaggio", act: { t: "shop" } }); });

  /* ---------------- MATERIALE FLESSIBILE ---------------- */
  CAT.CABLES.forEach(function (c) {
    if (!c.id) return;
    add({ id: "cab_" + c.id, cat: "flessibili", role: "cable", icon: "cable", name: c.name, brand: c.flex === "fixed" ? "Lapp, Prysmian, Helukabel" : "classe igus chainflex, Lapp Ölflex Servo, Helukabel", p: c.eurm, unit: "m", mass: 0.012 * c.od * c.od / 10,
      spec: [["Sezione conduttori", c.mm2 ? f(c.mm2, 2) + " mm²" : "—"], ["Diametro esterno", f(c.od, 1) + " mm"], ["Uso", { fixed: "posa fissa", chain: "catena portacavi", robot: "torsione (robot)" }[c.flex]], ["Raggio minimo in movimento", f(c.bendF, 1) + " × d = " + f(c.od * c.bendF, 0) + " mm"], ["Schermato", c.sh ? "sì" : "no"]],
      tips: c.flex === "fixed" ? "Non metterlo in catena: i conduttori si spezzano dopo poche decine di migliaia di cicli." : "Lascia i cavi liberi nella catena, non legarli, e rispetta il raggio minimo.", fit: c.mm2 >= 1.5 ? "Servo AC e stepper grandi" : "Stepper, encoder, segnali", act: { t: "cable", ref: c.id } });
  });
  var CH = [
    ["e2_15", "e2", 15, 30, 38, "Catena portacavi classe igus E2.15 · interno 15×30 · R 38", 28, 0.25],
    ["e2_26a", "e2", 26, 50, 75, "Catena portacavi classe igus E2.26 · interno 26×50 · R 75", 38, 0.45],
    ["e2_26b", "e2", 26, 75, 100, "Catena portacavi classe igus E2.26 · interno 26×75 · R 100", 46, 0.55],
    ["e2_38", "e2", 38, 100, 150, "Catena portacavi classe igus E2.38 · interno 38×100 · R 150", 70, 0.9],
    ["trc40", "3d", 27, 27, 105, "Catena 3D per robot classe igus triflex R TRC.40 (Ø utile ≈ 27)", 95, 0.6],
    ["trc60", "3d", 42, 42, 145, "Catena 3D per robot classe igus triflex R TRC.60 (Ø utile ≈ 42)", 140, 0.9],
    ["trc85", "3d", 58, 58, 190, "Catena 3D per robot classe igus triflex R TRC.85 (Ø utile ≈ 58)", 210, 1.4]
  ];
  CH.forEach(function (x) { add({ id: x[0], cat: "flessibili", role: "chain", icon: "chain", kind: x[1], hi: x[2], bi: x[3], R: x[4], name: x[5], brand: "classe igus, Tsubaki Kabelschlepp, Murrplastik", p: x[6], unit: "m", mass: x[7],
    spec: [["Tipo", x[1] === "3d" ? "3D, si piega e si torce (robot)" : "piana (lavora su un piano)"], [x[1] === "3d" ? "Spazio utile" : "Interno (h × l)", x[1] === "3d" ? "Ø ≈ " + x[2] + " mm" : x[2] + " × " + x[3] + " mm"], ["Raggio di curvatura", x[4] + " mm"], ["Massa", f(x[7], 2) + " kg/m"]],
    tips: "Il raggio della catena deve essere ≥ al raggio minimo del cavo più rigido. Riempila al massimo al 60% e metti i cavi pesanti ai lati.", fit: x[1] === "3d" ? "Missione 3–4 · bracci a 6 assi" : "Missione 2–3", act: { t: "shop" } }); });
  var FL = [
    ["wrap10", "wrap", "wrap", "Guaina spiralata Ø10 mm (10 m)", 9, "Raccoglie i cavi lungo il braccio; facile aggiungerne uno."],
    ["wrap16", "wrap", "wrap", "Guaina spiralata Ø16 mm (10 m)", 12, "Per fasci più grossi."],
    ["sleeve10", "sleeve", "wrap", "Calza intrecciata PET Ø10 espandibile (10 m)", 10, "Protegge dall'abrasione e si allarga sulle curve."],
    ["sleeve20", "sleeve", "wrap", "Calza intrecciata PET Ø20 espandibile (10 m)", 15, "Per i fasci dei giunti grandi."],
    ["corr17", "sleeve", "wrap", "Tubo corrugato NW17 PA6 (10 m) + raccordi", 22, "Protezione robusta per cavi in posa semimobile."],
    ["gland_m20", "gland", "gland", "Pressacavi M20 IP68 (×10)", 12, "Ogni cavo che entra nel quadro passa da un pressacavo; per i cavi schermati usa quelli EMC in ottone."],
    ["ties", "ties", "wrap", "Fascette e basette adesive (assortimento)", 8, "Non stringere i cavi in catena: le fascette vanno solo alle estremità."],
    ["hose4", "hose", "hose", "Tubo pneumatico PU 4×2,5 (25 m)", 14, "Per pinze piccole e valvole compatte."],
    ["hose6", "hose", "hose", "Tubo pneumatico PU 6×4 (25 m)", 18, "La misura standard delle pinze medie."],
    ["hose8", "hose", "hose", "Tubo pneumatico PU 8×6 (25 m)", 24, "Per pinze grandi e linee lunghe: meno perdite di carico."],
    ["cpl_bellow", "coupling", "coupling", "Giunto a soffietto Ø25 (Tk ≈ 2 N·m)", 35, "Zero gioco, rigido a torsione: per encoder e assi piccoli."],
    ["cpl_gs19", "coupling", "coupling", "Giunto elastico a stella classe GS/ROTEX 19 (Tk ≈ 10 N·m)", 25, "Assorbe disallineamenti e vibrazioni tra motore e riduttore."],
    ["cpl_gs24", "coupling", "coupling", "Giunto elastico a stella classe GS/ROTEX 24 (Tk ≈ 35 N·m)", 38, "Per servo da 750 W–2 kW."],
    ["cpl_oldham", "coupling", "coupling", "Giunto Oldham Ø25 (Tk ≈ 3 N·m)", 18, "Compensa disassamenti laterali; piccolo gioco."],
    ["slipring", "slipring", "slipring", "Collettore rotante (slip ring) 12 fili 2 A", 45, "Solo se un giunto deve girare all'infinito; per la potenza dei servo è meglio limitare la corsa a ±170°."]
  ];
  var TK = { cpl_bellow: 2, cpl_gs19: 10, cpl_gs24: 35, cpl_oldham: 3 }, HOD = { hose4: 4, hose6: 6, hose8: 8 };
  FL.forEach(function (x) { var o = add({ id: x[0], cat: "flessibili", role: x[1], icon: x[2], name: x[3], brand: x[1] === "coupling" ? "classe KTR ROTEX, R+W, Misumi" : x[1] === "hose" ? "classe SMC, Festo, Camozzi" : "classe Hellermann, Lapp, Murrplastik", p: x[4], mass: 0.1, tips: x[5], fit: "Cablaggio e trasmissioni", act: { t: "shop" } });
    if (TK[x[0]]) { o.Tk = TK[x[0]]; o.spec = [["Coppia nominale Tk", o.Tk + " N·m"]]; }
    if (HOD[x[0]]) { o.od = HOD[x[0]]; o.spec = [["Diametro esterno", o.od + " mm"], ["Pressione max", "10 bar a 20 °C"]]; } });

  /* ---------------- ATTREZZI ---------------- */
  var TOOLS = [
    ["t_screw", "screwdrivers", "screwdriver", "Set cacciaviti taglio/PH/PZ", "classe Wera Kraftform, Wiha, Stanley", 35, "Per morsetti, carter e piccole viti."],
    ["t_prec", "precision", "screwdriver", "Cacciaviti di precisione (elettronica)", "classe Wera Kraftform Micro, iFixit", 25, "Morsettiere dei driver e trimmer."],
    ["t_vde", "vde", "screwdriver", "Cacciaviti isolati 1000 V (VDE)", "classe Wera, Knipex, Wiha", 40, "Obbligatori quando lavori su quadri a 230 V (sempre a quadro sezionato e lucchettato)."],
    ["t_hex", "hex", "hexkey", "Set chiavi a brugola 1,5–10 mm a testa sferica", "classe Bondhus, Wera Hex-Plus, Wiha", 28, "Coprono le ISO 4762 da M2 a M12. Testa sferica per avvitare, lato corto per serrare.", { hex: [1.5, 2, 2.5, 3, 4, 5, 6, 8, 10] }],
    ["t_hexL", "hex", "hexkey", "Chiavi a brugola grandi 12–19 mm", "classe Bondhus, Beta", 45, "Per M14–M24 (le M16 vogliono la 14).", { hex: [12, 14, 17, 19] }],
    ["t_torx", "torx", "hexkey", "Set chiavi Torx T10–T50", "classe Wera, Wiha", 25, "Molti motori e riduttori hanno viti Torx."],
    ["t_tqs", "torque", "torque", "Cacciavite dinamometrico 0,3–3 N·m", "classe Wera 7400, Wiha TorqueVario", 120, "Per M3–M4 su elettronica e piccoli giunti.", { range: [0.3, 3] }],
    ["t_tq1", "torque", "torque", "Chiave dinamometrica 1/4\" 2–25 N·m", "classe Gedore, Stahlwille, Beta", 110, "Per M4–M6 (e M8 8.8).", { range: [2, 25] }],
    ["t_tq2", "torque", "torque", "Chiave dinamometrica 3/8\" 20–100 N·m", "classe Gedore, Stahlwille, Beta", 140, "Per M8–M10 (e M12 8.8).", { range: [20, 100] }],
    ["t_tq3", "torque", "torque", "Chiave dinamometrica 1/2\" 40–200 N·m", "classe Gedore, Stahlwille, Beta", 170, "Per M10–M12 (le M16 vogliono la 60–340).", { range: [40, 200] }],
    ["t_tq4", "torque", "torque", "Chiave dinamometrica 1/2\" 60–340 N·m", "classe Gedore, Stahlwille", 230, "Per M14–M16 delle flange dei cicloidali grandi.", { range: [60, 340] }],
    ["t_bits", "hexbits", "hexkey", "Bussole con inserto a brugola 4–14 mm (attacco 1/4\"–1/2\")", "classe Wera Zyklop, Beta", 60, "La chiave dinamometrica serve con la bussola giusta per le viti a testa cilindrica."],
    ["t_cal", "caliper", "caliper", "Calibro digitale 150 mm (risoluzione 0,01 mm)", "classe Mitutoyo, Garant, Holex", 45, "Per misurare pezzi, fori e spessori."],
    ["t_mic", "micrometer", "caliper", "Micrometro 0–25 mm (0,001 mm)", "classe Mitutoyo, Garant", 90, "Per alberi e sedi cuscinetti (tolleranze h6/k6)."],
    ["t_dial", "dial", "dial", "Comparatore 0,01 mm + base magnetica", "classe Mitutoyo, Käfer, Garant", 75, "Misura giochi, eccentricità e cedimenti in punta durante il collaudo."],
    ["t_lvl", "level", "level", "Livella di precisione 0,02 mm/m", "classe Garant, Mitutoyo", 140, "Per mettere in bolla la base del robot."],
    ["t_drillp", "drillpress", "drill", "Trapano a colonna 16 mm", "classe Einhell, Optimum, Bosch", 260, "Fori dritti e precisi sulle flange."],
    ["t_drill", "drill", "drill", "Trapano avvitatore 18 V", "classe Makita, Bosch, Milwaukee", 150, "Per forature e montaggi veloci."],
    ["t_tap", "tap", "tap", "Set maschi M3–M12 + giramaschi (HSS-E)", "classe Dormer, Garant, Völkel", 75, "Fori filettati sulle flange: foro di preparazione = diametro − passo (M8 → 6,8 mm)."],
    ["t_bitsHSS", "bits", "drill", "Punte HSS-Co 1–13 mm", "classe Dormer, Garant, Bosch", 45, "Per acciaio e alluminio; con olio da taglio."],
    ["t_saw", "saw", "saw", "Troncatrice per alluminio / seghetto", "classe Einhell, Makita, Bahco", 180, "Taglio a misura di tubi e profilati."],
    ["t_deburr", "deburr", "file", "Sbavatore e lime", "classe Noga, Bahco", 25, "Ogni taglio va sbavato: le bave tagliano cavi e mani."],
    ["t_vise", "vise", "vise", "Morsa da banco 125 mm", "classe Bessey, Heuer", 90, "Per tenere i pezzi mentre li lavori."],
    ["t_multi", "multimeter", "meter", "Multimetro digitale CAT III", "classe Fluke 117, Uni-T, Brymen", 90, "Tensioni, continuità e polarità prima di accendere."],
    ["t_scope", "scope", "scope", "Oscilloscopio 2 canali 100 MHz", "classe Rigol DS1202Z-E, Siglent", 330, "Vedi gli impulsi step, i fronti degli encoder e i disturbi."],
    ["t_solder", "solder", "solder", "Stazione saldante a temperatura controllata", "classe Hakko FX-888D, Pinecil, Weller", 90, "Per pin header, connettori ed encoder."],
    ["t_crimp", "crimp_ferrule", "crimp", "Pinza crimpatrice per puntalini 0,25–6 mm²", "classe Knipex, Weidmüller, Wago", 55, "Ogni cavo flessibile in un morsetto a vite vuole il suo puntalino."],
    ["t_crimpd", "crimp_dupont", "crimp", "Crimpatrice connettori Dupont/JST", "classe Engineer PA-09, IWISS", 30, "Connettori per schede e moduli."],
    ["t_strip", "stripper", "crimp", "Spelafili automatico 0,2–6 mm²", "classe Knipex, Weidmüller", 35, "Spela senza intaccare i conduttori."],
    ["t_heat", "heatgun", "heat", "Pistola termica + guaine termorestringenti", "classe Bosch, Steinel", 45, "Isola giunte e riparazioni."],
    ["t_benchpsu", "benchpsu", "psu", "Alimentatore da banco 30 V 5 A", "classe Korad, Rigol, Riden", 70, "Prima accensione con limite di corrente: se c'è un corto non brucia niente."],
    ["t_hoist", "hoist", "hoist", "Gru da officina / paranco 500 kg", "classe Einhell, Beta", 240, "Pezzi oltre 25 kg non si sollevano a mano (movimentazione manuale dei carichi)."],
    ["t_ppe", "ppe", "ppe", "DPI: occhiali, guanti antitaglio, scarpe S3", "classe 3M, Uvex", 60, "Sempre, in officina."]
  ];
  TOOLS.forEach(function (x) { var o = add({ id: x[0], cat: "attrezzi", role: "tool", kind: x[1], icon: x[2], name: x[3], brand: x[4], p: x[5], mass: 0.5, tips: x[6], fit: "Banco attrezzi", act: { t: "tool" } }); if (x[7]) for (var k in x[7]) o[k] = x[7][k];
    if (o.range) o.spec = [["Campo di coppia", f(o.range[0], 1) + "–" + f(o.range[1], 0) + " N·m"], ["Precisione tipica", "±4% (ISO 6789)"]];
    if (o.hex) o.spec = [["Misure", o.hex.map(function (h) { return f(h, h % 1 ? 1 : 0); }).join(" · ") + " mm"]]; });

  /* ---------------- MOTORI, RIDUTTORI, CUSCINETTI, FRENI (dal catalogo del costruttore) ---------------- */
  var MBR = { servo_hobby: "Tower Pro, DSSERVO, Hitec", stepper: "StepperOnline, Leadshine, Moons'", stepper_cl: "StepperOnline, Leadshine (hybrid servo)", dc: "motori generici cinesi", bldc: "classe Moons', T-motor, CubeMars", ac: "Delta Electronics (ASDA-B3), classe Yaskawa/Panasonic" };
  var MTIP = { servo_hobby: "La coppia scritta è di stallo: usane al massimo la metà. Alimentazione separata, massa in comune con l'MCU.", stepper: "Perde coppia con la velocità: a 48 V con un driver digitale va molto meglio. Ad anello aperto può perdere passi.", stepper_cl: "Con l'encoder il driver corregge i passi persi e scalda meno.", dc: "Serve un encoder e un anello PID; da solo non sa stare fermo in posizione.", bldc: "Con un driver FOC (ODrive, moteus) diventa un servo economico.", ac: "Con il suo drive è il motore industriale per eccellenza: coppia di picco 3×, encoder assoluto integrato." };
  CAT.MOTORS.forEach(function (M) {
    var sp = [["Tipo", { servo_hobby: "servo hobby", stepper: "passo-passo", stepper_cl: "passo-passo closed-loop", dc: "DC a spazzole", bldc: "brushless (BLDC)", ac: "servo AC" }[M.type]]];
    if (M.type === "servo_hobby") sp.push(["Coppia di stallo", f(M.Tstall, 2) + " N·m (" + f(M.Tstall / 0.0981, 1) + " kg·cm)"], ["Velocità", f(M.degps, 0) + " °/s"], ["Corrente di stallo", f(M.Istall, 1) + " A"], ["Tensione", M.V.join("–") + " V"]);
    else if (M.type === "stepper" || M.type === "stepper_cl") sp.push(["Coppia di mantenimento", f(M.Th, 2) + " N·m"], ["Corrente di fase", f(M.I, 1) + " A"], ["Tensione driver consigliata", M.V.join("–") + " V"], ["Inerzia rotore", f(M.J * 1e6, 1) + " kg·cm² ×10⁻²"], ["Flangia", M.frame + " mm"]);
    else sp.push(["Coppia nominale / picco", f(M.Tn, 2) + " / " + f(M.Tpk, 2) + " N·m"], ["Velocità nominale / max", f(M.nN, 0) + " / " + f(M.nMax, 0) + " giri/min"], ["Corrente nominale", f(M.I, 1) + " A"], [M.P ? "Potenza" : "Tensione", M.P ? M.P + " W" : M.V.join("–") + " V"], ["Flangia", M.frame + " mm"]);
    sp.push(["Massa", f(M.mass, 2) + " kg"]);
    add({ id: "mot_" + M.id, cat: "motori", role: "motor", icon: M.type === "servo_hobby" ? "servo" : "motor", name: M.name, brand: MBR[M.type], p: M.price, mass: M.mass, spec: sp, tips: MTIP[M.type], fit: { servo_hobby: "Missione 1", stepper: "Missione 2", stepper_cl: "Missione 2", dc: "Laboratorio libero", bldc: "Missione 2 · laboratorio", ac: "Missione 3–4" }[M.type], act: { t: "motor", ref: M.id } });
  });
  var RTIP = { planetary: "Economico e compatto; il gioco (arcmin) e la rigidezza bassa pesano sulla precisione in punta.", harmonic: "Gioco quasi zero, leggero, rapporto alto: il riduttore dei polsi. Rigidezza non lineare (bassa ai piccoli carichi).", cyclo: "Rigido, robusto, cuscinetti d'uscita integrati: il riduttore delle spalle dei robot. Con i cloni cinesi chiedi il report di collaudo.", belt: "Silenzioso, economico, rapporto basso: va bene come primo stadio.", worm: "Autobloccante con rapporti alti, ma rendimento basso e gioco che cresce con l'usura." };
  CAT.REDUCERS.forEach(function (R) {
    if (R.type === "none") return;
    var sp = [["Rapporti", R.ratios.join(" · ") + " :1"], ["Coppia nominale", f(R.Tr, 0) + " N·m"], ["Coppia di accelerazione", f(R.Tacc, 0) + " N·m"], ["Coppia di emergenza", f(R.Tmom, 0) + " N·m"]];
    if (R.K && isFinite(R.K)) sp.push(["Rigidezza torsionale", f(R.K, 1) + " N·m/arcmin"]);
    if (R.hd) sp.push(["Rigidezza (3 tratti)", R.hd.slice(2).map(function (x) { return f(x / 1000, 0); }).join(" / ") + " kN·m/rad"]);
    sp.push(["Gioco / lost motion", f(R.LM, 1) + " arcmin"], ["Giri max in ingresso", f(R.nInMax, 0) + " giri/min"]);
    if (R.Mc) sp.push(["Momento ribaltante ammesso", f(R.Mc, 0) + " N·m"]);
    sp.push(["Massa", f(R.mass, 1) + " kg"]);
    add({ id: "red_" + R.id, cat: "riduttori", role: "reducer", icon: R.type === "cyclo" ? "cyclo" : R.type === "harmonic" ? "harmonic" : "gear", name: R.name, brand: /cines|Leaderdrive|SHPR|Huandong/i.test(R.name) ? "Huandong / Shuanghuan / Leaderdrive (Cina)" : R.type === "planetary" ? "classe Apex, Neugart, cinesi" : R.type === "harmonic" ? "Harmonic Drive" : R.type === "cyclo" ? "Nabtesco" : "vari", p: R.price, mass: R.mass, spec: sp, tips: (R.note ? R.note + " " : "") + RTIP[R.type], fit: R.type === "cyclo" ? "Spalla e base (J1–J3)" : R.type === "harmonic" ? "Gomito e polso (J3–J6)" : "Missione 2", act: { t: "reducer", ref: R.id } });
  });
  CAT.SUPPORTS.forEach(function (S) {
    if (S.id === "red") return;
    var sp = [];
    if (S.C) sp.push(["Carico dinamico C", f(S.C, 0) + " N"]); if (S.C0) sp.push(["Carico statico C₀", f(S.C0, 0) + " N"]);
    if (S.d) sp.push(["Albero", "Ø" + S.d + " mm"]); if (S.dp) sp.push(["Diametro primitivo", f(S.dp * 1000, 1) + " mm"]); if (S.Mc) sp.push(["Momento ammesso", f(S.Mc, 1) + " N·m"]);
    sp.push(["Massa", f(S.mass, 2) + " kg"]);
    add({ id: "sup_" + S.id, cat: "cuscinetti", role: "support", icon: "bearing", name: S.name, brand: S.kind === "xroller" ? "THK, IKO, cinesi" : "SKF, FAG (Schaeffler), NSK", p: S.price || 1, mass: S.mass || 0.05, spec: sp, tips: S.kind === "xroller" ? "Un solo cuscinetto regge carichi radiali, assiali e momento: ideale per le basi rotanti." : S.kind === "pair" ? "Due cuscinetti distanziati: più grande l'interasse, più momento reggono." : "Toglie il carico laterale dall'albero del servo.", fit: S.kind === "xroller" ? "Base J1" : "Giunti", act: { t: "support", ref: S.id } });
  });
  CAT.BRAKES.forEach(function (B) {
    if (B.id === "none") return;
    add({ id: "brk_" + B.id, cat: "cuscinetti", role: "brake", icon: "brake", name: B.name, brand: "classe Mayr ROBA-stop, Kendrion, cinesi", p: B.price, mass: B.mass, spec: [["Coppia frenante", f(B.Tb, 1) + " N·m (lato motore)"], ["Potenza bobina", B.W + " W a 24 V"], ["Tipo", "a molla: frena senza corrente"]], tips: "Sugli assi che portano peso: senza corrente (emergenza, blackout) il braccio non cade.", fit: "Assi di beccheggio (J2, J3, J5)", act: { t: "brake", ref: B.id } });
  });

  /* ---------------- PINZE E UTENSILI ---------------- */
  CAT.EFFECTORS.forEach(function (E) {
    var sp = [["Tipo", { servo: "pinza a servo", elec: "pinza elettrica", pneu: "pinza pneumatica", vac: "ventosa a vuoto", mag: "magnetica", spindle: "mandrino / elettromandrino" }[E.kind]], ["Massa", f(E.mass, 2) + " kg"], ["Lunghezza dalla flangia", f(E.L * 1000, 0) + " mm"]];
    if (E.F) sp.push(["Forza di presa", f(E.F, 0) + " N"]); if (E.stroke) sp.push(["Corsa totale", E.stroke + " mm"]); if (E.pay) sp.push(["Peso pezzo consigliato", f(E.pay, 1) + " kg (presa per attrito μ 0,1, sicurezza 2)"]);
    if (E.cups) sp.push(["Ventose", E.cups + " × Ø" + E.dc + " mm"]);
    if (E.air) sp.push(["Pressione min/nom/max", E.air.pmin + " / " + E.air.pnom + " / " + E.air.pmax + " bar"], [E.air.V ? "Volume per doppia corsa" : "Consumo eiettore", E.air.V ? E.air.V + " cm³" : E.air.ejector + " Nl/min"], ["Tubo consigliato", "Ø" + E.air.hose + " mm"]);
    if (E.P) sp.push(["Potenza", f(E.P, 0) + " W"]); if (E.vfd) sp.push(["Serve", "inverter (VFD)" + (E.water ? " + pompa acqua" : "")]);
    if (E.v24) sp.push(["Alimentazione", "24 V DC"]);
    add({ id: "eff_" + E.id, cat: "pinze", role: "effector", icon: E.kind === "vac" ? "vacuum" : E.kind === "spindle" ? "spindle" : E.kind === "mag" ? "magnet" : "gripper", name: E.name, brand: E.brand || "", p: E.price, mass: E.mass, spec: sp,
      tips: (E.note ? E.note + " " : "") + { servo: "Per pezzi leggeri; dita stampate in 3D.", elec: "Niente aria: si comanda con I/O o bus, forza regolabile.", pneu: "Forte, veloce ed economica, ma vuole compressore, valvola e tubi.", vac: "Per superfici lisce e piane; serve aria compressa per l'eiettore.", mag: "Presa istantanea su acciaio; nessuna aria.", spindle: "Per fresare: la forza di taglio entra nei calcoli dei giunti." }[E.kind], fit: E.kind === "spindle" ? "Missione 3" : E.pay >= 10 ? "Missione 4" : E.pay >= 1 ? "Missione 2" : "Missione 1", act: { t: "effector", ref: E.id } });
  });
  add({ id: "changer", cat: "pinze", role: "flange", icon: "changer", name: "Cambio utensile pneumatico (classe SCHUNK SWS / ATI QC)", brand: "classe SCHUNK SWS-011, ATI QC-11", p: 1200, mass: 0.6, flangeMass: 0.6, flangeL: 0.04, spec: [["Massa (lato robot + utensile)", "0,6 kg"], ["Altezza", "40 mm"], ["Carico consigliato", "≈ 15 kg"]], tips: "Permette di cambiare pinza o mandrino in automatico. Aggiunge massa e lunghezza in punta (entrano nei calcoli).", fit: "Missione 4", act: { t: "shop" }, air: true });
  add({ id: "ft_sensor", cat: "sensori", role: "flange", icon: "ft", name: "Sensore forza/coppia 6 assi (classe ATI Mini45 / Robotiq FT 300-S)", brand: "classe ATI, Robotiq, OnRobot HEX", p: 4500, mass: 0.3, flangeMass: 0.3, flangeL: 0.035, io: "eth", spec: [["Misura", "Fx Fy Fz Mx My Mz"], ["Interfaccia", "Ethernet / EtherCAT / USB"], ["Massa", "0,3 kg"]], tips: "Per lucidatura, inserimenti di precisione e protezione dagli urti. Si monta tra flangia e utensile.", fit: "Missione 3–4", act: { t: "shop" } });

  /* ---------------- SENSORI ---------------- */
  CAT.ENCODERS.forEach(function (E) {
    if (["none", "pot", "cl1000", "hall"].indexOf(E.id) >= 0) return;
    add({ id: "enc_" + E.id, cat: "sensori", role: "encoder", icon: "encoder", name: E.name, brand: { inc600: "Omron, cinesi", inc2500: "Omron, Autonics", as5600: "ams OSRAM (moduli cinesi)", as5048: "ams OSRAM", delta17: "Delta (integrato nel motore)", biss19: "classe RLS AksIM-2, Renishaw" }[E.id] || "", p: E.price || 1, mass: 0.05, spec: [["Risoluzione", E.cpr >= 1e5 ? Math.round(Math.log(E.cpr) / Math.LN2) + " bit" : E.cpr + " conteggi/giro"], ["Interfaccia", { ab: "A/B quadratura", i2c: "I²C", spi: "SPI", biss: "BiSS-C (RS-422)", driver: "al drive" }[E.iface] || E.iface], ["Lato", E.output ? "uscita del giunto (vede torsione e gioco)" : "motore"]], tips: E.output ? "Montato sull'uscita misura la posizione vera: compensa torsione e gioco del riduttore." : "Sul motore conta molto, ma non vede il gioco del riduttore.", fit: E.output ? "Missione 3–4" : "Missione 2", act: { t: "encoder", ref: E.id } });
  });
  CAT.HOMING.forEach(function (H) { if (H.id === "none") return; add({ id: "hom_" + H.id, cat: "sensori", role: "homing", icon: "sensor", name: H.name, brand: H.id === "ind" ? "classe Sick, Omron, Pepperl+Fuchs" : "classe Omron D2F, Cherry", p: H.price, mass: 0.03, unit: "per asse", spec: [["Uso", "azzeramento all'accensione"], ["Uscita", H.id === "ind" ? "PNP/NPN 24 V" : "contatto NC"]], tips: "Usa il contatto NC: se il filo si stacca il controllo se ne accorge.", fit: "Missione 2", act: { t: "homing", ref: H.id } }); });
  var SEN = [
    ["s_micro", "DI", 5, "Finecorsa a microswitch con leva (contatto NC)", "classe Omron D2F / V-156", 2, "Economico e affidabile; meglio cablato NC."],
    ["s_ind12", "DI", 24, "Sensore induttivo M12 PNP 24 V (Sn 4 mm)", "classe Sick IME, Omron E2E, Pepperl+Fuchs", 18, "Senza contatto, rileva metalli; a 24 V: su Arduino serve un optoisolatore."],
    ["s_ind8", "DI", 24, "Sensore induttivo M8 NPN 24 V (Sn 2 mm)", "classe Omron E2E, Balluff", 16, "Piccolo, per spazi stretti."],
    ["s_fork", "DI", 5, "Sensore ottico a forcella 5 V", "classe Omron EE-SX, moduli cinesi", 3, "Per homing su una bandierina; teme polvere e luce diretta."],
    ["s_reed", "DI", 24, "Sensore magnetico per cava della pinza (×2)", "classe SMC D-M9, SCHUNK MMS, Festo SMT-8M", 45, "Dice al controllo se la pinza è aperta o chiusa (e se ha preso il pezzo)."],
    ["s_vacsw", "DI", 24, "Vacuostato digitale", "classe SMC ZSE10, Schmalz VS", 65, "Conferma che la ventosa ha fatto presa prima di muovere."],
    ["s_press", "DI", 24, "Pressostato digitale aria 0–10 bar", "classe SMC ISE20, Festo SPAN", 70, "Se manca l'aria il braccio non deve muoversi con un pezzo in presa."],
    ["s_load", "D2", 5, "Cella di carico 20 kg + HX711", "moduli cinesi", 8, "Per pesare il pezzo preso."],
    ["s_imu", "I2C", 3.3, "IMU 9 assi BNO085 (I²C)", "classe Bosch/CEVA, Adafruit", 25, "Inclinazione e vibrazioni del braccio."],
    ["s_curr", "I2C", 3.3, "Sensore di corrente INA219 (I²C)", "Texas Instruments (moduli)", 4, "Misura la corrente dei servo: capisci quando sforzano."],
    ["s_pt100", "AI", 24, "Sonda PT100 + convertitore 4–20 mA", "classe Jumo, cinesi", 35, "Temperatura di motori e mandrino."],
    ["s_cam", "USB", 5, "Telecamera USB 1080p", "classe Logitech, ELP", 45, "Visione con OpenCV: serve un computer (Raspberry Pi o PC), non un Arduino."],
    ["s_smartcam", "ETH", 24, "Smart camera industriale", "classe Cognex In-Sight 2800, Omron FHV7, Keyence", 3000, "Elabora le immagini da sola e manda il risultato al PLC su Ethernet."],
    ["s_curtain", "D2", 24, "Barriera fotoelettrica di sicurezza tipo 4", "classe SICK deTec4, Pilz PSEN opII", 700, "Protegge l'accesso alla cella: va collegata al relè di sicurezza (OSSD)."],
    ["s_scanner", "D2", 24, "Laser scanner di sicurezza", "classe SICK nanoScan3, Keyence SZ", 3000, "Rallenta o ferma il robot quando qualcuno si avvicina."]
  ];
  SEN.forEach(function (x) { add({ id: x[0], cat: "sensori", role: x[0] === "s_reed" ? "gripsensor" : x[0] === "s_vacsw" ? "vacsw" : x[0] === "s_curtain" || x[0] === "s_scanner" ? "safetysensor" : "sensor", icon: x[0].indexOf("cam") >= 0 ? "camera" : "sensor", io: x[1], v: x[2], name: x[3], brand: x[4], p: x[5], mass: 0.05, spec: [["Uscita / interfaccia", { DI: "digitale", D2: "2 ingressi digitali", I2C: "I²C", AI: "analogica 4–20 mA", USB: "USB", ETH: "Ethernet" }[x[1]]], ["Tensione", x[2] + " V"]], tips: x[6], fit: "Sensori e sicurezza", act: { t: "shop" } }); });

  /* ---------------- ELETTRONICA E PLC ---------------- */
  CAT.MCUS.forEach(function (M) {
    var sp = M.plc ? [["I/O a bordo", M.di + " DI / " + M.dq + " DQ / " + M.ai + " AI" + (M.relay ? " (uscite a relè)" : "")], ["Uscite impulsi (PTO)", M.pto ? M.pto + " × " + f(M.ptoHz / 1000, 0) + " kHz" : "nessuna"], ["Contatori veloci", M.hsc ? M.hsc + " × " + f(M.hscHz / 1000, 0) + " kHz" : "—"], ["Rete", M.net], ["Alimentazione", M.relay && M.id === "s7_1214r" ? "230 V AC" : "24 V DC"]]
      : [["CPU", M.cpu], ["Logica", M.logic + " V"], ["Pin", M.pins || "—"], ["Contatori encoder hardware", M.hwEnc || "—"], ["CAN", M.can], ["EtherCAT", M.ethercat ? "sì (master)" : "no"]];
    add({ id: "mcu_" + M.id, cat: "plc", role: "mcu", icon: M.plc ? "plc" : "mcu", name: M.name, brand: { s7_1212c: "Siemens", s7_1214c: "Siemens", s7_1214r: "Siemens", s7_1511: "Siemens", micro850: "Allen-Bradley (Rockwell Automation)", nx1p2: "Omron", cp2e: "Omron", dvp14ss2: "Delta Electronics", cx9020: "Beckhoff", opta: "Arduino Pro (Finder)", controllino: "Controllino", ipc: "classe Beckhoff C6015, Siemens IPC, Advantech", uno: "Arduino", mega: "Arduino", esp32: "Espressif", stm32: "STMicroelectronics", teensy41: "PJRC" }[M.id] || "Arduino, Espressif, ST, PJRC", p: M.price, mass: M.plc ? 0.4 : 0.03, spec: sp, tips: M.plc ? "Il PLC lavora a 24 V, ha ingressi robusti e si programma in IEC 61131-3 (ladder, ST). " + M.cpu + "." : M.cpu + ".", fit: M.plc ? "Missione 2–4 (con drive adatti)" : M.id === "ipc" ? "Missione 4" : "Missione 1–3", act: { t: "mcu", ref: M.id } });
  });
  CAT.DRIVERS.forEach(function (D) { if (D.id === "pwm") return; add({ id: "drv_" + D.id, cat: "plc", role: "driver", icon: "driver", name: D.name, brand: { a4988: "Pololu / cinesi", drv8825: "Pololu / cinesi", tmc2209: "Trinamic (BTT, FYSETC)", dm542: "Leadshine / StepperOnline", dm860: "Leadshine / StepperOnline", hbs57: "Leadshine", bts7960: "moduli cinesi", md20a: "Cytron", zsx11h: "moduli cinesi", odrive: "ODrive Robotics", moteus: "mjbots", b3a: "Delta Electronics", b3e: "Delta Electronics", pca9685: "Adafruit / cinesi" }[D.id] || "", p: D.price, mass: 0.2, spec: [["Per motori", D.for.join(", ")], ["Interfaccia", D.bus.join(" / ")], ["Tensione", typeof D.V[0] === "number" ? D.V[0] + "–" + D.V[1] + " V" : "230 V AC"], ["Corrente", D.Icont === "match" ? "abbinata al motore" : D.Icont + " A"]], tips: D.opto5 ? "Ingressi optoisolati a 5 V: con un PLC a 24 V servono resistenze in serie (2,2 kΩ) se il driver non accetta 24 V." : D.closesLoop ? "Chiude l'anello di posizione nel drive." : "", fit: "Asse per asse", act: { t: "driver", ref: D.id } }); });
  CAT.PSUS.forEach(function (P) { if (P.id === "none") return; add({ id: "psu_" + P.id, cat: "plc", role: "psu", icon: "psu", name: "Alimentatore " + P.name, brand: "Mean Well, cinesi", p: P.price, mass: 0.8, spec: [["Uscita", P.V + " V · " + P.A + " A"], ["Potenza", P.V * P.A + " W"]], tips: "Tieni almeno il 25% di riserva; fusibile subito dopo.", fit: "Motori DC/stepper", act: { t: "psu", ref: P.id } }); });
  CAT.SERVO_PSUS.forEach(function (P) { if (P.id === "none" || P.id === "usb5") return; add({ id: "spsu_" + P.id, cat: "plc", role: "servopsu", icon: "psu", name: "Alimentatore servo " + P.name, brand: "cinesi, Mean Well", p: P.price, mass: 0.4, spec: [["Uscita", P.V + " V · " + P.A + " A"]], tips: "Massa in comune con il microcontrollore; condensatore da 1000–2200 µF vicino ai servo.", fit: "Missione 1", act: { t: "servoPsu", ref: P.id } }); });
  CAT.ESTOPS.forEach(function (S) { if (S.id === "none") return; add({ id: "es_" + S.id, cat: "plc", role: "estop", icon: "estop", name: S.name, brand: S.level >= 3 ? "classe Pilz PNOZ, Siemens 3SK1, Schneider" : "classe Schneider, Eaton, Siemens", p: S.price, mass: 0.3, spec: [["Livello", ["—", "solo software", "hardware (contattore)", "categoria 3 / PL d"][S.level]]], tips: "Il fungo rosso deve togliere energia ai motori in hardware, non solo avvisare il programma.", fit: ["", "Missione 1", "Missione 2–3", "Missione 4"][S.level], act: { t: "estop", ref: S.id } }); });
  var EL = [
    ["e_rpi5", "sbc", "mcu", "Raspberry Pi 5 8 GB", "Raspberry Pi", 90, "Per visione (OpenCV), interfaccia web e pianificazione: parla con l'MCU via seriale o CAN."],
    ["e_relay4", "relay", "relay", "Modulo 4 relè 5 V optoisolato", "moduli cinesi (Songle)", 6, "Accende bobine a 24 V (elettrovalvole, freni) da un pin dell'MCU."],
    ["e_mosfet", "mosfet", "relay", "Modulo MOSFET 4 canali 24 V con diodi di ricircolo", "moduli cinesi (AOD4184, IRLZ44N)", 8, "Come i relè ma silenzioso e veloce; il diodo protegge dalle sovratensioni delle bobine."],
    ["e_opto8", "opto", "relay", "Modulo optoisolatore 8 canali PC817 (24 V → 3,3/5 V)", "moduli cinesi", 7, "Per leggere sensori a 24 V con Arduino/ESP32 senza bruciarli."],
    ["e_lvl", "levelshift", "chip", "Traslatore di livello 74HCT245 / line driver 26LS31", "Texas Instruments, Nexperia", 5, "Porta i segnali 3,3 V a 5 V per i driver optoisolati.", { act: { t: "levelShift" } }],
    ["e_can", "cantx", "chip", "Transceiver CAN SN65HVD230 + terminazioni 120 Ω", "Texas Instruments (moduli)", 5, "Serve tra MCU e bus CAN."],
    ["e_rs422", "rs422", "chip", "Transceiver RS-422 (per encoder BiSS-C)", "Texas Instruments, Analog Devices", 8, "Segnali differenziali robusti per gli encoder assoluti."],
    ["e_ifrelay", "relay24", "relay", "Relè d'interfaccia DIN 24 V (×4)", "classe Finder 38.51, Phoenix PLC-RSC", 45, "Separa le uscite del PLC dai carichi."],
    ["e_contactor", "contactor", "relay", "Contattore 3P 9 A bobina 24 V DC", "classe Schneider LC1D09BD, Siemens 3RT2015", 45, "Taglia la potenza dei motori sull'emergenza."],
    ["e_safety", "safety", "relay", "Relè di sicurezza 2 canali", "classe Pilz PNOZ X2.8P, Siemens 3SK1", 180, "Controlla il fungo in doppio canale e comanda contattori o STO."],
    ["e_mcb", "breaker", "breaker", "Interruttore magnetotermico C16 1P+N", "classe ABB, Schneider, Hager", 25, "Protegge la linea dei drive."],
    ["e_rcd", "rcd", "breaker", "Differenziale 30 mA 2P (tipo A)", "classe ABB, Schneider, Hager", 45, "Protezione delle persone; per i drive con filtro EMC usa il tipo A o F."],
    ["e_main", "mainswitch", "breaker", "Sezionatore generale lucchettabile", "classe Schneider Vario, ABB", 40, "Per lavorare sul quadro in sicurezza (lucchetto)."],
    ["e_terms", "terminal", "terminal", "Morsetti a molla 2,5 mm² (×50)", "classe Wago TOPJOB S, Phoenix PT", 45, "Puliti e veloci; i cavi flessibili con puntalino."],
    ["e_fuseh", "fuseholder", "terminal", "Portafusibili DIN + fusibili 10×38", "classe Schneider, Bussmann", 12, "Fusibili per i circuiti 24 V e 48 V."],
    ["e_hdr60", "psu24", "psu", "Alimentatore DIN 24 V 60 W", "classe Mean Well HDR-60-24", 25, "Per PLC, sensori e valvole.", { W: 60 }],
    ["e_sdr240", "psu24", "psu", "Alimentatore DIN 24 V 240 W", "classe Mean Well SDR-240-24", 75, "Per freni, valvole e logica di un robot medio.", { W: 240 }],
    ["e_emc", "emc", "chip", "Filtro EMC di rete 10 A", "classe Schaffner, TDK-Epcos", 30, "Riduce i disturbi dei drive verso la rete."],
    ["e_tower", "tower", "tower", "Torretta luminosa 3 colori 24 V", "classe Werma, Patlite", 35, "Verde = lavoro, giallo = attesa, rosso = allarme (3 uscite)."],
    ["e_buttons", "buttons", "estop", "Pulsantiera marcia / arresto / reset 22 mm", "classe Schneider XB5, Eaton M22", 30, "Tre ingressi; il reset dopo l'emergenza è obbligatorio."],
    ["e_vfd", "vfd", "driver", "Inverter (VFD) 4 kW per elettromandrino", "classe Delta MS300, Huanyang, Fuling", 300, "L'elettromandrino non si collega alla rete: l'inverter gli dà la frequenza giusta (400 Hz = 24 000 giri/min)."],
    ["e_pump", "pump", "pump", "Pompa acqua + radiatore per mandrino", "cinesi (CW-3000 & simili)", 45, "Senza raffreddamento un mandrino ad acqua si brucia in pochi minuti."],
    ["e_cabinet", "cabinet", "cabinet", "Quadro elettrico 600×400×200 con guida DIN e canaline", "classe Rittal, Schneider, Fibox", 120, "Tutta l'elettronica di potenza chiusa a chiave."],
    ["e_hmi", "hmi", "plc", "Pannello operatore HMI 7\"", "classe Siemens KTP700, Weintek, Delta DOP", 450, "Interfaccia touch per avvio, ricette e allarmi."],
    ["e_canmod", "canmod", "plc", "Modulo CANopen per PLC (master)", "classe HMS Anybus, Ixxat, CM CANopen", 350, "Per collegare drive CAN a un PLC che non ha il CAN."]
  ];
  EL.forEach(function (x) { var o = add({ id: x[0], cat: "plc", role: x[1], icon: x[2], name: x[3], brand: x[4], p: x[5], mass: 0.2, tips: x[6], fit: "Quadro elettrico", act: { t: "shop" } }); if (x[7]) for (var k in x[7]) o[k] = x[7][k]; if (o.W) o.spec = [["Uscita", "24 V · " + f(o.W / 24, 1) + " A (" + o.W + " W)"]]; if (o.role === "tower") o.dq = 3; if (o.role === "buttons") o.di = 3; if (o.role === "vfd") o.dq = 2; });
  var MODS = [
    ["sm1221", ["s7-1200"], 16, 0, 0, "Modulo Siemens SM 1221 16 DI", 220], ["sm1222", ["s7-1200"], 0, 16, 0, "Modulo Siemens SM 1222 16 DQ", 230], ["sm1223", ["s7-1200"], 8, 8, 0, "Modulo Siemens SM 1223 8 DI / 8 DQ", 230], ["sm1231", ["s7-1200"], 0, 0, 4, "Modulo Siemens SM 1231 4 AI", 300],
    ["et200sp", ["s7-1500", "s7-1200"], 16, 16, 0, "Stazione Siemens ET 200SP (PROFINET) 16 DI / 16 DQ", 650],
    ["iq4ob4", ["micro800"], 4, 4, 0, "Plug-in Allen-Bradley 2080-IQ4OB4 (4 DI / 4 DO)", 70], ["iq16", ["micro800"], 16, 0, 0, "Espansione Allen-Bradley 2085-IQ16 (16 DI)", 200],
    ["nxid", ["nx"], 16, 0, 0, "Modulo Omron NX-ID5342 (16 DI)", 160], ["nxod", ["nx"], 0, 16, 0, "Modulo Omron NX-OD5256 (16 DO)", 170],
    ["cp1w20", ["cp"], 12, 8, 0, "Espansione Omron CP1W-20EDT (12 DI / 8 DO)", 180], ["dvp16sp", ["dvp"], 8, 8, 0, "Espansione Delta DVP16SP11T (8 DI / 8 DO)", 90],
    ["optad1608", ["opta"], 16, 8, 0, "Espansione Arduino Opta D1608S (16 in / 8 relè)", 150],
    ["ek1100", ["ethercat", "nx"], 0, 0, 0, "Accoppiatore EtherCAT Beckhoff EK1100", 120, true], ["el1008", ["ethercat", "nx"], 8, 0, 0, "Morsetto EtherCAT Beckhoff EL1008 (8 DI)", 40], ["el2008", ["ethercat", "nx"], 0, 8, 0, "Morsetto EtherCAT Beckhoff EL2008 (8 DO)", 45], ["el3064", ["ethercat", "nx"], 0, 0, 4, "Morsetto EtherCAT Beckhoff EL3064 (4 AI)", 160], ["el5101", ["ethercat", "nx"], 0, 0, 0, "Morsetto EtherCAT Beckhoff EL5101 (encoder incrementale)", 140]
  ];
  MODS.forEach(function (x) { var o = add({ id: x[0], cat: "plc", role: "module", icon: "module", fam: x[1], di: x[2], dq: x[3], ai: x[4], name: x[5], brand: x[5].split(" ")[1], p: x[6], mass: 0.2, coupler: !!x[7], spec: [["Compatibile con", x[1].join(", ")], ["I/O", x[7] ? "accoppiatore (nessun I/O)" : x[2] + " DI / " + x[3] + " DQ / " + x[4] + " AI"]], tips: x[1][0] === "ethercat" ? "I morsetti EL vanno agganciati a un accoppiatore EK1100, oppure direttamente su un Beckhoff CX (E-bus)." : "Si aggancia a destra della CPU della stessa famiglia.", fit: "Espansione I/O PLC", act: { t: "shop" } }); if (x[0] === "el5101") o.hsc = 1; });

  /* ---------------- PNEUMATICA ---------------- */
  var PN = [
    ["p_comp24", "comp", "compressor", "Compressore silenziato 24 l, 8 bar, resa ≈ 50 l/min", "classe Stanley, Fini, Einhell", 230, "Per pinze piccole e laboratorio.", { pmax: 8, fad: 50 }],
    ["p_comp50", "comp", "compressor", "Compressore 50 l, 10 bar, resa ≈ 160 l/min", "classe Fini, Abac, Nuair", 320, "La scelta tipica per una cella con una pinza grande.", { pmax: 10, fad: 160 }],
    ["p_comp100", "comp", "compressor", "Compressore 100 l, 10 bar, resa ≈ 330 l/min (trifase)", "classe Fini, Abac", 650, "Per più utilizzatori o ventose grandi.", { pmax: 10, fad: 330 }],
    ["p_frl", "frl", "frl", "Gruppo FRL 1/4\" (filtro 5 µm, regolatore, manometro)", "classe SMC AC, Festo MS, Camozzi", 45, "Le pinze vogliono aria filtrata (SCHUNK: ISO 8573-1 [7:4:4]) e pressione regolata."],
    ["p_v52m", "valve", "valve", "Elettrovalvola 5/2 monostabile 24 V DC G1/8", "classe SMC SY, Festo VUVG, Camozzi", 45, "Senza corrente torna nella posizione di riposo (molla).", { vt: "52m", coils: 1 }],
    ["p_v52b", "valve", "valve", "Elettrovalvola 5/2 bistabile 24 V DC G1/8", "classe SMC SY, Festo VUVG", 60, "Resta nell'ultima posizione anche senza corrente: la pinza non si apre al blackout.", { vt: "52b", coils: 2 }],
    ["p_v53", "valve", "valve", "Elettrovalvola 5/3 centri chiusi 24 V DC G1/8", "classe SMC SY, Festo VUVG", 75, "Al centro blocca l'aria nella pinza.", { vt: "53", coils: 2 }],
    ["p_v32", "valve", "valve", "Elettrovalvola 3/2 per vuoto/soffio 24 V DC", "classe SMC VQ, Festo", 35, "Comanda l'eiettore delle ventose.", { vt: "32", coils: 1 }],
    ["p_check", "checkvalve", "valve", "Valvola di ritegno pilotata (×2)", "classe SMC ASP, Festo HGL", 40, "Tiene l'aria chiusa nella pinza se cala la pressione: il pezzo non cade."],
    ["p_vpump", "vpump", "compressor", "Pompa del vuoto elettrica 24 V a membrana (≈ 15 l/min, −0,6 bar)", "classe Schmalz, Thomas, cinesi", 120, "Ventose senza aria compressa."],
    ["p_fit", "fitting", "fitting", "Raccordi istantanei (set misti 4–8 mm)", "classe SMC KQ2, Festo QS", 25, "Taglia il tubo dritto e spingilo fino in fondo."],
    ["p_sil", "silencer", "fitting", "Silenziatori G1/8 (×4)", "classe SMC AN, Festo U", 8, "Sugli scarichi delle valvole."],
    ["p_flow", "flowctl", "fitting", "Regolatori di flusso unidirezionali (×2)", "classe SMC AS, Festo GRLA", 18, "Regolano la velocità di chiusura della pinza (urti più dolci)."],
    ["p_manif", "manifold", "valve", "Base multipla per 4 valvole", "classe SMC SS5Y, Festo VABM", 90, "Ordina le valvole e ne riduce i tubi."]
  ];
  PN.forEach(function (x) { var o = add({ id: x[0], cat: "pneumatica", role: x[1], icon: x[2], name: x[3], brand: x[4], p: x[5], mass: 0.3, tips: x[6], fit: "Pinze pneumatiche e ventose", act: { t: "shop" } }); if (x[7]) for (var k in x[7]) o[k] = x[7][k];
    if (o.fad) o.spec = [["Pressione max", o.pmax + " bar"], ["Aria resa", "≈ " + o.fad + " l/min"]]; if (o.vt) o.spec = [["Tipo", { "52m": "5/2 monostabile", "52b": "5/2 bistabile", "53": "5/3 centri chiusi", "32": "3/2" }[o.vt]], ["Bobine", o.coils + " × 24 V DC ≈ 1–2 W"]]; });

  var BY = {}; ITEMS.forEach(function (x) { BY[x.id] = x; });
  function byId(id) { return BY[id] || null; }
  function byRef(t, ref) { for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].act && ITEMS[i].act.t === t && ITEMS[i].act.ref === ref) return ITEMS[i]; return null; }
  /* ---------------- specifiche tipiche e masse reali degli articoli "semplici" ---------------- */
  var EXTRA = {
    iso4032_m8: [0.005, [["Chiave", "13 mm"], ["Altezza", "6,8 mm"], ["Classe", "8 (per viti 8.8)"], ["Materiale", "acciaio zincato"]]],
    iso7089_m8: [0.003, [["Diametri", "8,4 × 16 mm"], ["Spessore", "1,6 mm"], ["Durezza", "200 HV"]]],
    dowel_6: [0.004, [["Tolleranza", "m6 (foro alesato H7)"], ["Durezza", "≈ 60 HRC"], ["Lunghezza tipica", "20 mm"], ["Taglio a rottura", "≈ 40 kN (doppio)"]]],
    dowel_8: [0.008, [["Tolleranza", "m6 (foro alesato H7)"], ["Durezza", "≈ 60 HRC"], ["Lunghezza tipica", "24 mm"], ["Taglio a rottura", "≈ 70 kN (doppio)"]]],
    helicoil: [0.9, [["Misure", "M5, M6, M8, M10, M12"], ["Materiale inserto", "inox 1.4301"], ["Contenuto", "inserti + punte + maschi STI + utensile"], ["Profondità tipica", "1,5 × d"]]],
    heatset_m3: [0.12, [["Filetto", "M3"], ["Lunghezza", "5,7 mm"], ["Foro nel pezzo", "Ø4,0–4,2 mm"], ["Temperatura posa", "≈ 220–250 °C (PLA)"]]],
    tnut_m6: [0.25, [["Cava", "8 (profilati 40×40 B-type)"], ["Filetto", "M6"], ["Tenuta a strappo", "≈ 2,5 kN cad."]]],
    nordlock_m8: [0.04, [["Sistema", "coppia di rondelle a cuneo"], ["Materiale", "acciaio Delta Protekt"], ["Uso", "vibrazioni e carichi dinamici"]]],
    loctite243: [0.02, [["Resistenza", "media (smontabile)"], ["Coppia di distacco", "≈ 20 N·m su M10"], ["Fissaggio", "10 min · completo 24 h"], ["Temperatura", "−55…+180 °C"]]],
    iso4026_m5: [0.04, [["Chiave a brugola", "2,5 mm"], ["Classe", "45H"], ["Coppia di serraggio", "≈ 2 N·m"]]],
    iso7380_m5: [0.15, [["Chiave a brugola", "3 mm"], ["Classe", "10.9 (zincata) o A2 inox"], ["Coppia tipica", "≈ 4 N·m (sotto le ISO 4762)"]]],
    anchor_m12: [1.2, [["Barra", "M12 classe 5.8 / 8.8"], ["Foro nel calcestruzzo", "Ø14 × 110 mm"], ["Carico a trazione tipico", "≈ 20 kN (C20/25, non fessurato)"], ["Indurimento", "≈ 45 min a 20 °C"]]],
    wrap10: [0.25, [["Diametro fascio", "8–40 mm"], ["Materiale", "PE"], ["Temperatura", "−40…+85 °C"]]],
    wrap16: [0.35, [["Diametro fascio", "15–100 mm"], ["Materiale", "PE"], ["Temperatura", "−40…+85 °C"]]],
    sleeve10: [0.12, [["Campo", "6–16 mm"], ["Materiale", "PET intrecciato"], ["Temperatura", "−50…+150 °C"]]],
    sleeve20: [0.2, [["Campo", "15–30 mm"], ["Materiale", "PET intrecciato"], ["Temperatura", "−50…+150 °C"]]],
    corr17: [0.6, [["Diametro interno", "≈ 17 mm"], ["Materiale", "PA6, V2"], ["Grado di protezione con raccordi", "IP66"]]],
    gland_m20: [0.15, [["Filetto", "M20 × 1,5"], ["Diametro cavo", "6–12 mm"], ["Grado di protezione", "IP68"], ["Chiave", "24 mm"]]],
    ties: [0.3, [["Misure", "2,5 × 100 / 3,6 × 200 / 4,8 × 300 mm"], ["Materiale", "PA66"], ["Carico", "8–22 kg"]]],
    slipring: [0.09, [["Fili", "12"], ["Corrente", "2 A per filo"], ["Tensione", "≤ 240 V"], ["Velocità", "≤ 300 giri/min"], ["Diametro", "22 mm"]]],
    t_screw: [0.6, [["Contenuto", "taglio 3–6,5 · PH1–PH2 · PZ1–PZ2"], ["Lama", "acciaio CrMoV"]]],
    t_prec: [0.15, [["Contenuto", "taglio 1,5–3 · PH00–PH1 · Torx T5–T10"]]],
    t_vde: [0.7, [["Isolamento", "1000 V AC (IEC 60900)"], ["Contenuto", "taglio · PH · PZ · PlusMinus"]]],
    t_torx: [0.25, [["Misure", "T10 · T15 · T20 · T25 · T27 · T30 · T40 · T45 · T50"]]],
    t_bits: [1.1, [["Inserti", "brugola 4 · 5 · 6 · 8 · 10 · 12 · 14 mm"], ["Attacchi", "1/4\" · 3/8\" · 1/2\""], ["Uso", "con la chiave dinamometrica"]]],
    t_cal: [0.17, [["Campo", "0–150 mm"], ["Risoluzione", "0,01 mm"], ["Errore tipico", "±0,02 mm"]]],
    t_mic: [0.25, [["Campo", "0–25 mm"], ["Risoluzione", "0,001 mm"], ["Errore tipico", "±2 µm"]]],
    t_dial: [1.6, [["Corsa", "10 mm"], ["Risoluzione", "0,01 mm"], ["Base magnetica", "≈ 600 N"]]],
    t_lvl: [1.4, [["Sensibilità", "0,02 mm/m"], ["Lunghezza", "200 mm"]]],
    t_drillp: [28, [["Capacità in acciaio", "16 mm"], ["Potenza", "≈ 500–750 W"], ["Velocità", "≈ 300–2500 giri/min"], ["Corsa mandrino", "≈ 60–80 mm"]]],
    t_drill: [1.7, [["Tensione", "18 V Li-ion"], ["Coppia", "≈ 50–60 N·m"], ["Mandrino", "13 mm"]]],
    t_tap: [1.2, [["Maschi", "M3 · M4 · M5 · M6 · M8 · M10 · M12"], ["Tipo", "HSS-E a macchina/a mano"], ["Fori di preparazione", "2,5 · 3,3 · 4,2 · 5 · 6,8 · 8,5 · 10,2 mm"]]],
    t_bitsHSS: [0.6, [["Misure", "1–13 mm × 0,5"], ["Materiale", "HSS-Co 5%"], ["Angolo", "135°"]]],
    t_saw: [9, [["Disco", "Ø255 mm per alluminio (80 denti)"], ["Taglio a 90°", "≈ 70 × 120 mm"], ["Potenza", "≈ 1800 W"]]],
    t_deburr: [0.4, [["Contenuto", "sbavatore a lama rotante + lime piatta/tonda/mezzatonda"]]],
    t_vise: [8, [["Apertura ganasce", "125 mm"], ["Corpo", "ghisa / acciaio forgiato"]]],
    t_multi: [0.55, [["Categoria", "CAT III 600 V"], ["Misure", "V AC/DC · A · Ω · continuità · diodi"], ["Vero valore efficace", "sì (True RMS)"]]],
    t_scope: [3, [["Banda", "100 MHz"], ["Campionamento", "1 GS/s"], ["Canali", "2"], ["Memoria", "≈ 14–24 Mpt"]]],
    t_solder: [1.3, [["Potenza", "≈ 65–70 W"], ["Temperatura", "200–480 °C"], ["Punta", "a scalpello 1,6–2,4 mm"]]],
    t_crimp: [0.5, [["Campo", "0,25–6 mm² (AWG 23–10)"], ["Profilo", "quadrato autoregolante"], ["Uso", "puntalini DIN 46228"]]],
    t_crimpd: [0.3, [["Contatti", "Dupont 2,54 · JST-XH · JST-PH"], ["Campo", "AWG 28–20"]]],
    t_strip: [0.2, [["Campo", "0,2–6 mm²"], ["Lunghezza spelatura", "fino a 18 mm"]]],
    t_heat: [0.7, [["Temperatura", "50–600 °C"], ["Potenza", "≈ 2000 W"], ["Guaine", "rapporto 2:1, Ø1,5–12 mm"]]],
    t_benchpsu: [2.2, [["Uscita", "0–30 V · 0–5 A"], ["Limite di corrente", "regolabile"], ["Ripple", "≤ 1 mV eff."]]],
    t_hoist: [45, [["Portata", "500 kg"], ["Braccio", "estensibile, 4 posizioni"], ["Uso", "con fasce, mai sotto il carico"]]],
    t_ppe: [1.2, [["Occhiali", "EN 166"], ["Guanti", "antitaglio EN 388 livello C"], ["Scarpe", "S3 (EN ISO 20345)"]]],
    e_rpi5: [0.05, [["CPU", "4 core Cortex-A76 a 2,4 GHz"], ["RAM", "8 GB"], ["I/O", "USB 3 · Gigabit · 2 × CSI camera · 40 GPIO 3,3 V"], ["Alimentazione", "5 V 5 A (USB-C)"]]],
    e_relay4: [0.06, [["Bobine", "5 V con optoisolatore"], ["Contatti", "10 A 250 V AC / 10 A 30 V DC"], ["Canali", "4"]]],
    e_mosfet: [0.03, [["Canali", "4 (logic level, ingresso 3,3–5 V)"], ["Carico", "24 V · fino a 5 A per canale"], ["Protezione", "diodo di ricircolo per bobine"]]],
    e_opto8: [0.02, [["Canali", "8 (PC817)"], ["Ingresso", "12–24 V"], ["Uscita", "3,3 / 5 V"], ["Frequenza max", "≈ 5 kHz"]]],
    e_lvl: [0.01, [["Integrati", "74HCT245 / AM26LS31"], ["Livelli", "3,3 V → 5 V (o differenziale RS-422)"], ["Frequenza", "> 1 MHz"]]],
    e_can: [0.01, [["Integrato", "SN65HVD230"], ["Velocità", "fino a 1 Mbit/s"], ["Alimentazione", "3,3 V"], ["Terminazioni", "120 Ω ai due capi del bus"]]],
    e_rs422: [0.01, [["Integrato", "MAX490 / THVD1450"], ["Velocità", "fino a 10 Mbit/s"], ["Uso", "linee BiSS-C, SSI, encoder differenziali"]]],
    e_ifrelay: [0.12, [["Bobina", "24 V DC con LED e diodo"], ["Contatto", "1 scambio 6 A 250 V"], ["Montaggio", "guida DIN, larghezza 6,2 mm"]]],
    e_contactor: [0.35, [["Corrente AC-3", "9 A (4 kW a 400 V)"], ["Bobina", "24 V DC"], ["Contatti ausiliari", "1 NA + 1 NC"]]],
    e_safety: [0.2, [["Canali", "2 (fungo NC + ripristino controllato)"], ["Livello", "fino a PL e / SIL 3"], ["Contatti di sicurezza", "3 NA"], ["Alimentazione", "24 V DC"]]],
    e_mcb: [0.12, [["Curva", "C, 16 A"], ["Poli", "1P+N"], ["Potere d'interruzione", "6 kA"]]],
    e_rcd: [0.2, [["Sensibilità", "30 mA"], ["Tipo", "A (anche correnti pulsanti dei drive)"], ["Corrente", "25 A"]]],
    e_main: [0.3, [["Corrente", "25 A"], ["Poli", "3"], ["Maniglia", "rossa/gialla lucchettabile"]]],
    e_terms: [0.3, [["Sezione", "0,2–2,5 mm²"], ["Tipo", "a molla push-in"], ["Corrente", "24 A"]]],
    e_fuseh: [0.15, [["Formato", "10 × 38 mm"], ["Fusibili", "gG 2–25 A"], ["Tensione", "690 V AC"]]],
    e_emc: [0.5, [["Corrente", "10 A"], ["Tensione", "250 V AC"], ["Uso", "a monte di drive e inverter"]]],
    e_tower: [0.4, [["Colori", "rosso / giallo / verde"], ["Tensione", "24 V DC"], ["Cicalino", "opzionale"]]],
    e_buttons: [0.4, [["Diametro", "22 mm"], ["Contatti", "marcia NA · arresto NC · reset NA"], ["Grado di protezione", "IP65"]]],
    e_vfd: [2.5, [["Potenza", "4 kW"], ["Frequenza in uscita", "0–400 Hz (fino a 24 000 giri/min)"], ["Alimentazione", "230 V monofase (fino a 2,2 kW) o 400 V trifase"], ["Comando", "0–10 V, Modbus RTU"]]],
    e_pump: [3, [["Portata", "≈ 10 l/min"], ["Alimentazione", "230 V o 24 V"], ["Radiatore", "con ventola, liquido con antialga"]]],
    e_cabinet: [15, [["Dimensioni", "600 × 400 × 200 mm"], ["Grado di protezione", "IP66"], ["Contenuto", "piastra, guide DIN, canaline, morsettiera di terra"]]],
    e_hmi: [0.9, [["Schermo", "7\" touch 800 × 480"], ["Comunicazione", "PROFINET / EtherNet/IP / Modbus TCP"], ["Alimentazione", "24 V DC"]]],
    e_canmod: [0.15, [["Protocollo", "CANopen master"], ["Velocità", "fino a 1 Mbit/s"], ["Nodi", "fino a 16"]]],
    p_frl: [0.6, [["Attacchi", "G1/4"], ["Filtro", "5 µm con scarico condensa"], ["Regolazione", "0,5–8,5 bar"]]],
    p_check: [0.1, [["Tipo", "ritegno pilotata a doppio effetto"], ["Attacchi", "G1/8"], ["Uso", "tiene la pinza chiusa se manca l'aria"]]],
    p_vpump: [1.8, [["Portata", "≈ 15 l/min"], ["Vuoto", "−0,6 bar"], ["Alimentazione", "24 V DC, ≈ 30 W"]]],
    p_fit: [0.2, [["Misure", "tubo 4 · 6 · 8 mm"], ["Filetti", "M5 · G1/8 · G1/4"], ["Pressione", "fino a 10 bar"]]],
    p_sil: [0.03, [["Filetto", "G1/8"], ["Materiale", "bronzo sinterizzato"], ["Riduzione rumore", "≈ 20 dB"]]],
    p_flow: [0.06, [["Tipo", "regolatore unidirezionale (sullo scarico)"], ["Attacco", "G1/8 per tubo 6 mm"]]],
    p_manif: [0.25, [["Posti", "4"], ["Alimentazione", "G1/4 comune"], ["Uscite", "G1/8 per valvola"]]]
  };
  var MASS = { drv_pca9685: 0.01, drv_a4988: 0.005, drv_drv8825: 0.005, drv_tmc2209: 0.006, drv_dm542: 0.28, drv_dm860: 0.55, drv_hbs57: 0.3, drv_bts7960: 0.07, drv_md20a: 0.05, drv_zsx11h: 0.06, drv_odrive: 0.05, drv_moteus: 0.015, drv_b3a: 0.95, drv_b3e: 1.0,
    psu_p12: 0.4, psu_p24a: 0.6, psu_p24b: 0.8, psu_p24c: 1.1, psu_p36: 0.85, psu_p48a: 1.0, psu_p48b: 1.7, sm1221: 0.22, sm1222: 0.22, sm1223: 0.24, sm1231: 0.18, et200sp: 0.6, iq4ob4: 0.03, iq16: 0.15, nxid: 0.08, nxod: 0.08, cp1w20: 0.3, dvp16sp: 0.12, optad1608: 0.2, ek1100: 0.11, el1008: 0.06, el2008: 0.06, el3064: 0.06, el5101: 0.06,
    p_comp24: 22, p_comp50: 38, p_comp100: 90, p_v52m: 0.18, p_v52b: 0.22, p_v53: 0.25, p_v32: 0.12, hose4: 0.35, hose6: 0.6, hose8: 0.9, cpl_bellow: 0.04, cpl_gs19: 0.12, cpl_gs24: 0.25, cpl_oldham: 0.05 };
  ITEMS.forEach(function (i) { if (MASS[i.id] != null) i.mass = MASS[i.id]; });
  ITEMS.forEach(function (i) { var x = EXTRA[i.id]; if (!x) return; i.mass = x[0]; if (!i.spec || !i.spec.length) i.spec = x[1]; });
  var api = { CATS: CATS, ITEMS: ITEMS, byId: byId, byRef: byRef };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PAN = api;
})(this);
