import test from 'node:test'
import assert from 'node:assert/strict'
import {levelFraction,flowPhase} from '../src/digital-twin/display.js'
import {EQUIPMENT,equipmentById} from '../src/digital-twin/topology.js'
import {ANALOG} from '../src/digital-twin/telemetry.js'
import {READOUT_SIGNALS,valueAnnotations,placeAnnotations} from '../src/digital-twin/annotations.js'
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
test('on-scene readouts cover all 14 original measurements once at their own devices',()=>{
  const ids=Object.values(READOUT_SIGNALS).flat()
  assert.deepEqual(ids.toSorted((a,b)=>a-b),ANALOG.map(s=>s.id).toSorted((a,b)=>a-b))
  assert.equal(new Set(ids).size,14)
  assert.equal(READOUT_SIGNALS.UF,undefined)
  for(const [equipmentId,signals] of Object.entries(READOUT_SIGNALS)){
    for(const id of signals)assert.ok(equipmentById[equipmentId].signals.includes(id),`${id} is linked to ${equipmentId}`)
  }
})
test('dense projected readouts stay separated on desktop and phone viewports',()=>{
  for(const [width,height] of [[852,306],[341,450],[634,267]]){
    const projected=EQUIPMENT.map(e=>({...e,x:width/2,y:height/2,visible:true}))
    const cards=placeAnnotations(valueAnnotations(projected,width,height),width,height,'T02')
    assert.equal(cards.flatMap(c=>c.signalIds).length,14)
    for(const [i,a] of cards.entries()){
      assert.ok(a.x>=0&&a.y>=0&&a.x+a.w<=width&&a.y+a.h<=height)
      for(const b of cards.slice(i+1))assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,`${width}×${height}: ${a.id} overlaps ${b.id}`)
    }
  }
})
test('floating controls and the selected equipment dock never cover responsive annotations',()=>{
  const intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y
  for(const [width,height] of [[1306,598],[375,603],[844,258]]){
    const reserved=[{x:12,y:height-75,w:Math.min(470,width-80),h:65},{x:width-60,y:Math.max(40,height/2-120),w:50,h:Math.min(240,height-50)}]
    const projected=EQUIPMENT.map(e=>({...e,x:width/2,y:height/2,visible:true}))
    const cards=placeAnnotations(projected,width,height,'T02',[],[],reserved)
    assert.ok(cards.some(c=>c.id==='T02'),'selected equipment keeps its label')
    for(const [i,card] of cards.entries()){
      assert.ok(!reserved.some(r=>intersects(card,r)))
      assert.ok(!cards.slice(i+1).some(other=>intersects(card,other)))
    }
  }
})
