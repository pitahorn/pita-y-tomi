(() => {
let W = window.__GW || 384, PLAYER_SX = Math.round(W * .39), TALL = false;
const W0 = W, H = 168, GROUND = 152, FLY_Y = 96;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const OUT = '#2a1e24';
let LW = 768;

/* ---------- seeded randomness ---------- */
let st = 1;
const seed = s => { st = s >>> 0; };
function rnd() { st |= 0; st = st + 0x6D2B79F5 | 0; let t = Math.imul(st ^ st >>> 15, 1 | st); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const R = (a, b) => a + (b - a) * rnd();
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const periodic = (x, harm) => harm.reduce((s, [k, a, ph]) => s + a * Math.sin(2 * Math.PI * k * x / LW + ph), 0);

/* ---------- pixel helpers ---------- */
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }
function bake(w, h, fn) { const [cv, c] = mk(w, h); fn(c); return cv; }
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
function rect(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function px(c, x, y, col) { rect(c, x, y, 1, 1, col); }
function circle(c, cx, cy, r, col) { for (let dy = -r; dy <= r; dy++) { const dx = Math.floor(Math.sqrt(r * r - dy * dy)); rect(c, cx - dx, cy + dy, 2 * dx + 1, 1, col); } }
function eachEll(cx, cy, rx, ry, fn) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const t = (y + .5 - cy) / ry; if (Math.abs(t) > 1) continue;
    const dx = rx * Math.sqrt(1 - t * t);
    for (let x = Math.round(cx - dx); x < Math.round(cx + dx); x++) fn(x, y);
  }
}
function ell(c, cx, cy, rx, ry, col) {
  c.fillStyle = col;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const t = (y + .5 - cy) / ry; if (Math.abs(t) > 1) continue;
    const dx = rx * Math.sqrt(1 - t * t), x0 = Math.round(cx - dx), x1 = Math.round(cx + dx);
    if (x1 > x0) c.fillRect(x0, y, x1 - x0, 1);
  }
}
function fillPoly(c, pts, col) {
  const ys = pts.map(p => p[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      if ((y1 <= y + .5 && y2 > y + .5) || (y2 <= y + .5 && y1 > y + .5)) xs.push(x1 + (y + .5 - y1) / (y2 - y1) * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) rect(c, Math.round(xs[k]), y, Math.round(xs[k + 1]) - Math.round(xs[k]), 1, col);
  }
}
function line(c, x0, y0, x1, y1, col) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx + dy;
  for (let i = 0; i < 400; i++) { px(c, x0, y0, col); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
function gradient(c, w, y0, y1, stops) {
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / (y1 - y0) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(t)), f = t - i;
    for (let x = 0; x < w; x++) px(c, x, y, f * 16 > BAYER[y & 3][x & 3] ? stops[i + 1] : stops[i]);
  }
  rect(c, 0, y1, w, H - y1, stops[stops.length - 1]);
}
function map(c, rows, pal, x = 0, y = 0) { rows.forEach((row, r) => { for (let k = 0; k < row.length; k++) { const col = pal[row[k]]; if (col) px(c, x + k, y + r, col); } }); }
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; };
function shade(h, f) { const [r, g, b] = hexRgb(h).map(v => Math.max(0, Math.min(255, Math.round(v * f)))); return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1); }
function outline(c, col = OUT) {
  const w = c.canvas.width, h = c.canvas.height, img = c.getImageData(0, 0, w, h), d = img.data, out = new Uint8ClampedArray(d), [r, g, b] = hexRgb(col);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (d[i + 3]) continue;
    const on = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && d[(yy * w + xx) * 4 + 3];
    if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) { out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255; }
  }
  img.data.set(out); c.putImageData(img, 0, 0);
}

/* ---------- tiny 3x5 font ---------- */
const FONT = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'], G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'], J: ['..#', '..#', '..#', '#.#', '.#.'], K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'], N: ['##.', '#.#', '#.#', '#.#', '#.#'], O: ['###', '#.#', '#.#', '#.#', '###'], P: ['##.', '#.#', '##.', '#..', '#..'],
  Q: ['.#.', '#.#', '#.#', '##.', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'], W: ['#.#', '#.#', '###', '###', '#.#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
  0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'], 3: ['##.', '..#', '.#.', '..#', '##.'],
  4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'], 6: ['.##', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'],
  8: ['###', '#.#', '###', '#.#', '###'], 9: ['###', '#.#', '###', '..#', '##.'],
  '!': ['.#.', '.#.', '.#.', '...', '.#.'], '<': ['..#', '.#.', '#..', '.#.', '..#'], '>': ['#..', '.#.', '..#', '.#.', '#..'], '/': ['..#', '..#', '.#.', '#..', '#..'],
  '*': ['...', '#.#', '###', '.#.', '...'], '+': ['...', '.#.', '###', '.#.', '...'], '-': ['...', '...', '###', '...', '...'], '.': ['...', '...', '...', '...', '.#.'],
};
const ACC = { 'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U' };
function text(c, str, x, y, col) {
  [...str].forEach((ch, i) => {
    const X = x + i * 4; let g = ch;
    if (ACC[ch]) { g = ACC[ch]; px(c, X + 1, y - 2, col); }
    if (ch === 'Ñ') { g = 'N'; rect(c, X, y - 2, 3, 1, col); }
    if (FONT[g]) map(c, FONT[g], { '#': col }, X, y);
  });
}
function bigText(c, str, x, y, s, col) {
  const hi = shade(col, 1.3), lo = shade(col, .6);
  [...str].forEach((ch, i) => {
    const g = FONT[ch]; if (!g) return;
    const X = x + i * (3 * s + s);
    g.forEach((row, r) => { for (let k = 0; k < 3; k++) if (row[k] === '#') rect(c, X + k * s + 2, y + r * s + 2, s, s, lo); });
    g.forEach((row, r) => { for (let k = 0; k < 3; k++) if (row[k] === '#') { rect(c, X + k * s, y + r * s, s, s, col); if (r === 0 || g[r - 1][k] !== '#') rect(c, X + k * s, y + r * s, s, 1, hi); } });
  });
}

/* ---------- people ---------- */
const SW = 26, SH = 34;
const BASE_P = { skin: '#f4c9a8', hair: '#a87a4a', hairStyle: 'long', eye: '#3f7a8a', brow: '#8a5a32' };
const BASE_T = { tall: 2, skin: '#e6b38e', hair: '#33261f', hairStyle: 'short', eye: '#3a2a20', brow: '#2a1e1a' };
const OUTFITS = {
  casual: {
    pita: { top: { kind: 'hoodie', color: '#eaa3a8' }, legs: { kind: 'pants', color: '#4c6a9e' }, shoes: '#f0ece4' },
    tomi: { top: { kind: 'sweater', color: '#f1e9d6' }, legs: { kind: 'pants', color: '#55729e' }, shoes: '#3a3036' },
  },
  student: {
    pita: { top: { kind: 'hoodie', color: '#eaa3a8' }, legs: { kind: 'pants', color: '#4c6a9e' }, shoes: '#f0ece4', backpack: '#4f9a9a' },
    tomi: { top: { kind: 'sweater', color: '#f1e9d6' }, legs: { kind: 'pants', color: '#55729e' }, shoes: '#3a3036', backpack: '#2a3a6a' },
  },
  run: {
    pita: { top: { kind: 'tank', color: '#bfe3ee' }, sleeves: '#f4f4f4', legs: { kind: 'bike', color: '#8fd0cc' }, shoes: '#f0d8d0', hat: { kind: 'cap', color: '#eaa0b4' }, glasses: 'sun', bib: true },
    tomi: { top: { kind: 'tee', color: '#6a6e78' }, legs: { kind: 'shorts', color: '#23232a' }, shoes: '#2a2a34', bib: true },
  },
  ski: {
    pita: { top: { kind: 'jacket', color: '#6a3a9a', accent: '#e070b0' }, legs: { kind: 'pants', color: '#2a2a34' }, shoes: '#3a3036', hat: { kind: 'beanie', color: '#e070a0' }, glasses: 'goggles', skis: '#e04a6a' },
    tomi: { top: { kind: 'jacket', color: '#b89a6a' }, legs: { kind: 'pants', color: '#2a2a34' }, shoes: '#3a3036', hat: { kind: 'beanie', color: '#2f3240' }, glasses: 'goggles', skis: '#2a7ac8' },
  },
  ceremony: {
    pita: { top: { kind: 'suit', color: '#d0409a' }, legs: { kind: 'pants', color: '#c23a90' }, shoes: '#f0ece4', hat: { kind: 'grad' }, flowers: true },
    tomi: { top: { kind: 'suit', color: '#23283a' }, tie: '#3a5aa8', legs: { kind: 'pants', color: '#1e2230' }, shoes: '#1a1a20', hat: { kind: 'grad' } },
  },
  home: {
    pita: { top: { kind: 'shirt', color: '#c8a0e0' }, legs: { kind: 'pants', color: '#4c6a9e' }, shoes: '#3a3036', glasses: 'round' },
    tomi: { top: { kind: 'tee', color: '#7a7e88' }, legs: { kind: 'pants', color: '#55729e' }, shoes: '#3a3036' },
  },
  patagonia: {
    pita: { top: { kind: 'jacket', color: '#4a3080', accent: '#d0508a' }, legs: { kind: 'pants', color: '#22222a' }, shoes: '#3a3036', hat: { kind: 'beanie', color: '#7a3a8a' }, scarf: '#e4b4b4' },
    tomi: { top: { kind: 'jacket', color: '#b89a6a' }, legs: { kind: 'pants', color: '#23283a' }, shoes: '#3a3036' },
  },
};
OUTFITS.covid = { pita: { ...OUTFITS.student.pita, mask: true }, tomi: { ...OUTFITS.student.tomi, mask: true } };
const WALK = [[3, -3], [0, 0], [-3, 3], [0, 0]], RUN = [[4, -4], [1, -1], [-4, 4], [-1, 1]];

function drawPerson(c, s, lf, lb, run, kneel, kissPose, sit) {
  const sk = s.skin, skS = shade(sk, .86), hair = s.hair, hairS = shade(hair, .78);
  const top = s.top, tc = top.color, tcS = shade(tc, .8), lc = s.legs.color, lcS = shade(lc, .75);
  const jacket = top.kind === 'jacket', suit = top.kind === 'suit', tx0 = jacket || suit ? 7 : 8, tx1 = jacket || suit ? 17 : 16;
  const armK = run ? 1 : .7, tl = s.tall || 0;
  if (kneel || sit) c.translate(0, tl);
  const arm = (dx, back) => {
    const x0 = back ? 9 : 12, sleeveRows = top.kind === 'tee' ? 3 : top.kind === 'tank' ? 0 : top.kind === 'shirt' ? 4 : 7;
    for (let r = 0; r < 7; r++) {
      const x = x0 + Math.round(dx * r / 6);
      let cc = r < sleeveRows ? (back ? tcS : tc) : s.sleeves && r >= 1 ? (back ? shade(s.sleeves, .85) : s.sleeves) : (back ? skS : sk);
      rect(c, x, 17 + r, 3, 1, cc);
      if (!back && r < sleeveRows) px(c, x, 17 + r, shade(tc, .88));
    }
    const hx = x0 + Math.round(dx);
    rect(c, hx, 24, 3, 2, back ? skS : sk);
    return [hx + 1, 25];
  };
  const leg = (dx, back) => {
    const x0 = back ? 9 : 12; let lx = x0;
    for (let r = 0; r < 5 + tl; r++) {
      const x = x0 + Math.round(dx * r / (4 + tl)); lx = x;
      let cc = back ? lcS : lc;
      if (s.legs.kind === 'shorts' && r >= 2) cc = back ? skS : sk;
      if (s.legs.kind === 'bike' && r >= 3) cc = back ? skS : sk;
      rect(c, x, 25 + r, 3, 1, cc);
    }
    rect(c, lx, 30 + tl, 4, 2, back ? shade(s.shoes, .78) : s.shoes);
    if (!back) rect(c, lx, 31 + tl, 4, 1, shade(s.shoes, .7));
  };
  if (sit) { rect(c, 9, 27, 9, 3, lcS); rect(c, 12, 27, 7, 3, lc); rect(c, 16, 29, 3, 2, lc); rect(c, 16, 31, 4, 1, s.shoes); c.translate(0, 4); }
  if (kneel) {
    rect(c, 9, 28, 3, 3, lcS); rect(c, 4, 30, 8, 2, lcS); rect(c, 2, 29, 3, 3, shade(s.shoes, .78));
    rect(c, 12, 27, 6, 3, lc); rect(c, 15, 27, 3, 4, lc); rect(c, 15, 30, 5, 2, s.shoes); rect(c, 15, 31, 5, 1, shade(s.shoes, .7));
    c.translate(0, 3);
  }
  if (s.backpack) { rect(c, 4, 16, 5, 9, s.backpack); rect(c, 4, 16, 1, 9, shade(s.backpack, .75)); rect(c, 4, 16, 5, 2, shade(s.backpack, 1.2)); }
  if (s.hairStyle === 'long') { rect(c, 5, 9, 5, 13, hair); rect(c, 5, 9, 1, 13, hairS); rect(c, 6, 20, 3, 2, hairS); }
  if (top.kind === 'hoodie') rect(c, 7, 14, 3, 3, tcS);
  arm(-lb * armK, true);
  if (!kneel && !sit) { leg(lb, true); leg(lf, false); }
  rect(c, tx0, 16, tx1 - tx0 + 1, 9, tc); rect(c, tx0, 16, 2, 9, tcS); rect(c, tx0, 24, tx1 - tx0 + 1, 1, tcS);
  if (top.kind === 'hoodie') { px(c, 13, 17, '#f4f0ea'); px(c, 15, 17, '#f4f0ea'); px(c, 13, 18, '#f4f0ea'); px(c, 15, 18, '#f4f0ea'); rect(c, 11, 21, 5, 1, tcS); }
  if (top.kind === 'tee') rect(c, 11, 16, 4, 1, tcS);
  if (top.kind === 'tank') { rect(c, 10, 16, 6, 1, sk); rect(c, 9, 16, 2, 6, '#e8ecf0'); rect(c, 15, 16, 2, 6, '#e8ecf0'); }
  if (top.kind === 'shirt') { rect(c, 12, 16, 3, 1, shade(tc, 1.18)); for (let y = 18; y < 24; y += 2) px(c, 14, y, tcS); rect(c, tx0, 23, tx1 - tx0 + 1, 1, '#2a2a30'); }
  if (jacket) {
    rect(c, 9, 15, 8, 2, tc); rect(c, 14, 17, 1, 7, tcS);
    if (top.accent) [[10, 19], [12, 21], [16, 19], [9, 22], [11, 18], [15, 23], [13, 20]].forEach(([x, y]) => px(c, x, y, top.accent));
  }
  if (suit) { fillPoly(c, [[11, 16], [17, 16], [14, 20]], '#f4f4f4'); if (s.tie) rect(c, 14, 17, 1, 5, s.tie); px(c, 15, 21, tcS); px(c, 15, 23, tcS); }
  if (s.bib) { rect(c, 10, 20, 6, 4, '#f4f4f4'); rect(c, 10, 20, 6, 1, '#2a4aa8'); rect(c, 10, 23, 6, 1, '#f0c040'); px(c, 11, 21, '#2a2a34'); px(c, 13, 21, '#2a2a34'); px(c, 14, 22, '#2a2a34'); }
  if (s.backpack) rect(c, 10, 17, 1, 5, shade(s.backpack, .7));
  if (s.scarf) { rect(c, 8, 15, 9, 3, s.scarf); rect(c, 8, 15, 2, 3, shade(s.scarf, .82)); rect(c, 14, 18, 2, 6, s.scarf); px(c, 14, 24, shade(s.scarf, .8)); }
  if (kissPose) c.translate(1, 0);
  rect(c, 11, 15, 3, 2, skS);
  const long = s.hairStyle === 'long', hat = s.hat, hairHi = shade(hair, 1.35);
  ell(c, 12.5, 9, 6.6, 6.4, sk);
  if (long) {
    ell(c, 12.5, 4.8, 7.2, 3, hair);
    rect(c, 5, 5, 3, 12, hair); rect(c, 5, 5, 1, 12, hairS);
    rect(c, 18, 6, 2, 14, hair); rect(c, 19, 12, 1, 8, hairS);
    rect(c, 6, 6, 5, 2, hair); rect(c, 16, 6, 3, 2, hair);
    px(c, 12, 2, hairS); px(c, 12, 3, hairS);
    rect(c, 8, 3, 3, 1, hairHi); rect(c, 14, 3, 3, 1, hairHi);
  } else {
    ell(c, 12.3, 4.6, 7.6, 3, hair);
    rect(c, 6, 6, 11, 1, hair); rect(c, 9, 7, 4, 1, hair);
    rect(c, 5, 6, 2, 3, hair); rect(c, 6, 7, 3, 1, hairS);
    rect(c, 9, 2, 5, 1, hairHi); px(c, 14, 3, hairHi);
    px(c, 5, 10, skS); px(c, 5, 11, skS);
  }
  if (hat && hat.kind === 'cap') { ell(c, 12.5, 4.5, 7, 2.8, hat.color); rect(c, 14, 6, 8, 1, shade(hat.color, .78)); rect(c, 9, 3, 3, 1, shade(hat.color, 1.15)); }
  if (hat && hat.kind === 'grad') { rect(c, 8, 2, 10, 4, '#2a2a30'); rect(c, 4, 1, 18, 2, '#1a1a1e'); rect(c, 5, 1, 16, 1, '#3a3a44'); px(c, 13, 0, '#f0c040'); rect(c, 20, 2, 1, 4, '#f0c040'); px(c, 20, 6, '#f8d860'); }
  if (hat && hat.kind === 'beanie') { ell(c, 12.5, 4.4, 7.2, 3.4, hat.color); rect(c, 5, 6, 15, 2, shade(hat.color, .8)); rect(c, 11, 0, 3, 2, shade(hat.color, 1.3)); }
  rect(c, 11, 8, 2, 1, s.brow); rect(c, 15, 8, 3, 1, s.brow);
  for (const ex of [12, 16]) { if (kissPose) rect(c, ex - 1, 11, 2, 1, '#2a1e24'); else { px(c, ex, 10, '#2a1e24'); px(c, ex, 11, s.eye); } }
  px(c, 11, 12, '#f0a0a0'); px(c, 17, 12, '#f0a0a0');
  if (kissPose) { px(c, 16, 13, '#b04a5a'); px(c, 17, 13, '#c05a6a'); } 
  if (s.mask) { rect(c, 11, 12, 8, 3, '#cfe8f4'); rect(c, 11, 13, 8, 1, '#a8cce0'); rect(c, 7, 11, 4, 1, '#e8f4fa'); }
  if (s.glasses === 'round') { for (const ex of [12, 16]) { rect(c, ex - 1, 9, 3, 1, OUT); rect(c, ex - 1, 12, 3, 1, OUT); px(c, ex - 1, 10, OUT); px(c, ex - 1, 11, OUT); px(c, ex + 1, 10, OUT); px(c, ex + 1, 11, OUT); } px(c, 14, 10, OUT); rect(c, 7, 10, 4, 1, OUT); }
  if (s.glasses === 'sun') { rect(c, 10, 10, 9, 2, '#26263c'); rect(c, 10, 10, 9, 1, '#e8609a'); px(c, 12, 10, '#f8b070'); px(c, 16, 11, '#5a5a8a'); }
  if (s.glasses === 'goggles') { rect(c, 5, 9, 6, 2, '#2a2a34'); rect(c, 10, 9, 10, 3, '#f0a030'); rect(c, 11, 9, 3, 1, '#ffe8a0'); rect(c, 10, 12, 10, 1, '#2a2a34'); }
  if (sit) {
    rect(c, 12, 19, 5, 3, top.kind === 'tee' || top.kind === 'tank' ? sk : tc); rect(c, 17, 18, 2, 3, sk);
    if (sit === 'mug') { rect(c, 18, 15, 3, 4, '#f4f0e8'); px(c, 21, 16, '#f4f0e8'); px(c, 21, 17, '#f4f0e8'); rect(c, 18, 15, 3, 1, '#5a3a20'); }
    else { ell(c, 19.5, 16.5, 3, 2, '#d8a050'); px(c, 18, 15, '#f0c070'); rect(c, 18, 14, 3, 1, '#f8d848'); px(c, 21, 14, '#8ac04a'); px(c, 20, 14, '#5a8a2a'); }
    return;
  }
  if (kissPose) { rect(c, 12, 18, 7, 3, top.kind === 'tee' || top.kind === 'tank' ? sk : tc); rect(c, 12, 18, 1, 3, shade(tc, .88)); rect(c, 19, 18, 2, 3, sk); return; }
  if (kneel) { rect(c, 12, 17, 8, 3, top.kind === 'tee' || top.kind === 'tank' ? sk : tc); rect(c, 12, 17, 1, 3, shade(tc, .88)); rect(c, 20, 16, 2, 3, sk); px(c, 22, 15, '#f0c040'); px(c, 22, 14, '#bfe8ff'); px(c, 23, 15, '#f0c040'); return; }
  const hand = arm(-lf * armK, false);
  if (s.flowers) { fillPoly(c, [[hand[0] - 2, hand[1] - 3], [hand[0] + 4, hand[1] - 3], [hand[0] + 1, hand[1] + 3]], '#e0602a'); [[-2, -5], [1, -6], [4, -5], [0, -3], [3, -3]].forEach(([dx, dy], i) => rect(c, hand[0] + dx, hand[1] + dy, 2, 2, i % 2 ? '#e03a4a' : '#b02030')); px(c, hand[0] - 3, hand[1] - 4, '#4a8a3a'); px(c, hand[0] + 6, hand[1] - 4, '#4a8a3a'); }
  if (s.skis) {
    line(c, hand[0], hand[1], 3, 31 + tl, '#9aa0a8');
    rect(c, 1, 31 + tl, 22, 1, s.skis); px(c, 22, 30 + tl, s.skis); px(c, 23, 29 + tl, s.skis);
  }
}
const SPRITE_SCALE = 1.5;
function grow(src) { const w = Math.round(src.width * SPRITE_SCALE), h = Math.round(src.height * SPRITE_SCALE); return bake(w, h, c => { c.drawImage(src, 0, 0, w, h); outline(c); }); }
function person(spec, lf, lb, run, kneel, kissPose, sit) {
  const cv = grow(bake(SW, SH + (spec.tall || 0), c => { c.save(); c.translate(1, 1); drawPerson(c, spec, lf, lb, run, kneel, kissPose, sit); c.restore(); }));
  if (!kissPose && !spec.mask) {
    const c = cv.getContext('2d'), dy = kneel ? Math.round((3 + (spec.tall || 0)) * SPRITE_SCALE) : sit ? Math.round((4 + (spec.tall || 0)) * SPRITE_SCALE) : 0;
    px(c, 21, 21 + dy, '#8e3a4a'); rect(c, 22, 22 + dy, 3, 1, '#a04a56'); px(c, 25, 21 + dy, '#8e3a4a');
  }
  return cv;
}
const spriteCache = {};
function outfitSprites(key) {
  if (spriteCache[key]) return spriteCache[key];
  const res = {};
  for (const who of ['pita', 'tomi']) {
    const spec = { ...(who === 'pita' ? BASE_P : BASE_T), ...OUTFITS[key][who] };
    res[who] = { walk: WALK.map(([f, b]) => person(spec, f, b)), run: RUN.map(([f, b]) => person(spec, f, b, true)), ski: person(spec, 2, -2), kneel: person(spec, 0, 0, false, true), kiss: person(spec, 0, 0, false, false, true), sitMug: person(spec, 0, 0, false, false, false, 'mug'), sitBread: person(spec, 0, 0, false, false, false, 'bread') };
  }
  return spriteCache[key] = res;
}

/* ---------- dragons ---------- */
const DRAGON_PAL = {
  pita: { g: '#6fb04a', G: '#4a8236', h: '#7cc056', y: '#f3e3a0', w: '#4f9a6a', W: '#33704c', k: '#f3e3a0' },
  tomi: { g: '#5fc0c4', G: '#3a8a94', h: '#f0c24e', y: '#f6e2a8', w: '#e0a83c', W: '#2c2c34', k: '#f3e3a0', spots: true },
};
function dragonSprite(p, flap) {
  return grow(bake(32, 28, c => {
    c.save(); c.translate(1, 1);
    fillPoly(c, [[11, 13], [3, 1 + flap], [7, 4 + flap], [9, 3 + flap], [13, 8]], p.w);
    line(c, 11, 12, 4, 2 + flap, p.W); line(c, 12, 10, 8, 4 + flap, p.W);
    for (let i = 0; i < 8; i++) rect(c, 6 - i * .7, 21 - i * .9, 3 - Math.floor(i / 3), 2, p.G);
    ell(c, 10, 24, 3, 1.6, p.G);
    ell(c, 13, 18, 8, 6.5, p.G); ell(c, 14, 17, 7, 5.5, p.g);
    ell(c, 17, 19.5, 3.5, 4.5, p.y);
    if (p.spots) [[9, 15], [12, 21], [7, 19], [11, 14]].forEach(([x, y]) => rect(c, x, y, 2, 2, '#2a2a34'));
    ell(c, 17, 24.5, 3, 1.6, p.g);
    ell(c, 20, 10, 6, 5.5, p.h); ell(c, 25.5, 12, 3.6, 2.6, p.h);
    if (p.spots) rect(c, 17, 7, 2, 7, '#2a2a34');
    rect(c, 17, 2, 1, 3, p.k); rect(c, 18, 3, 1, 2, p.k); rect(c, 21, 1, 1, 4, p.k); rect(c, 22, 2, 1, 3, p.k);
    rect(c, 21, 8, 2, 2, '#1c1a1e'); px(c, 22, 8, '#ffffff');
    px(c, 28, 11, OUT); rect(c, 24, 14, 3, 1, shade(p.h, .65));
    c.restore();
  }));
}

/* ---------- Milky ---------- */
const MO = '#e8964a', MD = '#c0682c', MW = '#fff4e6';
function milkyWalk(c, f, sway, blink, acc) {
  const offs = [[1, -1, -1, 1], [0, 0, 0, 0], [-1, 1, 1, -1], [0, 0, 0, 0]][f];
  [[3, 10], [2, 9], [1, 8], [1, 7], [1, 6], [2, 5], [2, 4]].forEach(([x, y], i) => rect(c, x + (i > 3 ? sway : 0), y, 2, 1, MO));
  rect(c, 2 + sway, 3, 2, 1, MW);
  [[8, offs[1]], [16, offs[3]]].forEach(([x, o]) => { rect(c, x + o, 12, 2, 3, MD); rect(c, x + o, 14, 2, 1, shade(MW, .85)); });
  ell(c, 10, 9.5, 7, 3.8, MO); ell(c, 11, 11.4, 5, 1.6, MW);
  [6, 9, 12].forEach(x => rect(c, x, 6, 1, 2, MD));
  [[5, offs[0]], [13, offs[2]]].forEach(([x, o]) => { rect(c, x + o, 12, 2, 3, MO); rect(c, x + o, 14, 2, 1, MW); });
  ell(c, 15.5, 9.5, 2.2, 2.8, MW);
  ell(c, 17.5, 5.5, 4, 3.4, MO);
  px(c, 14, 1, MO); px(c, 14, 2, MO); px(c, 15, 2, MO); px(c, 19, 1, MO); px(c, 19, 2, MO); px(c, 20, 2, MO);
  px(c, 14, 2, '#f0a0a0'); px(c, 19, 2, '#f0a0a0');
  ell(c, 19.5, 7.3, 2, 1.3, MW); px(c, 21, 6, '#f0909a'); px(c, 17, 3, MD);
  px(c, 18, 5, blink ? MD : '#5a6a1a');
  if (acc === 'raincoat') { ell(c, 10, 8.4, 7.2, 3.2, '#f0c030'); rect(c, 4, 10, 13, 1, '#d0a020'); ell(c, 17.5, 3.6, 4.4, 2.4, '#f0c030'); px(c, 15, 2, '#f8e070'); }
  if (acc === 'bandana') { rect(c, 14, 8, 4, 2, '#c0383e'); px(c, 15, 10, '#c0383e'); px(c, 16, 8, '#e05a5e'); }
  if (acc === 'backpack') { rect(c, 6, 4, 6, 4, '#4f9a9a'); rect(c, 6, 4, 6, 1, '#6abcbc'); px(c, 12, 7, '#2f6a6a'); }
  if (acc === 'cap') { rect(c, 14, 1, 7, 1, '#1a1a1a'); rect(c, 15, 2, 5, 1, '#2a2a2a'); px(c, 20, 2, '#f0c040'); px(c, 20, 3, '#f0c040'); }
  if (acc === 'shades') { rect(c, 16, 4, 6, 2, '#26263c'); rect(c, 16, 4, 6, 1, '#e8609a'); rect(c, 13, 4, 3, 1, '#1a1a1a'); }
  if (acc === 'ski') { rect(c, 14, 1, 7, 3, '#e070a0'); rect(c, 14, 3, 7, 1, '#b84a80'); px(c, 17, 0, '#ffc0e0'); rect(c, 2, 15, 19, 1, '#2a7ac8'); px(c, 21, 14, '#2a7ac8'); }
  if (acc === 'goggles') { rect(c, 14, 1, 7, 2, '#e8e8f0'); rect(c, 16, 4, 5, 2, '#f0a030'); px(c, 16, 4, '#ffe8a0'); rect(c, 13, 4, 3, 1, '#2a2a34'); }
  if (acc === 'mask') { rect(c, 18, 6, 4, 3, '#cfe8f4'); rect(c, 18, 7, 4, 1, '#a8cce0'); px(c, 17, 5, '#e8f4fa'); }
  if (acc === 'scarf') { rect(c, 13, 8, 5, 2, '#e4b4b4'); rect(c, 14, 10, 2, 3, '#e4b4b4'); px(c, 16, 9, '#c89090'); }
}
function milkySleep(c) {
  rect(c, 3, 14, 13, 1, MO); rect(c, 14, 14, 2, 1, MW);
  ell(c, 11, 11, 8, 4, MO); ell(c, 12, 13, 6, 1.5, MW);
  [7, 10, 13].forEach(x => rect(c, x, 7, 1, 2, MD));
  ell(c, 17, 10, 4, 3, MO);
  px(c, 15, 6, MO); px(c, 15, 7, MO); px(c, 16, 7, MO); px(c, 19, 6, MO); px(c, 19, 7, MO); px(c, 20, 7, MO);
  ell(c, 19, 11.6, 2, 1.2, MW); rect(c, 17, 10, 2, 1, MD); px(c, 21, 11, '#f0909a');
}
function buildMilky(acc, baby) {
  const mkM = fn => { const cv = bake(24, 18, c => { c.save(); c.translate(1, 1); fn(c); c.restore(); }); return baby ? bake(24, 18, c => { c.drawImage(cv, 0, 0); outline(c); }) : grow(cv); };
  return {
    walk: [0, 1, 2, 3].map(f => mkM(c => milkyWalk(c, f, f % 2, false, acc))),
    idle: [0, 1].map(sw => mkM(c => milkyWalk(c, 1, sw, false, acc))),
    blink: mkM(c => milkyWalk(c, 1, 0, true, acc)),
    sleep: mkM(milkySleep),
  };
}
const RING = bake(13, 13, c => {
  c.save(); c.translate(1, 1);
  eachEll(5.5, 7, 4, 3.5, (x, y) => { const t = Math.hypot((x + .5 - 5.5) / 4, (y + .5 - 7) / 3.5); if (t > .62) px(c, x, y, y < 7 ? '#f8d860' : '#d0a030'); });
  rect(c, 4, 0, 3, 3, '#bfe8ff'); px(c, 4, 0, '#ffffff'); px(c, 5, 3, '#d0a030');
  c.restore(); outline(c);
});
const HEART = bake(7, 6, c => map(c, ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'], { '#': '#e0505a' }));

/* ---------- scenery pieces ---------- */
function mountains(c, heightAt, snowAt, pal) {
  const hs = [];
  for (let x = -1; x <= LW; x++) hs.push(Math.round(heightAt(x)));
  for (let x = 0; x < LW; x++) {
    const h = hs[x + 1], sh = hs[x + 2] > hs[x], sl = snowAt ? snowAt(x, h) : -1;
    for (let y = h; y < H; y++) {
      const snow = y < sl || (y < sl + 2 && BAYER[y & 3][x & 3] > 8);
      px(c, x, y, snow ? (sh ? pal.snowShade : pal.snow) : (sh ? pal.rockShade : pal.rock));
    }
  }
}
const ANDES_HARM = [[2, 16, .5], [5, 10, 1.1], [9, 6, 2.3], [17, 3, .7], [29, 2, 1.9]];
function andes(c, base, pal, foot) {
  mountains(c, x => base + periodic(x, ANDES_HARM) - Math.abs(Math.sin(x * .21)) * 2, (x, h) => h + 8 + Math.abs(Math.sin(x * .13)) * 6 + Math.abs(Math.sin(x * .37)) * 4, pal);
  if (foot) mountains(c, x => base + 32 + periodic(x, [[3, 4, 1], [7, 3, 2.2], [15, 1.5, .3]]), null, foot);
}
const ANDES_DAY = { rock: '#8a8fa8', rockShade: '#6c7090', snow: '#ffffff', snowShade: '#d0d8e8' }, FOOT_DAY = { rock: '#9a9a8a', rockShade: '#828272' };
function cloud(c, x, y, col, hi) { [[0, 0, 7], [8, -3, 8], [17, 0, 6], [-7, 2, 5], [24, 2, 4]].forEach(([dx, dy, r]) => circle(c, x + dx, y + dy, r, col)); [[8, -9, 3], [1, -5, 3]].forEach(([dx, dy, r]) => circle(c, x + dx, y + dy, r, hi)); }
function araucaria(c, x, base, s = 1) {
  const h = Math.round(62 * s), top = base - h, D = '#2e5a36', L = '#4a7a4a';
  rect(c, x - 1, top + 4, 3, h - 4, '#6a4a32'); rect(c, x + 1, top + 4, 1, h - 4, '#4e3424');
  for (let i = 0; i < 5; i++) {
    const y = top + 3 + i * Math.round(6 * s), len = Math.round((6 + i * 4) * s);
    for (const sg of [-1, 1]) {
      for (let k = 1; k <= len; k++) { const yy = y + Math.round(Math.sin(k / len * Math.PI) * 2 * s); rect(c, x + sg * k, yy - 1, 1, 3, D); px(c, x + sg * k, yy - 1, L); }
      rect(c, x + sg * len, y - 3, 1, 3, D); px(c, x + sg * len, y - 3, L);
    }
  }
  rect(c, x - 4, top, 9, 3, D); rect(c, x - 3, top - 1, 7, 1, L);
}
const MINI_ARAUCARIA = ['..xxx..', '.xxxxx.', 'xx.x.xx', '.xxxxx.', 'xx.x.xx', '...x...', '...x...', '...x...'];
function house(c, x, y, wall, roof) {
  const w = 22, hh = 14;
  rect(c, x, y - hh, w, hh, wall);
  for (let r = y - hh + 2; r < y; r += 3) for (let k = x + (r % 2 ? 0 : 2); k < x + w; k += 4) px(c, k, r, shade(wall, .86));
  rect(c, x + w - 6, y - hh - 13, 3, 7, '#8a5a4a');
  fillPoly(c, [[x - 3, y - hh], [x + w / 2, y - hh - 12], [x + w + 3, y - hh]], roof);
  rect(c, x - 3, y - hh, w + 6, 1, shade(roof, .7));
  rect(c, x + w / 2 - 2, y - hh - 7, 4, 4, '#ffffff'); rect(c, x + w / 2 - 1, y - hh - 6, 2, 2, '#f2d27a');
  for (const wx of [x + 3, x + 14]) { rect(c, wx, y - hh + 3, 5, 5, '#ffffff'); rect(c, wx + 1, y - hh + 4, 3, 3, '#f2d27a'); px(c, wx + 2, y - hh + 4, '#ffffff'); px(c, wx + 2, y - hh + 6, '#ffffff'); }
  rect(c, x + 9, y - 7, 4, 7, shade(roof, .8)); rect(c, x + 8, y, 6, 1, '#c8c0b0');
  return { x: x + w - 5, y: y - hh - 15 };
}
function schule(c, x, base) {
  const w = 132, h = 40, top = base - h, cx = x + 66;
  rect(c, x, top, w, h, '#ece2cc'); rect(c, x + w - 3, top, 3, h, '#d4c8ae');
  fillPoly(c, [[x - 4, top], [x + 8, top - 10], [x + w - 8, top - 10], [x + w + 4, top]], '#a8402e');
  for (let k = x; k < x + w; k += 4) { px(c, k, top - 3, '#8a3020'); px(c, k + 2, top - 7, '#8a3020'); }
  rect(c, x - 4, top, w + 8, 1, '#7a2a1a');
  for (const wy of [top + 5, top + 20]) for (let wx = x + 6; wx < x + w - 6; wx += 12) { if (wx > x + 50 && wx < x + 78) continue; rect(c, wx, wy, 7, 9, '#ffffff'); rect(c, wx + 1, wy + 1, 5, 7, '#5a7a9a'); rect(c, wx + 3, wy + 1, 1, 7, '#ffffff'); }
  rect(c, cx - 13, top - 6, 26, h + 6, '#f4ecd8');
  fillPoly(c, [[cx - 16, top - 6], [cx, top - 18], [cx + 16, top - 6]], '#a8402e'); rect(c, cx - 16, top - 6, 32, 1, '#7a2a1a');
  circle(c, cx, top - 11, 2, '#ffffff'); px(c, cx, top - 12, '#3a3a3a');
  rect(c, cx - 4, top + 3, 8, 8, '#ffffff'); rect(c, cx - 3, top + 4, 6, 6, '#5a7a9a');
  rect(c, cx - 31, base - 23, 62, 8, '#2a3a5a'); text(c, 'DEUTSCHE SCHULE', cx - 29, base - 21, '#f4ecd8');
  rect(c, cx - 5, base - 14, 10, 14, '#5a3a2e'); rect(c, cx, base - 14, 1, 14, '#3a2418'); rect(c, cx - 8, base, 16, 2, '#c8c0b0');
  const fp = x + w + 8; rect(c, fp, top - 20, 1, h + 20, '#d0d0d0');
  rect(c, fp + 1, top - 20, 12, 4, '#ffffff'); rect(c, fp + 1, top - 20, 4, 4, '#2a4aa8'); px(c, fp + 3, top - 18, '#ffffff'); rect(c, fp + 1, top - 16, 12, 4, '#d03030');
  const gp = x - 8; rect(c, gp, top - 20, 1, h + 20, '#d0d0d0');
  rect(c, gp - 12, top - 20, 12, 3, '#1a1a1a'); rect(c, gp - 12, top - 17, 12, 3, '#d02020'); rect(c, gp - 12, top - 14, 12, 3, '#f0c020');
}
function fence(c, x0, x1, base) {
  for (let x = x0; x <= x1; x += 8) { rect(c, x, base - 10, 2, 10, '#7a5a3e'); px(c, x, base - 10, '#9a7a5a'); }
  rect(c, x0, base - 8, x1 - x0 + 2, 1, '#8a6a4a'); rect(c, x0, base - 4, x1 - x0 + 2, 1, '#8a6a4a');
  for (let x = x0; x <= x1; x++) {
    const y = base - 10 + Math.round(Math.sin(x * .4));
    px(c, x, y, '#3f6b3a');
    if (rnd() < .2) { rect(c, x, y + 1, 1, 2, '#c8303a'); px(c, x, y + 3, '#e65a62'); }
  }
}
function station(c, x, base) {
  rect(c, x, base - 26, 60, 26, '#d8c8a0');
  for (let i = x + 2; i < x + 60; i += 3) rect(c, i, base - 26, 1, 26, '#c4b288');
  rect(c, x - 4, base - 30, 68, 4, '#8a3a3a'); rect(c, x - 4, base - 31, 68, 1, '#a84a4a');
  rect(c, x + 8, base - 16, 6, 16, '#5a3a2e'); rect(c, x + 46, base - 16, 6, 16, '#5a3a2e');
  rect(c, x + 22, base - 18, 16, 8, '#f2d27a'); rect(c, x + 29, base - 18, 1, 8, '#8a6a4a');
  rect(c, x + 16, base - 42, 28, 9, OUT); rect(c, x + 17, base - 41, 26, 7, '#f4efe2');
  text(c, 'TEMUCO', x + 19, base - 40, '#2a3a6a');
  rect(c, x + 22, base - 33, 1, 3, OUT); rect(c, x + 37, base - 33, 1, 3, OUT);
}
function train(c, x, rail) {
  const B = '#2c2c34', Rd = '#b83a3a';
  rect(c, x + 58, rail - 26, 46, 20, '#7a2a2a'); rect(c, x + 56, rail - 28, 50, 3, '#4a3a3a');
  for (let i = x + 62; i < x + 100; i += 9) rect(c, i, rail - 22, 6, 5, '#f2d27a');
  rect(c, x + 10, rail - 20, 30, 12, B); rect(c, x + 10, rail - 19, 30, 1, '#4a4a56'); rect(c, x + 10, rail - 10, 30, 2, Rd);
  rect(c, x + 38, rail - 30, 16, 22, B); rect(c, x + 42, rail - 26, 8, 6, '#f2d27a'); rect(c, x + 36, rail - 32, 20, 3, Rd);
  rect(c, x + 14, rail - 30, 6, 10, B); rect(c, x + 12, rail - 32, 10, 3, '#3a3a44');
  rect(c, x + 26, rail - 24, 6, 4, '#c8a040'); px(c, x + 27, rail - 24, '#e8c860');
  for (let i = 0; i < 8; i++) rect(c, x + 2 + i, rail - 10 + Math.floor(i / 2), 1, 8 - Math.floor(i / 2), Rd);
  rect(c, x + 6, rail - 8, 52, 3, '#1c1c22');
  [[x + 16, 4], [x + 28, 4], [x + 46, 4], [x + 66, 3], [x + 96, 3]].forEach(([wx, r]) => { circle(c, wx, rail - r - 1, r, Rd); px(c, wx, rail - r - 1, OUT); });
  return { x: x + 17, y: rail - 34 };
}
function bus(c, x, base) {
  const w = 100, top = base - 30;
  rect(c, x, top, w, 24, '#f4f4f0'); rect(c, x, top, w, 2, '#d8d8d4'); px(c, x, top, OUT); px(c, x + w - 1, top, OUT);
  rect(c, x + 4, top + 3, w - 24, 9, '#3a4a5a'); rect(c, x + 4, top + 3, w - 24, 1, '#6a7a8a');
  for (let k = x + 14; k < x + w - 20; k += 10) rect(c, k, top + 3, 1, 9, '#d8d8d4');
  rect(c, x + w - 16, top + 2, 14, 14, '#4a5a6a'); rect(c, x + w - 15, top + 3, 4, 4, '#7a8a9a');
  rect(c, x + w - 27, top + 6, 8, 18, '#3a4a5a');
  text(c, 'TEMUCO-SANTIAGO', x + 6, top + 14, '#2a8a4a');
  rect(c, x, top + 20, w, 3, '#2a8a4a'); rect(c, x, top + 23, w, 1, '#c83a3a');
  rect(c, x + w - 3, top + 19, 2, 2, '#f8e080'); rect(c, x, top + 19, 2, 2, '#e04040');
  [x + 18, x + w - 22].forEach(wx => { circle(c, wx, base - 4, 4, '#2a2a30'); px(c, wx, base - 4, '#a8a8b0'); });
}
function palm(c, x, base) {
  const top = base - 50;
  for (let y = top; y < base; y++) rect(c, x + Math.round((base - y) * .06), y, 3, 1, (y >> 1) & 1 ? '#8a6a48' : '#6e5236');
  const cx = x + 4, cy = top - 1;
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + i * Math.PI / 8;
    for (let t = 1; t <= 16; t++) { const fx = cx + Math.cos(a) * t, fy = cy + Math.sin(a) * t * .55 + t * t * .045; px(c, fx, fy, '#4a7a3a'); px(c, fx, fy + 1, '#3a6230'); }
  }
  [[-1, 2], [2, 3], [1, 1]].forEach(([dx, dy]) => px(c, cx + dx, cy + dy, '#c8803a'));
}
function lamp(c, x, base) { rect(c, x, base - 40, 2, 40, '#3e4a3f'); rect(c, x, base - 40, 7, 1, '#3e4a3f'); rect(c, x + 5, base - 39, 3, 3, '#f2d27a'); }
function costanera(c, cx, top, base) {
  for (let y = top; y < base; y++) {
    const hw = Math.round(5 + (y - top) / (base - top) * 3);
    rect(c, cx - hw, y, hw * 2, 1, '#6a8aa8'); px(c, cx - 2, y, '#8eaccb'); px(c, cx + 1, y, '#8eaccb'); px(c, cx + hw - 1, y, '#506e8c');
  }
  for (const dx of [-5, -3, -1, 1, 3, 5]) for (let k = 0; k < 8; k++) px(c, cx + dx + Math.round(dx * k * .06), top - 1 - k, '#506e8c');
}
function roundTree(c, x, base, r, cols, small) {
  const th = small ? 4 : 10;
  rect(c, x - 1, base - th, small ? 2 : 3, th, '#6a4a32');
  const cy = base - th - r * .7;
  ell(c, x, cy, r, r * .85, cols[0]); ell(c, x + 1, cy - 1, r * .8, r * .65, cols[1]); ell(c, x + 2, cy - r * .35, r * .4, r * .3, cols[2]);
  for (let k = 0; k < r * 2; k++) px(c, x + R(-r, r) * .7, cy + R(-r, r) * .5, cols[0]);
}
function planeTree(c, x, base) {
  rect(c, x - 1, base - 44, 3, 44, '#cfc6b4'); rect(c, x + 1, base - 44, 1, 44, '#a8a090');
  for (let i = 0; i < 6; i++) rect(c, x - 1, base - R(4, 40), 2, 2, '#9a907c');
  line(c, x, base - 36, x - 9, base - 50, '#a8a090'); line(c, x, base - 38, x + 8, base - 52, '#a8a090');
  const cols = ['#a87a2a', '#c89a3a', '#e0b850', '#8aa040', '#d08a30'];
  for (let k = 0; k < 6; k++) ell(c, x + R(-13, 13), base - 54 + R(-8, 6), R(8, 13), R(6, 9), cols[k % 5]);
  for (let k = 0; k < 14; k++) px(c, x + R(-16, 16), base - 54 + R(-12, 8), '#f4d470');
}
function brick(c, x, base, w, h) {
  rect(c, x, base - h, w, h, '#a85a3a');
  for (let y = base - h + 2; y < base; y += 3) rect(c, x, y, w, 1, '#b8704e');
  rect(c, x - 1, base - h - 1, w + 2, 2, '#e8e4da');
  for (let wy = base - h + 5; wy < base - 7; wy += 9) for (let wx = x + 4; wx < x + w - 6; wx += 8) { rect(c, wx, wy, 5, 6, '#e8e4da'); rect(c, wx + 1, wy + 1, 3, 4, '#5a6a7a'); px(c, wx + 1, wy + 1, '#8aa0b4'); }
}
function bench(c, x, base) {
  rect(c, x, base - 6, 18, 2, '#9a6a3a'); rect(c, x, base - 11, 18, 2, '#9a6a3a');
  rect(c, x + 1, base - 11, 1, 11, '#3a3a3a'); rect(c, x + 16, base - 11, 1, 11, '#3a3a3a');
}
function cypress(c, x, base, h) {
  rect(c, x - 1, base - h * .3, 3, h * .3, '#6a4a32');
  for (let i = 0; i < 9; i++) {
    const y = base - h * .2 - i * h * .09, w = (1 - i / 9) * h * .22 + 2;
    ell(c, x + R(-2, 2), y, w, h * .07, i % 2 ? '#2f5a36' : '#3a6a3a');
    for (let k = 0; k < 4; k++) px(c, x + R(-w, w), y + R(-2, 1), '#7a9a4a');
  }
}

function stamp(c, w, h, x, y, fn) { c.drawImage(bake(w + 2, h + 2, s => { s.save(); s.translate(1, 1); fn(s); s.restore(); outline(s); }), Math.round(x) - 1, Math.round(y) - 1); }
function innovation(c, x, base) {
  const w = 56, offs = [0, 3, -2, 4, -3, 2, 0, -4, 3, -1, 2];
  let y = base;
  offs.forEach((off, i) => {
    y -= 8;
    rect(c, x + off, y, w, 8, '#bdbab2'); rect(c, x + off + w - 4, y, 4, 8, '#9c9992'); rect(c, x + off, y, w, 1, '#d6d3cc');
    const n = i % 3 === 0 ? 2 : 3, cell = Math.floor((w - 8) / n);
    for (let k = 0; k < n; k++) { const wx = x + off + 4 + k * cell; rect(c, wx, y + 2, cell - 4, 5, '#2a323e'); rect(c, wx, y + 2, cell - 4, 1, '#1c222c'); if ((i + k) % 2) rect(c, wx + 1, y + 4, cell - 6, 1, '#5a7088'); }
  });
}
function yBuilding(c, x, base, w) {
  const top = base - 66;
  rect(c, x, top, w, base - top - 12, '#262a32');
  for (let gy = top + 4; gy < base - 12; gy += 8) rect(c, x, gy, w, 1, '#3a404c');
  rect(c, x, base - 11, w, 11, '#1a1d24');
  for (let rx = x + 6; rx < x + w - 4; rx += 14) {
    rect(c, rx, top, 3, base - top - 12, '#d8d4cc'); rect(c, rx + 2, top, 1, base - top - 12, '#b0aca4');
    for (const d of [0, 1]) { line(c, rx + 1, base - 12, rx - 5 + d, base, '#d8d4cc'); line(c, rx + 1, base - 12, rx + 7 + d, base, d ? '#b0aca4' : '#d8d4cc'); }
  }
  rect(c, x, top, w, 3, '#e4e0d8'); rect(c, x, base - 12, w, 1, '#d8d4cc');
}
function copper(c, x, base) {
  const w = 34, h = 40;
  for (let i = 0; i < w; i++) rect(c, x + i, base - h, 1, h, shade('#c0703a', .7 + .5 * Math.sin(Math.PI * i / w)));
  for (let y = base - h + 3; y < base; y += 4) rect(c, x, y, w, 1, 'rgba(90,40,20,.25)');
  rect(c, x + 13, base - 10, 8, 10, '#2a2a30');
}
function baticristo(c, x, base) {
  rect(c, x - 13, base - 8, 26, 8, '#b8b4a8'); rect(c, x - 9, base - 28, 18, 20, '#c8c4b8'); rect(c, x - 9, base - 28, 18, 1, '#e0dcd0'); rect(c, x + 6, base - 28, 3, 20, '#a8a498');
  stamp(c, 46, 40, x - 23, base - 69, s => {
    const cx = 23;
    fillPoly(s, [[cx - 4, 8], [cx + 4, 8], [cx + 9, 40], [cx - 9, 40]], '#ece8de');
    fillPoly(s, [[cx + 1, 8], [cx + 4, 8], [cx + 9, 40], [cx + 4, 40]], '#cfcabe');
    fillPoly(s, [[cx - 3, 10], [cx - 21, 14], [cx - 22, 20], [cx - 15, 27], [cx - 4, 20]], '#ece8de');
    fillPoly(s, [[cx + 3, 10], [cx + 21, 14], [cx + 22, 20], [cx + 15, 27], [cx + 4, 20]], '#d8d4c8');
    rect(s, cx - 23, 14, 3, 3, '#e4e0d6'); rect(s, cx + 20, 14, 3, 3, '#d0ccc0');
    ell(s, cx, 4, 3.5, 4, '#ece8de'); rect(s, cx - 3, 0, 6, 2, '#d8d4c8');
    rect(s, cx - 1, 14, 2, 2, '#c83030');
  });
}
function consejo(c, x, base) {
  const T = '#b0603a', Ts = '#8a4428', Th = '#c87a50';
  stamp(c, 48, 70, x - 24, base - 70, s => {
    [[2, 62, 8], [11, 56, 7], [29, 66, 9], [39, 58, 8]].forEach(([fx, h, w]) => {
      const top = 70 - h;
      rect(s, fx, top + 5, w, h - 5, T); rect(s, fx + w - 2, top + 5, 2, h - 5, Ts); rect(s, fx, top + 5, 1, h - 5, Th);
      ell(s, fx + w / 2, top + 3, w / 2 - .5, 3, T);
      for (let k = 0; k < 14; k++) px(s, fx + 1 + R(0, w - 3), top + 6 + R(0, h - 8), Ts);
      rect(s, fx + Math.floor(w / 2), 56, 1, 14, Ts);
    });
  });
}
function deves(c, x0, base, w) {
  const top = base - 72;
  rect(c, x0, top + 8, w, base - top - 8, '#a85a3a');
  for (let y = top + 10; y < base; y += 3) rect(c, x0, y, w, 1, '#b8704e');
  rect(c, x0 + 4, top, w - 8, 8, '#9ab0c0'); for (let gx = x0 + 6; gx < x0 + w - 6; gx += 10) line(c, gx, top + 7, gx + 6, top, '#d8e4ec'); rect(c, x0, top, w, 1, '#c8d0d8');
  [[top + 12, 14], [top + 38, 12], [top + 54, 14]].forEach(([y, h]) => {
    rect(c, x0, y - 3, w, 2, '#d8d0c0');
    for (let gx = x0 + 34; gx < x0 + w - 8; gx += 14) { rect(c, gx, y, 12, h, '#4a5a6a'); rect(c, gx, y, 12, 1, '#8aa0b4'); rect(c, gx + 6, y, 1, h, '#3a4654'); }
  });
  for (let i = 0; i < 7; i++) rect(c, x0 + 6 + i * 3, top + 13, 2, 14, '#d0603e');
  rect(c, x0, top + 28, w, 8, '#d8d0c0');
  text(c, 'ESCUELA DE INGENIERÍA', x0 + Math.round((w - 83) / 2), top + 30, '#6a6460');
  rect(c, x0 + 100, base - 16, 90, 16, '#5a6a7a'); for (let gx = x0 + 100; gx < x0 + 190; gx += 10) rect(c, gx, base - 16, 1, 16, '#3a4654');
  rect(c, x0 + 90, base - 2, 110, 2, '#c8c0b0'); rect(c, x0 + 86, base, 118, 2, '#b8b0a0');
}

const TEMUCO_VOLS = [{ cx: 178, half: 128, peak: 48, top: 10, snow: .74 }, { cx: 150, half: 28, peak: 58, top: 4, snow: .74 }, { cx: 450, half: 85, peak: 58, top: 6, snow: .38 }, { cx: 650, half: 75, peak: 62, top: 4, snow: .38 }];
const andesRanges = (base, pal, foot) => [
  { pal, fn: x => { const h = base + periodic(x, ANDES_HARM) - Math.abs(Math.sin(x * .21)) * 2; return [h, h + 8 + Math.abs(Math.sin(x * .13)) * 6 + Math.abs(Math.sin(x * .37)) * 4]; } },
  { pal: foot, fn: x => [base + 32 + periodic(x, [[3, 4, 1], [7, 3, 2.2], [15, 1.5, .3]]), -1] },
];
/* ---------- scenes ---------- */
const SCENES = {
  temuco: {
    outfit: 'casual', mode: 'walk', weather: 'rain', rainZones: [[40, 300], [600, 740]], milky: 'raincoat',
    skyStops: [0, 120, ['#6f9fd0', '#9ec0de', '#cfdde6']],
    skyDeco(c) { for (let i = 0; i < 4; i++) cloud(c, R(0, W), R(14, 50), '#eef2f6', '#ffffff'); },
    plume: true,
    ranges: [{ pal: { rock: '#6a7890', rockShade: '#525e76', snow: '#f4f7fb', snowShade: '#c6d2e2' }, fn: x => {
      const base = 114; let y = base + periodic(x, [[3, 3, 0], [7, 2, 1]]), sl = -1;
      for (const v of TEMUCO_VOLS) { const d = Math.max(0, (Math.abs(x - v.cx) - v.top / 2) / (v.half - v.top / 2)); if (d < 1) { const vy = base - (base - v.peak) * Math.pow(1 - d, 1.6); if (vy < y) { y = vy; sl = v.peak + (base - v.peak) * v.snow + Math.abs(Math.sin(x * .35)) * 5; } } }
      return [y, sl];
    } }],
    mid(c, sc) {
      ['#e05050', '#f0a040', '#f0e060', '#60c060', '#5080e0', '#8060c0'].forEach((col, r) => { const Rr = 60 - r; for (let a = 0; a < Math.PI; a += .6 / Rr) { const x = Math.round(440 + Math.cos(a) * Rr), y = Math.round(126 - Math.sin(a) * Rr); if (BAYER[y & 3][x & 3] > 5) px(c, x, y, col); } });
      rect(c, 0, 110, LW, 12, '#5f8eab');
      for (let i = 0; i < 40; i++) rect(c, R(0, LW), R(111, 120), R(2, 6), 1, '#9cc0d6');
      const top = x => Math.round(120 + periodic(x, [[2, 4, .3], [5, 3, 1.7], [11, 1.5, .2]]));
      for (let x = 0; x < LW; x++) { const t = top(x); px(c, x, t, '#6a9a52'); for (let y = t + 1; y < H; y++) px(c, x, y, y > t + 7 && BAYER[y & 3][x & 3] < (y - t - 7) * 2 ? '#3f6a3a' : '#4f7d45'); }
      for (let i = 0; i < 14; i++) { const x = Math.round(R(10, LW - 20)); map(c, MINI_ARAUCARIA, { x: '#2f5a38' }, x, top(x) - 7); }
      [[110, '#efe0c0', '#b84a3a'], [330, '#a8c8d8', '#4a4a5a'], [590, '#f0d890', '#8a3a2a']].forEach(([x, w, r]) => { const ch = house(c, x, top(x + 11) + 3, w, r); sc.emitters.push({ x: ch.x, y: ch.y, f: .45, every: .7, life: 2.4, size: 2 }); });
      [[40, 300], [600, 740]].forEach(([a, b]) => { for (let x = a; x < b; x += 22) cloud(c, x, Math.round(R(14, 24)), '#7a8696', '#9aa4b0'); });
    },
    near(c, sc) {
      rect(c, 0, 134, LW, 34, '#5e8c3e'); rect(c, 0, 134, LW, 1, '#79a64a');
      for (let x = 0; x < LW; x += 6) rect(c, x, 139, 3, 3, '#6a4a32');
      rect(c, 0, 139, LW, 1, '#a0a0aa'); rect(c, 0, 141, LW, 1, '#7a7a84');
      rect(c, 0, 145, LW, 14, '#9a7a54'); rect(c, 0, 145, LW, 1, '#b08c62');
      for (let i = 0; i < 90; i++) px(c, R(0, LW), R(147, 158), '#7e6244');
      for (let i = 0; i < 100; i++) rect(c, R(0, LW), R(160, 166), 1, 2, '#79a64a');
      station(c, 56, 138);
      fence(c, 560, 680, 136);
      [[24, 1], [180, .95], [720, 1]].forEach(([x, s2]) => araucaria(c, x, 136, s2));
      schule(c, 404, 138);
    },
  },
  santiago: {
    outfit: 'casual', mode: 'walk', milky: 'bandana',
    skyStops: [0, 124, ['#6f93c4', '#9fb3d0', '#f0b49a', '#f6d4a0']],
    skyDeco(c) { for (let i = 0; i < 6; i++) rect(c, R(0, W - 40), R(30, 70), R(14, 40), 1, '#f6c6b4'); },
    ranges: andesRanges(82, { rock: '#7c6ca2', rockShade: '#5c4e80', snow: '#fbe8ea', snowShade: '#d6c8dc' }, { rock: '#8a7a7c', rockShade: '#73646a' }),
    mid(c) {
      for (let y = 98; y < 132; y++) for (let x = 0; x < LW; x++) if (BAYER[y & 3][x & 3] < (y - 98) * .45) px(c, x, y, '#c9a98a');
      const hillTop = x => { const t = (x - 40) / 190; return t < 0 || t > 1 ? 999 : Math.round(132 - Math.pow(Math.sin(Math.PI * t), 1.3) * 52); };
      let peak = [0, 999];
      for (let x = 40; x <= 230; x++) { const t = hillTop(x), sh = hillTop(x + 1) > t; if (t < peak[1]) peak = [x, t]; for (let y = t; y < H; y++) px(c, x, y, sh ? '#62623a' : '#7a7a48'); if (rnd() < .25) px(c, x, R(t + 3, 130), '#4a5a30'); }
      const [vx, vy] = peak;
      rect(c, vx - 2, vy - 2, 5, 2, '#d8d0c0'); map(c, ['.#.', '###', '.#.', '###', '###', '###'], { '#': '#ffffff' }, vx - 1, vy - 8);
      const tones = ['#8a96a4', '#a8a090', '#9aa6b0', '#b4a894'];
      for (let x = 250; x < LW - 20; x += Math.round(R(13, 26))) {
        const w = Math.round(R(11, 22)), h = Math.round(R(18, 50)), t = 132 - h;
        rect(c, x, t, w, h, pick(tones)); rect(c, x + w - 1, t, 1, h, '#6a7280'); rect(c, x, t, w, 1, '#c8ccd0');
        for (let wy = t + 3; wy < 130; wy += 3) for (let wx = x + 2; wx < x + w - 2; wx += 3) px(c, wx, wy, rnd() < .18 ? '#f2d27a' : '#5a6270');
      }
      costanera(c, 400, 30, 132);
      const ex = 560;
      rect(c, ex - 2, 58, 5, 74, '#9aa2a8'); rect(c, ex + 2, 58, 1, 74, '#7a8288'); rect(c, ex - 6, 54, 13, 4, '#8a949a'); rect(c, ex - 6, 57, 13, 1, '#6a7278');
      rect(c, ex - 1, 46, 3, 8, '#9aa2a8'); rect(c, ex, 32, 1, 14, '#6a7278'); px(c, ex, 31, '#e04040');
    },
    near(c) {
      rect(c, 0, 134, LW, 22, '#b8ac98'); rect(c, 0, 134, LW, 1, '#d0c4ae'); rect(c, 0, 145, LW, 1, '#a29680');
      for (let x = 0; x < LW; x += 12) { rect(c, x, 135, 1, 10, '#a29680'); rect(c, x + 6, 146, 1, 10, '#a29680'); }
      rect(c, 0, 156, LW, 12, '#5e5e66'); rect(c, 0, 156, LW, 1, '#8a8a90');
      for (let x = 0; x < LW; x += 14) rect(c, x, 162, 6, 1, '#e8c04a');
      [90, 430, 660].forEach(x => palm(c, x, 136)); [260, 560].forEach(x => lamp(c, x, 136));
      map(c, ['..........oo....', '..oooooooodDo...', '.oddddddddddddo.', 'oddddddddddkddno', 'oddddddddrrdddo.', '.oddoddddddoddo.', '..oo.oooooo.oo..'], { o: OUT, d: '#c9a070', D: '#8a6a46', k: OUT, n: OUT, r: '#c0383e' }, 330, 136);
      map(c, ['####', '..#.', '.#..', '####'], { '#': '#3e3a4a' }, 346, 126);
    },
  },
  puc: {
    outfit: 'student', mode: 'walk', milky: 'backpack',
    skyStops: [0, 124, ['#3f7ad0', '#7aa8e0', '#c8def0']],
    skyDeco(c) { for (let i = 0; i < 4; i++) cloud(c, R(0, W), R(16, 50), '#e4eef8', '#ffffff'); },
    ranges: andesRanges(84, ANDES_DAY, FOOT_DAY),
    mid(c) {
      for (let x = 0; x < LW; x += Math.round(R(10, 16))) roundTree(c, x, 130, Math.round(R(7, 11)), ['#3f6a36', '#4f7d40', '#6a9a4a'], true);
      innovation(c, 60, 132);
      yBuilding(c, 230, 132, 176);
      copper(c, 450, 132);
      brick(c, 510, 132, 70, 30);
      for (const x of [200, 430, 600]) { rect(c, x, 70, 2, 62, '#c8bca8'); for (let k = 0; k < 4; k++) ell(c, x + R(-6, 6), 66 + k * 9, R(5, 8), 5, k % 2 ? '#7a8a6a' : '#6a7a5a'); }
      brick(c, 640, 132, 90, 36);
    },
    near(c) {
      rect(c, 0, 134, LW, 34, '#6a9a4a'); rect(c, 0, 134, LW, 1, '#82b25a');
      rect(c, 0, 145, LW, 14, '#cdc5b4'); rect(c, 0, 145, LW, 1, '#b0a898'); rect(c, 0, 158, LW, 1, '#b0a898');
      for (let y = 147; y < 158; y += 3) for (let x = (y * 3) % 6; x < LW; x += 6) { px(c, x, y, '#b0a898'); px(c, x + 1, y + 1, '#b0a898'); }
      for (let i = 0; i < 80; i++) rect(c, R(0, LW), R(160, 166), 1, 2, '#82b25a');
      rect(c, 14, 112, 6, 30, '#d8d4c8'); rect(c, 100, 112, 6, 30, '#d8d4c8'); rect(c, 12, 108, 10, 4, '#c8c4b8'); rect(c, 98, 108, 10, 4, '#c8c4b8');
      baticristo(c, 60, 142);
      palm(c, 220, 142); palm(c, 300, 142); bench(c, 252, 142);
      roundTree(c, 390, 142, 14, ['#2f6a32', '#4a8a3e', '#72b04e']);
      deves(c, 420, 142, 300);
      roundTree(c, 748, 142, 14, ['#2f6a32', '#4a8a3e', '#72b04e']);
    },
  },
  maraton: {
    outfit: 'run', mode: 'run', milky: 'shades', banner: '¡42K! ♥ MILKY TE ESPERA',
    
    skyStops: [0, 124, ['#7fb0e0', '#a8cbe8', '#e8eef0']],
    ranges: andesRanges(88, ANDES_DAY, FOOT_DAY),
    mid(c) {
      for (let x = 0; x < LW; x += Math.round(R(16, 28))) { const h = Math.round(R(20, 46)); rect(c, x, 116 - h, Math.round(R(12, 20)), h, pick(['#c0c4cc', '#d4ccc0', '#b8c4d0'])); }
      costanera(c, 600, 44, 116);
      for (let x = 10; x < LW; x += Math.round(R(30, 42))) planeTree(c, x, 116);
    },
    near(c) {
      rect(c, 0, 112, LW, 24, '#b8b4a8');
      for (let x = 2; x < LW; x += 5) {
        if (x > 392 && x < 432) continue;
        const r = Math.round(R(-1, 1)), sk = pick(['#f0c8a0', '#c8956a', '#8a5a3a']);
        rect(c, x, 117 + r, 3, 3, sk); rect(c, x, 120 + r, 3, 8, pick(['#e05050', '#4a7ad0', '#f0c040', '#50a060', '#f4f4f4', '#a050c0']));
        if (rnd() < .35) { px(c, x - 1, 116 + r, sk); px(c, x + 3, 116 + r, sk); }
      }
      rect(c, 0, 126, LW, 10, '#c8ccd0'); rect(c, 0, 126, LW, 1, '#e8ecf0');
      for (let x = 0; x < LW; x += 4) rect(c, x, 127, 1, 9, '#9aa0a8');
      [12, 210, 470, 660].forEach(bx => { rect(c, bx, 127, 80, 8, '#2a4aa8'); text(c, 'MARATÓN DE SANTIAGO', bx + 3, 129, '#ffffff'); });
      rect(c, 396, 122, 32, 2, '#e8e8e8'); rect(c, 396, 124, 32, 8, '#2a7ac8'); text(c, 'AGUA', 405, 126, '#ffffff');
      for (let i = 0; i < 7; i++) rect(c, 398 + i * 4, 119, 2, 3, i % 2 ? '#f4f4f4' : '#bfe0f0');
      rect(c, 0, 136, LW, 32, '#6a6a72'); rect(c, 0, 136, LW, 1, '#e8e8e8');
      for (let i = 0; i < 160; i++) px(c, R(0, LW), R(138, 167), '#5e5e66');
      for (let x = 0; x < LW; x += 16) rect(c, x, 163, 8, 1, '#e8e8e8');
      [60, 150, 300, 520, 700].forEach(x => { px(c, x + 1, 137, '#f07030'); rect(c, x, 138, 3, 2, '#f07030'); rect(c, x, 140, 3, 1, '#ffffff'); rect(c, x - 1, 141, 5, 2, '#f07030'); rect(c, x - 2, 143, 7, 1, '#3a3a3a'); });
      rect(c, 652, 98, 1, 28, '#8a8a8a'); rect(c, 640, 90, 26, 10, '#2a4aa8'); text(c, '42K', 647, 93, '#f0c040');
    },
  },
  valle: {
    outfit: 'ski', mode: 'ski', weather: 'snow', milky: 'ski', banner: '¡TOMI ME ENSEÑÓ A ESQUIAR! ♥',
    skyStops: [0, 110, ['#2a64c0', '#4f8ede', '#a8d0f0']],
    ranges: [{ pal: { rock: '#7a8498', rockShade: '#5e687c', snow: '#ffffff', snowShade: '#cfdcee' }, fn: x => { const h = 62 + periodic(x, [[2, 14, .3], [5, 9, 1.6], [11, 4, 2.4], [23, 2, .8]]); return [h, h + 34 + Math.abs(Math.sin(x * .11)) * 8]; } }],
    mid(c, sc) {
      const top = x => Math.round(106 + periodic(x, [[1, 8, .4], [3, 5, 1.2], [7, 2, .3]]));
      for (let x = 0; x < LW; x++) { const t = top(x), sh = top(x + 1) > t; px(c, x, t, '#ffffff'); rect(c, x, t + 1, 1, H - t, sh ? '#d6e2f0' : '#f0f5fb'); }
      for (let i = 0; i < 60; i++) { const x = R(0, LW); px(c, x, top(x) + R(2, 10), '#8a92a2'); }
      const hb = top(336) + 8;
      [[300, 26, 26], [322, 30, 38], [348, 24, 22]].forEach(([x, w, h]) => {
        rect(c, x, hb - h, w, h, '#c8904a'); rect(c, x + w - 3, hb - h, 3, h, '#a8743a');
        fillPoly(c, [[x - 2, hb - h], [x + w / 2, hb - h - 12], [x + w + 2, hb - h]], '#4a3a3a');
        for (let wy = hb - h + 4; wy < hb - 4; wy += 6) for (let wx = x + 3; wx < x + w - 4; wx += 5) rect(c, wx, wy, 3, 3, rnd() < .3 ? '#f2d27a' : '#3a2a2a');
      });
      const towers = [64, 192, 448, 576, 704].map(x => [x, top(x) - 30]);
      towers.forEach(([x, y]) => { rect(c, x, y, 1, top(x) - y + 2, '#5a6070'); rect(c, x - 3, y, 7, 1, '#5a6070'); });
      const ext = [[towers[towers.length - 1][0] - LW, towers[towers.length - 1][1]], ...towers, [towers[0][0] + LW, towers[0][1]]];
      sc.cableY = x => { for (let i = 0; i < ext.length - 1; i++) { const [x0, y0] = ext[i], [x1, y1] = ext[i + 1]; if (x >= x0 && x <= x1) return Math.round(y0 + (y1 - y0) * (x - x0) / (x1 - x0)); } return ext[1][1]; };
      for (let x = 0; x < LW; x++) { px(c, x, sc.cableY(x), '#3a3e48'); px(c, x, sc.cableY(x) + 4, '#3a3e48'); }
    },
    near(c) {
      rect(c, 0, 132, LW, 36, '#f6f9fc'); rect(c, 0, 132, LW, 1, '#ffffff');
      for (let y = 133; y < 137; y++) for (let x = 0; x < LW; x++) if (BAYER[y & 3][x & 3] < (137 - y) * 3) px(c, x, y, '#dfe8f4');
      for (let k = 0; k < 3; k++) for (let x = 0; x < LW; x++) px(c, x, 150 + k * 4 + Math.round(Math.sin(x * .05 + k)), '#cfdcee');
      for (let x = 40; x < LW; x += 96) for (let i = 0; i < 14; i++) px(c, x, 122 + i, (i >> 2) % 2 ? '#d04040' : '#2a2a2a');
      [104, 132].forEach(x => araucaria(c, x, 134, .6));
      [[40, 'CORRALCO'], [176, 'VOLCÁN LLAIMA'], [322, 'EL COLORADO'], [470, 'VALLE NEVADO']].forEach(([x, str]) => {
        const w = str.length * 4 + 3;
        rect(c, x + 4, 120, 1, 14, '#5a3a2a'); rect(c, x + w - 5, 120, 1, 14, '#5a3a2a'); rect(c, x, 111, w, 10, '#7a4a2a'); rect(c, x, 111, w, 1, '#9a6a4a'); text(c, str, x + 2, 113, '#ffffff');
      });
    },
    anim(cam, t, sc) {
      const chair = (lx, dy, col) => { const sx = Math.round(wrapScreen(lx - cam * .45)), y = sc.cableY(Math.round(lx)) + dy; rect(ctx, sx, y, 1, 4, '#3a3e48'); rect(ctx, sx - 2, y + 4, 5, 2, col); px(ctx, sx - 2, y + 2, col); px(ctx, sx - 2, y + 3, col); };
      for (let k = 0; k < 16; k++) { chair(((t * 12 + k * 48) % LW + LW) % LW, 1, '#e04a4a'); chair(((LW - (t * 12 + k * 48 + 24) % LW) + LW) % LW, 5, '#2a7ac8'); }
    },
  },
  parapente: {
    outfit: 'casual', mode: 'fly', milky: 'goggles', 
    skyStops: [0, 130, ['#4a8ad8', '#86b6e6', '#d6e8f4']],
    skyDeco(c) { for (let i = 0; i < 5; i++) cloud(c, R(0, W), R(20, 70), '#eef4fa', '#ffffff'); },
    ranges: [{ pal: { rock: '#8a7e86', rockShade: '#6e6270', snow: '#ffffff', snowShade: '#d4dcea' }, fn: x => { const h = 66 + periodic(x, [[2, 14, .9], [5, 9, 2.1], [11, 4, .4]]); return [h, h + 10 + Math.abs(Math.sin(x * .17)) * 6]; } }],
    mid(c) {
      const hgt = x => 100 + periodic(x, [[3, 12, .2], [7, 6, 1.4], [13, 3, 2.2]]);
      mountains(c, hgt, null, { rock: '#a8845a', rockShade: '#86663e' });
      for (let i = 0; i < 500; i++) { const x = R(0, LW); px(c, x, R(hgt(x) + 3, 134), '#7a8a4a'); }
      rect(c, 0, 134, LW, 34, '#8aa05a');
      for (let x = 0; x < LW; x++) { const y = 141 + Math.round(Math.sin(x * 2 * Math.PI * 3 / LW) * 3); rect(c, x, y, 1, 4, '#7aa0b8'); if (rnd() < .08) px(c, x, y + 1, '#ffffff'); }
      for (let x = 0; x < LW; x += Math.round(R(5, 9))) { if (Math.sin(x * .02) < -.2) continue; const h = Math.round(R(16, 24)); rect(c, x, 136 - h, 3, h, '#4a7a3a'); rect(c, x, 136 - h, 1, h, '#5f9a48'); px(c, x + 1, 135 - h, '#4a7a3a'); }
    },
    near(c) {
      mountains(c, x => 152 + periodic(x, [[2, 6, .3], [5, 3, 1.1]]), null, { rock: '#7a7442', rockShade: '#625c32' });
      for (let i = 0; i < 40; i++) { const x = R(0, LW), y = 156 + R(0, 8); ell(c, x, y, 3, 2, '#4a5a2a'); px(c, x, y - 1, '#e8d040'); }
    },
    anim(cam, t) {
      for (let k = 0; k < 2; k++) {
        const x = Math.round(((k * 230 + t * 9 - cam * .45) % (W + 60) + W + 60) % (W + 60) - 30), y = Math.round(36 + k * 18 + Math.sin(t * .8 + k * 2) * 6);
        rect(ctx, x - 1, y, 4, 2, '#1c1c20'); line(ctx, x - 1, y, x - 7, y - 1, '#1c1c20'); line(ctx, x + 2, y, x + 8, y - 1, '#1c1c20');
        px(ctx, x - 8, y - 2, '#1c1c20'); px(ctx, x + 9, y - 2, '#1c1c20'); px(ctx, x + 3, y, '#f4f4f4'); px(ctx, x - 4, y, '#d8d8d8'); px(ctx, x + 5, y, '#d8d8d8');
      }
    },
  },
  depita: {
    interior: true,
    outfit: 'home', mode: 'walk', lw: 496, 
    skyStops: [0, 140, ['#4a3a7a', '#c86a7a', '#f4a060']],
    ranges: andesRanges(84, ANDES_DAY, FOOT_DAY),
    mid() {},
    near(c) {
      rect(c, 0, 0, LW, 152, '#ead9c6'); rect(c, 0, 0, 70, 152, '#d4784a');
      rect(c, 0, 0, LW, 10, '#f4ece0'); rect(c, 0, 10, LW, 1, '#ffffff'); rect(c, 0, 11, LW, 1, '#d4c4b0');
      const glow = (cx, cy, r, col) => { for (let y = cy - r; y < cy + r; y++) for (let x = cx - r; x < cx + r; x++) { const d = Math.hypot(x - cx, y - cy) / r; if (d < 1 && BAYER[y & 3][x & 3] > d * 16 + 2) px(c, x, y, col); } };
      glow(287, 90, 24, '#f6dcb4');
      const sunsetWin = (x0, y0, x1, y1, sun) => {
        const cols = ['#4a3a8a', '#b8608a', '#f09060', '#f8c870'];
        for (let y = y0; y < y1; y++) { const t = (y - y0) / (y1 - y0) * 3, i = Math.min(2, Math.floor(t)), f = t - i; for (let x = x0; x < x1; x++) px(c, x, y, f * 16 > BAYER[y & 3][x & 3] ? cols[i + 1] : cols[i]); }
        if (sun) { circle(c, x0 + 22, y1 - 30, 7, '#ffe8a0'); circle(c, x0 + 22, y1 - 30, 5, '#fff8e0'); }
        for (let k = 0; k < 4; k++) { const cy = y0 + 8 + k * 11, cx = x0 + 4 + (k * 17) % Math.max(1, x1 - x0 - 50); rect(c, cx, cy, 22, 2, '#f4a8a0'); rect(c, cx + 4, cy + 2, 14, 1, '#9a5a8a'); }
        const office = (bx0, bx1, top) => {
          for (let y = top; y < y1; y++) { const t = (y - top) / (y1 - top); rect(c, bx0, y, bx1 - bx0, 1, t < .45 ? '#e89a80' : t < .8 ? '#b8708a' : '#6a4a7a'); }
          for (let k = 0; k < 5; k++) rect(c, bx0, top + 4 + Math.round(R(0, y1 - top - 10)), bx1 - bx0, Math.round(R(1, 3)), '#fbd0b0');
          for (let y = top + 3; y < y1; y += 4) rect(c, bx0, y, bx1 - bx0, 1, '#4a3050');
          for (let x = bx0 + 3; x < bx1; x += 5) rect(c, x, top, 1, y1 - top, '#5a3a5a');
          rect(c, bx0, top, bx1 - bx0, 1, '#f8d8c0');
        };
        office(x1 - 46, x1 - 22, y0 + 26); office(x1 - 18, x1, y0 + 10);
      };
      const frameWin = (x0, y0, x1, y1) => { rect(c, x0 - 2, y0 - 2, x1 - x0 + 4, 2, '#8a7a6a'); rect(c, x0 - 2, y1, x1 - x0 + 4, 2, '#8a7a6a'); rect(c, x0 - 2, y0, 2, y1 - y0, '#8a7a6a'); rect(c, x1, y0, 2, y1 - y0, '#8a7a6a'); rect(c, Math.round((x0 + x1) / 2), y0, 1, y1 - y0, '#8a7a6a'); };
      const leaves = (pts, col = '#2f5a36') => pts.forEach(([x, y, rx, ry]) => { ell(c, x, y, rx, ry, col); px(c, x, y - Math.round(ry / 2), '#5a8a4a'); });
      const hanging = (x, len) => { rect(c, x, 11, 1, len, '#8a7a6a'); ell(c, x, 11 + len + 2, 5, 3, '#e8e0d0'); for (let k = 0; k < 14; k++) { px(c, x - 3 + Math.round(Math.sin(k * .7) * 2), 15 + len + k * 2, '#4a7a3a'); px(c, x + 3 + Math.round(Math.cos(k * .6) * 2), 14 + len + k * 2, '#5a8a4a'); } };
      // terrace
      sunsetWin(172, 24, 268, 150, true);
      rect(c, 172, 140, 96, 10, '#b08a5a'); for (let x = 172; x < 268; x += 8) rect(c, x, 140, 1, 10, '#8a6a3a');
      rect(c, 172, 110, 96, 2, '#d8cfc0'); rect(c, 172, 122, 96, 2, '#d8cfc0'); for (let x = 176; x < 268; x += 14) rect(c, x, 110, 2, 30, '#d8cfc0');
      const bx = 214;
      rect(c, bx + 2, 92, 26, 14, '#2a2a30'); rect(c, bx + 2, 92, 26, 1, '#4a4a54');
      rect(c, bx, 106, 30, 12, '#3a3a42'); rect(c, bx, 106, 30, 1, '#6a6a72'); rect(c, bx + 26, 109, 2, 2, '#c84030');
      rect(c, bx - 8, 110, 8, 2, '#5a5a62'); rect(c, bx + 30, 110, 8, 2, '#5a5a62');
      rect(c, bx + 2, 118, 2, 22, '#2a2a30'); rect(c, bx + 26, 118, 2, 22, '#2a2a30');
      [[bx + 9, '#8a3424'], [bx + 21, '#9a3c28']].forEach(([x, col]) => { ell(c, x, 104, 5, 2, col); px(c, x - 2, 104, '#4a1a10'); px(c, x + 1, 104, '#4a1a10'); px(c, x - 3, 103, '#c86040'); });
      rect(c, 180, 138, 10, 12, '#a86a3a'); leaves([[185, 132, 8, 6], [181, 126, 5, 4], [189, 125, 5, 4]], '#4a7a3a');
      rect(c, 254, 142, 8, 8, '#c8b8a0'); leaves([[258, 138, 5, 4]], '#5a8a3a');
      frameWin(172, 24, 268, 150);
      // entry
      rect(c, 6, 50, 26, 102, '#a86a3a'); rect(c, 8, 52, 22, 98, '#b8784a'); rect(c, 26, 100, 2, 2, '#f0c040');
      const mirror = (r, col) => eachEll(51, 76, 14 + r, 30 + r, (x, y) => { if (Math.abs(x - 51 - Math.sin(y * .14) * 2) < (14 + r) * Math.sqrt(Math.max(0, 1 - ((y - 76) / (30 + r)) ** 2))) px(c, x, y, col); });
      mirror(1, '#1a1a1a'); mirror(0, '#cfd8e0');
      for (let y = 52; y < 100; y += 3) px(c, 44 + (y % 7), y, '#eef2f6');
      text(c, 'TE', 47, 62, '#6a2a7a'); text(c, 'QUIERO', 39, 69, '#6a2a7a'); text(c, '*', 50, 76, '#6a2a7a');
      rect(c, 34, 112, 34, 3, '#c89a64'); leaves([[40, 107, 5, 4]], '#6a9a5a'); px(c, 38, 105, '#e0a0b0'); px(c, 42, 106, '#e0a0b0');
      rect(c, 58, 104, 8, 8, '#c8a878'); rect(c, 59, 105, 6, 6, '#3a3a3a'); rect(c, 49, 110, 5, 2, '#f07030');
      // dining
      [[72, 30, 15, 19], [90, 26, 15, 22], [72, 54, 15, 17], [90, 54, 15, 19]].forEach(([x, y, w, h]) => {
        rect(c, x, y, w, h, '#4a2216'); rect(c, x + 1, y + 1, w - 2, h - 2, '#6a3420');
        rect(c, x + 2, y + 2, w - 4, h - 4, '#efe2c0'); rect(c, x + 3, y + 3, w - 6, h - 6, '#e2d2a4');
        const lx = x + 4 + R(0, 2), ly = y + 4 + R(0, 3);
        ell(c, lx + 3, ly + 4, R(2.5, 4), R(3, 5), pick(['#c8b878', '#b8c890', '#d8b0a0']));
        ell(c, lx + 6, ly + 8, R(1.5, 3), R(2, 3), pick(['#c8b878', '#a8c088', '#d8a8b0']));
        for (let k = 0; k < 4; k++) px(c, x + 3 + R(0, w - 6), y + 3 + R(0, h - 6), '#8a6a3a');
        rect(c, x + 3, y + h - 5, w - 6, 1, '#b8a070');
      });
      rect(c, 108, 140, 10, 12, '#a86a3a'); rect(c, 112, 60, 2, 80, '#7a5a3a');
      leaves([[109, 64, 8, 5], [124, 76, 9, 6], [106, 92, 8, 5], [122, 102, 8, 6], [110, 118, 9, 6]]);
      ell(c, 148, 124, 19, 3, '#8a4a2a'); rect(c, 145, 126, 6, 24, '#6a3a1e'); rect(c, 136, 148, 24, 2, '#6a3a1e');
      rect(c, 126, 106, 2, 44, '#a85a2a'); rect(c, 126, 130, 10, 2, '#a85a2a'); rect(c, 134, 132, 2, 18, '#a85a2a');
      rect(c, 170, 106, 2, 44, '#a85a2a'); rect(c, 162, 130, 10, 2, '#a85a2a'); rect(c, 162, 132, 2, 18, '#a85a2a');
      ell(c, 171, 104, 7, 2, '#e8dcb8'); ell(c, 171, 101, 4, 3, '#e8dcb8'); rect(c, 167, 102, 8, 1, '#3a3030');
      hanging(100, 12); hanging(250, 8);
      // living
      rect(c, 287, 84, 1, 66, '#3a3a3a'); fillPoly(c, [[280, 84], [295, 84], [291, 74], [284, 74]], '#f4e4c0'); rect(c, 283, 150, 9, 2, '#3a3a3a');
      rect(c, 272, 138, 10, 14, '#c8b8a0'); leaves([[277, 128, 7, 5], [272, 116, 6, 5], [282, 112, 6, 5], [276, 100, 6, 5]]);
      rect(c, 300, 112, 96, 18, '#3e424c'); rect(c, 300, 128, 96, 14, '#34373f'); rect(c, 294, 118, 10, 26, '#3e424c'); rect(c, 392, 118, 8, 26, '#3e424c');
      rect(c, 300, 142, 96, 6, '#2a2c34'); rect(c, 304, 148, 3, 4, '#2a2a2a'); rect(c, 390, 148, 3, 4, '#2a2a2a');
      rect(c, 336, 126, 50, 4, '#b8b8b0'); ell(c, 308, 120, 7, 6, '#7fa6a8'); ell(c, 386, 120, 7, 6, '#7fa6a8');
      hanging(350, 16);
      rect(c, 342, 138, 48, 3, '#8a5a32'); rect(c, 342, 141, 48, 1, '#6a4020'); rect(c, 345, 142, 2, 10, '#6a4020'); rect(c, 385, 142, 2, 10, '#6a4020');
      [346, 354].forEach(x => { rect(c, x, 133, 4, 5, '#f4f0e8'); px(c, x + 4, 134, '#f4f0e8'); px(c, x + 5, 135, '#f4f0e8'); px(c, x + 4, 136, '#f4f0e8'); rect(c, x, 133, 4, 1, '#5a3a20'); });
      [368, 381].forEach(x => { ell(c, x, 137.5, 6, 1.5, '#f4f4f4'); ell(c, x - 2, 135, 3, 2, '#d8a050'); ell(c, x + 2, 135, 3, 2, '#c89040'); px(c, x - 3, 134, '#f0c070'); rect(c, x - 2, 133, 4, 1, '#f8d848'); px(c, x - 1, 132, '#f8e070'); px(c, x + 2, 133, '#8ac04a'); px(c, x + 3, 133, '#5a8a2a'); });
      // desk
      sunsetWin(408, 28, 490, 116, false); frameWin(408, 28, 490, 116);
      rect(c, 406, 116, 86, 3, '#f4ece0');
      [[468, '#c86a4a'], [478, '#4a6a9a']].forEach(([x, col]) => { rect(c, x, 110, 6, 6, col); leaves([[x + 3, 107, 3, 3]], '#5a8a4a'); });
      rect(c, 406, 122, 86, 2, '#bfe0e0'); rect(c, 410, 124, 1, 28, '#a8a8a8'); rect(c, 488, 124, 1, 28, '#a8a8a8');
      rect(c, 434, 100, 30, 20, '#1a1a1e'); rect(c, 436, 102, 26, 16, '#162626');
      for (let y = 104; y < 116; y += 2) rect(c, 438, y, Math.round(R(8, 22)), 1, rnd() < .5 ? '#7ad07a' : '#e8e8e8');
      rect(c, 447, 120, 4, 2, '#3a3a3a'); rect(c, 468, 120, 10, 2, '#e8a0b8');
      rect(c, 410, 110, 18, 12, '#f0f0f0'); rect(c, 410, 110, 18, 3, '#e8a0b8'); rect(c, 412, 115, 8, 4, '#d0d0d0');
      ell(c, 452, 145, 9, 6, '#c8a878'); [[448, 141, '#e04040'], [453, 140, '#40a0e0'], [457, 142, '#f0c040']].forEach(([x, y, col]) => px(c, x, y, col));
      rect(c, 476, 140, 10, 12, '#a86a3a'); leaves([[481, 132, 6, 6], [477, 124, 4, 4], [485, 125, 4, 4]], '#3a6a3a');
      // floor + sunlight
      rect(c, 0, 150, LW, 2, '#7a4a2a'); rect(c, 0, 152, LW, 16, '#c89a64');
      for (let y = 152; y < H; y += 4) { rect(c, 0, y, LW, 1, '#b88a54'); for (let x = (y * 7) % 24; x < LW; x += 24) rect(c, x, y, 1, 4, '#a87a48'); }
      for (let y = 152; y < H; y++) for (let x = 176 + (y - 152) * 2; x < 272 + (y - 152) * 2; x++) if (BAYER[y & 3][x & 3] > 9) px(c, x, y, '#e8b478');
    },
    animFront(cam, t) {
      const sx = x => Math.round(wrapScreen(x - cam));
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      [347.5, 355.5].forEach((x, i) => { for (let k = 0; k < 4; k++) ctx.fillRect(sx(x) + Math.round(Math.sin(t * 3 + k + i)), 130 - k * 2 - Math.floor((t * 4 + i) % 2), 1, 1); });
      for (let k = 0; k < 5; k++) { const p = (t * .5 + k / 5) % 1; ctx.globalAlpha = (1 - p) * .8; circle(ctx, sx(229 + p * 8), Math.round(100 - p * 30), Math.round(1 + p * 3), '#e8e4ea'); }
      ctx.globalAlpha = 1;
      if (Math.floor(t * 6) % 2) { px(ctx, sx(220), 102, '#f8a040'); px(ctx, sx(236), 101, '#f8a040'); }
    },
  },
  bariloche: {
    outfit: 'patagonia', mode: 'walk', lw: 1536, milky: 'scarf',
    groundAt: x => { if (x < 260 || x > 1300) return 150; if (x > 760) return 118 + Math.round(Math.sin(x * .05)); const t = (x - 260) / 500; return Math.round(150 - 32 * t * t * (3 - 2 * t)); },
    skyStops: [0, 100, ['#27306a', '#5a4090', '#c8607a', '#f0904a', '#ffcc70']],
    skyDeco(c) { for (let k = 0; k < 7; k++) { const x = R(0, W - 60), y = R(24, 74), w = R(30, 70); rect(c, x, y, w, 2, k % 2 ? '#f8a070' : '#e87890'); rect(c, x + 6, y + 2, w - 12, 1, '#7a3a6a'); } circle(c, 250, 92, 10, '#ffe090'); circle(c, 250, 92, 7, '#fff4d0'); },
    ranges: [{ pal: { rock: '#4a3a6a', rockShade: '#352a50', snow: '#f8c8c0', snowShade: '#b898c0' }, fn: x => { const h = 72 + periodic(x, [[6, 16, .2], [14, 9, 1.5], [26, 4, .9]]) - Math.abs(Math.sin(x * .09)) * 6; return [h, h + 6 + Math.abs(Math.sin(x * .23)) * 8 + (Math.sin(x * .05) > .3 ? 12 : 0)]; } }],
    mid(c) {
      rect(c, 0, 94, LW, 74, '#5a5a9a'); rect(c, 0, 94, LW, 1, '#2a2440');
      for (let i = 0; i < 8; i++) ell(c, R(0, LW), 96, R(10, 24), 3, '#2a2a48');
      for (let i = 0; i < 260; i++) rect(c, R(0, LW), R(97, 160), R(2, 8), 1, pick(['#f0a070', '#f8d090', '#c87090', '#8a7ab8']));
    },
    near(c) {
      const g = SCENES.bariloche.groundAt;
      for (let x = 0; x < LW; x++) {
        const t = g(x), s = x > 1300 ? 0 : Math.max(0, Math.min(1, (x - 560) / 140));
        for (let y = t; y < H; y++) {
          const snow = BAYER[y & 3][x & 3] < s * 16;
          px(c, x, y, snow ? (y < t + 2 ? '#ffffff' : y > t + 10 ? '#d8c0cc' : '#f8e4dc') : (y < t + 1 ? '#c8b860' : y > t + 9 ? '#6a6a2a' : '#8a8a3a'));
        }
      }
      for (let i = 0; i < 220; i++) { const x = Math.round(R(0, 620)); if (x > 34 && x < 238) continue; rect(c, x, g(x) - R(1, 3), 1, 3, pick(['#a8a040', '#d8c060'])); }
      for (let i = 0; i < 60; i++) { const x = Math.round(R(1310, LW)); rect(c, x, g(x) - R(1, 3), 1, 3, '#a8a040'); }
      bigText(c, 'BLEST', 60, 106, 4, '#8a4428');
      for (let x = 40; x <= 230; x += 38) { rect(c, x, 122, 3, 26, '#a88458'); rect(c, x + 2, 122, 1, 26, '#8a6a40'); }
      rect(c, 40, 126, 193, 2, '#c09a68'); rect(c, 40, 136, 193, 2, '#c09a68');
      rect(c, 36, 146, 200, 14, '#b08a5a'); rect(c, 36, 146, 200, 1, '#c8a070'); for (let x = 36; x < 236; x += 6) rect(c, x, 147, 1, 13, '#8a6a3a'); rect(c, 36, 160, 200, 2, '#7a5a32');
      [[275, 56], [372, 62], [1420, 60]].forEach(([x, h]) => cypress(c, x, g(x) + 2, h));
      [[700, 6], [790, 10], [990, 8]].forEach(([x, r]) => { const t = g(x); ell(c, x, t, r, r * .6, '#6a6078'); ell(c, x - 1, t - r * .4, r * .7, r * .25, '#f8e4dc'); });
      ell(c, 900, g(900) + 1, 7, 3, '#6a6078');
    },
    anim(cam, t) {
      for (let i = 0; i < 30; i++) if (Math.sin(t * 3 + i * 1.7) > .85) px(ctx, Math.round(wrapScreen((i * 97) % LW - cam * .45)), 100 + (i * 37) % 50, '#fff4d0');
    },
  },
};
const SEGS = [
  { scene: 'temuco', place: 'TEMUCO', from: 360, len: 540, years: [[0, '2014']], peeks: [[280, 126]], train: 470 },
  { scene: 'santiago', place: 'SANTIAGO', from: 0, len: 400, years: [[0, '2014']] },
  { scene: 'puc', place: 'PUC · SAN JOAQUÍN', from: 0, len: 760, occ: 'pine', years: [[0, '2015'], [240, '2016'], [380, '2017']], meet: 130, kiss: 566, peeks: [[258, 131]] },
  { scene: 'valle', place: 'CENTROS DE ESQUÍ', from: 0, len: 540, occ: 'pine', years: [[0, '2018']], wobble: 300, peeks: [[380, 134]] },
  { scene: 'santiago', place: 'SANTIAGO', from: 300, len: 380, years: [[0, '2019']] },
  { scene: 'puc', place: 'PUC · SAN JOAQUÍN', from: 0, len: 520, years: [[0, '2020'], [400, '2021']], adopt: 300, outfit: 'covid', milky: 'mask', online: true },
  { scene: 'parapente', place: 'CAJÓN DEL MAIPO', from: 0, len: 760, years: [[0, '2022']], windsock: 700 },
  { scene: 'puc', place: 'INGENIERÍA UC', from: 380, len: 320, occ: 'wall', years: [[0, '2023']], outfit: 'student', graduate: 180, meones: 180 },
  { scene: 'depita', place: 'DEPITA', from: 0, len: 496, occ: 'wall', years: [[0, '2024'], [360, '2025']], sofa: 290, seats: { tomi: 326, pita: 356, milky: 384 } },
  { scene: 'maraton', place: 'MARATÓN DE SANTIAGO', from: 0, len: 480, years: [[0, '2026']], arch: 400 },
  { scene: 'bariloche', place: 'BARILOCHE · CERRO CATEDRAL', from: 0, len: 960, years: [[0, '2026']], caps: [[560, '1 de julio de 2026']], ring: 900 },
];
const segWith = k => SEGS.find(s => s[k] !== undefined), at = k => { const s = segWith(k); return s.start + s[k]; };
let acc0 = 0;
SEGS.forEach(s => { s.start = acc0; s.end = acc0 + s.len; acc0 = s.end; });
const WORLD_END = acc0, BLEND = 160;
const segAt = x => { for (let i = 0; i < SEGS.length; i++) if (x < SEGS[i].end) return Math.max(0, i); return SEGS.length - 1; };
const relOf = x => x - SEGS[segAt(x)].start;
const smooth = v => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); };
const modeAt = x => { const s = SEGS[segAt(x)]; return s.mode || SCENES[s.scene].mode; };
const footAt = x => { const s = SEGS[segAt(x)], D = SCENES[s.scene]; return D.groundAt ? D.groundAt(Math.round(x - s.start + s.from)) + 2 : GROUND; };
const altitude = x => { const s = SEGS[segAt(x)]; if (modeAt(x) !== 'fly') return 0; const r = x - s.start; return smooth(r / 170) * smooth((s.len - r) / 170); };
const graduated = (s, x) => s.graduate !== undefined && x - s.start >= s.graduate;
const outfitFor = x => { const s = SEGS[segAt(x)]; return graduated(s, x) ? 'ceremony' : s.outfit || SCENES[s.scene].outfit; };
const accFor = x => { const s = SEGS[segAt(x)]; return graduated(s, x) ? 'cap' : s.milky || SCENES[s.scene].milky; };

/* ---------- engine ---------- */
const canvas = document.getElementById('game'), mainCtx = canvas.getContext('2d');
let ctx = mainCtx;
canvas.width = W; canvas.height = H; ctx.imageSmoothingEnabled = false;
const $ = id => document.getElementById(id);
const hint = $('hint'), place = $('place'), yearEl = $('year'), banner = $('banner');
const built = {}, DRAGONS = { pita: [dragonSprite(DRAGON_PAL.pita, 0), dragonSprite(DRAGON_PAL.pita, 4)], tomi: [dragonSprite(DRAGON_PAL.tomi, 0), dragonSprite(DRAGON_PAL.tomi, 4)] };
const MILKY_CACHE = {}, milkySet = (acc, baby) => { const k = (acc || 'none') + (baby ? '-b' : ''); return MILKY_CACHE[k] || (MILKY_CACHE[k] = buildMilky(acc, baby)); };
const isBaby = x => x < segWith('windsock').start;
const BUS = bake(104, 34, c => bus(c, 2, 34)), MEONES = bake(52, 74, c => consejo(c, 25, 71));
const [tmp, tmpCtx] = mk(W, H);
const SEAM_F = .5, MORPH = 120;
let Hs = H, offY = 0, skyImg = mainCtx.createImageData(W, H), sky32 = new Uint32Array(skyImg.data.buffer);
const pack = hex => { const [r, g, b] = hexRgb(hex); return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0; };
function skyTable([y0, y1, stops]) {
  const tab = new Uint32Array(Hs * 4), P = stops.map(pack), Y1 = y1 + offY;
  for (let y = 0; y < Hs; y++) for (let xm = 0; xm < 4; xm++) {
    if (y >= Y1) { tab[y * 4 + xm] = P[P.length - 1]; continue; }
    const tt = Math.max(0, y / Y1) * (P.length - 1), i = Math.min(P.length - 2, Math.floor(tt)), f = tt - i;
    tab[y * 4 + xm] = f * 16 > BAYER[y & 3][xm] ? P[i + 1] : P[i];
  }
  return tab;
}
const lerpPacked = (a, b, w) => { const r = (a & 255) + ((b & 255) - (a & 255)) * w, g = (a >> 8 & 255) + ((b >> 8 & 255) - (a >> 8 & 255)) * w, bl = (a >> 16 & 255) + ((b >> 16 & 255) - (a >> 16 & 255)) * w; return ((255 << 24) | (bl << 16) | (g << 8) | r) >>> 0; };
const lerpHex = (a, b, w) => { const A = hexRgb(a), B = hexRgb(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * w)).join(',') + ')'; };
const seamX = (b, f) => Math.round(W / 2 + (b - cam - W / 2) * f);
function colPairs() {
  const seams = SEGS.slice(0, -1).map(s => seamX(s.end, SEAM_F)), A = new Int8Array(W), B = new Int8Array(W), Wt = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    let k = 0; while (k < seams.length && x >= seams[k]) k++;
    A[x] = B[x] = k; Wt[x] = 0;
    if (k < seams.length && x > seams[k] - MORPH / 2) { B[x] = k + 1; Wt[x] = smooth((x - (seams[k] - MORPH / 2)) / MORPH); }
    else if (k > 0 && x < seams[k - 1] + MORPH / 2) { A[x] = k - 1; Wt[x] = smooth((x - (seams[k - 1] - MORPH / 2)) / MORPH); }
  }
  return { A, B, Wt };
}
function renderSky(cp) {
  for (let x = 0; x < W; x++) {
    const ta = built[SEGS[cp.A[x]].scene].skyTab, tb = built[SEGS[cp.B[x]].scene].skyTab, w = cp.Wt[x], xm = x & 3;
    for (let y = 0; y < Hs; y++) { const ca = ta[y * 4 + xm]; sky32[y * W + x] = w <= 0 || ta === tb ? ca : lerpPacked(ca, tb[y * 4 + xm], w); }
  }
  mainCtx.putImageData(skyImg, 0, 0);
  for (let x = 0; x < W; x += 8) {
    const a = SEGS[cp.A[x]], b = SEGS[cp.B[x]], w = cp.Wt[x];
    mainCtx.globalAlpha = 1 - w; mainCtx.drawImage(built[a.scene].deco, x, 0, 8, H, x, offY, 8, H);
    if (w > 0 && b !== a) { mainCtx.globalAlpha = w; mainCtx.drawImage(built[b.scene].deco, x, 0, 8, H, x, offY, 8, H); }
  }
  mainCtx.globalAlpha = 1;
}
function rangeAt(s, x, r) {
  const D = SCENES[s.scene], rg = D.ranges[r]; if (!rg) return null;
  LW = D.lw || 768;
  const fx = x + (cam - s.start + s.from) * .15, [h, sl] = rg.fn(((fx % LW) + LW) % LW);
  return { h, sl: sl < 0 ? h : sl, pal: rg.pal };
}
function renderFar(cp) {
  for (let r = 0; r < 2; r++) {
    const hs = new Float32Array(W + 2), sls = new Float32Array(W + 2), pals = [];
    for (let x = -1; x <= W; x++) {
      const xi = Math.max(0, Math.min(W - 1, x)), a = rangeAt(SEGS[cp.A[xi]], x, r), b = rangeAt(SEGS[cp.B[xi]], x, r), w = cp.Wt[xi];
      const ra = a || { h: H + 20, sl: H + 20, pal: b && b.pal }, rb = b || { h: H + 20, sl: H + 20, pal: a && a.pal };
      hs[x + 1] = ra.h + (rb.h - ra.h) * w; sls[x + 1] = ra.sl + (rb.sl - ra.sl) * w; pals[x + 1] = [ra.pal, rb.pal, w];
    }
    for (let x = 0; x < W; x++) {
      const h = Math.round(hs[x + 1]); if (h >= H || !pals[x + 1][0]) continue;
      const sl = Math.max(h, Math.round(sls[x + 1])), [pa, pb, w] = pals[x + 1], shadeSide = hs[x + 2] > hs[x];
      const rock = lerpHex(shadeSide ? pa.rockShade : pa.rock, shadeSide ? pb.rockShade : pb.rock, w);
      if (sl > h) rect(mainCtx, x, h + offY, 1, sl - h, lerpHex(shadeSide ? pa.snowShade || pa.rockShade : pa.snow || pa.rock, shadeSide ? pb.snowShade || pb.rockShade : pb.snow || pb.rock, w));
      rect(mainCtx, x, sl + offY, 1, H - sl, rock);
    }
  }
  const tc = SEGS[segAt(cam + W / 2)];
  if (SCENES[tc.scene].plume) {
    LW = 768; const off = (cam - tc.start + tc.from) * .15;
    for (let i = 0; i < 7; i++) { const sx = Math.round(wrapScreen(452 + i * 5 + i * i - off)); circle(mainCtx, sx, 52 - i * 6 + offY, 2 + Math.floor(i * .8), i % 2 ? '#c9cdd2' : '#aab0b8'); }
  }
}
function occluder(kind, ox) {
  const c = mainCtx;
  if (kind === 'wall') {
    rect(c, ox - 14, -offY, 28, Hs, '#d8cfc2'); rect(c, ox - 14, -offY, 3, Hs, '#efe7dc'); rect(c, ox + 11, -offY, 3, Hs, '#b8ae9e');
    rect(c, ox - 18, 0, 36, 12, '#f4ece0'); rect(c, ox - 16, 148, 32, 20, '#7a4a2a'); rect(c, ox - 16, 148, 32, 2, '#9a6a4a');
    return;
  }
  const D = '#22402a', M = '#2c5434', L = '#3a6a3e';
  if (kind === 'pine') {
    rect(c, ox - 5, 100, 10, 70, '#3a2a20');
    for (let i = 0; i < 7; i++) { const y = -10 + i * 20, w = 22 + i * 9; fillPoly(c, [[ox, y - 6], [ox + w, y + 26], [ox - w, y + 26]], i % 2 ? M : D); rect(c, ox - w * .5, y + 6, w, 2, '#f4f8fc'); fillPoly(c, [[ox, y - 6], [ox + 8, y + 4], [ox - 8, y + 4]], '#ffffff'); }
    ell(c, ox, 162, 46, 12, '#f0f4fa'); ell(c, ox - 26, 158, 18, 10, D);
    return;
  }
  rect(c, ox - 7, 50, 14, 120, '#3a2a20'); rect(c, ox - 7, 50, 3, 120, '#4e3a2c');
  [[-34, 20, 36, 30], [22, 12, 38, 32], [-4, -8, 44, 32], [38, 48, 28, 24], [-44, 56, 28, 22], [2, 42, 46, 30]].forEach(([dx, dy, rx, ry]) => ell(c, ox + dx, dy, rx, ry, D));
  [[-22, 10, 20, 14], [26, 2, 20, 14], [6, 30, 22, 14], [-36, 46, 14, 10]].forEach(([dx, dy, rx, ry]) => ell(c, ox + dx, dy, rx, ry, M));
  for (let i = 0; i < 40; i++) px(c, ox + ((i * 37) % 120) - 60, ((i * 53) % 90), L);
  [[-36, 160, 28, 16], [0, 156, 32, 18], [36, 162, 26, 14]].forEach(([dx, dy, rx, ry]) => ell(c, ox + dx, dy, rx, ry, D));
  [[-30, 152, 12, 6], [8, 148, 14, 6], [40, 156, 10, 5]].forEach(([dx, dy, rx, ry]) => ell(c, ox + dx, dy, rx, ry, M));
}
function onlineFrame(a, t) {
  if (a <= .01) return;
  // phones: room for the ✕ above, the HUD and besito below
  const c = mainCtx, b = Math.round((TALL ? 20 : 13) * a), top = Math.round((TALL ? 36 : 18) * a), bot = Math.round((TALL ? 36 : 20) * a), F = '#2a2d36', hy = top - 11;
  rect(c, 0, 0, W, top, F); rect(c, 0, Hs - bot, W, bot, F); rect(c, 0, 0, b, Hs, F); rect(c, W - b, 0, b, Hs, F);
  if (a < .95) return;
  [[6, '#e05a5a'], [13, '#e0b84a'], [20, '#5ac06a']].forEach(([x, col]) => circle(c, x, hy + 2, 2, col));
  text(c, 'CLASE ONLINE', 28, hy, '#c8ccd6');
  if (Math.floor(t * 1.5) % 2) circle(c, 80, hy + 2, 2, '#e04040');
  text(c, 'REC', 85, hy, '#e04040');
  for (let k = 0; k < 2; k++) { const tx = W - b - 34, ty = top + 3 + k * 25; rect(c, tx, ty, 32, 22, '#1a1c22'); rect(c, tx, ty, 32, 1, '#4a4e5a'); ell(c, tx + 16, ty + 11, 5, 5, k ? '#c8956a' : '#f0c8a0'); rect(c, tx + 11, ty + 5, 10, 3, k ? '#2a2a2a' : '#8a8a8a'); rect(c, tx + 10, ty + 16, 12, 6, k ? '#4a7ad0' : '#6a6e78'); text(c, k ? '+42' : 'PROFE', tx + 2, ty + 17, '#ffffff'); }
  const cy = Hs - bot + (TALL ? 6 : 7), cx = Math.round(W / 2);
  rect(c, cx - 46, cy, 4, 6, '#e8e8e8'); rect(c, cx - 47, cy + 6, 6, 1, '#e8e8e8'); line(c, cx - 49, cy - 1, cx - 39, cy + 8, '#e04040');
  rect(c, cx - 30, cy + 1, 8, 6, '#e8e8e8'); rect(c, cx - 22, cy + 2, 3, 4, '#e8e8e8');
  rect(c, cx - 12, cy, 9, 6, '#e8e8e8'); px(c, cx - 10, cy + 6, '#e8e8e8');
  rect(c, cx + 8, cy - 1, 34, 9, '#d04040'); text(c, 'SALIR', cx + 15, cy + 1, '#ffffff');
}
// the floor under the world: last rows blurred sideways, so dither and posts no stretch into stripes
function floorStrip(cv) {
  if (cv._floor) return cv._floor;
  const w = cv.width, d = cv.getContext('2d').getImageData(0, H - 4, w, 4).data, R = 6;
  const out = document.createElement('canvas'); out.width = w; out.height = 1;
  const oc = out.getContext('2d'), img = oc.createImageData(w, 1);
  for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let k = -R; k <= R; k++) for (let y = 0; y < 4; y++) {
      const i = (y * w + ((x + k) % w + w) % w) * 4, al = d[i + 3];
      r += d[i] * al; g += d[i + 1] * al; b += d[i + 2] * al; a += al; n++;
    }
    img.data.set(a ? [r / a, g / a, b / a, a / n] : [0, 0, 0, 0], x * 4);
  }
  oc.putImageData(img, 0, 0);
  return cv._floor = out;
}
function stretchEdges(cv, off, interior) {
  if (Hs === H) return;
  const w = cv.width, x = -Math.round(((off % w) + w) % w), below = Hs - offY - H;
  for (const dx of [x, x + w]) {
    if (offY > 0 && interior) { ctx.drawImage(cv, 0, 13, w, 1, dx, -offY, w, offY + 13); ctx.drawImage(cv, 0, 0, w, 12, dx, -offY, w, 12); }
    else if (offY > 0) ctx.drawImage(cv, 0, 0, w, 1, dx, -offY, w, offY);
    if (below > 0) ctx.drawImage(floorStrip(cv), 0, 0, w, 1, dx, H, w, below);
  }
}
function setViewport(w, hs) {
  W = Math.round(w); TALL = hs > H; PLAYER_SX = Math.round(W * (TALL ? .5 : .39)); canvas.width = W;
  Hs = Math.max(H, Math.round(hs)); offY = Hs === H ? 0 : Math.round(Math.max(0, Hs * .66 - 140));
  canvas.height = Hs; mainCtx.imageSmoothingEnabled = false;
  skyImg = mainCtx.createImageData(W, Hs); sky32 = new Uint32Array(skyImg.data.buffer); drops = [];
  for (const k in built) built[k].skyTab = skyTable(SCENES[k].skyStops);
}
function drawClipped(kind, t, dt) {
  SEGS.forEach((s, i) => {
    const L = i === 0 ? 0 : Math.max(0, Math.round(s.start - cam)), R = i === SEGS.length - 1 ? W : Math.min(W, Math.round(s.end - cam));
    if (R <= L) return;
    mainCtx.save(); mainCtx.beginPath(); mainCtx.rect(L, -offY, R - L, Hs); mainCtx.clip();
    drawLayerOf(mainCtx, s, kind, t, dt);
    mainCtx.restore();
  });
}
const SPEED = { walk: 55, run: 85, ski: 75, fly: 70 };
const wrapScreen = v => { let s = ((v % LW) + LW) % LW; if (s > W + 30) s -= LW; return s; };

let dating = false, pos, lead, joined, milkyState, milkyX, milkyY, riding, rideDone, leavingTrain, ringFound, captions, capQueue, lastOutfit;
let intro = -1, mode = 'landing', landT = 2, sofaS = null, gradDone = false, booksDropped = false, hopT = { pita: 0, tomi: 0, milky: 0 }, faint = null, lockT = 0, prop = null, cam = -PLAYER_SX, dir = 0, facing = 1, phase = 0, dragon = false, last = 0, bannerT = 0, kissT = 0, kissHearts = true, smokeT = 0, fx = [], drops = [];
function resetWorld() {
  pos = { tomi: 0, pita: at('meet') }; lead = 'tomi'; joined = false; dating = false;
  milkyState = 'wild'; milkyX = at('adopt'); milkyY = GROUND;
  riding = false; rideDone = false; leavingTrain = null; ringFound = false; prop = null; faint = null; lockT = 0; hopT = { pita: 0, tomi: 0, milky: 0 }; booksDropped = false; gradDone = false; sofaS = null; intro = 0; hint.hidden = false; kissT = 0; dragon = false; facing = 1;
  captions = SEGS.flatMap(s => s.years.concat(s.caps || []).map(([r, text]) => ({ x: s.start + r, text, shown: false }))).filter((c, i, all) => i === 0 || c.text !== all[i - 1].text); capQueue = []; bannerT = 0;
  lastOutfit = {}; fx = []; cam = -PLAYER_SX; banner.hidden = true;
}
function jumpTo(x) {
  intro = -1;
  joined = x > pos.pita; dating = x > at('kiss'); booksDropped = x > at('kiss'); gradDone = x > at('graduate') + 40; segWith('sofa').sofaDone = x > at('sofa'); rideDone = x > SEGS[0].start + SEGS[0].train;
  if (joined) { lead = 'pita'; pos.pita = x; pos.tomi = x - 34; } else { pos.tomi = x; }
  if (x > at('adopt')) { milkyState = 'follow'; milkyX = x - 64; milkyY = footAt(milkyX); }
  captions.forEach(c => { if (c.x < x) c.shown = true; });
  SEGS.forEach(sg => { if (sg.kiss !== undefined && sg.start + sg.kiss < x) sg.kissed = true; if (sg.arch !== undefined && sg.start + sg.arch + 52 < x) sg.fainted = true; });
  cam = x - PLAYER_SX;
}
function buildScene(name) {
  const D = SCENES[name], sc = { emitters: [], puffs: [] };
  LW = D.lw || 768;
  seed(Object.keys(SCENES).indexOf(name) * 17 + 11);
  sc.deco = bake(W, H, c => { if (D.skyDeco) D.skyDeco(c); });
  sc.skyTab = skyTable(D.skyStops);
  for (const k of ['mid', 'near']) sc[k] = bake(LW, H, c => D[k](c, sc));
  sc.emitters.forEach(e => { e.t = Math.random() * e.every; });
  built[name] = sc;
}
function layer(cv, off) { const w = cv.width, x = -Math.round(((off % w) + w) % w); ctx.drawImage(cv, x, 0); ctx.drawImage(cv, x + w, 0); }
function sprite(img, sx, footY, flip) {
  const x0 = Math.round(sx - img.width / 2), y0 = Math.round(footY - img.height);
  if (!flip) { ctx.drawImage(img, x0, y0); return; }
  ctx.save(); ctx.translate(x0 + img.width, y0); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore();
}
function shadow(sx, w, y = GROUND) { ctx.fillStyle = 'rgba(30,20,30,.28)'; ctx.fillRect(Math.round(sx - w / 2), y, w, 1); ctx.fillRect(Math.round(sx - w / 2 + 2), y + 1, w - 4, 1); }
function updatePuffs(B, lc, dt) {
  B.emitters.forEach(e => { e.t -= dt; if (e.t <= 0) { e.t += e.every; B.puffs.push({ x: e.x, y: e.y, f: e.f, age: 0, life: e.life, size: e.size }); } });
  B.puffs.forEach(p => {
    p.age += dt; p.y -= 9 * dt; p.x += 5 * dt;
    ctx.globalAlpha = Math.max(0, 1 - p.age / p.life) * .9;
    circle(ctx, Math.round(wrapScreen(p.x - lc * p.f)), Math.round(p.y), Math.round(1 + p.age / p.life * p.size * 1.6), '#eceef2');
  });
  ctx.globalAlpha = 1; B.puffs = B.puffs.filter(p => p.age < p.life);
}
function drawLayerOf(target, s, kind, t, dt) {
  const D = SCENES[s.scene], B = built[s.scene], lc = cam - s.start + s.from;
  ctx = target; LW = D.lw || 768;
  if (kind === 'mid') { layer(B.mid, lc * .45); updatePuffs(B, lc, dt); if (D.anim) D.anim(lc, t, B); }
  else { layer(B.near, lc); stretchEdges(B.near, lc, D.interior); if (D.animFront) D.animFront(lc, t, B); }
  ctx = mainCtx;
}
function canopy(cx, footY, w, cols) {
  cx = Math.round(cx);
  const big = w > 30, hw = w / 2, topY = footY - (big ? 76 : 38), sag = big ? 9 : 4, th = big ? 4 : 3, cell = big ? 6 : 4;
  for (let i = -hw; i < hw; i++) {
    const y = topY + Math.round((i / hw) ** 2 * sag), col = cols[Math.floor((i + hw) / cell) % cols.length];
    rect(ctx, cx + i, y, 1, th, col); px(ctx, cx + i, y, shade(col, 1.2)); px(ctx, cx + i, y - 1, OUT); px(ctx, cx + i, y + th, OUT);
  }
  const hy = footY - (big ? 26 : 13);
  [-hw + 2, -hw / 3, hw / 3, hw - 2].forEach(dx => line(ctx, cx + dx, topY + th + Math.round((dx / hw) ** 2 * sag), cx + (dx < 0 ? -2 : 2), hy, 'rgba(40,30,40,.75)'));
}
function drawChar(who, x, t, moving, flip, pose) {
  const off = who === 'tomi' ? 1.3 : 0, sx = x - cam, mode = modeAt(x), fy = footAt(x), set = outfitSprites(outfitFor(x))[who];
  const a = altitude(x), fly = mode === 'fly' && a > .02;
  const y = Math.round(fy + (FLY_Y - (who === 'tomi' ? 16 : 0) + Math.sin(t * 1.6 + off * .3) * 2 - fy) * a);
  if (fly && !dragon && a > .08) canopy(sx, y, 48, who === 'pita' ? ['#e0507a', '#f0c040'] : ['#5fc0c4', '#7a4aa8']);
  if (!fly || a < .1) shadow(sx, 20, fy);
  if (dragon) { sprite(DRAGONS[who][Math.floor(t * 5 + off) % 2], sx, (fly ? y : fy - 8 + Math.round(Math.sin(t * 3 + off) * 1.5)), flip); return; }
  if (fly && a >= .1) { sprite(set.walk[1], sx, y + 2, flip); return; }
  if (pose === 'kneel') { sprite(set.kneel, sx, fy + 2, flip); return; }
  if (pose === 'sitMug' || pose === 'sitBread') { sprite(set[pose], sx, 136, false); return; }
  if (pose === 'kiss' && !fly) { sprite(set.kiss, sx, fy + 2, flip); return; }
  if (pose === 'faint') {
    const ft = faint.t, ang = ft < .25 || ft > 2.5 ? -Math.PI / 4 : -Math.PI / 2, img = (mode === 'run' ? set.run : set.walk)[1];
    ctx.save(); ctx.translate(Math.round(sx), Math.round(fy + 1 - Math.abs(Math.sin(ang)) * 12)); ctx.rotate(ang); ctx.drawImage(img, -Math.round(img.width / 2), -img.height + 2); ctx.restore();
    if (ft >= .25 && ft <= 2.5) for (let k = 0; k < 3; k++) { const a = ft * 6 + k * 2.1, x = Math.round(sx - 30 + Math.cos(a) * 9), y = Math.round(fy - 20 + Math.sin(a) * 3); rect(ctx, x - 1, y, 3, 1, '#f2d27a'); rect(ctx, x, y - 1, 1, 3, '#f2d27a'); }
    return;
  }
  if (mode === 'ski') {
    const s = SEGS[segAt(x)], wob = who === 'pita' && x - s.start < s.wobble ? Math.round(Math.sin(t * 16)) - (Math.sin(t * 2.3) > .9 ? 2 : 0) : 0;
    sprite(set.ski, sx, fy + 2 + wob + (moving ? Math.round(Math.sin(t * 7 + off)) : 0), flip); return;
  }
  const climbing = who === 'tomi' && intro > 0, frames = mode === 'run' ? set.run : set.walk, fr = climbing ? Math.floor(t * 8) % 4 : moving ? Math.floor(phase) % 4 : 1;
  sprite(frames[fr], sx, fy + 2 - hopY(who) - (who === 'tomi' ? introOff() : 0) - (moving && fr % 2 === 1 ? 1 : 0), flip);
}
function drawMilkyAt(x, y, img, flip, flying) {
  const sx = Math.round(x - cam);
  if (sx < -30 || sx > W + 30) return;
  if (flying) canopy(sx, y, 28, ['#e8964a', '#fff4e6']); else shadow(sx, img.width < 30 ? 10 : 16, footAt(x));
  sprite(img, sx, y + 2, flip);
}
function drawMilky(t, moving) {
  if (milkyState === 'follow') {
    const M = milkySet(accFor(milkyX), isBaby(milkyX)), a = altitude(milkyX);
    if (sofaS && sofaS.t > .6 && sofaS.t < 4.6) { const sx = Math.round(milkyX - cam); sprite(M.sleep, sx, 131, false); if (Math.floor(t * 1.5) % 2) text(ctx, 'Z', sx + 10, 104, '#3a3a5a'); return; }
    const img = a > .1 ? M.idle[Math.floor(t * 2) % 2] : moving ? M.walk[Math.floor(phase) % 4] : M.idle[Math.floor(t * 2) % 2];
    drawMilkyAt(milkyX, Math.round(milkyY) - hopY('milky'), img, facing < 0, a > .08);
    return;
  }
  const leadX = pos[lead];
  SEGS.forEach(s => (s.peeks || []).forEach(([r, y]) => { const x = s.start + r; { const M = milkySet(accFor(x), true); drawMilkyAt(x, y, (t % 3.2) < .15 ? M.blink : M.idle[0], leadX < x, false); } }));
  const M = milkySet(accFor(milkyX), true);
  drawMilkyAt(milkyX, GROUND, (t % 3.2) < .15 ? M.blink : M.idle[Math.floor(t * 1.5) % 2], leadX < milkyX, false);
  if (Math.abs(leadX - milkyX) < 90 && Math.floor(t * 2) % 2) ctx.drawImage(HEART, Math.round(milkyX - cam) - 3, GROUND - 26);
}
function drawProps(t) {
  SEGS.forEach(s => {
    if (s.arch !== undefined) {
      const sx = Math.round(s.start + s.arch - cam), L = sx - 44;
      if (sx > -60 && sx < W + 60) {
        rect(ctx, L, GROUND - 52, 4, 58, '#2a4aa8'); rect(ctx, sx + 40, GROUND - 52, 4, 58, '#2a4aa8');
        rect(ctx, L, GROUND - 62, 88, 12, '#2a4aa8'); rect(ctx, L, GROUND - 62, 88, 1, '#5a7ae0');
        for (let i = 0; i < 44; i++) rect(ctx, L + i * 2, GROUND - 50, 2, 1, i % 2 ? '#ffffff' : '#1a1a1a');
        text(ctx, 'META', sx - 7, GROUND - 59, '#f0c040');
      }
    }
    if (s.meones !== undefined) { const sx = Math.round(s.start + s.meones - cam); if (sx > -40 && sx < W + 40) ctx.drawImage(MEONES, sx - 25, 146 - 71); }
    if (s.windsock !== undefined) {
      const sx = Math.round(s.start + s.windsock - cam), gy = 160;
      if (sx > -30 && sx < W + 30) { rect(ctx, sx, gy - 26, 1, 26, '#8a8a8a'); for (let i = 0; i < 10; i++) rect(ctx, sx + 1 + i, gy - 26 + Math.round(Math.sin(t * 6 + i * .6) * (i / 10)), 1, 4 - Math.floor(i / 4), (i >> 1) % 2 ? '#ffffff' : '#f07030'); }
    }
    if (s.ring !== undefined && !ringFound) {
      const x = s.start + s.ring, sx = Math.round(x - cam), y = footAt(x) - 14 + Math.round(Math.sin(t * 3) * 2);
      if (sx > -20 && sx < W + 20) { ctx.drawImage(RING, sx - 6, y - 13); if (Math.floor(t * 4) % 2) { rect(ctx, sx + 6, y - 14, 1, 3, '#ffffff'); rect(ctx, sx + 5, y - 13, 3, 1, '#ffffff'); } }
    }
  });
  const by = GROUND + 2 - 34;
  if (!riding && !rideDone) ctx.drawImage(BUS, Math.round(SEGS[0].start + SEGS[0].train - 70 - cam), by);
  if (riding) ctx.drawImage(BUS, Math.round(pos.tomi - 70 - cam), by);
  if (leavingTrain !== null) ctx.drawImage(BUS, Math.round(leavingTrain - cam), by);
}
function trainSmoke(x, dt) { smokeT -= dt; if (smokeT <= 0) { smokeT = .25; fx.push({ x: x + 2, y: GROUND - 4, vx: -12, vy: -5, life: .9, kind: 'smoke' }); } }
function burst(x, y) {
  for (let i = 0; i < 18; i++) { const a = Math.random() * 6.28, v = 20 + Math.random() * 30; fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, kind: 'p' }); }
  for (let i = 0; i < 5; i++) fx.push({ x: x + (Math.random() - .5) * 50, y: y - Math.random() * 30, vx: 0, vy: -6, life: 1, kind: 's' });
}
function hearts(x, y, n = 6) { for (let i = 0; i < n; i++) fx.push({ x: x - 10 + Math.random() * 20, y: y - Math.random() * 10, vx: (Math.random() - .5) * 12, vy: -18, life: 1.4, kind: 'h' }); }
function drawFx(dt) {
  fx.forEach(p => {
    p.life -= dt * (reduced ? 3 : p.kind === 'smoke' ? 1 : p.kind === 'confetti' || p.kind === 'diploma' ? .8 * H / Hs : 1.6); p.x += p.vx * dt; p.y += p.vy * dt;
    const sx = p.x - cam;
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
    if (p.kind === 'p') rect(ctx, sx, p.y, 2, 2, '#fff4e6');
    else if (p.kind === 's') { rect(ctx, sx - 2, p.y, 5, 1, '#f2d27a'); rect(ctx, sx, p.y - 2, 1, 5, '#f2d27a'); }
    else if (p.kind === 'confetti') { p.x += Math.sin(p.y * .1) * .3; rect(ctx, sx, p.y, 2, 2, p.col === '#fbf8ee' ? '#f0c040' : p.col); }
    else if (p.kind === 'diploma') { rect(ctx, sx - 1, p.y - 1, 9, 4, OUT); rect(ctx, sx, p.y, 7, 2, '#fbf8ee'); px(ctx, sx + 3, p.y, '#c83a3a'); px(ctx, sx + 3, p.y + 1, '#c83a3a'); }
    else if (p.kind === 'paper') { p.vy += 70 * dt; rect(ctx, sx, p.y, 4, 3, '#fbf8ee'); rect(ctx, sx + 1, p.y + 1, 2, 1, '#9aa4b8'); }
    else if (p.kind === 'smoke') circle(ctx, Math.round(sx), Math.round(p.y), Math.round(1 + (1 - p.life) * 3), '#d8dade');
    else if (p.kind === 'H') ctx.drawImage(HEART, Math.round(sx), Math.round(p.y), 14, 12);
    else ctx.drawImage(HEART, Math.round(sx), Math.round(p.y));
  });
  ctx.globalAlpha = 1; fx = fx.filter(p => p.life > 0);
}
function weather(dt, s) {
  const D = SCENES[s.scene]; if (!D.weather) return;
  const n = reduced ? 30 : 80, snow = D.weather === 'snow', lc = cam - s.start + s.from, lw = D.lw || 768;
  if (drops.length !== n) { drops = []; for (let i = 0; i < n; i++) drops.push({ x: Math.random() * W, y: Math.random() * Hs, v: Math.random() }); }
  ctx.fillStyle = snow ? 'rgba(255,255,255,.9)' : 'rgba(225,235,245,.55)';
  drops.forEach(d => {
    const v = snow ? 18 + d.v * 16 : 110 + d.v * 60;
    d.y += v * dt; d.x -= snow ? Math.sin(d.y * .05 + d.v * 6) * 6 * dt : v * dt * .25;
    if (d.y > Hs) { d.y = -4; d.x = Math.random() * (W + 40); }
    if (d.x < -2) d.x += W + 4;
    if (D.rainZones) { const m = (((d.x + lc * .45) % lw) + lw) % lw; if (!D.rainZones.some(([a, b]) => m >= a && m <= b)) return; }
    ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, snow ? 1 : 3);
  });
}
function showCaption(text) { capQueue.push(text); }
// phones are too narrow for look-ahead framing: keep whoever is walking centred
function partyMid() {
  const xs = [pos.tomi];
  if (joined) xs.push(pos.pita);
  if (milkyState === 'follow') xs.push(milkyX);
  return (Math.min(...xs) + Math.max(...xs)) / 2;
}
const introOff = () => intro === 0 ? 58 : intro > 0 ? Math.round(58 * (1 - smooth(intro / 1.2))) : 0;
const HOP = .9, hopY = who => hopT[who] > 0 ? Math.round(Math.abs(Math.sin(Math.PI * 2 * (1 - hopT[who] / HOP))) * 8) : 0;
const drawStackLater = [];
const BOOK_COLS = ['#c84a4a', '#3a6ab0', '#fbf8ee', '#4a9a5a', '#e0b040', '#fbf8ee', '#7a4ab0'];
function stackCount(x) {
  const s = segWith('meet'), r = x - s.start;
  if (!joined || booksDropped || r < s.meet || r > s.len) return 0;
  return 1 + Math.floor(Math.max(0, Math.min(1, (r - s.meet) / (s.years[2][0] - s.meet))) * 9);
}
function drawStack(who, x, flip, moving) {
  const n = stackCount(x); if (!n) return;
  const sx = Math.round(x - cam + (flip ? -10 : 10)), fy = footAt(x) - hopY(who);
  for (let k = 0; k < n; k++) {
    const col = BOOK_COLS[(k * 3 + (who === 'tomi' ? 2 : 0)) % BOOK_COLS.length], jx = ((k * 7 + (who === 'tomi' ? 3 : 0)) % 5) - 2 + (moving ? Math.round(Math.sin(phase * 1.6) * k * .25) : 0);
    const y = fy - 17 - k * 3, w = col === '#fbf8ee' ? 10 : 12;
    rect(ctx, sx - w / 2 + jx - 1, y - 1, w + 2, 4, OUT); rect(ctx, sx - w / 2 + jx, y, w, 2, col);
    if (col === '#fbf8ee') rect(ctx, sx - w / 2 + jx + 1, y + 1, w - 2, 1, '#9aa4b8'); else rect(ctx, sx - w / 2 + jx, y, 1, 2, shade(col, 1.3));
  }
}
function kiss() { if (dating && !prop && kissT <= 0) { kissT = 1.9; kissHearts = false; } }
function frame(now) {
  const t = now / 1000, dt = Math.max(0, Math.min(.05, last ? t - last : 0)); last = Math.max(last, t);
  if (mode === 'landing') { dir = 0; landT -= dt; if (landT <= 0) { landT = 6; kiss(); } }
  if (lockT > 0) lockT -= dt;
  if (intro >= 0 && mode === 'game') { if (intro === 0 && dir > 0) intro = .001; else if (intro > 0) { intro += dt; if (intro > 1.4) { intro = -1; facing = 1; } } }
  for (const k in hopT) if (hopT[k] > 0) hopT[k] = Math.max(0, hopT[k] - dt);
  const moving = dir !== 0 && !riding && !prop && lockT <= 0 && intro < 0;
  if (moving && !hint.hidden) hint.hidden = true;
  if (moving && window.onPTMove) window.onPTMove();
  if (moving) {
    facing = dir;
    pos[lead] = Math.max(0, Math.min(WORLD_END - 12, pos[lead] + dir * SPEED[modeAt(pos[lead])] * (dragon ? 1.4 : 1) * dt));
    phase += dt * (modeAt(pos[lead]) === 'run' ? 12 : 8); kissT = 0;
  }
  if (!rideDone && !riding && !joined && pos.tomi >= SEGS[0].start + SEGS[0].train - 10) { riding = true; facing = 1; burst(pos.tomi, GROUND - 22); }
  if (riding) {
    pos.tomi += 150 * dt; trainSmoke(pos.tomi - 70, dt);
    if (pos.tomi >= SEGS[1].start + 140) { riding = false; rideDone = true; leavingTrain = pos.tomi - 70; burst(pos.tomi, GROUND - 22); }
  }
  if (leavingTrain !== null) { leavingTrain += 220 * dt; trainSmoke(leavingTrain, dt); if (leavingTrain - cam > W + 40) leavingTrain = null; }
  if (!rideDone && !riding) trainSmoke(SEGS[0].start + SEGS[0].train - 70, dt);
  if (!joined && pos.tomi >= pos.pita - 24) { joined = true; lead = 'pita'; hopT.pita = hopT.tomi = HOP; lockT = HOP; }
  if (kissT > 0) kissT -= dt;
  if (boomCD > 0) boomCD -= dt;
  const kissing = kissT > 0;
  if (prop) pos.tomi += (pos.pita + (prop.t > 4.8 ? 23 : 24) - pos.tomi) * Math.min(1, dt * 3);
  else if (sofaS) { const ss = segWith('sofa'); sofaS.t += dt; for (const w of ['pita', 'tomi']) pos[w] += (ss.start + ss.seats[w] - pos[w]) * Math.min(1, dt * 4); milkyX += (ss.start + ss.seats.milky - milkyX) * Math.min(1, dt * 4); if (sofaS.t > 5) { sofaS = null; facing = 1; } }
  else if (faint) { faint.t += dt; if (faint.t > 3.2) { faint = null; } else if (faint.t > 2.75 && !faint.up) { faint.up = true; burst(pos.tomi, GROUND - 22); } }
  else if (joined) pos.tomi += (pos.pita - (kissing ? 23 : modeAt(pos.pita) === 'fly' ? 44 : 34) * facing - pos.tomi) * Math.min(1, dt * (kissing ? 7 : 4));
  const ls = SEGS[segAt(pos[lead])];
  if (milkyState === 'wild' && Math.abs(pos[lead] - milkyX) < 14) { milkyState = 'follow'; showCaption('¡Milky!'); hearts(milkyX, GROUND - 34); hopT.pita = hopT.tomi = hopT.milky = HOP; lockT = HOP; }
  if (milkyState === 'follow' && !sofaS) {
    milkyX += ((prop ? pos.pita - 30 : pos.tomi - (modeAt(milkyX) === 'fly' ? 36 : 30) * facing) - milkyX) * Math.min(1, dt * 3);
    const a = altitude(milkyX), fy = footAt(milkyX);
    milkyY += (fy + (FLY_Y + 16 + Math.sin(t * 1.6 + 2) * 2 - fy) * a - milkyY) * Math.min(1, dt * 6);
  }
  SEGS.forEach(s => { if (s.kiss !== undefined && !s.kissed && joined && pos[lead] >= s.start + s.kiss) { s.kissed = true; dating = true; lockT = 2.2; facing = 1; kiss(); booksDropped = true; for (const w of ['pita', 'tomi']) for (let i = 0; i < 12; i++) fx.push({ x: pos[w] + (Math.random() - .5) * 10, y: GROUND - 30 - Math.random() * 14, vx: (Math.random() - .5) * 50, vy: -40 - Math.random() * 30, life: 1.6, kind: 'paper' }); hearts((pos.pita + pos.tomi) / 2, GROUND - 56, 8); showCaption('7 de julio de 2017'); } });
  if (!gradDone && joined && pos.tomi >= at('graduate') + 4) {
    gradDone = true; hopT.pita = hopT.tomi = hopT.milky = HOP; lockT = HOP + .4;
    for (let i = 0; i < 70; i++) fx.push({ x: cam + Math.random() * W, y: -offY - 10 - Math.random() * 70, vx: (Math.random() - .5) * 20, vy: 18 + Math.random() * 22, life: 2.6, kind: i % 7 === 0 ? 'diploma' : 'confetti', col: BOOK_COLS[i % BOOK_COLS.length] });
  }
  const sofaSeg = segWith('sofa');
  if (!sofaS && !sofaSeg.sofaDone && joined && pos.pita >= at('sofa')) { sofaSeg.sofaDone = true; sofaS = { t: 0 }; lockT = 5; }
  const archSeg = segWith('arch');
  if (!faint && !archSeg.fainted && joined && pos.tomi >= at('arch') + 18) { archSeg.fainted = true; faint = { t: 0 }; lockT = 3.2; facing = 1; }
  if (!prop && joined && pos.pita >= at('ring') - 30) { prop = { t: 0 }; ringFound = true; facing = 1; }
  if (prop) {
    prop.t += dt;
    if (prop.t > 1.4 && !prop.ask) { prop.ask = true; showCaption('¿Te casarías conmigo?'); }
    if (prop.t > 4.8 && !prop.yes) {
      prop.yes = true; showCaption('¡Obvio que sí! ♥'); hearts(pos.pita + 10, footAt(pos.pita) - 50, 24); kissT = 2.4; kissHearts = false; prop.hT = 0;
      for (let i = 0; i < 90; i++) fx.push({ x: cam + Math.random() * W, y: -offY - 10 - Math.random() * 80, vx: (Math.random() - .5) * 20, vy: 18 + Math.random() * 22, life: 2.6, kind: 'confetti', col: BOOK_COLS[i % BOOK_COLS.length] });
    }
    if (prop.yes && prop.t < 8.5) { prop.hT -= dt; if (prop.hT <= 0) { prop.hT = .12; fx.push({ x: pos.pita + 10 + (Math.random() - .5) * 60, y: footAt(pos.pita) - 30 - Math.random() * 30, vx: (Math.random() - .5) * 16, vy: -16 - Math.random() * 10, life: 1.6, kind: Math.random() < .25 ? 'H' : 'h' }); } }
    if (prop.t > 9 && !prop.done) { prop.done = true; banner.hidden = true; capQueue = []; if (window.onPTFinal) window.onPTFinal(); }
  }
  captions.forEach(c => { if (!c.shown && pos[lead] >= c.x) { c.shown = true; showCaption(c.text); } });
  cam += ((mode === 'landing' ? pos[lead] - Math.round(W * .62) : TALL ? partyMid() - W / 2 : pos[lead] - PLAYER_SX) - cam) * Math.min(1, dt * 5);

  const cp = colPairs();
  renderSky(cp); renderFar(cp);
  mainCtx.save(); mainCtx.translate(0, offY);
  drawClipped('mid', t, dt); drawClipped('near', t, dt);
  SEGS.slice(0, -1).forEach(sg => { const ox = Math.round(sg.end - cam); if (ox > -90 && ox < W + 90) occluder(sg.occ || 'tree', ox); });
  drawProps(t);
  if (mode === 'game' && cam < 700) { const ox = Math.round(-16 - cam); if (ox > -90 && ox < W + 90) { occluder('tree', ox); rect(mainCtx, ox, GROUND - 60, 30, 4, '#3a2a20'); rect(mainCtx, ox, GROUND - 60, 30, 1, '#5a4434'); } }
  drawMilky(t, moving);
  for (const who of ['pita', 'tomi']) {
    const o = outfitFor(pos[who]);
    if (lastOutfit[who] && lastOutfit[who] !== o && (who !== 'pita' || joined)) burst(pos[who], footAt(pos[who]) - 22);
    lastOutfit[who] = o;
  }
  const pitaFlip = faint ? true : prop ? false : !joined ? true : kissing ? facing > 0 : facing < 0, tomiFlip = prop ? true : facing < 0;
  const chars = [];
  if (!riding) chars.push(['tomi', pos.tomi, tomiFlip]);
  chars.push(['pita', pos.pita, pitaFlip]);
  (facing > 0 && !prop ? chars : chars.reverse()).forEach(([w, x, fl]) => { if (x - cam > -40 && x - cam < W + 40 && !dragon) drawStackLater.push([w, x, fl]); if (x - cam > -40 && x - cam < W + 40) drawChar(w, x, t, prop && w === 'tomi' ? prop.t < 1.2 : moving, fl, prop && w === 'tomi' && prop.t >= 1.2 && prop.t < 4.8 ? 'kneel' : faint && w === 'tomi' && faint.t < 2.9 ? 'faint' : sofaS && sofaS.t > .6 && sofaS.t < 4.6 ? (w === 'pita' ? 'sitMug' : 'sitBread') : kissing && kissT < 1.75 && kissT > .15 ? 'kiss' : null); });
  if (prop && prop.t < 1.2) phase += dt * 8;
  drawStackLater.forEach(([w, x, fl]) => drawStack(w, x, fl, moving)); drawStackLater.length = 0;
  if (kissing && !kissHearts && kissT < 1.3) {
    kissHearts = true;
    const mx = (pos.pita + pos.tomi) / 2, my = footAt(pos.pita) - 56 + (FLY_Y - footAt(pos.pita)) * altitude(pos.pita);
    fx.push({ x: mx - 7, y: my, vx: 0, vy: -10, life: 1.9, kind: 'H' }); hearts(mx, my + 6, 4);
  }
  drawFx(dt);
  mainCtx.restore();
  weather(dt, SEGS[segAt(cam + W / 2)]);
  const os = segWith('online'), orel = pos[lead] - os.start;
  onlineFrame(orel < -60 || orel > os.len + 60 ? 0 : smooth((orel + 40) / 80) * smooth((os.len - orel + 40) / 80), t);
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) banner.hidden = true; }
  if (bannerT <= 0 && capQueue.length) { banner.textContent = capQueue.shift(); banner.hidden = false; bannerT = 2.4; }
  const yr = ls.years.filter(([r]) => pos[lead] - ls.start >= r).pop()[1];
  if (place.textContent !== ls.place) place.textContent = ls.place;
  if (yearEl.textContent !== yr) yearEl.textContent = yr;
  const kb = $('b-kiss'), showKiss = mode === 'game' && dating && !prop && !riding; if (kb.hidden === showKiss) kb.hidden = !showKiss;
  requestAnimationFrame(frame);
}
function transform() {
  burst(pos[lead], footAt(pos[lead]) - 22);
  setTimeout(() => { dragon = !dragon; }, reduced ? 0 : 180);
}

const held = new Set();
const syncDir = () => { dir = (held.has('r') ? 1 : 0) - (held.has('l') ? 1 : 0); };
addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('button')) return;
  if (['ArrowLeft', 'a', 'A'].includes(e.key)) { held.add('l'); syncDir(); e.preventDefault(); }
  if (['ArrowRight', 'd', 'D'].includes(e.key)) { held.add('r'); syncDir(); e.preventDefault(); }
  if (e.key === ' ' && !e.repeat) { transform(); e.preventDefault(); }
  if ((e.key === 'k' || e.key === 'K') && !e.repeat) kiss();
  if ((e.key === 'n' || e.key === 'N') && !e.repeat && !riding) { const s = SEGS[Math.min(SEGS.length - 1, segAt(pos[lead]) + 1)]; jumpTo(s.start + 20); }
});
addEventListener('keyup', e => {
  if (['ArrowLeft', 'a', 'A'].includes(e.key)) held.delete('l');
  if (['ArrowRight', 'd', 'D'].includes(e.key)) held.delete('r');
  syncDir();
});
// rage-kiss: 5 taps in 2 s → heart explosion, at most one every 3 s
let taps = [], boomCD = 0;
function tapBesito() {
  const now = performance.now();
  if (kissT > 0) hearts((pos.pita + pos.tomi) / 2, footAt(pos.pita) - 50, 2);
  kiss();
  taps = taps.filter(t0 => now - t0 < 2000); taps.push(now);
  if (taps.length >= 5 && boomCD <= 0) { taps = []; boomCD = 3; boom(); }
}
function boom() {
  const mx = (pos.pita + pos.tomi) / 2, my = footAt(pos.pita) - 40 + (FLY_Y - footAt(pos.pita)) * altitude(pos.pita);
  for (let i = 0, n = reduced ? 12 : 40; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = 30 + Math.random() * 60;
    fx.push({ x: mx, y: my, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 15, life: 1.4 + Math.random() * .6, kind: Math.random() < .35 ? 'H' : 'h' });
  }
  if (window.onPTBoom) window.onPTBoom();
}
$('b-kiss').addEventListener('click', tapBesito);

const resetFlags = () => SEGS.forEach(s => { s.kissed = false; s.fainted = false; s.sofaDone = false; });
function setLanding() { resetFlags(); resetWorld(); jumpTo(at('ring') - 110); intro = -1; cam = pos.pita - Math.round(W * .62); ringFound = true; kissT = 0; landT = 2.5; facing = 1; mode = 'landing'; }
window.PT = {
  start(w, hs) { setViewport(w || W0, hs || H); resetFlags(); resetWorld(); mode = 'game'; },
  landing() { setViewport(150, H); setLanding(); },
  resize(w, hs) { setViewport(w, hs); },
  press(k, on) { if (on) held.add(k); else held.delete(k); syncDir(); },
  milky: () => milkySet('scarf').idle[0], heart: () => HEART,
};
const names = Object.keys(SCENES);
(function boot(i) {
  if (i < names.length) { hint.textContent = 'CARGANDO…'; buildScene(names[i]); setTimeout(() => boot(i + 1), 0); return; }
  setViewport(150, H); setLanding(); intro = -1;
  window.PT_READY = true; window.dispatchEvent(new Event('pt-ready'));
  requestAnimationFrame(frame);
})(0);
})();
