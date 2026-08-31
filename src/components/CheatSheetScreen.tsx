import { DiceIcon } from '../lib/diceIcons';

/**
 * Résumé/pense-bête d'une partie complète (mise en place, phase
 * d'activation, mouvements, séquence d'attaque, rappels de règles).
 *
 * Retranscrit depuis l'aide de jeu (non officielle, v2.6) fournie par
 * l'utilisateur — un résumé condensé pensé pour être imprimé et gardé sous
 * la main pendant une partie, pas des extraits du livret officiel. Les
 * quelques icônes ambiguës de ce document (rangs d'unité, jetons, portée
 * en tant que fraction « ½ ») sont retranscrites telles quelles plutôt que
 * réinterprétées ; seuls les résultats de dés (Touche/Critique/Bloc/
 * Adrénaline), non ambigus dans ce contexte, réutilisent les icônes du
 * reste de l'appli (src/lib/diceIcons.tsx).
 */
export function CheatSheetScreen() {
  return (
    <div className="cheatsheet-screen no-print">
      <h2>Pense-bête</h2>
      <p className="import-note">
        Résumé non officiel d'une partie complète, retranscrit depuis une aide de jeu — pratique
        pour garder les grandes étapes sous les yeux, mais le livret de règles reste la référence
        en cas de doute ou de cas particulier.
      </p>

      <section className="cheat-block">
        <h3>Construction d'une mission — « Tour 0 »</h3>
        <ol className="cheat-steps">
          <li>
            On tire qui est <strong className="cheat-blue">Bleu</strong> et{' '}
            <strong className="cheat-red">Rouge</strong> : chacun lance 5 dés d'attaque noirs, le
            joueur Bleu est celui qui obtient le plus de résultats Critique, puis Touche, puis
            Adrénaline en cas d'égalité.
          </li>
          <li><strong className="cheat-blue">Bleu</strong> tire une carte d'objectif principal ou secondaire.</li>
          <li><strong className="cheat-red">Rouge</strong> tire l'autre carte.</li>
          <li>Chacun tire une carte Avantage.</li>
          <li><strong className="cheat-blue">Bleu</strong> réalise une action (liste ci-dessous).</li>
          <li><strong className="cheat-red">Rouge</strong> réalise une action.</li>
          <li><strong className="cheat-blue">Bleu</strong> réalise une action.</li>
          <li><strong className="cheat-red">Rouge</strong> réalise une action.</li>
          <li>
            Le joueur Bleu (final) choisit son bord de terrain, applique en premier ses cartes
            Avantage, puis commence à déployer ses unités en « position préparée ».
          </li>
        </ol>
        <p className="cheat-subheading">Actions possibles aux étapes 5 à 8 :</p>
        <ul className="cheat-list">
          <li>Changer l'objectif principal pour un des siens tiré au hasard</li>
          <li>Changer l'objectif secondaire pour un des siens tiré au hasard</li>
          <li>Changer son Avantage pour un autre tiré au hasard</li>
          <li>Forcer l'autre joueur à changer son Avantage pour un autre des siens tiré au hasard</li>
          <li>Devenir le joueur Bleu</li>
          <li>Passer</li>
        </ul>
      </section>

      <section className="cheat-block">
        <h3>Déploiement des unités — 5 possibilités</h3>
        <ol className="cheat-steps">
          <li><strong>Position préparée</strong> (au Tour 0) : placées dans le territoire allié, avec 1 pion Esquive.</li>
          <li><strong>Infiltration</strong> (à l'activation) : placées dans le territoire allié.</li>
          <li><strong>Éclaireur X</strong> (à l'activation) : placées à partir du bord de terrain, avec un mouvement gratuit de X.</li>
          <li>Les autres unités (à l'activation) : placées à partir du bord de terrain, avec un mouvement en 1ᵉʳ.</li>
          <li><strong>Transport</strong> (à l'activation) : placées au passage à partir d'un transport déjà déployé, avec un mouvement de vitesse 1.</li>
        </ol>
        <p className="cheat-note">
          Les commandants (déployés ou non) donnent des ordres à qui ils veulent ; les unités non
          déployées sont considérées en ligne de vue et à portée les unes des autres si besoin.
        </p>
      </section>

      <section className="cheat-block">
        <h3>Déroulement de la phase d'activation</h3>
        <ol className="cheat-steps">
          <li>Résoudre les capacités et/ou effets de début de phase d'activation.</li>
          <li>Choisir une unité à activer, ou passer.</li>
          <li>
            Activer l'unité :
            <ol type="a" className="cheat-substeps">
              <li>Résoudre les capacités et/ou effets de début d'activation de l'unité.</li>
              <li>Se rallier* (facultatif).</li>
              <li>Faire jusqu'à 2 actions (hors actions gratuites).</li>
              <li>Résoudre les capacités et/ou effets de fin d'activation de l'unité.</li>
            </ol>
          </li>
          <li>Placer un pion Ordre face cachée.</li>
          <li>Résoudre les capacités et/ou effets de fin de phase d'activation.</li>
        </ol>
        <p className="cheat-note">
          *<strong>Se rallier</strong> : pour chaque pion Suppression, lancer 1 dé de défense
          blanc — retirer 1 pion Suppression par résultat <DiceIcon type="bloc" /> Bloc ou{' '}
          <DiceIcon type="adr-def" /> Adrénaline obtenu.
        </p>
        <p className="cheat-subheading">Actions possibles pendant l'activation :</p>
        <ul className="cheat-list">
          <li><strong>Mouvement</strong></li>
          <li><strong>Attaque</strong></li>
          <li><strong>Action</strong></li>
          <li><strong>Action gratuite</strong></li>
          <li><strong>Viser</strong> : relancer jusqu'à 2 dés d'attaque.</li>
          <li><strong>Esquiver</strong> : annuler 1 <DiceIcon type="touche" /> Touche.</li>
          <li><strong>Attendre</strong> : faire une attaque ou un mouvement si un ennemi termine une action à portée 2.</li>
          <li><strong>Récupérer</strong> : retirer ses pions Suppression et redresser ses cartes inclinées.</li>
          <li><strong>Retrait</strong> : mouvement de vitesse 1 pour sortir d'un corps-à-corps — ne peut pas être suivi d'une attaque ou d'un Attendre.</li>
        </ul>
      </section>

      <section className="cheat-block">
        <h3>Les mouvements par type d'unité</h3>
        <div className="cheat-table-wrap">
          <table className="cheat-table">
            <thead>
              <tr>
                <th scope="col">Type d'unité</th>
                <th scope="col">Pivot</th>
                <th scope="col">Reverse</th>
                <th scope="col">Désengager</th>
                <th scope="col">Bloque LoS</th>
                <th scope="col">Reçoit couvert</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Soldat</th>
                <td colSpan={2}>Bouge librement</td>
                <td>Oui</td>
                <td className="cheat-no">Non</td>
                <td>Oui</td>
              </tr>
              <tr>
                <th scope="row">Soldat créature</th>
                <td colSpan={2} rowSpan={2}>Même engagé</td>
                <td>Peut attaquer</td>
                <td className="cheat-no">Non</td>
                <td>Sauf barricade</td>
              </tr>
              <tr>
                <th scope="row">Soldat en position</th>
                <td>Oui</td>
                <td className="cheat-no">Non</td>
                <td>Oui</td>
              </tr>
              <tr>
                <th scope="row">Véhicule terrestre</th>
                <td>Oui</td>
                <td>Oui</td>
                <td rowSpan={2}>N'est jamais engagé</td>
                <td>Couvert lourd</td>
                <td className="cheat-no">Non</td>
              </tr>
              <tr>
                <th scope="row">Véhicule à répulsion</th>
                <td>Oui</td>
                <td>Oui</td>
                <td className="cheat-no">Non</td>
                <td className="cheat-no">Non</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="cheat-list">
          <li><strong>Pivot</strong> : rotation jusqu'à 90°.</li>
          <li><strong>Reverse</strong> : mouvement en arrière à vitesse -1 (minimum 1).</li>
          <li><strong>Désengager</strong> : mouvement de vitesse 1 pour sortir d'un corps-à-corps — ne peut pas être suivi d'une attaque ou d'un Attendre.</li>
        </ul>
      </section>

      <section className="cheat-block">
        <h3>Séquence d'attaque</h3>
        <ol className="cheat-steps">
          <li>
            Déclarer le défenseur (cible) et former le pool d'attaque
            <ol type="a" className="cheat-substeps">
              <li>Déterminer les figurines éligibles (ligne de vue + portée).</li>
              <li>Choisir les armes et assembler les dés.</li>
            </ol>
          </li>
          <li>
            Lancer les dés d'attaque
            <ol type="a" className="cheat-substeps">
              <li>Lancer les dés et relance(s).</li>
              <li>Convertir les Adrénalines (capacités natives, d'armes, ou jetons).</li>
            </ol>
          </li>
          <li>
            Appliquer le couvert
            <ol type="a" className="cheat-substeps">
              <li>Déterminer les figurines protégées et le niveau de couvert.</li>
              <li>Lancer les dés de couvert.</li>
              <li>Appliquer les Esquives.</li>
            </ol>
          </li>
          <li>Modifier les dés d'attaque (Backup, Impact X, Armure...).</li>
          <li>
            Lancer les dés de défense
            <ol type="a" className="cheat-substeps">
              <li>Lancer les dés et relance(s).</li>
              <li>Convertir les Adrénalines.</li>
            </ol>
          </li>
          <li>Modifier les dés de défense (Perforant X...).</li>
          <li>Comparer les résultats.</li>
          <li>Assigner les pions Suppression et les blessures au défenseur.</li>
        </ol>
      </section>

      <section className="cheat-block">
        <h3>Rappels de règles</h3>
        <div className="cheat-rules-grid">
          <div className="cheat-rule">
            <h4>Conditions de couvert</h4>
            <p>
              Il faut qu'au moins la moitié des figurines de l'unité défenseuse soient protégées.
              Une figurine est protégée si la ligne de vue entre n'importe quel point du chef
              d'unité attaquant et n'importe quel point de cette figurine passe par un décor
              procurant du couvert, à ½ de cette figurine.
            </p>
          </div>
          <div className="cheat-rule">
            <h4>Fonctionnement des dés de couvert</h4>
            <p>
              Si le couvert s'applique, lancer 1 dé de défense blanc par résultat{' '}
              <DiceIcon type="touche" /> Touche du pool d'attaque. Retirer 1 Touche par résultat :
            </p>
            <ul className="cheat-list">
              <li><DiceIcon type="bloc" /> Bloc si couvert léger</li>
              <li><DiceIcon type="bloc" /> Bloc ou <DiceIcon type="adr-def" /> Adrénaline si couvert lourd</li>
            </ul>
            <p className="cheat-note">(Une unité Démoralisée ajoute 1 niveau de couvert.)</p>
          </div>
          <div className="cheat-rule">
            <h4>Fonctionnement du moral</h4>
            <p className="cheat-note">(Vérifié après le ralliement de l'unité.)</p>
            <p><strong>Démoralisée</strong> : si le nombre de pions Suppression ≥ courage de l'unité → elle perd 1 action (jamais pour une unité Droïde).</p>
            <p>
              <strong>Paniquée</strong> : si le nombre de pions Suppression ≥ 2× le courage →
              l'unité ne peut faire aucune action (même gratuite), et retire en fin d'activation
              un nombre de pions Suppression égal à son courage.
            </p>
          </div>
          <div className="cheat-rule">
            <h4>Conditions de Backup</h4>
            <p>
              Une figurine soldat bénéficie d'un Backup si elle a la ligne de vue et est à ½ d'un
              chef d'unité soldat qui n'est pas démoralisé et qui a un rang supérieur, ou qui a le
              mot-clé Gardien, Entourage ou Escorte.
            </p>
            <p className="cheat-note">(Un Gardien ne peut pas lui-même bénéficier d'un Backup.)</p>
          </div>
        </div>
      </section>
    </div>
  );
}
