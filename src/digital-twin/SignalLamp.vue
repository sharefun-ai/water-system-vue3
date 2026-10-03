<script setup>
import {computed} from 'vue'
const props=defineProps({value:{default:null},label:{type:String,default:'設備訊號'},size:{type:String,default:'normal'}})
const state=computed(()=>props.value===1?'on':props.value===0?'off':'unknown')
</script>
<template><span class="indicator-mount" :class="[`lamp-${state}`,size]" role="img" :aria-label="`${label}：${state==='on'?'亮燈':state==='off'?'熄燈':'未知'}`" :title="`${label}：${state==='on'?'亮燈':state==='off'?'熄燈':'未知'}`"><i/></span></template>
