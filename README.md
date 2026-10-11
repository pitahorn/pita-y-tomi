# 🪨 pita-y-tomi

Save the date for Pita & Tomi — 9 de octubre 2027. A pixel-art walk through our
story, from Temuco 2014 to the Bariloche proposal in 2026.

Served by GitHub Pages from `index.html`, one self-contained file.

## Editing

Edit `src/`, then rebuild and push:

```sh
./build.py        # inlines src/photo.jpg + src/engine.js into src/page.html -> index.html
```

- `src/page.html` — landing, controls, onboarding, final overlay
- `src/engine.js` — the game: world, sprites, scenes, timeline
- `src/photo.jpg` — landing photo

Commit `index.html` together with the `src/` change; Pages serves it as-is.
