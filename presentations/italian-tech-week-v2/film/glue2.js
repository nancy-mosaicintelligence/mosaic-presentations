/* v2 in the deck: the deck's station drives the scenes; an ambient clock keeps them alive; a change of scene
   (or a step back) crossfades from the last frame. Stations 1–2 are the deck's own opening. */
let op = 0, last = 0, snap = null, snapT = -1;
const GROUP = st => st <= 6 ? 'road' : st <= 20 ? 'body' : st <= 23 ? 'vessel' : st <= 29 ? 'see' : st <= 33 ? 'scale' : st <= 34 ? 'q' : st <= 38 ? 'sense' : st <= 40 ? 'board' : st <= 41 ? 'first' : st <= 42 ? 'path' : st <= 49 ? 'loop' : st <= 51 ? 'stack' : st <= 52 ? 'road2' : 'close';
function fit() { const dpr = Math.min(2, window.devicePixelRatio || 1), w = innerWidth, h = innerHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const s = Math.min(w / W, h / H); BASE = [s * dpr, 0, 0, s * dpr, (w - W * s) / 2 * dpr, (h - H * s) / 2 * dpr]; }
function takeSnap() { if (!snap) snap = document.createElement('canvas'); snap.width = cv.width; snap.height = cv.height; snap.getContext('2d').drawImage(cv, 0, 0); snapT = TA; }
function render(t) {
  TA = t; fit(); ctx = cv.getContext('2d');
  bgNow = lerp(BGF, WHITE(ST), sm((TA - BGT0) / .9));
  ctx.setTransform(1, 0, 0, 1, 0, 0); const v = Math.round(lerp(4, 255, bgNow)); ctx.fillStyle = `rgb(${v},${Math.round(lerp(1, 255, bgNow))},${Math.round(lerp(2, 255, bgNow))})`; ctx.fillRect(0, 0, cv.width, cv.height);
  if (bgNow < .5) { ctx.setTransform(...BASE); const vg = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 1200); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${.35 * (1 - bgNow * 2)})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H); }
  v2frame();
  if (snap && snapT >= 0) { const k = 1 - (TA - snapT) / .5; if (k > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = sm(k); ctx.drawImage(snap, 0, 0); ctx.globalAlpha = 1; } else snapT = -1; }
}
function setStation(st, t) {
  if (st === ST) return;
  if (ST >= 3 && (GROUP(st) !== GROUP(ST) || st < ST)) takeSnap();
  goStation(st, t);
}
function tick(now) {
  requestAnimationFrame(tick);
  const t = now / 1000, dt = last ? Math.min(.1, t - last) : 0; last = t;
  const step = window.__itwStep | 0, on = step >= 2;
  op = cl(op + (on ? 1 : -1) * dt / .6); cv.style.opacity = op.toFixed(3); cv.style.visibility = op > 0 ? 'visible' : 'hidden';
  if (on) setStation(step + 1, t); else if (op <= 0) { if (ST !== 2) { ENT = {}; ST = 2; } return; }
  render(t);
  if (op > .5) document.body.classList.toggle('lite', bgNow > .5);
}
async function boot() {
  cv = document.getElementById('film'); ctx = cv.getContext('2d'); TL = __TL__;
  const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
  IMG.a = await load(__IMGA__); IMG.b = await load(__IMGB__);
  try { await Promise.all(['300 64px Fraunces', '400 24px "DM Sans"', '400 24px "IBM Plex Mono"', '400 24px "Architects Daughter"'].map(f => document.fonts.load(f))); } catch (e) {}
  prep();
  if (window.__V2TEST) { window.V2 = { render, setStation, goStation, get ST() { return ST; } }; window.READY = true; return; }
  requestAnimationFrame(tick);
}
boot();
