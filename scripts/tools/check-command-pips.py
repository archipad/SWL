"""Recompte les PIP imprimés (cercles clairs du cartouche en haut à gauche) sur chaque visuel de
public/commandcards/ et les compare à src/data/commandCards.ts (02/10/2026 : 6 cartes étaient
saisies avec un mauvais nombre de PIP, dont Maître du Mal). Usage : python scripts/tools/check-command-pips.py
Sortie : un écart par ligne ; code de sortie 1 s'il en reste. « Désolé pour le Désordre » est une carte
à 0 PIP sur le visuel (le catalogue n'accepte que 1-4) : écart connu, signalé à part."""
import os, re, sys
import numpy as np
from PIL import Image
from scipy import ndimage

KNOWN = {'desole-pour-le-desordre'}
src = open('src/data/commandCards.ts', encoding='utf8').read()
cards = re.findall(r"id: '([^']+)', name: '([^']+)', pip: (\d)", src)
gaps = []
for cid, name, pip in cards:
    path = f'public/commandcards/{cid}.jpg'
    if not os.path.exists(path):
        continue
    im = Image.open(path).convert('RGB')
    w, h = im.size
    box = np.asarray(im.crop((0, 0, int(w * 0.21), int(h * 0.13)))).astype(int)
    mask = (box[..., 0] > 200) & (box[..., 1] > 140) & (box[..., 2] > 110)
    lab, _ = ndimage.label(mask)
    count = sum(1 for o in ndimage.find_objects(lab) if 12 <= o[1].stop - o[1].start <= 26 and 12 <= o[0].stop - o[0].start <= 26)
    if count != int(pip):
        gaps.append((cid, name, int(pip), count))
for cid, name, pip, count in gaps:
    print(f"{'(connu) ' if cid in KNOWN else ''}{name} : {pip} PIP dans le catalogue, {count} sur le visuel")
print(f"{len(cards)} carte(s) contrôlée(s), {len([g for g in gaps if g[0] not in KNOWN])} écart(s).")
sys.exit(1 if any(g[0] not in KNOWN for g in gaps) else 0)
