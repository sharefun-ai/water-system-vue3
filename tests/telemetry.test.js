import test from 'node:test'
import assert from 'node:assert/strict'
import {ANALOG,DIGITAL,SIGNALS,normalizePayload,numberOrNull,isWarning,createDemoPayload,lineIsActive} from '../src/digital-twin/telemetry.js'
import {EQUIPMENT,PIPELINES} from '../src/digital-twin/topology.js'

test('all 44 original signals map to a selectable model, without invented sensors',()=>{
  assert.equal(ANALOG.length,14);assert.equal(DIGITAL.length,30)
  const mapped=new Set(EQUIPMENT.flatMap(e=>e.signals))
  for(const s of SIGNALS)assert.ok(mapped.has(s.id),`missing ${s.name} / ${s.id}`)
  assert.equal(mapped.size,44)
  for(const e of EQUIPMENT.filter(e=>e.type==='chemicalTank'))assert.equal(e.signals.length,0)
})
test('invalid and missing measurements remain unknown rather than zero',()=>{
  for(const n of ['',null,undefined,'Infinity','bad',true])assert.equal(numberOrNull(n),null)
  const {values}=normalizePayload({latest_data:[{element_no:'101',value:'7.3'},{element_no:'102',value:'bad'}],check_data:[{element_no:'125',value:'2'},{element_no:'143',value:'1'}]})
  assert.equal(values[101],7.3);assert.equal(values[102],null);assert.equal(values[125],null);assert.equal(values[143],1);assert.equal(values[115],null)
  assert.throws(()=>normalizePayload({latest_data:[]}))
})
test('flow stops for a shut valve, stopped pump, missing signal or zero flow',()=>{
  const line=PIPELINES.find(p=>p.id==='filter-feed'),{values}=normalizePayload(createDemoPayload())
  assert.equal(lineIsActive(line,values),true)
  for(const patch of [{125:0},{125:null},{143:0,144:0},{106:0},{106:null}])assert.equal(lineIsActive(line,{...values,...patch}),false)
})
test('original pressure / turbidity / level alarm thresholds are preserved',()=>{
  assert.equal(isWarning(101,5),false);assert.equal(isWarning(101,5.1),true)
  assert.equal(isWarning(113,1.1),true);assert.equal(isWarning(114,.49),true)
  assert.equal(isWarning(114,null),false)
})
test('low level and backwash scenarios change values and corresponding pump states',()=>{
  const low=normalizePayload(createDemoPayload(1,'low-level')).values
  assert.ok(low[114]<.5);assert.equal(low[143],0);assert.equal(low[106],0)
  const backwash=normalizePayload(createDemoPayload(1,'backwash')).values
  assert.equal(backwash[145],1);assert.equal(backwash[125],0)
  assert.equal(lineIsActive(PIPELINES.find(p=>p.id==='backwash-header'),backwash),true)
})
test('every tagged valve and pump gates at least one pipeline',()=>{
  const gates=new Set(PIPELINES.flatMap(p=>[...(p.gates||[]),...(p.anyPumps||[])]))
  for(const s of DIGITAL.filter(s=>s.type!=='level'))assert.ok(gates.has(s.id),`${s.name} has no connected pipeline`)
})
