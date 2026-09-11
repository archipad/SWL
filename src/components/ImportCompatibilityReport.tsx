import { useMemo, useState } from 'react';
import { frenchCardName } from '../lib/cardNames';
import { auditImportedList } from '../lib/importAudit';
import type { ParsedList } from '../types';

export function ImportCompatibilityReport({ list }: { list: ParsedList }) {
  const audit = useMemo(() => auditImportedList(list), [list]);
  const [expanded, setExpanded] = useState(!audit.safeForEngine);
  return <section className={`import-audit ${audit.safeForEngine ? 'import-audit-ok' : 'import-audit-warning'}`}>
    <button type="button" className="import-audit-summary" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
      <span className="import-audit-icon">{audit.safeForEngine ? '✓' : '!'}</span>
      <span><strong>{audit.safeForEngine ? 'Liste prête pour le moteur' : `${audit.issues.length} contrôle(s) requis`}</strong><small>{audit.readyCards}/{audit.cards} cartes raccordées et certifiées</small></span>
      <span>{expanded ? '▴' : '▾'}</span>
    </button>
    {expanded && <div className="import-audit-details">
      {audit.units.map((unit) => <article key={unit.name}>
        <div><strong>{frenchCardName(unit.name)}</strong><span>{unit.models === null ? 'Effectif ?' : `${unit.models} figurine${unit.models > 1 ? 's' : ''}`} · {unit.maxWounds === null ? 'PV ?' : `${unit.maxWounds} PV totaux`}</span></div>
        {unit.issues.length ? <ul>{unit.issues.map((issue, index) => <li key={`${issue.card}-${issue.kind}-${index}`}><b>{frenchCardName(issue.card)}</b> — {issue.message}</li>)}</ul> : <span className="import-audit-unit-ok">✓ Données moteur complètes</span>}
      </article>)}
      {!audit.safeForEngine && <p className="import-audit-blocking">Les cartes signalées restent utilisables visuellement, mais leurs données non certifiées ne seront jamais inventées par le moteur.</p>}
      {!audit.safeForEngine && <a className="btn btn-primary import-audit-action" href="./assistant/#certification">Ouvrir la certification des cartes →</a>}
    </div>}
  </section>;
}
