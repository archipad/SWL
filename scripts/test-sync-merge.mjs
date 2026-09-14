import assert from 'node:assert/strict'
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { mergeAssistantUnitStates, mergeAttackHistory } = await vite.ssrLoadModule('/src/lib/gistSync.ts')
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

  const history = mergeAttackHistory(
    [{ id: 'a', at: '2026-01-01T10:00:00Z', wounds: 1 }],
    [{ id: 'b', at: '2026-01-01T11:00:00Z', wounds: 2 }, { id: 'a', at: '2026-01-01T10:00:00Z', wounds: 1 }],
  )
  assert.deepEqual(history.map((entry) => entry.id), ['b', 'a'])
  assert.equal(history.length, 2, 'Le même combat ne doit pas être dupliqué entre appareils')
  console.log('Synchronisation: fusion multiappareil et conflits vérifiés')
} finally {
  await vite.close()
}
