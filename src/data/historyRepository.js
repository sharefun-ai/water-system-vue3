import { validRecords } from './waterRecords.js'
import { requireDataSource } from './dataSource.js'

const stores = new Map()
export function getHistoryRepository(apiRoot) {
  if (stores.has(apiRoot)) return stores.get(apiRoot)
  const cache = new Map()
  async function load(kind, period, { signal, force = false } = {}) {
    requireDataSource()
    const key = `${kind}/${period}`, snapshot = cache.get(key)
    signal?.throwIfAborted()
    if (!force && snapshot && Date.now()-snapshot.receivedAt < 60_000) return snapshot
    const controller = new AbortController(), abort = () => controller.abort()
    signal?.addEventListener('abort',abort,{once:true}); const timer=setTimeout(abort,15000)
    try {
      const response=await fetch(`${apiRoot}/${kind==='day'?'alert_3.php':'search_print_data_3.php'}`,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(kind==='day'?{today_date:period}:{year:period.slice(0,4),month:String(Number(period.slice(5,7)))}),signal:controller.signal})
      if(!response.ok)throw new Error(`HTTP ${response.status}`)
      const rows=await response.json(); controller.signal.throwIfAborted(); validRecords(rows)
      const result={rows,receivedAt:Date.now()}; cache.delete(key);cache.set(key,result)
      // Month responses contain raw samples; keep the cache small and memory-only.
      while(cache.size>4)cache.delete(cache.keys().next().value)
      return result
    }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
  }
  const repository={loadDay:(date,options)=>load('day',date,options),loadMonth:(month,options)=>load('month',month,options)}
  stores.set(apiRoot,repository);return repository
}
