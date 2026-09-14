import assert from 'node:assert/strict'
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true } })
try {
  const { mergeAssistantUnitStates, mergeAttackHistory, mergeGameActionHistory, mergeGameTracker } = await vite.ssrLoadModule('/src/lib/gistSync.ts')
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
