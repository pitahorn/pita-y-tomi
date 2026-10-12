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
