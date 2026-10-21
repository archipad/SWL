import fs from 'node:fs/promises';

const TTA_API = 'https://tabletopadmiral.com/api';
const MODULAR_DATA = 'https://nowforwrath.github.io/legion.json';
const headers = { 'User-Agent': 'SWL-Assistant-Certification-Beta/1.0' };

async function json(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

const [units, upgrades, modular, officialCommands] = await Promise.all([
  json(`${TTA_API}/units`),
  json(`${TTA_API}/upgrades`),
  json(MODULAR_DATA),
  // Noms français des cartes de Commandement (mêmes identifiants que le référentiel modulaire) ; images ignorées.
  json(`${TTA_API}/official-commands`),
]);
const commandFrench = new Map(officialCommands.map((card) => [String(card.id), card.name_french || null]));
const factionNames = new Map((modular.data?.factions ?? []).map((faction) => [faction.id, faction.name]));

const keywords = new Map((modular.data?.keywords ?? []).map((keyword) => [String(keyword.id), {
  id: String(keyword.id),
  name: keyword.name,
  definition: keyword.definition ?? '',
}]));

// « N/A » est une valeur de remplissage de Tabletop Admiral, pas un mot-clé.
const keywordList = (ids) => (ids ?? []).map((id) => keywords.get(String(id))).filter((keyword) => keyword && !/^\s*n\/?a\s*$/i.test(keyword.name));
const clean = (value) => value == null || value === '' ? null : value;
// Tabletop Admiral n'est qu'une source de MÉTADONNÉES (noms EN/FR, identifiants, types, coûts, statistiques, mots-clés).
// Ses adresses d'images (image_url, image_url_french…) ne sont jamais reprises : les anciennes sont mortes (404) et les
// nouvelles refusent le hotlinking. Les visuels viennent exclusivement des fichiers locaux du dépôt (voir
// scripts/generate-auto-certification-assets.mjs).
const common = (card, kind) => ({
  sourceId: String(card.id),
  kind,
  englishName: card.name,
  frenchName: clean(card.name_french),
  // Titre séparé chez Tabletop Admiral (« Darth Vader » + « Dark Lord of the Sith ») : nécessaire pour retrouver les cartes SWL.
  englishTitle: clean(card.title),
  frenchTitle: clean(card.title_french),
  points: clean(card.current_cost ?? card.revamp_cost ?? card.points ?? card.original_cost),
  keywords: keywordList(card.keyword_ids ?? card.keywords),
  sourceUrl: kind === 'command'
    ? `https://modular.tabletopadmiral.com/legion`
    : `https://tabletopadmiral.com/legion/db/`,
});

const cards = [
  ...units.map((card) => ({
    ...common(card, 'unit'),
    rank: clean(card.rank_fkey), unitType: clean(card.unit_type_fkey), health: clean(card.health),
    courage: clean(card.courage), figures: clean(card.figures), speed: clean(card.speed),
  })),
  ...upgrades.map((card) => ({
    ...common(card, 'upgrade'),
    upgradeType: clean(card.upgrade_type_fkey),
  })),
  ...(modular.data?.commands ?? []).map((card) => ({
    ...common(card, 'command'),
    frenchName: clean(commandFrench.get(String(card.id))),
    pips: clean(card.pips),
    factions: (card.factions ?? [card.faction]).map((id) => factionNames.get(id)).filter(Boolean),
  })),
];

// L'API renvoie les cartes dans un ordre instable (égalités de nom) : un tri déterministe rend deux extractions comparables.
const kindOrder = { unit: 0, upgrade: 1, command: 2 };
cards.sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind] || a.englishName.localeCompare(b.englishName, 'en') || Number(a.sourceId) - Number(b.sourceId) || a.sourceId.localeCompare(b.sourceId));

// Garde-fou : une source vide ou tronquée ne doit jamais remplacer le catalogue publié.
const kinds = new Set(cards.map((card) => card.kind));
if (cards.length < 900 || !['unit', 'upgrade', 'command'].every((kind) => kinds.has(kind)) || keywords.size < 150) {
  throw new Error(`Source incomplète (${cards.length} cartes, ${keywords.size} mots-clés) : catalogue conservé tel quel.`);
}

const outputUrl = new URL('../public/assistant/auto-certification-source.js', import.meta.url);
const content = { sourceVersion: modular.update?.contentVersion ?? null, sources: [TTA_API, MODULAR_DATA], cards };
// Seule la date changerait à chaque passage de l'action planifiée : on ne réécrit le fichier que si les données ont changé,
// pour ne pas publier un commit toutes les six heures sans évolution réelle.
const previousText = await fs.readFile(outputUrl, 'utf8').catch(() => '');
const previous = previousText ? JSON.parse(previousText.replace(/^window\.SWL_AUTO_CERTIFICATION_SOURCE=/, '').replace(/;\s*$/, '')) : null;
if (previous && JSON.stringify({ sourceVersion: previous.sourceVersion, sources: previous.sources, cards: previous.cards }) === JSON.stringify(content)) {
  console.log(`Source certification automatique inchangée : ${cards.length} cartes, ${keywords.size} mots-clés (${content.sourceVersion ?? 'version inconnue'}).`);
} else {
  const payload = { generatedAt: new Date().toISOString(), ...content };
  await fs.writeFile(outputUrl, `window.SWL_AUTO_CERTIFICATION_SOURCE=${JSON.stringify(payload)};\n`);
  console.log(`Source certification automatique : ${cards.length} cartes, ${keywords.size} mots-clés (${payload.sourceVersion ?? 'version inconnue'}).`);
}
