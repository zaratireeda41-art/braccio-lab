/* Braccio Lab · Officina 3D – modelli numerici (cinematica e processi). Valori tipici, non sostituiscono le tabelle del costruttore.
   Funziona sia nel browser (window.SIM) sia in Node (require) per i test. */
(function (root) {
  "use strict";
  var node = typeof module !== "undefined" && module.exports;
  var ENG = node ? require("./engine.js") : root.ENG, CAT = node ? require("./catalog.js") : root.CAT;
  var D2R = Math.PI / 180, G = 9.81;

  /* ---------------- algebra 3×3 ---------------- */
  function mm3(a, b) { var r = new Array(9); for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]; return r; }
  function mv3(m, v) { return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]]; }
  function rotX(t) { var c = Math.cos(t), s = Math.sin(t); return [1, 0, 0, 0, c, -s, 0, s, c]; }
  function rotY(t) { var c = Math.cos(t), s = Math.sin(t); return [c, 0, s, 0, 1, 0, -s, 0, c]; }
  function rotZ(t) { var c = Math.cos(t), s = Math.sin(t); return [c, -s, 0, s, c, 0, 0, 0, 1]; }
  var I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function scl(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function len(a) { return Math.sqrt(dot(a, a)); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  /* ---------------- modello del braccio dal progetto ---------------- */
  var LIM = { yaw: [-170, 170], roll: [-180, 180] };
  function limitsFor(kind, k) { if (kind === "pitch") return k === 1 ? [-40, 150] : [-145, 145]; return LIM[kind]; }
  function model(build, R) {
    var n = build.axes, kinds = ENG.KINDS[n], J = R.J, eff = R.eff || { L: 0.1, mass: 0.3 };
    var links = J.map(function (o) { return Math.max(0, o.L); });
    var reach = 0; for (var k = 1; k < n; k++) reach += links[k]; reach += eff.L;
    var m = { n: n, kinds: kinds, links: links, effL: eff.L, effMass: eff.mass, reach: reach, height: links[0],
      lim: kinds.map(function (kd, k) { return limitsFor(kd, k); }), J: J,
      mJoint: J.map(function (o) { return o.mJoint; }), mLink: J.map(function (o) { return o.mLink; }),
      cap: J.map(function (o) { var mot = (o.Tpk || 0) * (o.M.type === "servo_hobby" ? 1 : o.i * o.eta); return o.R && o.R.type !== "none" && o.R.Tacc ? Math.min(mot, o.R.Tacc) : mot; }),
      tdyn: J.map(function (o) { return o.loads && o.loads.Tdyn || 0; }) };
    m.home = home(m);
    return m;
  }
  function home(m) {
    var q = m.kinds.map(function () { return 0; }), pk = [];
    m.kinds.forEach(function (kd, k) { if (kd === "pitch") pk.push(k); });
    if (pk.length >= 1) q[pk[0]] = 55 * D2R;
    if (pk.length >= 2) q[pk[1]] = -100 * D2R;
    var s = 0; pk.slice(0, -1).forEach(function (k) { s += q[k]; });
    if (pk.length >= 3) q[pk[pk.length - 1]] = -90 * D2R - s;
    return q;
  }
  /* cinematica diretta: yaw = asse Y (verticale), pitch = asse Z locale, roll = asse X locale (lungo il braccio) */
  function fk(m, q) {
    var Rm = I3, p = [0, 0, 0], pts = [[0, 0, 0]], axes = [], frames = [];
    for (var k = 0; k < m.n; k++) {
      var kd = m.kinds[k];
      axes.push(mv3(Rm, kd === "yaw" ? [0, 1, 0] : kd === "pitch" ? [0, 0, 1] : [1, 0, 0]));
      Rm = mm3(Rm, kd === "yaw" ? rotY(q[k]) : kd === "pitch" ? rotZ(q[k]) : rotX(q[k]));
      frames.push({ R: Rm, p: p });
      p = add(p, mv3(Rm, k === 0 ? [0, m.links[0], 0] : [m.links[k], 0, 0]));
      pts.push(p);
    }
    var dir = mv3(Rm, [1, 0, 0]), tip = add(p, scl(dir, m.effL));
    return { pts: pts, axes: axes, frames: frames, R: Rm, dir: dir, wrist: p, tip: tip };
  }
  function solve(A, b) { // eliminazione di Gauss con pivot
    var n = b.length, M = A.map(function (r, i) { return r.concat([b[i]]); });
    for (var c = 0; c < n; c++) { var piv = c; for (var r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      var t = M[c]; M[c] = M[piv]; M[piv] = t; if (Math.abs(M[c][c]) < 1e-12) continue;
      for (r = 0; r < n; r++) if (r !== c) { var f = M[r][c] / M[c][c]; for (var j = c; j <= n; j++) M[r][j] -= f * M[c][j]; } }
    return M.map(function (r, i) { return Math.abs(r[i]) < 1e-12 ? 0 : r[n] / r[i]; });
  }
  /* cinematica inversa numerica (minimi quadrati smorzati) su posizione + direzione dell'utensile */
  function ik(m, target, dirWanted, q0, opt) {
    opt = opt || {}; var q = (q0 || m.home).slice(), it = opt.iter || 60, wd = opt.wDir != null ? opt.wDir : 0.25 * Math.max(m.reach, 0.2), lam = 0.02 * Math.max(m.reach, 0.2);
    function err(qq) { var f = fk(m, qq), e = sub(target, f.tip); if (dirWanted) e = e.concat(scl(sub(dirWanted, f.dir), wd)); return e; }
    var e = err(q);
    for (var s = 0; s < it; s++) {
      var n2 = len(e.slice(0, 3)); if (n2 < 2e-5 && (!dirWanted || len(e.slice(3)) < 1e-4 * wd)) break;
      var Jc = [], h = 1e-5;
      for (var k = 0; k < m.n; k++) { var qq = q.slice(); qq[k] += h; var e2 = err(qq); Jc.push(e.map(function (x, i) { return (x - e2[i]) / h; })); }
      var rows = e.length, A = [], i, j, kk;
      for (i = 0; i < rows; i++) { A.push([]); for (j = 0; j < rows; j++) { var sm = 0; for (kk = 0; kk < m.n; kk++) sm += Jc[kk][i] * Jc[kk][j]; A[i].push(sm + (i === j ? lam * lam : 0)); } }
      var y = solve(A, e);
      for (kk = 0; kk < m.n; kk++) { var d = 0; for (i = 0; i < rows; i++) d += Jc[kk][i] * y[i]; d = clamp(d, -0.25, 0.25); q[kk] = clamp(q[kk] + d, m.lim[kk][0] * D2R, m.lim[kk][1] * D2R); }
      e = err(q);
    }
    var f = fk(m, q), pe = len(sub(target, f.tip)), de = dirWanted ? Math.acos(clamp(dot(f.dir, dirWanted) / (len(f.dir) * len(dirWanted) || 1), -1, 1)) / D2R : 0;
    return { q: q, err: pe, dirErr: de, ok: pe < 0.002 && de < 3, fk: f };
  }
  function atLimit(m, q) { return q.map(function (x, k) { var a = m.lim[k][0] * D2R, b = m.lim[k][1] * D2R, r = (b - a) * 0.04; return x <= a + r || x >= b - r; }); }
  /* coppie ai giunti nella posa attuale: gravità + forza di processo (vettore N in punta) + dinamica del motore di calcolo */
  function torques(m, q, payload, Fvec, toolMass) {
    var f = fk(m, q), pts = f.pts, tm = toolMass != null ? toolMass : m.effMass, out = [];
    var mass = [];
    for (var j = 1; j < m.n; j++) { mass.push({ m: m.mJoint[j], p: pts[j], from: j }); mass.push({ m: m.mLink[j], p: scl(add(pts[j], pts[j + 1]), 0.5), from: j }); }
    mass.push({ m: tm, p: add(f.wrist, scl(f.dir, m.effL / 2)), from: m.n });
    if (payload) mass.push({ m: payload, p: f.tip, from: m.n });
    for (var k = 0; k < m.n; k++) {
      var o = k === 0 ? [0, 0, 0] : pts[k], a = f.axes[k], t = 0;
      mass.forEach(function (it) { if (it.from > k || (it.from === k && k > 0 && it.p !== pts[k])) t += dot(cross(sub(it.p, o), [0, -it.m * G, 0]), a); });
      if (Fvec) t += dot(cross(sub(f.tip, o), Fvec), a);
      var tot = Math.abs(t) + m.tdyn[k], cap = m.cap[k] || 1e-9;
      out.push({ k: k, grav: t, total: tot, cap: cap, u: tot / cap, cls: tot > cap ? "err" : tot > 0.8 * cap ? "warn" : "ok" });
    }
    return out;
  }
  /* collisioni semplici: punti dei link sotto il pavimento o dentro il tavolo (scatola) */
  function collisions(m, q, box) {
    var f = fk(m, q), hits = [], segs = f.pts.slice(1).concat([f.tip]);
    for (var i = 1; i < segs.length; i++) {
      var a = segs[i - 1], b = segs[i];
      for (var s = 0; s <= 8; s++) { var p = add(a, scl(sub(b, a), s / 8));
        if (p[1] < 0.005) { hits.push({ what: "pavimento", seg: i }); break; }
        if (box && i < segs.length - 1 && p[0] > box.min[0] && p[0] < box.max[0] && p[1] > box.min[1] && p[1] < box.max[1] && p[2] > box.min[2] && p[2] < box.max[2]) { hits.push({ what: "tavolo", seg: i }); break; } }
    }
    return hits;
  }

  /* ---------------- traiettorie ---------------- */
  function trapezoid(L, vmax, amax) {
    L = Math.max(L, 0); var ta = vmax / amax, da = 0.5 * amax * ta * ta, tri = 2 * da > L;
    if (tri) { ta = Math.sqrt(L / amax); var vp = amax * ta; return { tri: true, ta: ta, tc: 0, T: 2 * ta, vpk: vp, s: function (t) { t = clamp(t, 0, 2 * ta); return t < ta ? 0.5 * amax * t * t : L - 0.5 * amax * (2 * ta - t) * (2 * ta - t); }, v: function (t) { return t < ta ? amax * t : Math.max(0, amax * (2 * ta - t)); } }; }
    var tc = (L - 2 * da) / vmax, T = 2 * ta + tc;
    return { tri: false, ta: ta, tc: tc, T: T, vpk: vmax, s: function (t) { t = clamp(t, 0, T); return t < ta ? 0.5 * amax * t * t : t < ta + tc ? da + vmax * (t - ta) : L - 0.5 * amax * (T - t) * (T - t); }, v: function (t) { return t < ta ? amax * t : t < ta + tc ? vmax : Math.max(0, amax * (T - t)); } };
  }
  /* percorsi nel piano del pezzo (x, z in metri, centrati) */
  function path(kind, size, pts) {
    var P = [];
    if (kind === "line") P = [[-size / 2, 0], [size / 2, 0]];
    else if (kind === "circle") { for (var i = 0; i <= 72; i++) { var a = i / 72 * 2 * Math.PI; P.push([size / 2 * Math.cos(a), size / 2 * Math.sin(a)]); } }
    else if (kind === "rect") { var w = size / 2, h = size * 0.35; P = [[-w, -h], [w, -h], [w, h], [-w, h], [-w, -h]]; }
    else if (kind === "zigzag") { var nn = 6, ww = size / 2, hh = size * 0.35; for (var r = 0; r <= nn; r++) { var z = -hh + 2 * hh * r / nn; if (r % 2) P.push([ww, z], [-ww, z]); else P.push([-ww, z], [ww, z]); } }
    else P = (pts && pts.length >= 2) ? pts : [[-size / 2, 0], [size / 2, 0]];
    var cum = [0]; for (var k = 1; k < P.length; k++) cum.push(cum[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]));
    return { pts: P, cum: cum, L: cum[cum.length - 1], at: function (s) { s = clamp(s, 0, this.L); var k = 1; while (k < cum.length - 1 && cum[k] < s) k++; var seg = cum[k] - cum[k - 1] || 1, u = (s - cum[k - 1]) / seg; return [P[k - 1][0] + (P[k][0] - P[k - 1][0]) * u, P[k - 1][1] + (P[k][1] - P[k - 1][1]) * u]; } };
  }
  function parsePoints(txt) { // "x,z; x,z" in mm
    var out = []; String(txt || "").split(/[;\n]/).forEach(function (p) { var a = p.split(/[,\s]+/).filter(Boolean).map(Number); if (a.length >= 2 && isFinite(a[0]) && isFinite(a[1])) out.push([a[0] / 1000, a[1] / 1000]); });
    return out;
  }

  /* ---------------- taglio laser in fibra (valori tipici delle tabelle di taglio, m/min) ---------------- */
  var LASER_T = [1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 25];
  var LASER = {
    "acciaio|O2": { 1: [7, 4.5, 3.0, 2.2, 1.4, 1.0, 0.7], 2: [9, 5.5, 3.8, 3.0, 2.0, 1.5, 1.1, 0.9, 0.6], 3: [10, 6.5, 4.5, 3.5, 2.6, 2.0, 1.4, 1.1, 0.75, 0.6], 4: [11, 7, 5, 4, 3, 2.3, 1.7, 1.3, 0.9, 0.7], 6: [12, 8, 5.5, 4.5, 3.4, 2.6, 2.1, 1.7, 1.1, 0.85, 0.6] },
    "acciaio|N2": { 1: [18, 6, 2.5, 1.4], 2: [30, 12, 6, 3.5, 1.5], 3: [36, 18, 9.5, 6, 2.6, 1.4], 4: [42, 22, 13, 8.5, 4, 2.2, 1.3], 6: [50, 30, 18, 12, 6.5, 3.5, 2.2, 1.5] },
    "inox|N2": { 1: [18, 6, 2.5, 1.4], 2: [30, 12, 6, 3.5, 1.5, 0.8], 3: [36, 18, 9.5, 6, 2.6, 1.4, 0.8], 4: [42, 22, 13, 8.5, 4, 2.2, 1.3, 0.8], 6: [50, 30, 18, 12, 6.5, 3.5, 2.2, 1.5, 0.7] },
    "alluminio|N2": { 1: [12, 4, 1.5], 2: [22, 9, 4.5, 2.5, 1.0], 3: [30, 14, 7.5, 4.5, 2.0, 1.0], 4: [36, 18, 10, 6.5, 3.0, 1.6, 1.0], 6: [45, 25, 15, 10, 5, 2.8, 1.8, 1.1] }
  };
  LASER["acciaio|aria"] = scaleTbl(LASER["acciaio|N2"], 0.9, 6); LASER["inox|aria"] = scaleTbl(LASER["inox|N2"], 0.9, 6); LASER["alluminio|aria"] = scaleTbl(LASER["alluminio|N2"], 0.9, 6);
  function scaleTbl(T, k, tmax) { var o = {}; for (var p in T) o[p] = T[p].filter(function (v, i) { return LASER_T[i] <= tmax; }).map(function (v) { return Math.round(v * k * 100) / 100; }); return o; }
  function interpT(row, t) { // log-log tra gli spessori; 0 oltre lo spessore massimo
    if (!row || !row.length) return 0; var tmax = LASER_T[row.length - 1]; if (t > tmax + 1e-9) return 0;
    if (t <= LASER_T[0]) return row[0];
    for (var i = 1; i < row.length; i++) if (t <= LASER_T[i] + 1e-9) { var a = LASER_T[i - 1], b = LASER_T[i], u = Math.log(t / a) / Math.log(b / a); return Math.exp(Math.log(row[i - 1]) + u * (Math.log(row[i]) - Math.log(row[i - 1]))); }
    return 0;
  }
  function laserVmax(mat, gas, P, t) {
    var T = LASER[mat + "|" + gas]; if (!T) return 0;
    var ps = Object.keys(T).map(Number).sort(function (a, b) { return a - b; });
    if (P <= ps[0]) return interpT(T[ps[0]], t) * P / ps[0];
    for (var i = 1; i < ps.length; i++) if (P <= ps[i]) { var u = (P - ps[i - 1]) / (ps[i] - ps[i - 1]), a = interpT(T[ps[i - 1]], t), b = interpT(T[ps[i]], t); if (!a && !b) return 0; if (!a) return u > 0.5 ? b * (u - 0.5) * 2 : 0; return a + u * (b - a); }
    return interpT(T[ps[ps.length - 1]], t);
  }
  function laserMaxT(mat, gas, P) { var best = 0; for (var t = 0.5; t <= 30; t += 0.5) if (laserVmax(mat, gas, P, t) > 0) best = t; return best; }
  function laser(o) { // {mat, gas, P kW, t mm, v m/min}
    var vmax = laserVmax(o.mat, o.gas, o.P, o.t), r = vmax ? o.v / vmax : Infinity, iss = [];
    var out = { vmax: vmax, ratio: r, through: vmax > 0 && o.v <= vmax, tmax: laserMaxT(o.mat, o.gas, o.P), kerf: (o.gas === "O2" ? 0.2 + 0.03 * o.t : 0.15 + 0.02 * o.t),
      E: o.P * 1000 / (o.v * 1000 / 60), press: o.gas === "O2" ? (o.t <= 3 ? "1–1,5 bar" : "0,5–0,8 bar") : (o.t <= 3 ? "10–14 bar" : "14–20 bar"), vopt: 0.85 * vmax, issues: iss };
    if (o.gas === "O2" && o.mat !== "acciaio") iss.push({ sev: "err", t: "Ossigeno solo sull'acciaio al carbonio", d: "Su inox e alluminio l'O₂ ossida il bordo e non sostiene il taglio: usa azoto (N₂) ad alta pressione." });
    if (!vmax) iss.push({ sev: "err", t: "Spessore oltre il limite", d: "Con " + o.P + " kW e " + o.gas + " il massimo tipico su " + o.mat + " è " + out.tmax + " mm." });
    else if (o.v > vmax) iss.push({ sev: "err", t: "Il taglio non passa", d: "Velocità " + fx(o.v, 2) + " m/min oltre il massimo tipico di " + fx(vmax, 2) + " m/min: il fascio non sfonda e la lamiera resta attaccata." });
    else if (r < 0.5) iss.push({ sev: "warn", t: "Troppo lento: bordo bruciato", d: "Sotto il 50% della velocità massima il calore si accumula: bava, bordo largo e (con O₂) combustione incontrollata." });
    else if (r > 0.95) iss.push({ sev: "warn", t: "Al limite: bava sotto il pezzo", d: "Tra 95% e 100% della velocità massima il taglio passa a fatica e lascia bava. Lavora intorno all'85%." });
    if (o.gas === "aria" && o.t > 6) iss.push({ sev: "warn", t: "Aria compressa solo sui sottili", d: "Oltre 6 mm l'aria lascia bordi ossidati." });
    return out;
  }
  /* plasma ad aria (acciaio al carbonio, m/min) */
  var PLASMA = { 45: { 3: 3.8, 6: 1.6, 10: 0.6, 12: 0.4 }, 65: { 3: 6.5, 6: 3.0, 10: 1.3, 12: 1.0, 16: 0.6, 20: 0.35 }, 105: { 6: 4.8, 10: 2.5, 12: 1.9, 16: 1.2, 20: 0.75, 25: 0.45 } };
  function plasmaVmax(I, t) {
    var T = PLASMA[I] || PLASMA[65], ks = Object.keys(T).map(Number).sort(function (a, b) { return a - b; });
    if (t > ks[ks.length - 1]) return 0; if (t <= ks[0]) return T[ks[0]] * ks[0] / Math.max(t, ks[0] * 0.5);
    for (var i = 1; i < ks.length; i++) if (t <= ks[i]) { var a = ks[i - 1], b = ks[i], u = Math.log(t / a) / Math.log(b / a); return Math.exp(Math.log(T[a]) + u * (Math.log(T[b]) - Math.log(T[a]))); }
    return 0;
  }
  function plasma(o) { var vmax = plasmaVmax(o.I, o.t), iss = []; if (!vmax) iss.push({ sev: "err", t: "Spessore oltre il limite", d: "A " + o.I + " A il plasma ad aria taglia bene fino a circa " + Object.keys(PLASMA[o.I] || PLASMA[65]).slice(-1)[0] + " mm." }); else if (o.v > vmax) iss.push({ sev: "err", t: "Il taglio non passa", d: "Oltre " + fx(vmax, 2) + " m/min l'arco trascina indietro e non sfonda." }); else if (o.v < 0.6 * vmax) iss.push({ sev: "warn", t: "Troppo lento", d: "Scorie grosse sotto il pezzo (dross a bassa velocità)." });
    return { vmax: vmax, ratio: vmax ? o.v / vmax : Infinity, through: vmax > 0 && o.v <= vmax, kerf: 1.0 + 0.012 * o.I, issues: iss }; }

  /* ---------------- saldatura (EN 1011-1: Q = η·U·I·60/(v·1000)) ---------------- */
  var WELD_MAT = { s235: { name: "Acciaio S235", Q: [0.6, 2.5] }, s355: { name: "Acciaio S355", Q: [0.8, 2.0] }, inox: { name: "Inox AISI 304", Q: [0.4, 1.5] }, alluminio: { name: "Alluminio 5754", Q: [0.3, 1.2] } };
  function heatInput(U, I, v, eta) { return eta * U * I * 60 / (v * 1000); }
  function migCurrent(wfs, wire) { var d = wire || 1.0; return (30 + 23 * wfs) * Math.pow(d / 1.0, 1.4); }
  function migUsyn(I) { return 14 + 0.05 * I; }
  function weld(o) { // {proc:'mig'|'tig', mat, t mm, U V, I A (tig), wfs m/min, v mm/min, wire mm}
    var mig = o.proc !== "tig", eta = mig ? 0.8 : 0.6, I = mig ? migCurrent(o.wfs, o.wire) : o.I, U = o.U, v = o.v;
    var Q = heatInput(U, I, v, eta), mat = WELD_MAT[o.mat] || WELD_MAT.s235, iss = [];
    var wireA = Math.PI * Math.pow(o.wire || 1.0, 2) / 4, dep = mig ? wireA * o.wfs * 1000 * 0.95 : (o.wfs ? Math.PI * 1.6 * 1.6 / 4 * o.wfs * 1000 : 0); // mm³/min
    var aBead = dep / v, h = Math.sqrt(Math.max(aBead, 0) / 2), w = Math.max(3 * h, 0);
    var aMelt = 0.35 * Q * 1000 / 10.5, pen = Math.sqrt(aMelt / 1.96), wMelt = 2.5 * pen;
    if (!mig) { w = Math.max(w, wMelt); h = Math.max(h, 0.3); }
    var Usyn = mig ? migUsyn(I) : 10 + 0.04 * I, mode = mig ? (I > 200 && U > 24 ? "spray arc" : I < 180 && U < 21 ? "short arc" : "globulare") : "TIG";
    var res = { I: I, U: U, Q: Q, eta: eta, range: mat.Q, dep: dep, kgh: dep * 7.85e-6 * 60, beadA: aBead, beadW: Math.max(w, wMelt), beadH: h, pen: pen, Usyn: Usyn, mode: mode, issues: iss };
    if (Q > mat.Q[1]) iss.push({ sev: "warn", t: "Apporto termico troppo alto", d: fx(Q, 2) + " kJ/mm oltre " + fx(mat.Q[1], 1) + " per " + mat.name + ": grano grosso, deformazioni" + (o.mat === "inox" ? ", sensibilizzazione e corrosione" : "") + ". Aumenta la velocità o riduci la corrente." });
    if (Q < mat.Q[0]) iss.push({ sev: "warn", t: "Apporto termico troppo basso", d: fx(Q, 2) + " kJ/mm sotto " + fx(mat.Q[0], 1) + ": rischio incollature (mancanza di fusione) e cricche a freddo." });
    if (pen < 0.3 * o.t) iss.push({ sev: "warn", t: "Penetrazione scarsa", d: "Penetrazione stimata " + fx(pen, 1) + " mm su " + o.t + " mm: per un giunto di testa servono smussi o più passate." });
    if (pen > 1.25 * o.t) iss.push({ sev: "err", t: "Sfondamento", d: "Il bagno passa da parte a parte (" + fx(pen, 1) + " mm su " + o.t + " mm): buchi nella lamiera." });
    if (mig && Math.abs(U - Usyn) > 2.5) iss.push({ sev: "warn", t: U > Usyn ? "Tensione alta: arco lungo" : "Tensione bassa: arco corto", d: "Per " + fx(I, 0) + " A la tensione sinergica è circa " + fx(Usyn, 1) + " V. " + (U > Usyn ? "Arco instabile, incisioni marginali e porosità." : "Spruzzi e filo che “pianta” nel bagno.") });
    if (mig && o.mat === "alluminio" && mode === "short arc") iss.push({ sev: "warn", t: "Alluminio in short arc", d: "Sull'alluminio si usa spray o pulsato con filo AlMg e argon puro." });
    if (!mig && I > 250) iss.push({ sev: "warn", t: "Torcia TIG oltre il tipico", d: "Oltre 250 A serve una torcia raffreddata ad acqua." });
    return res;
  }

  /* ---------------- fresatura (Kienzle: kc = kc1.1·hm^-mc) ---------------- */
  var MILL_MAT = { alluminio: { name: "Alluminio 6082", kc11: 700, mc: 0.25, vc: [150, 800], fz: [0.03, 0.2] }, s235: { name: "Acciaio S235", kc11: 1500, mc: 0.25, vc: [80, 250], fz: [0.02, 0.15] }, c45: { name: "Acciaio C45", kc11: 1700, mc: 0.25, vc: [70, 220], fz: [0.02, 0.12] }, inox: { name: "Inox AISI 304", kc11: 2100, mc: 0.21, vc: [50, 150], fz: [0.02, 0.1] }, ottone: { name: "Ottone CuZn39Pb3", kc11: 780, mc: 0.18, vc: [100, 400], fz: [0.03, 0.15] }, pom: { name: "POM (acetalica)", kc11: 250, mc: 0.2, vc: [200, 700], fz: [0.05, 0.3] } };
  function mill(o) { // {mat, D mm, z, n rpm, vf mm/min, ap mm, ae mm, P W (mandrino)}
    var M = MILL_MAT[o.mat] || MILL_MAT.alluminio, vc = Math.PI * o.D * o.n / 1000, fz = o.vf / (o.z * o.n), ae = Math.min(o.ae, o.D);
    var hm = Math.min(fz, fz * Math.sqrt(ae / o.D) * (ae / o.D > 0.5 ? 1.2 : 1)), kc = M.kc11 * Math.pow(Math.max(hm, 0.005), -M.mc);
    var Q = o.ap * ae * o.vf / 1000, Pc = Q * kc / 60e3 / 0.85, Fc = Pc * 0.85 * 1000 * 60 / Math.max(vc, 1), Ff = 0.7 * Fc, F = Math.hypot(Fc, Ff);
    var iss = [];
    if (o.P && Pc * 1000 > o.P) iss.push({ sev: "err", t: "Mandrino troppo debole", d: "Servono " + fx(Pc, 2) + " kW, il mandrino ne dà " + fx(o.P / 1000, 2) + ": si pianta e la fresa si rompe." });
    if (vc < M.vc[0] || vc > M.vc[1]) iss.push({ sev: "warn", t: "Velocità di taglio fuori campo", d: "vc " + fx(vc, 0) + " m/min, per " + M.name + " con fresa in metallo duro servono " + M.vc[0] + "–" + M.vc[1] + " m/min." });
    if (fz < M.fz[0]) iss.push({ sev: "warn", t: "Avanzamento per dente troppo basso", d: "fz " + fx(fz, 3) + " mm: il tagliente struscia invece di tagliare, scalda e si consuma." });
    if (fz > M.fz[1]) iss.push({ sev: "warn", t: "Avanzamento per dente troppo alto", d: "fz " + fx(fz, 3) + " mm: rischio di rottura del tagliente." });
    if (o.ap > 1.5 * o.D) iss.push({ sev: "warn", t: "Profondità troppo alta", d: "ap oltre 1,5×D: la fresa flette e vibra." });
    return { vc: vc, fz: fz, hm: hm, kc: kc, Q: Q, Pc: Pc, Fc: Fc, Ff: Ff, F: F, Mc: Fc * o.D / 2000, mat: M, issues: iss };
  }
  var DRILL_VC = { alluminio: [60, 150], s235: [20, 35], c45: [15, 30], inox: [8, 15], ottone: [40, 80], pom: [30, 80] };
  /* foratura con punta elicoidale: Mc = kc·f·D²/8000 N·m, spinta ≈ 0,43·kc·D·f */
  function drill(o) { // {mat, D mm, f mm/giro, n rpm, P W}
    var M = MILL_MAT[o.mat] || MILL_MAT.alluminio, vc = Math.PI * o.D * o.n / 1000, h = o.f / 2 * Math.sin(59 * D2R), kc = M.kc11 * Math.pow(Math.max(h, 0.005), -M.mc);
    var Mc = kc * o.f * o.D * o.D / 8000, Ff = 0.43 * kc * o.D * o.f, Pc = Mc * 2 * Math.PI * o.n / 60 / 1000 / 0.85, iss = [];
    if (o.P && Pc * 1000 > o.P) iss.push({ sev: "err", t: "Mandrino troppo debole", d: "Servono " + fx(Pc, 2) + " kW." });
    var vr = DRILL_VC[o.mat] || [20, 40];
    if (vc < vr[0] || vc > vr[1]) iss.push({ sev: "warn", t: "Velocità di taglio fuori campo", d: "Per forare " + M.name + " con punta HSS-Co: " + fx(vr[0], 0) + "–" + fx(vr[1], 0) + " m/min." });
    if (o.f > 0.025 * o.D + 0.05) iss.push({ sev: "warn", t: "Avanzamento alto", d: "Tipico ≈ 0,01–0,02 × D mm/giro." });
    return { vc: vc, kc: kc, Mc: Mc, Ff: Ff, Pc: Pc, vf: o.f * o.n, issues: iss };
  }
  /* verniciatura a spruzzo: film umido = Q·TE/(v·passo) */
  var GUNS = { aria: { name: "Aerografo convenzionale", TE: 0.35 }, hvlp: { name: "HVLP", TE: 0.65 }, elettro: { name: "Elettrostatico", TE: 0.8 } };
  function spray(o) { // {Q ml/min, v mm/s, dist mm, gun, solids 0–1, overlap 0–1}
    var gun = GUNS[o.gun] || GUNS.hvlp, W = 1.1 * o.dist, pitch = W * (1 - (o.overlap != null ? o.overlap : 0.5)), q = o.Q * 1000 / 60;
    var wet = q * gun.TE / (o.v * pitch) * 1000, dry = wet * (o.solids != null ? o.solids : 0.5), iss = [];
    if (wet > 120) iss.push({ sev: "err", t: "Colature", d: "Film umido " + fx(wet, 0) + " µm: oltre ~120 µm la vernice cola sulle pareti verticali." });
    if (dry < 20) iss.push({ sev: "warn", t: "Copertura scarsa", d: "Film secco " + fx(dry, 0) + " µm: tipicamente servono 25–60 µm per mano." });
    if (o.dist < 150) iss.push({ sev: "warn", t: "Pistola troppo vicina", d: "Sotto 150 mm: buccia d'arancia e colature." });
    if (o.dist > 300) iss.push({ sev: "warn", t: "Pistola troppo lontana", d: "Oltre 300 mm la vernice arriva secca (polverino) e l'overspray aumenta." });
    return { W: W, pitch: pitch, wet: wet, dry: dry, TE: gun.TE, waste: q * (1 - gun.TE) * 60 / 1000, issues: iss };
  }
  /* presa per attrito (convenzione SCHUNK, sicurezza 2) */
  function gripNeed(m, a, mu) { return m * (G + a) * 2 / mu; }

  /* ---------------- teste di processo (massa tipica, utensile in punta) ---------------- */
  var HEADS = { laser: { name: "Testa laser 2D/3D con autofocus", mass: 3.0, L: 0.22 }, mig: { name: "Torcia MIG/MAG raffreddata ad aria + cavo", mass: 1.6, L: 0.30 }, tig: { name: "Torcia TIG 200 A", mass: 0.8, L: 0.22 }, plasma: { name: "Torcia plasma macchina", mass: 1.0, L: 0.25 }, spray: { name: "Pistola HVLP automatica", mass: 0.9, L: 0.18 } };
  /* il braccio con la testa/utensile di processo e la forza di processo: rilancia il motore di calcolo.
     o = { head (HEADS[..]) | effector (id catalogo), F (N in punta), lat (forza laterale) } */
  function withProcess(build, mission, o) {
    o = o || {}; var b = JSON.parse(JSON.stringify(build)), m2 = {}; for (var k in mission) m2[k] = mission[k];
    if (o.head) { b.effector = "micro"; m2.payload = o.head.mass; }
    else if (o.effector) { b.effector = o.effector; m2.payload = o.payload != null ? o.payload : 0; }
    else if (o.payload != null) m2.payload = o.payload;
    m2.F = o.F || 0; m2.lat = !!o.lat;
    var R2 = ENG.analyze(b, m2), tol = mission.tol || 1;
    return { R: R2, err: R2.defl.err, tol: tol, ok: R2.defl.err <= tol, jointErrs: R2.issues.filter(function (q) { return q.sev === "err" && /^J\d/.test(q.joint || ""); }) };
  }

  /* ---------------- sfide 3D ---------------- */
  var CHALLENGES = [
    { id: "c_weld", proc: "mig", title: "Cordone da 200 mm su S235 da 5 mm", goal: "Salda un cordone dritto di 200 mm con apporto termico 0,8–1,5 kJ/mm, penetrazione sufficiente e tensione giusta.", set: { mat: "s235", t: 5, path: "line", size: 0.2 } },
    { id: "c_laser", proc: "laser", title: "Flangia Ø120 in acciaio da 3 mm", goal: "Taglia un cerchio Ø120 passante, tra il 75% e il 95% della velocità massima, con precisione in punta ≤ 0,2 mm.", set: { mat: "acciaio", t: 3, path: "circle", size: 0.12 } },
    { id: "c_mill", proc: "mill", title: "Spianatura in alluminio nella tolleranza", goal: "Fresa l'alluminio con parametri corretti senza che la forza di taglio sposti la punta oltre la tolleranza della missione.", set: { mat: "alluminio", path: "zigzag", size: 0.12 } }
  ];
  function scoreOf(id, r) { // r = { res (risultato del processo), reach (bool), err (mm), tol }
    var s = 0, notes = [], x = r.res || {};
    function part(pts, ok, txt) { s += ok === true ? pts : ok ? pts * ok : 0; notes.push({ ok: ok === true || ok >= 0.99, pts: Math.round(ok === true ? pts : ok ? pts * ok : 0), max: pts, t: txt }); }
    if (id === "c_weld") {
      var Q = x.Q || 0; part(40, Q >= 0.8 && Q <= 1.5 ? true : Math.max(0, 1 - Math.min(Math.abs(Q - 0.8), Math.abs(Q - 1.5)) / 0.5), "Apporto termico 0,8–1,5 kJ/mm (" + fx(Q, 2) + ")");
      part(20, x.pen >= 1.5 && x.pen <= 6.25 ? true : 0, "Penetrazione 1,5–6 mm (" + fx(x.pen, 1) + ")");
      part(15, Math.abs((x.U || 0) - (x.Usyn || 0)) <= 1.5 ? true : Math.abs(x.U - x.Usyn) <= 3 ? 0.5 : 0, "Tensione vicina alla sinergica");
      part(15, !!r.reach, "Il braccio raggiunge tutto il cordone");
      part(10, r.err <= Math.max(0.5, r.tol || 0.5) ? true : 0, "Punta stabile (≤ 0,5 mm)");
    } else if (id === "c_laser") {
      part(40, !!x.through, "Taglio passante");
      var rr = x.ratio || 0; part(25, rr >= 0.75 && rr <= 0.95 ? true : rr <= 1 ? Math.max(0, 1 - Math.min(Math.abs(rr - 0.75), Math.abs(rr - 0.95)) / 0.3) : 0, "Velocità al 75–95% del massimo (" + fx(rr * 100, 0) + "%)");
      part(15, !!r.reach, "Il braccio raggiunge tutto il profilo");
      part(20, r.err <= 0.2 ? true : r.err <= 0.5 ? 0.5 : 0, "Precisione in punta ≤ 0,2 mm (" + fx(r.err, 2) + ")");
    } else if (id === "c_mill") {
      var noErr = !(x.issues || []).some(function (q) { return q.sev === "err"; });
      part(25, noErr, "Mandrino abbastanza potente");
      part(35, r.err <= (r.tol || 1) ? true : r.err <= 2 * (r.tol || 1) ? 0.4 : 0, "Punta nella tolleranza (" + fx(r.err, 2) + " / " + fx(r.tol || 1, 2) + " mm)");
      part(20, x.vc >= x.mat.vc[0] && x.vc <= x.mat.vc[1], "Velocità di taglio nel campo");
      part(20, x.fz >= x.mat.fz[0] && x.fz <= x.mat.fz[1], "Avanzamento per dente nel campo");
    }
    s = Math.round(s); return { score: s, stars: s >= 90 ? 3 : s >= 70 ? 2 : s >= 50 ? 1 : 0, notes: notes };
  }
  function fx(x, d) { return ENG.fmt(x, d); }

  var api = { D2R: D2R, model: model, home: home, fk: fk, ik: ik, atLimit: atLimit, torques: torques, collisions: collisions, trapezoid: trapezoid, path: path, parsePoints: parsePoints,
    LASER: LASER, LASER_T: LASER_T, laserVmax: laserVmax, laserMaxT: laserMaxT, laser: laser, PLASMA: PLASMA, plasmaVmax: plasmaVmax, plasma: plasma,
    WELD_MAT: WELD_MAT, heatInput: heatInput, migCurrent: migCurrent, migUsyn: migUsyn, weld: weld, MILL_MAT: MILL_MAT, mill: mill, drill: drill, GUNS: GUNS, spray: spray, gripNeed: gripNeed,
    HEADS: HEADS, withProcess: withProcess, CHALLENGES: CHALLENGES, scoreOf: scoreOf };
  if (node) module.exports = api; else root.SIM = api;
})(this);
