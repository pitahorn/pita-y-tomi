/* ---------- Desafío 42K ---------- */
// Tomi runs the Maratón de Santiago: tap left = jump (grab floating items, clear rocks), tap right = faster.
// Bars are 0..1: e energía, w agua, g guatita (bad when high), sun bloqueador, salt sales.
const RACE_CFG = {
  facil: { secs: 75, aid: ['agua', 'gel', 'agua'], items: ['gel', 'frugele', 'agua'], hints: true, cost: .85 },
  ultra: { secs: 150, aid: ['agua', 'gel', 'sal', 'agua'], items: ['gel', 'frugele', 'gel', 'frugele', 'agua', 'agua', 'agua', 'bloqueador', 'sal'], hints: false, cost: 1.15 },
};
const JOG = 80, AVG_MUL = 1.4, TAP_MUL = 1.2, MAX_MUL = 4, MUL_DECAY = 1.5;
const JUMP_V = 200, GRAVITY = 667, ITEM_LO = 58, ITEM_ARC = 14, ARC_W = 70, TOMI_H = 48, TARGET_CLOCK = 3.5 * 3600;
// nobody beats a 1:59:59 marathon: speed is capped at that pace
const MIN_CLOCK = 7199, FAINT_SECS = 3.2, RECOVER_SECS = 3, FAINT_PENALTY = 360, STUMBLE_SECS = 1, KM_COUNT = 42.195;
let race = null, raceCP = null;

// same course every run per mode, so times compare and the perfect combos can be learned
const courseRng = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
function newRace(kind) {
  const cfg = RACE_CFG[kind], L = cfg.secs * JOG * AVG_MUL, rand = courseRng(kind === 'ultra' ? 4207 : 1910);
  return {
    kind, cfg, L, kmPx: L / KM_COUNT, clockScale: TARGET_CLOCK / cfg.secs, vmax: L * TARGET_CLOCK / cfg.secs / MIN_CLOCK, paused: false,
    d: 0, clock: 0, t: 0, lives: 3, e: .8, w: .8, g: 0, sun: 1, salt: 1, mul: 1, jy: 0, jv: 0, stumble: 0,
    kiss: 0, turboMul: 1, gels: [], lastWater: -99, eaten: [], quemado: false, burnFaint: false, faint: null, recover: 0, boost: 0, done: 0, over: false,
    things: [], nextAt: 260, aidKm: 5, tapped: false, rand,
    luck: { at: L * (.5 + rand() * .35), state: 'wait', x: 0, t: 0 }, hinted: {},
  };
}
// ultra: open avenue (sun) vs tree shade, by km; the first 2 km are shaded to warm up
const sunnyKm = k => k >= 2 && (k * 7 + 3) % 5 < 3;
const raceInSun = () => race.kind === 'ultra' && sunnyKm(Math.floor(race.d / race.kmPx));
const raceCramp = () => race.kind === 'ultra' && race.salt < .2;
const raceHint = key => { if (race.cfg.hints && !race.hinted[key]) { race.hinted[key] = true; if (window.onPTRaceHint) window.onPTRaceHint(key); } };
const raceBusy = () => !race || race.faint || race.done || race.over;

function raceTap(side) {
  const r = race; if (raceBusy()) return;
  r.tapped = true;
  if (side === 'l') { if (r.jy <= 0) { r.jv = JUMP_V; r.jy = .01; } return; }
  if (r.recover > 0 || r.stumble > 0 || raceCramp()) return;
  r.mul = Math.min(MAX_MUL, r.mul * TAP_MUL); r.hinted.fast = true;
}
// combos: items grabbed together give a turbo (speed without the extra drain); any order counts.
// Judged on landing, so a small combo can't steal a bigger one from the same jump.
const COMBOS = [
  { name: '¡Carga total!', tier: 3, aid: true },
  { name: '¡Triple Frugele!', tier: 2, need: { frugele: 3 } },
  { name: '¡Gel, Frugele y agua!', tier: 2, need: { gel: 1, frugele: 1, agua: 1 } },
  { name: '¡Gel con agua!', tier: 1, need: { gel: 1, agua: 1 } },
  { name: '¡Doble Frugele!', tier: 1, need: { frugele: 2 } },
  { name: '¡Sales con agua!', tier: 1, need: { sal: 1, agua: 1 }, ultra: true },
];
const TURBO = { 1: [3, 1.25], 2: [4, 1.35], 3: [6, 1.5] }, COMBO_WINDOW = 3.5;
function raceCombo() {
  const r = race, got = {};
  if (r.quemado) { r.eaten = []; return; } // sunburnt: no turbos until bloqueador
  r.eaten.filter(e => r.t - e.t <= COMBO_WINDOW).forEach(e => { got[e.it] = (got[e.it] || 0) + 1; });
  r.eaten = [];
  for (const c of COMBOS) {
    if (c.ultra && r.kind !== 'ultra') continue;
    const need = c.aid ? r.cfg.aid.reduce((m, it) => (m[it] = (m[it] || 0) + 1, m), {}) : c.need;
    if (Object.keys(need).every(k => (got[k] || 0) >= need[k])) {
      [r.boost, r.turboMul] = TURBO[c.tier];
      showCaption(c.name); hearts(tomiX(), GROUND - 50, 4 + c.tier * 3); return;
    }
  }
}
function raceEat(name) {
  const r = race, ultra = r.kind === 'ultra';
  if (name === 'gel') { r.gels.push({ left: .4 }); r.g += ultra && r.t - r.lastWater > 5 ? .6 : .3; }
  if (name === 'frugele') { r.e = Math.min(1, r.e + .12); r.g += .08; }
  if (name === 'agua') { r.w = Math.min(1, r.w + .3); r.g += .06; r.lastWater = r.t; if (ultra) r.salt = Math.max(0, r.salt - .12); }
  if (name === 'bloqueador') { r.sun = 1; r.quemado = false; }
  if (name === 'sal') { r.salt = Math.min(1, r.salt + .45); r.w = Math.min(1, r.w + .08); r.g += .05; }
  // overeating hurts right away, not a frame later when the bar has already started to drain — and earns no combo
  if (r.g >= 1) { r.g = 1; if (r.recover <= 0) { raceFaint('¡Dolor de guatita!'); return; } }
  r.eaten.push({ it: name, t: r.t });
}
function raceFaint(cause) {
  // a faint wipes any turbo and its caption: the cause is the news now
  const r = race; r.lives--; r.faint = { t: 0, cause }; r.mul = 1; r.jy = r.jv = 0; r.boost = 0; r.eaten = []; capQueue.length = 0; bannerT = 0;
  r.clock += FAINT_PENALTY - FAINT_SECS * r.clockScale;
  showCaption(cause);
}
// items come in groups of 1–5 laid on a jump arc (higher in the middle, like coins in a platformer)
function arcGroup(x, its) {
  const n = its.length;
  its.forEach((it, i) => { const u = n > 1 ? i / (n - 1) : .5; race.things.push({ kind: 'item', it, x: x + ARC_W * (n > 1 ? u : .5), lift: ITEM_LO + Math.round(ITEM_ARC * 4 * u * (1 - u)) }); });
}
// course ahead: an item group or an obstacle every ~1.2–2.4 s, an aid-station arc every 5 km
function raceSpawn() {
  const r = race, ahead = tomiX() + W;
  while (RSEG().start + r.nextAt < ahead && r.nextAt < r.L - 80) {
    const x = RSEG().start + r.nextAt, km = r.nextAt / r.kmPx;
    if (km >= r.aidKm) { r.aidKm += 5; arcGroup(x, r.cfg.aid); r.nextAt += ARC_W + 60; continue; }
    if (r.rand() < .3) r.things.push({ kind: 'rock', x, look: Math.floor(r.rand() * 3) });
    else { const n = 1 + Math.floor(r.rand() * r.rand() * 5); arcGroup(x, Array.from({ length: n }, () => r.cfg.items[Math.floor(r.rand() * r.cfg.items.length)])); r.nextAt += ARC_W; }
    r.nextAt += JOG * AVG_MUL * (1.2 + r.rand() * 1.2);
  }
}

function raceUpdate(dt) {
  const r = race; r.t += dt;
  if (r.over) return;
  if (r.faint) {
    r.faint.t += dt; r.clock += dt * r.clockScale;
    if (r.faint.t > 2.75 && !r.faint.up) { r.faint.up = true; burst(tomiX(), GROUND - 22); }
    if (r.faint.t >= FAINT_SECS) {
      // out of the race: Tomi stays down behind the results
      if (r.lives <= 0) { r.over = true; r.faint.t = 1.5; if (window.onPTRaceEnd) window.onPTRaceEnd({ ok: false, kind: r.kind, km: Math.floor(r.d / r.kmPx), cause: r.faint.cause }); return; }
      r.recover = RECOVER_SECS; r.faint = null;
    }
    return;
  }
  if (r.done) { r.done += dt; r.jy = Math.max(0, r.jy + r.jv * dt); r.jv -= GRAVITY * dt; if (r.done > 2.2 && !r.reported) { r.reported = true; if (window.onPTRaceEnd) window.onPTRaceEnd({ ok: true, kind: r.kind, time: r.clock }); } return; }
  if (r.recover > 0) r.recover -= dt;
  if (r.boost > 0) r.boost -= dt;
  if (r.stumble > 0) r.stumble -= dt;
  if (r.kiss > 0) r.kiss -= dt;
  if (raceCramp()) r.mul = 1;
  r.mul = 1 + (r.mul - 1) * Math.exp(-dt / MUL_DECAY);
  if (r.jy > 0) { r.jy += r.jv * dt; r.jv -= GRAVITY * dt; if (r.jy <= 0) { r.jy = 0; r.jv = 0; if (r.eaten.length) raceCombo(); } }
  // bars drain at fixed rates: speed is its own difficulty (harder to grab items and dodge obstacles); guatita only comes from food
  const ultra = r.kind === 'ultra', sun = raceInSun(), cost = r.cfg.cost;
  r.e -= dt * .012 * cost;
  r.w -= dt * .014 * cost;
  r.g = Math.max(0, r.g - dt * .05);
  if (ultra) {
    r.salt = Math.max(0, r.salt - dt * .004);
    // open-avenue km burn bloqueador; running dry = one insolación faint, then no turbos until reapplied
    if (sun) r.sun = Math.max(0, r.sun - dt * .06);
    if (r.sun <= 0 && !r.quemado) { r.quemado = true; r.burnFaint = true; }
  }
  r.gels = r.gels.filter(gl => { const k = Math.min(gl.left, dt * .4 / 3); r.e = Math.min(1, r.e + k); gl.left -= k; return gl.left > 1e-4; });
  r.e = Math.max(0, r.e); r.w = Math.max(0, r.w);
  if (r.e < .35) raceHint('e'); if (r.w < .35) raceHint('w'); if (r.g > .6) raceHint('g');
  if (r.t > 4 && !r.hinted.fast) raceHint('fast');
  const v = Math.min(r.vmax, JOG * r.mul * (r.stumble > 0 ? .4 : 1) * (r.g > .6 ? .75 : 1) * (r.boost > 0 ? r.turboMul : 1));
  r.d += v * dt; r.clock += dt * r.clockScale; phase += dt * v / 85 * 12;
  raceSpawn();
  const tx = tomiX();
  r.things = r.things.filter(th => {
    const dx = th.x - tx;
    if (th.x - cam < -30) return false;
    if (dx > 0 && dx < 90) raceHint(th.kind === 'rock' ? 'rock' : 'jump');
    if (th.kind === 'item' && Math.abs(dx) < 10 && r.jy > 0 && r.jy + TOMI_H > th.lift - 4) { raceEat(th.it); hearts(th.x, GROUND - th.lift, 1); return false; }
    if (th.kind === 'rock' && !th.hit && Math.abs(dx) < 11 && r.jy < (th.look === 2 ? 3 : 12) && r.recover <= 0) { th.hit = true; r.stumble = STUMBLE_SECS; r.mul = 1; r.boost = 0; burst(tx + 6, GROUND - 6); }
    return true;
  });
  // besito de la suerte: floats ahead a bit faster than a jog; speed up to reach it, jump to grab it
  const lk = r.luck;
  if (lk.state === 'wait' && r.d >= lk.at) { lk.state = 'live'; lk.x = tx + 90; lk.t = 0; showCaption('¡Besito de la suerte!'); raceHint('luck'); }
  if (lk.state === 'live') {
    lk.t += dt; lk.x += JOG * 1.1 * dt;
    if (Math.abs(lk.x - tx) < 12 && r.jy + TOMI_H > ITEM_LO + ITEM_ARC - 4) {
      lk.state = 'gone'; r.g = Math.max(0, r.g - .15); r.kiss = 1.3;
      if (r.lives < 3) { r.lives++; showCaption('+1 ♥'); } else if (!r.quemado) { r.boost = 5; r.turboMul = 1.25; showCaption('¡Turbo de amor!'); }
      // same party as the rage-kiss: hearts and sparkles burst out, the screen shakes
      for (let i = 0, n = reduced ? 14 : 44; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = 30 + Math.random() * 70, kind = i % 4 === 3 ? 's' : Math.random() < .35 ? 'H' : 'h';
        fx.push({ x: tx + 11, y: GROUND - 50, vx: Math.cos(a) * v + JOG, vy: Math.sin(a) * v - 15, life: 1.4 + Math.random() * .6, kind });
      }
      if (window.onPTBoom) window.onPTBoom();
    } else if (lk.t > 7) lk.state = 'gone';
  }
  if (r.d >= r.L) { r.d = r.L; r.done = .001; r.mul = 1; r.jv = JUMP_V; r.jy = .01; hearts(tx, GROUND - 50, 18); return; }
  if (r.recover > 0) return;
  if (r.e <= 0) raceFaint('¡Sin energía!');
  else if (r.w <= 0) raceFaint('¡Sin agua!');
  else if (r.burnFaint) { r.burnFaint = false; raceFaint('¡Insolación!'); }
  else if (ultra && r.salt <= .04) raceFaint('¡Calambre: pocas sales!');
}

const RSEG = () => segWith('arch');
const tomiSX = () => Math.round(W * .38);
const tomiX = () => RSEG().start + race.d;
// pixel art for road things, baked once
const ITEM_ART = {
  gel: [['kkkkk.k', 'kyyyykk', 'kyYYyyk', 'kyyyyyk', 'kKKKKKk', 'kyyyyyk', 'kkkkkkk'], { k: '#1a1a1a', y: '#f0c040', Y: '#fff0a0', K: '#c0392b' }],
  frugele: [['r.....r', 'rrRRRrr', '.RrrrR.', 'rrRRRrr', 'r.....r'], { r: '#e04050', R: '#ff8090' }],
  agua: [['.ww.', '.bb.', 'bccb', 'bccb', 'bccb', 'bccb', 'bbbb'], { w: '#ffffff', b: '#2a6ac8', c: '#8ac8f0' }],
  bloqueador: [['.oo.', 'wwww', 'wwww', 'wOOw', 'wOOw', 'wwww', 'wwww'], { o: '#f08030', w: '#fbf8ee', O: '#f0b040' }],
  sal: [['.ggg.', 'gkgkg', 'ggggg', 'kwwwk', 'kwwwk', 'kwSwk', 'kSwSk', 'kkkkk'], { g: '#b0b4c0', k: '#4a4e5a', w: '#f4f4f8', S: '#c8ccd8' }],
};
// 0 rock, 1 banana peel, 2 pothole (flat: any hop clears it)
const ROCK_ART = [
  [['...kkk...', '..kgGGk..', '.kgGgggk.', 'kggggggdk', 'kgggggddk', '.kkkkkkk.'], { k: '#2a2a30', g: '#8a8a90', G: '#c0c0c8', d: '#6a6a72' }],
  [['.........b.', '........kyk', '.......kyyk', 'b.....kyYk.', 'kyk..kyyk..', '.kyyyyyk...', '..kkkkk....'], { k: '#5a4010', y: '#f6d040', Y: '#fff4a0', b: '#6a4a20' }],
  [['..kkkkkkkk..', '.kKKKKKKKKKk', 'kKKKKKKKKKKk', '.kkkkkkkkkk.'], { k: '#8a8a90', K: '#1e1e24' }],
];
const raceArt = {};
// lucky heart: the story heart, bigger, with a black outline so it pops off the sky
const LUCK_HEART = (() => {
  const w = 21, h = 18, sil = bake(w, h, c => { c.drawImage(HEART, 0, 0, w, h); c.globalCompositeOperation = 'source-in'; c.fillStyle = '#1a1020'; c.fillRect(0, 0, w, h); });
  return bake(w + 4, h + 4, c => { for (const [dx, dy] of [[0, 2], [4, 2], [2, 0], [2, 4], [1, 1], [3, 1], [1, 3], [3, 3]]) c.drawImage(sil, dx, dy); c.drawImage(HEART, 2, 2, w, h); });
})();
const artOf = (key, [rows, pal]) => raceArt[key] || (raceArt[key] = bake(rows[0].length, rows.length, c => map(c, rows, pal)));

function raceFrame(t, dt) {
  if (race.paused) dt = 0;
  raceUpdate(dt);
  const r = race, s = RSEG(), segIdx = SEGS.indexOf(s), finishX = s.start + r.L + 30;
  cam = tomiX() - tomiSX();
  if (!raceCP || raceCP.A.length !== W) { const A = new Int8Array(W).fill(segIdx); raceCP = { A, B: A, Wt: new Float32Array(W) }; }
  renderSky(raceCP); renderFar(raceCP);
  mainCtx.save(); mainCtx.translate(0, offY);
  // the story's lone "42K" sign would repeat every tile and read as a wrong km marker
  const B = built[s.scene]; if (!B.raceNear) { LW = SCENES[s.scene].lw || 768; B.raceNear = bake(LW, H, c => SCENES[s.scene].near(c, { race: true })); }
  drawLayerOf(mainCtx, s, 'mid', t, dt); drawLayerOf(mainCtx, s, 'near', t, dt, B.raceNear);
  if (r.kind === 'ultra') {
    // tree shade over sidewalk and road on shaded km
    const k0 = Math.floor((cam - s.start) / r.kmPx) - 1;
    for (let k = Math.max(0, k0); k < k0 + 3 + W / r.kmPx; k++) {
      if (sunnyKm(k)) continue;
      mainCtx.fillStyle = 'rgba(30,40,80,.22)'; mainCtx.fillRect(Math.round(s.start + k * r.kmPx - cam), 112, Math.ceil(r.kmPx), H - 112);
    }
  }
  for (let k = Math.max(1, Math.floor((cam - s.start) / r.kmPx)); k <= KM_COUNT; k++) {
    const sx = Math.round(s.start + k * r.kmPx - cam); if (sx > W + 20) break; if (sx < -20) continue;
    rect(ctx, sx, 98, 1, 28, '#8a8a8a'); rect(ctx, sx - 9, 90, 20, 9, '#2a4aa8'); text(ctx, String(k), sx - 7 + (k < 10 ? 4 : 0), 92, '#f0c040');
  }
  // finish arch + Milky waiting
  const ax = Math.round(finishX - cam);
  if (ax > -60 && ax < W + 60) {
    const L0 = ax - 44;
    rect(ctx, L0, GROUND - 52, 4, 58, '#2a4aa8'); rect(ctx, ax + 40, GROUND - 52, 4, 58, '#2a4aa8');
    rect(ctx, L0, GROUND - 62, 88, 12, '#2a4aa8'); rect(ctx, L0, GROUND - 62, 88, 1, '#5a7ae0');
    for (let i = 0; i < 44; i++) rect(ctx, L0 + i * 2, GROUND - 50, 2, 1, i % 2 ? '#ffffff' : '#1a1a1a');
    text(ctx, 'META', ax - 7, GROUND - 59, '#f0c040');
    const mx = ax + 30; shadow(mx, 16); sprite(milkySet('shades').idle[Math.floor(t * 2) % 2], mx, GROUND + 2, true);
  }
  // road things: items bob at jump height over a shadow, rocks and litter sit on the asphalt
  r.things.forEach(th => {
    const sx = Math.round(th.x - cam); if (sx < -20 || sx > W + 20) return;
    if (th.kind === 'rock') { const img = artOf('rock' + th.look, ROCK_ART[th.look]), y = th.look === 2 ? GROUND + 6 : GROUND + 3; ctx.drawImage(img, sx - img.width, y - img.height * 2, img.width * 2, img.height * 2); return; }
    const img = artOf(th.it, ITEM_ART[th.it]), y = GROUND - th.lift - Math.round(Math.sin(t * 4 + th.x) * 1.5);
    rect(ctx, sx - 5, GROUND + 1, 11, 1, 'rgba(30,20,30,.25)');
    ctx.drawImage(img, sx - img.width, y - img.height, img.width * 2, img.height * 2);
  });
  const lk = r.luck;
  if (lk.state === 'live') {
    const sx = Math.round(lk.x - cam), y = GROUND - ITEM_LO - ITEM_ARC + Math.round(Math.sin(t * 5) * 3);
    ctx.globalAlpha = lk.t > 6 ? Math.max(0, 7 - lk.t) : 1;
    ctx.drawImage(LUCK_HEART, sx - 12, y - 11);
    for (let k = 0; k < 4; k++) {
      const a = t * 3 + k * Math.PI / 2, px0 = Math.round(sx + Math.cos(a) * 17), py0 = Math.round(y + Math.sin(a) * 14), on = Math.floor(t * 8 + k) % 3;
      if (on) { const col = k % 2 ? '#fff4c0' : '#f6cf6a'; rect(ctx, px0 - on, py0, on * 2 + 1, 1, col); rect(ctx, px0, py0 - on, 1, on * 2 + 1, col); }
    }
    ctx.globalAlpha = 1;
  }
  // runners: Pita alongside, Tomi is the player
  const set = outfitSprites('run'), tx = tomiSX(), finished = r.done > .4;
  const runner = (who, sx, moving, flip, lift) => { const fr = moving ? Math.floor(phase) % 4 : 1; shadow(sx, 20); sprite(set[who].run[lift ? 0 : fr], sx, GROUND + 2 - lift - (moving && fr % 2 ? 1 : 0), flip); };
  if (r.kiss > 0 && !r.faint) { shadow(tx + 23, 20); sprite(set.pita.kiss, tx + 23, GROUND + 2, true); }
  else runner('pita', r.faint ? tx + 22 : tx - 26, !r.faint && !finished, !!r.faint, 0);
  if (r.faint) {
    const ft = r.faint.t, ang = ft < .25 || ft > 2.5 ? -Math.PI / 4 : -Math.PI / 2, img = set.tomi.run[1];
    ctx.save(); ctx.translate(tx, Math.round(GROUND + 1 - Math.abs(Math.sin(ang)) * 12)); ctx.rotate(ang); ctx.drawImage(img, -Math.round(img.width / 2), -img.height + 2); ctx.restore();
    if (ft >= .25 && ft <= 2.5) for (let k = 0; k < 3; k++) { const a = ft * 6 + k * 2.1, x = Math.round(tx - 30 + Math.cos(a) * 9), y = Math.round(GROUND - 20 + Math.sin(a) * 3); rect(ctx, x - 1, y, 3, 1, '#f2d27a'); rect(ctx, x, y - 1, 1, 3, '#f2d27a'); }
  } else {
    // turbo: pulsing gold glow behind Tomi and gold speed lines
    if (r.boost > 0) {
      const yj = Math.round(r.jy), pulse = Math.min(1, r.boost) * (.8 + .2 * Math.sin(t * 14));
      ctx.globalAlpha = .55 * pulse; ell(ctx, tx, GROUND - 24 - yj, 18, 29, '#ffc830'); ctx.globalAlpha = .8 * pulse; ell(ctx, tx, GROUND - 24 - yj, 13, 24, '#fff0a0'); ctx.globalAlpha = 1;
      for (let k = 0; k < 5; k++) { const ly = GROUND - 44 + k * 9 - yj, lx = tx - 28 - ((t * 120 + k * 37) % 40); rect(ctx, Math.round(lx), ly, 12 + (k % 2) * 6, 1, k % 2 ? '#fff4c0' : '#f6cf6a'); }
    }
    if (r.stumble > 0) { const img = set.tomi.run[1]; ctx.save(); ctx.translate(tx, GROUND + 2); ctx.rotate(.35 * Math.sin(r.stumble * Math.PI)); ctx.drawImage(img, -Math.round(img.width / 2), -img.height); ctx.restore(); }
    else if (r.kiss > 0) { shadow(tx, 20); sprite(set.tomi.kiss, tx, GROUND + 2 - Math.round(r.jy), false); if (Math.floor(t * 8) % 3 === 0) hearts(tx + 11, GROUND - 52, 1); }
    else runner('tomi', tx, !finished, false, Math.round(r.jy));
    if (r.mul > 1.25 && Math.floor(t * 10) % 2) { const n = Math.min(4, Math.floor((r.mul - 1) * 3)); for (let k = 0; k < n; k++) rect(ctx, tx - 22 - k * 3, GROUND - 26 + k * 5 - Math.round(r.jy), 6 + k, 1, '#ffffff'); }
    if (r.recover > 0 && Math.floor(t * 4) % 2) text(ctx, '...', tx - 5, GROUND - 46 - Math.round(r.jy), '#ffffff');
  }
  drawFx(dt);
  mainCtx.restore();
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) banner.hidden = true; }
  if (bannerT <= 0 && capQueue.length) { banner.textContent = capQueue.shift(); banner.hidden = false; bannerT = 2.4; }
  const kb = $('b-kiss'); if (!kb.hidden) kb.hidden = true;
  if (window.onPTRaceHUD) window.onPTRaceHUD({
    kind: r.kind, lives: r.lives, km: Math.min(KM_COUNT, r.d / r.kmPx), clock: r.clock, e: r.e, w: r.w, g: r.g, sun: r.sun, salt: r.salt,
    inSun: raceInSun(), burning: r.quemado, cramp: raceCramp(), tapped: r.tapped, faint: r.faint && r.faint.cause,
  });
}
// pixel art as image URLs for the page's glossary
function raceArtURL(key) {
  if (key === 'luck') return LUCK_HEART.toDataURL();
  const rock = /^rock(\d)$/.exec(key);
  return (rock ? artOf(key, ROCK_ART[+rock[1]]) : artOf(key, ITEM_ART[key])).toDataURL();
}
function startRace(kind, w, hs) {
  setViewport(w || W0, hs || H); mode = 'race'; race = newRace(kind);
  fx = []; capQueue = []; bannerT = 0; banner.hidden = true; held.clear(); dir = 0; hint.hidden = true;
}
