import { useMemo, useState } from 'react';
import { frenchCardName } from '../lib/cardNames';
import { auditImportedList } from '../lib/importAudit';
import type { ParsedList } from '../types';

export function ImportCompatibilityReport({ list }: { list: ParsedList }) {
  const audit = useMemo(() => auditImportedList(list), [list]);
  const [expanded, setExpanded] = useState(!audit.complete);
  const title = audit.certificationCards
    ? `${audit.certificationCards} carte${audit.certificationCards > 1 ? 's' : ''} à certifier`
    : audit.catalogCards
      ? 'Données moteur certifiées'
      : 'Liste prête pour le moteur';
  const detail = audit.certificationCards
    ? `${audit.certificationIssues.length} contrôle(s) moteur${audit.catalogIssues.length ? ` · ${audit.catalogCards} carte(s) à raccorder au catalogue` : ''}`
    : audit.catalogCards
      ? `${audit.catalogCards} carte(s) à raccorder au catalogue · aucune certification de dés requise`
      : `${audit.readyCards}/${audit.cards} cartes raccordées et certifiées`;
  return <section className={`import-audit ${audit.complete ? 'import-audit-ok' : 'import-audit-warning'}`}>
    <button type="button" className="import-audit-summary" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
      <span className="import-audit-icon">{audit.safeForEngine ? '✓' : '!'}</span>
      <span><strong>{title}</strong><small>{detail}</small></span>
      <span>{expanded ? '▴' : '▾'}</span>
    </button>
    {expanded && <div className="import-audit-details">
      {audit.units.map((unit) => <article key={unit.name}>
        <div><strong>{frenchCardName(unit.name)}</strong><span>{unit.models === null ? 'Effectif ?' : `${unit.models} figurine${unit.models > 1 ? 's' : ''}`} · {unit.maxWounds === null ? 'PV ?' : `${unit.maxWounds} PV totaux`}</span></div>
        {unit.issues.length ? <ul>{unit.issues.map((issue, index) => <li key={`${issue.card}-${issue.kind}-${index}`}><b>{frenchCardName(issue.card)}</b> — {issue.message}</li>)}</ul> : <span className="import-audit-unit-ok">✓ Données moteur complètes</span>}
      </article>)}
      {!!audit.certificationIssues.length && <p className="import-audit-blocking">Les données moteur signalées doivent être certifiées avant d’être appliquées automatiquement.</p>}
      {!audit.certificationIssues.length && !!audit.catalogIssues.length && <p className="import-audit-blocking">Les dés, la défense et les effectifs sont certifiés. Les éléments ci-dessus concernent uniquement les visuels ou les noms du catalogue.</p>}
      {!!audit.certificationIssues.length && <a className="btn btn-primary import-audit-action" href="./assistant/#certification">Ouvrir la certification des cartes →</a>}
    </div>}
  </section>;
}
