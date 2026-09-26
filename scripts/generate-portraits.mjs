#!/usr/bin/env node
/* Génération des portraits d'unités par lot (25/09/2026).

   Lit docs/portraits-unites.json (id, nom, type, faction, ambiance), construit un prompt à partir du
   style commun + de l'ambiance, appelle l'API d'images d'OpenAI, et enregistre :
     - generated-portraits/<id>.png            image brute 1536×1024 (3:2)
     - public/codex/portraits/<id>.webp        recadrée en 2:1 (1536×768) — seulement si le paquet « sharp »
                                               est installé (npm i -D sharp), sinon on garde les PNG bruts.

   Le prompt envoyé est celui du fichier JSON tel quel : ce script ne modifie ni ne retire aucun nom.
   Si le fournisseur refuse une image (filtre de contenu ou de propriété intellectuelle), le script le note
   dans generated-portraits/refuses.txt et passe à la suivante : il ne cherche PAS à contourner le refus
   (pas de reformulation automatique, pas de réglage de modération assouplie). Tu peux alors écrire toi-même
   une description originale dans le JSON, ou faire cette image à la main.

   Utilisation (la clé reste dans ta session, jamais dans un fichier) :
     PowerShell : $env:OPENAI_API_KEY = "sk-..." ; node scripts/generate-portraits.mjs --dry-run
                  node scripts/generate-portraits.mjs --only dark-vador,stormtroopers --quality medium
                  node scripts/generate-portraits.mjs --faction "Alliance Rebelle"
     Options : --only id1,id2  --faction "<nom>"  --type Personnage|Infanterie|Véhicule|Cavalerie
               --quality low|medium|high  --force (regénère les existantes)  --dry-run (n'appelle rien)
               --variants N (N variantes par unité, suffixées -v1, -v2…)  --limit N (arrête après N images)
   Coût indicatif : quelques centimes par image en qualité « medium » — vérifie la grille tarifaire en vigueur. */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const listFile = path.join(root, 'docs', 'portraits-unites.json')
const rawDir = path.join(root, 'generated-portraits')
const finalDir = path.join(root, 'public', 'codex', 'portraits')

// ---------- Style commun : à ajuster ici pour toute la série ----------
const STYLE = 'Photographie cinématographique de science-fiction, éclairage dramatique, liseré de lumière cyan froid côté gauche, fond bleu nuit très sombre avec de la brume, grain de pellicule fin, vignettage léger, profondeur de champ, ultra détaillé, format paysage, aucun texte, aucun logo, aucune interface.'
const FACTION_LIGHT = {
  'Empire Galactique': 'Dominante lumineuse rouge sombre à droite, ambiance froide et menaçante.',
  'Alliance Rebelle': 'Dominante lumineuse ambre et sable à droite, ambiance chaude et déterminée.',
  Mercenaires: 'Dominante lumineuse violet et vert acide à droite, ambiance louche et dangereuse.',
}
const FRAMING = {
  Personnage: 'Plan américain, le personnage au centre, visage entre 30 % et 60 % de la hauteur de l’image.',
  Infanterie: 'Petit groupe de trois à cinq silhouettes en formation, un sujet net au premier plan, groupe centré.',
  Véhicule: 'Vue de trois quarts en légère contre-plongée, le véhicule centré, sensation d’échelle.',
  Cavalerie: 'Cavalier et monture de trois quarts, centrés, mouvement suggéré.',
}
const SAFE = 'Le sujet occupe le tiers central en largeur, laisse les bords de l’image sombres et sans élément important, laisse le quart supérieur peu chargé.'

// ---------- Arguments ----------
const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const value = (name, fallback = null) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] ? args[i + 1] : fallback }
const dryRun = flag('dry-run')
const force = flag('force')
const quality = value('quality', 'medium')
const variants = Math.max(1, Number(value('variants', 1)))
const limit = Number(value('limit', Infinity))
const only = value('only') ? new Set(value('only').split(',').map((s) => s.trim())) : null
const factionFilter = value('faction')
const typeFilter = value('type')

const units = JSON.parse(fs.readFileSync(listFile, 'utf8'))
  .filter((u) => (!only || only.has(u.id)) && (!factionFilter || u.faction === factionFilter) && (!typeFilter || u.type === typeFilter))

const promptFor = (u) => [
  STYLE,
  FACTION_LIGHT[u.faction] ?? '',
  `Sujet : ${u.ambiance}.`,
  FRAMING[u.type] ?? '',
  SAFE,
].filter(Boolean).join(' ')

let sharp = null
try { sharp = (await import('sharp')).default } catch { /* facultatif */ }

fs.mkdirSync(rawDir, { recursive: true })
if (sharp) fs.mkdirSync(finalDir, { recursive: true })

const apiKey = process.env.OPENAI_API_KEY
if (!dryRun && !apiKey) {
  console.error('OPENAI_API_KEY absente : définis-la dans ta session (voir l’en-tête du script) ou utilise --dry-run.')
  process.exit(1)
}

console.log(`${units.length} unité(s) × ${variants} variante(s) — qualité ${quality}${sharp ? ' — recadrage WebP activé' : ' — PNG bruts seulement (npm i -D sharp pour le WebP 2:1)'}${dryRun ? ' — SIMULATION' : ''}`)

const refused = []
let done = 0
for (const u of units) {
  for (let v = 1; v <= variants; v += 1) {
    if (done >= limit) break
    const name = variants > 1 ? `${u.id}-v${v}` : u.id
    const rawPath = path.join(rawDir, `${name}.png`)
    const webpPath = path.join(finalDir, `${name}.webp`)
    if (!force && fs.existsSync(rawPath)) { console.log(`= ${name} existe déjà`); continue }
    const prompt = promptFor(u)
    if (dryRun) { console.log(`\n# ${name} (${u.nom})\n${prompt}`); done += 1; continue }
    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1536x1024', quality, n: 1 }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message = body?.error?.message ?? `HTTP ${response.status}`
        if (response.status === 400) {
          // Refus du fournisseur : on le consigne et on continue, sans reformuler ni assouplir la modération.
          refused.push(`${name}\t${u.nom}\t${message}`)
          console.log(`✗ ${name} refusée par le fournisseur : ${message}`)
          continue
        }
        if (response.status === 429) { console.log('… limite de débit, pause de 20 s'); await new Promise((r) => setTimeout(r, 20000)); v -= 1; continue }
        throw new Error(message)
      }
      const b64 = body?.data?.[0]?.b64_json
      if (!b64) throw new Error('réponse sans image')
      const buffer = Buffer.from(b64, 'base64')
      fs.writeFileSync(rawPath, buffer)
      if (sharp) await sharp(buffer).extract({ left: 0, top: 128, width: 1536, height: 768 }).webp({ quality: 82 }).toFile(webpPath)
      done += 1
      console.log(`✓ ${name}`)
    } catch (error) {
      console.log(`✗ ${name} : ${error.message}`)
    }
    await new Promise((r) => setTimeout(r, 1500))
  }
}
if (refused.length) {
  fs.writeFileSync(path.join(rawDir, 'refuses.txt'), refused.join('\n') + '\n')
  console.log(`\n${refused.length} image(s) refusée(s) : voir generated-portraits/refuses.txt`)
}
console.log(dryRun ? '\nSimulation terminée (aucun appel).' : `\nTerminé : ${done} image(s) générée(s).`)
