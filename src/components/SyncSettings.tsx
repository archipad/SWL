import { useEffect, useRef, useState } from 'react';
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

/**
 * Panneau d'appairage : transmet le jeton déjà actif sur cet appareil à un
 * autre (tablette, téléphone) sans le ressaisir au clavier tactile. Le lien
 * (et son QR code) porte `#sync-token=...` ; il est consommé et effacé de la
 * barre d'adresse dès le chargement sur le nouvel appareil (voir useSync.ts).
 * Le jeton circule en clair dans ce lien : à n'envoyer qu'à soi-même (QR
 * affiché à l'écran d'un appareil à l'autre, ou canal déjà privé).
 */
function PairingPanel({ token }: { token: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pairingUrl, setPairingUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [qrError, setQrError] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.hash = `sync-token=${encodeURIComponent(token)}`;
    const full = url.toString();
    setPairingUrl(full);

    let cancelled = false;
    setQrError(false);
    // Import dynamique : évite d'alourdir le bundle principal pour une
    // fonctionnalité annexe (appairage), chargée seulement à l'ouverture de
    // ce panneau.
    import('qrcode')
      .then((QRCode) => {
        if (cancelled || !canvasRef.current) return;
        return QRCode.toCanvas(canvasRef.current, full, { width: 220, margin: 1 });
      })
      .catch(() => { if (!cancelled) setQrError(true); });
    return () => { cancelled = true; };
  }, [token]);

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div className="sync-pairing">
      <p className="import-note">
        Sur le nouvel appareil : ouvrez l'appli puis scannez ce QR code avec l'appareil photo, ou
        ouvrez directement le lien ci-dessous. Le jeton s'active automatiquement, sans ressaisie.
      </p>
      {!qrError && <canvas ref={canvasRef} className="sync-qr" width={220} height={220} />}
      <div className="sync-pairing-actions">
        <input
          type="text"
          readOnly
          value={pairingUrl}
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          className="btn btn-ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(pairingUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              // Presse-papiers indisponible (permissions, contexte non sécurisé) :
              // le champ texte au-dessus reste sélectionnable manuellement.
            }
          }}
        >
          {copied ? 'Copié ✓' : 'Copier le lien'}
        </button>
        {canShare && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              navigator.share({ url: pairingUrl, title: 'Legion Compagnon — appairage' }).catch(() => {});
            }}
          >
            Partager…
          </button>
        )}
      </div>
      <p className="sync-pairing-warning">
        ⚠️ Ce lien contient votre jeton en clair : ne l'envoyez qu'à vous-même, sur un appareil que
        vous contrôlez.
      </p>
    </div>
  );
}

export function SyncSettings({ token, status, error, lastSyncAt, onSaveToken, onRemoveToken, onSyncNow }: Props) {
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(!token);
  const [pairing, setPairing] = useState(false);

  // Cas de l'appairage par lien/QR (voir useSync.ts) : au premier rendu le
  // jeton n'est pas encore lu depuis l'URL (`token` vaut alors null), donc
  // `editing` s'initialise à `true` ci-dessus. Une fois le jeton hydraté
  // juste après, il faut quitter le formulaire de saisie sans action de
  // l'utilisateur — sinon l'appairage semble n'avoir rien fait à l'écran.
  useEffect(() => {
    if (token) setEditing(false);
  }, [token]);

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
            (ne cochez que la case <strong>gist</strong>) sur un premier appareil et collez-le
            ci-dessous. Pour les appareils suivants, inutile de le ressaisir au clavier tactile :
            utilisez ensuite le bouton « Ajouter un appareil » pour l'appairer par QR code. Il
            reste stocké uniquement sur cet appareil et n'est envoyé qu'à GitHub.
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
        <>
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
            <button type="button" className="btn btn-ghost" onClick={() => setPairing((v) => !v)}>
              📱 {pairing ? 'Masquer' : 'Ajouter un appareil'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}>
              Changer le jeton
            </button>
            <button type="button" className="btn btn-ghost btn-danger" onClick={onRemoveToken}>
              Désactiver sur cet appareil
            </button>
          </div>
          {pairing && <PairingPanel token={token} />}
        </>
      )}
      {error && <p className="sync-error">{error}</p>}
    </div>
  );
}
