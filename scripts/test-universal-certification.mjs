// Certification universelle (schéma 6) : unités, améliorations (avec ou sans figurines), cartes de
// Commandement, contingences et nouveaux mots-clés.
// 1) Côté serveur : le vrai scripts/apply-dice-certification.mjs est rejoué sur des lots fictifs. Un lot
//    valide s'arrête volontairement à « Visuel introuvable » (aucune photo dans l'issue) : la validation est
//    donc passée sans qu'aucun fichier ne soit écrit ; un lot invalide doit être refusé avec le bon message.
// 2) Côté interface : la règle de blocage newCardMissing() de public/assistant/certification.js est
//    évaluée isolément pour chaque famille de carte.
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'swl-universal-'))
const issueBody = path.join(tmp, 'issue.txt')
fs.writeFileSync(issueBody, 'Lot de test sans photo\n')
const watched = ['src/data/customCards.json', 'src/data/customKeywords.json', 'src/data/diceCertifications.json', 'public/assistant/index.html']
const before = Object.fromEntries(watched.map((file) => [file, fs.readFileSync(path.join(root, file), 'utf8')]))

const runApply = (name, payload) => new Promise((resolve) => {
  const file = path.join(tmp, `${name}.json`)
  fs.writeFileSync(file, JSON.stringify({ version: 6, branch: 'claude/star-wars-legion-app-49rc3z', cards: [], ...payload }))
  execFile(process.execPath, ['scripts/apply-dice-certification.mjs', file, issueBody], { cwd: root }, (error, stdout, stderr) => resolve({ name, ok: !error, output: `${stdout}\n${stderr}` }))
})

const weapon = { name: 'Blaster de test', range: '1-3', dice: [{ color: 'noir', count: 2 }] }
const base = (key, extra) => ({ key, nameFr: `Carte de test ${key}`, weapons: [], imageMarker: 'IMG-1', ...extra })
const unit = base('universal test unit', { cardType: 'unit', rank: 'corps', speed: 2, weapons: [weapon], defenseColor: 'blanc', unitStats: { woundsPerModel: 1, courage: 1, baseModels: 4 } })
const upgradeModels = base('universal test upgrade models', { cardType: 'upgrade', weapons: [weapon], addedModels: 1, addedModelWounds: 1 })
const upgradePlain = base('universal test upgrade plain', { cardType: 'upgrade' })
const command = base('universal test command', { cardType: 'command', commandKind: 'command', pips: 2, cardText: 'Ordonnez 2 unités.', triggers: ['command'] })
const contingency = base('universal test contingency', { cardType: 'command', commandKind: 'contingency', pips: 3, cardText: 'Révélez cette carte.', triggers: ['command', 'end-round'] })
const keyword = { id: 'universal-test-keyword-x', englishName: 'Universal Test Keyword X', name: 'Mot-clé de test X', hasValue: true, category: 'unité', impact: 'autre', trigger: 'activation', automation: 'required-question', definition: 'Définition complète de test.', shortDefinition: 'Rappel court.', sourceUrl: 'https://example.org/regles', rulesVersion: 'AMG 2026-06-17', verifiedAt: '2026-10-20T00:00:00.000Z', checks: { translation: true, definition: true, behavior: true, source: true } }
const withKeyword = { ...unit, key: 'universal test keyword unit', keywords: [{ keywordId: keyword.id, value: 2 }] }

const cases = [
  ['unité complète', { newCards: [unit] }, /Visuel introuvable/],
  ['unité sans rang', { newCards: [{ ...unit, rank: undefined }] }, /Rang invalide/],
  ['unité sans dé de défense', { newCards: [{ ...unit, defenseColor: undefined }] }, /dé de défense manquants/],
  ['amélioration avec figurine', { newCards: [upgradeModels] }, /Visuel introuvable/],
  ['amélioration ordinaire', { newCards: [upgradePlain] }, /Visuel introuvable/],
  ['amélioration avec PV d’unité', { newCards: [{ ...upgradePlain, unitStats: unit.unitStats }] }, /Caractéristiques d'unité interdites/],
  ['carte de commandement', { newCards: [command] }, /Visuel introuvable/],
  ['contingence', { newCards: [contingency] }, /Visuel introuvable/],
  ['commandement avec PV et défense', { newCards: [{ ...command, unitStats: unit.unitStats, defenseColor: 'rouge' }] }, /Caractéristiques d'unité interdites/],
  ['commandement avec effectif', { newCards: [{ ...command, addedModels: 2 }] }, /ni arme, ni PV, ni effectif/],
  ['commandement sans déclenchement', { newCards: [{ ...command, triggers: [] }] }, /Déclenchements invalides/],
  ['commandement sans texte', { newCards: [{ ...command, cardText: ' ' }] }, /Texte français manquant/],
  ['nouveau mot-clé complet utilisé par la carte', { newKeywords: [keyword], newCards: [withKeyword] }, /Visuel introuvable/],
  ['mot-clé sans validation de la source', { newKeywords: [{ ...keyword, checks: { ...keyword.checks, source: false } }] }, /Validation humaine incomplète/],
  ['mot-clé sans définition courte', { newKeywords: [{ ...keyword, shortDefinition: '' }] }, /Définition de mot-clé manquante/],
  ['mot-clé avec source HTTP', { newKeywords: [{ ...keyword, sourceUrl: 'http://example.org' }] }, /Source de mot-clé invalide/],
  ['mot-clé déjà existant', { newKeywords: [{ ...keyword, id: 'malin' }] }, /existe déjà/],
  ['identifiant de mot-clé invalide', { newKeywords: [{ ...keyword, id: 'Mot Clé' }] }, /Identifiant de mot-clé invalide/],
  ['carte utilisant un mot-clé non certifié', { newCards: [withKeyword] }, /Mot-clé inconnu/],
]

try {
  const results = await Promise.all(cases.map(([name, payload]) => runApply(name, payload)))
  results.forEach((result, index) => {
    const expected = cases[index][2]
    assert.equal(result.ok, false, `${result.name} : le lot de test ne doit jamais être appliqué`)
    assert.match(result.output, expected, `${result.name} : message attendu ${expected}, obtenu :\n${result.output.slice(-600)}`)
  })
  for (const file of watched) assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), before[file], `${file} ne doit pas être modifié par un lot refusé`)
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}

// --- Règle de blocage de l'interface (même fonction que l'écran « Nouvelle carte ») ---
const source = fs.readFileSync(path.join(root, 'public/assistant/certification.js'), 'utf8')
const start = source.indexOf('  function newCardMissing(d){')
const end = source.indexOf('\n  }', start) + 4
assert.ok(start > 0 && end > start, 'newCardMissing() doit exister dans la certification')
const customKeywordDrafts = {}
const newCardMissing = new Function('customKeywordDrafts', `${source.slice(start, end)}; return newCardMissing`)(customKeywordDrafts)
const draft = (extra) => ({ nameFr: 'Carte', imageFile: {}, kind: 'unit', weapons: [{ name: 'Blaster' }], keywords: [], keywordsConfirmed: true, rank: 'corps', speed: '2', defenseColor: 'blanc', ...extra })

assert.deepEqual(newCardMissing(draft()), [], 'Une unité complète doit pouvoir être certifiée')
assert.ok(newCardMissing(draft({ rank: '', speed: '', defenseColor: null, weapons: [] })).join(' ').match(/rang.*vitesse.*dé de défense.*arme/), 'Une unité exige rang, vitesse, défense et armes')
assert.deepEqual(newCardMissing(draft({ kind: 'upgrade-models', rank: '', speed: '', defenseColor: null, addedModels: 1, weapons: [] })), [], 'Une amélioration à figurine n’exige que ses figurines ajoutées')
assert.ok(newCardMissing(draft({ kind: 'upgrade-models', addedModels: 0 })).includes('nombre de figurines ajoutées'), 'Une amélioration à figurine doit déclarer au moins une figurine')
assert.deepEqual(newCardMissing(draft({ kind: 'upgrade-plain', rank: '', speed: '', defenseColor: null, weapons: [] })), [], 'Une amélioration ordinaire n’exige que ce qui est imprimé')
const commandDraft = draft({ kind: 'command', rank: '', speed: '', defenseColor: null, weapons: [], commandKind: 'contingency', pips: '3', cardText: 'Texte', triggers: ['command'] })
assert.deepEqual(newCardMissing(commandDraft), [], 'Une contingence complète doit pouvoir être certifiée sans PV ni dé')
const commandMissing = newCardMissing({ ...commandDraft, commandKind: 'command', pips: '', cardText: '', triggers: [] }).join(' · ')
assert.match(commandMissing, /pips.*texte français.*déclenchement/, 'Une carte de commandement exige pips, texte et déclenchements')
assert.doesNotMatch(commandMissing, /PV|défense|figurine|rang|vitesse|arme/, 'Une carte de commandement ne demande jamais PV, effectif, dé ni arme')
customKeywordDrafts['relentless'] = { id: 'relentless', englishName: 'Relentless', ready: false }
assert.match(newCardMissing(draft({ customKeywordIds: ['relentless'] })).join(' '), /certification du mot-clé Relentless/, 'Une carte reste bloquée tant que son mot-clé inconnu n’est pas certifié')
customKeywordDrafts['relentless'].ready = true
assert.deepEqual(newCardMissing(draft({ customKeywordIds: ['relentless'], keywords: [{ keywordId: 'relentless' }] })), [], 'Le mot-clé certifié débloque la carte')
assert.ok(newCardMissing(draft({ keywordsConfirmed: false })).includes('confirmation des mots-clés visibles'), 'Les mots-clés visibles doivent être confirmés')

console.log(`Certification universelle OK : ${cases.length} lots serveur rejoués (unité, améliorations, commandement, contingence, mots-clés) et règles de blocage de l’interface vérifiées.`)
