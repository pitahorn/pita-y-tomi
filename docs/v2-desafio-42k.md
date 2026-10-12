# v2 — Desafío 42K + besito count

Agreed with Pita via /grilling, 2026-10-12. Front-end only; a Cloudflare
Worker for anything global (counter, leaderboard) comes later.

## Entry
- End screen gets a third button: **🏅 Desafío 42K**. The story stays calm; only
  people who finish it see the game.
- Pick **Fácil** or **Ultra** (no middle level).

## Race
- Maratón de Santiago scene only. Player is Tomi; Pita runs beside him, not
  playable (she stops to help him up when he faints).
- **Tap left = jump, tap right = faster.** A split-screen guide shows at the start
  until the first tap. Desktop: ←/↑/space jump, → faster.
- Each right tap ×1.2 speed, drifting back to a jog in ~3 s. Energy and water
  drain grow with the square of speed, so tap-spamming burns out.
- Items float at jump height; jumping grabs them, staying down skips them.
  Rocks and litter on the road: hitting one = 1 s stumble, back to jog, no ♥ lost.
- Aid stations every 5 km: agua, gel, agua (Ultra: agua, gel, sales, agua).
- Fixed course per mode (seeded), so times compare and routes can be learned.
- Real length: **Fácil 75 s, Ultra 2:30**. The race clock shows a marathon time.
- Finish: always the medal + final time.

## Combos (turbo 4 s: faster with no extra drain)
- ¡Combo pro!: agua → gel within 3 s.
- ¡Azucarazo!: 3 Frugeles within 4 s.
- ¡Pro hidratado! (Ultra): sales → agua within 3 s, +10% agua.

## Fácil
- Bars: ⚡ energía, 💧 agua, 🤢 guatita. Items: gel, Frugele, agua.
- Gel: +40% energía over ~3 s, +30% guatita. Frugele: +12% energía now, +8% guatita.
- Guatita >60% = slower, 100% = faint. Empties slowly, faster at a jog.
- Faint if energía or agua hits 0. Short live hints the first time something matters.

## Ultra
- Adds ☀ sol and 🧂 sales bars; bloqueador and sales items.
- Open-avenue km burn bloqueador; without it agua drains ×2 and "quemado" slows 10%.
- Each agua dilutes sales; fast running sweats sales; sales <20% = calambre (no speed-up).
- Gel without agua in the last 5 s = guatita ×2.
- **No hints.** Players learn by fainting.

## Faints and lives
- ♥♥♥: faints 1 and 2 cost a ♥; the 3rd = game over, start over.
- Penalty only: Tomi drops, Pita helps him up (~3 s real = +6 min race clock).
  Bars stay where they were.
- ~3 s recovery after getting up: forced jog, can't faint, time to eat/drink.
- Every faint shows its cause and blinks that bar: "¡Sin agua!",
  "¡Dolor de guatita!", "¡Calambre: pocas sales!", "¡Insolación!", "¡Sin energía!".

## Besito de la Suerte
- Once in the 2nd half: a ♥ floats ahead at jump height, drifting a bit faster
  than a jog for ~7 s. Speed up to reach it, jump to grab it.
- Reward: +1 ♥ (or a speed boost if lives are full), and guatita −15%.

## Results
- Best time per mode saved on the phone (localStorage).
- **Compartir** sends e.g. "Corrí el 42K de Pita & Tomi en 3:41:07 🏅 modo ULTRA
  → matri.pitahorn.com" to WhatsApp.
- Global leaderboard: later, with the worker.

## Besito count (story mode)
- Per phone for now (localStorage): the button reads "♥ besito · 37", the end
  screen says "Le diste 37 besitos a Pita & Tomi".
- Later the worker swaps in the global total.
