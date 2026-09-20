import assert from 'node:assert/strict'
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true } })
try {
  const { mergeAssistantUnitStates, mergeAttackHistory, mergeGameActionHistory, mergeGameTracker, mergeGameSnapshot } = await vite.ssrLoadModule('/src/lib/gistSync.ts')
  const remote = { 'p1:unit': { wounds: 1 }, 'p2:unit': { wounds: 2 } }
  const local = { 'p1:unit': { wounds: 3 }, 'p3:unit': { wounds: 1 } }
  const merged = mergeAssistantUnitStates(remote, local, { 'p1:unit': 100, 'p2:unit': 150 }, { 'p1:unit': 200, 'p3:unit': 180 })
  assert.deepEqual(merged.states, {
    'p1:unit': { wounds: 3 },
    'p2:unit': { wounds: 2 },
    'p3:unit': { wounds: 1 },
  })
  const stale = mergeAssistantUnitStates(remote, { 'p1:unit': { wounds: 9 } }, { 'p1:unit': 300 }, { 'p1:unit': 200 })
  assert.deepEqual(stale.states['p1:unit'], { wounds: 1 }, 'Un appareil en retard ne doit pas écraser un état plus récent')
  assert.equal(merged.conflicts, 1)
  assert.equal(merged.incomingWins, 1)
  assert.equal(stale.remoteWins, 1)

  const history = mergeAttackHistory(
    [{ id: 'a', at: '2026-01-01T10:00:00Z', wounds: 1 }],
    [{ id: 'b', at: '2026-01-01T11:00:00Z', wounds: 2 }, { id: 'a', at: '2026-01-01T10:00:00Z', wounds: 1 }],
  )
  assert.deepEqual(history.map((entry) => entry.id), ['b', 'a'])
  assert.equal(history.length, 2, 'Le même combat ne doit pas être dupliqué entre appareils')
  // Nouvelle partie (numéro de partie) : l'ancienne partie du gist ne ressuscite jamais (suppressions, états, round 5).
  const oldGame = { updatedAt: 1, listP1: null, listP2: null, gameEpoch: 1000, gameTracker: { round: 5 }, gameTrackerUpdatedAt: 900, assistantUnitStates: { u1: { suppression: 3, demoralised: true } }, assistantUnitStateUpdatedAt: { u1: 900 }, assistantAttackHistory: [{ id: 'old', at: '2026-01-01' }], gameActionHistory: [{ id: 'g', at: '2026-01-01' }] }
  const fresh = mergeGameSnapshot(oldGame, { gameEpoch: 2000, gameTracker: { round: 1 }, gameTrackerUpdatedAt: 2000, assistantUnitStates: {}, assistantUnitStateUpdatedAt: {}, assistantAttackHistory: [], gameActionHistory: [] })
  assert.deepEqual(fresh.states, {}, 'Nouvelle partie : plus aucune suppression ni aucun état de l’ancienne partie')
  assert.deepEqual(fresh.state, { round: 1 }, 'Nouvelle partie : le round repart à 1')
  assert.equal(fresh.attackHistory.length, 0)
  assert.equal(fresh.gameEpoch, 2000)
  const staleDevice = mergeGameSnapshot({ ...oldGame, gameEpoch: 3000, gameTracker: { round: 1 }, assistantUnitStates: {} }, { gameEpoch: 1000, gameTracker: { round: 5 }, gameTrackerUpdatedAt: Date.now(), assistantUnitStates: { u1: { suppression: 3 } }, assistantUnitStateUpdatedAt: { u1: Date.now() } })
  assert.deepEqual(staleDevice.states, {}, 'Un appareil resté sur l’ancienne partie ne doit pas la réimposer')
  assert.deepEqual(staleDevice.state, { round: 1 })
  assert.equal(staleDevice.adoptedRemote, true)
  const legacy = mergeGameSnapshot({ ...oldGame, gameEpoch: undefined }, { gameTracker: { round: 6 }, gameTrackerUpdatedAt: 2000, assistantUnitStates: { u2: { wounds: 1 } }, assistantUnitStateUpdatedAt: { u2: 5 } })
  assert.ok(legacy.states.u1 && legacy.states.u2, 'Sans numéro de partie (anciennes données) : fusion habituelle, unité par unité')
  const baseTracker = { round: 1, p1Color: 'bleu', vpBleu: 0, vpRouge: 0, objectiveId: null, secondaryId: null, advantageBleuId: null, advantageRougeId: null, activatedUnitIds: [], roundHistory: [] }
  const remoteTracker = { ...baseTracker, round: 3, vpBleu: 4 }
  const trackerMerge = mergeGameTracker(remoteTracker, { ...baseTracker, round: 2, vpBleu: 2 }, 300, 200)
  assert.deepEqual(trackerMerge.state, remoteTracker, 'Un appareil en retard ne doit pas écraser le suivi plus récent')
  assert.equal(trackerMerge.conflict, true)
  assert.equal(trackerMerge.remoteWins, true)
  const actionHistory = mergeGameActionHistory(
    [{ id: 'score', at: '2026-01-01T10:00:00Z', label: 'Score +1' }],
    [{ id: 'score', at: '2026-01-01T10:00:00Z', label: 'Score +1', undoneAt: '2026-01-01T10:01:00Z' }],
  )
  assert.equal(actionHistory.length, 1)
  assert.equal(actionHistory[0].undoneAt, '2026-01-01T10:01:00Z', 'Une annulation distante ne doit pas être ressuscitée par un appareil en retard')
  console.log('Synchronisation: fusion multiappareil et conflits vérifiés')
} finally {
  await vite.close()
}
