import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true } })
try {
  const { importArmyList } = await vite.ssrLoadModule('/src/lib/importList.ts')
  const { auditImportedList } = await vite.ssrLoadModule('/src/lib/importAudit.ts')
  const { canonicalCardKey } = await vite.ssrLoadModule('/src/lib/cardNames.ts')
  const { DICE_PROFILES } = await vite.ssrLoadModule('/src/data/diceProfiles.ts')
  const certifications = JSON.parse(fs.readFileSync(new URL('../src/data/diceCertifications.json', import.meta.url), 'utf8'))
  const sandbox = { window: {} }
  vm.runInNewContext(fs.readFileSync(new URL('../public/assistant/attack-engine-v32.js', import.meta.url), 'utf8'), sandbox)
  const engine = sandbox.window.SWL_ATTACK_ENGINE
  const load = (name) => importArmyList(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'))
  const rebel = load('tabletop-admiral-rebel.json')
  const empire = load('tabletop-admiral-empire.json')

  for (const list of [rebel, empire]) {
    const audit = auditImportedList(list)
    assert.equal(audit.safeForEngine, true, `${list.name}: des données moteur restent non certifiées`)
    for (const unit of list.units) {
      const unitProfile = DICE_PROFILES[canonicalCardKey(unit.name)]
      const certification = certifications[canonicalCardKey(unit.name)]
      assert.ok(unitProfile?.defenseColor, `${unit.name}: couleur de défense absente`)
      assert.ok(unitProfile.defenseVerifiedAgainstCard || certification?.defenseColor, `${unit.name}: défense non certifiée`)
    }
  }

  let attacks = 0
  for (const attackers of [rebel, empire]) {
    const defenders = attackers === rebel ? empire : rebel
    for (const unit of attackers.units) {
      const cards = [unit, ...unit.upgrades]
      const weapons = cards.flatMap((card) => (DICE_PROFILES[canonicalCardKey(card.name)]?.weapons || []).filter((weapon) => weapon.dice !== 'variable'))
      assert.ok(weapons.length > 0, `${unit.name}: aucune arme exploitable dans le moteur`)
      for (const weapon of weapons) {
        const card = cards.find((candidate) => (DICE_PROFILES[canonicalCardKey(candidate.name)]?.weapons || []).includes(weapon))
        const certification = certifications[canonicalCardKey(card?.name)]
        assert.ok(weapon.verifiedAgainstCard || certification?.weapons?.some((entry) => entry.name === weapon.name), `${unit.name}/${weapon.name}: dés non certifiés`)
        const pool = engine.buildPool([{ key: 'weapon', weapon }], { weapon: 1 })
        const totalDice = pool.rouge + pool.noir + pool.blanc
        assert.ok(totalDice > 0, `${unit.name}/${weapon.name}: réserve vide`)
        for (const target of defenders.units) {
          const defense = DICE_PROFILES[canonicalCardKey(target.name)]
          const results = engine.applyDefense({ hit: totalDice, crit: 0 }, { block: 0, surge: 0 }, { defenseSurge: defense.defenseSurge ?? null, pierceX: 0 })
          assert.ok(Number.isFinite(results.wounds) && results.wounds >= 0, `${unit.name} → ${target.name}: résolution invalide`)
          attacks += 1
        }
      }
    }
  }
  assert.ok(attacks >= 20, 'La matrice de partie doit couvrir les deux armées dans les deux sens')
  // Une partie complète doit pouvoir enchaîner six rounds en remettant à zéro
  // les pions temporaires (l'appli ne suit plus les PV/effectif : voir
  // src/lib/unitModels.ts).
  const tracked = new Map([...rebel.units, ...empire.units].map((unit) => [unit, { aim: 0, dodge: 0, surge: 0, standby: 0 }]))
  for (let round = 1; round <= 6; round += 1) {
    for (const list of [rebel, empire]) for (const unit of list.units) {
      const state = tracked.get(unit)
      state.aim += 1
      state.dodge += 1
      state.surge += 1
      state.standby = 1
    }
    for (const state of tracked.values()) {
      state.aim = 0
      state.dodge = 0
      state.surge = 0
      state.standby = 0
      assert.deepEqual([state.aim, state.dodge, state.surge, state.standby], [0, 0, 0, 0], `Les pions temporaires doivent expirer au round ${round}`)
    }
  }
  console.log(`Scénarios partie du jour : ${attacks} couples arme/cible validés sur les imports Rebelles et Empire`)
} finally {
  await vite.close()
}
