// Inventaire LOCAL des visuels pour la certification automatique β (aucun accès réseau).
// Produit public/assistant/auto-certification-assets.js, lu par la page bêta pour résoudre chaque carte dans cet ordre :
//   1. fichier déjà présent dans public/cards/ (visuels français recadrés des PDF) ou public/commandcards/ ;
//   2. manifeste des cartes des PDF français (src/data/pdfCardManifest.json) : signale un visuel extractible, pas encore disponible ;
//   3-4. visuels récupérés depuis une source AMG/Asmodee ou externe autorisée (src/data/autoCertificationAssets.json) ;
//   5. sinon « visuel source introuvable ».
// Un visuel récupéré n'est publié que si son fichier existe et que son empreinte SHA-256 correspond au manifeste.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imagePattern = /\.(jpe?g|png|webp)$/i;
// Chemins surchargeables pour les tests (scripts/test-auto-certification-assets.mjs) ; par défaut, les fichiers du dépôt.
const manifestPath = process.env.SWL_AUTO_CERT_MANIFEST ?? path.join(root, 'src/data/autoCertificationAssets.json');
const cardsDir = process.env.SWL_AUTO_CERT_CARDS_DIR ?? path.join(root, 'public/cards');
const outputPath = process.env.SWL_AUTO_CERT_ASSETS_OUT ?? path.join(root, 'public/assistant/auto-certification-assets.js');
// Visuels AMG « usage personnel » (non versionnés, jamais déployés) : inventaire séparé, ignoré par Git, que la page ne charge
// qu'en local (localhost). L'inventaire principal ne décrit donc que des fichiers réellement publiés : la copie locale et
// le site GitHub Pages (régénéré au build, sans ces fichiers) publient exactement le même inventaire principal.
const personalOutputPath = process.env.SWL_AUTO_CERT_PERSONAL_OUT ?? path.join(root, 'public/assistant/auto-certification-personal.js');
const decisionsPath = process.env.SWL_AUTO_CERT_DECISIONS ?? path.join(root, 'src/data/autoCertificationDecisions.json');
const sha256Of = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const listImages = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).filter((entry) => entry.isFile() && imagePattern.test(entry.name)).map((entry) => entry.name).sort();

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const SOURCE_TYPES = ['amg-official', 'authorized-external', 'pdf-fr-local'];
const assets = {};
const personalAssets = {};
const unlinked = [];
const reserved = [];
for (const [id, asset] of Object.entries(manifest.assets ?? {})) {
  // Clé « kind:sourceId:lang » (carte Tabletop Admiral identifiée) ou « pdf-fr:… » (carte française extraite, pas encore reliée).
  const linked = id === `${asset.kind}:${asset.sourceId}:${asset.lang}`;
  if (!linked && !/^pdf-fr:[a-z0-9-]+$/.test(id)) throw new Error(`Visuel automatique mal identifié : ${id}`);
  if (!SOURCE_TYPES.includes(asset.sourceType)) throw new Error(`Type de source invalide pour ${id}`);
  if (!['en', 'fr'].includes(asset.lang) || !new RegExp(`^auto-certification/${asset.lang}/[a-z0-9-]+\.(jpg|png|webp)$`).test(asset.file)) throw new Error(`Nom de fichier non canonique pour ${id} : ${asset.file}`);
  if (asset.sourceType === 'pdf-fr-local' ? !(asset.pdfName && Number.isInteger(asset.pdfPage)) : !/^https:\/\//.test(asset.sourceUrl ?? '')) throw new Error(`Source non traçable pour ${id}`);
  if (!asset.retrievedAt || !asset.width || !asset.height || !asset.format) throw new Error(`Traçabilité incomplète pour ${id}`);
  const file = path.join(cardsDir, asset.file);
  if (!fs.existsSync(file)) {
    // Visuel réservé à l'usage personnel (non versionné) : absent d'une copie publiée, il redevient « à rechercher ».
    if (asset.publication === 'usage-personnel') { reserved.push(id); continue; }
    throw new Error(`Visuel automatique absent du dépôt : ${asset.file}`);
  }
  const sha256 = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (sha256 !== asset.sha256) throw new Error(`Empreinte SHA-256 différente pour ${asset.file} : le fichier a changé depuis sa récupération`);
  const entry = { publication: asset.publication ?? 'publiable', kind: asset.kind, sourceId: asset.sourceId ?? null, lang: asset.lang, canonicalName: asset.canonicalName, nameFr: asset.nameFr ?? null, file: asset.file, sourceType: asset.sourceType, sourceUrl: asset.sourceUrl ?? null, pdfName: asset.pdfName ?? null, pdfPage: asset.pdfPage ?? null, retrievedAt: asset.retrievedAt, sha256, width: asset.width, height: asset.height, identification: asset.identification ?? null };
  if (asset.publication === 'usage-personnel') { if (linked) personalAssets[id] = entry; continue; }
  if (linked) assets[id] = entry; else unlinked.push({ id, ...entry });
}

// Table explicite d'alias : chaque cible doit exister (aucun alias vers un visuel absent).
const aliases = JSON.parse(fs.readFileSync(path.join(root, 'src/data/autoCertificationAliases.json'), 'utf8'));
const commandFiles = new Set(listImages('public/commandcards'));
for (const [id, alias] of Object.entries(aliases.commands ?? {})) {
  if (!['confirmed', 'proposed'].includes(alias.status)) throw new Error(`Statut d'alias invalide pour la commande ${id}`);
  if (!commandFiles.has(`${alias.localId}.jpg`)) throw new Error(`Alias de commande ${id} : visuel public/commandcards/${alias.localId}.jpg absent`);
}
for (const [id, alias] of Object.entries(aliases.cards ?? {})) {
  if (!['confirmed', 'proposed'].includes(alias.status) || !/^(unit|upgrade):\d+$/.test(id) || !alias.localKey) throw new Error(`Alias de carte invalide : ${id}`);
}

// Décisions certifiées de la bêta (variantes choisies, validations publiées) : versionnées, communes à tous les appareils.
const decisions = fs.existsSync(decisionsPath) ? JSON.parse(fs.readFileSync(decisionsPath, 'utf8')) : {};
for (const [key, decision] of Object.entries(decisions.variants ?? {})) {
  if (!/^(unit|upgrade|command):[a-z0-9]+( [a-z0-9]+)*$/.test(key)) throw new Error(`Clé de décision de variante invalide : ${key}`);
  if (!/^\d+$/.test(decision.sourceId ?? '') || !Array.isArray(decision.compared) || decision.compared.length < 2 || !decision.compared.includes(decision.sourceId)) throw new Error(`Décision ${key} : variante retenue absente des identifiants comparés`);
  if (!decision.rule || !decision.justification || !/^\d{4}-\d{2}-\d{2}$/.test(decision.decidedAt ?? '') || !decision.listName) throw new Error(`Décision ${key} : règle, justification, date ou nom de liste manquant`);
}
for (const [key, validation] of Object.entries(decisions.validations ?? {})) {
  if (!/^(unit|upgrade|command):\d+$/.test(key) || !/^[0-9a-f]{64}$/.test(validation.englishSha256 ?? '') || !/^[0-9a-f]{64}$/.test(validation.frenchSha256 ?? '') || !validation.frenchName || !validation.validatedAt) throw new Error(`Validation publiée invalide : ${key}`);
}

// Comparaison des variantes Tabletop Admiral ambiguës (src/data/autoCertificationVariants.json) : analyse en lecture seule,
// affichée par la bêta pour le choix humain. Chaque visuel cité doit être un fichier local à l'empreinte inchangée ; un visuel
// AMG « usage personnel » absent de cette copie est seulement signalé absent.
const variantsPath = process.env.SWL_AUTO_CERT_VARIANTS ?? path.join(root, 'src/data/autoCertificationVariants.json');
const personalVariantVisuals = {};
const variantCases = fs.existsSync(variantsPath) ? JSON.parse(fs.readFileSync(variantsPath, 'utf8')).cases ?? [] : [];
for (const variant of variantCases) {
  if (!variant.id || !variant.listName || !['unit', 'upgrade', 'command'].includes(variant.kind) || (variant.candidates ?? []).length < 2) throw new Error(`Comparaison de variantes invalide : ${variant.id}`);
  if (variant.recommendation && !variant.candidates.some((candidate) => candidate.sourceId === variant.recommendation.sourceId)) throw new Error(`Recommandation hors des variantes : ${variant.id}`);
  for (const candidate of variant.candidates) {
    if (candidate.kind !== variant.kind || !/^\d+$/.test(candidate.sourceId)) throw new Error(`Variante mal identifiée : ${variant.id} n° ${candidate.sourceId}`);
    candidate.visuals = (candidate.visuals ?? []).map((visual) => {
      const match = /^\.\.\/cards\/([a-z0-9/-]+\.(jpg|png|webp))$/.exec(visual.src ?? '');
      if (!match || !['en', 'fr'].includes(visual.lang) || !/^[0-9a-f]{64}$/.test(visual.sha256 ?? '')) throw new Error(`Visuel de variante invalide : ${variant.id} ${visual.src}`);
      const file = path.join(root, 'public/cards', match[1]);
      if (!fs.existsSync(file)) {
        if (visual.publication === 'usage-personnel') { const { src, ...rest } = visual; return { ...rest, personal: true }; }
        throw new Error(`Visuel de variante absent : ${visual.src}`);
      }
      if (sha256Of(file) !== visual.sha256) throw new Error(`Empreinte modifiée pour le visuel de variante ${visual.src}`);
      // Visuel personnel : jamais de chemin dans l'inventaire publié ; l'inventaire local (localhost) le fournit.
      if (visual.publication === 'usage-personnel') { personalVariantVisuals[visual.sha256] = visual.src; const { src, ...rest } = visual; return { ...rest, personal: true }; }
      return visual;
    });
  }
}

const pdfManifest = JSON.parse(fs.readFileSync(path.join(root, 'src/data/pdfCardManifest.json'), 'utf8'));
const pdf = Object.entries(pdfManifest).filter(([key]) => key !== '_meta').filter(([, entry]) => ['unite', 'amelioration', 'commandement'].includes(entry.type) && Number.isInteger(entry.page)) // les lignes « Résumé — N pages » ne sont pas des cartes
  .map(([key, entry]) => ({ key, nameFr: entry.nameFr, nameEn: entry.nameEn ?? null, type: entry.type, pdfSource: entry.pdfSource, page: entry.page }));

// Empreintes SHA-256 des visuels réellement publiés (public/cards, ses cartes françaises extraites, public/commandcards) :
// une validation n'est valable que tant que les deux visuels gardent leur empreinte.
const hashes = {};
for (const file of listImages('public/cards')) hashes[`cards/${file}`] = sha256Of(path.join(root, 'public/cards', file));
for (const file of listImages('public/commandcards')) hashes[`commandcards/${file}`] = sha256Of(path.join(root, 'public/commandcards', file));
for (const entry of [...Object.values(assets), ...unlinked]) hashes[`cards/${entry.file}`] = entry.sha256;
const sortObject = (object) => Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)));

const payload = { assets, unlinked, coverage: { online: Object.keys(assets).length, personalListed: Object.values(manifest.assets ?? {}).filter((asset) => asset.publication === 'usage-personnel').length }, decisions: { variants: decisions.variants ?? {}, validations: decisions.validations ?? {} }, personalHashes: sortObject(Object.fromEntries(Object.entries(manifest.assets ?? {}).filter(([, asset]) => asset.publication === 'usage-personnel').map(([id, asset]) => [id, asset.sha256]))), hashes: sortObject(hashes), variants: variantCases, aliases: { cards: aliases.cards ?? {}, commands: aliases.commands ?? {}, keywordTranslations: Object.fromEntries(Object.entries(aliases.keywordTranslations ?? {}).map(([english, entry]) => [english, entry.fr])) }, localCardFiles: listImages('public/cards'), localCommandFiles: [...commandFiles].sort(), pdf };
fs.writeFileSync(outputPath, `window.SWL_AUTO_CERTIFICATION_ASSETS=${JSON.stringify(payload)};\n`);
if (Object.keys(personalAssets).length || Object.keys(personalVariantVisuals).length) fs.writeFileSync(personalOutputPath, `window.SWL_AUTO_CERTIFICATION_PERSONAL=${JSON.stringify({ assets: personalAssets, variantVisuals: personalVariantVisuals })};\n`);
else fs.rmSync(personalOutputPath, { force: true });
console.log(`Visuels certification automatique : ${Object.keys(assets).length} publié(s) en ligne, ${Object.keys(personalAssets).length} AMG à usage personnel disponible(s) localement seulement (+${unlinked.length} non reliés${reserved.length ? `, ${reserved.length} réservés à l'usage personnel absents de cette copie` : ''}), ${Object.keys(payload.aliases.commands).length + Object.keys(payload.aliases.cards).length} alias, ${payload.localCardFiles.length} cartes et ${payload.localCommandFiles.length} cartes de commandement dans le dépôt, ${pdf.length} entrées PDF.`);
