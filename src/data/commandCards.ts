/**
 * Cartes de Commandement (Empire et Alliance Rebelle) : visuels extraits par
 * l'utilisateur de « Rebel Alliance Commands FR.pdf » et « Galactic Empire
 * Commands FR.pdf » (planches officielles AMG), decoupees carte par carte
 * (public/commandcards/*.jpg), meme demarche que battleCards.ts.
 *
 * `requirement` est une information d'affichage (texte du bandeau bas de
 * carte : nom generique de faction, commandant/operative requis, ou
 * escouade a theme) -- elle n'est PAS verifiee automatiquement contre la
 * liste du joueur (une carte mal filtree serait pire qu'une carte affichee
 * sans filtre : le joueur reste seul juge, comme pour la carte physique).
 *
 * `ordres-permanents` (Standing Orders, 4 PIP) n'a pas de visuel : cette
 * carte generique vient du livret de regles, pas des planches Commandement ;
 * a completer si l'utilisateur fournit ce visuel.
 *
 * Regle officielle de construction de la Suite de Commandement (2026) :
 * exactement 7 cartes = 2 a 1 PIP + 2 a 2 PIP + 2 a 3 PIP + Ordres
 * Permanents (4 PIP, obligatoire), sans doublon de carte.
 */

const BASE = `${import.meta.env.BASE_URL}commandcards/`;

export type CommandFaction = 'rebelles' | 'empire';

export interface CommandCard {
  id: string;
  name: string;
  pip: 1 | 2 | 3 | 4;
  faction: CommandFaction | 'generique';
  requirement: string;
  image?: string;
}

export const COMMAND_CARDS: CommandCard[] = [
  {
    id: 'ordres-permanents', name: 'Ordres Permanents', pip: 4, faction: 'generique',
    requirement: 'Toujours disponible (aucune image encore fournie -- carte generique du livret de regles)',
  },
  {
    id: 'sabotage-des-communications', name: 'Sabotage des Communications', pip: 1, faction: 'rebelles',
    requirement: 'Alliance Rebelle', image: `${BASE}sabotage-des-communications.jpg`,
  },
  {
    id: 'tirs-de-couverture', name: 'Tirs de Couverture', pip: 3, faction: 'rebelles',
    requirement: 'Alliance Rebelle', image: `${BASE}tirs-de-couverture.jpg`,
  },
  {
    id: 'la-roue-tourne', name: 'La Roue Tourne', pip: 2, faction: 'rebelles',
    requirement: 'Alliance Rebelle', image: `${BASE}la-roue-tourne.jpg`,
  },
  {
    id: 'je-ne-suis-plus-une-jedi', name: 'Je ne Suis Plus une Jedi', pip: 1, faction: 'rebelles',
    requirement: 'Ahsoka Tano, Fulcrum', image: `${BASE}je-ne-suis-plus-une-jedi.jpg`,
  },
  {
    id: 'protectrice-veloce', name: 'Protectrice Véloce', pip: 2, faction: 'rebelles',
    requirement: 'Ahsoka Tano, Fulcrum', image: `${BASE}protectrice-veloce.jpg`,
  },
  {
    id: 'un-nouveau-depart', name: 'Un Nouveau Départ', pip: 3, faction: 'rebelles',
    requirement: 'Ahsoka Tano, Fulcrum', image: `${BASE}un-nouveau-depart.jpg`,
  },
  {
    id: 'tenir-a-tout-prix', name: 'Tenir à Tout Prix', pip: 3, faction: 'rebelles',
    requirement: 'Défenseurs de la Base Echo', image: `${BASE}tenir-a-tout-prix.jpg`,
  },
  {
    id: 'tactiques-de-temporisation', name: 'Tactiques de Temporisation', pip: 1, faction: 'rebelles',
    requirement: 'Défenseurs de la Base Echo', image: `${BASE}tactiques-de-temporisation.jpg`,
  },
  {
    id: 'courage-de-la-rebellion', name: 'Courage de la Rébellion', pip: 2, faction: 'rebelles',
    requirement: 'Défenseurs de la Base Echo', image: `${BASE}courage-de-la-rebellion.jpg`,
  },
  {
    id: 'reunion-de-famille', name: 'Réunion de Famille', pip: 2, faction: 'rebelles',
    requirement: 'Ahsoka Tano, Fulcrum', image: `${BASE}reunion-de-famille.jpg`,
  },
  {
    id: 'sacrifice', name: 'Sacrifice', pip: 3, faction: 'rebelles',
    requirement: 'K-2SO', image: `${BASE}sacrifice.jpg`,
  },
  {
    id: 'decollage', name: 'Décollage !', pip: 1, faction: 'rebelles',
    requirement: 'R2-D2', image: `${BASE}decollage.jpg`,
  },
  {
    id: 'immolation-inattendue', name: 'Immolation Inattendue', pip: 2, faction: 'rebelles',
    requirement: 'R2-D2', image: `${BASE}immolation-inattendue.jpg`,
  },
  {
    id: 'ecran-de-fumee', name: 'Écran de Fumée', pip: 3, faction: 'rebelles',
    requirement: 'R2-D2', image: `${BASE}ecran-de-fumee.jpg`,
  },
  {
    id: 'explosions', name: 'Explosions !', pip: 1, faction: 'rebelles',
    requirement: 'Sabine Wren', image: `${BASE}explosions.jpg`,
  },
  {
    id: 'symbole-de-la-rebellion', name: 'Symbole de la Rébellion', pip: 2, faction: 'rebelles',
    requirement: 'Sabine Wren', image: `${BASE}symbole-de-la-rebellion.jpg`,
  },
  {
    id: 'heritage-de-mandalore', name: 'Héritage de Mandalore', pip: 3, faction: 'rebelles',
    requirement: 'Sabine Wren', image: `${BASE}heritage-de-mandalore.jpg`,
  },
  {
    id: 'cause-commune', name: 'Cause Commune', pip: 1, faction: 'rebelles',
    requirement: 'Chewbacca', image: `${BASE}cause-commune.jpg`,
  },
  {
    id: 'le-corps-et-l-esprit', name: 'Le Corps et l\'Esprit', pip: 2, faction: 'rebelles',
    requirement: 'Chewbacca', image: `${BASE}le-corps-et-l-esprit.jpg`,
  },
  {
    id: 'vauriens-notoires', name: 'Vauriens Notoires', pip: 3, faction: 'rebelles',
    requirement: 'Chewbacca', image: `${BASE}vauriens-notoires.jpg`,
  },
  {
    id: 'desole-pour-le-desordre', name: 'Désolé pour le Désordre', pip: 1, faction: 'rebelles',
    requirement: 'Han Solo', image: `${BASE}desole-pour-le-desordre.jpg`,
  },
  {
    id: 'diversion-temeraire', name: 'Diversion Téméraire', pip: 2, faction: 'rebelles',
    requirement: 'Han Solo', image: `${BASE}diversion-temeraire.jpg`,
  },
  {
    id: 'changement-de-plans', name: 'Changement de Plans', pip: 3, faction: 'rebelles',
    requirement: 'Han Solo', image: `${BASE}changement-de-plans.jpg`,
  },
  {
    id: 'bombardement-coordonne', name: 'Bombardement Coordonné', pip: 1, faction: 'rebelles',
    requirement: 'Leia Organa', image: `${BASE}bombardement-coordonne.jpg`,
  },
  {
    id: 'une-belle-amitie', name: 'Une Belle Amitié', pip: 2, faction: 'rebelles',
    requirement: 'Leia Organa', image: `${BASE}une-belle-amitie.jpg`,
  },
  {
    id: 'l-heure-n-est-pas-au-chagrin', name: 'L\'Heure n\'est Pas au Chagrin', pip: 3, faction: 'rebelles',
    requirement: 'Han Solo', image: `${BASE}l-heure-n-est-pas-au-chagrin.jpg`,
  },
  {
    id: 'sauvons-nous-d-ici', name: 'Sauvons-nous d\'Ici !', pip: 1, faction: 'rebelles',
    requirement: 'Leia Organa', image: `${BASE}sauvons-nous-d-ici.jpg`,
  },
  {
    id: 'fils-de-skywalker', name: 'Fils de Skywalker', pip: 1, faction: 'rebelles',
    requirement: 'Luke Skywalker', image: `${BASE}fils-de-skywalker.jpg`,
  },
  {
    id: 'mon-alliee-est-la-force', name: 'Mon Alliée est la Force', pip: 2, faction: 'rebelles',
    requirement: 'Luke Skywalker', image: `${BASE}mon-alliee-est-la-force.jpg`,
  },
  {
    id: 'le-retour-du-jedi', name: 'Le Retour du Jedi', pip: 3, faction: 'rebelles',
    requirement: 'Luke Skywalker', image: `${BASE}le-retour-du-jedi.jpg`,
  },
  {
    id: 'plein-de-surprises', name: 'Plein de Surprises', pip: 2, faction: 'rebelles',
    requirement: 'Luke Skywalker', image: `${BASE}plein-de-surprises.jpg`,
  },
  {
    id: 'tu-sers-bien-ton-maitre', name: 'Tu Sers Bien ton Maître', pip: 1, faction: 'rebelles',
    requirement: 'Luke Skywalker', image: `${BASE}tu-sers-bien-ton-maitre.jpg`,
  },
  {
    id: 'je-suis-un-jedi', name: 'Je Suis un Jedi', pip: 3, faction: 'rebelles',
    requirement: 'Luke Skywalker', image: `${BASE}je-suis-un-jedi.jpg`,
  },
  {
    id: 'as-de-la-gachette', name: 'As de la Gâchette', pip: 1, faction: 'rebelles',
    requirement: 'Cassian Andor', image: `${BASE}as-de-la-gachette.jpg`,
  },
  {
    id: 'baroud-d-honneur', name: 'Baroud d\'Honneur', pip: 2, faction: 'rebelles',
    requirement: 'Cassian Andor', image: `${BASE}baroud-d-honneur.jpg`,
  },
  {
    id: 'mission-de-volontaires', name: 'Mission de Volontaires', pip: 3, faction: 'rebelles',
    requirement: 'Cassian Andor', image: `${BASE}mission-de-volontaires.jpg`,
  },
  {
    id: 'insoumise', name: 'Insoumise', pip: 1, faction: 'rebelles',
    requirement: 'Jyn Erso', image: `${BASE}insoumise.jpg`,
  },
  {
    id: 'la-confiance-va-dans-les-deux-sens', name: 'La Confiance Va dans les Deux Sens', pip: 2, faction: 'rebelles',
    requirement: 'Jyn Erso', image: `${BASE}la-confiance-va-dans-les-deux-sens.jpg`,
  },
  {
    id: 'les-rebellions-sont-baties-sur-l-espoir', name: 'Les Rébellions sont Bâties sur l\'Espoir', pip: 3, faction: 'rebelles',
    requirement: 'Jyn Erso', image: `${BASE}les-rebellions-sont-baties-sur-l-espoir.jpg`,
  },
  {
    id: 'spike-corellien', name: 'Spike Corellien', pip: 1, faction: 'rebelles',
    requirement: 'Lando Calrissian', image: `${BASE}spike-corellien.jpg`,
  },
  {
    id: 'un-as-dans-la-manche', name: 'Un As dans la Manche', pip: 2, faction: 'rebelles',
    requirement: 'Lando Calrissian', image: `${BASE}un-as-dans-la-manche.jpg`,
  },
  {
    id: 'main-de-l-idiot', name: 'Main de l\'Idiot', pip: 3, faction: 'rebelles',
    requirement: 'Lando Calrissian', image: `${BASE}main-de-l-idiot.jpg`,
  },
  {
    id: 'repere', name: 'Repéré', pip: 2, faction: 'empire',
    requirement: 'Empire Galactique', image: `${BASE}repere.jpg`,
  },
  {
    id: 'surveillance-secrete', name: 'Surveillance Secrète', pip: 1, faction: 'empire',
    requirement: 'Empire Galactique', image: `${BASE}surveillance-secrete.jpg`,
  },
  {
    id: 'tirs-coordonnes', name: 'Tirs Coordonnés', pip: 3, faction: 'empire',
    requirement: 'Empire Galactique', image: `${BASE}tirs-coordonnes.jpg`,
  },
  {
    id: 'viens-donc-le-prouver', name: 'Viens Donc le Prouver', pip: 1, faction: 'empire',
    requirement: 'La Septième Sœur', image: `${BASE}viens-donc-le-prouver.jpg`,
  },
  {
    id: 'tu-caches-mal-ta-peur', name: 'Tu Caches Mal ta Peur', pip: 2, faction: 'empire',
    requirement: 'La Septième Sœur', image: `${BASE}tu-caches-mal-ta-peur.jpg`,
  },
  {
    id: 'inattendu-mais-bienvenu', name: 'Inattendu, Mais Bienvenu !', pip: 3, faction: 'empire',
    requirement: 'La Septième Sœur', image: `${BASE}inattendu-mais-bienvenu.jpg`,
  },
  {
    id: 'je-me-fiche-de-vos-inquietudes', name: 'Je me Fiche de vos Inquiétudes', pip: 1, faction: 'empire',
    requirement: 'Le Cinquième Frère', image: `${BASE}je-me-fiche-de-vos-inquietudes.jpg`,
  },
  {
    id: 'tu-voudrais-m-interroger', name: 'Tu Voudrais m\'Interroger ?', pip: 2, faction: 'empire',
    requirement: 'Le Cinquième Frère', image: `${BASE}tu-voudrais-m-interroger.jpg`,
  },
  {
    id: 'mourir-de-ma-main', name: 'Mourir de ma Main', pip: 1, faction: 'empire',
    requirement: 'Moff Gideon', image: `${BASE}mourir-de-ma-main.jpg`,
  },
  {
    id: 'vous-avez-ce-que-je-veux', name: 'Vous Avez ce que Je Veux', pip: 2, faction: 'empire',
    requirement: 'Moff Gideon', image: `${BASE}vous-avez-ce-que-je-veux.jpg`,
  },
  {
    id: 'instant-de-reflexion', name: 'Instant de Réflexion', pip: 3, faction: 'empire',
    requirement: 'Moff Gideon', image: `${BASE}instant-de-reflexion.jpg`,
  },
  {
    id: 'ambition-devorante', name: 'Ambition Dévorante', pip: 1, faction: 'empire',
    requirement: 'Directeur Orson Krennic', image: `${BASE}ambition-devorante.jpg`,
  },
  {
    id: 'deployez-la-garnison', name: 'Déployez la Garnison', pip: 2, faction: 'empire',
    requirement: 'Directeur Orson Krennic', image: `${BASE}deployez-la-garnison.jpg`,
  },
  {
    id: 'une-annihilation-se-profile', name: 'Une Annihilation se Profile', pip: 3, faction: 'empire',
    requirement: 'Directeur Orson Krennic', image: `${BASE}une-annihilation-se-profile.jpg`,
  },
  {
    id: 'puissance-de-feu-maximale', name: 'Puissance de Feu Maximale', pip: 1, faction: 'empire',
    requirement: 'Général Veers', image: `${BASE}puissance-de-feu-maximale.jpg`,
  },
  {
    id: 'manoeuvres-d-evasion', name: 'Manœuvres d\'Évasion', pip: 2, faction: 'empire',
    requirement: 'Directeur Orson Krennic', image: `${BASE}manoeuvres-d-evasion.jpg`,
  },
  {
    id: 'discipline-imperiale', name: 'Discipline Impériale', pip: 3, faction: 'empire',
    requirement: 'Général Veers', image: `${BASE}discipline-imperiale.jpg`,
  },
  {
    id: 'puissance-de-vador', name: 'Puissance de Vador', pip: 1, faction: 'empire',
    requirement: 'Dark Vador', image: `${BASE}puissance-de-vador.jpg`,
  },
  {
    id: 'impitoyable', name: 'Impitoyable', pip: 1, faction: 'empire',
    requirement: 'Dark Vador', image: `${BASE}impitoyable.jpg`,
  },
  {
    id: 'nouvelle-technique-de-motivation', name: 'Nouvelle Technique de Motivation', pip: 2, faction: 'empire',
    requirement: 'Dark Vador', image: `${BASE}nouvelle-technique-de-motivation.jpg`,
  },
  {
    id: 'la-peur-et-les-hommes-morts', name: 'La Peur et les Hommes Morts', pip: 2, faction: 'empire',
    requirement: 'Dark Vador', image: `${BASE}la-peur-et-les-hommes-morts.jpg`,
  },
  {
    id: 'les-tenebres-nous-envahissent', name: 'Les Ténèbres nous Envahissent', pip: 1, faction: 'empire',
    requirement: 'Dark Vador', image: `${BASE}les-tenebres-nous-envahissent.jpg`,
  },
  {
    id: 'maitre-du-mal', name: 'Maître du Mal', pip: 2, faction: 'empire',
    requirement: 'Dark Vador', image: `${BASE}maitre-du-mal.jpg`,
  },
  {
    id: 'viens-me-combattre', name: 'Viens me Combattre !', pip: 1, faction: 'empire',
    requirement: 'Agent Kallus', image: `${BASE}viens-me-combattre.jpg`,
  },
  {
    id: 'investigation-du-bsi', name: 'Investigation du BSI', pip: 2, faction: 'empire',
    requirement: 'Agent Kallus', image: `${BASE}investigation-du-bsi.jpg`,
  },
  {
    id: 'tactiques-impitoyables', name: 'Tactiques Impitoyables', pip: 3, faction: 'empire',
    requirement: 'Dark Vador', image: `${BASE}tactiques-impitoyables.jpg`,
  },
  {
    id: 'scanner-coronaire', name: 'Scanner Coronaire', pip: 1, faction: 'empire',
    requirement: 'Iden Versio', image: `${BASE}scanner-coronaire.jpg`,
  },
  {
    id: 'neutralisation', name: 'Neutralisation', pip: 2, faction: 'empire',
    requirement: 'Iden Versio', image: `${BASE}neutralisation.jpg`,
  },
  {
    id: 'frappe-tactique', name: 'Frappe Tactique', pip: 3, faction: 'empire',
    requirement: 'Iden Versio', image: `${BASE}frappe-tactique.jpg`,
  },
  {
    id: 'deflagration-confinee', name: 'Déflagration Confinée', pip: 2, faction: 'empire',
    requirement: 'Iden Versio', image: `${BASE}deflagration-confinee.jpg`,
  },
  {
    id: 'feu-incessant', name: 'Feu Incessant', pip: 1, faction: 'empire',
    requirement: 'Force Blizzard', image: `${BASE}feu-incessant.jpg`,
  },
  {
    id: 'tir-de-barrage-accablant', name: 'Tir de Barrage Accablant', pip: 2, faction: 'empire',
    requirement: 'Force Blizzard', image: `${BASE}tir-de-barrage-accablant.jpg`,
  },
  {
    id: 'debarquement-pour-assaut-terrestre', name: 'Débarquement pour Assaut Terrestre', pip: 3, faction: 'empire',
    requirement: 'Force Blizzard', image: `${BASE}debarquement-pour-assaut-terrestre.jpg`,
  },
  {
    id: 'chassez-les', name: 'Chassez-les !', pip: 1, faction: 'empire',
    requirement: 'Force Tempest', image: `${BASE}chassez-les.jpg`,
  },
  {
    id: 'besoin-de-renforts', name: 'Besoin de Renforts !', pip: 2, faction: 'empire',
    requirement: 'Force Tempest', image: `${BASE}besoin-de-renforts.jpg`,
  },
  {
    id: 'prets-a-riposter', name: 'Prêts à Riposter', pip: 3, faction: 'empire',
    requirement: 'Force Tempest', image: `${BASE}prets-a-riposter.jpg`,
  },
  {
    id: 'artillerie-infanterie', name: 'Artillerie, Infanterie !', pip: 1, faction: 'empire',
    requirement: 'Major Marquand', image: `${BASE}artillerie-infanterie.jpg`,
  },
  {
    id: 'escadron-avec-moi', name: 'Escadron, Avec Moi !', pip: 2, faction: 'empire',
    requirement: 'Major Marquand', image: `${BASE}escadron-avec-moi.jpg`,
  },
  {
    id: 'cavalerie-blindee', name: 'Cavalerie Blindée', pip: 3, faction: 'empire',
    requirement: 'Major Marquand', image: `${BASE}cavalerie-blindee.jpg`,
  },
];

export const COMMAND_SUITE_RULE = { total: 7, perPip: { 1: 2, 2: 2, 3: 2, 4: 1 } } as const;

