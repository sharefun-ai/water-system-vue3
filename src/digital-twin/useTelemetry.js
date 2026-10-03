import {ref,computed,onMounted,onBeforeUnmount} from 'vue'
import { DATA_API_ROOT, dataSource, requireDataSource } from '../data/dataSource.js'
import {ANALOG,SIGNALS,normalizePayload,createDemoPayload,isWarning} from './telemetry'
export function useTelemetry(){
  const defaultApi=DATA_API_ROOT+'/data_third.php'
  const mode=ref('api'),endpoint=ref(import.meta.env.VITE_SCADA_API||defaultApi)
  const values=ref(Object.fromEntries(SIGNALS.map(s=>[s.id,null]))),timestamps=ref({}),history=ref({}),receivedAt=ref(null),clock=ref(Date.now()),error=ref(''),loading=ref(false)
  let interval,clockInterval,controller,generation=0,destroyed=false
  const stale=computed(()=>mode.value==='api'&&(!receivedAt.value||clock.value-receivedAt.value>20000))
  const missing=computed(()=>SIGNALS.filter(s=>values.value[s.id]===null).length)
  const warnings=computed(()=>ANALOG.filter(s=>isWarning(s.id,values.value[s.id])))
  const oldMeasurements=computed(()=>mode.value==='api'&&Object.values(timestamps.value).some(t=>clock.value-t>120000))
  const usable=computed(()=>mode.value==='demo'||(!stale.value&&!oldMeasurements.value&&!error.value))
  const status=computed(()=>mode.value==='demo'?'參考數據':loading.value&&!receivedAt.value?'連線中':error.value?(dataSource.unavailable&&endpoint.value===defaultApi?'資料服務未連接':'連線失敗'):stale.value?'資料逾時':oldMeasurements.value?'歷史數據':'API 已連線')
  function apply(payload){const parsed=normalizePayload(payload);values.value=parsed.values;timestamps.value=parsed.timestamps;receivedAt.value=Date.now();for(const s of ANALOG)history.value[s.id]=[...(history.value[s.id]||[]),parsed.values[s.id]].slice(-36)}
  async function refresh(){
    if(destroyed||loading.value)return
    if(mode.value==='demo'){if(!receivedAt.value)apply(createDemoPayload(0));error.value='';return}
    const epoch=generation;controller=new AbortController();const activeController=controller,timeout=setTimeout(()=>activeController.abort(),15000);loading.value=true
    try{if(endpoint.value===defaultApi)requireDataSource();const response=await fetch(endpoint.value,{signal:activeController.signal,cache:'no-store',credentials:'same-origin'});if(!response.ok)throw new Error(`HTTP ${response.status}`);const payload=await response.json();if(epoch!==generation||destroyed)return;apply(payload);error.value=''}
    catch(e){if(epoch===generation&&!destroyed)error.value=e.name==='AbortError'?'API 回應逾時':`無法讀取數據：${e.message}`}
    finally{clearTimeout(timeout);if(epoch===generation)loading.value=false}
  }
  function setSource(next,url=endpoint.value){generation++;controller?.abort();loading.value=false;mode.value=next;endpoint.value=url;error.value='';receivedAt.value=null;history.value={};timestamps.value={};values.value=Object.fromEntries(SIGNALS.map(s=>[s.id,null]));refresh()}
  onMounted(()=>{refresh();interval=setInterval(refresh,3000);clockInterval=setInterval(()=>clock.value=Date.now(),1000)})
  onBeforeUnmount(()=>{destroyed=true;generation++;controller?.abort();clearInterval(interval);clearInterval(clockInterval)})
  return {mode,endpoint,values,timestamps,history,receivedAt,error,loading,stale,missing,warnings,oldMeasurements,usable,status,setSource,refresh}
}
