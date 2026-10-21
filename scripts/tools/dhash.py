"""Empreinte perceptuelle (dHash 16 × 16) de visuels de cartes, pour repérer les doublons même recompressés ou redimensionnés.
Usage : python -I dhash.py <liste.txt> ; sortie JSON {fichier: empreinte hexadécimale}."""
import json
import sys

from PIL import Image


def dhash(path, size=16):
    image = Image.open(path).convert("L")
    if image.width > image.height:  # Unité en paysage : comparée dans le même sens que les autres
        image = image.rotate(90, expand=True)
    image = image.resize((size + 1, size), Image.LANCZOS)
    pixels = list(image.getdata())
    bits = 0
    for row in range(size):
        for col in range(size):
            left, right = pixels[row * (size + 1) + col], pixels[row * (size + 1) + col + 1]
            bits = (bits << 1) | (1 if left > right else 0)
    return f"{bits:0{size * size // 4}x}"


files = [line.strip() for line in open(sys.argv[1], encoding="utf-8") if line.strip()]
json.dump({file: dhash(file) for file in files}, sys.stdout)
