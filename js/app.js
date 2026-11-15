/* XENTRIQ INDUSTRY · Braccio Lab — interfaccia */
(function () {
  "use strict";
  var KEY = "xentriq-braccio-lab-v1";
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var fmt = ENG.fmt;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---------- stato ---------- */
  var S = load();
  function load() {
    var d = { v: 1, mission: "m1", builds: {}, best: {}, badges: {}, quiz: {}, guideSeen: {}, verified: 0, sandbox: {}, tab: 0, view: "build", bench: {}, added: 0, dsp: { cat: "all", q: "", sort: "rel", fit: false, mine: false, tab: "cat", lim: 40 } };
    try { var x = JSON.parse(localStorage.getItem(KEY) || "null"); if (x && x.v === 1) for (var k in x) d[k] = x[k]; } catch (e) { /* storage non disponibile */ }
    return d;
  }
  var saveT = null;
  function save() { clearTimeout(saveT); saveT = setTimeout(function () { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* pieno o privato */ } }, 150); }
  function mission() { var m = MIS.byId(S.mission); if (m.editable) { var o = {}; for (var k in m) o[k] = m[k]; for (k in S.sandbox) o[k] = S.sandbox[k]; return o; } return m; }
  function starterFor(m) {
    var src = m.starter || MIS.byId("m2").solution;
    var b = MIS.clone(src);
    if (m.editable) b.axes = 6;
    return pad(b);
  }
  function pad(b) {
    while (b.joints.length < 6) { var last = MIS.clone(b.joints[b.joints.length - 1]); last.link.L = 0; b.joints.push(last); }
    if (!b.elec.aux24) b.elec.aux24 = false;
    b.shop = b.shop || {}; b.fingers = b.fingers || "rubber"; if (b.elec.cable == null) b.elec.cable = "";
    return b;
  }
  function build() { if (!S.builds[S.mission]) S.builds[S.mission] = starterFor(mission()); return S.builds[S.mission]; }
  var R = null;
  function analyze() { R = ENG.analyze(build(), mission(), { tools: Object.keys(S.bench || {}) }); return R; }

  /* ---------- etichette ---------- */
  var MOT_GROUPS = [["servo_hobby", "Servo hobby"], ["stepper", "Stepper"], ["stepper_cl", "Stepper closed-loop"], ["dc", "DC a spazzole"], ["bldc", "BLDC"], ["ac", "Servo AC"]];
  var RED_GROUPS = [["none", "Senza riduttore"], ["planetary", "Planetari"], ["harmonic", "Armonici (strain wave)"], ["cyclo", "Cicloidali / RV"], ["belt", "Cinghia"], ["worm", "Vite senza fine"]];
  var SUP_GROUPS = [["reducer", "Nel riduttore"], ["servo", "Servo hobby"], ["pair", "Coppia di cuscinetti + albero"], ["xroller", "Rulli incrociati"]];
  function opts(list, cur, groups, key, label) {
    var h = "";
    if (groups) groups.forEach(function (g) {
      var items = list.filter(function (x) { return x[key] === g[0]; }); if (!items.length) return;
      h += '<optgroup label="' + esc(g[1]) + '">' + items.map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === cur ? " selected" : "") + ">" + esc(label ? label(x) : x.name) + "</option>"; }).join("") + "</optgroup>";
    });
    else h = list.map(function (x) { return '<option value="' + esc(x.id) + '"' + (String(x.id) === String(cur) ? " selected" : "") + ">" + esc(label ? label(x) : x.name) + "</option>"; }).join("");
    return h;
  }
  function priceLbl(x) { return x.name + (x.price ? " · " + fmt(x.price, 0) + " €" : ""); }
  function sel(f, k, inner, lab, hint) { return '<label class="fld"><span>' + lab + (hint ? ' <em>' + hint + '</em>' : '') + '</span><select data-f="' + f + '"' + (k != null ? ' data-k="' + k + '"' : "") + ">" + inner + "</select></label>"; }
  function num(f, k, val, lab, unit, step, min) { return '<label class="fld num"><span>' + lab + '</span><div class="nb"><input type="number" inputmode="decimal" data-f="' + f + '"' + (k != null ? ' data-k="' + k + '"' : "") + ' value="' + esc(val) + '" step="' + (step || "any") + '" min="' + (min != null ? min : 0) + '"><i>' + unit + "</i></div></label>"; }
  function chk(f, val, lab) { return '<label class="fld chk"><input type="checkbox" data-f="' + f + '"' + (val ? " checked" : "") + "><span>" + lab + "</span></label>"; }

  /* ---------- vista Costruisci ---------- */
  function renderBuild() {
    var m = mission(), b = build(), v = $("#v-build");
    var req = [["Carico", fmt(m.payload, m.payload < 1 ? 1 : 0) + " kg"], ["Portata", fmt(m.reach * 1000, 0) + " mm"], ["Velocità", fmt(m.speed, 0) + " °/s in " + fmt(m.tAcc, 1) + " s"], ["Forza", m.F ? m.F + " N" + (m.lat ? " (+ laterale)" : "") : "—"], ["Precisione", fmt(m.tol, 2) + " mm"], ["Budget", fmt(m.budget, 0) + " €"]];
    var h = '<div class="card vizcard"><div class="vizcap" id="vizCap"></div><div id="viz"></div><div class="legend"><span class="lg ok">ok</span><span class="lg warn">avviso</span><span class="lg err">errore</span><span class="lg dfl" id="dflLg">cedimento</span></div></div>';
    h += '<div class="card mcard"><div class="mhead"><div><small>Missione</small><h2>' + esc(m.title) + '</h2></div><div class="stars s' + (S.best[S.mission] ? S.best[S.mission].stars : 0) + '" aria-label="stelle"></div></div><details class="story"><summary>La storia della missione</summary><p>' + esc(m.story) + "</p></details>";
    h += '<div class="req">' + req.map(function (q) { return "<div><small>" + q[0] + "</small><b>" + q[1] + "</b></div>"; }).join("") + "</div>";
    if (m.editable) {
      h += '<div class="sandbox">' + num("m.payload", null, m.payload, "Carico", "kg", 0.1) + num("m.reach", null, Math.round(m.reach * 1000), "Portata", "mm", 10) + num("m.F", null, m.F, "Forza processo", "N", 10) + num("m.speed", null, m.speed, "Velocità", "°/s", 5) + num("m.tAcc", null, m.tAcc, "Rampa", "s", 0.1, 0.05) + num("m.tol", null, m.tol, "Precisione", "mm", 0.05, 0.01) + num("m.budget", null, m.budget, "Budget", "€", 100) + chk("m.lat", m.lat, "Forza anche laterale") + "</div>";
    }
    if (m.tips && m.tips.length) h += '<details class="tips"><summary>Suggerimenti</summary><ul>' + m.tips.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul></details>";
    h += '<div class="row btns"><button type="button" class="btn ghost" data-act="missions">Cambia missione</button><button type="button" class="btn ghost" data-act="reset">Ricomincia</button>' + (m.solution ? '<button type="button" class="btn ghost" data-act="solution">Esempio di soluzione</button>' : "") + "</div></div>";
    h += '<div class="card"><div class="row two">' + sel("b.axes", null, [4, 5, 6].map(function (x) { return '<option value="' + x + '"' + (b.axes === x ? " selected" : "") + ">" + x + " assi</option>"; }).join(""), "Numero di assi") +
      sel("b.effector", null, opts(CAT.EFFECTORS, b.effector, null, null, function (x) { return x.name + " · " + fmt(x.mass, x.mass < 1 ? 2 : 1) + " kg"; }), "Utensile / pinza") + "</div>" + effExtra(b) + '<div id="gripLive"></div></div>';
    h += '<div class="tabs" id="jtabs" role="tablist"></div><div id="panel"></div>';
    h += '<div class="verify-bar"><button type="button" class="btn big" data-act="verify">Verifica progetto</button></div>';
    v.innerHTML = h;
    renderTabs(); renderPanel(); updateLive();
  }
  function effExtra(b) {
    var ef = CAT.byId(CAT.EFFECTORS, b.effector), h = '<div class="row two">';
    if (["servo", "elec", "pneu"].indexOf(ef.kind) >= 0) h += sel("b.fingers", null, opts(CAT.FINGERS, b.fingers || "rubber", null, null, function (x) { return x.name + (x.price ? " · " + x.price + " €" : ""); }), "Dita della pinza");
    h += '<div class="fld"><span>&nbsp;</span><button type="button" class="btn ghost wide" data-dsp="pinze">Pinze e utensili nella Dispensa</button></div></div>';
    return h;
  }
  function renderTabs() {
    var b = build(), t = $("#jtabs"); if (!t) return;
    if (S.tab !== "el" && S.tab >= b.axes) S.tab = 0;
    var h = "";
    for (var k = 0; k < b.axes; k++) h += '<button type="button" role="tab" data-tab="' + k + '" class="' + (S.tab === k ? "on" : "") + '"><i class="dot" data-dot="J' + (k + 1) + '"></i>J' + (k + 1) + "</button>";
    h += '<button type="button" role="tab" data-tab="el" class="' + (S.tab === "el" ? "on" : "") + '"><i class="dot" data-dot="EL"></i>Elettronica</button>';
    t.innerHTML = h;
  }
  function renderPanel() {
    var b = build(), p = $("#panel"); if (!p) return;
    if (S.tab === "el") { p.innerHTML = elecPanel(b); return; }
    var k = S.tab, j = b.joints[k], kind = ENG.KINDS[b.axes][k];
    var R0 = CAT.byId(CAT.REDUCERS, j.reducer), Sup = CAT.byId(CAT.SUPPORTS, j.support), M0 = CAT.byId(CAT.MOTORS, j.motor);
    var ratios = R0.ratios.map(function (x) { return '<option value="' + x + '"' + (+j.ratio === x ? " selected" : "") + ">" + fmt(x, x % 1 ? 1 : 0) + ":1</option>"; }).join("");
    var h = '<div class="card panel"><div class="ph"><h3>J' + (k + 1) + "</h3><span>" + esc(ENG.KIND_IT[kind]) + "</span></div>";
    h += '<div class="grp"><h4>Motore e trasmissione' + dspLink("motori") + '</h4>' + sel("j.motor", k, opts(CAT.MOTORS, j.motor, MOT_GROUPS, "type", priceLbl), "Motore");
    h += '<div class="row red">' + sel("j.reducer", k, opts(CAT.REDUCERS, j.reducer, RED_GROUPS, "type", priceLbl), "Riduttore") + sel("j.ratio", k, ratios, "Rapporto") + "</div>";
    if (R0.note) h += '<p class="note">' + esc(R0.note) + "</p>";
    h += sel("j.brake", k, opts(CAT.BRAKES, j.brake, null, null, priceLbl), "Freno", kind === "pitch" ? "asse che porta peso" : "");
    h += "</div>";
    h += '<div class="grp"><h4>Supporto e cuscinetti' + dspLink("cuscinetti") + '</h4>' + sel("j.support", k, opts(CAT.SUPPORTS, j.support, SUP_GROUPS, "kind", priceLbl), "Supporto d'uscita");
    if (Sup.kind === "pair") h += '<div class="row three">' + sel("j.shaftMat", k, opts(CAT.MATERIALS.filter(function (x) { return !x.plastic && !x.brittle; }), j.shaftMat || "c45"), "Materiale albero") + num("j.a", k, j.a, "Interasse a", "mm", 5, 10) + num("j.b", k, j.b, "Sbalzo b", "mm", 5, 0) + "</div>";
    else h += num("j.b", k, j.b, "Sbalzo link–flangia b", "mm", 5, 0);
    h += "</div>";
    if (M0.type !== "servo_hobby") {
      var bo = j.bolt || {}, BB = null; CAT.BOLTS.forEach(function (x) { if (x.s === bo.s) BB = x; });
      var bci = CAT.byId(CAT.BOLT_CLASSES, bo.c || "10.9");
      h += '<div class="grp"><h4>Viti della flangia' + dspLink("bulloneria") + '</h4><div class="row four">' + sel("j.bs", k, '<option value="">— non scelte</option>' + CAT.BOLTS.map(function (x) { return '<option value="' + x.s + '"' + (x.s === bo.s ? " selected" : "") + ">" + x.s + "</option>"; }).join(""), "Vite ISO 4762") +
        sel("j.bc", k, CAT.BOLT_CLASSES.map(function (c) { return '<option value="' + c.id + '"' + (c.id === (bo.c || "10.9") ? " selected" : "") + ">" + c.id + "</option>"; }).join(""), "Classe") + num("j.bn", k, bo.n || 8, "Numero", "pz", 1, 3) + num("j.bpcd", k, bo.pcd || 80, "Ø primitivo", "mm", 5, 20) + "</div>";
      h += BB ? '<p class="note">Serraggio ' + fmt(BB.MA[bci.i], 1) + " N·m con chiave dinamometrica · brugola " + fmt(BB.hex, BB.hex % 1 ? 1 : 0) + " mm · foro per maschiare Ø" + fmt(BB.tap, 1) + " mm · precarico " + fmt(BB.FM[bci.i], 1) + " kN (VDI 2230, μ 0,12)</p>" : '<p class="note">Scegli le viti che fissano il riduttore: la verifica controlla che il serraggio tenga coppia e momento ribaltante.</p>';
      h += "</div>";
    }
    h += '<div class="grp"><h4>Elettronica dell\'asse' + dspLink("plc") + '</h4><div class="row wide2">' + sel("j.driver", k, opts(CAT.DRIVERS, j.driver, null, null, function (x) { return (x.for.indexOf(M0.type) >= 0 ? "" : "✕ ") + priceLbl(x); }), "Driver") +
      sel("j.encoder", k, opts(CAT.ENCODERS, j.encoder, null, null, function (x) { return (x.onlyFor && x.onlyFor.indexOf(M0.type) < 0 ? "✕ " : "") + priceLbl(x); }), "Encoder") + "</div></div>";
    var l = j.link, secDef = CAT.byId(CAT.SECTIONS, l.sec);
    h += '<div class="grp"><h4>' + (k === 0 ? "Colonna (dalla base alla spalla)" : "Link dopo il giunto") + dspLink("metalli") + "</h4>";
    h += '<div class="row two">' + sel("l.mat", k, opts(CAT.MATERIALS, l.mat), "Materiale") + sel("l.sec", k, opts(CAT.SECTIONS, l.sec), "Sezione") + "</div>";
    var lbl = { D: "Diametro D", t: "Spessore t", B: "Larghezza B", H: "Altezza H" };
    h += '<div class="row four">' + secDef.dims.map(function (d) { return num("l." + d, k, l[d], lbl[d], "mm", d === "t" ? 0.5 : 1, 0.1); }).join("") + num("l.L", k, Math.round(l.L * 1000), "Lunghezza", "mm", 5, 0) + "</div>";
    var mat = CAT.byId(CAT.MATERIALS, l.mat);
    h += '<p class="note">' + esc(mat.note) + " R<sub>e</sub> " + mat.Re + " MPa · E " + mat.E + " GPa · " + fmt(mat.rho, 0) + " kg/m³</p></div>";
    h += '<div id="jlive"></div></div>';
    p.innerHTML = h;
  }
  function dspLink(cat) { return ' <button type="button" class="lnk" data-dsp="' + cat + '">Dispensa ›</button>'; }
  function elecPanel(b) {
    var e = b.elec;
    var h = '<div class="card panel"><div class="ph"><h3>Elettronica</h3><span>controllo, alimentazione, cavi, sicurezza</span></div>';
    h += '<div class="grp"><h4>Controllo</h4>' + sel("e.mcu", null, [["Microcontrollori", CAT.MCUS.filter(function (x) { return !x.plc && x.id !== "ipc"; })], ["PLC", CAT.MCUS.filter(function (x) { return x.plc; })], ["PC industriale", CAT.MCUS.filter(function (x) { return x.id === "ipc"; })]].map(function (g) { return '<optgroup label="' + g[0] + '">' + opts(g[1], e.mcu, null, null, function (x) { return x.name + " · " + x.price + " €"; }) + "</optgroup>"; }).join(""), "Microcontrollore / PLC / controllore");
    h += '<div class="row two">' + sel("e.bus", null, opts(CAT.BUSES, e.bus), "Bus preferito verso i drive") + sel("e.micro", null, [1, 2, 4, 8, 16, 32].map(function (x) { return '<option value="' + x + '"' + (+e.micro === x ? " selected" : "") + ">" + x + "</option>"; }).join(""), "Microstep stepper") + "</div>";
    h += chk("e.levelShift", e.levelShift, "Traslatori di livello 3,3 ↔ 5 V sui segnali (74HCT245, partitori)") + chk("e.torqueLimit", e.torqueLimit, "Limiti di coppia impostati nei drive (proteggono i riduttori)") + "</div>";
    h += '<div class="grp"><h4>Alimentazione</h4>' + sel("e.psu", null, opts(CAT.PSUS, e.psu, null, null, priceLbl), "Alimentatore motori (DC)") + chk("e.aux24", e.aux24, "Alimentatore ausiliario 24 V per freni e logica (30 €)") + sel("e.servoPsu", null, opts(CAT.SERVO_PSUS, e.servoPsu, null, null, priceLbl), "Alimentatore servo hobby") + "</div>";
    h += '<div class="grp"><h4>Cavi e protezioni</h4><div class="row three">' + sel("e.wireMotor", null, opts(CAT.WIRES, e.wireMotor, null, null, function (x) { return x.mm2 + " mm² (AWG " + x.awg + ") · " + x.A + " A"; }), "Cavi motore") +
      sel("e.wirePower", null, opts(CAT.WIRES, e.wirePower, null, null, function (x) { return x.mm2 + " mm² (AWG " + x.awg + ") · " + x.A + " A"; }), "Cavo alimentazione") +
      sel("e.fuse", null, CAT.FUSES.map(function (x) { return '<option value="' + x + '"' + (+e.fuse === x ? " selected" : "") + ">" + (x ? x + " A" : "nessuno") + "</option>"; }).join(""), "Fusibile bus") + "</div>" + sel("e.cable", null, opts(CAT.CABLES, e.cable || "", null, null, function (x) { return x.name + (x.id ? " · " + fmt(x.eurm, 1) + " €/m" : ""); }), "Tipo di cavo motore", "imposta anche la sezione") + "</div>";
    h += '<div class="grp"><h4>Sicurezza</h4>' + sel("e.estop", null, opts(CAT.ESTOPS, e.estop, null, null, priceLbl), "Arresto di emergenza") + sel("e.homing", null, opts(CAT.HOMING, e.homing, null, null, function (x) { return x.name + (x.price ? " · " + x.price + " €/asse" : ""); }), "Finecorsa / homing") + "</div>";
    var shopL = ASM.shopList(b);
    h += '<div class="grp"><h4>Dalla Dispensa' + dspLink("plc") + "</h4>" + (shopL.length ? '<div class="schips">' + shopL.map(function (x) { return '<button type="button" class="schip c-' + x.it.cat + '" data-item="' + esc(x.it.id) + '">' + ICO.svg(x.it.icon, "sm") + esc(x.it.name.split(" (")[0]) + (x.q > 1 ? " ×" + x.q : "") + "</button>"; }).join("") + "</div>" : '<p class="note">Sensori, moduli PLC, pneumatica, catene e relè si aggiungono dalla Dispensa.</p>') + '<button type="button" class="btn ghost" data-dseg="bom">Apri la distinta</button></div>';
    h += '<div id="jlive"></div></div>';
    return h;
  }
  function bar(v, max, cls) { var w = max > 0 ? Math.max(0, Math.min(1, v / max)) : 0; return '<div class="bar ' + (cls || "") + '"><i data-w="' + w.toFixed(4) + '"></i></div>'; }
  function cls3(m, warnAt) { return m < 1 ? "err" : m < (warnAt || 1.2) ? "warn" : "ok"; }
  function kv(k, v) { return "<div><small>" + k + "</small><b>" + v + "</b></div>"; }
  function issueCard(q) {
    var lab = { err: "ERRORE", warn: "AVVISO", info: "NOTA" }[q.sev];
    return '<div class="icard ' + q.sev + '"><div class="it"><span class="sv">' + lab + "</span>" + esc(q.title) + "</div>" + (q.why ? "<p><b>Perché.</b> " + esc(q.why) + "</p>" : "") + (q.fix ? "<p><b>Come risolvere.</b> " + esc(q.fix) + "</p>" : "") + (q.calc ? "<details><summary>Come l'ho calcolato</summary><p>" + esc(q.calc) + "</p></details>" : "") + "</div>";
  }
  function jointLive(o) {
    var L = o.loads, h = '<div class="live"><h4>Numeri del giunto ' + o.name + "</h4>";
    h += '<div class="kv">' + kv("Statica", fmt(L.Mstat) + " N·m") + kv("Dinamica I·α", fmt(L.Tdyn) + " N·m") + kv("Processo", fmt(L.Mproc) + " N·m") + kv("Totale", fmt(L.Mtot) + " N·m") + kv("Progetto ×" + fmt(mission().SF || 2.5, 1), fmt(L.Mdes) + " N·m") + kv("Massa giunto", fmt(o.mJoint, 2) + " kg") + "</div>";
    var mm = Math.min(o.mPeak, o.mCont);
    h += '<div class="meter"><div class="ml"><span>Coppia motore</span><b class="' + cls3(mm, o.M.type === "stepper" ? 1.5 : 1.2) + '">' + fmt(o.TmPeak, 3) + " / " + fmt(o.Tpk, 2) + " N·m</b></div>" + bar(o.TmPeak, o.Tpk, cls3(mm, o.M.type === "stepper" ? 1.5 : 1.2)) + "</div>";
    if (o.R.type !== "none") { var mr = o.R.Tr / L.Mtot; h += '<div class="meter"><div class="ml"><span>Riduttore (lavoro / nominale)</span><b class="' + (L.Mtot > o.R.Tacc ? "err" : L.Mtot > o.R.Tr ? "warn" : "ok") + '">' + fmt(L.Mtot) + " / " + fmt(o.R.Tr) + " N·m</b></div>" + bar(L.Mtot, o.R.Tr, L.Mtot > o.R.Tacc ? "err" : mr < 1 ? "warn" : "ok") + "</div>"; }
    if (o.stress) h += '<div class="meter"><div class="ml"><span>Tensione ' + (o.k === 0 ? "colonna" : "link") + '</span><b class="' + cls3(o.stress.m, 1) + '">' + fmt(o.stress.vm, 1) + " / " + fmt(o.stress.amm, 0) + " MPa</b></div>" + bar(o.stress.vm, o.stress.amm, cls3(o.stress.m, 1)) + "</div>";
    if (o.bear && o.bear.m != null) h += '<div class="meter"><div class="ml"><span>Cuscinetti (utilizzo)</span><b class="' + cls3(o.bear.m, 1) + '">' + fmt(100 / Math.max(o.bear.m, 1e-6), 0) + " %</b></div>" + bar(1, o.bear.m, cls3(o.bear.m, 1)) + "</div>";
    if (o.boltCheck) { var bk = o.boltCheck; h += '<div class="meter"><div class="ml"><span>Viti flangia (serraggio necessario)</span><b class="' + cls3(bk.m, 1.3) + '">' + fmt(bk.FKreq / 1000, 2) + " / " + fmt(bk.FMmin / 1000, 1) + " kN</b></div>" + bar(bk.FKreq, bk.FMmin, cls3(bk.m, 1.3)) + "</div>"; }
    h += '<p class="note">Motore a ' + fmt(o.nMot, 0) + " giri/min per " + fmt(mission().speed, 0) + " °/s al giunto · rapporto " + fmt(o.i, o.i % 1 ? 1 : 0) + ":1, rendimento " + fmt(o.eta * 100, 0) + "%" + (o.torqueLimit ? " · limite di coppia consigliato " + fmt(o.torqueLimit, 2) + " N·m" : "") + "</p>";
    var mine = R.issues.filter(function (q) { return (q.joint || "").split(/,\s*/).indexOf(o.name) >= 0; });
    h += mine.length ? mine.map(issueCard).join("") : '<div class="icard ok"><div class="it"><span class="sv">OK</span>Nessun problema su questo giunto</div></div>';
    return h + "</div>";
  }
  function elecLive() {
    var p = R.power, e = R.elec, h = '<div class="live"><h4>Numeri dell\'impianto</h4><div class="kv">';
    h += kv("Potenza DC stimata", fmt(p.Ptot, 0) + " W") + kv("Alimentatore", p.psuW ? fmt(p.psuW, 0) + " W" : "—") + kv("Corrente bus", fmt(p.Ibus, 1) + " A") + kv("Servo AC (rete)", p.Pac ? fmt(p.Pac, 0) + " W" : "—") + kv("Servo hobby", p.servoRun ? fmt(p.servoRun, 1) + " A (stallo " + fmt(p.servoStall, 1) + ")" : "—") + kv("Pin usati", R.mcu.id === "ipc" ? "bus" : e.pinsUsed + " / " + e.pinsAvail) + kv("Impulsi step", fmt(e.stepRate, 0) + "/s") + kv("Encoder A/B sul MCU", e.abCount) + "</div>";
    if (p.psuW) h += '<div class="meter"><div class="ml"><span>Carico alimentatore</span><b class="' + (p.Ptot > p.psuW ? "err" : p.Ptot * 1.25 > p.psuW ? "warn" : "ok") + '">' + fmt(p.Ptot / p.psuW * 100, 0) + " %</b></div>" + bar(p.Ptot, p.psuW, p.Ptot > p.psuW ? "err" : p.Ptot * 1.25 > p.psuW ? "warn" : "ok") + "</div>";
    var io = R.asm && R.asm.io;
    if (io && io.aDI != null) h += '<div class="kv">' + kv("Ingressi DI", io.di + " / " + io.aDI) + kv("Uscite DQ", io.dq + " / " + io.aDQ) + kv("Analogici AI", io.ai + " / " + io.aAI) + kv("Uscite impulsi", io.pto + " / " + io.aPTO) + kv("Contatori veloci", io.hsc + " / " + io.aHSC) + "</div>";
    var mine = R.issues.filter(function (q) { return ["elettronica", "cavi", "sicurezza", "plc", "pneumatica"].indexOf(q.cat) >= 0 && !/^J\d/.test(q.joint); });
    h += mine.length ? mine.map(issueCard).join("") : '<div class="icard ok"><div class="it"><span class="sv">OK</span>Impianto senza problemi</div></div>';
    return h + "</div>";
  }
  function applyBars(root) { $$(".bar i", root).forEach(function (i) { i.style.width = (parseFloat(i.getAttribute("data-w")) * 100).toFixed(1) + "%"; }); }
  function updateLive() {
    analyze(); renderStatus();
    var vz = $("#viz"); if (vz) { vz.innerHTML = VIZ.render(build(), R, mission(), { narrow: vz.clientWidth < 520 }); var cp = $("#vizCap"); if (cp) cp.textContent = window.VIZ_CAP || ""; var lg = $("#dflLg"), vl = window.VIZ_LAST; if (lg) lg.textContent = vl ? "cedimento sotto carico " + fmt(vl.tipD, 2) + " mm " + (vl.big ? "(fuori scala)" : vl.ex > 1.5 ? "(disegnato ×" + Math.round(vl.ex) + ")" : "(scala reale)") : "cedimento"; }
    var gl = $("#gripLive");
    if (gl) {
      var gr = R.asm && R.asm.grip, gi = R.issues.filter(function (q) { return q.cat === "pinza" || q.cat === "pneumatica"; }), gh = "";
      if (gr) { var gm = gr.F / gr.need; gh += '<div class="meter"><div class="ml"><span>Forza di presa (necessaria / disponibile)</span><b class="' + cls3(gm, 1.25) + '">' + fmt(gr.need, 0) + " / " + fmt(gr.F, 0) + " N</b></div>" + bar(gr.need, gr.F, cls3(gm, 1.25)) + "</div>"; }
      gh += gi.filter(function (q) { return q.sev !== "info"; }).map(issueCard).join("");
      gl.innerHTML = gh; applyBars(gl);
    }
    var jl = $("#jlive");
    if (jl) { jl.innerHTML = S.tab === "el" ? elecLive() : (R.J[S.tab] ? jointLive(R.J[S.tab]) : ""); applyBars(jl); }
    $$("[data-dot]").forEach(function (d) {
      var name = d.getAttribute("data-dot"), sv = 0;
      if (name === "EL") R.issues.forEach(function (q) { if (["elettronica", "cavi", "sicurezza", "plc", "pneumatica"].indexOf(q.cat) >= 0 && !/^J\d/.test(q.joint)) sv = Math.max(sv, q.sev === "err" ? 2 : q.sev === "warn" ? 1 : 0); });
      else sv = VIZ.sevOf(R, name);
      d.className = "dot " + (sv === 2 ? "err" : sv === 1 ? "warn" : "ok");
    });
  }
  function renderStatus() {
    var m = mission(), st = $("#status");
    st.innerHTML = '<button type="button" class="pill ' + (R.errs ? "err" : "ok") + '" data-act="gocheck" title="Tocca per verificare il progetto"><b>' + R.errs + "</b> errori</button>" +
      '<button type="button" class="pill ' + (R.warns ? "warn" : "ok") + '" data-act="gocheck" title="Tocca per verificare il progetto"><b>' + R.warns + "</b> avvisi</button>" +
      '<span class="pill ' + (R.cost.total > m.budget ? "err" : "") + '"><b>' + fmt(R.cost.total, 0) + "</b> €</span>" +
      '<span class="pill"><b>' + fmt(R.mass, R.mass < 10 ? 1 : 0) + "</b> kg</span>" +
      '<span class="pill ' + (R.defl.err > m.tol ? "err" : R.defl.err > 0.8 * m.tol ? "warn" : "") + '"><b>' + fmt(R.defl.err, 2) + "</b> mm</span>";
    $("#missionChip").textContent = m.title;
  }

  /* ---------- modifica dei campi ---------- */
  function setField(el) {
    var f = el.getAttribute("data-f"), k = el.getAttribute("data-k"), b = build(), val = el.type === "checkbox" ? el.checked : el.value;
    var part = f.split("."), grp = part[0], key = part[1], structural = false;
    var isNum = el.type === "number";
    if (isNum) { val = parseFloat(String(val).replace(",", ".")); if (!isFinite(val)) return; }
    if (grp === "b") { if (key === "axes") { b.axes = +val; structural = true; } else b[key] = val; if (key === "effector") { save(); renderBuild(); return; } }
    else if (grp === "e") { b.elec[key] = (key === "micro" || key === "fuse") ? +val : val; structural = key === "mcu" || key === "cable"; if (key === "cable" && val) { var cb = CAT.byId(CAT.CABLES, val); if (cb.mm2) b.elec.wireMotor = wireFor(cb.mm2); } }
    else if (grp === "m") { S.sandbox[key] = key === "reach" ? val / 1000 : val; structural = true; }
    else if (grp === "j") {
      var j = b.joints[+k];
      if (key === "bs" || key === "bc" || key === "bn" || key === "bpcd") {
        if (key === "bs" && !val) { delete j.bolt; structural = true; }
        else { j.bolt = j.bolt || { c: "10.9", n: 8 }; if (key === "bs") { j.bolt.s = val; if (!j.bolt.pcd) j.bolt.pcd = DEF_PCD[val] || 80; structural = true; } else if (key === "bc") { j.bolt.c = val; structural = true; } else if (key === "bn") j.bolt.n = Math.max(3, Math.round(val)); else j.bolt.pcd = val; if (!j.bolt.s) j.bolt.s = "M8"; }
      }
      else if (key === "ratio") j.ratio = +val;
      else if (key === "a" || key === "b") j[key] = val;
      else { j[key] = val; structural = true; }
      if (key === "motor") autoMotor(j);
      if (key === "reducer") { var Rr = CAT.byId(CAT.REDUCERS, val); if (Rr.ratios.indexOf(+j.ratio) < 0) j.ratio = Rr.ratios[Math.floor(Rr.ratios.length / 2)]; if (Rr.type === "none" || (!Rr.Mc && j.support === "red" && Rr.type !== "planetary" && Rr.type !== "worm")) { /* lascia scegliere */ } }
    } else if (grp === "l") {
      var l = b.joints[+k].link;
      if (key === "L") l.L = val / 1000;
      else if (key === "sec") { l.sec = val; if (val === "round" && !l.D) l.D = 30; if (val === "tube") { l.D = l.D || 60; l.t = l.t || 3; } if (val === "rect") { l.B = l.B || 30; l.H = l.H || 10; } if (val === "rtube") { l.B = l.B || 40; l.H = l.H || 60; l.t = l.t || 3; } structural = true; }
      else if (key === "mat") { l.mat = val; structural = true; }
      else l[key] = val;
    }
    save();
    if (grp === "m") { renderBuild(); return; }
    if (structural) { if (grp === "b" && key === "axes") renderTabs(); renderPanel(); }
    updateLive();
  }
  function autoMotor(j) {
    var M = CAT.byId(CAT.MOTORS, j.motor), D = CAT.byId(CAT.DRIVERS, j.driver), En = CAT.byId(CAT.ENCODERS, j.encoder);
    var defD = { servo_hobby: "pca9685", stepper: "dm542", stepper_cl: "hbs57", dc: "bts7960", bldc: "odrive", ac: "b3a" }[M.type];
    var defE = { servo_hobby: "pot", stepper: "none", stepper_cl: "cl1000", dc: "inc600", bldc: "as5048", ac: "delta17" }[M.type];
    if (D.for.indexOf(M.type) < 0) j.driver = defD;
    if ((En.onlyFor && En.onlyFor.indexOf(M.type) < 0) || (M.type === "servo_hobby" && En.id !== "pot") || (M.type === "ac" && En.id !== "delta17" && En.id !== "biss19") || (M.type === "stepper_cl" && En.id === "none")) j.encoder = defE;
    if (M.type === "servo_hobby") { if (j.support !== "servo" && j.support !== "servo608") j.support = "servo608"; j.reducer = "none"; j.ratio = 1; j.brake = "none"; j.b = Math.min(j.b || 20, 30); }
    else if (j.support === "servo" || j.support === "servo608") j.support = "red";
  }

  /* ---------- verifica, punteggio, badge ---------- */
  var BADGES = [
    { id: "first", t: "Primo collaudo", d: "Hai verificato il tuo primo progetto." },
    { id: "clean", t: "Zero errori", d: "Un progetto senza errori." },
    { id: "three", t: "Tre stelle", d: "Progetto perfetto: sotto budget e senza avvisi." },
    { id: "m1", t: "Maker", d: "Missione 1 completata." },
    { id: "m2", t: "Laboratorio", d: "Missione 2 completata." },
    { id: "m3", t: "Il J2 di Reeda", d: "Missione 3 completata: il tuo braccio da fresatura sta in piedi." },
    { id: "m4", t: "Industriale", d: "Missione 4 completata." },
    { id: "cheap", t: "Ottimo acquisto", d: "Missione superata spendendo meno del 70% del budget." },
    { id: "prec", t: "Ingegnere di precisione", d: "Errore in punta sotto metà tolleranza." },
    { id: "light", t: "Peso piuma", d: "Missione superata sotto la massa di riferimento." },
    { id: "safe", t: "Elettricista sicuro", d: "Fusibile giusto, emergenza hardware, nessun errore di cablaggio." },
    { id: "coder", t: "Programmatore", d: "Hai copiato lo sketch generato dal tuo braccio." },
    { id: "quiz", t: "Quiz perfetto", d: "10 risposte giuste su 10." },
    { id: "study", t: "Studioso", d: "Hai letto tutti i passi della guida." },
    { id: "shop10", t: "Magazziniere", d: "Hai preso 10 articoli dalla Dispensa." },
    { id: "bench", t: "Banco completo", d: "Progetto valido con tutti gli attrezzi per montarlo." },
    { id: "plc", t: "Automazione industriale", d: "Missione superata con un PLC." }
  ];
  function award(id) { if (S.badges[id]) return false; S.badges[id] = Date.now(); var b = BADGES.filter(function (x) { return x.id === id; })[0]; toast("Nuovo badge: " + b.t); save(); return true; }
  function verify() {
    analyze(); var m = mission(), sc = R.score;
    S.verified++;
    award("first");
    var best = S.best[S.mission];
    if (!best || sc.pts > best.pts || (sc.pass && !best.pass)) S.best[S.mission] = { pts: sc.pts, stars: Math.max(sc.stars, best ? best.stars : 0), pass: sc.pass || (best && best.pass) };
    else if (sc.stars > best.stars) best.stars = sc.stars;
    if (sc.pass) {
      award("clean"); if (sc.stars === 3) award("three");
      if (/^m[1-4]$/.test(S.mission)) award(S.mission);
      if (R.cost.total <= 0.7 * m.budget) award("cheap");
      if (R.defl.err <= 0.5 * m.tol) award("prec");
      if (R.mass <= m.massRef) award("light");
    }
    if (sc.pass && R.mcu.plc) award("plc");
    if (sc.pass && R.asm && R.asm.tools && R.asm.tools.length && R.asm.tools.every(function (x) { return x.ok; })) award("bench");
    var cabErr = R.issues.some(function (q) { return (q.cat === "cavi" || q.cat === "elettronica") && q.sev === "err"; });
    if (!cabErr && build().elec.fuse && CAT.byId(CAT.ESTOPS, build().elec.estop).level >= 2) award("safe");
    save(); S.lastVerified = true; show("check");
  }
  function renderCheck() {
    analyze(); var m = mission(), sc = R.score, v = $("#v-check");
    var h = '<div class="card hero ' + (sc.pass ? "pass" : "fail") + '"><small>' + esc(m.title) + "</small><h2>" + (sc.pass ? "Progetto valido" : "Il progetto non passa") + '</h2><div class="score"><b>' + sc.pts + '</b><span>punti</span></div><div class="stars big s' + sc.stars + '"></div>';
    h += '<div class="sbars">' + [["Costo", sc.costS], ["Massa", sc.massS], ["Margini", sc.marginS], ["Precisione", sc.precS]].map(function (x) { return '<div class="sb"><span>' + x[0] + "</span>" + bar(x[1], 1, x[1] > 0.7 ? "ok" : x[1] > 0.35 ? "warn" : "err") + "</div>"; }).join("") + "</div>";
    h += '<p class="note">' + (sc.pass ? (sc.stars < 3 ? "Per 3 stelle: resta sotto l'85% del budget e senza avvisi." : "Perfetto.") : "Correggi gli errori rossi: per ognuno trovi il perché e come risolvere.") + "</p>";
    h += '<div class="row btns"><button type="button" class="btn" data-act="verify">Verifica di nuovo</button><button type="button" class="btn ghost" data-act="gobuild">Torna a costruire</button></div></div>';
    h += '<div class="card"><h3>Riepilogo</h3><div class="kv">' + kv("Costo", fmt(R.cost.total, 0) + " € / " + fmt(m.budget, 0)) + kv("Massa braccio", fmt(R.mass, 1) + " kg") + kv("Portata", fmt(R.reach * 1000, 0) + " mm") + kv("Errore in punta", fmt(R.defl.err, 3) + " mm / " + fmt(m.tol, 2)) + kv("Margine minimo", fmt(R.minMargin, 2) + "×") + kv("Potenza", fmt(R.power.Ptot + R.power.Pac, 0) + " W") + "</div>";
    h += '<details><summary>Dove vanno i soldi</summary><div class="kv">' + Object.keys(R.cost).filter(function (k) { return k !== "total"; }).map(function (k) { return kv(k, fmt(R.cost[k], 0) + " €"); }).join("") + "</div></details>";
    h += "<details><summary>Precisione in punta</summary><p>" + esc(R.defl.calc) + "</p></details></div>";
    var groups = [["err", "Errori"], ["warn", "Avvisi"], ["info", "Note"]];
    groups.forEach(function (g) {
      var list = R.issues.filter(function (q) { return q.sev === g[0]; }); if (!list.length) return;
      h += '<div class="card"><h3 class="sev-h ' + g[0] + '">' + g[1] + " (" + list.length + ")</h3>" + list.map(issueCard).join("") + "</div>";
    });
    if (!R.errs && !R.warns) h += '<div class="card"><div class="icard ok"><div class="it"><span class="sv">OK</span>Nessun errore e nessun avviso</div></div></div>';
    h += '<div class="card"><h3>Calcoli giunto per giunto</h3>';
    R.J.forEach(function (o) {
      var L = o.loads;
      h += '<details class="jcalc"><summary><b>' + o.name + "</b> · " + esc(ENG.KIND_IT[o.kind]) + " · " + fmt(L.Mtot) + " N·m</summary>";
      h += "<p><b>Masse a valle</b>: " + o.items.map(function (q) { return esc(q.name) + " " + fmt(q.m, 2) + " kg a " + fmt(q.r * 1000, 0) + " mm"; }).join("; ") + ".</p>";
      h += "<p><b>Coppie</b>: " + esc(o.calcT) + "</p>";
      if (o.calcR) h += "<p><b>Riduttore</b>: " + esc(o.calcR) + "</p>";
      if (o.calcS) h += "<p><b>Struttura</b>: " + esc(o.calcS) + "</p>";
      if (o.calcShaft) h += "<p><b>Albero</b>: " + esc(o.calcShaft) + "</p>";
      if (o.calcB) h += "<p><b>Cuscinetti</b>: " + esc(o.calcB) + "</p>";
      if (o.kind === "pitch") h += "<p><b>Freno</b>: " + (o.Br.Tb ? fmt(o.Br.Tb, 1) + " N·m × " + fmt(o.i, 1) + " = " + fmt(o.brakeHold) + " N·m all'uscita contro " + fmt(L.Mstat) + " N·m di gravità" : o.selfLock ? "vite senza fine autobloccante" : "nessuno") + ".</p>";
      h += "</details>";
    });
    h += "</div>";
    h += '<div class="card"><h3>Impianto elettrico</h3><p>' + esc(R.power.calc || "Nessun alimentatore DC in uso.") + "</p><p>Microcontrollore: " + esc(R.mcu.name) + " (" + esc(R.mcu.cpu) + "). Pin usati " + R.elec.pinsUsed + (R.mcu.pins ? " su " + R.mcu.pins : "") + ", impulsi step " + fmt(R.elec.stepRate, 0) + "/s.</p></div>";
    h += '<p class="disclaimer">Calcoli didattici con valori tipici da catalogo e ipotesi semplificate (braccio steso, carichi statici + accelerazione costante). Prima di costruire, verifica con le schede dei produttori e con un progettista abilitato.</p>';
    v.innerHTML = h; applyBars(v);
  }

  /* ---------- Guida ---------- */
  function renderGuide() {
    var v = $("#v-guide");
    var h = '<div class="card"><h2>Come costruire un braccio robotico</h2><p>Nove passi, dall\'idea al collaudo. Ogni passo corrisponde a qualcosa che nel gioco puoi provare.</p></div>';
    h += GUIDE.map(function (g, i) { return '<details class="card guide" data-g="' + i + '"' + (i === 0 ? " open" : "") + "><summary>" + esc(g.t) + (S.guideSeen[i] ? ' <i class="seen">✓</i>' : "") + "</summary>" + g.h + "</details>"; }).join("");
    v.innerHTML = h;
    S.guideSeen[0] = true; save();
    $$("details.guide", v).forEach(function (d) { d.addEventListener("toggle", function () { if (d.open) { S.guideSeen[d.getAttribute("data-g")] = true; save(); if (Object.keys(S.guideSeen).length >= GUIDE.length) award("study"); } }); });
  }

  /* ---------- C++ ---------- */
  function renderCpp() {
    var v = $("#v-cpp"); analyze();
    var h = '<div class="card"><h2>Programmazione C++</h2><p>Dieci lezioni con codice vero per Arduino/ESP32. Tutto il codice qui è stato compilato con un compilatore C++ (le parti di cinematica e traiettorie anche provate con test numerici). Le librerie servono da installare nell\'IDE Arduino: <code>AccelStepper</code>, <code>Servo</code>/<code>ESP32Servo</code>, <code>Adafruit PWM Servo Driver</code>.</p></div>';
    h += LES.LESSONS.map(function (l, i) { return '<details class="card lesson"><summary><span class="tag">' + esc(l.tag) + "</span>" + esc(l.title) + "</summary>" + l.text + '<div class="code"><button type="button" class="btn sm" data-copy="l' + i + '">Copia</button><pre><code id="l' + i + '">' + esc(l.code) + "</code></pre></div></details>"; }).join("");
    var src = GEN.generate(build(), R, mission());
    h += '<div class="card gen"><h3>' + (R.mcu.plc ? "Il programma PLC (Structured Text) del tuo braccio" : R.mcu.id === "ipc" ? "Il programma C++ per il PC industriale" : "Lo sketch del tuo braccio") + '</h3><p>Generato da quello che hai costruito in <b>' + esc(mission().title) + "</b>: pin, rapporti, impulsi per grado, limiti, velocità, emergenza, homing" + (R.J.some(function (o) { return o.torqueLimit; }) ? " e limiti di coppia da impostare nei drive" : "") + ". È una base di partenza: controlla i pin sul tuo schema.</p>" +
      (R.errs ? '<p class="warnline">Il progetto ha ancora ' + R.errs + " errori: lo sketch rispecchia anche le scelte sbagliate.</p>" : "") +
      '<div class="code"><button type="button" class="btn sm" data-copy="gen">Copia</button><pre><code id="gen">' + esc(src) + "</code></pre></div></div>";
    h += '<div class="card quiz"><h3>Quiz</h3><div id="quiz"></div></div>';
    v.innerHTML = h; renderQuiz();
  }
  function renderQuiz() {
    var q = $("#quiz"); if (!q) return;
    var ans = S.quiz || {}, right = 0, done = 0;
    q.innerHTML = LES.QUIZ.map(function (x, i) {
      var a = ans[i]; if (a != null) { done++; if (a === x.ok) right++; }
      return '<div class="qz"><p><b>' + (i + 1) + ".</b> " + esc(x.q) + "</p>" + x.a.map(function (t, j) { var c = a == null ? "" : j === x.ok ? " right" : j === a ? " wrong" : ""; return '<button type="button" class="qa' + c + '" data-q="' + i + '" data-a="' + j + '"' + (a != null ? " disabled" : "") + ">" + esc(t) + "</button>"; }).join("") + (a != null ? '<p class="why">' + esc(x.why) + "</p>" : "") + "</div>";
    }).join("") + '<div class="qres">' + right + " / " + LES.QUIZ.length + " giuste" + (done ? ' <button type="button" class="btn sm ghost" data-act="quizreset">Ricomincia il quiz</button>' : "") + "</div>";
    if (right === LES.QUIZ.length) award("quiz");
  }

  /* ---------- Profilo ---------- */
  function renderProfile() {
    var v = $("#v-profile");
    var h = '<div class="card"><h2>Il tuo laboratorio</h2><p>Progressi salvati solo su questo dispositivo.</p><div class="kv">' + kv("Verifiche fatte", S.verified) + kv("Badge", Object.keys(S.badges).length + " / " + BADGES.length) + kv("Missioni superate", MIS.MISSIONS.filter(function (m) { return S.best[m.id] && S.best[m.id].pass; }).length + " / " + MIS.MISSIONS.length) + "</div></div>";
    h += '<div class="card"><h3>Missioni</h3>' + MIS.MISSIONS.map(function (m) { var b = S.best[m.id]; return '<button type="button" class="mrow" data-mission="' + m.id + '"><div><b>' + esc(m.title) + "</b><small>" + esc(m.short) + '</small></div><div class="mr"><div class="stars s' + (b ? b.stars : 0) + '"></div><small>' + (b ? b.pts + " pt" : "da fare") + "</small></div></button>"; }).join("") + "</div>";
    h += '<div class="card"><h3>Badge</h3><div class="badges">' + BADGES.map(function (b) { return '<div class="badge' + (S.badges[b.id] ? " on" : "") + '"><i></i><b>' + esc(b.t) + "</b><small>" + esc(b.d) + "</small></div>"; }).join("") + "</div></div>";
    h += '<div class="card"><h3>Dati</h3><p>Il catalogo usa valori tipici (cataloghi Nabtesco, Harmonic Drive, Delta, THK, Mean Well e annunci per i cloni cinesi come lo SHPR-40E-121). Sono arrotondati: servono per imparare e per una prima scelta.</p><button type="button" class="btn danger" data-act="wipe">Cancella tutti i progressi</button></div>';
    h += '<p class="disclaimer">XENTRIQ INDUSTRY · Braccio Lab</p>';
    v.innerHTML = h;
  }

  /* ---------- Dispensa ---------- */
  var JOINT_ACTS = ["link", "motor", "reducer", "support", "brake", "driver", "encoder", "bolt"];
  var DEF_PCD = { M3: 30, M4: 40, M5: 60, M6: 80, M8: 110, M10: 150, M12: 190, M16: 240 };
  function priceRange(it) { return fmt(it.pr[0], it.pr[0] < 10 ? 2 : 0) + "–" + fmt(it.pr[1], it.pr[1] < 10 ? 2 : 0) + " €" + (it.unit !== "pz" ? "/" + it.unit : ""); }
  function wireFor(mm2) { var w = CAT.WIRES[CAT.WIRES.length - 1]; for (var i = 0; i < CAT.WIRES.length; i++) if (CAT.WIRES[i].mm2 >= mm2 - 1e-9) { w = CAT.WIRES[i]; break; } return w.id; }
  function linkMatch(l, a) { if (l.mat !== a.mat || l.sec !== a.sec) return false; for (var k in a.dims) if (Math.abs((+l[k] || 0) - a.dims[k]) > 1e-6) return false; return true; }
  function inProject(it, b) {
    b = b || build(); var a = it.act || {}, n = 0, js = b.joints.slice(0, b.axes), e = b.elec;
    if (!a.t) return 0;
    if (a.t === "tool") return S.bench[it.id] ? 1 : 0;
    if (a.t === "shop") return (b.shop && b.shop[it.id]) || 0;
    if (a.t === "levelShift") return e.levelShift ? 1 : 0;
    if (a.t === "effector") return b.effector === a.ref ? 1 : 0;
    if (a.t === "mcu") return e.mcu === a.ref ? 1 : 0;
    if (a.t === "psu") return e.psu === a.ref ? 1 : 0;
    if (a.t === "servoPsu") return e.servoPsu === a.ref ? 1 : 0;
    if (a.t === "estop") return e.estop === a.ref ? 1 : 0;
    if (a.t === "homing") return e.homing === a.ref ? 1 : 0;
    if (a.t === "cable") return e.cable === a.ref ? 1 : 0;
    js.forEach(function (j) {
      if (a.t === "link" && linkMatch(j.link, a)) n++;
      else if (a.t === "bolt" && j.bolt && j.bolt.s === a.s) n++;
      else if (j[a.t] === a.ref) n++;
    });
    return n;
  }
  function fitScore(it) {
    var lv = mission().level; if (!lv) return 1;
    var m = /Missione (\d)(?:[–-](\d))?/.exec(it.fit || ""); if (!m) return 0.5;
    var a = +m[1], z = m[2] ? +m[2] : a; return lv >= a && lv <= z ? 1 : 0;
  }
  function fitLevel(it) { return fitScore(it) > 0; }
  function applyItem(b, it, k, o) {
    o = o || {}; var a = it.act || {}, e = b.elec, j = k != null ? b.joints[k] : null;
    if (a.t === "link") { j.link.mat = a.mat; j.link.sec = a.sec; for (var d in a.dims) j.link[d] = a.dims[d]; return "link " + j.link.L * 1000 + " mm di J" + (k + 1); }
    if (a.t === "motor") { j.motor = a.ref; autoMotor(j); return "J" + (k + 1); }
    if (a.t === "reducer") { j.reducer = a.ref; var Rr = CAT.byId(CAT.REDUCERS, a.ref); if (Rr.ratios.indexOf(+j.ratio) < 0) j.ratio = Rr.ratios[Math.floor(Rr.ratios.length / 2)]; return "J" + (k + 1); }
    if (a.t === "support" || a.t === "brake" || a.t === "driver" || a.t === "encoder") { j[a.t] = a.ref; return "J" + (k + 1); }
    if (a.t === "bolt") { var ob = j.bolt || {}; j.bolt = { s: a.s, c: o.cls || ob.c || "10.9", n: ob.n || 8, pcd: ob.s ? ob.pcd : DEF_PCD[a.s] }; return "flange di J" + (k + 1); }
    if (a.t === "effector") { b.effector = a.ref; return "utensile"; }
    if (a.t === "mcu" || a.t === "psu" || a.t === "servoPsu" || a.t === "estop" || a.t === "homing") { e[a.t] = a.ref; return "elettronica"; }
    if (a.t === "cable") { e.cable = a.ref; var c = CAT.byId(CAT.CABLES, a.ref); if (c.mm2) e.wireMotor = wireFor(c.mm2); return "cavi motore"; }
    if (a.t === "levelShift") { e.levelShift = true; b.shop = b.shop || {}; return "segnali"; }
    if (a.t === "tool") { (o.bench || S.bench)[it.id] = true; return "banco attrezzi"; }
    b.shop = b.shop || {}; b.shop[it.id] = (b.shop[it.id] || 0) + (o.qty || 1); return "distinta";
  }
  function tryItem(it, cls) {
    var base = R, m = mission(), b0 = build(), rows = [], tools = Object.keys(S.bench);
    function run(k) {
      var b = JSON.parse(JSON.stringify(b0)), bench = {}; tools.forEach(function (t) { bench[t] = true; });
      applyItem(b, it, k, { cls: cls, bench: bench, qty: 1 });
      var r = ENG.analyze(b, m, { tools: Object.keys(bench) }), tag = k != null ? "J" + (k + 1) : null;
      var jIss = function (rr) { return rr.issues.filter(function (q) { return q.sev !== "info" && (!tag || (q.joint || "").split(/,\s*/).indexOf(tag) >= 0); }).length; };
      var had = {}; base.issues.forEach(function (q) { had[q.sev + q.title] = 1; });
      var newIss = r.issues.filter(function (q) { return q.sev !== "info" && !had[q.sev + q.title] && (!tag || (q.joint || "").split(/,\s*/).indexOf(tag) >= 0 || !/^J\d/.test(q.joint || "")); });
      return { newIss: newIss, k: k, label: tag ? tag + " · " + ENG.KIND_IT[ENG.KINDS[b0.axes][k]].split(" (")[0] : "Nel progetto", errs: r.errs, warns: r.warns, j0: jIss(base), j1: jIss(r), dc: r.cost.total - base.cost.total, tip: r.defl.err, pass: r.errs === 0 };
    }
    if (JOINT_ACTS.indexOf((it.act || {}).t) >= 0) { for (var k = 0; k < b0.axes; k++) { if (it.act.t === "bolt" && CAT.byId(CAT.MOTORS, b0.joints[k].motor).type === "servo_hobby") continue; rows.push(run(k)); } }
    else rows.push(run(null));
    var best = rows.slice().sort(function (x, y) { return (x.errs - y.errs) || (x.j1 - y.j1) || (x.dc - y.dc); })[0];
    return { rows: rows, best: best };
  }
  function cardHtml(it) {
    var q = inProject(it), sp = it.spec.slice(0, 2).map(function (x) { return x[1]; }).join(" · ");
    return '<button type="button" class="item c-' + it.cat + (q ? " inproj" : "") + '" data-item="' + esc(it.id) + '"><span class="ii">' + ICO.svg(it.icon) + '</span><span class="ib"><b>' + esc(it.name) + "</b><small>" + esc(it.brand) + '</small><span class="sp">' + esc(sp) + '</span></span><span class="if"><span class="pr">' + priceRange(it) + '</span><span class="st ' + (it.stock > 0 ? "ok" : "lo") + '">' + (it.stock > 0 ? "Disponibili " + it.stock : "Su ordinazione · " + it.lead + " sett.") + "</span></span>" + (q ? '<span class="inp">' + (it.act.t === "tool" ? "sul banco" : "nel progetto" + (q > 1 ? " ×" + q : "")) + "</span>" : "") + "</button>";
  }
  function shopFiltered() {
    var D = S.dsp, q = (D.q || "").trim().toLowerCase(), words = q ? q.split(/\s+/) : [];
    var list = PAN.ITEMS.filter(function (it) {
      if (D.cat !== "all" && it.cat !== D.cat) return false;
      if (D.fit && !fitLevel(it)) return false;
      if (D.mine && !inProject(it)) return false;
      if (words.length) { var hay = (it.name + " " + it.brand + " " + it.tips + " " + it.spec.map(function (x) { return x.join(" "); }).join(" ")).toLowerCase(); for (var i = 0; i < words.length; i++) if (hay.indexOf(words[i]) < 0) return false; }
      return true;
    });
    var ord = {}; PAN.CATS.forEach(function (c, i) { ord[c.id] = i; });
    var sorters = { rel: function (a, b) { return (inProject(b) ? 1 : 0) - (inProject(a) ? 1 : 0) || fitScore(b) - fitScore(a) || ord[a.cat] - ord[b.cat] || a.p - b.p; }, pa: function (a, b) { return a.p - b.p; }, pd: function (a, b) { return b.p - a.p; }, nm: function (a, b) { return a.name.localeCompare(b.name, "it"); }, ms: function (a, b) { return (b.mass || 0) - (a.mass || 0); } };
    return list.sort(sorters[D.sort] || sorters.rel);
  }
  function renderShop() {
    var v = $("#v-shop"), D = S.dsp, b = build(); analyze();
    var nb = Object.keys(b.shop || {}).filter(function (k) { return b.shop[k] > 0; }).length, nt = Object.keys(S.bench).length;
    var h = '<div class="card shophead"><div class="shtop"><div><small>XENTRIQ INDUSTRY · magazzino</small><h2>Dispensa</h2><p class="note">' + PAN.ITEMS.length + " articoli in " + PAN.CATS.length + " reparti · valori tipici, marchi come esempio della classe di prodotto</p></div>" + ICO.svg("cabinet", "big") + "</div>";
    h += '<div class="seg" role="tablist">' + [["cat", "Catalogo"], ["bom", "Distinta (" + nb + ")"], ["bench", "Banco attrezzi (" + nt + ")"]].map(function (x) { return '<button type="button" role="tab" data-dseg="' + x[0] + '" class="' + (D.tab === x[0] ? "on" : "") + '">' + x[1] + "</button>"; }).join("") + "</div></div>";
    h += '<div id="shopBody"></div>';
    v.innerHTML = h; renderShopBody();
  }
  function renderShopBody() {
    var D = S.dsp, sb = $("#shopBody"); if (!sb) return;
    if (D.tab === "bom") { sb.innerHTML = bomHtml(); applyBars(sb); return; }
    if (D.tab === "bench") { sb.innerHTML = benchHtml(); return; }
    var cnt = {}; PAN.ITEMS.forEach(function (it) { cnt[it.cat] = (cnt[it.cat] || 0) + 1; });
    var h = '<div class="card shopfilters"><label class="srch"><span class="sr-only">Cerca nella Dispensa</span><input type="search" id="dq" placeholder="Cerca: M8, catena, PLC, SHPR, pinza…" value="' + esc(D.q) + '" autocomplete="off"></label>';
    h += '<div class="chips" id="dcats"><button type="button" class="chip' + (D.cat === "all" ? " on" : "") + '" data-dcat="all">Tutto <i>' + PAN.ITEMS.length + "</i></button>" + PAN.CATS.map(function (c) { return '<button type="button" class="chip c-' + c.id + (D.cat === c.id ? " on" : "") + '" data-dcat="' + c.id + '">' + ICO.svg(c.icon, "sm") + esc(c.name) + " <i>" + cnt[c.id] + "</i></button>"; }).join("") + "</div>";
    h += '<div class="filt"><label class="fld inl"><span>Ordina</span><select id="dsort">' + [["rel", "Consigliati"], ["pa", "Prezzo crescente"], ["pd", "Prezzo decrescente"], ["nm", "Nome"], ["ms", "Più pesanti"]].map(function (x) { return '<option value="' + x[0] + '"' + (D.sort === x[0] ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") + '</select></label><button type="button" class="chip tog' + (D.fit ? " on" : "") + '" data-dtog="fit">Per questa missione</button><button type="button" class="chip tog' + (D.mine ? " on" : "") + '" data-dtog="mine">Nel progetto</button></div></div>';
    h += '<div class="grid" id="dgrid"></div>';
    sb.innerHTML = h; renderGrid();
  }
  function renderGrid() {
    var g = $("#dgrid"); if (!g) return;
    var list = shopFiltered(), lim = S.dsp.lim || 40;
    g.innerHTML = (list.length ? list.slice(0, lim).map(cardHtml).join("") : '<p class="empty">Nessun articolo con questi filtri.</p>') + (list.length > lim ? '<button type="button" class="btn ghost more" data-act="dmore">Mostra altri ' + Math.min(40, list.length - lim) + " (di " + (list.length - lim) + ")</button>" : "");
    var c = $("#dcount"); if (c) c.textContent = list.length;
  }
  function openItem(id, cls) {
    var it = PAN.byId(id); if (!it) return;
    var a = it.act || {}, b = build(), m = mission(), q = inProject(it), jl = JOINT_ACTS.indexOf(a.t) >= 0;
    var curCls = cls || (a.t === "bolt" ? (S.dspCls || "10.9") : null);
    var tr = a.t === "tool" && S.bench[it.id] ? null : tryItem(it, curCls);
    var tgt = jl ? (S.dspTgt != null && tr.rows.some(function (r) { return r.k === S.dspTgt; }) ? S.dspTgt : typeof S.tab === "number" && S.tab < b.axes && tr.rows.some(function (r) { return r.k === S.tab; }) ? S.tab : (tr.best ? tr.best.k : 0)) : null;
    var h = '<div class="sheet-in itemsheet" role="dialog" aria-label="' + esc(it.name) + '"><div class="sh-h"><h3>' + esc(it.name) + '</h3><button type="button" class="x" data-act="closesheet" aria-label="Chiudi">✕</button></div>';
    h += '<div class="ihero c-' + it.cat + '"><span class="ii">' + ICO.svg(it.icon, "big") + '</span><div><span class="vt">valori tipici</span><div class="price">' + priceRange(it) + "</div><small>prezzo tipico " + fmt(it.p, it.p < 10 ? 2 : 0) + " €" + (it.unit !== "pz" ? "/" + it.unit : "") + " · " + (it.stock > 0 ? "disponibili " + it.stock : "su ordinazione") + " · consegna ~" + it.lead + " sett.</small><small>" + esc(it.brand) + "</small></div></div>";
    if (it.spec.length) h += '<table class="spec"><tbody>' + it.spec.map(function (x) { return "<tr><th>" + esc(x[0]) + "</th><td>" + esc(x[1]) + "</td></tr>"; }).join("") + "</tbody></table>";
    if (it.tips) h += '<p class="tip">' + esc(it.tips) + "</p>";
    if (it.fit) h += '<p class="note"><b>Dove si usa:</b> ' + esc(it.fit) + (q ? " · <b>nel tuo progetto" + (q > 1 ? " ×" + q : "") + "</b>" : "") + "</p>";
    if (tr) {
      h += '<div class="trial"><h4>Prova sul tuo progetto · ' + esc(m.title) + "</h4>";
      h += tr.rows.map(function (r) { var dj = r.j1 - r.j0; return '<div class="trow' + (tr.best === r && tr.rows.length > 1 ? " best" : "") + '"><b>' + esc(r.label) + '</b><span class="' + (r.pass ? "ok" : "err") + '">' + r.errs + " errori · " + r.warns + " avvisi</span>" + (jl ? '<span class="' + (dj < 0 ? "ok" : dj > 0 ? "err" : "") + '">giunto ' + (dj === 0 ? "=" : (dj > 0 ? "+" : "") + dj) + "</span>" : "") + "<span>" + (r.dc >= 0 ? "+" : "−") + fmt(Math.abs(r.dc), 0) + " €</span><span>punta " + fmt(r.tip, 2) + " mm</span>" + (r.newIss.length ? '<ul class="tnew">' + r.newIss.slice(0, 4).map(function (q) { return '<li class="' + q.sev + '">' + esc(q.title) + "</li>"; }).join("") + "</ul>" : "") + "</div>"; }).join("");
      h += '<p class="note">Ora: ' + R.errs + " errori, " + R.warns + " avvisi, " + fmt(R.cost.total, 0) + " €, punta " + fmt(R.defl.err, 2) + " mm." + (tr.best && jl ? " Il posto migliore è <b>" + tr.best.label.split(" ·")[0] + "</b>." : "") + "</p></div>";
      var ref = jl ? tr.rows.filter(function (r) { return r.k === tgt; })[0] || tr.best : tr.rows[0];
      if (ref && m.budget) { var tot = R.cost.total + ref.dc; h += '<p class="budget">Impatto sul budget: <b>' + (ref.dc >= 0 ? "+" : "−") + fmt(Math.abs(ref.dc), 0) + " €</b> (" + fmt(Math.abs(ref.dc) / m.budget * 100, 1) + "% del budget) · " + (tot <= m.budget ? "restano " + fmt(m.budget - tot, 0) + " €" : "<span class=\"err\">sfori di " + fmt(tot - m.budget, 0) + " €</span>") + "</p>"; }
    }
    h += '<div class="addbox">';
    if (jl) h += '<label class="fld"><span>Monta su</span><select id="dTarget">' + tr.rows.map(function (r) { return '<option value="' + r.k + '"' + (r.k === tgt ? " selected" : "") + ">" + esc(r.label) + "</option>"; }).join("") + "</select></label>";
    if (a.t === "bolt") h += '<label class="fld"><span>Classe</span><select id="dCls">' + CAT.BOLT_CLASSES.map(function (c) { return '<option value="' + c.id + '"' + (c.id === curCls ? " selected" : "") + ">" + c.id + " · MA " + fmt(it.bolt.MA[c.i], 1) + " N·m</option>"; }).join("") + "</select></label>";
    if (a.t === "shop") h += '<div class="fld qty"><span>Quantità</span><div class="stepper"><button type="button" data-qd="-1" aria-label="meno">−</button><input type="number" id="dQty" value="1" min="1" max="99" inputmode="numeric"><button type="button" data-qd="1" aria-label="più">+</button></div></div>';
    var lbl = a.t === "tool" ? (S.bench[it.id] ? "Già sul banco" : "Aggiungi al banco attrezzi") : jl ? "Monta nel progetto" : q && a.t !== "shop" ? "Già nel progetto" : "Aggiungi al progetto";
    h += '<button type="button" class="btn big" data-act="dadd" data-id="' + esc(it.id) + '"' + ((a.t === "tool" && S.bench[it.id]) || (!jl && q && a.t !== "shop") ? " disabled" : "") + ">" + lbl + "</button>";
    if ((a.t === "shop" && q) || (a.t === "tool" && S.bench[it.id])) h += '<button type="button" class="btn ghost" data-act="ddel" data-id="' + esc(it.id) + '">Togli ' + (a.t === "tool" ? "dal banco" : "dalla distinta") + "</button>";
    h += "</div></div>";
    var sh = $("#sheet"); sh.innerHTML = h; sh.hidden = false; S.dspOpen = id;
  }
  function addFromSheet(id) {
    var it = PAN.byId(id), b = build(), a = it.act || {}, k = null;
    if (JOINT_ACTS.indexOf(a.t) >= 0) { var t = $("#dTarget"); k = t ? +t.value : 0; }
    var cls = $("#dCls") ? $("#dCls").value : null, qty = $("#dQty") ? Math.max(1, Math.min(99, parseInt($("#dQty").value, 10) || 1)) : 1;
    if (cls) S.dspCls = cls;
    var where = applyItem(b, it, k, { cls: cls, qty: qty });
    S.added = (S.added || 0) + 1; if (S.added >= 10) award("shop10");
    save(); analyze(); renderStatus();
    $("#sheet").hidden = true;
    toast("Aggiunto: " + it.name.split(" (")[0] + " → " + where);
    var tb = $('#tabbar [data-v="shop"]'); if (tb) { tb.classList.remove("bump"); void tb.offsetWidth; tb.classList.add("bump"); }
    if (S.view === "shop") renderShop();
  }
  function removeShop(id) { var it = PAN.byId(id), b = build(); if (it.act.t === "tool") delete S.bench[id]; else if (b.shop) delete b.shop[id]; save(); analyze(); renderStatus(); }
  function bomHtml() {
    var b = build(), m = mission(), L = ASM.bom(b, R), grpOrder = ["Struttura", "Motori", "Riduttori", "Cuscinetti e freni", "Pinze e utensili", "Elettronica", "Sensori", "Sicurezza", "Bulloneria", "Dalla Dispensa"];
    var sum = L.reduce(function (s, l) { return s + l.tot; }, 0), rest = R.cost.total - sum;
    var h = '<div class="card bomhead"><h3>Distinta materiali · ' + esc(m.title) + '</h3><div class="kv">' + kv("Costo totale", fmt(R.cost.total, 0) + " €") + kv("Budget", fmt(m.budget, 0) + " €") + kv("Massa braccio", fmt(R.mass, 1) + " kg") + kv("Righe", L.length) + kv("Dalla Dispensa", fmt(R.cost.dispensa || 0, 0) + " €") + kv("Errori / avvisi", R.errs + " / " + R.warns) + "</div>";
    h += '<div class="meter"><div class="ml"><span>Budget usato</span><b class="' + (R.cost.total > m.budget ? "err" : R.cost.total > 0.85 * m.budget ? "warn" : "ok") + '">' + fmt(R.cost.total / m.budget * 100, 0) + " %</b></div>" + bar(R.cost.total, m.budget, R.cost.total > m.budget ? "err" : R.cost.total > 0.85 * m.budget ? "warn" : "ok") + "</div>";
    h += '<div class="row btns"><button type="button" class="btn ghost" data-act="bomcopy">Copia distinta</button><button type="button" class="btn ghost" data-dseg="cat">Aggiungi dalla Dispensa</button></div></div>';
    grpOrder.forEach(function (g) {
      var rows = L.filter(function (l) { return l.grp === g; }); if (!rows.length) return;
      h += '<div class="card bomgrp"><h3>' + g + ' <small>' + fmt(rows.reduce(function (s, l) { return s + l.tot; }, 0), 0) + " €</small></h3>" + rows.map(function (l) {
        return '<div class="brow"><div class="bn">' + esc(l.name) + "<small>" + l.q + " " + l.unit + (l.p ? " × " + fmt(l.p, l.p < 10 ? 2 : 0) + " €" : "") + (l.mass ? " · " + fmt(l.mass, 2) + " kg" : "") + '</small></div><div class="bt">' + fmt(l.tot, l.tot < 10 ? 2 : 0) + " €</div>" + (l.shop ? '<div class="bq"><button type="button" data-dq="' + esc(l.id) + '" data-d="-1" aria-label="meno">−</button><button type="button" data-dq="' + esc(l.id) + '" data-d="1" aria-label="più">+</button></div>' : (l.id ? '<button type="button" class="bi" data-item="' + esc(l.id) + '" aria-label="Scheda">i</button>' : "")) + "</div>";
      }).join("") + "</div>";
    });
    if (rest > 0.5) h += '<div class="card bomgrp"><div class="brow"><div class="bn">Lavorazioni, cablaggio generico e minuteria<small>stima del motore di calcolo</small></div><div class="bt">' + fmt(rest, 0) + " €</div></div></div>";
    var iss = R.issues.filter(function (q) { return ["montaggio", "pneumatica", "pinza", "cavi", "plc"].indexOf(q.cat) >= 0; });
    if (iss.length) h += '<div class="card"><h3>Controlli di montaggio, cablaggio e PLC</h3>' + iss.map(issueCard).join("") + "</div>";
    return h;
  }
  function bomText() {
    var L = ASM.bom(build(), R), m = mission();
    return "Distinta · " + m.title + "\n" + L.map(function (l) { return l.grp + "\t" + l.name + "\t" + l.q + " " + l.unit + "\t" + fmt(l.tot, 2) + " €"; }).join("\n") + "\nTOTALE (con lavorazioni)\t\t\t" + fmt(R.cost.total, 0) + " €\nValori tipici – XENTRIQ INDUSTRY Braccio Lab\n";
  }
  function benchHtml() {
    var ids = Object.keys(S.bench), val = ids.reduce(function (s, id) { var t = PAN.byId(id); return s + (t ? t.p : 0); }, 0), req0 = R.asm && R.asm.tools ? R.asm.tools : [], req = [], rk = {};
    req0.forEach(function (x) { var key = (x.sug || x.kind) + (x.ok ? "1" : "0"); if (rk[key]) { if (rk[key].why.indexOf(x.why) < 0) rk[key].why += " · " + x.why; if (x.sev === "err") rk[key].sev = "err"; return; } rk[key] = { ok: x.ok, sev: x.sev, sug: x.sug, sugName: x.sugName, why: x.why }; req.push(rk[key]); });
    var h = '<div class="card"><h3>Banco attrezzi</h3><p class="note">Gli attrezzi restano sul banco per tutte le missioni e non entrano nel budget del robot. Valore del banco: <b>' + fmt(val, 0) + " €</b>.</p>";
    var okN = req.filter(function (x) { return x.ok; }).length;
    h += '<div class="meter"><div class="ml"><span>Attrezzi per montare questo progetto</span><b class="' + (okN === req.length ? "ok" : "warn") + '">' + okN + " / " + req.length + "</b></div>" + bar(okN, req.length || 1, okN === req.length ? "ok" : "warn") + "</div>";
    h += '<div class="reqs">' + req.map(function (x) { return '<div class="req1 ' + (x.ok ? "ok" : x.sev) + '"><span class="ck">' + (x.ok ? "✓" : "✕") + "</span><div><b>" + esc(x.sugName) + "</b><small>" + esc(x.why) + "</small></div>" + (!x.ok && x.sug ? '<button type="button" class="btn sm" data-tooladd="' + esc(x.sug) + '">Aggiungi</button>' : "") + "</div>"; }).join("") + "</div>";
    if (req.some(function (x) { return !x.ok && x.sug; })) h += '<button type="button" class="btn" data-act="toolsall">Aggiungi tutti quelli mancanti</button>';
    h += "</div>";
    var steps = ASM.steps(build(), R, ids);
    h += '<div class="card"><h3>Passi di montaggio</h3><ol class="steps">' + steps.map(function (s) { return '<li class="' + (s.ready ? "ok" : "") + '"><b>' + esc(s.t) + '</b><span class="tchips">' + s.tools.map(function (t) { return '<span class="tc ' + (t.ok ? "ok" : "no") + '">' + (t.ok ? "✓ " : "✕ ") + esc(t.name.split(" (")[0]) + "</span>"; }).join("") + "</span></li>"; }).join("") + "</ol></div>";
    h += '<div class="card"><h3>Sul banco (' + ids.length + ")</h3>" + (ids.length ? '<div class="grid small">' + ids.map(function (id) { var t = PAN.byId(id); return t ? cardHtml(t) : ""; }).join("") + "</div>" : '<p class="note">Il banco è vuoto: apri il reparto Attrezzi.</p>') + '<button type="button" class="btn ghost" data-act="dtools">Apri il reparto Attrezzi</button></div>';
    return h;
  }

  /* ---------- navigazione ---------- */
  function show(view) {
    S.view = view; save();
    $$(".view").forEach(function (s) { s.hidden = s.id !== "v-" + view; });
    $$("#tabbar button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-v") === view); });
    if (view === "build") renderBuild(); else if (view === "check") renderCheck(); else if (view === "shop") renderShop(); else if (view === "guide") renderGuide(); else if (view === "cpp") renderCpp(); else renderProfile();
    analyze(); renderStatus();
    window.scrollTo(0, 0);
  }
  function openMissions() {
    var sh = $("#sheet");
    sh.innerHTML = '<div class="sheet-in" role="dialog" aria-label="Scegli la missione"><div class="sh-h"><h3>Scegli la missione</h3><button type="button" class="x" data-act="closesheet" aria-label="Chiudi">✕</button></div>' + MIS.MISSIONS.map(function (m) { var b = S.best[m.id]; return '<button type="button" class="mrow' + (m.id === S.mission ? " cur" : "") + '" data-mission="' + m.id + '"><div><b>' + esc(m.title) + "</b><small>" + esc(m.short) + '</small></div><div class="mr"><div class="stars s' + (b ? b.stars : 0) + '"></div></div></button>'; }).join("") + "</div>";
    sh.hidden = false;
  }
  function toast(t) { var el = $("#toast"); el.textContent = t; el.hidden = false; el.classList.add("in"); clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove("in"); el.hidden = true; }, 2600); }
  function copyText(txt) {
    function fallback() { var ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) { /* niente */ } document.body.removeChild(ta); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).catch(fallback); else fallback();
    toast("Copiato negli appunti");
  }

  document.addEventListener("click", function (ev) {
    var t = ev.target.closest("button, [data-act]"); if (!t) return;
    var act = t.getAttribute("data-act");
    if (t.closest("#tabbar")) { show(t.getAttribute("data-v")); return; }
    if (t.hasAttribute("data-dseg")) { S.dsp.tab = t.getAttribute("data-dseg"); save(); if (S.view !== "shop") show("shop"); else renderShop(); return; }
    if (t.hasAttribute("data-dcat")) { S.dsp.cat = t.getAttribute("data-dcat"); S.dsp.lim = 40; save(); renderShopBody(); return; }
    if (t.hasAttribute("data-dtog")) { var tg = t.getAttribute("data-dtog"); S.dsp[tg] = !S.dsp[tg]; S.dsp.lim = 40; save(); renderShopBody(); return; }
    if (t.hasAttribute("data-dsp")) { S.dsp.tab = "cat"; S.dsp.cat = t.getAttribute("data-dsp"); S.dsp.q = ""; S.dsp.lim = 40; show("shop"); return; }
    if (t.hasAttribute("data-item")) { S.dspTgt = null; openItem(t.getAttribute("data-item")); return; }
    if (t.hasAttribute("data-qd")) { var qi = $("#dQty"); if (qi) qi.value = Math.max(1, Math.min(99, (parseInt(qi.value, 10) || 1) + +t.getAttribute("data-qd"))); return; }
    if (t.hasAttribute("data-dq")) { var did = t.getAttribute("data-dq"), bb = build(); bb.shop[did] = (bb.shop[did] || 0) + +t.getAttribute("data-d"); if (bb.shop[did] <= 0) delete bb.shop[did]; save(); analyze(); renderStatus(); renderShop(); return; }
    if (t.hasAttribute("data-tooladd")) { var tid = t.getAttribute("data-tooladd"); S.bench[tid] = true; save(); analyze(); renderStatus(); renderShop(); toast("Sul banco: " + PAN.byId(tid).name); return; }
    if (t.hasAttribute("data-tab")) { var tb = t.getAttribute("data-tab"); S.tab = tb === "el" ? "el" : +tb; save(); renderTabs(); renderPanel(); updateLive(); var p = $("#jtabs"); if (p) p.scrollIntoView({ block: "start", behavior: "smooth" }); return; }
    if (t.hasAttribute("data-mission")) { S.mission = t.getAttribute("data-mission"); S.tab = 0; save(); $("#sheet").hidden = true; show("build"); return; }
    if (t.hasAttribute("data-copy")) { var id = t.getAttribute("data-copy"); copyText($("#" + id).textContent); if (id === "gen") award("coder"); return; }
    if (t.hasAttribute("data-q")) { S.quiz = S.quiz || {}; S.quiz[t.getAttribute("data-q")] = +t.getAttribute("data-a"); save(); renderQuiz(); return; }
    if (t.id === "missionChip" || act === "missions") { openMissions(); return; }
    if (act === "closesheet") { $("#sheet").hidden = true; return; }
    if (act === "verify") { verify(); return; }
    if (act === "gocheck") { verify(); return; }
    if (act === "gobuild") { show("build"); return; }
    if (act === "reset") { if (confirm("Ricominciare questa missione dal braccio di partenza?")) { delete S.builds[S.mission]; S.tab = 0; save(); renderBuild(); } return; }
    if (act === "solution") { if (confirm("Caricare un esempio di soluzione? Il tuo braccio di questa missione verrà sostituito.")) { S.builds[S.mission] = pad(MIS.clone(mission().solution)); (mission().tools || []).forEach(function (t) { S.bench[t] = true; }); S.tab = 0; save(); renderBuild(); toast("Esempio caricato (con gli attrezzi consigliati sul banco): prova a migliorarlo"); } return; }
    if (act === "dmore") { S.dsp.lim = (S.dsp.lim || 40) + 40; renderGrid(); return; }
    if (act === "dadd") { addFromSheet(t.getAttribute("data-id")); return; }
    if (act === "ddel") { var rid = t.getAttribute("data-id"); removeShop(rid); $("#sheet").hidden = true; toast("Tolto: " + PAN.byId(rid).name.split(" (")[0]); if (S.view === "shop") renderShop(); else if (S.view === "build") renderBuild(); return; }
    if (act === "bomcopy") { copyText(bomText()); return; }
    if (act === "toolsall") { (R.asm && R.asm.tools || []).forEach(function (x) { if (!x.ok && x.sug) S.bench[x.sug] = true; }); save(); analyze(); renderStatus(); renderShop(); toast("Attrezzi mancanti aggiunti al banco"); return; }
    if (act === "dtools") { S.dsp.tab = "cat"; S.dsp.cat = "attrezzi"; S.dsp.lim = 40; save(); renderShop(); return; }
    if (act === "quizreset") { S.quiz = {}; save(); renderQuiz(); return; }
    if (act === "wipe") { if (confirm("Cancellare progressi, badge e progetti?")) { try { localStorage.removeItem(KEY); } catch (e) { /* niente */ } S = load(); S.builds = {}; show("build"); } return; }
  });
  $("#sheet").addEventListener("click", function (ev) { if (ev.target.id === "sheet") $("#sheet").hidden = true; });
  var inT = null;
  document.addEventListener("change", function (ev) {
    var el = ev.target; if (!el.hasAttribute) return;
    if (el.hasAttribute("data-f")) { setField(el); return; }
    if (el.id === "dsort") { S.dsp.sort = el.value; S.dsp.lim = 40; save(); renderGrid(); return; }
    if (el.id === "dTarget") { S.dspTgt = +el.value; openItem(S.dspOpen, $("#dCls") ? $("#dCls").value : null); return; }
    if (el.id === "dCls") { S.dspCls = el.value; openItem(S.dspOpen, el.value); return; }
  });
  var dqT = null;
  document.addEventListener("input", function (ev) { if (ev.target.id === "dq") { var v = ev.target.value; clearTimeout(dqT); dqT = setTimeout(function () { S.dsp.q = v; S.dsp.lim = 40; save(); renderGrid(); }, 160); } });
  document.addEventListener("input", function (ev) { var el = ev.target; if (el.type === "number" && el.hasAttribute("data-f") && el.getAttribute("data-f").charAt(0) !== "m") { clearTimeout(inT); inT = setTimeout(function () { setField(el); }, 250); } });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") $("#sheet").hidden = true; });

  if (window.top !== window.self) document.documentElement.classList.add("framed");
  show(S.view || "build");
})();
