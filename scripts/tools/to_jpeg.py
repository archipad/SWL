"""Convertit un visuel extrait en JPEG RGB (les PDF fournissent du CMYK, mal rendu par les navigateurs).
Usage : python -I to_jpeg.py <source> <destination.jpg> [qualité] ; sortie JSON {"width","height","format"}."""
import json
import sys

from PIL import Image

source, target = sys.argv[1], sys.argv[2]
quality = int(sys.argv[3]) if len(sys.argv) > 3 else 90
image = Image.open(source).convert("RGB")
image.save(target, "JPEG", quality=quality, optimize=True, progressive=True)
json.dump({"width": image.width, "height": image.height, "format": "jpeg"}, sys.stdout)
