"""Fiche FR communautaire : efface le texte anglais d'un visuel Legion HQ et y superpose la traduction française.

Usage : python render.py <fiche.json> <visuel_hq> <sortie.png> [--rapport rapport.json]

Les zones de texte sont repérées automatiquement sur les gabarits Legion HQ (amélioration, commandement générique
ou de faction, unité) : aucune coordonnée n'est saisie carte par carte. Balisage des textes français :
  **mot-clé**  petites capitales grasses italiques      __Étape__  sérif gras
  {icone}      icône de la bibliothèque icons/ (ex. {suppr}, {incliner}, {portee-2}, {faction-empire})
  \\n           nouveau paragraphe
Le rapport liste ce qui n'a pas pu être placé proprement (texte trop long, zone introuvable) : la fiche passe
alors « à revoir ».
"""
import json, re, sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
FONTS = {
    'serif': 'crimson-pro-latin-400-normal.ttf', 'serif-b': 'crimson-pro-latin-600-normal.ttf',
    'serif-i': 'crimson-pro-latin-400-italic.ttf', 'kw': 'exo-2-latin-900-italic.ttf',
    'title': 'exo-2-latin-900-italic.ttf', 'band': 'exo-2-latin-800-normal.ttf', 'bandi': 'exo-2-latin-800-italic.ttf',
}
SMALLCAPS = {'kw', 'title', 'band', 'bandi'}
WHITE, DARK, GREY_KW, FLAVOR = (255, 255, 255), (22, 22, 22), (225, 225, 225), (80, 80, 80)
TOKEN = re.compile(r'(\*\*.+?\*\*|__.+?__|\{[a-z0-9-]+\})')
_fonts, _icons = {}, {}


class Report:
    def __init__(self):
        self.problems, self.zones = [], {}

    def problem(self, text):
        self.problems.append(text)


# ---------------------------------------------------------------- polices et icônes
def font(style, size):
    key = (style, round(size * 4))
    if key not in _fonts:
        _fonts[key] = ImageFont.truetype(str(HERE / 'fonts' / FONTS[style]), max(4, round(size)))
    return _fonts[key]


def range_icon(n):
    """Portée N : pastille octogonale foncée et chiffre en réserve (dessinée, comme sur les cartes)."""
    s = 128
    im = Image.new('L', (s, s), 0)
    d = ImageDraw.Draw(im)
    c = s * 0.29
    d.polygon([(c, 0), (s - c, 0), (s, c), (s, s - c), (s - c, s), (c, s), (0, s - c), (0, c)], fill=255)
    f = ImageFont.truetype(str(HERE / 'fonts' / FONTS['band']), 96)
    box = d.textbbox((0, 0), str(n), font=f)
    d.text(((s - (box[2] - box[0])) / 2 - box[0], (s - (box[3] - box[1])) / 2 - box[1]), str(n), font=f, fill=0)
    return im


def icon_mask(name):
    if name not in _icons:
        m = re.fullmatch(r'portee-([1-5])', name)
        path = HERE / 'icons' / f'{name}.png'
        if path.exists():
            _icons[name] = Image.open(path).convert('L')
        elif m:
            _icons[name] = range_icon(m.group(1))
        else:
            raise KeyError(name)
    return _icons[name]


def tinted(mask, color, height):
    w = max(1, round(mask.width * height / mask.height))
    alpha = mask.resize((w, max(1, round(height))), Image.LANCZOS)
    im = Image.new('RGBA', alpha.size, color + (0,))
    im.putalpha(alpha)
    return im


# ---------------------------------------------------------------- texte riche
def pieces_for(text, style, size, color):
    if style not in SMALLCAPS:
        return [('t', text, font(style, size), color)]
    out = []
    for ch in text:
        small = ch.isalpha() and ch.islower()
        f = font(style, size * (0.8 if small else 1.0))
        c = ch.upper() if small else ch
        if out and out[-1][2] is f:
            out[-1] = ('t', out[-1][1] + c, f, color)
        else:
            out.append(('t', c, f, color))
    return out


def parse(markup, base, size, color, kwcolor, report):
    paras = []
    for para in markup.split('\n'):
        words, cur = [], []
        for part in TOKEN.split(para):
            if not part:
                continue
            if part.startswith('**'):
                style, txt, col = 'kw', part[2:-2], kwcolor
            elif part.startswith('__'):
                style, txt, col = 'serif-b', part[2:-2], color
            else:
                style, txt, col = base, part, color
            for ch in re.split(r'( |\{[a-z0-9-]+\})', txt):
                if ch == ' ':
                    if cur:
                        words.append(cur); cur = []
                elif ch.startswith('{'):
                    try:
                        cur.append(('i', icon_mask(ch[1:-1]), size, col))
                    except KeyError:
                        report.problem(f'icône inconnue {ch}')
                elif ch:
                    cur.extend(pieces_for(ch, style, size, col))
        if cur:
            words.append(cur)
        paras.append(words)
    return paras


def piece_w(p):
    return p[1].width * (p[2] * 0.95 / p[1].height) if p[0] == 'i' else p[2].getlength(p[1])


def layout(paras, width, space):
    lines = []
    for pi, words in enumerate(paras):
        line, lw = [], 0
        for w in words:
            ww = sum(piece_w(p) for p in w)
            add = ww + (space if line else 0)
            if line and lw + add > width:
                lines.append((line, lw, pi)); line, lw = [w], ww
            else:
                line.append(w); lw += add
        lines.append((line, lw, pi))
    return lines


def draw_text(img, box, text, size, report, label, style='serif', color=DARK, kwcolor=None, align='center',
              lh=1.25, gap=0.3, ls=0.0, min_ratio=0.68, wrap=True):
    """Écrit un texte balisé dans la boîte, en réduisant la police jusqu'à ce qu'il tienne."""
    if not text:
        return
    x0, y0, x1, y1 = box
    W, H = x1 - x0, y1 - y0
    kwcolor = kwcolor or color
    start = size
    while True:
        paras = parse(text, style, size, color, kwcolor, report)
        space = font(style, size).getlength(' ') + ls * size
        lines = layout(paras, W if wrap else 1e9, space)
        n_par = len({pi for _, _, pi in lines})
        total = len(lines) * size * lh + (n_par - 1) * size * gap
        widest = max(lw for _, lw, _ in lines)
        if (total <= H and widest <= W) or size <= start * (min_ratio if wrap else 0.5):
            break
        size *= 0.97
    if total > H + 1 or widest > W + 1:
        report.problem(f'{label} : texte trop long pour la zone')
    draw = ImageDraw.Draw(img)
    ref = font(style if style in SMALLCAPS else 'band', size)
    cap = ref.getbbox('H')
    cap_h = cap[3] - cap[1]
    asc = font(style, size).getmetrics()[0]
    y = y0 + (H - total) / 2
    prev = None
    for line, lw, pi in lines:
        if prev is not None and pi != prev:
            y += size * gap
        prev = pi
        x = x0 + ((W - lw) / 2 if align == 'center' else 0)
        baseline = y + (size * lh - size) / 2 + asc
        for wi, w in enumerate(line):
            if wi:
                x += space
            for p in w:
                if p[0] == 'i':
                    icon = tinted(p[1], p[3], p[2] * 0.95)
                    img.paste(icon, (round(x), round(baseline - cap_h / 2 - icon.height / 2)), icon)
                    x += icon.width
                else:
                    f = p[2]
                    draw.text((x, baseline - f.getmetrics()[0]), p[1], font=f, fill=p[3])
                    x += f.getlength(p[1]) + ls * size * len(p[1])
        y += size * lh
    report.zones[label] = [round(v) for v in box] + [round(size, 1)]


# ---------------------------------------------------------------- détection et effacement
def gray(rgb):
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(np.int16)


def runs(flags, gap=1, base=0):
    out, s, last = [], None, None
    for i, on in enumerate(flags):
        if on:
            if s is None:
                s = i
            last = i
        elif s is not None and i - last > gap:
            out.append((s + base, last + base)); s = None
    if s is not None:
        out.append((s + base, last + base))
    return out


def text_lines(g, box, mode, thr, min_px=2, gap=1):
    """Lignes de texte (y0, y1, x0, x1) d'une zone : pixels foncés (« dark ») ou clairs (« light »)."""
    x0, y0, x1, y1 = box
    region = g[y0:y1, x0:x1]
    mask = region < thr if mode == 'dark' else region > thr
    lines = []
    for a, b in runs(mask.sum(1) >= min_px, gap, y0):
        cols = np.nonzero(mask[a - y0:b - y0 + 1].sum(0))[0]
        lines.append((a, b, x0 + int(cols.min()), x0 + int(cols.max())))
    return lines


def erase(rgb, box, mode, thr, grow=2):
    x0, y0, x1, y1 = [int(round(v)) for v in box]
    g = gray(rgb)
    mask = np.zeros(g.shape, np.uint8)
    region = g[y0:y1, x0:x1]
    mask[y0:y1, x0:x1] = ((region < thr) if mode == 'dark' else (region > thr)).astype(np.uint8) * 255
    if grow:
        mask = cv2.dilate(mask, np.ones((3, 3), np.uint8), iterations=grow)
    return cv2.inpaint(rgb, mask, 5, cv2.INPAINT_TELEA)


def saturated(rgb, y, x0, x1):
    row = rgb[y, x0:x1].astype(np.int16)
    return np.nonzero((row.max(1) - row.min(1)) > 70)[0]


def resize_to(rgb, width):
    if rgb.shape[1] == width:
        return rgb
    h = round(rgb.shape[0] * width / rgb.shape[1])
    return cv2.resize(rgb, (width, h), interpolation=cv2.INTER_CUBIC if width > rgb.shape[1] else cv2.INTER_AREA)


# ---------------------------------------------------------------- gabarits
def weapon_bars(g, x0, x1, y0, y1, min_h):
    """Cadres d'arme : lignes nettement plus sombres que le panneau blanc (les filets clairs sont enjambés)."""
    region = g[y0:y1, x0:x1]
    dark = region.mean(1) < 175
    # Un cadre d'arme est noir à près d'un tiers au moins et commence par un filet clair sur presque toute sa largeur ;
    # le bas d'une illustration sombre ne remplit pas ces deux conditions.
    def framed(a):
        rows = g[max(0, a - 6):a + 11, x0:x1]
        return bool(((rows > 170).mean(1) > 0.6).any())
    return [(a, b) for a, b in runs(dark, 4, y0)
            if b - a >= min_h and (region[a - y0:b - y0 + 1] < 70).mean() >= 0.3 and framed(a)]


def bar_lines(g, box, thr, min_h=5):
    """Lignes de texte clair sur fond foncé, sans les filets de bordure ni le panneau blanc."""
    x0, y0, x1, y1 = [int(v) for v in box]
    region = g[y0:y1, x0:x1]
    mask = region > thr
    mask[(mask.mean(1) > 0.6) | (region.mean(1) > 175)] = False
    out = []
    for a, b in runs(mask.sum(1) >= 3, 1, y0):
        cols = np.nonzero(mask[a - y0:b - y0 + 1].sum(0))[0]
        if b - a < min_h or cols.max() - cols.min() < 20:  # montants verticaux du cadre
            continue
        out.append((a, b, x0 + int(cols.min()), x0 + int(cols.max())))
    return out


def draw_weapons(rgb, bars, weapons, x_left, x_right, report, min_name=12, max_size=40):
    """Nom (blanc) et mots-clés (gris, italique) de chaque bandeau d'arme, jusqu'à la pastille de portée."""
    for i, (top, bottom) in enumerate(bars):
        if i >= len(weapons):
            report.problem(f'arme {i + 1} présente sur la carte mais absente de la fiche')
            continue
        g = gray(rgb)
        names = bar_lines(g, (x_left, top, x_right, bottom), 175, min_name)
        if not names:
            report.problem(f'arme {i + 1} : nom introuvable sur la carte')
            continue
        a, b, lx, rx = names[0]
        stop = saturated(rgb, (a + b) // 2, lx, int(x_right + (x_right - x_left) * 0.5))
        right = lx + int(stop[0]) - 6 if len(stop) else int(x_right)
        # Ligne de mots-clés : nettement sous le nom, d'une hauteur comparable (pas un jambage de lettre).
        kws = [l for l in bar_lines(g, (x_left, b + 3, x_right + 100, bottom), 120)  # la ligne passe sous la pastille de portée
               if l[0] > b + (b - a) * 0.25 and 0.4 * (b - a) <= l[1] - l[0] <= (b - a) * 1.15]
        rgb[:] = erase(rgb, (lx - 3, a - 3, min(rx + 4, right + 2), b + 4), 'light', 110)
        if kws and weapons[i].get('keywords') is not None:
            for ka, kb, klx, krx in kws:  # les mots-clés d'une arme peuvent tenir sur deux lignes
                rgb[:] = erase(rgb, (klx - 3, ka - 3, krx + 4, kb + 4), 'light', 110)
        img = Image.fromarray(rgb)
        draw_text(img, (lx, a - 6, right, b + 7), weapons[i].get('name', ''), min(max_size, (b - a) * 1.32), report,
                  f'arme {i + 1} : nom', style='band', color=WHITE, align='left', lh=1.0, wrap=False)
        if kws and weapons[i].get('keywords') is not None:
            ka, kb, klx, _ = kws[0]
            draw_text(img, (klx, ka - 5, right, kws[-1][1] + 6), weapons[i]['keywords'], min(max_size * 0.8, (kb - ka) * 1.35), report,
                      f'arme {i + 1} : mots-clés', style='bandi', color=GREY_KW, align='left', lh=1.0, wrap=len(kws) > 1)
        elif weapons[i].get('keywords'):
            report.problem(f'arme {i + 1} : ligne de mots-clés introuvable sur la carte')
        rgb[:] = np.asarray(img)
    if len(weapons) > len(bars):
        report.problem('la fiche décrit plus d’armes que la carte n’en montre')


def residual_text(g, top):
    """Lignes de texte (larges et denses, sur fond nettement blanc) dans les 150 px au-dessus du bloc effacé."""
    return [l for l in text_lines(g, (70, max(300, top - 150), 655, max(301, top - 2)), 'dark', 110, 3)
            if 10 <= l[1] - l[0] <= 50 and (g[l[0]:l[1] + 1, 70:655] > 170).mean() >= 0.55
            and l[3] - l[2] >= 100 and (g[l[0]:l[1] + 1, l[2]:l[3] + 1] < 110).sum() >= 150]


def upgrade(rgb, fr, report):
    rgb = resize_to(rgb, 725)
    g = gray(rgb)
    H = rgb.shape[0]
    bars = weapon_bars(g, 70, 655, 300, min(905, H - 120), 30)
    bottom = (bars[0][0] - 8) if bars else 898
    # Bloc de texte : lignes foncées SUR FOND BLANC (la case peut commencer haut si l'illustration est courte),
    # regroupées en remontant depuis le bas tant que l'écart reste celui d'un texte.
    def on_white(line):
        return (g[line[0]:line[1] + 1, 70:655] > 170).mean() >= 0.55
    lines = [l for l in text_lines(g, (70, 300, 655, bottom), 'dark', 110, 3) if 10 <= l[1] - l[0] <= 50 and on_white(l)]
    block = []
    for line in reversed(lines):
        if block and block[0][0] - line[1] > 45:
            break
        block.insert(0, line)
    if fr.get('body'):
        if not block:
            report.problem('texte de règle introuvable sur le visuel')
            top = bottom - 120
        else:
            top = block[0][0] - 6
            rgb = erase(rgb, (62, top, 664, bottom + 4), 'dark', 150)
            # Contrôle avant d'écrire le français : aucune ligne de texte ne doit rester sur fond blanc au-dessus du bloc.
            if residual_text(gray(rgb), top):
                report.problem('texte anglais possiblement resté au-dessus du bloc traduit')
        # La zone française peut remonter tant que le fond reste blanc (traduction plus longue que l'anglais).
        white_top = top
        while white_top > 300 and g[white_top - 1, 80:640].mean() > 212:
            white_top -= 1
        pitch = np.median([b2[0] - b1[0] for b1, b2 in zip(block, block[1:])]) if len(block) > 1 else 46
        img = Image.fromarray(rgb)
        draw_text(img, (68, max(white_top, top - 70), 657, bottom + 2), fr['body'], min(36, pitch * 0.74), report,
                  'texte', style='serif', kwcolor=DARK, lh=1.3, gap=0.3)
        rgb = np.asarray(img).copy()
    if bars:
        draw_weapons(rgb, bars, fr.get('weapons', []), 66, 400, report)
    elif fr.get('weapons'):
        report.problem('arme décrite dans la fiche mais aucun bandeau d’arme sur la carte')
    title = text_lines(gray(rgb), (60, 930, 668, min(H - 2, 1036)), 'light', 140, 2)
    if fr.get('title'):
        if not title:
            report.problem('titre introuvable sur le visuel')
        rgb = erase(rgb, (60, 930, 668, min(H - 2, 1036)), 'light', 140)
        heights = [b - a for a, b, _, _ in title] or [34]
        img = Image.fromarray(rgb)
        draw_text(img, (55, 928, 672, min(H, 1038)), fr['title'], min(52, max(heights) * 1.45), report, 'titre',
                  style='title', color=WHITE, lh=1.0, gap=0.02)
        rgb = np.asarray(img).copy()
    return rgb


def find_band(g, footer_top):
    """Bandeau d'effectif : bande noire (aux bouts arrondis) sur presque toute la largeur, avec du texte clair centré,
    juste au-dessus du texte de la carte (sa hauteur varie avec l'illustration). On le repère à ses bords haut et bas,
    noirs d'un bout à l'autre, que le texte du bandeau ne touche jamais ; le cadre d'une arme n'est pas suivi de texte clair."""
    H = g.shape[0]
    solid = (g[:, 30:704] < 70).mean(1) > 0.95
    edges = runs(solid[int(H * 0.25):footer_top], 1, int(H * 0.25))
    # Un texte court (« IG-11 ») laisse des lignes entièrement noires au milieu du bandeau : on essaie toutes les paires de bords
    # et l'on garde la plus serrée (une paire plus large engloberait le filet qui borde l'illustration).
    found = []
    for (a, a2), (b1, b) in ((e1, e2) for i, e1 in enumerate(edges) for e2 in edges[i + 1:]):
        if not 4 <= b1 - a2 <= 60 or not 22 <= b - a <= 70:
            continue
        if g[a - 12:a - 4, 60:660].mean() < 150:
            continue  # le bandeau est détaché de l'illustration par une bande claire ; sinon on est au milieu du bandeau
        inner = (g[a2 + 1:b1, 30:704] < 90).mean(1)
        if (inner > 0.4).mean() < 0.8:
            continue
        light = g[a2 + 1:b1, 60:674] > 200
        cols = np.nonzero(light.sum(0) >= 2)[0]
        if not len(cols) or not 0.3 < (cols.min() + cols.max()) / 2 / 614 < 0.7:
            continue  # pas de texte centré : ce n'est pas le bandeau
        if g[b + 4:b + 40, 60:660].mean() > 175:
            found.append((a, b))
    return min(found, key=lambda ab: ab[1] - ab[0]) if found else None


def separators(g, top, bottom):
    """Filets de séparation du texte (ligne fine foncée sur la largeur du cadre)."""
    frac = (g[:, 70:660] < 140).mean(1)
    rows = frac[top:bottom] > 0.95  # un filet est continu ; une ligne de texte en gras ne l'est jamais
    return [(a, b) for a, b in runs(rows, 0, top)
            if b - a <= 4 and frac[a - 3] < 0.3 and frac[min(b + 3, len(frac) - 1)] < 0.3]


def command(rgb, fr, report):
    rgb = resize_to(rgb, 734)
    g = gray(rgb)
    H = rgb.shape[0]
    generic = g[45:75, 300:600].mean() > 150  # bandeau de titre clair = carte générique du livret de règles
    report.zones['gabarit'] = 'commandement générique' if generic else 'commandement de faction'
    if generic:
        ops = [
            ('title', (120, 40, 725, 82), 'dark', 100, (110, 40, 729, 82), 38, 'band', DARK, 'center', None),
            ('units', (150, 768, 590, 802), 'dark', 100, (150, 768, 590, 802), 33, 'band', DARK, 'center', None),
            ('body', (58, 866, 680, 962), 'dark', 165, (66, 864, 674, 966), 34, 'serif-i', FLAVOR, 'center', 1.25),
        ]
        for key, erase_box, mode, thr, box, size, style, color, align, lh in ops:
            if not fr.get(key):
                continue
            rgb = erase(rgb, erase_box, mode, thr)
            img = Image.fromarray(rgb)
            draw_text(img, box, fr[key], size, report, key, style=style, color=color, kwcolor=color, align=align, lh=lh or 1.0)
            rgb = np.asarray(img).copy()
        return rgb
    footer_rows = [y for y in range(int(H * 0.88), H - 4) if (g[y, 40:690] < 70).mean() > 0.8 and (g[y, 694:714] < 70).mean() > 0.8]
    footer_top = footer_rows[0] if footer_rows else H - 60
    band = find_band(g, footer_top)
    if not band and not fr.get('units'):
        # Carte sans bandeau d'effectif (ex. jouée depuis la main) : le texte commence sous le filet qui borde l'illustration.
        solid = (g[:, 30:704] < 70).mean(1) > 0.95
        edges = [(a, b) for a, b in runs(solid[int(H * 0.3):footer_top], 1, int(H * 0.3)) if g[b + 4:b + 40, 60:660].mean() > 175]
        band = (edges[0][1] - 10, edges[0][1]) if edges else None
        report.zones['effectif'] = 'aucun'
    if not band:
        report.problem('bandeau d’effectif introuvable')
        band = (footer_top - 200, footer_top - 170)
    band_top, band_bottom = band
    body_top = band_bottom + 10
    # Certains gabarits tirent un filet sur toute la largeur juste sous le bandeau : ce n'est pas un séparateur de texte.
    for y in range(band_bottom + 1, band_bottom + 26):
        if (g[y, 70:660] < 140).mean() > 0.6:
            body_top = max(body_top, y + 6)
    bars = weapon_bars(g, 70, 655, body_top, footer_top - 4, 30)
    text_bottom = (bars[0][0] - 8) if bars else footer_top - 6
    seps = separators(g, body_top, text_bottom)
    # Titre (une ou deux lignes), effectif, pied de carte : texte clair sur fond foncé.
    if fr.get('title'):
        rgb = erase(rgb, (160, 6, 730, 67), 'light', 150)
    if fr.get('units'):
        rgb = erase(rgb, (30, band_top + 2, 704, band_bottom - 2), 'light', 150)
    if fr.get('footer'):
        rgb = erase(rgb, (14, footer_top + 4, 720, min(H - 4, footer_top + 56)), 'light', 150)
    # Texte : on efface tout le foncé sauf les filets de séparation, conservés tels quels.
    if fr.get('body'):
        g0 = gray(rgb)
        mask = np.zeros(g0.shape, np.uint8)
        region = g0[body_top:text_bottom, 40:704]
        mask[body_top:text_bottom, 40:704] = (region < 130).astype(np.uint8) * 255
        mask = cv2.dilate(mask, np.ones((3, 3), np.uint8), iterations=2)
        for a, b in seps:
            mask[a - 1:b + 2, :] = 0
        rgb = cv2.inpaint(rgb, mask, 5, cv2.INPAINT_TELEA)
    img = Image.fromarray(rgb)
    if fr.get('title'):
        draw_text(img, (165, 8, 712, 60), fr['title'], 34, report, 'titre', style='band', color=WHITE, align='left', lh=1.0, gap=0.0)
    if fr.get('units'):
        draw_text(img, (40, band_top, 694, band_bottom), fr['units'], (band_bottom - band_top) * 0.82, report, 'effectif',
                  style='band', color=WHITE, align='center', lh=1.0, wrap=False)
    if fr.get('footer'):
        draw_text(img, (40, footer_top + 2, 690, min(H - 2, footer_top + 58)), fr['footer'], 40, report, 'pied de carte',
                  style='band', color=WHITE, align='center', lh=1.0, wrap=False)
    if fr.get('body'):
        segments = [s.strip('\n') for s in fr['body'].split('\n---\n')]
        bounds = [body_top] + [x for a, b in seps for x in (a - 6, b + 8)] + [text_bottom]
        zones = [(bounds[i], bounds[i + 1]) for i in range(0, len(bounds), 2)]
        if len(segments) != len(zones):
            report.problem(f'texte : {len(segments)} partie(s) séparée(s) par « --- » pour {len(zones)} zone(s) sur la carte')
            segments = ['\n'.join(segments)] if len(zones) == 1 else segments + [''] * (len(zones) - len(segments))
        for i, (top, bottom) in enumerate(zones):
            if i < len(segments) and segments[i]:
                draw_text(img, (50, top, 698, bottom), segments[i], 33, report, f'texte {i + 1}', style='serif', color=DARK,
                          kwcolor=DARK, align='left', lh=1.22, gap=0.22)
    rgb = np.asarray(img).copy()
    if bars:
        draw_weapons(rgb, bars, fr.get('weapons') or [], 66, 400, report)
    elif fr.get('weapons'):
        report.problem('arme décrite dans la fiche mais aucun cadre d’arme sur la carte')
    return rgb


def unit(rgb, fr, report):
    rgb = resize_to(rgb, 1048)
    g = gray(rgb)
    H, W = g.shape
    # Maquette officielle : nom sur le bandeau du haut, puis sous-titre éventuel et type d'unité sous le nom.
    names = [l for l in text_lines(g, (int(W * 0.15), 0, int(W * 0.82), int(H * 0.115)), 'light', 160, 2) if l[1] - l[0] >= H * 0.02]
    name = max(names, key=lambda l: l[1] - l[0]) if names else None
    below = [l for l in bar_lines(g, (int(W * 0.15), (name[1] + 2) if name else int(H * 0.06), int(W * 0.60), int(H * 0.20)),
                                  150, H * 0.008)]
    sub = kind = None
    if len(below) >= 2:
        sub, kind = below[0], below[-1]
    elif below:
        if (below[0][0] + below[0][1]) / 2 > H * 0.105:
            kind = below[0]
        else:
            sub = below[0]
    bars = weapon_bars(g, int(W * 0.03), int(W * 0.44), int(H * 0.55), int(H * 0.99), H * 0.045)
    kw_bottom = (bars[0][0] - 6) if bars else int(H * 0.6)
    kw = [l for l in text_lines(g, (int(W * 0.02), int(H * 0.17), int(W * 0.60), kw_bottom), 'dark', 185, 2) if l[1] - l[0] >= H * 0.012]
    header = [('name', name, 1.32, 0.0, int(W * 0.84), 160), ('subtitle', sub, 1.4, 0.04, int(W * 0.66), 150),
              ('type', kind, 1.45, 0.07, int(W * 0.62), 150)]
    # Tout est effacé avant d'écrire : une zone effacée ne mord jamais sur un texte déjà réécrit.
    for key, line, _, _, _, thr in header:
        if fr.get(key) and line:
            rgb = erase(rgb, (line[2] - 4, line[0] - 3, line[3] + 5, line[1] + 4), 'light', thr)
        elif fr.get(key):
            report.problem(f'{key} : ligne introuvable sur le visuel')
    lines_fr = fr.get('keywords') or []
    if lines_fr and kw:
        for a, b, lx, rx in kw:
            rgb = erase(rgb, (lx - 4, a - 4, rx + 5, b + 5), 'dark', 185)
    elif lines_fr:
        report.problem('mots-clés de l’unité introuvables sur le visuel')
    img = Image.fromarray(rgb)
    for key, line, size_k, ls, right, _ in header:
        if fr.get(key) and line:
            a, b, lx, _ = line
            draw_text(img, (lx, a - 6, right, b + 7), fr[key], (b - a) * size_k, report, key, style='band', color=WHITE,
                      align='left', lh=1.0, ls=ls, wrap=False)
    if lines_fr and kw:
        top, left = kw[0][0], min(l[2] for l in kw)
        cap = float(np.median([l[1] - l[0] for l in kw]))
        pitch = float(np.median([b[0] - a[0] for a, b in zip(kw, kw[1:])])) if len(kw) > 1 else cap * 2.2
        for i, text in enumerate(lines_fr):
            y = top + i * pitch
            draw_text(img, (left, y - cap * 0.35, int(W * 0.62), y + cap * 1.35), text, cap * 1.42, report,
                      f'mot-clé {i + 1}', style='kw', color=DARK, align='left', lh=1.0)
        if top + len(lines_fr) * pitch > kw_bottom + pitch * 0.5:
            report.problem('mots-clés : plus de lignes que la place disponible')
    rgb = np.asarray(img).copy()
    if bars or fr.get('weapons'):
        draw_weapons(rgb, bars, fr.get('weapons') or [], int(W * 0.04), int(W * 0.37), report, H * 0.02, H * 0.045)
    return rgb


def main(argv):
    spec_path, image_path, out_path = map(Path, argv[1:4])
    report_path = Path(argv[argv.index('--rapport') + 1]) if '--rapport' in argv else None
    spec = json.loads(spec_path.read_text(encoding='utf-8'))
    rgb = np.asarray(Image.open(image_path).convert('RGB')).copy()
    report = Report()
    render = {'upgrade': upgrade, 'command': command, 'unit': unit}[spec['kind']]
    result = render(rgb, spec.get('fr', {}), report)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if out_path.suffix.lower() in ('.jpg', '.jpeg'):
        Image.fromarray(result).save(out_path, 'JPEG', quality=92, optimize=True)
    else:
        Image.fromarray(result).save(out_path)
    data = {'card': spec.get('englishName'), 'kind': spec['kind'], 'problems': report.problems, 'zones': report.zones,
            'size': [int(result.shape[1]), int(result.shape[0])]}
    if report_path:
        report_path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(json.dumps(data, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
