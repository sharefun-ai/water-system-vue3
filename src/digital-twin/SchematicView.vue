<script setup>
import {ref,computed,onMounted,onBeforeUnmount} from 'vue'
import SchematicEquipment from './SchematicEquipment.vue'
import {DIAGRAM,renderedLines,diagramEquipment,diagramById,meterPositions,junctions,deviceBounds,meterHeight,meterLeader} from './schematic'
import {CIRCUITS} from './topology'
import {signalById,formatSignal,isWarning,lineIsActive} from './telemetry'
import schematicStyles from './schematic.css?raw'
import './schematic.css'

const props=defineProps({values:Object,selectedId:String,motion:Boolean,allTags:Boolean,cutaway:Boolean,usable:Boolean,status:String})
const emit=defineEmits(['select'])
const surface=ref(null),svg=ref(null),scale=ref(1),center=ref([DIAGRAM.width/2,DIAGRAM.height/2]),dragging=ref(false)
const box=computed(()=>({x:center.value[0]-DIAGRAM.width/2/scale.value,y:center.value[1]-DIAGRAM.height/2/scale.value,w:DIAGRAM.width/scale.value,h:DIAGRAM.height/scale.value}))
const viewBox=computed(()=>`${box.value.x} ${box.value.y} ${box.value.w} ${box.value.h}`)
const instruments=diagramEquipment.filter(e=>e.type==='instrument')
const pointers=new Map();let lastPinch=0,dragged=false,observer,viewportMode=''
function constrain(){center.value=[Math.max(-80,Math.min(DIAGRAM.width+80,center.value[0])),Math.max(-60,Math.min(DIAGRAM.height+60,center.value[1]))]}
function zoom(factor,anchor=center.value){const old=scale.value,next=Math.max(.8,Math.min(4,old*factor));center.value=[anchor[0]-(anchor[0]-center.value[0])*old/next,anchor[1]-(anchor[1]-center.value[1])*old/next];scale.value=next;constrain()}
function reset(){scale.value=1;center.value=[DIAGRAM.width/2,DIAGRAM.height/2]}
function focus(id){const e=diagramById[id];if(!e)return;scale.value=surface.value.clientWidth<720?(surface.value.clientHeight>surface.value.clientWidth?4:3):2;center.value=e.type==='instrument'?[meterPositions[id][0]+89,meterPositions[id][1]+meterHeight(e)/2]:[...e.point];constrain()}
function world(event){const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.value.getScreenCTM().inverse());return [p.x,p.y]}
function pointerDown(event){if(event.button>0)return;if(!pointers.size)dragged=false;pointers.set(event.pointerId,{client:[event.clientX,event.clientY],world:world(event),start:[event.clientX,event.clientY],equipment:event.target.closest('[data-equipment]')?.getAttribute('data-equipment')});surface.value.setPointerCapture(event.pointerId);dragging.value=true;if(pointers.size>1)dragged=true;lastPinch=0}
function pointerMove(event){const p=pointers.get(event.pointerId);if(!p)return;p.client=[event.clientX,event.clientY];if(Math.hypot(event.clientX-p.start[0],event.clientY-p.start[1])>6)dragged=true
  if(pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.client[0]-b.client[0],a.client[1]-b.client[1]);if(lastPinch)zoom(distance/lastPinch);lastPinch=distance;return}
  const current=world(event);center.value=[center.value[0]+p.world[0]-current[0],center.value[1]+p.world[1]-current[1]];constrain()
}
function pointerUp(event){const p=pointers.get(event.pointerId);if(event.type!=='pointercancel'&&p?.equipment&&!dragged&&pointers.size===1)emit('select',p.equipment);pointers.delete(event.pointerId);dragging.value=pointers.size>0;lastPinch=0;for(const p of pointers.values())p.world=world({clientX:p.client[0],clientY:p.client[1]})}
function wheel(event){zoom(event.deltaY<0?1.12:1/1.12,world(event))}
function dialAngle(e){const max=e.signalId<105?12:e.signalId<109?200:e.signalId===112?3000:10;return -130+Math.min(1,Math.max(0,(props.values[e.signalId]||0)/max))*260}
function svgSource(){const clone=svg.value.cloneNode(true),style=document.createElementNS('http://www.w3.org/2000/svg','style');style.textContent=schematicStyles+'\n.s2-diagram *{animation:none!important}';clone.prepend(style);clone.setAttribute('xmlns','http://www.w3.org/2000/svg');clone.setAttribute('width',DIAGRAM.width);clone.setAttribute('height',DIAGRAM.height);clone.setAttribute('viewBox',`0 0 ${DIAGRAM.width} ${DIAGRAM.height}`);clone.removeAttribute('style');return new XMLSerializer().serializeToString(clone)}
async function screenshot(){const image=new Image(),url=URL.createObjectURL(new Blob([svgSource()],{type:'image/svg+xml'}));try{image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=DIAGRAM.width*2;canvas.height=DIAGRAM.height*2;canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/png')}finally{URL.revokeObjectURL(url)}}
function exportSvg(){return new Blob([svgSource()],{type:'image/svg+xml'})}
onMounted(()=>{observer=new ResizeObserver(()=>{const next=surface.value.clientWidth<720?(surface.value.clientHeight>surface.value.clientWidth?'portrait':'landscape'):'desktop';if(next!==viewportMode){viewportMode=next;if(next==='desktop')reset();else focus(props.selectedId)}});observer.observe(surface.value)})
onBeforeUnmount(()=>observer?.disconnect())
defineExpose({zoom,reset,focus,screenshot,exportSvg})
</script>

<template>
  <div ref="surface" class="schematic-surface" :class="{'is-dragging':dragging}" @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="pointerUp" @pointercancel="pointerUp" @wheel.prevent="wheel">
    <svg ref="svg" class="s2-diagram" :class="{'has-motion':motion}" :viewBox="viewBox" role="group" aria-label="即時 2D 水處理製程圖控">
      <defs>
        <linearGradient id="s2-metal"><stop stop-color="#425c6d"/><stop offset=".18" stop-color="#b4c7d2"/><stop offset=".34" stop-color="#e2edf2"/><stop offset=".55" stop-color="#91a9b8"/><stop offset=".8" stop-color="#c5d8e1"/><stop offset="1" stop-color="#5c7b8e"/></linearGradient>
        <linearGradient id="s2-lid" x2="0" y2="1"><stop stop-color="#e3eff4"/><stop offset=".6" stop-color="#a3bdcb"/><stop offset="1" stop-color="#5a7789"/></linearGradient>
        <linearGradient id="s2-dark-metal" x2="0" y2="1"><stop stop-color="#687f90"/><stop offset=".48" stop-color="#354f63"/><stop offset="1" stop-color="#172e41"/></linearGradient>
        <linearGradient id="s2-motor" x2="0" y2="1"><stop stop-color="#6e9eaa"/><stop offset=".45" stop-color="#38798f"/><stop offset="1" stop-color="#244656"/></linearGradient>
        <linearGradient id="s2-polymer"><stop stop-color="#303b59"/><stop offset=".3" stop-color="#8297bb"/><stop offset=".62" stop-color="#586e98"/><stop offset="1" stop-color="#293c5b"/></linearGradient>
        <radialGradient id="s2-led-on" cx=".32" cy=".25"><stop stop-color="#effff5"/><stop offset=".45" stop-color="#9af2bf"/><stop offset="1" stop-color="#1eab78"/></radialGradient>
        <radialGradient id="s2-led-off" cx=".3" cy=".2"><stop stop-color="#6b8393"/><stop offset="1" stop-color="#1b3345"/></radialGradient>
        <radialGradient id="s2-led-unknown" cx=".3" cy=".2"><stop stop-color="#ecd9ad"/><stop offset="1" stop-color="#9e7b44"/></radialGradient>
        <pattern id="s2-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M 32 0 H 0 V 32" fill="none" stroke="#284253" stroke-opacity=".22" stroke-width="1"/></pattern>
        <filter id="s2-shadow" x="-.3" y="-.3" width="1.6" height="1.7"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#010810" flood-opacity=".45"/></filter>
        <clipPath v-for="id in ['T01','T02']" :id="`s2-tank-clip-${id}`" :key="id"><path d="M -42 -70 Q 0 -91 42 -70 L 42 66 Q 0 87 -42 66 Z"/></clipPath>
        <g id="s2-flange"><rect x="-4" y="-9" width="8" height="18" rx="1" fill="url(#s2-metal)" stroke="#526c7f"/><path d="M -4 -6 H 4 M -4 6 H 4" stroke="#e1ecf2" stroke-width="1"/></g>
      </defs>
      <rect x="-2400" y="-1800" width="6400" height="4500" fill="#0b1722"/>
      <rect :width="DIAGRAM.width" :height="DIAGRAM.height" fill="url(#s2-grid)"/>
      <g class="s2-zone-titles"><text x="200" y="1146">UF 產水 / 逆洗</text><text x="740" y="1146">原水 / 過濾</text><text x="1430" y="1146">膜組 / 循環 / 放流</text></g>
      <g v-for="line in renderedLines" :key="line.id" class="s2-pipeline" :data-pipeline="line.id">
        <path :d="line.d" stroke="#05111b" stroke-width="14" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
        <path :d="line.d" stroke="#708898" stroke-width="9" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
        <path :d="line.d" :stroke="CIRCUITS[line.circuit].color" stroke-width="5" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity=".7"/>
        <path class="s2-flow" :d="line.d" :stroke="CIRCUITS[line.circuit].color" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="6 28" :opacity="usable&&lineIsActive(line,values)?.95:.35"/>
      </g>
      <g v-for="(joint,i) in junctions" :key="i" :transform="`translate(${joint.point.join(' ')})`"><circle r="6.5" fill="#132836" stroke="#91aebe" stroke-width="2"/><circle r="2.5" :fill="joint.color"/></g>
      <g class="s2-external-ports"><text x="1385" y="40" class="s2-name">廢水放流系統</text><path d="M 1390 65 V 55 M 1384 61 L 1390 55 L 1396 61" stroke="#a7c2d0" stroke-width="2" fill="none"/><text x="55" y="395" class="s2-small">回收水貯槽</text><text x="85" y="720" class="s2-name">研磨廢水</text><path d="M 130 734 L 138 740 L 130 746" fill="none" stroke="#7ccaff" stroke-width="2"/></g>
      <g v-for="e in diagramEquipment.filter(e=>e.type!=='instrument')" :key="e.id" role="button" tabindex="0" :data-equipment="e.id" :aria-label="`2D 選取 ${e.name}`" @keydown.enter="emit('select',e.id)" @keydown.space.prevent="emit('select',e.id)">
        <SchematicEquipment :equipment="e" :values="values" :selected="e.id===selectedId" :show-label="allTags" :cutaway="cutaway"/>
        <rect :transform="`translate(${e.point.join(' ')})`" :x="deviceBounds(e)[0]" :y="deviceBounds(e)[1]" :width="deviceBounds(e)[2]" :height="deviceBounds(e)[3]" fill="transparent" class="s2-hit-target"/>
      </g>
      <g v-for="e in instruments" :key="e.id" class="s2-instrument" role="button" tabindex="0" :data-equipment="e.id" :aria-label="`2D 選取 ${signalById[e.signalId].label}`" @keydown.enter="emit('select',e.id)" @keydown.space.prevent="emit('select',e.id)">
        <g :transform="`translate(${e.point.join(' ')}) rotate(${e.dialRotation})`"><path d="M 0 0 V -23" stroke="#b2cbd8" stroke-width="4"/><circle cy="-28" r="21" fill="url(#s2-metal)" stroke="#a7c2cd" stroke-width="1.5"/><circle cy="-28" r="16" fill="#e1ecf0" stroke="#5c7c90"/><path d="M -11 -23 L -9 -23 M -8 -36 L -6 -34 M 0 -40 V -37 M 8 -36 L 6 -34 M 11 -23 H 9" stroke="#385468" stroke-width="1.4"/><path v-if="values[e.signalId]!==null&&values[e.signalId]!==undefined" d="M 0 -28 V -40" :transform="`rotate(${dialAngle(e)} 0 -28)`" stroke="#1c596d" stroke-width="2"/><circle cy="-28" r="2.5" fill="#315970"/></g>
        <path :d="meterLeader(e)" fill="none" :stroke="CIRCUITS[e.circuit].color" stroke-width="1" opacity=".55"/>
        <g class="s2-meter" :class="{'is-selected':selectedId===e.id,'is-warning':isWarning(e.signalId,values[e.signalId])}" :transform="`translate(${meterPositions[e.id].join(' ')})`">
          <rect width="178" :height="meterHeight(e)" rx="7" fill="#122b39" :stroke="selectedId===e.id?'#9deacc':isWarning(e.signalId,values[e.signalId])?'#b58b60':'#4b6d83'" stroke-width="1.5"/>
          <text x="11" y="20" class="s2-meter-title">{{e.tag}} · {{signalById[e.signalId].label}}</text>
          <text x="11" y="51" class="s2-value" :fill="isWarning(e.signalId,values[e.signalId])?'#f0bb82':'#9ee9ce'" :data-signal-id="e.signalId">{{formatSignal(e.signalId,values[e.signalId])}}</text><text x="165" y="49" text-anchor="end" class="s2-unit">{{signalById[e.signalId].unit}}</text>
          <g v-if="e.signals.length>1"><path d="M 11 62 H 167" stroke="#3b596c"/><text x="11" y="82" class="s2-small">累計</text><text x="167" y="83" text-anchor="end" class="s2-total" :data-signal-id="e.signals[1]">{{formatSignal(e.signals[1],values[e.signals[1]])}} m³</text></g>
        </g>
      </g>
    </svg>
    <div class="s2-caption"><span>2D 製程圖控 <i/> {{status}}</span><span>跨接弧：無連接 · 圓點：接點</span></div>
    <div class="s2-navigation-hint">拖曳平移 · 滾輪 / 雙指縮放 · 點選設備</div>
  </div>
</template>
