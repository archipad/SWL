import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const sandbox = { window: {} }
vm.runInNewContext(
  fs.readFileSync(new URL('../public/assistant/attack-engine-v32.js', import.meta.url), 'utf8'),
  sandbox,
)

const engine = sandbox.window.SWL_ATTACK_ENGINE

assert.equal(engine.weaponEligible('1-3', 1), true)
assert.equal(engine.weaponEligible('1-3', 3), true)
assert.equal(engine.weaponEligible('1-3', 4), false)
assert.equal(engine.weaponEligible('melee', 'melee'), true)
assert.equal(engine.weaponEligible('melee', 1), false)
assert.equal(engine.weaponEligible('melee-1', 'melee'), true)
assert.equal(engine.weaponEligible('melee-1', 1), true)
assert.equal(engine.weaponEligible('melee-1', 2), false)
assert.equal(engine.weaponEligible('4-#', 3), false)
assert.equal(engine.weaponEligible('4-#', 4), true)
assert.equal(engine.weaponEligible('4-#', 8), true)
assert.equal(engine.weaponEligible('1-3', 4, 1), true)
assert.equal(engine.weaponEligible('1-3', 4, 0), false)
assert.deepEqual({ ...engine.applyCover({ hit: 2, crit: 2 }, { cover: 'none', dodges: 1, dodgeCrits: 1, dodgeCritsAllowed: true }) }, { hit: 1, crit: 1, coverCancelled: 0, dodgesUsed: 2, hitDodgesUsed: 1, critDodgesUsed: 1 })
assert.deepEqual({ ...engine.resolveStatusEffects({ wounds: 2, immobilizeX: 2, poisonX: 1, towCable: true, scatter: true, targetVehicle: true, targetNonDroidTrooper: true, targetSmallTrooper: true }) }, { immobilize: 3, poison: 1, towCablePivot: true, scatter: true })
assert.deepEqual({ ...engine.resolveStatusEffects({ wounds: 0, immobilizeX: 2, poisonX: 1, towCable: true, targetVehicle: true }) }, { immobilize: 0, poison: 0, towCablePivot: false, scatter: false })
assert.equal(engine.weaponBlockedByImmunity({ range: 'melee' }, { immuneMelee: true }), true)
assert.equal(engine.weaponBlockedByImmunity({ range: '1' }, { immuneRange1: true }), true)
assert.equal(engine.weaponBlockedByImmunity({ range: '1-3' }, { immuneRange1: true }), false)
assert.equal(engine.effectivePierce(3, true), 2)
assert.equal(engine.effectivePierce(1, true), 0)
assert.equal(engine.effectivePierce(3, false), 3)
assert.equal(engine.defenseRerollCapacity(2), 2)
assert.equal(engine.defenseRerollCapacity(null), 0)
assert.equal(engine.suppressionTokens({ ranged: true, hadAttackResult: true }), 1)
assert.equal(engine.suppressionTokens({ ranged: true, hadAttackResult: true, suppressive: true, overwhelm: true, aimSpent: true }), 3)
assert.equal(engine.suppressionTokens({ ranged: false, hadAttackResult: true, suppressive: true, overwhelm: true, aimSpent: true }), 0)
assert.equal(engine.suppressionTokens({ ranged: true, hadAttackResult: true, suppressive: true, vehicle: true }), 0)
assert.deepEqual({ ...engine.moraleState({ currentSuppression: 0, gainedSuppression: 1, courage: 1 }) }, { current: 0, gained: 1, total: 1, courage: 1, suppressed: true, panicThreshold: 2, panicRisk: false })
assert.deepEqual({ ...engine.moraleState({ currentSuppression: 1, gainedSuppression: 1, courage: 1 }) }, { current: 1, gained: 1, total: 2, courage: 1, suppressed: true, panicThreshold: 2, panicRisk: true })
assert.deepEqual({ ...engine.moraleState({ currentSuppression: 2, gainedSuppression: 1, courage: 1, commanderCourage: 2 }) }, { current: 2, gained: 1, total: 3, courage: 2, suppressed: true, panicThreshold: 4, panicRisk: false })
assert.deepEqual({ ...engine.moraleState({ currentSuppression: 2, courage: 2, commanderCourage: 3 }) }, { current: 2, gained: 0, total: 2, courage: 3, suppressed: true, panicThreshold: 6, panicRisk: false })
assert.deepEqual({ ...engine.moraleState({ currentSuppression: 3, gainedSuppression: 2, courage: 1, nullCourage: true }) }, { current: 0, gained: 0, total: 0, courage: null, suppressed: false, panicThreshold: null, panicRisk: false })
assert.deepEqual({ ...engine.applyImpactArmor({ hit: 2, crit: 1 }, { hasArmor: true, impactX: 1, impactUsed: 1, primitive: true, armorUnlimited: true, armorCancelled: 2 }) }, { hit: 1, crit: 0, impactUsed: 1, primitiveConverted: 2, armorCancelled: 2 })
assert.deepEqual([...engine.rangeOptions([{ range: 'melee' }, { range: '2-4' }])], ['melee', 2, 3, 4])
assert.deepEqual([...engine.rangeOptions([{ range: 'melee-1' }, { range: '4-#' }])], ['melee', 1, 4])

const multiWeaponProfile = { weapons: [{ name: 'Pinces', keywordIds: [] }, { name: 'Canon', keywordIds: ['impact-x'] }] }
assert.equal(engine.weaponKeywordActive(multiWeaponProfile, multiWeaponProfile.weapons[0], ['impact-x'], 'impact-x'), false)
assert.equal(engine.weaponKeywordActive(multiWeaponProfile, multiWeaponProfile.weapons[1], ['impact-x'], 'impact-x'), true)
assert.equal(engine.weaponKeywordActive({ weapons: [{ name: 'Fusil' }] }, { name: 'Fusil' }, ['impact-x'], 'impact-x'), true)
assert.equal(engine.weaponKeywordActive({ weapons: [{ name: 'A' }, { name: 'B' }] }, { name: 'A' }, ['impact-x'], 'impact-x'), false)
assert.equal(engine.effectiveDefenseSurge(null, true, 1), 'block')
assert.equal(engine.effectiveDefenseSurge(null, true, 0), null)
assert.equal(engine.effectiveDefenseSurge('block', false, 0), 'block')

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
const lowProfileCover = engine.applyCover(
  { hit: 3, crit: 1 },
  { melee: false, cover: 'light', coverBlock: 0, coverSurge: 0, automaticBlock: 1, dodges: 0 },
)
assert.deepEqual({ ...lowProfileCover }, { hit: 2, crit: 1, coverCancelled: 1, dodgesUsed: 0 })
const ignoredLowProfile = engine.applyCover(
  { hit: 2, crit: 0 },
  { melee: false, cover: 'none', coverBlock: 0, coverSurge: 0, automaticBlock: 1, dodges: 0 },
)
assert.deepEqual({ ...ignoredLowProfile }, { hit: 2, crit: 0, coverCancelled: 0, dodgesUsed: 0 })

const noCover = engine.applyCover(
  { hit: 3, crit: 1 },
  { melee: false, cover: 'none', coverBlock: 2, coverSurge: 2, dodges: 1 },
)
assert.deepEqual({ ...noCover }, { hit: 2, crit: 1, coverCancelled: 0, dodgesUsed: 1 })

// L'ordre officiel est Couvert/Esquive puis Modification des dés d'attaque.
// Une touche annulée par le couvert ne peut donc plus être convertie par Impact.
const coveredBeforeImpact = engine.applyCover(
  { hit: 3, crit: 0 },
  { melee: false, cover: 'light', coverBlock: 1, coverSurge: 0, dodges: 0 },
)
const impactedAfterCover = engine.applyImpactArmor(
  coveredBeforeImpact,
  { hasArmor: true, impactX: 3, impactUsed: 3, armorUnlimited: true, armorCancelled: 0 },
)
assert.deepEqual({ ...impactedAfterCover }, { hit: 0, crit: 2, impactUsed: 2, armorCancelled: 0 })

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

const ramApplied = engine.applyRam({ hit: 2, crit: 1, unusedSurge: 1 }, 2, true)
assert.deepEqual({ ...ramApplied }, { hit: 1, crit: 3, unusedSurge: 0, ramUsed: 2 })
const ramUnavailable = engine.applyRam({ hit: 2, crit: 1, unusedSurge: 1 }, 2, false)
assert.deepEqual({ ...ramUnavailable }, { hit: 2, crit: 1, unusedSurge: 1, ramUsed: 0 })

// Scénario complet : conversion -> couvert/esquive -> Impact/Armure -> défense/Perforant.
const combinedConverted = engine.convertAttack({ hit: 3, crit: 1, surge: 2, blank: 0 }, 'hit', 1)
assert.deepEqual({ ...combinedConverted }, { hit: 4, crit: 2, unusedSurge: 0, criticalUsed: 1, printedToHit: 1, printedToCrit: 0 })
const combinedCovered = engine.applyCover(combinedConverted, { melee: false, cover: 'heavy', coverBlock: 1, coverSurge: 1, dodges: 1 })
assert.deepEqual({ ...combinedCovered }, { hit: 1, crit: 2, coverCancelled: 2, dodgesUsed: 1 })
const combinedArmored = engine.applyImpactArmor(combinedCovered, { hasArmor: true, impactX: 2, impactUsed: 2, armorUnlimited: true, armorCancelled: 0 })
assert.deepEqual({ ...combinedArmored }, { hit: 0, crit: 3, impactUsed: 1, armorCancelled: 0 })
const combinedDefense = engine.applyDefense(combinedArmored, { block: 2, surge: 1 }, { defenseSurge: 'block', pierceX: 1, pierceImmune: false })
assert.deepEqual({ ...combinedDefense }, { converted: 3, pierceUsed: 1, blocks: 2, wounds: 1 })

// En corps-à-corps, les dés de couvert saisis ne modifient jamais les résultats.
const meleeIgnoresCover = engine.applyCover({ hit: 3, crit: 1 }, { melee: true, cover: 'heavy', coverBlock: 3, coverSurge: 3, automaticBlock: 1, dodges: 0 })
assert.deepEqual({ ...meleeIgnoresCover }, { hit: 3, crit: 1, coverCancelled: 0, dodgesUsed: 0 })

const casualties = engine.allocateWounds([{ id: 'chef', maxWounds: 2, wounds: 1 }, { id: 'soldat', maxWounds: 1, wounds: 0 }], 2)
assert.deepEqual(casualties.models.map(model => ({ id: model.id, wounds: model.wounds, defeated: model.defeated })), [{ id: 'chef', wounds: 2, defeated: true }, { id: 'soldat', wounds: 1, defeated: true }])
assert.equal(casualties.remaining, 0)
assert.equal(casualties.overflow, 0)
const rally = engine.rallyState({ suppression: 4, block: 1, surge: 1, courage: 2 })
assert.deepEqual({ ...rally }, { before: 4, dice: 4, removed: 2, remaining: 2, courage: 2, suppressed: true, panicked: false })
assert.deepEqual({ ...engine.rallyState({ suppression: 5, block: 0, surge: 0, courage: 2 }) }, { before: 5, dice: 5, removed: 0, remaining: 5, courage: 2, suppressed: true, panicked: true })
assert.deepEqual({ ...engine.rallyState({ suppression: 3, block: 0, surge: 0, courage: null, nullCourage: true }) }, { before: 0, dice: 0, removed: 0, remaining: 0, courage: null, suppressed: false, panicked: false })

// Matrice de non-régression pour l’état persistant et le respect de l’ordre des règles.
const commanderMorale = engine.moraleState({ currentSuppression: 2, courage: 2, commanderCourage: 3 })
assert.equal(commanderMorale.suppressed, true, 'Le courage du commandant ne retire pas l’état démoralisé')
assert.equal(commanderMorale.panicRisk, false, 'Le courage du commandant augmente bien le seuil de panique')
const mixedCasualties = engine.allocateWounds([
  { id: 'soldat', maxWounds: 1, wounds: 0 },
  { id: 'chef', maxWounds: 3, wounds: 0 },
], 3)
assert.deepEqual(mixedCasualties.models.map(model => [model.id, model.wounds, model.defeated]), [['soldat', 1, true], ['chef', 2, false]])
assert.equal(mixedCasualties.remaining, 1)
const persistentEffects = engine.resolveStatusEffects({ wounds: 1, immobilizeX: 2, poisonX: 1, targetNonDroidTrooper: true })
assert.equal(persistentEffects.immobilize, 2)
assert.equal(persistentEffects.poison, 1)
assert.equal(engine.suppressionTokens({ ranged: true, hadAttackResult: true, suppressive: true, vehicle: true }), 0)

console.log('Assistant attack engine: matrice complète OK')
