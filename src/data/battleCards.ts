/**
 * Cartes de bataille (Battle Cards) : visuels extraits par l'utilisateur du
 * PDF officiel « Battle_Cards_FR_MAJ23.02.2026.pdf » et recadrés un par un
 * (public/battlecards/*.jpg) — pas de texte ni de mise en page réinventés,
 * uniquement le visuel imprimé tel quel. Utilisé par l'onglet Suivi de
 * partie pour reproduire les 3 emplacements du tapis de jeu physique :
 *  - rouge : Objectif (mission principale) + son visuel de déploiement
 *  - orange : Objectif secondaire
 *  - vert : Avantage (règles spéciales), un par joueur
 *
 * Note : « S'Accaparer la Science » n'a pas de visuel de déploiement dans le
 * PDF fourni (absent des 5 pages) — mapImage reste undefined pour cette
 * carte plutôt que d'en inventer un.
 */

const BASE = `${import.meta.env.BASE_URL}battlecards/`;

export interface ObjectiveCard {
  id: string;
  name: string;
  cardImage: string;
  mapImage?: string;
}

export interface SimpleCard {
  id: string;
  name: string;
  image: string;
}

export const OBJECTIVE_CARDS: ObjectiveCard[] = [
  { id: 'changement-de-priorites', name: 'Changement de Priorités', cardImage: `${BASE}objectif_changement-de-priorites_card.jpg`, mapImage: `${BASE}objectif_changement-de-priorites_map.jpg` },
  { id: 'saccaparer-la-science', name: "S'Accaparer la Science", cardImage: `${BASE}objectif_saccaparer-la-science_card.jpg` },
  { id: 'interception-des-signaux', name: 'Interception des Signaux', cardImage: `${BASE}objectif_interception-des-signaux_card.jpg`, mapImage: `${BASE}objectif_interception-des-signaux_map.jpg` },
  { id: 'percee', name: 'Percée', cardImage: `${BASE}objectif_percee_card.jpg`, mapImage: `${BASE}objectif_percee_map.jpg` },
  { id: 'a-lassaut-du-bunker', name: "À l'Assaut du Bunker", cardImage: `${BASE}objectif_a-lassaut-du-bunker_card.jpg`, mapImage: `${BASE}objectif_a-lassaut-du-bunker_map.jpg` },
  { id: 'encerclement', name: 'Encerclement', cardImage: `${BASE}objectif_encerclement_card.jpg`, mapImage: `${BASE}objectif_encerclement_map.jpg` },
  { id: 'manoeuvre-de-debordement', name: 'Manœuvre de Débordement', cardImage: `${BASE}objectif_manoeuvre-de-debordement_card.jpg`, mapImage: `${BASE}objectif_manoeuvre-de-debordement_map.jpg` },
];

export const SECONDARY_OBJECTIVE_CARDS: SimpleCard[] = [
  { id: 'cibles-marquees', name: 'Cibles Marquées', image: `${BASE}secondaire_cibles-marquees.jpg` },
  { id: 'forcer-la-reddition', name: 'Forcer la Reddition', image: `${BASE}secondaire_forcer-la-reddition.jpg` },
  { id: 'operation-de-degagement', name: 'Opération de Dégagement', image: `${BASE}secondaire_operation-de-degagement.jpg` },
  { id: 'inspection-de-surface', name: 'Inspection de Surface', image: `${BASE}secondaire_inspection-de-surface.jpg` },
  { id: 'detruire-la-base-ennemie', name: 'Détruire la Base Ennemie', image: `${BASE}secondaire_detruire-la-base-ennemie.jpg` },
  { id: 'mission-de-reconnaissance', name: 'Mission de Reconnaissance', image: `${BASE}secondaire_mission-de-reconnaissance.jpg` },
  { id: 'approvisionnement', name: 'Approvisionnement', image: `${BASE}secondaire_approvisionnement.jpg` },
];

export const ADVANTAGE_CARDS: SimpleCard[] = [
  { id: 'renseignements-avances', name: 'Renseignements Avancés', image: `${BASE}advantage_renseignements-avances.jpg` },
  { id: 'deploiement-astucieux', name: 'Déploiement Astucieux', image: `${BASE}advantage_deploiement-astucieux.jpg` },
  { id: 'positions-fortifiees', name: 'Positions Fortifiées', image: `${BASE}advantage_positions-fortifiees.jpg` },
  { id: 'garnison', name: 'Garnison', image: `${BASE}advantage_garnison.jpg` },
  { id: 'artillerie', name: 'Artillerie', image: `${BASE}advantage_artillerie.jpg` },
  { id: 'mitraillage-au-sol', name: 'Mitraillage au Sol', image: `${BASE}advantage_mitraillage-au-sol.jpg` },
  { id: 'operations-secretes', name: 'Opérations Secrètes', image: `${BASE}advantage_operations-secretes.jpg` },
  { id: 'frappe-coordonnee', name: 'Frappe Coordonnée', image: `${BASE}advantage_frappe-coordonnee.jpg` },
  { id: 'prise-de-controle', name: 'Prise de Contrôle', image: `${BASE}advantage_prise-de-controle.jpg` },
  { id: 'pas-de-temps-a-perdre', name: 'Pas de Temps à Perdre', image: `${BASE}advantage_pas-de-temps-a-perdre.jpg` },
];
