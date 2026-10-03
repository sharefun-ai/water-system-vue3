import test from 'node:test'
import assert from 'node:assert/strict'
import {createWaterReadyGate} from '../src/brand/waterReadiness.js'

test('a cold load cannot reveal the opening before a frame with loaded assets',()=>{
  let notifications=0
  const gate=createWaterReadyGate(()=>notifications++)
  for(let i=0;i<120;i++)gate.frameRendered()
  assert.equal(gate.ready,false)
  assert.equal(notifications,0)
  gate.assetReady()
  assert.equal(gate.ready,false,'Downloading must not reveal an unrendered texture')
  gate.frameRendered()
  assert.equal(gate.ready,true)
  assert.equal(notifications,1)
  gate.assetReady()
  for(let i=0;i<120;i++)gate.frameRendered()
  assert.equal(notifications,1,'Later frames must not restart the entrance')
})

test('leaving the page during loading cancels a late entrance callback',()=>{
  let notifications=0
  const gate=createWaterReadyGate(()=>notifications++)
  gate.dispose()
  gate.assetReady()
  gate.frameRendered()
  assert.equal(gate.ready,false)
  assert.equal(notifications,0)
})
