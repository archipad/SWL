import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { frenchCardName } from '../lib/cardNames';
import { auditImportedList } from '../lib/importAudit';
import type { ParsedList } from '../types';

type SelfAuditFinding = { level: 'error' | 'warning'; scope: string; message: string };
type SelfAuditResult = { errorCount: number; warningCount: number; findings: SelfAuditFinding[] };
type SelfAuditState = { status: 'idle' } | { status: 'running' } | { status: 'done'; result: SelfAuditResult } | { status: 'timeout' } | { status: 'error'; message: string };

// Le vrai Assistant (jeu de cartes complet, moteur d'attaque) tourne dans un cadre caché : au-delà
// de ce délai, on considère que quelque chose s'est mal passé plutôt que de bloquer la page indéfiniment.
const SELF_AUDIT_TIMEOUT_MS = 6 * 60 * 1000;

/**
 * Lance l'audit de partie complète (fiches + toutes les attaques possibles) dans un cadre caché
 * chargeant le vrai Assistant avec les listes actuellement importées. Aucune trace durable :
 * le stockage local est sauvegardé avant et restauré après, quoi qu'il arrive (succès, échec,
 * délai dépassé ou fermeture de l'onglet), pour ne jamais laisser de jetons/historique fictifs
 * dans une vraie partie.
 */
function useSelfAudit() {
  const [state, setState] = useState<SelfAuditState>({ status: 'idle' });
  const cleanupRef = useRef<(() => void) | null>(null);

  // Si le composant disparaît (liste supprimée, navigation) pendant un audit en cours, on nettoie
  // quand même pour ne jamais laisser le stockage local dans l'état intermédiaire de l'audit.
  useEffect(() => () => cleanupRef.current?.(), []);

  const run = useCallback(() => {
    const snapshot: Record<string, string> = {};
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key !== null) snapshot[key] = window.localStorage.getItem(key) ?? '';
    }
    const restore = () => {
      window.localStorage.clear();
      for (const [key, value] of Object.entries(snapshot)) window.localStorage.setItem(key, value);
    };

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.src = './assistant/index.html?selfaudit=1';

    const warnBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warnBeforeUnload);

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('beforeunload', warnBeforeUnload);
      window.clearTimeout(timeoutId);
      iframe.remove();
      restore();
      cleanupRef.current = null;
    };
    cleanupRef.current = cleanup;

    const timeoutId = window.setTimeout(() => { cleanup(); setState({ status: 'timeout' }); }, SELF_AUDIT_TIMEOUT_MS);

    function onMessage(event: MessageEvent) {
      if (event.source !== iframe.contentWindow || event.data?.source !== 'swl-self-audit') return;
      const { errorCount, warningCount, findings } = event.data as SelfAuditResult;
      cleanup();
      setState({ status: 'done', result: { errorCount, warningCount, findings } });
    }
    window.addEventListener('message', onMessage);

    document.body.appendChild(iframe);
    setState({ status: 'running' });
  }, []);

  return { state, run };
}

function SelfAuditPanel({ safeForEngine }: { safeForEngine: boolean }) {
  const { state, run } = useSelfAudit();
  return <div className="self-audit-trigger">
    <button type="button" className="btn btn-ghost" onClick={run} disabled={!safeForEngine || state.status === 'running'}>
      🧪 Auditer cette liste avant de jouer
    </button>
    {!safeForEngine && <small className="import-audit-blocking">Certifiez d’abord les cartes ci-dessus : l’audit rejoue de vraies attaques, il lui faut des dés fiables.</small>}
    {state.status === 'running' && <p className="self-audit-status self-audit-running">Audit en cours (fiches et toutes les attaques possibles)… jusqu’à quelques minutes selon la taille de la liste. Ne fermez pas cet onglet.</p>}
    {state.status === 'timeout' && <p className="self-audit-status self-audit-fail">L’audit n’a pas répondu à temps et a été arrêté. Réessayez ; si ça persiste, lancez <code>node scripts/audit-list-playthrough.mjs</code> pour un diagnostic plus détaillé.</p>}
    {state.status === 'done' && <div className={`self-audit-status ${state.result.errorCount ? 'self-audit-fail' : 'self-audit-ok'}`}>
      <p><strong>{state.result.errorCount ? `${state.result.errorCount} problème(s) trouvé(s)` : '✓ Aucun blocage ni mot-clé manquant'}</strong>{!!state.result.warningCount && ` · ${state.result.warningCount} avertissement(s) non bloquant(s)`}</p>
      {!!state.result.findings.length && <ul>{state.result.findings.map((finding, index) => <li key={index} className={finding.level === 'error' ? 'self-audit-finding-error' : 'self-audit-finding-warning'}><b>[{finding.scope}]</b> {finding.message}</li>)}</ul>}
    </div>}
  </div>;
}

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
  const unknownCards = new Set(audit.issues.filter((issue) => issue.resolution === 'unknown-card').map((issue) => issue.card)).size;
  const visualOnly = new Set(audit.issues.filter((issue) => issue.resolution === 'visual-unmapped').map((issue) => issue.card)).size;
  const translationOnly = new Set(audit.issues.filter((issue) => issue.resolution === 'translation-unmapped').map((issue) => issue.card)).size;
  return <section className={`import-audit ${audit.complete ? 'import-audit-ok' : 'import-audit-warning'}`}>
    <button type="button" className="import-audit-summary" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
      <span className="import-audit-icon">{audit.safeForEngine ? '✓' : '!'}</span>
      <span><strong>{title}</strong><small>{detail}</small></span>
      <span>{expanded ? '▴' : '▾'}</span>
    </button>
    {expanded && <div className="import-audit-details">
      {!!audit.issues.length && <div className="import-audit-categories" aria-label="Nature des raccordements nécessaires">
        {!!unknownCards && <span><b>{unknownCards}</b> réellement inconnue{unknownCards > 1 ? 's' : ''}</span>}
        {!!visualOnly && <span><b>{visualOnly}</b> visuel{visualOnly > 1 ? 's' : ''} à raccorder</span>}
        {!!translationOnly && <span><b>{translationOnly}</b> traduction{translationOnly > 1 ? 's' : ''} à raccorder</span>}
        {!!audit.certificationCards && <span><b>{audit.certificationCards}</b> certification{audit.certificationCards > 1 ? 's' : ''} moteur</span>}
      </div>}
      {audit.units.map((unit) => <article key={unit.name}>
        <div><strong>{frenchCardName(unit.name)}</strong></div>
        {unit.issues.length ? <ul>{unit.issues.map((issue, index) => <li key={`${issue.card}-${issue.kind}-${index}`}><b>{frenchCardName(issue.card)}</b> — {issue.message}</li>)}</ul> : <span className="import-audit-unit-ok">✓ Données moteur complètes</span>}
      </article>)}
      {!!audit.certificationIssues.length && <p className="import-audit-blocking">Les données moteur signalées doivent être certifiées avant d’être appliquées automatiquement.</p>}
      {!audit.certificationIssues.length && !!audit.catalogIssues.length && <p className="import-audit-blocking">Les dés, la défense et les effectifs sont certifiés. Les éléments ci-dessus concernent uniquement les visuels ou les noms du catalogue.</p>}
      {!!audit.certificationIssues.length && <a className="btn btn-primary import-audit-action" href="./assistant/#certification">Ouvrir la certification des cartes →</a>}
      <SelfAuditPanel safeForEngine={audit.safeForEngine} />
    </div>}
  </section>;
}
