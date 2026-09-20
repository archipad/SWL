import json, os
import cv2
import numpy as np

root = 'C:/Users/antoi/Desktop/SWL/public/cards/'
def load(name):
    return cv2.imdecode(np.fromfile(root + name, dtype=np.uint8), cv2.IMREAD_GRAYSCALE)

t = load('serenity.jpg')[1494:1553, 666:726]
ups = json.load(open(os.environ['TEMP'] + '/ups.json'))
old = json.load(open(os.environ['TEMP'] + '/detect.json'))
out = {}
for card, fname in ups:
    img = load(fname)
    h, w = img.shape
    base = w / 1452.0
    best = (0, 0)
    for f in (0.6,0.65,0.7,0.75,0.8,0.85,0.9,0.95,1.0,1.05,1.1,1.15,1.2,1.3):
        scale = base * f
        tw, th = int(t.shape[1] * scale), int(t.shape[0] * scale)
        if tw < 10 or th < 10 or tw >= w or th >= h:
            continue
        resized = cv2.resize(t, (tw, th), interpolation=cv2.INTER_AREA)
        m = cv2.matchTemplate(img, resized, cv2.TM_CCOEFF_NORMED)
        _, mx, _, _ = cv2.minMaxLoc(m)
        if mx > best[0]:
            best = (float(mx), scale)
    out[card] = round(best[0], 3)
json.dump(out, open(os.environ['TEMP'] + '/detect_exh2.json', 'w'))
hist = {}
for v in out.values():
    hist[int(v * 10) / 10] = hist.get(int(v * 10) / 10, 0) + 1
print(hist)
print([c + ':' + str(v) for c, v in out.items() if v >= 0.7])
