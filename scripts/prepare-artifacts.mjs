import fs from 'node:fs'
import {ANALOG,DIGITAL,signalById} from '../src/digital-twin/telemetry.js'
import {EQUIPMENT,CIRCUITS,PIPELINES} from '../src/digital-twin/topology.js'

const pkg=JSON.parse(fs.readFileSync('package.json','utf8'))
pkg.name='water-system-3d-scada';pkg.version='3.1.0';pkg.scripts.test='node --test tests/*.test.js'
fs.writeFileSync('package.json',JSON.stringify(pkg,null,2)+'\n')
const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'))
lock.name=pkg.name;lock.version=pkg.version;lock.packages[''].name=pkg.name;lock.packages[''].version=pkg.version
fs.writeFileSync('package-lock.json',JSON.stringify(lock,null,2)+'\n')
const rows=[...ANALOG,...DIGITAL].map(s=>({element_no:s.id,name:s.name,type:ANALOG.includes(s)?'analog':s.type,unit:s.unit||'',warning:s.rule?`${s.rule==='high'?'>':'<'} ${s.limit}`:'',models:EQUIPMENT.filter(e=>e.signals.includes(s.id)).map(e=>e.tag).join(' / ')}))
fs.mkdirSync('docs',{recursive:true})
fs.writeFileSync('docs/signal-map.json',JSON.stringify(rows,null,2)+'\n')
const columns=['element_no','name','type','unit','warning','models'],quote=v=>'"'+String(v).replaceAll('"','""')+'"'
fs.writeFileSync('docs/signal-map.csv','\uFEFF'+[columns.join(','),...rows.map(r=>columns.map(c=>quote(r[c])).join(','))].join('\r\n'))
fs.writeFileSync('docs/topology.json',JSON.stringify({note:'Schematic coordinate reconstruction; field P&ID verification is required before engineering use.',circuits:CIRCUITS,equipment:EQUIPMENT,pipelines:PIPELINES},null,2)+'\n')
console.log(`Prepared ${rows.length} signal mappings, ${EQUIPMENT.length} equipment groups and ${PIPELINES.length} pipeline definitions.`)
