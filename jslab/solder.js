// Braccio Lab · Banco di saldatura: minigioco con saldatore a temperatura regolabile, leghe reali,
// flussante, diametro del filo, pompetta e treccia. I giunti finiscono nella simulazione del circuito.
const ALLOYS = {
  "6337": { n: "Sn63Pb37 (eutettica)", liq: 183, ideal: 320, pb: true },
  "6040": { n: "Sn60Pb40", liq: 190, ideal: 330, pb: true },
  "sac305": { n: "SAC305 senza piombo", liq: 220, ideal: 350, pb: false },
  "sncu": { n: "Sn99,3Cu0,7 senza piombo", liq: 227, ideal: 360, pb: false }
};
const TIPS = { fine: { n: "Conica fine 0,4 mm", k: 1.6, drop: 45 }, bevel: { n: "A cacciavite 2,4 mm", k: 1.0, drop: 20 }, chisel: { n: "A scalpello 3,2 mm", k: 0.75, drop: 12 } };
const WIRE = { "0.5": 0.45, "0.8": 0.9, "1.0": 1.35 };
export function mountSolder(el, env) {
  const esc = env.esc, rm = !!env.reduced;
  const S = { alloy: "6337", temp: 320, wire: "0.8", flux: true, tip: "bevel", tool: "iron", pads: [], j: {}, on: null, feeding: false, run: false, smoke: [], msg: "", src: "board" };
  el.innerHTML = `<div class="lb-sol">
    <div class="card lb-solc">
      <div class="lb-fields">
        <label class="lb-f"><span>Lega</span><select id="sAl">${Object.keys(ALLOYS).map(k => `<option value="${k}">${esc(ALLOYS[k].n)} · fonde a ${ALLOYS[k].liq} °C</option>`).join("")}</select></label>
        <label class="lb-f"><span>Temperatura saldatore <b id="sTv">320 °C</b></span><input type="range" id="sT" min="200" max="450" step="5" value="320"></label>
        <label class="lb-f"><span>Diametro filo</span><select id="sW"><option value="0.5">0,5 mm (SMD, passo fine)</option><option value="0.8" selected>0,8 mm (uso generale)</option><option value="1.0">1,0 mm (piazzole grandi)</option></select></label>
        <label class="lb-f"><span>Punta</span><select id="sTip">${Object.keys(TIPS).map(k => `<option value="${k}"${k === "bevel" ? " selected" : ""}>${esc(TIPS[k].n)}</option>`).join("")}</select></label>
        <label class="lb-f chk"><input type="checkbox" id="sFx" checked><span>Flussante extra (penna no-clean)</span></label>
      </div>
      <div class="lb-tools sm" role="toolbar" aria-label="Attrezzi di saldatura"><button type="button" class="tb" data-st="iron" aria-pressed="true">🔥 Saldatore</button><button type="button" class="tb" data-st="pump" aria-pressed="false">Pompetta</button><button type="button" class="tb" data-st="wick" aria-pressed="false">Treccia</button><button type="button" class="tb" data-st="board">Scheda: il mio circuito</button><button type="button" class="tb" data-st="reset">Ricomincia</button></div>
    </div>
    <div class="lb-stage sol" id="sStage"><canvas id="sCv" aria-label="Banco di saldatura: tocca una piazzola per appoggiare il saldatore"></canvas>
      <div class="lb-solhud"><div class="lb-tbar"><i id="sBarT"></i><b id="sZone"></b></div><small id="sInfo">Tocca una piazzola per appoggiare il saldatore.</small><div class="lb-tbar amt"><i id="sBarA"></i></div></div>
      <button type="button" class="lb-feed" id="sFeed" aria-label="Aggiungi stagno (tieni premuto)">Stagno</button>
      <button type="button" class="lb-lift" id="sLift">Stacca</button>
    </div>
    <div class="card"><div class="lb-sh"><b id="sScore">Giunti: 0</b><button type="button" class="btn sm" id="sApply">Applica al circuito (vista PCB)</button></div><div id="sLog" class="lb-slog"></div></div>
  </div>`;
  const $ = s => el.querySelector(s), cv = $("#sCv"), ctx = cv.getContext("2d"), stage = $("#sStage");
  let W = 0, H = 0, dpr = 1, sc = 1, ox = 0, oy = 0;
  function A() { return ALLOYS[S.alloy]; }
  function buildPads() {
    const src = S.src === "board" && env.pads ? env.pads() : [];
    if (!src.length) { S.src = "train"; S.pads = []; for (let i = 0; i < 8; i++) S.pads.push({ key: "T:" + i, comp: i < 4 ? "R" + (1 + (i >> 1)) : "U1", pin: String(i + 1), x: i < 4 ? (i % 2) * 4 + (i >> 1) * 6 : 2 + (i - 4) * 1, y: i < 4 ? 0 : 4, big: false, smd: i >= 4 }); S.pads.push({ key: "T:8", comp: "J1", pin: "+", x: 0, y: 7, big: true }, { key: "T:9", comp: "J1", pin: "−", x: 3, y: 7, big: true }); }
    else S.pads = src.map(p => Object.assign({}, p));
    const prev = env.joints ? env.joints() : {};
    S.pads.forEach(p => { const st = S.src === "board" ? prev[p.key] : null; p.st = st || "none"; p.T = 25; p.amt = st && st !== "none" && st !== "burnt" ? 1 : 0; p.wet = st === "ok" ? 1 : 0; p.heatT = 0; p.cold = false; p.fluxT = 0; p.target = p.big ? 1.6 : p.smd ? 0.6 : 1; p.note = ""; });
    const bt = el.querySelector('[data-st="board"]'); if (bt) bt.textContent = S.src === "board" ? "Scheda: il mio circuito" : "Scheda: allenamento";
    layout(); renderLog();
  }
  function neighbor(p) { const same = S.pads.filter(q => q.comp === p.comp); const i = same.indexOf(p); return same[i + 1] || same[i - 1] || null; }
  function layout() { if (!S.pads.length || !W) return; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; S.pads.forEach(p => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }); sc = Math.max(10, Math.min(70, Math.min((W - 60) / Math.max(1, x1 - x0), (H - 150) / Math.max(1, y1 - y0)))); ox = W / 2 - (x0 + x1) / 2 * sc; oy = (H - 40) / 2 - (y0 + y1) / 2 * sc + 10; }
  function pr(p) { return Math.max(7, Math.min(22, sc * (p.big ? 0.42 : p.smd ? 0.26 : 0.32))); }
  function px(p) { return [ox + p.x * sc, oy + p.y * sc]; }
  function resize() { const r = stage.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px"; layout(); draw(); }
  function hit(x, y) { let best = null, bd = 1e9; S.pads.forEach(p => { const [a, b] = px(p), d = Math.hypot(a - x, b - y); if (d < pr(p) * 1.8 && d < bd) { bd = d; best = p; } }); return best; }
  /* --- fisica semplificata del giunto --- */
  function step(dt) {
    const a = A(), tip = TIPS[S.tip];
    S.pads.forEach(p => {
      const on = S.on === p;
      if (on) { const teff = S.temp - tip.drop * (p.big ? 1.6 : 1) * (S.flux ? 0.7 : 1), tau = (p.big ? 2.4 : p.smd ? 0.5 : 0.9) * tip.k * (S.flux ? 0.8 : 1); p.T += (teff - p.T) * Math.min(1, dt / tau); p.heatT += dt; if (p.amt > 0 || S.feeding) p.fluxT += dt * (S.temp > 380 ? 1.8 : 1); }
      else { p.T += (25 - p.T) * Math.min(1, dt / 1.6); }
      const molten = p.T > a.liq + 8;
      if (on && S.feeding) { if (molten) { p.amt += WIRE[S.wire] * dt; } else { p.amt += WIRE[S.wire] * dt * 0.4; p.cold = true; } }
      if (on && molten && p.amt > 0.1 && p.T > a.liq + 30) { const fluxOK = S.flux || p.fluxT < 3; p.wet += dt * (fluxOK ? 1.6 : 0.4); if (p.cold && p.T > a.liq + 40) p.cold = false; }
      if (on && (p.heatT > (p.smd ? 4 : 7) || p.T > 430)) { if (p.st !== "burnt") { p.st = "burnt"; p.note = "Piazzola surriscaldata: si è staccata dalla scheda."; log(p); } }
      if (on && !rm && (S.feeding || S.flux) && molten && Math.random() < dt * (S.temp > 380 ? 26 : 14)) { const [x, y] = px(p); S.smoke.push({ x: x + (Math.random() - 0.5) * 8, y: y - 4, r: 2 + Math.random() * 3, a: 0.55, vx: (Math.random() - 0.5) * 10, vy: -25 - Math.random() * 20 }); }
    });
    S.smoke.forEach(s => { s.x += s.vx * dt + Math.sin(s.y * 0.05) * 0.3; s.y += s.vy * dt; s.r += 7 * dt; s.a -= 0.38 * dt; }); S.smoke = S.smoke.filter(s => s.a > 0);
  }
  function judge(p) {
    const a = A(); if (p.st === "burnt") return;
    if (p.amt < 0.3 * p.target) { p.st = "none"; p.note = p.amt > 0 ? "Stagno insufficiente: il piedino non è coperto." : "Nessuno stagno: hai solo scaldato."; }
    else if (p.amt > 1.9 * p.target && neighbor(p)) { p.st = "bridge"; p.note = "Troppo stagno: ha fatto un ponte con il piedino vicino (corto!). Usa la treccia."; }
    else if (p.cold || p.wet < 0.45) { p.st = "cold"; p.note = p.T < a.liq + 30 || S.temp < a.liq + 80 ? "Giunto freddo: la piazzola non era abbastanza calda (" + Math.round(p.T) + " °C). Scalda piazzola e piedino insieme, poi aggiungi stagno." : "Giunto opaco: il flussante si è bruciato. Aggiungi flussante e ripassa."; }
    else { p.st = "ok"; p.note = (p.amt > 1.4 * p.target ? "Buono ma abbondante: bastava meno stagno. " : "Giunto lucido a vulcano: perfetto! ") + (S.temp > a.ideal + 50 ? "Attenzione, la punta è molto calda." : ""); }
    log(p);
  }
  const LOG = []; function log(p) { LOG.unshift({ k: p.comp + "·" + p.pin, st: p.st, n: p.note }); if (LOG.length > 8) LOG.pop(); renderLog(); }
  function renderLog() {
    const ok = S.pads.filter(p => p.st === "ok").length, bad = S.pads.filter(p => p.st === "cold" || p.st === "bridge" || p.st === "burnt").length;
    $("#sScore").textContent = `Giunti buoni: ${ok}/${S.pads.length}` + (bad ? ` · da sistemare: ${bad}` : "");
    $("#sLog").innerHTML = LOG.map(l => `<div class="sl ${l.st}"><b>${esc(l.k)}</b> <span>${esc({ ok: "✓ buono", cold: "freddo", bridge: "ponte", burnt: "piazzola bruciata", none: "vuoto" }[l.st] || l.st)}</span><small>${esc(l.n)}</small></div>`).join("") || `<p class="note">Consiglio: ${esc(A().n)} lavora bene a ${A().ideal} °C. Appoggia la punta su piazzola e piedino, aspetta che la barra entri nella zona verde, poi tieni premuto <b>Stagno</b> per circa mezzo secondo e stacca.</p>`;
  }
  function lift() { if (S.on) { const p = S.on; S.on = null; S.feeding = false; judge(p); } hud(); }
  function hud() {
    const a = A(), p = S.on, bt = $("#sBarT"), ba = $("#sBarA"), z = $("#sZone"), info = $("#sInfo");
    const T = p ? p.T : 25, f = Math.max(0, Math.min(1, (T - 25) / (450 - 25))); bt.style.width = (f * 100).toFixed(1) + "%"; bt.className = T > a.liq + 30 && T < a.liq + 160 ? "ok" : T > a.liq + 160 ? "hot" : "";
    z.textContent = p ? Math.round(T) + " °C" : ""; ba.style.width = p ? Math.min(100, p.amt / (p.target * 2) * 100).toFixed(1) + "%" : "0%"; ba.className = p && p.amt > 1.9 * p.target ? "hot" : p && p.amt > 0.6 * p.target ? "ok" : "";
    info.textContent = p ? (T < a.liq + 8 ? "Sto scaldando " + p.comp + "·" + p.pin + "… lo stagno non fonde ancora (fonde a " + a.liq + " °C)." : T < a.liq + 30 ? "Quasi: aspetta ancora un attimo." : "Ora! Tieni premuto Stagno, poi Stacca. Tempo sulla piazzola " + p.heatT.toFixed(1) + " s.") : S.tool === "iron" ? "Tocca una piazzola per appoggiare il saldatore." : S.tool === "pump" ? "Tocca un giunto per scaldarlo e aspirare lo stagno." : "Tocca un ponte o un giunto per assorbire lo stagno con la treccia.";
    if (S.temp < a.liq + 60) info.textContent += " ⚠️ Temperatura troppo bassa per questa lega.";
  }
  /* --- disegno --- */
  function draw() {
    if (!W) return; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); const a = A();
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#1e7a3c"); g.addColorStop(1, "#13532a"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(220,170,90,.35)"; ctx.lineWidth = Math.max(2, sc * 0.12); ctx.lineCap = "round";
    const byComp = {}; S.pads.forEach(p => { (byComp[p.comp] = byComp[p.comp] || []).push(p); });
    Object.keys(byComp).forEach(k => { const ps = byComp[k]; if (ps.length < 2) return; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; ps.forEach(p => { const [x, y] = px(p); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }); ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1.2; const m = pr(ps[0]) + 6; ctx.strokeRect(x0 - m, y0 - m, x1 - x0 + 2 * m, y1 - y0 + 2 * m); ctx.font = "600 11px Inter, system-ui, sans-serif"; ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.textAlign = "left"; ctx.fillText(k, x0 - m, y0 - m - 5); });
    S.pads.forEach(p => {
      const [x, y] = px(p), r = pr(p), molten = p.T > a.liq + 8 && p.amt > 0.05, nb = p.st === "bridge" ? neighbor(p) : null;
      if (nb) { const [x2, y2] = px(nb); ctx.strokeStyle = "#c9ced4"; ctx.lineWidth = r * 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke(); }
      ctx.fillStyle = p.st === "burnt" ? "#4a2e18" : "#d9a35a"; if (p.smd) { ctx.fillRect(x - r, y - r * 0.7, r * 2, r * 1.4); } else { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
      if (p.st === "burnt") { ctx.strokeStyle = "#2a1a0e"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r * 1.15, 0.3, 2.4); ctx.stroke(); }
      if (p.amt > 0.05 && p.st !== "burnt") { const k = Math.min(1.4, 0.55 + p.amt / p.target * 0.45), rr = r * k, cold = p.st === "cold" || (p.cold && !molten);
        const gg = ctx.createRadialGradient(x - rr * 0.35, y - rr * 0.35, rr * 0.1, x, y, rr); if (cold) { gg.addColorStop(0, "#b3b6b4"); gg.addColorStop(1, "#6e726f"); } else { gg.addColorStop(0, molten ? "#ffffff" : "#f6f8fa"); gg.addColorStop(0.5, molten ? "#e6ecf2" : "#c5ccd3"); gg.addColorStop(1, "#7d858d"); }
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill();
        if (cold) { ctx.fillStyle = "rgba(60,60,60,.35)"; for (let i = 0; i < 9; i++) { const an = i * 2.4, d = rr * (0.2 + (i % 3) * 0.25); ctx.fillRect(x + Math.cos(an) * d, y + Math.sin(an) * d, 1.6, 1.6); } }
        if (molten) { ctx.fillStyle = "rgba(255,240,200,.25)"; ctx.beginPath(); ctx.arc(x, y, rr * 1.5, 0, 7); ctx.fill(); } }
      if (!p.smd) { ctx.fillStyle = p.amt > 0.3 ? "#9aa3ab" : "#c0c6cc"; ctx.beginPath(); ctx.arc(x, y, r * 0.32, 0, 7); ctx.fill(); }
      if (p.st === "ok") { ctx.strokeStyle = "#3ddc84"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r * 1.35, 0, 7); ctx.stroke(); }
      else if (p.st === "cold" || p.st === "bridge") { ctx.strokeStyle = "#f5c542"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r * 1.35, 0, 7); ctx.stroke(); }
      else if (p.st === "burnt") { ctx.strokeStyle = "#ff5a5f"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r * 1.35, 0, 7); ctx.stroke(); }
      if (sc > 18) { ctx.font = "600 10px Inter, system-ui, sans-serif"; ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.textAlign = "center"; ctx.fillText(p.pin, x, y + r * 1.35 + 11); }
    });
    if (S.on) { // saldatore e filo di stagno
      const [x, y] = px(S.on), hot = Math.min(1, (S.temp - 200) / 250);
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.75);
      ctx.fillStyle = "#8d949b"; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.lineTo(7, -70); ctx.lineTo(-7, -70); ctx.closePath(); ctx.fill();
      ctx.fillStyle = `rgba(255,${Math.round(140 - hot * 80)},40,${0.25 + hot * 0.4})`; ctx.beginPath(); ctx.arc(0, -4, 5, 0, 7); ctx.fill();
      ctx.fillStyle = "#2a2f36"; ctx.fillRect(-11, -150, 22, 82); ctx.fillStyle = "#ff7a2f"; ctx.fillRect(-11, -110, 22, 6); ctx.restore();
      if (S.feeding) { ctx.strokeStyle = "#cfd5db"; ctx.lineWidth = Math.max(2, +S.wire * 4); ctx.beginPath(); ctx.moveTo(x - 8, y + 2); ctx.quadraticCurveTo(x - 60, y + 30, x - 120, y + 20); ctx.stroke(); }
    }
    S.smoke.forEach(s => { ctx.globalAlpha = Math.max(0, s.a); ctx.fillStyle = "#e6e6e6"; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); }); ctx.globalAlpha = 1;
  }
  /* --- eventi --- */
  cv.addEventListener("pointerdown", e => {
    const r = cv.getBoundingClientRect(), p = hit(e.clientX - r.left, e.clientY - r.top); if (!p) { if (S.on) lift(); return; }
    if (S.tool === "iron") { if (S.on === p) { lift(); return; } if (S.on) lift(); if (p.st === "burnt") { env.toast && env.toast("Questa piazzola è rovinata: serve un ponticello di filo."); return; } S.on = p; p.heatT = 0; p.fluxT = 0; if (p.st !== "none") { p.st = "none"; p.cold = p.cold; } hud(); return; }
    if (S.tool === "pump" || S.tool === "wick") { if (S.on) lift(); if (p.amt <= 0.05 && p.st !== "bridge") { env.toast && env.toast("Qui non c'è stagno da togliere."); return; } p.T = A().liq + 40; p.heatT += 1.2; const nb = neighbor(p); if (S.tool === "wick" && nb && nb.st === "bridge") { nb.amt = Math.min(nb.amt, nb.target * 0.4); nb.st = "none"; nb.wet = 0; }
      p.amt = S.tool === "pump" ? p.amt * 0.08 : Math.min(p.amt, p.target * (p.st === "bridge" ? 0.6 : 0.3)); p.wet = 0; p.cold = false; p.st = p.amt > 0.3 * p.target ? "cold" : "none"; p.note = S.tool === "pump" ? "Stagno aspirato con la pompetta: risalda il giunto." : "Treccia: stagno in eccesso assorbito, ripassa il giunto."; log(p); return; }
  });
  const feed = $("#sFeed");
  const fOn = e => { e.preventDefault(); if (!S.on) { env.toast && env.toast("Prima appoggia il saldatore su una piazzola."); return; } S.feeding = true; feed.classList.add("on"); };
  const fOff = () => { S.feeding = false; feed.classList.remove("on"); };
  feed.addEventListener("pointerdown", fOn); feed.addEventListener("pointerup", fOff); feed.addEventListener("pointercancel", fOff); feed.addEventListener("pointerleave", fOff);
  $("#sLift").addEventListener("click", lift);
  el.addEventListener("keydown", e => { if (e.key === " " || e.key === "s") { if (S.on) { S.feeding = true; e.preventDefault(); } } });
  el.addEventListener("keyup", e => { if (e.key === " " || e.key === "s") S.feeding = false; });
  $("#sAl").addEventListener("change", e => { S.alloy = e.target.value; S.temp = A().ideal; $("#sT").value = S.temp; $("#sTv").textContent = S.temp + " °C"; renderLog(); hud(); });
  $("#sT").addEventListener("input", e => { S.temp = +e.target.value; $("#sTv").textContent = S.temp + " °C"; hud(); });
  $("#sW").addEventListener("change", e => { S.wire = e.target.value; });
  $("#sTip").addEventListener("change", e => { S.tip = e.target.value; });
  $("#sFx").addEventListener("change", e => { S.flux = e.target.checked; });
  el.addEventListener("click", e => { const b = e.target.closest("[data-st]"); if (!b) return; const k = b.getAttribute("data-st");
    if (k === "iron" || k === "pump" || k === "wick") { if (S.on) lift(); S.tool = k; el.querySelectorAll("[data-st]").forEach(x => { if (["iron", "pump", "wick"].includes(x.getAttribute("data-st"))) x.setAttribute("aria-pressed", String(x === b)); }); hud(); }
    else if (k === "board") { S.src = S.src === "board" ? "train" : "board"; buildPads(); draw(); }
    else if (k === "reset") { S.on = null; S.src = S.src; S.pads.forEach(p => { p.st = "none"; p.amt = 0; p.wet = 0; p.cold = false; p.T = 25; p.heatT = 0; }); LOG.length = 0; renderLog(); draw(); } });
  $("#sApply").addEventListener("click", () => { if (S.src !== "board") { env.toast && env.toast("Passa a \"Scheda: il mio circuito\" per saldare la tua scheda."); return; } const j = {}; S.pads.forEach(p => { j[p.key] = p.st; }); env.apply && env.apply(j); });
  let raf = 0, last = 0;
  function tick(ts) { raf = 0; if (!S.run) return; const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts; step(dt); draw(); if (S.on) hud(); raf = requestAnimationFrame(tick); }
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null; if (ro) ro.observe(stage);
  buildPads(); resize(); hud();
  return {
    resume() { S.run = true; buildPads(); resize(); last = 0; if (!raf) raf = requestAnimationFrame(tick); },
    pause() { S.run = false; if (S.on) lift(); if (raf) cancelAnimationFrame(raf); raf = 0; },
    state: S, step, judge, lift, place(i) { S.on = S.pads[i]; S.on.heatT = 0; hud(); }, feed(v) { S.feeding = v; },
    ctx() { const a = A(); return { alloy: a.n, temp: S.temp, ideal: a.ideal, done: S.pads.filter(p => p.st === "ok").length, total: S.pads.length, bad: S.pads.filter(p => p.st !== "ok" && p.st !== "none").map(p => p.comp + "·" + p.pin + ": " + p.note) }; },
    dispose() { this.pause(); if (ro) ro.disconnect(); }
  };
}
