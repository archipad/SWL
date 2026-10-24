// Fiches FR communautaires (scripts/fr-cards) : validation des fiches envoyées par l'atelier et intégration au site,
// rejouée dans une copie temporaire des données (sans réseau ni Python : le rendu est testé par le workflow GitHub).
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractPayload, targetFiles, validatePayload } from './fr-cards/payload.mjs'
import { integrate } from './fr-cards/integrate.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const upgrade = {
  schemaVersion: 1, kind: 'upgrade', englishName: 'Test Vibro Blade', nameFr: 'Vibrolame d’Essai',
  hqImage: 'https://d2maxvwz12z6fm.cloudfront.net/upgradeCards/Vibrosword.webp', ttaId: 'upgrade:99999', use: 'passive',
  fr: { title: 'Vibrolame d’Essai', body: '**Chasseur Mandalorien uniquement.**\nCette unité gagne **Charge**.', weapons: [{ name: 'Vibrolame', keywords: 'Perforant 1' }] },
}
const command = {
  schemaVersion: 1, kind: 'command', englishName: 'Test Order', nameFr: 'Ordre d’Essai', ttaId: 'command:99998',
  hqImage: 'https://d2maxvwz12z6fm.cloudfront.net/commandCards/Aggressive%20Negotiations.webp',
  command: { pip: 2, faction: 'rebelles', requirement: 'Officier Rebelle' },
  fr: { title: 'Ordre d’Essai', units: '2 UNITÉS', body: 'Texte.', footer: 'Officier Rebelle' },
}

// Validation : seul le CDN public de Legion HQ, des zones connues et des textes bornés passent.
assert.equal(validatePayload(upgrade).fr.weapons[0].keywords, 'Perforant 1')
assert.throws(() => validatePayload({ ...upgrade, hqImage: 'https://evil.example/x.webp' }), /CDN public de Legion HQ/)
assert.throws(() => validatePayload({ ...upgrade, hqImage: upgrade.hqImage.replace('upgradeCards', 'unitCards') }), /bon type de carte/)
assert.throws(() => validatePayload({ ...upgrade, fr: { footer: 'x' } }), /Zone « footer » inconnue/)
assert.throws(() => validatePayload({ ...upgrade, nameFr: ' ' }), /Nom français obligatoire/)
assert.throws(() => validatePayload({ ...command, command: { pip: 7, faction: 'rebelles' } }), /pip/)
assert.throws(() => validatePayload({ ...upgrade, fr: { body: 'x'.repeat(2000) } }), /1500 caractères/)
assert.equal(extractPayload(`Texte\n<!-- SWL_FR_CARD\n${JSON.stringify(upgrade)}\n-->`).englishName, 'Test Vibro Blade')
assert.deepEqual(targetFiles(validatePayload(upgrade)), { id: 'test-vibro-blade', publicPath: 'public/cards/test-vibro-blade-fr-community.jpg', file: 'test-vibro-blade-fr-community.jpg' })
assert.equal(targetFiles(validatePayload(command)).publicPath, 'public/commandcards/ordre-d-essai.jpg')

// Intégration dans une copie des données.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'swl-fr-cards-'))
try {
  for (const file of ['src/data/cardImages.ts', 'src/data/cardNamesFr.ts', 'src/data/customCards.json', 'src/data/commandCards.ts', 'src/data/autoCertificationAliases.json', 'src/data/upgradeCardUse.json', 'public/assistant/index.html']) {
    fs.mkdirSync(path.dirname(path.join(tmp, file)), { recursive: true })
    fs.copyFileSync(path.join(root, file), path.join(tmp, file))
  }
  const image = path.join(tmp, 'visuel.jpg')
  fs.writeFileSync(image, Buffer.from([0xff, 0xd8, 0xff, 0xd9]))
  const versionOf = (name) => Number(fs.readFileSync(path.join(tmp, 'public/assistant/index.html'), 'utf8').match(new RegExp(`${name}\\?v=(\\d+)`))[1])
  const referenceBefore = versionOf('reference-data\\.js'), commandsBefore = versionOf('command-cards\\.js')

  await integrate(validatePayload(upgrade), { root: tmp, image, generate: false, issue: 12 })
  assert.ok(fs.existsSync(path.join(tmp, 'public/cards/test-vibro-blade-fr-community.jpg')), 'visuel publié dans public/cards')
  assert.match(fs.readFileSync(path.join(tmp, 'src/data/cardImages.ts'), 'utf8'), /'Test Vibro Blade': 'test-vibro-blade-fr-community\.jpg',/)
  assert.match(fs.readFileSync(path.join(tmp, 'src/data/cardNamesFr.ts'), 'utf8'), /"Test Vibro Blade": "Vibrolame d’Essai",/)
  const recorded = JSON.parse(fs.readFileSync(path.join(tmp, 'src/data/frCommunityCards.json'), 'utf8')).cards['upgrade:test vibro blade']
  assert.equal(recorded.issue, 12)
  assert.equal(recorded.use, 'passive')
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(tmp, 'src/data/upgradeCardUse.json'), 'utf8')).cards['test vibro blade'], { use: 'passive', icons: [] }, 'utilisation de l’amélioration enregistrée')
  await assert.rejects(integrate(validatePayload({ ...upgrade, englishName: 'Test Discard Card', use: 'discard' }), { root: tmp, image, generate: false }), /suivi .* moteur/, 'une carte ✖ exige d’abord son suivi dans le moteur')
  assert.ok(!fs.existsSync(path.join(tmp, 'public/cards/test-discard-card-fr-community.jpg')), 'rien n’est écrit pour une carte refusée')
  assert.equal(versionOf('reference-data\\.js'), referenceBefore + 1, 'le référentiel Assistant change de version')
  await assert.rejects(integrate(validatePayload(upgrade), { root: tmp, image, generate: false }), /existe déjà/, 'un visuel existant n’est jamais écrasé')
  await assert.rejects(integrate(validatePayload({ ...upgrade, englishName: 'Stormtroopers' }), { root: tmp, image, generate: false }), /déjà raccordée/, 'une carte déjà raccordée garde son visuel')

  await integrate(validatePayload(command), { root: tmp, image, generate: false })
  const commands = fs.readFileSync(path.join(tmp, 'src/data/commandCards.ts'), 'utf8')
  assert.match(commands, /id: 'ordre-d-essai', name: 'Ordre d\\’Essai', englishName: 'Test Order', pip: 2, faction: 'rebelles', community: true,|id: 'ordre-d-essai', name: 'Ordre d’Essai', englishName: 'Test Order', pip: 2, faction: 'rebelles', community: true,/)
  assert.match(commands, /image: `\$\{BASE\}ordre-d-essai\.jpg`/)
  assert.equal(JSON.parse(fs.readFileSync(path.join(tmp, 'src/data/autoCertificationAliases.json'), 'utf8')).commands['99998'].localId, 'ordre-d-essai')
  assert.equal(versionOf('command-cards\\.js'), commandsBefore + 1, 'le paquet de Commandement change de version')
  await assert.rejects(integrate(validatePayload({ ...command, englishName: 'Standing Orders', nameFr: 'Ordres Permanents' }), { root: tmp, image, generate: false }), /déjà un visuel/)
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}
console.log('Fiches FR communautaires OK : validation des fiches, intégration sans écrasement, versions du site.')
