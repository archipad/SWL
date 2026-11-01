"""Render bounded text zones using the existing local FR card renderer.
The explicit zones belong to a reviewed translation spec, not an OCR guess.
Usage: python scripts/render-workshop-translation.py spec.json source.jpg out.png report.json
"""
import importlib.util
import hashlib
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image

renderer_path = Path(__file__).resolve().parent / 'fr-cards' / 'render.py'
module_spec = importlib.util.spec_from_file_location('fr_card_render', renderer_path)
renderer = importlib.util.module_from_spec(module_spec)
module_spec.loader.exec_module(renderer)

spec_path, source_path, output_path, report_path = map(Path, sys.argv[1:5])
spec = json.loads(spec_path.read_text(encoding='utf-8'))
if hashlib.sha256(source_path.read_bytes()).hexdigest() != spec['sourceSha256']:
    raise ValueError('La source ne correspond pas à la traduction relue.')
rgb = np.asarray(Image.open(source_path).convert('RGB')).copy()
height, width = rgb.shape[:2]
original = rgb.copy()
if [width, height] != spec['expectedSize']:
    raise ValueError('Dimensions de la source inattendues.')
report = renderer.Report()
settings = [
 ('body', 'dark', renderer.DARK, 'serif', 34, 1.15),
 ('title', 'light', renderer.WHITE, 'title', 48, 1.0),
 ('weaponName', 'light', renderer.WHITE, 'band', 28, 1.0),
 ('weaponKeywords', 'light', renderer.WHITE, 'bandi', 27, 1.0),
]
for name, source_box in spec.get('sourceIcons', {}).items():
    x0,y0,x1,y1 = source_box
    if not (0 <= x0 < x1 <= width and 0 <= y0 < y1 <= height):
        raise ValueError('Icône source hors du visuel.')
    crop = renderer.gray(original[y0:y1,x0:x1])
    renderer._icons[name] = Image.fromarray(np.where(crop < 130, 255, 0).astype(np.uint8))
# Extra text zones let unit cards retain their original frame and every game value.
for extra in spec.get('extraTextZones', []):
    settings.append((extra['key'], extra['mode'], renderer.WHITE if extra['mode'] == 'light' else renderer.DARK, extra['style'], extra['size'], extra.get('leading', 1.0)))
for key, mode, color, style, size, leading in settings:
    if key not in spec['zones']:
        continue
    box = tuple(spec['zones'][key])
    if len(box) != 4 or not (0 <= box[0] < box[2] <= width and 0 <= box[1] < box[3] <= height):
        raise ValueError('Zone hors du visuel : ' + key)
    text = spec['fr'][key]
    if not isinstance(text, str) or not text or len(text) > 1800:
        raise ValueError('Texte invalide : ' + key)
    erase_box = tuple(spec.get('eraseZones', {}).get(key, box))
    if not (0 <= erase_box[0] < erase_box[2] <= width and 0 <= erase_box[1] < erase_box[3] <= height):
        raise ValueError('Zone d’effacement hors du visuel.')
    if key in spec.get('backgroundColors', {}):
        # Flat original dark bands: avoid JPEG halos left by inpainting tiny letters.
        x0,y0,x1,y1 = erase_box
        rgb[y0:y1,x0:x1] = spec['backgroundColors'][key]
    else:
        rgb = renderer.erase(rgb, erase_box, mode, spec.get('eraseThresholds', {}).get(key, 150))
    img = Image.fromarray(rgb)
    renderer.draw_text(img, box, text, size, report, key, style=style, color=color,
                       kwcolor=color, lh=leading, gap=0.20, align=spec.get('align', {}).get(key, 'center' if key in ('body', 'title') else 'left'))
    rgb = np.asarray(img).copy()
for x0,y0,x1,y1 in spec.get('protectedZones', []):
    if not (0 <= x0 < x1 <= width and 0 <= y0 < y1 <= height):
        raise ValueError('Zone protégée hors du visuel.')
    rgb[y0:y1,x0:x1] = original[y0:y1,x0:x1]
output_path.parent.mkdir(parents=True, exist_ok=True)
Image.fromarray(rgb).save(output_path)
report_path.write_text(json.dumps({'size':[width,height], 'problems':report.problems, 'zones':report.zones},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
if report.problems:
    raise ValueError('Rendu à revoir : ' + '; '.join(report.problems))
print('Rendu local terminé, sans débordement signalé.')
