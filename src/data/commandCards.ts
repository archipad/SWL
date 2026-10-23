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
 * `ordres-permanents` (Standing Orders, 4 PIP) : visuel fourni par
 * l'utilisateur (carte generique du livret de regles, pas des planches
 * Commandement Rebelle/Empire).
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
  /** Nom anglais Tabletop Admiral (exports de listes) quand la correspondance est certaine. */
  englishName?: string;
  pip: 1 | 2 | 3 | 4;
  faction: CommandFaction | 'generique';
  requirement: string;
  image?: string;
}

export const COMMAND_CARDS: CommandCard[] = [
  {
    id: 'ordres-permanents', name: 'Ordres Permanents', englishName: 'Standing Orders', pip: 4, faction: 'generique',
    requirement: 'Toujours disponible (carte generique du livret de regles)', image: `${BASE}ordres-permanents.jpg`,
  },
  // Cartes génériques du livret de règles : Ambush, Push et Assault figurent dans les exports Tabletop Admiral
  // et complètent une main de 7 cartes (ajoutées le 02/10/2026). Visuels : fiches FR communautaires (texte
  // superposé sur le visuel anglais Legion HQ), validées par Antoine le 23/10/2026.
  {
    id: 'embuscade', name: 'Embuscade', englishName: 'Ambush', pip: 1, faction: 'generique',
    requirement: 'Carte générique (Ambush) : toutes factions', image: `${BASE}embuscade.jpg`,
  },
  {
    id: 'poussee', name: 'Poussée', englishName: 'Push', pip: 2, faction: 'generique',
    requirement: 'Carte générique (Push) : toutes factions', image: `${BASE}poussee.jpg`,
  },
  {
    id: 'assaut', name: 'Assaut', englishName: 'Assault', pip: 3, faction: 'generique',
    requirement: 'Carte générique (Assault) : toutes factions', image: `${BASE}assaut.jpg`,
  },
  {
    id: 'sabotage-des-communications', name: 'Sabotage des Communications', englishName: 'Sabotaged Communications', pip: 1, faction: 'rebelles',
    requirement: 'Alliance Rebelle', image: `${BASE}sabotage-des-communications.jpg`,
  },
  {
    id: 'tirs-de-couverture', name: 'Tirs de Couverture', englishName: 'Covering Fire', pip: 3, faction: 'rebelles',
    requirement: 'Alliance Rebelle', image: `${BASE}tirs-de-couverture.jpg`,
  },
  {
    id: 'la-roue-tourne', name: 'La Roue Tourne', englishName: 'Turning the Tide', pip: 2, faction: 'rebelles',
    requirement: 'Alliance Rebelle', image: `${BASE}la-roue-tourne.jpg`,
  },
  {
    id: 'je-ne-suis-plus-une-jedi', name: 'Je ne Suis Plus une Jedi', englishName: 'I am no Jedi', pip: 1, faction: 'rebelles',
    requirement: 'Ahsoka Tano, Fulcrum', image: `${BASE}je-ne-suis-plus-une-jedi.jpg`,
  },
  {
    id: 'protectrice-veloce', name: 'Protectrice Véloce', englishName: 'Swift Protector', pip: 2, faction: 'rebelles',
    requirement: 'Ahsoka Tano, Fulcrum', image: `${BASE}protectrice-veloce.jpg`,
  },
  {
    id: 'un-nouveau-depart', name: 'Un Nouveau Départ', englishName: 'A New Beginning', pip: 3, faction: 'rebelles',
    requirement: 'Ahsoka Tano, Fulcrum', image: `${BASE}un-nouveau-depart.jpg`,
  },
  {
    id: 'tenir-a-tout-prix', name: 'Tenir à Tout Prix', englishName: 'Hold at Any Cost', pip: 3, faction: 'rebelles',
    requirement: 'Défenseurs de la Base Echo', image: `${BASE}tenir-a-tout-prix.jpg`,
  },
  {
    id: 'tactiques-de-temporisation', name: 'Tactiques de Temporisation', englishName: 'Delaying Tactics', pip: 1, faction: 'rebelles',
    requirement: 'Défenseurs de la Base Echo', image: `${BASE}tactiques-de-temporisation.jpg`,
  },
  {
    id: 'courage-de-la-rebellion', name: 'Courage de la Rébellion', englishName: 'Courage of the Rebellion', pip: 2, faction: 'rebelles',
    requirement: 'Défenseurs de la Base Echo', image: `${BASE}courage-de-la-rebellion.jpg`,
  },
  {
    id: 'reunion-de-famille', name: 'Réunion de Famille', englishName: 'Family Reunion', pip: 2, faction: 'rebelles',
    requirement: 'Ahsoka Tano, Fulcrum', image: `${BASE}reunion-de-famille.jpg`,
  },
  {
    id: 'sacrifice', name: 'Sacrifice', englishName: 'Sacrifice', pip: 3, faction: 'rebelles',
    requirement: 'K-2SO', image: `${BASE}sacrifice.jpg`,
  },
  {
    id: 'decollage', name: 'Décollage !', englishName: 'Blast Off!', pip: 1, faction: 'rebelles',
    requirement: 'R2-D2', image: `${BASE}decollage.jpg`,
  },
  {
    id: 'immolation-inattendue', name: 'Immolation Inattendue', englishName: 'Impromptu Immolation', pip: 2, faction: 'rebelles',
    requirement: 'R2-D2', image: `${BASE}immolation-inattendue.jpg`,
  },
  {
    id: 'ecran-de-fumee', name: 'Écran de Fumée', englishName: 'Smoke Screen', pip: 3, faction: 'rebelles',
    requirement: 'R2-D2', image: `${BASE}ecran-de-fumee.jpg`,
  },
  {
    id: 'explosions', name: 'Explosions !', englishName: 'Explosions!', pip: 1, faction: 'rebelles',
    requirement: 'Sabine Wren', image: `${BASE}explosions.jpg`,
  },
  {
    id: 'symbole-de-la-rebellion', name: 'Symbole de la Rébellion', englishName: 'Symbol of Rebellion', pip: 2, faction: 'rebelles',
    requirement: 'Sabine Wren', image: `${BASE}symbole-de-la-rebellion.jpg`,
  },
  {
    id: 'heritage-de-mandalore', name: 'Héritage de Mandalore', englishName: 'Legacy of Mandalore', pip: 3, faction: 'rebelles',
    requirement: 'Sabine Wren', image: `${BASE}heritage-de-mandalore.jpg`,
  },
  {
    id: 'cause-commune', name: 'Cause Commune', englishName: 'Common Cause', pip: 1, faction: 'rebelles',
    requirement: 'Chewbacca', image: `${BASE}cause-commune.jpg`,
  },
  {
    id: 'le-corps-et-l-esprit', name: 'Le Corps et l\'Esprit', englishName: 'Brains and Brawn', pip: 2, faction: 'rebelles',
    requirement: 'Chewbacca', image: `${BASE}le-corps-et-l-esprit.jpg`,
  },
  {
    id: 'vauriens-notoires', name: 'Vauriens Notoires', englishName: 'Notorious Scoundrels', pip: 3, faction: 'rebelles',
    requirement: 'Chewbacca', image: `${BASE}vauriens-notoires.jpg`,
  },
  {
    id: 'desole-pour-le-desordre', name: 'Désolé pour le Désordre', englishName: 'Sorry About the Mess', pip: 1, faction: 'rebelles',
    requirement: 'Han Solo', image: `${BASE}desole-pour-le-desordre.jpg`,
  },
  {
    id: 'diversion-temeraire', name: 'Diversion Téméraire', englishName: 'Reckless Diversion', pip: 2, faction: 'rebelles',
    requirement: 'Han Solo', image: `${BASE}diversion-temeraire.jpg`,
  },
  {
    id: 'changement-de-plans', name: 'Changement de Plans', englishName: 'Change of Plans', pip: 3, faction: 'rebelles',
    requirement: 'Han Solo', image: `${BASE}changement-de-plans.jpg`,
  },
  {
    id: 'bombardement-coordonne', name: 'Bombardement Coordonné', englishName: 'Coordinated Bombardment', pip: 1, faction: 'rebelles',
    requirement: 'Leia Organa', image: `${BASE}bombardement-coordonne.jpg`,
  },
  {
    id: 'une-belle-amitie', name: 'Une Belle Amitié', englishName: 'A Beautiful Friendship', pip: 2, faction: 'rebelles',
    requirement: 'Leia Organa', image: `${BASE}une-belle-amitie.jpg`,
  },
  {
    id: 'l-heure-n-est-pas-au-chagrin', name: 'L\'Heure n\'est Pas au Chagrin', englishName: 'No Time for Sorrows', pip: 3, faction: 'rebelles',
    requirement: 'Han Solo', image: `${BASE}l-heure-n-est-pas-au-chagrin.jpg`,
  },
  {
    id: 'sauvons-nous-d-ici', name: 'Sauvons-nous d\'Ici !', englishName: 'Somebody Has to Save Our Skins', pip: 1, faction: 'rebelles',
    requirement: 'Leia Organa', image: `${BASE}sauvons-nous-d-ici.jpg`,
  },
  {
    id: 'fils-de-skywalker', name: 'Fils de Skywalker', englishName: 'Son of Skywalker', pip: 1, faction: 'rebelles',
    requirement: 'Luke Skywalker', image: `${BASE}fils-de-skywalker.jpg`,
  },
  {
    id: 'mon-alliee-est-la-force', name: 'Mon Alliée est la Force', englishName: 'My Ally Is the Force', pip: 2, faction: 'rebelles',
    requirement: 'Luke Skywalker', image: `${BASE}mon-alliee-est-la-force.jpg`,
  },
  {
    id: 'le-retour-du-jedi', name: 'Le Retour du Jedi', englishName: 'Return of the Jedi', pip: 3, faction: 'rebelles',
    requirement: 'Luke Skywalker', image: `${BASE}le-retour-du-jedi.jpg`,
  },
  {
    id: 'plein-de-surprises', name: 'Plein de Surprises', englishName: 'Full of Surprises', pip: 2, faction: 'rebelles',
    requirement: 'Luke Skywalker', image: `${BASE}plein-de-surprises.jpg`,
  },
  {
    id: 'tu-sers-bien-ton-maitre', name: 'Tu Sers Bien ton Maître', englishName: 'You Serve Your Master Well', pip: 1, faction: 'rebelles',
    requirement: 'Luke Skywalker', image: `${BASE}tu-sers-bien-ton-maitre.jpg`,
  },
  {
    id: 'je-suis-un-jedi', name: 'Je Suis un Jedi', englishName: 'I am a Jedi', pip: 3, faction: 'rebelles',
    requirement: 'Luke Skywalker', image: `${BASE}je-suis-un-jedi.jpg`,
  },
  {
    id: 'as-de-la-gachette', name: 'As de la Gâchette', englishName: 'Crack Shot', pip: 1, faction: 'rebelles',
    requirement: 'Cassian Andor', image: `${BASE}as-de-la-gachette.jpg`,
  },
  {
    id: 'baroud-d-honneur', name: 'Baroud d\'Honneur', englishName: 'Last Stand', pip: 2, faction: 'rebelles',
    requirement: 'Cassian Andor', image: `${BASE}baroud-d-honneur.jpg`,
  },
  {
    id: 'mission-de-volontaires', name: 'Mission de Volontaires', englishName: 'Volunteer Mission', pip: 3, faction: 'rebelles',
    requirement: 'Cassian Andor', image: `${BASE}mission-de-volontaires.jpg`,
  },
  {
    id: 'insoumise', name: 'Insoumise', englishName: 'Rebellious', pip: 1, faction: 'rebelles',
    requirement: 'Jyn Erso', image: `${BASE}insoumise.jpg`,
  },
  {
    id: 'la-confiance-va-dans-les-deux-sens', name: 'La Confiance Va dans les Deux Sens', englishName: 'Trust Goes Both Ways', pip: 2, faction: 'rebelles',
    requirement: 'Jyn Erso', image: `${BASE}la-confiance-va-dans-les-deux-sens.jpg`,
  },
  {
    id: 'les-rebellions-sont-baties-sur-l-espoir', name: 'Les Rébellions sont Bâties sur l\'Espoir', englishName: 'Rebellions Are Built on Hope', pip: 3, faction: 'rebelles',
    requirement: 'Jyn Erso', image: `${BASE}les-rebellions-sont-baties-sur-l-espoir.jpg`,
  },
  {
    id: 'spike-corellien', name: 'Spike Corellien', englishName: 'Corellian Spike', pip: 1, faction: 'rebelles',
    requirement: 'Lando Calrissian', image: `${BASE}spike-corellien.jpg`,
  },
  {
    id: 'un-as-dans-la-manche', name: 'Un As dans la Manche', englishName: 'Ace Up His Sleeve', pip: 1, faction: 'rebelles',
    requirement: 'Lando Calrissian', image: `${BASE}un-as-dans-la-manche.jpg`,
  },
  {
    id: 'main-de-l-idiot', name: 'Main de l\'Idiot', englishName: 'Idiot\'s Array', pip: 3, faction: 'rebelles',
    requirement: 'Lando Calrissian', image: `${BASE}main-de-l-idiot.jpg`,
  },
  // Fiches FR communautaires (texte superposé sur le visuel anglais Legion HQ), validées par Antoine le 23/10/2026.
  {
    id: 'reconnaissance-du-champ-de-bataille', name: 'Reconnaissance du Champ de Bataille', englishName: 'Battlefield Reconnaissance', pip: 2, faction: 'rebelles',
    requirement: 'Agent Rebelle', image: `${BASE}reconnaissance-du-champ-de-bataille.jpg`,
  },
  {
    id: 'tactiques-de-diversion', name: 'Tactiques de Diversion', englishName: 'Diversionary Tactics', pip: 3, faction: 'rebelles',
    requirement: 'Officier Rebelle', image: `${BASE}tactiques-de-diversion.jpg`,
  },
  {
    id: 'repere', name: 'Repéré', englishName: 'Pinned Down', pip: 2, faction: 'empire',
    requirement: 'Empire Galactique', image: `${BASE}repere.jpg`,
  },
  {
    id: 'surveillance-secrete', name: 'Surveillance Secrète', englishName: 'Covert Observation', pip: 1, faction: 'empire',
    requirement: 'Empire Galactique', image: `${BASE}surveillance-secrete.jpg`,
  },
  {
    id: 'tirs-coordonnes', name: 'Tirs Coordonnés', englishName: 'Coordinated Fire', pip: 3, faction: 'empire',
    requirement: 'Empire Galactique', image: `${BASE}tirs-coordonnes.jpg`,
  },
  {
    id: 'viens-donc-le-prouver', name: 'Viens Donc le Prouver', englishName: 'Come and Prove It', pip: 1, faction: 'empire',
    requirement: 'La Septième Sœur', image: `${BASE}viens-donc-le-prouver.jpg`,
  },
  {
    id: 'tu-caches-mal-ta-peur', name: 'Tu Caches Mal ta Peur', pip: 3, faction: 'empire',
    requirement: 'La Septième Sœur', image: `${BASE}tu-caches-mal-ta-peur.jpg`,
  },
  {
    id: 'inattendu-mais-bienvenu', name: 'Inattendu, Mais Bienvenu !', englishName: 'Unexpected, but not Unwelcome', pip: 2, faction: 'empire',
    requirement: 'La Septième Sœur', image: `${BASE}inattendu-mais-bienvenu.jpg`,
  },
  {
    id: 'je-me-fiche-de-vos-inquietudes', name: 'Je me Fiche de vos Inquiétudes', englishName: 'I Care Not for your Struggles', pip: 3, faction: 'empire',
    requirement: 'Le Cinquième Frère', image: `${BASE}je-me-fiche-de-vos-inquietudes.jpg`,
  },
  {
    id: 'tu-voudrais-m-interroger', name: 'Tu Voudrais m\'Interroger ?', englishName: 'You Would Question Me?', pip: 2, faction: 'empire',
    requirement: 'Le Cinquième Frère', image: `${BASE}tu-voudrais-m-interroger.jpg`,
  },
  {
    id: 'mourir-de-ma-main', name: 'Mourir de ma Main', englishName: 'Die at My Hand', pip: 1, faction: 'empire',
    requirement: 'Moff Gideon', image: `${BASE}mourir-de-ma-main.jpg`,
  },
  {
    id: 'vous-avez-ce-que-je-veux', name: 'Vous Avez ce que Je Veux', englishName: 'You Have Something I Want', pip: 2, faction: 'empire',
    requirement: 'Moff Gideon', image: `${BASE}vous-avez-ce-que-je-veux.jpg`,
  },
  {
    id: 'instant-de-reflexion', name: 'Instant de Réflexion', englishName: 'Moment of Consideration', pip: 3, faction: 'empire',
    requirement: 'Moff Gideon', image: `${BASE}instant-de-reflexion.jpg`,
  },
  {
    id: 'ambition-devorante', name: 'Ambition Dévorante', englishName: 'Voracious Ambition', pip: 1, faction: 'empire',
    requirement: 'Directeur Orson Krennic', image: `${BASE}ambition-devorante.jpg`,
  },
  {
    id: 'deployez-la-garnison', name: 'Déployez la Garnison', englishName: 'Deploy the Garrison', pip: 2, faction: 'empire',
    requirement: 'Directeur Orson Krennic', image: `${BASE}deployez-la-garnison.jpg`,
  },
  {
    id: 'une-annihilation-se-profile', name: 'Une Annihilation se Profile', englishName: 'Annihilation Looms', pip: 3, faction: 'empire',
    requirement: 'Directeur Orson Krennic', image: `${BASE}une-annihilation-se-profile.jpg`,
  },
  {
    id: 'puissance-de-feu-maximale', name: 'Puissance de Feu Maximale', englishName: 'Maximum Firepower', pip: 1, faction: 'empire',
    requirement: 'Général Veers', image: `${BASE}puissance-de-feu-maximale.jpg`,
  },
  {
    id: 'manoeuvres-d-evasion', name: 'Manœuvres d\'Évasion', englishName: 'Evasive Maneuvers', pip: 2, faction: 'empire',
    requirement: 'Directeur Orson Krennic', image: `${BASE}manoeuvres-d-evasion.jpg`,
  },
  {
    id: 'discipline-imperiale', name: 'Discipline Impériale', englishName: 'Imperial Discipline', pip: 3, faction: 'empire',
    requirement: 'Général Veers', image: `${BASE}discipline-imperiale.jpg`,
  },
  {
    id: 'puissance-de-vador', name: 'Puissance de Vador', englishName: 'Vader\'s Might', pip: 1, faction: 'empire',
    requirement: 'Dark Vador', image: `${BASE}puissance-de-vador.jpg`,
  },
  {
    id: 'impitoyable', name: 'Impitoyable', englishName: 'Implacable', pip: 1, faction: 'empire',
    requirement: 'Dark Vador', image: `${BASE}impitoyable.jpg`,
  },
  {
    id: 'nouvelle-technique-de-motivation', name: 'Nouvelle Technique de Motivation', englishName: 'New Ways to Motivate Them', pip: 2, faction: 'empire',
    requirement: 'Dark Vador', image: `${BASE}nouvelle-technique-de-motivation.jpg`,
  },
  {
    id: 'la-peur-et-les-hommes-morts', name: 'La Peur et les Hommes Morts', englishName: 'Fear and Dead Men', pip: 2, faction: 'empire',
    requirement: 'Dark Vador', image: `${BASE}la-peur-et-les-hommes-morts.jpg`,
  },
  {
    id: 'les-tenebres-nous-envahissent', name: 'Les Ténèbres nous Envahissent', englishName: 'Darkness Descends', pip: 3, faction: 'empire',
    requirement: 'Dark Vador', image: `${BASE}les-tenebres-nous-envahissent.jpg`,
  },
  {
    id: 'maitre-du-mal', name: 'Maître du Mal', englishName: 'Master of Evil', pip: 3, faction: 'empire',
    requirement: 'Dark Vador', image: `${BASE}maitre-du-mal.jpg`,
  },
  {
    id: 'viens-me-combattre', name: 'Viens me Combattre !', englishName: 'Face Me!', pip: 1, faction: 'empire',
    requirement: 'Agent Kallus', image: `${BASE}viens-me-combattre.jpg`,
  },
  {
    id: 'investigation-du-bsi', name: 'Investigation du BSI', englishName: 'ISB Investigation', pip: 2, faction: 'empire',
    requirement: 'Agent Kallus', image: `${BASE}investigation-du-bsi.jpg`,
  },
  {
    id: 'tactiques-impitoyables', name: 'Tactiques Impitoyables', englishName: 'Ruthless Tactics', pip: 3, faction: 'empire',
    requirement: 'Dark Vador', image: `${BASE}tactiques-impitoyables.jpg`,
  },
  {
    id: 'scanner-coronaire', name: 'Scanner Coronaire', englishName: 'Pulse Scan', pip: 1, faction: 'empire',
    requirement: 'Iden Versio', image: `${BASE}scanner-coronaire.jpg`,
  },
  {
    id: 'neutralisation', name: 'Neutralisation', englishName: 'Incapacitate', pip: 2, faction: 'empire',
    requirement: 'Iden Versio', image: `${BASE}neutralisation.jpg`,
  },
  {
    id: 'frappe-tactique', name: 'Frappe Tactique', englishName: 'Tactical Strike', pip: 3, faction: 'empire',
    requirement: 'Iden Versio', image: `${BASE}frappe-tactique.jpg`,
  },
  {
    id: 'deflagration-confinee', name: 'Déflagration Confinée', englishName: 'Concussive Blast', pip: 2, faction: 'empire',
    requirement: 'Iden Versio', image: `${BASE}deflagration-confinee.jpg`,
  },
  {
    id: 'feu-incessant', name: 'Feu Incessant', englishName: 'Unrelenting Fire', pip: 1, faction: 'empire',
    requirement: 'Force Blizzard', image: `${BASE}feu-incessant.jpg`,
  },
  {
    id: 'tir-de-barrage-accablant', name: 'Tir de Barrage Accablant', englishName: 'Overwhelming Barrage', pip: 2, faction: 'empire',
    requirement: 'Force Blizzard', image: `${BASE}tir-de-barrage-accablant.jpg`,
  },
  {
    id: 'debarquement-pour-assaut-terrestre', name: 'Débarquement pour Assaut Terrestre', englishName: 'Debark for Ground Assault', pip: 3, faction: 'empire',
    requirement: 'Force Blizzard', image: `${BASE}debarquement-pour-assaut-terrestre.jpg`,
  },
  {
    id: 'chassez-les', name: 'Chassez-les !', englishName: 'Drive Them Out', pip: 1, faction: 'empire',
    requirement: 'Force Tempest', image: `${BASE}chassez-les.jpg`,
  },
  {
    id: 'besoin-de-renforts', name: 'Besoin de Renforts !', englishName: 'We Need Reinforcements', pip: 2, faction: 'empire',
    requirement: 'Force Tempest', image: `${BASE}besoin-de-renforts.jpg`,
  },
  {
    id: 'prets-a-riposter', name: 'Prêts à Riposter', pip: 3, faction: 'empire',
    requirement: 'Force Tempest', image: `${BASE}prets-a-riposter.jpg`,
  },
  {
    id: 'artillerie-infanterie', name: 'Artillerie, Infanterie !', englishName: 'Gunner, Infantry!', pip: 1, faction: 'empire',
    requirement: 'Major Marquand', image: `${BASE}artillerie-infanterie.jpg`,
  },
  {
    id: 'escadron-avec-moi', name: 'Escadron, Avec Moi !', englishName: 'Squadron, on me', pip: 2, faction: 'empire',
    requirement: 'Major Marquand', image: `${BASE}escadron-avec-moi.jpg`,
  },
  {
    id: 'cavalerie-blindee', name: 'Cavalerie Blindée', englishName: 'Armored Cavalry', pip: 3, faction: 'empire',
    requirement: 'Major Marquand', image: `${BASE}cavalerie-blindee.jpg`,
  },
];

export const COMMAND_SUITE_RULE = { total: 7, perPip: { 1: 2, 2: 2, 3: 2, 4: 1 } } as const;

