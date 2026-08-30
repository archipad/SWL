import type { ParsedList } from '../types';

/**
 * Synchronisation des listes importées entre appareils, via un Gist GitHub
 * privé appartenant à l'utilisateur (pas de service tiers, pas de serveur à
 * nous : l'appli statique parle directement à l'API GitHub depuis le
 * navigateur de chaque appareil).
 *
 * Le jeton d'accès personnel (scope « gist ») est saisi une fois par
 * appareil et reste uniquement dans le localStorage de cet appareil — il
 * n'est jamais envoyé ailleurs qu'à api.github.com. Le gist de synchro est
 * retrouvé automatiquement sur chaque appareil via sa description fixe
 * (GIST_DESCRIPTION), donc il suffit de coller le même jeton sur chaque
 * appareil : pas d'identifiant de gist à copier à la main.
 */

const TOKEN_KEY = 'swl.sync.token.v1';
const GIST_ID_KEY = 'swl.sync.gistId.v1';
const GIST_DESCRIPTION =
  'legion-compagnon-sync — ne pas supprimer (utilisé par l’appli Legion Compagnon pour synchroniser vos listes entre appareils)';
const GIST_FILENAME = 'legion-compagnon-lists.json';

export interface SyncPayload {
  updatedAt: number;
  listP1: ParsedList | null;
  listP2: ParsedList | null;
}

const EMPTY_PAYLOAD: SyncPayload = { updatedAt: 0, listP1: null, listP2: null };

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token.trim());
    localStorage.removeItem(GIST_ID_KEY); // un nouveau jeton peut être un autre compte : on relance la recherche
  } catch {
    // stockage indisponible : la synchro ne fonctionnera simplement pas
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(GIST_ID_KEY);
  } catch {
    // rien à faire de plus
  }
}

function getCachedGistId(): string | null {
  try {
    return localStorage.getItem(GIST_ID_KEY);
  } catch {
    return null;
  }
}

function setCachedGistId(id: string) {
  try {
    localStorage.setItem(GIST_ID_KEY, id);
  } catch {
    // pas grave : on re-recherchera le gist la prochaine fois
  }
}

export class SyncError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

async function githubFetch(token: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

function messageForStatus(status: number, fallback: string): string {
  if (status === 401) return "Jeton invalide, expiré ou révoqué — collez-en un nouveau dans les réglages de synchro.";
  if (status === 403) return "Accès refusé par GitHub (limite de requêtes atteinte, ou jeton sans la permission « gist »).";
  if (status === 404) return 'Gist de synchronisation introuvable (a-t-il été supprimé depuis github.com/gists ?).';
  return fallback;
}

/** Retrouve le gist de synchro existant (par sa description), ou le crée. */
async function findOrCreateGistId(token: string): Promise<string> {
  const cached = getCachedGistId();
  if (cached) return cached;

  for (let page = 1; page <= 5; page++) {
    const res = await githubFetch(token, `/gists?per_page=100&page=${page}`);
    if (!res.ok) throw new SyncError(messageForStatus(res.status, `Impossible de lister vos gists (${res.status}).`), res.status);
    const gists = (await res.json()) as { id: string; description: string | null }[];
    const found = gists.find((g) => g.description === GIST_DESCRIPTION);
    if (found) {
      setCachedGistId(found.id);
      return found.id;
    }
    if (gists.length < 100) break;
  }

  // Aucun trouvé : on en crée un. Secret (non listé publiquement), mais pas
  // chiffré — suffisant pour un usage personnel entre appareils.
  const createRes = await githubFetch(token, '/gists', {
    method: 'POST',
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files: { [GIST_FILENAME]: { content: JSON.stringify(EMPTY_PAYLOAD) } },
    }),
  });
  if (!createRes.ok) {
    throw new SyncError(messageForStatus(createRes.status, `Impossible de créer le gist de synchronisation (${createRes.status}).`), createRes.status);
  }
  const created = (await createRes.json()) as { id: string };
  setCachedGistId(created.id);
  return created.id;
}

export async function pullSync(token: string): Promise<SyncPayload> {
  const gistId = await findOrCreateGistId(token);
  const res = await githubFetch(token, `/gists/${gistId}`);
  if (!res.ok) throw new SyncError(messageForStatus(res.status, `Échec de la récupération (${res.status}).`), res.status);
  const gist = (await res.json()) as { files?: Record<string, { content?: string }> };
  const content = gist.files?.[GIST_FILENAME]?.content;
  if (!content) return EMPTY_PAYLOAD;
  try {
    return JSON.parse(content) as SyncPayload;
  } catch {
    return EMPTY_PAYLOAD;
  }
}

export async function pushSync(token: string, payload: { listP1: ParsedList | null; listP2: ParsedList | null }): Promise<SyncPayload> {
  const gistId = await findOrCreateGistId(token);
  const full: SyncPayload = { ...payload, updatedAt: Date.now() };
  const res = await githubFetch(token, `/gists/${gistId}`, {
    method: 'PATCH',
    body: JSON.stringify({ files: { [GIST_FILENAME]: { content: JSON.stringify(full) } } }),
  });
  if (!res.ok) throw new SyncError(messageForStatus(res.status, `Échec de l'envoi (${res.status}).`), res.status);
  return full;
}
