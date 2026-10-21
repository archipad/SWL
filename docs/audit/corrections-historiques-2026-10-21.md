# Corrections historiques démontrées — 21/10/2026

Lot appliqué par l'outil officiel `scripts/apply-dice-certification.mjs` (lot v6). Cet outil valide les identifiants, les dés, les portées et les mots-clés. Il recalcule l'empreinte du visuel, régénère le référentiel puis contrôle sa cohérence (`test-reference-consistency`).

**Résultat :** 124 certifications complètes (au lieu de 118), 0 désaccord entre la base et les certifications.

**Règles du lot :**
- Seules les valeurs lues sur les visuels sont certifiées.
- Chaque certification conserve sa provenance (`fullCardCertification.provenance`) : visuel français du dépôt, PDF officiel AMG d'avril 2026 (page) et note.
- Les figurines ajoutées gardent les PV de l'unité, comme les autres cartes certifiées. Cette valeur n'est pas imprimée sur l'amélioration et n'est donc pas certifiée.

## Unités

| Carte (clé moteur) | Correction | Preuve |
|---|---|---|
| Dark Troopers Impériaux (`dark trooper squad`) | Rang **Lourd** (était Troupiers). Type **Soldat Droïde**. | Icône de rang Lourd et « 3 » figurines, sur le visuel français `dark-trooper-squad.jpg` et sur le visuel AMG `DOC51_GalacticEmpire_Units.pdf` p. 9 (« Droid Trooper »). |
| Range Troopers (`range troopers`) | Type **Soldat** (était vide). | `range-troopers.jpg` ; AMG p. 8. |
| Moff Gideon (`moff gideon`) | Certification complète, voir le détail ci-dessous. | `moff-gideon.jpg` ; AMG p. 10. |
| AT-RT rebelle (`at rt`) | **Aucune valeur modifiée** : défense blanche confirmée, provenance ajoutée. L'historique legionhq (« défense rouge, 19/07/2024 ») n'est pas retenu. | AMG `DOC51_RebelAlliance_Units.pdf` p. 6 (logo rebelle, défense blanche, Armure 2, A300 2 blancs) et `tl-tt.jpg`. |

**Détail de Moff Gideon :**
- Commandant, Soldat, 1 figurine, 5 PV, courage 3, défense rouge, vitesse 2.
- Adrénaline : attaque → critique, défense → bloc.
- Mots-clés : Surveillance 1, Entourage : Dark Troopers Impériaux, Impitoyable, Tireur d'Élite 1, Tacticien 1.
- Armes :
  - Entraînement au Combat : 2 rouges, corps à corps ;
  - Blaster de Gideon : 1 rouge + 2 noirs, portée 1-2, Perforant 1.

## Améliorations

| Carte (clé moteur) | Certification | Preuve |
|---|---|---|
| Ordres Improvisés (`improvised orders`) | Aucune arme, aucun mot-clé, carte à épuiser | `improvised-orders.jpg` |
| Loyauté Programmée (`programmed loyalty`) | Escorte : Commandant ; aucune arme | `programmed-loyalty.jpg` |
| Dark Trooper avec Canon d'Assaut XS-IV (`xs iv dark trooper`) | +1 figurine ; Canon d'Assaut XS-IV : 4 noirs, portée 1-3, Critique 1 | `xs-iv-dark-trooper.jpg` |
| Range Trooper avec DLT-20A (`dlt 20a range trooper`) | +1 figurine ; Fusil Blaster DLT-20A : 2 rouges, portée 1-5, Impact 2 | `dlt-20a-range-trooper.jpg` |
| Range Trooper (`range trooper`) | +1 figurine ; aucune arme, aucun mot-clé | `range-trooper.jpg` |

## Alias historiques ajoutés (`src/data/cardKeyAliases.json`)

- `moff gideon long live the empire` → `moff gideon`
- `imperial dark troopers` → `dark trooper squad`
- `xs iv assault cannon` → `xs iv dark trooper`

## Non appliqué faute de preuve

- **Mandalorian Hunter** et ses améliorations **Battlemaster**, **Tank Hunting Munitions** et **Champion of the Watch** : aucun visuel dans le dépôt (ni français SWL, ni anglais AMG), aucune entrée dans le catalogue historique. Rien n'est certifié.
- **GALAAR-90 Sniper Rifle (Armament)** : variante n° 22654 retenue dans la bêta. Aucun visuel ni aucune entrée historique, donc rien n'est certifié côté moteur.
