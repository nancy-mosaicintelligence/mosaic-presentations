/* The v2 deck, station by station: every element belongs to a station and appears when that station is reached
   (one thing per press); stepping back takes it away. An ambient clock keeps everything alive between presses.
   Draws on the film's engine (lib.js) and drawings (scenes.js prep). */
'use strict';
let ST = 2, TA = 0, ENT = {}, CAMF = { x: 0, y: 0, z: 1 }, CAMT0 = 0, BGF = 0, BGT0 = 0;
const age = k => (ST >= k && ENT[k] != null) ? TA - ENT[k] : -1;
const ap = (k, d = .8, delay = 0) => { const a = age(k); return a < 0 ? 0 : sm((a - delay) / d); };
const ape = (k, d = .8, delay = 0) => { const a = age(k); return a < 0 ? 0 : eo((a - delay) / d); };
const vis = (k0, k1, d = .7, d1 = .45) => ap(k0, d) * (1 - ap(k1, d1));
const WHITE = st => st >= 24 && st <= 42 ? 1 : 0;
let camNow = { x: 0, y: 0, z: 1 }, bgNow = 0;

/* moving to station `st` (called by the host on every change) */
function goStation(st, now) {
  TA = now;
  if (st === ST) return;
  if (st > ST) { for (let k = ST + 1; k < st; k++) ENT[k] = now - 100; ENT[st] = now; }
  else { for (const k in ENT) if (+k > st) delete ENT[k]; ENT[st] = now - 100; }
  CAMF = camNow; CAMT0 = now; BGF = bgNow; BGT0 = now; ST = st;
}

/* ---------- text: *emphasis*, wrapped to a width ---------- */
function para(str, x, y, o = {}) {
  const a = o.a ?? 1; if (a <= .003) return 0;
  const size = o.size || 44, font = FONT[o.font || 'serif'], weight = o.weight || ((o.font || 'serif') === 'serif' ? 300 : 400), lh = o.lh || size * 1.22;
  ctx.save(); ctx.font = `${weight} ${size}px "${font}"`; if (o.ls) ctx.letterSpacing = o.ls + 'px';
  const toks = []; let em = false;
  for (const raw of str.split(/\s+/)) { let w = raw; let s0 = em; if (w.startsWith('*')) { s0 = true; em = true; w = w.slice(1); }
    let close = false; if (w.endsWith('*')) { close = true; w = w.slice(0, -1); } else if (/\*[.,:;!?]$/.test(w)) { close = true; w = w.replace('*', ''); }
    toks.push({ w, em: s0 || em, punct: false }); if (close) em = false; }
  const space = ctx.measureText(' ').width, maxW = o.maxW || 1e9, lines = [[]]; let lw = 0;
  for (const t of toks) { const tw = ctx.measureText(t.w).width; if (lines[lines.length - 1].length && lw + space + tw > maxW) { lines.push([]); lw = 0; }
    lines[lines.length - 1].push({ ...t, tw }); lw += (lw ? space : 0) + tw; }
  lines.forEach((ln, i) => { const W0 = ln.reduce((s, t) => s + t.tw, 0) + space * (ln.length - 1);
    let cx = o.align === 'center' ? x - W0 / 2 : o.align === 'right' ? x - W0 : x;
    for (const t of ln) { ctx.globalAlpha = a; ctx.fillStyle = t.em ? rgba(o.emc || COL.sig, 1) : (o.color || rgba(COL.ink, 1)); ctx.fillText(t.w, cx, y + i * lh); cx += t.tw + space; } });
  ctx.restore(); return lines.length * lh;
}
function scrim(x, y, w, h, a) { if (a <= .003) return; ctx.save(); const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, `rgba(4,1,2,${.78 * a})`); g.addColorStop(.75, `rgba(4,1,2,${.62 * a})`); g.addColorStop(1, 'rgba(4,1,2,0)');
  ctx.fillStyle = g; ctx.filter = 'blur(18px)'; ctx.fillRect(x - 40, y - 30, w + 40, h + 60); ctx.restore(); }
function scrimC(cx, cy, rx, ry, a) { if (a <= .003) return; ctx.save(); ctx.translate(cx, cy); ctx.scale(rx, ry); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(4,1,2,${.85 * a})`); g.addColorStop(.6, `rgba(4,1,2,${.6 * a})`); g.addColorStop(1, 'rgba(4,1,2,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, 7); ctx.fill(); ctx.restore(); }
const DK = rgba(COL.dark, 1), DK2 = rgba(COL.dark2, 1), INK2 = rgba(COL.ink2, 1), INK3 = rgba(COL.ink3, 1), SIG = rgba(COL.sig, 1);

/* ---------- the vessel from inside, with its rings outlined and the wire in it ---------- */
function tunnel(a, o = {}) {
  if (a <= .003) return;
  const u = .09 + (o.u || 0) + .045 * Math.sin(TA * .021), roll = TA * .035 % (Math.PI * 2) + (o.roll || 0);
  TUN.draw(u, { a, span: 300, roll, bright: o.bright || (() => 1) });
  /* the deck's linings: every so often a ring is drawn as a wavering line */
  if (o.lines !== false) ringLines(u, roll, a * (o.linesA ?? .55));
  if (o.wire) { const s = Math.sin(TA * .7) * 14, s2 = Math.cos(TA * .53) * 10; ctx.save(); ctx.strokeStyle = rgba(COL.sig, a * o.wire); ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(W / 2 + 140, H + 20); ctx.bezierCurveTo(W / 2 + 120 + s, H * .78, W / 2 + 30 + s2, H * .62, W / 2 + 8 + s * .3, H / 2 + 26); ctx.stroke(); ctx.restore();
    dot(W / 2 + 8 + s * .3, H / 2 + 26, 4, COL.sig2, a * o.wire, 6); }
}
function ringLines(u, roll, a) {
  const N = TUN.N, ic = Math.floor(cl(u) * (N - 1)); const pos = TUN.pos;
  const c = pos[ic], tg = sub3(pos[Math.min(N - 1, ic + 2)], pos[Math.max(0, ic - 2)]), tl = Math.hypot(...tg); const T3 = tg.map(v => v / tl);
  let up = [0, 1, 0]; const b = nz3(cr3(T3, up)), n = nz3(cr3(b, T3)); const cr = Math.cos(roll), sr = Math.sin(roll);
  ctx.save(); ctx.lineWidth = 1.1; ctx.lineJoin = 'round';
  for (let i = ic + 30 - (ic % 30); i < Math.min(N - 1, ic + 300); i += 30) {
    const dep = (i - ic) / 300, al = a * (1 - dep) * .9; if (al < .01) continue;
    const P = pos[i], tgi = sub3(pos[Math.min(N - 1, i + 2)], pos[Math.max(0, i - 2)]), Ti = nz3(tgi), bi = nz3(cr3(Ti, [0, 1, 0])), ni = nz3(cr3(bi, Ti));
    const rad = 1.05 * (1 - .44 * i / N) * (1 + .1 * Math.sin(i / N * 47));
    ctx.beginPath(); let first = true;
    for (let j = 0; j <= 48; j++) { const an = j / 48 * Math.PI * 2, wob = 1 + .07 * Math.sin(an * 5 + i * .3) + .04 * Math.sin(an * 11 - TA * .6 + i);
      const q = [0, 1, 2].map(d => P[d] + (ni[d] * Math.cos(an) + bi[d] * Math.sin(an)) * rad * wob * 1.08);
      const d = sub3(q, c), zc = dot3(d, T3); if (zc < .05) { first = true; continue; }
      const xc = dot3(d, b), yc = dot3(d, n), xr = xc * cr - yc * sr, yr = xc * sr + yc * cr, sx = W / 2 + 760 * xr / zc, sy = H / 2 - 760 * yr / zc;
      if (first) { ctx.moveTo(sx, sy); first = false; } else ctx.lineTo(sx, sy); }
    ctx.strokeStyle = rgba(COL.ink2, al * .55); ctx.stroke(); }
  ctx.restore();
}
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cr3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], nz3 = a => { const l = Math.hypot(...a) || 1; return a.map(v => v / l); };

/* ======================= ACT A — the road (3–7, and again at 52) ======================= */
const STOPS2 = [.20, .47, .735];
const ROAD_U = { 3: 0, 4: STOPS2[0], 5: STOPS2[1], 6: STOPS2[2], 7: 1 };
const CAPS = { 4: ['open', 'From opening the body', 'In open surgery, the surgeon can see the organ. They can touch it. They can feel how the tissue responds.'],
  5: ['ports', 'To small incisions', 'In laparoscopy, we give up touch, but we preserve vision through a camera.'],
  6: ['wire', 'To navigating through the body’s own vascular highways', 'In endovascular surgery, a surgical instrument is navigated deep inside the body.'] };
function roadAct() {
  if (ST < 3 || ST > 7) return;
  const A = ST < 7 ? ap(3, 1.0) : 1 - ap(7, .5, 1.0); if (A <= .003) return;
  const prev = ROAD_U[Math.max(3, ST - 1)] ?? 0, tgt = ROAD_U[Math.min(7, ST)] ?? 1, u = lerp(prev, tgt, eio(age(ST) / (ST === 7 ? 1.4 : 2.2)));
  const h = plAt(WORLD.roadC[0], u);
  const zoom = ST === 7 ? ei(ramp(age(7), .5, 1.5)) : 0;
  const c = { x: lerp(960, h[0], zoom), y: lerp(540, h[1], zoom), z: lerp(1, 8, zoom) };
  cam(c, () => {
    const dr = ape(3, 1.6);
    draw(WORLD.roadE1, dr, { c: COL.ink2, a: .55 * A, w: 1.6 }); draw(WORLD.roadE2, dr, { c: COL.ink2, a: .55 * A, w: 1.6 });
    ctx.save(); ctx.setLineDash([14, 16]); ctx.lineDashOffset = -TA * 18; ctx.beginPath(); tracePL(WORLD.roadC[0], 0, 1); ctx.strokeStyle = rgba(COL.ink3, .5 * A * ap(3, 1, 1)); ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();
    draw(WORLD.roadC, u, { c: COL.sig, a: A, w: 3.2 });
    STOPS2.forEach((su, k) => { if (u < su - .001) return; const p = plAt(WORLD.roadC[0], su); ring(p[0], p[1], 16, COL.sig, A * .9, 1.4); });
    const pul = 1 + .25 * Math.sin(TA * 3); dot(h[0], h[1], 8, COL.sig, A, 5 * pul);
  });
  /* the lede, and the stop's caption below the road */
  para('Modern surgery has spent the last 150 years becoming less invasive, to reduce the physical cost of accessing anatomy. *We went:*', 120, 160, { size: 38, maxW: 1150, a: A * ap(3, .8, .4) * (1 - zoom) });
  const yr = Math.round(lerp(1870, 2026, cl(u / .98)));
  label('YEAR', 1800, 168, { font: 'mono', size: 16, align: 'right', ls: 3, color: INK3, a: A * ap(3, .6, .8) * (1 - zoom) });
  label(String(yr), 1800, 212, { font: 'mono', size: 34, align: 'right', color: INK2, a: A * ap(3, .6, .8) * (1 - zoom) });
  for (const k of [4, 5, 6]) { const ca = A * vis(k, k + 1, .7, .4) * (1 - zoom); if (ca <= .003) continue; const [ic, t1, t2] = CAPS[k];
    ctx.save(); ctx.translate(130, 785); ctx.scale(.86, .86); for (const it of WORLD.icons[['open', 'ports', 'wire'].indexOf(ic)]) draw(it.sh, ape(k, 1.2, .2), { c: it.col, a: ca * it.a, w: 1.8 }); ctx.restore();
    para(t1, 360, 850, { size: 44, color: SIG, a: ca }); para(t2, 360, 905, { font: 'sans', size: 26, maxW: 1200, color: INK2, a: ca }); }
}

/* ======================= ACT B — the room and the body (7–20) ======================= */
const BCAM = { 7: { x: 0, y: 30, z: .92 }, 8: { x: -300, y: 10, z: 1.06 }, 9: { x: -300, y: 10, z: 1.06 }, 10: { x: 560, y: 10, z: 1.06 }, 11: { x: 560, y: 10, z: 1.06 }, 12: { x: 560, y: 10, z: 1.06 },
  13: { x: 560, y: 10, z: 1.06 }, 14: { x: 560, y: 10, z: 1.06 }, 15: { x: 560, y: 10, z: 1.06 }, 16: { x: 0, y: 10, z: 1 }, 17: { x: 0, y: 10, z: 1 }, 18: { x: 0, y: 10, z: 1 }, 19: { x: 0, y: 30, z: .97 } };
function bodyCam() {
  const A = WORLD.ACC;
  if (ST === 7) return camMix({ x: A[0], y: A[1], z: 8 }, BCAM[7], eio(ramp(age(7), 1.2, 3.6)));
  if (ST === 20) return camMix(CAMF, { x: A[0] + 60, y: A[1] + 10, z: 3.0 }, eio(age(20) / 1.6));
  if (ST === 21) { const base = { x: A[0] + 60, y: A[1] + 10, z: 3.0 }; const k = ei(ramp(age(21), 0, 1.3)); return { x: lerp(base.x, A[0], k), y: lerp(base.y, A[1], k), z: base.z * Math.exp(k * 3.6) }; }
  return camMix(CAMF, BCAM[ST] || BCAM[19], eio(age(ST) / 1.3));
}
function bodyAct() {
  if (ST < 7 || ST > 21) return;
  const A = WORLD.ACC, aIn = ST === 7 ? ap(7, .4, 1.1) : 1, aOut = ST === 21 ? 1 - ap(21, .5, .9) : 1, a = aIn * aOut; if (a <= .003) return;
  const c = bodyCam(); camNow = c;
  const room = ST === 7 ? 1 : 1 - ap(8, .8);
  cam(c, () => {
    if (room > .003) { drawStrokes(WORLD.room, ramp(age(7), 1.2, 3.6) * .33, COL.room, a * room * .9, 1.3); drawStrokes(WORLD.rig, ramp(age(7), 1.3, 3.8) * .33, COL.room, a * room, 1.4); }
    drawStrokes(WORLD.fig, ST === 7 ? ramp(age(7), 1.3, 4.6) : 1, COL.ink, a * .95, 1.3);
    /* the arterial tree lights up, and traffic flows on it from then on */
    const tree = ST >= 9 ? ape(9, 2.2) : 0;
    for (const b of WORLD.br) { const u = ramp(tree, b.t0, b.t1); if (u > 0) draw(b.sh, u, { c: COL.warm, a: .9 * a, w: 2.2 }); }
    if (ST >= 9) { const tr = a * ap(9, 1, 1.4) * (ST >= 16 && ST <= 18 ? .5 : 1);
      WORLD.br.forEach((b, i) => { for (let k = 0; k < 3; k++) { const u = (TA * .09 + k / 3 + i * .13) % 1; const p = plAt(b.sh[0], u); dot(p[0], p[1], 3, COL.sig, tr * sm(u * 6) * sm((1 - u) * 6) * .9, 3); } }); }
    /* the whole route, groin to heart, once it is named */
    if (ST >= 19) { const rp = ST === 19 ? eio(age(19) / 2.2) : 1; draw(WORLD.route, rp, { c: COL.sig, a, w: 3.4, glow: 10 });
      const run = (TA * .35) % 1; const h = shapeHead(WORLD.route, 1 - run); dot(h[0], h[1], 6, COL.sig2, a * sm(run * 6) * sm((1 - run) * 6), 7); }
    reachLayer2(a);
    accessLayer(a);
  });
  /* room annotations */
  if (ST === 7) { const la = ap(7, .6, 3.4) * (1 - 0);
    [['Procedure table', -.452, .936, 'l'], ['C‑arm · AP projection', -.800, .190, 'l'], ['Monitor bank', .972, .830, 'r']].forEach(([s, x, y, al]) => {
      const sx = W / 2 + (x * 440 - c.x) * c.z, sy = H / 2 + (-y * 440 - c.y) * c.z; label(s, sx + (al === 'l' ? -8 : 8), sy + 6, { font: 'mono', size: 18, align: al === 'l' ? 'right' : 'left', color: rgba(COL.room, 1), a: la * a }); }); }
  /* words, each in its own clear column */
  para('The *vascular system* can be used as a transportation network through the human body.', 120, 450, { size: 50, maxW: 620, a: a * vis(8, 10) });
  implications(a);
  para('It is one of the greatest *substitution* stories in medicine.', 1010, 470, { size: 62, maxW: 780, a: a * vis(15, 16) });
  para('So far, we used these pathways primarily to treat *cardiovascular disease*:', 100, 880, { size: 32, maxW: 560, a: a * vis(16, 19) });
  para('But increasingly, physicians are using the *vascular system* as a route to disease itself. Entirely *new categories of targeted treatment* become possible:', 1330, 150, { font: 'sans', size: 24, maxW: 520, color: INK2, a: a * vis(17, 19) });
  therapies(a * vis(18, 19));
  para('We have discovered a way to reach deep inside the human body *without opening it.*', 1180, 760, { size: 46, maxW: 640, a: a * vis(19, 20) });
  if (ST === 20) label('Access · right CFA', W / 2 + 330, H / 2 + 250, { font: 'mono', size: 22, color: SIG, a: a * ap(20, .6, 1.2) });
}
/* enormous implications: a drawing per point, and a bar per point that shrinks when it is named */
function implications(a0) {
  const a = a0 * vis(10, 15); if (a <= .003) return;
  para('Enormous implications:', 1000, 200, { size: 54, a });
  const P = { 11: 'A needle-sized access point can replace large incisions.', 12: 'Recovery gets shorter. Physiological trauma decreases.', 13: 'Patients leave the hospital sooner.', 14: 'Costs go down.' };
  for (const k of [11, 12, 13, 14]) para(P[k], 1000, 268, { size: 32, maxW: 820, color: SIG, a: a * vis(k, k + 1, .6, .35) });
  const L = 1150, R = 1600, top = 390;
  const hasPt = [11, 12, 13, 14].some(k => ST >= k);
  if (hasPt) { label('OPEN SURGERY', L, top, { font: 'mono', size: 18, ls: 2, align: 'center', color: INK3, a: a * ap(11, .5) }); label('ENDOVASCULAR', R, top, { font: 'mono', size: 18, ls: 2, align: 'center', color: SIG, a: a * ap(11, .5) }); }
  /* 11 — access: a long incision against a needle */
  { const v = a * vis(11, 12, .6, .35); if (v > .003) { const torso = (x) => xform(hpoly(TORSO.map(p => [p[0] - 65, p[1] - 54]), 311, 1, true), (px, py) => [x + px * 2.1, 530 + py * 2.1]);
      draw(torso(L), ape(11, .8), { c: COL.ink2, a: v, w: 1.5 }); draw(torso(R), ape(11, .8), { c: COL.ink2, a: v, w: 1.5 });
      const ik = ape(11, .7, .6); ctx.save(); ctx.strokeStyle = rgba(COL.ink2, v); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L, 455); ctx.lineTo(L, 455 + 150 * ik); ctx.stroke();
      ctx.lineWidth = 1.4; for (let i = 0; i < 6; i++) { if (i / 6 > ik) break; const y = 465 + i * 25; ctx.beginPath(); ctx.moveTo(L - 11, y); ctx.lineTo(L + 11, y + 5); ctx.stroke(); } ctx.restore();
      const nk = ape(11, .8, 1.0); ctx.save(); ctx.strokeStyle = rgba(COL.ink, v); ctx.lineWidth = 1.3; const tx = R + 24, ty = 560, sx = lerp(tx + 120, tx, nk), sy = lerp(ty + 90, ty, nk);
      ctx.beginPath(); ctx.moveTo(sx + 90, sy + 68); ctx.lineTo(sx, sy); ctx.moveTo(sx + 92, sy + 64); ctx.lineTo(sx + 3, sy - 3); ctx.stroke(); ctx.restore();
      if (nk > .95) dot(tx, ty, 4 + Math.sin(TA * 3), COL.sig, v, 4); } }
  /* 12 — recovery: weeks against days */
  { const v = a * vis(12, 13, .6, .35); if (v > .003) { const k = ape(12, 1.6, .2);
      for (let i = 0; i < 28; i++) { const x = L - 105 + (i % 7) * 30, y = 450 + Math.floor(i / 7) * 30, f = cl(k * 28 - i); ctx.save(); ctx.globalAlpha = v;
        ctx.strokeStyle = INK3; ctx.lineWidth = 1; ctx.strokeRect(x, y, 22, 22); if (f > 0) { ctx.fillStyle = rgba(COL.ink3, .75 * f); ctx.fillRect(x + 2, y + 2, 18, 18); } ctx.restore(); }
      for (let i = 0; i < 3; i++) { const x = R - 45 + i * 30, y = 450, f = cl(k * 3 * 3 - i); ctx.save(); ctx.globalAlpha = v; ctx.strokeStyle = SIG; ctx.lineWidth = 1; ctx.strokeRect(x, y, 22, 22); if (f > 0) { ctx.fillStyle = rgba(COL.sig, .9 * f); ctx.fillRect(x + 2, y + 2, 18, 18); } ctx.restore(); }
      label('weeks', L, 600, { font: 'mono', size: 20, align: 'center', color: INK3, a: v * ap(12, .5, 1.2) }); label('days', R, 600, { font: 'mono', size: 20, align: 'center', color: SIG, a: v * ap(12, .5, 1.2) }); } }
  /* 13 — the stay: a bed and its nights */
  { const v = a * vis(13, 14, .6, .35); if (v > .003) { const bed = x => join(hbox(x - 80, 520, 160, 34, 401, .8), hline(x - 80, 520, x - 80, 590, 403, 0, .5), hline(x + 80, 554, x + 80, 590, 405, 0, .5), hbox(x - 74, 500, 40, 20, 407, .6));
      draw(bed(L), ape(13, .7), { c: COL.ink2, a: v, w: 1.5 }); draw(bed(R), ape(13, .7), { c: COL.ink2, a: v, w: 1.5 });
      const moon = (x, y, c, al) => { ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(x + 5, y - 3, 10, 0, 7); ctx.fill(); ctx.restore(); };
      for (let i = 0; i < 6; i++) moon(L - 80 + i * 32, 455, INK3, v * ape(13, .3, .6 + i * .18));
      moon(R, 455, SIG, v * ape(13, .3, .6));
      label('nights in hospital', (L + R) / 2, 640, { font: 'mono', size: 18, align: 'center', color: INK3, a: v * ap(13, .5, 1.4) }); } }
  /* 14 — cost: a stack against a coin or two */
  { const v = a * vis(14, 15, .6, .35); if (v > .003) { const coin = (x, y, c, al) => { ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, 46, 12, 0, 0, 7); ctx.stroke(); ctx.restore(); };
      for (let i = 0; i < 11; i++) coin(L, 600 - i * 14, INK3, v * ape(14, .25, .2 + i * .09)); for (let i = 0; i < 3; i++) coin(R, 600 - i * 14, SIG, v * ape(14, .25, .2 + i * .09)); } }
  /* the bars: each appears with its point and shrinks to its endovascular height */
  const bars = [['Access', 11, .18], ['Recovery', 12, .3], ['Hospital stay', 13, .22], ['Cost', 14, .4]], base = 900, x0 = 1150, dx = 150, Hh = 150;
  if (hasPt) draw(hline(x0 - 80, base, x0 + 3 * dx + 80, base, 81, 0, 1), ape(11, .8), { c: COL.ink2, a: a * .8, w: 1.5 });
  bars.forEach(([lab, k, ratio], i) => { const up = ape(k, .5), dn = eio(ramp(age(k), .5, 1.4)), h = Hh * up * lerp(1, ratio, ST > k ? 1 : dn); if (up <= 0) return; const x = x0 + i * dx;
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = (ST > k || dn > .02) ? rgba(COL.sig, .9) : rgba(COL.ink3, .55); ctx.fillRect(x - 30, base - h, 60, h);
    ctx.setLineDash([5, 6]); ctx.strokeStyle = rgba(COL.ink3, .8); ctx.lineWidth = 1.2; ctx.strokeRect(x - 30, base - Hh * up, 60, Hh * up - h); ctx.restore();
    label(lab, x, base + 36, { align: 'center', size: 22, color: rgba(ST === k ? COL.sig : COL.ink2, 1), a: a * up }); });
}
/* reach: the old uses on the left, the new ones on the right, therapies travelling to them */
function reachLayer2(a0) {
  const a = a0 * vis(16, 19, .6, .6); if (a <= .003) return; const O = WORLD.org;
  const prostate = { c: [0, .095 * 440], sh: hoval(0, .095 * 440, 9, 7, 49) };
  const L = [['blocked coronary arteries', O.heart, 16, 0, -1], ['stopping strokes', O.brain, 16, .25, -1], ['repairing aneurysms', { c: [0, -.30 * 440] }, 16, .5, -1], ['blood flow to a limb', O.leg, 16, .75, -1],
    ['liver · tumors', O.liver, 17, .2, 1], ['lungs', O.lungR, 18, 0, 1], ['uterus · fibroids', O.uterus, 18, .25, 1], ['prostate', prostate, 18, .5, 1, 34]];
  L.forEach(([txt, o, k, dl, side, dy]) => { const pr = ape(k, .7, dl); if (pr <= 0) return;
    const [ox, oy] = o.c, lx = side < 0 ? -460 : 430, ly = oy + (dy || 0), orange = side > 0;
    if (o.sh) draw(o.sh, pr, { c: orange ? COL.sig : COL.ink2, a: a * .85, w: 1.6 });
    dot(ox, oy, 4.5 + (orange ? .8 * Math.sin(TA * 2.4 + ox) : 0), orange ? COL.sig : COL.ink, a * sm(pr * 3), orange ? 4 : 0);
    draw([PL([[ox + side * 12, oy], [lx - side * 14, ly]])], pr, { c: orange ? COL.sig : COL.ink2, a: a * .6, w: 1.1, ghost: false });
    label(txt, lx, ly + 9, { align: side < 0 ? 'right' : 'left', font: orange ? 'serif' : 'sans', size: orange ? 34 : 26, weight: orange ? 300 : 400, color: rgba(orange ? COL.sig : COL.ink2, 1), a: a * sm(pr * 1.5) }); });
  /* therapies on their way: slow, repeating trips from the access point */
  if (ST === 18) { const P = [['drugs', O.liver], ['radiation', O.lungR], ['energy', O.uterus], ['embolic', prostate]]; const A = WORLD.ACC, per = 7.5;
    P.forEach(([k, o], i) => { const ph = ((age(18) - 1.2 - i * 1.8) % per + per) % per; if (age(18) < 1.2 + i * 1.8) return;
      const u = eio(ph / 4.2), fade = a * Math.min(sm(ph / .4), 1 - ramp(ph, 5.2, 6.2));
      const path = [PL(cat([A, [A[0] - 20, A[1] - 60], [4, -40], [6, o.c[1] + 30], [o.c[0] * .6, o.c[1] + 4], o.c], false, 3))], h = shapeHead(path, u);
      draw(path, u, { c: COL.sig, a: fade * .45, w: 1.4, ghost: false });
      if (k !== 'embolic') { ctx.save(); ctx.translate(h[0], h[1] - 34); ctx.scale(.8, .8); draw(WORLD.pay[k], 1, { c: COL.sig, a: fade, w: 2.2, ghost: false }); ctx.restore(); }
      else for (const [dx, dy] of [[-6, 0], [0, -6], [6, 0], [0, 6]]) dot(h[0] + dx, h[1] - 30 + dy, 2.6, COL.sig, fade);
      label(k === 'embolic' ? 'embolic agents' : k, h[0], h[1] - 66, { align: 'center', font: 'mono', size: 18, color: SIG, a: fade });
      const kk = ramp(ph, 4.2, 5.4); if (kk > 0 && kk < 1) ring(o.c[0], o.c[1], 10 + 46 * eo(kk), COL.sig, (1 - kk) * a, 2.2); }); }
}
function therapies(a) {
  if (a <= .003) return; const x = 1290, y = 715;
  para('And instead of delivering only balloons and stents, they can deliver:', x, y, { font: 'sans', size: 22, maxW: 520, color: INK2, a });
  const chips = [['drugs', 'drugs'], ['radiation', 'radiation'], ['energy', 'energy'], [null, 'embolic agents'], [null, 'other therapies']];
  let cx = x, cy = y + 88; ctx.save(); ctx.font = '400 20px "DM Sans"';
  chips.forEach(([ic, t], i) => { const w = ctx.measureText(t).width + 58; if (cx + w > x + 540) { cx = x; cy += 50; } const k = a * ape(18, .4, .4 + i * .18);
    ctx.globalAlpha = k; ctx.strokeStyle = rgba(COL.ink2, .5); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.roundRect(cx, cy - 26, w, 38, 19); ctx.stroke();
    if (ic) { ctx.save(); ctx.translate(cx + 22, cy - 7); ctx.scale(.42, .42); draw(WORLD.pay[ic], 1, { c: COL.ink, a: k, w: 3, ghost: false }); ctx.restore(); }
    else { ctx.strokeStyle = rgba(COL.ink, k); ctx.beginPath(); ctx.arc(cx + 22, cy - 7, 7, 0, 7); ctx.stroke(); }
    ctx.globalAlpha = k; ctx.fillStyle = INK2; ctx.fillText(t, cx + 40, cy); cx += w + 12; });
  ctx.restore();
  para('*precisely where they are needed.*', x, cy + 62, { size: 38, a: a * ap(18, .6, 1.4) });
}
/* the access: a needle into the right common femoral, then the wire through it */
function accessLayer(a) {
  if (ST < 20) return; const A = WORLD.ACC, k = ST === 20 ? ape(20, 1.0, 1.0) : 1, w = ST === 20 ? ape(20, 1.0, 2.2) : 1, v = a * (ST === 21 ? 1 - ap(21, .4, .3) : 1);
  ring(A[0], A[1], 14 + 2 * Math.sin(TA * 2.5), COL.sig, v * ap(20, .5, .6), 1.6);
  const ang = -2.45, L = 160, tx = A[0] + 3, ty = A[1] + 2, sx = tx - Math.cos(ang) * L * lerp(1.6, 1, k), sy = ty - Math.sin(ang) * L * lerp(1.6, 1, k);
  const ex = sx + Math.cos(ang) * L, ey = sy + Math.sin(ang) * L, nx = -Math.sin(ang) * 1.6, ny = Math.cos(ang) * 1.6;
  if (k > 0) { ctx.save(); ctx.globalAlpha = v * Math.min(1, k * 3); ctx.strokeStyle = rgba(COL.ink, 1); ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(sx + nx, sy + ny); ctx.lineTo(ex + nx, ey + ny); ctx.lineTo(ex - nx * 1.2 + Math.cos(ang) * 4, ey - ny * 1.2 + Math.sin(ang) * 4); ctx.moveTo(sx - nx, sy - ny); ctx.lineTo(ex - nx, ey - ny); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(sx - Math.cos(ang) * 5, sy - Math.sin(ang) * 5, 4.5, 0, 7); ctx.stroke(); ctx.restore(); }
  if (w > 0) { const wire = [PL(cat([[ex, ey], [A[0] - 4, A[1] - 22], [.07 * 440, .075 * 440 * -1], [.044 * 440, .01 * 440], [0, -.04 * 440], [2, -.17 * 440]], false, 2))];
    draw(wire, w, { c: COL.sig, a: v, w: 1.6, ghost: false }); const h = shapeHead(wire, w); dot(h[0], h[1], 2.6, COL.sig2, v, 4); }
}

/* ======================= ACT C — inside the vessel (21–23) ======================= */
function vesselAct() {
  if (ST < 21 || ST > 23) return;
  const a = (ST === 21 ? ap(21, .8, 1.0) : 1) * (ST === 23 ? 1 - ap(23, .8, 1.6) * .85 : 1);
  const dim = ST >= 22 ? (ST === 22 ? ramp(age(22), .4, 3) : 1) : 0;
  tunnel(a, { wire: 1, bright: d => 1 - dim * .82 * cl(1.2 - (1 - d) * .4) });
  scrim(90, 600, 820, 380, Math.max(vis(21, 23), vis(22, 23)));
  para('Endovascular medicine is an extraordinary *access system*, but it came with an expensive tradeoff.', 120, 660, { size: 40, maxW: 760, a: ap(21, .6, 1.2) * (ST >= 22 ? .38 : 1) * (1 - ap(23, .4)) });
  para('As the incision disappeared, *direct human perception* disappeared with it.', 120, 820, { size: 52, maxW: 780, a: vis(22, 23) });
  operatorDiagram();
}
/* what the operator has to do: a metre away, millimetres wide, out of sight */
function operatorDiagram() {
  if (ST !== 23) return; const g = age(23), a = 1;
  para('What does the operator actually have to do?', 960, 170, { size: 54, align: 'center', a: ap(23, .7) });
  const hx = 330, hy = 650;
  personDraw(250, 680, 470, COL.ink, ramp(g, 1.4, 2.4), a * .9, 1.6);
  const wa = ramp(g, 1.8, 2.5); ctx.save(); ctx.fillStyle = rgba('30,26,26', wa * .95); ctx.fillRect(1060, 400, 760, 520); ctx.restore();
  draw(hbox(1060, 400, 760, 520, 91, 1.4), wa, { c: COL.ink3, a: wa, w: 1.4 }); label('inside the body', 1080, 436, { font: 'mono', size: 18, color: INK3, a: wa });
  const cath = [PL(cat([[hx, hy], [520, 680], [760, 640], [980, 660], [1160, 640], [1380, 680], [1560, 640], [1640, 650]], false, 3))];
  const cp = eio(ramp(g, 2.2, 3.4)); draw(cath, cp, { c: COL.sig, a, w: 2.6 }); const tip = shapeHead(cath, cp); dot(tip[0], tip[1], 5, COL.sig, a, 5);
  const mk = eo(ramp(g, 3.4, 4.0)); if (mk > 0) { const y = 330; draw(join(hline(hx, y, lerp(hx, 1640, mk), y, 93, 0, .8), hline(hx, y - 14, hx, y + 14, 95, 0, .4), hline(1640, y - 14, 1640, y + 14, 97, 0, .4)), 1, { c: COL.ink2, a: mk, w: 1.4, ghost: false });
    label('≈ 1 metre', (hx + 1640) / 2, y - 22, { align: 'center', font: 'mono', size: 30, color: rgba(COL.ink, 1), a: mk }); }
  const mm = eo(ramp(g, 4.2, 4.8)); if (mm > 0) { const R = 100 * mm, my = 650; ctx.save(); ctx.beginPath(); ctx.arc(1640, my, R, 0, 7); ctx.fillStyle = rgba('40,14,14', .9); ctx.fill(); ctx.restore();
    draw(hoval(1640, my, R, R, 99, .04), 1, { c: COL.sig2, a: mm, w: 2 }); dot(1640, my, 6 + Math.sin(TA * 3), COL.sig, 1, 6); label('≈ 4 mm', 1640, my + R + 40, { align: 'center', font: 'mono', size: 28, color: rgba(COL.ink, 1), a: mm }); }
  const lk = ramp(g, 5.0, 6.0); if (lk > 0) { const ex = 286, ey = 435; draw(hpoly([[ex - 26, ey], [ex, ey - 13], [ex + 26, ey], [ex, ey + 13], [ex - 26, ey]], 101, .6, false), eo(lk * 2), { c: COL.ink, w: 1.6 }); dot(ex + 2, ey, 5, COL.ink, sm(lk * 2));
    const end = lerp(ex + 40, 1056, eo(lk)); ctx.save(); ctx.setLineDash([10, 10]); ctx.strokeStyle = rgba(COL.ink2, .9); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ex + 40, ey + 8); ctx.lineTo(end, ey + 8 + (end - ex) * .12); ctx.stroke(); ctx.restore();
    const xk = ramp(g, 5.8, 6.2); if (xk > 0) { const x = 1050, y = ey + 8 + (1050 - ex) * .12; draw(join(hline(x - 16, y - 16, x + 16, y + 16, 103, 0, .5), hline(x + 16, y - 16, x - 16, y + 16, 105, 0, .5)), xk, { c: COL.sig, w: 3 }); }
    label('no line of sight', 650, 1000, { align: 'center', font: 'serif', size: 40, weight: 300, color: SIG, a: ramp(g, 5.8, 6.4) }); }
}

/* ======================= ACT D — the white act (24–42) ======================= */
const IM = {};
function whiteAct() {
  if (ST < 24 || ST > 42) return;
  /* 24–29: what they see, and the drive */
  if (ST <= 29) {
    const slide = ST >= 26 ? (ST === 26 ? eio(age(26) / .9) : 1) : 0, fade = 1;
    const mw = lerp(720, 520, slide), mh = mw * .75, mx = lerp(960, 470, slide) - mw / 2, my = lerp(180, 230, slide), a = ap(24, .9, .5);
    ctx.save(); ctx.globalAlpha = a; ctx.beginPath(); ctx.rect(mx, my, mw, mh); ctx.clip();
    const fi = Math.floor(TA / .6) % 2, im = fi ? IMG.b : IMG.a;
    if (im) { const iw = im.naturalWidth, ih = im.naturalHeight, crop = fi ? [0, 40, iw, ih - 40] : [130, 200, iw - 130, 560];
      ctx.filter = `brightness(${.84 + .16 * Math.sin(TA * 23) * Math.sin(TA * 7.1)}) contrast(1.15)`; ctx.drawImage(im, crop[0], crop[1], crop[2], crop[3], mx, my, mw, mh); ctx.filter = 'none'; }
    grain(mx, my, mw, mh, 1600, Math.floor(TA * 24), '0,0,0', .16); grain(mx, my, mw, mh, 900, Math.floor(TA * 24) + 9, '255,255,255', .12); ctx.restore();
    draw(hbox(mx - 10, my - 10, mw + 20, mh + 20, 111, 1.2), ape(24, .9, .4), { c: COL.dark, a, w: 1.8 });
    label('This is what they see.', mx + mw / 2, my + mh + 70, { align: 'center', font: 'serif', weight: 300, size: lerp(52, 38, slide), color: DK, a: ap(25, .6) });
    if (ST >= 26) carView(); }
  /* 30: the expert */
  { const v = vis(30, 31); if (v > .003) { const px = 1350, py = 610, ph = 520;
      const g = ctx.createRadialGradient(px, py - 90, 0, px, py - 90, 330); g.addColorStop(0, rgba(COL.sig, .2 * v * (1 + .15 * Math.sin(TA * 1.6)))); g.addColorStop(1, rgba(COL.sig, 0)); ctx.fillStyle = g; ctx.fillRect(px - 400, py - 500, 800, 900);
      personDraw(px, py, ph, COL.dark, ape(30, 1.2, .2), v, 2); person(px, py, ph, COL.dark, v * ap(30, .5, 1.0), 2, 'surgeon');
      [[1590, .5], [1740, .42], [1860, .34]].forEach(([x, sz], i) => { const k = ap(30, .5, 2.2 + i * .25), f = ramp(age(30), 3.4 + i * .25, 4.4 + i * .25); if (k <= 0) return;
        ctx.save(); ctx.setLineDash([6, 7]); person(x, py + 40, ph * sz * 1.3, COL.dark, v * .5 * k * (1 - f) * (f > 0 ? .5 + .5 * Math.sin(TA * 40 + i) : 1), 1.3); ctx.restore(); });
      para('So what makes endovascular surgery possible today is extreme human expertise:', 120, 300, { font: 'sans', size: 28, maxW: 740, color: DK2, a: v });
      para('We have created extraordinary medicine that is *extraordinarily difficult to scale.*', 120, 420, { size: 58, maxW: 800, color: DK, a: v * ap(30, .7, .5) }); } }
  /* 31–33: one human at a time */
  { const v = vis(31, 34); if (v > .003) teamGrid(v); }
  /* 34: the question and the curve */
  { const v = vis(34, 35); if (v > .003) { para('So: What would it take to scale the knowledge of *the very best surgeons?*', 960, 230, { size: 52, maxW: 1100, align: 'center', color: DK, a: v });
      const gx = 700, gy = 900, gw = 520, gh = 420;
      draw(join(hline(gx, gy, gx + gw, gy, 121, 0, .8), hline(gx, gy, gx, gy - gh, 123, 0, .8)), ape(34, .7, .3), { c: COL.dark, a: v, w: 1.6 });
      label('people', gx + gw, gy + 34, { align: 'right', size: 22, color: DK2, a: v }); label('operations', gx - 14, gy - gh + 8, { align: 'right', size: 22, color: DK2, a: v });
      draw(hline(gx, gy, gx + gw * .92, gy - gh * .6, 125, 0, 1), ape(34, .8, .7), { c: COL.dark, a: v, w: 2.2 }); label('linear', gx + gw * .95, gy - gh * .6 + 6, { font: 'mono', size: 22, color: DK2, a: v * ap(34, .4, 1.4) });
      const cu = [PL(cat(Array.from({ length: 30 }, (_, i) => { const u = i / 29; return [gx + gw * .8 * u, gy - gh * (.5 * u + .55 * Math.pow(u, 3.2))]; }), false, 3))];
      draw(cu, ape(34, 1.2, 1.6), { c: COL.sig, a: v, w: 2.6, dash: [12, 10] }); label('?', gx + gw * .84, gy - gh * 1.02, { font: 'serif', size: 96, color: SIG, a: v * ap(34, .4, 2.8) }); } }
  /* 35–38: where am I, what's around me — nature and engineering */
  sensing();
  /* 39–40: the board */
  board();
  /* 41: perception first */
  para('But *perception* had to come first.', 960, 560, { size: 84, align: 'center', color: DK, a: vis(41, 42) });
  /* 42: the same path — autonomous vehicles and endovascular surgery, side by side */
  samePath();
}
function carView() {
  const ox = 820, oy = 200, s = 1.9, C = WORLD.car, ca = ap(26, .5, .4);
  const lightsOff = ap(27, .5), blind = ap(28, .5);
  ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
  ctx.save(); ctx.beginPath(); C.ws.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.clip();
  for (const L of C.scene) draw(L.sh, ape(26, 1.0, .5), { c: COL.dark, a: ca * L.op * (1 - .75 * lightsOff), w: 1.3 / s * 1.4, gh: .6 });
  for (const [x, y, w] of C.lights) { const la = ca * (1 - lightsOff) * ap(26, .5, 1.0) * (.92 + .08 * Math.sin(TA * 5 + x));
    ctx.fillStyle = rgba(COL.gold, .95 * la); ctx.beginPath(); ctx.roundRect(x - w / 2, y, w, 6, 3); ctx.fill();
    for (const [rx, ry, al] of [[1.15, 17, .22], [1.7, 26, .09]]) { ctx.fillStyle = rgba(COL.gold, al * la); ctx.beginPath(); ctx.ellipse(x, y + 3, w * rx, ry, 0, 0, 7); ctx.fill(); } }
  ctx.fillStyle = rgba('11,7,8', .82 * lightsOff * (1 - blind) * ca); ctx.fillRect(0, 0, 520, 170);
  ctx.fillStyle = rgba('234,232,231', blind * ca); ctx.fillRect(0, 0, 520, 170);
  if (ST >= 29) { const ph = (age(29) % 2.6), k = ramp(ph, .3, .8), fa = Math.sin(cl(k) * Math.PI) * ca;
    if (fa > .01) { for (const L of C.scene) draw(L.sh, 1, { c: COL.dark, a: fa * .5 * L.op, w: 1.2 / s * 1.4, ghost: false }); grain(40, 6, 470, 160, 2600, Math.floor(TA * 10), '11,7,8', .35 * fa); } }
  ctx.restore();
  for (const L of C.car) draw(L.sh, ape(26, .9, .3), { c: COL.dark, a: ca * L.op, w: L.w / s * 1.25, gh: .6 });
  ctx.restore();
  const cx = ox + 520 * s / 2;
  label('Imagine driving a car through a tunnel.', cx, 820, { align: 'center', font: 'serif', weight: 300, size: 36, color: DK, a: ca });
  label('Without lights.', cx, 868, { align: 'center', font: 'serif', weight: 300, size: 36, color: SIG, a: ap(27, .5) });
  label('Without windows.', cx, 916, { align: 'center', font: 'serif', weight: 300, size: 36, color: SIG, a: ap(28, .5) });
  label('With only intermittent views from grainy satellite images.', cx, 964, { align: 'center', font: 'serif', weight: 300, size: 32, color: DK2, a: ap(29, .5) });
}
function teamGrid(v) {
  const R = [['Operation', null], ['Surgeon', 'surgeon'], ['Resident', 'resident'], ['Scrub nurse', 'scrub'], ['Circulating nurse', 'circ'], ['Radiology tech', 'tech']];
  const two = ST >= 32 ? (ST === 32 ? ape(32, .8) : 1) : 0, many = ST >= 33 ? (ST === 33 ? eio(age(33) / 1.2) : 1) : 0;
  const h = lerp(lerp(180, 150, two), 84, many), y0 = lerp(lerp(560, 500, two), 430, many), dy = lerp(200, 100, many);
  const colX = i => 910 + i * 178, headY = y0 - h * .62 - 26;
  R.forEach(([lab, deco], i) => { const x = colX(i), k = ape(31, .5, .6 + i * .12); if (k <= 0) return; const pat = i === 0;
    label(lab, x, headY, { align: 'center', size: 21, color: rgba(pat ? COL.sig : COL.dark2, 1), a: v * k });
    for (let r = 0; r < 5; r++) { const vv = r === 0 ? 1 : r === 1 ? two : ramp(many, (r - 2) * .22, (r - 2) * .22 + .4); if (vv <= .01) continue;
      person(x, y0 + r * dy + Math.sin(TA * 1.3 + i + r) * 1.5, h, pat ? COL.sig : COL.dark, v * k * vv, pat ? 1.6 : 1.2, deco); } });
  label('×2', colX(0) - 95, y0 + dy + 14, { font: 'serif', size: 46, align: 'center', color: SIG, a: v * two * (1 - ramp(many, 0, .3)) });
  label('×5', colX(0) - 95, y0 + 2 * dy + 14, { font: 'serif', size: 46, align: 'center', color: SIG, a: v * many });
  /* the left column: one statement at a time */
  label('$100B', 120, 300, { font: 'serif', weight: 300, size: 140, color: SIG, a: v * vis(31, 33) });
  para('As a result, surgery may be the last $100B industry that still scales *one highly trained human at a time.*', 120, 390, { size: 38, maxW: 600, color: DK, a: v * vis(31, 33) * (ST >= 32 ? .45 : 1) });
  para('If you want to perform ×2 as many operations, you need at least ×2 as many surgeons, residents, and ×2 as many scrub nurses, circulating nurses, and radiology techs.', 120, 640, { font: 'sans', size: 25, maxW: 600, color: DK2, a: v * vis(32, 33) });
  para('Bound by a *linear labor-to-output relationship.*', 120, 470, { size: 62, maxW: 620, color: DK, a: v * ap(33, .7, .6) });
}
function icoRow(list, x, y, a, seedK) {
  list.forEach(([name, d], i) => { const k = ape(seedK, .5, .3 + i * .12); if (k <= 0) return; const cx = x + i * 125;
    if (!WORLD['ico' + name]) WORLD['ico' + name] = dShape(d, (px, py) => [px - 21, py - 21], .8);
    ctx.save(); ctx.translate(cx, y); ctx.scale(1.15, 1.15); draw(WORLD['ico' + name], k, { c: COL.dark, a, w: 1.4, ghost: false }); ctx.restore();
    const words = name.split(' '); words.forEach((w, j) => label(w, cx, y + 52 + j * 22, { align: 'center', size: 18, color: DK2, a: a * k })); });
}
function sensing() {
  if (ST < 35 || ST > 38) return; const A = ap(35, .6);
  const big = ST === 35 ? 1 : 1 - ape(36, .8);
  label('Where am I?  /  What’s around me?', 120, lerp(160, 330, big), { font: 'serif', weight: 300, size: lerp(46, 72, big), color: SIG, a: A });
  /* 35: a navigator */
  { const v = A * (1 - ap(36, .5)); if (v > .003) { const x = 960, y = 640; dot(x, y, 10, COL.sig, v, 4); for (let k = 0; k < 3; k++) { const kk = ((TA * .5 + k / 3) % 1); ring(x, y, 20 + 220 * kk, COL.sig, (1 - kk) * v * .7, 1.4); }
      const tr = [PL(cat([[260, 820], [500, 720], [760, 760], [960, 640]], false, 3))]; draw(tr, ape(35, 1.4), { c: COL.dark2, a: v * .5, w: 1.6, dash: [8, 10], ghost: false }); } }
  /* 36: the internal picture */
  para('Before you can choose where to go, you need an internal representation of the world. Humans tend to equate perception with *optical vision.*', 120, 240, { font: 'sans', size: 26, maxW: 780, color: DK2, a: ap(36, .6) });
  { const v = vis(36, 37); if (v > .003) { const ex = 1150, ey = 560; draw(hpoly([[ex - 40, ey], [ex, ey - 20], [ex + 40, ey], [ex, ey + 20], [ex - 40, ey]], 101, .6, false), ape(36, .6), { c: COL.dark, a: v, w: 1.8 }); dot(ex + 3, ey, 8, COL.dark, v);
      ctx.save(); ctx.fillStyle = rgba(COL.sig, .12 * v); ctx.beginPath(); ctx.moveTo(ex + 50, ey); ctx.arc(ex + 50, ey, 560 * ape(36, 1, .4), -.32 + .03 * Math.sin(TA), .32 + .03 * Math.sin(TA)); ctx.closePath(); ctx.fill(); ctx.restore(); } }
  /* 37: nature */
  { const v = ap(37, .6); if (v > .003) { para('*But nature doesn’t.*', 120, 400, { size: 40, a: v });
      icoRow(ICO.nature, 160, 470, v, 37);
      para('Evolution selects the sensory system that is useful for your environment.', 120, 600, { font: 'sans', size: 22, maxW: 700, color: DK2, a: v }); } }
  { const v = vis(37, 38); if (v > .003) batDemo(v, 1420, 560); }
  /* 38: engineering */
  { const v = ap(38, .6); if (v > .003) { para('*Engineering works the same way.*', 120, 700, { size: 40, a: v });
      icoRow(ICO.eng, 160, 770, v, 38);
      para('Engineering fuses these systems together, to answer exactly the same 2 questions.', 120, 900, { font: 'sans', size: 22, maxW: 700, color: DK2, a: v }); carDemo(v, 1380, 590); } }
}
function batDemo(v, bx, by) {
  ctx.save(); ctx.translate(bx - 360, by); ctx.scale(1.15, 1.15); draw(WORLD.bat, ape(37, .8, .2), { c: COL.dark, a: v, w: 1.6 }); ctx.restore();
  const ox = bx - 300, moth = [bx + 120, by - 60], wall = [bx + 330, by];
  for (let k = 0; k < 4; k++) { const kk = ((TA * .45 + k / 4) % 1); ctx.save(); ctx.strokeStyle = rgba(COL.sig, (1 - kk) * v); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ox, by, 20 + 700 * kk, -.5, .5); ctx.stroke(); ctx.restore(); }
  const mr = ap(37, .6, 1.2); draw(hoval(moth[0], moth[1], 26, 16, 131), mr, { c: COL.dark, a: v * .9, w: 1.8 });
  draw(hpoly([[wall[0], by - 260], [wall[0] + 20, by - 90], [wall[0] + 10, by + 80], [wall[0] + 26, by + 260]], 133, 2), ap(37, .8, 1.8), { c: COL.dark, a: v * .9, w: 1.8 });
  label('ultrasound', bx - 360, by + 150, { align: 'center', font: 'mono', size: 20, color: SIG, a: v });
}
function carDemo(v, cx, cy) {
  draw(join(hline(cx - 420, cy - 130, cx + 460, cy - 130, 151, 0, 1), hline(cx - 420, cy + 130, cx + 460, cy + 130, 153, 0, 1)), ape(38, .8), { c: COL.dark2, a: v * .35, w: 1.4 });
  const pk = { x: cx + 260, y: cy - 75 }, ped = { x: cx + 330, y: cy + 90 };
  const beam = TA * 2.4, pts = [];
  for (let i = 0; i < 18; i++) { const u = i / 17; pts.push([pk.x - 80 + 160 * u, pk.y - 38], [pk.x - 80 + 160 * u, pk.y + 38]); }
  for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2; pts.push([ped.x + Math.cos(an) * 14, ped.y + Math.sin(an) * 14]); }
  for (let i = 0; i < 30; i++) { pts.push([cx - 400 + i * 29, cy - 130], [cx - 400 + i * 29, cy + 130]); }
  const sx = cx - 200; pts.forEach(([x, y]) => { const an = (Math.atan2(y - cy, x - sx) + Math.PI * 8) % (Math.PI * 2), since = ((beam % (Math.PI * 2)) - an + Math.PI * 2) % (Math.PI * 2);
    dot(x, y, 2.4, COL.sig, v * ap(38, .5, 1.6) * (.25 + .75 * Math.max(0, 1 - since / 3))); });
  ctx.save(); ctx.translate(sx, cy); ctx.scale(.8, .8); draw(WORLD.carTop, ape(38, .7, .2), { c: COL.dark, a: v, w: 2.2 }); ctx.restore();
  ctx.save(); ctx.fillStyle = rgba(COL.sig, .1 * v * ap(38, .5, .8)); ctx.beginPath(); ctx.moveTo(sx + 76, cy); ctx.arc(sx + 76, cy, 420, -.3, .3); ctx.closePath(); ctx.fill(); ctx.restore();
  for (let k = 0; k < 4; k++) { const kk = ((TA * .8 + k / 4) % 1); ctx.save(); ctx.strokeStyle = rgba(COL.sig, (1 - kk) * v * .5 * ap(38, .5, 1.2)); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(sx + 76, cy, 30 + 300 * kk, -.55, .55); ctx.stroke(); ctx.restore(); }
  ctx.save(); ctx.strokeStyle = rgba(COL.sig, .45 * v * ap(38, .5, 1.6)); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sx, cy); ctx.lineTo(sx + Math.cos(beam) * 600, cy + Math.sin(beam) * 600); ctx.stroke(); ctx.restore();
  [['cameras', sx + 330, cy - 160], ['radar', sx + 120, cy + 175], ['lidar', sx - 110, cy - 160]].forEach(([t, x, y], i) => label(t, x, y, { font: 'mono', size: 20, color: SIG, a: v * ap(38, .5, .8 + i * .4) }));
}
function board() {
  if (ST < 39 || ST > 40) return; const a = ap(39, .7), x = 300, y = 200, w = 1320, h = 600;
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#1C1A19'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 18); ctx.fill(); ctx.restore();
  draw(hbox(x - 6, y - 6, w + 12, h + 12, 211, 1.6), ape(39, .9), { c: COL.dark, a, w: 2 });
  draw(hline(x - 120, y + h + 70, x + w + 120, y + h + 64, 213, 2, 1.2), ape(39, .9, .2), { c: COL.dark, a, w: 1.6 });
  label('LESSONS LEARNT FROM THE AUTONOMOUS VEHICLE INDUSTRY:', x + 50, y + 60, { font: 'mono', size: 18, ls: 2, color: INK3, a: a * ap(39, .5, .5) });
  para('Perception creates a *machine-readable representation* of the environment.', x + 50, y + 130, { font: 'chalk', weight: 400, size: 38, maxW: 760, color: rgba(COL.ink, .95), a: a * ap(39, .6, .8) });
  para('→ *Only then can planning become useful.*', x + 50, y + 250, { font: 'chalk', weight: 400, size: 32, maxW: 760, color: rgba(COL.ink, .95), a: a * ap(39, .6, 1.4) });
  const B = [['For a long time, autonomous driving looked like a *decision-making problem.*', 330], ['But none of that matters without a sufficiently accurate *model of the world* around it.', 735], ['Before the car could plan, *it had to perceive.*', 1140]];
  B.forEach(([t, bx], i) => { const k = ape(40, .6, i * .9); if (k <= 0) return; const cy = y + 470;
    draw(hoval(x + bx, cy, 175, 105, 221 + i, .05), k, { c: COL.ink2, a: a, w: 1.4 });
    para(t, x + bx, cy - 38, { font: 'chalk', weight: 400, size: 22, maxW: 280, align: 'center', color: rgba(COL.ink, .9), emc: COL.sig2, a: a * sm(k * 1.5) });
    if (i < 2) { const ar = ape(40, .4, i * .9 + .5); draw(hline(x + bx + 182, cy, x + bx + 222, cy, 231 + i, 0, .5), ar, { c: COL.sig, a, w: 2, ghost: false }); arrowHead(x + bx + 222, cy, 0, 10, COL.sig, a * ar); } });
}
function samePath() {
  const v = ap(42, .7); if (ST !== 42 || v <= .003) return;
  para('We think surgery needs to follow *the same path.*', 960, 170, { size: 54, align: 'center', color: DK, a: v });
  const cols = [[640, '01', 'PERCEPTION'], [1060, '02', 'REASONING'], [1480, '03', 'CONTROL']], x0 = 300, x1 = 1700;
  cols.forEach(([x, n, t], i) => { const k = ap(42, .5, .3 + i * .15); ctx.save(); ctx.fillStyle = rgba('236,224,222', .55 * v * k); ctx.fillRect(x - 14, 260, 28, 560); ctx.restore();
    label(n, x, 252, { align: 'center', font: 'mono', size: 30, color: DK, a: v * k }); label(t, x, 280, { align: 'center', font: 'mono', size: 15, ls: 3, color: DK2, a: v * k }); });
  /* autonomous vehicles: a road travelled to the third stage */
  label('AUTONOMOUS VEHICLES', x0, 352, { font: 'mono', size: 16, ls: 3, color: DK, a: v });
  const ry = 430, road = s => Array.from({ length: 60 }, (_, i) => { const x = x0 + (x1 - x0) * i / 59; return [x, ry + s + Math.sin(i / 59 * 5) * 16]; });
  draw([PL(road(-44))], ape(42, 1.2, .4), { c: COL.dark, a: v, w: 1.8 }); draw([PL(road(44))], ape(42, 1.2, .4), { c: COL.dark, a: v, w: 1.8 });
  ctx.save(); ctx.setLineDash([10, 10]); ctx.lineDashOffset = -TA * 20; ctx.beginPath(); road(0).forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.strokeStyle = rgba(COL.dark2, .5 * v); ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
  const av = road(0)[Math.round((1480 - x0) / (x1 - x0) * 59)]; dot(av[0], av[1], 8, COL.dark, v * ap(42, .5, 1.2)); label('today', av[0] + 18, av[1] - 18, { font: 'mono', size: 16, color: DK, a: v * ap(42, .5, 1.4) });
  ctx.save(); ctx.strokeStyle = rgba(COL.dark, v); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, 540); ctx.lineTo(x1, 540); ctx.stroke(); ctx.strokeStyle = SIG; ctx.globalAlpha = v; ctx.beginPath(); ctx.moveTo(x0, 548); ctx.lineTo(640, 548); ctx.stroke(); ctx.restore();
  /* endovascular surgery: a vessel perceived up to the first stage, the catheter on its centre line */
  label('ENDOVASCULAR SURGERY', x0, 830, { font: 'mono', size: 16, ls: 3, color: SIG, a: v });
  const vy = 690, mid = x => vy + Math.sin((x - x0) / 260) * 18, half = x => 62 - (x - x0) * .012;
  const tipX = lerp(x0, 640, ape(42, 1.8, .9)) + Math.sin(TA * .8) * 6, r = rnd(17);
  for (let i = 0; i < 520; i++) { const x = x0 + r() * (x1 - x0), side = r() < .5 ? -1 : 1, y = mid(x) + side * (half(x) + (r() - .5) * 10); const seen = x < tipX + 40;
    dot(x, y, seen ? 1.9 : 1.2, seen ? COL.dark : COL.dark2, v * (seen ? .85 : .22) * ap(42, .6, .8)); }
  const cpts = []; for (let x = x0 - 40; x <= tipX; x += 8) cpts.push([x, mid(x)]);
  if (cpts.length > 1) draw([PL(cpts)], 1, { c: COL.sig, a: v, w: 2.4, ghost: false });
  dot(tipX, mid(tipX), 6, COL.sig, v, 5); for (let k = 0; k < 3; k++) { const kk = (TA * .7 + k / 3) % 1; ring(tipX, mid(tipX), 8 + 70 * kk, COL.sig, (1 - kk) * v * .6, 1.2); }
  label('today', tipX + 16, mid(tipX) - 22, { font: 'mono', size: 16, color: SIG, a: v * ap(42, .5, 2.2) });
  para('At Mosaic, we build surgical instruments that can *perceive and navigate* human anatomy. We are starting in the vascular system: solving vascular navigation would unlock *delivering any therapy to any organ, anywhere.*', 960, 900, { font: 'sans', size: 24, maxW: 1300, align: 'center', color: DK2, a: v * ap(42, .7, 1.6) });
}

/* ======================= ACT E — back in the vessel, and the close (43–55) ======================= */
function loopAct() {
  if (ST < 43 || ST > 49) return;
  const a = ap(43, .9), lit = ST >= 47 ? .45 : .25 + .25 * ap(44, .8) + .25 * ap(45, .8) + .25 * ap(46, .8);
  tunnel(a, { wire: .9, bright: () => lit, linesA: .5 + .3 * lit });
  /* 43–46: the loop, one part per press */
  const la = ST <= 46 ? 1 : 1 - ap(47, .5); if (la > .003) {
    const cx = 960, cy = 590, R = 250;
    scrimC(960, 140, 520, 70, la * a); para('Much like AVs did, we start by:', 960, 152, { font: 'sans', size: 34, align: 'center', color: rgba(COL.ink, 1), a: la * a * ap(43, .6, .4) });
    ctx.save(); ctx.setLineDash([3, 9]); ctx.strokeStyle = rgba(COL.ink2, .3 * la * a); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke(); ctx.restore();
    const arcs = [[-2.55, -.75, 44, 'Restoring', 'perception', [cx, 250], 'center'], [-.45, 1.35, 45, 'Generating', 'understanding', [cx + 330, 890], 'left'], [1.65, 3.45, 46, 'Closing the loop', 'on action', [cx - 330, 890], 'right']];
    arcs.forEach(([a0, a1, k, l1, l2, [lx, ly], al]) => { const p = ape(k, .9); if (p <= 0) return;
      draw([PL(arcPts(cx, cy, R, a0, lerp(a0, a1, p)))], 1, { c: COL.sig, a: la * a, w: 3 }); const e = lerp(a0, a1, p); arrowHead(cx + Math.cos(e) * R, cy + Math.sin(e) * R, e + Math.PI / 2, 16, COL.sig, la * a);
      scrimC(lx + (al === 'left' ? 120 : al === 'right' ? -120 : 0), ly - 20, 220, 70, la * a * p);
      label(l1, lx, ly - 34, { align: al, font: 'sans', size: 28, color: rgba(COL.ink, 1), a: la * a * p }); label(l2, lx, ly + 12, { align: al, font: 'serif', weight: 300, size: 46, color: SIG, a: la * a * p }); });
    if (ST >= 46) { const an = -2.55 + (TA - (ENT[46] ?? TA)) * 1.6; dot(cx + Math.cos(an) * R, cy + Math.sin(an) * R, 8, COL.sig2, la * a * ap(46, .5, 1), 7); } }
  /* 47–49: the chain, the way the keynote stacks it */
  if (ST >= 47) { scrimC(960, 520, 820, 300, ap(47, .6));
    const k48 = ST >= 48 ? ape(48, .9) : 0, k49 = ST >= 49 ? ape(49, .9) : 0;
    const L1 = { y: lerp(lerp(560, 430, k48), 360, k49), s: lerp(lerp(66, 46, k48), 38, k49), a: lerp(lerp(1, .5, k48), .35, k49) };
    const L2 = { y: lerp(560, 470, k49), s: lerp(66, 48, k49), a: lerp(1, .5, k49) };
    para('Perception creates *data.*', 960, L1.y, { size: L1.s, align: 'center', a: ap(47, .7) * L1.a });
    para('Data creates *understanding.*', 960, L2.y, { size: L2.s, align: 'center', a: k48 * L2.a });
    para('Understanding enables *increasingly intelligent action.*', 960, 600, { size: 70, maxW: 1100, align: 'center', a: k49 }); }
}
function closeAct() {
  if (ST < 50) return;
  /* 50–51: from the bottom up, like every embodied system */
  { const v = vis(50, 52); if (v > .003) { const shift = ST >= 51 ? ape(51, 1) : 0, cx = lerp(960, 640, shift), base = 900, bh = 110;
      para('Surgical intelligence emerges *from the bottom up.*', 960, 190, { size: 56, align: 'center', a: v * (1 - ap(51, .5)) });
      para('That is how every major *embodied intelligent system* has developed. And we believe surgery will be *no different.*', 960, 170, { size: 44, maxW: 1300, align: 'center', a: v * ap(51, .6, .4) });
      [['Perception', 560], ['Understanding', 440], ['Action', 320]].forEach(([lab, w], i) => { const k = back(ramp(age(50), .4 + i * .55, .95 + i * .55)); if (ramp(age(50), .4 + i * .55, .5 + i * .55) <= 0) return;
        const y = base - (i + 1) * (bh + 14) - (1 - k) * 160 + Math.sin(TA * 1.1 + i) * 1.5, aa = v * sm(ramp(age(50), .4 + i * .55, .7 + i * .55));
        ctx.save(); ctx.fillStyle = rgba(i === 2 ? COL.sig : '44,40,38', aa * (i === 2 ? .9 : .7)); ctx.fillRect(cx - w / 2, y, w, bh); ctx.restore();
        draw(hbox(cx - w / 2, y, w, bh, 161 + i, 1.2), 1, { c: i === 2 ? COL.sig2 : COL.ink2, a: aa, w: 1.5 }); label(lab, cx, y + bh / 2 + 13, { align: 'center', font: 'serif', size: 40, weight: 300, color: rgba(COL.ink, 1), a: aa }); });
      if (shift > 0) { const x = 1360, y = 560; ctx.save(); ctx.translate(x, y - 190); ctx.scale(.9, .9); draw(WORLD.carTop, ape(51, .8, .3), { c: COL.ink, a: v, w: 2 }); ctx.restore();
        [['perception', 0], ['planning', 1], ['control', 2]].forEach(([l, i]) => { const k = ap(51, .5, .6 + i * .3), yy = y + 230 - i * 92;
          draw(hbox(x - 200 + i * 40, yy, 400 - i * 80, 76, 181 + i, 1), k, { c: i === 2 ? COL.sig : COL.ink2, a: v, w: 1.4 }); label(l, x, yy + 46, { align: 'center', font: 'mono', size: 22, color: INK2, a: v * k }); });
        label('autonomous vehicles', x, y + 360, { align: 'center', font: 'mono', size: 18, color: INK3, a: v * ap(51, .5, 1.4) }); label('surgery', cx, base + 50, { align: 'center', font: 'mono', size: 18, color: SIG, a: v * ap(51, .5, 1.4) }); } } }
  /* 52: the road again — less invasive, then more intelligent */
  if (ST === 52) { const a = ap(52, .8), out = eio(ramp(age(52), 1.6, 3.2)), c = { x: lerp(960, 1520, out), y: lerp(540, 470, out), z: lerp(1, .74, out) };
    cam(c, () => { const dr = 1;
      draw(WORLD.roadE1, dr, { c: COL.ink2, a: .55 * a, w: 1.6 }); draw(WORLD.roadE2, dr, { c: COL.ink2, a: .55 * a, w: 1.6 });
      ctx.save(); ctx.setLineDash([14, 16]); ctx.lineDashOffset = -TA * 18; ctx.beginPath(); tracePL(WORLD.roadC[0], 0, 1); ctx.strokeStyle = rgba(COL.ink3, .5 * a); ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();
      const u = eio(ramp(age(52), .3, 1.8)); draw(WORLD.roadC, u, { c: COL.sig, a, w: 3.2 });
      STOPS2.forEach(su => { const p = plAt(WORLD.roadC[0], su); ring(p[0], p[1], 16, COL.sig, a * .8, 1.4); });
      const end = WORLD.road[WORLD.road.length - 1], nx = [PL(cat([[end[0] - 4, end[1]], [2160, end[1] - 30], [2400, 330], [2700, 120], [2980, -60]], false, 3))];
      const k = ape(52, 1.6, 2.6); draw(nx, k, { c: COL.sig, a, w: 4, glow: 12 }); const h = k > 0 ? shapeHead(nx, k) : plAt(WORLD.roadC[0], u); dot(h[0], h[1], 10, COL.sig, a, 6 * (1 + .25 * Math.sin(TA * 3)));
      label('less invasive', 1060, 1000, { font: 'serif', size: 54, weight: 300, align: 'center', color: INK2, a: a * ap(52, .6, 1.2) });
      label('more intelligent', 2700, 210, { font: 'serif', size: 76, weight: 300, align: 'right', color: SIG, a: a * ap(52, .6, 3.6) }); });
    para('For the last 150 years, we made surgery progressively *less invasive.*', 120, 155, { size: 42, maxW: 1500, a: a * ap(52, .6, .4) });
    para('The next era is about making it progressively *more intelligent.*', 120, 215, { size: 42, maxW: 1500, a: a * ap(52, .6, 2.8) }); }
  /* 53–55: perceived, learnt, scaled — and the mark */
  if (ST >= 53) { const a = ap(53, .6);
    const one = ST === 53 ? 1 : 1 - ap(54, .5);
    if (one > 0) { personDraw(960, 640, 560, COL.ink, ramp(age(53), .2, 1.4), a * one * (1 - .7 * ap(53, .6, 2.6)), 1.8);
      for (let k = 0; k < 3; k++) { const kk = ((TA * .45 + k / 3) % 1); ring(960, 560, 60 + 330 * kk, COL.sig, (1 - kk) * a * one * .6 * ap(53, .5, 1.2), 1.4); }
      const dk = ap(53, .8, 2.6); if (dk > 0) { const s = 560 / 2.12, r = rnd(5);
        for (const pl of WORLD.sil) for (let i = 0; i < pl.length; i += 3) { const p = pl[i], jx = (r() - .5) * 8 * dk + Math.sin(TA + i) * 1.2, jy = (r() - .5) * 8 * dk;
          dot(960 + p[0] * s + jx, 640 - p[1] * s + jy, 1.8, COL.sig, a * one * dk * .9); } } }
    para('Because once surgery can be perceived, it can be *learnt.*', 960, 160, { size: 52, align: 'center', a: a * (ST === 53 ? ap(53, .6, .3) : 1 - ap(54, .4)) });
    para('Once it can be learnt, it can be *scaled.*', 960, 160, { size: 52, align: 'center', a: vis(54, 55) });
    const many = ST >= 54 ? ape(54, 1.6, .4) : 0, settle = ST >= 55 ? eio(ramp(age(55), .6, 3.6)) : 0;
    if (many > 0) { const markH = 300, boxW = markH * 122.066 / 149.99, ox = W / 2 - boxW / 2, oy = H * .5 - markH / 2, kx = boxW / 64, ky = markH / 64;
      WORLD.crowd.forEach((c, i) => { const a0 = sm(many * 2.2 - i * .02); if (a0 <= .01) return;
        const gx = c.gx * W, gy = c.gy * H + Math.sin(TA * .7 + c.s * 21) * 4, x = gx + (ox + c.mx * kx - gx) * settle, y = gy + 60 + (oy + c.my * ky - gy - 60) * settle;
        const h = 130 * (1 - .93 * settle), col = settle > .5 ? COL.sig : COL.ink2;
        person(x, y, h, col, a0 * (1 - .15 * settle) * (1 - ramp(settle, .82, .99)) * (settle > .5 ? .35 + .55 * settle : .64), Math.max(.6, h * .012)); }); }
    if (ST >= 55) { const mi = ramp(age(55), 3.3, 4.1), nm = ramp(age(55), 4.2, 5.2); if (mi > 0) logoDraw(W / 2, H * .5, 150 * lerp(1.95, 1, eio(nm)), mi, nm, '#FC6452', '#FFFFFF', nm > .001); } }
}

/* ======================= the frame ======================= */
function v2frame() {
  ctx.setTransform(...BASE);
  bgNow = lerp(BGF, WHITE(ST), sm((TA - BGT0) / .9));
  bodyAct(); roadAct(); vesselAct(); whiteAct(); loopAct(); closeAct();
}
