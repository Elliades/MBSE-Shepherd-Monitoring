import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAX_DRONES, pluginState } from '../src/frames.js'

const frame = (fields) => ({ type: 'info', event: 'state', status: 'running', step: 'Patrolling', ...fields })

test('a single-drone state comes out as it went in', () => {
  assert.deepEqual(pluginState(frame({})), { status: 'running', step: 'Patrolling' })
  assert.equal(JSON.stringify(pluginState(frame({}))), '{"status":"running","step":"Patrolling"}')
})

test('a fleet state keeps its drones and its master', () => {
  const state = pluginState(frame({
    drones: [
      { id: 'D1', step: 'Patrolling', role: 'shepherd', name: 'Shepherd 1', extra: 'dropped' },
      { id: 'D2', step: 'Guarding flock' }
    ],
    master: 'base'
  }))
  assert.deepEqual(state, {
    status: 'running',
    step: 'Patrolling',
    drones: [{ id: 'D1', step: 'Patrolling', role: 'shepherd', name: 'Shepherd 1' }, { id: 'D2', step: 'Guarding flock' }],
    master: 'base'
  })
})

test('bad drones are dropped, and the list is capped', () => {
  const state = pluginState(frame({ drones: [{ id: 'D1' }, 'D2', { id: '', step: 'x' }, { id: 'D3', step: 'Off', role: 7 }], master: 3 }))
  assert.deepEqual(state, { status: 'running', step: 'Patrolling', drones: [{ id: 'D3', step: 'Off' }] })
  const many = Array.from({ length: MAX_DRONES + 5 }, (_, i) => ({ id: `D${i}`, step: 'Off' }))
  assert.equal(pluginState(frame({ drones: many })).drones.length, MAX_DRONES)
})
