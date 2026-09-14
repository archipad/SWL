import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'vite';
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true } });
try {
  const { importArmyList } = await vite.ssrLoadModule('/src/lib/importList.ts');
  const { auditImportedList } = await vite.ssrLoadModule('/src/lib/importAudit.ts');
  const { buildCertifiedUnitRoster } = await vite.ssrLoadModule('/src/lib/unitModels.ts');
  const { canonicalCardKey } = await vite.ssrLoadModule('/src/lib/cardNames.ts');
  const { frenchCardName } = await vite.ssrLoadModule('/src/lib/cardNames.ts');
  const { cardImageFor } = await vite.ssrLoadModule('/src/data/cardImages.ts');
  const { DICE_PROFILES } = await vite.ssrLoadModule('/src/data/diceProfiles.ts');
  const tabletopAdmiral = { listname: 'Régression import Rebel', points: 800, armyFaction: 'rebel', units: [
    { name: 'Rebel Troopers', upgrades: ['Z-6 Trooper', 'Rebel Trooper', 'Fragmentation Grenades'], loadout: ['Prepared Supplies', 'Prepared Supplies'] },
    { name: 'Rebel Troopers', upgrades: ['Fragmentation Grenades'] },
  ] };
  const imported = importArmyList(JSON.stringify(tabletopAdmiral));
  assert.equal(imported.faction, 'Alliance Rebelle');
  assert.equal(imported.totalPoints, 800);
  assert.deepEqual(imported.units.map((unit) => unit.key), ['rebel troopers', 'rebel troopers-2']);
  assert.deepEqual(imported.units[0].upgrades.map((upgrade) => upgrade.key), ['z 6 trooper', 'rebel trooper', 'fragmentation grenades', 'prepared supplies', 'prepared supplies-2']);
  const reimported = importArmyList(JSON.stringify({ ...tabletopAdmiral, units: [{ ...tabletopAdmiral.units[0], upgrades: ['Impact Grenades'] }, tabletopAdmiral.units[1]] }));
  assert.deepEqual(reimported.units.map((unit) => unit.key), imported.units.map((unit) => unit.key));
  const roster = buildCertifiedUnitRoster(imported.units[0]);
  assert.equal(roster.certified, true);
  assert.equal(roster.models.length, 6, '4 soldats de base + Z-6 + soldat supplémentaire');
  assert.equal(roster.models.reduce((sum, model) => sum + model.maxWounds, 0), 6);
  const squadRoster = buildCertifiedUnitRoster({ name: 'Rebel Troopers', key: 'squad-test', upgrades: [{ name: 'Rebel Trooper Squad', key: 'squad' }] });
  assert.equal(squadRoster.models.length, 9, 'Une amélioration Escouade doit ajouter ses 5 figurines aux 4 de base');
  assert.equal(squadRoster.models.reduce((sum, model) => sum + model.maxWounds, 0), 9, 'Les figurines multiples héritent des PV de la carte Unité');
  const heterogeneousRoster = buildCertifiedUnitRoster({ name: 'Darth Vader, Dark Lord of the Sith', key: 'heterogeneous-test', upgrades: [{ name: "Darth Vader, The Emperor's Apprentice", key: 'apprentice' }] });
  assert.equal(heterogeneousRoster.models.length, 2, 'L’amélioration doit ajouter un profil distinct au socle de l’unité');
  assert.deepEqual(heterogeneousRoster.models.map((model) => model.maxWounds), [8, 7], 'Chaque figurine conserve ses propres PV certifiés');
  const grenade = DICE_PROFILES[canonicalCardKey('Grenades à Fragmentation')];
  assert.ok(grenade, 'Le nom français doit résoudre le profil anglais certifié');
  assert.deepEqual(grenade.weapons[0].dice, [{ color: 'rouge', count: 1 }]);
  assert.equal(grenade.weapons[0].range, '1');
  assert.equal(grenade.weapons[0].attackSurge, 'crit');
  const tabletopAliases = [
    ['Into the Fray', 'in the fray', 'Dans la Mêlée'],
    ['AT-RT Laser Cannon', 'tl tt laser cannon', 'Canon Laser de TL-TT'],
    ['Up Close and Personal', 'point blank', 'À Bout Portant'],
  ];
  for (const [importedName, expectedKey, expectedFrenchName] of tabletopAliases) {
    assert.equal(canonicalCardKey(importedName), expectedKey);
    assert.equal(frenchCardName(importedName), expectedFrenchName);
    assert.ok(cardImageFor(importedName), `${importedName}: visuel non raccordé après résolution de l’alias`);
  }
  assert.ok(cardImageFor("Transpondeur d'Urgence"), 'Le visuel français du Transpondeur d’Urgence doit être raccordé');
  const audit = auditImportedList(imported);
  assert.equal(audit.safeForEngine, true, audit.certificationIssues.map((issue) => issue.message).join('; '));
  assert.equal(audit.units[0].models, 6);
  assert.equal(audit.units[0].maxWounds, 6);
  for (const fixtureName of ['tabletop-admiral-rebel.json', 'tabletop-admiral-empire.json']) {
    const fixture = fs.readFileSync(new URL(`./fixtures/${fixtureName}`, import.meta.url), 'utf8');
    const fixtureList = importArmyList(fixture);
    const fixtureAudit = auditImportedList(fixtureList);
    assert.ok(fixtureList.units.length >= 3, `${fixtureName}: unités manquantes après import`);
    assert.equal(fixtureAudit.safeForEngine, true, `${fixtureName}: ${fixtureAudit.certificationIssues.map((issue) => issue.message).join('; ')}`);
    assert.ok(fixtureAudit.units.every((unit) => unit.models && unit.maxWounds), `${fixtureName}: effectif ou PV non calculé`);
  }
  // Régression du 14/09/2026 (ajout de la faction Mercenaire, cartes
  // certifiées uniquement via src/data/customCards.json, sans entrée dans
  // diceCertifications.json) : buildCertifiedUnitRoster() signalait à tort
  // un effectif non calculable pour ce genre de carte avant que la fusion
  // CUSTOM_CARDS ne soit ajoutée dans unitModels.ts.
  const customCardRoster = buildCertifiedUnitRoster({ name: 'IG-88', key: 'ig-88-test', upgrades: [] });
  assert.equal(customCardRoster.certified, true, 'Une unité certifiée seulement via customCards.json doit être reconnue');
  assert.equal(customCardRoster.models.length, 1);
  assert.equal(customCardRoster.models[0].maxWounds, 5);
  const rebelAgent = DICE_PROFILES[canonicalCardKey('Rebel Agent Defender of Democracy')];
  assert.ok(rebelAgent, 'L’Agent Rebelle personnalisable doit être reconnu directement après import Tabletop Admiral');
  assert.deepEqual(rebelAgent.weapons.map((weapon) => weapon.dice), [
    [{ color: 'noir', count: 3 }],
    [{ color: 'noir', count: 1 }, { color: 'blanc', count: 2 }],
  ]);
  assert.equal(rebelAgent.defenseColor, 'blanc');
  assert.equal(rebelAgent.attackSurge, 'hit');
  assert.equal(rebelAgent.defenseSurge, 'block');
  const rebelAgentRoster = buildCertifiedUnitRoster({ name: 'Rebel Agent Defender of Democracy', key: 'rebel-agent-test', upgrades: [] });
  assert.equal(rebelAgentRoster.models.length, 1);
  assert.equal(rebelAgentRoster.models[0].maxWounds, 5);
  assert.ok(cardImageFor('Rebel Agent Defender of Democracy'));
  assert.equal(frenchCardName('Rebel Agent Defender of Democracy'), 'Agent Rebelle, Défenseur de la Démocratie');
  for (const [name, french] of [
    ['Reluctant Hero', 'Héros Malgré Lui'],
    ['Fire Control', 'Contrôle de Tir'],
    ['Combat Armor (Rebel)', 'Armure de Combat'],
    ['Repeating Blaster', 'Blaster Répétiteur'],
  ]) {
    assert.ok(cardImageFor(name), `${name}: visuel anglais non raccordé`);
    assert.equal(frenchCardName(name), french);
    assert.equal(canonicalCardKey(french), canonicalCardKey(name), `${name}: le titre français doit résoudre la même carte`);
  }
  const reluctantHero = DICE_PROFILES[canonicalCardKey('Reluctant Hero')];
  assert.equal(reluctantHero.criticalPerSuppression, true);
  const fireControl = DICE_PROFILES[canonicalCardKey('Fire Control')];
  assert.equal(fireControl.fireControl, true);
  const combatArmor = DICE_PROFILES[canonicalCardKey('Combat Armor (Rebel)')];
  assert.equal(combatArmor.defenseColorOverride, 'rouge');
  assert.equal(combatArmor.defenseSurgeOverride, null);
  const repeatingBlaster = DICE_PROFILES[canonicalCardKey('Repeating Blaster')];
  assert.deepEqual(repeatingBlaster.weapons[0].dice, [
    { color: 'rouge', count: 1 },
    { color: 'noir', count: 2 },
    { color: 'blanc', count: 3 },
  ]);
  assert.equal(repeatingBlaster.weapons[0].range, '1-3');
  assert.deepEqual(repeatingBlaster.weapons[0].keywordValues, { 'critique-x': 1, 'impact-x': 1 });
  const cassianUpgradeImport = importArmyList(JSON.stringify({
    armyFaction: 'rebel',
    units: [{ name: 'Rebel Troopers', upgrades: ['Cassian Andor'] }],
  }));
  assert.equal(cassianUpgradeImport.units[0].upgrades[0].name, 'Cassian Andor Operative', 'Cassian placé dans un emplacement d’amélioration ne doit pas devenir la carte Unité');
  assert.ok(cardImageFor(cassianUpgradeImport.units[0].upgrades[0].name)?.includes('cassian-andor-operative.jpg'));
  const cassianUpgradeRoster = buildCertifiedUnitRoster(cassianUpgradeImport.units[0]);
  assert.equal(cassianUpgradeRoster.models.length, 5, 'Cassian doit ajouter une figurine aux 4 Soldats rebelles');
  assert.equal(cassianUpgradeRoster.models.at(-1)?.maxWounds, 1);
  console.log('Import pipeline OK — JSON Tabletop Admiral, clés stables, doublons, effectifs, grenades et audit vérifiés.');
} finally {
  await vite.close();
}
