<script setup>
import { computed, inject, ref, watch } from 'vue'
import TwinIcon from '../digital-twin/TwinIcon.vue'
import WaterLoading from '../data/WaterLoading.vue'
import RecordPeriod from '../data/RecordPeriod.vue'
import { useRecordPeriod } from '../data/useRecordPeriod.js'
import { buildCoverage, missingIntervals, intervalLabel, toCsv } from '../data/waterRecords.js'
import '../data/trend.css'
import '../data/monitor.css'

const {period,latestDate,max,rows,loading,error,receivedAt,slow,historical,setPeriod,refresh}=useRecordPeriod('day')
const selected=ref(null),search=ref(''),range=ref('all'),display=ref('matrix')
const coverage=computed(()=>buildCoverage(rows.value,period.value))
const unavailable=computed(()=>!!error.value&&!rows.value.length)
const initial=computed(()=>loading.value&&!rows.value.length)
const visibleMeters=computed(()=>coverage.value.meters.filter(m=>!search.value||`${m.tag} ${m.title}`.toLowerCase().includes(search.value.toLowerCase())))
const filtered=computed(()=>coverage.value.missing.filter(m=>(!selected.value||m.id===selected.value)&&visibleMeters.value.some(s=>s.id===m.id)&&(range.value==='all'||range.value==='morning'&&m.hour<12||range.value==='afternoon'&&m.hour>=12)))
const intervals=computed(()=>missingIntervals(filtered.value))
const selection=computed(()=>coverage.value.meters.find(m=>m.id===selected.value))
const hours=Array.from({length:24},(_,hour)=>hour)
const header=inject('setAquaticStatus',()=>{})
watch(()=>[loading.value,error.value,coverage.value.affected,historical.value],()=>header({label:loading.value?'資料讀取中':error.value?'資料讀取失敗':historical.value?'歷史記錄':coverage.value.affected?'有缺測記錄':'資料完整',tone:loading.value?'neutral':error.value||coverage.value.affected||historical.value?'warning':'connected'}),{immediate:true})
watch(period,()=>{selected.value=null})
function download(){const csv=toCsv([['日期','時段','測點','設備','狀態'],...filtered.value.map(m=>[m.date,m.time,m.tag,m.title,'資料缺測'])]);const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`AQUATEC_缺測紀錄_${period.value}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
</script>

<template>
  <div class="trend-page monitor-page">
    <div class="trend-content">
      <header class="trend-hero"><div><p class="trend-eyebrow"><span /> WATER INTELLIGENCE / DATA INTEGRITY</p><h1>警報紀錄<span>讓每一段缺漏，都能被看見</span></h1><p class="trend-intro">追蹤量測記錄的完整性，定位需要關注的測點與時段。</p></div><RecordPeriod :model-value="period" :max="max" :latest="latestDate" @update:model-value="setPeriod" /></header>
      <div class="monitor-context"><span><i class="monitor-dot" /> {{historical?'歷史資料':'當日資料'}} · {{period.replaceAll('-',' / ')}}</span><span>資料完整性監測 · 每小時至少一筆有效記錄</span></div>
      <section class="trend-stats" aria-label="資料完整性摘要" :aria-busy="loading">
        <article class="trend-stat is-primary"><div class="stat-top"><span>有效記錄完整率</span><TwinIcon name="check" :size="18" /></div><div v-if="initial" class="stat-skeleton" aria-hidden="true"><i/><i/></div><div v-else class="stat-number"><strong>{{unavailable||coverage.integrity===null?'—':coverage.integrity.toFixed(1)}}</strong><span>%</span></div><p>{{initial?'整理有效測點…':unavailable?'尚未取得有效讀取結果':`${coverage.recorded} / ${coverage.expected} 測點時段`}}</p></article>
        <article class="trend-stat stat-amber"><div class="stat-top"><span>缺測時段</span><TwinIcon name="alarm" :size="18" /></div><div v-if="initial" class="stat-skeleton" aria-hidden="true"><i/><i/></div><div v-else class="stat-number"><strong>{{unavailable?'—':coverage.missing.length}}</strong><span>筆</span></div><p>每個測點、每小時分別計算</p></article>
        <article class="trend-stat"><div class="stat-top"><span>受影響測點</span><TwinIcon name="layers" :size="18" /></div><div v-if="initial" class="stat-skeleton" aria-hidden="true"><i/><i/></div><div v-else class="stat-number"><strong>{{unavailable?'—':coverage.affected}}</strong><span>/ 14 個</span></div><p>流量、水質、液位與壓力</p></article>
        <article class="trend-stat"><div class="stat-top"><span>最近缺測時段</span><TwinIcon name="calendar" :size="18" /></div><div v-if="initial" class="stat-skeleton" aria-hidden="true"><i/><i/></div><div v-else class="stat-number"><strong>{{unavailable||coverage.latestMissing===null?'—':`${String(coverage.latestMissing).padStart(2,'0')}:00`}}</strong></div><p>{{initial?'正在比對記錄…':coverage.missing.length?'以所選日期的完整記錄計算':'所選時段沒有缺測'}}</p></article>
      </section>
      <p v-if="error" class="monitor-error" role="alert">{{error}} <button @click="refresh()">重新讀取</button></p>
      <section class="monitor-workspace">
        <aside class="monitor-sensors" aria-label="測點篩選"><div class="panel-title"><div><p class="trend-eyebrow">MEASUREMENT POINTS</p><h2>測點狀態</h2></div><span>14</span></div><label class="monitor-search"><TwinIcon name="search" :size="16"/><input v-model="search" aria-label="搜尋測點" placeholder="搜尋名稱或編號" /></label><button class="all-sensors" :class="{'is-selected':!selected}" @click="selected=null"><TwinIcon name="layers" :size="16"/>全部測點<span>{{initial||unavailable?'—':coverage.missing.length}}</span></button><div class="sensor-scroll"><button v-for="meter in visibleMeters" :key="meter.id" class="sensor-row" :class="{'is-selected':selected===meter.id}" :aria-pressed="selected===meter.id" @click="selected=selected===meter.id?null:meter.id"><i :class="{'has-gap':meter.missing&&!initial,'is-unknown':initial||error}"/><span><b>{{meter.tag}}</b><small>{{meter.title}}</small></span><em>{{initial||unavailable?'—':meter.missing?`${meter.missing} 缺測`:'完整'}}</em></button></div></aside>
        <div class="monitor-main-panel">
          <header class="panel-title"><div><p class="trend-eyebrow">HOURLY COVERAGE</p><h2>{{selection?`${selection.tag} · ${selection.title}`:'逐時資料完整性'}}</h2><p class="panel-description">{{period}} · {{coverage.hours}} 個已到時段</p></div><div class="chart-actions"><button aria-label="重新整理警報紀錄" :disabled="loading" @click="refresh()"><TwinIcon name="reset" :size="18" :class="{'is-spinning':loading}"/></button><button aria-label="匯出缺測 CSV" :disabled="loading||!filtered.length||!!error" @click="download"><TwinIcon name="download" :size="18"/></button></div></header>
          <div class="monitor-toolbar"><div class="monitor-segments" aria-label="紀錄顯示方式"><button :class="{'is-active':display==='matrix'}" :aria-pressed="display==='matrix'" @click="display='matrix'">完整性圖</button><button :class="{'is-active':display==='records'}" :aria-pressed="display==='records'" @click="display='records'">缺測區間 <span>{{initial?'—':intervals.length}}</span></button></div><div class="coverage-legend"><span><i class="is-present"/>有效</span><span><i class="is-missing"/>缺測</span><span><i/>未到時段</span></div></div>
          <div class="coverage-stage" :aria-busy="loading"><div v-if="unavailable" class="monitor-empty"><TwinIcon name="alarm" :size="30"/><h3>資料尚未成功讀取</h3><p>請重新讀取，再確認缺測狀態。</p></div>
            <WaterLoading v-if="initial" title="正在比對量測記錄" :detail="`${period} · 14 個測點`" :slow="slow" />
            <WaterLoading v-else-if="loading" title="正在更新紀錄" compact />
            <div v-if="!initial&&!unavailable&&display==='matrix'" class="coverage-scroll"><table class="coverage-table"><caption class="sr-only">{{period}} 測點逐時完整性，綠色有效、琥珀色缺測。</caption><thead><tr><th scope="col">測點 / 時</th><th v-for="hour in hours" :key="hour" scope="col">{{String(hour).padStart(2,'0')}}</th></tr></thead><tbody><tr v-for="meter in visibleMeters.filter(m=>!selected||m.id===selected)" :key="meter.id"><th scope="row"><span>{{meter.tag}}</span><small>{{meter.title}}</small></th><td v-for="(present,hour) in meter.present" :key="hour"><span class="coverage-cell" :class="{'is-present':present===true,'is-missing':present===false}" :title="`${meter.title} ${String(hour).padStart(2,'0')}:00 · ${present===null?'未到時段':present?'有效記錄':'資料缺測'}`"><span class="sr-only">{{present===null?'未到時段':present?'有效':'缺測'}}</span></span></td></tr></tbody></table><p v-if="!visibleMeters.length" class="monitor-no-results">找不到符合的測點。</p></div>
            <div v-if="!initial&&!unavailable&&display==='records'" class="gap-records"><div class="gap-filter"><span>{{filtered.length}} 個缺測時段 · 相鄰時段合併顯示</span><select v-model="range" aria-label="缺測時段篩選"><option value="all">全日</option><option value="morning">00:00–11:00</option><option value="afternoon">12:00–23:00</option></select></div><div v-if="!intervals.length" class="monitor-empty"><TwinIcon name="check" :size="30"/><h3>所選範圍沒有缺測</h3><p>可切換測點或時段查看其他紀錄。</p></div><article v-for="item in intervals" :key="`${item.id}/${item.start}`" class="gap-record"><div class="gap-marker"><TwinIcon name="alarm" :size="16"/></div><div><span>{{item.tag}} <small>資料缺測</small></span><h3>{{item.title}}</h3></div><div class="gap-time"><strong>{{intervalLabel(item)}}</strong><span>{{item.count}} 個時段</span></div><RouterLink :to="{path:'/data-trend',query:{date:period,metric:item.category}}" :aria-label="`查看 ${item.title} 的趨勢`"><TwinIcon name="arrow" :size="17"/></RouterLink></article></div>
          </div>
          <footer class="trend-chart-footer"><span><TwinIcon name="info" :size="13"/>這裡呈現資料缺測；設備超限狀態請參考圖控儀表。</span><span>{{receivedAt?`資料讀取 ${receivedAt}`:'等待資料'}}</span></footer>
        </div>
      </section>
      <footer class="trend-page-footer"><span><TwinIcon name="drop" :size="13"/>AQUATEC · PROCESS INTELLIGENCE</span><span>完整率以有效量測記錄計算</span></footer>
    </div>
  </div>
</template>
