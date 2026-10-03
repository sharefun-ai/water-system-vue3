<script setup>
import { computed } from 'vue'
import TwinIcon from '../digital-twin/TwinIcon.vue'
import { shiftDate } from './trendData.js'
const props=defineProps({modelValue:String,max:String,latest:String,kind:{type:String,default:'day'}})
const emit=defineEmits(['update:modelValue'])
const latestPeriod=computed(()=>props.kind==='day'?props.latest:props.latest?.slice(0,7))
function change(step){
  let next
  if(props.kind==='day')next=shiftDate(props.modelValue,step)
  else{const [year,month]=props.modelValue.split('-').map(Number);next=new Date(Date.UTC(year,month-1+step,1)).toISOString().slice(0,7)}
  if(next<=props.max)emit('update:modelValue',next)
}
function input(event){const next=event.target.value;if(next&&next<=props.max)emit('update:modelValue',next);else event.target.value=props.modelValue}
</script>
<template><div class="trend-period"><span class="period-caption">{{kind==='day'?'觀測日期':'報表月份'}}<small>{{modelValue<max?'HISTORICAL':'CURRENT'}}</small></span><div class="date-controls"><button :aria-label="kind==='day'?'前一天':'上一個月'" @click="change(-1)"><TwinIcon name="chevron" :size="16" class="previous-day" /></button><label class="trend-date"><TwinIcon name="calendar" :size="17"/><input :type="kind==='day'?'date':'month'" :value="modelValue" :max="max" :aria-label="kind==='day'?'觀測日期':'報表月份'" @change="input" required /></label><button :aria-label="kind==='day'?'後一天':'下一個月'" :disabled="modelValue>=max" @click="change(1)"><TwinIcon name="chevron" :size="16" /></button></div><button v-if="latest" class="latest-date" :disabled="modelValue===latestPeriod" @click="emit('update:modelValue',latestPeriod)">{{kind==='day'?'最新資料日':'最新資料月'}} <span>{{latestPeriod.replaceAll('-','/')}}</span><TwinIcon name="arrow" :size="13" /></button></div></template>
