# Publication Git par SSH sous Windows

Cette procédure évite le plantage observé de `git-remote-https.exe` / Git Credential Manager.

1. Créer une clé dédiée : `ssh-keygen -t ed25519 -C "SWL Codex" -f ~/.ssh/swl_codex_ed25519`.
2. Ajouter le contenu de `~/.ssh/swl_codex_ed25519.pub` dans GitHub → Settings → SSH and GPG keys.
3. Tester : `ssh -T git@github.com`.
4. Remplacer l'URL du dépôt : `git remote set-url origin git@github.com:archipad/SWL.git`.
5. Publier : `git push origin HEAD:claude/star-wars-legion-app-49rc3z`.

La clé privée reste uniquement sur l'ordinateur. Ne jamais la joindre à une issue ni la copier dans le dépôt.
