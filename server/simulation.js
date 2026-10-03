import { ANALOG, DIGITAL } from '../src/digital-twin/telemetry.js'
import { TREND_CATEGORIES, shiftDate } from '../src/data/trendData.js'

const DAY=86400000, EPOCH=Date.parse('2020-01-01T00:00:00+08:00')
const currentDate=now=>new Date(now+8*3600000).toISOString().slice(0,10)
const round=n=>Math.round(n*100)/100
const hash=n=>{let x=n|0;x=Math.imul(x^(x>>>16),0x45d9f3b);x=Math.imul(x^(x>>>16),0x45d9f3b);return ((x^(x>>>16))>>>0)/4294967295}
function noise(t,seed){const i=Math.floor(t),f=t-i,s=f*f*(3-2*f);return (hash(i+seed*100003)*(1-s)+hash(i+1+seed*100003)*s)*2-1}
export function simulateValues(time=Date.now()) {
  const t=(time-EPOCH)/1000, load=.8+.13*Math.sin(t/53)+.05*noise(t/17,1)
  const raw=round(.95+.8*Math.sin(t/47)+.08*noise(t/23,2))
  const product=round(2.9+1.55*Math.sin(t/61+.8)+.13*noise(t/31,3))
  const backwash=Math.floor(t/24)%9===8, filtering=raw>.35&&!backwash
  const on=new Set([124,127,132,133,136,137,149])
  if(filtering){on.add(125);on.add(126);on.add(131);on.add(Math.floor(t/180)%2?144:143);on.add(Math.floor(t/180)%2?148:147)}
  if(backwash){[128,130,134,135,129].forEach(id=>on.add(id));on.add(Math.floor(t/180)%2?146:145)}
  for(const [id,level] of [[120,1.7],[121,1.35],[157,.95],[122,.55],[123,.2]])if(raw>=level)on.add(id)
  for(const [id,level] of [[138,4.3],[139,3.3],[158,2.3],[140,1.3]])if(product>=level)on.add(id)
  const values={101:filtering?6.8*load+.2:1.1,102:filtering?4.4*load+.15:.6,103:filtering?6.4*load+.3:backwash?2.3:.9,104:filtering?5.2*load+.15:backwash?1.5:.4,106:filtering?109*load:0,107:43.5*(.92+.15*Math.sin(t/43)),108:filtering?147*load:backwash?66*load:0,112:1550+95*Math.sin(t/73)+38*noise(t/26,4),113:.38+.22*Math.sin(t/59)+.12*noise(t/19,5),114:Math.max(.12,raw),115:Math.max(.5,product)}
  for(const [id,rate] of [[109,82],[110,43.5],[111,111]]) values[id]=17500+Math.max(0,t)*rate/3600+rate*53/3600*.09*(1-Math.cos(t/53))
  return {values:Object.fromEntries(Object.entries(values).map(([id,n])=>[id,round(n)])),on}
}
export function latestPayload(time=Date.now()) {
  const local=new Date(time+8*3600000),{values,on}=simulateValues(time)
  const ts={year:String(local.getUTCFullYear()),month:String(local.getUTCMonth()+1),day:String(local.getUTCDate()),hour:String(local.getUTCHours()),min:String(local.getUTCMinutes())}
  return {source:'cloud-simulation',generated_at:new Date(time).toISOString(),latest_data:ANALOG.map(s=>({element_no:String(s.id),name:s.name,value:String(values[s.id]),...ts})),check_data:DIGITAL.map(s=>({element_no:String(s.id),name:s.name,value:on.has(s.id)?'1':'0',...ts})),set_data:[]}
}
export function validDate(date,now=Date.now()) {return typeof date==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(date)&&shiftDate(date,0)===date&&date>='2020-01-01'&&date<=currentDate(now)}
function missing(date,id,hour){const day=Math.floor(Date.parse(date+'T00:00:00Z')/DAY);return (id===112&&hour>=7&&hour<=8&&day%3===1)||(id===103&&hour===15&&day%4===2)}
export function dayRecords(date,now=Date.now()) {
  if(!validDate(date,now))throw new Error('日期必須是 2020 年起至今天的有效日期')
  const start=Date.parse(date+'T00:00:00+08:00'),rows=[]
  for(let hour=0;hour<24;hour++){
    const time=Math.min(start+hour*3600000+30*60000,now)
    if(start+hour*3600000>now)break
    const {values}=simulateValues(time)
    for(const meter of ANALOG){if(missing(date,meter.id,hour))continue;rows.push({id:Math.floor(time/1000)*1000+meter.id,element_no:String(meter.id),name:meter.name,value:String(values[meter.id]),date,time:String(hour).padStart(2,'0')+':'+String(Math.floor((time-start-hour*3600000)/60000)).padStart(2,'0'),source:'cloud-simulation'})}
  }
  return rows
}
export function trendRecords(date,category,now=Date.now()) {
  const metric=TREND_CATEGORIES.find(item=>item.api===category)
  if(!metric)throw new Error('未知的測點類別')
  return dayRecords(date,now).filter(row=>metric.ids.includes(Number(row.element_no))).map(row=>({...row,time:row.time.slice(0,2)+':00'}))
}
export function monthRecords(year,month,now=Date.now()) {
  const y=String(year),m=String(month).padStart(2,'0'),period=y+'-'+m
  if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(period)||period<'2020-01'||period>currentDate(now).slice(0,7))throw new Error('月份不正確或尚未到達')
  const days=new Date(Date.UTC(Number(y),Number(m),0)).getUTCDate(),rows=[]
  for(let day=1;day<=days;day++){const date=period+'-'+String(day).padStart(2,'0');if(validDate(date,now))rows.push(...dayRecords(date,now))}
  return rows
}
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Aquatic-Data-Source':'cloud-simulation','X-Content-Type-Options':'nosniff'}
export async function handleSimulationRequest(request,endpoint,now=Date.now()) {
  const methods=endpoint==='data_third.php'?['GET']:['POST']
  if(!['data_third.php','search_chart_3.php','alert_3.php','search_print_data_3.php'].includes(endpoint))return new Response(JSON.stringify({error:'API 不存在'}),{status:404,headers})
  if(!methods.includes(request.method))return new Response(JSON.stringify({error:'請使用指定的資料讀取方法'}),{status:405,headers:{...headers,Allow:methods.join(', ')}})
  try{
    if(endpoint==='data_third.php')return new Response(JSON.stringify(latestPayload(now)),{headers})
    if(Number(request.headers.get('Content-Length')||0)>4096)return new Response(JSON.stringify({error:'請求過大'}),{status:413,headers})
    const text=await request.text();if(text.length>4096)return new Response(JSON.stringify({error:'請求過大'}),{status:413,headers})
    const body=JSON.parse(text);if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('需要 JSON 物件')
    const data=endpoint==='search_chart_3.php'?trendRecords(body.today_date,body.activeButton,now):endpoint==='alert_3.php'?dayRecords(body.today_date,now):monthRecords(body.year,body.month,now)
    return new Response(JSON.stringify(data),{headers})
  }catch(error){return new Response(JSON.stringify({error:error.message}),{status:400,headers})}
}
