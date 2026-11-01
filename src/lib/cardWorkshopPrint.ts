import { duplexSheets, keywordOnlyRules, type SheetItem, type WorkshopCard, type WorkshopOrientation, type WorkshopRule } from './cardWorkshop';
export type WorkshopPrintFormat = 'standard' | 'large' | 'full';

export const WORKSHOP_PRINT_CSS = `
@page { size:A4 portrait; margin:0; }
@page wide { size:A4 landscape; margin:0; }
*{box-sizing:border-box} body{margin:0;background:#e6e7e9;color:#17252d;font-family:Arial,sans-serif}
.sheet{width:210mm;height:297mm;background:white;position:relative;break-after:page;page-break-after:always;margin:0 auto 8mm;overflow:visible}
.sheet:last-child{break-after:auto;page-break-after:auto}
.sheet-grid{position:absolute;inset:9mm;display:grid;justify-content:space-between;align-content:space-between;grid-template-columns:repeat(3,62mm);grid-template-rows:repeat(3,88mm)}
.sheet.landscape .sheet-grid{grid-template-columns:repeat(2,88mm);grid-template-rows:repeat(4,62mm)}
.physical-card{width:62mm;height:88mm;outline:.2mm dashed #999;position:relative;background:#fff}
.landscape .physical-card{width:88mm;height:62mm}
.sheet.large .sheet-grid{inset:7mm;display:flex;align-items:center;justify-content:center}
.large .physical-card{width:138mm;height:195mm}
.large.landscape .physical-card{width:195mm;height:138mm}
.sheet.full .sheet-grid{inset:7mm;display:flex;align-items:center;justify-content:center}
.full .physical-card{width:195mm;height:282mm}
.full.landscape .physical-card{width:282mm;height:195mm}
.sheet.full.landscape{width:297mm;height:210mm;page:wide}
.physical-card.front img{width:100%;height:100%;object-fit:contain;display:block}
.card-caption{position:absolute;bottom:.3mm;left:1mm;right:1mm;font-size:6pt;background:white;color:#222;text-align:center}
.workshop-back{padding:2.5mm;display:flex;flex-direction:column;gap:0;font-size:8.5pt;line-height:1.22;color:#14232b;background:white}
.workshop-back h2{font-size:10pt;line-height:1.1;margin:0;overflow-wrap:anywhere;border-bottom:.4mm solid #172d3d;padding-bottom:1mm}
.workshop-back h2 small{font-size:7pt;font-weight:normal;display:block;margin-top:1mm}
.back-body{flex:1;min-height:0}
.rule-block{margin-bottom:1.5mm;overflow-wrap:anywhere;white-space:pre-wrap}
.rule-block strong{display:block;font-size:1em}.rule-block em{display:block;font-size:7pt;font-style:normal;color:#354e5a;margin:.5mm 0}
.rule-block p{margin:0}.rule-block small{font-size:6.5pt;display:block;margin-top:.5mm;color:#354e5a}
.back-footer{font-size:6pt;line-height:1.15;border-top:.2mm solid #888;padding-top:1mm;overflow-wrap:anywhere}
.sheet-label{position:absolute;bottom:3mm;left:9mm;right:9mm;font-size:7pt;color:#444;text-align:center}
.calibration{display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:20pt;text-align:center}
.calibration small{font-size:9pt;display:block;margin-top:8mm}
.measurement{position:fixed;left:-20000px;top:0;visibility:hidden}
.instructions{max-width:800px;margin:20px auto;padding:16px;background:white;font-size:14px;line-height:1.5}
@media print{body{background:white}.sheet{margin:0}.instructions{display:none}}
`;

export const escapeWorkshopHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const e = escapeWorkshopHtml;
export const keywordBackHtml = (rules: WorkshopRule[]) => keywordOnlyRules(rules).map((rule) => `<section class="rule-block"><strong>${e(rule.title)}</strong><p>${e(rule.text)}</p></section>`).join('');
const backHtml = (item: SheetItem) => `<div class="back-body" style="font-size:${item.fontSizePt ?? 8.5}pt">${keywordBackHtml(item.rules)}</div>`;

export function fitSingleBack(doc: Document, card: WorkshopCard, orientation: WorkshopOrientation, format: WorkshopPrintFormat = 'standard'): number {
  const host = doc.createElement('div');
  host.className = `measurement ${orientation} ${format}`;
  const box = doc.createElement('article'); box.className = 'physical-card workshop-back';
  box.innerHTML = backHtml({ cardId: card.id, copy: 0, name: card.name, rules: card.rules, provenance: card.provenance, warnings: card.warnings });
  host.append(box); doc.body.append(host);
  const body = box.querySelector<HTMLElement>('.back-body')!;
  try {
    for (const size of [9, 8.5, 8, 7.5]) {
      body.style.fontSize = `${size}pt`;
      if (body.clientHeight > 10 && body.scrollHeight <= body.clientHeight + 1 && box.scrollHeight <= box.clientHeight + 1) return size;
    }
    throw new Error(`« ${card.name} » : les définitions complètes ne tiennent pas sur un seul verso lisible. ${format === 'standard' ? 'Choisissez le format agrandi ou le grand format A4.' : format === 'large' ? 'Choisissez le grand format A4.' : 'Impression bloquée.'} Aucun texte n’est coupé et aucune carte supplémentaire n’est créée.`);
  } finally { host.remove(); }
}

async function loadPrintImage(src: string, win: Window): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const image = new Image();
    const timer = win.setTimeout(() => reject(new Error('Chargement du recto trop long. Réessayez après avoir ouvert la carte.')), 12000);
    image.onload = () => { win.clearTimeout(timer); image.naturalWidth > 0 ? resolve(image) : reject(new Error('Recto illisible.')); };
    image.onerror = () => { win.clearTimeout(timer); reject(new Error('Un recto est introuvable : impression annulée pour éviter une carte blanche.')); };
    image.src = src;
  });
}

/** Called with a window opened synchronously by the user's click (works with popup protection). */
export async function prepareWorkshopPrint(win: Window, cards: WorkshopCard[], quantities: Record<string, number>, format: WorkshopPrintFormat = 'standard'): Promise<{ physicalCards: number; pages: number }> {
  const doc = win.document;
  doc.open(); doc.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Cartes Legion FR · recto verso</title><style>${WORKSHOP_PRINT_CSS}</style></head><body><div class="instructions">Préparation des cartes…</div></body></html>`); doc.close();
  const group: Record<WorkshopOrientation, SheetItem[]> = { portrait: [], landscape: [] };
  let count = 0;
  for (const card of cards) {
    const qty = quantities[card.id] ?? 0;
    if (!qty) continue;
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) throw new Error('Quantité attendue : de 1 à 99.');
    if (!card.image) throw new Error(`Recto manquant : ${card.name}.`);
    const image = await loadPrintImage(new URL(card.image, window.location.href).href, win);
    const orientation = image.naturalWidth > image.naturalHeight ? 'landscape' : 'portrait';
    const fontSizePt = fitSingleBack(doc, card, orientation, format);
    if (count + qty > 300) throw new Error('Limite de 300 cartes physiques par lot. Réduisez les quantités.');
    for (let copy = 0; copy < qty; copy++) {
      group[orientation].push({ cardId: card.id, name: card.name, copy, fontSizePt, rules: keywordOnlyRules(card.rules), front: image.src, provenance: card.provenance, warnings: card.warnings });
    }
    count += qty;
  }
  if (!count) throw new Error('Sélectionnez au moins une carte.');
  const sheets = format !== 'standard'
    ? (['landscape', 'portrait'] as const).flatMap((orientation) => group[orientation].map((item) => ({ orientation, front: [item], back: [item] })))
    : [...duplexSheets(group.landscape, 'landscape'), ...duplexSheets(group.portrait, 'portrait')];
  let html = `<div class="instructions"><strong>${count} cartes physiques · ${sheets.length * 2} pages A4</strong><br>Imprimer à 100 %, sans en-têtes ni pieds de page, recto verso <strong>bord long</strong>. Ne pas choisir « ajuster à la page ». Chaque exemplaire possède exactement un recto et un verso. Le verso contient uniquement les définitions des mots-clés. Faire d’abord le test de calibration.</div>`;
  sheets.forEach((sheet, index) => {
    for (const side of ['front', 'back'] as const) {
      html += `<section class="sheet ${sheet.orientation} ${format}"><div class="sheet-grid">`;
      html += sheet[side].map((item) => item ? side === 'front' ? `<article class="physical-card front"><img src="${e(item.front!)}" alt="${e(item.name)}"></article>` : `<article class="physical-card workshop-back">${backHtml(item)}</article>` : '<div></div>').join('');
      html += `</div><div class="sheet-label">Feuille ${index + 1} · ${side === 'front' ? 'RECTOS' : 'VERSOS'} · A4 · 100 % · bord long</div></section>`;
    }
  });
  doc.body.innerHTML = html;
  await Promise.all(Array.from(doc.images).map((img) => img.decode()));
  // Check the final, visible layout too, not just the measurement templates.
  for (const body of doc.querySelectorAll<HTMLElement>('.back-body')) {
    if (body.scrollHeight > body.clientHeight + 1) throw new Error('Un verso déborde. Impression annulée pour conserver les définitions complètes.');
  }
  return { physicalCards: count, pages: sheets.length * 2 };
}

export function prepareWorkshopCalibration(win: Window): void {
  let html = '';
  for (const side of ['RECTO', 'VERSO']) {
    html += '<section class="sheet"><div class="sheet-grid">';
    for (let i = 0; i < 9; i++) {
      const n = side === 'RECTO' ? i + 1 : Math.floor(i / 3) * 3 + 3 - i % 3;
      html += `<article class="physical-card calibration">↑<br>${side} ${n}<small>62 × 88 mm<br>Le numéro doit coïncider<br>par transparence.</small></article>`;
    }
    html += '</div><div class="sheet-label">Calibration · A4 · taille réelle 100 % · recto verso bord long · sans en-têtes</div></section>';
  }
  win.document.open(); win.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Calibration Legion</title><style>${WORKSHOP_PRINT_CSS}</style></head><body>${html}</body></html>`); win.document.close();
}
