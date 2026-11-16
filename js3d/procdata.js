// Braccio Lab · Officina 3D – processi, parametri, valori iniziali e note di sicurezza
export const QUAL = {
  ultra: { dpr: 2.5, shadow: 4096, bloom: true, parts: 4000, sheet: 2048, hm: 180, aa: true },
  alta: { dpr: 2, shadow: 2048, bloom: true, parts: 2600, sheet: 1024, hm: 140, aa: true },
  media: { dpr: 1.35, shadow: 1024, bloom: true, parts: 1200, sheet: 512, hm: 96, aa: true },
  bassa: { dpr: 1, shadow: 0, bloom: false, parts: 450, sheet: 512, hm: 60, aa: false }
};
export const PROCS = [
  { id: "arm", n: "Braccio", t: "Muovi il braccio, prova le traiettorie e guarda le coppie" },
  { id: "laser", n: "Taglio laser", t: "Laser in fibra: potenza, gas, spessore e velocità" },
  { id: "mig", n: "Saldatura MIG/MAG", t: "Filo continuo: velocità filo, tensione, velocità di avanzamento" },
  { id: "tig", n: "Saldatura TIG", t: "Elettrodo di tungsteno: corrente, tensione, avanzamento" },
  { id: "mill", n: "Fresatura", t: "Mandrino: giri, avanzamento, profondità e forza di taglio" },
  { id: "drill", n: "Foratura", t: "Punta elicoidale: spinta e coppia" },
  { id: "pick", n: "Pick & place", t: "La pinza del progetto: forza di presa e tempo ciclo" },
  { id: "spray", n: "Verniciatura", t: "Pistola a spruzzo: film umido e secco" },
  { id: "plasma", n: "Taglio plasma", t: "Plasma ad aria su acciaio al carbonio" }
];
const sel = (k, n, opts) => ({ k, n, type: "sel", opts });
const rng = (k, n, u, min, max, step, d) => ({ k, n, u, min, max, step, d: d != null ? d : (step < 1 ? String(step).split(".")[1].length : 0) });
export const PARAMS = {
  arm: [rng("v", "Velocità della punta", "mm/s", 10, 1500, 10), rng("a", "Accelerazione", "m/s²", 0.2, 12, 0.1)],
  laser: [rng("P", "Potenza laser in fibra", "kW", 1, 6, 0.5), sel("mat", "Lamiera", [["acciaio", "Acciaio al carbonio"], ["inox", "Inox"], ["alluminio", "Alluminio"]]), sel("gas", "Gas di assistenza", [["O2", "Ossigeno O₂"], ["N2", "Azoto N₂"], ["aria", "Aria compressa"]]), rng("t", "Spessore", "mm", 0.5, 25, 0.5), rng("v", "Velocità di taglio", "m/min", 0.2, 40, 0.1)],
  mig: [sel("mat", "Materiale", [["s235", "Acciaio S235"], ["s355", "Acciaio S355"], ["inox", "Inox 304"], ["alluminio", "Alluminio 5754"]]), rng("t", "Spessore", "mm", 1, 20, 0.5), sel("wire", "Filo", [["0.8", "Ø 0,8 mm"], ["1", "Ø 1,0 mm"], ["1.2", "Ø 1,2 mm"]]), rng("wfs", "Velocità del filo", "m/min", 2, 16, 0.1), rng("U", "Tensione", "V", 14, 32, 0.1), rng("v", "Velocità di avanzamento", "mm/min", 100, 900, 10)],
  tig: [sel("mat", "Materiale", [["s235", "Acciaio S235"], ["inox", "Inox 304"], ["alluminio", "Alluminio 5754"]]), rng("t", "Spessore", "mm", 0.5, 8, 0.5), rng("I", "Corrente", "A", 20, 300, 1), rng("U", "Tensione d'arco", "V", 9, 18, 0.1), rng("v", "Velocità di avanzamento", "mm/min", 40, 400, 5), rng("wfs", "Filo d'apporto", "m/min", 0, 3, 0.1)],
  mill: [sel("mat", "Materiale", [["alluminio", "Alluminio 6082"], ["s235", "Acciaio S235"], ["c45", "Acciaio C45"], ["inox", "Inox 304"], ["ottone", "Ottone"], ["pom", "POM"]]), rng("D", "Diametro fresa", "mm", 2, 25, 1), rng("z", "Taglienti", "", 1, 4, 1), rng("n", "Giri mandrino", "giri/min", 2000, 24000, 500), rng("vf", "Avanzamento", "mm/min", 100, 6000, 50), rng("ap", "Profondità di passata ap", "mm", 0.1, 10, 0.1), rng("ae", "Larghezza di passata ae", "mm", 0.5, 25, 0.5)],
  drill: [sel("mat", "Materiale", [["alluminio", "Alluminio 6082"], ["s235", "Acciaio S235"], ["c45", "Acciaio C45"], ["inox", "Inox 304"], ["ottone", "Ottone"], ["pom", "POM"]]), rng("D", "Diametro punta", "mm", 2, 20, 0.5), rng("f", "Avanzamento", "mm/giro", 0.02, 0.4, 0.01), rng("n", "Giri", "giri/min", 200, 6000, 50), rng("depth", "Profondità", "mm", 2, 40, 1)],
  pick: [rng("m", "Massa del pezzo", "kg", 0.02, 30, 0.01), sel("mu", "Dita", [["0.1", "Lisce μ 0,1"], ["0.3", "Gomma μ 0,3"], ["0.5", "Sagomate μ 0,5"]]), rng("v", "Velocità della punta", "mm/s", 50, 2500, 10), rng("a", "Accelerazione", "m/s²", 0.5, 20, 0.1)],
  spray: [sel("gun", "Pistola", [["aria", "Convenzionale (TE 35%)"], ["hvlp", "HVLP (TE 65%)"], ["elettro", "Elettrostatica (TE 80%)"]]), rng("Q", "Portata vernice", "ml/min", 50, 600, 10), rng("v", "Velocità di passata", "mm/s", 100, 1000, 10), rng("dist", "Distanza", "mm", 100, 400, 5), rng("solids", "Residuo secco", "%", 20, 80, 1), rng("overlap", "Sovrapposizione", "%", 0, 80, 5), sel("col", "Colore", [["#d8262b", "Rosso RAL 3020"], ["#1d6fe0", "Blu RAL 5015"], ["#f5c542", "Giallo RAL 1003"], ["#e8e8e8", "Bianco RAL 9010"]])],
  plasma: [sel("I", "Corrente", [["45", "45 A"], ["65", "65 A"], ["105", "105 A"]]), rng("t", "Spessore acciaio", "mm", 1, 25, 0.5), rng("v", "Velocità di taglio", "m/min", 0.2, 8, 0.05)]
};
export const DEF = {
  arm: { v: 250, a: 2, path: "rect", size: 200 }, laser: { P: 3, mat: "acciaio", gas: "O2", t: 3, v: 3.8, path: "circle", size: 120 },
  mig: { mat: "s235", t: 5, wire: "1", wfs: 7.5, U: 24, v: 250, path: "line", size: 200 }, tig: { mat: "inox", t: 2, I: 110, U: 12, v: 120, wfs: 0.8, path: "line", size: 150 },
  mill: { mat: "alluminio", D: 10, z: 3, n: 18000, vf: 1500, ap: 1.5, ae: 5, path: "zigzag", size: 120 }, drill: { mat: "alluminio", D: 8, f: 0.12, n: 2500, depth: 12, path: "circle", size: 100 },
  pick: { m: 1, mu: "0.3", v: 600, a: 4, path: "line", size: 250 }, spray: { gun: "hvlp", Q: 250, v: 400, dist: 200, solids: 50, overlap: 50, col: "#d8262b", path: "zigzag", size: 250 },
  plasma: { I: "65", t: 6, v: 2.8, path: "rect", size: 150 }
};
export const SAFETY = {
  arm: ["Recinzione fissa EN ISO 14120 alta almeno 1,4 m (qui 2 m) e porta con interblocco: se apri, il robot si ferma.", "In manuale (T1) la punta non supera 250 mm/s e serve il pulsante di consenso a tre posizioni."],
  laser: ["Laser in fibra di classe 4 (1,07 µm): invisibile, il riflesso brucia la retina. Cella chiusa con oblò certificati EN 60825-4 ed EN 207, niente occhiali “da sole”.", "Aspirazione dei fumi (ossidi, zinco sulle zincate) e mai tagliare con la porta aperta."],
  mig: ["UV fortissimi: maschera automatica DIN 10–13 e schermi EN ISO 25980 per chi passa.", "Fumi di saldatura cancerogeni (IARC gruppo 1): aspirazione alla torcia o a braccio. Guanti, giacca ignifuga, niente solventi vicino."],
  tig: ["Arco ricco di UV anche se silenzioso: maschera DIN 9–12.", "Tungsteno senza torio (WL15/WC20) e aspirazione dei fumi, soprattutto sull'inox (cromo esavalente)."],
  mill: ["Trucioli caldi e taglienti: carter chiuso, occhiali e mai togliere i trucioli con le mani.", "Un robot è molto meno rigido di una fresatrice: vibrazioni (chatter) e forze alte spostano la punta."],
  drill: ["Prima di forare blocca il pezzo: la coppia della punta lo fa girare.", "Occhiali, niente guanti vicino agli utensili in rotazione."],
  pick: ["Barriera fotoelettrica o scanner per caricare i pezzi: distanza di sicurezza EN ISO 13855.", "Se manca l'aria o la corrente la pinza deve tenere: molla, valvola bistabile o ritegno."],
  spray: ["Zona ATEX: motori e luci antideflagranti, robot in esecuzione Ex o con pressurizzazione.", "Ventilazione forzata e maschera con filtri A2P3."],
  plasma: ["UV, rumore oltre 100 dB(A) e fumi: maschera DIN 9–12, cuffie e aspirazione o banco ad acqua.", "Alta tensione in torcia: spegni il generatore prima di cambiare i consumabili."]
};
