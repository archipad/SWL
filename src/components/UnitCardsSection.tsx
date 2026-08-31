import type { CardTagLibrary, KeywordDef, ParsedList } from '../types';
import { resolveUnitKeywords } from '../lib/combat';
import { CARD_IMAGES } from '../data/cardImages';
import { normalizeName } from '../lib/normalize';
import { DefinitionText } from '../lib/diceIcons';

interface Props {
  list: ParsedList;
  tagLibrary: CardTagLibrary;
  keywords: KeywordDef[];
}

/**
 * Une « fiche » imprimable par unité : le visuel de carte de l'unité et de
 * chaque amélioration équipée, suivi des mots-clés qui s'appliquent (unité
 * + améliorations, fusionnés et dédupliqués comme dans l'écran Combat) —
 * pensé pour être découpé et posé à côté de la table à la place de la
 * carte physique, avec la définition sous les yeux sans avoir à la
 * chercher dans le livret.
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

  return (
    <div className="unit-cards-grid">
      {list.units.map((unit) => {
        const resolved = resolveUnitKeywords(unit, tagLibrary, keywords);
        const unitImg = CARD_IMAGES[normalizeName(unit.name)];
        return (
          <div key={unit.key} className="unit-card-sheet">
            {/* Regroupé à part (et pas le bloc entier) pour break-inside:avoid :
                un mot-clé très long (ex. Perforant X) peut à lui seul dépasser
                une page — mieux vaut laisser la liste de mots-clés continuer
                sur la page suivante que de pousser toute la fiche en bas
                d'une page vide pour rien. */}
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
            {resolved.length === 0 ? (
              <p className="empty-hint">Aucun mot-clé renseigné pour cette carte.</p>
            ) : (
              <div className="unit-card-keywords">
                {resolved.map((r) => (
                  <div key={r.tag.keywordId} className="unit-card-kw">
                    <h4>{r.def.name}{r.def.hasValue && r.tag.value ? ` ${r.tag.value}` : ''}</h4>
                    <p><DefinitionText text={r.def.definition} /></p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
