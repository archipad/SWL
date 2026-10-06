import certificationsJson from '../data/diceCertifications.json';
import { CARD_IMAGES } from '../data/cardImages';
import { DICE_PROFILES, type CardDiceProfile, type WeaponDice } from '../data/diceProfiles';
import { canonicalCardKey, frenchCardName } from './cardNames';
import { normalizeName } from './normalize';
import type { CardKeywordTag, CardTagLibrary, KeywordDef } from '../types';

/**
 * Catalogue de TOUTES les cartes connues de l'appli (écran « Consultation des cartes », 06/10/2026) :
 * visuel, mots-clés et armes, assemblés depuis les mêmes sources que le reste de l'appli.
 *  - Mots-clés : la certification complète de la carte (fullCardCertification, relue sur le visuel)
 *    quand elle existe, sinon la bibliothèque de tags (graines + ajouts de l'utilisateur).
 *  - Armes : dés et portée certifiés (diceCertifications.json) en priorité, sinon diceProfiles.ts ;
 *    les mots-clés propres à chaque arme viennent de diceProfiles.ts (keywordIds / keywordValues).
 * Aucune valeur n'est devinée : une donnée absente est simplement non affichée.
 */

type CertifiedWeapon = { index?: number; name: string; dice: WeaponDice[] | 'variable'; range?: string };
type CertifiedRecord = {
  weapons?: CertifiedWeapon[];
  defenseColor?: string;
  unitStats?: { woundsPerModel: number; courage: number | null; baseModels: number };
  fullCardCertification?: CardDiceProfile['fullCardCertification'];
};
const CERTIFICATIONS = certificationsJson as Record<string, CertifiedRecord>;

export interface CatalogKeyword { keywordId: string; value?: number }

export interface CatalogWeapon {
  name: string;
  range?: string;
  dice: WeaponDice[] | 'variable';
  note?: string;
  keywords: CatalogKeyword[];
}

export interface CatalogCard {
  key: string;
  name: string;
  image?: string;
  type: 'unit' | 'upgrade';
  rank?: string;
  unitType?: string;
  speed?: string;
  defenseColor?: string;
  wounds?: number;
  courage?: number | null;
  models?: number;
  /** Mots-clés de la carte qui ne sont rattachés à aucune arme (affichés sous le visuel). */
  keywords: CatalogKeyword[];
  weapons: CatalogWeapon[];
  /** Carte relue intégralement sur son visuel (certification complète). */
  certified: boolean;
  /** Texte normalisé utilisé par la recherche (nom français + nom anglais). */
  search: string;
}

const RANK_LABELS: Record<string, string> = {
  commandant: 'Commandant', operative: 'Agent', corps: 'Troupiers', special: 'Forces spéciales', support: 'Soutien', heavy: 'Lourd',
};
export const rankLabel = (rank?: string) => (rank ? RANK_LABELS[rank] : undefined);

function weaponKeywords(profileWeapon: CardDiceProfile['weapons'][number] | undefined, cardTags: CardKeywordTag[], weaponCount: number, byId: Map<string, KeywordDef>): CatalogKeyword[] {
  const valueOf = (id: string) => profileWeapon?.keywordValues?.[id] ?? cardTags.find((tag) => tag.keywordId === id)?.value;
  if (Array.isArray(profileWeapon?.keywordIds)) return profileWeapon.keywordIds.map((id) => ({ keywordId: id, value: valueOf(id) }));
  // Même règle que le moteur d'attaque (weaponKeywordActive) : sans attribution explicite, les
  // mots-clés d'arme de la carte ne s'appliquent qu'à une carte qui n'a qu'une seule arme.
  if (weaponCount !== 1) return [];
  return cardTags.filter((tag) => byId.get(tag.keywordId)?.category === 'arme').map((tag) => ({ keywordId: tag.keywordId, value: tag.value }));
}

export function buildCardCatalog(tagLibrary: CardTagLibrary, keywords: KeywordDef[]): CatalogCard[] {
  const byId = new Map(keywords.map((keyword) => [keyword.id, keyword]));
  const keys = new Set<string>();
  for (const key of [...Object.keys(CARD_IMAGES), ...Object.keys(DICE_PROFILES), ...Object.keys(CERTIFICATIONS)]) keys.add(canonicalCardKey(key));
  const cards: CatalogCard[] = [];
  for (const key of keys) {
    const profile = DICE_PROFILES[key];
    const certified = CERTIFICATIONS[key];
    const full = certified?.fullCardCertification ?? profile?.fullCardCertification;
    const image = CARD_IMAGES[key];
    if (!image && !full && !profile?.weapons?.length) continue;
    const tags: CardKeywordTag[] = full?.keywords?.length ? full.keywords.map((k) => ({ keywordId: k.keywordId, value: k.value })) : tagLibrary[key] ?? [];
    const sourceWeapons = certified?.weapons?.length ? certified.weapons : profile?.weapons ?? [];
    const weapons: CatalogWeapon[] = sourceWeapons.map((weapon, index) => {
      const profileWeapon = profile?.weapons?.[('index' in weapon && typeof weapon.index === 'number') ? weapon.index : index] ?? profile?.weapons?.[index];
      return { name: weapon.name, range: weapon.range, dice: weapon.dice, note: profileWeapon?.note, keywords: weaponKeywords(profileWeapon, tags, sourceWeapons.length, byId) };
    });
    const onWeapons = new Set(weapons.flatMap((weapon) => weapon.keywords.map((keyword) => keyword.keywordId)));
    const stats = certified?.unitStats ?? profile?.unitStats;
    const defenseColor = certified?.defenseColor ?? profile?.defenseColor;
    const type: CatalogCard['type'] = full?.cardType ?? (stats || defenseColor ? 'unit' : 'upgrade');
    const name = frenchCardName(key);
    cards.push({
      key, name, image, type,
      rank: full?.rank, unitType: full?.unitType, speed: full?.speed,
      defenseColor, wounds: stats?.woundsPerModel, courage: stats?.courage, models: stats?.baseModels,
      keywords: tags.filter((tag) => !onWeapons.has(tag.keywordId)).map((tag) => ({ keywordId: tag.keywordId, value: tag.value })),
      weapons,
      certified: Boolean(full),
      search: normalizeName(`${name} ${key}`),
    });
  }
  const sortName = (card: CatalogCard) => card.name.replace(/^[•·\s]+/, '');
  return cards.sort((a, b) => sortName(a).localeCompare(sortName(b), 'fr'));
}

/** Nom affiché d'un mot-clé avec sa valeur : « Impact X » + 2 → « Impact 2 ». */
export function keywordLabel(def: KeywordDef, value?: number): string {
  if (!def.hasValue || value === undefined) return def.name;
  return /\bX\b/.test(def.name) ? def.name.replace(/\bX\b/, String(value)) : `${def.name} ${value}`;
}
