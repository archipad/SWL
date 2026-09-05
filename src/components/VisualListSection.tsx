import type { CardTagLibrary, KeywordDef, ParsedList, ParsedUnit } from '../types';
import { resolveUnitKeywords } from '../lib/combat';
import { cardImageFor } from '../data/cardImages';
import { cardNoteFor } from '../data/cardNotes';
import { DefinitionText } from '../lib/diceIcons';
import { shortDef } from '../lib/keywordText';
import { frenchCardName, canonicalCardKey } from '../lib/cardNames';

interface Props {
  list: ParsedList;
  tagLibrary: CardTagLibrary;
  keywords: KeywordDef[];
}

/**
 * « 170 pts (unité) + 30 pts (améliorations) = 200 pts » — uniquement si le
 * coût de CETTE carte et de CHACUNE de ses améliorations est connu. L'export
 * JSON Tabletop Admiral (le chemin d'import le plus fiable, voir
 * parseListJson.ts) ne porte pas ce détail par carte, seulement l'import
 * texte au format « Nom (points) » ; jamais de calcul partiel ou deviné —
 * tout ou rien, comme le reste des données de cette appli.
 */
function PointsBreakdown({ unit }: { unit: ParsedUnit }) {
  if (unit.points === undefined) return null;
  const upgradesKnown = unit.upgrades.every((u) => u.points !== undefined);
  if (!upgradesKnown || unit.upgrades.length === 0) {
    return <span className="visual-list-points">{unit.points} pts</span>;
  }
  const upgradesTotal = unit.upgrades.reduce((sum, u) => sum + (u.points ?? 0), 0);
  return (
    <span className="visual-list-points">
      {unit.points} pts (unité) + {upgradesTotal} pts (améliorations) = {unit.points + upgradesTotal} pts
    </span>
  );
}

/**
 * Cartes de cette unité (elle-même + améliorations) dont l'effet ne se
 * réduit à aucun mot-clé du glossaire mais qui ont un texte propre dans
 * cardNotes.ts — sans quoi ces cartes n'affichaient rien du tout ici
 * (signalement utilisateur du 06/09/2026 : Présence Inspirante/Pointe de
 * Vitesse/Ténacité). Dédupliqué par carte, dans l'ordre unité puis
 * améliorations.
 */
function unitCardNotes(unit: ParsedUnit): { key: string; displayName: string; note: string }[] {
  const seen = new Set<string>();
  const result: { key: string; displayName: string; note: string }[] = [];
  const visit = (name: string) => {
    const key = canonicalCardKey(name);
    if (seen.has(key)) return;
    const note = cardNoteFor(name);
    if (!note) return;
    seen.add(key);
    result.push({ key, displayName: frenchCardName(name), note });
  };
  visit(unit.name);
  for (const up of unit.upgrades) visit(up.name);
  return result;
}

function VisualUnitBlock({ unit, tagLibrary, keywords }: { unit: ParsedUnit; tagLibrary: CardTagLibrary; keywords: KeywordDef[] }) {
  const resolved = resolveUnitKeywords(unit, tagLibrary, keywords);
  const notes = unitCardNotes(unit);
  const unitImg = cardImageFor(unit.name);

  return (
    <div className="visual-list-block">
      <div className="visual-list-head">
        <strong>{frenchCardName(unit.name)}</strong>
        <PointsBreakdown unit={unit} />
      </div>
      <div className="visual-list-images">
        {unitImg && (
          <img
            className="visual-list-image"
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
              className="visual-list-image visual-list-image-upgrade"
              src={upImg}
              alt={frenchCardName(up.name)}
              onError={(e) => { e.currentTarget.hidden = true; }}
            />
          ) : null;
        })}
      </div>
      {(resolved.length > 0 || notes.length > 0) && (
        <div className="visual-list-keywords">
          {resolved.map((r) => (
            <p key={r.tag.keywordId} className="visual-list-kw">
              <strong>{r.def.name}{r.def.hasValue && r.tag.value ? ` ${r.tag.value}` : ''}</strong>
              {' — '}
              <DefinitionText text={shortDef(r.def)} />
            </p>
          ))}
          {notes.map((n) => (
            <p key={n.key} className="visual-list-kw">
              <strong>{n.displayName}</strong>
              {' — '}
              <DefinitionText text={n.note} />
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Mise en page « façon Tabletop Admiral » (signalement utilisateur du
 * 05/09/2026, capture d'écran de la liste partagée depuis leur site) :
 * visuel de la carte de troupe suivi, sur la même ligne, du visuel de
 * chaque amélioration équipée — plutôt que la fiche verticale (visuel
 * empilé + texte à droite) de UnitCardsSection, pensée elle pour être
 * découpée en fiche de référence unitaire. Ici, une unité par bloc, dans
 * l'ordre de la liste, sans regroupement des unités identiques (contre
 * l'affichage « x2 » vu sur Tabletop Admiral) : chaque exemplaire de la
 * liste a son propre bloc, plus simple et sans perte d'information.
 *
 * Ajout par rapport à l'original Tabletop Admiral (qui n'affiche aucun
 * texte de règles) : sous chaque bloc, la liste fusionnée et dédupliquée
 * (unité + toutes ses améliorations, comme resolveUnitKeywords() déjà
 * utilisé partout ailleurs dans l'appli) des mots-clés avec leur définition
 * française — pour ne pas avoir à rouvrir le livret pendant la partie.
 */
export function VisualListSection({ list, tagLibrary, keywords }: Props) {
  if (list.units.length === 0) {
    return <p className="empty-hint">Aucune unité dans cette liste.</p>;
  }

  return (
    <div className="visual-list-section">
      {list.units.map((unit) => (
        <VisualUnitBlock key={unit.key} unit={unit} tagLibrary={tagLibrary} keywords={keywords} />
      ))}
    </div>
  );
}
