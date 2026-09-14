import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true } })
try {
  const { importArmyList } = await vite.ssrLoadModule('/src/lib/importList.ts')
  const { auditImportedList } = await vite.ssrLoadModule('/src/lib/importAudit.ts')
  const { buildCertifiedUnitRoster } = await vite.ssrLoadModule('/src/lib/unitModels.ts')

  // Parcours utilisateur : import Tabletop Admiral -> audit -> effectif exploitable.
  const imported = importArmyList(fs.readFileSync(new URL('./fixtures/tabletop-admiral-rebel.json', import.meta.url), 'utf8'))
  const audit = auditImportedList(imported)
  assert.ok(imported.units.length > 0, 'La liste importée doit proposer des unités')
  assert.ok(audit.cards >= imported.units.length, 'Toutes les cartes importées doivent être auditées')
  assert.ok(buildCertifiedUnitRoster(imported.units[0]).models.length > 0, 'Une unité certifiée doit produire son effectif')

  // Une future carte ne doit jamais être prise pour une simple traduction manquante.
  const future = importArmyList(JSON.stringify({ listname: 'Future', armyFaction: 'empire', units: [{ name: 'Future Unit Alpha', upgrades: ['Future Upgrade Beta'] }] }))
  const futureAudit = auditImportedList(future)
  assert.ok(futureAudit.issues.some((issue) => issue.card === 'Future Unit Alpha' && issue.resolution === 'unknown-card'))
  assert.ok(futureAudit.issues.some((issue) => issue.card === 'Future Upgrade Beta' && issue.resolution === 'unknown-card'))

  // Parcours résolution : portée -> réserve -> couvert -> défense -> blessures.
  const sandbox = { window: {} }
  vm.runInNewContext(fs.readFileSync(new URL('../public/assistant/attack-engine-v32.js', import.meta.url), 'utf8'), sandbox)
  const engine = sandbox.window.SWL_ATTACK_ENGINE
  assert.equal(engine.weaponEligible('1-3', 2), true)
  const pool = engine.buildPool([{ key: 'fusil', weapon: { dice: [{ color: 'noir', count: 1 }] } }], { fusil: 2 })
  assert.equal(pool.noir, 2)
  const covered = engine.applyCover({ hit: 2, crit: 1 }, { melee: false, cover: 'light', coverBlock: 1, coverSurge: 0, dodges: 0 })
  const defended = engine.applyDefense(covered, { block: 1, surge: 0 }, { defenseSurge: null, pierceX: 0 })
  assert.equal(defended.wounds, 1)
  assert.equal(engine.allocateWounds([{ id: 'cible', maxWounds: 2, wounds: 0 }], defended.wounds).models[0].wounds, 1)

  console.log('Parcours utilisateur: import, diagnostic, attaque et blessures OK')
} finally {
  await vite.close()
}
