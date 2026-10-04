import {EQUIPMENT,PIPELINES,CIRCUITS} from './topology.js'

// Independent 2D layout; process connections and signals remain from topology.js.
export const DIAGRAM={width:2000,height:1160}
const positions={
  T01:[700,880],T02:[260,465],NAOCL:[780,495],T03:[1215,410],UF:[1810,515],
  143:[960,800],144:[960,950],145:[515,420],146:[515,565],
  147:[960,420],148:[960,565],149:[1200,585],
  124:[500,740],125:[1490,760],126:[1490,420],127:[1490,330],
  128:[1490,510],129:[1490,220],130:[1490,850],131:[1080,320],
  132:[260,310],133:[100,310],134:[1490,1010],135:[1490,670],
  136:[1490,120],137:[100,165],
  I101:[1180,760],I102:[1730,760],I103:[1835,760],I104:[1810,350],
  I106:[1365,1010],I107:[350,740],I108:[600,90],I112:[900,180],I113:[1160,180],
}
export const deviceBounds=e=>e.type==='tank'?[-92,-115,184,299]:e.type==='chemicalTank'?[-62,-75,124,167]:e.type==='membrane'?[-91,-155,182,341]:e.type==='pump'?[-64,-59,128,130]:e.vertical?[-82,-31,148,62]:[-35,-61,134,75]
export const diagramEquipment=EQUIPMENT.map(e=>({...e,point:positions[e.id],mirrored:e.type==='pump'&&e.id!=='149',dialRotation:[101,102,103,107,108].includes(e.signalId)?180:e.signalId===106?-90:0}))
export const diagramById=Object.fromEntries(diagramEquipment.map(e=>[e.id,e]))
// Local ports are shared by physical SVG flanges and pipe endpoints.
export function localPorts(e){
  if(e.type==='tank')return {inlet:[-20,-96],...(e.id==='T01'?{return:[20,-96]}:{}),outlet:[60,82]}
  if(e.type==='chemicalTank')return {outlet:[45,25]}
  if(e.type==='pump')return {inlet:[e.mirrored?-58:58,0],outlet:[e.mirrored?-32:32,-38]}
  if(e.type==='membrane')return {product:[0,-136],feed:[0,146]}
  if(e.type==='valve')return e.vertical?{inlet:[0,-26],outlet:[0,26]}:{inlet:[-26,0],outlet:[26,0]}
  return {}
}
export const port=(id,name)=>{const e=diagramById[id],p=localPorts(e)[name];return [e.point[0]+p[0],e.point[1]+p[1]]}
const P=port
// Separate suction/discharge runs terminate at the casing, not inside the motor.
const routes={
  'feed-in':[[[150,740],[500,740],[680,740],P('T01','inlet')]],
  'pump-a':[[P('T01','outlet'),[815,962],[815,800],P('143','inlet')],[P('143','outlet'),[928,725],[1045,725],[1045,760],[1080,760]]],
  'pump-b':[[P('T01','outlet'),[815,962],[815,950],P('144','inlet')],[P('144','outlet'),[928,885],[1080,885],[1080,760]]],
  'filter-feed':[[[1080,760],[1365,760],[1365,1010],[1365,1060],[1420,1060],[1420,760],[1640,760],[1730,760],[1835,760],[1835,661],P('UF','feed')]],
  'product-out':[[P('UF','product'),[1810,350],[1710,350],[1710,420],[1670,420],[1490,420],[1290,420],[1290,250],[260,250],[100,250]]],
  'product-tank':[[[260,250],[260,310],[260,340],[240,340],P('T02','inlet')]],
  'product-quality':[[[1290,250],[1290,180],[1160,180],[900,180],[800,180],[800,90],[600,90],[100,90]]],
  'quality-turbidity':[[[1160,180],[1290,180]]],
  'return-upper':[[[100,90],[100,165],[100,250]]],
  'return-store':[[[100,250],[100,310],[100,370]]],
  'raw-return':[[[100,90],[100,30],[1365,30],[1365,705],[720,705],P('T01','return')]],
  'backwash-a':[[P('T02','outlet'),[395,547],[395,420],P('145','inlet')],[P('145','outlet'),[483,340],[600,340],[600,360],[625,360]]],
  'backwash-b':[[P('T02','outlet'),[395,547],[395,565],P('146','inlet')],[P('146','outlet'),[483,500],[625,500],[625,360]]],
  'backwash-header':[[[625,360],[625,285],[1325,285],[1325,510],[1490,510],[1670,510],[1670,420],[1710,420]]],
  'backwash-return':[[[1365,705],[1390,705],[1390,850],[1490,850],[1640,850],[1640,760],[1835,760]]],
  'dose-a':[[P('NAOCL','outlet'),[855,520],[855,420],P('147','inlet')],[P('147','outlet'),[928,340],[1045,340],[1045,360],[1080,360]]],
  'dose-b':[[P('NAOCL','outlet'),[855,520],[855,565],P('148','inlet')],[P('148','outlet'),[928,500],[1080,500],[1080,360]]],
  'dose-injection':[[[1080,360],[1080,320],[1080,285],[1325,285]]],
  'cip-pump':[[P('T03','outlet'),[1275,435],[1275,585],P('149','inlet')],[P('149','outlet'),[1232,515],[1120,515],[1120,380],[1160,380],[1160,320],[1390,320]]],
  'cip-feed':[[[1390,320],[1390,330],[1490,330],[1710,330],[1710,350]]],
  'cip-upper':[[[1390,320],[1390,220],[1490,220],[1620,220]]],
  'cip-return':[[[1620,220],[1620,670],[1490,670],[1120,670],[1120,515]]],
  'drain-top':[[[1620,220],[1620,120],[1490,120],[1390,120],[1390,65]]],
  'drain-bottom':[[[1120,670],[1120,1010],[1490,1010],[1640,1010],[1640,760]]],
}
export const diagramLines=PIPELINES.map(line=>({...line,routes:routes[line.id],points:routes[line.id][0]})).sort((a,b)=>CIRCUITS[a.circuit].height-CIRCUITS[b.circuit].height)
const same=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<.01
export const segments=line=>(line.routes||[line.points]).flatMap(points=>points.slice(1).map((b,i)=>({a:points[i],b})))
const onSegment=(p,{a,b})=>Math.abs((p[0]-a[0])*(b[1]-a[1])-(p[1]-a[1])*(b[0]-a[0]))<.01&&p[0]>=Math.min(a[0],b[0])&&p[0]<=Math.max(a[0],b[0])&&p[1]>=Math.min(a[1],b[1])&&p[1]<=Math.max(a[1],b[1])
// Only shared vertices are joints; incidental crossings never are.
export const junctions=[]
const nodes=new Map()
for(const line of diagramLines)for(const p of line.routes.flat()){
  const key=p.join(',');const node=nodes.get(key)||{point:p,ids:new Set(),color:CIRCUITS[line.circuit].color};node.ids.add(line.id);nodes.set(key,node)
}
for(const node of nodes.values())if(node.ids.size>1)junctions.push(node)
const jointAt=p=>junctions.some(j=>same(j.point,p))
export function bridgePath(line,others){
  return (line.routes||[line.points]).map(points=>{
    let d='M '+points[0].join(' ')
    for(const {a,b} of segments({points})){
      const horizontal=Math.abs(a[1]-b[1])<.01,axis=horizontal?0:1,other=1-axis,dir=Math.sign(b[axis]-a[axis]),crossings=[]
      for(const candidate of others){
        const level=CIRCUITS[candidate.circuit].height-CIRCUITS[line.circuit].height
        if(candidate.id===line.id||level>0||(level===0&&candidate.id.localeCompare(line.id)>=0))continue
        for(const s of segments(candidate)){
          if((Math.abs(s.a[1]-s.b[1])<.01)===horizontal)continue
          const cross=[0,0];cross[axis]=s.a[axis];cross[other]=a[other]
          const interior=cross[axis]>Math.min(a[axis],b[axis])+10&&cross[axis]<Math.max(a[axis],b[axis])-10&&cross[other]>Math.min(s.a[other],s.b[other])+10&&cross[other]<Math.max(s.a[other],s.b[other])-10
          if(interior&&!jointAt(cross)&&!crossings.some(p=>same(p,cross)))crossings.push(cross)
        }
      }
      crossings.sort((p,q)=>(p[axis]-q[axis])*dir)
      let previous=-Infinity
      for(const p of crossings){
        if(Math.abs(p[axis]-a[axis])<previous+24)continue
        previous=Math.abs(p[axis]-a[axis])
        const before=[...p],after=[...p],c1=[...p],c2=[...p];before[axis]-=9*dir;after[axis]+=9*dir;c1[axis]-=9*dir;c2[axis]+=9*dir;c1[other]-=12;c2[other]-=12
        d+=' L '+before.join(' ')+' C '+c1.join(' ')+' '+c2.join(' ')+' '+after.join(' ')
      }
      d+=' L '+b.join(' ')
    }
    return d
  }).join(' ')
}
export const renderedLines=diagramLines.map(line=>({...line,d:bridgePath(line,diagramLines)}))
export const meterPositions={I101:[1170,840],I102:[1660,940],I103:[1770,835],I104:[1720,190],I106:[920,1040],I107:[250,815],I108:[385,138],I112:[820,40],I113:[1080,40]}
export const meterHeight=e=>e.signals.length>1?92:68
export function meterLeader(e,height=meterHeight(e)){
  const angle=e.dialRotation*Math.PI/180,anchor=[e.point[0]+50*Math.sin(angle),e.point[1]-50*Math.cos(angle)],p=meterPositions[e.id]
  const target=[Math.max(p[0],Math.min(p[0]+178,anchor[0])),Math.max(p[1],Math.min(p[1]+height,anchor[1]))]
  return 'M '+anchor.join(' ')+' L '+target.join(' ')
}
export const portConnections=diagramEquipment.flatMap(e=>Object.entries(localPorts(e)).map(([name,offset])=>({id:e.id,name,offset,point:P(e.id,name)})))
export const pointOnLine=(point,line)=>segments(line).some(s=>onSegment(point,s))
