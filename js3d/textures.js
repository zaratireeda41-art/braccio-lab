// Braccio Lab · Officina 3D – texture procedurali (canvas), niente immagini esterne
import * as THREE from "../vendor/three.module.min.js";

function cv(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
function rnd(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function tex(c, rep, srgb) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); t.anisotropy = 4; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; }

// acciaio spazzolato: strisce orizzontali fini (colore + rugosità)
export function brushed(base = "#9aa3ab", seed = 7, size = 256) {
  const c = cv(size, size), g = c.getContext("2d"), r = rnd(seed); g.fillStyle = base; g.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 6; i++) { const y = r() * size, a = 0.03 + r() * 0.08, l = 20 + r() * size; g.fillStyle = r() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`; g.fillRect(r() * size, y, l, 1); }
  const rc = cv(size, size), rg = rc.getContext("2d"); rg.fillStyle = "#6b6b6b"; rg.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 4; i++) { rg.fillStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},0.06)`; rg.fillRect(r() * size, r() * size, 30 + r() * 120, 1); }
  return { map: tex(c, [2, 2], true), rough: tex(rc, [2, 2]) };
}
// alluminio anodizzato: grana fine e uniforme
export function anodized(base = "#b9c2cc", seed = 3) {
  const s = 128, c = cv(s, s), g = c.getContext("2d"), r = rnd(seed); g.fillStyle = base; g.fillRect(0, 0, s, s);
  const id = g.getImageData(0, 0, s, s); for (let i = 0; i < id.data.length; i += 4) { const n = (r() - 0.5) * 14; id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n; } g.putImageData(id, 0, 0);
  return { map: tex(c, [3, 3], true) };
}
// fibra di carbonio twill 2×2
export function carbon() {
  const s = 128, c = cv(s, s), g = c.getContext("2d"), n = 8, w = s / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const on = ((i + j) >> 1) % 2 === 0, gr = g.createLinearGradient(i * w, j * w, on ? (i + 1) * w : i * w, on ? j * w : (j + 1) * w);
    gr.addColorStop(0, "#111"); gr.addColorStop(0.5, on ? "#3b3f44" : "#2a2d31"); gr.addColorStop(1, "#0d0d0d"); g.fillStyle = gr; g.fillRect(i * w, j * w, w, w); }
  return { map: tex(c, [4, 4], true) };
}
// cemento industriale con macchie, giunti e resina
export function concrete(seed = 11) {
  const s = 512, c = cv(s, s), g = c.getContext("2d"), r = rnd(seed); g.fillStyle = "#4a4f55"; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 2600; i++) { const x = r() * s, y = r() * s, rad = 1 + r() * 18; g.fillStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${0.012 + r() * 0.03})`; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 2; g.strokeRect(1, 1, s - 2, s - 2);
  const rc = cv(128, 128), rg = rc.getContext("2d"); rg.fillStyle = "#b5b5b5"; rg.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 400; i++) { rg.fillStyle = `rgba(0,0,0,${r() * 0.15})`; rg.fillRect(r() * 128, r() * 128, 3, 3); }
  return { map: tex(c, [8, 8], true), rough: tex(rc, [8, 8]) };
}
// rete della recinzione (con trasparenza)
export function fence() {
  const s = 128, c = cv(s, s), g = c.getContext("2d"); g.clearRect(0, 0, s, s); g.strokeStyle = "#e9edf1"; g.lineWidth = 3;
  for (let i = 0; i <= s; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(s, i); g.stroke(); }
  return tex(c, [6, 4], true);
}
// strisce di pericolo gialle/nere
export function hazard() {
  const c = cv(128, 32), g = c.getContext("2d"); g.fillStyle = "#f5c542"; g.fillRect(0, 0, 128, 32); g.fillStyle = "#111";
  for (let x = -32; x < 160; x += 32) { g.beginPath(); g.moveTo(x, 32); g.lineTo(x + 16, 32); g.lineTo(x + 32, 0); g.lineTo(x + 16, 0); g.fill(); }
  return tex(c, [10, 1], true);
}
// vernice industriale con leggera buccia
export function painted(base = "#ff7a2f", seed = 5) {
  const s = 64, c = cv(s, s), g = c.getContext("2d"), r = rnd(seed); g.fillStyle = base; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.04})`; g.fillRect(r() * s, r() * s, 2, 2); }
  return { map: tex(c, [2, 2], true) };
}
// sprite tondo sfumato per scintille, fumo e nebbia
export function sprite(inner = "rgba(255,255,255,1)", outer = "rgba(255,255,255,0)") {
  const s = 64, c = cv(s, s), g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, inner); gr.addColorStop(0.35, inner.replace(/,\s*[\d.]+\)$/, ",.6)")); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// lamiera "disegnabile": base metallica + canvas del calore (emissivo) + canvas dei segni
export function workSheet(base = "#8e979f", size = 1024, seed = 9) {
  const c = cv(size, size), g = c.getContext("2d"), b = brushed(base, seed, 256).map.image; for (let x = 0; x < size; x += 256) for (let y = 0; y < size; y += 256) g.drawImage(b, x, y);
  const h = cv(size >> 1, size >> 1), hg = h.getContext("2d"); hg.fillStyle = "#000"; hg.fillRect(0, 0, h.width, h.height);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  const heat = new THREE.CanvasTexture(h); heat.colorSpace = THREE.SRGBColorSpace;
  return { canvas: c, ctx: g, map, heatCanvas: h, heatCtx: hg, heat, size };
}
