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
    var d = { v: 1, mission: "m1", builds: {}, best: {}, badges: {}, quiz: {}, guideSeen: {}, verified: 0, sandbox: {}, tab: 0, view: "build" };
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
    return b;
  }
  function build() { if (!S.builds[S.mission]) S.builds[S.mission] = starterFor(mission()); return S.builds[S.mission]; }
  var R = null;
  function analyze() { R = ENG.analyze(build(), mission()); return R; }

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
      sel("b.effector", null, opts(CAT.EFFECTORS, b.effector, null, null, function (x) { return x.name + " · " + fmt(x.mass, x.mass < 1 ? 2 : 1) + " kg"; }), "Utensile / pinza") + "</div></div>";
    h += '<div class="tabs" id="jtabs" role="tablist"></div><div id="panel"></div>';
    h += '<div class="verify-bar"><button type="button" class="btn big" data-act="verify">Verifica progetto</button></div>';
    v.innerHTML = h;
    renderTabs(); renderPanel(); updateLive();
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
    h += '<div class="grp"><h4>Motore e trasmissione</h4>' + sel("j.motor", k, opts(CAT.MOTORS, j.motor, MOT_GROUPS, "type", priceLbl), "Motore");
    h += '<div class="row red">' + sel("j.reducer", k, opts(CAT.REDUCERS, j.reducer, RED_GROUPS, "type", priceLbl), "Riduttore") + sel("j.ratio", k, ratios, "Rapporto") + "</div>";
    if (R0.note) h += '<p class="note">' + esc(R0.note) + "</p>";
    h += sel("j.brake", k, opts(CAT.BRAKES, j.brake, null, null, priceLbl), "Freno", kind === "pitch" ? "asse che porta peso" : "");
    h += "</div>";
    h += '<div class="grp"><h4>Supporto e cuscinetti</h4>' + sel("j.support", k, opts(CAT.SUPPORTS, j.support, SUP_GROUPS, "kind", priceLbl), "Supporto d'uscita");
    if (Sup.kind === "pair") h += '<div class="row three">' + sel("j.shaftMat", k, opts(CAT.MATERIALS.filter(function (x) { return !x.plastic && !x.brittle; }), j.shaftMat || "c45"), "Materiale albero") + num("j.a", k, j.a, "Interasse a", "mm", 5, 10) + num("j.b", k, j.b, "Sbalzo b", "mm", 5, 0) + "</div>";
    else h += num("j.b", k, j.b, "Sbalzo link–flangia b", "mm", 5, 0);
    h += "</div>";
    h += '<div class="grp"><h4>Elettronica dell\'asse</h4><div class="row wide2">' + sel("j.driver", k, opts(CAT.DRIVERS, j.driver, null, null, function (x) { return (x.for.indexOf(M0.type) >= 0 ? "" : "✕ ") + priceLbl(x); }), "Driver") +
      sel("j.encoder", k, opts(CAT.ENCODERS, j.encoder, null, null, function (x) { return (x.onlyFor && x.onlyFor.indexOf(M0.type) < 0 ? "✕ " : "") + priceLbl(x); }), "Encoder") + "</div></div>";
    var l = j.link, secDef = CAT.byId(CAT.SECTIONS, l.sec);
    h += '<div class="grp"><h4>' + (k === 0 ? "Colonna (dalla base alla spalla)" : "Link dopo il giunto") + "</h4>";
    h += '<div class="row two">' + sel("l.mat", k, opts(CAT.MATERIALS, l.mat), "Materiale") + sel("l.sec", k, opts(CAT.SECTIONS, l.sec), "Sezione") + "</div>";
    var lbl = { D: "Diametro D", t: "Spessore t", B: "Larghezza B", H: "Altezza H" };
    h += '<div class="row four">' + secDef.dims.map(function (d) { return num("l." + d, k, l[d], lbl[d], "mm", d === "t" ? 0.5 : 1, 0.1); }).join("") + num("l.L", k, Math.round(l.L * 1000), "Lunghezza", "mm", 5, 0) + "</div>";
    var mat = CAT.byId(CAT.MATERIALS, l.mat);
    h += '<p class="note">' + esc(mat.note) + " R<sub>e</sub> " + mat.Re + " MPa · E " + mat.E + " GPa · " + fmt(mat.rho, 0) + " kg/m³</p></div>";
    h += '<div id="jlive"></div></div>';
    p.innerHTML = h;
  }
  function elecPanel(b) {
    var e = b.elec;
    var h = '<div class="card panel"><div class="ph"><h3>Elettronica</h3><span>controllo, alimentazione, cavi, sicurezza</span></div>';
    h += '<div class="grp"><h4>Controllo</h4>' + sel("e.mcu", null, opts(CAT.MCUS, e.mcu, null, null, function (x) { return x.name + " · " + x.price + " €"; }), "Microcontrollore / controllore");
    h += '<div class="row two">' + sel("e.bus", null, opts(CAT.BUSES, e.bus), "Bus preferito verso i drive") + sel("e.micro", null, [1, 2, 4, 8, 16, 32].map(function (x) { return '<option value="' + x + '"' + (+e.micro === x ? " selected" : "") + ">" + x + "</option>"; }).join(""), "Microstep stepper") + "</div>";
    h += chk("e.levelShift", e.levelShift, "Traslatori di livello 3,3 ↔ 5 V sui segnali (74HCT245, partitori)") + chk("e.torqueLimit", e.torqueLimit, "Limiti di coppia impostati nei drive (proteggono i riduttori)") + "</div>";
    h += '<div class="grp"><h4>Alimentazione</h4>' + sel("e.psu", null, opts(CAT.PSUS, e.psu, null, null, priceLbl), "Alimentatore motori (DC)") + chk("e.aux24", e.aux24, "Alimentatore ausiliario 24 V per freni e logica (30 €)") + sel("e.servoPsu", null, opts(CAT.SERVO_PSUS, e.servoPsu, null, null, priceLbl), "Alimentatore servo hobby") + "</div>";
    h += '<div class="grp"><h4>Cavi e protezioni</h4><div class="row three">' + sel("e.wireMotor", null, opts(CAT.WIRES, e.wireMotor, null, null, function (x) { return x.mm2 + " mm² (AWG " + x.awg + ") · " + x.A + " A"; }), "Cavi motore") +
      sel("e.wirePower", null, opts(CAT.WIRES, e.wirePower, null, null, function (x) { return x.mm2 + " mm² (AWG " + x.awg + ") · " + x.A + " A"; }), "Cavo alimentazione") +
      sel("e.fuse", null, CAT.FUSES.map(function (x) { return '<option value="' + x + '"' + (+e.fuse === x ? " selected" : "") + ">" + (x ? x + " A" : "nessuno") + "</option>"; }).join(""), "Fusibile bus") + "</div></div>";
    h += '<div class="grp"><h4>Sicurezza</h4>' + sel("e.estop", null, opts(CAT.ESTOPS, e.estop, null, null, priceLbl), "Arresto di emergenza") + sel("e.homing", null, opts(CAT.HOMING, e.homing, null, null, function (x) { return x.name + (x.price ? " · " + x.price + " €/asse" : ""); }), "Finecorsa / homing") + "</div>";
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
    h += '<p class="note">Motore a ' + fmt(o.nMot, 0) + " giri/min per " + fmt(mission().speed, 0) + " °/s al giunto · rapporto " + fmt(o.i, o.i % 1 ? 1 : 0) + ":1, rendimento " + fmt(o.eta * 100, 0) + "%" + (o.torqueLimit ? " · limite di coppia consigliato " + fmt(o.torqueLimit, 2) + " N·m" : "") + "</p>";
    var mine = R.issues.filter(function (q) { return (q.joint || "").split(/,\s*/).indexOf(o.name) >= 0; });
    h += mine.length ? mine.map(issueCard).join("") : '<div class="icard ok"><div class="it"><span class="sv">OK</span>Nessun problema su questo giunto</div></div>';
    return h + "</div>";
  }
  function elecLive() {
    var p = R.power, e = R.elec, h = '<div class="live"><h4>Numeri dell\'impianto</h4><div class="kv">';
    h += kv("Potenza DC stimata", fmt(p.Ptot, 0) + " W") + kv("Alimentatore", p.psuW ? fmt(p.psuW, 0) + " W" : "—") + kv("Corrente bus", fmt(p.Ibus, 1) + " A") + kv("Servo AC (rete)", p.Pac ? fmt(p.Pac, 0) + " W" : "—") + kv("Servo hobby", p.servoRun ? fmt(p.servoRun, 1) + " A (stallo " + fmt(p.servoStall, 1) + ")" : "—") + kv("Pin usati", R.mcu.id === "ipc" ? "bus" : e.pinsUsed + " / " + e.pinsAvail) + kv("Impulsi step", fmt(e.stepRate, 0) + "/s") + kv("Encoder A/B sul MCU", e.abCount) + "</div>";
    if (p.psuW) h += '<div class="meter"><div class="ml"><span>Carico alimentatore</span><b class="' + (p.Ptot > p.psuW ? "err" : p.Ptot * 1.25 > p.psuW ? "warn" : "ok") + '">' + fmt(p.Ptot / p.psuW * 100, 0) + " %</b></div>" + bar(p.Ptot, p.psuW, p.Ptot > p.psuW ? "err" : p.Ptot * 1.25 > p.psuW ? "warn" : "ok") + "</div>";
    var mine = R.issues.filter(function (q) { return ["elettronica", "cavi", "sicurezza"].indexOf(q.cat) >= 0 && !/^J\d/.test(q.joint); });
    h += mine.length ? mine.map(issueCard).join("") : '<div class="icard ok"><div class="it"><span class="sv">OK</span>Impianto senza problemi</div></div>';
    return h + "</div>";
  }
  function applyBars(root) { $$(".bar i", root).forEach(function (i) { i.style.width = (parseFloat(i.getAttribute("data-w")) * 100).toFixed(1) + "%"; }); }
  function updateLive() {
    analyze(); renderStatus();
    var vz = $("#viz"); if (vz) { vz.innerHTML = VIZ.render(build(), R, mission(), { narrow: vz.clientWidth < 520 }); var cp = $("#vizCap"); if (cp) cp.textContent = window.VIZ_CAP || ""; var lg = $("#dflLg"), vl = window.VIZ_LAST; if (lg) lg.textContent = vl ? "cedimento sotto carico " + fmt(vl.tipD, 2) + " mm " + (vl.big ? "(fuori scala)" : vl.ex > 1.5 ? "(disegnato ×" + Math.round(vl.ex) + ")" : "(scala reale)") : "cedimento"; }
    var jl = $("#jlive");
    if (jl) { jl.innerHTML = S.tab === "el" ? elecLive() : (R.J[S.tab] ? jointLive(R.J[S.tab]) : ""); applyBars(jl); }
    $$("[data-dot]").forEach(function (d) {
      var name = d.getAttribute("data-dot"), sv = 0;
      if (name === "EL") R.issues.forEach(function (q) { if (["elettronica", "cavi", "sicurezza"].indexOf(q.cat) >= 0 && !/^J\d/.test(q.joint)) sv = Math.max(sv, q.sev === "err" ? 2 : q.sev === "warn" ? 1 : 0); });
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
    if (grp === "b") { if (key === "axes") { b.axes = +val; structural = true; } else b[key] = val; }
    else if (grp === "e") { b.elec[key] = (key === "micro" || key === "fuse") ? +val : val; structural = key === "mcu"; }
    else if (grp === "m") { S.sandbox[key] = key === "reach" ? val / 1000 : val; structural = true; }
    else if (grp === "j") {
      var j = b.joints[+k];
      if (key === "ratio") j.ratio = +val;
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
    { id: "study", t: "Studioso", d: "Hai letto tutti i passi della guida." }
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
    h += '<div class="card gen"><h3>Lo sketch del tuo braccio</h3><p>Generato da quello che hai costruito in <b>' + esc(mission().title) + "</b>: pin, rapporti, impulsi per grado, limiti, velocità, emergenza, homing" + (R.J.some(function (o) { return o.torqueLimit; }) ? " e limiti di coppia da impostare nei drive" : "") + ". È una base di partenza: controlla i pin sul tuo schema.</p>" +
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

  /* ---------- navigazione ---------- */
  function show(view) {
    S.view = view; save();
    $$(".view").forEach(function (s) { s.hidden = s.id !== "v-" + view; });
    $$("#tabbar button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-v") === view); });
    if (view === "build") renderBuild(); else if (view === "check") renderCheck(); else if (view === "guide") renderGuide(); else if (view === "cpp") renderCpp(); else renderProfile();
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
    if (act === "solution") { if (confirm("Caricare un esempio di soluzione? Il tuo braccio di questa missione verrà sostituito.")) { S.builds[S.mission] = pad(MIS.clone(mission().solution)); S.tab = 0; save(); renderBuild(); toast("Esempio caricato: prova a migliorarlo"); } return; }
    if (act === "quizreset") { S.quiz = {}; save(); renderQuiz(); return; }
    if (act === "wipe") { if (confirm("Cancellare progressi, badge e progetti?")) { try { localStorage.removeItem(KEY); } catch (e) { /* niente */ } S = load(); S.builds = {}; show("build"); } return; }
  });
  $("#sheet").addEventListener("click", function (ev) { if (ev.target.id === "sheet") $("#sheet").hidden = true; });
  var inT = null;
  document.addEventListener("change", function (ev) { if (ev.target.hasAttribute && ev.target.hasAttribute("data-f")) setField(ev.target); });
  document.addEventListener("input", function (ev) { var el = ev.target; if (el.type === "number" && el.hasAttribute("data-f") && el.getAttribute("data-f").charAt(0) !== "m") { clearTimeout(inT); inT = setTimeout(function () { setField(el); }, 250); } });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") $("#sheet").hidden = true; });

  if (window.top !== window.self) document.documentElement.classList.add("framed");
  show(S.view || "build");
})();
