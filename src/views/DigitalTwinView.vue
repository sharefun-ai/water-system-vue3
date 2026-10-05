<script setup>
import {ref,shallowRef,computed,onMounted,onBeforeUnmount,watch,nextTick} from 'vue'
import {useRoute,useRouter} from 'vue-router'
import TwinIcon from '../digital-twin/TwinIcon.vue'
import AquaticHeader from '../components/AquaticHeader.vue'
import AquaticRail from '../components/AquaticRail.vue'
import SignalLamp from '../digital-twin/SignalLamp.vue'
import SchematicView from '../digital-twin/SchematicView.vue'
import {createPlantScene} from '../digital-twin/plantScene'
import {useTelemetry} from '../digital-twin/useTelemetry'
import {ANALOG,DIGITAL,signalById,formatSignal,isWarning} from '../digital-twin/telemetry'
import {DIAGRAM} from '../digital-twin/schematic'
import {EQUIPMENT,equipmentById,CIRCUITS} from '../digital-twin/topology'
import {captureScene} from '../digital-twin/captureScene'
import {placeAnnotations,valueAnnotations} from '../digital-twin/annotations'
import '../digital-twin/twin.css'
import '../digital-twin/annotations.css'
import '../digital-twin/workspace.css'

const telemetry=useTelemetry()
const route=useRoute(),router=useRouter()
const {mode,values,receivedAt,error,missing,usable,status}=telemetry
const canvasHost=ref(null),viewport=ref(null),schematicView=ref(null),sourceDialog=ref(null),selectedId=ref('T02'),cameraView=ref('iso')
const phoneViewport=()=>window.matchMedia('(max-width:767px), (max-width:1100px) and (max-height:600px)').matches
const cutaway=ref(true),motion=ref(true),overlayMode=ref(phoneViewport()?'none':'labels'),reference=ref(route.query.view==='2d'),panelTab=ref('metrics'),inspectorOpen=ref(false),immersive=ref(false),search=ref('')
const allTags=computed({get:()=>overlayMode.value==='labels',set:checked=>{if(checked)overlayMode.value='labels';else if(allTags.value)overlayMode.value='none'}})
const showValues=computed({get:()=>overlayMode.value==='values',set:checked=>{if(checked)overlayMode.value='values';else if(showValues.value)overlayMode.value='none'}})
const sceneReady=ref(false),sceneError=ref(''),exporting=ref(false),exportError=ref(''),sourceChoice=ref('api'),apiUrl=ref(telemetry.endpoint.value),dialogError=ref(''),savedArtifact=ref(null)
let scene,compactViewport,workspaceObserver
const labels=shallowRef([]),projectedLabels=shallowRef([])
function workspaceObstacles(){
  if(!viewport.value)return []
  const area=viewport.value.getBoundingClientRect()
  return [...viewport.value.closest('.twin-shell').querySelectorAll('.selection-dock,.viewport-tools,.twin-inspector.is-open')].map(el=>{const r=el.getBoundingClientRect();return{x:r.left-area.left-6,y:r.top-area.top-6,w:r.width+12,h:r.height+12}}).filter(r=>r.w>12&&r.h>12&&r.x<area.width&&r.y<area.height&&r.x+r.w>0&&r.y+r.h>0)
}
function layoutLabels(){if(!canvasHost.value)return;const {clientWidth:w,clientHeight:h}=canvasHost.value,p=projectedLabels.value;labels.value=overlayMode.value==='none'?[]:placeAnnotations(showValues.value?valueAnnotations(p,w,h):p,w,h,selectedId.value,labels.value,p.filter(l=>l.visible&&l.body).map(l=>l.body),workspaceObstacles())}
function updateWorkspace(){
  if(!viewport.value)return
  const bounds=viewport.value.getBoundingClientRect(),panel=viewport.value.closest('.twin-shell').querySelector('.twin-inspector')
  scene?.setWorkspaceInsets({right:inspectorOpen.value&&bounds.width>=720?panel.getBoundingClientRect().width+30:0,bottom:12})
  labels.value=[];layoutLabels()
}
function updateLabels(projected){projectedLabels.value=projected;layoutLabels()}
watch(overlayMode,next=>{if(next!=='none'&&phoneViewport()){if(reference.value)schematicView.value?.reset();else scene?.setView(cameraView.value)}labels.value=[];layoutLabels()})
watch([inspectorOpen,immersive,selectedId],()=>nextTick(updateWorkspace))
const selected=computed(()=>equipmentById[selectedId.value])
const analogSelected=computed(()=>selected.value.signals.map(id=>signalById[id]).filter(s=>ANALOG.includes(s)))
const digitalSelected=computed(()=>selected.value.signals.map(id=>signalById[id]).filter(s=>DIGITAL.includes(s)))
const equipmentList=computed(()=>EQUIPMENT.filter(e=>`${e.tag} ${e.name}`.toLowerCase().includes(search.value.toLowerCase())))
const displayTime=computed(()=>receivedAt.value?new Date(receivedAt.value).toLocaleTimeString('en-GB',{hour12:false}):'—')
const meterGroups=[{name:'壓力',ids:[101,102,103,104]},{name:'瞬間流量',ids:[106,107,108]},{name:'水質 / 液位',ids:[112,113,114,115]},{name:'累計水量',ids:[109,110,111]}]
function shortLevel(s){return s.name.match(/(HH|LL|H|M|L)$/)?.[0]||s.name}
function select(id,focus=false){selectedId.value=id;scene?.select(id);if(focus)focusSelected(id);inspectorOpen.value=false}
function focusSelected(id=selectedId.value){if(reference.value)schematicView.value?.focus(id);else scene?.focus(id)}
function zoomScene(factor){if(reference.value)schematicView.value?.zoom(factor);else scene?.zoom(factor)}
function resetView(){if(reference.value)schematicView.value?.reset();else setView('iso')}
function setView(next){reference.value=false;cameraView.value=next;scene?.setView(next)}
function showPanel(tab){const close=inspectorOpen.value&&panelTab.value===tab;panelTab.value=tab;inspectorOpen.value=!close}
function openSource(){sourceChoice.value=mode.value;apiUrl.value=telemetry.endpoint.value;dialogError.value='';sourceDialog.value.showModal()}
function saveSource(){if(sourceChoice.value==='api'){try{const url=new URL(apiUrl.value,location.origin);if(!['http:','https:'].includes(url.protocol)||!apiUrl.value.trim())throw new Error()}catch{dialogError.value='請輸入有效的 HTTP / HTTPS API 路徑。';return}}telemetry.setSource(sourceChoice.value,apiUrl.value.trim());sourceDialog.value.close()}
async function saveArtifact(blob,kind,name){
  if(import.meta.env.DEV){const response=await fetch(`/__scada-artifact?kind=${kind}`,{method:'POST',body:blob});if(!response.ok)throw new Error('無法儲存本機檔案');savedArtifact.value=await response.json();return}
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)
}
async function exportModel(){exporting.value=true;exportError.value='';try{if(reference.value)await saveArtifact(schematicView.value.exportSvg(),'svg2d','aquatec-scada-2d.svg');else await saveArtifact(await scene.exportModel(),'glb','aquatec-scada-3d.glb')}catch(e){exportError.value=`匯出失敗：${e.message}`}finally{exporting.value=false}}
async function saveScene(){try{await saveArtifact(await captureScene(reference.value?schematicView.value:scene,values.value,{width:reference.value?DIAGRAM.width:canvasHost.value.clientWidth,height:reference.value?DIAGRAM.height:canvasHost.value.clientHeight,selectedId:selectedId.value,status:status.value,labels:reference.value?[]:labels.value}),reference.value?'png2d':'png',reference.value?'aquatec-scada-2d.png':'aquatec-scada-scene.png')}catch(e){exportError.value=`圖片儲存失敗：${e.message}`}}
function escape(event){if(event.key==='Escape'){inspectorOpen.value=false;immersive.value=false;reference.value=false}}
watch([values,usable,cutaway,motion,overlayMode],()=>scene?.update(values.value,{usable:usable.value,cutaway:cutaway.value,motion:motion.value,allTags:overlayMode.value!=='none'}))
watch(reference,active=>{scene?.setVisible(!active);router.replace({query:{...route.query,view:active?'2d':undefined}});if(active&&phoneViewport())nextTick(()=>schematicView.value?.focus(selectedId.value))})
watch(()=>route.query.view,view=>reference.value=view==='2d')
function compactChanged(event){if(event.matches)inspectorOpen.value=false;nextTick(updateWorkspace)}
onMounted(()=>{window.addEventListener('keydown',escape);compactViewport=window.matchMedia('(max-width:1599px)');compactViewport.addEventListener('change',compactChanged);inspectorOpen.value=!compactViewport.matches;try{scene=createPlantScene(canvasHost.value,{onSelect:id=>select(id),onLabels:updateLabels,onReady:()=>sceneReady.value=true,onError:message=>sceneError.value=message});scene.update(values.value,{usable:usable.value,cutaway:cutaway.value,motion:motion.value,allTags:overlayMode.value!=='none'});scene.select(selectedId.value);scene.setVisible(!reference.value);if(phoneViewport()&&!reference.value)scene.focus(selectedId.value);workspaceObserver=new ResizeObserver(()=>nextTick(updateWorkspace));workspaceObserver.observe(viewport.value);nextTick(updateWorkspace)}catch(e){sceneError.value=`無法啟用 3D 顯示：${e.message}`}})
onBeforeUnmount(()=>{window.removeEventListener('keydown',escape);compactViewport?.removeEventListener('change',compactChanged);workspaceObserver?.disconnect();scene?.dispose()})
</script>

<template>
  <div class="twin-app" :class="{'has-motion':motion,'is-immersive':immersive,'panel-open':inspectorOpen}">
    <AquaticHeader :status="status" :tone="usable ? 'connected' : 'warning'" :time="displayTime" source-settings @source-settings="openSource" />
    <div class="twin-shell">
      <AquaticRail />
      <main class="twin-main">
        <section class="process-panel">
          <div class="process-toolbar"><div class="process-title"><TwinIcon :name="reference?'layers':'cube'" :size="18"/><h1>水系統數位圖控</h1><span class="scene-count">{{reference?'2D':'3D'}} · 35 元件</span></div><div class="toolbar-actions"><div class="view-selector" aria-label="顯示模式"><button v-for="v in [{id:'iso',label:'立體'},{id:'top',label:'俯視'},{id:'front',label:'正視'}]" :key="v.id" :class="{'is-active':!reference&&cameraView===v.id}" @click="setView(v.id)">{{v.label}}</button><button :class="{'is-active':reference}" :aria-pressed="reference" @click="reference=true">2D 圖控</button></div><button class="panel-toggle" :aria-expanded="inspectorOpen&&panelTab==='metrics'" aria-controls="twin-monitor-panel" @click="showPanel('metrics')"><TwinIcon name="pressure" :size="16"/>儀表</button><button class="panel-toggle" :aria-expanded="inspectorOpen&&panelTab==='equipment'" aria-controls="twin-monitor-panel" @click="showPanel('equipment')"><TwinIcon name="layers" :size="16"/>設備</button></div><div class="workspace-actions"><button class="icon-button" :aria-label="exporting?'匯出中':reference?'匯出工程圖':'匯出模型'" :title="reference?'匯出工程圖':'匯出模型'" :disabled="(!reference&&!sceneReady)||exporting" @click="exportModel"><TwinIcon name="download" :size="17"/></button><button class="icon-button" :aria-label="immersive?'返回總覽':'專注圖控'" :title="immersive?'返回總覽':'專注圖控'" @click="immersive=!immersive"><TwinIcon :name="immersive?'close':'expand'" :size="18"/></button></div></div>
          <div ref="viewport" class="twin-viewport">
            <div ref="canvasHost" class="twin-canvas"/>
            <div v-if="!reference&&overlayMode!=='none'" class="equipment-labels" :aria-label="showValues?'圖上即時數值':'設備名稱標籤'" :data-overlay-mode="overlayMode">
              <svg class="label-leaders" aria-hidden="true"><g v-for="l in labels" :key="l.id" :class="{'is-selected':selectedId===l.id}" :style="{'--label-color':CIRCUITS[l.circuit].color}"><path :d="`M ${l.ax} ${l.ay} L ${l.ex} ${l.ey}`"/><circle :cx="l.ax" :cy="l.ay" :r="selectedId===l.id?3:2"/></g></svg>
              <template v-if="showValues"><button v-for="l in labels" :key="l.id" class="equipment-reading" :class="{'is-selected':selectedId===l.id,'is-compact':l.w<160,'is-warning':l.signalIds.some(id=>isWarning(id,values[id]))}" :style="{transform:`translate3d(${l.x}px,${l.y}px,0)`,width:l.w+'px',height:l.h+'px','--label-color':CIRCUITS[l.circuit].color}" :aria-label="`${l.tag} ${l.name}，${l.signalIds.map(id=>formatSignal(id,values[id])+' '+signalById[id].unit).join('，')}`" :data-equipment-id="l.id" @click="select(l.id)"><span class="reading-title"><b>{{l.tag}}</b>{{l.name}}</span><span class="reading-primary" :class="{'is-warning':isWarning(l.signalIds[0],values[l.signalIds[0]])}"><strong :data-signal-id="l.signalIds[0]">{{formatSignal(l.signalIds[0],values[l.signalIds[0]])}}</strong><small>{{signalById[l.signalIds[0]].unit}}</small></span><span v-if="l.signalIds[1]" class="reading-total"><span>累計</span><strong :data-signal-id="l.signalIds[1]">{{formatSignal(l.signalIds[1],values[l.signalIds[1]])}}</strong><small>{{signalById[l.signalIds[1]].unit}}</small></span></button></template>
              <template v-else><button v-for="l in labels" :key="l.id" class="equipment-label" :class="{'is-selected':selectedId===l.id}" :style="{transform:`translate3d(${l.x}px,${l.y}px,0)`,width:l.w+'px',height:l.h+'px','--label-color':CIRCUITS[l.circuit].color,'--label-font':l.font+'px','--tag-font':l.tagFont+'px'}" :aria-label="`選取 ${equipmentById[l.id].name}`" @click="select(l.id)"><b>{{l.tag}}</b><span v-if="l.name">{{l.name}}</span></button></template>
            </div>
            <div v-if="!reference" class="viewport-topline"><span>3D 狀態燈 <i/> 管線流向示意</span></div>
            <div v-if="!reference&&!sceneReady&&!sceneError" class="scene-loading"><TwinIcon name="cube" :size="32"/>正在建立 3D 製程模型…</div>
            <div v-if="!reference&&sceneError" class="scene-error" role="alert">{{sceneError}}</div>
            <SchematicView v-if="reference" ref="schematicView" :values="values" :selected-id="selectedId" :motion="motion" :all-tags="allTags" :show-values="showValues" :cutaway="cutaway" :usable="usable" :status="status" @select="select($event)"/>
            <div class="viewport-tools"><button class="icon-button" aria-label="放大" @click="zoomScene(1.18)"><TwinIcon name="plus"/></button><button class="icon-button" aria-label="縮小" @click="zoomScene(.85)"><TwinIcon name="minus"/></button><button class="icon-button" aria-label="重設視角" @click="resetView"><TwinIcon name="reset"/></button><button class="icon-button" :aria-label="reference?'切換 3D 圖控':'切換 2D 圖控'" :aria-pressed="reference" @click="reference=!reference"><TwinIcon name="layers"/></button><button class="icon-button" aria-label="儲存場景圖片" @click="saveScene"><TwinIcon name="camera"/></button></div>
            <span v-if="!reference" class="orbit-hint">拖曳旋轉 · 雙指縮放 · 點選設備</span>
          </div>
          <section class="selection-dock" aria-label="選取設備固定讀值" :style="{'--device-color':CIRCUITS[selected.circuit].color}">
            <div class="selection-identity"><span class="selected-tag">{{selected.tag}}</span><h3>{{selected.name}}</h3><button class="icon-button" aria-label="定位此設備" @click="focusSelected()"><TwinIcon name="target" :size="17"/></button></div>
            <div class="selected-readings"><div v-for="s in analogSelected" :key="s.id" class="dock-reading" :class="{'is-warning':isWarning(s.id,values[s.id])}" :data-signal-id="s.id"><span>{{s.label}}</span><strong>{{formatSignal(s.id,values[s.id])}}<small>{{s.unit}}</small></strong></div><div v-if="digitalSelected.length" class="dock-indicators"><span v-for="s in digitalSelected" :key="s.id"><SignalLamp :value="values[s.id]" :label="s.name"/><small>{{s.type==='level'?shortLevel(s):selected.tag}}</small></span></div><span v-if="!selected.signals.length" class="no-sensor">此設備沒有液位量測</span></div>
          </section>
        </section>
        <div class="scene-settings"><label><input type="checkbox" v-model="cutaway"/>槽體透視</label><label><input type="checkbox" v-model="motion"/>動畫效果</label><fieldset class="scene-display-options" aria-label="圖上顯示，設備標籤與數值互斥"><label><input type="checkbox" v-model="allTags"/>設備標籤</label><label><input type="checkbox" v-model="showValues"/>顯示數值</label></fieldset><span>{{44-missing}} / 44 訊號</span></div>
        <div v-if="error||exportError" class="data-error" role="alert">{{error||exportError}}</div><p v-if="savedArtifact" class="saved-artifact" role="status">已儲存：<a :href="savedArtifact.href" :download="savedArtifact.name">{{savedArtifact.name}}</a></p>
      </main>
      <button v-if="inspectorOpen" class="drawer-scrim" aria-label="關閉儀表面板" @click="inspectorOpen=false"/>
      <aside id="twin-monitor-panel" class="twin-inspector" :class="{'is-open':inspectorOpen}" :inert="!inspectorOpen" :aria-hidden="!inspectorOpen" aria-label="儀表與設備浮動面板">
        <div class="inspector-title"><div><p class="eyebrow">PROCESS MONITOR</p><h2>監測面板</h2></div><button class="icon-button close-inspector" aria-label="關閉監測面板" @click="inspectorOpen=false"><TwinIcon name="close"/></button><span class="read-only-badge">唯讀</span></div>
        <div class="inspector-tabs"><button :class="{'is-active':panelTab==='metrics'}" @click="panelTab='metrics'">儀表數值</button><button :class="{'is-active':panelTab==='equipment'}" @click="panelTab='equipment'">設備清單</button><button :class="{'is-active':panelTab==='signals'}" @click="panelTab='signals'">狀態燈</button></div>
        <div class="inspector-content">
          <section v-if="panelTab==='metrics'" class="telemetry-dashboard" aria-label="固定數值儀表板"><div v-for="group in meterGroups" :key="group.name" class="meter-group"><h3>{{group.name}}</h3><div class="meter-grid"><button v-for="id in group.ids" :key="id" class="meter-card" :class="{'is-warning':isWarning(id,values[id]),'is-selected':selected.signals.includes(id)}" @click="select(EQUIPMENT.find(e=>e.signals.includes(id)).id)"><span>{{signalById[id].label}}</span><strong>{{formatSignal(id,values[id])}}<small>{{signalById[id].unit}}</small></strong></button></div></div><p class="measurement-note">{{status}} · 每 3 秒更新<br/>讀值位置固定，旋轉模型時不會移動。</p></section>
          <section v-else-if="panelTab==='equipment'" class="equipment-browser"><label class="equipment-search"><TwinIcon name="search" :size="17"/><input v-model="search" placeholder="搜尋設備或編號" aria-label="搜尋設備或編號"/></label><div class="equipment-list"><button v-for="e in equipmentList" :key="e.id" :class="{'is-selected':selectedId===e.id}" @click="select(e.id,true)"><span class="list-icon" :style="{color:CIRCUITS[e.circuit].color}"><TwinIcon :name="e.type==='tank'||e.type==='chemicalTank'?'drop':e.type==='instrument'?'pressure':e.type==='valve'?'flow':'cube'" :size="18"/></span><span><b>{{e.tag}}</b><small>{{e.name}}</small></span><SignalLamp v-if="['pump','valve'].includes(e.type)" :value="values[e.signalId]" :label="e.name" size="small"/><TwinIcon name="chevron" :size="13"/></button><p v-if="!equipmentList.length" class="measurement-note">沒有符合的設備。</p></div></section>
          <section v-else class="all-signals" aria-label="30 路設備狀態燈"><button v-for="s in DIGITAL" :key="s.id" class="digital-row" @click="select(EQUIPMENT.find(e=>e.signals.includes(s.id)).id,true)"><span>{{s.name}}</span><SignalLamp :value="values[s.id]" :label="s.name"/></button><p class="measurement-note">與設備上的 3D 指示燈同步。</p></section>
          <div class="scene-legend"><div class="circuit-legend"><span v-for="c in CIRCUITS" :key="c.name" :style="{'--circuit-color':c.color}"><i/>{{c.name}}</span></div><span class="lamp-legend"><SignalLamp :value="1" size="small"/>亮燈<SignalLamp :value="0" size="small"/>熄燈<SignalLamp :value="null" size="small"/>未知</span></div>
        </div>
      </aside>
    </div>
    <dialog ref="sourceDialog" class="source-dialog"><form @submit.prevent="saveSource"><div class="dialog-header"><h2>數據來源</h2><button type="button" class="icon-button" aria-label="關閉數據來源設定" @click="sourceDialog.close()"><TwinIcon name="close"/></button></div><label class="source-option"><input type="radio" v-model="sourceChoice" value="api"/><span><b>既有 API</b><small>讀取原有設備與量測訊號。</small></span></label><label class="source-option"><input type="radio" v-model="sourceChoice" value="demo"/><span><b>固定參考數據</b><small>供離線查看設備與訊號。</small></span></label><label v-if="sourceChoice==='api'" class="endpoint-input"><span>API 網址或路徑</span><input v-model="apiUrl" type="text" required/></label><p class="dialog-note">歷史資料保留最後讀值與燈號；管線光點表示流向。</p><p v-if="dialogError" class="data-error" role="alert">{{dialogError}}</p><div class="dialog-actions"><button type="button" class="soft-button" @click="sourceDialog.close()">取消</button><button type="submit" class="soft-button primary-button">套用來源</button></div></form></dialog>
  </div>
</template>
