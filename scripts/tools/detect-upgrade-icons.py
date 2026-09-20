import json, os, sys
import cv2
import numpy as np

root = 'C:/Users/antoi/Desktop/SWL/public/cards/'
def load(name):
    im = cv2.imdecode(np.fromfile(root + name, dtype=np.uint8), cv2.IMREAD_GRAYSCALE)
    return im

tpl = {}
im = load('burst-of-speed.jpg'); tpl['X'] = im[1402:1472, 503:577]
im = load('force-reflexes.jpg'); tpl['FREE'] = im[1616:1690, 211:359]
im = load('sabines-grapple-line.jpg'); tpl['ACT'] = im[1454:1526, 232:380]

ups = json.load(open(os.environ['TEMP'] + '/ups.json'))
out = {}
for card, fname in ups:
    if not fname:
        continue
    try:
        img = load(fname)
    except Exception as e:
        out[card] = {'error': str(e)}
        continue
    if img is None:
        out[card] = {'error': 'unreadable'}
        continue
    h, w = img.shape
    res = {'file': fname, 'size': [w, h]}
    for key, t in tpl.items():
        best = (0, 0, None)
        for scale in np.arange(0.30, 1.35, 0.05):
            tw, th = int(t.shape[1] * scale), int(t.shape[0] * scale)
            if tw < 12 or th < 12 or tw >= w or th >= h:
                continue
            resized = cv2.resize(t, (tw, th), interpolation=cv2.INTER_AREA)
            m = cv2.matchTemplate(img, resized, cv2.TM_CCOEFF_NORMED)
            _, mx, _, loc = cv2.minMaxLoc(m)
            if mx > best[0]:
                best = (float(mx), float(scale), [int(loc[0]), int(loc[1])])
        res[key] = {'score': round(best[0], 3), 'scale': round(best[1], 2), 'at': best[2]}
    out[card] = res
json.dump(out, open(os.environ['TEMP'] + '/detect.json', 'w'), indent=1)
print(len(out))
