/* ---------- Pita y Tomi en la PUC ---------- */
// Pita catches falling coursework on a stack of books. Items land where they hit; an off-center
// tower or too much sway topples it. Energy items fight tiredness, which makes Pita shaky.
const STACK_CFG = {
  facil: { need: 3, every: 1.7, fall: 38, speedUp: 0, giant: [], snackEvery: 9, drain: .55, hints: true, grace: 5, sway: .5, luckSems: [[4, 6], [8, 11]], work: ['libro', 'libro', 'libro', 'laptop', 'cuaderno', 'pruebas'] },
  ultra: { need: 4, every: 1.5, fall: 38, speedUp: 5, giant: [6, 12], snackEvery: 11, drain: 1, hints: false, grace: 1.5, sway: 1, luckSems: [[7, 11]], work: ['libro', 'libro', 'libro', 'laptop', 'cuaderno', 'pruebas', 'calculadora'] },
};
const SEMESTERS = 12, GIANT_N = 6, GIANT_NAMES = { 6: '¡Certamen!', 12: '¡Examen de título!' };
// the stack rides on Pita's head, so her tired face stays visible
const HAND_Y = GROUND - 49, HANDS_HALF = 7, PITA_SPEED = 150, KEY_SPEED = 110;
// from semester 9 the camera keeps the tower's top halfway up the screen; before, only near the top edge
const LIFT_SEM = 9, LIFT_LATE = .5, LIFT_EARLY = .12, LIFT_SPEED = 10, STACK_FLOOR = 36, SWAY_K = 18, SWAY_DAMP = 3.2, SWAY_ACCEL = .00045, SWAY_KICK = .004;
// stackable coursework: w × h in game px, heavier things weigh more
const WORK = {
  libro: { w: [10, 14], h: [3, 4], m: 1, cols: ['#c84a4a', '#3a6ab0', '#4a9a5a', '#e0b040', '#7a4ab0'] },
  laptop: { w: [16, 16], h: [3, 3], m: 1.6, cols: ['#9aa0ac'] },
  cuaderno: { w: [10, 11], h: [2, 2], m: .6, cols: ['#e07a3a', '#4aa0c8', '#d05a8a'] },
  pruebas: { w: [11, 12], h: [4, 4], m: .8, cols: ['#fbf8ee'] },
  calculadora: { w: [6, 6], h: [3, 3], m: .7, cols: ['#3a3e48'] },
};
const SNACKS = { cafe: .35, muffin: .25, galleta: .2, almohada: .6 }, SNACK_KINDS = ['cafe', 'cafe', 'muffin', 'galleta', 'almohada'];
const SNACK_ART = {
  cafe: [['.w.w...', 'kkkkk..', 'kbbbkk.', 'kWWWk.k', 'kWWWkk.', 'kWWWk..', '.kkk...'], { k: '#2a1e24', b: '#6a3a20', W: '#fbf8ee', w: '#d8dade' }],
  muffin: [['..kkk..', '.kpPpk.', 'kpppppk', 'kyYyYyk', '.kyyyk.', '.kkkkk.'], { k: '#4a2a18', p: '#7a4a2a', P: '#e05a6a', y: '#e8b060', Y: '#c88a40' }],
  galleta: [['.kkkk.', 'kyycyk', 'kycyyk', 'kyyyck', '.kkkk.'], { k: '#6a4018', y: '#e0a850', c: '#5a3018' }],
  almohada: [['kk........kk', 'kWkkkkkkkkWk', '.kwwwwwwwwk.', 'kwwwwwwwwwSk', 'kwwSwwwwwwSk', '.kwwwwwwwSk.', 'kWkkkkkkkkWk', 'kk........kk'], { k: '#5a6a8a', w: '#eef2fb', W: '#c8d4ec', S: '#b8c4e0' }],
};
let stk = null;
// things fall clear of the energy bar on the right edge
const dropX = (r, pad) => pad + r() * (W - Math.round(W * .12) - pad * 2);
const stackRnd = (r, a, b) => a + Math.floor(r() * (b - a + 1));

function newStack(kind) {
  const cfg = STACK_CFG[kind], s = segWith('kiss');
  return {
    kind, cfg, cam: s.start + s.kiss - Math.round(W / 2), paused: false, rand: courseRng(kind === 'ultra' ? 2023 : 2015), t: 0,
    x: Math.round(W / 2), v: 0, target: null, items: [], falling: [], th: 0, thv: 0, e: 1, exhausted: false, exhaustT: 0, unstable: false, risk: 0,
    sem: 1, got: 0, nextWork: 1.2, nextSnack: cfg.snackEvery, giantLeft: 0, nextGiant: 0, giantX: 0, lift: 0,
    phase: 0, fall: null, done: 0, reported: false, hinted: {}, cameo: null,
    luck: { state: 'wait', x: 0, y: 0 }, luckSems: cfg.luckSems.map(([a, b]) => stackRnd(Math.random, a, b)),
  };
}
const stackNeed = () => stk.cfg.giant.includes(stk.sem) ? GIANT_N : stk.cfg.need;
const stackHint = (key, target) => { if (stk.cfg.hints && !stk.hinted[key]) { stk.hinted[key] = true; if (window.onPTRaceHint) window.onPTRaceHint(key, target); } };
// where every stacked thing sits right now: x centre (with sway) and bottom y
function stackLayout() {
  let sx = stk.x, y = HAND_Y;
  return stk.items.map(it => { sx += it.off; const yc = HAND_Y - y + it.h / 2, o = { it, cx: sx + stk.th * yc, y, yc }; y -= it.h; return o; });
}
const stackTopY = () => stk.items.reduce((y, it) => y - it.h, HAND_Y);
// the worst support in the tower: >1 means something hangs past its edge
function stackRisk(lay) {
  let worst = 0, mass = 0, mx = 0;
  for (let j = lay.length - 1; j >= -1; j--) {
    if (mass > 0) {
      const sx = j < 0 ? stk.x : lay[j].cx, half = j < 0 ? HANDS_HALF : lay[j].it.w / 2;
      worst = Math.max(worst, Math.abs(mx / mass - sx) / (half + stk.cfg.grace));
    }
    if (j >= 0) { const m = lay[j].it.w * lay[j].it.h * lay[j].it.m; mass += m; mx += m * lay[j].cx; }
  }
  return worst;
}
function stackTo(fx) { if (stk) stk.target = Math.max(12, Math.min(W - 12, fx * W)); }

function spawnWork(x) {
  const r = stk.rand, kinds = stk.cfg.work, k = kinds[Math.floor(r() * kinds.length)], d = WORK[k];
  const w = stackRnd(r, d.w[0], d.w[1]), h = stackRnd(r, d.h[0], d.h[1]);
  stk.falling.push({ kind: 'work', k, w, h, m: d.m, col: d.cols[Math.floor(r() * d.cols.length)], x: x ?? dropX(r, 12), y: -offY - stk.lift - 6, vy: stk.cfg.fall + stk.cfg.speedUp * (stk.sem - 1) });
}
function spawnSnack() {
  const r = stk.rand, k = SNACK_KINDS[Math.floor(r() * SNACK_KINDS.length)];
  stk.falling.push({ kind: 'snack', k, x: dropX(r, 12), y: -offY - stk.lift - 6, vy: stk.cfg.fall * .9 });
}
function nextSemester() {
  stk.sem++; stk.got = 0;
  if (stk.sem > SEMESTERS) { graduate(); return; }
  if (stk.cfg.giant.includes(stk.sem)) { stk.giantLeft = GIANT_N; stk.nextGiant = 1.2; stk.giantX = dropX(stk.rand, 30); showCaption(GIANT_NAMES[stk.sem]); }
  else showCaption('Semestre ' + stk.sem);
  if (stk.luckSems.includes(stk.sem)) Object.assign(stk.luck, { state: 'live', x: dropX(stk.rand, 30), y: -offY - stk.lift - 12 });
}
// graduation: the tower bursts into flying papers, Pita walks to the middle so Tomi fits beside her on a phone, and both hop in ceremony clothes
const GRAD_WALK = .9, GRAD_HOP = .9, GRAD_REPORT = 3.6, GRAD_GAP = 26, GRAD_PITA_X = () => Math.round(W / 2 - GRAD_GAP / 2);
function graduate() {
  const s = stk; s.sem = SEMESTERS; s.done = .001; s.n = s.items.length; s.time = s.t; showCaption('¡Titulados!');
  stackLayout().forEach(o => fx.push({ x: s.cam + o.cx + (Math.random() - .5) * o.it.w, y: o.y - o.it.h, vx: (Math.random() - .5) * 60, vy: -50 - Math.random() * 50, life: 1.8, kind: 'paper' }));
  s.items = []; s.th = s.thv = 0; s.luck.state = 'gone';
}
const gradHop = d => d > GRAD_WALK && d < GRAD_WALK + GRAD_HOP ? Math.round(Math.abs(Math.sin(Math.PI * 2 * (d - GRAD_WALK) / GRAD_HOP)) * 8) : 0;
// besito de la suerte: the tower straightens halfway, the sway stops, and Tomi drops by for a kiss
const CAMEO_SECS = 2.4;
function catchLuck() {
  const s = stk; s.luck.state = 'gone';
  s.items.forEach(it => { it.off *= .5; }); s.th = s.thv = 0; s.unstable = false;
  s.cameo = { t: 0 }; showCaption('¡Besito de la suerte!');
  for (let i = 0, n = reduced ? 14 : 40; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 30 + Math.random() * 60; fx.push({ x: s.cam + s.x, y: stackTopY(), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 15, life: 1.4 + Math.random() * .6, kind: i % 4 === 3 ? 's' : 'h' }); }
  if (window.onPTBoom) window.onPTBoom();
}
function topple(lay) {
  const pivot = stk.x, dirn = (lay.length ? lay[lay.length - 1].cx - pivot : 1) >= 0 ? 1 : -1;
  stk.fall = { t: 0, dir: dirn, pile: {}, pieces: lay.map((o, i) => ({ ...o.it, x: o.cx, y: o.y - o.it.h, vx: dirn * (12 + i * 2.5) + (o.cx - pivot) * 1.5, vy: -10 - i, rest: false })) };
  stk.items = []; stk.th = stk.thv = 0; showCaption('Todo se derrumbó 💔');
}

function stackUpdate(dt) {
  const s = stk; s.t += dt;
  if (s.cameo) { s.cameo.t += dt; if (s.cameo.t > .8 && s.cameo.t < 1.6 && Math.random() < dt * 8) hearts(s.cam + s.x + 11, GROUND - 56, 1); if (s.cameo.t >= CAMEO_SECS) s.cameo = null; return; }
  if (s.fall) {
    s.fall.t += dt;
    s.fall.pieces.forEach(p => {
      if (p.rest) return;
      p.vy += 300 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      const col = Math.round(p.x / 6), floor = GROUND + 2 - (s.fall.pile[col] || 0);
      if (p.y + p.h >= floor) { p.y = floor - p.h; p.rest = true; for (let c = col - 1; c <= col + 1; c++) s.fall.pile[c] = (s.fall.pile[c] || 0) + p.h; }
    });
    if (s.fall.t > 2.8 && !s.reported) { s.reported = true; if (window.onPTStackEnd) window.onPTStackEnd({ ok: false, kind: s.kind, sem: s.sem }); }
    return;
  }
  if (s.done) {
    s.done += dt; s.falling = []; s.x += (GRAD_PITA_X() - s.x) * Math.min(1, dt * 4);
    if (Math.random() < dt * 30) fx.push({ x: s.cam + Math.random() * W, y: -offY - s.lift, vx: (Math.random() - .5) * 20, vy: 22 + Math.random() * 20, life: 3, kind: Math.random() < .2 ? 'diploma' : 'confetti', col: BOOK_COLS[Math.floor(Math.random() * BOOK_COLS.length)] });
    if (s.done > GRAD_REPORT && !s.reported) { s.reported = true; if (window.onPTStackEnd) window.onPTStackEnd({ ok: true, kind: s.kind, n: s.n, time: s.time }); }
    return;
  }
  // Pita: follow the finger, or the arrow keys
  const keys = dir; if (keys) s.target = null;
  const want = s.target != null ? Math.max(-PITA_SPEED, Math.min(PITA_SPEED, (s.target - s.x) * 9)) : keys * KEY_SPEED;
  const v0 = s.v; s.v += (want - s.v) * Math.min(1, dt * 12); s.x = Math.max(12, Math.min(W - 12, s.x + s.v * dt));
  if (s.x <= 12 || s.x >= W - 12) s.v = 0;
  s.phase += dt * Math.abs(s.v) / 85 * 12;
  // energy: a taller tower tires her faster; at zero the shaking grows until it all falls
  const n = s.items.length;
  s.e = Math.max(0, s.e - dt * (.012 + .0016 * n) * s.cfg.drain);
  // at zero she's exhausted ("Ya me cansé"): the next catch decides — food or the pillow wakes her, a book drops it all
  if (s.e <= 0 && !s.exhausted) { s.exhausted = true; s.exhaustT = 0; showCaption('Ya me cansé 🎵'); }
  if (s.exhausted) s.exhaustT += dt;
  const shake = .02 + .5 * Math.pow(Math.max(0, .55 - s.e), 2);
  // sway: a spring, kicked by Pita's acceleration and by tired hands
  const acc = dt > 0 ? (s.v - v0) / dt : 0;
  s.thv += (-SWAY_K * s.th - SWAY_DAMP * s.thv - acc * SWAY_ACCEL * s.cfg.sway * Math.min(1, n / 6)) * dt + (Math.random() - .5) * shake * s.cfg.sway * Math.sqrt(dt) * 2;
  s.th += s.thv * dt;
  // spawns
  if (s.giantLeft > 0) {
    s.nextGiant -= dt;
    if (s.nextGiant <= 0) { s.giantLeft--; s.nextGiant = .55; s.giantX = Math.max(14, Math.min(W - Math.round(W * .12) - 14, s.giantX + (s.rand() - .5) * 36)); spawnWork(s.giantX); }
  } else {
    s.nextWork -= dt; if (s.nextWork <= 0) { spawnWork(); s.nextWork = Math.max(.9, s.cfg.every - (s.cfg.speedUp ? .06 * (s.sem - 1) : 0)); }
  }
  s.nextSnack -= dt; if (s.nextSnack <= 0) { spawnSnack(); s.nextSnack = s.cfg.snackEvery * (.7 + s.rand() * .6); }
  // falling things: coursework lands on the top it hits, snacks get eaten by the tower or Pita
  let lay = stackLayout(), caught = false, collapse = false;
  const wasUnstable = s.unstable, top = lay.length ? lay[lay.length - 1] : null, topY = stackTopY(), topX = top ? top.cx : s.x, topHalf = top ? top.it.w / 2 : HANDS_HALF;
  s.falling = s.falling.filter(f => {
    const y0 = f.y; f.y += f.vy * dt;
    // missed things land on the grass and fade
    if (f.y >= GROUND + 2) { f.y = GROUND + 2; f.gone = (f.gone || 0) + dt; return f.gone < .6; }
    if (f.kind === 'work') {
      if (f.missed) return true;
      if (f.y >= topY && y0 < topY + 3) {
        if (Math.abs(f.x - topX) < f.w / 2 + topHalf - 1) {
          const yc = HAND_Y - topY + f.h / 2, off = (f.x - s.th * yc) - (top ? top.cx - s.th * top.yc : s.x);
          // a badly placed piece slides off on its own and shakes the tower; only a leaning tower topples
          if (Math.abs(off) > topHalf + s.cfg.grace) { f.missed = true; f.x += Math.sign(off) * 4; s.thv += Math.sign(off) * .02; return true; }
          s.items.push({ k: f.k, w: f.w, h: f.h, m: f.m, col: f.col, off }); s.thv += off * SWAY_KICK * s.cfg.sway; s.got++; caught = true;
          if (s.exhausted) { collapse = true; return false; }
          if (s.got >= stackNeed()) nextSemester();
          return false;
        }
        if (f.y > topY + 3) f.missed = true;
      }
      return true;
    }
    // snacks are eaten by anything they touch: Pita or any piece of the tower
    const onPita = Math.abs(f.x - s.x) < 10 && f.y > GROUND - 50, onTower = lay.some(o => Math.abs(f.x - o.cx) < o.it.w / 2 + 4 && f.y > o.y - o.it.h - 3 && f.y < o.y + 2);
    if (onPita || onTower || (f.y >= topY && y0 < topY + 3 && Math.abs(f.x - topX) < topHalf + 4)) { s.e = Math.min(1, s.e + SNACKS[f.k]); s.exhausted = false; hearts(s.cam + f.x, f.y, 2); return false; }
    if (f.y > topY - 40 && f.y < topY) stackHint('p-snack', { x: f.x, y: offY + s.lift + f.y, r: 14 });
    return true;
  });
  const lk = s.luck;
  if (lk.state === 'live') {
    lk.y += s.cfg.fall * .55 * dt; lk.x = Math.max(14, Math.min(W - Math.round(W * .12) - 14, lk.x + Math.sin(s.t * 2) * 12 * dt));
    if (lk.y > GROUND) lk.state = 'gone';
    else if (Math.abs(lk.x - s.x) < 12 && lk.y > GROUND - 54 || lay.some(o => Math.abs(lk.x - o.cx) < o.it.w / 2 + 8 && lk.y > o.y - o.it.h - 8 && lk.y < o.y + 4)) { catchLuck(); return; }
    else if (lk.y > -offY - s.lift + 40) stackHint('p-luck', { x: lk.x, y: offY + s.lift + lk.y, r: 20 });
  }
  // past the tipping point the tower shakes but holds: the next catch can counterweight it, or it falls
  lay = stackLayout();
  const risk = stackRisk(lay);
  if (collapse || (wasUnstable && caught && risk > 1)) { topple(lay); return; }
  s.unstable = risk > 1 || (s.unstable && risk > .95);
  if (s.unstable) stackHint('p-sway', { x: lay[lay.length - 1].cx, y: offY + s.lift + stackTopY(), r: 22 });
  if (s.e < .45) stackHint('p-energy', { bar: 's-tired' });
  if (s.t > .6) stackHint('p-move', { x: s.x, y: offY + s.lift + GROUND - 24, r: 26 });
  s.risk = risk;
}

// tired Pita (0..4) and asleep, baked once
const PITA_STACK = {};
function pitaStack(lvl) {
  return PITA_STACK[lvl] || (PITA_STACK[lvl] = (() => {
    const tired = lvl === 'asleep' ? 4 : lvl, spec = { ...BASE_P, ...OUTFITS.student.pita, backpack: undefined, tired, asleep: lvl === 'asleep' };
    const wire = cv => wiry(cv, tired);
    return { walk: WALK.map(([f, b]) => wire(person(spec, f, b))), kiss: wire(person(spec, 0, 0, false, false, true)) };
  })());
}
// messy hair: thin wiry strands painted after the outline (outlined pixels turn into blobs)
const WIRE_PAD = 6, WIRES = [
  [[14, 5], [12, 1], [10, -2]], [[25, 4], [27, 0], [30, -2]], [[31, 10], [35, 8], [36, 5]], [[8, 11], [5, 9], [4, 6]],
  [[19, 4], [18, 0], [20, -4]], [[22, 4], [24, -1], [23, -4]], [[32, 15], [36, 15], [38, 13]], [[8, 16], [4, 17], [2, 15]], [[11, 7], [7, 4], [7, 1]], [[28, 6], [32, 3], [33, 0]],
];
function wiry(cv, tired) {
  if (tired < 3) return cv;
  const out = bake(cv.width, cv.height + WIRE_PAD, c => {
    c.drawImage(cv, 0, WIRE_PAD);
    WIRES.slice(0, tired > 3 ? WIRES.length : 4).forEach(([a, b, d]) => { line(c, a[0], a[1] + WIRE_PAD, b[0], b[1] + WIRE_PAD, '#6a4426'); line(c, b[0], b[1] + WIRE_PAD, d[0], d[1] + WIRE_PAD, '#6a4426'); });
  });
  out.pad = WIRE_PAD; return out;
}
function drawWork(it, cx, yBottom) {
  const x = Math.round(cx - it.w / 2), y = Math.round(yBottom - it.h);
  rect(ctx, x - 1, y - 1, it.w + 2, it.h + 2, OUT); rect(ctx, x, y, it.w, it.h, it.col);
  if (it.k === 'libro') { rect(ctx, x, y, 1, it.h, shade(it.col, 1.3)); rect(ctx, x + 2, y + 1, it.w - 4, 1, '#fbf8ee'); }
  else if (it.k === 'laptop') { rect(ctx, x, y + it.h - 1, it.w, 1, '#5a5e68'); px(ctx, x + it.w / 2, y + 1, '#e8ecf4'); }
  else if (it.k === 'pruebas') { rect(ctx, x + 1, y + 1, it.w - 2, 1, '#9aa4b8'); rect(ctx, x + 1, y + 3, it.w - 4, 1, '#9aa4b8'); px(ctx, x + it.w - 3, y, '#e04040'); }
  else if (it.k === 'cuaderno') rect(ctx, x, y, it.w, 1, '#fbf8ee');
  else if (it.k === 'calculadora') { rect(ctx, x + 1, y, 4, 1, '#9ad0a0'); px(ctx, x + 1, y + 2, '#e0e0e0'); px(ctx, x + 3, y + 2, '#e0e0e0'); }
}
const tiredLevel = e => e < .2 ? 4 : e < .4 ? 3 : e < .6 ? 2 : e < .8 ? 1 : 0;

function stackFrame(t, dt) {
  const s = stk; if (s.paused) dt = 0;
  stackUpdate(dt);
  cam = s.cam;
  // camera slides up as the tower grows, but Pita's head stays on screen
  const topScreen = offY + stackTopY() - 10;
  const wantLift = Math.max(0, Math.min(Hs - offY - GROUND + 44, Hs * (s.sem >= LIFT_SEM ? LIFT_LATE : LIFT_EARLY) - topScreen));
  s.lift += Math.max(-LIFT_SPEED * dt, Math.min(LIFT_SPEED * dt, wantLift - s.lift));
  const seg = segWith('kiss'), segIdx = SEGS.indexOf(seg), lift = Math.round(s.lift);
  if (!raceCP || raceCP.A.length !== W || raceCP.A[0] !== segIdx) { const A = new Int8Array(W).fill(segIdx); raceCP = { A, B: A, Wt: new Float32Array(W) }; }
  renderSky(raceCP);
  mainCtx.save(); mainCtx.translate(0, lift); renderFar(raceCP); mainCtx.translate(0, offY);
  drawLayerOf(mainCtx, seg, 'mid', t, dt); drawLayerOf(mainCtx, seg, 'near', t, dt);
  // the fall: books on a pile, Pita asleep on top
  if (s.fall) {
    s.fall.pieces.forEach(p => drawWork(p, p.x, p.y + p.h));
    const ft = s.fall.t, img = pitaStack(ft < .6 ? 4 : 'asleep').walk[1], col = Math.round(s.x / 6), pileH = Math.max(0, ...[-1, 0, 1].map(k => s.fall.pile[col + k] || 0));
    if (ft < .6) sprite(img, s.x, GROUND + 2, false);
    else {
      ctx.save(); ctx.translate(Math.round(s.x), Math.round(GROUND + 2 - pileH)); ctx.rotate(-Math.PI / 2); ctx.drawImage(img, -img.width + 4, -Math.round(img.width / 2) - 4); ctx.restore();
      if (ft > 1) { const zt = (ft * .8) % 1; text(ctx, 'Z', Math.round(s.x + 18 + zt * 8), Math.round(GROUND - pileH - 18 - zt * 16), '#ffffff'); text(ctx, 'Z', Math.round(s.x + 12 + ((zt + .5) % 1) * 8), Math.round(GROUND - pileH - 12 - ((zt + .5) % 1) * 16), '#ffffff'); }
    }
  } else {
    const tired = tiredLevel(s.e), set = s.done ? outfitSprites('ceremony').pita : pitaStack(tired), moving = Math.abs(s.v) > 8 && !s.done;
    if (s.done) {
      const d = s.done, gt = outfitSprites('ceremony').tomi, stand = GRAD_PITA_X() + GRAD_GAP, edge = W + 24, tx = d < GRAD_WALK ? edge + (stand - edge) * smooth(d / GRAD_WALK) : stand;
      shadow(tx, 20); sprite(d < GRAD_WALK ? gt.walk[Math.floor(d * 10) % 4] : gt.walk[1], tx, GROUND + 2 - gradHop(d), true);
    }
    shadow(s.x, 20);
    const kissing = s.cameo && s.cameo.t >= .8 && s.cameo.t < 1.6;
    sprite(kissing ? set.kiss : set.walk[moving ? Math.floor(s.phase) % 4 : 1], s.x, GROUND + 2 - (moving && Math.floor(s.phase) % 2 ? 1 : 0) - (s.done ? gradHop(s.done) : 0), false);
    // shaking telegraphs danger: a tower near or past its tipping point, or an exhausted Pita
    const lay = stackLayout(), n = lay.length;
    const amp = Math.max(0, Math.min(1, (s.risk - .55) / .45)) * 2 + (s.unstable ? 1.5 : 0) + (s.exhausted ? Math.min(2.5, 1 + s.exhaustT * .3) : tired === 4 ? .6 : 0);
    lay.forEach((o, i) => drawWork(o.it, o.cx + Math.round(amp * Math.sin(t * 28 + i * 1.7) * (.3 + .7 * i / Math.max(1, n - 1))), o.y));
    if ((s.risk > .75 || s.unstable) && n && (s.unstable || Math.floor(t * 6) % 2)) text(ctx, '!', Math.round(lay[n - 1].cx - 1), Math.round(stackTopY() - 9), '#f04040');
    if (s.exhausted && Math.floor(t * 3) % 2) text(ctx, 'Z', Math.round(s.x + 10), GROUND - 54, '#ffffff');
  }
  if (s.luck.state === 'live') {
    const lx = Math.round(s.luck.x), ly = Math.round(s.luck.y + Math.sin(t * 5) * 2);
    ctx.drawImage(LUCK_HEART, lx - 12, ly - 11);
    for (let k = 0; k < 4; k++) {
      const a = t * 3 + k * Math.PI / 2, px0 = Math.round(lx + Math.cos(a) * 17), py0 = Math.round(ly + Math.sin(a) * 14), on = Math.floor(t * 8 + k) % 3;
      if (on) { const col = k % 2 ? '#fff4c0' : '#f6cf6a'; rect(ctx, px0 - on, py0, on * 2 + 1, 1, col); rect(ctx, px0, py0 - on, 1, on * 2 + 1, col); }
    }
  }
  // Tomi walks in from the right, kisses Pita, walks back out
  if (s.cameo) {
    const ct = s.cameo.t, set = outfitSprites('student').tomi, stand = s.x + 23, edge = W + 24;
    const tx = ct < .8 ? edge + (stand - edge) * smooth(ct / .8) : ct < 1.6 ? stand : stand + (edge - stand) * smooth((ct - 1.6) / .8);
    const walking = ct < .8 || ct >= 1.6, img = walking ? set.walk[Math.floor(ct * 10) % 4] : set.kiss;
    shadow(tx, 20); sprite(img, tx, GROUND + 2, ct < 1.6);
  }
  s.falling.forEach(f => {
    ctx.globalAlpha = 1 - (f.gone || 0) / .6;
    if (f.kind === 'work') drawWork(f, f.x, f.y);
    else {
      const img = artOf('snack-' + f.k, SNACK_ART[f.k]); ctx.drawImage(img, Math.round(f.x - img.width), Math.round(f.y - img.height * 2), img.width * 2, img.height * 2);
      if (f.k === 'almohada') text(ctx, 'Z', Math.round(f.x + img.width + 1), Math.round(f.y - img.height * 2 - 6), '#2a3a6a');
    }
    ctx.globalAlpha = 1;
  });
  drawFx(dt);
  mainCtx.restore();
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) banner.hidden = true; }
  if (bannerT <= 0 && capQueue.length) { banner.textContent = capQueue.shift(); banner.hidden = false; bannerT = 2; }
  if (window.onPTStackHUD) window.onPTStackHUD({ sem: s.sem, got: s.got, need: stackNeed(), e: s.e, tired: tiredLevel(s.e) });
}
function startStack(kind, w, hs) {
  mode = 'stack'; setViewport(w || W0, hs || H); stk = newStack(kind); race = null;
  fx = []; capQueue = ['Semestre 1']; bannerT = 0; banner.hidden = true; held.clear(); dir = 0; hint.hidden = true; $('b-kiss').hidden = true;
}
