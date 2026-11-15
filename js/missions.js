/* Missioni, braccia di partenza e soluzioni di esempio */
(function (root) {
  "use strict";
  function lk(mat, sec, d, L) { var o = { mat: mat, sec: sec, L: L }; for (var k in d) o[k] = d[k]; return o; }
  function jt(motor, reducer, ratio, support, brake, driver, encoder, link, x) {
    var o = { motor: motor, reducer: reducer, ratio: ratio, support: support, brake: brake, driver: driver, encoder: encoder, link: link, shaftMat: "c45", a: 60, b: 100 };
    if (x) for (var k in x) o[k] = x[k]; return o;
  }
  function el(o) { var d = { mcu: "uno", bus: "stepdir", micro: 16, psu: "none", servoPsu: "none", wireMotor: "w05", wirePower: "w1", fuse: 0, estop: "none", homing: "none", levelShift: false, aux24: false, torqueLimit: false }; for (var k in o) d[k] = o[k]; return d; }
  var MISSIONS = [
    { id: "m1", level: 1, title: "1 · Braccio da scrivania", short: "Solleva 0,5 kg con i servo",
      story: "Il primo braccio: servo hobby, pezzi stampati in 3D e un Arduino. Deve sollevare 0,5 kg a 25 cm dalla spalla.",
      axes: 4, minAxes: 4, payload: 0.5, reach: 0.25, speed: 90, tAcc: 0.3, F: 0, lat: false, tol: 5, budget: 260, massRef: 1.2, estop: 1, brakes: false,
      tips: ["La coppia scritta sui servo è di stallo: usa al massimo la metà.", "Metti un cuscinetto 608 sul lato opposto del servo della spalla.", "I servo non si alimentano dall'USB."],
      starter: { axes: 4, effector: "micro", joints: [
        jt("mg996r", "none", 1, "servo", "none", "pwm", "pot", lk("pla", "rect", { B: 30, H: 30 }, 0.08), { b: 20 }),
        jt("mg996r", "none", 1, "servo", "none", "pwm", "pot", lk("pla", "rect", { B: 20, H: 8 }, 0.13), { b: 20 }),
        jt("sg90", "none", 1, "servo", "none", "pwm", "pot", lk("pla", "rect", { B: 20, H: 6 }, 0.10), { b: 20 }),
        jt("sg90", "none", 1, "servo", "none", "pwm", "pot", lk("pla", "rect", { B: 20, H: 6 }, 0.0), { b: 20 })
      ], elec: el({ mcu: "uno", bus: "stepdir", servoPsu: "usb5", estop: "none" }) },
      solution: { axes: 4, effector: "micro", joints: [
        jt("ds3218", "none", 1, "servo608", "none", "pca9685", "pot", lk("pla", "rect", { B: 40, H: 40 }, 0.08), { b: 20 }),
        jt("ds5160", "none", 1, "servo608", "none", "pca9685", "pot", lk("pla", "rect", { B: 24, H: 16 }, 0.11), { b: 20 }),
        jt("ds5160", "none", 1, "servo608", "none", "pca9685", "pot", lk("pla", "rect", { B: 24, H: 14 }, 0.08), { b: 20 }),
        jt("mg996r", "none", 1, "servo608", "none", "pca9685", "pot", lk("pla", "rect", { B: 20, H: 10 }, 0.0), { b: 20 })
      ], elec: el({ mcu: "uno", bus: "stepdir", servoPsu: "s6b", estop: "soft" }) } },
    { id: "m2", level: 2, title: "2 · Braccio da laboratorio", short: "5 kg con gli stepper",
      story: "Un braccio a 5 assi con stepper, riduttori e alluminio: deve portare 5 kg a 60 cm con 1 mm di precisione. Qui entrano in gioco freni, emergenza e cablaggio.",
      axes: 5, minAxes: 5, payload: 5, reach: 0.6, speed: 45, tAcc: 0.5, F: 0, lat: false, tol: 1.0, budget: 3200, massRef: 35, estop: 2, brakes: true,
      tips: ["Gli stepper perdono coppia in velocità: a 48 V va meglio.", "Gli assi che portano peso vogliono un freno.", "Arduino Uno non basta per 5 stepper con encoder."],
      starter: { axes: 5, effector: "grip", joints: [
        jt("n17b", "ple40", 10, "red", "none", "a4988", "none", lk("al6061", "tube", { D: 80, t: 4 }, 0.25)),
        jt("n23a", "ple60", 20, "red", "none", "a4988", "none", lk("al6061", "rtube", { B: 40, H: 40, t: 3 }, 0.30)),
        jt("n17b", "ple40", 20, "red", "none", "a4988", "none", lk("al6061", "rtube", { B: 30, H: 30, t: 2 }, 0.20)),
        jt("n17a", "ple40", 10, "red", "none", "a4988", "none", lk("al6061", "rect", { B: 30, H: 10 }, 0.0)),
        jt("n17a", "none", 1, "red", "none", "a4988", "none", lk("al6061", "rect", { B: 30, H: 10 }, 0.0))
      ], elec: el({ mcu: "uno", psu: "p24b", wireMotor: "w05", wirePower: "w1" }) },
      solution: { axes:5, effector:"grip", joints:[
 jt("n23b","ple60",20,"ru124","none","dm542","inc600",lk("al6061","tube",{D:100,t:5},0.25)),
 jt("n34a","shpr20",81,"red","b13","dm860","inc600",lk("al6061","rtube",{B:60,H:80,t:4},0.32)),
 jt("n23b","lhsg20",50,"red","b13","dm542","inc600",lk("al6061","rtube",{B:50,H:50,t:3},0.18)),
 jt("n23a","ple60",20,"red","b04","dm542","inc600",lk("al6061","rect",{B:40,H:12},0.0)),
 jt("n17b","ple40",10,"red","none","dm542","inc600",lk("al6061","rect",{B:30,H:10},0.0))],
 elec: el({mcu:"stm32",psu:"p48b",micro:8,wireMotor:"w075",wirePower:"w4",fuse:25,estop:"cont",homing:"ind",levelShift:true,aux24:true,torqueLimit:true})} },
    { id: "m3", level: 3, title: "3 · Il J2 di Reeda", short: "Fresatura 300 N",
      story: "Il tuo braccio vero: 6 assi, elettromandrino da 8 kg, utensile da 1 kg a 750 mm dalla spalla, forza di fresatura 300 N anche laterale. È lo stesso caso dei tuoi calcoli J2 (M statico 94,18 N·m a parità di masse).",
      axes: 6, minAxes: 6, payload: 1, reach: 0.75, speed: 30, tAcc: 0.5, F: 300, lat: true, tol: 1.0, budget: 14000, massRef: 90, estop: 2, brakes: true, effector: "sp35",
      tips: ["Il riduttore domina la precisione: il cicloidale SHPR-40E-121 è rigido (108 N·m/arcmin) ed economico.", "Imposta il limite di coppia nel drive.", "Un encoder assoluto sull'uscita compensa torsione e gioco."],
      starter: { axes: 6, effector: "sp35", joints: [
        jt("ac750", "pp120", 50, "red", "none", "b3a", "delta17", lk("s235", "tube", { D: 160, t: 5 }, 0.45)),
        jt("ac750", "pp120", 100, "red", "none", "b3a", "delta17", lk("s235", "rtube", { B: 80, H: 80, t: 3 }, 0.30)),
        jt("ac400", "pp120", 100, "red", "none", "b3a", "delta17", lk("s235", "rtube", { B: 60, H: 60, t: 3 }, 0.22)),
        jt("ac200", "ple60", 50, "red", "none", "b3a", "delta17", lk("al6061", "tube", { D: 60, t: 4 }, 0.04)),
        jt("ac200", "ple60", 50, "red", "none", "b3a", "delta17", lk("al6061", "tube", { D: 60, t: 4 }, 0.04)),
        jt("ac200", "ple60", 20, "red", "none", "b3a", "delta17", lk("al6061", "tube", { D: 50, t: 4 }, 0.0))
      ], elec: el({ mcu: "mega", psu: "none", wireMotor: "w05", wirePower: "w1" }) },
      solution: { axes:6, effector:"sp35", joints:[
 jt("ac1k","shpr40",121,"red","none","b3a","biss19",lk("s355","tube",{D:219,t:8},0.45)),
 jt("ac1k","shpr40",153,"red","b8","b3a","biss19",lk("al6061","rtube",{B:120,H:160,t:8},0.30)),
 jt("ac750","lhsg40",160,"red","b32","b3a","biss19",lk("al6061","rtube",{B:100,H:120,t:6},0.22)),
 jt("ac200","csf32",100,"red","none","b3a","delta17",lk("al7075","tube",{D:110,t:8},0.04)),
 jt("ac400","csf32",100,"red","b04","b3a","delta17",lk("al7075","tube",{D:110,t:8},0.04)),
 jt("ac200","csf20",80,"red","none","b3a","delta17",lk("al7075","tube",{D:80,t:6},0.0))],
 elec: el({mcu:"stm32",psu:"p24b",micro:8,wireMotor:"w1",wirePower:"w15",fuse:15,estop:"cont",homing:"none",levelShift:true,torqueLimit:true})} },
    { id: "m4", level: 4, title: "4 · Robot industriale", short: "20 kg a 1,2 m",
      story: "Un robot da produzione a 6 assi: 20 kg a 1,2 m, 60 °/s, 1 mm sotto carico. Servo AC, cicloidali, EtherCAT e sicurezza di categoria 3.",
      axes: 6, minAxes: 6, payload: 20, reach: 1.2, speed: 60, tAcc: 0.5, F: 0, lat: false, tol: 1.0, budget: 22000, massRef: 250, estop: 3, brakes: true, effector: "hgrip",
      tips: ["Le coppie dinamiche qui pesano quanto la gravità.", "EtherCAT vuole un PC industriale come master.", "Il polso pesa: tienilo leggero."],
      starter: { axes: 6, effector: "hgrip", joints: [
        jt("n34b", "ple80", 50, "red", "none", "dm860", "none", lk("s235", "tube", { D: 200, t: 6 }, 0.6)),
        jt("n34b", "pp120", 100, "red", "none", "dm860", "none", lk("s235", "rtube", { B: 120, H: 120, t: 5 }, 0.55)),
        jt("n34a", "pp120", 100, "red", "none", "dm860", "none", lk("s235", "rtube", { B: 100, H: 100, t: 4 }, 0.45)),
        jt("n23b", "ple60", 50, "red", "none", "dm542", "none", lk("al6061", "tube", { D: 80, t: 4 }, 0.0)),
        jt("n23b", "ple60", 50, "red", "none", "dm542", "none", lk("al6061", "tube", { D: 80, t: 4 }, 0.0)),
        jt("n23a", "ple60", 20, "red", "none", "dm542", "none", lk("al6061", "tube", { D: 60, t: 4 }, 0.0))
      ], elec: el({ mcu: "mega", psu: "p48b", micro: 16, wireMotor: "w075", wirePower: "w25", fuse: 20, estop: "cont", homing: "mech" }) },
      solution: { axes:6, effector:"hgrip", joints:[
 jt("ac2k","rv110e",161,"red","none","b3e","delta17",lk("s355","tube",{D:323,t:10},0.6)),
 jt("ac2k","rv110e",161,"red","b16","b3e","biss19",lk("s355","rtube",{B:200,H:260,t:10},0.55)),
 jt("ac1k","rv40e",121,"red","b8","b3e","delta17",lk("s355","rtube",{B:150,H:180,t:8},0.45)),
 jt("ac400","csf32",100,"red","none","b3e","delta17",lk("al7075","tube",{D:110,t:8},0.0)),
 jt("ac400","csf32",100,"red","b13","b3e","delta17",lk("al7075","tube",{D:110,t:8},0.0)),
 jt("ac200","csf20",80,"red","none","b3e","delta17",lk("al7075","tube",{D:80,t:8},0.0))],
 elec: el({mcu:"ipc",bus:"ethercat",psu:"p24b",wireMotor:"w25",wirePower:"w15",fuse:15,estop:"sto",homing:"none",torqueLimit:true})} },
    { id: "sandbox", level: 2, title: "Laboratorio libero", short: "Imposti tu i requisiti",
      story: "Nessun vincolo di missione: imposta carico, portata, forza, velocità e tolleranza come vuoi e prova le tue idee.",
      axes: 6, minAxes: 4, payload: 2, reach: 0.6, speed: 60, tAcc: 0.5, F: 0, lat: false, tol: 1, budget: 10000, massRef: 40, estop: 2, brakes: true, editable: true, tips: [], starter: null, solution: null }
  ];
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function byId(id) { for (var i = 0; i < MISSIONS.length; i++) if (MISSIONS[i].id === id) return MISSIONS[i]; return MISSIONS[0]; }
  var api = { MISSIONS: MISSIONS, byId: byId, clone: clone, jt: jt, lk: lk, el: el };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.MIS = api;
})(this);
