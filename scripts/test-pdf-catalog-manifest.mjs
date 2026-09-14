import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'vite';

// Test bloquant pour le manifeste d'audit des 13 PDF de cartes
// (src/data/pdfCardManifest.json, voir docs/PDF_CATALOG_AUDIT.md).
//
// Vérifie deux choses distinctes :
// 1) Intégrité structurelle du manifeste lui-même (chaque entrée a les
//    champs attendus, avec des valeurs dans les énumérations documentées).
// 2) Toute entrée marquée statutCatalogue:"connue" doit réellement se
//    raccorder au catalogue central (nom français au minimum) -- si elle
//    a aussi une donnée moteur certifiée, l'effectif/les dés doivent se
//    résoudre. Ça protège contre une régression silencieuse : si demain
//    une carte marquée "connue" ici disparaît du catalogue central (nom,
//    visuel ou certification retirés par erreur), ce test échoue.
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true } });
try {
  const { canonicalCardKey } = await vite.ssrLoadModule('/src/lib/cardNames.ts');
  const { cardImageFor } = await vite.ssrLoadModule('/src/data/cardImages.ts');
  const { CARD_NAMES_FR } = await vite.ssrLoadModule('/src/data/cardNamesFr.ts');
  const { DICE_PROFILES } = await vite.ssrLoadModule('/src/data/diceProfiles.ts');
  const { OBJECTIVE_CARDS, SECONDARY_OBJECTIVE_CARDS, ADVANTAGE_CARDS } = await vite.ssrLoadModule('/src/data/battleCards.ts');
  const battleCardNames = new Set([...OBJECTIVE_CARDS, ...SECONDARY_OBJECTIVE_CARDS, ...ADVANTAGE_CARDS].map((c) => c.name));

  const manifestRaw = fs.readFileSync(new URL('../src/data/pdfCardManifest.json', import.meta.url), 'utf8');
  const manifest = JSON.parse(manifestRaw);
  const { _meta, ...entries } = manifest;

  assert.ok(_meta && typeof _meta.totalEntrees === 'number', 'Le manifeste doit avoir un bloc _meta avec totalEntrees');
  const entryList = Object.entries(entries);
  assert.equal(entryList.length, _meta.totalEntrees, '_meta.totalEntrees doit refléter le nombre réel d’entrées');

  const validTypes = new Set(['unite', 'amelioration', 'commandement', 'bataille', 'force_de_bataille']);
  const validCatalogue = new Set(['connue', 'inconnue']);
  const validMoteur = new Set(['certifie', 'hors_moteur', 'a_verifier', 'sans_objet']);
  const validVerif = new Set(['confirme', 'a_verifier']);

  let connuesCertifiees = 0;
  let connuesNomSeul = 0;
  let aVerifier = 0;
  let horsMoteur = 0;

  for (const [key, entry] of entryList) {
    assert.ok(entry.pdfSource, `${key}: pdfSource manquant`);
    assert.ok(entry.page !== undefined, `${key}: page manquante`);
    assert.ok(entry.nameFr, `${key}: nameFr manquant`);
    assert.ok(validTypes.has(entry.type), `${key}: type invalide « ${entry.type} »`);
    assert.ok(validCatalogue.has(entry.statutCatalogue), `${key}: statutCatalogue invalide « ${entry.statutCatalogue} »`);
    assert.ok(validMoteur.has(entry.statutDonneesMoteur), `${key}: statutDonneesMoteur invalide « ${entry.statutDonneesMoteur} »`);
    assert.ok(validVerif.has(entry.statutVerification), `${key}: statutVerification invalide « ${entry.statutVerification} »`);

    const isSummary = key.startsWith('resume:'); // entrée agrégée (ex: "11 pages déjà couvertes"), pas une carte individuelle probable par nom.
    if (isSummary) {
      // rien de plus à vérifier pour une entrée résumé : la structure suffit.
    } else if (entry.statutCatalogue === 'connue' && entry.type === 'bataille') {
      // Cartes Objectif/Secondaire/Avantage : catalogue séparé (battleCards.ts),
      // pas le catalogue central de cardNames/cardImages/diceProfiles.
      assert.ok(battleCardNames.has(entry.nameFr), `${key}: marquée "connue" mais « ${entry.nameFr} » absente de battleCards.ts (OBJECTIVE/SECONDARY/ADVANTAGE_CARDS) — régression possible`);
    } else if (entry.statutCatalogue === 'connue') {
      // Une carte "connue" doit se raccorder par son nom EN si fourni, sinon par son nom FR imprimé
      // (débarrassé du marqueur "•" des personnages uniques) -- la clé canonique obtenue doit
      // exister quelque part dans le catalogue (nom FR, visuel, ou profil de dés certifié).
      const probe = (entry.nameEn || entry.nameFr).replace(/^[•]/, '');
      const resolvedKey = canonicalCardKey(probe);
      const known = Boolean(CARD_NAMES_FR[resolvedKey]) || Boolean(cardImageFor(probe)) || Boolean(DICE_PROFILES[resolvedKey]);
      assert.ok(known, `${key}: marquée "connue" mais « ${probe} » ne résout à aucune entrée du catalogue (nom, visuel ou profil) — régression possible`);
      if (entry.statutDonneesMoteur === 'certifie') connuesCertifiees += 1;
      else connuesNomSeul += 1;
    }
    if (entry.statutVerification === 'a_verifier') aVerifier += 1;
    if (entry.statutDonneesMoteur === 'hors_moteur') horsMoteur += 1;
  }

  // Garde-fou anti-régression visuelle : les visuels français déjà publiés
  // pour les 18 unités Mercenaires (le seul lot du manifeste avec des
  // fichiers image propres à ce projet) doivent rester raccordés.
  const merceUnitKeys = entryList.filter(([k, v]) => k.startsWith('unit:') && v.pdfSource === 'Mercenary Units FR.pdf');
  assert.equal(merceUnitKeys.length, 18, 'Les 18 unités Mercenaires doivent toutes être présentes dans le manifeste');
  for (const [, entry] of merceUnitKeys) {
    const img = cardImageFor(entry.nameFr);
    assert.ok(img, `${entry.nameFr}: visuel français absent du catalogue (régression) alors que le manifeste le déclare "certifie"`);
  }

  console.log(`Manifeste PDF : ${entryList.length} cartes cataloguées (${connuesCertifiees} certifiées, ${connuesNomSeul} connues sans certification, ${horsMoteur} hors moteur, ${aVerifier} encore à vérifier).`);
} finally {
  await vite.close();
}
