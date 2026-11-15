/* Vista laterale del braccio (SVG) — posa di verifica: braccio steso, caso peggiore */
(function (root) {
  "use strict";
  var MATCOL = { s235: "#8a96a3", s355: "#9aa6b2", c45: "#a7b0ba", "42crmo4": "#b8b0a0", al6061: "#c9d6e3", al7075: "#d9e2ec", cf: "#2b3138", pla: "#ff8a3d" };
  function sevOf(r, name) {
    var s = 0;
    r.issues.forEach(function (q) { var hit = (q.joint || "").split(/,\s*/).indexOf(name) >= 0; if (!hit) return; if (q.sev === "err") s = Math.max(s, 2); else if (q.sev === "warn") s = Math.max(s, 1); });
    return s;
  }
  function render(build, r, mission, opt) {
    var fs = (opt && opt.narrow) ? 1.45 : 1;
    var reach = Math.max(r.xTip, mission.reach || 0), h = Math.max(r.height, 0.05);
    var W = (reach + 0.18 * reach + 0.12) * 1000, x0 = -0.12 * 1000 - 0.04 * reach * 1000;
    var Ht = (h + 0.35 * reach + 0.08) * 1000, top = (h + 0.22 * reach + 0.05) * 1000;
    var A = 1.9;
    if (W / Ht < A) { var nW = Ht * A; x0 -= (nW - W) / 2; W = nW; } else { var nH = W / A; top += (nH - Ht) * 0.5; Ht = nH; }
    var vb = [x0, -top, W, Ht];
    function Y(y) { return -y * 1000; }
    function X(x) { return x * 1000; }
    var u = W / 100, out = [];
    out.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb.join(" ") + '" class="armsvg" role="img" aria-label="Vista laterale del braccio">');
    out.push('<defs><linearGradient id="gOr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb347"/><stop offset="1" stop-color="#ff5e1a"/></linearGradient>' +
      '<pattern id="hatch" width="' + (2 * u) + '" height="' + (2 * u) + '" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="' + (2 * u) + '" stroke="#2a333d" stroke-width="' + (0.6 * u) + '"/></pattern></defs>');
    // griglia
    var step = reach > 0.9 ? 200 : reach > 0.4 ? 100 : 50;
    for (var gx = Math.ceil(x0 / step) * step; gx < x0 + W; gx += step) out.push('<line class="grid" x1="' + gx + '" y1="' + (-top) + '" x2="' + gx + '" y2="' + (Ht - top) + '"/>');
    for (var gy = 0; gy < top; gy += step) out.push('<line class="grid" x1="' + x0 + '" y1="' + (-gy) + '" x2="' + (x0 + W) + '" y2="' + (-gy) + '"/>');
    // pavimento
    out.push('<rect x="' + x0 + '" y="0" width="' + W + '" height="' + (Ht - top) + '" fill="url(#hatch)"/><line class="floor" x1="' + x0 + '" y1="0" x2="' + (x0 + W) + '" y2="0"/>');
    // obiettivo di portata
    if (mission.reach) {
      out.push('<line class="target" x1="' + X(mission.reach) + '" y1="' + (Y(h) - 0.18 * reach * 1000) + '" x2="' + X(mission.reach) + '" y2="' + (Y(h) + 0.12 * reach * 1000) + '"/>');
      out.push('<text class="lbl tgt" x="' + X(mission.reach) + '" y="' + (Y(h) + 0.12 * reach * 1000 + 2.8 * u) + '" font-size="' + (2.2 * u * fs) + '" text-anchor="middle">obiettivo ' + Math.round(mission.reach * 1000) + ' mm</text>');
    }
    var J = r.J, minT = 1.4 * u;
    // colonna
    var col = J[0], cw = Math.max(minT * 1.6, Math.min(col.sec.h || 40, 0.25 * W));
    out.push('<rect class="base" x="' + (-cw * 0.9) + '" y="' + (-1.6 * u) + '" width="' + (cw * 1.8) + '" height="' + (1.6 * u) + '" rx="' + (0.4 * u) + '"/>');
    if (col.L > 0) out.push('<rect class="link" fill="' + (MATCOL[col.b.link.mat] || "#999") + '" x="' + (-cw / 2) + '" y="' + Y(h) + '" width="' + cw + '" height="' + (h * 1000) + '" rx="' + (0.3 * u) + '"/>');
    // deformata (esagerata)
    root.VIZ_LAST = null; var tipD = r.defl.vert, ex = tipD > 0 ? Math.max(1, (0.05 * reach * 1000) / tipD) : 1, big = tipD * ex > 0.15 * reach * 1000;
    if (tipD > 0) {
      var pts = [], dTip = Math.min(tipD * ex, 0.15 * reach * 1000);
      for (var s = 0; s <= 20; s++) { var xx = r.xTip * s / 20; var d = dTip * Math.pow(s / 20, 1.6); pts.push(X(xx) + "," + (Y(h) + d)); }
      out.push('<polyline class="defl" points="' + pts.join(" ") + '"/>');
      root.VIZ_LAST = { tipD: tipD, ex: ex, big: big };
    }
    // link orizzontali
    for (var k = 1; k < J.length; k++) {
      var o = J[k]; if (o.L <= 0) continue;
      var t = Math.max(minT, Math.min(o.sec.h || 10, 0.12 * W));
      out.push('<rect class="link" fill="' + (MATCOL[o.b.link.mat] || "#999") + '" x="' + X(o.x) + '" y="' + (Y(h) - t / 2) + '" width="' + (o.L * 1000) + '" height="' + t + '" rx="' + Math.min(t / 2, 1.2 * u) + '"/>');
      if (o.b.link.sec === "tube" || o.b.link.sec === "rtube") out.push('<line class="tubeln" x1="' + X(o.x) + '" y1="' + (Y(h)) + '" x2="' + X(o.x + o.L) + '" y2="' + Y(h) + '"/>');
    }
    // utensile
    var e = r.eff, ex0 = X(r.xEnd), eL = e.L * 1000, et = Math.max(minT * 1.3, Math.min(0.06 * W, Math.cbrt(e.mass) * 2.2 * u));
    if (/^sp/.test(e.id)) {
      out.push('<rect class="eff" x="' + ex0 + '" y="' + (Y(h) - et / 2) + '" width="' + (eL * 0.75) + '" height="' + et + '" rx="' + (0.4 * u) + '"/>');
      out.push('<polygon class="tool" points="' + (ex0 + eL * 0.75) + ',' + (Y(h) - et / 5) + ' ' + (ex0 + eL) + ',' + Y(h) + ' ' + (ex0 + eL * 0.75) + ',' + (Y(h) + et / 5) + '"/>');
    } else {
      out.push('<rect class="eff" x="' + ex0 + '" y="' + (Y(h) - et / 2) + '" width="' + (eL * 0.55) + '" height="' + et + '" rx="' + (0.4 * u) + '"/>');
      out.push('<path class="tool" d="M' + (ex0 + eL * 0.55) + ' ' + (Y(h) - et / 2) + ' h' + (eL * 0.45) + ' v' + (et * 0.18) + ' h-' + (eL * 0.3) + ' v' + (et * 0.64) + ' h' + (eL * 0.3) + ' v' + (et * 0.18) + ' h-' + (eL * 0.45) + 'z"/>');
    }
    // carico
    var pay = mission.payload || 0, xt = X(r.xTip);
    if (pay > 0) {
      var bs = Math.max(2.4 * u, Math.min(0.12 * W, Math.cbrt(pay) * 3 * u));
      out.push('<line class="rope" x1="' + xt + '" y1="' + Y(h) + '" x2="' + xt + '" y2="' + (Y(h) + 3 * u) + '"/>');
      out.push('<rect class="pay" x="' + (xt - bs / 2) + '" y="' + (Y(h) + 3 * u) + '" width="' + bs + '" height="' + bs + '" rx="' + (0.4 * u) + '"/>');
      out.push('<text class="lbl paylbl" x="' + xt + '" y="' + (Y(h) + 3 * u + bs / 2 + 1 * u) + '" font-size="' + (2.4 * u * fs) + '" text-anchor="middle">' + ENG.fmt(pay, pay < 1 ? 1 : 0) + ' kg</text>');
    }
    if (mission.F) {
      out.push('<line class="force" x1="' + (xt + 2 * u) + '" y1="' + (Y(h) - 12 * u) + '" x2="' + (xt + 2 * u) + '" y2="' + (Y(h) - 2.2 * u) + '"/>');
      out.push('<polygon class="forceh" points="' + (xt + 0.6 * u) + ',' + (Y(h) - 3.4 * u) + ' ' + (xt + 3.4 * u) + ',' + (Y(h) - 3.4 * u) + ' ' + (xt + 2 * u) + ',' + (Y(h) - 1.2 * u) + '"/>');
      out.push('<text class="lbl force-t" x="' + (xt - 0.5 * u) + '" y="' + (Y(h) - 9 * u) + '" font-size="' + (2.3 * u * fs) + '" text-anchor="end">' + mission.F + ' N' + (mission.lat ? ' + laterale' : '') + '</text>');
    }
    // giunti
    J.forEach(function (o) {
      var cx = o.k === 0 ? 0 : X(o.x), cy = o.k === 0 ? -0.9 * u : Y(h);
      var rr = Math.max(1.6 * u, Math.min(0.07 * W, (o.M.frame || 40) / 2 * 1.0));
      if (o.k === 0) rr = Math.min(rr, cw * 0.8);
      var sv = sevOf(r, o.name), cls = sv === 2 ? "j-err" : sv === 1 ? "j-warn" : "j-ok";
      if (o.kind === "roll") out.push('<rect class="joint ' + cls + '" x="' + (cx - rr * 0.8) + '" y="' + (cy - rr * 0.8) + '" width="' + (rr * 1.6) + '" height="' + (rr * 1.6) + '" rx="' + (rr * 0.35) + '"/>');
      else out.push('<circle class="joint ' + cls + '" cx="' + cx + '" cy="' + cy + '" r="' + rr + '"/>');
      out.push('<circle class="jdot" cx="' + cx + '" cy="' + cy + '" r="' + (rr * 0.28) + '"/>');
      var ly = o.k === 0 ? cy - rr - 0.8 * u : o.kind === "roll" ? cy + rr + 3 * u : cy - rr - 1.2 * u;
      out.push('<text class="lbl jl" x="' + cx + '" y="' + ly + '" font-size="' + (2.1 * u * fs) + '" text-anchor="middle">' + o.name + '</text>');
    });
    window.VIZ_CAP = 'Posa di verifica: braccio steso (caso peggiore) · portata ' + Math.round(r.reach * 1000) + ' mm';
    out.push("</svg>");
    return out.join("");
  }
  root.VIZ = { render: render, sevOf: sevOf };
})(this);
