// Preserve the original data_third.php element numbers and units.
export const ANALOG = [
  { id:101,name:'PT1',label:'過濾入口壓力',unit:'kg/cm²',base:7,range:1.5,limit:5,rule:'high' },
  { id:102,name:'PT2',label:'過濾出口壓力',unit:'kg/cm²',base:4.7,range:1.2,limit:5,rule:'high' },
  { id:103,name:'PT3',label:'膜組入口壓力',unit:'kg/cm²',base:7,range:1,limit:5,rule:'high' },
  { id:104,name:'PT4',label:'膜組出口壓力',unit:'kg/cm²',base:5.7,range:1.5,limit:5,rule:'high' },
  { id:106,name:'入水電磁式流量(瞬間)',label:'電磁入水流量',unit:'m³/h',base:109,range:30,limit:100,rule:'high' },
  { id:107,name:'入水超音波流量(瞬間)',label:'原水入水流量',unit:'m³/h',base:43.5,range:15,limit:100,rule:'high' },
  { id:108,name:'產水超音波流量(瞬間)',label:'UF 產水流量',unit:'m³/h',base:159,range:40,limit:100,rule:'high' },
  { id:109,name:'入水電磁式流量(累計)',label:'電磁入水累計',unit:'m³',base:17543,range:5,cumulative:true },
  { id:110,name:'入水超音波流量(累計)',label:'原水入水累計',unit:'m³',base:17559,range:5,cumulative:true },
  { id:111,name:'產水超音波流量(累計)',label:'UF 產水累計',unit:'m³',base:17490,range:5,cumulative:true },
  { id:112,name:'導電度計',label:'產水導電度',unit:'μS/cm',base:1706,range:200 },
  { id:113,name:'產水濁度',label:'產水濁度',unit:'NTU',base:3,range:2,limit:1,rule:'high' },
  { id:114,name:'原水液位',label:'T-01 原水液位',unit:'cm',base:.9,range:.8,limit:.5,rule:'low' },
  { id:115,name:'產水液位',label:'T-02 產水液位',unit:'cm',base:4,range:2,limit:.5,rule:'low' },
]
export const DIGITAL = [
  ...[[120,'原水液位HH'],[121,'原水液位H'],[122,'原水液位L'],[123,'原水液位LL'],[157,'原水液位M']].map(([id,name])=>({id,name,type:'level'})),
  ...Array.from({length:14},(_,i)=>({id:124+i,name:i===0?'SV1-1':`SV${i}`,type:'valve'})),
  ...[[138,'UF產水槽HH'],[139,'UF產水槽H'],[140,'UF產水槽L'],[158,'UF產水槽M']].map(([id,name])=>({id,name,type:'level'})),
  ...[[143,'過濾泵A'],[144,'過濾泵B'],[145,'逆洗泵A'],[146,'逆洗泵B'],[147,'NaOCI加藥機A'],[148,'NaOCI加藥機B'],[149,'藥液循環泵']].map(([id,name])=>({id,name,type:'pump'})),
]
export const SIGNALS=[...ANALOG,...DIGITAL]
export const signalById=Object.fromEntries(SIGNALS.map(s=>[s.id,s]))
export function numberOrNull(value) {
  if(value===null||value===undefined||(typeof value==='string'&&!value.trim())||typeof value==='boolean')return null
  const n=Number(value); return Number.isFinite(n)?n:null
}
export function normalizePayload(payload) {
  if(!payload||!Array.isArray(payload.latest_data)||!Array.isArray(payload.check_data))throw new Error('資料格式需包含 latest_data 與 check_data 陣列。')
  const values=Object.fromEntries(SIGNALS.map(s=>[s.id,null])),timestamps={}
  for(const [rows,type] of [[payload.latest_data,'analog'],[payload.check_data,'digital']])for(const row of rows){
    const id=Number(row.element_no)
    if(!signalById[id]||(type==='analog'&&!ANALOG.some(s=>s.id===id))||(type==='digital'&&!DIGITAL.some(s=>s.id===id)))continue
    const n=numberOrNull(row.value); values[id]=type==='digital'?(n===0||n===1?n:null):n
    if(row.year&&row.month&&row.day){const ts=new Date(Number(row.year),Number(row.month)-1,Number(row.day),Number(row.hour||0),Number(row.min||0)).getTime();if(Number.isFinite(ts))timestamps[id]=ts}
  }
  if(payload.source==='cloud-simulation'){const generated=Date.parse(payload.generated_at);if(Number.isFinite(generated))for(const id of Object.keys(values))timestamps[id]=generated}
  return {values,timestamps}
}
export function isWarning(id,value){const s=signalById[id];return value!==null&&!!s?.rule&&(s.rule==='high'?value>s.limit:value<s.limit)}
export function formatSignal(id,value){if(value===null||value===undefined)return '—';return signalById[id]?.cumulative?Math.round(value).toLocaleString('en-US'):Number(value).toFixed(1)}
export function lineIsActive(line,values){
  if(line.gates?.some(id=>values[id]!==1))return false
  if(line.anyPumps?.length&&!line.anyPumps.some(id=>values[id]===1))return false
  if(line.flowId&&!(values[line.flowId]>0))return false
  return Boolean(line.gates?.length||line.anyPumps?.length||line.flowId)
}
export const SCENARIOS=[
  {id:'baseline',label:'基準數據',description:'沿用原版數值範圍與警戒門檻'},
  {id:'backwash',label:'逆洗流程',description:'開啟逆洗泵、切換逆洗支路'},
  {id:'low-level',label:'原水低液位',description:'液位低於 0.5 cm，示範停泵'},
  {id:'high-pressure',label:'高壓警戒',description:'提升 PT1 / PT3 壓力、凸顯警戒元件'},
]
export function createDemoPayload(step=0,scenario='baseline',elapsedSeconds=0){
  const d=new Date(),ts={year:String(d.getFullYear()),month:String(d.getMonth()+1),day:String(d.getDate()),hour:String(d.getHours()),min:String(d.getMinutes())}
  const values=Object.fromEntries(ANALOG.map((s,i)=>[s.id,s.cumulative?s.base+elapsedSeconds*({109:109,110:43.5,111:159}[s.id]/3600):s.base+Math.sin(step*.29+i)*s.range*.12]))
  const on=new Set([124,125,126,132,133,137,143,147,122,123,157,140,158])
  if(scenario==='backwash'){[125,126,143,147].forEach(id=>on.delete(id));[128,130,134,145,131,148].forEach(id=>on.add(id));values[106]=0;values[108]=82+Math.sin(step*.3)*8}
  if(scenario==='low-level'){values[114]=.22+Math.sin(step*.4)*.035;[143,144,122,157].forEach(id=>on.delete(id));values[106]=0}
  if(scenario==='high-pressure'){values[101]=9.4+Math.sin(step*.3)*.2;values[103]=8.8+Math.sin(step*.2)*.2}
  return {latest_data:ANALOG.map(s=>({element_no:String(s.id),name:s.name,value:String(values[s.id]),...ts})),check_data:DIGITAL.map(s=>({element_no:String(s.id),name:s.name,value:on.has(s.id)?'1':'0',...ts}))}
}
