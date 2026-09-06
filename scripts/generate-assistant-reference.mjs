import { writeFile } from 'node:fs/promises';
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

  const reference = {
    keywords: keywordModule.SEED_KEYWORDS,
    tags: tagModule.SEED_CARD_TAGS,
    names: nameModule.CARD_NAMES_FR,
    weapons: diceModule.DICE_PROFILES,
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
