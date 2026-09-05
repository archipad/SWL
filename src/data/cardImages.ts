import { normalizeName } from '../lib/normalize';
import { canonicalCardKey } from '../lib/cardNames';

/**
 * Visuel de carte (scan officiel, recadré depuis les grilles d'impression
 * des PDF fournis par l'utilisateur) affiché dans l'onglet Combat une fois
 * l'attaquant/le défenseur sélectionné.
 *
 * Couvre les 116 cartes actuellement dans cardTags.ts (mêmes PDF sources :
 * unités et améliorations Empire/Alliance Rebelle). Même logique que
 * `cardTags.ts` : simple table nom-normalisé -> chemin d'image, à étoffer
 * au fil de l'eau à mesure que de nouvelles cartes sont taguées. Aucune
 * image connue pour une carte = aucun visuel affiché (pas d'erreur).
 *
 * Chaque image a été recadrée automatiquement (grille 3×3 mesurée par
 * script Python sur le PDF source, propre à chaque mise en page — cartes
 * Unité en paysage vs Amélioration en portrait, et deux formats de page
 * différents selon le PDF) puis vérifiée visuellement une par une pour
 * confirmer que le nom affiché sur la carte correspond bien à la clé.
 *
 * Fichiers dans `public/cards/` (~7,6 Mo au total, JPG compressés), non
 * précachés par le service worker (volontaire : la liste va grossir, mieux
 * vaut les charger à la demande plutôt que gonfler l'installation PWA).
 */
const RAW: Record<string, string> = {
  'Darth Vader Dark Lord of the Sith': 'darth-vader-dark-lord-of-the-sith.jpg',
  'Stormtrooper Riot Squad': 'stormtrooper-riot-squad.jpg',
  'Snowtroopers': 'snowtroopers.jpg',
  'Imperial Death Troopers': 'imperial-death-troopers.jpg',
  'Scout Troopers': 'scout-troopers.jpg',
  'Scout Troopers Strike Team': 'scout-troopers-strike-team.jpg',
  '74-Z Speeder Bikes': '74-z-speeder-bikes.jpg',
  // = TR-TT sur la carte française (voir cardTags.ts) : on réutilise le même visuel.
  'AT-ST': 'tr-tt.jpg',
  'Stormtroopers': 'stormtroopers.jpg',
  'Stormtrooper Heavy Gunner Squad': 'stormtrooper-heavy-gunner-squad.jpg',
  'Shoretroopers': 'shoretroopers.jpg',
  'DF-90 Mortar Trooper': 'df-90-mortar-trooper.jpg',
  'Imperial Special Forces': 'imperial-special-forces.jpg',
  'Imperial Special Forces Inferno Squad': 'imperial-special-forces-inferno-squad.jpg',
  'E-Web Heavy Blaster Team': 'e-web-heavy-blaster-team.jpg',
  'Dewback Rider': 'dewback-rider.jpg',
  'Range Troopers': 'range-troopers.jpg',
  'TR-TT': 'tr-tt.jpg',
  'LAAT/le Patrol Transport': 'laat-le-patrol-transport.jpg',
  'Dark Trooper Squad': 'dark-trooper-squad.jpg',
  'General Veers': 'general-veers.jpg',
  'Director Orson Krennic': 'director-orson-krennic.jpg',
  "Darth Vader The Emperor's Apprentice": 'darth-vader-the-emperors-apprentice.jpg',
  'Moff Gideon': 'moff-gideon.jpg',
  "Iden's ID10 Seeker Droid": 'idens-id10-seeker-droid.jpg',
  'Iden Versio': 'iden-versio.jpg',
  'Major Marquand': 'major-marquand.jpg',
  'Agent Kallus': 'agent-kallus.jpg',
  'The Fifth Brother': 'the-fifth-brother.jpg',
  'The Seventh Sister': 'the-seventh-sister.jpg',
  'DLT-19 Stormtrooper': 'dlt-19-stormtrooper.jpg',
  'T-21 Stormtrooper': 't-21-stormtrooper.jpg',
  'HH-12 Stormtrooper': 'hh-12-stormtrooper.jpg',
  'Flametrooper': 'flametrooper.jpg',
  'T-7 Ion Snowtrooper': 't-7-ion-snowtrooper.jpg',
  'KX-Series Security Droids': 'kx-series-security-droids.jpg',
  'T-21B Shoretrooper': 't-21b-shoretrooper.jpg',
  'DLT-19x Sniper': 'dlt-19x-sniper.jpg',
  'Sonic Charge Saboteur': 'sonic-charge-saboteur.jpg',
  'DLT-19D Trooper': 'dlt-19d-trooper.jpg',
  'DLT-20A Range Trooper': 'dlt-20a-range-trooper.jpg',
  'T-21A Range Trooper': 't-21a-range-trooper.jpg',
  'FX-9 Medical Droid': 'fx-9-medical-droid.jpg',
  'Imperial Officer': 'imperial-officer.jpg',
  '88i Twin Light Blaster': '88i-twin-light-blaster.jpg',
  'DW-3 Concussion Grenade Launcher': 'dw-3-concussion-grenade-launcher.jpg',
  // = « Lance-mortier de TR-TT » sur la carte française.
  'AT-ST Mortar Launcher': 'tr-tt-mortar-launcher.jpg',
  'Snowtrooper': 'snowtrooper-upgrade.jpg',
  // = « Escouade Stormtrooper » sur la carte française.
  'Stormtrooper Squad': 'stormtrooper-squad.jpg',
  // Cartes Amélioration génériques (deck Genrela_upgrade_fr_30mo.pdf).
  'Targeting Scopes': 'targeting-scopes.jpg',
  'Offensive Push': 'offensive-push.jpg',
  'Linked Targeting Array': 'linked-targeting-array.jpg',
  'Force Choke': 'force-choke.jpg',
  'Saber Throw': 'saber-throw.jpg',
  'Burst of Speed': 'burst-of-speed.jpg',
  'Imperial March': 'imperial-march.jpg',
  'The Darksaber': 'the-darksaber.jpg',
  'Rebel Troopers': 'rebel-troopers.jpg',
  'Mark II Medium Blaster Trooper': 'mark-ii-medium-blaster-trooper.jpg',
  'Fleet Troopers': 'fleet-troopers.jpg',
  'Rebel Veterans': 'rebel-veterans.jpg',
  'Rebel Commandos': 'rebel-commandos.jpg',
  'Rebel Commandos Strike Team': 'rebel-commandos-strike-team.jpg',
  'Wookiee Warriors Freedom Fighters': 'wookiee-warriors-freedom-fighters.jpg',
  'Wookiee Warriors Kashyyyk Resistance': 'wookiee-warriors-kashyyyk-resistance.jpg',
  'Mandalorian Resistance': 'mandalorian-resistance.jpg',
  'Tauntaun Riders': 'tauntaun-riders.jpg',
  'T-47 Airspeeder': 't-47-airspeeder.jpg',
  'X-34 Landspeeder': 'x-34-landspeeder.jpg',
  'Leia Organa': 'leia-organa.jpg',
  'C-3PO': 'c-3po.jpg',
  'Luke Skywalker Hero of the Rebellion': 'luke-skywalker-hero-of-the-rebellion.jpg',
  'Luke Skywalker Jedi Knight': 'luke-skywalker-jedi-knight.jpg',
  'Jyn Erso': 'jyn-erso.jpg',
  'Cassian Andor': 'cassian-andor.jpg',
  'Lando Calrissian': 'lando-calrissian.jpg',
  'Chewbacca': 'chewbacca.jpg',
  'Sabine Wren': 'sabine-wren.jpg',
  'R2-D2': 'r2-d2.jpg',
  'Ahsoka Tano': 'ahsoka-tano.jpg',
  'K-2SO': 'k-2so.jpg',
  // = TL-TT sur la carte française (voir cardTags.ts) : on réutilise le même visuel.
  'AT-RT': 'tl-tt.jpg',
  'TL-TT': 'tl-tt.jpg',
  'MPL-57 Ion Trooper': 'mpl-57-ion-trooper.jpg',
  'DLT-20A Trooper': 'dlt-20a-trooper.jpg',
  'SX-21 Trooper': 'sx-21-trooper.jpg',
  'MPL-57 Barrage Trooper': 'mpl-57-barrage-trooper.jpg',
  'CM-O/93 Trooper': 'cm-o93-trooper.jpg',
  'Proton Charge Saboteur': 'proton-charge-saboteur.jpg',
  'Scatter Gun Trooper': 'scatter-gun-trooper.jpg',
  'Long Gun Wookiee': 'long-gun-wookiee.jpg',
  'DH-447 Sniper': 'dh-447-sniper.jpg',
  'Battle Shield Wookiee': 'battle-shield-wookiee.jpg',
  'Rebel Trooper Squad': 'rebel-trooper-squad.jpg',
  'Bowcaster Wookiee': 'bowcaster-wookiee.jpg',
  'Beskad Duelist': 'beskad-duelist.jpg',
  'Tristan Wren': 'tristan-wren.jpg',
  'Ursa Wren': 'ursa-wren.jpg',
  'Rebel Officer': 'rebel-officer.jpg',
  'Rebel Trooper Captain': 'rebel-trooper-captain.jpg',
  '2-1B Medical Droid': '2-1b-medical-droid.jpg',
  'R5 Astromech Droid': 'r5-astromech-droid.jpg',
  'Fleet Trooper Squad': 'fleet-trooper-squad.jpg',
  'Rebel Veteran Squad': 'rebel-veteran-squad.jpg',
  'Shriv Suurgav': 'shriv-suurgav.jpg',
  'Hotshot Pilot': 'hotshot-pilot.jpg',
  'RPS-6 Rocket Gunner': 'rps-6-rocket-gunner.jpg',
  'Wedge Antilles': 'wedge-antilles.jpg',
  'Outer Rim Speeder Jockey': 'outer-rim-speeder-jockey.jpg',
  'Mo/DK Power Harpoon': 'mo-dk-power-harpoon.jpg',
  'TL-TT Laser Cannon': 'tl-tt-laser-cannon.jpg',
  'TL-TT Flame Projector': 'tl-tt-flame-projector.jpg',
  'AT-RT Flamethrower': 'tl-tt-flame-projector.jpg',
  'M-45 Ion Blaster': 'm-45-ion-blaster.jpg',
  'Mandalorian Combat Shields': 'mandalorian-combat-shields.jpg',
  'Jetpack Rockets': 'jetpack-rockets.jpg',
  'AG-2G Quad Laser': 'ag-2g-quad-laser.jpg',
  'Heavy Laser Retrofit': 'heavy-laser-retrofit.jpg',
  'A280-CFE Pistol/Sniper Config': 'a280-cfe-pistol-sniper-config.jpg',
  "Jyn's SE-14 Blaster": 'jyns-se-14-blaster.jpg',
  "Sabine's Combat Shield": 'sabines-combat-shield.jpg',
  // Cartes du deck Galactic_Empire_Upgrades_FR.pdf re-découpées le
  // 05/09/2026 avec la grille précise (voir crop_lib.py) : le lot précédent
  // ne couvrait pas encore ces visuels.
  'RT-97C Stormtrooper': 'rt-97c-stormtrooper.jpg',
  'Stormtrooper Sharpshooter': 'stormtrooper-sharpshooter.jpg',
  'DT-F16': 'dt-f16.jpg',
  'Del Meeko': 'del-meeko.jpg',
  'Gideon Hask': 'gideon-hask.jpg',
  'T-21 Special Forces Trooper': 't-21-special-forces-trooper.jpg',
  'SM-9 Dark Trooper': 'sm-9-dark-trooper.jpg',
  'XS-IV Dark Trooper': 'xs-iv-dark-trooper.jpg',
  'Cleaver Dark Trooper': 'cleaver-dark-trooper.jpg',
  // Carte « Ajoutez 1 figurine de X » (filler), distincte des unités
  // « Stormtroopers »/« Shoretroopers »/« Range Troopers » déjà en base.
  'Stormtrooper': 'stormtrooper.jpg',
  'Shoretrooper': 'shoretrooper.jpg',
  'Range Trooper': 'range-trooper.jpg',
  'Stormtrooper Squad Expansion': 'stormtrooper-squad-expansion.jpg',
  'Snowtrooper Squad Expansion': 'snowtrooper-squad-expansion.jpg',
  'Shoretrooper Squad Expansion': 'shoretrooper-squad-expansion.jpg',
  'Stormtrooper Captain': 'stormtrooper-captain.jpg',
  'Stormtrooper Specialist': 'stormtrooper-specialist.jpg',
  'Imperial Comms Technician': 'imperial-comms-technician.jpg',
  'Governor Pryce': 'governor-pryce.jpg',
  'First Sergeant Arbmab': 'first-sergeant-arbmab.jpg',
  'General Weiss': 'general-weiss.jpg',
  'Baron Rudor': 'baron-rudor.jpg',
  'Imperial Hammers Elite Armor Pilot': 'imperial-hammers-elite-armor-pilot.jpg',
  'Imperial TIE Pilot': 'imperial-tie-pilot.jpg',
  'Programmed Loyalty': 'programmed-loyalty.jpg',
  'E-11D Focused Strike Config': 'e-11d-focused-strike-config.jpg',
  'E-11D Grenade Launcher Config': 'e-11d-grenade-launcher-config.jpg',
  'CR-24 Flame Rifle': 'cr-24-flame-rifle.jpg',
  'RT-97C Dewback Rider': 'rt-97c-dewback-rider.jpg',
  'T-21 Dewback Rider': 't-21-dewback-rider.jpg',
  'Inquisitorius Training': 'inquisitorius-training.jpg',
  'R4 Astromech Droid': 'r4-astromech-droid.jpg',
  'DLT-19 Pintle Mount': 'dlt-19-pintle-mount.jpg',
  'RT-97C Pintle Mount': 'rt-97c-pintle-mount.jpg',
};

export const CARD_IMAGES: Record<string, string> = Object.fromEntries(
  Object.entries(RAW).map(([name, file]) => [normalizeName(name), `${import.meta.env.BASE_URL}cards/${file}`]),
);

/** Accepte aussi bien un nom anglais (Tabletop Admiral) qu'un nom français recopié depuis la carte — voir canonicalCardKey(). */
export function cardImageFor(name: string): string | undefined {
  return CARD_IMAGES[canonicalCardKey(name)];
}
