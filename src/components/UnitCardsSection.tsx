import type { CardTagLibrary, KeywordDef, ParsedList, ParsedUnit } from '../types';
import { resolveUnitKeywords, type ResolvedTag } from '../lib/combat';
import { CARD_IMAGES, cardImageFor } from '../data/cardImages';
import { DefinitionText } from '../lib/diceIcons';
import { shortDef } from '../lib/keywordText';
import { frenchCardName, canonicalCardKey } from '../lib/cardNames';

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
  const unitImg = cardImageFor(unit.name);

  return (
    <div className="unit-card-sheet">
      {/* Colonne visuels (carte de troupe puis chaque amélioration équipée
          empilée en dessous) et colonne texte (nom + mots-clés) séparées :
          en impression, disposées côte à côte (visuels à gauche, texte à
          droite) pour rester compactes en hauteur — cf. index.css. */}
      <div className="unit-card-images">
        {unitImg && (
          <img
            className="unit-card-image"
            src={unitImg}
            alt={frenchCardName(unit.name)}
            onError={(e) => { e.currentTarget.hidden = true; }}
          />
        )}
        {unit.upgrades.map((up) => {
          const upImg = cardImageFor(up.name);
          return upImg ? (
            <img
              key={up.key}
              className="unit-card-image unit-card-image-upgrade"
              src={upImg}
              alt={frenchCardName(up.name)}
              onError={(e) => { e.currentTarget.hidden = true; }}
            />
          ) : null;
        })}
      </div>
      <div className="unit-card-main">
        <div className="unit-card-head">
          <strong>{frenchCardName(unit.name)}</strong>
          {unit.upgrades.length > 0 && (
            <span className="unit-card-upgrade-names"> + {unit.upgrades.map((u) => frenchCardName(u.name)).join(', ')}</span>
          )}
        </div>
        <KeywordBlock resolved={resolved} />
      </div>
    </div>
  );
}

/**
 * Une carte (unité ou amélioration) manque de données vérifiées : pas de
 * visuel connu (CARD_IMAGES), et/ou jamais taguée (absente de tagLibrary —
 * différent d'une carte taguée avec 0 mot-clé, ex. Force Choke, qui est
 * complète mais n'a simplement aucun mot-clé du glossaire à afficher).
 */
interface DataGap { name: string; missingImage: boolean; missingKeywords: boolean }

function collectDataGaps(list: ParsedList, tagLibrary: CardTagLibrary): DataGap[] {
  const seen = new Set<string>();
  const gaps: DataGap[] = [];
  const check = (name: string) => {
    const key = canonicalCardKey(name);
    if (seen.has(key)) return;
    seen.add(key);
    const missingImage = !CARD_IMAGES[key];
    const missingKeywords = tagLibrary[key] === undefined;
    if (missingImage || missingKeywords) gaps.push({ name, missingImage, missingKeywords });
  };
  for (const unit of list.units) {
    check(unit.name);
    for (const up of unit.upgrades) check(up.name);
  }
  return gaps;
}

/**
 * Une « fiche » imprimable par unité : le visuel de carte de l'unité et de
 * chaque amélioration équipée (empilés, amélioration sous la carte de
 * troupe), suivi des mots-clés qui s'appliquent (unité + améliorations,
 * fusionnés et dédupliqués comme dans l'écran Combat) — pensé pour être
 * posé sur la table de jeu à la place des cartes physiques, avec la
 * définition sous les yeux sans avoir à la chercher dans le livret.
 *
 * Plus d'appendice « Cartes Amélioration » en fin de document (retiré le
 * 02/09/2026, signalement utilisateur : les améliorations sont déjà
 * visibles sous chaque carte de troupe, l'appendice ne faisait que
 * doublonner). À la place, un court récapitulatif en fin de document
 * (`DataGapsNote`) : uniquement les cartes qui manquent réellement de
 * données vérifiées (visuel et/ou mots-clés), invisible si tout est
 * complet.
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

  const gaps = collectDataGaps(list, tagLibrary);

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
      {gaps.length > 0 && (
        <div className="unit-cards-gaps">
          <h3>Données manquantes</h3>
          <ul>
            {gaps.map((g) => (
              <li key={g.name}>
                <strong>{frenchCardName(g.name)}</strong>
                {' — '}
                {[g.missingImage && 'visuel', g.missingKeywords && 'mots-clés non renseignés'].filter(Boolean).join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
