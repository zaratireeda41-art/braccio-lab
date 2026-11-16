// Braccio Lab · Banchi di lavoro: Tavola elettronica (circuito, saldatura, catalogo PCB), Il mio spazio (3D) e Assistente.
import { mountBench } from "./bench.js?v=4";
import { mountSolder } from "./solder.js?v=4";
import { mountPcb } from "./pcbui.js?v=4";

export function mount(el, api) {
  const esc = api.esc, AST = api.AST, reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const st = api.store(); st.pane = st.pane || "circ";
  el.innerHTML = `<div class="lab" id="lab">
    <div class="lab-nav" role="tablist" aria-label="Banchi di lavoro">
      <div class="lab-seg"><span class="lab-t">Tavola da lavoro</span><button type="button" role="tab" data-pane="circ">Circuito</button><button type="button" role="tab" data-pane="sol">Saldatura</button><button type="button" role="tab" data-pane="pcb">Catalogo PCB</button></div>
      <button type="button" class="btn sm lab-exit" data-pane="space">Esci dal banco → Il mio spazio</button>
    </div>
    <div class="lab-main"><div class="lab-body">
      <section class="lab-pane" id="labCirc"></section><section class="lab-pane" id="labSol" hidden></section><section class="lab-pane" id="labPcb" hidden></section><section class="lab-pane" id="labSpace" hidden></section>
    </div>
    <aside class="lab-ai" id="labAi" hidden aria-label="Assistente"><div class="ai-h"><div><b>Assistente</b> <span class="badge" id="aiMode">offline</span></div><div><button type="button" class="x" data-ai="cfg" aria-label="Impostazioni assistente">⚙</button><button type="button" class="x" data-ai="close" aria-label="Chiudi assistente">✕</button></div></div>
      <div class="ai-cfg" id="aiCfg" hidden></div>
      <div class="ai-msgs" id="aiMsgs" aria-live="polite"></div><div class="ai-sug" id="aiSug"></div>
      <form class="ai-in" id="aiForm"><input id="aiQ" type="text" autocomplete="off" placeholder="Chiedi: cosa non va nel circuito? giri del tornio Ø20 alluminio…" aria-label="Domanda all'assistente"><button type="submit" class="btn sm">Invia</button></form></aside></div>
    <button type="button" class="lab-fab" id="labFab" aria-label="Apri l'assistente"><span>✦</span> Assistente</button>
  </div>`;
  const $ = s => el.querySelector(s);
  const M = { bench: null, sol: null, pcb: null, space: null, spaceLoading: false, pane: null, hist: [] };
  M.bench = mountBench($("#labCirc"), { CIR: api.CIR, esc, toast: api.toast, reduced, testMode: api.testMode, ask: q => openAi(q), onChange: () => {} });
  M.sol = mountSolder($("#labSol"), { esc, toast: api.toast, reduced, pads: () => M.bench.pads(), joints: () => M.bench.joints(), apply: j => { M.bench.setJoints(j, true); show("circ"); api.toast("Giunti applicati: la simulazione usa la tua saldatura (vista PCB)"); } });
  M.pcb = mountPcb($("#labPcb"), { PCB: api.PCB, esc, useBoard: p => { M.bench.setBoard(p); show("circ"); api.toast("Scheda scelta: " + p.name.split(" · ")[0]); } });
  function webgl() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } }
  function openSpace() {
    if (M.space || M.spaceLoading) { if (M.space) M.space.resume(); return; }
    const box = $("#labSpace"); if (!webgl()) { box.innerHTML = `<div class="card"><h3>Il mio spazio</h3><p>Serve WebGL per lo spazio 3D: attiva l'accelerazione hardware o usa un browser aggiornato.</p></div>`; return; }
    M.spaceLoading = true; box.innerHTML = `<div class="o3-load"><div class="spin"></div><p>Preparo il tuo spazio…</p></div>`;
    import("./space.js?v=4").then(mod => { M.spaceLoading = false; box.innerHTML = ""; M.space = mod.mountSpace(box, { MET: api.MET, esc, toast: api.toast, reduced, testMode: api.testMode, onBack: () => show("circ"), onPart: () => {}, onChange: () => {} }); window.__lab.space = M.space; if (M.pane === "space") M.space.resume(); })
      .catch(e => { M.spaceLoading = false; box.innerHTML = `<div class="card"><p>Non riesco a caricare lo spazio 3D (${esc(e && e.message || "errore")}).</p></div>`; if (window.console) console.warn(e); });
  }
  function show(p) {
    M.pane = p; st.pane = p; api.save();
    el.querySelectorAll("[data-pane]").forEach(b => { const on = b.getAttribute("data-pane") === p; b.classList.toggle("on", on); if (b.getAttribute("role") === "tab") b.setAttribute("aria-selected", String(on)); });
    const ex = el.querySelector(".lab-exit"); ex.textContent = p === "space" ? "← Torna alla tavola" : "Esci dal banco → Il mio spazio"; ex.setAttribute("data-pane", p === "space" ? "circ" : "space"); ex.classList.toggle("on", false);
    $("#lab").classList.toggle("in-space", p === "space");
    [["circ", "#labCirc"], ["sol", "#labSol"], ["pcb", "#labPcb"], ["space", "#labSpace"]].forEach(([k, s]) => { $(s).hidden = k !== p; });
    M.bench[p === "circ" ? "resume" : "pause"](); M.sol[p === "sol" ? "resume" : "pause"](); if (M.space && p !== "space") M.space.pause();
    if (p === "space") openSpace();
  }
  /* ---- assistente ---- */
  function md(t) { return esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>"); }
  function ctx() { return { view: M.pane === "circ" ? "bench" : M.pane === "sol" ? "solder" : M.pane === "space" ? "space" : "pcb", circuit: M.bench.ctx(), solder: M.pane === "sol" ? M.sol.ctx() : null, space: M.space && M.pane === "space" ? M.space.ctx() : null, arm: api.armCtx ? api.armCtx() : null }; }
  function addMsg(me, text, src) { M.hist.push({ me, text, src }); if (M.hist.length > 40) M.hist.shift(); const box = $("#aiMsgs"); box.insertAdjacentHTML("beforeend", `<div class="ai-m ${me ? "me" : "bot"}">${md(text)}${!me && src ? `<small>${esc({ calc: "calcolatore", ctx: "letto dal tuo lavoro", kb: "base di conoscenza", llm: "servizio esterno", none: "" }[src] || "")}</small>` : ""}</div>`); box.scrollTop = box.scrollHeight; }
  function sug(list) { $("#aiSug").innerHTML = (list || []).slice(0, 4).map(s => `<button type="button" class="chip" data-sug="${esc(s)}">${esc(s)}</button>`).join(""); }
  function defaultSug() { const p = M.pane; return p === "space" ? ["Cosa devo sapere qui?", "Giri tornio Ø20 alluminio", "Parametri MIG acciaio 3 mm", "Scintille della smerigliatrice"] : p === "sol" ? ["Temperatura per SAC305?", "Giunto freddo", "Come tolgo un ponte di stagno?", "Diametro del filo"] : p === "pcb" ? ["ENIG o HASL?", "Quando servono 4 strati?", "PCB in alluminio", "Rame 2 oz"] : ["Cosa non va nel mio circuito?", "Resistenza per LED blu a 12 V", "Partitore 12 V a 3,3 V", "Vref A4988 per 1,2 A"]; }
  function ask(q) { q = String(q || "").trim(); if (!q) return Promise.resolve(); addMsg(true, q); $("#aiQ").value = ""; return AST.ask(q, ctx(), M.hist.slice(0, -1)).then(a => { addMsg(false, a.text, a.src); sug(a.sug && a.sug.length ? a.sug : defaultSug()); return a; }); }
  function openAi(q) { const a = $("#labAi"); a.hidden = false; $("#lab").classList.add("ai-open"); $("#labFab").hidden = true; if (!M.hist.length) { addMsg(false, "Ciao! Lavoro **offline** su questo dispositivo: leggo il tuo circuito, la saldatura e lo spazio di lavoro, spiego gli errori e faccio i calcoli (Ohm, LED, partitori, RC, 555, giri di tornio e trapano, TIG/MIG, apporto termico).", "kb"); sug(defaultSug()); } if (q) ask(q); else if (window.innerWidth >= 1000) $("#aiQ").focus(); }
  function closeAi() { $("#labAi").hidden = true; $("#lab").classList.remove("ai-open"); $("#labFab").hidden = false; }
  function cfgPanel() {
    const c = AST.loadCfg(), box = $("#aiCfg");
    box.innerHTML = `<p><b>Assistente offline</b> (predefinito): nessun dato lascia il dispositivo.</p><label class="lb-f chk"><input type="checkbox" id="aiOn"${c.on ? " checked" : ""}><span>Usa un servizio esterno compatibile OpenAI (facoltativo)</span></label>
      <div class="lb-fields"><label class="lb-f"><span>Indirizzo API</span><input id="aiUrl" type="url" value="${esc(c.url)}" spellcheck="false"></label><label class="lb-f"><span>Modello</span><input id="aiModel" type="text" value="${esc(c.model)}" spellcheck="false"></label><label class="lb-f"><span>La tua chiave API</span><input id="aiKey" type="password" value="" placeholder="${c.key ? "chiave salvata (••••)" : "incolla qui la tua chiave"}" autocomplete="off" spellcheck="false"></label></div>
      <p class="sp-warn">⚠️ La chiave resta solo in questo browser (localStorage), non nel sito: chi usa questo dispositivo può leggerla e le domande con il contesto vengono inviate al servizio scelto. Usa una chiave con limite di spesa. Indirizzi permessi: api.openai.com, openrouter.ai, api.groq.com, api.mistral.ai, localhost.</p>
      <div class="row"><button type="button" class="btn sm" data-ai="save">Salva</button><button type="button" class="btn sm ghost danger" data-ai="forget">Cancella la chiave</button></div>`;
    box.hidden = !box.hidden;
  }
  function mode() { const c = AST.loadCfg(), b = $("#aiMode"); b.textContent = c.on && c.key ? "online (tua chiave)" : "offline"; b.classList.toggle("on", !!(c.on && c.key)); }
  $("#aiForm").addEventListener("submit", e => { e.preventDefault(); ask($("#aiQ").value); });
  el.addEventListener("click", e => {
    const b = e.target.closest("[data-pane],[data-ai],[data-sug],#labFab"); if (!b) return;
    if (b.id === "labFab") { openAi(); return; }
    if (b.hasAttribute("data-pane")) { show(b.getAttribute("data-pane")); return; }
    if (b.hasAttribute("data-sug")) { ask(b.getAttribute("data-sug")); return; }
    const k = b.getAttribute("data-ai");
    if (k === "close") closeAi(); else if (k === "cfg") cfgPanel();
    else if (k === "save") { const c = AST.loadCfg(), key = $("#aiKey").value.trim(); AST.saveCfg({ on: $("#aiOn").checked, url: $("#aiUrl").value.trim() || c.url, model: $("#aiModel").value.trim() || c.model, key: key || c.key }); $("#aiCfg").hidden = true; mode(); api.toast(AST.loadCfg().on && AST.loadCfg().key ? "Servizio esterno attivo con la tua chiave" : "Assistente offline"); }
    else if (k === "forget") { AST.saveCfg({ on: false, url: "", model: "", key: "" }); $("#aiCfg").hidden = true; mode(); api.toast("Chiave cancellata: assistente offline"); }
  });
  mode();
  window.__lab = { bench: M.bench, sol: M.sol, pcb: M.pcb, space: null, ask, openAi, closeAi, show, ctx };
  show(st.pane === "space" ? "circ" : st.pane);
  return {
    resume() { show(M.pane || "circ"); },
    pause() { M.bench.pause(); M.sol.pause(); if (M.space) M.space.pause(); },
    open: show, ask
  };
}
