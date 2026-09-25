import { useState } from 'react';
import { cardImageFor } from '../data/cardImages';
import { codexPortraitFor } from '../data/codexPortraits';
import { diceProfileFor, type DiceColor, type WeaponProfile } from '../data/diceProfiles';
import { frenchCardName } from '../lib/cardNames';
import { CxIcon } from '../lib/codexIcons';
import { resolveUnitKeywords } from '../lib/combat';
import { DefinitionText } from '../lib/diceIcons';
import { shortDef } from '../lib/keywordText';
import { getUnitCardStats } from '../lib/unitModels';
import type { CardTagLibrary, KeywordDef, ParsedList, ParsedUnit } from '../types';

/**
 * Vue « Liste d'armée » (maquette Codex Legion) : à gauche la liste des
 * unités (portrait, effectif, points), à droite la fiche « Détails unité »
 * de l'unité choisie (blessures, défense, courage, armes, capacités). Les
 * caractéristiques n'apparaissent que pour une carte certifiée (voir
 * getUnitCardStats) -- jamais de valeur devinée, « — » sinon.
 */

const DIE_LABEL: Record<DiceColor, string> = { rouge: 'rouge', noir: 'noir', blanc: 'blanc' };

/** Total de l'unité (unité + améliorations), seulement si tous les coûts sont connus. */
function unitPoints(unit: ParsedUnit): number | undefined {
  if (unit.points === undefined) return undefined;
  if (!unit.upgrades.every((u) => u.points !== undefined)) return unit.points;
  return unit.points + unit.upgrades.reduce((sum, u) => sum + (u.points ?? 0), 0);
}

/** Vignette : portrait du pack si connu, sinon la moitié « illustration » du visuel de carte. */
function UnitThumb({ unit, large = false }: { unit: ParsedUnit; large?: boolean }) {
  const portrait = codexPortraitFor(unit.name);
  const card = cardImageFor(unit.name);
  const style = portrait
    ? { backgroundImage: `url(${portrait})`, backgroundSize: 'cover', backgroundPosition: 'center 25%' }
    : card
      ? { backgroundImage: `url(${card})`, backgroundSize: '210% auto', backgroundPosition: '100% 22%' }
      : undefined;
  return <span className={`cx-thumb${large ? ' cx-thumb-large' : ''}${style ? '' : ' cx-thumb-empty'}`} style={style} role="img" aria-label={frenchCardName(unit.name)} />;
}

/** Une silhouette par figurine (la première, chef d'unité, en évidence). */
function Minis({ count }: { count: number }) {
  return (
    <span className="cx-minis" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <svg key={i} className={i === 0 ? 'cx-mini lead' : 'cx-mini'} viewBox="0 0 12 20">
          <circle cx="6" cy="3.4" r="2.6" />
          <path d="M2 8.6h8l-1 6H7.2L6 19.4 4.8 14.6H3z" />
        </svg>
      ))}
    </span>
  );
}

function rangeInfo(range?: string): { label: string; max: number } {
  if (!range) return { label: '—', max: 0 };
  if (range === 'melee') return { label: 'Corps à corps', max: 0 };
  const nums = (range.match(/\d+/g) ?? []).map(Number);
  const max = nums.length ? Math.max(...nums) : 0;
  const clean = range.replace(/^-/, '').replace('-', ' – ');
  return { label: clean, max };
}

function WeaponBlock({ weapon }: { weapon: WeaponProfile }) {
  const range = rangeInfo(weapon.range);
  const dice = weapon.dice === 'variable' ? [] : weapon.dice;
  return (
    <div className="cx-weapon">
      <strong>{weapon.name}</strong>
      <div className="cx-weapon-line">
        <span className="cx-range">
          <small>Portée</small> {range.label}
          {range.max > 0 && (
            <span className="cx-range-dots" aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => <i key={i} className={i < range.max ? 'on' : ''} />)}
            </span>
          )}
        </span>
        <span className="cx-dice" aria-label="Dés d'attaque">
          {weapon.dice === 'variable' && <em>{weapon.note ?? 'variable'}</em>}
          {dice.flatMap((group) => Array.from({ length: group.count }, (_, i) => (
            <i key={`${group.color}${i}`} className={`cx-die cx-die-${group.color}`} title={`Dé ${DIE_LABEL[group.color]}`} />
          )))}
        </span>
      </div>
    </div>
  );
}

function UnitDetail({ unit, tagLibrary, keywords }: { unit: ParsedUnit; tagLibrary: CardTagLibrary; keywords: KeywordDef[] }) {
  const stats = getUnitCardStats(unit);
  const profile = diceProfileFor(unit.name);
  const keywordList = resolveUnitKeywords(unit, tagLibrary, keywords);
  const rank = profile?.fullCardCertification?.rank ?? unit.section;
  const unitType = profile?.fullCardCertification?.unitType;
  return (
    <>
      <UnitThumb unit={unit} large />
      <div className="cx-detail-head">
        <h3>{frenchCardName(unit.name)}</h3>
        <small>{[unitType, rank].filter(Boolean).join(' · ')}</small>
      </div>
      <dl className="cx-stats">
        <div><CxIcon name="health" /><dd>{stats.wounds ?? '—'}</dd><dt>Blessure</dt></div>
        <div><CxIcon name="defense" className={profile?.defenseColor ? `cx-def-${profile.defenseColor}` : undefined} /><dd>{profile?.defenseColor ?? '—'}</dd><dt>Défense</dt></div>
        <div><CxIcon name="courage" /><dd>{stats.courage ?? '—'}</dd><dt>Courage</dt></div>
      </dl>
      {profile?.weapons.map((weapon, i) => <WeaponBlock key={`${weapon.name}${i}`} weapon={weapon} />)}
      <div className="cx-abilities">
        <h4>Capacités</h4>
        {keywordList.length === 0 && <p className="empty-hint">Aucun mot-clé enregistré pour cette unité.</p>}
        {keywordList.map((r) => (
          <p key={r.tag.keywordId}>
            <strong>{r.def.name}{r.def.hasValue && r.tag.value ? ` ${r.tag.value}` : ''}</strong>
            <span><DefinitionText text={shortDef(r.def)} /></span>
          </p>
        ))}
        {unit.upgrades.length > 0 && (
          <p className="cx-upgrades"><strong>Améliorations</strong><span>{unit.upgrades.map((u) => frenchCardName(u.name)).join(' · ')}</span></p>
        )}
      </div>
    </>
  );
}

export function ArmyListView({ list, tagLibrary, keywords }: { list: ParsedList; tagLibrary: CardTagLibrary; keywords: KeywordDef[] }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = list.units.find((u) => u.key === selectedKey) ?? list.units[0];
  if (!selected) return <p className="empty-hint">Aucune unité dans cette liste.</p>;
  const total = list.totalPoints;
  return (
    <div className="cx-army no-print">
      <section className="cx-panel cx-army-list" aria-label="Votre armée">
        <header className="cx-panel-head">
          <h3>Votre armée</h3>
          <b>{total ?? '?'}{list.pointsLimit !== undefined ? ` / ${list.pointsLimit}` : ''} pts</b>
        </header>
        <ul>
          {list.units.map((unit) => {
            const stats = getUnitCardStats(unit);
            const points = unitPoints(unit);
            return (
              <li key={unit.key}>
                <button type="button" className={`cx-unit-row${unit.key === selected.key ? ' active' : ''}`} onClick={() => setSelectedKey(unit.key)} aria-pressed={unit.key === selected.key}>
                  <UnitThumb unit={unit} />
                  <span className="cx-unit-main">
                    <strong>{frenchCardName(unit.name)}</strong>
                    <small>{stats.models !== null ? `${stats.models} figurine${stats.models > 1 ? 's' : ''}` : unit.section}</small>
                    {stats.models !== null && <Minis count={stats.models} />}
                  </span>
                  <span className="cx-unit-pts">{points !== undefined ? <><b>{points}</b> pts</> : null}</span>
                  <svg className="cx-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      <aside className="cx-panel cx-unit-detail" aria-label="Détails de l'unité">
        <header className="cx-panel-head"><h3>Détails unité</h3></header>
        <UnitDetail unit={selected} tagLibrary={tagLibrary} keywords={keywords} />
      </aside>
    </div>
  );
}
