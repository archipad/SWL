import type { CardTagLibrary, KeywordDef, ParsedList, ParsedUnit } from '../types';
import { resolveCardKeywords, resolveUnitKeywords, type ResolvedTag } from '../lib/combat';
import { CARD_IMAGES } from '../data/cardImages';
import { normalizeName } from '../lib/normalize';
import { DefinitionText } from '../lib/diceIcons';
import { shortDef } from '../lib/keywordText';

interface Props {
  list: ParsedList;
  tagLibrary: CardTagLibrary;
  keywords: KeywordDef[];
}

/** Découpe une liste en groupes de `size` (le dernier groupe peut être plus court). */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Bloc mots-clés commun aux fiches d'unité et d'amélioration. */
function KeywordBlock({ resolved }: { resolved: ResolvedTag[] }) {
  if (resolved.length === 0) {
    return <p className="empty-hint">Aucun mot-clé renseigné pour cette carte.</p>;
  }
  return (
    <div className="unit-card-keywords">
      {resolved.map((r) => (
        <div key={r.tag.keywordId} className="unit-card-kw">
          <h4>{r.def.name}{r.def.hasValue && r.tag.value ? ` ${r.tag.value}` : ''}</h4>
          <p><DefinitionText text={shortDef(r.def)} /></p>
        </div>
      ))}
    </div>
  );
}

function UnitCard({ unit, tagLibrary, keywords }: { unit: ParsedUnit; tagLibrary: CardTagLibrary; keywords: KeywordDef[] }) {
  const resolved = resolveUnitKeywords(unit, tagLibrary, keywords);
  const unitImg = CARD_IMAGES[normalizeName(unit.name)];

  return (
    <div className="unit-card-sheet">
      {/* Regroupé à part (et pas le bloc entier) pour break-inside:avoid :
          un mot-clé très long (ex. Perforant X) peut à lui seul dépasser une
          colonne — mieux vaut laisser la liste de mots-clés continuer sur la
          page suivante que de tronquer ou déborder illisiblement. */}
      <div className="unit-card-heading">
        <div className="unit-card-images">
          {unitImg && (
            <img
              className="unit-card-image"
              src={unitImg}
              alt={unit.name}
              onError={(e) => { e.currentTarget.hidden = true; }}
            />
          )}
          {unit.upgrades.map((up) => {
            const upImg = CARD_IMAGES[normalizeName(up.name)];
            return upImg ? (
              <img
                key={up.key}
                className="unit-card-image unit-card-image-upgrade"
                src={upImg}
                alt={up.name}
                onError={(e) => { e.currentTarget.hidden = true; }}
              />
            ) : null;
          })}
        </div>
        <div className="unit-card-head">
          <strong>{unit.name}</strong>
          {unit.upgrades.length > 0 && (
            <span className="unit-card-upgrade-names"> + {unit.upgrades.map((u) => u.name).join(', ')}</span>
          )}
        </div>
      </div>
      <KeywordBlock resolved={resolved} />
    </div>
  );
}

/**
 * Fiche d'amélioration seule (visuel en grand + ses propres mots-clés, sans
 * fusion avec l'unité) — même gabarit que UnitCard, pour l'appendice en
 * toute fin de document.
 */
function UpgradeCard({ name, tagLibrary, keywords }: { name: string; tagLibrary: CardTagLibrary; keywords: KeywordDef[] }) {
  const resolved = resolveCardKeywords(name, tagLibrary, keywords);
  const img = CARD_IMAGES[normalizeName(name)];

  return (
    <div className="unit-card-sheet">
      <div className="unit-card-heading">
        <div className="unit-card-images">
          {img && (
            <img
              className="unit-card-image"
              src={img}
              alt={name}
              onError={(e) => { e.currentTarget.hidden = true; }}
            />
          )}
        </div>
        <div className="unit-card-head"><strong>{name}</strong></div>
      </div>
      <KeywordBlock resolved={resolved} />
    </div>
  );
}

/**
 * Une « fiche » imprimable par unité : le visuel de carte de l'unité et de
 * chaque amélioration équipée, suivi des mots-clés qui s'appliquent (unité
 * + améliorations, fusionnés et dédupliqués comme dans l'écran Combat) —
 * pensé pour être découpé et posé à côté de la table à la place de la
 * carte physique, avec la définition sous les yeux sans avoir à la
 * chercher dans le livret. En toute fin de document, une fiche par carte
 * Amélioration présente dans la liste (dédupliquée, une seule fois même si
 * plusieurs unités la portent), avec son propre visuel en grand — la
 * miniature dans l'en-tête de chaque unité ne suffit pas toujours à lire
 * les détails.
 *
 * Exactement 2 fiches par page A4 imprimée, une par colonne (demande
 * explicite : pas un flux qui en case plus ou moins selon la longueur des
 * mots-clés) — les cartes (unités puis améliorations) sont donc regroupées
 * par paire, chaque paire forçant un saut de page après elle (sauf la
 * dernière de chaque section). En écran, un simple flux à largeur variable
 * suffit (cette section n'est de toute façon jamais visible à l'écran, cf.
 * plus bas).
 *
 * Une carte sans visuel connu (CARD_IMAGES ne couvre pas encore toutes les
 * cartes) affiche simplement ses mots-clés sans image, plutôt qu'un visuel
 * cassé ou erroné.
 *
 * Pas de `loading="lazy"` sur les images : ce composant n'est monté que
 * dans une section masquée à l'écran (display: none tant qu'on n'imprime
 * pas, cf. SetupScreen.tsx) — un navigateur ne déclenche jamais le
 * chargement différé d'une image dans un ancêtre display:none, l'image
 * resterait vide même une fois l'impression lancée.
 */
export function UnitCardsSection({ list, tagLibrary, keywords }: Props) {
  if (list.units.length === 0) {
    return <p className="empty-hint">Aucune unité dans cette liste.</p>;
  }

  // Une seule fiche par nom d'amélioration distinct, même si plusieurs
  // unités la portent (ex. deux escouades de Stormtroopers avec le même
  // DLT-19) — dans l'ordre de première apparition dans la liste.
  const seenUpgrades = new Set<string>();
  const upgradeNames: string[] = [];
  for (const unit of list.units) {
    for (const up of unit.upgrades) {
      const key = normalizeName(up.name);
      if (seenUpgrades.has(key)) continue;
      seenUpgrades.add(key);
      upgradeNames.push(up.name);
    }
  }

  return (
    <>
      <div className="unit-cards-pages">
        {chunk(list.units, 2).map((pair) => (
          <div key={pair[0].key} className="unit-cards-page">
            {pair.map((unit) => (
              <UnitCard key={unit.key} unit={unit} tagLibrary={tagLibrary} keywords={keywords} />
            ))}
          </div>
        ))}
      </div>
      {upgradeNames.length > 0 && (
        <div className="unit-cards-pages">
          <h2 className="print-title unit-cards-appendix-title">Cartes Amélioration</h2>
          {chunk(upgradeNames, 2).map((pair) => (
            <div key={pair[0]} className="unit-cards-page">
              {pair.map((name) => (
                <UpgradeCard key={name} name={name} tagLibrary={tagLibrary} keywords={keywords} />
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
