// Certification automatique β : visuels locaux uniquement, identification stricte, rapprochements jamais silencieux.
// 1) Liste blanche : Tabletop Admiral, HTTP, sources non autorisées/non testées, hôtes non déclarés et non-PDF refusés.
// 2) Inventaire : un visuel n'est publié que si son fichier existe dans le dépôt (en/ ou fr/) avec le bon SHA-256.
// 3) Identification OCR : titre exact ou bruité identifié, titres proches « à contrôler », précisions entre parenthèses ignorées.
// 4) Résolveur (données réelles du dépôt) : alias explicites, propositions, ambiguïtés, et une URL externe ne suffit jamais.
// 5) Données du dépôt : catalogue sans adresse d'image, visuels traçables (source, domaine, date, SHA-256, format, dimensions).
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BLOCKED_HOSTS, checkEntry, checkPdf } from './fetch-auto-certification-assets.mjs'
import { identify, listCards, loadAssistantData } from './lib/auto-certification-pdf.mjs'
import { changes } from './lib/auto-certification-historical.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const run = (script, env = {}) => new Promise((resolve) => execFile(process.execPath, [script], { cwd: root, env: { ...process.env, ...env } }, (error, stdout, stderr) => resolve({ ok: !error, output: `${stdout}\n${stderr}` })))

// --- 1. Liste blanche ---
const authorized = { id: 'amg-test', sourceType: 'amg-official', authorizedBy: 'test', authorizedAt: '2026-10-21', testedAt: '2026-10-21', hosts: ['cdn.svc.asmodee.net'] }
const card = { kind: 'upgrade', sourceId: '2429', lang: 'en', url: 'https://cdn.svc.asmodee.net/production-amgcom/uploads/test.png' }
const pdf = { lang: 'en', cardKind: 'upgrade', url: 'https://cdn.svc.asmodee.net/production-amgcom/uploads/2026/04/DOC51_Generic_Upgrades.pdf' }
assert.deepEqual(checkEntry(authorized, card), [], 'une ressource AMG autorisée et testée doit être acceptée')
assert.deepEqual(checkPdf(authorized, pdf), [], 'un PDF officiel AMG autorisé doit être accepté')
for (const url of ['https://res.cloudinary.com/tabletopadmiral/image/upload/x.webp', 'https://d26oqf9i6fvic.cloudfront.net/upgrades/trimmed/2429.webp', 'https://tabletopadmiral.com/x.png']) {
  assert.match(checkEntry({ ...authorized, hosts: [new URL(url).hostname] }, { ...card, url }).join(' '), /hôte refusé/, `Tabletop Admiral doit être refusé comme source de visuel : ${url}`)
}
assert.deepEqual([...BLOCKED_HOSTS].sort(), ['d26oqf9i6fvic.cloudfront.net', 'res.cloudinary.com', 'tabletopadmiral.com'], 'les trois hôtes Tabletop Admiral doivent rester bloqués')
assert.match(checkEntry({ ...authorized, authorizedBy: '' }, card).join(' '), /non autorisée/, 'une source sans autorisation explicite est refusée')
assert.match(checkEntry({ ...authorized, testedAt: '' }, card).join(' '), /non testée/, 'une source non testée est refusée')
assert.match(checkEntry(authorized, { ...card, url: 'http://cdn.svc.asmodee.net/x.png' }).join(' '), /non HTTPS/, 'une source non HTTPS est refusée')
assert.match(checkEntry(authorized, { ...card, url: 'https://example.org/x.png' }).join(' '), /absent de la liste autorisée/, 'un hôte non déclaré par la source est refusé')
assert.match(checkPdf(authorized, { ...pdf, url: 'http://cdn.svc.asmodee.net/x.pdf' }).join(' '), /non HTTPS/, 'un PDF non HTTPS est refusé')
assert.match(checkPdf(authorized, { ...pdf, url: 'https://cdn.svc.asmodee.net/x.png' }).join(' '), /pas un PDF/, 'seuls des PDF sont acceptés comme source de cartes')
assert.deepEqual(checkPdf(authorized, { lang: 'en', cardKinds: ['unit', 'command'], rotateUnits: -90, url: pdf.url }), [], 'un PDF à plusieurs types de cartes est accepté')
assert.match(checkPdf(authorized, { ...pdf, rotateUnits: 45 }).join(' '), /rotateUnits invalide/, 'seules les rotations d’un quart de tour sont admises')
const repoSources = JSON.parse(fs.readFileSync(path.join(root, 'scripts/data/auto-certification-sources.json'), 'utf8')).sources
for (const source of repoSources) for (const entry of source.pdfs ?? []) assert.deepEqual(checkPdf(source, entry), [], `PDF de la liste blanche refusé : ${entry.url}`)

// --- 2. Inventaire : fichier présent, emplacement canonique, SHA-256 ---
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'swl-auto-assets-'))
try {
  const cardsDir = path.join(tmp, 'cards')
  fs.mkdirSync(path.join(cardsDir, 'auto-certification/en'), { recursive: true })
  const bytes = fs.readFileSync(path.join(root, 'public/cards/underworld-contacts.jpg'))
  const file = 'auto-certification/en/upgrade-2429-underworld-connections.jpg'
  const asset = { kind: 'upgrade', sourceId: '2429', lang: 'en', canonicalName: 'Underworld Connections', file, sourceType: 'amg-official', sourceUrl: `${pdf.url}#page=2`, retrievedAt: '2026-10-21T00:00:00.000Z', format: 'jpeg', width: 726, height: 1040, sha256: createHash('sha256').update(bytes).digest('hex') }
  const manifest = path.join(tmp, 'manifest.json')
  const out = path.join(tmp, 'assets.js')
  const inventory = (assets) => { fs.writeFileSync(manifest, JSON.stringify({ assets })); return run('scripts/generate-auto-certification-assets.mjs', { SWL_AUTO_CERT_MANIFEST: manifest, SWL_AUTO_CERT_CARDS_DIR: cardsDir, SWL_AUTO_CERT_ASSETS_OUT: out, SWL_AUTO_CERT_PERSONAL_OUT: path.join(tmp, 'personal.js') }) }
  let result = await inventory({ 'upgrade:2429:en': asset })
  assert.ok(!result.ok && /absent du dépôt/.test(result.output), 'un visuel inscrit sans fichier local doit être refusé')
  fs.writeFileSync(path.join(cardsDir, file), Buffer.concat([bytes, Buffer.from('modifié')]))
  result = await inventory({ 'upgrade:2429:en': asset })
  assert.ok(!result.ok && /Empreinte SHA-256 différente/.test(result.output), 'un fichier modifié après récupération doit être refusé')
  result = await inventory({ 'upgrade:2429:en': { ...asset, file: 'https://res.cloudinary.com/x.jpg' } })
  assert.ok(!result.ok && /non canonique/.test(result.output), 'une adresse distante ne peut pas tenir lieu de fichier')
  result = await inventory({ 'upgrade:2429:en': { ...asset, file: 'auto-certification/fr/upgrade-2429.jpg' } })
  assert.ok(!result.ok && /non canonique/.test(result.output), 'un visuel anglais doit être rangé dans auto-certification/en/')
  const { width, ...withoutWidth } = asset
  fs.writeFileSync(path.join(cardsDir, file), bytes)
  result = await inventory({ 'upgrade:2429:en': withoutWidth })
  assert.ok(!result.ok && /Traçabilité incomplète/.test(result.output), `format et dimensions sont obligatoires (${width})`)
  result = await inventory({ 'upgrade:2429:en': asset })
  assert.ok(result.ok, result.output)
  const published = JSON.parse(fs.readFileSync(out, 'utf8').replace(/^window\.SWL_AUTO_CERTIFICATION_ASSETS=/, '').replace(/;\s*$/, ''))
  assert.equal(published.assets['upgrade:2429:en'].sha256, asset.sha256, 'un visuel vérifié est publié avec son empreinte')
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}

// --- 3. Identification stricte des titres lus par OCR ---
const vaders = ['Darth Vader Dark Lord of the Sith', "Darth Vader The Emperor's Apprentice", 'Darth Vader Master of Evil']
assert.equal(identify('STORMTROOPERS', ['Stormtroopers', 'Shoretroopers', 'Snowtroopers']).status, 'identifie', 'un titre exact est identifié')
assert.equal(identify('•DARTH VADER DARK L.-0RD THE SITH', vaders).name, 'Darth Vader Dark Lord of the Sith', 'un titre légèrement bruité est rattaché au bon personnage')
assert.equal(identify('•DARTH VADER DARK L.-0RD THE SITH', vaders).status, 'identifie', 'le bruit d’OCR toléré ne crée pas d’ambiguïté')
assert.equal(identify('T-7 ION RIFLE SNOWTROOPER', ['T-7 Ion Snowtrooper', 'Snowtrooper']).status, 'a-controler', 'un titre qui diffère du nom des métadonnées reste à contrôler')
assert.equal(identify('STORMTROOPERS', ['Stormtrooper', 'Stormtroopers']).status, 'identifie', 'le pluriel exact départage les deux cartes')
assert.equal(identify('AGENT KALLUS', ['Agent Kallus (déblocage)']).status, 'identifie', 'les précisions entre parenthèses du manifeste sont ignorées')
assert.equal(identify('ON LES DESCEND UN PAR UN', ['On les Descend Un par Un', 'On les Descend un par un (Le Bad Batch)']).name, 'On les Descend Un par Un', 'deux entrées identiques ne forment qu’un candidat')
assert.equal(identify('', ['Stormtroopers']).status, 'inconnu', 'un titre illisible n’identifie rien')

// --- 4. Résolveur (données réelles du dépôt) ---
const { resolver, catalog } = loadAssistantData()
const meta = (kind, id) => catalog.find((entry) => entry.kind === kind && entry.sourceId === id)
const underworld = resolver.status(meta('upgrade', '2429'))
assert.equal(underworld.fr?.src, '../cards/underworld-contacts.jpg', 'Underworld Connections → Contacts dans la Pègre (alias explicite du nouveau circuit)')
assert.equal(underworld.fr?.certainty, 'certain', 'l’alias de Contacts dans la Pègre est confirmé')
// Visuel AMG réservé à l'usage personnel : présent sur le poste local, absent d'une copie publiée (CI) où la carte attend son visuel.
const englishFile = path.join(root, 'public/cards/auto-certification/en/upgrade-2429-underworld-connections.jpg')
if (fs.existsSync(englishFile)) {
  assert.match(underworld.en?.src ?? '', /^\.\.\/cards\/auto-certification\/en\/upgrade-2429-/, 'le visuel anglais est un fichier local')
  assert.ok(underworld.ready, 'Underworld Connections est prête pour la validation humaine')
} else assert.ok(!underworld.en && !underworld.ready, 'sans fichier local, le visuel anglais reste à rechercher')
const gunner = resolver.localFrench(meta('command', '8115'))
assert.equal(gunner?.src, '../commandcards/artillerie-infanterie.jpg', 'un alias de commandement confirmé raccorde le visuel français local')
assert.equal(gunner?.certainty, 'certain')
assert.equal(resolver.localFrench(meta('command', '9461'))?.certainty, 'proposed', 'un alias incertain reste une proposition à confirmer')
assert.equal(resolver.localFrench(meta('command', '92'))?.src, '../cards/auto-certification/fr/command-duel-des-destins.jpg', 'une carte française extraite d’un PDF est utilisée une fois reliée')
const standing = resolver.findMeta('Standing Orders', 'command')
assert.equal(standing.meta?.sourceId, '8', 'un doublon Tabletop Admiral n’est résolu que par un alias confirmé explicite')
const bossk = resolver.findMeta('Bossk Trandoshan Terror', 'unit')
assert.ok(!bossk.meta && bossk.certainty === 'ambiguous' && bossk.options.length > 1, 'un doublon sans alias reste ambigu (jamais de choix silencieux)')
const ambush = meta('command', '7')
const withRemote = { ...ambush, englishImage: 'https://res.cloudinary.com/tabletopadmiral/image/upload/v1/en.webp', frenchImage: 'https://res.cloudinary.com/tabletopadmiral/image/upload/v1/fr.jpg', image_url: 'https://d26oqf9i6fvic.cloudfront.net/commands-new/resized/7.webp', imageUrl: 'https://cdn.svc.asmodee.net/x.png' }
const remote = resolver.status(withRemote)
assert.ok(!remote.en && !remote.fr && !remote.ready, 'une URL externe seule ne suffit jamais à déverrouiller la certification')
const vader = resolver.status(meta('unit', '3'))
assert.ok(vader.translationComplete && !vader.newKeywords.length, 'Compel est reconnu par la forme générique du glossaire (« COMPEL: RANK/UNIT TYPE »)')
assert.ok(resolver.status(meta('unit', '25')).keywords.some((keyword) => keyword.name === 'Teamwork: Han Solo' && keyword.partial), 'une précision propre à la carte reste à confirmer')
// Listes réelles : précision d'emplacement « (Armament) » → deux cartes possibles ; seule une décision certifiée du dépôt tranche.
const galaar = resolver.findMeta('GALAAR-90 Sniper Rifle (Armament)', 'upgrade')
assert.ok(galaar.meta?.sourceId === '22654' && galaar.certainty === 'decision' && galaar.options.length === 2, 'GALAAR-90 (Armament) : n° 22654 par décision certifiée, parmi deux cartes')
assert.ok(!resolver.findMeta('GALAAR-90 Sniper Rifle', 'upgrade').meta, 'sans la précision « (Armament) », aucune décision ne s’applique : choix humain')
// Données moteur : clé SWL trouvée par alias explicite ou nom court non ambigu (sans toucher aux alias historiques).
assert.deepEqual({ ...resolver.swlKey(meta('unit', '6180')) }, { key: 'dark trooper squad', via: 'alias explicite', certain: true }, 'Imperial Dark Troopers → Dark Troopers Impériaux (alias explicite vérifié à l’œil)')
assert.equal(resolver.swlKey(meta('upgrade', '6318'))?.key, 'xs iv dark trooper', 'XS-IV Assault Cannon → Dark Trooper avec Canon d’Assaut XS-IV')
assert.deepEqual({ ...resolver.swlKey(meta('unit', '11258')) }, { key: 'moff gideon', via: 'nom anglais', certain: true }, 'Moff Gideon Long Live the Empire → moff gideon par l’alias historique ajouté le 21/10/2026')
// Glossaire : formes génériques sans deux-points (« RETINUE UNIT/UNIT TYPE ») et variantes d'orthographe signalées à confirmer.
assert.equal(resolver.status(meta('upgrade', '6322')).keywords.find((keyword) => keyword.name === 'Retinue')?.fr, 'ESCORTE', 'Retinue → ESCORTE')
assert.ok(resolver.status(meta('unit', '23657')).keywords.some((keyword) => keyword.name === 'Advanced Targeting: X' && keyword.fr === 'CIBLAGE AVANCÉ' && keyword.partial), 'Advanced Targeting (glossaire : « ADVANCE TARGETING ») est rapproché mais reste à confirmer')
assert.ok(resolver.status(meta('upgrade', '22599')).newKeywords.some((keyword) => keyword.name === 'This is the Way'), 'un mot-clé absent du glossaire reste nouveau')
// Liste Rebelles réelle : le nom anglais exact prime sur un nom français partagé (Commandos Rebelles / Strike Team).
assert.equal(resolver.localFrench(meta('unit', '13'))?.src, '../cards/rebel-commandos.jpg', 'Rebel Commandos : pas de fausse ambiguïté avec le Strike Team')
// « N/A » de l'index V2.6 n'est jamais une traduction ; la table explicite (termes des cartes françaises) prend le relais.
const sniper = resolver.status(meta('upgrade', '47')).keywords
assert.ok(sniper.every((keyword) => keyword.fr && keyword.fr !== 'N/A'), 'aucun mot-clé n’est traduit par « N/A »')
assert.equal(sniper.find((keyword) => keyword.name === 'Overwhelm')?.fr, 'DÉBORDEMENT', 'Overwhelm → DÉBORDEMENT (carte française DH-447)')
assert.equal(resolver.status(meta('upgrade', '48')).keywords.find((keyword) => keyword.name === 'Assault X')?.fr, 'ASSAUT X', 'Assault X → ASSAUT X (carte française Charge à Protons)')
// Seconde lecture OCR tracée dans la provenance.
const sx21 = JSON.parse(fs.readFileSync(path.join(root, 'src/data/autoCertificationAssets.json'), 'utf8')).assets['upgrade:124:en']
if (sx21) assert.equal(sx21.identification.pass, 'seconde lecture', 'SX-21 Trooper identifiée par la seconde lecture, tracée')

// --- 5. Données du dépôt ---
const catalogText = fs.readFileSync(path.join(root, 'public/assistant/auto-certification-source.js'), 'utf8')
assert.doesNotMatch(catalogText, /"(englishImage|frenchImage|image_url[a-z_]*|imageUrl)"|cloudinary|cloudfront/, 'le catalogue Tabletop Admiral ne doit contenir aucune adresse d’image')
const repoManifest = JSON.parse(fs.readFileSync(path.join(root, 'src/data/autoCertificationAssets.json'), 'utf8'))
const gitIgnored = (file) => new Promise((resolve) => execFile('git', ['check-ignore', '-q', file], { cwd: root }, (error) => resolve(!error)))
for (const [id, entry] of Object.entries(repoManifest.assets)) {
  const file = path.join(root, 'public/cards', entry.file)
  if (entry.sourceType === 'amg-official') {
    // Mention AMG « personal use only » : jamais versionné ni publié tant que l'autorisation n'est pas confirmée.
    assert.equal(entry.publication, 'usage-personnel', `${id} : visuel AMG marqué « usage personnel »`)
    assert.ok(await gitIgnored(`public/cards/${entry.file}`), `${id} : visuel AMG exclu du suivi Git`)
    if (!fs.existsSync(file)) continue
  }
  assert.ok(new RegExp(`^auto-certification/${entry.lang}/`).test(entry.file) && fs.existsSync(file), `${id} : fichier présent sous auto-certification/${entry.lang}/`)
  assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'), entry.sha256, `${id} : empreinte conforme`)
  assert.ok(entry.format && entry.width >= 400 && entry.height >= 400 && entry.retrievedAt && entry.canonicalName, `${id} : format, dimensions, date et nom canonique`)
  if (entry.lang === 'en') assert.ok(entry.sourceUrl.startsWith('https://cdn.svc.asmodee.net/') && entry.sourceDomain === 'cdn.svc.asmodee.net' && entry.sourceType === 'amg-official' && entry.identification?.status === 'identifie', `${id} : visuel anglais officiel AMG identifié`)
  else assert.ok(entry.sourceType === 'pdf-fr-local' && entry.pdfName && Number.isInteger(entry.pdfPage) && ['identifie', 'a-controler'].includes(entry.identification?.status), `${id} : carte française traçable (PDF, page, statut)`)
}
// Décisions certifiées versionnées (src/data/autoCertificationDecisions.json) : les quatre variantes tranchées le 21/10/2026,
// avec identifiants comparés, règle, justification et date ; publiées telles quelles dans l'inventaire, communes à tous les appareils.
const decisionsFile = JSON.parse(fs.readFileSync(path.join(root, 'src/data/autoCertificationDecisions.json'), 'utf8'))
const decided = { 'upgrade:galaar 90 sniper rifle armament': ['22654', ['22419', '22654']], 'upgrade:combat armor rebel': ['20282', ['20272', '20282']], 'unit:at rt': ['1', ['1', '70']], 'unit:rebel commandos strike team': ['25979', ['14', '25979']] }
assert.deepEqual(Object.keys(decisionsFile.variants).sort(), Object.keys(decided).sort(), 'exactement les quatre décisions acceptées sont versionnées')
for (const [key, [sourceId, compared]] of Object.entries(decided)) {
  const decision = decisionsFile.variants[key]
  assert.equal(decision.sourceId, sourceId, `${key} : variante n° ${sourceId}`)
  assert.deepEqual([...decision.compared].sort(), [...compared].sort(), `${key} : identifiants comparés conservés`)
  assert.ok(decision.rule && decision.justification && /^\d{4}-\d{2}-\d{2}$/.test(decision.decidedAt), `${key} : règle, justification et date conservées`)
}
const publishedInventory = fs.readFileSync(path.join(root, 'public/assistant/auto-certification-assets.js'), 'utf8')
const published = JSON.parse(publishedInventory.replace(/^window\.SWL_AUTO_CERTIFICATION_ASSETS=/, '').replace(/;\s*$/, ''))
assert.deepEqual(published.decisions.variants, decisionsFile.variants, 'les décisions sont publiées telles quelles dans l’inventaire')
// Nouvel import identique : mêmes noms → mêmes cartes ; la contrainte de faction protège l'AT-RT d'une liste de la République.
const rebels = { factions: ['Alliance Rebelle'] }
assert.equal(resolver.findMeta('AT-RT', 'unit', rebels).meta?.sourceId, '1', 'AT-RT d’une liste rebelle (« Alliance Rebelle ») → n° 1')
assert.equal(resolver.findMeta('AT-RT', 'unit', { factions: ['rebel'] }).meta?.sourceId, '1', 'AT-RT d’un export Tabletop Admiral rebelle (« rebel ») → n° 1')
assert.ok(!resolver.findMeta('AT-RT', 'unit', { factions: ['Galactic Republic'] }).meta, 'AT-RT d’une liste de la République : toujours un choix humain')
assert.ok(!resolver.findMeta('AT-RT', 'unit').meta, 'AT-RT sans faction connue : toujours un choix humain')

// Inventaire publié = fichiers réellement déployés : aucun chemin ni compteur ne repose sur un visuel AMG personnel (ignoré par Git).
assert.doesNotMatch(publishedInventory, /auto-certification\/en\//, 'l’inventaire publié ne cite aucun fichier AMG personnel')
assert.ok(Object.values(published.assets).every((asset) => asset.publication !== 'usage-personnel'), 'aucun visuel personnel parmi les visuels publiés')
const tracked = await new Promise((resolve) => execFile('git', ['ls-files', 'public/cards/auto-certification/en', 'public/assistant/auto-certification-personal.js'], { cwd: root }, (error, stdout) => resolve(stdout.trim())))
assert.equal(tracked, '', 'aucun visuel AMG personnel ni inventaire personnel n’est suivi par Git')
assert.ok(await gitIgnored('public/assistant/auto-certification-personal.js'), 'l’inventaire personnel est ignoré par Git')
for (const asset of [...Object.values(published.assets), ...published.unlinked]) assert.ok(fs.existsSync(path.join(root, 'public/cards', asset.file)) && !(await gitIgnored(`public/cards/${asset.file}`)), `${asset.file} : compté en ligne, donc publié avec le site`)
assert.equal(published.coverage.online, Object.keys(published.assets).length, 'le compteur en ligne ne compte que les visuels publiés')
for (const [file, hash] of Object.entries(published.hashes)) if (!(await gitIgnored(`public/${file}`)) && fs.existsSync(path.join(root, 'public', file))) continue; else assert.fail(`${file} : empreinte publiée d’un fichier non déployé`)
const online = loadAssistantData({ personal: false }).resolver
for (const id of Object.keys(published.personalHashes)) {
  const [kind, sourceId] = id.split(':')
  assert.equal(online.status(meta(kind, sourceId)).en, null, `${id} : en ligne, le visuel anglais personnel est absent (carte non validable)`)
}

// Comparaison des variantes : chaque variante existe chez Tabletop Admiral et fait partie des choix du résolveur ;
// la recommandation acceptée est celle de la décision versionnée, et les visuels AMG cités restent hors de Git.
const variants = JSON.parse(fs.readFileSync(path.join(root, 'src/data/autoCertificationVariants.json'), 'utf8')).cases
for (const variant of variants) {
  const match = resolver.findMeta(variant.listName, variant.kind, rebels)
  assert.equal(match.meta?.sourceId, variant.recommendation.sourceId, `${variant.listName} : décision = recommandation acceptée`)
  assert.deepEqual(variant.candidates.map((candidate) => candidate.sourceId).sort(), [...match.options].map((option) => option.sourceId).sort(), `${variant.listName} : variantes comparées = choix du résolveur`)
  for (const candidate of variant.candidates) {
    assert.ok(meta(candidate.kind, candidate.sourceId), `${variant.listName} : n° ${candidate.sourceId} présent dans le catalogue`)
    for (const visual of candidate.visuals.filter((entry) => entry.publication === 'usage-personnel')) assert.ok(await gitIgnored(`public/cards/${visual.src.replace('../cards/', '')}`), `${visual.src} : visuel AMG exclu du suivi Git`)
  }
}
// --- 6. Certifications historiques : quatre états, index versionné, aucun visuel anglais exigé pour une carte inchangée ---
const historicalIndex = JSON.parse(fs.readFileSync(path.join(root, 'src/data/autoCertificationHistoricalIndex.json'), 'utf8')).certifications
const classifyName = (R, name, kind, factions) => R.classify(name, kind, R.findMeta(name, kind, { factions }))
// Carte certifiée et inchangée : reconnue telle quelle EN LIGNE, sans aucun visuel anglais publié.
const stormtroopers = classifyName(online, 'Stormtroopers', 'unit', ['empire'])
assert.equal(stormtroopers.state, 'certified', 'Stormtroopers : certification existante valide')
assert.equal(online.status(meta('unit', '5')).en, null, 'aucun visuel anglais n’est publié pour les Stormtroopers…')
assert.ok(stormtroopers.historical.valid && !stormtroopers.reasons.length, '… et la carte n’en réclame pas : certifiée et inchangée')
assert.equal(classifyName(online, 'Moff Gideon Long Live the Empire', 'unit', ['empire']).state, 'certified', 'Moff Gideon (certifié le 21/10/2026) est reconnu par l’index')
// Carte réellement nouvelle / connue mais incomplète : comparaison obligatoire.
assert.equal(classifyName(online, 'Mandalorian Hunter', 'unit', ['empire']).state, 'new', 'Mandalorian Hunter : carte réellement nouvelle')
assert.equal(classifyName(online, 'GALAAR-90 Sniper Rifle (Armament)', 'upgrade', ['empire']).state, 'new', 'GALAAR-90 : carte réellement nouvelle')
assert.equal(classifyName(online, 'Standing Orders', 'command', ['rebel']).state, 'incomplete', 'une carte de commandement connue n’a pas de certification historique : comparaison obligatoire')
assert.equal(classifyName(online, 'AT-RT', 'unit', ['Galactic Republic']).state, 'incomplete', 'AT-RT de la République : identité incertaine, jamais rattachée à la certification rebelle')
// Identité : la certification n'est rattachée qu'à la carte Tabletop Admiral retenue sans ambiguïté.
assert.deepEqual(Object.keys(historicalIndex['at rt'].tta), ['unit:1'], 'AT-RT : seule la carte rebelle n° 1 est rattachée')
assert.deepEqual(Object.keys(historicalIndex['rebel commandos strike team'].tta), ['unit:25979'], 'Strike Team : seule la version actuelle n° 25979 est rattachée')
const ttaOwners = new Map()
for (const [key, entry] of Object.entries(historicalIndex)) for (const id of Object.keys(entry.tta)) {
  assert.ok(!ttaOwners.has(id), `${id} rattachée à deux certifications (${ttaOwners.get(id)}, ${key})`)
  ttaOwners.set(id, key)
  assert.equal(id.split(':')[0], entry.cardType, `${key} : type de carte identique à la carte Tabletop Admiral ${id}`)
}
assert.ok(Object.values(historicalIndex).every((entry) => !/auto-certification\/en\//.test(entry.frenchVisual || '')), 'l’index ne s’appuie jamais sur un visuel AMG personnel')
// Nouveau mot-clé Tabletop Admiral → certification obsolète.
const stormMeta = meta('unit', '5')
assert.equal(online.classify('Stormtroopers', 'unit', { meta: { ...stormMeta, keywords: [...stormMeta.keywords, { name: 'Brand New Keyword' }] }, options: [stormMeta] }).state, 'obsolete', 'un nouveau mot-clé Tabletop Admiral rend la certification obsolète')
// Empreintes : données, visuel français ou définition modifiés → obsolète (comparaison exigée de nouveau).
const fingerprint = historicalIndex.stormtroopers
assert.deepEqual(changes(fingerprint, fingerprint), [], 'empreintes identiques : certification valide')
assert.deepEqual(changes(fingerprint, { ...fingerprint, dataSha256: '0'.repeat(64) }), ['données moteur modifiées'])
assert.deepEqual(changes(fingerprint, { ...fingerprint, frenchVisualSha256: '1'.repeat(64) }), ['visuel français modifié'])
assert.deepEqual(changes(fingerprint, { ...fingerprint, definitionsSha256: '2'.repeat(64) }), ['définition de mot-clé modifiée'])
assert.deepEqual(changes(undefined, fingerprint), ['certification absente de l’index (modifiée ou ajoutée depuis la dernière indexation)'])
{
  // Même contrôle de bout en bout : un index dont l'empreinte diffère publie la certification comme obsolète.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'swl-auto-index-'))
  try {
    const altered = JSON.parse(fs.readFileSync(path.join(root, 'src/data/autoCertificationHistoricalIndex.json'), 'utf8'))
    altered.certifications.stormtroopers.frenchVisualSha256 = '3'.repeat(64)
    altered.certifications['range troopers'].dataSha256 = '4'.repeat(64)
    fs.writeFileSync(path.join(tmp, 'index.json'), JSON.stringify(altered))
    const result = await run('scripts/generate-auto-certification-assets.mjs', { SWL_AUTO_CERT_HISTORICAL_INDEX: path.join(tmp, 'index.json'), SWL_AUTO_CERT_ASSETS_OUT: path.join(tmp, 'assets.js'), SWL_AUTO_CERT_PERSONAL_OUT: path.join(tmp, 'personal.js') })
    assert.ok(result.ok, result.output)
    const regenerated = JSON.parse(fs.readFileSync(path.join(tmp, 'assets.js'), 'utf8').replace(/^window\.SWL_AUTO_CERTIFICATION_ASSETS=/, '').replace(/;\s*$/, ''))
    assert.deepEqual(regenerated.historical.stormtroopers.reasons, ['visuel français modifié'], 'visuel français modifié → certification obsolète')
    assert.deepEqual(regenerated.historical['range troopers'].reasons, ['données moteur modifiées'], 'données modifiées → certification obsolète')
  } finally { fs.rmSync(tmp, { recursive: true, force: true }) }
}
assert.ok(Object.values(published.historical).every((entry) => entry.valid), 'toutes les certifications historiques indexées sont valides et inchangées dans ce dépôt')

// Audit réel des deux listes (scripts/data/real-lists) : la certification existante compte en ligne comme en local.
for (const file of ['empire-moff-gideon.json', 'rebelles-simon-3.json']) {
  const list = JSON.parse(fs.readFileSync(path.join(root, 'scripts/data/real-lists', file), 'utf8'))
  const factions = [list.armyFaction]
  const states = (R) => listCards(list).map((card) => ({ ...card, state: classifyName(R, card.name, card.kind, factions).state }))
  const local = states(resolver), live = states(online)
  assert.deepEqual(live.map((card) => card.state), local.map((card) => card.state), `${file} : même classement en ligne qu’en local (le visuel anglais n’y entre pas)`)
  const certifiedCount = live.filter((card) => card.state === 'certified').length
  assert.ok(certifiedCount >= live.length / 2, `${file} : ${certifiedCount}/${live.length} cartes reconnues comme déjà certifiées en ligne (plus de 0)`)
  for (const card of live.filter((entry) => entry.kind === 'command' || entry.kind === 'contingency')) assert.notEqual(card.state, 'certified', `${card.name} : aucune carte de commandement n’a de certification historique`)
  console.log(`  ${list.listname} : ${certifiedCount} certifiées et inchangées, ${live.filter((card) => card.state === 'obsolete').length} obsolètes, ${live.filter((card) => card.state === 'incomplete').length} connues incomplètes, ${live.filter((card) => card.state === 'new').length} nouvelles (sur ${live.length})`)
}
assert.equal(classifyName(online, 'Mandalorian Hunter', 'unit', ['empire']).state, 'new')
// Améliorations renommées par l'import du site : même carte Tabletop Admiral, même certification.
for (const renamed of ['Cassian Andor Operative', 'Chewbacca Upgrade']) assert.equal(classifyName(online, renamed, 'upgrade', ['rebel']).state, 'certified', `${renamed} : reconnue malgré le renommage de l’import`)

// SHA-256 de secours de la bêta (contexte non sécurisé, sans WebCrypto) : identique à celui de Node.
{
  const source = fs.readFileSync(path.join(root, 'public/assistant/certification-auto.js'), 'utf8')
  const sha256Fallback = new Function(`${source.match(/function sha256Fallback\(bytes\)\{[\s\S]*?return H\.map\(word=>word\.toString\(16\)\.padStart\(8,'0'\)\)\.join\(''\)\}/)[0]};return sha256Fallback`)()
  for (const buffer of [Buffer.alloc(0), Buffer.from('abc'), Buffer.alloc(55, 1), Buffer.alloc(56, 2), Buffer.alloc(64, 3), Buffer.alloc(100003, 7), fs.readFileSync(path.join(root, 'public/cards/stormtroopers.jpg'))]) assert.equal(sha256Fallback(new Uint8Array(buffer)), createHash('sha256').update(buffer).digest('hex'), `SHA-256 de secours (${buffer.length} octets)`)
}
const en = Object.values(repoManifest.assets).filter((entry) => entry.lang === 'en').length
const fr = Object.values(repoManifest.assets).filter((entry) => entry.lang === 'fr')
console.log(`Visuels de certification automatique OK : sources contrôlées, ${en} visuel(s) anglais AMG et ${fr.length} carte(s) française(s) extraite(s) (${fr.filter((entry) => entry.identification.status === 'a-controler').length} à contrôler), résolveur sans rapprochement silencieux.`)
