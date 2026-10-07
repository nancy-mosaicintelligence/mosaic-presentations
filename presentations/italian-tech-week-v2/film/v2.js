/* The v2 deck, station by station: every element belongs to a station and appears when that station is reached
   (one thing per press); stepping back takes it away. An ambient clock keeps everything alive between presses.
   Draws on the film's engine (lib.js) and drawings (scenes.js prep). */
'use strict';
let ST = 2, TA = 0, ENT = {}, CAMF = { x: 0, y: 0, z: 1 }, CAMT0 = 0, BGF = 0, BGT0 = 0;
const age = k => (ST >= k && ENT[k] != null) ? TA - ENT[k] : -1;
const ap = (k, d = .8, delay = 0) => { const a = age(k); return a < 0 ? 0 : sm((a - delay) / d); };
const ape = (k, d = .8, delay = 0) => { const a = age(k); return a < 0 ? 0 : eo((a - delay) / d); };
const vis = (k0, k1, d = .7, d1 = .45) => ap(k0, d) * (1 - ap(k1, d1));
const WHITE = st => st >= 24 && st <= 40 ? 1 : 0;
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
  const u = .1 + (o.u || 0), roll = TA * .045 + (o.roll || 0);
  TUN.draw(u, { a, span: 300, roll, t: TA, warm: o.warm ?? 1, bright: o.bright || (() => 1) });
  if (o.lines !== false) ringLines(u, roll, a * (o.linesA ?? .55));
  if (o.wire) wireLine(u, roll, a * o.wire, o.wireC || COL.sig2);
}
function ringLines(u, roll, a) {
  const N = TUN.N, ic = Math.floor(cl(u) * (N - 1));
  ctx.save(); ctx.lineWidth = 1.1; ctx.lineJoin = 'round';
  for (let i = ic + 30 - (ic % 30); i < Math.min(N - 1, ic + 300); i += 30) {
    const dep = (i - ic) / 300, al = a * (1 - dep) * .9; if (al < .01) continue;
    const P = TUN.pos[i], n = TUN.nrm[i], b = TUN.bin[i], rad = TUN.rad[i];
    ctx.beginPath(); let first = true;
    for (let j = 0; j <= 56; j++) { const an = j / 56 * Math.PI * 2, wob = 1 + .07 * Math.sin(an * 5 + i * .3 + TA * .25) + .04 * Math.sin(an * 11 - TA * .4 + i);
      const q = [0, 1, 2].map(d => P[d] + (n[d] * Math.cos(an) + b[d] * Math.sin(an)) * rad * wob * 1.1); const s = TUN.proj(u, q, roll);
      if (!s) { first = true; continue; } const bob = Math.sin(TA * .9 + i * .7) * 1.6;
      if (first) { ctx.moveTo(s[0], s[1] + bob); first = false; } else ctx.lineTo(s[0], s[1] + bob); }
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
    ['lungs', O.lungR, 17, .2, 1], ['liver · tumors', O.liver, 17, .4, 1], ['uterus · fibroids', O.uterus, 17, .6, 1], ['prostate', prostate, 17, .8, 1, 34]];
  L.forEach(([txt, o, k, dl, side, dy]) => { const pr = ape(k, .7, dl); if (pr <= 0) return;
    const [ox, oy] = o.c, lx = side < 0 ? -460 : 430, ly = oy + (dy || 0), orange = side > 0;
    if (o.sh) draw(o.sh, pr, { c: orange ? COL.sig : COL.ink2, a: a * .85, w: 1.6 });
    dot(ox, oy, 4.5, orange ? COL.sig : COL.ink, a * sm(pr * 3), orange ? 4 * (1 + .2 * Math.sin(TA * 1.6 + ox)) : 0);
    draw([PL([[ox + side * 12, oy], [lx - side * 14, ly]])], pr, { c: orange ? COL.sig : COL.ink2, a: a * .6, w: 1.1, ghost: false });
    label(txt, lx, ly + 9, { align: side < 0 ? 'right' : 'left', font: orange ? 'serif' : 'sans', size: orange ? 34 : 26, weight: orange ? 300 : 400, color: rgba(orange ? COL.sig : COL.ink2, 1), a: a * sm(pr * 1.5) }); });
  /* 18: each new site shows what can be delivered there — a small badge on its leader line, no traffic */
  if (ST >= 18) { const B = [['radiation', O.lungR, 0], ['drugs', O.liver, 0], ['embolic', O.uterus, 0], ['energy', prostate, 34]];
    B.forEach(([k, o, dy], i) => { const v = a * ape(18, .6, .5 + i * .35); if (v <= .003) return; const bx = 300, by = o.c[1] + dy;
      ctx.save(); ctx.fillStyle = 'rgba(4,1,2,.92)'; ctx.globalAlpha = v; ctx.beginPath(); ctx.arc(bx, by, 22, 0, 7); ctx.fill(); ctx.restore();
      ring(bx, by, 22, COL.sig, v * .9, 1.3);
      if (k !== 'embolic') { ctx.save(); ctx.translate(bx, by); ctx.scale(.55, .55); draw(WORLD.pay[k], 1, { c: COL.sig, a: v, w: 2.6, ghost: false }); ctx.restore(); }
      else for (const [dx, dy2] of [[-6, 0], [0, -6], [6, 0], [0, 6]]) dot(bx + dx, by + dy2, 2.6, COL.sig, v);
      const kk = ((TA * .35 + i * .25) % 1); ring(o.c[0], o.c[1], 8 + 24 * kk, COL.sig, v * (1 - kk) * .7, 1.2); }); }
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
  para('Endovascular medicine is an extraordinary *access system*.', 120, 660, { size: 40, maxW: 760, a: ap(21, .6, 1.2) * (ST >= 22 ? .38 : 1) * (1 - ap(23, .4)) });
  para('But it requires extraordinary skill.', 120, 820, { size: 52, maxW: 780, a: vis(22, 23) });
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
  if (ST < 24 || ST > 40) return;
  if (ST <= 29) {
    const slide = ST >= 26 ? (ST === 26 ? eio(age(26) / .9) : 1) : 0;
    const mw = lerp(720, 520, slide), mh = mw * .75, mx = lerp(960, 470, slide) - mw / 2, my = lerp(180, 230, slide), a = ap(24, .9, .5);
    ctx.save(); ctx.globalAlpha = a; ctx.beginPath(); ctx.rect(mx, my, mw, mh); ctx.clip();
    const fi = Math.floor(TA / .9) % 2, im = fi ? IMG.b : IMG.a;
    if (im) { const iw = im.naturalWidth, ih = im.naturalHeight, s = Math.max(mw / iw, mh / ih), dw = iw * s, dh = ih * s;
      ctx.filter = `brightness(${.86 + .14 * Math.sin(TA * 23) * Math.sin(TA * 7.1)}) contrast(1.1)`; ctx.drawImage(im, mx + (mw - dw) / 2, my + (mh - dh) / 2, dw, dh); ctx.filter = 'none'; }
    grain(mx, my, mw, mh, 1600, Math.floor(TA * 24), '0,0,0', .16); grain(mx, my, mw, mh, 900, Math.floor(TA * 24) + 9, '255,255,255', .12); ctx.restore();
    draw(hbox(mx - 10, my - 10, mw + 20, mh + 20, 111, 1.2), ape(24, .9, .4), { c: COL.dark, a, w: 1.8 });
    label('This is what they see.', mx + mw / 2, my + mh + 70, { align: 'center', font: 'serif', weight: 300, size: lerp(52, 38, slide), color: DK, a: ap(25, .6) });
    if (ST >= 26) carView(); }
  { const v = vis(30, 31); if (v > .003) { const px = 1350, py = 610, ph = 520;
      const g = ctx.createRadialGradient(px, py - 90, 0, px, py - 90, 330); g.addColorStop(0, rgba(COL.sig, .2 * v * (1 + .15 * Math.sin(TA * 1.6)))); g.addColorStop(1, rgba(COL.sig, 0)); ctx.fillStyle = g; ctx.fillRect(px - 400, py - 500, 800, 900);
      personDraw(px, py, ph, COL.dark, ape(30, 1.2, .2), v, 2); person(px, py, ph, COL.dark, v * ap(30, .5, 1.0), 2, 'surgeon');
      [[1590, .5], [1740, .42], [1860, .34]].forEach(([x, sz], i) => { const k = ap(30, .5, 2.2 + i * .25), f = ramp(age(30), 3.4 + i * .25, 4.4 + i * .25); if (k <= 0) return;
        ctx.save(); ctx.setLineDash([6, 7]); person(x, py + 40, ph * sz * 1.3, COL.dark, v * .5 * k * (1 - f), 1.3); ctx.restore(); });
      para('We have created extraordinary medicine that is *extraordinarily difficult to scale.*', 120, 420, { size: 58, maxW: 800, color: DK, a: v * ap(30, .7, .5) }); } }
  { const v = vis(31, 34); if (v > .003) teamGrid(v); }
  { const v = vis(34, 35); if (v > .003) { para('So: What would it take to scale the knowledge of *the very best surgeons?*', 960, 230, { size: 52, maxW: 1100, align: 'center', color: DK, a: v });
      const gx = 700, gy = 900, gw = 520, gh = 420;
      draw(join(hline(gx, gy, gx + gw, gy, 121, 0, .8), hline(gx, gy, gx, gy - gh, 123, 0, .8)), ape(34, .7, .3), { c: COL.dark, a: v, w: 1.6 });
      label('people', gx + gw, gy + 34, { align: 'right', size: 22, color: DK2, a: v }); label('operations', gx - 14, gy - gh + 8, { align: 'right', size: 22, color: DK2, a: v });
      draw(hline(gx, gy, gx + gw * .92, gy - gh * .6, 125, 0, 1), ape(34, .8, .7), { c: COL.dark, a: v, w: 2.2 }); label('linear', gx + gw * .95, gy - gh * .6 + 6, { font: 'mono', size: 22, color: DK2, a: v * ap(34, .4, 1.4) });
      const cu = [PL(cat(Array.from({ length: 30 }, (_, i) => { const u = i / 29; return [gx + gw * .8 * u, gy - gh * (.5 * u + .55 * Math.pow(u, 3.2))]; }), false, 3))];
      draw(cu, ape(34, 1.2, 1.6), { c: COL.sig, a: v, w: 2.6, dash: [12, 10] }); label('?', gx + gw * .84, gy - gh * 1.02, { font: 'serif', size: 96, color: SIG, a: v * ap(34, .4, 2.8) }); } }
  sensing();
  board();
  /* 40: before it could plan, it had to perceive */
  if (ST === 40) { const v = ap(40, .6), k = eio(ramp(age(40), 1.0, 1.8));
    para('Before it could plan…', 960, 300, { size: 46, align: 'center', color: DK2, a: v });
    label('plan', lerp(960, 1240, k), 600, { align: 'center', font: 'serif', size: 140, weight: 300, color: DK, a: v * ap(40, .5, .3) });
    label('perceive', lerp(560, 680, k), 600, { align: 'center', font: 'serif', size: 140, weight: 300, color: SIG, a: v * k });
    const ar = ramp(age(40), 1.9, 2.4); draw(hline(930, 560, 1080, 560, 141, 0, .6), ar, { c: COL.dark, a: v, w: 2.4 }); arrowHead(1080, 560, 0, 18, COL.dark, v * sm(ar * 3));
    para('But *perception* had to come first.', 960, 840, { size: 54, align: 'center', color: DK, a: v * ap(40, .7, 2.8) }); }
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
  /* the left column: the count, and one line */
  const cnt = ST > 31 ? 100 : Math.round(100 * eo(ramp(age(31), .3, 1.9)));
  label('$' + cnt + 'B', 120, 300, { font: 'serif', weight: 300, size: 150, color: SIG, a: v });
  para('industry, still scaling *one human* at a time.', 120, 390, { size: 46, maxW: 620, color: DK, a: v * ap(31, .6, 1.4) });
}
function icoRow(list, x, y, a, seedK) {
  list.forEach(([name, d], i) => { const k = ape(seedK, .5, .3 + i * .12); if (k <= 0) return; const cx = x + i * 125;
    if (!WORLD['ico' + name]) WORLD['ico' + name] = dShape(d, (px, py) => [px - 21, py - 21], .8);
    ctx.save(); ctx.translate(cx, y); ctx.scale(1.15, 1.15); draw(WORLD['ico' + name], k, { c: COL.dark, a, w: 1.4, ghost: false }); ctx.restore();
    const words = name.split(' '); words.forEach((w, j) => label(w, cx, y + 52 + j * 22, { align: 'center', size: 18, color: DK2, a: a * k })); });
}
function sensing() {
  if (ST < 35 || ST > 38) return;
  { const v = ap(35, .6) * (1 - ap(36, .5)); if (v > .003) { const x = 960, y = 560;
      const tr = [PL(cat([[200, 760], [480, 640], [760, 700], [960, 560]], false, 3))]; draw(tr, ape(35, 1.4), { c: COL.dark2, a: v * .5, w: 1.6, dash: [8, 10], ghost: false });
      dot(x, y, 10, COL.sig, v, 4 * (1 + .2 * Math.sin(TA * 2))); for (let k = 0; k < 3; k++) { const kk = (TA * .35 + k / 3) % 1; ring(x, y, 20 + 200 * kk, COL.sig, (1 - kk) * v * .7, 1.4); }
      label('Where am I?', 900, 470, { align: 'right', font: 'serif', weight: 300, size: 76, color: SIG, a: v * ap(35, .6, .5) });
      label('And what’s around me?', 1020, 700, { font: 'serif', weight: 300, size: 76, color: DK, a: v * ap(35, .6, 1.1) }); } }
  label('Where am I?  /  What’s around me?', 120, 160, { font: 'serif', weight: 300, size: 46, color: SIG, a: ap(36, .6, .3) });
  para('Before you can choose where to go, you need an internal representation of the world. Humans tend to equate perception with *optical vision.*', 120, 240, { font: 'sans', size: 26, maxW: 780, color: DK2, a: ap(36, .6, .4) });
  { const v = vis(36, 37); if (v > .003) { const ex = 1150, ey = 560; draw(hpoly([[ex - 40, ey], [ex, ey - 20], [ex + 40, ey], [ex, ey + 20], [ex - 40, ey]], 101, .6, false), ape(36, .6), { c: COL.dark, a: v, w: 1.8 }); dot(ex + 3, ey, 8, COL.dark, v);
      ctx.save(); ctx.fillStyle = rgba(COL.sig, .12 * v); ctx.beginPath(); ctx.moveTo(ex + 50, ey); ctx.arc(ex + 50, ey, 560 * ape(36, 1, .4), -.32 + .03 * Math.sin(TA), .32 + .03 * Math.sin(TA)); ctx.closePath(); ctx.fill(); ctx.restore(); } }
  { const v = ap(37, .6); if (v > .003) { para('*But nature doesn’t.*', 120, 400, { size: 40, a: v }); icoRow(ICO.nature, 160, 470, v, 37);
      para('Evolution selects the sensory system that is useful for your environment.', 120, 600, { font: 'sans', size: 22, maxW: 700, color: DK2, a: v }); } }
  { const v = vis(37, 38); if (v > .003) batDemo(v, 1420, 560); }
  { const v = ap(38, .6); if (v > .003) { para('*Engineering works the same way.*', 120, 700, { size: 40, a: v }); icoRow(ICO.eng, 160, 770, v, 38);
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
  if (ST !== 39) return; const a = ap(39, .7), x = 140, y = 150, w = 1640, h = 760;
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#1C1A19'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 20); ctx.fill();
  const g = ctx.createRadialGradient(x + w * .4, y + h * .35, 50, x + w * .5, y + h * .5, w * .7); g.addColorStop(0, 'rgba(255,255,255,.035)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
  draw(hbox(x - 8, y - 8, w + 16, h + 16, 211, 1.8), ape(39, .9), { c: COL.dark, a, w: 2.2 });
  draw(hline(x + 60, y + h + 26, x + w - 60, y + h + 22, 213, 1, 1), ape(39, .9, .2), { c: COL.dark, a, w: 2 });
  para('Self-driving taught us one big lesson:', 960, y + 170, { font: 'chalk', weight: 400, size: 42, align: 'center', color: rgba(COL.ink, .62), a: a * ap(39, .6, .5) });
  para('A car can’t decide anything without an *accurate model of the world.*', 960, y + 330, { font: 'chalk', weight: 400, size: 84, maxW: 1400, align: 'center', lh: 112, color: rgba(COL.ink, .95), emc: COL.sig2, a: a * ap(39, .8, 1.1) });
  worldModel(a * ap(39, .8, 1.8), 960, y + 620);
}
/* a chalk sketch: a car seen from above, its sweep, and the world it has mapped as points — road edges, a car ahead, a person, a tree */
function worldModel(a, cx, cy) {
  if (a <= .003) return; const sw = TA * 1.3;
  ctx.save(); ctx.beginPath(); ctx.rect(cx - 560, cy - 110, 1120, 225); ctx.clip();
  const pts = [];
  for (let x = cx - 520; x <= cx + 520; x += 18) { pts.push([x, cy - 88 + Math.sin(x / 140) * 4]); pts.push([x, cy + 88 + Math.sin(x / 150) * 4]); }
  for (let i = 0; i < 22; i++) { const u = i / 21; pts.push([cx + 250 + u * 130, cy - 32]); pts.push([cx + 250 + u * 130, cy + 32]); }
  for (let i = 0; i < 8; i++) { pts.push([cx + 250, cy - 32 + i * 9]); pts.push([cx + 380, cy - 32 + i * 9]); }
  for (let i = 0; i < 16; i++) { const an = i / 16 * Math.PI * 2; pts.push([cx - 300 + Math.cos(an) * 12, cy + 45 + Math.sin(an) * 12]); pts.push([cx + 500 + Math.cos(an) * 18, cy - 45 + Math.sin(an) * 18]); }
  pts.forEach(([x, y]) => { const an = (Math.atan2(y - cy, x - cx) + Math.PI * 8) % (Math.PI * 2), since = ((sw % (Math.PI * 2)) - an + Math.PI * 4) % (Math.PI * 2);
    dot(x, y, 2.6, COL.sig2, a * (.45 + .55 * Math.max(0, 1 - since / 2.4))); });
  ctx.save(); ctx.translate(cx, cy); ctx.scale(.62, .62); draw(WORLD.carTop, 1, { c: COL.ink, a: a * .9, w: 3 }); ctx.restore();
  ctx.save(); ctx.strokeStyle = rgba(COL.sig2, .45 * a); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(sw) * 560, cy + Math.sin(sw) * 560); ctx.stroke(); ctx.restore();
  for (let k = 0; k < 3; k++) { const kk = (TA * .4 + k / 3) % 1; ring(cx, cy, 30 + 200 * kk, COL.ink, (1 - kk) * a * .25, 1); }
  ctx.restore();
}
function samePath() {
  const v = ap(42, .7); if (ST !== 42 || v <= .003) return;
  para('We think surgery needs to follow *the same path.*', 960, 160, { size: 54, align: 'center', a: v });
  const cols = [[640, '01', 'PERCEPTION'], [1060, '02', 'REASONING'], [1480, '03', 'CONTROL']], x0 = 260, x1 = 1760;
  cols.forEach(([x, n, t], i) => { const k = ap(42, .5, .3 + i * .15); ctx.save(); ctx.fillStyle = rgba('255,255,255', .045 * v * k); ctx.fillRect(x - 16, 250, 32, 700); ctx.restore();
    label(n, x, 240, { align: 'center', font: 'mono', size: 44, color: rgba(COL.ink, 1), a: v * k }); label(t, x, 284, { align: 'center', font: 'mono', size: 22, ls: 4, color: INK2, a: v * k }); });
  /* the road */
  label('Autonomous vehicles', x0, 345, { font: 'serif', weight: 300, size: 42, color: rgba(COL.ink, 1), a: v });
  const ry = 445, road = s => Array.from({ length: 70 }, (_, i) => { const x = x0 + (x1 - x0) * i / 69; return [x, ry + s + Math.sin(i / 69 * 5) * 14]; });
  draw([PL(road(-46))], ape(42, 1.2, .4), { c: COL.ink2, a: v, w: 1.8 }); draw([PL(road(46))], ape(42, 1.2, .4), { c: COL.ink2, a: v, w: 1.8 });
  ctx.save(); ctx.setLineDash([10, 12]); ctx.lineDashOffset = -TA * 22; ctx.beginPath(); road(0).forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.strokeStyle = rgba(COL.ink3, .6 * v); ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
  const car = road(0)[Math.round((1480 - x0) / (x1 - x0) * 69)], ra = ap(42, .6, 1.2);
  /* trees and people along the road, picked out by the car's sensing */
  const things = [[430, 98, 't'], [600, 98, 'p'], [760, -100, 't'], [900, 100, 't'], [1130, -96, 'p'], [1280, 100, 't'], [1380, -100, 't'], [1620, 98, 'p'], [1700, -100, 't']];
  things.forEach(([x, dy, kd], i) => { const y = ry + dy + Math.sin((x - x0) / (x1 - x0) * 5) * 14, sensed = Math.abs(x - car[0]) < 330, al = v * ap(42, .5, .6 + i * .06);
    const c = sensed ? COL.sig : COL.ink3;
    if (kd === 't') { draw(hoval(x, y - 6, 18, 18, 300 + i, .12), 1, { c, a: al, w: 1.4, ghost: false }); ctx.save(); ctx.strokeStyle = rgba(c, al); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y + 12); ctx.lineTo(x, y + 26); ctx.stroke(); ctx.restore(); }
    else person(x, y + 2, 46, c, al, 1.1);
    if (sensed) { const kk = (TA * .8 + i * .2) % 1; ring(x, y, 10 + 18 * kk, COL.sig, al * (1 - kk) * .6, 1); } });
  ctx.save(); ctx.translate(car[0], car[1]); ctx.scale(.42, .42); draw(WORLD.carTop, 1, { c: COL.ink, a: v * ra, w: 3.2 }); ctx.restore();
  ctx.save(); ctx.fillStyle = rgba(COL.sig, .1 * v * ra); ctx.beginPath(); ctx.moveTo(car[0] + 40, car[1]); ctx.arc(car[0] + 40, car[1], 300, -.42, .42); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.save(); ctx.strokeStyle = rgba(COL.ink3, .5 * v); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x0, 590); ctx.lineTo(x1, 590); ctx.stroke(); ctx.restore();
  /* the vessel */
  label('Endovascular surgery', x0, 668, { font: 'serif', weight: 300, size: 42, color: SIG, a: v });
  const vy = 790, mid = x => vy + Math.sin((x - x0) / 260) * 16, half = x => 70 - (x - x0) * .01 + Math.sin(x / 47) * 5;
  const tipX = lerp(x0 - 300, 640, eio(ramp(age(42), .1, 2.6))) + Math.sin(TA * .6) * 6 * ap(42, .5, 2.6);
  for (const side of [-1, 1]) { const pts = []; for (let x = x0; x <= x1; x += 8) pts.push([x, mid(x) + side * half(x)]);
    draw([PL(pts)], ape(42, 1.4, .6), { c: COL.ink3, a: v * .55, w: 1.6 });
    const seen = pts.filter(p => p[0] < tipX + 120); if (seen.length > 1) draw([PL(seen)], ape(42, 1.0, 1.4), { c: COL.ink, a: v, w: 2 }); }
  /* calcium plaque along the walls */
  [[480, -1, 70], [830, 1, 90], [1180, -1, 60], [1450, 1, 80], [1650, -1, 55]].forEach(([x, side, w], i) => { const seen = x < tipX + 160, al = v * ap(42, .5, 1.0 + i * .1), y = mid(x) + side * (half(x) - 10);
    ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = seen ? 'rgba(236,228,214,.9)' : 'rgba(236,228,214,.18)'; ctx.beginPath();
    for (let j = 0; j <= 16; j++) { const t = j / 16, px = x - w / 2 + w * t, py = y - side * (Math.sin(t * Math.PI) * 16 * (1 + .25 * Math.sin(j * 2.3 + i))); j ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.lineTo(x + w / 2, mid(x + w / 2) + side * half(x + w / 2)); ctx.lineTo(x - w / 2, mid(x - w / 2) + side * half(x - w / 2)); ctx.closePath(); ctx.fill(); ctx.restore(); });
  label('calcified plaque', 830, mid(830) + half(830) + 40, { align: 'center', font: 'mono', size: 22, color: INK3, a: v * ap(42, .5, 1.6) });
  const cpts = []; for (let x = x0 - 300; x <= tipX; x += 8) cpts.push([x, mid(x)]); if (cpts.length > 1) draw([PL(cpts)], 1, { c: COL.sig, a: Math.max(v, .9), w: 2.6, ghost: false });
  dot(tipX, mid(tipX), 6, COL.sig, Math.max(v, .9), 5); for (let k = 0; k < 3; k++) { const kk = (TA * .55 + k / 3) % 1; ring(tipX, mid(tipX), 8 + 60 * kk, COL.sig, (1 - kk) * v * .6 * ap(42, .5, 2.4), 1.2); }
}

/* ======================= ACT E — back in the vessel, and the close (43–55) ======================= */
function loopAct() {
  if (ST < 43 || ST > 49) return;
  const a = ap(43, .9), lit = ST >= 47 ? .5 : .35 + .2 * ap(44, .8) + .2 * ap(45, .8) + .25 * ap(46, .8);
  tunnel(a, { warm: 0, wire: .55, wireC: COL.sig2, bright: () => lit, linesA: .6 });
  const la = ST <= 46 ? 1 : 1 - ap(47, .5); if (la > .003) {
    const cx = 960, cy = 600, R = 240;
    scrimC(960, 150, 520, 70, la * a); para('Much like AVs did, we start by:', 960, 160, { font: 'sans', size: 36, align: 'center', color: rgba(COL.ink, 1), a: la * a * ap(43, .6, .4) });
    const N = [[-Math.PI / 2, 44, 'Restoring', 'perception', 0, -62, 'center'], [Math.PI / 6, 45, 'Generating', 'understanding', 34, 6, 'left'], [Math.PI * 5 / 6, 46, 'Closing the loop', 'on action', -34, 6, 'right']];
    N.forEach(([an, k, l1, l2, dx, dy, al], i) => { const p = ape(k, .8); if (p <= 0) return; const nx = cx + Math.cos(an) * R, ny = cy + Math.sin(an) * R;
      const next = N[(i + 1) % 3][0] + (i === 2 ? Math.PI * 2 : 0), a0 = an + .16, a1 = lerp(a0, next - .16, ape(k, 1.0, .3));
      if (a1 > a0 + .01) { draw([PL(arcPts(cx, cy, R, a0, a1))], 1, { c: COL.sig, a: la * a, w: 3 }); arrowHead(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R, a1 + Math.PI / 2, 16, COL.sig, la * a * p); }
      dot(nx, ny, 7, COL.sig, la * a * p, 4); ring(nx, ny, 15 + 2 * Math.sin(TA * 2 + i), COL.sig, la * a * p * .5, 1.2);
      scrimC(nx + dx + (al === 'left' ? 110 : al === 'right' ? -110 : 0), ny + dy - 16, 190, 56, la * a * p);
      label(l1, nx + dx, ny + dy - 28, { align: al, font: 'sans', size: 30, color: rgba(COL.ink, 1), a: la * a * p }); label(l2, nx + dx, ny + dy + 12, { align: al, font: 'sans', size: 30, color: SIG, a: la * a * p }); });
    if (ST >= 46) { const an = -Math.PI / 2 + (TA - (ENT[46] ?? TA)) * .9; dot(cx + Math.cos(an) * R, cy + Math.sin(an) * R, 5, COL.sig2, la * a * ap(46, .6, 1.4), 6); } }
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
  { const v = vis(50, 52); if (v > .003) { const cx = 760, base = 900, bh = 120;
      para('Surgical intelligence emerges|from the *bottom up,*'.replace('|', ' '), 960, 150, { size: 58, maxW: 900, align: 'center', a: v });
      [['Perception', 560], ['Understanding', 440], ['Action', 320]].forEach(([lab, w], i) => { const t0 = .4 + i * .55, k = back(ramp(age(50), t0, t0 + .55)); if (ST === 50 && ramp(age(50), t0, t0 + .1) <= 0) return;
        const kk = ST > 50 ? 1 : k, y = base - (i + 1) * (bh + 14) - (1 - kk) * 160 + Math.sin(TA * 1.1 + i) * 1.5, aa = v * (ST > 50 ? 1 : sm(ramp(age(50), t0, t0 + .3)));
        ctx.save(); ctx.fillStyle = rgba(i === 2 ? COL.sig : '44,40,38', aa * (i === 2 ? .9 : .7)); ctx.fillRect(cx - w / 2, y, w, bh); ctx.restore();
        draw(hbox(cx - w / 2, y, w, bh, 161 + i, 1.2), 1, { c: i === 2 ? COL.sig2 : COL.ink2, a: aa, w: 1.5 }); label(lab, cx, y + bh / 2 + 13, { align: 'center', font: 'serif', size: 40, weight: 300, color: rgba(COL.ink, 1), a: aa }); });
      const ar = ST > 50 ? 1 : ramp(age(50), 2.0, 2.8); draw(hline(cx + 340, base - 30, cx + 340, base - 3 * (bh + 14) + 10, 171, 0, 1), eo(ar), { c: COL.sig, a: v, w: 2 }); arrowHead(cx + 340, base - 3 * (bh + 14) + 10, -Math.PI / 2, 16, COL.sig, v * sm(ar * 4));
      const e = ap(51, .6); if (e > 0) { const x = 1460, y = 560; ctx.save(); ctx.translate(x, y - 150); ctx.scale(.8, .8); draw(WORLD.carTop, ape(51, .7), { c: COL.ink, a: v, w: 2 }); ctx.restore();
        [['perception', 0], ['planning', 1], ['control', 2]].forEach(([l, i]) => { const k = ape(51, .5, .3 + i * .3), yy = y + 160 - i * 70;
          draw(hbox(x - 150 + i * 30, yy, 300 - i * 60, 58, 181 + i, 1), k, { c: i === 2 ? COL.sig : COL.ink2, a: v, w: 1.3 }); label(l, x, yy + 37, { align: 'center', font: 'mono', size: 20, color: INK2, a: v * k }); });
        para('just like every embodied intelligent system before it.', 1460, 880, { size: 36, maxW: 520, align: 'center', color: INK2, a: v * ap(51, .6, 1.2) }); } } }
  if (ST === 52) { const a = ap(52, .8), out = eio(ramp(age(52), 2.0, 3.6)), c = { x: lerp(960, 1300, out), y: lerp(540, 470, out), z: lerp(1, .8, out) };
    cam(c, () => {
      draw(WORLD.roadE1, 1, { c: COL.ink2, a: .55 * a, w: 1.6 }); draw(WORLD.roadE2, 1, { c: COL.ink2, a: .55 * a, w: 1.6 });
      ctx.save(); ctx.setLineDash([14, 16]); ctx.lineDashOffset = -TA * 18; ctx.beginPath(); tracePL(WORLD.roadC[0], 0, 1); ctx.strokeStyle = rgba(COL.ink3, .5 * a); ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();
      const u = eio(ramp(age(52), .3, 1.8)); draw(WORLD.roadC, u, { c: COL.sig, a, w: 3.2 });
      /* the three stops again, each with its picture and name below the road */
      const names = ['Open surgery', 'Small incisions', 'Vascular highways'];
      STOPS2.forEach((su, k) => { const p = plAt(WORLD.roadC[0], su), sa = a * ap(52, .5, .4 + k * .35); ring(p[0], p[1], 16, COL.sig, sa * .9, 1.4);
        const by = 830; ctx.save(); ctx.setLineDash([3, 6]); ctx.strokeStyle = rgba(COL.ink3, sa * .7); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p[0], p[1] + 20); ctx.lineTo(p[0], by - 120); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.translate(p[0] - 70, by - 112); ctx.scale(.7, .7); for (const it of WORLD.icons[k]) draw(it.sh, 1, { c: it.col, a: sa * it.a, w: 2 }); ctx.restore();
        label(names[k], p[0], by + 40, { align: 'center', font: 'serif', weight: 300, size: 34, color: SIG, a: sa }); });
      const end = WORLD.road[WORLD.road.length - 1], nx = [PL(cat([[end[0] - 4, end[1]], [2160, end[1] - 30], [2400, 330], [2700, 120], [2980, -60]], false, 3))];
      const k = ape(52, 1.6, 3.0); draw(nx, k, { c: COL.sig, a, w: 4, glow: 12 }); const h = k > 0 ? shapeHead(nx, k) : plAt(WORLD.roadC[0], u); dot(h[0], h[1], 10, COL.sig, a, 6 * (1 + .25 * Math.sin(TA * 3)));
      label('more intelligent', 2380, 210, { font: 'serif', size: 76, weight: 300, align: 'right', color: SIG, a: a * ap(52, .6, 3.8) }); });
    para('For the last 150 years, we made surgery progressively *less invasive.*', 120, 155, { size: 42, maxW: 1500, a: a * ap(52, .6, .4) });
    para('The next era is about making it progressively *more intelligent.*', 120, 215, { size: 42, maxW: 1500, a: a * ap(52, .6, 3.0) }); }
  if (ST >= 53) { const a = ap(53, .6), one = ST === 53 ? 1 : 1 - ap(54, .5);
    if (one > 0) { personDraw(960, 640, 560, COL.ink, ramp(age(53), .2, 1.4), a * one * (1 - .7 * ap(53, .6, 2.6)), 1.8);
      for (let k = 0; k < 3; k++) { const kk = (TA * .35 + k / 3) % 1; ring(960, 560, 60 + 330 * kk, COL.sig, (1 - kk) * a * one * .6 * ap(53, .5, 1.2), 1.4); }
      const dk = ap(53, .8, 2.6); if (dk > 0) { const s = 560 / 2.12, r = rnd(5);
        for (const pl of WORLD.sil) for (let i = 0; i < pl.length; i += 3) { const p = pl[i], jx = (r() - .5) * 8 * dk + Math.sin(TA * .8 + i) * 1.2, jy = (r() - .5) * 8 * dk + Math.cos(TA * .7 + i) * 1.2;
          dot(960 + p[0] * s + jx, 640 - p[1] * s + jy, 1.8, COL.sig, a * one * dk * .9); } } }
    para('Once surgery can be perceived,', 960, 150, { size: 54, align: 'center', a: a * (ST === 53 ? ap(53, .6, .3) : 1 - ap(54, .4)) });
    para('it can be *learnt.*', 960, 220, { size: 54, align: 'center', a: a * (ST === 53 ? ap(53, .6, 2.4) : 1 - ap(54, .4)) });
    para('And once it can be learnt…', 960, 150, { size: 54, align: 'center', a: vis(54, 55) });
    para('it can be *scaled.*', 960, 220, { size: 54, align: 'center', a: ap(54, .6, 1.2) * (1 - ap(55, .45)) });
    const many = ST >= 54 ? ape(54, 1.6, 1.2) : 0, settle = ST >= 55 ? eio(ramp(age(55), .6, 3.6)) : 0;
    if (many > 0) { const markH = 300, boxW = markH * 122.066 / 149.99, ox = W / 2 - boxW / 2, oy = H * .5 - markH / 2, kx = boxW / 64, ky = markH / 64;
      WORLD.crowd.forEach((c, i) => { const a0 = sm(many * 2.2 - i * .02); if (a0 <= .01) return;
        const gx = c.gx * W, gy = c.gy * H + Math.sin(TA * .7 + c.s * 21) * 4, x = gx + (ox + c.mx * kx - gx) * settle, y = gy + 60 + (oy + c.my * ky - gy - 60) * settle;
        const h = 130 * (1 - .93 * settle), col = settle > .5 ? COL.sig : COL.ink2;
        person(x, y, h, col, a0 * (1 - .15 * settle) * (1 - ramp(settle, .82, .99)) * (settle > .5 ? .35 + .55 * settle : .64), Math.max(.6, h * .012)); }); }
    if (ST >= 55) { const mi = ramp(age(55), 3.3, 4.1), nm = ramp(age(55), 4.2, 5.2), up = eio(ramp(age(55), 5.8, 7.0)), ve = sm(ramp(age(55), 6.8, 7.8));
      if (mi > 0) logoDraw(W / 2, lerp(H * .5, H * .38, up), 150 * lerp(1.95, 1, eio(nm)), mi, nm, '#FC6452', '#FFFFFF', nm > .001);
      if (ve > 0 && IMG.vento) { const h = 128, w = h * IMG.vento.naturalWidth / IMG.vento.naturalHeight; ctx.save(); ctx.globalAlpha = ve; ctx.drawImage(IMG.vento, W / 2 - w / 2, H * .6 + (1 - ve) * 14, w, h); ctx.restore(); } } }
}

function mosaicIntro() {
  if (ST !== 41) return; const g = age(41), a = ap(41, .6);
  const lg = sm(ramp(g, .3, 1.0)) * (1 - sm(ramp(g, 2.2, 2.9))), k = eio(ramp(g, 2.0, 3.0));
  if (lg > .003) logoDraw(lerp(960, 120, k), lerp(520, 560, k), lerp(110, 40, k), lg, lg * (1 - k));
  const vy = 560, x0 = -40, x1 = 1960, mid = x => vy + Math.sin(x / 300) * 22, half = x => 118 - (x - x0) * .018 + Math.sin(x / 70) * 6;
  const tipX = lerp(100, 2060, ramp(g, 2.6, 10.5) * .35 + eio(ramp(g, 2.6, 10.5)) * .65);
  /* walls appear where the instrument's pulses have reached */
  for (const side of [-1, 1]) { ctx.save(); ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    for (let x = x0; x < x1; x += 10) { const near = cl(1 - (x - tipX - 260) / 120) * cl(ramp(g, 2.6, 3.2)); if (near <= .01) continue;
      const y0 = mid(x) + side * half(x), y1 = mid(x + 10) + side * half(x + 10); ctx.strokeStyle = rgba(COL.ink, a * near * .85); ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + 10, y1); ctx.stroke();
      ctx.strokeStyle = rgba(COL.ink, a * near * .3); ctx.beginPath(); ctx.moveTo(x + 1.1, y0 - .9); ctx.lineTo(x + 11.1, y1 - .9); ctx.stroke(); } ctx.restore(); }
  if (g > 2.6) { const pts = []; for (let x = x0; x <= tipX; x += 8) pts.push([x, mid(x)]); draw([PL(pts)], 1, { c: COL.sig, a, w: 2.6, ghost: false });
    dot(tipX, mid(tipX), 7, COL.sig, a, 6); for (let j = 0; j < 3; j++) { const kk = (TA * .55 + j / 3) % 1; ring(tipX, mid(tipX), 14 + 230 * kk, COL.sig, (1 - kk) * .55 * a, 1.3); } }
  para('At Mosaic, we build surgical instruments that can *perceive and navigate* human anatomy,', 120, 150, { size: 50, maxW: 1200, a: a * ap(41, .7, 2.6) });
  para('starting with the vascular system.', 1800, 960, { size: 38, align: 'right', color: INK2, a: a * ap(41, .7, 3.6) });
}

function wireLine(u, roll, a, c) {
  if (a <= .003) return; const N = TUN.N, ic = Math.floor(cl(u) * (N - 1)), pts = [];
  for (let k = 3; k < 240; k += 3) { const i = Math.min(N - 1, ic + k), s = TUN.proj(u, TUN.pos[i], roll); if (!s) continue; pts.push([s[0], s[1] + 760 * .42 / s[2], s[2]]); }
  pts.unshift([pts[0][0], H + 40, .1]);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let k = 1; k < pts.length; k++) { const f = k / pts.length; ctx.strokeStyle = rgba(c, a * lerp(.55, .12, f)); ctx.lineWidth = lerp(2.6, .8, f);
    ctx.beginPath(); ctx.moveTo(pts[k - 1][0], pts[k - 1][1]); ctx.lineTo(pts[k][0], pts[k][1]); ctx.stroke(); }
  ctx.restore();
}

/* ======================= the frame ======================= */
function v2frame() {
  ctx.setTransform(...BASE);
  bgNow = lerp(BGF, WHITE(ST), sm((TA - BGT0) / .9));
  bodyAct(); roadAct(); vesselAct(); whiteAct(); mosaicIntro(); samePath(); loopAct(); closeAct();
}
