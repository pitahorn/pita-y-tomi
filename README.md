# 🪨 pita-y-tomi

Save the date for Pita & Tomi — 9 de octubre 2027. A pixel-art walk through our
story, from Temuco 2014 to the Bariloche proposal in 2026.

Served by GitHub Pages from `index.html`, one self-contained file.

## Editing

Edit `src/`, then rebuild and push:

```sh
./build.py        # inlines photo + engine (+ race.js, stack.js) into src/page.html -> index.html, 42k/ and puc/
```

- `src/page.html` — landing, controls, onboarding, final overlay
- `src/engine.js` — the game: world, sprites, scenes, timeline
- `src/race.js` — Desafío 42K (spliced into the engine); also served at `/42k`
- `src/stack.js` — Pita y Tomi en la PUC (spliced into the engine); also served at `/puc`
- `src/photo.jpg` — landing photo

Commit `index.html`, `42k/index.html` and `puc/index.html` together with the `src/` change; Pages serves them as-is.

Design of the games: `docs/v2-desafio-42k.md`, `docs/v3-pita-en-la-puc.md`.
