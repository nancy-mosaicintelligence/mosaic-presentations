/* The film's engine: deterministic drawing of frame t on a 1920×1080 canvas (rendered at 2×).
   Everything is drawn from scratch each frame, so any frame can be rendered on its own. */
'use strict';
const W = 1920, H = 1080, K = 2;
const COL = { ink:'255,255,255', ink2:'201,197,194', ink3:'126,122,120', sig:'252,100,82', sig2:'253,134,120',
  room:'140,160,174', dark:'22,19,18', dark2:'60,56,54', gold:'242,192,74', warm:'171,167,164' };
let cv, ctx, TL, T = 0;

/* ---------- math ---------- */
const cl = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const ramp = (t, a, b) => cl((t - a) / (b - a));
const sm = x => { x = cl(x); return x * x * (3 - 2 * x); };
const eio = x => { x = cl(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const eo = x => 1 - Math.pow(1 - cl(x), 3);
const ei = x => Math.pow(cl(x), 3);
const lerp = (a, b, u) => a + (b - a) * u;
const env = (t, a, b, fi = .6, fo = .6) => Math.min(sm((t - a) / fi), sm((b - t) / fo));
const back = x => { x = cl(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
function rnd(seed) { let s = Math.abs(Math.floor(seed * 9301 + 49297)) % 233280; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
const rgba = (c, a) => `rgba(${c},${cl(a)})`;

/* ---------- the narration's words ---------- */
const norm = w => w.toLowerCase().replace(/[^a-z0-9$]/g, '');
const seg = id => TL.segs.find(s => s.id === id);
function wt(id, word, nth = 0) {
  const s = seg(id), n = norm(word); let k = 0;
  for (const w of s.words) if (norm(w[0]) === n) { if (k === nth) return w[1]; k++; }
  console.warn('no word', id, word); return s.start;
}
function we(id, word, nth = 0) { const s = seg(id), n = norm(word); let k = 0;
  for (const w of s.words) if (norm(w[0]) === n) { if (k === nth) return w[1] + w[2]; k++; } return s.start + s.dur; }
const S0 = id => seg(id).start, S1 = id => seg(id).start + seg(id).dur;

/* ---------- polylines: the unit everything is drawn with ---------- */
function PL(pts) {
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { p: pts, L, len: L[L.length - 1] || 1e-6 };
}
function plAt(P, u) {
  const d = cl(u) * P.len; let lo = 0, hi = P.L.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P.L[m] < d) lo = m; else hi = m; }
  const g = (P.L[hi] - P.L[lo]) || 1, f = cl((d - P.L[lo]) / g), a = P.p[lo], b = P.p[hi];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(b[1] - a[1], b[0] - a[0])];
}
function tracePL(P, u0, u1, dx = 0, dy = 0) {
  if (u1 <= u0) return;
  const d0 = u0 * P.len, d1 = u1 * P.len, s = plAt(P, u0);
  ctx.moveTo(s[0] + dx, s[1] + dy);
  for (let i = 1; i < P.p.length; i++) {
    if (P.L[i] <= d0) continue;
    if (P.L[i] >= d1) { const e = plAt(P, u1); ctx.lineTo(e[0] + dx, e[1] + dy); return; }
    ctx.lineTo(P.p[i][0] + dx, P.p[i][1] + dy);
  }
}
/* a shape is a list of polylines; prog reveals it by length, in order (or all at once with par) */
function shapeLen(sh) { return sh._len || (sh._len = sh.reduce((a, P) => a + P.len, 0)); }
function pathShape(sh, prog, par, dx, dy, from = 0) {
  const tot = shapeLen(sh); let acc = 0;
  for (const P of sh) {
    let u0 = 0, u1;
    if (par) { u0 = from; u1 = prog; }
    else { u1 = cl((prog * tot - acc) / P.len); u0 = cl((from * tot - acc) / P.len); }
    if (u1 > u0) tracePL(P, u0, u1, dx, dy);
    acc += P.len; if (!par && acc > prog * tot) break;
  }
}
/* the deck's stroke: a line plus a faint second pass a hair away */
function draw(sh, prog = 1, o = {}) {
  const a = o.a ?? 1; if (prog <= 0 || a <= .003) return;
  const c = o.c || COL.ink, w = o.w || 1.6;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = w;
  if (o.dash) ctx.setLineDash(o.dash);
  ctx.beginPath(); pathShape(sh, prog, o.par, 0, 0, o.from || 0); ctx.strokeStyle = rgba(c, a); ctx.stroke();
  if (o.ghost !== false) { const g = o.gh || 1.1;
    ctx.beginPath(); pathShape(sh, prog, o.par, g, -g * .82, o.from || 0); ctx.strokeStyle = rgba(c, a * .34); ctx.stroke(); }
  if (o.dash) ctx.setLineDash([]);
  if (o.glow) { ctx.save(); ctx.shadowColor = rgba(c, a * .9); ctx.shadowBlur = o.glow; ctx.beginPath(); pathShape(sh, prog, o.par, 0, 0, o.from || 0); ctx.strokeStyle = rgba(c, a * .6); ctx.stroke(); ctx.restore(); }
}
/* the leading point of a shape being drawn (for a pen / dot) */
function shapeHead(sh, prog) { const tot = shapeLen(sh); let acc = 0;
  for (const P of sh) { if (acc + P.len >= prog * tot) return plAt(P, (prog * tot - acc) / P.len); acc += P.len; }
  const P = sh[sh.length - 1]; return plAt(P, 1); }

/* ---------- hand-drawn geometry (the deck's construction language) ---------- */
function cat(pts, closed, step = 3) {
  const n = pts.length, out = [];
  if (n < 3 && !closed) { const [a, b] = [pts[0], pts[n - 1]], m = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k <= m; k++) out.push([lerp(a[0], b[0], k / m), lerp(a[1], b[1], k / m)]); return out; }
  const at = i => closed ? pts[(i + n) % n] : pts[cl(i, 0, n - 1)];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const m = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < m; k++) { const t = k / m, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(j => .5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); }
  }
  out.push(closed ? pts[0] : pts[n - 1]); return out;
}
function wobble(pts, seed, amp) { const n = pts.length;
  return pts.map((p, m) => { const f = m / n; return [p[0] + (Math.sin(f * 15.3 + seed * 9.7) + .45 * Math.sin(f * 44.1 + seed * 3.1)) * amp,
                                                        p[1] + (Math.cos(f * 12.9 + seed * 5.3) + .45 * Math.cos(f * 38.7 + seed * 7.9)) * amp]; }); }
function hline(x0, y0, x1, y1, seed = 1, bow = 0, jit = 1.6) {
  const r = rnd(seed), pts = [], N = 9; let nx = -(y1 - y0), ny = (x1 - x0); const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
  for (let i = 0; i <= N; i++) { const t = i / N, b = Math.sin(t * Math.PI) * bow; pts.push([x0 + (x1 - x0) * t + nx * b + (r() - .5) * jit, y0 + (y1 - y0) * t + ny * b + (r() - .5) * jit]); }
  return [PL(cat(pts, false))];
}
function hoval(cx, cy, rx, ry, seed = 1, jit = .035) {
  const r = rnd(seed), N = 26, pts = [], a0 = (r() - .5) * .5;
  for (let i = 0; i < N; i++) { const a = a0 + i / N * Math.PI * 2; pts.push([cx + Math.cos(a) * rx * (1 + (r() - .5) * jit), cy + Math.sin(a) * ry * (1 + (r() - .5) * jit)]); }
  const c = cat(pts, true); c.push([pts[0][0] + (r() - .5) * rx * .1, pts[0][1] + ry * .05]); return [PL(c)];
}
function hpoly(pts, seed = 1, jit = 1.1, closed = false) { const r = rnd(seed); return [PL(cat(pts.map(p => [p[0] + (r() - .5) * jit, p[1] + (r() - .5) * jit]), closed))]; }
function hbox(x, y, w, h, seed = 1, jit = 1.3) { const r = rnd(seed), pts = [], c = Math.min(w, h) * .045;
  const e = (x0, y0, x1, y1, n) => { for (let i = 0; i < n; i++) { const t = i / n; pts.push([x0 + (x1 - x0) * t + (r() - .5) * jit, y0 + (y1 - y0) * t + (r() - .5) * jit]); } };
  e(x + c, y, x + w - c, y, 16); e(x + w, y + c, x + w, y + h - c, 11); e(x + w - c, y + h, x + c, y + h, 16); e(x, y + h - c, x, y + c, 11);
  return [PL(cat(pts, true))]; }
const join = (...shs) => shs.flat();
function arcPts(cx, cy, r, a0, a1, n = 60) { const p = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return p; }
/* offset a polyline sideways (for road edges) */
function offsetPts(pts, d) { return pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
  let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const L = Math.hypot(nx, ny) || 1; return [p[0] + nx / L * d, p[1] + ny / L * d]; }); }
function resample(pts, n) { const P = PL(pts), o = []; for (let i = 0; i < n; i++) { const q = plAt(P, i / (n - 1)); o.push([q[0], q[1]]); } return o; }
function xform(sh, f) { return sh.map(P => PL(P.p.map(p => f(p[0], p[1])))); }

/* SVG path data → shape (sampled through a hidden SVG path element) */
const SVGNS = 'http://www.w3.org/2000/svg'; let _sp;
function dShape(d, tf = (x, y) => [x, y], step = 1.5) {
  if (!_sp) { const s = document.createElementNS(SVGNS, 'svg'); s.setAttribute('style', 'position:absolute;left:-9999px;top:0'); document.body.appendChild(s); _sp = document.createElementNS(SVGNS, 'path'); s.appendChild(_sp); }
  const subs = d.split(/(?=M)/).filter(x => x.trim()); const sh = [];
  for (const sd of subs) { _sp.setAttribute('d', sd); const L = _sp.getTotalLength(); if (L < .01) continue;
    const n = Math.max(2, Math.ceil(L / step)), pts = [];
    for (let i = 0; i <= n; i++) { const p = _sp.getPointAtLength(L * i / n); pts.push(tf(p.x, p.y)); }
    sh.push(PL(pts)); }
  return sh;
}

/* ---------- type ---------- */
const FONT = { serif: 'Fraunces', sans: 'DM Sans', mono: 'IBM Plex Mono', chalk: 'Architects Daughter' };
/* words appear as they are spoken: each word is matched, in order, to the narration line `seg` */
function say(str, x, y, o = {}) {
  const size = o.size || 56, font = FONT[o.font || 'serif'], weight = o.weight || (o.font === 'sans' || o.font === 'mono' ? 400 : 300);
  const lh = o.lh || size * 1.18, a = o.a ?? 1; if (a <= .003) return;
  ctx.save(); ctx.font = `${weight} ${size}px "${font}"`; ctx.textBaseline = 'alphabetic';
  if (o.ls) ctx.letterSpacing = o.ls + 'px';
  const lines = str.split('|').map(l => l.trim().split(/\s+/));
  const em = new Set((o.em || []).map(norm)); const space = ctx.measureText(' ').width;
  let ptr = 0; const sw = o.seg ? seg(o.seg).words : null; let tPrev = o.t ?? (sw ? sw[0][1] : 0), k = 0;
  const totalH = lines.length * lh; let y0 = y - (o.valign === 'middle' ? totalH / 2 - size * .8 : 0);
  lines.forEach((ws, li) => {
    const widths = ws.map(w => ctx.measureText(w).width), lw = widths.reduce((s, v) => s + v, 0) + space * (ws.length - 1);
    let cx = o.align === 'center' ? x - lw / 2 : o.align === 'right' ? x - lw : x;
    ws.forEach((w, wi) => {
      let tw;
      if (sw) { const n = norm(w); let found = -1; for (let j = ptr; j < sw.length; j++) if (norm(sw[j][0]) === n) { found = j; break; }
        if (found >= 0) { tw = sw[found][1]; ptr = found + 1; } else tw = tPrev + .08; }
      else tw = (o.t ?? 0) + k * (o.stagger ?? .06);
      if (o.at) tw = o.at; tPrev = tw; k++;
      const u = (T - tw + .06) / (o.dur || .38), ap = sm(u), rise = (1 - eo(u)) * (o.rise ?? 14);
      const isEm = em.has(norm(w)) || (o.emAll);
      if (ap > .003) { ctx.globalAlpha = a * ap; ctx.fillStyle = isEm ? rgba(o.emc || COL.sig, 1) : (o.color || rgba(COL.ink, 1));
        ctx.fillText(w, cx, y0 + li * lh + rise); }
      cx += widths[wi] + space;
    });
  });
  ctx.restore();
}
/* a plain label (fades as a whole) */
function label(str, x, y, o = {}) { const a = o.a ?? 1; if (a <= .003) return; ctx.save();
  ctx.font = `${o.weight || 400} ${o.size || 24}px "${FONT[o.font || 'sans']}"`; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
  if (o.ls) ctx.letterSpacing = o.ls + 'px';
  ctx.globalAlpha = a; ctx.fillStyle = o.color || rgba(COL.ink, 1); ctx.fillText(str, x, y); ctx.restore(); }

/* ---------- camera ---------- */
function cam(c, fn) { ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(c.r || 0); ctx.scale(c.z, c.z); ctx.translate(-c.x, -c.y); fn(); ctx.restore(); }
const camMix = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), u)), r: lerp(a.r || 0, b.r || 0, u) });
/* a camera path: keys [[t, {x,y,z}], ...], eased between keys */
function camAt(keys, t) { if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [t0, a] = keys[i - 1], [t1, b] = keys[i]; return camMix(a, b, eio((t - t0) / (t1 - t0))); }
  return keys[keys.length - 1][1]; }

/* ---------- small marks ---------- */
function dot(x, y, r, c = COL.sig, a = 1, glow = 0) { if (a <= .003) return; ctx.save();
  if (glow) { const g = ctx.createRadialGradient(x, y, 0, x, y, r * glow); g.addColorStop(0, rgba(c, a * .45)); g.addColorStop(1, rgba(c, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * glow, 0, 7); ctx.fill(); }
  ctx.fillStyle = rgba(c, a); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore(); }
function ring(x, y, r, c = COL.sig, a = 1, w = 1.5) { if (a <= .003 || r <= 0) return; ctx.save(); ctx.strokeStyle = rgba(c, a); ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); ctx.restore(); }
function arrowHead(x, y, ang, s, c, a) { if (a <= .003) return; ctx.save(); ctx.strokeStyle = rgba(c, a); ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - Math.cos(ang - .45) * s, y - Math.sin(ang - .45) * s); ctx.lineTo(x, y); ctx.lineTo(x - Math.cos(ang + .45) * s, y - Math.sin(ang + .45) * s); ctx.stroke(); ctx.restore(); }

/* ---------- the vessel, from the inside (the deck's tunnel, projected in 2D) ---------- */
const TUN = (() => {
  const LENGTH = 62, ctrl = [];
  for (let c0 = 0; c0 <= 9; c0++) ctrl.push([Math.sin(c0 * .78) * .95 + Math.sin(c0 * 1.9) * .26, Math.cos(c0 * .62) * .7 + Math.sin(c0 * 1.4) * .2, -(c0 / 9) * LENGTH]);
  function curve(u) { const n = ctrl.length - 1, f = cl(u) * n, i = Math.min(n - 1, Math.floor(f)), t = f - i;
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(n, i + 2)]; const t2 = t * t, t3 = t2 * t;
    return [0, 1, 2].map(j => .5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)); }
  const N = 1400, RP = 96, pos = [], tan = [], nrm = [], bin = [], rad = [];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], nz = a => { const l = Math.hypot(...a) || 1; return a.map(v => v / l); };
  let up = [0, 1, 0];
  for (let i = 0; i < N; i++) { const u = i / (N - 1), p = curve(u), q = curve(Math.min(1, u + .001)), pr = curve(Math.max(0, u - .001));
    const tg = nz(sub(q, pr)); let b = nz(crs(tg, up)); let nn = nz(crs(b, tg)); up = nn;
    pos.push(p); tan.push(tg); nrm.push(nn); bin.push(b);
    const taper = 1 - .44 * u, wob = 1 + .10 * Math.sin(u * 47) + .06 * Math.sin(u * 19); rad.push(1.05 * taper * wob); }
  const r = rnd(7), P = new Float32Array(N * RP * 3), J = new Float32Array(N * RP);
  for (let i = 0; i < N; i++) for (let j = 0; j < RP; j++) { const a = j / RP * Math.PI * 2 + (i % 2) * Math.PI / RP;
    const bump = 1 + .055 * Math.sin(a * 3 + i / N * 30) + .035 * Math.sin(a * 7 - i / N * 18), rr = rad[i] * bump * (.97 + r() * .06);
    const k = (i * RP + j) * 3; for (let d = 0; d < 3; d++) P[k + d] = pos[i][d] + (nrm[i][d] * Math.cos(a) + bin[i][d] * Math.sin(a)) * rr; J[i * RP + j] = r(); }
  /* draw from camera parameter u (0..~.8); o: {a, bright(depth)->0..1, warm, f, cx, cy, span} */
  function draw(u, o = {}) {
    const a0 = o.a ?? 1; if (a0 <= .003) return;
    const ic = Math.floor(cl(u) * (N - 1)), c = pos[ic], tg = tan[ic], nn = nrm[ic], bb = bin[ic];
    const f = o.f || 760, cx = o.cx ?? W / 2, cy = o.cy ?? H / 2, span = o.span || 300, roll = o.roll || 0;
    const cr = Math.cos(roll), sr = Math.sin(roll);
    ctx.save();
    for (let i = Math.min(N - 1, ic + span); i > ic; i--) {
      const depthK = (i - ic) / span;
      let ringA = a0 * (o.bright ? o.bright(depthK, i) : 1) * (1 - Math.pow(depthK, 2.4));
      if (ringA <= .004) continue;
      for (let j = 0; j < RP; j++) { const k = (i * RP + j) * 3; const d = [P[k] - c[0], P[k + 1] - c[1], P[k + 2] - c[2]];
        const zc = dot3(d, tg); if (zc < .05) continue; let xc = dot3(d, bb), yc = dot3(d, nn); const xr = xc * cr - yc * sr, yr = xc * sr + yc * cr;
        const bob = o.t != null ? Math.sin(o.t * .9 + J[i * RP + j] * 31) * 1.8 : 0; const sx = cx + f * xr / zc, sy = cy - f * yr / zc + bob; if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
        const s = cl(5.2 / zc, 1.2, 5.5), jj = J[i * RP + j];
        const near = cl(1 - zc / 6); const warm = o.warm ?? 1;
        ctx.fillStyle = jj < .18 ? rgba(COL.ink2, ringA * .9 * near + ringA * .25) : rgba(warm > .5 ? COL.sig : COL.ink2, ringA * (.6 + .4 * jj));
        ctx.fillRect(sx - s / 2, sy - s / 2, s, s); }
    }
    ctx.restore();
  }
  /* project a world point as seen from camera parameter u (same camera as draw) */
  function proj(u, q, roll = 0, f = 760) { const ic = Math.floor(cl(u) * (N - 1)), c = pos[ic], tg = tan[ic], nn = nrm[ic], bb = bin[ic];
    const d = [q[0] - c[0], q[1] - c[1], q[2] - c[2]], zc = dot3(d, tg); if (zc < .05) return null; const xc = dot3(d, bb), yc = dot3(d, nn);
    const xr = xc * Math.cos(roll) - yc * Math.sin(roll), yr = xc * Math.sin(roll) + yc * Math.cos(roll); return [W / 2 + f * xr / zc, H / 2 - f * yr / zc, zc]; }
  return { draw, proj, N, pos, tan, nrm, bin, rad };
})();
