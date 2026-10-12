#!/usr/bin/env python3
"""Inline the photo and the engine (with race.js) into src/page.html -> index.html (one self-contained file)."""
import base64, pathlib

src = pathlib.Path(__file__).parent / "src"
photo = "data:image/jpeg;base64," + base64.b64encode((src / "photo.jpg").read_bytes()).decode()
page = (src / "page.html").read_text()
engine = (src / "engine.js").read_text().replace("/*__RACE__*/", (src / "race.js").read_text())
html = page.replace("__PHOTO__", photo).replace("__ENGINE__", engine)
(src.parent / "index.html").write_text(html)
print(f"index.html: {len(html) // 1024} KB")

# /42k: same page, opening straight into the Desafío 42K menu
race = html.replace('<meta property="og:url" content="https://matri.pitahorn.com/">', '<meta property="og:url" content="https://matri.pitahorn.com/42k/">', 1)
race = race.replace('<meta property="og:title" content="Pita & Tomi · 9 de octubre de 2027">', '<meta property="og:title" content="Pita y Tomi en la Maratón 2026">', 1)
race = race.replace("<title>Pita & Tomi</title>", "<title>Pita y Tomi · 42K</title>\n<script>window.__START42K = true;</script>", 1)
assert race.count("__START42K = true") == 1 and "matri.pitahorn.com/42k/" in race
(src.parent / "42k").mkdir(exist_ok=True)
(src.parent / "42k" / "index.html").write_text(race)
print("42k/index.html written")
