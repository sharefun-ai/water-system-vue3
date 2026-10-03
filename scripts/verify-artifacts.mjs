import fs from 'node:fs'
import assert from 'node:assert/strict'
import {EQUIPMENT,PIPELINES} from '../src/digital-twin/topology.js'
import {SIGNALS} from '../src/digital-twin/telemetry.js'
const glb=fs.readFileSync('models/aquatic-scada-3d.glb')
assert.equal(glb.subarray(0,4).toString(),'glTF');assert.equal(glb.readUInt32LE(4),2);assert.equal(glb.readUInt32LE(8),glb.length)
const jsonLength=glb.readUInt32LE(12),json=JSON.parse(glb.subarray(20,20+jsonLength).toString())
const devices=json.nodes.filter(n=>n.extras?.tag),pipelines=json.nodes.filter(n=>n.extras?.pipelineId)
assert.equal(devices.length,EQUIPMENT.length);assert.equal(pipelines.length,PIPELINES.length)
const signals=new Set(devices.flatMap(n=>n.extras.signals));for(const s of SIGNALS)assert.ok(signals.has(s.id),`GLB missing signal ${s.id}`)
const png=fs.readFileSync('docs/screenshots/aquatic-scada-scene.png');assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a')
console.log(JSON.stringify({modelBytes:glb.length,equipmentGroups:devices.length,pipelines:pipelines.length,mappedSignals:signals.size,pngWidth:png.readUInt32BE(16),pngHeight:png.readUInt32BE(20)},null,2))
