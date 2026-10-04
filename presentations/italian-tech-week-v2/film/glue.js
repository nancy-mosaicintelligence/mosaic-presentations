/* The film inside the deck: each station is a pause point. Stepping forward plays the next stretch of animation and holds;
   stepping back shows that station as it stands. Stations 1–2 (the opening) stay the deck's own. */
let ft = null, last = 0, op = 0, lastDrawn = '', bgW = 0;
const HOLD = __HOLD__, CUE = __CUE__, FILM_FROM = 2;
function fit() { const dpr = Math.min(2, window.devicePixelRatio || 1), w = innerWidth, h = innerHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); lastDrawn = ''; }
  const s = Math.min(w / W, h / H); BASE = [s * dpr, 0, 0, s * dpr, (w - W * s) / 2 * dpr, (h - H * s) / 2 * dpr]; return dpr; }
function tick(now) {
  requestAnimationFrame(tick);
  const dt = last ? Math.min(.1, (now - last) / 1000) : 0; last = now;
  const st = window.__itwStep | 0, on = st >= FILM_FROM;
  op = cl(op + (on ? 1 : -1) * dt / .6);
  cv.style.opacity = op.toFixed(3); cv.style.visibility = op > 0 ? 'visible' : 'hidden';
  if (!on) { ft = null; if (op <= 0) return; }
  else {
    const target = HOLD[st], start = st === FILM_FROM ? 16.8 : CUE[st];
    if (ft === null) ft = start;
    if (ft > target + .01) ft = target;                                   /* back: the station as it stands */
    else if (ft < start - .05) ft = start - ft > 4 ? start : Math.min(target, ft + dt * 4);   /* ahead of the film: catch up */
    else ft = Math.min(target, ft + dt);
  }
  const t = ft ?? 16.8, dpr = fit(), key = t.toFixed(3) + cv.width;
  bgW = bg(t); if (op > .5) document.body.classList.toggle('lite', bgW > .5);
  if (key === lastDrawn) return; lastDrawn = key;
  ctx.setTransform(1, 0, 0, 1, 0, 0); const v = Math.round(lerp(4, 255, bgW)); ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(0, 0, cv.width, cv.height);
  frame(t);
}
async function boot() {
  cv = document.getElementById('film'); ctx = cv.getContext('2d'); TL = __TL__;
  const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
  IMG.a = await load(__IMGA__); IMG.b = await load(__IMGB__);
  try { await Promise.all(['300 64px Fraunces', '400 24px "DM Sans"', '400 24px "IBM Plex Mono"'].map(f => document.fonts.load(f))); } catch (e) {}
  prep(); SCENES.splice(0, 1);          /* the heartbeat opening is the film's; the deck keeps its own */
  requestAnimationFrame(tick);
}
boot();
