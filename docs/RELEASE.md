# Publication d'une version

## 1. Préparer le lot

Travailler sur un ensemble cohérent de corrections. Noter sa portée et ses critères d'acceptation. Ne pas mélanger une refonte visuelle en cours côté utilisateur avec un autre lot.

## 2. Vérifier l'état Git

```powershell
git status --short
git fetch origin claude/star-wars-legion-app-49rc3z
git rev-list --left-right --count HEAD...origin/claude/star-wars-legion-app-49rc3z
```

Si la branche a divergé, ne pas forcer le push. Préserver les modifications, réconcilier l'historique puis revoir le diff.

## 3. Valider

```powershell
npm run verify
```

Pour un changement très local et réversible, commencer par le test ciblé. Exécuter la vérification complète une seule fois avant publication.

## 4. Revoir le contenu publié

```powershell
git diff --check
git status --short
git diff --stat
```

N'ajouter que les fichiers du lot. Exclure caches, sorties de build, fichiers temporaires et diagnostics.

## 5. Commit et push

```powershell
git add <fichiers-du-lot>
git commit -m "Description concise du lot"
git push origin HEAD:claude/star-wars-legion-app-49rc3z
```

Le push doit rester une avance rapide. Ne jamais utiliser `--force` pour publier une correction ordinaire.

## 6. Certifier le déploiement

Contrôler la dernière exécution GitHub Actions « Déploiement GitHub Pages ». Une publication n'est terminée que lorsque le dernier commit a compilé, passé les tests et été déployé avec succès.

Enfin, ouvrir l'URL avec le numéro de version attendu et vérifier le parcours concerné.
