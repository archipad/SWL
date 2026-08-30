import { useState } from 'react';
import type { SyncStatus } from '../lib/useSync';

interface Props {
  token: string | null;
  status: SyncStatus;
  error: string | null;
  lastSyncAt: number | null;
  onSaveToken: (token: string) => void;
  onRemoveToken: () => void;
  onSyncNow: () => void;
}

const TOKEN_URL =
  'https://github.com/settings/tokens/new?description=Legion%20Compagnon&scopes=gist';

const STATUS_LABEL: Record<SyncStatus, string> = {
  disabled: 'Non configurée',
  idle: 'Synchronisé ✓',
  syncing: 'Synchronisation…',
  error: 'Erreur',
};

export function SyncSettings({ token, status, error, lastSyncAt, onSaveToken, onRemoveToken, onSyncNow }: Props) {
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(!token);

  return (
    <div className="sync-panel">
      <h3>Synchronisation entre appareils</h3>
      {!token || editing ? (
        <>
          <p className="import-note">
            Pour retrouver vos listes automatiquement sur tous vos appareils (PC, tablette,
            téléphone) sans les réimporter à chaque fois : créez un{' '}
            <a href={TOKEN_URL} target="_blank" rel="noreferrer">
              jeton d'accès personnel GitHub
            </a>{' '}
            (ne cochez que la case <strong>gist</strong>), collez-le ci-dessous, puis répétez
            l'opération avec <strong>le même jeton</strong> sur chaque appareil. Il reste stocké
            uniquement sur cet appareil et n'est envoyé qu'à GitHub.
          </p>
          <div className="sync-token-row">
            <input
              type="password"
              placeholder="ghp_…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoComplete="off"
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={!draft.trim()}
              onClick={() => {
                onSaveToken(draft.trim());
                setDraft('');
                setEditing(false);
              }}
            >
              Activer
            </button>
            {token && (
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
                Annuler
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="sync-status-row">
          <span className={`sync-badge sync-badge-${status}`}>{STATUS_LABEL[status]}</span>
          {lastSyncAt && status !== 'error' && (
            <span className="sync-last">
              Dernière synchro : {new Date(lastSyncAt).toLocaleTimeString('fr-FR')}
            </span>
          )}
          <button type="button" className="btn btn-ghost" onClick={onSyncNow} disabled={status === 'syncing'}>
            Synchroniser maintenant
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}>
            Changer le jeton
          </button>
          <button type="button" className="btn btn-ghost btn-danger" onClick={onRemoveToken}>
            Désactiver sur cet appareil
          </button>
        </div>
      )}
      {error && <p className="sync-error">{error}</p>}
    </div>
  );
}
