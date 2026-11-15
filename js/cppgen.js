/* Genera uno sketch C++ di partenza dal braccio costruito nel gioco */
(function (root) {
  "use strict";
  var PINS = {
    uno: { intr: [2, 3], io: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] },
    mega: { intr: [2, 3, 18, 19], io: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53] },
    esp32: { intr: [34, 35, 36, 39], io: [13, 14, 16, 17, 18, 19, 23, 25, 26, 27, 32, 33, 4, 5, 12, 15, 2] },
    stm32: { intr: [], io: [] },
    teensy41: { intr: [], io: [] }
  };
  for (var p = 2; p < 50; p++) PINS.stm32.io.push(p);
  for (p = 2; p < 42; p++) if (p !== 18 && p !== 19) PINS.teensy41.io.push(p);
  var LIM = { yaw: [-170, 170], pitch: [-10, 95], roll: [-180, 180] };
  function f(x, d) { return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); }

  function generate(build, r, mission) {
    var mcu = r.mcu, E = build.elec;
    if (mcu.id === "ipc") return genPC(build, r, mission);
    var pins = PINS[mcu.id] || PINS.mega, io = pins.io.slice(), intr = pins.intr.slice();
    function take() { return io.length ? io.shift() : 99; }
    function takeInt() { if (intr.length) return intr.shift(); return take(); }
    var n = build.axes, ax = [], anySD = false, anySv = false, anyPca = false, anyDC = false, anyBus = false;
    r.J.forEach(function (o, k) {
      var a = { k: k, name: o.name, kind: o.kind, ratio: o.i, lim: LIM[o.kind] };
      if (o.kind === "pitch" && k === 2) a.lim = [-135, 135];
      if (o.kind === "pitch" && k >= 3) a.lim = [-120, 120];
      a.vmax = mission.speed || 60; a.acc = a.vmax / (mission.tAcc || 0.5);
      a.torque = o.torqueLimit;
      if (o.M.type === "servo_hobby") { if (o.iface === "i2c") { a.t = "PCA"; a.ch = k; anyPca = true; } else { a.t = "SERVO"; a.pin = take(); anySv = true; } }
      else if (o.iface === "stepdir") { a.t = "STEPDIR"; a.step = take(); a.dir = take(); a.en = take(); a.spr = o.M.type === "ac" ? 1000 : 200 * (+E.micro || 16); anySD = true; }
      else if (o.iface === "pwmdir") { a.t = "DC"; a.pa = take(); a.pb = take(); a.encA = takeInt(); a.encB = takeInt(); a.cpr = o.Enc.cpr || 2400; a.encOut = !!o.encOut; anyDC = true; }
      else { a.t = "BUS"; a.bus = o.iface; anyBus = true; }
      a.home = E.homing !== "none" && a.t !== "SERVO" && a.t !== "PCA" ? take() : 255;
      a.brake = o.brakeRelay ? take() : 255;
      ax.push(a);
    });
    var estop = take();
    var esp = mcu.id === "esp32";
    var L = [];
    L.push("// =====================================================================");
    L.push("// XENTRIQ INDUSTRY · Braccio Lab — sketch di partenza generato dal gioco");
    L.push("// Missione: " + mission.title + " · " + n + " assi · scheda: " + mcu.name);
    L.push("// Controlla OGNI pin sul tuo schema prima di caricare. Prova prima senza carico,");
    L.push("// a bassa velocità, con il fungo di emergenza a portata di mano.");
    L.push("// =====================================================================");
    L.push("#include <Arduino.h>");
    if (anySD) L.push("#include <AccelStepper.h>      // libreria AccelStepper (Mike McCauley)");
    if (anySv) L.push(esp ? "#include <ESP32Servo.h>" : "#include <Servo.h>");
    if (anyPca) { L.push("#include <Wire.h>"); L.push("#include <Adafruit_PWMServoDriver.h>"); }
    L.push("#include <stdlib.h>");
    L.push("#include <string.h>");
    L.push("");
    L.push("const uint8_t N_ASSI = " + n + ";");
    L.push("enum TipoAsse : uint8_t { STEPDIR, SERVO_PWM, SERVO_PCA, DC_PID, BUS };");
    L.push("struct ConfigAsse {");
    L.push("  const char* nome; TipoAsse tipo;");
    L.push("  float rapporto;        // riduttore");
    L.push("  float passiGiro;       // impulsi per giro motore (stepper: 200 × microstep; servo AC: riduttore elettronico del drive)");
    L.push("  float velMax, accMax;  // °/s e °/s² al giunto");
    L.push("  float limMin, limMax;  // limiti software (gradi)");
    L.push("  float coppiaMaxMotore; // N·m lato motore da impostare nel drive (0 = non serve)");
    L.push("  uint8_t pinA, pinB, pinEn, pinHome, pinFreno;");
    L.push("};");
    L.push("const ConfigAsse CFG[N_ASSI] = {");
    ax.forEach(function (a) {
      var tipo = { STEPDIR: "STEPDIR", SERVO: "SERVO_PWM", PCA: "SERVO_PCA", DC: "DC_PID", BUS: "BUS" }[a.t];
      var pA = a.t === "STEPDIR" ? a.step : a.t === "SERVO" ? a.pin : a.t === "PCA" ? a.ch : a.t === "DC" ? a.pa : 255;
      var pB = a.t === "STEPDIR" ? a.dir : a.t === "DC" ? a.pb : 255;
      var pE = a.t === "STEPDIR" ? a.en : 255;
      L.push("  {\"" + a.name + "\", " + tipo + ", " + f(a.ratio, 1) + "f, " + f(a.spr || 0, 1) + "f, " + f(a.vmax, 1) + "f, " + f(a.acc, 1) + "f, " + f(a.lim[0], 1) + "f, " + f(a.lim[1], 1) + "f, " + (a.torque ? f(a.torque, 2) : "0.0") + "f, " + pA + ", " + pB + ", " + pE + ", " + a.home + ", " + a.brake + "},");
    });
    L.push("};");
    L.push("const uint8_t PIN_EMERGENZA = " + estop + ";   // contatto NC verso GND (aperto = emergenza)");
    L.push("// Geometria (metri) per la cinematica");
    L.push("const float H_SPALLA = " + f(r.height, 3) + "f;");
    L.push("const float LINK[N_ASSI] = {" + r.J.map(function (o) { return f(o.L, 3) + "f"; }).join(", ") + "};");
    L.push("const float UTENSILE = " + f(r.eff.L, 3) + "f;");
    L.push("");
    if (anySD) L.push("AccelStepper* ST[N_ASSI] = {" + ax.map(function () { return "nullptr"; }).join(", ") + "};");
    if (anySv) L.push("Servo SV[N_ASSI];");
    if (anyPca) L.push("Adafruit_PWMServoDriver pca(0x40);");
    L.push("float obiettivo[N_ASSI];");
    L.push("float posServo[N_ASSI];");
    L.push("bool emergenza = false;");
    L.push("bool azzerato[N_ASSI];");
    if (anyDC) {
      L.push("");
      L.push("// ---- motori DC: encoder + PID");
      L.push("volatile long encConteggio[N_ASSI];");
      L.push("volatile uint8_t encStato[N_ASSI];");
      L.push("const int8_t QEM[16] = {0, -1, 1, 0, 1, 0, 0, -1, -1, 0, 0, 1, 0, 1, -1, 0};");
      ax.forEach(function (a) {
        if (a.t !== "DC") return;
        L.push("const uint8_t ENC_A_" + a.name + " = " + a.encA + ", ENC_B_" + a.name + " = " + a.encB + ";");
        L.push("const float CONTEGGI_GRADO_" + a.name + " = " + f(a.cpr * (a.encOut ? 1 : a.ratio) / 360, 4) + "f;");
        L.push("void isr" + a.name + "() { uint8_t s = (digitalRead(ENC_A_" + a.name + ") << 1) | digitalRead(ENC_B_" + a.name + "); encConteggio[" + a.k + "] += QEM[(encStato[" + a.k + "] << 2) | s]; encStato[" + a.k + "] = s; }");
      });
      L.push("struct PID { float kp, ki, kd, outMax, integ, misPrec;");
      L.push("  float calcola(float ob, float mis, float dt) { float e = ob - mis; float d = (mis - misPrec) / dt; misPrec = mis;");
      L.push("    float u = kp * e + integ - kd * d; if (u > outMax) u = outMax; else if (u < -outMax) u = -outMax; else integ += ki * e * dt; return u; } };");
      L.push("PID pid[N_ASSI];");
      L.push("float leggiGradiDC(uint8_t i) {");
      L.push("  noInterrupts(); long c = encConteggio[i]; interrupts();");
      ax.forEach(function (a) { if (a.t === "DC") L.push("  if (i == " + a.k + ") return c / CONTEGGI_GRADO_" + a.name + ";"); });
      L.push("  return 0;");
      L.push("}");
      L.push("void pwmDC(uint8_t i, float u) {");
      L.push("  int v = (int)fabs(u); if (v > 255) v = 255;");
      L.push("  if (u >= 0) { analogWrite(CFG[i].pinB, 0); analogWrite(CFG[i].pinA, v); } else { analogWrite(CFG[i].pinA, 0); analogWrite(CFG[i].pinB, v); }");
      L.push("}");
    }
    if (anyBus) {
      L.push("");
      L.push("// ---- assi su bus (" + ax.filter(function (a) { return a.t === "BUS"; }).map(function (a) { return a.name + ": " + a.bus.toUpperCase(); }).join(", ") + ")");
      L.push("// Qui va il protocollo del drive (es. ODrive CAN: Set_Input_Pos; moteus: registro 0x020).");
      L.push("void busInviaPosizione(uint8_t asse, float gradiGiunto) { (void)asse; (void)gradiGiunto; /* TODO: invio sul bus */ }");
      L.push("void busStop() { /* TODO: comando di disabilitazione a tutti i drive */ }");
    }
    L.push("");
    L.push("float passiPerGrado(uint8_t i) { return CFG[i].passiGiro * CFG[i].rapporto / 360.0f; }");
    L.push("");
    L.push("void fermaTutto() {");
    L.push("  for (uint8_t i = 0; i < N_ASSI; i++) {");
    if (anySD) L.push("    if (ST[i]) { ST[i]->stop(); ST[i]->disableOutputs(); }");
    if (anyDC) L.push("    if (CFG[i].tipo == DC_PID) pwmDC(i, 0);");
    L.push("    if (CFG[i].pinFreno != 255) digitalWrite(CFG[i].pinFreno, LOW);   // freno a molla: senza corrente è chiuso");
    L.push("  }");
    if (anyBus) L.push("  busStop();");
    L.push("}");
    L.push("");
    L.push("void comandaAsse(uint8_t i, float gradi) {");
    L.push("  gradi = constrain(gradi, CFG[i].limMin, CFG[i].limMax);");
    L.push("  obiettivo[i] = gradi;");
    if (anySD) L.push("  if (CFG[i].tipo == STEPDIR && ST[i]) ST[i]->moveTo(lround(gradi * passiPerGrado(i)));");
    if (anyBus) L.push("  if (CFG[i].tipo == BUS) busInviaPosizione(i, gradi);");
    L.push("}");
    L.push("");
    L.push("int gradiAMicros(float deg) { return 1500 + (int)(deg * 1000.0f / 90.0f); }   // 0° = centro; tara 500–2500 µs");
    L.push("");
    L.push("// Cinematica diretta semplificata (J1 base, J2 spalla, J3 gomito, polso allineato)");
    L.push("void stampaPunta() {");
    L.push("  const float D = 3.14159265f / 180.0f;");
    L.push("  float avambraccio = UTENSILE; for (uint8_t i = 2; i < N_ASSI; i++) avambraccio += LINK[i];");
    L.push("  float q1 = obiettivo[0] * D, q2 = obiettivo[1] * D, q3 = obiettivo[2] * D;");
    L.push("  float r = LINK[1] * cosf(q2) + avambraccio * cosf(q2 + q3);");
    L.push("  float z = H_SPALLA + LINK[1] * sinf(q2) + avambraccio * sinf(q2 + q3);");
    L.push("  Serial.print(\"Punta x=\"); Serial.print(r * cosf(q1), 3); Serial.print(\" y=\"); Serial.print(r * sinf(q1), 3); Serial.print(\" z=\"); Serial.println(z, 3);");
    L.push("}");
    L.push("");
    L.push("char riga[48]; uint8_t lenRiga = 0;");
    L.push("void eseguiComando(char* c) {");
    L.push("  if (strcmp(c, \"STOP\") == 0) { emergenza = true; fermaTutto(); Serial.println(\"OK STOP\"); return; }");
    L.push("  if (strcmp(c, \"RESET\") == 0) { if (digitalRead(PIN_EMERGENZA) == LOW) { emergenza = false; Serial.println(\"OK RIARMO\"); } else Serial.println(\"ERR emergenza ancora premuta\"); return; }");
    L.push("  if (strcmp(c, \"?\") == 0) { for (uint8_t i = 0; i < N_ASSI; i++) { Serial.print(CFG[i].nome); Serial.print(\"=\"); Serial.println(obiettivo[i], 2); } stampaPunta(); return; }");
    L.push("  if (c[0] == 'J') { char* e; long a = strtol(c + 1, &e, 10); float g = (float)strtod(e, &e);");
    L.push("    if (a < 1 || a > N_ASSI) { Serial.println(\"ERR asse\"); return; }");
    L.push("    if (emergenza) { Serial.println(\"ERR in emergenza\"); return; }");
    L.push("    comandaAsse((uint8_t)(a - 1), g); Serial.println(\"OK\"); return; }");
    L.push("  Serial.println(\"ERR comando (usa: J <asse> <gradi>, STOP, RESET, ?)\");");
    L.push("}");
    L.push("");
    L.push("void setup() {");
    L.push("  Serial.begin(115200);");
    L.push("  pinMode(PIN_EMERGENZA, INPUT_PULLUP);");
    if (anyPca) { L.push("  Wire.begin();"); L.push("  pca.begin();"); L.push("  pca.setOscillatorFrequency(27000000);"); L.push("  pca.setPWMFreq(50);"); }
    L.push("  for (uint8_t i = 0; i < N_ASSI; i++) {");
    L.push("    obiettivo[i] = 0; posServo[i] = 0; azzerato[i] = (CFG[i].pinHome == 255);");
    L.push("    if (CFG[i].pinHome != 255) pinMode(CFG[i].pinHome, INPUT_PULLUP);");
    L.push("    if (CFG[i].pinFreno != 255) { pinMode(CFG[i].pinFreno, OUTPUT); digitalWrite(CFG[i].pinFreno, LOW); }");
    if (anySD) {
      L.push("    if (CFG[i].tipo == STEPDIR) {");
      L.push("      ST[i] = new AccelStepper(AccelStepper::DRIVER, CFG[i].pinA, CFG[i].pinB);");
      L.push("      ST[i]->setEnablePin(CFG[i].pinEn);");
      L.push("      ST[i]->setPinsInverted(false, false, true);");
      L.push("      ST[i]->setMinPulseWidth(5);   // µs: i driver optoisolati vogliono impulsi lunghi");
      L.push("      ST[i]->setMaxSpeed(CFG[i].velMax * passiPerGrado(i));");
      L.push("      ST[i]->setAcceleration(CFG[i].accMax * passiPerGrado(i));");
      L.push("      ST[i]->enableOutputs();");
      L.push("    }");
    }
    if (anySv) L.push("    if (CFG[i].tipo == SERVO_PWM) { SV[i].attach(CFG[i].pinA, 500, 2500); SV[i].writeMicroseconds(gradiAMicros(0)); }");
    if (anyDC) L.push("    if (CFG[i].tipo == DC_PID) { pinMode(CFG[i].pinA, OUTPUT); pinMode(CFG[i].pinB, OUTPUT); pid[i] = PID{4.0f, 1.0f, 0.05f, 255.0f, 0, 0}; }");
    L.push("  }");
    ax.forEach(function (a) { if (a.t === "DC") { L.push("  pinMode(ENC_A_" + a.name + ", INPUT_PULLUP); pinMode(ENC_B_" + a.name + ", INPUT_PULLUP);"); L.push("  attachInterrupt(digitalPinToInterrupt(ENC_A_" + a.name + "), isr" + a.name + ", CHANGE);"); L.push("  attachInterrupt(digitalPinToInterrupt(ENC_B_" + a.name + "), isr" + a.name + ", CHANGE);"); } });
    ax.forEach(function (a) { if (a.torque) L.push("  // " + a.name + ": imposta nel drive il limite di coppia a " + f(a.torque, 2) + " N·m lato motore (protegge il riduttore)."); });
    L.push("  Serial.println(\"Pronto. Comandi: J <asse> <gradi> | STOP | RESET | ?\");");
    L.push("}");
    L.push("");
    L.push("void loop() {");
    L.push("  // 1) emergenza: prima di tutto");
    L.push("  if (digitalRead(PIN_EMERGENZA) == HIGH && !emergenza) { emergenza = true; fermaTutto(); Serial.println(\"EMERGENZA\"); }");
    L.push("  // 2) comandi dalla seriale (non bloccante)");
    L.push("  while (Serial.available() > 0) { char ch = (char)Serial.read();");
    L.push("    if (ch == '\\r') continue;");
    L.push("    if (ch == '\\n') { riga[lenRiga] = 0; if (lenRiga) eseguiComando(riga); lenRiga = 0; }");
    L.push("    else if (lenRiga < sizeof(riga) - 1) riga[lenRiga++] = ch; else lenRiga = 0; }");
    L.push("  if (emergenza) return;");
    L.push("  // 3) homing degli assi con finecorsa (va piano in negativo fino al finecorsa NC)");
    L.push("  for (uint8_t i = 0; i < N_ASSI; i++) {");
    L.push("    if (azzerato[i]) continue;");
    if (anySD) L.push("    if (ST[i]) { if (digitalRead(CFG[i].pinHome) == HIGH) { ST[i]->setCurrentPosition(lround(CFG[i].limMin * passiPerGrado(i))); azzerato[i] = true; comandaAsse(i, 0); } else { ST[i]->setSpeed(-0.1f * CFG[i].velMax * passiPerGrado(i)); ST[i]->runSpeed(); } }");
    L.push("    else azzerato[i] = true;");
    L.push("  }");
    L.push("  // 4) movimento");
    L.push("  static unsigned long tPrec = micros();");
    L.push("  unsigned long ora = micros(); float dt = (ora - tPrec) * 1e-6f;");
    L.push("  bool tick = dt >= 0.001f; if (tick) tPrec = ora;");
    L.push("  for (uint8_t i = 0; i < N_ASSI; i++) {");
    L.push("    if (CFG[i].pinFreno != 255) digitalWrite(CFG[i].pinFreno, HIGH);   // freno aperto quando l'asse è attivo");
    if (anySD) L.push("    if (CFG[i].tipo == STEPDIR && ST[i] && azzerato[i]) ST[i]->run();");
    L.push("    if (!tick) continue;");
    if (anySv || anyPca) {
      L.push("    if (CFG[i].tipo == SERVO_PWM || CFG[i].tipo == SERVO_PCA) {   // rampa di velocità");
      L.push("      float passo = CFG[i].velMax * dt, d = obiettivo[i] - posServo[i];");
      L.push("      if (d > passo) d = passo; if (d < -passo) d = -passo; posServo[i] += d;");
      if (anySv) L.push("      if (CFG[i].tipo == SERVO_PWM) SV[i].writeMicroseconds(gradiAMicros(posServo[i]));");
      if (anyPca) L.push("      if (CFG[i].tipo == SERVO_PCA) pca.writeMicroseconds(CFG[i].pinA, gradiAMicros(posServo[i]));");
      L.push("    }");
    }
    if (anyDC) L.push("    if (CFG[i].tipo == DC_PID) pwmDC(i, pid[i].calcola(obiettivo[i], leggiGradiDC(i), dt));");
    L.push("  }");
    L.push("}");
    return L.join("\n") + "\n";
  }

  function genPC(build, r, mission) {
    var L = [];
    L.push("// XENTRIQ INDUSTRY · Braccio Lab — scheletro C++17 per PC industriale (master EtherCAT)");
    L.push("// Missione: " + mission.title + ". Collega SOEM (github.com/OpenEtherCATsociety/SOEM) dove indicato TODO.");
    L.push("#include <array>");
    L.push("#include <cmath>");
    L.push("#include <cstdio>");
    L.push("#include <chrono>");
    L.push("#include <thread>");
    L.push("");
    L.push("constexpr int N_ASSI = " + build.axes + ";");
    L.push("struct ConfigAsse { const char* nome; double rapporto, velMax, accMax, limMin, limMax, coppiaMaxMotore; };");
    L.push("constexpr std::array<ConfigAsse, N_ASSI> CFG{{");
    r.J.forEach(function (o, k) {
      var lim = LIM[o.kind]; if (o.kind === "pitch" && k === 2) lim = [-135, 135]; if (o.kind === "pitch" && k >= 3) lim = [-120, 120];
      var v = mission.speed || 60;
      L.push("  {\"" + o.name + "\", " + f(o.i, 1) + ", " + f(v, 1) + ", " + f(v / (mission.tAcc || 0.5), 1) + ", " + lim[0] + ", " + lim[1] + ", " + (o.torqueLimit ? f(o.torqueLimit, 2) : "0") + "},");
    });
    L.push("}};");
    L.push("");
    L.push("// Profilo trapezoidale (vedi lezione 6)");
    L.push("struct Trapezio { double d, v, a, ta, tc, T, vp;");
    L.push("  Trapezio(double dist, double vmax, double amax) : d(std::fabs(dist)), v(vmax), a(amax) {");
    L.push("    ta = v / a; double da = 0.5 * a * ta * ta;");
    L.push("    if (2 * da > d) { ta = std::sqrt(d / a); tc = 0; vp = a * ta; } else { tc = (d - 2 * da) / v; vp = v; }");
    L.push("    T = 2 * ta + tc; }");
    L.push("  double pos(double t) const { if (t <= 0) return 0; if (t < ta) return 0.5 * a * t * t;");
    L.push("    if (t < ta + tc) return 0.5 * a * ta * ta + vp * (t - ta); if (t < T) { double r = T - t; return d - 0.5 * a * r * r; } return d; } };");
    L.push("");
    L.push("bool emergenza() { return false; /* TODO: leggi l'ingresso di sicurezza (o lo stato STO) dal modulo EtherCAT */ }");
    L.push("void inviaPosizioni(const std::array<double, N_ASSI>& gradi) { (void)gradi; /* TODO: scrivi 0x607A (target position) in modalità CSP, poi ec_send_processdata() */ }");
    L.push("");
    L.push("int main() {");
    L.push("  // TODO: ec_init(\"eth0\"), ec_config_init(), passa i drive in OPERATIONAL, imposta 0x6072 (max torque)");
    L.push("  std::array<double, N_ASSI> da{}, a{}, q{};");
    L.push("  a[1] = 30.0; a[2] = -45.0;   // esempio di movimento");
    L.push("  double Tmax = 0;");
    L.push("  std::array<Trapezio, N_ASSI> tr{{" + r.J.map(function (o, k) { return "Trapezio(a[" + k + "] - da[" + k + "] + 1e-9, CFG[" + k + "].velMax, CFG[" + k + "].accMax)"; }).join(", ") + "}};");
    L.push("  for (auto& t : tr) Tmax = std::fmax(Tmax, t.T);");
    L.push("  const double dt = 0.001;   // ciclo EtherCAT 1 ms");
    L.push("  for (double t = 0; t <= Tmax + dt; t += dt) {");
    L.push("    if (emergenza()) { std::puts(\"EMERGENZA\"); return 1; }");
    L.push("    for (int i = 0; i < N_ASSI; i++) { double s = a[i] >= da[i] ? 1 : -1; q[i] = da[i] + s * tr[i].pos(t); }");
    L.push("    inviaPosizioni(q);");
    L.push("    // std::this_thread::sleep_for(std::chrono::microseconds(1000));  // sostituisci con un timer real-time");
    L.push("  }");
    L.push("  std::printf(\"Movimento completato in %.3f s\\n\", Tmax);");
    L.push("  return 0;");
    L.push("}");
    return L.join("\n") + "\n";
  }
  var api = { generate: generate };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.GEN = api;
})(this);
