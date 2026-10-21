/* Clés React des unités répétées (22/10/2026) : la fiche d'import affichait « Encountered two children with the same key »
   pour les unités présentes plusieurs fois (Stormtroopers ×4, Dark Troopers ×2…), la clé n'étant que le nom de l'unité.
   Rend le vrai composant ImportCompatibilityReport dans jsdom (react-dom/client, mode développement, qui signale les clés
   dupliquées), déplie le détail et vérifie : aucun avertissement de clé, une fiche par unité (aucune ne disparaît), des
   identifiants stables et distincts combinant liste, position et unité, identiques d'un rendu à l'autre. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/SWL/', pretendToBeVisual: true })
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'Event', 'MouseEvent', 'localStorage', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) Object.defineProperty(globalThis, key, { value: dom.window[key] ?? dom.window, configurable: true, writable: true })
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const warnings = []
const consoleError = console.error
console.error = (...args) => { warnings.push(args.map(String).join(' ')) }

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true } })
try {
  const React = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { importArmyList } = await vite.ssrLoadModule('/src/lib/importList.ts')
  const { auditImportedList } = await vite.ssrLoadModule('/src/lib/importAudit.ts')
  const { ImportCompatibilityReport } = await vite.ssrLoadModule('/src/components/ImportCompatibilityReport.tsx')
  for (const file of ['empire-moff-gideon.json', 'rebelles-simon-3.json']) {
    const list = importArmyList(fs.readFileSync(new URL(`./data/real-lists/${file}`, import.meta.url), 'utf8'))
    const audit = auditImportedList(list)
    const ids = audit.units.map((unit) => unit.id)
    assert.equal(new Set(ids).size, ids.length, `${file} : identifiants d’unités distincts`)
    assert.ok(ids.every((id) => id.startsWith(`${list.listName}#`)), `${file} : l’identifiant combine liste, position et unité`)
    assert.deepEqual(auditImportedList(list).units.map((unit) => unit.id), ids, `${file} : identifiants stables d’un calcul à l’autre`)
    const repeated = list.units.filter((unit, index) => list.units.findIndex((other) => other.name === unit.name) !== index).map((unit) => unit.name)
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    warnings.length = 0
    await React.act(async () => { root.render(React.createElement(ImportCompatibilityReport, { list })) })
    const toggle = container.querySelector('.import-audit-summary')
    if (toggle?.getAttribute('aria-expanded') === 'false') await React.act(async () => { toggle.dispatchEvent(new window.MouseEvent('click', { bubbles: true })) })
    const articles = container.querySelectorAll('.import-audit-details article')
    assert.equal(articles.length, audit.units.length, `${file} : une fiche par unité, y compris les unités répétées (${repeated.join(', ') || 'aucune'})`)
    assert.ok(!warnings.some((warning) => /same key|unique "key"|unique key/i.test(warning)), `${file} : aucune clé React dupliquée\n${warnings.join('\n')}`)
    await React.act(async () => { root.unmount() })
    console.log(`  ${list.listName} : ${audit.units.length} fiches (${repeated.length} unité(s) répétée(s)), aucune clé dupliquée`)
  }
  console.log('Clés React OK : unités répétées distinctes et stables dans la fiche d’import.')
} finally {
  console.error = consoleError
  await vite.close()
}
