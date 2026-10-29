// Global besito total and top-5 leaderboards for matri.pitahorn.com. KV is eventually
// consistent and read-modify-write can drop a racing update: fine for a family game.
const ORIGINS = ['https://matri.pitahorn.com', 'http://localhost:8042', 'http://192.168.100.83:8042'];
// keep 10 per board so a time pushed off the shown top 5 isn't lost
const MAX_BESITOS = 500, SHOWN = 5, KEPT = 10;
const NAME = /^[A-Z0-9Ñ]{1,6}$/, PLAYER = /^[a-z0-9-]{8,40}$/;
// fastest believable result per board, in the seconds each game reports
const BOARDS = {
  '42k:facil': 7199, '42k:ultra': 7199,
  'puc:facil': 40, 'puc:ultra': 40,
};
const MAX_TIME = 24 * 3600;

const json = (body, req, status = 200) => {
  const origin = req.headers.get('Origin');
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    },
  });
};
const readBoard = async (env, key) => JSON.parse((await env.PT.get('board:' + key)) || '[]');
const publicRows = rows => rows.slice(0, SHOWN).map(r => ({ name: r.name, time: r.time }));

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return json({}, req);
    const path = new URL(req.url).pathname.split('/').filter(Boolean);

    if (path[0] === 'besitos') {
      let total = +((await env.PT.get('besitos')) || 0);
      if (req.method === 'POST') {
        const { n } = await req.json().catch(() => ({}));
        if (!Number.isInteger(n) || n < 1) return json({ error: 'bad count' }, req, 400);
        total += Math.min(n, MAX_BESITOS);
        await env.PT.put('besitos', String(total));
      }
      return json({ total }, req);
    }

    if (path[0] === 'board' && path.length === 3) {
      const key = path[1] + ':' + path[2], min = BOARDS[key];
      if (min === undefined) return json({ error: 'no board' }, req, 404);
      let rows = await readBoard(env, key);
      if (req.method === 'POST') {
        const { id, name, time } = await req.json().catch(() => ({}));
        if (!PLAYER.test(id || '') || !NAME.test(name || '') || !(time >= min && time <= MAX_TIME)) return json({ error: 'bad entry' }, req, 400);
        // one row per player: their best time, under their latest name
        const mine = rows.find(r => r.id === id);
        if (mine) { mine.name = name; mine.time = Math.min(mine.time, time); } else rows.push({ id, name, time });
        rows = rows.sort((a, b) => a.time - b.time).slice(0, KEPT);
        await env.PT.put('board:' + key, JSON.stringify(rows));
        return json({ rows: publicRows(rows), rank: rows.findIndex(r => r.id === id) + 1 }, req);
      }
      return json({ rows: publicRows(rows) }, req);
    }

    return json({ error: 'not found' }, req, 404);
  },
};
