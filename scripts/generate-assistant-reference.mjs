import { existsSync } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(projectRoot, 'public/assistant/reference-data.js');

const server = await createServer({
  root: projectRoot,
  configFile: false,
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true },
});

try {
  const [keywordModule, tagModule, nameModule, diceModule, imageModule, aliasModule] = await Promise.all([
    server.ssrLoadModule('/src/data/keywords.ts'),
    server.ssrLoadModule('/src/data/cardTags.ts'),
    server.ssrLoadModule('/src/data/cardNamesFr.ts'),
    server.ssrLoadModule('/src/data/diceProfiles.ts'),
    server.ssrLoadModule('/src/data/cardImages.ts'),
    server.ssrLoadModule('/src/data/cardKeyAliases.json'),
  ]);

  const certifications = JSON.parse(await readFile(resolve(projectRoot, 'src/data/diceCertifications.json'), 'utf8'));
  const weapons = structuredClone(diceModule.DICE_PROFILES);
  // Le catalogue d'images est la source exhaustive des cartes reconnues par
  // l'interface. Une carte sans dés ni figurine ajoutée reste raccordée et
  // visible après import, mais ne doit pas créer un faux contrôle de figurines.
  for (const card of Object.keys(imageModule.CARD_IMAGES)) {
    weapons[card] ??= {
      weapons: [],
      note: 'carte sans dés ni figurine ajoutée',
    };
  }
  for (const [card, certification] of Object.entries(certifications)) {
    const profile = weapons[card];
    if (!profile) throw new Error(`Certification sans profil : ${card}`);
    for (const certifiedWeapon of certification.weapons || []) {
      const weapon = profile.weapons?.[certifiedWeapon.index];
      if (!weapon || weapon.name !== certifiedWeapon.name) throw new Error(`Arme de certification introuvable : ${card} #${certifiedWeapon.index}`);
      weapon.dice = certifiedWeapon.dice;
      weapon.range = certifiedWeapon.range;
      // Mots-clés de l'arme : la certification (relue sur la carte) remplace ceux du catalogue.
      if (Array.isArray(certifiedWeapon.keywordIds)) {
        weapon.keywordIds = [...certifiedWeapon.keywordIds];
        if (certifiedWeapon.keywordValues && Object.keys(certifiedWeapon.keywordValues).length) weapon.keywordValues = { ...certifiedWeapon.keywordValues };
        else delete weapon.keywordValues;
        weapon.keywordsVerifiedAgainstCard = true;
      }
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
    if (certification.fullCardCertification) {
      const mapped=imageModule.CARD_IMAGES[card];
      const visualPath=mapped&&resolve(projectRoot,'public','cards',basename(mapped));
      const currentHash=visualPath?createHash('sha256').update(await readFile(visualPath)).digest('hex'):null;
      if(currentHash&&currentHash===certification.fullCardCertification.visualHash)profile.fullCardCertification=certification.fullCardCertification;
      else profile.staleFullCardCertification={...certification.fullCardCertification,staleReason:'Le visuel de la carte a changé depuis sa certification.'};
    }
  }

  const assistantImages = Object.fromEntries(
    Object.entries(imageModule.CARD_IMAGES).map(([card, path]) => [
      card,
      `/SWL/cards/${String(path).split('/').pop()}`,
    ]),
  );

  // Contrat d'import Tabletop Admiral : une donnée connue ne doit jamais
  // disparaître silencieusement de l'assistant après régénération.
  const cardFiles = (await readdir(resolve(projectRoot, 'public/cards')))
    .filter((file) => /\.(?:jpe?g|png|webp)$/i.test(file));
  const mappedFiles = new Set(Object.values(assistantImages).map((path) => String(path).split('/').pop().toLowerCase()));
  // Les lots d'images peuvent être ajoutés avant leur entrée TypeScript.
  // Leur nom de fichier devient alors immédiatement une clé Tabletop Admiral
  // exploitable, sans casser les raccordements explicites déjà certifiés.
  for (const file of cardFiles.filter((candidate) => !mappedFiles.has(candidate.toLowerCase()))) {
    const fallbackKey = file.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim().toLowerCase();
    assistantImages[fallbackKey] ??= `/SWL/cards/${file}`;
  }

  const incompleteUnits = Object.entries(weapons)
    .filter(([, profile]) => profile.defenseColor && !profile.unitStats?.verifiedAgainstCard)
    .map(([card]) => card);
  if (incompleteUnits.length) throw new Error(`Unités sans caractéristiques certifiées : ${incompleteUnits.join(', ')}`);

  const incompleteModels = Object.entries(weapons)
    .filter(([, profile]) => Number.isInteger(profile.addedModels) && !profile.addedModelsVerifiedAgainstCard)
    .map(([card]) => card);
  if (incompleteModels.length) throw new Error(`Ajouts de figurines non certifiés : ${incompleteModels.join(', ')}`);

  // Mots-clés : deux sources (étiquettes de base, certification complète). En cas de désaccord, le moteur
  // n'ignore JAMAIS un mot-clé : il utilise l'UNION des deux (une certification ancienne ne peut pas faire
  // disparaître Arsenal de Boba Fett, ni une certification vide Précis des Stormtroopers -- incident du
  // 19/09/2026). La certification ne devient seule autorité (retraits compris) que si elle porte
  // keywordsReviewed : posé par l'écran de certification après affichage du désaccord au joueur.
  // Le désaccord reste listé dans keywordConflicts : l'écran de certification le demande tant qu'il existe.
  const tags = structuredClone(tagModule.SEED_CARD_TAGS);
  const keywordConflicts = {};
  for (const [card, profile] of Object.entries(weapons)) {
    const full = profile.fullCardCertification;
    if (!full || !Array.isArray(full.keywords)) continue;
    const seed = tags[card] || [];
    const seedById = new Map(seed.map((tag) => [tag.keywordId, tag.value ?? null]));
    const certById = new Map(full.keywords.map((tag) => [tag.keywordId, tag.value ?? null]));
    const certifiedOnly = [...certById.keys()].filter((id) => !seedById.has(id)).sort();
    const tagsOnly = [...seedById.keys()].filter((id) => !certById.has(id)).sort();
    const valueDiffs = [...certById.keys()].filter((id) => seedById.has(id) && certById.get(id) !== seedById.get(id)).sort();
    if (!certifiedOnly.length && !tagsOnly.length && !valueDiffs.length) continue;
    const suspiciousEmpty = full.keywords.length === 0 && seed.length > 0 && !full.noKeywordsConfirmed;
    keywordConflicts[card] = { certifiedOnly, tagsOnly, valueDiffs, suspiciousEmpty };
    if (full.keywordsReviewed === true) tags[card] = full.keywords.map((tag) => ({ ...tag }));
    else for (const tag of full.keywords) if (!seedById.has(tag.keywordId)) tags[card] = [...(tags[card] || []), { ...tag }];
    keywordConflicts[card].reviewed = full.keywordsReviewed === true;
  }
  const crosscheckPath = resolve(projectRoot, 'src/data/crosscheckTakras.json');
  const crosscheck = existsSync(crosscheckPath) ? JSON.parse(await readFile(crosscheckPath, 'utf8')) : {};

  const reference = {
    keywords: keywordModule.SEED_KEYWORDS,
    tags,
    keywordConflicts,
    crosscheck,
    keywordTiming: JSON.parse(await readFile(resolve(projectRoot, 'scripts/data/keyword-timing.json'), 'utf8')),
    upgradeNameCollisions: JSON.parse(await readFile(resolve(projectRoot, 'src/data/upgradeNameCollisions.json'), 'utf8')),
    names: nameModule.CARD_NAMES_FR,
    images: assistantImages,
    weapons,
    // Même table d'alias que src/lib/cardNames.ts (canonicalCardKey) : évite
    // que l'assistant retombe silencieusement en désaccord avec l'appli
    // principale sur les cartes Tabletop Admiral exportées sous un titre
    // complet (ex. « Chewbacca Walking Carpet » -> carte déjà certifiée
    // « Chewbacca »).
    aliases: aliasModule.default,
  };

  await writeFile(
    outputPath,
    `window.SWL_REFERENCE=${JSON.stringify(reference)};\n`,
    'utf8',
  );

  console.log(
    `Référentiel Assistant généré : ${reference.keywords.length} mots-clés, ` +
      `${Object.keys(reference.tags).length} cartes, ` +
      `${Object.keys(reference.images).length} visuels et ` +
      `${Object.keys(reference.weapons).length} profils de dés.`,
  );
} finally {
  await server.close();
}
