"""Extraction carte par carte des PDF de cartes Star Wars: Legion (AMG en anglais, Asmodee/communauté en français).

Chaque carte de ces PDF est une image intégrée placée sur la page (grille 3 × 3). On ne découpe donc jamais « au jugé » :
on rend exactement l'emplacement de chaque image de carte (texte superposé compris, cas des traductions communautaires),
à la résolution native de l'image intégrée, puis on la remet dans son sens de lecture. Les petites images (icônes) et les
pages entières ne sont jamais retenues comme visuel de carte. Une même image placée plusieurs fois sur la page (mise en
page d'impression) n'est extraite qu'une fois.

Pour l'identification, chaque carte reçoit aussi un bandeau de titre agrandi (lu ensuite par l'OCR Windows) :
  - Unité (paysage) : bandeau supérieur ; seule la face « caractéristiques » (panneau clair, comme les visuels français
    du dépôt) est retenue, la face illustrée (coût, icônes) est signalée « face illustrée » ;
  - Amélioration (portrait) : bandeau inférieur ;
  - Commandement (portrait) : bandeau supérieur, à droite des pips.

Usage : python -I extract_pdf_cards.py <fichier.pdf> <dossier_sortie> [--kind unit|upgrade|command] [--rotate-units 90|-90] [--pages 1,2]
Sortie (stdout) : JSON {"pdf", "pages", "cards":[{"page","slot","file","titleFile","width","height","orientation","face","xref"}]}
"""
import json
import sys
from pathlib import Path

import pymupdf
from PIL import Image, ImageOps, ImageStat

CARD_MIN_POINTS = 90  # une carte fait 116 à 174 pt de large selon le PDF ; les icônes font ~5 pt


def card_placements(page):
    seen, xrefs = [], set()
    for info in page.get_image_info(xrefs=True):
        box = pymupdf.Rect(info["bbox"])
        if min(box.width, box.height) < CARD_MIN_POINTS:
            continue
        ratio = max(box.width, box.height) / min(box.width, box.height)
        if not 1.3 <= ratio <= 1.6:  # proportions d'une carte (~1,43), jamais une page entière
            continue
        if info.get("xref") and info["xref"] in xrefs:
            continue  # même image placée plusieurs fois sur la page
        if any(abs(box.x0 - other.x0) < 2 and abs(box.y0 - other.y0) < 2 for other, _ in seen):
            continue
        xrefs.add(info.get("xref"))
        seen.append((box, info))
    seen.sort(key=lambda item: (round(item[0].y0 / 20), item[0].x0))  # ordre de lecture
    return seen


def title_band(image, kind, alternate=False):
    """Bandeau de titre pour l'OCR ; la variante « alternate » (3×, binarisée) sert de seconde lecture."""
    w, h = image.size
    if kind == "command":  # Commandement : titre en haut, à droite des pips (le bas indique la faction ou le chef)
        band = image.crop((int(w * 0.19), 0, w, int(h * 0.068)))
        scale = 3
    elif w > h:  # Unité : ligne du nom (et du titre des personnages uniques), entre l'emblème et la vitesse
        band = image.crop((int(w * 0.13), 0, int(w * 0.89), int(h * 0.095)))
        scale = 3
    else:  # Amélioration / Commandement : titre en bas
        band = image.crop((int(w * 0.02), int(h * 0.86), int(w * 0.98), int(h * 0.99)))
        scale = 2
    if alternate:
        scale = max(scale, 3)
    band = ImageOps.autocontrast(band.convert("L").resize((band.width * scale, band.height * scale), Image.LANCZOS))
    # Titres blancs sur bandeau sombre : l'OCR lit mieux un texte sombre sur fond clair, avec une marge.
    if ImageStat.Stat(band).mean[0] < 128:
        band = ImageOps.invert(band)
    if alternate:
        band = band.point(lambda value: 255 if value > 140 else 0)
    return ImageOps.expand(band, border=24, fill=255)


def unit_face(image):
    """Face caractéristiques : panneau de texte clair à gauche ; face illustrée : illustration sombre."""
    w, h = image.size
    panel = image.crop((int(w * 0.05), int(h * 0.22), int(w * 0.55), int(h * 0.6))).convert("L")
    return "stats" if ImageStat.Stat(panel).mean[0] > 170 else "illustrated"


def main():
    pdf_path, out_dir = sys.argv[1], Path(sys.argv[2])
    pages = None
    if "--pages" in sys.argv:
        pages = {int(p) for p in sys.argv[sys.argv.index("--pages") + 1].split(",")}
    kind = sys.argv[sys.argv.index("--kind") + 1] if "--kind" in sys.argv else None
    rotated_units = int(sys.argv[sys.argv.index("--rotate-units") + 1]) if "--rotate-units" in sys.argv else 0
    out_dir.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open(pdf_path)
    cards = []
    for index in range(doc.page_count):
        if pages and index + 1 not in pages:
            continue
        page = doc[index]
        for slot, (box, info) in enumerate(card_placements(page), start=1):
            native_w, native_h = info["width"], info["height"]
            zoom = max(native_w, native_h) / max(box.width, box.height)  # résolution native de l'image intégrée
            pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), clip=box, alpha=False, colorspace=pymupdf.csRGB)
            image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            if kind == "unit" and rotated_units and image.height > image.width:
                # PDF « Battle Force » : la carte Unité (paysage) est dessinée de côté dans une image portrait.
                image = image.rotate(rotated_units, expand=True)
            elif native_w > native_h and box.height > box.width:
                # Carte Unité posée de travers dans la grille : on la remet à l'horizontale (sens donné par la matrice).
                transform = info.get("transform", (0, 0, 0, 0, 0, 0))
                image = image.rotate(90 if transform[1] > 0 else -90, expand=True)
            # Certains PDF étirent la carte sur la page : on rétablit les proportions de l'image intégrée.
            native_ratio = max(native_w, native_h) / min(native_w, native_h)
            ratio = max(image.width, image.height) / min(image.width, image.height)
            rescaled = abs(ratio - native_ratio) / native_ratio > 0.02
            if rescaled:
                size = (max(native_w, native_h), min(native_w, native_h)) if image.width > image.height else (min(native_w, native_h), max(native_w, native_h))
                image = image.resize(size, Image.LANCZOS)
            stem = f"p{index + 1:02d}-s{slot}"
            image.save(out_dir / f"{stem}.png")
            title_band(image, kind).save(out_dir / f"{stem}-title.png")
            title_band(image, kind, alternate=True).save(out_dir / f"{stem}-title-alt.png")
            cards.append({
                "page": index + 1,
                "slot": slot,
                "file": str(out_dir / f"{stem}.png"),
                "titleFile": str(out_dir / f"{stem}-title.png"),
                "titleFileAlt": str(out_dir / f"{stem}-title-alt.png"),
                "width": image.width,
                "height": image.height,
                "orientation": "landscape" if image.width > image.height else "portrait",
                "face": unit_face(image) if image.width > image.height else "single",
                "xref": info.get("xref"),
                "rescaled": rescaled,
            })
    json.dump({"pdf": pdf_path, "pages": doc.page_count, "cards": cards}, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
