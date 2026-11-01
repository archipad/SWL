"""Check translation provenance and pixel preservation of every protected game value."""
import hashlib
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parent.parent
source_root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else root
catalog = json.loads((root/'src/data/workshopCardTranslations.json').read_text(encoding='utf-8'))['cards']
recipes = sorted((root/'scripts/data/workshop-translations').glob('*.json'))
assert len(recipes) == 8
for recipe_path in recipes:
    spec = json.loads(recipe_path.read_text(encoding='utf-8'))
    relative = spec['sourceFile']
    source = root/'public'/relative if relative.startswith('cards/') else root/'public/cards'/relative
    if not source.exists():
        source = source_root/'public'/relative if relative.startswith('cards/') else source_root/'public/cards'/relative
    if 'sourceTransform' in spec:
        transform = spec['sourceTransform']
        original = root/'public'/transform['originalFile']
        assert hashlib.sha256(original.read_bytes()).hexdigest() == transform['originalSha256']
        scaled = Image.open(original).convert('RGB').resize(tuple(spec['expectedSize']), Image.Resampling.LANCZOS)
        assert np.array_equal(np.asarray(scaled), np.asarray(Image.open(source).convert('RGB'))), 'Source upscaling changed'
    assert hashlib.sha256(source.read_bytes()).hexdigest() == spec['sourceSha256'], source
    entry = next(c for c in catalog if c['sourceSha256'] == spec['sourceSha256'])
    before = np.asarray(Image.open(source).convert('RGB'))
    after = np.asarray(Image.open(root/'public/cards'/entry['image']).convert('RGB'))
    assert before.shape == after.shape
    assert not np.array_equal(before, after), 'Translation must modify the front'
    for x0,y0,x1,y1 in spec['protectedZones']:
        assert np.array_equal(before[y0:y1,x0:x1], after[y0:y1,x0:x1]), (recipe_path.name, 'protected value changed')
    mask = np.zeros(before.shape[:2], dtype=bool)
    for key, box in spec['zones'].items():
        for bounds in [box, spec.get('eraseZones', {}).get(key, box)]:
            x0,y0,x1,y1 = bounds
            mask[max(0,y0-8):y1+8,max(0,x0-8):x1+8] = True
    assert np.array_equal(before[~mask], after[~mask]), (recipe_path.name, 'art outside text zones changed')
    print(recipe_path.name + ': source hash, dimensions, protected values and illustration OK')
print(str(len(recipes)) + ' local translations verified; no engine certification changed.')
