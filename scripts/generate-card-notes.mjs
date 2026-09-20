// Génère public/assistant/card-notes.js depuis src/data/cardNotes.ts (source unique : effets propres aux cartes).
// Usage : node scripts/generate-card-notes.mjs [--check]   (--check : n'écrit rien, échoue si le fichier n'est pas à jour)
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/data/cardNotes.ts', import.meta.url), 'utf8')
const start = source.indexOf('const RAW: Record<string, string> = {')
const end = source.indexOf('\n};', start)
if (start < 0 || end < 0) throw new Error('cardNotes.ts : table RAW introuvable')
const body = source.slice(source.indexOf('{', start), end + 2)
const raw = new Function('return (' + body + ')')()

const normalize = (name) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
const notes = {}
for (const [name, text] of Object.entries(raw)) notes[normalize(name)] = text

const output = '// Généré depuis src/data/cardNotes.ts (node scripts/generate-card-notes.mjs) : effets propres aux cartes sans mot-clé.\nwindow.SWL_CARD_NOTES=' + JSON.stringify(notes) + ';\n'
const target = new URL('../public/assistant/card-notes.js', import.meta.url)
if (process.argv.includes('--check')) {
  const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : ''
  if (current.replace(/\r\n/g, '\n') !== output) {
    console.error('card-notes.js n’est pas à jour : lancez node scripts/generate-card-notes.mjs')
    process.exit(1)
  }
  console.log('card-notes.js à jour (' + Object.keys(notes).length + ' notes)')
} else {
  fs.writeFileSync(target, output)
  console.log('card-notes.js généré (' + Object.keys(notes).length + ' notes)')
}
