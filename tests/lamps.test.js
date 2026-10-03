import test from 'node:test'
import assert from 'node:assert/strict'
import {lampAppearance} from '../src/digital-twin/lamps.js'
import {DIGITAL} from '../src/digital-twin/telemetry.js'
test('only ON powers the lens; OFF extinguishes both emission and halo',()=>{
  const on=lampAppearance(1),off=lampAppearance(0)
  assert.equal(on.state,'on');assert.ok(on.intensity>0&&on.glow>0)
  assert.equal(off.state,'off');assert.equal(off.intensity,0);assert.equal(off.glow,0)
  assert.notEqual(on.color,off.color)
})
test('missing and invalid states stay unknown, distinct from OFF',()=>{
  for(const value of [null,undefined,2,'1'])assert.equal(lampAppearance(value).state,'unknown')
  assert.equal(DIGITAL.length,30)
})
