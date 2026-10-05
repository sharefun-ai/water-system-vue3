<script setup>
import { ref, computed, inject, watch, onBeforeUnmount, nextTick } from 'vue'
import TwinIcon from '../digital-twin/TwinIcon.vue'
import WaterLoading from '../data/WaterLoading.vue'
import RecordPeriod from '../data/RecordPeriod.vue'
import { useRecordPeriod } from '../data/useRecordPeriod.js'
import { REPORT_GROUPS, RECORD_METERS, dailyReport, hourlyReport, monthlyCoverage, monthDays, rawReportRows, validDate, toCsv } from '../data/waterRecords.js'
import { formatTrendValue as fmt } from '../data/trendData.js'
import '../data/trend.css'
import '../data/monitor.css'

const {period,latestDate,today,max,rows,loading,error,receivedAt,slow,historical,setPeriod,refresh,repository}=useRecordPeriod('month')
const active=ref('cumulativeFlow'),group=computed(()=>REPORT_GROUPS.find(g=>g.key===active.value)),meters=computed(()=>group.value.ids.map(id=>RECORD_METERS.find(m=>m.id===id)))
const report=computed(()=>dailyReport(rows.value,period.value,group.value)),coverage=computed(()=>monthlyCoverage(rows.value,period.value))
const unavailable=computed(()=>!!error.value&&!rows.value.length)
const initial=computed(()=>loading.value&&!rows.value.length),populated=computed(()=>report.value.filter(r=>r.values.some(v=>v!==null)))
const last=computed(()=>populated.value.at(-1)),showEmpty=ref(true),tableRows=computed(()=>showEmpty.value?report.value:populated.value)
const detail=ref(''),dialog=ref(null),exportOpen=ref(false),start=ref(''),end=ref(''),format=ref('xlsx'),exporting=ref(false),exportError=ref(''),exportStatus=ref(''),notice=ref('')
const hours=computed(()=>hourlyReport(rows.value,detail.value,group.value))
const header=inject('setAquaticStatus',()=>{})
watch(()=>[loading.value,error.value,historical.value,rows.value.length],()=>header({label:loading.value?'資料讀取中':error.value?'資料讀取失敗':!rows.value.length?'此月無資料':historical.value?'歷史報表':'當月報表',tone:loading.value?'neutral':error.value||historical.value||!rows.value.length?'warning':'connected'}),{immediate:true})
watch(period,()=>{detail.value='';notice.value=''})
watch(active,()=>{detail.value=''})
let exportController,previousOverflow='',returnFocus
const hasModal=computed(()=>!!detail.value||exportOpen.value)
watch(hasModal,async open=>{if(open){returnFocus=document.activeElement;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';await nextTick();dialog.value?.querySelector('button')?.focus()}else{document.body.style.overflow=previousOverflow;returnFocus?.focus?.({preventScroll:true})}})
function close(){exportController?.abort();detail.value='';exportOpen.value=false}
function keys(event){if(event.key==='Escape')close();if(event.key==='Tab'){const controls=[...dialog.value.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href]')].filter(e=>e.getClientRects().length);if(event.shiftKey&&event.target===controls[0]){event.preventDefault();controls.at(-1)?.focus()}else if(!event.shiftKey&&event.target===controls.at(-1)){event.preventDefault();controls[0]?.focus()}}}
function openExport(){const days=monthDays(period.value);start.value=days[0];end.value=days.at(-1)>today?today:days.at(-1);exportError.value='';exportStatus.value='';exportOpen.value=true}
function saveBlob(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
async function generate(){
  exportError.value=''
  if(!validDate(start.value)||!validDate(end.value)||start.value>end.value||end.value>today){exportError.value='請選擇有效日期，結束日需介於開始日與今天之間。';return}
  const months=[];let cursor=start.value.slice(0,7)
  while(cursor<=end.value.slice(0,7)){months.push(cursor);const [y,m]=cursor.split('-').map(Number);cursor=new Date(Date.UTC(y,m,1)).toISOString().slice(0,7);if(months.length>12){exportError.value='單次匯出請選擇 12 個月以內的範圍。';return}}
  exporting.value=true;exportController=new AbortController()
  try{
    const samples=[]
    for(let i=0;i<months.length;i++){exportStatus.value=`正在讀取 ${months[i]} · ${i+1} / ${months.length} 月`;const result=months[i]===period.value&&rows.value.length?{rows:rows.value}:await repository.loadMonth(months[i],{signal:exportController.signal});samples.push(...result.rows)}
    exportController.signal.throwIfAborted();exportStatus.value='正在整理量測記錄…'
    const name=`AQUATEC_量測報表_${start.value}_${end.value}`
    if(format.value==='csv')saveBlob(new Blob([toCsv(rawReportRows(samples,start.value,end.value,group.value))],{type:'text/csv;charset=utf-8'}),`${name}_${group.value.title}.csv`)
    else{
      const XLSX=await import('xlsx');exportController.signal.throwIfAborted();const book=XLSX.utils.book_new()
      for(const g of (format.value==='flatxlsx'?[{title:'量測記錄',ids:REPORT_GROUPS.flatMap(item=>item.ids)}]:REPORT_GROUPS)){const records=rawReportRows(samples,start.value,end.value,g);const sheet=XLSX.utils.aoa_to_sheet(records);sheet['!cols']=[{wch:14},{wch:10},...g.ids.map(()=>({wch:29}))];XLSX.utils.book_append_sheet(book,sheet,g.title)}
      const bytes=XLSX.write(book,{bookType:'xlsx',type:'array'});saveBlob(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`${name}.xlsx`)
    }
    notice.value='報表已產生，已送出下載。';exportOpen.value=false
  }catch(problem){if(problem.name!=='AbortError')exportError.value=`無法產生報表：${problem.message}`}
  finally{exporting.value=false;exportStatus.value=''}
}
function spark(index){const vals=report.value.map(r=>r.values[index]),finite=vals.filter(v=>v!==null);if(!finite.length)return '';const low=Math.min(...finite),high=Math.max(...finite);return vals.map((v,i)=>v===null?null:`${(i/(vals.length-1)*220).toFixed(1)},${(38-(high === low ? .5 : (v-low)/(high-low))*28).toFixed(1)}`).map((p,i)=>p?`${i===0||!vals[i-1]&&vals[i-1]!==0?'M':'L'}${p}`:'').join(' ')}
onBeforeUnmount(()=>{exportController?.abort();if(hasModal.value)document.body.style.overflow=previousOverflow})
</script>

<template>
  <div class="trend-page monitor-page report-page"><div class="trend-content">
    <header class="trend-hero"><div><p class="trend-eyebrow"><span/> WATER INTELLIGENCE / OPERATIONS REPORT</p><h1>運行報表<span>把水的歷程，整理成可追溯的記錄</span></h1><p class="trend-intro">月度摘要、逐日讀值與原始量測，讓製程變化有據可查。</p></div><RecordPeriod kind="month" :model-value="period" :max="max" :latest="latestDate" @update:model-value="setPeriod"/></header>
    <nav class="trend-categories" aria-label="報表類別"><button v-for="item in REPORT_GROUPS" :key="item.key" :class="{'is-active':active===item.key}" :aria-pressed="active===item.key" @click="active=item.key"><TwinIcon :name="item.icon" :size="17"/>{{item.title}}</button></nav>
    <div class="monitor-context"><span><i class="monitor-dot"/>{{period.replace('-',' / ')}} · {{historical?'歷史報表':'當月報表'}}</span><span>{{group.note}} · 缺測值保留空白</span></div>
    <section class="trend-stats" aria-label="月度記錄摘要" :aria-busy="loading">
      <article class="trend-stat is-primary"><div class="stat-top"><span>{{meters[0].tag}} 末筆日統計</span><TwinIcon name="waves" :size="18"/></div><div v-if="initial" class="stat-skeleton" aria-hidden="true"><i/><i/></div><div v-else class="stat-number" :class="{'has-long-reading':fmt(last?.values[0]).length>8}"><strong>{{fmt(last?.values[0])}}</strong><span>{{meters[0].unit}}</span></div><p>{{last?`${last.period} · ${group.note}`:'等待有效記錄'}}</p></article>
      <article class="trend-stat"><div class="stat-top"><span>有資料天數</span><TwinIcon name="calendar" :size="18"/></div><div v-if="initial" class="stat-skeleton" aria-hidden="true"><i/><i/></div><div v-else class="stat-number"><strong>{{unavailable?'—':populated.length}}</strong><span>/ {{report.length}} 天</span></div><p>所選類別至少一個有效測點</p></article>
      <article class="trend-stat"><div class="stat-top"><span>全測點記錄完整率</span><TwinIcon name="check" :size="18"/></div><div v-if="initial" class="stat-skeleton" aria-hidden="true"><i/><i/></div><div v-else class="stat-number"><strong>{{unavailable||coverage.integrity===null?'—':coverage.integrity.toFixed(1)}}</strong><span>%</span></div><p>14 個測點 · 逐時計算</p></article>
      <article class="trend-stat"><div class="stat-top"><span>原始量測記錄</span><TwinIcon name="report" :size="18"/></div><div v-if="initial" class="stat-skeleton" aria-hidden="true"><i/><i/></div><div v-else class="stat-number"><strong>{{unavailable?'—':coverage.rawCount.toLocaleString()}}</strong><span>筆</span></div><p>本月全部有效量測樣本</p></article>
    </section>
    <p v-if="error" class="monitor-error" role="alert">{{error}} <button @click="refresh()">重新讀取</button></p><p v-if="notice" class="monitor-notice" role="status"><TwinIcon name="check" :size="16"/>{{notice}}</p>
    <section class="report-highlights" :style="{'--columns':meters.length}" aria-label="各測點月度概覽"><article v-for="(meter,index) in meters" :key="meter.id" class="report-highlight"><div><b>{{meter.tag}}</b><span>{{meter.unit}}</span></div><h2>{{meter.title}}</h2><svg v-if="!initial" viewBox="0 0 220 48" preserveAspectRatio="none" aria-hidden="true"><path :d="spark(index)" fill="none" stroke="currentColor" stroke-width="1.8"/></svg><div v-else class="stream-skeleton"/><p>{{group.note}} <span>{{populated.length?`${populated.length} 天有記錄`:'尚無資料'}}</span></p></article></section>
    <section class="monitor-main-panel report-table-panel"><header class="panel-title"><div><p class="trend-eyebrow">DAILY REGISTER</p><h2>{{group.title}} · 每日紀錄</h2><p class="panel-description">點選日期，查看該日的逐時明細。</p></div><div class="report-table-actions"><button class="monitor-export" :disabled="loading||!rows.length||!!error" @click="openExport"><TwinIcon name="download" :size="16"/>匯出報表</button><button class="monitor-refresh" :disabled="loading" aria-label="重新整理月報表" @click="refresh()"><TwinIcon name="reset" :size="18" :class="{'is-spinning':loading}"/></button></div></header><div class="report-table-toolbar"><span>{{populated.length}} 天有記錄 · {{group.note}}</span><label><input type="checkbox" v-model="showEmpty"/>顯示無資料日期</label></div>
      <div class="report-data-stage" :aria-busy="loading"><div v-if="unavailable" class="monitor-empty"><TwinIcon name="alarm" :size="30"/><h3>資料尚未成功讀取</h3><p>請重新讀取月度記錄。</p></div><WaterLoading v-if="initial" title="正在整理月度報表" :detail="`${period} · 量測記錄`" :slow="slow"/><WaterLoading v-else-if="loading" title="正在更新報表" compact/><div v-if="!initial&&!unavailable" class="report-table-scroll"><table class="report-table"><caption class="sr-only">{{period}} {{group.title}}，{{group.note}}</caption><thead><tr><th scope="col">日期</th><th v-for="meter in meters" :key="meter.id" scope="col"><b>{{meter.tag}}</b><span>{{meter.title}}</span><small>{{meter.unit}}</small></th><th scope="col">記錄</th></tr></thead><tbody><tr v-for="row in tableRows" :key="row.period" :class="{'row-no-data':!row.values.some(v=>v!==null)}"><th scope="row"><button :disabled="!row.values.some(v=>v!==null)" @click="detail=row.period">{{row.period.slice(5)}}<small>{{['日','一','二','三','四','五','六'][new Date(`${row.period}T00:00:00Z`).getUTCDay()]}}</small><TwinIcon name="chevron" :size="13"/></button></th><td v-for="(value,index) in row.values" :key="index">{{fmt(value)}}</td><td><span class="record-state" :class="{'has-records':row.values.some(v=>v!==null)}">{{row.values.some(v=>v!==null)?`${row.counts.reduce((a,b)=>a+b,0)} 筆`:'無資料'}}</span></td></tr></tbody></table><div v-if="!tableRows.length" class="monitor-empty"><TwinIcon name="report" :size="30"/><h3>本月沒有有效記錄</h3><p>可切換至最新資料月。</p></div></div></div><footer class="trend-chart-footer"><span><TwinIcon name="info" :size="13"/>累計為每日末筆，其餘為有效原始樣本平均；不是累計讀值加總。</span><span>{{receivedAt?`資料讀取 ${receivedAt}`:'等待資料'}}</span></footer></section>
    <footer class="trend-page-footer"><span><TwinIcon name="drop" :size="13"/>AQUATEC · PROCESS INTELLIGENCE</span><span>報表依既有量測記錄生成</span></footer>
  </div></div>
  <Teleport to="body"><div v-if="hasModal" class="aquatic-modal-backdrop" @click.self="close"><section ref="dialog" class="aquatic-modal" role="dialog" aria-modal="true" :aria-label="exportOpen?'匯出量測報表':`${detail} 逐時明細`" @keydown="keys"><header class="panel-title"><div><p class="trend-eyebrow">{{exportOpen?'EXPORT REGISTER':'HOURLY REGISTER'}}</p><h2>{{exportOpen?'匯出量測報表':`${detail} · ${group.title}`}}</h2><p class="panel-description">{{exportOpen?'選擇日期與格式，匯出實際量測樣本。':group.key==='cumulativeFlow'?'每小時末筆讀值':'每小時有效原始樣本平均'}}</p></div><button class="modal-close" aria-label="關閉報表視窗" @click="close"><TwinIcon name="close" :size="20"/></button></header>
    <div v-if="exportOpen" class="export-content"><div class="export-dates"><label>開始日期<input v-model="start" type="date" :max="today" :disabled="exporting"/></label><label>結束日期<input v-model="end" type="date" :min="start" :max="today" :disabled="exporting"/></label></div><div class="export-formats"><label :class="{'is-chosen':format==='xlsx'}"><input v-model="format" type="radio" value="xlsx" :disabled="exporting"/><TwinIcon name="layers" :size="20"/><span><b>Excel 工作簿</b><small>四個類別分頁，保留原始樣本</small></span></label><label :class="{'is-chosen':format==='flatxlsx'}"><input v-model="format" type="radio" value="flatxlsx" :disabled="exporting"/><TwinIcon name="report" :size="20"/><span><b>Excel · 單一工作表</b><small>14 個測點合併於同一張工作表</small></span></label><label :class="{'is-chosen':format==='csv'}"><input v-model="format" type="radio" value="csv" :disabled="exporting"/><TwinIcon name="report" :size="20"/><span><b>CSV · {{group.title}}</b><small>目前類別的原始樣本</small></span></label></div><p class="export-note">缺測值留空，零值保留。單次範圍最多 12 個月。</p><p v-if="exportError" class="monitor-error" role="alert">{{exportError}}</p><p v-if="exporting" class="export-progress" role="status"><TwinIcon name="waves" :size="16"/>{{exportStatus}}</p><button class="monitor-export export-generate" :disabled="exporting" @click="generate"><TwinIcon :name="exporting?'waves':'download'" :size="17"/>{{exporting?'正在產生報表…':'產生並下載'}}</button></div>
    <div v-else class="modal-table-scroll"><table class="report-table"><thead><tr><th scope="col">時段</th><th v-for="meter in meters" :key="meter.id" scope="col"><b>{{meter.tag}}</b><span>{{meter.title}}</span><small>{{meter.unit}}</small></th></tr></thead><tbody><tr v-for="hour in hours" :key="hour.period"><th scope="row">{{hour.period}}</th><td v-for="(value,index) in hour.values" :key="index">{{fmt(value)}}</td></tr></tbody></table></div>
  </section></div></Teleport>
</template>
