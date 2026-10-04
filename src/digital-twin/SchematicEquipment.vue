<script setup>
import {computed} from 'vue'
import SvgSignalLamp from './SvgSignalLamp.vue'
import {CIRCUITS} from './topology'
import {levelFraction} from './display'
import {localPorts,deviceBounds} from './schematic'
import {formatSignal,signalById,isWarning} from './telemetry'
const props=defineProps({equipment:Object,values:Object,selected:Boolean,showLabel:Boolean,showValues:Boolean,cutaway:Boolean})
const e=computed(()=>props.equipment),color=computed(()=>CIRCUITS[e.value.circuit].color)
const level=computed(()=>levelFraction(props.values[e.value.levelId],e.value.visualRange||[0,1]))
const levelIds=computed(()=>e.value.signals.slice(1))
const levelNames={120:'HH',121:'H',157:'M',122:'L',123:'LL',138:'HH',139:'H',158:'M',140:'L'}
const bounds=computed(()=>deviceBounds(e.value)),ports=computed(()=>localPorts(e.value))
</script>

<template>
  <g class="s2-equipment" :class="{'is-selected':selected}" :data-equipment="e.id" :transform="`translate(${e.point.join(' ')})`">
    <rect v-if="selected" class="s2-selection" :x="bounds[0]" :y="bounds[1]" :width="bounds[2]" :height="bounds[3]" rx="12" fill="#75e1b2" fill-opacity=".04" stroke="#99eccb" stroke-width="1.7"/>
    <g v-if="e.type==='tank'" class="s2-cast-shadow">
      <ellipse cx="3" cy="94" rx="68" ry="10" fill="#030b13" opacity=".6"/>
      <path d="M -50 -78 Q 0 -103 50 -78 L 50 72 Q 0 101 -50 72 Z" fill="url(#s2-metal)" stroke="#a4bac8" stroke-width="2"/>
      <path d="M -42 -70 Q 0 -91 42 -70 L 42 66 Q 0 87 -42 66 Z" :fill="cutaway?'#10313d':'url(#s2-metal)'" stroke="#607e8d"/>
      <g v-if="cutaway" :clip-path="`url(#s2-tank-clip-${e.id})`">
        <rect x="-43" :y="72-(level||0)*150" width="86" :height="(level||0)*150" :fill="color" fill-opacity=".55" :data-liquid-signal="e.levelId" :data-fraction="level"/>
        <rect v-if="level!==null" x="-43" :y="70-level*150" width="86" height="3" :fill="color"/>
        <path d="M -38 -66 L -38 64 M -30 -70 L -30 70" stroke="#ebfaff" stroke-width="3" opacity=".08"/>
      </g>
      <path d="M -53 -80 Q 0 -110 53 -80 L 53 -71 Q 0 -94 -53 -71 Z" fill="url(#s2-metal)" stroke="#7e9da9"/>
      <ellipse cy="-84" rx="46" ry="12" fill="url(#s2-lid)" stroke="#bccdd5"/>
      <path d="M -13 -92 V -103 Q 0 -114 13 -103 V -92" fill="none" stroke="#b9cbd4" stroke-width="5"/>
      <path d="M -55 69 Q 0 92 55 69 V 80 Q 0 104 -55 80 Z" fill="url(#s2-dark-metal)" stroke="#7994a4"/>
      <path d="M -45 82 L -48 98 M 45 82 L 48 98" stroke="#9bacb7" stroke-width="7"/>
      <g v-for="(p,name) in ports" :key="name" :data-port="name"><path :d="name==='outlet'?'M 50 82 H 60':`M ${p[0]} -86 V -96`" stroke="#b1c7d2" stroke-width="7"/><use href="#s2-flange" :transform="`translate(${p.join(' ')}) rotate(${name==='outlet'?0:90})`"/></g>
      <g stroke="#819aaa" stroke-width="3"><path d="M -64 -67 V 79 M -51 -67 V 79"/><path v-for="y in [-56,-38,-20,-2,16,34,52,70]" :key="y" :d="`M -64 ${y} H -51`"/></g>
      <rect x="53" y="-73" width="29" height="140" rx="6" fill="url(#s2-dark-metal)" stroke="#5f7a8e"/>
      <g v-for="(id,i) in levelIds" :key="id" :transform="`translate(67,${-57+i*27})`"><SvgSignalLamp :signal-id="id" :value="values[id]" :label="signalById[id].name"/><text x="-26" y="5" text-anchor="end" class="s2-level-code">{{levelNames[id]}}</text></g>
      <rect x="-29" y="-24" width="58" height="27" rx="3" fill="#152c38" stroke="#688493"/><text y="-6" text-anchor="middle" class="s2-tag">{{e.tag}}</text>
      <text v-if="showLabel" y="124" text-anchor="middle" class="s2-name">{{e.name}}</text><g v-if="showValues"><rect x="-80" y="135" width="160" height="43" rx="7" fill="#132b36" stroke="#517687"/><text x="-66" y="162" class="s2-value" :fill="isWarning(e.levelId,values[e.levelId])?'#f0bb82':color" :data-signal-id="e.levelId">{{formatSignal(e.levelId,values[e.levelId])}}<tspan dx="8" class="s2-unit">cm</tspan></text><text x="64" y="161" text-anchor="end" class="s2-small">液位</text></g>
    </g>
    <g v-else-if="e.type==='chemicalTank'" class="s2-cast-shadow">
      <ellipse cy="56" rx="42" ry="8" fill="#030b13" opacity=".6"/>
      <path d="M -37 -42 Q 0 -67 37 -42 V 41 Q 0 62 -37 41 Z" fill="url(#s2-polymer)" stroke="#8896bf" stroke-width="2"/>
      <ellipse cy="-42" rx="37" ry="12" fill="#75809f" stroke="#adb9cd"/>
      <rect x="-10" y="-60" width="20" height="15" rx="3" fill="url(#s2-dark-metal)" stroke="#b5c4d2"/>
      <path v-for="y in [-19,6,31]" :key="y" :d="`M -36 ${y} Q 0 ${y+13} 36 ${y}`" fill="none" stroke="#a3b5cb" stroke-width="3" opacity=".7"/>
      <path d="M -27 -32 V 33" stroke="#c6d2ed" stroke-width="5" opacity=".19"/>
      <rect x="-24" y="-13" width="48" height="27" rx="3" fill="#26314a" stroke="#8098ad"/><text y="5" text-anchor="middle" class="s2-tag">{{e.tag}}</text>
      <path d="M -8 27 H 8" stroke="#d0ad68" stroke-width="5"/>
      <g data-port="outlet"><path d="M 36 25 H 45" stroke="#b1c7d2" stroke-width="7"/><use href="#s2-flange" transform="translate(45 25)"/></g>
      <text v-if="showLabel" y="81" text-anchor="middle" class="s2-name">{{e.name}}</text>
    </g>
    <g v-else-if="e.type==='pump'" class="s2-cast-shadow">
      <g :transform="e.mirrored?'scale(-1 1)':''">
      <ellipse cy="29" rx="57" ry="6" fill="#030b13" opacity=".65"/>
      <rect x="-53" y="17" width="106" height="9" rx="2" fill="url(#s2-dark-metal)" stroke="#708995"/>
      <rect x="-39" y="7" width="16" height="11" fill="#708a99"/><rect x="22" y="7" width="15" height="11" fill="#708a99"/>
      <rect x="-52" y="-10" width="11" height="17" fill="url(#s2-metal)" stroke="#9ab0bd"/>
      <rect x="-42" y="-18" width="54" height="33" rx="10" fill="url(#s2-motor)" stroke="#8eaeb9" stroke-width="1.5"/>
      <path v-for="x in [-34,-27,-20,-13,-6,1]" :key="x" :d="`M ${x} -14 V 11`" stroke="#244e63" stroke-width="3"/>
      <rect x="-29" y="-26" width="24" height="10" rx="3" fill="#537d91" stroke="#a0b7c3"/>
      <rect x="9" y="-4" width="14" height="8" fill="url(#s2-metal)"/><circle cx="32" r="20" fill="url(#s2-metal)" stroke="#afc3ce" stroke-width="2"/><circle cx="32" r="11" fill="#2d5266" stroke="#8ca6b5"/>
      <g transform="translate(32 0)"><g :class="{'s2-rotor':values[e.signalId]===1}"><path d="M 0 -8 L 3 -2 L 8 0 L 2 3 L 0 8 L -3 2 L -8 0 L -2 -3 Z" fill="#b9ccd8"/><circle r="3" fill="#263e4d"/></g></g>
      <rect x="27" y="-29" width="10" height="12" fill="url(#s2-metal)"/><rect x="24" y="-32" width="16" height="4" fill="#a9beca"/>
      <g data-port="inlet"><path d="M 49 0 H 58" stroke="#b1c7d2" stroke-width="7"/><use href="#s2-flange" transform="translate(58 0)"/></g>
      <g data-port="outlet"><path d="M 32 -29 V -38" stroke="#b1c7d2" stroke-width="7"/><use href="#s2-flange" transform="translate(32 -38) rotate(90)"/></g>
      </g>
      <SvgSignalLamp :transform="`translate(${e.mirrored?16:-16} -43)`" :signal-id="e.signalId" :value="values[e.signalId]" :label="e.name"/>
      <g v-if="showLabel"><text y="44" text-anchor="middle" class="s2-tag" :fill="color">{{e.tag}}</text><text y="65" text-anchor="middle" class="s2-name">{{e.name}}</text></g>
    </g>
    <g v-else-if="e.type==='valve'">
      <g :transform="e.vertical?'rotate(90)':''"><path d="M -26 -7 V 7 M 26 -7 V 7" stroke="#b9cbd5" stroke-width="5"/><path d="M -23 -12 L 0 0 L -23 12 Z M 23 -12 L 0 0 L 23 12 Z" fill="url(#s2-metal)" stroke="#7b9aaa" stroke-width="1.5"/><circle r="5" fill="#264453" stroke="#a1baca"/></g>
      <g v-if="e.vertical"><path d="M 4 0 H 24" stroke="#c0d4de" stroke-width="3"/><rect x="22" y="-8" width="16" height="16" rx="3" fill="url(#s2-dark-metal)" stroke="#869ead"/><SvgSignalLamp transform="translate(46 -16)" :signal-id="e.signalId" :value="values[e.signalId]" :label="e.name"/><text v-if="showLabel" x="-38" y="5" text-anchor="end" class="s2-tag" :fill="color">{{e.tag}}</text></g>
      <g v-else><path d="M 0 -4 V -23" stroke="#c0d4de" stroke-width="3"/><rect x="-15" y="-31" width="30" height="16" rx="3" fill="url(#s2-dark-metal)" stroke="#869ead"/><SvgSignalLamp transform="translate(0 -48)" :signal-id="e.signalId" :value="values[e.signalId]" :label="e.name"/><text v-if="showLabel" x="38" y="5" class="s2-tag" :fill="color">{{e.tag}}</text></g>
    </g>
    <g v-else-if="e.type==='membrane'" class="s2-cast-shadow">
      <ellipse cy="150" rx="82" ry="8" fill="#030b13" opacity=".7"/>
      <rect x="-74" y="-136" width="148" height="282" rx="3" fill="none" stroke="#7694a8" stroke-width="6"/>
      <path d="M -75 -134 H 75 M -75 134 H 75" stroke="url(#s2-metal)" stroke-width="12"/>
      <g v-for="(p,name) in ports" :key="name" :data-port="name"><path :d="`M 0 ${name==='feed'?134:-134} V ${p[1]}`" stroke="#bdd2de" stroke-width="7"/><use href="#s2-flange" :transform="`translate(${p.join(' ')}) rotate(90)`"/></g>
      <g v-for="i in 6" :key="i" :transform="`translate(${-59+(i-1)*23.5} 0)`"><rect x="-9" y="-117" width="18" height="233" rx="9" fill="url(#s2-metal)" stroke="#6a899b"/><path d="M -9 -108 H 9 M -9 107 H 9" stroke="#1a3346" stroke-width="6"/><path d="M -3 -133 V -117 M -3 117 V 134" stroke="#c4d7df" stroke-width="7"/><path d="M -8 -7 H 8" stroke="#95aebb" stroke-width="2"/></g>
      <rect x="-55" y="-21" width="110" height="42" rx="4" fill="#203b4c" stroke="#718a9c"/><text y="-3" text-anchor="middle" class="s2-tag">UF-01</text><text y="14" text-anchor="middle" class="s2-small">ULTRAFILTRATION</text>
      <text v-if="showLabel" y="177" text-anchor="middle" class="s2-name">超濾膜組</text>
    </g>
  </g>
</template>
