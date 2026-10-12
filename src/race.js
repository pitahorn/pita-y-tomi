/* ---------- Desafío 42K ---------- */
// Tomi runs the Maratón de Santiago forever-scrolling; hold = sprint, items feed the bars, 3 faints and out.
// Bars are 0..1: e energía, w agua, g guatita (bad when high), sun bloqueador, salt sales.
const RACE_CFG = {
  facil: { secs: 120, sprintE: 2, sprintW: 1.5, bars: ['e', 'w', 'g'], hints: true },
  ultra: { secs: 240, sprintE: 3, sprintW: 2, bars: ['e', 'w', 'g', 'sun', 'salt'], hints: false },
};
const JOG = 70, SPRINT = 115, TARGET_CLOCK = 3.5 * 3600, FAINT_SECS = 3.2, RECOVER_SECS = 3, FAINT_PENALTY = 360;
const KM_COUNT = 42.195;
let race = null, raceCP = null;

function newRace(kind) {
  const cfg = RACE_CFG[kind], L = cfg.secs * (JOG + SPRINT) / 2;
  return {
    kind, cfg, L, kmPx: L / KM_COUNT, clockScale: TARGET_CLOCK / cfg.secs,
    d: 0, clock: 0, t: 0, lives: 3, e: .8, w: .8, g: 0, sun: 1, salt: 1,
    gels: [], lastWater: -99, quemado: false, faint: null, recover: 0, boost: 0, done: 0, over: false,
    luck: { at: L * (.5 + Math.random() * .35), state: 'wait', x: 0, t: 0 }, hinted: {},
  };
}
// ultra: open avenue (sun) vs tree shade, by km; the first 2 km are shaded to warm up
const sunnyKm = k => k >= 2 && (k * 7 + 3) % 5 < 3;
const raceSprinting = () => held.size > 0 && !race.faint && race.recover <= 0 && !(race.cfg.bars.includes('salt') && race.salt < .2) && !race.done;
const raceInSun = () => race.cfg.bars.includes('sun') && sunnyKm(Math.floor(race.d / race.kmPx));
const raceHint = key => { if (race.cfg.hints && !race.hinted[key]) { race.hinted[key] = true; if (window.onPTRaceHint) window.onPTRaceHint(key); } };

function raceItem(name) {
  const r = race; if (!r || r.faint || r.done || r.over) return;
  const ultra = r.kind === 'ultra';
  if (name === 'gel') { r.gels.push({ left: .4, t: 3 }); r.g += ultra && r.t - r.lastWater > 5 ? .6 : .3; }
  if (name === 'frugele') { r.e = Math.min(1, r.e + .12); r.g += .08; }
  if (name === 'agua') { r.w = Math.min(1, r.w + .3); r.g += .06; r.lastWater = r.t; if (ultra) r.salt = Math.max(0, r.salt - .12); }
  if (name === 'bloqueador' && ultra) { r.sun = 1; r.quemado = false; }
  if (name === 'sal' && ultra) { r.salt = Math.min(1, r.salt + .45); r.w = Math.min(1, r.w + .08); r.g += .05; }
  // overeating hurts right away, not a frame later when the bar has already started to drain
  if (r.g >= 1) { r.g = 1; if (r.recover <= 0) raceFaint('¡Dolor de guatita!'); }
}

function raceFaint(cause) {
  const r = race; r.lives--; r.faint = { t: 0, cause }; held.clear(); dir = 0;
  r.clock += FAINT_PENALTY - FAINT_SECS * r.clockScale;
  showCaption(cause);
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
  if (r.done) { r.done += dt; if (r.done > 2.2 && !r.reported) { r.reported = true; if (window.onPTRaceEnd) window.onPTRaceEnd({ ok: true, kind: r.kind, time: r.clock }); } return; }
  if (r.recover > 0) r.recover -= dt;
  if (r.boost > 0) r.boost -= dt;
  const sprint = raceSprinting(), ultra = r.kind === 'ultra', sun = raceInSun();
  if (sprint) r.hinted.run = true; else if (r.t > 1.5) raceHint('run');
  // drains
  r.e -= dt * .011 * (sprint ? r.cfg.sprintE : 1);
  r.w -= dt * .009 * (sprint ? r.cfg.sprintW : 1) * (sun && r.sun <= 0 ? 2 : 1);
  r.g = Math.max(0, r.g - dt * (sprint ? .01 : .035));
  if (ultra) {
    if (sprint) r.salt = Math.max(0, r.salt - dt * .004);
    if (sun) { r.sun = Math.max(0, r.sun - dt * .07); if (r.sun <= 0) r.quemado = true; }
  }
  r.gels = r.gels.filter(gl => { const k = Math.min(gl.left, dt * .4 / 3); r.e = Math.min(1, r.e + k); gl.left -= k; return gl.left > 1e-4; });
  r.e = Math.max(0, r.e); r.w = Math.max(0, r.w);
  if (r.e < .35) raceHint('e'); if (r.w < .35) raceHint('w'); if (r.g > .6) raceHint('g');
  // move
  const v = (sprint ? SPRINT : JOG) * (r.g > .6 ? .75 : 1) * (r.quemado ? .9 : 1) * (r.boost > 0 ? 1.25 : 1);
  r.d += v * dt; r.clock += dt * r.clockScale; phase += dt * v / 85 * 12;
  // besito de la suerte: drifts ahead at jog speed, only a sprint catches it
  const lk = r.luck;
  if (lk.state === 'wait' && r.d >= lk.at) { lk.state = 'live'; lk.x = tomiX() + 70; lk.t = 0; showCaption('¡Besito de la suerte!'); raceHint('luck'); }
  if (lk.state === 'live') {
    lk.t += dt; lk.x += JOG * dt;
    if (tomiX() >= lk.x - 6) {
      lk.state = 'gone'; r.g = Math.max(0, r.g - .15);
      if (r.lives < 3) { r.lives++; showCaption('+1 ♥'); } else { r.boost = 5; showCaption('¡Turbo de amor!'); }
      hearts(tomiX(), GROUND - 50, 14);
    } else if (lk.t > 6) lk.state = 'gone';
  }
  if (r.d >= r.L) { r.d = r.L; r.done = .001; held.clear(); dir = 0; hearts(tomiX(), GROUND - 50, 18); return; }
  if (r.recover > 0) return;
  if (r.e <= 0) raceFaint('¡Sin energía!');
  else if (r.w <= 0) raceFaint(r.quemado ? '¡Insolación!' : '¡Sin agua!');
  else if (r.g >= 1) raceFaint('¡Dolor de guatita!');
  else if (ultra && r.salt <= .04) raceFaint('¡Calambre: pocas sales!');
}

const RSEG = () => segWith('arch');
const tomiSX = () => Math.round(W * .55);
const tomiX = () => RSEG().start + race.d;

function raceFrame(t, dt) {
  raceUpdate(dt);
  const r = race, s = RSEG(), segIdx = SEGS.indexOf(s), finishX = s.start + r.L + 30;
  cam = tomiX() - tomiSX();
  if (!raceCP || raceCP.A.length !== W) { const A = new Int8Array(W).fill(segIdx); raceCP = { A, B: A, Wt: new Float32Array(W) }; }
  renderSky(raceCP); renderFar(raceCP);
  mainCtx.save(); mainCtx.translate(0, offY);
  // the story's lone "42K" sign would repeat every tile and read as a wrong km marker
  const B = built[s.scene]; if (!B.raceNear) { LW = SCENES[s.scene].lw || 768; B.raceNear = bake(LW, H, c => SCENES[s.scene].near(c, { race: true })); }
  drawLayerOf(mainCtx, s, 'mid', t, dt); drawLayerOf(mainCtx, s, 'near', t, dt, B.raceNear);
  if (r.cfg.bars.includes('sun')) {
    // tree shade over sidewalk and road on shaded km
    const k0 = Math.floor(cam / r.kmPx - s.start / r.kmPx) - 1;
    for (let k = k0; k < k0 + 3 + W / r.kmPx; k++) {
      if (k < 0 || sunnyKm(k)) continue;
      const x0 = Math.round(s.start + k * r.kmPx - cam);
      mainCtx.fillStyle = 'rgba(30,40,80,.22)'; mainCtx.fillRect(x0, 112, Math.ceil(r.kmPx), H - 112);
    }
  }
  // km markers
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
  // lucky heart
  const lk = r.luck;
  if (lk.state === 'live') {
    const sx = Math.round(lk.x - cam), y = GROUND - 34 + Math.round(Math.sin(t * 5) * 3);
    ctx.globalAlpha = lk.t > 5 ? Math.max(0, 6 - lk.t) : 1;
    ctx.drawImage(HEART, sx - 10, y - 9, 21, 18);
    if (Math.floor(t * 6) % 2) { rect(ctx, sx + 11, y - 10, 1, 3, '#ffffff'); rect(ctx, sx + 10, y - 9, 3, 1, '#ffffff'); }
    ctx.globalAlpha = 1;
  }
  // runners: Pita alongside, Tomi is the player
  const set = outfitSprites('run'), tx = tomiSX(), px0 = tx - 26, sprint = raceSprinting();
  const runner = (who, sx, moving, flip) => { const fr = moving ? Math.floor(phase) % 4 : 1; shadow(sx, 20); sprite(set[who].run[fr], sx, GROUND + 2 - (moving && fr % 2 ? 1 : 0), flip); };
  const finished = r.done > .4;
  runner('pita', r.faint ? tx + 22 : px0, !r.faint && !finished, !!r.faint);
  if (r.faint) {
    const ft = r.faint.t, ang = ft < .25 || ft > 2.5 ? -Math.PI / 4 : -Math.PI / 2, img = set.tomi.run[1];
    ctx.save(); ctx.translate(tx, Math.round(GROUND + 1 - Math.abs(Math.sin(ang)) * 12)); ctx.rotate(ang); ctx.drawImage(img, -Math.round(img.width / 2), -img.height + 2); ctx.restore();
    if (ft >= .25 && ft <= 2.5) for (let k = 0; k < 3; k++) { const a = ft * 6 + k * 2.1, x = Math.round(tx - 30 + Math.cos(a) * 9), y = Math.round(GROUND - 20 + Math.sin(a) * 3); rect(ctx, x - 1, y, 3, 1, '#f2d27a'); rect(ctx, x, y - 1, 1, 3, '#f2d27a'); }
  } else {
    runner('tomi', tx, !finished, false);
    if (sprint && Math.floor(t * 10) % 2) { rect(ctx, tx - 22, GROUND - 18, 6, 1, '#ffffff'); rect(ctx, tx - 26, GROUND - 12, 8, 1, '#ffffff'); }
    if (r.recover > 0 && Math.floor(t * 4) % 2) text(ctx, '...', tx - 5, GROUND - 46, '#ffffff');
  }
  drawFx(dt);
  mainCtx.restore();
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) banner.hidden = true; }
  if (bannerT <= 0 && capQueue.length) { banner.textContent = capQueue.shift(); banner.hidden = false; bannerT = 2.4; }
  const kb = $('b-kiss'); if (!kb.hidden) kb.hidden = true;
  if (window.onPTRaceHUD) window.onPTRaceHUD({
    kind: r.kind, lives: r.lives, km: Math.min(KM_COUNT, r.d / r.kmPx), clock: r.clock, e: r.e, w: r.w, g: r.g, sun: r.sun, salt: r.salt,
    inSun: raceInSun(), quemado: r.quemado, cramp: r.cfg.bars.includes('salt') && r.salt < .2, recovering: r.recover > 0, faint: r.faint && r.faint.cause,
  });
}
function startRace(kind, w, hs) {
  setViewport(w || W0, hs || H); mode = 'race'; race = newRace(kind);
  fx = []; capQueue = []; bannerT = 0; banner.hidden = true; held.clear(); dir = 0; hint.hidden = true;
}
