import test from 'node:test'
import assert from 'node:assert/strict'
import {levelFraction,flowPhase} from '../src/digital-twin/display.js'
import {equipmentById} from '../src/digital-twin/topology.js'
test('UF liquid height follows signal 115; its four lamps retain the original IDs',()=>{
  const tank=equipmentById.T02
  assert.deepEqual(tank.signals,[115,138,139,158,140])
  assert.equal(levelFraction(0,tank.visualRange),0)
  assert.equal(levelFraction(3,tank.visualRange),.5)
  assert.equal(levelFraction(6,tank.visualRange),1)
  assert.equal(levelFraction(8,tank.visualRange),1)
  assert.equal(levelFraction(null,tank.visualRange),null)
})
test('flow direction advances continuously and wraps without telemetry changes',()=>{
  assert.ok(flowPhase(1,10)>flowPhase(0,10))
  assert.equal(flowPhase(20,10,1),0)
})
