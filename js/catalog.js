/* XENTRIQ INDUSTRY · Braccio Lab — catalogo componenti.
   Tutti i dati sono VALORI TIPICI da cataloghi/annunci, arrotondati: servono a imparare
   e a fare una prima scelta. Prima di ordinare, controlla sempre la scheda del produttore. */
(function (root) {
  "use strict";
  var MATERIALS = [
    { id: "s235", name: "Acciaio S235 (ferro da carpenteria)", Re: 235, E: 210, G: 81, rho: 7850, eur: 1.6, mach: 45, note: "Economico, saldabile, facile da trovare. Pesante." },
    { id: "s355", name: "Acciaio S355", Re: 355, E: 210, G: 81, rho: 7850, eur: 1.9, mach: 45, note: "Come S235 ma più resistente, stesso peso e stessa rigidezza." },
    { id: "c45", name: "Acciaio C45 bonificato", Re: 490, E: 210, G: 81, rho: 7850, eur: 2.6, mach: 55, note: "Acciaio da alberi e perni. Lavorabile al tornio." },
    { id: "42crmo4", name: "Acciaio 42CrMo4 bonificato", Re: 650, E: 210, G: 80, rho: 7850, eur: 3.8, mach: 65, note: "Alberi molto caricati (come nei tuoi calcoli J2: Re 650 MPa, G 80 GPa)." },
    { id: "al6061", name: "Alluminio 6061-T6", Re: 240, E: 69, G: 26, rho: 2700, eur: 7, mach: 40, note: "Leggero e lavorabile. Rigidezza 1/3 dell'acciaio." },
    { id: "al7075", name: "Alluminio 7075-T6 (Ergal)", Re: 460, E: 72, G: 27, rho: 2810, eur: 13, mach: 45, note: "Resistente quasi come l'acciaio, ma stessa rigidezza bassa del 6061." },
    { id: "al6063", name: "Alluminio 6063-T6 (profilati estrusi a cava)", Re: 195, E: 69, G: 26, rho: 2700, eur: 9, mach: 15, note: "La lega dei profilati a cava (item, Bosch Rexroth, Misumi): si taglia e si monta con viti a T, niente saldature." },
    { id: "al6082", name: "Alluminio 6082-T6 (piastre e barre)", Re: 250, E: 69, G: 26, rho: 2700, eur: 8, mach: 40, note: "La lega da piastre e flange più comune in Europa: buona lavorabilità, saldabile (perde resistenza vicino alla saldatura)." },
    { id: "cf", name: "Tubo in fibra di carbonio", Re: 400, E: 70, G: 5, rho: 1600, eur: 70, mach: 70, brittle: true, note: "Leggerissimo. Fragile: rompe senza snervare, e gli incollaggi sono il punto debole." },
    { id: "pla", name: "PLA/PETG stampato 3D (100% riempimento)", Re: 35, E: 3.5, G: 1.3, rho: 1240, eur: 25, mach: 0, plastic: true, note: "Per prototipi e braccia da scrivania. Cede nel tempo (creep) e col caldo." }
  ];
  var SECTIONS = [
    { id: "round", name: "Tondo pieno", dims: ["D"] },
    { id: "tube", name: "Tubo tondo", dims: ["D", "t"] },
    { id: "rect", name: "Piatto/barra rettangolare piena", dims: ["B", "H"] },
    { id: "rtube", name: "Tubo rettangolare/quadro", dims: ["B", "H", "t"] }
  ];
  // type: servo_hobby | stepper | stepper_cl | dc | bldc | ac
  var MOTORS = [
    { id: "sg90", type: "servo_hobby", name: "Micro servo SG90 (1,8 kg·cm)", Tstall: 0.18, degps: 600, Istall: 0.7, V: [4.8, 6], mass: 0.009, price: 3, frame: 23 },
    { id: "mg996r", type: "servo_hobby", name: "Servo MG996R (11 kg·cm a 6 V)", Tstall: 1.08, degps: 353, Istall: 2.5, V: [4.8, 7.2], mass: 0.055, price: 6, frame: 40 },
    { id: "ds3218", type: "servo_hobby", name: "Servo DS3218 (21 kg·cm a 6,8 V)", Tstall: 2.06, degps: 375, Istall: 3.0, V: [5, 6.8], mass: 0.06, price: 14, frame: 40 },
    { id: "ds5160", type: "servo_hobby", name: "Servo DS5160 (60 kg·cm a 8,4 V)", Tstall: 5.9, degps: 333, Istall: 6.0, V: [6, 8.4], mass: 0.16, price: 38, frame: 65 },
    { id: "n17a", type: "stepper", name: "Stepper NEMA17 17HS4401 (0,40 N·m, 1,7 A)", Th: 0.40, nc: 300, nMax: 1500, I: 1.7, V: [12, 48], J: 5.4e-6, mass: 0.28, price: 9, frame: 42 },
    { id: "n17b", type: "stepper", name: "Stepper NEMA17 17HS19-2004 (0,59 N·m, 2 A)", Th: 0.59, nc: 250, nMax: 1500, I: 2.0, V: [12, 48], J: 8.2e-6, mass: 0.40, price: 12, frame: 42 },
    { id: "n23a", type: "stepper", name: "Stepper NEMA23 23HS22 (1,26 N·m, 2,8 A)", Th: 1.26, nc: 200, nMax: 1200, I: 2.8, V: [24, 60], J: 3.0e-5, mass: 0.70, price: 22, frame: 57 },
    { id: "n23b", type: "stepper", name: "Stepper NEMA23 23HS45 (3,0 N·m, 4,2 A)", Th: 3.0, nc: 150, nMax: 1000, I: 4.2, V: [24, 60], J: 6.8e-5, mass: 1.40, price: 35, frame: 57 },
    { id: "n23cl", type: "stepper_cl", name: "Stepper NEMA23 closed-loop (2,0 N·m + encoder 1000 PPR)", Th: 2.0, nc: 300, nMax: 1500, I: 5.0, V: [24, 50], J: 4.8e-5, mass: 1.10, price: 55, frame: 57 },
    { id: "n34a", type: "stepper", name: "Stepper NEMA34 86HS85 (8,5 N·m, 6 A)", Th: 8.5, nc: 100, nMax: 800, I: 6.0, V: [36, 80], J: 2.7e-4, mass: 3.8, price: 70, frame: 86 },
    { id: "n34b", type: "stepper", name: "Stepper NEMA34 86HS120 (12 N·m, 6 A)", Th: 12, nc: 80, nMax: 700, I: 6.0, V: [48, 80], J: 4.0e-4, mass: 5.4, price: 95, frame: 86 },
    { id: "dc775", type: "dc", name: "DC a spazzole 775 (12 V, 150 W)", Tn: 0.10, Tpk: 0.6, nN: 8000, nMax: 10000, I: 3.5, Ipk: 12, V: [12, 18], J: 2.0e-5, mass: 0.35, price: 7, frame: 42 },
    { id: "my1016", type: "dc", name: "DC a spazzole MY1016 (24 V, 250 W)", Tn: 0.87, Tpk: 2.5, nN: 2750, nMax: 3300, I: 13.4, Ipk: 35, V: [24, 24], J: 1.5e-4, mass: 2.2, price: 30, frame: 80 },
    { id: "bl57", type: "bldc", name: "BLDC 57BLF03 (24 V, 100 W, con sensori Hall)", Tn: 0.32, Tpk: 0.95, nN: 3000, nMax: 4000, I: 6.0, Ipk: 18, V: [18, 36], J: 2.3e-5, mass: 0.75, price: 60, frame: 57 },
    { id: "bl86", type: "bldc", name: "BLDC 86BLF (48 V, 440 W, con sensori Hall)", Tn: 1.4, Tpk: 4.2, nN: 3000, nMax: 4000, I: 10.5, Ipk: 31, V: [36, 60], J: 2.4e-4, mass: 2.4, price: 150, frame: 86 },
    { id: "qdd8108", type: "bldc", name: "BLDC 8108 quasi-direct-drive (24–48 V)", Tn: 1.0, Tpk: 3.5, nN: 1500, nMax: 2400, I: 8, Ipk: 30, V: [12, 48], J: 1.2e-4, mass: 0.30, price: 80, frame: 90 },
    { id: "ac200", type: "ac", name: "Servo AC Delta ECM-B3 200 W (0,64 N·m)", Tn: 0.64, Tpk: 2.23, nN: 3000, nMax: 6000, I: 1.55, Ipk: 5.4, P: 200, J: 1.77e-5, mass: 0.85, price: 230, frame: 60 },
    { id: "ac400", type: "ac", name: "Servo AC Delta ECM-B3 400 W (1,27 N·m)", Tn: 1.27, Tpk: 4.46, nN: 3000, nMax: 6000, I: 2.6, Ipk: 9.1, P: 400, J: 2.77e-5, mass: 1.25, price: 270, frame: 60 },
    { id: "ac750", type: "ac", name: "Servo AC Delta ECM-B3 750 W (2,39 N·m)", Tn: 2.39, Tpk: 8.36, nN: 3000, nMax: 6000, I: 5.1, Ipk: 17.9, P: 750, J: 1.13e-4, mass: 2.5, price: 350, frame: 80 },
    { id: "ac1k", type: "ac", name: "Servo AC Delta ECM-B3 1 kW (4,77 N·m, 2000 rpm)", Tn: 4.77, Tpk: 14.3, nN: 2000, nMax: 3000, I: 5.6, Ipk: 17, P: 1000, J: 7.94e-4, mass: 5.6, price: 500, frame: 130 },
    { id: "ac2k", type: "ac", name: "Servo AC Delta ECM-B3 2 kW (9,55 N·m, 2000 rpm)", Tn: 9.55, Tpk: 28.65, nN: 2000, nMax: 3000, I: 11, Ipk: 33, P: 2000, J: 2.65e-3, mass: 9.6, price: 800, frame: 180 }
  ];
  // type: none | integrated | planetary | harmonic | cyclo | belt | worm
  // K in N·m/arcmin (lineare) oppure hd = curva tri-lineare Harmonic Drive (N·m/rad)
  var REDUCERS = [
    { id: "none", type: "none", name: "Nessuno (presa diretta)", ratios: [1], Tr: Infinity, Tacc: Infinity, Tmom: Infinity, K: Infinity, LM: 0, mass: 0, price: 0, nInMax: Infinity },
    { id: "ple40", type: "planetary", name: "Planetario economico 42 mm (per NEMA17)", ratios: [5, 10, 20, 50], Tr: 8, Tacc: 16, Tmom: 24, K: 1.0, LM: 15, mass: 0.40, price: 35, nInMax: 6000, Fr: 200, frames: [42, 42] },
    { id: "ple60", type: "planetary", name: "Planetario economico 60 mm (per NEMA23/servo 60)", ratios: [5, 10, 20, 50, 100], Tr: 25, Tacc: 50, Tmom: 75, K: 2.5, LM: 12, mass: 1.1, price: 70, nInMax: 5000, Fr: 500, frames: [57, 60] },
    { id: "ple80", type: "planetary", name: "Planetario economico 80 mm (per NEMA34/servo 80)", ratios: [5, 10, 20, 50, 100], Tr: 60, Tacc: 120, Tmom: 180, K: 6, LM: 10, mass: 2.4, price: 120, nInMax: 4500, Fr: 1200, frames: [80, 90] },
    { id: "pp120", type: "planetary", name: "Planetario di precisione 120 mm (gioco 3′)", ratios: [5, 10, 20, 50, 100], Tr: 200, Tacc: 400, Tmom: 600, K: 20, LM: 3, mass: 7.0, price: 380, nInMax: 4000, Fr: 3200, frames: [110, 130] },
    { id: "csf14", type: "harmonic", name: "Armonico Harmonic Drive CSF-14 (gear unit)", ratios: [50, 80, 100], Tr: 7.8, Tacc: 28, Tmom: 54, hd: [2.0, 6.9, 0.47e4, 0.61e4, 0.71e4], LM: 1, mass: 0.5, price: 450, nInMax: 8500, Mc: 41, frames: [23, 57] },
    { id: "lhsg20", type: "harmonic", name: "Armonico cinese LHSG-20 (clone CSG-20)", ratios: [50, 80, 100, 120], Tr: 34, Tacc: 70, Tmom: 127, hd: [7, 25, 1.3e4, 1.8e4, 2.3e4], LM: 1.5, mass: 1.0, price: 200, nInMax: 7300, Mc: 187, frames: [42, 60] },
    { id: "csf20", type: "harmonic", name: "Armonico Harmonic Drive CSF-20 (gear unit)", ratios: [50, 80, 100, 120, 160], Tr: 40, Tacc: 82, Tmom: 147, hd: [7, 25, 1.3e4, 1.8e4, 2.3e4], LM: 1, mass: 1.0, price: 700, nInMax: 7300, Mc: 187, frames: [42, 60] },
    { id: "csf32", type: "harmonic", name: "Armonico Harmonic Drive CSF-32 (gear unit)", ratios: [50, 80, 100, 120, 160], Tr: 137, Tacc: 333, Tmom: 647, hd: [29, 108, 5.4e4, 7.8e4, 9.8e4], LM: 1, mass: 3.2, price: 1200, nInMax: 4800, Mc: 548, frames: [60, 90] },
    { id: "csg40", type: "harmonic", name: "Armonico Harmonic Drive CSG-40-160", ratios: [100, 120, 160], Tr: 382, Tacc: 841, Tmom: 1530, hd: [54, 196, 13e4, 20e4, 23e4], LM: 1, mass: 5.0, price: 3500, nInMax: 4000, Mc: 450, frames: [80, 130] },
    { id: "lhsg40", type: "harmonic", name: "Armonico cinese Leaderdrive LHSG-40-160", ratios: [100, 120, 160], Tr: 363, Tacc: 800, Tmom: 1458, hd: [54, 196, 13e4, 20e4, 23e4], LM: 1, mass: 5.0, price: 750, nInMax: 4000, Mc: 600, frames: [80, 130] },
    { id: "rv6e", type: "cyclo", name: "Cicloidale RV-6E (Nabtesco, taglia piccola)", ratios: [31, 43, 53.5, 59, 79, 103], Tr: 58, Tacc: 117, Tmom: 294, K: 20, LM: 1.5, mass: 2.5, price: 700, nInMax: 4000, Mc: 196, frames: [57, 90] },
    { id: "shpr20", type: "cyclo", name: "Cicloidale cinese SHPR-20E (Huandong/Shuanghuan)", ratios: [57, 81, 105, 121, 141, 161], Tr: 167, Tacc: 412, Tmom: 833, K: 49, LM: 1, mass: 4.7, price: 450, nInMax: 4000, Mc: 882, frames: [60, 130] },
    { id: "rv20e", type: "cyclo", name: "Cicloidale Nabtesco RV-20E", ratios: [57, 81, 105, 121, 141, 161], Tr: 167, Tacc: 412, Tmom: 833, K: 49, LM: 1, mass: 4.7, price: 950, nInMax: 4000, Mc: 882, frames: [60, 130] },
    { id: "shpr40", type: "cyclo", name: "Cicloidale cinese SHPR-40E-121 (Huandong/Shuanghuan)", ratios: [57, 81, 105, 121, 153], Tr: 412, Tacc: 1029, Tmom: 2058, K: 108, Km: 931, LM: 1, mass: 9.3, price: 650, nInMax: 3600, Mc: 1666, frames: [80, 180],
      note: "≈ 370 € in Cina + spedizione, dazio e IVA (550–800 €). Chiedi il report di collaudo col numero di serie." },
    { id: "rv40e", type: "cyclo", name: "Cicloidale Nabtesco RV-40E-121", ratios: [57, 81, 105, 121, 153], Tr: 412, Tacc: 1029, Tmom: 2058, K: 108, Km: 931, LM: 1, mass: 9.3, price: 1200, nInMax: 3600, Mc: 1666, frames: [80, 180] },
    { id: "rv80e", type: "cyclo", name: "Cicloidale Nabtesco RV-80E", ratios: [57, 81, 101, 121, 153], Tr: 784, Tacc: 1960, Tmom: 3920, K: 196, LM: 1, mass: 13.1, price: 1900, nInMax: 3000, Mc: 2156, frames: [130, 180] },
    { id: "rv110e", type: "cyclo", name: "Cicloidale Nabtesco RV-110E", ratios: [81, 111, 161, 175], Tr: 1078, Tacc: 2695, Tmom: 5390, K: 294, LM: 1, mass: 17.4, price: 2500, nInMax: 3000, Mc: 2940, frames: [130, 180] },
    { id: "htd5", type: "belt", name: "Cinghia dentata HTD 5M 15 mm", ratios: [2, 3, 4, 5], Tr: 15, Tacc: 30, Tmom: 45, K: 0.8, LM: 4, mass: 0.4, price: 30, nInMax: 6000, frames: [42, 90] },
    { id: "nmrv40", type: "worm", name: "Vite senza fine NMRV040", ratios: [30, 50, 80], Tr: 40, Tacc: 80, Tmom: 100, K: 3, LM: 20, mass: 2.3, price: 60, nInMax: 2800, Fr: 1800, frames: [57, 80] },
    { id: "nmrv63", type: "worm", name: "Vite senza fine NMRV063", ratios: [30, 50, 80], Tr: 120, Tacc: 240, Tmom: 300, K: 10, LM: 15, mass: 6.2, price: 110, nInMax: 2800, Fr: 3500, frames: [80, 130] }
  ];
  // Supporti/cuscinetti d'uscita. kind: reducer (cuscinetti del riduttore) | servo | pair (2 radiali + albero) | xroller
  var SUPPORTS = [
    { id: "red", kind: "reducer", name: "Cuscinetti integrati nel riduttore (link sulla flangia)", mass: 0, price: 0 },
    { id: "servo", kind: "servo", name: "Solo l'albero del servo", Mc: 0.4, FrMax: 40, mass: 0, price: 0 },
    { id: "servo608", kind: "servo", name: "Servo + cuscinetto 608 sul lato opposto", Mc: 3, FrMax: 300, mass: 0.02, price: 3 },
    { id: "p608", kind: "pair", name: "2 cuscinetti 608 (albero Ø8)", d: 8, C: 3300, C0: 1370, mass: 0.05, price: 4 },
    { id: "p6001", kind: "pair", name: "2 cuscinetti 6001 (albero Ø12)", d: 12, C: 5400, C0: 2360, mass: 0.08, price: 6 },
    { id: "p6005", kind: "pair", name: "2 cuscinetti 6005 (albero Ø25)", d: 25, C: 11900, C0: 6550, mass: 0.3, price: 14 },
    { id: "p6008", kind: "pair", name: "2 cuscinetti 6008 (albero Ø40)", d: 40, C: 17800, C0: 11600, mass: 0.8, price: 25 },
    { id: "p6010", kind: "pair", name: "2 cuscinetti 6010 (albero Ø50)", d: 50, C: 22900, C0: 16000, mass: 1.2, price: 32 },
    { id: "p32010", kind: "pair", name: "2 cuscinetti conici 32010 a O (albero Ø50)", d: 50, C: 80000, C0: 100000, mass: 1.6, price: 60, taper: true },
    { id: "ru66", kind: "xroller", name: "Rulli incrociati THK RU66 (Ø66 primitivo)", C: 7350, C0: 8350, dp: 0.066, mass: 0.6, price: 160 },
    { id: "ru124", kind: "xroller", name: "Rulli incrociati THK RU124", C: 33100, C0: 50900, dp: 0.124, mass: 2.6, price: 380 },
    { id: "ru148", kind: "xroller", name: "Rulli incrociati THK RU148", C: 49100, C0: 76800, dp: 0.1475, mass: 3.4, price: 450 }
  ];
  var BRAKES = [
    { id: "none", name: "Nessun freno", Tb: 0, mass: 0, W: 0, price: 0 },
    { id: "b04", name: "Freno a molla 24 V · 0,4 N·m", Tb: 0.4, mass: 0.15, W: 6, price: 35 },
    { id: "b13", name: "Freno a molla 24 V · 1,3 N·m", Tb: 1.3, mass: 0.30, W: 8, price: 45 },
    { id: "b32", name: "Freno a molla 24 V · 3,2 N·m", Tb: 3.2, mass: 0.55, W: 11, price: 70 },
    { id: "b8", name: "Freno a molla 24 V · 8 N·m", Tb: 8, mass: 1.0, W: 15, price: 110 },
    { id: "b16", name: "Freno a molla 24 V · 16 N·m", Tb: 16, mass: 1.8, W: 20, price: 160 },
    { id: "b32b", name: "Freno a molla 24 V · 32 N·m", Tb: 32, mass: 3.0, W: 25, price: 220 }
  ];
  // bus: interfacce supportate. opto5: ingressi optoisolati che vogliono 5 V (3,3 V a rischio)
  var DRIVERS = [
    { id: "pwm", name: "PWM diretto dal microcontrollore", for: ["servo_hobby"], bus: ["pwm"], V: [0, 99], Icont: 99, price: 0, pins: 1 },
    { id: "pca9685", name: "Scheda PCA9685 16 canali (I²C)", for: ["servo_hobby"], bus: ["i2c"], V: [0, 10], Icont: 99, price: 6, pins: 0, shared: "i2c" },
    { id: "a4988", name: "A4988 (stepper, 8–35 V, 1 A senza dissipatore)", for: ["stepper"], bus: ["stepdir"], V: [8, 35], Icont: 1.0, price: 2 },
    { id: "drv8825", name: "DRV8825 (stepper, 8,2–45 V, 1,5 A)", for: ["stepper"], bus: ["stepdir"], V: [8.2, 45], Icont: 1.5, price: 3 },
    { id: "tmc2209", name: "TMC2209 (stepper silenzioso, 4,75–29 V, 2 A rms)", for: ["stepper"], bus: ["stepdir"], V: [4.75, 29], Icont: 2.0, price: 7 },
    { id: "dm542", name: "DM542T (stepper, 20–50 V, 4,2 A picco)", for: ["stepper"], bus: ["stepdir"], V: [20, 50], Icont: 4.2, price: 25, opto5: true },
    { id: "dm860", name: "DM860T (stepper, 24–80 V, 7,2 A picco)", for: ["stepper"], bus: ["stepdir"], V: [24, 80], Icont: 7.2, price: 45, opto5: true },
    { id: "hbs57", name: "HBS57 closed-loop (stepper con encoder, 24–50 V)", for: ["stepper_cl"], bus: ["stepdir"], V: [24, 50], Icont: 6.0, price: 45, opto5: true, closesLoop: true },
    { id: "bts7960", name: "Ponte H BTS7960 (DC, 5,5–27 V)", for: ["dc"], bus: ["pwmdir"], V: [5.5, 27], Icont: 15, price: 8, pins: 3 },
    { id: "md20a", name: "Cytron MD20A (DC, 6–30 V, 20 A)", for: ["dc"], bus: ["pwmdir"], V: [6, 30], Icont: 20, price: 25, pins: 2 },
    { id: "zsx11h", name: "Driver BLDC economico ZS-X11H (solo velocità, Hall)", for: ["bldc"], bus: ["pwmdir"], V: [6, 60], Icont: 16, price: 10, pins: 3, speedOnly: true },
    { id: "odrive", name: "ODrive S1 (FOC, 12–48 V, CAN/step-dir)", for: ["bldc"], bus: ["can", "stepdir", "uart"], V: [12, 48], Icont: 40, price: 160, closesLoop: true },
    { id: "moteus", name: "mjbots moteus r4 (FOC, 10–44 V, CAN-FD)", for: ["bldc"], bus: ["can"], V: [10, 44], Icont: 22, price: 95, closesLoop: true },
    { id: "b3a", name: "Delta ASDA-B3-A (impulsi/direzione, 230 V AC)", for: ["ac"], bus: ["stepdir"], V: ["ac230"], Icont: "match", price: 350, opto5: true, closesLoop: true, brakeOut: true, fullClosed: true },
    { id: "b3e", name: "Delta ASDA-B3-E (EtherCAT, 230 V AC)", for: ["ac"], bus: ["ethercat"], V: ["ac230"], Icont: "match", price: 420, closesLoop: true, brakeOut: true, fullClosed: true }
  ];
  // ENCODER. side: motor/output. iface: ab | i2c | spi | biss | internal | driver
  var ENCODERS = [
    { id: "none", name: "Nessun encoder", cpr: 0, iface: "none", price: 0 },
    { id: "pot", name: "Potenziometro interno del servo", cpr: 2000, iface: "internal", price: 0, onlyFor: ["servo_hobby"] },
    { id: "cl1000", name: "Encoder del closed-loop (1000 PPR, va al driver)", cpr: 4000, iface: "driver", price: 0, onlyFor: ["stepper_cl"] },
    { id: "hall", name: "Solo sensori Hall del motore (6 passi/giro elettrico)", cpr: 24, iface: "driver", price: 0, onlyFor: ["bldc"] },
    { id: "inc600", name: "Incrementale ottico 600 PPR (A/B, 5–24 V)", cpr: 2400, iface: "ab", price: 12, V: 5 },
    { id: "inc2500", name: "Incrementale 2500 PPR line-driver (A/B/Z differenziale)", cpr: 10000, iface: "ab", price: 35, V: 5, diff: true },
    { id: "as5600", name: "Magnetico assoluto AS5600 12 bit (I²C)", cpr: 4096, iface: "i2c", price: 3, fixedAddr: true },
    { id: "as5048", name: "Magnetico assoluto AS5048A 14 bit (SPI)", cpr: 16384, iface: "spi", price: 15 },
    { id: "delta17", name: "Assoluto 24 bit integrato nel servo Delta (va al drive)", cpr: 16777216, iface: "driver", price: 0, onlyFor: ["ac"] },
    { id: "biss19", name: "Assoluto d'uscita 19 bit BiSS-C (tipo AksIM-2)", cpr: 524288, iface: "biss", price: 250, output: true }
  ];
  var MCUS = [
    { id: "uno", name: "Arduino Uno R3", logic: 5, pins: 18, intPins: 2, hwEnc: 0, can: "mcp2515", ethercat: false, stepMax: 4000, countMax: 15000, price: 25, cpu: "ATmega328P 16 MHz, 2 KB RAM" },
    { id: "mega", name: "Arduino Mega 2560", logic: 5, pins: 66, intPins: 6, hwEnc: 0, can: "mcp2515", ethercat: false, stepMax: 4000, countMax: 15000, price: 40, cpu: "ATmega2560 16 MHz, 8 KB RAM" },
    { id: "esp32", name: "ESP32 DevKitC", logic: 3.3, pins: 24, intPins: 24, hwEnc: 8, can: "twai", ethercat: false, stepMax: 40000, countMax: 1e6, price: 9, cpu: "Xtensa dual-core 240 MHz, PCNT per 8 encoder" },
    { id: "stm32", name: "STM32 Nucleo-F446RE", logic: 3.3, pins: 50, intPins: 16, hwEnc: 4, can: "native", ethercat: false, stepMax: 100000, countMax: 1e7, price: 22, cpu: "Cortex-M4 180 MHz, 4 timer in modalità encoder" },
    { id: "teensy41", name: "Teensy 4.1", logic: 3.3, pins: 55, intPins: 55, hwEnc: 4, can: "native", ethercat: false, stepMax: 200000, countMax: 1e7, price: 35, cpu: "Cortex-M7 600 MHz, 3× CAN (1 FD), Ethernet" },
    { id: "ipc", name: "PC industriale + master EtherCAT (SOEM/TwinCAT)", logic: 24, pins: 0, intPins: 0, hwEnc: 0, can: "usb", ethercat: true, stepMax: 0, countMax: 0, price: 600, cpu: "x86, kernel real-time", fam: "ethercat", di: 0, dq: 0, ai: 0, pto: 0, hsc: 0 },
    // PLC (valori tipici dalle schede commerciali; I/O integrati della CPU)
    { id: "s7_1212c", plc: true, fam: "s7-1200", name: "PLC Siemens S7-1200 CPU 1212C DC/DC/DC", logic: 24, di: 8, dq: 6, ai: 2, pto: 4, ptoHz: 100000, hsc: 4, hscHz: 100000, net: "PROFINET", ethercat: false, can: "none", pins: 0, intPins: 0, hwEnc: 0, stepMax: 0, countMax: 0, price: 300, cpu: "8 DI / 6 DQ a transistor / 2 AI, 4 uscite impulsi (PTO) 100 kHz, PROFINET, TIA Portal" },
    { id: "s7_1214c", plc: true, fam: "s7-1200", name: "PLC Siemens S7-1200 CPU 1214C DC/DC/DC", logic: 24, di: 14, dq: 10, ai: 2, pto: 4, ptoHz: 100000, hsc: 6, hscHz: 100000, net: "PROFINET", ethercat: false, can: "none", pins: 0, intPins: 0, hwEnc: 0, stepMax: 0, countMax: 0, price: 420, cpu: "14 DI / 10 DQ a transistor / 2 AI, 4 PTO 100 kHz, 6 contatori veloci, PROFINET" },
    { id: "s7_1214r", plc: true, fam: "s7-1200", relay: true, name: "PLC Siemens S7-1200 CPU 1214C AC/DC/RLY (uscite a relè)", logic: 24, di: 14, dq: 10, ai: 2, pto: 0, ptoHz: 0, hsc: 6, hscHz: 100000, net: "PROFINET", ethercat: false, can: "none", pins: 0, intPins: 0, hwEnc: 0, stepMax: 0, countMax: 0, price: 360, cpu: "14 DI / 10 uscite a relè: niente impulsi veloci, alimentazione 230 V AC" },
    { id: "s7_1511", plc: true, fam: "s7-1500", name: "PLC Siemens S7-1500 CPU 1511-1 PN", logic: 24, di: 0, dq: 0, ai: 0, pto: 0, ptoHz: 0, hsc: 0, net: "PROFINET", ethercat: false, can: "none", pins: 0, intPins: 0, hwEnc: 0, stepMax: 0, countMax: 0, price: 950, cpu: "Nessun I/O a bordo (moduli o ET 200SP), assi via PROFIdrive" },
    { id: "micro850", plc: true, fam: "micro800", name: "PLC Allen-Bradley Micro850 24 punti (2080-LC50-24QBB)", logic: 24, di: 14, dq: 10, ai: 0, pto: 3, ptoHz: 100000, hsc: 4, hscHz: 100000, net: "EtherNet/IP", ethercat: false, can: "none", pins: 0, intPins: 0, hwEnc: 0, stepMax: 0, countMax: 0, price: 480, cpu: "14 DI / 10 DO source, 3 PTO 100 kHz, Connected Components Workbench" },
    { id: "nx1p2", plc: true, fam: "nx", name: "PLC Omron NX1P2-9024DT (master EtherCAT integrato)", logic: 24, di: 14, dq: 10, ai: 0, pto: 0, ptoHz: 0, hsc: 0, net: "EtherCAT + EtherNet/IP", ethercat: true, can: "none", pins: 0, intPins: 0, hwEnc: 0, stepMax: 0, countMax: 0, price: 1100, cpu: "14 DI / 10 DO, master EtherCAT con controllo assi (fino a 4), Sysmac Studio" },
    { id: "cp2e", plc: true, fam: "cp", name: "PLC Omron CP2E-N30DT-D", logic: 24, di: 18, dq: 12, ai: 0, pto: 2, ptoHz: 100000, hsc: 4, hscHz: 100000, net: "Ethernet", ethercat: false, can: "none", pins: 0, intPins: 0, hwEnc: 0, stepMax: 0, countMax: 0, price: 320, cpu: "18 DI / 12 DO a transistor, 2 PTO 100 kHz, CX-Programmer" },
    { id: "dvp14ss2", plc: true, fam: "dvp", name: "PLC Delta DVP14SS2 (compatto economico)", logic: 24, di: 8, dq: 6, ai: 0, pto: 2, ptoHz: 100000, hsc: 2, hscHz: 100000, net: "RS-485 Modbus", ethercat: false, can: "none", pins: 0, intPins: 0, hwEnc: 0, stepMax: 0, countMax: 0, price: 120, cpu: "8 DI / 6 DO, 2 uscite impulsi 100 kHz, ISPSoft" },
    { id: "cx9020", plc: true, fam: "ethercat", ebus: true, name: "Beckhoff CX9020 (PC embedded, TwinCAT 3, master EtherCAT)", logic: 24, di: 0, dq: 0, ai: 0, pto: 0, ptoHz: 0, hsc: 0, net: "EtherCAT", ethercat: true, can: "none", pins: 0, intPins: 0, hwEnc: 0, stepMax: 0, countMax: 0, price: 750, cpu: "Nessun I/O a bordo: morsetti EL agganciati direttamente (E-bus)" },
    { id: "opta", plc: true, fam: "opta", relay: true, name: "Arduino Opta (Finder) – micro PLC", logic: 24, di: 8, dq: 4, ai: 8, pto: 0, ptoHz: 0, hsc: 0, net: "Ethernet / RS-485", ethercat: false, can: "none", pins: 0, intPins: 0, hwEnc: 0, stepMax: 0, countMax: 0, price: 150, cpu: "8 ingressi 0–10 V/digitali, 4 relè, programmabile in IEC 61131-3 o in C++ Arduino" },
    { id: "controllino", plc: true, fam: "controllino", name: "CONTROLLINO MAXI (PLC compatibile Arduino Mega)", logic: 24, di: 12, dq: 12, ai: 12, pto: 0, ptoHz: 0, hsc: 0, net: "Ethernet / RS-485", ethercat: false, can: "none", pins: 0, intPins: 0, hwEnc: 0, stepMax: 0, countMax: 0, price: 320, cpu: "Ingressi 24 V, uscite 24 V 2 A, programmato in C++ con l'IDE Arduino" }
  ];
  var BUSES = [
    { id: "stepdir", name: "Step/Dir (impulsi)" },
    { id: "can", name: "CAN / CANopen" },
    { id: "ethercat", name: "EtherCAT" }
  ];
  var PSUS = [
    { id: "none", name: "Nessuno", V: 0, A: 0, price: 0 },
    { id: "p12", name: "12 V · 10 A (120 W)", V: 12, A: 10, price: 22 },
    { id: "p24a", name: "24 V · 6,5 A (150 W)", V: 24, A: 6.5, price: 25 },
    { id: "p24b", name: "24 V · 10 A (240 W, tipo Mean Well LRS-240)", V: 24, A: 10, price: 35 },
    { id: "p24c", name: "24 V · 20 A (480 W, guida DIN)", V: 24, A: 20, price: 90 },
    { id: "p36", name: "36 V · 9,7 A (350 W)", V: 36, A: 9.7, price: 40 },
    { id: "p48a", name: "48 V · 10 A (480 W)", V: 48, A: 10, price: 70 },
    { id: "p48b", name: "48 V · 21 A (1000 W)", V: 48, A: 21, price: 180 }
  ];
  var SERVO_PSUS = [
    { id: "none", name: "Nessuno", V: 0, A: 0, price: 0 },
    { id: "usb5", name: "5 V · 2 A dall'USB/caricatore (!)", V: 5, A: 2, price: 0 },
    { id: "s6a", name: "6 V · 10 A (UBEC / alimentatore)", V: 6, A: 10, price: 18 },
    { id: "s6b", name: "6 V · 20 A switching", V: 6, A: 20, price: 30 },
    { id: "s74", name: "7,4 V · 15 A (step-down regolabile)", V: 7.4, A: 15, price: 25 }
  ];
  // sezione cavo: portata prudente per cavi in fascio a 30 °C
  var WIRES = [
    { id: "w025", mm2: 0.25, awg: 24, A: 2 }, { id: "w05", mm2: 0.5, awg: 20, A: 4 },
    { id: "w075", mm2: 0.75, awg: 18, A: 6 }, { id: "w1", mm2: 1.0, awg: 17, A: 10 },
    { id: "w15", mm2: 1.5, awg: 16, A: 15 }, { id: "w25", mm2: 2.5, awg: 14, A: 20 },
    { id: "w4", mm2: 4, awg: 12, A: 25 }, { id: "w6", mm2: 6, awg: 10, A: 32 }
  ];
  var FUSES = [0, 2, 5, 10, 15, 20, 25, 30, 40];
  var ESTOPS = [
    { id: "none", name: "Nessun arresto di emergenza", level: 0, price: 0 },
    { id: "soft", name: "Pulsante che avvisa solo il microcontrollore (software)", level: 1, price: 8 },
    { id: "cont", name: "Fungo NC + contattore che taglia la potenza dei motori", level: 2, price: 60 },
    { id: "sto", name: "Relè di sicurezza (tipo PNOZ) + STO dei drive, categoria 3", level: 3, price: 220 }
  ];
  var HOMING = [
    { id: "none", name: "Nessun finecorsa", price: 0 },
    { id: "mech", name: "Finecorsa meccanici (microswitch) per ogni asse", price: 2 },
    { id: "ind", name: "Sensori induttivi NPN/PNP per ogni asse", price: 12 }
  ];
  // Pinze e utensili. kind: servo | elec | pneu | vac | mag | spindle
  // F = forza di presa totale (N); pay = peso pezzo consigliato dal costruttore o calcolato (μ 0,1, sicurezza 2).
  var EFFECTORS = [
    { id: "micro", kind: "servo", name: "Micro pinza con servo SG90", mass: 0.06, L: 0.06, price: 8, F: 7, stroke: 30, pay: 0.15, brand: "kit hobby generici" },
    { id: "mgrip", kind: "servo", name: "Pinza con servo MG996R (stampata 3D)", mass: 0.12, L: 0.08, price: 15, F: 35, stroke: 50, pay: 0.6, brand: "progetti open source, kit cinesi" },
    { id: "grip", kind: "elec", name: "Pinza elettrica compatta 24 V (classe 300 N)", mass: 0.5, L: 0.10, price: 350, F: 300, stroke: 20, pay: 1.2, v24: true, io: { di: 2, dq: 2 }, brand: "classe Hitbot / DH-Robotics / Zimmer GEP" },
    { id: "r2f85", kind: "elec", name: "Pinza adattiva elettrica (classe Robotiq 2F-85)", mass: 0.9, L: 0.16, price: 4500, F: 235, stroke: 85, pay: 5, v24: true, io: { di: 2, dq: 2 }, brand: "classe Robotiq 2F-85" },
    { id: "rg2", kind: "elec", name: "Pinza elettrica leggera (classe OnRobot RG2)", mass: 0.78, L: 0.21, price: 3500, F: 40, stroke: 110, pay: 2, v24: true, io: { di: 2, dq: 2 }, brand: "classe OnRobot RG2" },
    { id: "pneu", kind: "pneu", name: "Pinza pneumatica parallela Ø25 (classe SMC MHZ2-25D)", mass: 0.8, L: 0.12, price: 150, F: 260, stroke: 10, pay: 1.3, air: { pmin: 1, pnom: 6, pmax: 7, V: 12, hose: 4 }, brand: "classe SMC MHZ2 / Festo DHPS / Airtac HFZ" },
    { id: "hgrip", kind: "pneu", name: "Pinza pneumatica pesante (classe SCHUNK PGN-plus-P 160-2)", mass: 6, L: 0.20, price: 2400, F: 4900, stroke: 16, pay: 24.5, air: { pmin: 2.5, pnom: 6, pmax: 8, V: 200, hose: 6 }, brand: "classe SCHUNK PGN-plus-P 160-2 (3 kg) + dita e flangia", note: "Dati del 160-2 dal sito SCHUNK: 4900 N in chiusura, 24,5 kg consigliati (μ 0,1, sicurezza 2), 200 cm³ per doppia corsa. Massa con dita e flangia ≈ 6 kg." },
    { id: "hgripas", kind: "pneu", name: "Pinza pneumatica pesante con molla (classe PGN-plus-P 160-2-AS)", mass: 6.8, L: 0.24, price: 2900, F: 6300, stroke: 16, pay: 24.5, spring: true, air: { pmin: 4, pnom: 6, pmax: 6.5, V: 355, hose: 6 }, brand: "classe SCHUNK PGN-plus-P 160-2-AS (3,8 kg) + dita e flangia", note: "La molla interna (≥ 1400 N) mantiene la presa anche se manca l'aria: il pezzo non cade all'emergenza." },
    { id: "vac", kind: "vac", name: "Ventosa Ø40 + eiettore Venturi", mass: 0.3, L: 0.10, price: 60, cups: 1, dc: 40, air: { pmin: 4, pnom: 5, pmax: 7, ejector: 40, hose: 6 }, brand: "classe Schmalz / Piab / SMC ZP" },
    { id: "vac4", kind: "vac", name: "Piastra 4 ventose Ø60 + eiettore", mass: 1.0, L: 0.12, price: 220, cups: 4, dc: 60, air: { pmin: 4, pnom: 5, pmax: 7, ejector: 90, hose: 8 }, brand: "classe Schmalz / Piab" },
    { id: "mag", kind: "mag", name: "Pinza magnetica elettropermanente 24 V (classe 300 N)", mass: 0.6, L: 0.08, price: 260, F: 300, pay: 7, v24: true, io: { di: 1, dq: 1 }, brand: "classe Magswitch / OnRobot MG10 / Schmalz", note: "Solo su pezzi in acciaio piani di almeno 10 mm: su lamiera sottile la forza crolla." },
    { id: "sp08", kind: "spindle", name: "Mandrino 800 W ER11 (classe rifilatore Makita/Kress)", mass: 1.8, L: 0.12, price: 140, P: 800, brand: "classe Makita RT0701C, Kress 800, AMB" },
    { id: "sp15", kind: "spindle", name: "Elettromandrino 1,5 kW ER11 Ø65 raffreddato ad acqua", mass: 3.8, L: 0.20, price: 180, P: 1500, vfd: true, water: true, brand: "mandrini cinesi 24 000 giri/min (Huanyang & simili)" },
    { id: "sp22", kind: "spindle", name: "Elettromandrino 2,2 kW ER20 Ø80 raffreddato ad acqua", mass: 5.5, L: 0.22, price: 280, P: 2200, vfd: true, water: true, brand: "mandrini cinesi 24 000 giri/min" },
    { id: "sp35", kind: "spindle", name: "Elettromandrino 3,5 kW ISO20 (≈ 8 kg)", mass: 8, L: 0.15, price: 900, P: 3500, vfd: true, water: true, brand: "classe HSD / Teknomotor / cinesi ATC" }
  ];
  var FINGERS = [
    { id: "smooth", name: "Dita lisce in acciaio (μ 0,1)", mu: 0.1, price: 0 },
    { id: "rubber", name: "Dita con inserti in gomma/PU (μ 0,3)", mu: 0.3, price: 15 },
    { id: "form", name: "Dita sagomate sul pezzo (presa di forma, μ equivalente 0,5)", mu: 0.5, price: 60 }
  ];
  // Viti a testa cilindrica ISO 4762: precarico FM e coppia di serraggio MA tipici (VDI 2230, μ 0,12, 90% snervamento)
  var BOLTS = [
    { s: "M3", pitch: 0.5, tap: 2.5, d: 3, As: 5.03, hex: 2.5, FM: [2.3, 3.4, 4.0], MA: [1.1, 1.6, 1.9], eur: [0.06, 0.09, 0.12] },
    { s: "M4", pitch: 0.7, tap: 3.3, d: 4, As: 8.78, hex: 3, FM: [4.3, 6.3, 7.4], MA: [3.0, 4.4, 5.1], eur: [0.07, 0.10, 0.14] },
    { s: "M5", pitch: 0.8, tap: 4.2, d: 5, As: 14.2, hex: 4, FM: [7.0, 10.3, 12.0], MA: [5.9, 8.7, 10.2], eur: [0.08, 0.12, 0.16] },
    { s: "M6", pitch: 1.0, tap: 5.0, d: 6, As: 20.1, hex: 5, FM: [9.9, 14.5, 17.0], MA: [10.1, 14.9, 17.4], eur: [0.10, 0.15, 0.20] },
    { s: "M8", pitch: 1.25, tap: 6.8, d: 8, As: 36.6, hex: 6, FM: [18.1, 26.6, 31.1], MA: [24.6, 36.1, 42.2], eur: [0.18, 0.25, 0.32] },
    { s: "M10", pitch: 1.5, tap: 8.5, d: 10, As: 58.0, hex: 8, FM: [28.8, 42.2, 49.4], MA: [48, 71, 83], eur: [0.30, 0.42, 0.55] },
    { s: "M12", pitch: 1.75, tap: 10.2, d: 12, As: 84.3, hex: 10, FM: [41.9, 61.5, 72.0], MA: [84, 123, 144], eur: [0.50, 0.70, 0.90] },
    { s: "M16", pitch: 2.0, tap: 14.0, d: 16, As: 157, hex: 14, FM: [78.8, 115.7, 135.4], MA: [206, 302, 354], eur: [1.2, 1.6, 2.0] }
  ];
  var BOLT_CLASSES = [{ id: "8.8", Rp: 640, i: 0 }, { id: "10.9", Rp: 940, i: 1 }, { id: "12.9", Rp: 1100, i: 2 }];
  // Cavi motore. flex: fixed (posa fissa) | chain (catena portacavi) | robot (torsione). bendF = raggio minimo / diametro esterno in movimento
  var CABLES = [
    { id: "", name: "Non scelto (cavo generico)", mm2: 0, od: 8, flex: "fixed", bendF: 15, sh: false, eurm: 1.5 },
    { id: "servo22", name: "Prolunga servo 3×22 AWG", mm2: 0.34, od: 3.5, flex: "fixed", bendF: 10, sh: false, eurm: 0.4 },
    { id: "h05_075", name: "H05VV-F 4G0,75 PVC (posa fissa)", mm2: 0.75, od: 7.0, flex: "fixed", bendF: 15, sh: false, eurm: 1.0 },
    { id: "h05_15", name: "H05VV-F 4G1,5 PVC (posa fissa)", mm2: 1.5, od: 8.8, flex: "fixed", bendF: 15, sh: false, eurm: 1.6 },
    { id: "liycy05", name: "LiYCY 4×0,5 schermato (posa fissa)", mm2: 0.5, od: 6.3, flex: "fixed", bendF: 15, sh: true, eurm: 1.8 },
    { id: "cf9_075", name: "Cavo PUR per catena 4G0,75 (classe igus chainflex CF9)", mm2: 0.75, od: 7.0, flex: "chain", bendF: 7.5, sh: false, eurm: 3.5 },
    { id: "cf27_15", name: "Cavo motore schermato per catena 4G1,5 (classe chainflex CF27)", mm2: 1.5, od: 9.5, flex: "chain", bendF: 7.5, sh: true, eurm: 7 },
    { id: "cf27_25", name: "Cavo motore schermato per catena 4G2,5 (classe chainflex CF27)", mm2: 2.5, od: 11.5, flex: "chain", bendF: 7.5, sh: true, eurm: 9.5 },
    { id: "robot_1", name: "Cavo robot a torsione 4G1,0 schermato (classe chainflex CF ROBOT)", mm2: 1.0, od: 9.0, flex: "robot", bendF: 10, sh: true, eurm: 12 }
  ];
  // PLC e moduli: vedi MCUS (plc: true)

  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return list[0]; }
  var api = { FINGERS: FINGERS, BOLTS: BOLTS, BOLT_CLASSES: BOLT_CLASSES, CABLES: CABLES, MATERIALS: MATERIALS, SECTIONS: SECTIONS, MOTORS: MOTORS, REDUCERS: REDUCERS, SUPPORTS: SUPPORTS, BRAKES: BRAKES, DRIVERS: DRIVERS, ENCODERS: ENCODERS, MCUS: MCUS, BUSES: BUSES, PSUS: PSUS, SERVO_PSUS: SERVO_PSUS, WIRES: WIRES, FUSES: FUSES, ESTOPS: ESTOPS, HOMING: HOMING, EFFECTORS: EFFECTORS, byId: byId };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.CAT = api;
})(this);
