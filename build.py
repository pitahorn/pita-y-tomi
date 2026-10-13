#!/usr/bin/env python3
"""Inline the photo and the engine (with race.js and stack.js) into src/page.html -> index.html (one self-contained file)."""
import base64, pathlib

src = pathlib.Path(__file__).parent / "src"
photo = "data:image/jpeg;base64," + base64.b64encode((src / "photo.jpg").read_bytes()).decode()
page = (src / "page.html").read_text()
engine = (src / "engine.js").read_text().replace("/*__RACE__*/", (src / "race.js").read_text()).replace("/*__STACK__*/", (src / "stack.js").read_text())
html = page.replace("__PHOTO__", photo).replace("__ENGINE__", engine)
(src.parent / "index.html").write_text(html)
print(f"index.html: {len(html) // 1024} KB")

# /42k and /puc: same page, opening straight into that game's menu
for route, title, og_title, og_desc, og_alt in [
    ("42k", "Pita y Tomi · 42K", "Pita y Tomi en la Maratón 2026", "Corre la Maratón de Santiago con Pita y Tomi 🏅", "Pita y Tomi corren la Maratón de Santiago"),
    ("puc", "Pita y Tomi · PUC", "Pita y Tomi en la PUC", "Equilibra los libros y titúlate con Pita y Tomi 🎓", "Pita equilibra libros frente a la Escuela de Ingeniería"),
]:
    out = html.replace('<meta property="og:url" content="https://matri.pitahorn.com/">', f'<meta property="og:url" content="https://matri.pitahorn.com/{route}/">', 1)
    out = out.replace('<meta property="og:title" content="Pita & Tomi · 9 de octubre de 2027">', f'<meta property="og:title" content="{og_title}">', 1)
    out = out.replace('<meta property="og:image" content="https://matri.pitahorn.com/og.jpg">', f'<meta property="og:image" content="https://matri.pitahorn.com/{route}/og.jpg">', 1)
    out = out.replace('<meta property="og:image:alt" content="Pita y Tomi en Bariloche · 9 de octubre de 2027">', f'<meta property="og:image:alt" content="{og_alt}">', 1)
    out = out.replace('<meta property="og:description" content="Save the date ♥ Recorre nuestra historia.">', f'<meta property="og:description" content="{og_desc}">', 1)
    out = out.replace('<meta name="description" content="Save the date: Pita & Tomi, 9 de octubre de 2027.">', f'<meta name="description" content="{og_desc}">', 1)
    out = out.replace("<title>Pita & Tomi</title>", f"<title>{title}</title>\n<script>window.__START = '{route}';</script>", 1)
    assert out.count("window.__START = ") == 1 and f"matri.pitahorn.com/{route}/og.jpg" in out and og_alt in out and out.count(og_desc) == 2
    (src.parent / route).mkdir(exist_ok=True)
    (src.parent / route / "index.html").write_text(out)
    print(f"{route}/index.html written")
