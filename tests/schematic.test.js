import test from 'node:test'
import assert from 'node:assert/strict'
import {DIAGRAM,bridgePath,diagramLines,diagramEquipment,renderedLines,segments,deviceBounds,meterPositions,meterHeight,portConnections,pointOnLine,junctions} from '../src/digital-twin/schematic.js'

test('a crossing has a bridge, while touching endpoints remain connected',()=>{
  const lower={id:'a',circuit:'feed',points:[[0,50],[100,50]]}
  const crossed={id:'b',circuit:'chemical',points:[[50,0],[50,100]]}
  const joint={id:'c',circuit:'chemical',points:[[100,50],[100,100]]}
  assert.match(bridgePath(crossed,[lower]),/ C /)
  assert.doesNotMatch(bridgePath(joint,[lower]),/ C /)
})
test('the independent 2D layout retains every original pipe, device and signal',()=>{
  assert.equal(diagramEquipment.length,35)
  assert.equal(diagramLines.length,24)
  assert.equal(new Set(diagramEquipment.flatMap(e=>e.signals)).size,44)
  for(const line of diagramLines)for(const {a,b} of segments(line)){
    assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])>.01)
    assert.ok(a[0]===b[0]||a[1]===b[1],line.id+' must be orthogonal')
    for(const p of [a,b])assert.ok(p[0]>=0&&p[0]<=DIAGRAM.width&&p[1]>=0&&p[1]<=DIAGRAM.height)
  }
  assert.ok(renderedLines.some(line=>line.d.includes(' C ')))
})

test('crossing pipes in the same circuit also remain visibly separate',()=>{
  const a={id:'a',circuit:'feed',points:[[0,50],[100,50]]}
  const b={id:'b',circuit:'feed',points:[[50,0],[50,100]]}
  assert.match(bridgePath(b,[a]),/ C /)
  assert.doesNotMatch(bridgePath(a,[b]),/ C /)
})

const overlaps=(a,b)=>a[0]<b[0]+b[2]&&a[0]+a[2]>b[0]&&a[1]<b[1]+b[3]&&a[1]+a[3]>b[1]
const intersects=({a,b},r)=>a[0]===b[0]?a[0]>r[0]&&a[0]<r[0]+r[2]&&Math.max(a[1],b[1])>r[1]&&Math.min(a[1],b[1])<r[1]+r[3]:a[1]>r[1]&&a[1]<r[1]+r[3]&&Math.max(a[0],b[0])>r[0]&&Math.min(a[0],b[0])<r[0]+r[2]
test('devices have separate space, and pipes never cross a numeric card',()=>{
  const rectangles=diagramEquipment.map(e=>({id:e.id,r:e.type==='instrument'?[...meterPositions[e.id],178,meterHeight(e)]:(()=>{const b=deviceBounds(e);return [e.point[0]+b[0],e.point[1]+b[1],b[2],b[3]]})()}))
  for(let i=0;i<rectangles.length;i++)for(const b of rectangles.slice(i+1))assert.ok(!overlaps(rectangles[i].r,b.r),rectangles[i].id+' overlaps '+b.id)
  for(const e of diagramEquipment.filter(e=>e.type==='instrument'))for(const line of diagramLines)assert.ok(!segments(line).some(s=>intersects(s,[...meterPositions[e.id],178,meterHeight(e)])),line.id+' crosses '+e.id+' readings')
})

test('every physical equipment port and instrument tap connects to a pipe',()=>{
  for(const p of portConnections)assert.ok(diagramLines.some(l=>pointOnLine(p.point,l)),p.id+' '+p.name+' is disconnected')
  for(const e of diagramEquipment.filter(e=>e.type==='instrument'))assert.ok(diagramLines.some(l=>pointOnLine(e.point,l)),e.id+' has no pipe tap')
})

test('pipework stays outside vessels, pump bodies and all 30 lamp fixtures',()=>{
  const bodies={tank:[-50,-78,100,150],chemicalTank:[-37,-42,74,83],pump:[-53,-32,106,59],membrane:[-75,-134,150,268]}
  const lamps=[]
  for(const e of diagramEquipment){
    if(bodies[e.type]){
      const b=bodies[e.type],r=[e.point[0]+b[0],e.point[1]+b[1],b[2],b[3]]
      for(const line of diagramLines)assert.ok(!segments(line).some(s=>intersects(s,r)),line.id+' runs through '+e.id+' body')
    }
    if(e.type==='pump')lamps.push([e.point[0]+(e.mirrored?16:-16),e.point[1]-43])
    if(e.type==='valve')lamps.push([e.point[0]+(e.vertical?46:0),e.point[1]-(e.vertical?16:48)])
    if(e.type==='tank')for(let i=0;i<e.signals.length-1;i++)lamps.push([e.point[0]+67,e.point[1]-57+i*27])
  }
  assert.equal(lamps.length,30)
  for(const p of lamps)for(const line of diagramLines)assert.ok(!segments(line).some(s=>intersects(s,[p[0]-18,p[1]-18,36,36])),line.id+' crosses a lamp at '+p)
})

test('the original branch connections remain joints after moving equipment',()=>{
  const connected=[['pump-a','pump-b'],['pump-a','filter-feed'],['backwash-a','backwash-b'],['backwash-a','backwash-header'],['dose-a','dose-b'],['dose-a','dose-injection'],['dose-injection','backwash-header'],['raw-return','backwash-return'],['cip-pump','cip-feed'],['cip-pump','cip-upper'],['cip-pump','cip-return'],['cip-return','drain-bottom'],['drain-bottom','backwash-return'],['cip-upper','drain-top'],['cip-upper','cip-return'],['product-out','product-tank'],['product-out','cip-feed'],['backwash-header','product-out'],['product-out','product-quality']]
  for(const ids of connected)assert.ok(junctions.some(j=>ids.every(id=>j.ids.has(id))),ids.join(' / ')+' lost its joint')
})
