/* Braccio Lab · Catalogo PCB: oltre 1000 tipi generati da combinazioni reali di fabbricazione
   (strati, materiale, spessore, rame, finitura, misura) + millefori, breakout e moduli pronti.
   Prezzi = valori tipici indicativi (servizi di prototipazione 2026, 5 pezzi o pezzo singolo). */
(function (root) {
  "use strict";
  function r2(x) { return Math.round(x * 100) / 100; }
  function rp(x) { return x >= 100 ? Math.round(x) : x >= 10 ? Math.round(x * 2) / 2 : r2(x); }
  var MAT = {
    fr4: { n: "FR-4 TG135", er: 4.5, k: 1, use: "uso generale, hobby, controllo", tmax: 130 },
    fr4h: { n: "FR-4 TG170 (alta TG)", er: 4.4, k: 1.15, use: "saldatura senza piombo ripetuta, motori, automotive", tmax: 160 },
    alu: { n: "Alluminio IMS (1–2 W/m·K)", er: 0, k: 1.6, use: "LED di potenza, driver MOSFET, alimentatori", tmax: 140 },
    flex: { n: "Flessibile poliimmide", er: 3.4, k: 4.5, use: "cavi piatti, parti in movimento del braccio, display", tmax: 200 },
    rogers: { n: "Rogers RO4350B", er: 3.48, k: 9, use: "radiofrequenza, antenne, 2,4/5 GHz, radar", tmax: 280 },
    cem1: { n: "CEM-1 (economico)", er: 4.2, k: 0.8, use: "giocattoli, schede a una faccia molto economiche", tmax: 110 }
  };
  var FIN = {
    hasl: { n: "HASL con piombo", k: 0, note: "economica, superfici non perfettamente piane" },
    hasllf: { n: "HASL senza piombo", k: 0.1, note: "RoHS, buona saldabilità" },
    enig: { n: "ENIG (oro chimico)", k: 0.6, note: "piana, perfetta per BGA, QFN e passo fine" },
    osp: { n: "OSP (organica)", k: 0.05, note: "piana ed economica, si ossida in 6 mesi" },
    enepig: { n: "ENEPIG", k: 1.2, note: "per wire bonding e connettori dorati" }
  };
  var MASK = [["verde", "#1f7a3a"], ["blu", "#1d4fa3"], ["rosso", "#b3262b"], ["nero", "#161616"], ["bianco", "#eeeeee"], ["giallo", "#d9b21a"], ["viola", "#5c2a8c"]];
  var SIZES = [[50, 50, "5×5 cm"], [100, 100, "10×10 cm"], [100, 160, "Eurocard 100×160"], [160, 233, "doppio Eurocard 160×233"]];
  var LIST = [];
  function add(o) { o.search = (o.name + " " + (o.tags || []).join(" ") + " " + (o.desc || "")).toLowerCase(); LIST.push(o); return o; }
  function fabPrice(L, m, th, cu, f, w, h) {
    var area = w * h / 10000, base = { 1: 2, 2: 4, 4: 14, 6: 55, 8: 110 }[L];
    var p = base * Math.max(1, area) * MAT[m].k;
    if (th !== 1.6) p += 2 + (L >= 4 ? 4 : 0);
    if (cu > 1) p += (cu - 1) * (6 + 4 * L) * Math.max(1, area);
    p *= 1 + FIN[f].k; if (m === "flex") p += 10; if (m === "rogers") p += 40;
    return rp(p + 1.5);
  }
  function fabOK(L, m, th, cu, f) {
    if (m === "alu" && (L > 2 || th < 1)) return false;
    if (m === "flex" && (L > 2 || th > 0.8 || cu > 1)) return false;
    if (m === "rogers" && (L === 1 || L > 4 || f === "hasl" || cu > 2)) return false;
    if (m === "cem1" && (L > 1 || th < 1.2 || f === "enig" || f === "enepig")) return false;
    if (L >= 6 && (f === "hasl" || th < 1.2)) return false;
    if (f === "enepig" && L < 4) return false;
    if (f === "hasl" && L >= 4) return false;
    if (cu === 3 && (L === 1 || L > 4)) return false;
    return true;
  }
  var n = 0;
  [1, 2, 4, 6, 8].forEach(function (L) {
    Object.keys(MAT).forEach(function (m) {
      [0.8, 1.0, 1.2, 1.6, 2.0].forEach(function (th0) {
        [1, 2, 3].forEach(function (cu) {
          Object.keys(FIN).forEach(function (f) {
            var th = m === "flex" ? (th0 <= 0.8 ? 0.2 : th0) : th0;
            if (!fabOK(L, m, th, cu, f)) return;
            SIZES.forEach(function (S, si) {
              var mask = m === "flex" ? ["ambra (coverlay)", "#c98a1a"] : m === "alu" ? MASK[4] : MASK[(L + si + cu + Math.round(th * 10)) % MASK.length];
              var id = "pcb-" + L + "L-" + m + "-" + String(th).replace(".", "") + "-" + cu + "oz-" + f + "-" + S[0] + "x" + S[1];
              var tr = cu === 1 ? 0.15 : cu === 2 ? 0.2 : 0.25, amp = Math.round(10 * 0.048 * Math.pow(10 * cu * 1.37, 0.44) * Math.pow(40 * (1 / 0.0254 / 1000) * 1, 0.725)) / 10;
              add({ id: id, cat: "fab", layers: L, mat: m, th: th, cu: cu, fin: f, mask: mask[0], color: mask[1], w: S[0], h: S[1],
                name: "PCB " + L + (L === 1 ? " strato" : " strati") + " " + MAT[m].n + " " + String(th).replace(".", ",") + " mm · " + cu + " oz · " + FIN[f].n + " · " + S[2],
                price: fabPrice(L, m, th, cu, f, S[0], S[1]), qty: "5 pz", lead: L <= 2 ? 3 : L === 4 ? 5 : 8,
                track: tr, via: L >= 6 ? 0.2 : 0.3, ampPer1mm: amp,
                tags: ["fabbricazione", L + " strati", MAT[m].n, FIN[f].n, cu + "oz", "spessore " + th, mask[0], S[2]],
                desc: "Per " + MAT[m].use + ". Finitura: " + FIN[f].note + ". Pista minima " + tr + " mm, foro via " + (L >= 6 ? 0.2 : 0.3) + " mm." });
              n++;
            });
          });
        });
      });
    });
  });
  var PROTO = [["Millefori 1 faccia FR-2 passo 2,54", "perf", 1, 1.2], ["Millefori doppia faccia metallizzata FR-4 verde", "perf", 2, 1.6], ["Millefori a strisce (stripboard / Veroboard)", "strip", 1, 1.6], ["Basetta ramata vergine per fotoincisione", "blank", 1, 1.6], ["Basetta ramata doppia faccia", "blank", 2, 1.6], ["Basetta presensibilizzata positiva", "photo", 1, 1.6], ["Breadboard-layout PCB (come una breadboard 830 punti)", "bbpcb", 2, 1.6]];
  var PSIZE = [[20, 80], [30, 70], [40, 60], [50, 70], [60, 80], [70, 90], [80, 120], [90, 150], [100, 160], [160, 233]];
  PROTO.forEach(function (P, i) { PSIZE.forEach(function (s) { add({ id: "proto-" + P[1] + "-" + P[2] + "-" + s[0] + "x" + s[1], cat: "proto", layers: P[2], mat: P[1] === "perf" && P[2] === 1 ? "fr2" : "fr4", th: P[3], cu: 1, fin: "hasl", mask: P[2] === 2 ? "verde" : "nessuno", color: P[1] === "blank" || P[1] === "photo" ? "#c07a3a" : "#2a7a42", w: s[0], h: s[1], name: P[0] + " " + s[0] + "×" + s[1] + " mm", price: rp(0.4 + s[0] * s[1] / 1600 * (P[2] === 2 ? 1.6 : 1) * (P[1] === "photo" ? 2.2 : 1)), qty: "1 pz", lead: 1, tags: ["prototipo", "millefori", "hobby"], desc: "Per prototipi saldati a mano: componenti THT, fili e ponticelli di stagno." }); }); });
  var MODS = [
    ["Arduino Uno R3 (ATmega328P)", "mcu", 24, "board"], ["Arduino Nano V3 compatibile", "mcu", 5, "board"], ["Arduino Mega 2560", "mcu", 15, "board"], ["Arduino Pro Mini 5 V 16 MHz", "mcu", 4, "board"], ["ESP32 DevKitC (WROOM-32)", "mcu", 7, "board"], ["ESP32-S3 DevKit N16R8", "mcu", 12, "board"], ["ESP32-C3 SuperMini", "mcu", 3, "board"], ["ESP8266 NodeMCU", "mcu", 4, "board"], ["STM32F103 Blue Pill", "mcu", 4, "board"], ["STM32F411 Black Pill", "mcu", 6, "board"], ["STM32 Nucleo-F446RE", "mcu", 20, "board"], ["Raspberry Pi Pico (RP2040)", "mcu", 5, "board"], ["Raspberry Pi Pico 2 W (RP2350)", "mcu", 8, "board"], ["Teensy 4.1", "mcu", 35, "board"], ["Seeed XIAO SAMD21", "mcu", 6, "board"],
    ["Driver stepper A4988 (Pololu)", "drv", 2.5, "driver"], ["Driver stepper DRV8825", "drv", 3, "driver"], ["Driver stepper TMC2209 UART", "drv", 6, "driver"], ["Driver stepper TMC5160 SPI 3 A", "drv", 18, "driver"], ["Driver DM542 industriale 4,2 A", "drv", 25, "driver"], ["Ponte H L298N 2 A", "drv", 3, "driver"], ["Driver TB6612FNG 1,2 A", "drv", 3, "driver"], ["Driver BTS7960 43 A", "drv", 9, "driver"], ["Driver DRV8871 3,6 A", "drv", 5, "driver"], ["ULN2003 + motore 28BYJ-48", "drv", 3, "driver"], ["Driver servo PCA9685 16 canali I²C", "drv", 4, "driver"], ["ESC 30 A per BLDC", "drv", 10, "driver"], ["ODrive v3.6 (2 BLDC)", "drv", 120, "driver"], ["Modulo MOSFET IRF520 (non logic level)", "drv", 1.5, "driver"], ["Modulo MOSFET doppio AOD4184 15 A", "drv", 2, "driver"],
    ["Regolatore buck LM2596 3 A", "pwr", 1.5, "power"], ["Mini buck MP1584 3 A", "pwr", 1, "power"], ["Buck-boost XL6009", "pwr", 2, "power"], ["Regolatore 7805 su basetta con condensatori", "pwr", 1, "power"], ["AMS1117-3.3 modulo", "pwr", 0.6, "power"], ["Caricabatterie TP4056 Li-ion con protezione", "pwr", 0.8, "power"], ["BMS 3S 20 A", "pwr", 4, "power"], ["Alimentatore breadboard MB102 3,3/5 V", "pwr", 2, "power"], ["Convertitore 24 V → 5 V 5 A", "pwr", 6, "power"], ["Modulo Power Delivery trigger USB-C 12/20 V", "pwr", 3, "power"],
    ["Relè 1 canale 5 V optoisolato", "io", 1.5, "relay"], ["Relè 4 canali 5 V", "io", 5, "relay"], ["Relè statico SSR 2 canali", "io", 6, "relay"], ["Optoisolatore PC817 4 canali", "io", 2, "io"], ["Traslatore di livello 3,3 ↔ 5 V (BSS138)", "io", 0.8, "io"], ["Espansore I/O MCP23017", "io", 2, "io"], ["Convertitore USB-seriale CH340", "io", 1.5, "io"], ["Transceiver CAN MCP2515", "io", 3, "io"], ["RS485 MAX485", "io", 1, "io"], ["Shield CNC v3 (4 driver)", "io", 6, "shield"], ["Shield motori Adafruit v2", "io", 15, "shield"], ["Shield Ethernet W5500", "io", 8, "shield"],
    ["Sensore ultrasuoni HC-SR04", "sens", 1.5, "sensor"], ["IMU MPU6050", "sens", 2, "sensor"], ["IMU BNO085 9 assi", "sens", 25, "sensor"], ["Encoder magnetico AS5600", "sens", 3, "sensor"], ["Encoder magnetico AS5048A 14 bit", "sens", 15, "sensor"], ["Sensore di corrente INA219", "sens", 2.5, "sensor"], ["Sensore di corrente ACS712 20 A", "sens", 2, "sensor"], ["Cella di carico + HX711", "sens", 4, "sensor"], ["Temperatura/umidità DHT22", "sens", 4, "sensor"], ["Temperatura DS18B20 impermeabile", "sens", 2, "sensor"], ["BME280 pressione/temperatura", "sens", 4, "sensor"], ["Distanza laser VL53L0X", "sens", 4, "sensor"], ["Sensore effetto Hall A3144", "sens", 0.5, "sensor"], ["Finecorsa ottico TCST2103", "sens", 1, "sensor"], ["Finecorsa meccanico con leva (modulo)", "sens", 0.8, "sensor"], ["Sensore induttivo LJ12A3 NPN", "sens", 4, "sensor"], ["Telecamera OV2640 (ESP32-CAM)", "sens", 8, "sensor"], ["Joystick analogico KY-023", "sens", 1, "sensor"], ["Modulo potenziometro 10 kΩ", "sens", 0.5, "sensor"], ["Termocoppia MAX6675 tipo K", "sens", 4, "sensor"],
    ["Display OLED 0,96\" I²C SSD1306", "hmi", 3, "display"], ["Display LCD 16×2 con I²C", "hmi", 3, "display"], ["Display TFT 2,8\" ILI9341 touch", "hmi", 9, "display"], ["Tastierino 4×4", "hmi", 1.5, "hmi"], ["Encoder rotativo KY-040", "hmi", 1, "hmi"], ["Striscia LED WS2812B 1 m 60 LED", "hmi", 6, "led"], ["Anello 16 LED WS2812", "hmi", 3, "led"], ["Buzzer attivo 5 V", "hmi", 0.5, "hmi"], ["Pulsante a fungo d'emergenza (modulo)", "hmi", 6, "hmi"],
    ["Modulo Bluetooth HC-05", "rf", 3, "rf"], ["Radio nRF24L01+ PA LNA", "rf", 3, "rf"], ["LoRa SX1276 868 MHz", "rf", 8, "rf"], ["GPS NEO-6M", "rf", 6, "rf"], ["Ricevitore IR VS1838", "rf", 0.5, "rf"],
    ["Breakout SOIC-8 → DIP", "brk", 0.4, "breakout"], ["Breakout SOT-23 → DIP", "brk", 0.3, "breakout"], ["Breakout TSSOP-20 → DIP", "brk", 0.5, "breakout"], ["Breakout QFN-32 → DIP", "brk", 0.8, "breakout"], ["Breakout USB-C femmina", "brk", 0.6, "breakout"], ["Breakout micro SD", "brk", 0.8, "breakout"], ["Morsettiera breakout per Arduino Nano", "brk", 3, "breakout"], ["Morsettiera breakout per ESP32", "brk", 4, "breakout"]
  ];
  MODS.forEach(function (M, i) {
    var L = M[1] === "mcu" ? (/Teensy|S3|Nucleo|Pico 2/.test(M[0]) ? 4 : 2) : M[1] === "rf" ? 2 : M[1] === "brk" ? 2 : 2, fin = /Teensy|Pico|XIAO|S3|Nucleo|TMC|ODrive/.test(M[0]) ? "enig" : "hasllf";
    var id = "mod-" + M[1] + "-" + M[0].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    add({ id: id, cat: "mod", sub: M[3], layers: L, mat: "fr4", th: 1.6, cu: /BTS|DM542|ODrive|ESC|AOD|24 V/.test(M[0]) ? 2 : 1, fin: fin, mask: MASK[(i * 3) % MASK.length][0], color: MASK[(i * 3) % MASK.length][1], w: 0, h: 0, name: M[0], price: M[2], qty: "1 pz", lead: 2, tags: ["modulo", M[3], M[1]], desc: "Modulo pronto: si salda su millefori o si monta su breadboard / PCB madre con strip pin." });
  });
  /* varianti dei moduli: con strip pin già saldati o da saldare (esercizio di saldatura) */
  MODS.forEach(function (M) {
    var id = "mod-" + M[1] + "-" + M[0].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-kit";
    add({ id: id, cat: "kit", sub: M[3], layers: 2, mat: "fr4", th: 1.6, cu: 1, fin: "hasllf", mask: "verde", color: "#1f7a3a", w: 0, h: 0, name: M[0] + " · kit da saldare (strip pin sciolti)", price: rp(M[2] * 0.9), qty: "1 pz", lead: 2, tags: ["kit", "da saldare", M[3]], desc: "Strip pin e morsetti da saldare: ottimo per allenarsi sulla Tavola." });
  });
  var CATN = { fab: "Fabbricazione su misura", proto: "Millefori e basette", mod: "Moduli pronti", kit: "Kit da saldare" };
  function query(o) {
    o = o || {}; var q = (o.q || "").toLowerCase().trim().split(/\s+/).filter(Boolean);
    var out = LIST.filter(function (p) {
      if (o.cat && p.cat !== o.cat) return false; if (o.layers && p.layers !== +o.layers) return false; if (o.mat && p.mat !== o.mat) return false;
      if (o.fin && p.fin !== o.fin) return false; if (o.cu && p.cu !== +o.cu) return false; if (o.th && Math.abs(p.th - o.th) > 1e-6) return false; if (o.maxPrice && p.price > o.maxPrice) return false;
      for (var i = 0; i < q.length; i++) if (p.search.indexOf(q[i]) < 0) return false; return true;
    });
    if (o.sort === "price") out.sort(function (a, b) { return a.price - b.price; }); else if (o.sort === "-price") out.sort(function (a, b) { return b.price - a.price; });
    return out;
  }
  var byId = {}; LIST.forEach(function (p) { byId[p.id] = p; });
  var API = { LIST: LIST, MAT: MAT, FIN: FIN, MASK: MASK, CATN: CATN, query: query, get: function (id) { return byId[id]; }, count: LIST.length };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.PCB = API;
})(typeof window !== "undefined" ? window : this);
