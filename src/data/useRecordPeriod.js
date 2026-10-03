import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { taiwanDate } from './trendData.js'
import { getTrendRepository } from './trendRepository.js'
import { getHistoryRepository } from './historyRepository.js'
import { validDate } from './waterRecords.js'
import { DATA_API_ROOT } from './dataSource.js'

export function useRecordPeriod(kind) {
  const route=useRoute(),router=useRouter(),today=taiwanDate(),key=kind==='day'?'date':'month'
  const apiRoot=DATA_API_ROOT
  const dates=getTrendRepository(apiRoot),repository=getHistoryRepository(apiRoot)
  const latestDate=ref(dates.getLatestDate()),max=kind==='day'?today:today.slice(0,7)
  const query=route.query[key],valid=typeof query==='string'&&(kind==='day'?validDate(query):/^\d{4}-(0[1-9]|1[0-2])$/.test(query))&&query<=max
  const period=ref(valid?query:latestDate.value?(kind==='day'?latestDate.value:latestDate.value.slice(0,7)):max)
  const rows=ref([]),loading=ref(true),error=ref(''),receivedAt=ref(''),slow=ref(false)
  const historical=computed(()=>period.value<max)
  let initialized=false,disposed=false,request=0,revision=0,last='',controller,metadata,slowTimer,refreshTimer
  async function refresh({force=true}={}) {
    if(!initialized)return
    const number=++request,value=period.value
    controller?.abort();controller=new AbortController();clearTimeout(slowTimer);slow.value=false
    if(last!==value){rows.value=[];receivedAt.value=''}last=value
    loading.value=true;error.value='';slowTimer=setTimeout(()=>{slow.value=true},6000)
    try {
      const result=await (kind==='day'?repository.loadDay(value,{force,signal:controller.signal}):repository.loadMonth(value,{force,signal:controller.signal}))
      if(disposed||number!==request)return
      rows.value=result.rows;receivedAt.value=new Date(result.receivedAt).toLocaleTimeString('en-GB',{hour12:false})
    }catch(problem){if(!disposed&&number===request)error.value=problem.name==='AbortError'?'讀取逾時，請稍後重新整理。':`資料暫時無法讀取：${problem.message}`}
    finally{if(number===request){clearTimeout(slowTimer);loading.value=false}}
  }
  watch(period,()=>{revision++;if(initialized){router.replace({query:{...route.query,[key]:period.value}});refresh({force:false})}})
  function setPeriod(value){if((kind==='day'?validDate(value):/^\d{4}-(0[1-9]|1[0-2])$/.test(value))&&value<=max)period.value=value}
  onMounted(async()=>{
    initialized=true;metadata=new AbortController()
    const starting=revision,needsLatest=!valid&&!latestDate.value
    if(!needsLatest){router.replace({query:{...route.query,[key]:period.value}});refresh({force:false})}
    else slowTimer=setTimeout(()=>{slow.value=true},6000)
    refreshTimer=setInterval(()=>{if(!historical.value&&!loading.value&&!document.hidden)refresh()},60000)
    try{const date=await dates.loadLatestDate({signal:metadata.signal});if(!disposed)latestDate.value=date||''}catch{/* Selected periods remain queryable. */}
    if(disposed||!needsLatest||revision!==starting)return
    const next=latestDate.value?(kind==='day'?latestDate.value:latestDate.value.slice(0,7)):max
    if(next!==period.value)period.value=next
    else{router.replace({query:{...route.query,[key]:next}});refresh({force:false})}
  })
  onBeforeUnmount(()=>{disposed=true;initialized=false;request++;controller?.abort();metadata?.abort();clearTimeout(slowTimer);clearInterval(refreshTimer)})
  return {period,latestDate,today,max,rows,loading,error,receivedAt,slow,historical,setPeriod,refresh,repository}
}
