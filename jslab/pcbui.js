// Braccio Lab · Catalogo PCB: ricerca e filtri su oltre 1000 tipi di schede (window.PCB, js/pcbcat.js).
export function mountPcb(el, env) {
  const P = env.PCB, esc = env.esc, f = { q: "", cat: "", layers: "", mat: "", fin: "", cu: "", sort: "", lim: 30 };
  const opt = (o) => Object.keys(o).map(k => `<option value="${k}">${esc(o[k].n || o[k])}</option>`).join("");
  el.innerHTML = `<div class="lb-pcb"><div class="card"><h3>Catalogo PCB <small>${P.count} tipi</small></h3>
    <input type="search" id="pQ" placeholder="Cerca: es. ENIG 4 strati, alluminio, ESP32, millefori…" aria-label="Cerca PCB">
    <div class="lb-filt">
      <select id="pCat" aria-label="Categoria"><option value="">Tutte le categorie</option>${opt(P.CATN)}</select>
      <select id="pL" aria-label="Strati"><option value="">Strati: tutti</option>${[1, 2, 4, 6, 8].map(n => `<option value="${n}">${n} ${n === 1 ? "strato" : "strati"}</option>`).join("")}</select>
      <select id="pM" aria-label="Materiale"><option value="">Materiale: tutti</option>${opt(P.MAT)}</select>
      <select id="pF" aria-label="Finitura"><option value="">Finitura: tutte</option>${opt(P.FIN)}</select>
      <select id="pCu" aria-label="Rame"><option value="">Rame: tutti</option><option value="1">1 oz (35 µm)</option><option value="2">2 oz (70 µm)</option><option value="3">3 oz (105 µm)</option></select>
      <select id="pS" aria-label="Ordina"><option value="">Ordine: catalogo</option><option value="price">Prezzo crescente</option><option value="-price">Prezzo decrescente</option></select>
    </div><p class="note" id="pN"></p></div>
    <div class="lb-plist" id="pList"></div><button type="button" class="btn ghost" id="pMore">Mostra altri</button><div class="lb-sheet" id="pSheet" hidden></div></div>`;
  const $ = s => el.querySelector(s);
  function card(p) {
    const spec = p.cat === "fab" ? `${p.layers}L · ${esc(P.MAT[p.mat].n)} · ${String(p.th).replace(".", ",")} mm · ${p.cu} oz · ${esc(P.FIN[p.fin].n)}` : esc(p.desc).slice(0, 90);
    return `<button type="button" class="lb-pc" data-pid="${esc(p.id)}"><i class="sw" data-col="${esc(p.color)}"></i><div><b>${esc(p.name)}</b><small>${spec}</small></div><span class="pr">${p.price.toFixed(2).replace(".", ",")} €<small>${esc(p.qty)}</small></span></button>`;
  }
  function run() {
    const res = P.query({ q: f.q, cat: f.cat, layers: f.layers, mat: f.mat, fin: f.fin, cu: f.cu, sort: f.sort });
    $("#pN").textContent = `${res.length} risultati` + (res.length ? ` · prezzi indicativi da ${Math.min(...res.map(p => p.price)).toFixed(2).replace(".", ",")} €` : "");
    $("#pList").innerHTML = res.slice(0, f.lim).map(card).join("") || `<p class="note">Nessuna scheda con questi filtri.</p>`;
    $("#pList").querySelectorAll(".sw").forEach(i => { i.style.background = i.getAttribute("data-col"); });
    $("#pMore").hidden = res.length <= f.lim;
  }
  function detail(id) {
    const p = P.get(id); if (!p) return; const s = $("#pSheet");
    const rows = p.cat === "fab" || p.cat === "proto" ? [["Strati", p.layers], ["Materiale", (P.MAT[p.mat] || { n: p.mat }).n], ["Spessore", String(p.th).replace(".", ",") + " mm"], ["Rame", p.cu + " oz (" + p.cu * 35 + " µm)"], ["Finitura", (P.FIN[p.fin] || { n: p.fin }).n], ["Solder mask", p.mask], ["Misura", p.w + " × " + p.h + " mm"]].concat(p.track ? [["Pista / via minimi", p.track + " mm / " + p.via + " mm"]] : []) : [["Tipo", p.sub], ["Strati", p.layers], ["Finitura", (P.FIN[p.fin] || { n: p.fin }).n]];
    s.innerHTML = `<div class="lb-sin" role="dialog" aria-label="${esc(p.name)}"><div class="sh-h"><h3>${esc(p.name)}</h3><button type="button" class="x" data-pc="close" aria-label="Chiudi">✕</button></div>
      <div class="lb-pboard"><i class="sw big" data-col="${esc(p.color)}"></i></div><div class="kv">${rows.map(r => `<div><small>${esc(r[0])}</small><b>${esc(String(r[1]))}</b></div>`).join("")}<div><small>Prezzo tipico</small><b>${p.price.toFixed(2).replace(".", ",")} € (${esc(p.qty)})</b></div><div><small>Tempi</small><b>${p.lead} giorni lavorativi</b></div></div>
      <p>${esc(p.desc)}</p><p class="note">ID: ${esc(p.id)} · Valori tipici indicativi: verifica sul sito del produttore.</p>
      <button type="button" class="btn" data-pc="use" data-id="${esc(p.id)}">Usa come scheda del mio circuito</button></div>`;
    s.querySelectorAll(".sw").forEach(i => { i.style.background = i.getAttribute("data-col"); }); s.hidden = false;
  }
  let t = 0; $("#pQ").addEventListener("input", e => { clearTimeout(t); t = setTimeout(() => { f.q = e.target.value; f.lim = 30; run(); }, 150); });
  [["#pCat", "cat"], ["#pL", "layers"], ["#pM", "mat"], ["#pF", "fin"], ["#pCu", "cu"], ["#pS", "sort"]].forEach(([s, k]) => $(s).addEventListener("change", e => { f[k] = e.target.value; f.lim = 30; run(); }));
  $("#pMore").addEventListener("click", () => { f.lim += 30; run(); });
  el.addEventListener("click", e => { const b = e.target.closest("[data-pid],[data-pc]"); if (!b) return; if (b.hasAttribute("data-pid")) { detail(b.getAttribute("data-pid")); return; } const k = b.getAttribute("data-pc"); if (k === "close") $("#pSheet").hidden = true; if (k === "use") { $("#pSheet").hidden = true; env.useBoard && env.useBoard(P.get(b.getAttribute("data-id"))); } });
  run();
  return { resume() {}, pause() {}, query: (o) => { Object.assign(f, o); run(); }, detail };
}
