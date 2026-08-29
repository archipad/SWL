import { normalizeName } from '../lib/normalize';

/**
 * Visuel de carte (scan officiel, recadré depuis les PDF d'impression fournis
 * par l'utilisateur) pour quelques cartes, affiché dans l'onglet Combat une
 * fois l'attaquant/le défenseur sélectionné.
 *
 * PROTOTYPE : seules 3 cartes sont couvertes pour l'instant (une unité
 * Empire au format paysage, une autre pour vérifier le calage, une
 * amélioration au format portrait) — le temps de valider le rendu avant de
 * lancer le découpage des ~105 cartes restantes. Fonctionne comme
 * `cardTags.ts` : simple table nom-normalisé -> chemin d'image, à étoffer
 * au fil de l'eau. Aucune image = aucun visuel affiché (pas d'erreur).
 *
 * Fichiers dans `public/cards/`, non précachés par le service worker
 * (volontaire : la liste va grossir, mieux vaut les charger à la demande
 * plutôt que gonfler l'installation PWA).
 */
const RAW: Record<string, string> = {
  'Stormtrooper Riot Squad': 'stormtrooper-riot-squad.jpg',
  Stormtroopers: 'stormtroopers.jpg',
  'DLT-19 Stormtrooper': 'dlt-19-stormtrooper.jpg',
};

export const CARD_IMAGES: Record<string, string> = Object.fromEntries(
  Object.entries(RAW).map(([name, file]) => [normalizeName(name), `${import.meta.env.BASE_URL}cards/${file}`]),
);
