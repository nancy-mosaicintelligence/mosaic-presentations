/* The film, scene by scene. Every time is tied to a word of the narration (wt), so the picture moves with the voice. */
'use strict';
let WORLD = {};
const DARK = COL.dark;

/* ======================= prepared drawings ======================= */
function prep() {
  const S = 440; WORLD.S = S;
  const toW = (x, y) => [x * S, -y * S];
  function strokeShapes(list, reps = true) {
    const out = [];
    for (const st of list) {
      const pts = []; for (let i = 0; i < st.p.length; i += 2) pts.push(toW(st.p[i], st.p[i + 1]));
      const base = cat(pts, false, 2.2);
      const n = reps ? st.reps : 1;
      for (let r = 0; r < n; r++) { const seed = r * 2.731 + st.t0 * 11.17 + st.p.length * .53;
        out.push({ sh: [PL(wobble(base, seed, r === 0 ? .0022 * S : .0055 * S))], t0: st.t0, t1: st.t1, tone: st.tone * (r === 0 ? 1 : .42) }); }
    }
    return out;
  }
  WORLD.fig = strokeShapes(STROKES); WORLD.room = strokeShapes(ROOM); WORLD.rig = strokeShapes(RIG);
  WORLD.br = BR.map((b, i) => { const pts = []; for (let k = 0; k < b.p.length; k += 2) pts.push(toW(b.p[k], b.p[k + 1]));
    return { sh: [PL(wobble(cat(pts, false, 2), i * 1.7, 1.2))], t0: b.t[0], t1: b.t[1] }; });
  WORLD.ACC = toW(.082, -.150);
  /* the route from the groin to the heart */
  const route = [[.082, -.150], [.070, -.075], [.044, -.010], [0, .040], [.008, .170], [.010, .320], [.004, .440], [.012, .500]].map(p => toW(p[0], p[1]));
  WORLD.route = [PL(cat(route, false, 2))];
  /* organs */
  WORLD.org = {
    heart: { c: toW(.03, .47), sh: hoval(...toW(.03, .47), 22, 26, 31) },
    lungL: { c: toW(-.085, .50), sh: hoval(...toW(-.085, .50), 24, 44, 33) },
    lungR: { c: toW(.095, .50), sh: hoval(...toW(.095, .50), 24, 44, 35) },
    liver: { c: toW(-.06, .33), sh: hoval(...toW(-.06, .33), 38, 20, 37) },
    kidL: { c: toW(-.06, .19), sh: hoval(...toW(-.06, .19), 9, 15, 39) },
    kidR: { c: toW(.06, .19), sh: hoval(...toW(.06, .19), 9, 15, 41) },
    uterus: { c: toW(0, -.04), sh: hoval(...toW(0, -.04), 18, 13, 43) },
    brain: { c: toW(0, .865), sh: hoval(...toW(0, .865), 30, 26, 45) },
    leg: { c: toW(.076, -.58), sh: hoval(...toW(.076, -.58), 12, 12, 47) },
  };
  /* figure silhouette for people (normalized, y up) */
  WORLD.sil = STROKES.filter(s => s.tone >= .99).map(st => { const p = []; for (let i = 0; i < st.p.length; i += 2) p.push([st.p[i], st.p[i + 1]]); return cat(p, false, .01); });
  /* road */
  const road = dShape(ROAD_D, (x, y) => [x * 4 / 3, y * 4 / 3], 3)[0].p;
  WORLD.road = road; WORLD.roadC = [PL(road)];
  WORLD.roadE1 = [PL(wobble(offsetPts(road, 30), 3, 1.2))]; WORLD.roadE2 = [PL(wobble(offsetPts(road, -30), 5, 1.2))];
  /* the deck's three icons for the three eras */
  WORLD.icons = ['open', 'ports', 'wire'].map(k => ICON[k].map(it => ({ sh: dShape(it[0], (x, y) => [x * 1.55, y * 1.55], 1.2), col: it[2] ? COL.sig : COL.ink, a: it[3] ?? 1 })));
  /* tunnel car (driver's view), from the deck's own drawing */
  const holder = document.createElementNS(SVGNS, 'svg'); holder.id = 'tunsvg'; holder.setAttribute('style', 'position:absolute;left:-9999px'); document.body.appendChild(holder);
  const tg = buildTunnelSVG();
  const grab = g => [...g.querySelectorAll('path')].map(p => ({ sh: dShape(p.getAttribute('d'), (x, y) => [x, y], 1.5), op: +(p.getAttribute('stroke-opacity') || 1), w: +(p.getAttribute('stroke-width') || 1.5) }));
  WORLD.car = { scene: grab(tg.scene), car: grab(tg.car), ws: dShape(WS_D, (x, y) => [x, y], 1.5)[0].p,
    lights: [[274, 30, 108], [275, 62, 74], [276, 95, 48], [276, 116, 28]] };
  /* logo */
  const vb = LOGO.viewBox.split(' ').map(Number); WORLD.logo = { vb, icon: new Path2D(LOGO.paths[0].d), word: new Path2D(LOGO.paths[1].d) };
  /* payload icons */
  const IS = { drugs: 'M8.5 3.5l12 12a3.5 3.5 0 0 1-5 5l-12-12a3.5 3.5 0 0 1 5-5zM9.5 9.5l5 5', radiation: 'M12 10V3M13.7 13l6 3.5M10.3 13l-6 3.5M7.5 4.4a9 9 0 0 1 9 0M20.2 9.3a9 9 0 0 1 0 5.4M3.8 9.3a9 9 0 0 0 0 5.4', energy: 'M13 2L5 13h6l-1 9 8-11h-6z' };
  WORLD.pay = {}; for (const k in IS) WORLD.pay[k] = dShape(IS[k], (x, y) => [(x - 12) * 2.2, (y - 12) * 2.2], .8);
  /* crowd */
  const r = rnd(11); WORLD.crowd = [];
  for (let i = 0; i < 66; i++) { const cx = i % 11, cy = Math.floor(i / 11), m = MARK_PTS[Math.floor(i * MARK_PTS.length / 66)];
    WORLD.crowd.push({ gx: (cx + .5) / 11 + (r() - .5) * .045, gy: .34 + (cy + .5) / 6 * .56 + (r() - .5) * .035, mx: m[0], my: m[1], s: r() }); }
  WORLD.crowd.sort((a, b) => Math.hypot(a.gx - .5, a.gy - .62) - Math.hypot(b.gx - .5, b.gy - .62));
  /* ECG trace that becomes the road */
  const ecg = [], beat = [[0, 0], [16, -9], [28, 0], [42, 0], [50, 12], [60, -132], [72, 44], [82, 0], [104, 0], [124, -24], [146, 0]];
  WORLD.xDie = 1500; let x = 80; ecg.push([40, 0]);
  while (x < 1880) { if (x < WORLD.xDie - 150 && x > 150) { for (const b of beat) ecg.push([x + b[0], b[1]]); x += 236; } else { ecg.push([x, 0]); x += 30; } }
  WORLD.ecgPts = cat(ecg.map(p => [p[0], 600 + p[1]]), false, 2).filter((p, i, a) => i === 0 || p[0] >= a[i - 1][0] - .01);
  WORLD.ecg = [PL(WORLD.ecgPts)];
  const re = [], xs = WORLD.xDie; let xx = xs; re.push([xs - 40, 0]);
  while (xx < 1880) { for (const b of beat) re.push([xx + b[0], b[1] * 1.05]); xx += 200; }
  WORLD.revive = [PL(cat(re.map(p => [p[0], 600 + p[1]]), false, 2))];
  /* the bat, the car from above, the scene they sense */
  WORLD.bat = join(hpoly([[-34, 0], [-20, -12], [0, -16], [18, -10], [30, 0], [18, 10], [0, 14], [-20, 10], [-34, 0]], 61, 1, true),
    hpoly([[-6, -12], [-30, -70], [-62, -96], [-80, -60], [-104, -64], [-118, -26], [-140, -20], [-26, -4]], 63, 1.2),
    hpoly([[-6, 12], [-30, 66], [-62, 92], [-80, 58], [-104, 62], [-118, 26], [-140, 20], [-26, 4]], 65, 1.2),
    hpoly([[28, -6], [40, -20], [42, -4]], 67, .6), hpoly([[28, 6], [40, 20], [42, 4]], 69, .6));
  WORLD.carTop = join(hbox(-95, -46, 190, 92, 71, 1.0), hline(28, -40, 28, 40, 73, -6, .8), hline(-58, -40, -58, 40, 75, 6, .8),
    hline(-95, -46, -95 + 2, -46 + 2, 77, 0, .2));
}

/* ======================= helpers used across scenes ======================= */
function bg(t) {               /* 0 = black, 1 = white */
  return Math.min(ramp(t, 87.7, 88.15), 1 - ramp(t, 137.55, 138.4));
}
function drawStrokes(list, prog, c, aMul, w = 1.4) {
  for (const s of list) { const u = ramp(prog, s.t0, s.t1); if (u <= 0) continue;
    draw(s.sh, u, { c, a: s.tone * aMul, w, ghost: false }); }
}
function person(x, y, h, c, a, lw = 1.3, deco) {    /* a small figure, the deck's silhouette */
  if (a <= .003) return; const s = h / 2.12; ctx.save(); ctx.beginPath();
  for (const pl of WORLD.sil) { ctx.moveTo(x + pl[0][0] * s, y - pl[0][1] * s); for (let k = 1; k < pl.length; k++) ctx.lineTo(x + pl[k][0] * s, y - pl[k][1] * s); }
  if (deco) { let sets = DECO[deco]; if (deco === 'tech') sets = sets.concat(DECO.techB);
    for (const pl of sets) { ctx.moveTo(x + pl[0][0] * s, y - pl[0][1] * s); for (let k = 1; k < pl.length; k++) ctx.lineTo(x + pl[k][0] * s, y - pl[k][1] * s); } }
  ctx.strokeStyle = rgba(c, a); ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
}
function personDraw(x, y, h, c, prog, a = 1, lw = 1.6) {    /* the same figure, drawn on */
  const s = h / 2.12; const sh = WORLD._silS || (WORLD._silS = WORLD.sil.map(pl => PL(pl)));
  ctx.save(); ctx.translate(x, y); ctx.scale(s, -s); draw(sh, prog, { c, a, w: lw / s, gh: .006 }); ctx.restore();
}
function logoDraw(cx, cy, h, aIcon, aWord, cIcon = '#FC6452', cWord = '#FFFFFF', full = true) {
  const L = WORLD.logo, [vx, vy, vw, vh] = L.vb, s = h / vh; ctx.save();
  if (full) ctx.translate(cx - vw * s / 2, cy - h / 2); else ctx.translate(cx - (122.066 / 2) * s, cy - h / 2);
  ctx.scale(s, s); ctx.translate(-vx, -vy);
  if (aIcon > .003) { ctx.globalAlpha = aIcon; ctx.fillStyle = cIcon; ctx.fill(L.icon); }
  if (aWord > .003) { ctx.globalAlpha = aWord; ctx.fillStyle = cWord; ctx.fill(L.word); }
  ctx.restore();
}
function grain(x, y, w, h, n, seed, c, a) { const r = rnd(seed); ctx.fillStyle = rgba(c, a); for (let i = 0; i < n; i++) ctx.fillRect(x + r() * w, y + r() * h, 1.6, 1.6); }

/* ======================= scenes ======================= */
const SCENES = [];
const scene = (a, b, fn) => SCENES.push({ a, b, fn });

/* ---------- 1. a heartbeat, a death, a second chance (0 – 18) ---------- */
scene(0, 18.2, t => {
  const P = WORLD.ecg[0], xDie = WORLD.xDie;
  const penX = t < 10.45 ? lerp(60, xDie + 40, eio(ramp(t, .2, 10.45)) * .15 + ramp(t, .2, 10.45) * .85) : lerp(xDie + 40, 1880, eo(ramp(t, 10.45, 11.6)));
  let i = 0; while (i < P.p.length - 1 && P.p[i][0] < penX) i++; const prog = P.L[i] / P.len;
  const dead = ramp(t, 10.5, 11.3), morph = eio(ramp(t, 15.9, 17.7));
  const lineA = 1 - ramp(t, 16.8, 17.9);
  if (morph <= 0) {
    draw(WORLD.ecg, prog, { c: dead > 0 ? COL.ink2 : COL.ink, a: lerp(.95, .45, dead), w: 2 });
    const h = shapeHead(WORLD.ecg, prog);
    if (prog < .999) dot(h[0], h[1], 5, dead > .5 ? COL.ink3 : COL.sig, 1 - dead * .6, 5);
    /* revived: the orange trace takes over from where it stopped */
    const rv = eo(ramp(t, wt('02', 'changed'), wt('02', 'cause') + .3));
    if (rv > 0) { draw(WORLD.revive, rv, { c: COL.sig, a: 1, w: 2.4 }); const hh = shapeHead(WORLD.revive, rv); dot(hh[0], hh[1], 6, COL.sig, 1 - ramp(rv, .97, 1), 6);
      dot(xDie - 40, 600, 7 + 30 * eo(ramp(t, wt('02', 'changed'), wt('02', 'changed') + .6)), COL.sig, 1 - ramp(t, wt('02', 'changed'), wt('02', 'changed') + .6)); }
  } else {
    /* the line straightens into the road */
    const A = resample(P.p.filter(p => p[0] < xDie - 30), 260).concat(resample(WORLD.revive[0].p, 240));
    const B = resample(WORLD.road, 500);
    const M = A.map((p, k) => [lerp(p[0], B[k][0], morph), lerp(p[1], B[k][1], morph)]);
    draw([PL(M)], 1, { c: morph < .5 ? COL.ink2 : COL.sig, a: .55 + .45 * morph, w: lerp(2, 2.6, morph) });
  }
  const a0 = env(t, .9, 6.0, .5, .7);
  say('Surgery is the closest|modern medicine has come|to defeating death.', 960, 250 - 30 * ramp(t, 5.4, 6.2), { seg: '00', size: 66, align: 'center', em: ['modern', 'medicine'], a: a0 });
  say('If something broke deep inside you,|you either recovered…', 960, 300, { seg: '01', size: 52, align: 'center', a: env(t, 5.7, 10.2, .4, .4), color: rgba(COL.ink2, 1) });
  say('…or you died.', 960, 330, { seg: '01', t: wt('01', 'or'), at: wt('01', 'died') - .1, size: 64, align: 'center', a: env(t, 10.1, 11.6, .3, .5), color: rgba(COL.ink3, 1) });
  say('Surgery changed that.', 960, 300, { seg: '02', size: 64, align: 'center', a: env(t, 11.6, 15.8, .3, .5) });
  say('Fix the anatomy.   Remove the cause.', 960, 840, { seg: '02', size: 46, align: 'center', em: ['fix', 'remove'], a: env(t, 13.2, 15.9, .3, .5) });
});

/* ---------- 2. the road: 150 years of getting in with less (16 – 33) ---------- */
const ROADT = () => ({ s: 17.7, a: wt('04', 'opening'), b: wt('05', 'small'), c: wt('06', 'travelling'), e: 32.0 });
const STOPS = [.20, .47, .735];
function roadU(t) { const R = ROADT();
  const keys = [[R.s, 0], [R.a, STOPS[0]], [R.a + .9, STOPS[0] + .02], [R.b, STOPS[1]], [R.b + .9, STOPS[1] + .02], [R.c, STOPS[2]], [R.c + 1.2, STOPS[2] + .03], [R.e, 1]];
  if (t <= keys[0][0]) return 0; for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], eio(ramp(t, keys[i - 1][0], keys[i][0]))); return 1; }
function roadDraw(t, aAll, u, iconsA, labelsA, reveal = true) {
  const edges = t > 50 ? 1 : ramp(t, 17.4, 18.6);
  draw(WORLD.roadE1, edges, { c: COL.ink2, a: .55 * aAll, w: 1.6 }); draw(WORLD.roadE2, edges, { c: COL.ink2, a: .55 * aAll, w: 1.6 });
  draw(WORLD.roadC, 1, { c: COL.ink3, a: .5 * aAll * (t > 50 ? 1 : ramp(t, 17.8, 18.6)), w: 1.4, dash: [14, 16], ghost: false });
  draw(WORLD.roadC, u, { c: COL.sig, a: aAll, w: 3.2 });
  const h = plAt(WORLD.roadC[0], u); dot(h[0], h[1], 8, COL.sig, aAll, 5);
  const R = ROADT(), times = [R.a, R.b, R.c];
  const L = [['Open surgery', 'see it · touch it · feel it'], ['Small incisions', 'touch lost · vision kept'], ['Vascular highways', 'navigate from the inside']];
  STOPS.forEach((su, k) => {
    const p = plAt(WORLD.roadC[0], su), up = p[1] > 540; const ox = p[0] - 100, oy = up ? p[1] - 300 : p[1] + 70;
    const pr = reveal ? ramp(t, times[k] - .5, times[k] + 1.0) : 1, a = (iconsA ?? 1) * aAll; if (pr <= 0) return;
    ring(p[0], p[1], 16, COL.sig, a * .9 * (reveal ? ramp(t, times[k] - .4, times[k]) : 1), 1.4);
    ctx.save(); ctx.translate(ox, oy); for (const it of WORLD.icons[k]) draw(it.sh, pr, { c: it.col, a: a * it.a, w: 1.6 }); ctx.restore();
    const la = a * (labelsA ?? 1) * (reveal ? sm(ramp(t, times[k] - .1, times[k] + .5)) : 1);
    label(L[k][0], ox + 220, oy + 70, { font: 'serif', size: 38, weight: 300, color: rgba(COL.sig, 1), a: la });
    label(L[k][1], ox + 220, oy + 108, { size: 24, color: rgba(COL.ink2, 1), a: la * .9 });
  });
}
scene(16.8, 34.2, t => {
  const out = ramp(t, 31.4, 32.6);
  const u = roadU(t), h = plAt(WORLD.roadC[0], u);
  const z = lerp(1, 7, ei(out)), c = { x: lerp(lerp(960, h[0], .22), h[0], ei(out)), y: lerp(540, h[1], ei(out)), z };
  cam(c, () => roadDraw(t, 1 - ramp(t, 32.4, 33.2), u, 1 - .7 * ramp(t, 31.2, 31.8), 1 - ramp(t, 30.9, 31.5)));
  say('But first, you have to get inside.', 120, 150, { seg: '03', size: 48, a: env(t, 17.0, 19.0, .3, .5) });
  say('For a hundred and fifty years:|less and less invasive.', 120, 140, { seg: '03', size: 48, em: ['less', 'invasive'], a: env(t, 18.8, 23.4, .4, .5) });
  const yr = Math.round(lerp(1870, 2026, cl(u / .98)));
  label(String(yr), 1800, 150, { font: 'mono', size: 34, align: 'right', color: rgba(COL.ink2, 1), a: env(t, 18.9, 32.0, .5, .5) * .85 });
  label('YEAR', 1800, 100, { font: 'mono', size: 16, align: 'right', ls: 3, color: rgba(COL.ink3, 1), a: env(t, 18.9, 32.0, .5, .5) * .8 });
});

/* ---------- 3. the body: a needle, a route, a network (32.4 – 76) ---------- */
function bodyCam(t) {
  const A = WORLD.ACC;
  return camAt([[32.6, { x: A[0], y: A[1], z: 7 }], [35.4, { x: 0, y: 30, z: .92 }], [38.4, { x: 0, y: 10, z: 1.0 }], [39.6, { x: -300, y: 10, z: 1.06 }],
    [44.0, { x: -300, y: 10, z: 1.08 }], [45.2, { x: 520, y: 10, z: 1.06 }], [52.6, { x: 520, y: 10, z: 1.08 }], [53.6, { x: 430, y: 10, z: 1.04 }],
    [56.3, { x: 430, y: 10, z: 1.06 }], [57.4, { x: 0, y: 10, z: 1.0 }], [66.6, { x: 0, y: 10, z: 1.03 }], [67.8, { x: 0, y: 40, z: .96 }], [72.4, { x: 0, y: 40, z: 1.0 }]], t);
}
scene(32.4, 76.2, t => {
  const A = WORLD.ACC, aIn = ramp(t, 32.4, 33.0);
  let c = bodyCam(t);
  const dive = ei(ramp(t, 72.4, 75.6)); if (dive > 0) c = { x: lerp(c.x, A[0], Math.min(1, dive * 3)), y: lerp(c.y, A[1], Math.min(1, dive * 3)), z: c.z * Math.exp(dive * 4.6) };
  const fadeAll = 1 - ramp(t, 74.8, 75.7);
  cam(c, () => {
    const roomA = aIn * (1 - ramp(t, 38.6, 40.2)) * fadeAll, figA = aIn * fadeAll * (1 - .5 * dive);
    drawStrokes(WORLD.room, ramp(t, 32.8, 35.6) * .33, COL.room, roomA * .9, 1.3);
    drawStrokes(WORLD.rig, ramp(t, 33.0, 35.8) * .33, COL.room, roomA, 1.4);
    drawStrokes(WORLD.fig, ramp(t, 33.0, 37.4), COL.ink, figA * .95, 1.3);
    /* wrist and groin */
    const tw = wt('07', 'wrist'), tg = wt('07', 'groin');
    for (const [x, y, tt] of [[.255 * 440, .13 * 440, tw], [A[0], A[1], tg]]) { const k = ramp(t, tt - .1, tt + .9);
      if (k > 0 && k < 1) ring(x, y, 6 + 40 * eo(k), COL.sig, (1 - k) * fadeAll, 2); }
    /* the needle */
    const nk = eo(ramp(t, tg - .5, tg + .1)), nOut = ramp(t, 36.4, 37.2);
    if (nk > 0 && nOut < 1) { const sx = A[0] + 150, sy = A[1] + 120; ctx.save(); ctx.strokeStyle = rgba(COL.sig, 1 - nOut); ctx.lineWidth = 2.4; ctx.beginPath();
      ctx.moveTo(lerp(sx + 60, sx, nk), lerp(sy + 48, sy, nk)); ctx.lineTo(lerp(sx, A[0] + 4, nk), lerp(sy, A[1] + 3, nk)); ctx.stroke(); ctx.restore(); }
    /* the arterial tree, then traffic on it */
    const treeP = ramp(t, wt('08', 'vascular') - .2, wt('08', 'network') + .4), treeA = figA * (1 - .55 * ramp(t, 67.4, 68.4));
    for (const b of WORLD.br) { const u = ramp(treeP, b.t0, b.t1); if (u > 0) draw(b.sh, u, { c: COL.warm, a: .9 * treeA, w: 2.2 }); }
    const traffic = ramp(t, wt('08', 'transportation'), wt('08', 'network') + .5) * (1 - ramp(t, 44.0, 45.4)) * fadeAll;
    if (traffic > 0) WORLD.br.forEach((b, i) => { const n = 3; for (let k = 0; k < n; k++) { const u = ((t - 39.5) * .32 + k / n + i * .13) % 1; const p = plAt(b.sh[0], u);
      dot(p[0], p[1], 3.2, COL.sig, traffic * sm(u * 6) * sm((1 - u) * 6), 3); } });
    /* organs the network reaches */
    const orgT = { brain: 41.5, heart: 41.8, lungL: 42.1, lungR: 42.2, liver: 42.5, kidL: 42.8, kidR: 42.9, uterus: 43.1, leg: 43.3 };
    for (const k in orgT) { const o = WORLD.org[k], pr = ramp(t, orgT[k], orgT[k] + .6), oa = (1 - ramp(t, 44.2, 45.2)) * fadeAll;
      if (pr > 0) { draw(o.sh, pr, { c: COL.ink2, a: .7 * oa, w: 1.4 }); const kk = ramp(t, orgT[k] + .3, orgT[k] + 1.3); if (kk < 1) ring(o.c[0], o.c[1], 8 + 26 * eo(kk), COL.sig, (1 - kk) * oa, 1.6); } }
    /* the instrument's route, groin to heart */
    const rp = eio(ramp(t, wt('07', 'instrument') - .1, wt('07', 'body') + .2));
    const glow = 1 + .8 * Math.sin(ramp(t, 67.6, 71.0) * Math.PI);
    if (rp > 0) { draw(WORLD.route, rp, { c: COL.sig, a: fadeAll, w: 3.4 * glow, glow: 10 * glow });
      const h = shapeHead(WORLD.route, rp); dot(h[0], h[1], 6, COL.sig, fadeAll, 6); }
    const runK = ramp(t, 68.2, 71.2); if (runK > 0 && runK < 1) { const h = shapeHead(WORLD.route, 1 - runK); dot(h[0], h[1], 7, COL.sig2, sm(runK * 5) * sm((1 - runK) * 5), 8); }
    /* access point */
    ring(A[0], A[1], 22, COL.sig, ramp(t, 66.8, 67.6) * fadeAll, 2);
    /* reach: where the vessels go now */
    reachLayer(t);
  });
  /* words */
  say('The vascular system is a|transportation network.', 120, 470, { seg: '08', size: 58, em: ['transportation', 'network'], a: env(t, 38.6, 44.2, .4, .6) });
  say('reaching almost every major organ', 120, 640, { seg: '08', font: 'sans', size: 28, color: rgba(COL.ink2, 1), a: env(t, 41.3, 44.2, .4, .6) });
  payoffLayer(t);
  say('One of the greatest|substitution stories|in medicine.', 1060, 430, { seg: '10', size: 66, em: ['substitution'], a: env(t, 52.9, 56.6, .4, .6) });
  say('We can reach deep inside the human body…', 960, 930, { seg: '12', size: 46, align: 'center', a: env(t, 67.1, 72.2, .4, .5) });
  say('without opening it.', 960, 995, { seg: '12', size: 46, align: 'center', em: ['without', 'opening', 'it'], a: env(t, 69.6, 72.2, .3, .5) });
  say('But follow the instrument in,', 960, 900, { seg: '13', size: 50, align: 'center', a: env(t, 72.2, 75.4, .3, .5) });
  say('and you’ll find the tradeoff.', 960, 970, { seg: '13', size: 50, align: 'center', em: ['tradeoff'], a: env(t, 73.8, 75.6, .3, .4) });
});
/* the payoff: an incision that shrinks to a point, and four bars that shrink as they are named */
function payoffLayer(t) {
  const a = env(t, 44.3, 53.0, .4, .6); if (a <= .003) return;
  say('The payoff is enormous.', 940, 210, { seg: '09', size: 62, a });
  const tl = wt('09', 'large'), ti = we('09', 'incision');
  const draw1 = eo(ramp(t, tl - .2, tl + .5)), shrink = eio(ramp(t, ti - .1, ti + .7));
  const cx = 1120, cy = 420, half = 170 * (1 - shrink);
  if (draw1 > 0) { ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(shrink > .9 ? COL.sig : COL.ink2, a); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - half * draw1, cy); ctx.lineTo(cx + half * draw1, cy); ctx.stroke();
    ctx.lineWidth = 1.6; for (let k = -6; k <= 6; k++) { const x = cx + k * 26 * (1 - shrink); if (Math.abs(x - cx) > half * draw1) continue;
      ctx.beginPath(); ctx.moveTo(x - 4, cy - 12 * (1 - shrink)); ctx.lineTo(x + 4, cy + 12 * (1 - shrink)); ctx.stroke(); } ctx.restore();
    if (shrink > 0) dot(cx, cy, 6 * sm(shrink * 3), COL.sig, a, 5); }
  label('a large incision', cx, cy + 60, { align: 'center', size: 24, color: rgba(COL.ink3, 1), a: a * draw1 * (1 - shrink) });
  label('a needle-sized point', cx, cy + 60, { align: 'center', size: 24, color: rgba(COL.sig, 1), a: a * shrink });
  const bars = [['Trauma', 'trauma', .34], ['Recovery', 'recovery', .3], ['Hospital stay', 'stays', .22], ['Cost', 'costs', .4]];
  const base = 900, x0 = 1340, dx = 135, Hh = 300;
  bars.forEach(([lab, w, ratio], k) => { const tb = wt('09', w), x = x0 + k * dx;
    const up = eo(ramp(t, 47.0 + k * .12, 47.6 + k * .12)), dn = eio(ramp(t, tb - .1, tb + .7)), h = Hh * up * lerp(1, ratio, dn);
    if (up <= 0) return; ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = dn > .02 ? rgba(COL.sig, .9) : rgba(COL.ink3, .55); ctx.fillRect(x - 34, base - h, 68, h);
    if (dn > 0) { ctx.setLineDash([5, 6]); ctx.strokeStyle = rgba(COL.ink3, .8); ctx.lineWidth = 1.3; ctx.strokeRect(x - 34, base - Hh * up, 68, Hh * up - h); ctx.setLineDash([]); }
    ctx.restore(); label(lab, x, base + 40, { align: 'center', size: 22, color: rgba(dn > .5 ? COL.sig : COL.ink2, 1), a: a * up }); });
  draw(hline(x0 - 80, base, x0 + 3 * dx + 80, base, 81, 0, 1), eo(ramp(t, 46.8, 47.6)), { c: COL.ink2, a: a * .8, w: 1.5 });
}
/* reach: the old uses on the left, the new ones on the right, therapies travelling to them */
function reachLayer(t) {
  const a = env(t, 56.6, 67.6, .4, .8); if (a <= .003) return; const O = WORLD.org;
  const L = [['coronary arteries', O.heart, wt('11', 'hearts'), -1, -.03], ['strokes', O.brain, wt('11', 'hearts') + .25, -1, 0], ['aneurysms', { c: [0, -.30 * 440] }, wt('11', 'arteries'), -1, 0], ['limbs', O.leg, wt('11', 'arteries') + .3, -1, 0],
    ['liver · tumors', O.liver, wt('11', 'tumors'), 1, 0], ['uterus · fibroids', O.uterus, wt('11', 'fibroids'), 1, 0], ['lungs', O.lungR, wt('11', 'lungs'), 1, 0]];
  L.forEach(([txt, o, tt, side, dy], k) => { const pr = ramp(t, tt - .2, tt + .5); if (pr <= 0) return;
    const [ox, oy] = o.c, lx = side < 0 ? -470 : 440, ly = oy + (side < 0 ? 0 : 0);
    const orange = side > 0; if (o.sh) draw(o.sh, pr, { c: orange ? COL.sig : COL.ink2, a: a * .85, w: 1.6 });
    dot(ox, oy, 4.5, orange ? COL.sig : COL.ink, a * sm(pr * 3), orange ? 4 : 0);
    draw([PL([[ox + side * 12, oy], [lx - side * 14, ly]])], eo(pr), { c: orange ? COL.sig : COL.ink2, a: a * .6, w: 1.1, ghost: false });
    label(txt, lx, ly + 9, { align: side < 0 ? 'right' : 'left', font: orange ? 'serif' : 'sans', size: orange ? 34 : 26, weight: orange ? 300 : 400, color: rgba(orange ? COL.sig : COL.ink2, 1), a: a * sm(ramp(t, tt, tt + .5)) }); });
  /* therapies travel from the access point to where they are needed */
  const P = [['drugs', O.liver], ['radiation', O.lungR], ['energy', O.uterus]];
  P.forEach(([k, o], i) => { const t0 = wt('11', k), u = eio(ramp(t, t0, t0 + 1.6)); if (u <= 0) return;
    const A = WORLD.ACC, path = [PL(cat([A, [A[0] - 20, A[1] - 60], [4, -40], [6, o.c[1] + 30], [o.c[0] * .6, o.c[1] + 4], o.c], false, 3))];
    const h = shapeHead(path, u), fade = a * (1 - ramp(t, t0 + 1.6, t0 + 2.6));
    draw(path, u, { c: COL.sig, a: fade * .5, w: 1.4, ghost: false });
    ctx.save(); ctx.translate(h[0], h[1] - 34); ctx.scale(.9, .9); draw(WORLD.pay[k], 1, { c: COL.sig, a: fade, w: 2.2, ghost: false }); ctx.restore();
    label(k, h[0], h[1] - 70, { align: 'center', font: 'mono', size: 18, color: rgba(COL.sig, 1), a: fade * .9 });
    const kk = ramp(t, t0 + 1.5, t0 + 2.4); if (kk > 0 && kk < 1) ring(o.c[0], o.c[1], 10 + 50 * eo(kk), COL.sig, (1 - kk) * a, 2.2); });
}

/* ---------- 4. inside the vessel, where the light goes out (74.6 – 81.4) ---------- */
scene(74.6, 81.6, t => {
  const a = ramp(t, 74.8, 75.8) * (1 - ramp(t, 80.4, 81.4));
  const tp = wt('14', 'perception');
  TUN.draw(lerp(.015, .085, ramp(t, 74.6, 81.4)), { a, span: 330, roll: t * .05,
    bright: (d) => 1 - ramp(t, tp - .2 + (1 - d) * 1.3, tp + .5 + (1 - d) * 1.3) * .93 });
  /* the entry ring, carried over from the access point */
  const k = ramp(t, 74.6, 75.9); if (k < 1) ring(W / 2, H / 2, lerp(950, 140, eo(k)), COL.sig, (1 - k) * .9, 3);
  say('As the incision disappeared…', 960, 380, { seg: '14', size: 56, align: 'center', a: env(t, 75.6, 80.8, .3, .6) });
  say('direct human perception|disappeared with it.', 960, 520, { seg: '14', size: 64, align: 'center', em: ['direct', 'human', 'perception'], a: env(t, 77.3, 80.9, .3, .6) });
});

/* ---------- 5. a metre away, millimetres wide, out of sight (80.4 – 88.2) ---------- */
scene(80.4, 88.3, t => {
  const a = env(t, 80.5, 88.0, .5, .4);
  const hx = 330, hy = 610;
  personDraw(250, 640, 470, COL.ink, ramp(t, 80.5, 81.6), a * .9, 1.6);
  /* the body the instrument travels inside: an opaque band */
  const wallA = a * ramp(t, 81.0, 81.8);
  ctx.save(); ctx.fillStyle = rgba('30,26,26', wallA * .95); ctx.fillRect(1060, 330, 760, 560); ctx.restore();
  draw(hbox(1060, 330, 760, 560, 91, 1.4), ramp(t, 81.0, 81.8), { c: COL.ink3, a: wallA, w: 1.4 });
  label('inside the body', 1080, 365, { font: 'mono', size: 18, color: rgba(COL.ink3, 1), a: wallA });
  /* the catheter, hand to tip */
  const cath = [PL(cat([[hx, hy], [520, 640], [760, 600], [980, 620], [1160, 600], [1380, 640], [1560, 600], [1640, 610]], false, 3))];
  const cp = eio(ramp(t, 80.9, wt('15', 'hands') + .2)); draw(cath, cp, { c: COL.sig, a, w: 2.6 });
  const tip = shapeHead(cath, cp); dot(tip[0], tip[1], 5, COL.sig, a, 5);
  /* a metre */
  const mt = wt('15', 'meter'), mk = eo(ramp(t, mt - .2, mt + .6));
  if (mk > 0) { const y = 280; draw(join(hline(hx, y, lerp(hx, 1640, mk), y, 93, 0, .8), hline(hx, y - 14, hx, y + 14, 95, 0, .4), hline(1640, y - 14, 1640, y + 14, 97, 0, .4)), 1, { c: COL.ink2, a: a * (mk >= 1 ? 1 : mk), w: 1.4, ghost: false });
    label('≈ 1 metre', (hx + 1640) / 2, y - 22, { align: 'center', font: 'mono', size: 30, color: rgba(COL.ink, 1), a: a * mk }); }
  /* millimetres: a magnified cross-section of the vessel around the tip */
  const mm = eo(ramp(t, wt('15', 'millimeters') - .2, wt('15', 'millimeters') + .6));
  if (mm > 0) { const R = 110 * mm; ctx.save(); ctx.beginPath(); ctx.arc(1640, 610, R, 0, 7); ctx.fillStyle = rgba('40,14,14', a * .9); ctx.fill(); ctx.restore();
    draw(hoval(1640, 610, R, R, 99, .04), 1, { c: COL.sig2, a: a * mm, w: 2 }); dot(1640, 610, 7, COL.sig, a, 6);
    label('≈ 4 mm', 1640, 610 + R + 44, { align: 'center', font: 'mono', size: 28, color: rgba(COL.ink, 1), a: a * mm }); }
  /* line of sight: the eye looks, the body is in the way */
  const ls = wt('15', 'line'), lk = ramp(t, ls - .6, ls + .5);
  if (lk > 0) { const ex = 286, ey = 395; draw(join(hpoly([[ex - 26, ey], [ex, ey - 13], [ex + 26, ey], [ex, ey + 13], [ex - 26, ey]], 101, .6, false)), eo(lk * 2), { c: COL.ink, a, w: 1.6 }); dot(ex + 2, ey, 5, COL.ink, a * sm(lk * 2));
    const end = lerp(ex + 40, 1056, eo(lk)); ctx.save(); ctx.setLineDash([10, 10]); ctx.strokeStyle = rgba(COL.ink2, a * .9); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ex + 40, ey + 8); ctx.lineTo(end, ey + 8 + (end - ex) * .17); ctx.stroke(); ctx.restore();
    const xk = ramp(t, ls + .3, ls + .7); if (xk > 0) { const x = 1050, y = ey + 8 + (1050 - ex) * .17; draw(join(hline(x - 16, y - 16, x + 16, y + 16, 103, 0, .5), hline(x + 16, y - 16, x - 16, y + 16, 105, 0, .5)), xk, { c: COL.sig, a, w: 3 }); } }
  say('no line of sight', 960, 990, { seg: '15', t: wt('15', 'no'), size: 46, align: 'center', em: ['sight'], a: env(t, wt('15', 'no') - .1, 88.0, .3, .4) });
});

/* ---------- 6. what they see (87.6 – 96) — white ---------- */
const IMG = {};
scene(87.4, 96.4, t => {
  /* a white circle opens from the tip */
  const wk = ramp(t, 87.5, 88.15); if (wk < 1) { ctx.save(); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(1640, 610, 2300 * ei(wk), 0, 7); ctx.fill(); ctx.restore(); }
  const a = ramp(t, 87.9, 88.3) * (1 - ramp(t, 95.7, 96.3));
  const slide = eio(ramp(t, 89.6, 90.4));
  const mw = lerp(720, 520, slide), mh = mw * .75, mx = lerp(960, 470, slide) - mw / 2, my = lerp(150, 230, slide);
  /* the monitor: a fluoroscopy feed, flickering, grainy */
  ctx.save(); ctx.globalAlpha = a; ctx.beginPath(); ctx.rect(mx, my, mw, mh); ctx.clip();
  const fi = Math.floor(t / .42) % 2, im = fi ? IMG.b : IMG.a;
  if (im) { const iw = im.naturalWidth, ih = im.naturalHeight, crop = fi ? [0, 40, iw, ih - 40] : [130, 200, iw - 130, 560];
    const fl = .82 + .18 * Math.sin(t * 23) * Math.sin(t * 7.1); ctx.filter = `brightness(${fl}) contrast(1.15)`;
    ctx.drawImage(im, crop[0], crop[1], crop[2], crop[3], mx, my, mw, mh); ctx.filter = 'none'; }
  grain(mx, my, mw, mh, 1600, Math.floor(t * 24), '0,0,0', .18); grain(mx, my, mw, mh, 900, Math.floor(t * 24) + 9, '255,255,255', .14);
  ctx.restore();
  draw(hbox(mx - 10, my - 10, mw + 20, mh + 20, 111, 1.2), ramp(t, 87.9, 88.5), { c: DARK, a, w: 1.8 });
  say('This is what they see.', mx + mw / 2, my + mh + 80, { seg: '17', size: lerp(54, 40, slide), align: 'center', color: rgba(DARK, 1), a });
  /* the drive: a tunnel through a windscreen, then no lights, then no windows */
  const ca = a * ramp(t, 89.8, 90.2); if (ca <= .003) return;
  const ox = 820, oy = 210, s = 1.9, C = WORLD.car;
  const lightsOff = ramp(t, wt('18', 'lights') - .1, wt('18', 'lights') + .3), blind = ramp(t, wt('18', 'windows') - .1, wt('18', 'windows') + .3);
  ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
  ctx.save(); ctx.beginPath(); C.ws.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.clip();
  for (const L of C.scene) draw(L.sh, ramp(t, 89.9, 90.9), { c: DARK, a: ca * L.op * (1 - .75 * lightsOff), w: 1.3 / s * 1.4, gh: .6 });
  for (const [x, y, w] of C.lights) { const la = ca * (1 - lightsOff) * ramp(t, 90.3, 90.8);
    ctx.fillStyle = rgba(COL.gold, .95 * la); ctx.beginPath(); ctx.roundRect(x - w / 2, y, w, 6, 3); ctx.fill();
    for (const [rx, ry, al] of [[1.15, 17, .22], [1.7, 26, .09]]) { ctx.fillStyle = rgba(COL.gold, al * la); ctx.beginPath(); ctx.ellipse(x, y + 3, w * rx, ry, 0, 0, 7); ctx.fill(); } }
  ctx.fillStyle = rgba('11,7,8', .82 * lightsOff * (1 - blind) * ca); ctx.fillRect(0, 0, 520, 170);
  ctx.fillStyle = rgba('234,232,231', blind * ca); ctx.fillRect(0, 0, 520, 170);
  /* grainy snapshots, now and then */
  for (const ts of [wt('19', 'grainy'), wt('19', 'satellite'), wt('19', 'snapshots') + .2]) { const k = ramp(t, ts, ts + .45); if (k <= 0 || k >= 1) continue;
    const fa = Math.sin(k * Math.PI) * ca; for (const L of C.scene) draw(L.sh, 1, { c: DARK, a: fa * .5 * L.op, w: 1.2 / s * 1.4, ghost: false });
    grain(40, 6, 470, 160, 2600, Math.floor(ts * 10), '11,7,8', .35 * fa); }
  ctx.restore();
  for (const L of C.car) draw(L.sh, ramp(t, 89.8, 90.7), { c: DARK, a: ca * L.op, w: L.w / s * 1.25, gh: .6 });
  ctx.restore();
  say('Like driving through a tunnel.', ox + 520 * s / 2, 860, { seg: '18', size: 40, align: 'center', color: rgba(DARK, 1), a: ca });
  say('Without lights.  Without windows.', ox + 520 * s / 2, 920, { seg: '18', t: wt('18', 'without'), size: 40, align: 'center', em: ['lights', 'windows'], color: rgba(DARK, 1), a: ca });
  say('Just grainy snapshots.', ox + 520 * s / 2, 980, { seg: '19', size: 34, align: 'center', color: rgba(COL.ink3, 1), a: ca });
});

/* ---------- 7. one human at a time (95.8 – 116) — white ---------- */
scene(95.8, 116.3, t => {
  const a1 = env(t, 96.0, 103.4, .4, .6);
  /* the expert, and the copies that do not hold */
  const px = 1240, py = 640, ph = 520;
  if (a1 > .003) {
    const xp = ramp(t, wt('20', 'expertise') - .2, wt('20', 'expertise') + .6);
    if (xp > 0) { ctx.save(); const g = ctx.createRadialGradient(px, py - 90, 0, px, py - 90, 330); g.addColorStop(0, rgba(COL.sig, .22 * a1 * eo(xp))); g.addColorStop(1, rgba(COL.sig, 0)); ctx.fillStyle = g; ctx.fillRect(px - 400, py - ph - 200, 800, 800); ctx.restore(); }
    personDraw(px, py, ph, DARK, ramp(t, 96.2, 97.4), a1, 2);
    if (ramp(t, 97.0, 97.6) > 0) person(px, py, ph, DARK, a1 * ramp(t, 97.0, 97.6), 2, 'surgeon');
    const sc = wt('20', 'scale');
    [[1560, .55], [1760, .45], [1910, .35]].forEach(([x, sz], i) => { const k = ramp(t, sc - .2 + i * .15, sc + .5 + i * .15), fail = ramp(t, sc + .6 + i * .15, sc + 1.2 + i * .15);
      if (k <= 0) return; const fl = .5 + .5 * Math.sin(t * 40 + i * 2); ctx.save(); ctx.setLineDash([6, 7]); person(x, py, ph * sz * 1.4, DARK, a1 * .55 * k * (1 - fail) * (fail > 0 ? fl : 1), 1.4); ctx.restore(); });
    say('Extraordinary medicine…', 120, 330, { seg: '20', size: 64, color: rgba(DARK, 1), a: a1 });
    say('that is extraordinarily|hard to scale.', 120, 430, { seg: '20', size: 64, em: ['hard', 'to', 'scale'], color: rgba(DARK, 1), a: a1 });
    say('It takes extreme expertise.', 120, 230, { seg: '20', font: 'sans', size: 30, color: rgba(COL.dark2, 1), a: a1 * (1 - ramp(t, 98.6, 99.2)) });
  }
  /* a hundred billion dollars, one human at a time */
  const a2 = env(t, 103.0, 111.8, .4, .6);
  if (a2 > .003) {
    const cnt = Math.round(100 * eo(ramp(t, wt('21', 'hundredbilliondollar') - .2, wt('21', 'industry') + .2)));
    label('$' + cnt + 'B', 120, 260, { font: 'serif', size: 150, weight: 300, color: rgba(COL.sig, 1), a: a2 });
    say('industry, still scaling|one human at a time.', 120, 350, { seg: '21', t: wt('21', 'still'), size: 46, em: ['one', 'human'], color: rgba(DARK, 1), a: a2 });
    /* the team: role names as column headers above, rows of people below; a row per operation */
    const R = [['Operation', null], ['Surgeon', 'surgeon'], ['Resident', 'resident'], ['Scrub nurse', 'scrub'], ['Circulating nurse', 'circ'], ['Radiology tech', 'tech']];
    const two = ramp(t, wt('21', 'twice') - .1, wt('21', 'twice') + .5), many = eio(ramp(t, wt('21', 'people') - .2, wt('21', 'people') + .8));
    const h = lerp(lerp(190, 150, two), 88, many), y0 = lerp(lerp(640, 590, two), 545, many), dy = lerp(205, 104, many);
    const nRows = 5, colX = i => 790 + i * 192, headY = y0 - h * .62 - 26;
    R.forEach(([lab, deco], i) => { const x = colX(i), k = ramp(t, wt('21', 'one') - .2 + i * .12, wt('21', 'one') + .3 + i * .12); if (k <= 0) return;
      const pat = i === 0;
      label(lab, x, headY, { align: 'center', size: 21, color: rgba(pat ? COL.sig : COL.dark2, 1), a: a2 * k });
      for (let r = 0; r < nRows; r++) { const v = r === 0 ? 1 : r === 1 ? two : ramp(many, (r - 2) * .22, (r - 2) * .22 + .4); if (v <= .01) continue;
        person(x, y0 + r * dy, h, pat ? COL.sig : DARK, a2 * k * v, pat ? 1.6 : 1.2, deco); } });
    const tw = wt('21', 'twice');
    label('×2', colX(0) - 120, y0 + dy + 14, { font: 'serif', size: 46, align: 'center', color: rgba(COL.sig, 1), a: a2 * ramp(t, tw, tw + .4) * (1 - many) });
    label('×5', colX(0) - 120, y0 + 2 * dy + 14, { font: 'serif', size: 46, align: 'center', color: rgba(COL.sig, 1), a: a2 * many });
  }
  /* the straight line, and the curve we are after */
  const a3 = env(t, 111.4, 116.0, .5, .5);
  if (a3 > .003) {
    const gx = 220, gy = 880, gw = 560, gh = 420;
    draw(join(hline(gx, gy, gx + gw, gy, 121, 0, .8), hline(gx, gy, gx, gy - gh, 123, 0, .8)), ramp(t, 111.4, 112.0), { c: DARK, a: a3, w: 1.6 });
    label('people', gx + gw, gy + 36, { align: 'right', size: 22, color: rgba(COL.dark2, 1), a: a3 }); label('operations', gx - 16, gy - gh + 8, { align: 'right', size: 22, color: rgba(COL.dark2, 1), a: a3 });
    draw(hline(gx, gy, gx + gw * .92, gy - gh * .62, 125, 0, 1), eo(ramp(t, 111.8, 112.6)), { c: DARK, a: a3, w: 2.2 });
    label('linear', gx + gw * .95, gy - gh * .62 + 6, { size: 22, font: 'mono', color: rgba(COL.dark2, 1), a: a3 * ramp(t, 112.4, 112.9) });
    const cu = [PL(cat(Array.from({ length: 30 }, (_, i) => { const u = i / 29; return [gx + gw * .8 * u, gy - gh * (.5 * u + .55 * Math.pow(u, 3.2))]; }), false, 3))];
    draw(cu, eo(ramp(t, wt('22', 'very') - .2, wt('22', 'surgeons') + .4)), { c: COL.sig, a: a3, w: 2.6, dash: [12, 10] });
    label('?', gx + gw * .84, gy - gh * 1.02, { font: 'serif', size: 96, color: rgba(COL.sig, 1), a: a3 * ramp(t, 114.0, 114.5) });
    say('What would it take to scale|the very best surgeons?', 960, 480, { seg: '22', size: 56, em: ['very', 'best'], color: rgba(DARK, 1), a: a3 });
  }
});

/* ---------- 8. where am I? what's around me? (115.6 – 137.6) — white ---------- */
scene(115.6, 137.8, t => {
  const head = env(t, 118.2, 126.8, .4, .6);
  const q1 = wt('23', 'where'), q2 = wt('23', 'whats');
  /* the navigator: a dot finding its way */
  const n1 = env(t, 115.6, 120.3, .4, .5);
  if (n1 > .003) { const tr = [PL(cat([[200, 760], [480, 640], [760, 700], [960, 560]], false, 3))]; const p = ramp(t, 115.7, 117.4);
    draw(tr, eo(p), { c: COL.dark2, a: n1 * .5, w: 1.6, dash: [8, 10], ghost: false }); const h = shapeHead(tr, eo(p)); dot(h[0], h[1], 10, COL.sig, n1, 4);
    say('Where am I?', 900, 470, { seg: '23', size: 72, align: 'right', em: ['where', 'am', 'i'], a: n1 });
    say('And what’s around me?', 1020, 700, { seg: '23', size: 72, color: rgba(DARK, 1), a: n1 });
    for (let k = 0; k < 3; k++) { const kk = ramp(t, q2 + .1 + k * .25, q2 + 1 + k * .25); if (kk > 0 && kk < 1) ring(960, 560, 20 + 160 * eo(kk), COL.sig, (1 - kk) * n1, 1.4); } }
  label('Where am I?   /   What’s around me?', 960, 110, { align: 'center', font: 'serif', size: 40, weight: 300, color: rgba(COL.sig, 1), a: env(t, 120.2, 126.8, .5, .6) });
  /* a bat: sound out, echoes back, the dark gets a shape */
  const ab = env(t, 120.0, 122.6, .4, .5);
  if (ab > .003) { const bx = 460, by = 560, t0 = wt('23', 'ultrasound') - .5;
    ctx.save(); ctx.translate(bx, by); ctx.scale(1.25, 1.25); draw(WORLD.bat, ramp(t, 120.0, 120.7), { c: DARK, a: ab, w: 1.6 }); ctx.restore();
    const objs = [{ sh: hoval(1060, 470, 34, 22, 131), c: [1060, 470] }, { sh: hpoly([[1300, 260], [1330, 420], [1320, 600], [1340, 820]], 133, 2), c: [1320, 540] }];
    for (let k = 0; k < 6; k++) { const ts = t0 + k * .32, kk = ramp(t, ts, ts + 1.6); if (kk <= 0 || kk >= 1) continue;
      ctx.save(); ctx.strokeStyle = rgba(COL.sig, (1 - kk) * ab); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(bx + 50, by, 30 + 900 * kk, -.55, .55); ctx.stroke(); ctx.restore(); }
    objs.forEach(o => { const d = Math.hypot(o.c[0] - bx - 50, o.c[1] - by), th = t0 + (d - 30) / 900 * 1.6; const rv = ramp(t, th, th + .5);
      draw(o.sh, rv, { c: DARK, a: ab * .9, w: 1.8 }); const ek = ramp(t, th, th + 1.0); if (ek > 0 && ek < 1) { ctx.save(); ctx.strokeStyle = rgba(COL.dark2, (1 - ek) * ab * .6); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(o.c[0], o.c[1], 10 + 200 * ek, Math.PI - .5, Math.PI + .5); ctx.stroke(); ctx.restore(); } });
    label('ultrasound', bx, by + 170, { align: 'center', font: 'mono', size: 22, color: rgba(COL.sig, 1), a: ab * ramp(t, t0 + .3, t0 + .8) }); }
  /* a car: cameras, radar, lidar → a model of the world */
  carScene(t);
  /* before it could plan, it had to perceive */
  const a5 = env(t, 133.3, 137.6, .3, .5);
  if (a5 > .003) { const tp = wt('25', 'perceive'), k = eio(ramp(t, tp - .2, tp + .5));
    label('plan', lerp(960, 1240, k), 600, { align: 'center', font: 'serif', size: 130, weight: 300, color: rgba(DARK, 1), a: a5 * ramp(t, wt('25', 'plan') - .1, wt('25', 'plan') + .3) });
    label('perceive', lerp(560, 680, k), 600, { align: 'center', font: 'serif', size: 130, weight: 300, color: rgba(COL.sig, 1), a: a5 * k });
    const ar = ramp(t, tp + .3, tp + .8); draw(hline(930, 560, 1080, 560, 141, 0, .6), ar, { c: DARK, a: a5, w: 2.4 }); arrowHead(1080, 560, 0, 18, DARK, a5 * sm(ar * 3));
    say('Before it could plan…', 960, 330, { seg: '25', size: 44, align: 'center', color: rgba(COL.dark2, 1), a: a5 * (1 - ramp(t, 136.5, 137.2)) });
    /* the arrow stretches into a path for the next scene */
    const st = eio(ramp(t, 136.6, 137.6)); if (st > 0) { ctx.save(); ctx.strokeStyle = rgba(COL.sig, st * a5); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lerp(930, 0, st), 560); ctx.lineTo(lerp(1080, W, st), 560); ctx.stroke(); ctx.restore(); } }
});
function carScene(t) {
  const a = env(t, 122.0, 133.4, .5, .5); if (a <= .003) return;
  const cx = 700, cy = 600;
  /* the street */
  const st = ramp(t, 122.0, 122.8);
  draw(join(hline(80, 470, 1840, 470, 151, 0, 1), hline(80, 730, 1840, 730, 153, 0, 1)), st, { c: COL.dark2, a: a * .35, w: 1.4 });
  /* things around it; they exist before the car knows about them */
  const parked = { x: 1250, y: 520 }, ped = { x: 1500, y: 690 }, cone = { x: 1050, y: 690 };
  const objs = [];
  for (let i = 0; i < 26; i++) { const u = i / 25; objs.push([parked.x - 95 + 190 * u, parked.y - 46]); objs.push([parked.x - 95 + 190 * u, parked.y + 46]); }
  for (let i = 0; i < 10; i++) { objs.push([parked.x - 95, parked.y - 46 + 92 * i / 9]); objs.push([parked.x + 95, parked.y - 46 + 92 * i / 9]); }
  for (let i = 0; i < 14; i++) { const an = i / 14 * Math.PI * 2; objs.push([ped.x + Math.cos(an) * 16, ped.y + Math.sin(an) * 16]); objs.push([cone.x + Math.cos(an) * 12, cone.y + Math.sin(an) * 12]); }
  for (let i = 0; i < 60; i++) { objs.push([120 + i * 29, 470]); objs.push([120 + i * 29, 730]); }
  const tl = wt('23', 'lidar'), model = ramp(t, wt('24', 'accurate') - .2, wt('24', 'world') + .1), lost = ramp(t, wt('24', 'cant') - .4, wt('24', 'cant') + .2) * (1 - model);
  const beam = (t - tl) * 7.5; /* radians */
  objs.forEach(([x, y]) => { const an = (Math.atan2(y - cy, x - cx) + Math.PI * 4) % (Math.PI * 2);
    let seen = 0; if (t > tl) { const turns = beam - an; seen = turns >= 0 ? 1 : 0; }
    const al = a * Math.max(seen * (1 - lost), model) * .9; if (al > .01) dot(x, y, 2.6, COL.sig, al); });
  /* the car */
  ctx.save(); ctx.translate(cx, cy); draw(WORLD.carTop, ramp(t, 122.2, 122.9), { c: DARK, a, w: 2 }); ctx.restore();
  /* cameras */
  const kc = ramp(t, wt('23', 'cameras') - .1, wt('23', 'cameras') + .4);
  if (kc > 0) { ctx.save(); ctx.fillStyle = rgba(COL.sig, .12 * a * kc); ctx.beginPath(); ctx.moveTo(cx + 95, cy); ctx.arc(cx + 95, cy, 520 * eo(kc), -.38, .38); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(COL.sig, .5 * a * kc); ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); label('cameras', cx + 420, cy - 180, { font: 'mono', size: 22, color: rgba(COL.sig, 1), a: a * kc }); }
  const kr = ramp(t, wt('23', 'radar') - .1, wt('23', 'radar') + .4);
  if (kr > 0) { for (let k = 0; k < 8; k++) { const kk = ((t - wt('23', 'radar')) * 1.2 + k / 8) % 1; if (t < wt('23', 'radar')) continue;
      ctx.save(); ctx.strokeStyle = rgba(COL.sig, (1 - kk) * a * .6 * kr); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(cx + 95, cy, 40 + 360 * kk, -.6, .6); ctx.stroke(); ctx.restore(); }
    label('radar', cx + 420, cy + 210, { font: 'mono', size: 22, color: rgba(COL.sig, 1), a: a * kr }); }
  const kl = ramp(t, tl - .1, tl + .3) * (1 - model * .8);
  if (kl > 0) { ctx.save(); ctx.strokeStyle = rgba(COL.sig, .55 * a * kl); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(beam) * 1400, cy + Math.sin(beam) * 1400); ctx.stroke(); ctx.restore();
    label('lidar', cx - 120, cy - 120, { font: 'mono', size: 22, color: rgba(COL.sig, 1), a: a * kl }); }
  /* the lesson: without a model, every move is a guess; with one, a path */
  const dec = ramp(t, wt('24', 'decide') - .3, wt('24', 'decide') + .2) * (1 - model);
  if (dec > 0) [-0.5, 0, .5].forEach((an, i) => { const fl = .35 + .35 * Math.sin(t * 9 + i * 2.1); const L = 220, x1 = cx + 110 + Math.cos(an) * L, y1 = cy + Math.sin(an) * L;
    ctx.save(); ctx.setLineDash([8, 8]); ctx.strokeStyle = rgba(COL.dark2, a * dec * fl); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + 110, cy); ctx.lineTo(x1, y1); ctx.stroke(); ctx.restore(); arrowHead(x1, y1, an, 14, COL.dark2, a * dec * fl);
    label('?', x1 + 14, y1 + 10, { font: 'serif', size: 40, color: rgba(COL.dark2, 1), a: a * dec * fl }); });
  if (model > 0) { const path = [PL(cat([[cx + 110, cy], [950, 610], [1110, 640], [1250, 640], [1390, 610], [1520, 560], [1800, 560]], false, 3))];
    draw(path, eo(ramp(t, wt('24', 'world') - .1, wt('24', 'world') + .9)), { c: COL.sig, a, w: 3.2 }); }
  say('Self-driving taught us one big lesson:', 960, 200, { seg: '24', size: 40, align: 'center', color: rgba(COL.dark2, 1), a: env(t, 126.8, 133.2, .4, .5) });
  say('A car can’t decide anything|without an accurate model of the world.', 960, 290, { seg: '24', t: wt('24', 'a'), size: 52, align: 'center', em: ['accurate', 'model'], color: rgba(DARK, 1), a: env(t, 129.4, 133.2, .4, .5) });
}

/* ---------- 9. Mosaic: an instrument that perceives (137.4 – 147.6) ---------- */
const VES = (() => { const up = [], lo = [], up2 = [], lo2 = [];
  for (let i = 0; i <= 90; i++) { const x = -40 + i * 15.6; const c = 560 + Math.sin(x / 260) * 40 + Math.sin(x / 97) * 10, r = 120 - x * .022 + Math.sin(x / 61) * 8;
    if (x < 1250) { up.push([x, c - r]); lo.push([x, c + r]); } }
  const bx = 1250, by = 560 + Math.sin(bx / 260) * 40;
  for (let i = 0; i <= 40; i++) { const u = i / 40, x = bx + u * 760; up2.push([x, by - 92 - u * 300 + Math.sin(u * 9) * 6]); lo2.push([x, by + 92 + u * 260 + Math.sin(u * 7) * 6]); }
  const mid = []; for (let i = 0; i <= 40; i++) { const u = i / 40, x = bx + 40 + u * 720; mid.push([x, by - 20 + u * 40 + 70 * u * u, 0]); }
  const midU = [], midL = []; for (let i = 0; i <= 40; i++) { const u = i / 40, x = bx + 70 + u * 700; midU.push([x, by - 40 - u * 170]); midL.push([x, by + 40 + u * 150]); }
  return { walls: [up, lo, up2, lo2, midU, midL].map(p => cat(p, false, 4)) }; })();
let _tipP = null;
function tipAt(t) { if (!_tipP) _tipP = PL(cat([[-60, 560], [300, 575], [700, 590], [1100, 560], [1260, 575], [1500, 680], [1800, 790], [2000, 860]], false, 3));
  const u = eio(ramp(t, 139.0, 146.6)) * .93; return plAt(_tipP, u); }
let _wallT = null;
function wallTimes() { if (_wallT) return _wallT;
  _wallT = VES.walls.map(wpts => wpts.map(p => { for (let s = 139.3; s <= 147.5; s += .19) { const q = tipAt(s), d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < 245) return s + d / 245 * .8; } return 1e9; }));
  return _wallT; }
scene(137.4, 148.4, t => {
  const a = env(t, 137.5, 148.0, .4, .6);
  const tm = wt('26', 'mosaic');
  /* the name, then the instrument */
  const la = env(t, tm - .2, tm + 1.3, .3, .5); if (la > .003) logoDraw(960, 300, 92, la, la);
  if (t < 139) return;
  const tipU = eio(ramp(t, 139.0, 146.6)) * .93; draw([_tipP || (tipAt(t), _tipP)], tipU, { c: COL.sig, a, w: 2.6 });
  const tip = tipAt(t); dot(tip[0], tip[1], 7, COL.sig, a, 6);
  /* sensing pulses */
  for (let k = 0; k < 30; k++) { const ts = 139.3 + k * .38, kk = ramp(t, ts, ts + 1.1); if (kk <= 0 || kk >= 1) continue; const p = tipAt(ts); ring(p[0], p[1], 14 + 230 * eo(kk), COL.sig, (1 - kk) * .55 * a, 1.3); }
  /* walls appear where the pulses have reached them */
  const WT = wallTimes();
  VES.walls.forEach((wpts, wi) => { ctx.save(); ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    for (let i = 1; i < wpts.length; i++) { const p = wpts[i]; const tr = WT[wi][i];
      const al = a * ramp(t, tr, tr + .6); if (al < .01) continue; ctx.strokeStyle = rgba(COL.ink, al * .85); ctx.beginPath(); ctx.moveTo(wpts[i - 1][0], wpts[i - 1][1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
      ctx.strokeStyle = rgba(COL.ink, al * .3); ctx.beginPath(); ctx.moveTo(wpts[i - 1][0] + 1.1, wpts[i - 1][1] - .9); ctx.lineTo(p[0] + 1.1, p[1] - .9); ctx.stroke(); }
    ctx.restore(); });
  say('Surgery needs the same path.', 960, 150, { seg: '26', size: 52, align: 'center', color: rgba(COL.ink, 1), a: env(t, 136.6, 138.3, .3, .4) });
  say('At Mosaic, we build instruments that can|perceive and navigate human anatomy,', 120, 140, { seg: '26', t: wt('26', 'we'), size: 50, em: ['perceive', 'navigate'], a: env(t, 139.5, 147.8, .3, .6) });
  say('starting with the vascular system.', 1800, 990, { seg: '26', size: 36, align: 'right', color: rgba(COL.ink2, 1), a: env(t, 143.9, 147.8, .3, .6) });
});

/* ---------- 10. the loop: perception, understanding, action (147 – 161.4) ---------- */
scene(147.0, 161.8, t => {
  const a = ramp(t, 147.2, 148.2) * (1 - ramp(t, 160.9, 161.7));
  const t1 = wt('27', 'restoring'), t2 = wt('27', 'generating'), t3 = wt('27', 'closing'), t4 = wt('27', 'action');
  const lit = .12 + .3 * ramp(t, t1, t1 + .8) + .28 * ramp(t, t2, t2 + .8) + .3 * ramp(t, t3, t3 + .8);
  TUN.draw(lerp(.30, .40, ramp(t, 147, 161.8)), { a, span: 300, roll: -t * .04, bright: () => lit });
  const la = a * (1 - ramp(t, 154.0, 154.8)), R = 290, cx = 960, cy = 560;
  const arcs = [[-2.55, -.75, t1, 'Restoring', 'perception', [960, 200]], [-.45, 1.35, t2, 'Generating', 'understanding', [1420, 800]], [1.65, 3.45, t3, 'Closing the loop', 'on action', [500, 800]]];
  arcs.forEach(([a0, a1, tt, l1, l2, [lx, ly]]) => { const k = eo(ramp(t, tt - .1, tt + .7)); if (k <= 0) return;
    draw([PL(arcPts(cx, cy, R, a0, lerp(a0, a1, k)))], 1, { c: COL.sig, a: la, w: 3 }); const e = lerp(a0, a1, k); arrowHead(cx + Math.cos(e) * R, cy + Math.sin(e) * R, e + Math.PI / 2, 16, COL.sig, la);
    label(l1, lx, ly, { align: 'center', font: 'sans', size: 30, color: rgba(COL.ink, 1), a: la * k }); label(l2, lx, ly + 44, { align: 'center', font: 'serif', size: 44, weight: 300, color: rgba(COL.sig, 1), a: la * k }); });
  say('We start at the foundation:', 960, 110, { seg: '27', size: 40, align: 'center', color: rgba(COL.ink2, 1), a: la * ramp(t, 147.2, 147.8) * (1 - ramp(t, 149.2, 149.8)) });
  if (t > t4) { const an = -2.55 + (t - t4) * 2.4; dot(cx + Math.cos(an) * R, cy + Math.sin(an) * R, 8, COL.sig2, la, 6); }
  /* perception → data → understanding → action */
  const sa = a * ramp(t, 154.2, 154.6);
  const L = [['Perception creates data.', '28', 'perception', ['data']], ['Data creates understanding.', '28', 'data', ['understanding']], ['Understanding enables|intelligent action.', '28', 'understanding', ['intelligent', 'action']]];
  const tt = [wt('28', 'perception'), wt('28', 'data', 1), wt('28', 'understanding', 1)];
  L.forEach(([s, id, w0], i) => { const next = tt[i + 1] ?? 1e9, dim = ramp(t, next - .1, next + .4); const y = 330 + i * 150;
    say(s, 960, y, { seg: id, t: tt[i], size: i === 2 ? 70 : 58, align: 'center', em: L[i][3], a: sa * lerp(1, .38, dim) }); });
});

/* ---------- 11. from the bottom up (161.4 – 169.4) ---------- */
scene(161.4, 169.6, t => {
  const a = env(t, 161.6, 169.2, .4, .5);
  const tb = [wt('29', 'emerges') - .2, wt('29', 'from'), wt('29', 'up') - .1];
  const blocks = [['Perception', 560], ['Understanding', 440], ['Action', 320]];
  const base = 900, bh = 120, cx = 760;
  blocks.forEach(([lab, w], i) => { const k = back(ramp(t, tb[i], tb[i] + .55)); if (ramp(t, tb[i], tb[i] + .1) <= 0) return; const y = base - (i + 1) * (bh + 14) - (1 - k) * 160;
    const aa = a * sm(ramp(t, tb[i], tb[i] + .3)); ctx.save(); ctx.fillStyle = rgba(i === 2 ? COL.sig : '44,40,38', aa * (i === 2 ? .9 : .7)); ctx.fillRect(cx - w / 2, y, w, bh); ctx.restore();
    draw(hbox(cx - w / 2, y, w, bh, 161 + i, 1.2), 1, { c: i === 2 ? COL.sig2 : COL.ink2, a: aa, w: 1.5 });
    label(lab, cx, y + bh / 2 + 12, { align: 'center', font: 'serif', size: 40, weight: 300, color: rgba(COL.ink, 1), a: aa }); });
  const ar = ramp(t, tb[2] + .3, tb[2] + 1); draw(hline(cx + 340, base - 30, cx + 340, base - 3 * (bh + 14) + 10, 171, 0, 1), eo(ar), { c: COL.sig, a, w: 2 }); arrowHead(cx + 340, base - 3 * (bh + 14) + 10, -Math.PI / 2, 16, COL.sig, a * sm(ar * 4));
  say('Surgical intelligence emerges|from the bottom up,', 960, 150, { seg: '29', size: 54, align: 'center', em: ['bottom', 'up'], a });
  /* every embodied intelligent system did the same: a car, standing on its own stack */
  const e = ramp(t, wt('30', 'every') - .2, wt('30', 'system') + .2);
  if (e > 0) { const x = 1460, y = 560; ctx.save(); ctx.translate(x, y - 150); ctx.scale(.8, .8); draw(WORLD.carTop, eo(e), { c: COL.ink, a: a, w: 2 }); ctx.restore();
    [['perception', 0], ['planning', 1], ['control', 2]].forEach(([l, i]) => { const k = ramp(e, i * .25, i * .25 + .4); const yy = y + 160 - i * 70;
      draw(hbox(x - 150 + i * 30, yy, 300 - i * 60, 58, 181 + i, 1), k, { c: i === 2 ? COL.sig : COL.ink2, a: a, w: 1.3 }); label(l, x, yy + 37, { align: 'center', font: 'mono', size: 20, color: rgba(COL.ink2, 1), a: a * k }); });
    say('just like every embodied|intelligent system before it.', 1460, 880, { seg: '30', size: 36, align: 'center', color: rgba(COL.ink2, 1), a }); }
});

/* ---------- 12. the road again, and where it goes next (169.2 – 176.6) ---------- */
scene(169.2, 176.8, t => {
  const a = env(t, 169.3, 176.4, .5, .5);
  const u = eio(ramp(t, 169.6, 172.6)), out = eio(ramp(t, wt('31', 'now') - .4, wt('31', 'now') + .9));
  const c = { x: lerp(960, 1520, out), y: lerp(540, 470, out), z: lerp(1, .74, out) };
  cam(c, () => { roadDraw(99, a, u, .8, .55, false);
    const end = WORLD.road[WORLD.road.length - 1]; const nx = [PL(cat([[end[0] - 4, end[1]], [2160, end[1] - 30], [2400, 330], [2700, 120], [2980, -60]], false, 3))];
    const k = eo(ramp(t, wt('31', 'now'), wt('31', 'intelligent') + .5));
    draw(nx, k, { c: COL.sig, a, w: 4, glow: 12 }); const h = shapeHead(nx, k); if (k > 0) dot(h[0], h[1], 10, COL.sig, a, 6);
    label('less invasive', 1060, 1020, { font: 'serif', size: 54, weight: 300, align: 'center', color: rgba(COL.ink2, 1), a: a * ramp(t, wt('31', 'less') - .1, wt('31', 'less') + .4) });
    label('more intelligent', 2700, 200, { align: 'right', font: 'serif', size: 76, weight: 300, color: rgba(COL.sig, 1), a: a * ramp(t, wt('31', 'more') - .1, wt('31', 'intelligent') + .3) }); });
});

/* ---------- 13. perceived, learnt, scaled — and the mark (176.4 – end) ---------- */
scene(176.4, 400, t => {
  const end = TL.dur, a = ramp(t, 176.5, 177.0) * (1 - ramp(t, end - .9, end - .1));
  const tp = wt('32', 'perceived'), tl = wt('32', 'learnt'), ts = wt('33', 'scaled');
  const one = 1 - ramp(t, ts - .3, ts + .3);
  /* one surgeon */
  if (one > 0) { personDraw(960, 640, 560, COL.ink, ramp(t, 176.7, 177.7), a * one * (1 - .7 * ramp(t, tl, tl + .6)), 1.8);
    for (let k = 0; k < 4; k++) { const kk = ramp(t, tp + k * .3, tp + 1.2 + k * .3); if (kk > 0 && kk < 1) ring(960, 560, 60 + 340 * eo(kk), COL.sig, (1 - kk) * a * .7, 1.4); }
    const dk = ramp(t, tl - .1, tl + .6); if (dk > 0) { const s = 560 / 2.12, r = rnd(5);
      for (const pl of WORLD.sil) for (let i = 0; i < pl.length; i += 3) { const p = pl[i], jx = (r() - .5) * 8 * dk, jy = (r() - .5) * 8 * dk;
        dot(960 + p[0] * s + jx, 640 - p[1] * s + jy, 1.8, COL.sig, a * one * dk * .9); } } }
  /* many */
  const many = ramp(t, ts - .5, ts + 1.2), settle = eio(ramp(t, 184.0, 187.0));
  if (many > 0) { const markH = 300, boxW = markH * 122.066 / 149.99, ox = W / 2 - boxW / 2, oy = H * .5 - markH / 2, kx = boxW / 64, ky = markH / 64;
    WORLD.crowd.forEach((c, i) => { const a0 = sm(many * 66 * .9 / 30 - i * .03); if (a0 <= .01) return;
      const gx = c.gx * W, gy = c.gy * H + Math.sin(t * .7 + c.s * 21) * 4, x = gx + (ox + c.mx * kx - gx) * settle, y = gy + 60 + (oy + c.my * ky - gy - 60) * settle;
      const h = 130 * (1 - .93 * settle), col = settle > .5 ? COL.sig : COL.ink2;
      person(x, y, h, col, a * a0 * (1 - .15 * settle) * (1 - ramp(settle, .82, .99)) * (settle > .5 ? .35 + .55 * settle : .64), Math.max(.6, h * .012)); }); }
  /* the mark, then the name */
  const mi = ramp(t, 186.5, 187.3), nm = ramp(t, 187.3, 188.2);
  if (mi > 0) { const h = 150, lockShift = eio(nm);
    logoDraw(W / 2 + lerp(0, -0, lockShift), H * .5, h * lerp(1.95, 1, lockShift), mi * a, nm * a, '#FC6452', '#FFFFFF', lockShift > .001 ? true : false); }
  say('Once surgery can be perceived,|it can be learnt.', 960, 150, { seg: '32', size: 54, align: 'center', em: ['learnt'], a: a * (1 - ramp(t, 180.1, 180.6)) });
  say('And once it can be learnt…', 960, 150, { seg: '33', size: 54, align: 'center', a: a * env(t, 180.2, 184.2, .3, .5) });
  say('it can be scaled.', 960, 222, { seg: '33', t: wt('33', 'it', 1), size: 54, align: 'center', em: ['scaled'], a: a * env(t, 181.4, 184.4, .3, .5) });
});

/* ======================= frame ======================= */
let BASE = null;
function frame(t) {
  T = t; if (BASE) ctx.setTransform(...BASE); else ctx.setTransform(K, 0, 0, K, 0, 0);
  const w = bg(t); const v = Math.round(lerp(4, 255, w)), g = Math.round(lerp(1, 255, w)), b = Math.round(lerp(2, 255, w));
  ctx.fillStyle = `rgb(${v},${g},${b})`; ctx.fillRect(0, 0, W, H);
  if (w < .5) { const vg = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 1200); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H); }
  for (const s of SCENES) if (t >= s.a && t <= s.b) { ctx.save(); try { s.fn(t); } catch (e) { console.error('scene', s.a, e.message); } ctx.restore(); }
}
