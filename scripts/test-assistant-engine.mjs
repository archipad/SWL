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

const cumbersomePool = engine.buildPool([
  { key: 'weapon', weapon: { dice: [{ color: 'rouge', count: 1 }, { color: 'noir', count: 2 }] } },
], { weapon: 1 }, new Set(['weapon']))
assert.deepEqual({ ...cumbersomePool }, { rouge: 0, noir: 1, blanc: 2, variable: false })
assert.equal(engine.effectiveCover('heavy', 1, false, false), 'light')
assert.equal(engine.effectiveCover('heavy', 2, false, false), 'none')
assert.equal(engine.effectiveCover('heavy', 0, true, false), 'none')
assert.equal(engine.effectiveCover('heavy', 0, true, true), 'heavy')

assert.equal(engine.rerollCapacity(2, 1), 6)
assert.deepEqual({ ...engine.applyLethal(1, 2, 1) }, { lethalUsed: 1, pierce: 2 })
assert.deepEqual({ ...engine.applyLethal(0, 2, 4) }, { lethalUsed: 2, pierce: 2 })
assert.deepEqual(
  { ...engine.convertAttack({ hit: 2, crit: 0, surge: 3 }, 'hit', 1) },
  { hit: 4, crit: 1, unusedSurge: 0, criticalUsed: 1, printedToHit: 2, printedToCrit: 0 },
)
assert.deepEqual(
  { ...engine.convertAttack({ hit: 0, crit: 0, surge: 2 }, 'crit', 0) },
  { hit: 0, crit: 2, unusedSurge: 0, criticalUsed: 0, printedToHit: 0, printedToCrit: 2 },
)
assert.deepEqual(
  { ...engine.convertAttack({ hit: 0, crit: 0, surge: 2 }, null, 0) },
  { hit: 0, crit: 0, unusedSurge: 2, criticalUsed: 0, printedToHit: 0, printedToCrit: 0 },
)

const armor = engine.applyImpactArmor(
  { hit: 4, crit: 1 },
  { hasArmor: true, impactX: 3, impactUsed: 3, armorUnlimited: true, armorCancelled: 1 },
)
assert.deepEqual({ ...armor }, { hit: 0, crit: 4, impactUsed: 3, armorCancelled: 1 })

const shields = engine.applyShields(
  { hit: 3, crit: 2 },
  { activeShields: 4, ionEligible: true, ionX: 1, ranged: true, shieldHit: 2, shieldCrit: 1 },
)
assert.deepEqual({ ...shields }, { hit: 1, crit: 1, ionFlipped: 1, hitCancelled: 2, critCancelled: 1, shieldsSpent: 3, shieldsRemaining: 0 })

const meleeShields = engine.applyShields(
  { hit: 2, crit: 1 },
  { activeShields: 3, ionEligible: false, ionX: 0, ranged: false, shieldHit: 2, shieldCrit: 1 },
)
assert.deepEqual({ ...meleeShields }, { hit: 2, crit: 1, ionFlipped: 0, hitCancelled: 0, critCancelled: 0, shieldsSpent: 0, shieldsRemaining: 0 })

const guardian = engine.applyGuardian(
  { hit: 3, crit: 1 }, { block: 1, surge: 1 },
  { eligible: true, guardianX: 2, hitsCancelled: 2, defenseSurge: 'block', pierceAvailable: 2, pierceImmune: false },
)
assert.deepEqual({ ...guardian }, { hit: 1, crit: 1, hitsCancelled: 2, converted: 2, pierceUsed: 2, blocks: 0, wounds: 2, pierceRemaining: 0 })

const cover = engine.applyCover(
  { hit: 4, crit: 2 },
  { melee: false, cover: 'heavy', coverBlock: 1, coverSurge: 1, dodges: 1 },
)
assert.deepEqual({ ...cover }, { hit: 1, crit: 2, coverCancelled: 2, dodgesUsed: 1 })

const noCover = engine.applyCover(
  { hit: 3, crit: 1 },
  { melee: false, cover: 'none', coverBlock: 2, coverSurge: 2, dodges: 1 },
)
assert.deepEqual({ ...noCover }, { hit: 2, crit: 1, coverCancelled: 0, dodgesUsed: 1 })

const defense = engine.applyDefense(
  { hit: 1, crit: 2 },
  { block: 1, surge: 1 },
  { defenseSurge: 'block', pierceX: 1, pierceUsed: 1, pierceImmune: false },
)
assert.deepEqual({ ...defense }, { converted: 2, pierceUsed: 1, blocks: 1, wounds: 2 })

const automaticPierce = engine.applyDefense(
  { hit: 2, crit: 1 },
  { block: 2, surge: 0 },
  { defenseSurge: null, pierceX: 2, pierceUsed: 0, pierceImmune: false },
)
assert.deepEqual({ ...automaticPierce }, { converted: 2, pierceUsed: 2, blocks: 0, wounds: 3 })

const immuneDefense = engine.applyDefense(
  { hit: 1, crit: 2 },
  { block: 1, surge: 1 },
  { defenseSurge: 'block', pierceX: 3, pierceUsed: 3, pierceImmune: true },
)
assert.deepEqual({ ...immuneDefense }, { converted: 2, pierceUsed: 0, blocks: 2, wounds: 1 })

console.log('Assistant attack engine: 34 assertions OK')
