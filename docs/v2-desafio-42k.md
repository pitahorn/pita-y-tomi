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
- **Hold to run**: hold anywhere = sprint, release = jog. Tomi never stops.
- Real length: **Fácil ~2 min, Ultra ~4 min**. The race clock shows a marathon
  time (e.g. 3:41:07); km markers along the way.
- Finish: always the medal + final time.

## Fácil
- Bars: ⚡ energía, 💧 agua, 🤢 guatita. Buttons: [gel] [frugele] [agua].
- Gel: +40% energía over ~3 s, +30% guatita. Frugele: +12% energía now, +8% guatita.
- Guatita >60% = slower, 100% = faint. Empties slowly while jogging.
- Faint if energía or agua hits 0.
- Short live hints the first time something matters.

## Ultra
- Adds ☀ sol and 🧂 sales bars, [bloqueador] and [electrolito] buttons.
- Sprint drains energía ×3, agua ×2.
- Open-avenue km burn bloqueador; without it agua drains ×2 and "quemado" slows 10%.
- Each agua dilutes sales; sales <20% = calambre (forced jog).
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
- Once, at a random point in the 2nd half: a ♥ floats ahead on the road,
  drifting at jog speed for ~6 s. Only sprinting catches it.
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
