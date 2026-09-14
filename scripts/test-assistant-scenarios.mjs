import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const sandbox = { window: {} }
vm.runInNewContext(fs.readFileSync(new URL('../public/assistant/attack-engine-v32.js', import.meta.url), 'utf8'), sandbox)
const engine = sandbox.window.SWL_ATTACK_ENGINE

// Parcours 1 : attaque à distance complète, couvert lourd, défense, blessures et moral.
const rangedConverted = engine.convertAttack({ hit: 4, crit: 1, surge: 2, blank: 1 }, 'hit', 1)
const rangedCovered = engine.applyCover(rangedConverted, { melee: false, cover: 'heavy', coverBlock: 1, coverSurge: 1, dodges: 1 })
const rangedArmored = engine.applyImpactArmor(rangedCovered, { hasArmor: true, impactX: 1, impactUsed: 1, armorUnlimited: true })
const rangedDefense = engine.applyDefense(rangedArmored, { block: 1, surge: 1 }, { defenseSurge: 'block', pierceX: 1 })
assert.deepEqual({ hit: rangedDefense.wounds, suppression: engine.suppressionTokens({ ranged: true, hadAttackResult: true, suppressive: true }) }, { hit: 3, suppression: 2 })
const rangedCasualties = engine.allocateWounds([
  { id: 'soldat-1', maxWounds: 1, wounds: 0 },
  { id: 'soldat-2', maxWounds: 1, wounds: 0 },
  { id: 'chef', maxWounds: 1, wounds: 0 },
], rangedDefense.wounds)
assert.equal(rangedCasualties.remaining, 0)
assert.equal(engine.moraleState({ currentSuppression: 0, gainedSuppression: 2, courage: 1 }).panicRisk, true)

// Parcours 2 : le corps-à-corps ignore le couvert et conserve les PV d'une figurine multi-PV.
const meleeCovered = engine.applyCover({ hit: 3, crit: 1 }, { melee: true, cover: 'heavy', coverBlock: 8, coverSurge: 8, dodges: 0 })
const meleeDefense = engine.applyDefense(meleeCovered, { block: 1, surge: 0 }, { defenseSurge: null, pierceX: 0 })
const meleeCasualties = engine.allocateWounds([
  { id: 'monture-1', maxWounds: 4, wounds: 2 },
  { id: 'monture-2', maxWounds: 4, wounds: 0 },
], meleeDefense.wounds)
assert.equal(meleeCovered.coverCancelled, 0)
assert.deepEqual(meleeCasualties.models.map((model) => model.wounds), [4, 1])
assert.equal(meleeCasualties.remaining, 1)
assert.equal(engine.suppressionTokens({ ranged: false, hadAttackResult: true, suppressive: true }), 0)

// Parcours 3 : ralliement exact, courage du commandant et immunités explicites/implicites.
assert.deepEqual(
  { ...engine.rallyState({ suppression: 4, block: 1, surge: 1, courage: 2, commanderCourage: 3 }) },
  { before: 4, dice: 4, removed: 2, remaining: 2, courage: 3, suppressed: true, panicked: false },
)
for (const immune of [
  { courage: null },
  { courage: 2, suppressionImmune: true },
  { courage: 2, vehicle: true },
]) {
  assert.equal(engine.moraleState({ currentSuppression: 5, gainedSuppression: 2, ...immune }).total, 0)
  assert.equal(engine.rallyState({ suppression: 5, block: 2, surge: 2, ...immune }).dice, 0)
}

// Parcours 4 : les dégâts excédentaires ne créent ni PV négatifs ni figurines fantômes.
const overkill = engine.allocateWounds([
  { id: 'chef', maxWounds: 3, wounds: 2 },
  { id: 'personnel', maxWounds: 1, wounds: 0 },
], 9)
assert.deepEqual(overkill.models.map((model) => [model.id, model.wounds, model.defeated]), [
  ['chef', 3, true],
  ['personnel', 1, true],
])
assert.equal(overkill.applied, 2)
assert.equal(overkill.overflow, 7)

// Parcours 5 : interaction Létal + Perforant + Insensible, sans double dépense du pion Viser.
const lethal = engine.applyLethal(1, 2, 1)
assert.deepEqual({ ...lethal }, { lethalUsed: 1, pierce: 2 })
const imperviousPierce = engine.effectivePierce(lethal.pierce, true)
assert.equal(imperviousPierce, 1)
const lethalDefense = engine.applyDefense({ hit: 2, crit: 1 }, { block: 2, surge: 0 }, { defenseSurge: null, pierceX: imperviousPierce, pierceImmune: false })
assert.deepEqual({ ...lethalDefense }, { converted: 2, pierceUsed: 1, blocks: 1, wounds: 2 })

// Parcours 6 : Bélier ne convertit que les résultats disponibles et seulement si sa condition est remplie.
assert.deepEqual({ ...engine.applyRam({ hit: 1, crit: 0, unusedSurge: 2 }, 3, true) }, { hit: 0, crit: 3, unusedSurge: 0, ramUsed: 3 })
assert.deepEqual({ ...engine.applyRam({ hit: 1, crit: 0, unusedSurge: 2 }, 3, false) }, { hit: 1, crit: 0, unusedSurge: 2, ramUsed: 0 })

console.log('Assistant scenarios: parcours attaque, moral, ralliement et multi-PV OK')
