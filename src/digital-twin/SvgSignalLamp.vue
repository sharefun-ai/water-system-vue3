<script setup>
import {computed} from 'vue'
import {lampAppearance} from './lamps'
const props=defineProps({value:{default:null},signalId:Number,label:String})
const appearance=computed(()=>lampAppearance(props.value))
</script>
<template>
  <g class="s2-lamp" :class="'lamp-'+appearance.state" :data-signal-id="signalId" :data-state="appearance.state" role="img" :aria-label="`${label}：${appearance.state==='on'?'亮燈':appearance.state==='off'?'熄燈':'未知'}`">
    <title>{{label}} · #{{signalId}}</title>
    <circle v-if="appearance.state==='on'" r="16" fill="#72ecad" opacity=".12"/>
    <rect x="-11" y="-11" width="22" height="22" rx="6" fill="url(#s2-dark-metal)" stroke="#6b8597"/>
    <circle r="8" fill="url(#s2-metal)" stroke="#152633" stroke-width="1.5"/>
    <circle r="6.2" :fill="appearance.state==='on'?'url(#s2-led-on)':appearance.state==='off'?'url(#s2-led-off)':'url(#s2-led-unknown)'"/>
    <ellipse cx="-1.8" cy="-2.2" rx="2.4" ry="1.2" fill="#edfff6" :opacity="appearance.state==='on'?.7:.2"/>
  </g>
</template>
