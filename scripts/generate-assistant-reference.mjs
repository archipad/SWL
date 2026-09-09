import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(projectRoot, 'public/assistant/reference-data.js');

const server = await createServer({
  root: projectRoot,
  configFile: false,
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true },
});

try {
  const [keywordModule, tagModule, nameModule, diceModule] = await Promise.all([
    server.ssrLoadModule('/src/data/keywords.ts'),
    server.ssrLoadModule('/src/data/cardTags.ts'),
    server.ssrLoadModule('/src/data/cardNamesFr.ts'),
    server.ssrLoadModule('/src/data/diceProfiles.ts'),
  ]);

  const certifications = JSON.parse(await readFile(resolve(projectRoot, 'src/data/diceCertifications.json'), 'utf8'));
  const weapons = structuredClone(diceModule.DICE_PROFILES);
  for (const [card, certification] of Object.entries(certifications)) {
    const profile = weapons[card];
    if (!profile) throw new Error(`Certification sans profil : ${card}`);
    for (const certifiedWeapon of certification.weapons || []) {
      const weapon = profile.weapons?.[certifiedWeapon.index];
      if (!weapon || weapon.name !== certifiedWeapon.name) throw new Error(`Arme de certification introuvable : ${card} #${certifiedWeapon.index}`);
      weapon.dice = certifiedWeapon.dice;
      weapon.range = certifiedWeapon.range;
      weapon.verifiedAgainstCard = true;
      weapon.verificationSource = 'Certification visuelle centralisée GitHub';
    }
    if (certification.defenseColor) {
      profile.defenseColor = certification.defenseColor;
      profile.defenseVerifiedAgainstCard = true;
      profile.defenseVerificationSource = 'Certification visuelle centralisée GitHub';
    }
    if (certification.unitStats) {
      profile.unitStats = {
        ...certification.unitStats,
        verifiedAgainstCard: true,
        verificationSource: 'Certification visuelle centralisée GitHub',
      };
    }
    if (Number.isInteger(certification.addedModels)) {
      profile.addedModels = certification.addedModels;
      profile.addedModelsVerifiedAgainstCard = true;
    }
    if (Number.isInteger(certification.addedModelWounds)) {
      profile.addedModelWounds = certification.addedModelWounds;
    }
  }

  const reference = {
    keywords: keywordModule.SEED_KEYWORDS,
    tags: tagModule.SEED_CARD_TAGS,
    names: nameModule.CARD_NAMES_FR,
    weapons,
  };

  await writeFile(
    outputPath,
    `window.SWL_REFERENCE=${JSON.stringify(reference)};\n`,
    'utf8',
  );

  console.log(
    `Référentiel Assistant généré : ${reference.keywords.length} mots-clés, ` +
      `${Object.keys(reference.tags).length} cartes et ` +
      `${Object.keys(reference.weapons).length} profils de dés.`,
  );
} finally {
  await server.close();
}
