import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const sandbox = { window: {} }
vm.runInNewContext(
  fs.readFileSync(new URL('../public/assistant/attack-engine.js', import.meta.url), 'utf8'),
  sandbox,
)

const engine = sandbox.window.SWL_ATTACK_ENGINE

assert.equal(engine.weaponEligible('1-3', 1), true)
assert.equal(engine.weaponEligible('1-3', 3), true)
assert.equal(engine.weaponEligible('1-3', 4), false)
assert.equal(engine.weaponEligible('melee', 'melee'), true)
assert.equal(engine.weaponEligible('melee', 1), false)
assert.deepEqual([...engine.rangeOptions([{ range: 'melee' }, { range: '2-4' }])], ['melee', 2, 3, 4])

const pool = engine.buildPool([
  { key: 'e11', weapon: { dice: [{ color: 'blanc', count: 1 }] } },
  { key: 'hh12', weapon: { dice: [{ color: 'noir', count: 3 }] } },
], { e11: 3, hh12: 1 })
assert.deepEqual({ ...pool }, { rouge: 0, noir: 3, blanc: 3, variable: false })

assert.equal(engine.rerollCapacity(2, 1), 6)
assert.deepEqual(
  { ...engine.convertAttack({ hit: 2, crit: 0, surge: 3 }, 'hit', 1) },
  { hit: 4, crit: 1, unusedSurge: 0, criticalUsed: 1 },
)

const armor = engine.applyImpactArmor(
  { hit: 4, crit: 1 },
  { hasArmor: true, impactX: 3, impactUsed: 3, armorUnlimited: true, armorCancelled: 1 },
)
assert.deepEqual({ ...armor }, { hit: 0, crit: 4, impactUsed: 3, armorCancelled: 1 })

const cover = engine.applyCover(
  { hit: 4, crit: 2 },
  { melee: false, cover: 'heavy', coverBlock: 1, coverSurge: 1, dodges: 1 },
)
assert.deepEqual({ ...cover }, { hit: 1, crit: 2, coverCancelled: 2, dodgesUsed: 1 })

const defense = engine.applyDefense(
  { hit: 1, crit: 2 },
  { block: 1, surge: 1 },
  { defenseSurge: 'block', pierceX: 1, pierceUsed: 1, pierceImmune: false },
)
assert.deepEqual({ ...defense }, { converted: 2, pierceUsed: 1, blocks: 1, wounds: 2 })

const immuneDefense = engine.applyDefense(
  { hit: 1, crit: 2 },
  { block: 1, surge: 1 },
  { defenseSurge: 'block', pierceX: 3, pierceUsed: 3, pierceImmune: true },
)
assert.deepEqual({ ...immuneDefense }, { converted: 2, pierceUsed: 0, blocks: 2, wounds: 1 })

console.log('Assistant attack engine: 20 assertions OK')
