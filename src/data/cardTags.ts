import type { CardKeywordTag, CardTagLibrary } from '../types';
import { normalizeName } from '../lib/normalize';

/**
 * Mots-clés d'unité vérifiés depuis de vraies cartes Unité (Empire et
 * Alliance Rebelle), fournies par l'utilisateur. Pas une invention.
 *
 * N'écrase jamais les tags déjà sauvegardés par un utilisateur : voir
 * lib/useCardTags.ts, qui ne s'en sert que comme valeur initiale tant que
 * rien n'existe en localStorage.
 *
 * Les clés sont les noms ANGLAIS tels qu'exportés par Tabletop Admiral
 * (confirmé par l'utilisateur) — les cartes source sont en français, donc
 * chaque nom a été traduit. Les traductions non confirmées par un export
 * TTA réel sont marquées « nom EN à vérifier » : si une carte de ta liste
 * n'affiche pas ses mots-clés, c'est probablement que sa traduction ici
 * est légèrement différente de celle utilisée par Tabletop Admiral —
 * dis-moi le nom exact et je corrige la clé.
 *
 * AT-ST / TR-TT (30/08/2026, signalement utilisateur avec scan officiel FR
 * à l'appui) : la précédente remarque ci-dessous parlait à tort de « deux
 * configurations » d'un même AT-ST — en réalité 'AT-ST' (le nom anglais
 * utilisé par Tabletop Admiral) pointait vers les stats d'une tout autre
 * unité, le Tank « Occupier » TX-225 GAVw (Armure 5, Arsenal 2, Redéploiement,
 * Transport, Point Faible 1 : Flancs, Canons Jumelés/Quadruples Canons) —
 * absent par ailleurs de cette liste. Le vrai AT-ST, dont le nom sur la
 * carte française est « TR-TT », n'a qu'une seule version imprimée dans
 * Galactic_Empire_Units_FR.pdf : Armure 5, Arsenal 2, Point Faible 1 :
 * Arrière, Pinces Coupantes (sans mot-clé) et Blasters Jumelés MS-4
 * (Fixe : Avant, Impact 3) — c'est cette entrée qui est désormais sous la
 * clé 'AT-ST' (celle qui matche vraiment les imports). Visuel (public/cards/
 * tr-tt.jpg) réextrait au bon endroit de la grille d'impression au passage
 * (l'ancien at-st.jpg affichait carrément le Tank Occupier).
 *
 * Dark Vador, Seigneur Noir des Sith : la première extraction (PDF officiel
 * EN+FR) avait lu « Contraindre : Type » (Compel), mot-clé introuvable dans
 * le glossaire officiel malgré deux sources croisées. Le livret Iron
 * Squadron (source plus récente, image nette) montre en fait
 * « Contrainte : Soldat » — mot-clé bien réel du glossaire. Corrigé ici ;
 * l'entrée « Compel » du glossaire (jamais confirmée) a été retirée.
 *
 * Passe de vérification des noms anglais (recherche web, wiki communautaire
 * Star Wars Legion + comparaison avec le seul export TTA réel dont on
 * dispose, Darth Vador « Dark Lord of the Sith ») : la plupart des noms
 * devinés étaient corrects ou quasi corrects (quelques erreurs de détail
 * corrigées : singulier/pluriel, « Fusil à Dispersion » = Scatter Gun
 * Trooper et pas une traduction littérale, etc.). Repère utile trouvé au
 * passage : Tabletop Admiral aplati les sous-titres de carte (parenthèses,
 * virgules) en texte simple séparé par des espaces — ex. la page wiki
 * « Darth Vader (Dark Lord of the Sith) » correspond bien à la clé plate
 * ci-dessus, sans parenthèses ni virgule. Les noms encore marqués
 * « à vérifier » n'ont pas pu être confirmés par une source fiable malgré
 * plusieurs recherches (cartes très récentes ou peu documentées en ligne).
 *
 * Passe de vérification complète des 108 cartes (suite à un signalement
 * utilisateur : Impact/Perforant du sabre de Dark Vador manquants) — chaque
 * carte recomparée un par un à son scan officiel (public/cards/*.jpg) au
 * lieu de faire confiance à la première extraction de texte. Une vingtaine
 * de mots-clés d'arme manquaient, surtout sur les personnages nommés avec
 * plusieurs armes (le texte d'ability était bien repris mais la ligne
 * d'arme sous l'illustration était parfois ratée) : Impact/Perforant du
 * sabre de Dark Vador (les deux versions), du sabre de Luke (les deux
 * versions) et d'Ahsoka, Bélier de La Septième Sœur→Le Cinquième Frère et
 * des Tauntaun, Immunité: Armes Portée 1 + Armure/Arsenal/Couvert du LAAT
 * et du T-47, Létal/Longue Distance d'Agent Kallus (à la place d'un
 * Perforant erroné), Longue Distance de Shoretroopers/Luke/Lando, Suppressif
 * de Jyn Erso/R2-D2, Traiter 1 de FX-9 (déjà présent sur 2-1B mais oublié
 * ici), Travail d'Équipe de Chewbacca/K-2SO, Équipe de Forces Spéciales
 * Impériales Escouade Inferno. Trouvé au passage : un bug dans le script de
 * découpage d'image (page "1" confondue avec "10"/"11"/"12"/"13" par un
 * matching de nom de fichier trop permissif) avait corrompu l'image de DLT-19
 * Stormtrooper — corrigé et réextraite.
 *
 * 01/09/2026 (liste réelle fournie par l'utilisateur, 10 unités Empire à
 * 1000 pts) : trois améliorations qui manquaient totalement (aucun visuel,
 * aucun mot-clé) ajoutées depuis Galactic_Empire_Upgrades_FR.pdf — AT-ST
 * Mortar Launcher (« Lance-mortier de TR-TT », p.11), Snowtrooper (p.8-9,
 * aucun mot-clé sur la carte) et Stormtrooper Squad (« Escouade
 * Stormtrooper », p.6-7). Corrigé au passage : le visuel de KX-Series
 * Security Droids (public/cards/kx-series-security-droids.jpg) débordait
 * sur la carte voisine de la grille d'impression (mauvais recadrage),
 * réextrait proprement depuis la même page. Sept autres améliorations de
 * cette liste (Burst of Speed, Saber Throw, Force Choke, Imperial March,
 * Targeting Scopes, Offensive Push, Linked Targeting Array) restent
 * introuvables dans les PDF actuellement fournis — probablement des cartes
 * Force/Personnel/Comms génériques (pas spécifiques à l'Empire), absentes
 * de Galactic_Empire_Upgrades_FR.pdf. Pas ajoutées pour éviter d'inventer
 * du texte de règle : il faudrait la bonne source pour ces 7-là.
 *
 * 01/09/2026 (suite) : l'utilisateur a fourni le deck générique
 * (« Genrela_upgrade_fr_30mo.pdf », 22 pages, cartes Personnel/Équipement/
 * Entraînement/Comms/Arme lourde/Pouvoir de la Force communes à toutes les
 * factions) — 6 des 7 cartes encore manquantes s'y trouvaient : Targeting
 * Scopes (« Lunette de Visée », p.4), Offensive Push (« Poussée Offensive »,
 * p.7-8), Linked Targeting Array (« Système de Visée Jumelé », p.14), Force
 * Choke (« Strangulation de la Force », p.19), Burst of Speed (« Pointe de
 * Vitesse », p.20) et Saber Throw (« Sabre Lancé », p.22). Les deux autres
 * PDF joints au même message (Galactic_Empire_Upgrades_FR.pdf et
 * Rebel_Alliance_Upgrades_FR.pdf) se sont révélés être des copies identiques
 * (même hachage MD5) des PDF déjà utilisés — rien de nouveau dedans.
 * Imperial March reste introuvable dans les 3 PDF fournis (Empire, Rebelle,
 * générique) ; il faudrait une autre source pour celle-là.
 *
 * 01/09/2026 (suite bis) : Imperial March trouvée, fournie directement par
 * l'utilisateur avec le PDF source (Nouvelles_cartes_amélio_FR_MAJ23.02.2026.pdf,
 * page 1) — visuel ajouté et mot-clé Charge tagué (voir commentaire sur
 * l'entrée). 116 cartes au total dans ce fichier.
 */
const RAW: Record<string, { keywordId: string; value?: number }[]> = {
  // --- Empire Galactique ---
  'Darth Vader Dark Lord of the Sith': [
    { keywordId: 'contrainte' },
    { keywordId: 'deflexion' },
    { keywordId: 'immunite-perforant' },
    { keywordId: 'maitre-de-la-force-x', value: 1 },
    { keywordId: 'implacable' },
    // Impact/Perforant du sabre laser : ambiguïté d'origine (grille
    // d'impression peu nette) résolue par le scan recadré et vérifié
    // (public/cards/darth-vader-dark-lord-of-the-sith.jpg) — la carte
    // affiche sans ambiguïté "Sabre Laser de Vador : Impact 3, Perforant 3".
    { keywordId: 'impact-x', value: 3 },
    { keywordId: 'perforant-x', value: 3 },
  ],
  'Stormtrooper Riot Squad': [
    { keywordId: 'charge' },
    { keywordId: 'tenir-bon' },
    { keywordId: 'suppressif' },
  ],
  'Snowtroopers': [
    { keywordId: 'aguerri' },
  ],
  'Imperial Death Troopers': [
    { keywordId: 'discipline-x', value: 1 },
    { keywordId: 'precis-x', value: 2 },
    { keywordId: 'operationnel-x', value: 1 },
  ],
  'Scout Troopers': [
    { keywordId: 'profil-bas' },
    { keywordId: 'eclaireur-x', value: 3 },
    { keywordId: 'tireur-delite-x', value: 1 },
  ],
  'Scout Troopers Strike Team': [
    { keywordId: 'detachement' },
    { keywordId: 'equipe-avec-arme-lourde' },
    { keywordId: 'profil-bas' },
    { keywordId: 'eclaireur-x', value: 3 },
    { keywordId: 'tireur-delite-x', value: 1 },
  ],
  '74-Z Speeder Bikes': [
    { keywordId: 'couvert-x', value: 1 },
    { keywordId: 'speeder-x', value: 1 },
    { keywordId: 'impact-x', value: 1 },
  ],
  'AT-ST': [
    { keywordId: 'armure-x', value: 5 },
    { keywordId: 'arsenal-x', value: 2 },
    { keywordId: 'point-faible-x', value: 1 },
    { keywordId: 'impact-x', value: 3 },
    { keywordId: 'fixe' },
  ],
  'Stormtroopers': [
    { keywordId: 'precis-x', value: 1 },
  ],
  // nom EN à vérifier
  'Stormtrooper Heavy Gunner Squad': [
    { keywordId: 'riposte-graduee-x', value: 2 },
    { keywordId: 'precis-x', value: 1 },
    { keywordId: 'specificite' },
    { keywordId: 'sans-entrave' },
  ],
  'Shoretroopers': [
    { keywordId: 'coordination' },
    { keywordId: 'position-preparee' },
    { keywordId: 'longue-distance' },
  ],
  'DF-90 Mortar Trooper': [
    { keywordId: 'detachement' },
    { keywordId: 'tirs-de-soutien' },
    { keywordId: 'pivot-complet' },
    { keywordId: 'position-preparee' },
    { keywordId: 'redeploiement' },
    { keywordId: 'sentinelle' },
    { keywordId: 'critique-x', value: 1 },
    { keywordId: 'encombrant' },
    { keywordId: 'suppressif' },
  ],
  'Imperial Special Forces': [
    { keywordId: 'infiltration' },
    { keywordId: 'tireur-embusque' },
    { keywordId: 'fiable-x', value: 1 },
  ],
  'Imperial Special Forces Inferno Squad': [
    { keywordId: 'equipe' },
    { keywordId: 'infiltration' },
    { keywordId: 'tireur-embusque' },
    { keywordId: 'fiable-x', value: 1 },
    { keywordId: 'escorte' },
  ],
  'E-Web Heavy Blaster Team': [
    { keywordId: 'position-preparee' },
    { keywordId: 'redeploiement' },
    { keywordId: 'sentinelle' },
    { keywordId: 'encombrant' },
    { keywordId: 'impact-x', value: 1 },
  ],
  'Dewback Rider': [
    { keywordId: 'armure-x', value: 1 },
    { keywordId: 'implacable' },
    { keywordId: 'redeploiement' },
    { keywordId: 'marche-forcee' },
    { keywordId: 'sans-entrave' },
    { keywordId: 'critique-x', value: 2 },
    { keywordId: 'suppressif' },
  ],
  'Range Troopers': [
    { keywordId: 'ciblage-avance', value: 1 },
    { keywordId: 'armure-x', value: 1 },
    { keywordId: 'indomptable' },
    { keywordId: 'ascension' },
    { keywordId: 'marche-forcee' },
  ],
  // = AT-ST en anglais (nom Tabletop Admiral) ; entrée dupliquée ici sous le
  // nom imprimé sur la carte française, au cas où un import l'utiliserait
  // tel quel. Voir la note du 30/08/2026 en tête de fichier : la carte
  // "autre config" à laquelle une note précédente comparait celle-ci était
  // en fait le Tank « Occupier » TX-225 GAVw, une unité différente.
  'TR-TT': [
    { keywordId: 'armure-x', value: 5 },
    { keywordId: 'arsenal-x', value: 2 },
    { keywordId: 'point-faible-x', value: 1 },
    { keywordId: 'impact-x', value: 3 },
    { keywordId: 'fixe' },
  ],
  // Empire, vu sur Galactic_Empire_Units_FR.pdf (signalement utilisateur du
  // 04/09/2026) : le vrai Tank « Occupier » TX-225 GAVw, distinct d'AT-ST/
  // TR-TT — voir la note du 30/08/2026 en tête de fichier, qui documentait
  // déjà cette confusion mais n'avait pas ajouté cette carte séparément.
  'TX-225 Occupier Tank': [
    { keywordId: 'armure-x', value: 5 },
    { keywordId: 'arsenal-x', value: 2 },
    { keywordId: 'redeploiement' },
    { keywordId: 'transport' },
    { keywordId: 'point-faible-x', value: 1 },
    { keywordId: 'suppressif' },
    { keywordId: 'impact-x', value: 2 },
    { keywordId: 'fixe' },
  ],
  'LAAT/le Patrol Transport': [
    { keywordId: 'armure-x', value: 5 },
    { keywordId: 'arsenal-x', value: 2 },
    { keywordId: 'couvert-x', value: 1 },
    { keywordId: 'sustentation', value: 2 },
    { keywordId: 'immunite-deflagration' },
    { keywordId: 'immunite-corps-a-corps' },
    { keywordId: 'immunite-armes-portee-1' },
    { keywordId: 'transport' },
    { keywordId: 'impact-x', value: 1 },
    { keywordId: 'fixe' },
  ],
  // nom EN à vérifier (Dark Troopers Impériaux)
  'Dark Trooper Squad': [
    { keywordId: 'armure-x', value: 3 },
    { keywordId: 'mobilite-difficile' },
    { keywordId: 'indifferent' },
    { keywordId: 'inarretable' },
  ],
  'General Veers': [
    { keywordId: 'conseils' },
    { keywordId: 'observateur-x', value: 2 },
    { keywordId: 'exemplaire' },
    { keywordId: 'inspiration-x', value: 1 },
    { keywordId: 'tireur-delite-x', value: 1 },
  ],
  'Director Orson Krennic': [
    { keywordId: 'observateur-x', value: 1 },
    { keywordId: 'contrainte' },
    { keywordId: 'malin' },
    { keywordId: 'entourage' },
    { keywordId: 'exemplaire' },
  ],
  "Darth Vader The Emperor's Apprentice": [
    { keywordId: 'deflexion' },
    { keywordId: 'immunite-perforant' },
    { keywordId: 'chasseur-de-jedi' },
    { keywordId: 'maitre-de-la-force-x', value: 1 },
    { keywordId: 'implacable' },
    { keywordId: 'impact-x', value: 3 },
    { keywordId: 'perforant-x', value: 3 },
    { keywordId: 'deflagration' },
    { keywordId: 'dispersion' },
  ],
  'Moff Gideon': [
    { keywordId: 'surveillance-x', value: 1 },
    { keywordId: 'entourage' },
    { keywordId: 'impitoyable' },
    { keywordId: 'tireur-delite-x', value: 1 },
    { keywordId: 'tacticien-x', value: 1 },
    { keywordId: 'perforant-x', value: 1 },
  ],
  "Iden's ID10 Seeker Droid": [
    { keywordId: 'surveillance-x', value: 1 },
    { keywordId: 'alter-ego' },
    { keywordId: 'recharger-x', value: 1 },
    { keywordId: 'bouclier-x', value: 1 },
    { keywordId: 'petit' },
    { keywordId: 'suppressif' },
  ],
  'Iden Versio': [
    { keywordId: 'vivacite-desprit' },
    { keywordId: 'infiltration' },
    { keywordId: 'tireur-embusque' },
    { keywordId: 'agile' },
    { keywordId: 'tireur-delite-x', value: 1 },
    { keywordId: 'haute-velocite' },
    { keywordId: 'perforant-x', value: 1 },
    { keywordId: 'critique-x', value: 1 },
    { keywordId: 'impact-x', value: 1 },
  ],
  // valeur d'Impact omise : diffère selon l'arme choisie (1 ou 3)
  'Major Marquand': [
    { keywordId: 'armure-x', value: 5 },
    { keywordId: 'arsenal-x', value: 2 },
    { keywordId: 'ordre-direct' },
    { keywordId: 'commandant-des-operations' },
    { keywordId: 'specificite' },
    { keywordId: 'point-faible-x', value: 1 },
    { keywordId: 'deflagration' },
    { keywordId: 'impact-x' },
    { keywordId: 'fixe' },
  ],
  'Agent Kallus': [
    { keywordId: 'surveillance-x', value: 2 },
    { keywordId: 'prime' },
    { keywordId: 'charge' },
    { keywordId: 'ordre-direct' },
    { keywordId: 'immunite-perforant-corps-a-corps' },
    { keywordId: 'interrogatoire' },
    { keywordId: 'critique-x', value: 1 },
    { keywordId: 'letal-x', value: 1 },
    { keywordId: 'longue-distance' },
  ],
  'The Fifth Brother': [
    { keywordId: 'blocage' },
    { keywordId: 'intrepide' },
    { keywordId: 'enrage-x', value: 2 },
    { keywordId: 'immunite-perforant' },
    { keywordId: 'impact-x', value: 2 },
    { keywordId: 'perforant-x', value: 1 },
    { keywordId: 'belier-x', value: 2 },
  ],
  'The Seventh Sister': [
    { keywordId: 'saut-x', value: 1 },
    { keywordId: 'associe' },
    { keywordId: 'blocage' },
    { keywordId: 'charge' },
    { keywordId: 'discipline-x', value: 1 },
    { keywordId: 'immunite-perforant' },
    { keywordId: 'interrogatoire' },
    { keywordId: 'impact-x', value: 2 },
    { keywordId: 'perforant-x', value: 1 },
  ],

  // --- Améliorations Empire (armes de rechange, cartes d'équipage/état-major) ---
  // Depuis le PDF Galactic Empire Upgrades (FR). Beaucoup de cartes de ce PDF
  // (meneurs d'escouade +5 figurines, techniciens, pilotes, personnages
  // nommés secondaires...) ne portent aucun mot-clé standard listé ici — soit
  // parce que leur effet est une capacité propre à la carte (pas un des 200
  // mots-clés du glossaire), soit parce que le nom anglais exact restait trop
  // incertain pour être une clé fiable. Seules les améliorations où le
  // mot-clé ET la traduction anglaise sont sûrs sont incluses.
  'DLT-19 Stormtrooper': [
    { keywordId: 'impact-x', value: 1 },
  ],
  'T-21 Stormtrooper': [
    { keywordId: 'critique-x', value: 2 },
  ],
  'HH-12 Stormtrooper': [
    { keywordId: 'encombrant' },
    { keywordId: 'impact-x', value: 3 },
  ],
  'Flametrooper': [
    { keywordId: 'deflagration' },
    { keywordId: 'souffle' },
  ],
  'T-7 Ion Snowtrooper': [
    { keywordId: 'critique-x', value: 1 },
    { keywordId: 'impact-x', value: 1 },
    { keywordId: 'ion-x', value: 1 },
  ],
  'KX-Series Security Droids': [
    { keywordId: 'impact-x', value: 1 },
  ],
  'T-21B Shoretrooper': [
    { keywordId: 'critique-x', value: 1 },
  ],
  'DLT-19x Sniper': [
    { keywordId: 'haute-velocite' },
    { keywordId: 'perforant-x', value: 1 },
  ],
  'Sonic Charge Saboteur': [
    { keywordId: 'deflagration' },
    { keywordId: 'impact-x', value: 2 },
    { keywordId: 'suppressif' },
  ],
  'DLT-19D Trooper': [
    { keywordId: 'impact-x', value: 1 },
  ],
  'DLT-20A Range Trooper': [
    { keywordId: 'impact-x', value: 2 },
  ],
  'T-21A Range Trooper': [
    { keywordId: 'suppressif' },
  ],
  'FX-9 Medical Droid': [
    { keywordId: 'non-combattant' },
    { keywordId: 'traiter-x', value: 1 },
  ],
  'Imperial Officer': [
    { keywordId: 'chef' },
    { keywordId: 'inspiration-x', value: 1 },
  ],
  '88i Twin Light Blaster': [
    { keywordId: 'impact-x', value: 1 },
    { keywordId: 'fixe' },
  ],
  'DW-3 Concussion Grenade Launcher': [
    { keywordId: 'deflagration' },
    { keywordId: 'fixe' },
  ],
  // = « Lance-mortier de TR-TT » sur la carte française (AT-ST = TR-TT, voir
  // note du 30/08/2026 en tête de fichier).
  'AT-ST Mortar Launcher': [
    { keywordId: 'suppressif' },
    { keywordId: 'fixe' },
  ],
  // Grille imprimée uniquement "Ajoutez 1 figurine de Snowtrooper." — aucun
  // mot-clé sur cette carte (vérifié contre Galactic_Empire_Upgrades_FR.pdf,
  // page 8-9), contrairement à "Snowtrooper Squad" ci-dessous.
  'Snowtrooper': [],
  // = « Escouade Stormtrooper » sur la carte française. N'accorde que le
  // mot-clé Indomptable ; le reste du texte de la carte (portée de cohésion
  // à ① au lieu de ⑤, restriction Transport) n'est pas un mot-clé du
  // glossaire et ne peut donc pas être tagué ici (comme pour toute carte
  // dont l'effet dépasse une simple liste de mots-clés).
  'Stormtrooper Squad': [
    { keywordId: 'indomptable' },
  ],
  // Cartes Amélioration génériques (deck « Genrela_upgrade_fr_30mo.pdf »,
  // non spécifique à une faction — fourni par l'utilisateur le 01/09/2026,
  // en réponse aux 7 cartes de sa liste introuvables dans les PDF Empire).
  // = « Lunette de Visée » sur la carte française.
  'Targeting Scopes': [
    { keywordId: 'precis-x', value: 1 },
  ],
  // = « Poussée Offensive » sur la carte française. Tacticien 1 n'est
  // accordé que pendant la prochaine action Se déplacer de l'activation —
  // condition non modélisable ici (comme les autres cartes à effet
  // conditionnel de ce fichier), tagué tel quel.
  'Offensive Push': [
    { keywordId: 'tacticien-x', value: 1 },
  ],
  // = « Système de Visée Jumelé » sur la carte française (Soldat en
  // Position ou Véhicule uniquement — cohérent avec AT-ST/TR-TT).
  'Linked Targeting Array': [
    { keywordId: 'cible-x', value: 1 },
  ],
  // = « Strangulation de la Force » (Côté Obscur) : inflige 1 blessure
  // directe à une unité ennemie à portée ①, sans passer par un mot-clé du
  // glossaire — rien à tagger (comme Snowtrooper plus haut).
  'Force Choke': [],
  // = « Sabre Lancé » : arme dont les dés et mots-clés sont ceux d'une arme
  // de corps-à-corps de l'unité, divisés par 2 (arrondi au supérieur) —
  // entièrement dynamique, aucun mot-clé fixe à tagger.
  'Saber Throw': [],
  // = « Pointe de Vitesse » : incline la carte pour porter la vitesse
  // maximale à 3 jusqu'à la fin du round, contre 1 pion Immobilisation en
  // Phase Finale — effet unique, pas un mot-clé du glossaire.
  'Burst of Speed': [],
  // = « Marche Impériale » (Soldat en Position/Véhicule uniquement) —
  // trouvée le 01/09/2026 dans Nouvelles_cartes_amélio_FR_MAJ23.02.2026.pdf
  // fourni par l'utilisateur (les 3 PDF précédents ne la contenaient pas).
  // Effet principal (vitesse +1 sur la 2e action Se déplacer) non modélisable
  // ici. Le second effet accorde explicitement le mot-clé Charge (en
  // défaussant la carte lors d'une action Se déplacer) — tagué tel quel,
  // même logique que Offensive Push/Tacticien X ci-dessus : condition non
  // modélisable, mais autant afficher la bonne définition de référence.
  'Imperial March': [
    { keywordId: 'charge' },
  ],
  'The Darksaber': [
    { keywordId: 'impact-x', value: 1 },
    { keywordId: 'perforant-x', value: 1 },
    { keywordId: 'demoraliser-x', value: 1 },
    { keywordId: 'immunite-perforant-corps-a-corps' },
  ],

  // --- Empire Galactique (améliorations, suite) ---
  // Second passage complet sur Galactic_Empire_Upgrades_FR.pdf (13 pages,
  // chaque carte revérifiée), demandé par l'utilisateur pour fermer l'audit
  // « base de données complète » après le passage sur les unités des deux
  // factions. Comme pour les améliorations rebelles : noms anglais
  // best-effort quand la carte n'a jamais été vue dans un export TTA réel,
  // signalés par un commentaire.
  'RT-97C Stormtrooper': [],
  'DT-F16': [
    { keywordId: 'contrainte' },
    { keywordId: 'chef' },
  ],
  'Del Meeko': [
    { keywordId: 'haute-velocite' },
    { keywordId: 'letal-x', value: 1 },
    { keywordId: 'reparation-x', value: 2 },
  ],
  // Le gain de +1 à la valeur de défense n'est pas un mot-clé du glossaire —
  // seul Coordination : Soldat ▲ et Chef sont tagués.
  'Gideon Hask': [
    { keywordId: 'coordination' },
    { keywordId: 'chef' },
  ],
  // nom EN à vérifier
  'T-21 Special Forces Trooper': [],
  // nom EN à vérifier
  'SM-9 Dark Trooper': [],
  // nom EN à vérifier
  'XS-IV Dark Trooper': [],
  // nom EN à vérifier — arme « Tranchoir »
  'Cleaver Dark Trooper': [],
  'E-11D Focused Strike Config': [
    { keywordId: 'reconfiguration' },
  ],
  'E-11D Grenade Launcher Config': [
    { keywordId: 'reconfiguration' },
  ],
  // nom EN à vérifier — « Fusil Lance-flammes CR-24 » (Soldat Monté sur
  // Dewback uniquement)
  'CR-24 Flame Rifle': [],
  // nom EN à vérifier — variante Dewback du Fusil Blaster RT-97C, même
  // profil de dés que la version Stormtrooper mais carte distincte
  'RT-97C Dewback Rider': [],
  // nom EN à vérifier — variante Dewback du Blaster à Répétition T-21
  'T-21 Dewback Rider': [],
  // nom EN à vérifier — arme montée sur pivot du Tank « Occupier » TX-225
  // GAVw
  'DLT-19 Pintle Mount': [],
  // nom EN à vérifier — arme montée sur pivot du Tank « Occupier » TX-225
  // GAVw
  'RT-97C Pintle Mount': [],
  // nom EN à vérifier = « Loyauté Programmée » (Dark Troopers Impériaux
  // uniquement). La restriction « ne peut recevoir d'ordres que d'une
  // unité Officier » n'est pas un mot-clé du glossaire — seul Escorte est
  // tagué.
  'Programmed Loyalty': [
    { keywordId: 'escorte' },
  ],
  // nom EN à vérifier = « Entraînement de l'Inquisitorius » (Le Cinquième
  // Frère ou La Septième Sœur uniquement)
  'Inquisitorius Training': [
    { keywordId: 'demoraliser-x', value: 1 },
  ],
  'R4 Astromech Droid': [
    { keywordId: 'non-combattant' },
    { keywordId: 'reparation-x', value: 1 },
  ],
  'Imperial Comms Technician': [],
  'Stormtrooper Captain': [
    { keywordId: 'chef' },
  ],
  // Le gain d'icône d'amélioration et son action (1 pion Viser ou
  // Adrénaline) ne sont pas un mot-clé du glossaire — rien à tagger.
  'Stormtrooper Specialist': [],
  // = « Tireur Embusqué Stormtrooper » (Escouade Stormtrooper Antiémeute
  // uniquement) — action conditionnelle unique (1 dé d'attaque rouge contre
  // une unité ennemie non engagée), pas de mot-clé du glossaire à tagger,
  // pas d'arme permanente.
  'Stormtrooper Sharpshooter': [],
  // Cartes « Ajoutez 1 figurine de X » sans texte propre au-delà du nom —
  // même politique que Snowtrooper (déjà en base) : pas d'arme, pas de
  // mot-clé.
  'Stormtrooper': [],
  'Shoretrooper': [],
  'Range Trooper': [],
  // nom EN à vérifier = « Escouade Stormtrooper » sur la carte française —
  // carte d'extension (ajoute 5 figurines, confirme Indomptable même si
  // vaincues), distincte de l'unité « Stormtrooper Squad » déjà en base
  // sous le même nom affiché.
  'Stormtrooper Squad Expansion': [
    { keywordId: 'indomptable' },
  ],
  // nom EN à vérifier = « Escouade Snowtrooper » sur la carte française
  'Snowtrooper Squad Expansion': [
    { keywordId: 'indomptable' },
  ],
  // nom EN à vérifier = « Escouade Shoretrooper » sur la carte française
  'Shoretrooper Squad Expansion': [
    { keywordId: 'indomptable' },
  ],

  // Repérées dans Galactic_Empire_Upgrades_FR.pdf lors du re-découpage des
  // visuels (05/09/2026) — décrites dans l'audit précédent mais jamais
  // effectivement ajoutées à la base, corrigé ici.
  // nom EN à vérifier = « Gouverneur Pryce ». L'action de carte (choisir une
  // unité alliée à ② qui gagne 1 pion Viser et 1 pion Suppression) n'est pas
  // un mot-clé du glossaire — seul Commandant des Opérations est tagué.
  'Governor Pryce': [
    { keywordId: 'commandant-des-operations' },
  ],
  // nom EN à vérifier = « Premier Sergent Arbmab »
  'First Sergeant Arbmab': [
    { keywordId: 'tacticien-x', value: 1 },
  ],
  // nom EN à vérifier = « Général Weiss »
  'General Weiss': [
    { keywordId: 'arsenal-x', value: 2 },
    { keywordId: 'commandant-des-operations' },
  ],
  // nom EN à vérifier = « Baron Rudor ». Le gain de pion Viser après une
  // action Récupérer n'est pas un mot-clé du glossaire — seul Tireur
  // Embusqué est tagué.
  'Baron Rudor': [
    { keywordId: 'tireur-embusque' },
  ],
  // nom EN à vérifier = « Pilote de l'Unité d'Élite Blindée Imperial
  // Hammers ». Le texte imprimé (icône de conversion d'adrénaline
  // remplacée par une icône fixe) ne correspond à aucun mot-clé du
  // glossaire identifiable avec certitude — laissé sans tag plutôt que
  // deviner (politique de l'appli : jamais de mot-clé inventé).
  'Imperial Hammers Elite Armor Pilot': [],
  // nom EN à vérifier = « Pilote de TIE Impérial ». Le gain de +1 vitesse
  // maximale n'est pas un mot-clé du glossaire.
  'Imperial TIE Pilot': [],

  // --- Alliance Rebelle (unités) ---
  // Depuis le PDF de cartes Unité Alliance Rebelle (FR). Même remarque que
  // pour l'Empire : les traductions non confirmées par un export TTA réel
  // sont marquées « nom EN à vérifier ».
  'Rebel Troopers': [
    { keywordId: 'preste-x', value: 1 },
    { keywordId: 'agile' },
  ],
  'Mark II Medium Blaster Trooper': [
    { keywordId: 'detachement' },
    { keywordId: 'tirs-de-soutien' },
    { keywordId: 'pivot-complet' },
    { keywordId: 'position-preparee' },
    { keywordId: 'redeploiement' },
    { keywordId: 'sentinelle' },
    { keywordId: 'critique-x', value: 2 },
    { keywordId: 'encombrant' },
    { keywordId: 'fixe' },
  ],
  'Fleet Troopers': [
    { keywordId: 'charge' },
  ],
  'Rebel Veterans': [
    { keywordId: 'coordination' },
    { keywordId: 'profil-bas' },
    { keywordId: 'position-preparee' },
  ],
  'Rebel Commandos': [
    { keywordId: 'profil-bas' },
    { keywordId: 'eclaireur-x', value: 2 },
    { keywordId: 'tireur-delite-x', value: 1 },
  ],
  'Rebel Commandos Strike Team': [
    { keywordId: 'detachement' },
    { keywordId: 'equipe-avec-arme-lourde' },
    { keywordId: 'profil-bas' },
    { keywordId: 'eclaireur-x', value: 2 },
    { keywordId: 'tireur-delite-x', value: 1 },
  ],
  'Wookiee Warriors Freedom Fighters': [
    { keywordId: 'charge' },
    { keywordId: 'duelliste' },
    { keywordId: 'indomptable' },
    { keywordId: 'ascension' },
  ],
  'Wookiee Warriors Kashyyyk Resistance': [
    { keywordId: 'indomptable' },
    { keywordId: 'ascension' },
    { keywordId: 'tireur-delite-x', value: 1 },
  ],
  'Mandalorian Resistance': [
    { keywordId: 'saut-x', value: 2 },
    { keywordId: 'insensible' },
    { keywordId: 'agile' },
  ],
  'Tauntaun Riders': [
    { keywordId: 'preste-x', value: 1 },
    { keywordId: 'implacable' },
    { keywordId: 'redeploiement' },
    { keywordId: 'tireur-delite-x', value: 1 },
    { keywordId: 'sans-entrave' },
    { keywordId: 'belier-x', value: 1 },
  ],
  'T-47 Airspeeder': [
    { keywordId: 'armure-x', value: 3 },
    { keywordId: 'arsenal-x', value: 2 },
    { keywordId: 'couvert-x', value: 1 },
    { keywordId: 'immunite-deflagration' },
    { keywordId: 'immunite-corps-a-corps' },
    { keywordId: 'immunite-armes-portee-1' },
    { keywordId: 'speeder-x', value: 2 },
    { keywordId: 'impact-x', value: 3 },
    { keywordId: 'fixe' },
  ],
  'X-34 Landspeeder': [
    { keywordId: 'armure-x', value: 2 },
    { keywordId: 'arsenal-x', value: 3 },
    { keywordId: 'couvert-x', value: 1 },
    { keywordId: 'speeder-x', value: 1 },
  ],
  'Leia Organa': [
    { keywordId: 'mettre-a-couvert-x', value: 2 },
    { keywordId: 'exemplaire' },
    { keywordId: 'inspiration-x', value: 2 },
    { keywordId: 'agile' },
    { keywordId: 'tireur-delite-x', value: 2 },
  ],
  'C-3PO': [
    { keywordId: 'calcul-de-probabilites' },
    { keywordId: 'distraire' },
    { keywordId: 'alter-ego' },
  ],
  'Luke Skywalker Hero of the Rebellion': [
    { keywordId: 'saut-x', value: 1 },
    { keywordId: 'blocage' },
    { keywordId: 'charge' },
    { keywordId: 'immunite-perforant' },
    { keywordId: 'inspiration-x', value: 2 },
    { keywordId: 'tireur-delite-x', value: 1 },
    { keywordId: 'impact-x', value: 2 },
    { keywordId: 'perforant-x', value: 1 },
    { keywordId: 'longue-distance' },
  ],
  'Luke Skywalker Jedi Knight': [
    { keywordId: 'saut-x', value: 1 },
    { keywordId: 'charge' },
    { keywordId: 'deflexion' },
    { keywordId: 'retrait' },
    { keywordId: 'immunite-perforant' },
    { keywordId: 'maitre-de-la-force-x', value: 1 },
    { keywordId: 'impact-x', value: 2 },
    { keywordId: 'perforant-x', value: 2 },
  ],
  'Jyn Erso': [
    { keywordId: 'preste-x', value: 1 },
    { keywordId: 'retrait' },
    { keywordId: 'autonome' },
    { keywordId: 'infiltration' },
    { keywordId: 'agile' },
    { keywordId: 'tireur-delite-x', value: 1 },
    { keywordId: 'suppressif' },
    { keywordId: 'longue-distance' },
    { keywordId: 'perforant-x', value: 1 },
  ],
  'Cassian Andor': [
    { keywordId: 'intuition-du-danger-x', value: 3 },
    { keywordId: 'equipe' },
    { keywordId: 'commandant-des-operations' },
    { keywordId: 'infiltration' },
    { keywordId: 'tireur-embusque' },
    { keywordId: 'tireur-delite-x', value: 1 },
    { keywordId: 'tacticien-x', value: 1 },
  ],
  'Lando Calrissian': [
    { keywordId: 'conseils' },
    { keywordId: 'allies-de-circonstance' },
    { keywordId: 'longueur-davance' },
    { keywordId: 'aguerri' },
    { keywordId: 'coup-de-chance-x', value: 2 },
    { keywordId: 'longue-distance' },
  ],
  'Chewbacca': [
    { keywordId: 'enrage-x', value: 4 },
    { keywordId: 'gardien-x', value: 3 },
    { keywordId: 'ascension' },
    { keywordId: 'travail-dequipe' },
    { keywordId: 'letal-x', value: 1 },
    { keywordId: 'impact-x', value: 1 },
    { keywordId: 'perforant-x', value: 1 },
  ],
  'Sabine Wren': [
    { keywordId: 'saut-x', value: 2 },
    { keywordId: 'pistolero' },
    { keywordId: 'insensible' },
    { keywordId: 'agile' },
    { keywordId: 'perforant-x', value: 1 },
  ],
  'R2-D2': [
    { keywordId: 'reparation-x', value: 2 },
    { keywordId: 'discret' },
    { keywordId: 'infiltration' },
    { keywordId: 'mission-secrete' },
    { keywordId: 'suppressif' },
  ],
  'Ahsoka Tano': [
    { keywordId: 'saut-x', value: 2 },
    { keywordId: 'charge' },
    { keywordId: 'defense-x', value: 1 },
    { keywordId: 'deflexion' },
    { keywordId: 'immunite-perforant' },
    { keywordId: 'maitrise-du-jarkai' },
    { keywordId: 'impact-x', value: 2 },
    { keywordId: 'perforant-x', value: 2 },
  ],
  'K-2SO': [
    { keywordId: 'calcul-de-probabilites' },
    { keywordId: 'armure-x', value: 1 },
    { keywordId: 'detachement' },
    { keywordId: 'incognito' },
    { keywordId: 'infiltration' },
    { keywordId: 'travail-dequipe' },
  ],
  // = TL-TT sur la carte française (nom Tabletop Admiral : AT-RT) — équivalent
  // rebelle du TR-TT/AT-ST impérial. Vérifié le 30/08/2026 sur scan officiel
  // FR fourni par l'utilisateur (Rebel Alliance Units FR.pdf, signalement :
  // unité manquante de la bibliothèque). Une seule config imprimée.
  'AT-RT': [
    { keywordId: 'armure-x', value: 2 },
    { keywordId: 'vehicule-grimpant' },
    { keywordId: 'grimpeur-experimente' },
    { keywordId: 'eclaireur-x', value: 1 },
    { keywordId: 'impact-x', value: 1 },
  ],
  // = AT-RT en anglais (nom Tabletop Admiral) ; dupliqué ici sous le nom
  // imprimé sur la carte française, au cas où un import l'utiliserait tel quel.
  'TL-TT': [
    { keywordId: 'armure-x', value: 2 },
    { keywordId: 'vehicule-grimpant' },
    { keywordId: 'grimpeur-experimente' },
    { keywordId: 'eclaireur-x', value: 1 },
    { keywordId: 'impact-x', value: 1 },
  ],

  // --- Améliorations Alliance Rebelle ---
  'MPL-57 Ion Trooper': [
    { keywordId: 'critique-x', value: 1 },
    { keywordId: 'impact-x', value: 1 },
    { keywordId: 'ion-x', value: 1 },
  ],
  'DLT-20A Trooper': [
    { keywordId: 'critique-x', value: 1 },
  ],
  'SX-21 Trooper': [
    { keywordId: 'impact-x', value: 1 },
  ],
  'MPL-57 Barrage Trooper': [
    { keywordId: 'deflagration' },
    { keywordId: 'impact-x', value: 2 },
    { keywordId: 'cycle' },
  ],
  'CM-O/93 Trooper': [
    { keywordId: 'critique-x', value: 2 },
  ],
  'Proton Charge Saboteur': [
    { keywordId: 'deflagration' },
    { keywordId: 'critique-x', value: 2 },
    { keywordId: 'impact-x', value: 3 },
  ],
  'Scatter Gun Trooper': [
    { keywordId: 'perforant-x', value: 1 },
  ],
  'Long Gun Wookiee': [
    { keywordId: 'suppressif' },
  ],
  'DH-447 Sniper': [
    { keywordId: 'haute-velocite' },
    { keywordId: 'perforant-x', value: 1 },
  ],
  // Armure 1 conditionnelle (carte retournée en début d'activation)
  'Battle Shield Wookiee': [
    { keywordId: 'armure-x', value: 1 },
  ],
  // nom EN à vérifier
  'Rebel Trooper Squad': [
    { keywordId: 'indomptable' },
  ],
  'Bowcaster Wookiee': [
    { keywordId: 'impact-x', value: 1 },
    { keywordId: 'perforant-x', value: 1 },
  ],
  'Beskad Duelist': [
    { keywordId: 'duelliste' },
  ],
  'Tristan Wren': [
    { keywordId: 'letal-x', value: 1 },
    { keywordId: 'suppressif' },
  ],
  'Ursa Wren': [
    { keywordId: 'chef' },
    { keywordId: 'intrepide' },
    { keywordId: 'longue-distance' },
  ],
  'Rebel Officer': [
    { keywordId: 'chef' },
    { keywordId: 'inspiration-x', value: 1 },
  ],
  'Rebel Trooper Captain': [
    { keywordId: 'chef' },
  ],
  '2-1B Medical Droid': [
    { keywordId: 'non-combattant' },
    { keywordId: 'traiter-x', value: 1 },
  ],
  'R5 Astromech Droid': [
    { keywordId: 'non-combattant' },
    { keywordId: 'reparation-x', value: 1 },
  ],
  // nom EN à vérifier
  'Fleet Trooper Squad': [
    { keywordId: 'indomptable' },
  ],
  // nom EN à vérifier
  'Rebel Veteran Squad': [
    { keywordId: 'indomptable' },
  ],
  'Shriv Suurgav': [
    { keywordId: 'commandant-des-operations' },
  ],
  'Hotshot Pilot': [
    { keywordId: 'tireur-delite-x', value: 1 },
  ],
  'RPS-6 Rocket Gunner': [
    { keywordId: 'impact-x', value: 2 },
  ],
  'Wedge Antilles': [
    { keywordId: 'commandant-des-operations' },
  ],
  'Outer Rim Speeder Jockey': [
    { keywordId: 'couvert-x', value: 1 },
  ],
  'Mo/DK Power Harpoon': [
    { keywordId: 'impact-x', value: 1 },
    { keywordId: 'cable-de-remorquage' },
  ],
  // nom EN à vérifier
  'TL-TT Laser Cannon': [
    { keywordId: 'impact-x', value: 3 },
    { keywordId: 'fixe' },
  ],
  // nom EN à vérifier
  'TL-TT Flame Projector': [
    { keywordId: 'deflagration' },
    { keywordId: 'souffle' },
    { keywordId: 'fixe' },
  ],
  // = TL-TT Flame Projector ci-dessus, sous l'autre nom Tabletop Admiral
  // rencontré pour la même carte (« Lance-flammes de TL-TT », signalement
  // utilisateur du 03/09/2026 avec export TTA + Rebel_Alliance_Upgrades_FR.pdf
  // à l'appui) — dupliqué ici comme AT-RT/TL-TT plus haut.
  'AT-RT Flamethrower': [
    { keywordId: 'deflagration' },
    { keywordId: 'souffle' },
    { keywordId: 'fixe' },
  ],
  // Alliance Rebelle, vu sur Rebel_Alliance_Upgrades_FR.pdf (signalement du
  // 03/09/2026) : « Ax-108 « Ground Buzzer » », Airspeeder T-47 uniquement.
  'Ax-108 "Ground Buzzer"': [
    { keywordId: 'fixe' },
  ],
  // Alliance Rebelle, vu sur Rebel_Alliance_Upgrades_FR.pdf : « Blaster Rotatif
  // Z-6 », aucun mot-clé sur la carte au-delà de l'arme elle-même.
  'Z-6 Trooper': [],
  // Alliance Rebelle, vu sur Rebel_Alliance_Upgrades_FR.pdf : simple ajout de
  // figurine (« Soldat Rebelle »/« Vétéran Rebelle »), aucun mot-clé propre —
  // distinct de Rebel Trooper Squad/Rebel Veteran Squad (ajout de 5 figurines
  // + Indomptable + règle de cohésion), déjà dans cette table.
  'Rebel Trooper': [],
  'Rebel Veteran': [],
  // Alliance Rebelle, carte fournie par l'utilisateur (scan, 03/09/2026) :
  // « Ténacité » — texte propre à la carte (« si elle a 1+ pion Blessure ou
  // si 1+ figurine vaincue, ajoute 1 dé d'attaque rouge en corps-à-corps »),
  // ne correspond à aucun mot-clé du glossaire officiel — pas de tag.
  'Tenacity': [],
  // Idem, « Présence Inspirante » — texte propre (portée à 4 : les alliés
  // peuvent utiliser sa Défense pour leurs tests de panique), aucun mot-clé
  // du glossaire ne correspond — pas de tag.
  'Inspiring Presence': [],
  // Idem, « Données de Reconnaissance » : « Cette unité gagne Éclaireur 1. »
  'Recon Intel': [
    { keywordId: 'eclaireur-x', value: 1 },
  ],
  // Alliance Rebelle, Rebel_Alliance_Upgrades_FR.pdf relu intégralement le
  // 04/09/2026 (signalement utilisateur : « assure-toi qu'il n'y a plus de
  // manquants ») — 13 cartes en plus des 8 déjà ajoutées. Texte propre à la
  // carte, sans mot-clé du glossaire correspondant → pas de tag, comme
  // Tenacity/Inspiring Presence ci-dessus. Noms anglais non confirmés par
  // un export TTA réel (aucune de ces 13 cartes n'était dans les listes
  // fournies jusqu'ici) — à corriger si un import réel utilise un nom
  // différent.
  'Rebel Ambusher': [],
  'Sleeper Cell Astromech': [],
  'Rebel Trooper Specialist': [],
  'Rebel Comms Technician': [],
  'Fleet Trooper': [],
  'Ryder Azadi': [],
  'Unstable Astromech': [],
  'Remote Doc': [],
  'Unorthodox Tactician': [],
  "Sabine's Grapple Line": [],
  // Ces 3-là sont des armes (weapons dans diceProfiles.ts) mais sans mot-clé
  // propre au-delà de Fixe, déjà couvert par le tag générique 'fixe'.
  'X-34 Gunner': [],
  'TL-TT Rotary Blaster': [
    { keywordId: 'fixe' },
  ],
  'X-34 Mark II Blaster': [
    { keywordId: 'fixe' },
  ],
  // Alliance Rebelle, unités relues sur Cartes_rebelles_fr.pdf (« Rebel
  // Alliance Units FR.pdf », signalement utilisateur du 04/09/2026 : « la
  // base de données complète ») — 5 unités entièrement absentes jusqu'ici
  // (aucune trace sous quelque nom que ce soit). Noms anglais non confirmés
  // par un export TTA réel, à corriger si besoin.
  'Han Solo': [
    { keywordId: 'pistolero' },
    { keywordId: 'profil-bas' },
    { keywordId: 'tireur-delite-x', value: 1 },
    { keywordId: 'aguerri' },
    { keywordId: 'coup-de-chance-x', value: 3 },
    { keywordId: 'perforant-x', value: 2 },
  ],
  'A-A5 Speeder Truck': [
    { keywordId: 'armure-x', value: 5 },
    { keywordId: 'sustentation' },
    { keywordId: 'redeploiement' },
    { keywordId: 'transport' },
    { keywordId: 'point-faible-x', value: 2 },
  ],
  'Rebel Sleeper Cell': [
    { keywordId: 'agile' },
    { keywordId: 'eclaireur-x', value: 2 },
    { keywordId: 'tacticien-x', value: 1 },
  ],
  '1.4 FD Laser Cannon Team': [
    { keywordId: 'pivot-complet' },
    { keywordId: 'position-preparee' },
    { keywordId: 'sentinelle' },
    { keywordId: 'stationnaire' },
  ],
  // Même arme/mots-clés que Mandalorian Resistance ci-dessus — variante de
  // composition (Équipe : Tristan Wren/Ursa Wren, Escorte : Sabine Wren).
  'Mandalorian Resistance Clan Wren': [
    { keywordId: 'saut-x', value: 2 },
    { keywordId: 'equipe' },
    { keywordId: 'insensible' },
    { keywordId: 'agile' },
    { keywordId: 'escorte' },
  ],
  'M-45 Ion Blaster': [
    { keywordId: 'critique-x', value: 1 },
    { keywordId: 'impact-x', value: 1 },
    { keywordId: 'ion-x', value: 1 },
    { keywordId: 'fixe' },
  ],
  // nom EN à vérifier
  'Mandalorian Combat Shields': [
    { keywordId: 'bouclier-x', value: 2 },
  ],
  'Jetpack Rockets': [
    { keywordId: 'deflagration' },
    { keywordId: 'impact-x', value: 1 },
  ],
  'AG-2G Quad Laser': [
    { keywordId: 'impact-x', value: 2 },
  ],
  'Heavy Laser Retrofit': [
    { keywordId: 'critique-x', value: 1 },
  ],
  // Config Fusil (Encombrant/Haute Vélocité) et Config Pistolet (Longue
  // Distance) fusionnées : carte unique recto/verso avec Reconfiguration,
  // Perforant 1 commun aux deux faces.
  'A280-CFE Pistol/Sniper Config': [
    { keywordId: 'perforant-x', value: 1 },
    { keywordId: 'encombrant' },
    { keywordId: 'haute-velocite' },
    { keywordId: 'longue-distance' },
  ],
  "Jyn's SE-14 Blaster": [
    { keywordId: 'perforant-x', value: 1 },
    { keywordId: 'suppressif' },
  ],
  // nom EN à vérifier
  "Sabine's Combat Shield": [
    { keywordId: 'recharger-x', value: 1 },
    { keywordId: 'bouclier-x', value: 1 },
  ],
  // Carte « Le Sabre Noir » vue aussi dans les Améliorations Empire avec des
  // mots-clés différents (Impact X/Perforant X/Démoraliser X + Immunité :
  // perforant au corps-à-corps) — ici pour Sabine Wren : Impact 1, Perforant 1
  // + l'unité gagne Intrépide et Immunité : perforant au corps-à-corps.
  // Incohérence non résolue entre les deux PDF sources ; pas ajoutée une
  // deuxième fois ici pour ne pas écraser/dupliquer la clé existante.
};

export const SEED_CARD_TAGS: CardTagLibrary = Object.fromEntries(
  Object.entries(RAW).map(([name, tags]) => [normalizeName(name), tags as CardKeywordTag[]]),
);
