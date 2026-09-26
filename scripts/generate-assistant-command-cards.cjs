// Génère public/assistant/command-cards.js à partir de src/data/commandCards.ts (source de vérité).
// L'Assistant d'unité est en JavaScript pur : il ne peut pas importer le module TypeScript de l'appli.
// Le test test-assistant-contracts.mjs vérifie que ce fichier reste synchronisé avec le .ts.
const fs = require('fs')
const path = require('path')
const root = path.join(__dirname, '..')
const source = fs.readFileSync(path.join(root, 'src', 'data', 'commandCards.ts'), 'utf8')
const start = source.indexOf('export const COMMAND_CARDS: CommandCard[] = [')
const end = source.indexOf('\n];', start)
if (start < 0 || end < 0) throw new Error('COMMAND_CARDS introuvable dans commandCards.ts')
const body = source.slice(start + 'export const COMMAND_CARDS: CommandCard[] = '.length, end + 3).replace(/`\$\{BASE\}([^`]*)`/g, '"$1"')
const cards = eval(body).map(({ id, name, pip, faction, requirement }) => ({ id, name, pip, faction, requirement }))
const out = '/* Généré par scripts/generate-assistant-command-cards.cjs depuis src/data/commandCards.ts — ne pas éditer à la main. */\n'
  + 'window.SWL_COMMAND_CARDS=' + JSON.stringify(cards) + ';\n'
fs.writeFileSync(path.join(root, 'public', 'assistant', 'command-cards.js'), out)
console.log(cards.length + ' cartes de Commandement écrites dans public/assistant/command-cards.js')
