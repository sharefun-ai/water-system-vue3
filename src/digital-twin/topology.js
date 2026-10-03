// Traced from engineering-diagram.png; schematic coordinates, not surveyed dimensions.
import {DIGITAL} from './telemetry.js'
export const CIRCUITS={feed:{name:'原水 / 過濾',color:'#51b9ff',height:1},product:{name:'UF 產水',color:'#50e3c2',height:1.15},backwash:{name:'逆洗回路',color:'#efb85c',height:1.7},chemical:{name:'加藥 / 循環',color:'#ae96f4',height:2.25},drain:{name:'回收 / 放流',color:'#9bafc3',height:2.8}}
export const world=(u,v,h=.9)=>[(u-.5)*32,h,(v-.5)*20]
const item=(id,name,type,u,v,circuit,signals=[],extra={})=>({id,name,type,position:world(u,v,0),circuit,signals,...extra})
export const EQUIPMENT=[
  item('T01','回收水原水貯槽','tank',.36,.79,'feed',[114,120,121,157,122,123],{tag:'T-01',height:3.6,radius:1.16,levelId:114,visualRange:[0,1.8]}),
  item('T02','UF 產水貯槽','tank',.16,.40,'product',[115,138,139,158,140],{tag:'T-02',height:3.6,radius:1.16,levelId:115,visualRange:[0,6]}),
  item('NAOCL','NaOCl 藥桶','chemicalTank',.355,.425,'chemical',[],{tag:'NaOCl',height:2.7,radius:.8}),
  item('T03','藥液循環桶','chemicalTank',.65,.295,'chemical',[],{tag:'T-03',height:2.7,radius:.82}),
  item('UF','超濾膜組','membrane',.94,.42,'product',[101,102,103,104],{tag:'UF-01',height:4.5}),
  ...[[143,.48,.745,'feed','P-01A'],[144,.48,.855,'feed','P-01B'],[145,.245,.345,'backwash','P-02A'],[146,.245,.495,'backwash','P-02B'],[147,.435,.395,'chemical','D-01A'],[148,.435,.49,'chemical','D-01B'],[149,.555,.40,'chemical','P-03']].map(([id,u,v,circuit,tag])=>item(String(id),DIGITAL.find(s=>s.id===id).name,'pump',u,v,circuit,[id],{tag,signalId:id})),
  ...[[124,.28,.625,'feed'],[125,.82,.725,'feed'],[126,.82,.325,'product'],[127,.82,.24,'chemical'],[128,.82,.405,'backwash'],[129,.82,.14,'chemical'],[130,.82,.625,'backwash'],[131,.465,.32,'chemical'],[132,.175,.24,'product'],[133,.035,.24,'drain'],[134,.82,.835,'drain'],[135,.82,.505,'chemical'],[136,.82,.04,'drain'],[137,.035,.08,'drain']].map(([id,u,v,circuit])=>item(String(id),DIGITAL.find(s=>s.id===id).name,'valve',u,v,circuit,[id],{tag:DIGITAL.find(s=>s.id===id).name,signalId:id,vertical:[131,132,133,137].includes(id),pipeHeight:CIRCUITS[circuit].height})),
  ...[[101,.625,.74,'feed'],[102,.905,.735,'product'],[103,.905,.575,'feed'],[104,.915,.175,'product'],[107,.21,.625,'feed',110],[106,.555,.725,'feed',109],[108,.22,.07,'product',111],[112,.49,.145,'product'],[113,.665,.145,'product']].map(([id,u,v,circuit,totalId])=>item(`I${id}`,id<105?`PT${id-100}`:({106:'電磁流量計',107:'原水超音波流量計',108:'產水超音波流量計',112:'導電度計',113:'濁度計'}[id]),'instrument',u,v,circuit,[id,...(totalId?[totalId]:[])],{tag:id<105?`PT${id-100}`:({106:'FIT-01',107:'FIT-02',108:'FIT-03',112:'EC-01',113:'TU-01'}[id]),signalId:id,pipeHeight:CIRCUITS[circuit].height})),
]
// Distinct circuit elevations preserve crossings as overpasses, not junctions.
const line=(id,circuit,points,extra={})=>({id,circuit,points:points.map(([u,v,h])=>world(u,v,h??CIRCUITS[circuit].height)),...extra})
export const PIPELINES=[
  line('feed-in','feed',[[.12,.625],[.28,.625],[.36,.625],[.36,.69],[.36,.69,4.2],[.36,.79,4.2]],{gates:[124],flowId:107}),
  line('pump-a','feed',[[.395,.79],[.415,.79],[.415,.745],[.48,.745],[.54,.745]],{gates:[125],anyPumps:[143],flowId:106}),
  line('pump-b','feed',[[.395,.79],[.415,.79],[.415,.855],[.48,.855],[.54,.855],[.54,.745]],{gates:[125],anyPumps:[144],flowId:106}),
  line('filter-feed','feed',[[.54,.745],[.625,.745],[.65,.745],[.65,.92],[.755,.92],[.755,.725],[.82,.725],[.96,.725],[.96,.60],[.94,.60],[.94,.60,.55],[.94,.585,.55]],{gates:[125],anyPumps:[143,144],flowId:106}),
  line('product-out','product',[[.94,.2525,4.45],[.96,.2525,4.45],[.96,.23,4.45],[.96,.23],[.9,.23],[.9,.325],[.82,.325],[.72,.325],[.72,.2],[.035,.2]],{gates:[126],flowId:108}),
  line('product-tank','product',[[.175,.2],[.175,.24],[.175,.30],[.175,.30,4.2],[.16,.30,4.2],[.16,.40,4.2]],{gates:[126,132],flowId:108}),
  line('product-quality','product',[[.72,.2],[.72,.145],[.49,.145],[.49,.07],[.22,.07],[.035,.07]],{gates:[126],flowId:108}),
  line('quality-turbidity','product',[[.665,.145],[.72,.145]],{gates:[126],flowId:108}),
  line('return-upper','drain',[[.035,.07],[.035,.08],[.035,.2]],{gates:[137],flowId:108}),
  line('return-store','drain',[[.035,.2],[.035,.24],[.035,.31]],{gates:[133],flowId:108}),
  line('raw-return','drain',[[.035,.07],[.74,.07],[.74,.625],[.39,.625],[.39,.79],[.39,.79,4.2],[.36,.79,4.2]],{gates:[137],flowId:108}),
  line('backwash-a','backwash',[[.2,.40],[.215,.40],[.215,.345],[.245,.345],[.29,.345]],{anyPumps:[145],gates:[128]}),
  line('backwash-b','backwash',[[.2,.40],[.215,.40],[.215,.495],[.245,.495],[.29,.495],[.29,.345]],{anyPumps:[146],gates:[128]}),
  line('backwash-header','backwash',[[.29,.345],[.29,.24],[.70,.24],[.70,.405],[.82,.405],[.865,.405],[.865,.325],[.9,.325]],{anyPumps:[145,146],gates:[128]}),
  line('backwash-return','backwash',[[.74,.625],[.82,.625],[.865,.625],[.865,.725],[.96,.725]],{gates:[130],anyPumps:[145,146]}),
  line('dose-a','chemical',[[.38,.425],[.40,.425],[.40,.395],[.435,.395],[.465,.395]],{anyPumps:[147],gates:[131]}),
  line('dose-b','chemical',[[.38,.425],[.40,.425],[.40,.49],[.435,.49],[.465,.49],[.465,.395]],{anyPumps:[148],gates:[131]}),
  line('dose-injection','chemical',[[.465,.395],[.465,.32],[.465,.24],[.70,.24]],{anyPumps:[147,148],gates:[131]}),
  line('cip-pump','chemical',[[.625,.295],[.60,.295],[.60,.40],[.555,.40],[.50,.40],[.50,.27],[.77,.27]],{anyPumps:[149]}),
  line('cip-feed','chemical',[[.77,.27],[.77,.24],[.82,.24],[.915,.24],[.915,.23],[.96,.23]],{anyPumps:[149],gates:[127]}),
  line('cip-upper','chemical',[[.77,.27],[.77,.14],[.82,.14],[.865,.14]],{anyPumps:[149],gates:[129]}),
  line('cip-return','chemical',[[.865,.14],[.865,.505],[.82,.505],[.50,.505],[.50,.40],[.555,.40]],{anyPumps:[149],gates:[135]}),
  line('drain-top','drain',[[.865,.14],[.865,.04],[.82,.04],[.77,.04],[.77,0]],{gates:[136]}),
  line('drain-bottom','drain',[[.50,.505],[.70,.505],[.70,.835],[.82,.835],[.865,.835],[.865,.725]],{gates:[134]}),
]
export const equipmentById=Object.fromEntries(EQUIPMENT.map(e=>[e.id,e]))
