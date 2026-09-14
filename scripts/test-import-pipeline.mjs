import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'vite';
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true } });
try {
  const { importArmyList } = await vite.ssrLoadModule('/src/lib/importList.ts');
  const { auditImportedList } = await vite.ssrLoadModule('/src/lib/importAudit.ts');
  const { buildCertifiedUnitRoster } = await vite.ssrLoadModule('/src/lib/unitModels.ts');
  const { canonicalCardKey } = await vite.ssrLoadModule('/src/lib/cardNames.ts');
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
  console.log('Import pipeline OK — JSON Tabletop Admiral, clés stables, doublons, effectifs, grenades et audit vérifiés.');
} finally {
  await vite.close();
}
