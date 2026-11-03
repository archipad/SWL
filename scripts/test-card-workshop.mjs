import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'vite';
import { indexedDB } from 'fake-indexeddb';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { createHash } from 'node:crypto';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true } });
try {
  const { buildWorkshopCatalog, workshopSelectionForList, duplexSheets } = await vite.ssrLoadModule('/src/lib/cardWorkshop.ts');
  const { SEED_CARD_TAGS } = await vite.ssrLoadModule('/src/data/cardTags.ts');
  const { SEED_KEYWORDS } = await vite.ssrLoadModule('/src/data/keywords.ts');
  const { importArmyList } = await vite.ssrLoadModule('/src/lib/importList.ts');
  const { escapeWorkshopHtml, keywordBackHtml } = await vite.ssrLoadModule('/src/lib/cardWorkshopPrint.ts');
  const { CardWorkshopScreen } = await vite.ssrLoadModule('/src/components/CardWorkshopScreen.tsx');
  const storage = await vite.ssrLoadModule('/src/lib/cardWorkshopStorage.ts');
  const catalog = buildWorkshopCatalog(SEED_CARD_TAGS, SEED_KEYWORDS);
  assert.equal(catalog.length, 484, 'translations reuse existing canonical IDs without adding duplicates');
  assert.equal(new Set(catalog.map((c) => c.id)).size, catalog.length, 'IDs are unique across types');
  for (const kind of ['unit', 'upgrade', 'command']) assert.ok(catalog.some((c) => c.kind === kind && c.image && c.rules.length));
  for (const [id, expected] of [['upgrade:cassian andor operative', ['chef', 'profil-bas', 'mission-secrete', 'longue-distance']], ['upgrade:chewbacca upgrade', ['chef', 'impact-x']]]) {
    const variant = catalog.find((card) => card.id === id);
    assert.ok(variant?.image?.includes('/workshop/'), 'local FR workshop variant has its own front');
    assert.deepEqual(variant.rules.map((rule) => rule.id.split(':')[0]), expected);
    assert.ok(variant.warnings.length, 'translation provenance and variant limitations stay visible');
    const kindList = { units: [{ key: 'test', name: 'Stormtroopers', kind: 'unit', upgrades: [{ name: id.includes('cassian') ? 'Cassian Andor' : 'Chewbacca', key: 'upgrade' }]}], unparsedLines: [] };
    assert.equal(workshopSelectionForList(kindList, catalog, false).quantities[id], 1, 'upgrade resolves without using its namesake unit');
  }
  const storm = catalog.find((c) => c.id === 'unit:stormtroopers');
  assert.ok(storm.rules.some((r) => r.title === 'Précis 1' && r.text.includes('relancer')));
  const hh12 = catalog.find((c) => c.id === 'upgrade:hh 12 stormtrooper');
  assert.ok(hh12.rules.some((r) => r.title.startsWith('Impact 3')));
  const command = catalog.find((c) => c.id === 'command:une-cause-superieure');
  assert.ok(command.rules.some((r) => r.title.startsWith('Perforant 1')), 'keywords granted by command are defined');
  assert.ok(!catalog.some((c) => c.rules.some((r) => ['card-effect', 'command-effect', 'personal-effect'].includes(r.id))));
  const back = keywordBackHtml([...storm.rules, { id: 'personal-effect', title: 'Texte interdit', text: 'Effet interdit', timing: 'Début', source: 'Source' }]);
  assert.ok(back.includes('Précis 1'));
  assert.ok(!/Texte interdit|Effet interdit|Glossaire|Début/.test(back), 'verso : uniquement les noms et définitions des mots-clés');
  const commandMissing = catalog.find((c) => c.kind === 'command' && !c.rules.length);
  assert.equal(commandMissing.keywordReview?.status, 'blank-reviewed', 'an intentionally blank back has a recorded review');
  const missingDefs = buildWorkshopCatalog(SEED_CARD_TAGS, []);
  assert.ok(missingDefs.find((c) => c.id === storm.id).warnings.some((s) => s.includes('Définition absente')));

  const chewie = catalog.find((c) => c.id === 'upgrade:chewbacca upgrade');
  assert.ok(chewie.rules.find((r) => r.title === 'Impact 1').text.includes('Armure X'), 'target Armour value is independent of Impact');
  const reviewed = JSON.parse(fs.readFileSync('src/data/workshopKeywordReviews.json', 'utf8'));
  const official = JSON.parse(fs.readFileSync('src/data/workshopOfficialKeywords.json', 'utf8'));
  assert.equal(reviewed.cards.length, 484);
  assert.equal(new Set(reviewed.cards.map(c => c.id)).size, 484);
  assert.equal(reviewed.cards.filter(c => c.keywords.length).length, 337);
  assert.equal(reviewed.cards.filter(c => !c.keywords.length).length, 147);
  assert.equal(Object.keys(official.keywords).length, 156);
  const KEYWORDS_OUTSIDE_CORE_RULES = new Set(['les-mandaloriens-sont-plus-forts-ensemble']);
  for (const entry of reviewed.cards) {
    const card = catalog.find(c => c.id === entry.id);
    assert.ok(card?.keywordReview);
    assert.equal(createHash('sha256').update(fs.readFileSync('public/' + entry.front.file)).digest('hex'), entry.front.sha256, 'review remains bound to the exact source front');
    assert.equal(card.rules.length, new Set(entry.keywords.map(k=>k.keywordId)).size);
    for (const keyword of entry.keywords) {
      const definition = official.keywords[keyword.keywordId];
      // Mot-clé propre à une boîte (cartes mandaloriennes) : absent du règlement de base, défini par le glossaire du dépôt.
      if (!definition && KEYWORDS_OUTSIDE_CORE_RULES.has(keyword.keywordId)) { assert.ok(card.rules.some(rule => rule.source.startsWith('Glossaire du dépôt'))); continue; }
      assert.ok(definition?.definition && definition.page >= 46 && definition.page <= 62);
      assert.ok(card.rules.some(rule => rule.source.includes('p. ' + definition.page)));
    }
  }
  for (const id of ['upgrade:unstable astromech','upgrade:force barrier','upgrade:fragmentation grenades','upgrade:imperial hammers elite armor pilot','upgrade:remote doc','upgrade:rebel ambusher','upgrade:stormtrooper sharpshooter']) assert.equal(catalog.find(c=>c.id===id).rules.length, 0, 'result symbols and token names are not keywords');
  assert.equal(catalog.find(c=>c.id==='unit:rebel sleeper cell').rules.length, 5);
  assert.ok(catalog.find(c=>c.id==='upgrade:e 11d grenade launcher config').rules.some(r=>r.id.startsWith('deflagration:')));
  assert.ok(catalog.find(c=>c.id==='upgrade:the darksaber').rules.some(r=>r.title==='Impact 1'));
  assert.ok(!catalog.find(c=>c.id==='unit:mandalorian super commandos').rules.some(r=>r.id.startsWith('mercenaire:')));
  assert.equal(catalog.find(c=>c.id==='unit:major marquand').rules.filter(r=>r.id.startsWith('impact-x:')).length, 1, 'one full definition per keyword even with different values');
  assert.ok(official.keywords['tirs-de-soutien'].definition.includes('En attente'));
  assert.ok(!official.keywords['tirs-de-soutien'].definition.includes('réserve'));
  assert.ok(official.keywords['programme'].definition.includes('Programmation'));
  assert.ok(official.keywords['observateur-x'].definition.includes('portée 2'));
  assert.ok(official.keywords['calcul-de-probabilites'].definition.includes('②'));
  assert.ok(!catalog.find(c=>c.id==='unit:rebel agent defender of democracy').warnings.some(w=>w.includes('Recto anglais')));
  assert.equal(reviewed.cards.filter(c=>c.officialCardStatus==='removed').length, 10);
  assert.equal(reviewed.cards.filter(c=>c.officialCardStatus==='outdated-front').length, 0);
  for (const [id, expected] of [['upgrade:tristan wren', ['chef','precis-x']], ['upgrade:ursa wren', ['defense-x','chef']], ['unit:rebel agent defender of democracy', ['equipe','autonome','agile']]]) {
    const current = catalog.find(c=>c.id===id);
    assert.ok(current.image.includes('/workshop/'));
    assert.deepEqual(current.rules.map(r=>r.id.split(':')[0]), expected);
    assert.ok(!current.warnings.some(w=>/Recto ancien|Recto anglais/.test(w)));
    assert.equal(catalog.filter(c=>c.id===id).length, 1);
  }
  assert.ok(catalog.find(c=>c.id==='unit:rebel agent defender of democracy').rules.some(r=>r.title==='Équipe : doctrine'));
  assert.ok(catalog.find(c=>c.id==='upgrade:tristan wren').rules.some(r=>r.title==='Précis 2'));
  assert.ok(catalog.find(c=>c.id==='upgrade:ursa wren').rules.some(r=>r.title==='Défense 1'));
  const trioList = {units:[{name:'Rebel Agent, Defender of Democracy',key:'agent',upgrades:[{name:'Tristan Wren',key:'tristan'},{name:'Ursa Wren',key:'ursa'}]}],unparsedLines:[]};
  const trio = workshopSelectionForList(trioList,catalog,false);
  assert.equal(trio.missing.length,0);
  assert.equal(Object.values(trio.quantities).reduce((a,b)=>a+b,0),3);
  assert.ok(official.keywords['reparation-x'].definition.includes('jusqu’à 1 pion'));
  const rulesOf = id => catalog.find(c => c.id === id).rules;
  assert.deepEqual(rulesOf('command:decollage').map(r=>r.id.split(':')[0]), ['retrait', 'saut-x']);
  assert.equal(rulesOf('command:tir-de-barrage-accablant').length, 5);
  assert.equal(rulesOf('command:protocoles-anti-capture')[0].id, 'autodestruction-x-unite:4');
  assert.equal(rulesOf('command:immolation-inattendue').length, 3);
  assert.ok(official.keywords.infiltration.definition.includes('territoire allié'));
  assert.ok(!official.keywords.infiltration.definition.includes('portée 3'));
  assert.ok(official.keywords['tenir-le-cap'].definition.includes('½'));
  assert.ok(official.keywords['chasseur-de-jedi'].definition.includes('[CRITIQUE]'));
  assert.ok(!official.keywords.deflexion.definition.includes('Soresu'));
  assert.equal(catalog.filter(c=>c.rules.length).length, 337);
  assert.equal(keywordBackHtml(rulesOf('command:spike-corellien')).includes('p. 51'), false, 'references stay outside the printed back');
  assert.ok(catalog.some(c=>c.rules.some(r=>r.title==='Perforant 2' && r.text.includes('Gardien X'))), 'Guardian value is independent of Pierce');
  const repeated = { units: [{ key: 'a', name: 'Stormtroopers', kind: 'unit', section: 'Troupiers', upgrades: [{ key: 'x', kind: 'upgrade', name: 'HH-12 Stormtrooper' }] }, { key: 'b', name: 'Stormtroopers', kind: 'unit', section: 'Troupiers', upgrades: [{ key: 'y', kind: 'upgrade', name: 'HH-12 Stormtrooper' }] }], commandCards: ['A Higher Purpose'], contingencies: ['A Higher Purpose', 'Carte inconnue'], unparsedLines: [] };
  const selected = workshopSelectionForList(repeated, catalog, false);
  assert.equal(selected.quantities[storm.id], 2);
  assert.equal(selected.quantities[hh12.id], 2);
  assert.equal(selected.quantities[command.id], 1);
  assert.equal(selected.missing.length, 1);
  assert.equal(workshopSelectionForList(repeated, catalog, true).quantities[storm.id], 1);
  assert.ok(workshopSelectionForList({ ...repeated, commandCards: [], contingencies: [] }, catalog, false).notices.length);
  for (const file of ['tabletop-admiral-empire.json', 'tabletop-admiral-rebel.json']) {
    const list = importArmyList(fs.readFileSync(`scripts/fixtures/${file}`, 'utf8'));
    const result = workshopSelectionForList(list, catalog, false);
    assert.ok(Object.keys(result.quantities).length > 5);
  }
  const items = Array.from({ length: 17 }, (_, i) => ({ cardId: String(i) }));
  for (const orientation of ['portrait', 'landscape']) {
    const sheets = duplexSheets(items, orientation);
    assert.deepEqual(sheets.flatMap((s) => s.front).filter(Boolean), items);
    for (const sheet of sheets) for (let i = 0; i < sheet.front.length; i++) {
      const backIndex = Math.floor(i / sheet.columns) * sheet.columns + sheet.columns - 1 - i % sheet.columns;
      assert.equal(sheet.front[i], sheet.back[backIndex], 'physical long-edge counterpart, including partial rows');
    }
  }
  assert.equal(escapeWorkshopHtml('<img src=x onerror="x">&'), '&lt;img src=x onerror=&quot;x&quot;&gt;&amp;');
  globalThis.indexedDB = indexedDB;
  const personal = { card: { ...storm, id: 'personal:test' }, blob: new Blob(['image bytes']) };
  await storage.savePersonalCard(personal);
  const read = await storage.readPersonalCards();
  assert.equal(read[0].card.id, personal.card.id);
  assert.ok(read[0].blob instanceof Blob);
  await storage.deletePersonalCard(personal.card.id);
  assert.equal((await storage.readPersonalCards()).length, 0);
  await assert.rejects(() => storage.validateWorkshopImage(new Blob(['<svg>' + 'x'.repeat(100)], { type: 'image/png' })), /contenu/);
  await assert.rejects(() => storage.validateWorkshopImage(new Blob([new Uint8Array(8 * 1024 * 1024 + 1)])), /8 Mo/);
  const html = renderToStaticMarkup(React.createElement(CardWorkshopScreen, { tagLibrary: SEED_CARD_TAGS, keywords: SEED_KEYWORDS }));
  assert.ok(html.includes('Stormtroopers') && html.includes('Ajouter un recto FR'));
  console.log(`Atelier : ${catalog.length} cartes, 3 familles, texte intégral, commandes, doublons TTA, inconnues, duplex partiel, échappement HTML et stockage local vérifiés.`);
} finally { await vite.close(); }
