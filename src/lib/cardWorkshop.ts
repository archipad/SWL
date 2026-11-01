import { buildCardCatalog, keywordLabel } from './cardCatalog';
import { canonicalCardKey, frenchCardName } from './cardNames';
import { COMMAND_CARDS } from '../data/commandCards';
import { commandCardForName } from './commandDeck';
import { cardNoteFor } from '../data/cardNotes';
import community from '../data/frCommunityCards.json';
import certifications from '../data/diceCertifications.json';
import workshopTranslations from '../data/workshopCardTranslations.json';
import keywordReviews from '../data/workshopKeywordReviews.json';
import officialKeywords from '../data/workshopOfficialKeywords.json';
import timings from '../../scripts/data/keyword-timing.json';
import { annotateKeywords } from './keywordText';
import { stripDiceTokens } from './diceIcons';
import { normalizeName } from './normalize';
import type { CardTagLibrary, KeywordDef, ParsedList } from '../types';

export type WorkshopKind = 'unit' | 'upgrade' | 'command';
export interface WorkshopRule { id: string; title: string; text: string; timing: string; source: string }
export interface WorkshopCard {
  id: string;
  key: string;
  name: string;
  kind: WorkshopKind;
  image?: string;
  rules: WorkshopRule[];
  warnings: string[];
  provenance: string;
  search: string;
  keywordReview?: { status: string; reviewedAt: string; note: string; sourceSha256: string };
}
type CommunityCard = { englishName: string; nameFr: string; kind: string; integratedAt?: string; fr?: { body?: string; keywords?: string[]; weapons?: { name?: string; keywords?: string }[] } };
const communityCards = Object.values(community.cards) as CommunityCard[];
const cleanText = (s: string) => stripDiceTokens(s).replace(/\*\*|__/g, '').replace(/\{([^}]+)\}/g, '[$1]');

function timingFor(def: KeywordDef): string {
  const phase = (timings.keywords as Record<string, string[]>)[def.id]?.[0];
  return (timings.phases as Record<string, string>)[phase] ?? (def.impact === 'attaque' ? 'Attaque : déclencheur dans la définition' : def.impact === 'défense' ? 'Défense : déclencheur dans la définition' : 'Déclencheur dans la définition');
}

/** Full definitions: X remains literal, including references to other keywords. */
export function workshopRule(def: KeywordDef, value?: number, context?: string): WorkshopRule {
  const official = (officialKeywords.keywords as Record<string, { name: string; definition: string; page: number }>)[def.id];
  return {
    id: `${def.id}:${value ?? 'X'}:${context ?? ''}`,
    title: `${keywordLabel(official ? { ...def, name: official.name } : def, value)}${context ? ` · ${context}` : ''}`,
    text: cleanText(official?.definition ?? def.definition),
    timing: timingFor(def),
    source: official ? `AMG · ${officialKeywords.source.updatedAt} · p. ${official.page} · traduction FR vérifiée sur l’anglais officiel` : 'Glossaire du dépôt · actualité à vérifier',
  };
}

/** Only explicitly marked keywords are read from community translations, never arbitrary proper names. */
function markedKeywords(text: string, keywords: KeywordDef[], warnings: string[]): WorkshopRule[] {
  const rules: WorkshopRule[] = [];
  for (const match of text.matchAll(/\*\*([^*]+)\*\*/g)) {
    const printed = match[1].replace(/\u00a0/g, ' ').trim();
    const numeric = printed.match(/\s+(\d+)$/)?.[1];
    const base = normalizeName(printed.replace(/\s+(?:\d+|X)$/, ''));
    const def = keywords.find((k) => normalizeName(k.name.replace(/\s+X$/, '')) === base);
    if (def) rules.push(workshopRule(def, numeric === undefined ? undefined : Number(numeric)));
    else warnings.push(`Mot-clé à associer : ${printed}.`);
  }
  return rules;
}

function referencedKeywords(text: string, keywords: KeywordDef[], warnings: string[]): WorkshopRule[] {
  const marked = annotateKeywords(text.replace(/\*\*|__/g, ''), keywords, new Set(keywords.map((k) => k.id)))
    .filter((segment) => segment.keyword).map((segment) => `**${segment.text}**`).join(' ');
  return markedKeywords(marked, keywords, warnings);
}

export function buildWorkshopCatalog(tags: CardTagLibrary, keywords: KeywordDef[]): WorkshopCard[] {
  const definitions = new Map(keywords.map((k) => [k.id, k]));
  const catalog: WorkshopCard[] = buildCardCatalog(tags, keywords).map((card) => {
    const warnings: string[] = [];
    const rules: WorkshopRule[] = [];
    const add = (id: string, value?: number, context?: string) => {
      const def = definitions.get(id);
      if (def) rules.push(workshopRule(def, value, context));
      else warnings.push(`Définition absente : ${id}.`);
    };
    card.keywords.forEach((k) => add(k.keywordId, k.value));
    card.weapons.forEach((weapon) => weapon.keywords.forEach((k) => add(k.keywordId, k.value, weapon.name)));
    const note = cardNoteFor(card.key);
    if (note) {
      rules.unshift({ id: 'card-effect', title: 'Effet propre à la carte', text: cleanText(note), timing: 'Respecter les conditions ci-dessous', source: 'Texte français du catalogue SWL' });
      rules.push(...referencedKeywords(note, keywords, warnings));
    }
    const fr = communityCards.find((c) => c.kind !== 'command' && canonicalCardKey(c.englishName) === card.key);
    if (fr?.fr?.body) {
      if (!note) rules.unshift({ id: 'card-effect', title: 'Effet propre à la carte', text: cleanText(fr.fr.body), timing: 'Respecter les conditions ci-dessous', source: 'Fiche communautaire FR' });
      rules.push(...markedKeywords(fr.fr.body, keywords, warnings));
    }
    if (rules.some((r) => /\bX\b/.test(r.title))) warnings.push('Un paramètre X reste à préciser sur le recto.');
    if (!card.image) warnings.push('Recto français manquant.');
    if (!card.certified) warnings.push('Couverture des capacités à relire sur le recto.');
    if (!rules.length) warnings.push('Aucune définition associée : contrôler le texte du recto.');
    const cert = (certifications as Record<string, { fullCardCertification?: { rulesVersion?: string; verifiedAt?: string } }>)[card.key]?.fullCardCertification;
    return {
      id: `${card.type}:${card.key}`, key: card.key, name: card.name, kind: card.type, image: card.image,
      rules: keywordOnlyRules(rules), warnings,
      provenance: cert?.rulesVersion ? `${cert.rulesVersion} · carte contrôlée le ${(cert.verifiedAt ?? '').slice(0, 10) || 'date non renseignée'} · définitions : glossaire SWL` : 'Catalogue FR / glossaire SWL · actualité à vérifier',
      search: card.search,
    };
  });
  for (const command of COMMAND_CARDS) {
    const warnings: string[] = [];
    const fr = communityCards.find((c) => c.kind === 'command' && (canonicalCardKey(c.englishName) === canonicalCardKey(command.englishName ?? '') || c.nameFr === command.name));
    const body = fr?.fr?.body;
    const rules = body ? [{ id: 'command-effect', title: 'Effet du commandement', text: cleanText(body), timing: 'Respecter le déclencheur du texte', source: 'Fiche communautaire FR du catalogue' }, ...markedKeywords(body, keywords, warnings)] : [];
    if (!body) warnings.push('Mots-clés du commandement à identifier sur le recto.');
    if (!command.image) warnings.push('Recto français manquant.');
    catalog.push({ id: `command:${command.id}`, key: command.id, name: command.name, kind: 'command', image: command.image, rules: keywordOnlyRules(rules), warnings, provenance: fr?.integratedAt ? `Fiche FR intégrée le ${fr.integratedAt} · actualité à vérifier` : 'Visuel FR du catalogue · actualité à vérifier', search: normalizeName(`${command.name} ${command.englishName ?? ''}`) });
  }
  // Only replace workshop presentation; keep canonical IDs and engine data unchanged.
  for (const translated of workshopTranslations.cards) {
    const index = catalog.findIndex((card) => card.id === translated.id);
    if (index < 0) continue;
    const warnings = [...translated.warnings];
    const rules = translated.keywords.flatMap((entry) => {
      const def = definitions.get(entry.id);
      if (!def) { warnings.push('Définition absente : ' + entry.id + '.'); return []; }
      return [workshopRule(def, 'value' in entry ? entry.value : undefined)];
    });
    catalog[index] = { ...catalog[index], image: import.meta.env.BASE_URL + 'cards/' + translated.image,
      rules: keywordOnlyRules(rules), warnings, provenance: translated.provenance };
  }
  for (const review of keywordReviews.cards) {
    const card = catalog.find((entry) => entry.id === review.id);
    if (!card) continue;
    card.rules = keywordOnlyRules(review.keywords.flatMap((entry) => {
      const def = definitions.get(entry.keywordId);
      if (!def) return [];
      const rule = workshopRule(def, 'value' in entry ? entry.value : undefined);
      if ('label' in entry && typeof entry.label === 'string') rule.title = entry.label;
      return [rule];
    }));
    card.keywordReview = { status: review.status, reviewedAt: keywordReviews.reviewedAt, note: review.note, sourceSha256: review.front.sha256 };
    card.warnings = card.warnings.filter((text) => !/Mots-clés du commandement à identifier|Couverture des capacités à relire|Aucune définition associée|Un paramètre X reste à préciser/.test(text));
    if ('frontLanguage' in review && review.frontLanguage === 'en') card.warnings.push('Recto anglais du dépôt : traduction française à réaliser. Les définitions du verso sont en français.');
    if ('officialNote' in review && typeof review.officialNote === 'string') card.warnings.push(review.officialNote);
    for (const entry of review.keywords) if (!definitions.has(entry.keywordId)) card.warnings.push(`Définition absente : ${entry.keywordId}.`);
    card.provenance = `Mots-clés du recto contrôlés le ${keywordReviews.reviewedAt} · définitions complètes : traduction FR vérifiée sur AMG ${officialKeywords.source.updatedAt} (anglais officiel) · relecture par IA`;
  }
  return catalog.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

/** Also filters old personal cards without rewriting their saved source data. */
export function keywordOnlyRules(rules: WorkshopRule[]): WorkshopRule[] {
  const definitions = rules.filter((r) => !['card-effect', 'command-effect', 'personal-effect', 'empty'].includes(r.id))
    .map((r) => ({ ...r, id: r.id.split(':').slice(0, 2).join(':'), title: r.title.split(' · ')[0] }));
  const groups = new Map<string, WorkshopRule>();
  for (const rule of definitions) {
    const keywordId = rule.id.split(':')[0];
    const official = (officialKeywords.keywords as Record<string, { definition: string; page: number }>)[keywordId];
    // Refresh older saved personal cards too: never retain a former short summary.
    const current = official ? { ...rule, text: cleanText(official.definition), source: `AMG · ${officialKeywords.source.updatedAt} · p. ${official.page} · traduction FR vérifiée sur l’anglais officiel` } : rule;
    const existing = groups.get(keywordId);
    if (existing) {
      if (!existing.title.split(' / ').includes(current.title)) existing.title += ` / ${current.title}`;
    } else groups.set(keywordId, current);
  }
  return [...groups.values()];
}

export interface WorkshopSelection { quantities: Record<string, number>; missing: string[]; notices: string[] }
/** Every unit occurrence and every equipped upgrade counts. Commands/contingencies form a unique deck. */
export function workshopSelectionForList(list: ParsedList, catalog: WorkshopCard[], unique: boolean): WorkshopSelection {
  const result: WorkshopSelection = { quantities: {}, missing: [], notices: [] };
  const add = (name: string, kind: WorkshopKind) => {
    const resolvedCommand = kind === 'command' ? commandCardForName(name) : undefined;
    const canonical = canonicalCardKey(name);
    const translatedVariant = kind === 'upgrade' ? workshopTranslations.cards.find((c) => 'englishSourceName' in c && canonicalCardKey(c.englishSourceName ?? '') === canonical) : undefined;
    const key = kind === 'command' ? resolvedCommand?.id : translatedVariant?.key ?? canonical;
    const card = catalog.find((c) => c.kind === kind && c.key === key);
    if (!card) { result.missing.push(`${kind === 'command' ? 'Commandement' : kind === 'upgrade' ? 'Amélioration' : 'Unité'} : ${frenchCardName(name)}`); return; }
    result.quantities[card.id] = unique || kind === 'command' ? 1 : (result.quantities[card.id] ?? 0) + 1;
  };
  list.units.forEach((unit) => { add(unit.name, 'unit'); unit.upgrades.forEach((up) => add(up.name, 'upgrade')); });
  [...new Set([...(list.commandCards ?? []), ...(list.contingencies ?? [])])].forEach((name) => add(name, 'command'));
  if (!list.commandCards?.length) result.notices.push('Aucun commandement dans cet import. Ajoutez votre main depuis la bibliothèque.');
  if (list.unparsedLines.length) result.notices.push(`${list.unparsedLines.length} ligne(s) non reconnue(s) par l’import : vérifiez la sélection.`);
  result.missing = [...new Set(result.missing)];
  return result;
}

export type WorkshopOrientation = 'portrait' | 'landscape';
export interface SheetItem { cardId: string; copy: number; fontSizePt?: number; front?: string; rules: WorkshopRule[]; name: string; provenance: string; warnings: string[] }
export interface DuplexSheet { orientation: WorkshopOrientation; columns: number; rows: number; front: (SheetItem | null)[]; back: (SheetItem | null)[] }
/** A4 portrait / long-edge duplex: reflect columns, preserve empty slots on a partial sheet. */
export function duplexSheets(items: SheetItem[], orientation: WorkshopOrientation): DuplexSheet[] {
  const columns = orientation === 'portrait' ? 3 : 2;
  const rows = orientation === 'portrait' ? 3 : 4;
  const capacity = columns * rows;
  const sheets: DuplexSheet[] = [];
  for (let i = 0; i < items.length; i += capacity) {
    const front: (SheetItem | null)[] = Array.from({ length: capacity }, (_, j) => items[i + j] ?? null);
    const back = front.map((_, index) => front[Math.floor(index / columns) * columns + columns - 1 - index % columns]);
    sheets.push({ orientation, columns, rows, front, back });
  }
  return sheets;
}
