import type { CSSProperties } from 'react';
import type { CardTagLibrary, KeywordDef, ParsedList, ParsedUnit } from '../types';
import { resolveUnitKeywords } from '../lib/combat';
import { cardImageFor } from '../data/cardImages';
import { cardNoteFor } from '../data/cardNotes';
import { DefinitionText } from '../lib/diceIcons';
import { annotateKeywords, shortDef } from '../lib/keywordText';
import { frenchCardName, canonicalCardKey } from '../lib/cardNames';
import { upgradeTextFor, upgradeUseFor, type UpgradeUse } from '../data/upgradeTexts';

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
  // Les améliorations ont désormais leur texte complet dans l'encart « Améliorations » (UpgradeTexts) :
  // seule la carte d'unité garde ici sa note propre (ex. erratum).
  const note = cardNoteFor(unit.name);
  return note ? [{ key: canonicalCardKey(unit.name), displayName: frenchCardName(unit.name), note }] : [];
}

const USE_LABEL: Record<UpgradeUse, string | null> = {
  passive: null,
  exhaust: '↱ à incliner',
  discard: '✖ à supprimer',
  both: '↱ à incliner ou ✖ à supprimer',
};

/**
 * Encart sous les visuels (24/10/2026) : le texte d'une petite carte d'amélioration est illisible une
 * fois imprimé ; il est recopié ici en entier, avec le symbole d'utilisation de la carte. Une carte dont
 * le texte n'a pas encore été transcrit est signalée plutôt que passée sous silence.
 */
function UpgradeTexts({ unit, keywords, defined }: { unit: ParsedUnit; keywords: KeywordDef[]; defined: Set<string> }) {
  const seen = new Set<string>();
  const upgrades = unit.upgrades.filter((up) => {
    const key = canonicalCardKey(up.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (upgrades.length === 0) return null;
  return (
    <div className="visual-list-upgrades">
      <h4 className="visual-list-kw-heading">Améliorations</h4>
      {upgrades.map((up) => {
        const raw = upgradeTextFor(up.name);
        // Mots-clés en gras ; ceux absents de la liste ci-dessous sont définis entre parenthèses.
        const segments = raw ? annotateKeywords(raw, keywords, defined) : undefined;
        const use = upgradeUseFor(up.name);
        const useLabel = use ? USE_LABEL[use] : null;
        return (
          <p key={up.key} className="visual-list-kw visual-list-upgrade">
            <strong>{frenchCardName(up.name)}</strong>
            {useLabel && <span className="visual-list-upgrade-use"> ({useLabel})</span>}
            {' — '}
            {segments
              ? segments.map((s, i) => (s.keyword ? <strong key={i}>{s.text}</strong> : <DefinitionText key={i} text={s.text} />))
              : <em className="visual-list-upgrade-missing">texte à transcrire (voir le visuel de la carte)</em>}
          </p>
        );
      })}
    </div>
  );
}

/** Mots-clés regroupés par moment d'usage, comme le mode « mots-clés » (MinimalKeywordsSection). */
const IMPACT_GROUPS: { id: KeywordDef['impact']; label: string }[] = [
  { id: 'attaque', label: 'En attaque' },
  { id: 'défense', label: 'En défense' },
  { id: 'autre', label: 'Déplacement, ordres et autres' },
];

/**
 * Hauteur imprimée des visuels (mm) pour que la carte d'unité (paysage, ≈ 1,43) et toutes ses
 * améliorations (portrait, ≈ 0,71) tiennent sur une seule ligne de la demi-page A4 (≈ 190 mm utiles),
 * plafonnée à 46 mm.
 */
function printedCardHeight(upgrades: number): number {
  const usable = 190 - upgrades * 1;
  return Math.min(46, Math.floor(usable / (1.43 + 0.71 * upgrades)));
}

function VisualUnitBlock({ unit, tagLibrary, keywords }: { unit: ParsedUnit; tagLibrary: CardTagLibrary; keywords: KeywordDef[] }) {
  const resolved = resolveUnitKeywords(unit, tagLibrary, keywords);
  const notes = unitCardNotes(unit);
  const unitImg = cardImageFor(unit.name);
  const upgradesWithImage = unit.upgrades.filter((up) => cardImageFor(up.name)).length;
  const cardHeight = { '--visual-list-card-height': `${printedCardHeight(upgradesWithImage)}mm` } as CSSProperties;

  return (
    <div className="visual-list-block" style={cardHeight}>
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
      <UpgradeTexts unit={unit} keywords={keywords} defined={new Set(resolved.map((r) => r.def.id))} />
      {(resolved.length > 0 || notes.length > 0) && (
        <div className="visual-list-keywords">
          {IMPACT_GROUPS.map(({ id, label }) => {
            const items = resolved.filter((r) => r.def.impact === id);
            if (items.length === 0) return null;
            return (
              <div key={id} className="visual-list-kw-group">
                <h4 className="visual-list-kw-heading">{label}</h4>
                {items.map((r) => (
                  <p key={r.tag.keywordId} className="visual-list-kw">
                    <strong>{r.def.name}{r.def.hasValue && r.tag.value ? ` ${r.tag.value}` : ''}</strong>
                    {' — '}
                    <DefinitionText text={shortDef(r.def)} />
                  </p>
                ))}
              </div>
            );
          })}
          {notes.length > 0 && (
            <div className="visual-list-kw-group">
              <h4 className="visual-list-kw-heading">Effets des cartes</h4>
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
