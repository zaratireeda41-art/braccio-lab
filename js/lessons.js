/* Lezioni di C++ per Arduino/ESP32 — il codice è controllato con un compilatore (vedi tests/cpp-check.js) */
(function (root) {
  "use strict";
  var L = [];
  L.push({ id: "base", title: "1 · Com'è fatto uno sketch", tag: "Arduino",
    text: "<p>Uno sketch Arduino è C++ con due funzioni obbligatorie: <code>setup()</code> gira una volta all'accensione, <code>loop()</code> gira all'infinito. Per un robot la regola d'oro è <b>mai bloccare il loop</b>: niente <code>delay()</code> lunghi, perché mentre aspetti non leggi l'emergenza né gli encoder. Si usa <code>millis()</code>/<code>micros()</code> per fare le cose a tempo.</p>",
    code: `#include <Arduino.h>

const uint8_t PIN_LED = 13;
const unsigned long PERIODO_MS = 500;   // ogni quanto cambiare stato
unsigned long ultimo = 0;
bool acceso = false;

void setup() {
  pinMode(PIN_LED, OUTPUT);
  Serial.begin(115200);
  Serial.println("Avvio");
}

void loop() {
  unsigned long ora = millis();
  if (ora - ultimo >= PERIODO_MS) {     // funziona anche quando millis() riparte da zero
    ultimo = ora;
    acceso = !acceso;
    digitalWrite(PIN_LED, acceso ? HIGH : LOW);
  }
  // qui il loop resta libero: puoi leggere sensori ed emergenza
}
` });
  L.push({ id: "servo", title: "2 · Servo hobby con PWM", tag: "Servo",
    text: "<p>Un servo hobby vuole un impulso ogni 20 ms: 1000 µs ≈ 0°, 2000 µs ≈ 180° (molti servo usano 500–2500 µs). Muovere il servo di colpo al valore finale crea strappi e picchi di corrente: meglio avvicinarsi a passi piccoli. <b>Alimenta i servo con un alimentatore a parte</b> (6 V, molti ampere) e collega le masse insieme.</p>",
    code: `#include <Arduino.h>
#include <Servo.h>           // su ESP32 usa <ESP32Servo.h>, stessa interfaccia

Servo spalla;
const uint8_t PIN_SERVO = 9;
const int US_MIN = 500, US_MAX = 2500;   // taratura del tuo servo
float angolo = 90.0f;                    // posizione attuale (gradi)
float obiettivo = 90.0f;
const float VEL_DEG_S = 60.0f;           // velocità massima
unsigned long tPrec = 0;

int gradiAMicros(float deg) {
  deg = constrain(deg, 0.0f, 180.0f);
  return US_MIN + (int)((US_MAX - US_MIN) * deg / 180.0f);
}

void setup() {
  spalla.attach(PIN_SERVO, US_MIN, US_MAX);
  spalla.writeMicroseconds(gradiAMicros(angolo));
  tPrec = millis();
}

void loop() {
  unsigned long ora = millis();
  float dt = (ora - tPrec) / 1000.0f;
  if (dt < 0.02f) return;                // aggiorna ogni 20 ms
  tPrec = ora;
  float passo = VEL_DEG_S * dt;
  float diff = obiettivo - angolo;
  if (diff > passo) diff = passo;
  if (diff < -passo) diff = -passo;
  angolo += diff;
  spalla.writeMicroseconds(gradiAMicros(angolo));
  if (fabs(obiettivo - angolo) < 0.1f) obiettivo = (obiettivo > 90.0f) ? 30.0f : 150.0f;  // demo avanti-indietro
}
` });
  L.push({ id: "stepper", title: "3 · Stepper con AccelStepper", tag: "Stepper",
    text: "<p><code>AccelStepper</code> genera gli impulsi STEP/DIR con rampe di accelerazione. Il punto chiave è convertire i gradi del giunto in passi: <b>passi = gradi / 360 × 200 × microstep × rapporto</b>. <code>run()</code> va chiamata il più spesso possibile: un solo passo per chiamata.</p>",
    code: `#include <Arduino.h>
#include <AccelStepper.h>

const uint8_t PIN_STEP = 2, PIN_DIR = 5, PIN_EN = 8;
const float PASSI_GIRO = 200.0f;   // motore da 1,8°
const float MICROSTEP = 8.0f;
const float RAPPORTO = 20.0f;      // riduttore planetario 20:1
const float PASSI_PER_GRADO = PASSI_GIRO * MICROSTEP * RAPPORTO / 360.0f;

AccelStepper spalla(AccelStepper::DRIVER, PIN_STEP, PIN_DIR);

long gradiAPassi(float deg) { return lround(deg * PASSI_PER_GRADO); }

void setup() {
  spalla.setEnablePin(PIN_EN);
  spalla.setPinsInverted(false, false, true);    // ENABLE attivo basso
  spalla.enableOutputs();
  spalla.setMaxSpeed(45.0f * PASSI_PER_GRADO);    // 45 °/s al giunto
  spalla.setAcceleration(90.0f * PASSI_PER_GRADO); // 90 °/s²
  spalla.moveTo(gradiAPassi(30.0f));
}

void loop() {
  spalla.run();                                   // non bloccante
  if (spalla.distanceToGo() == 0) {
    float pos = spalla.currentPosition() / PASSI_PER_GRADO;
    spalla.moveTo(gradiAPassi(pos > 0 ? -30.0f : 30.0f));
  }
}
` });
  L.push({ id: "encoder", title: "4 · Leggere un encoder in quadratura", tag: "Encoder",
    text: "<p>Un encoder incrementale dà due onde A e B sfasate di 90°. Leggendo i fronti di entrambe si ottengono 4 conteggi per impulso (×4). La tabella qui sotto ignora i rimbalzi impossibili. Sulle schede AVR solo alcuni pin hanno l'interrupt (Uno: 2 e 3); ESP32, STM32 e Teensy hanno contatori hardware che non caricano la CPU.</p>",
    code: `#include <Arduino.h>

const uint8_t PIN_A = 2, PIN_B = 3;
const long CONTEGGI_GIRO = 2400;        // 600 PPR × 4
volatile long conteggio = 0;
volatile uint8_t statoPrec = 0;
// tabella di transizione: indice = (vecchio<<2)|nuovo
const int8_t QEM[16] = {0, -1, 1, 0, 1, 0, 0, -1, -1, 0, 0, 1, 0, 1, -1, 0};

void isrEncoder() {
  uint8_t s = (digitalRead(PIN_A) << 1) | digitalRead(PIN_B);
  conteggio += QEM[(statoPrec << 2) | s];
  statoPrec = s;
}

long leggiConteggio() {               // copia atomica di una variabile a 32 bit
  noInterrupts();
  long c = conteggio;
  interrupts();
  return c;
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_A, INPUT_PULLUP);
  pinMode(PIN_B, INPUT_PULLUP);
  statoPrec = (digitalRead(PIN_A) << 1) | digitalRead(PIN_B);
  attachInterrupt(digitalPinToInterrupt(PIN_A), isrEncoder, CHANGE);
  attachInterrupt(digitalPinToInterrupt(PIN_B), isrEncoder, CHANGE);
}

void loop() {
  static unsigned long t = 0;
  if (millis() - t >= 200) {
    t = millis();
    float gradi = leggiConteggio() * 360.0f / CONTEGGI_GIRO;
    Serial.println(gradi, 2);
  }
}
` });
  L.push({ id: "pid", title: "5 · Anello PID di posizione (motore DC)", tag: "Controllo",
    text: "<p>Il PID calcola quanta tensione dare al motore: <b>P</b> spinge in proporzione all'errore, <b>I</b> elimina l'errore residuo (es. la gravità), <b>D</b> frena le oscillazioni. Tre accorgimenti da robot vero: periodo fisso (qui 1 kHz), derivata sulla misura (niente colpi quando cambi obiettivo) e anti-windup sull'integrale. Taratura: parti con I = D = 0, alza P finché oscilla, poi aggiungi D e infine un po' di I.</p>",
    code: `#include <Arduino.h>

struct PID {
  float kp, ki, kd, outMax;
  float integ = 0, misPrec = 0;
  bool primo = true;
  float calcola(float obiettivo, float misura, float dt) {
    float err = obiettivo - misura;
    float deriv = primo ? 0 : (misura - misPrec) / dt;   // derivata sulla misura
    primo = false;
    misPrec = misura;
    float u = kp * err + integ - kd * deriv;
    if (u > outMax) u = outMax;
    else if (u < -outMax) u = -outMax;
    else integ += ki * err * dt;                           // anti-windup: integra solo se non saturo
    return u;
  }
};

const uint8_t PIN_RPWM = 5, PIN_LPWM = 6;   // ponte H BTS7960
PID pid{4.0f, 1.5f, 0.08f, 255.0f};
volatile long encConteggio = 0;              // aggiornato dalla ISR della lezione 4
const float GRADI_PER_CONTEGGIO = 360.0f / (2400.0f * 50.0f);  // encoder sul motore, riduttore 50:1
float obiettivoDeg = 45.0f;

void comandaMotore(float u) {
  int pwm = (int)fabs(u);
  if (u >= 0) { analogWrite(PIN_LPWM, 0); analogWrite(PIN_RPWM, pwm); }
  else        { analogWrite(PIN_RPWM, 0); analogWrite(PIN_LPWM, pwm); }
}

void setup() {
  pinMode(PIN_RPWM, OUTPUT);
  pinMode(PIN_LPWM, OUTPUT);
}

void loop() {
  static unsigned long tPrec = micros();
  unsigned long ora = micros();
  if (ora - tPrec < 1000) return;              // 1 kHz
  float dt = (ora - tPrec) * 1e-6f;
  tPrec = ora;
  noInterrupts(); long c = encConteggio; interrupts();
  float misura = c * GRADI_PER_CONTEGGIO;
  comandaMotore(pid.calcola(obiettivoDeg, misura, dt));
}
` });
  L.push({ id: "trap", title: "6 · Profilo di velocità trapezoidale", tag: "Traiettorie", pure: true,
    text: "<p>Per non strappare il braccio la velocità sale con accelerazione costante, resta costante e poi scende. Se il tratto è corto il trapezio diventa un triangolo. Questa funzione è C++ puro: la stessa gira su Arduino e su PC (dove l'ho provata).</p>",
    code: `#include <cmath>

// Profilo trapezoidale: da 0 a 'dist' con velocità massima vmax e accelerazione amax
struct Trapezio {
  double dist, vmax, amax, ta, tc, T, vpk;
  Trapezio(double d, double v, double a) : dist(std::fabs(d)), vmax(v), amax(a) {
    ta = vmax / amax;                       // tempo di accelerazione
    double da = 0.5 * amax * ta * ta;       // spazio in accelerazione
    if (2 * da > dist) {                    // non arriva a vmax: triangolo
      ta = std::sqrt(dist / amax);
      tc = 0;
      vpk = amax * ta;
    } else {
      tc = (dist - 2 * da) / vmax;
      vpk = vmax;
    }
    T = 2 * ta + tc;
  }
  // posizione al tempo t (stesso segno di d)
  double pos(double t, double segno = 1) const {
    double s;
    if (t <= 0) s = 0;
    else if (t < ta) s = 0.5 * amax * t * t;
    else if (t < ta + tc) s = 0.5 * amax * ta * ta + vpk * (t - ta);
    else if (t < T) { double r = T - t; s = dist - 0.5 * amax * r * r; }
    else s = dist;
    return segno * s;
  }
  double vel(double t) const {
    if (t <= 0 || t >= T) return 0;
    if (t < ta) return amax * t;
    if (t < ta + tc) return vpk;
    return amax * (T - t);
  }
};
` });
  L.push({ id: "fk", title: "7 · Cinematica diretta (base + 2 link)", tag: "Cinematica", pure: true,
    text: "<p>La cinematica diretta risponde a: <i>dati gli angoli dei giunti, dov'è la punta?</i> Per un braccio con base che ruota (θ1), spalla (θ2) ed gomito (θ3) nel piano verticale: <b>r = L2·cos θ2 + L3·cos(θ2+θ3)</b>, <b>z = H + L2·sin θ2 + L3·sin(θ2+θ3)</b>, poi x = r·cos θ1, y = r·sin θ1.</p>",
    code: `#include <cmath>

struct Punto { double x, y, z; };
struct Braccio3 { double H, L2, L3; };   // altezza spalla, lunghezze link (metri)

const double DEG = M_PI / 180.0;

Punto cinematicaDiretta(const Braccio3& b, double t1, double t2, double t3) {  // angoli in radianti
  double r = b.L2 * std::cos(t2) + b.L3 * std::cos(t2 + t3);
  double z = b.H + b.L2 * std::sin(t2) + b.L3 * std::sin(t2 + t3);
  return { r * std::cos(t1), r * std::sin(t1), z };
}
` });
  L.push({ id: "ik", title: "8 · Cinematica inversa (base + 2 link)", tag: "Cinematica", pure: true,
    text: "<p>La cinematica inversa fa il contrario: <i>voglio la punta qui, che angoli servono?</i> θ1 = atan2(y, x); nel piano verticale si usa il teorema del coseno: <b>cos θ3 = (r² + s² − L2² − L3²) / (2·L2·L3)</b>. Se |cos θ3| &gt; 1 il punto è fuori portata. Ci sono due soluzioni: gomito alto e gomito basso.</p>",
    code: `#include <cmath>

struct Punto { double x, y, z; };
struct Braccio3 { double H, L2, L3; };
struct Angoli { double t1, t2, t3; bool ok; };

Angoli cinematicaInversa(const Braccio3& b, Punto p, bool gomitoAlto = true) {
  Angoli a{0, 0, 0, false};
  a.t1 = std::atan2(p.y, p.x);
  double r = std::sqrt(p.x * p.x + p.y * p.y);
  double s = p.z - b.H;
  double c3 = (r * r + s * s - b.L2 * b.L2 - b.L3 * b.L3) / (2 * b.L2 * b.L3);
  if (c3 < -1.0 || c3 > 1.0) return a;             // fuori portata
  double s3 = std::sqrt(1.0 - c3 * c3) * (gomitoAlto ? -1.0 : 1.0);
  a.t3 = std::atan2(s3, c3);
  a.t2 = std::atan2(s, r) - std::atan2(b.L3 * s3, b.L2 + b.L3 * c3);
  a.ok = true;
  return a;
}
` });
  L.push({ id: "safety", title: "9 · Emergenza, finecorsa e homing", tag: "Sicurezza",
    text: "<p>Il software <b>non sostituisce</b> l'arresto di emergenza cablato (fungo + contattore o STO): serve solo a fermarsi in modo ordinato e a non ripartire da solo. Fungo e finecorsa si collegano <b>normalmente chiusi</b>: se un filo si stacca, il circuito si apre e la macchina si ferma (sicurezza positiva). L'homing porta ogni asse sul suo finecorsa per sapere dove si trova.</p>",
    code: `#include <Arduino.h>
#include <AccelStepper.h>

const uint8_t PIN_ESTOP = 7;      // contatto NC verso GND: aperto = emergenza
const uint8_t PIN_HOME = 9;       // finecorsa NC verso GND
AccelStepper asse(AccelStepper::DRIVER, 2, 5);

enum Stato { AVVIO, HOMING, PRONTO, EMERGENZA };
Stato stato = AVVIO;

bool emergenzaAttiva() { return digitalRead(PIN_ESTOP) == HIGH; }   // pull-up: filo aperto = HIGH
bool finecorsa() { return digitalRead(PIN_HOME) == HIGH; }

void setup() {
  Serial.begin(115200);
  pinMode(PIN_ESTOP, INPUT_PULLUP);
  pinMode(PIN_HOME, INPUT_PULLUP);
  asse.setMaxSpeed(800);
  asse.setAcceleration(2000);
}

void loop() {
  if (emergenzaAttiva() && stato != EMERGENZA) {
    asse.setSpeed(0);
    asse.stop();
    asse.disableOutputs();
    stato = EMERGENZA;
    Serial.println("EMERGENZA: riarmo manuale richiesto");
  }
  switch (stato) {
    case AVVIO:
      asse.enableOutputs();
      asse.setSpeed(-200);          // va piano verso il finecorsa
      stato = HOMING;
      break;
    case HOMING:
      if (finecorsa()) {
        asse.setCurrentPosition(0);   // zero meccanico trovato
        asse.moveTo(100);             // si stacca dal finecorsa
        stato = PRONTO;
      } else {
        asse.runSpeed();
      }
      break;
    case PRONTO:
      asse.run();
      break;
    case EMERGENZA:
      // resta fermo finché l'operatore non riarma e scrive "RESET"
      if (!emergenzaAttiva() && Serial.available() && Serial.read() == 'R') stato = AVVIO;
      break;
  }
}
` });
  L.push({ id: "serial", title: "10 · Comandi dalla seriale", tag: "Comunicazione",
    text: "<p>Un piccolo interprete di comandi permette di muovere il braccio dal PC: <code>J 2 45.5</code> porta il giunto 2 a 45,5°, <code>STOP</code> ferma tutto, <code>?</code> stampa le posizioni. Si legge un carattere alla volta senza bloccare, si accumula una riga e la si interpreta quando arriva l'invio. Ogni valore va controllato contro i limiti dell'asse prima di muovere.</p>",
    code: `#include <Arduino.h>
#include <stdlib.h>
#include <string.h>

const uint8_t N = 3;
float obiettivo[N] = {0, 0, 0};
const float LIM_MIN[N] = {-170, -10, -120};
const float LIM_MAX[N] = { 170,  95,  120};
char riga[40];
uint8_t len = 0;

void esegui(char* cmd) {
  if (strcmp(cmd, "STOP") == 0) { Serial.println("OK STOP"); return; }
  if (strcmp(cmd, "?") == 0) {
    for (uint8_t i = 0; i < N; i++) { Serial.print("J"); Serial.print(i + 1); Serial.print("="); Serial.println(obiettivo[i], 2); }
    return;
  }
  if (cmd[0] == 'J') {
    char* fine;
    long asse = strtol(cmd + 1, &fine, 10);
    float gradi = (float)strtod(fine, &fine);
    if (asse < 1 || asse > N) { Serial.println("ERR asse"); return; }
    if (gradi < LIM_MIN[asse - 1] || gradi > LIM_MAX[asse - 1]) { Serial.println("ERR fuori limiti"); return; }
    obiettivo[asse - 1] = gradi;
    Serial.println("OK");
    return;
  }
  Serial.println("ERR comando");
}

void setup() { Serial.begin(115200); }

void loop() {
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\\r') continue;
    if (c == '\\n') { riga[len] = 0; if (len) esegui(riga); len = 0; }
    else if (len < sizeof(riga) - 1) riga[len++] = c;
    else len = 0;                       // riga troppo lunga: scarta
  }
  // ... qui muovi gli assi verso obiettivo[] (lezioni 3 e 6)
}
` });
  L.push({ id: "plc", title: "11 · PLC o microcontrollore? Ladder e Structured Text", tag: "PLC", lang: "st",
    text: "<p>Un <b>microcontrollore</b> (Arduino, ESP32, STM32) è una scheda a 3,3–5 V che programmi in C++: costa poco, è velocissimo e fa tutto quello che scrivi, ma ingressi e uscite sono delicati e la sicurezza è tutta sulle tue spalle. Un <b>PLC</b> (Siemens S7-1200, Allen-Bradley Micro800, Omron, Beckhoff) è un computer industriale a <b>24 V</b>: ingressi optoisolati che reggono i disturbi, uscite che accendono valvole e relè, ciclo di scansione deterministico, diagnostica, e si programma con i linguaggi della norma <b>IEC 61131-3</b>.</p>" +
      "<table class=\"cmp\"><tr><th></th><th>Microcontrollore</th><th>PLC</th></tr><tr><td>Tensione I/O</td><td>3,3–5 V</td><td>24 V</td></tr><tr><td>Linguaggio</td><td>C/C++</td><td>Ladder (LD), Structured Text (ST), FBD, SFC</td></tr><tr><td>Assi</td><td>step/dir via software</td><td>uscite PTO (S7-1200: 4 × 100 kHz) o drive su bus (PROFINET, EtherCAT)</td></tr><tr><td>Ciclo</td><td>loop() libero</td><td>scansione: leggi ingressi → esegui → scrivi uscite (1–10 ms)</td></tr><tr><td>Costo tipico</td><td>10–40 €</td><td>120–1100 € + software</td></tr></table>" +
      "<p><b>Ladder</b> (a contatti) disegna la logica come un circuito a relè: a sinistra la barra +24 V, a destra lo 0 V. Ogni riga (<i>rung</i>) accende una bobina. Con una valvola 5/2 <b>bistabile</b> basta un impulso per bobina; se l\'emergenza toglie il consenso nessuna bobina si eccita e la pinza resta com\'è: il pezzo non cade.</p>" +
      "<pre class=\"ladder\">     iEmergenzaOK   iChiudi                     qBobinaChiudi\n|──────┤ ├──────────┤ ├───────────────────────────( )──────|\n\n     iEmergenzaOK   iChiudi                     qBobinaApri\n|──────┤ ├──────────┤/├───────────────────────────( )──────|\n\n     iPinzaChiusa   qBobinaChiudi   tTimeout.Q qAllarme\n|──────┤/├──────────┤ ├──────────────┤ ├──────────(S)──────|\n\n ┤ ├ contatto aperto (TRUE se l\'ingresso è acceso)   ┤/├ contatto chiuso (negato)\n ( ) bobina   (S) bobina che resta accesa finché non la resetti</pre>" +
      "<p>Lo stesso in <b>Structured Text</b>, il linguaggio testuale della IEC 61131-3 (simile al Pascal): con una macchina a stati e i blocchi standard <code>TON</code> (timer) e <code>R_TRIG</code> (fronte). <b>Attenzione</b>: anche qui il software non sostituisce il relè di sicurezza. L'emergenza vera taglia la potenza in hardware (contattore o STO); il programma la legge solo per fermarsi in modo ordinato e non ripartire da solo.</p>" +
      "<p>Nel gioco: scegli un PLC in <b>Elettronica</b> (o dalla Dispensa) e la verifica conta ingressi, uscite, uscite impulsi e contatori; nella sezione C++ lo sketch diventa un programma ST.</p>",
    code: `(* Pinza pneumatica con valvola 5/2 bistabile ed emergenza - IEC 61131-3 ST *)
PROGRAM Pinza
VAR
  iEmergenzaOK  AT %I0.0 : BOOL;  (* contatto del relè di sicurezza: TRUE = tutto ok *)
  iReset        AT %I0.1 : BOOL;  (* pulsante di reset *)
  iChiudi       AT %I0.2 : BOOL;  (* comando dal programma del robot *)
  iPinzaChiusa  AT %I0.3 : BOOL;  (* sensore magnetico sulla pinza *)
  iPinzaAperta  AT %I0.4 : BOOL;
  qBobinaChiudi AT %Q0.0 : BOOL;  (* bobina 14 della valvola *)
  qBobinaApri   AT %Q0.1 : BOOL;  (* bobina 12 della valvola *)
  qAllarme      AT %Q0.2 : BOOL;
  Stato : INT := 0;              (* 0 attesa reset, 10 aperta, 20 chiusura, 30 chiusa, 40 apertura, 99 allarme *)
  tTimeout : TON;
  fReset : R_TRIG;
END_VAR

fReset(CLK := iReset);

(* L'emergenza ha la precedenza: la valvola bistabile resta dov'è, il pezzo non cade *)
IF NOT iEmergenzaOK THEN
  qBobinaChiudi := FALSE;
  qBobinaApri := FALSE;
  IF Stato <> 0 THEN
    Stato := 99;
  END_IF;
END_IF;

CASE Stato OF
  0:  (* dopo l'accensione serve sempre un reset *)
    IF iEmergenzaOK AND fReset.Q THEN
      Stato := 10;
    END_IF;
  10: (* aperta, in attesa *)
    IF iChiudi THEN
      Stato := 20;
    END_IF;
  20: (* chiusura con controllo del tempo *)
    qBobinaApri := FALSE;
    qBobinaChiudi := TRUE;
    IF iPinzaChiusa THEN
      qBobinaChiudi := FALSE;
      Stato := 30;
    ELSIF tTimeout.Q THEN
      Stato := 99;   (* pezzo assente o aria mancante *)
    END_IF;
  30: (* chiusa *)
    IF NOT iChiudi THEN
      Stato := 40;
    END_IF;
  40: (* apertura *)
    qBobinaChiudi := FALSE;
    qBobinaApri := TRUE;
    IF iPinzaAperta THEN
      qBobinaApri := FALSE;
      Stato := 10;
    ELSIF tTimeout.Q THEN
      Stato := 99;
    END_IF;
  99: (* allarme: si esce solo con emergenza ok e reset *)
    qBobinaChiudi := FALSE;
    qBobinaApri := FALSE;
    IF iEmergenzaOK AND fReset.Q THEN
      Stato := 10;
    END_IF;
END_CASE;

tTimeout(IN := (Stato = 20) OR (Stato = 40), PT := T#2S);
qAllarme := (Stato = 99);
END_PROGRAM
` });
  var QUIZ = [
    { q: "Un PLC Siemens S7-1200 1214C DC/DC/DC ha 4 uscite impulsi. Vuoi comandare 5 assi step/dir. Che fai?", a: ["Uso le uscite a relè per il quinto", "Aggiungo drive su bus o un PLC con più assi", "Divido gli impulsi in software"], ok: 1, why: "Ogni asse step/dir vuole un'uscita PTO veloce. I relè scattano poche volte al secondo: per più assi si passa a drive su bus (PROFINET/EtherCAT)." },
    { q: "Pinza pneumatica da 4900 N, dita lisce (μ 0,1), pezzo da 20 kg che accelera a 2,8 m/s². Basta?", a: ["Sì, 4900 N sono tantissimi", "No: servono circa 5060 N, servono dita in gomma o sagomate", "Dipende solo dalla pressione"], ok: 1, why: "F = m·(g+a)·2/μ = 20 × 12,6 × 2 / 0,1 ≈ 5060 N. Con dita in gomma (μ 0,3) bastano circa 1690 N." },
    { q: "Un servo MG996R dichiara 11 kg·cm. Quanta coppia puoi usare in modo continuo?", a: ["1,08 N·m", "Circa 0,5 N·m", "11 N·m"], ok: 1, why: "11 kg·cm ≈ 1,08 N·m è la coppia di stallo: in uso continuo conviene restare intorno alla metà." },
    { q: "Perché un giunto che porta peso (spalla) vuole un freno a molla?", a: ["Per frenare più in fretta", "Perché se manca corrente il braccio non deve cadere", "Per ridurre il consumo"], ok: 1, why: "Il freno a molla si chiude da solo senza corrente: tiene il braccio quando spegni o in emergenza." },
    { q: "La coppia statica di un link lungo L con massa m, incernierato a un estremo, è:", a: ["m·g·L", "m·g·L/2", "m·L²/12"], ok: 1, why: "Il peso agisce nel baricentro, a metà del link: M = m·g·L/2. m·L²/12 è un momento d'inerzia." },
    { q: "Raddoppiando l'altezza H di un tubolare rettangolare, la rigidezza a flessione:", a: ["raddoppia", "cresce circa di 4 volte", "cresce circa di 8 volte"], ok: 2, why: "Il momento d'inerzia va con H³: è il modo più efficace di irrigidire un link." },
    { q: "Hai uno stepper NEMA23 e un driver A4988. Cosa succede?", a: ["Funziona meglio", "Il driver limita la corrente: meno coppia e surriscaldamento", "Niente, sono compatibili"], ok: 1, why: "L'A4988 regge circa 1–2 A, un NEMA23 da 4,2 A ne vuole molti di più." },
    { q: "Un fusibile da 30 A su un cavo da 1 mm² (10 A):", a: ["Va bene, più grande è meglio", "È pericoloso: brucia prima il cavo", "Serve solo con 230 V"], ok: 1, why: "Il fusibile protegge il cavo: deve essere minore o uguale alla portata del cavo." },
    { q: "Il pulsante di emergenza va collegato:", a: ["Normalmente aperto a un pin dell'Arduino", "Normalmente chiuso, in modo da togliere energia ai motori in hardware", "Al pin 5 V"], ok: 1, why: "NC = se il filo si rompe la macchina si ferma; e deve agire sulla potenza, non solo sul software." },
    { q: "Perché nella cinematica inversa si usa atan2 invece di atan?", a: ["È più veloce", "Distingue i quattro quadranti", "Funziona solo in gradi"], ok: 1, why: "atan2(y, x) restituisce l'angolo corretto in tutti i quadranti e gestisce x = 0." },
    { q: "Nel tuo J2, che cosa limita davvero la precisione sotto fresatura?", a: ["Il diametro dell'albero", "La rigidezza torsionale del riduttore", "Il colore dell'anodizzazione"], ok: 1, why: "Con 225 N·m di fresatura e 108 N·m/arcmin il riduttore torce ~2 arcmin: circa 0,45 mm in punta a 750 mm." },
    { q: "Arduino Uno può fare da master EtherCAT?", a: ["Sì", "No: serve un PC o un controller dedicato", "Solo con 5 V"], ok: 1, why: "EtherCAT vuole un'interfaccia Ethernet veloce e tempi deterministici: si usa un PC con SOEM/TwinCAT o un controller dedicato." }
  ];
  var api = { LESSONS: L, QUIZ: QUIZ };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.LES = api;
})(this);
