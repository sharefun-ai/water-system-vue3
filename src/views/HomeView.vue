<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import TwinIcon from '../digital-twin/TwinIcon.vue'
import { PROCESS_LINKS } from '../brand/processStory.js'
import { createWaterSound } from '../brand/waterSound.js'
import ocean from '../assets/ocean-depth.webp'
import './brand-home.css'

const router=useRouter(),surface=ref(null),ready=ref(false),paused=ref(false),touched=ref(false),menuOpen=ref(false),entering=ref(''),audio=ref('waiting'),audioLevel=ref(0),voiceCount=ref(0)
let water,sound,media,disposed=false,timer
function enter(item){
  if(entering.value)return
  entering.value=item.to;menuOpen.value=false;water?.enter();sound?.pause(true)
  timer=setTimeout(()=>router.push(item.to).catch(()=>{entering.value='';water?.reset();sound?.pause(paused.value)}),media?.matches?180:480)
}
function toggleMotion(){paused.value=!paused.value;water?.pause(paused.value);sound?.pause(paused.value)}
function toggleSound(){const wasPlaying=audio.value==='running';if(paused.value){paused.value=false;water?.pause(false);sound?.pause(false)}if(wasPlaying)sound?.toggle();else sound?.enable()}
function quietChange(event){water?.quiet(event.matches)}
function dismiss(event){if(event.key==='Escape'||(event.type==='pointerdown'&&!event.target.closest('.water-menu-area')))menuOpen.value=false}
onMounted(async()=>{
  window.scrollTo(0,0);media=window.matchMedia('(prefers-reduced-motion: reduce)');media.addEventListener('change',quietChange)
  document.addEventListener('keydown',dismiss);document.addEventListener('pointerdown',dismiss)
  sound=createWaterSound((value,level,voices)=>{audio.value=value;audioLevel.value=level;voiceCount.value=voices})
  try{
    const {createWaterField}=await import('../brand/waterField.js');if(disposed)return
    water=createWaterField(surface.value,{quiet:media.matches,onReady:()=>{ready.value=true},onTouch:(x,y,strength)=>sound?.touch(x,y,strength),onInteract:()=>{touched.value=true},onPause:value=>{paused.value=value;sound?.pause(value)},onError:()=>{ready.value=false;sound?.pause(true)}})
  }catch{if(!disposed)ready.value=true}
})
onBeforeUnmount(()=>{disposed=true;clearTimeout(timer);water?.dispose();sound?.dispose();media?.removeEventListener('change',quietChange);document.removeEventListener('keydown',dismiss);document.removeEventListener('pointerdown',dismiss)})
</script>

<template>
  <main class="water-home" :class="{'is-ready':ready,'is-touched':touched,'is-entering':!!entering}" :data-audio="audio" :data-audio-level="audioLevel.toFixed(6)" :data-audio-voices="voiceCount" aria-label="AQUATIC 互動水世界首頁" :style="{backgroundImage:`url(${ocean})`}">
    <div ref="surface" class="water-surface" role="button" tabindex="0" aria-label="觸碰水面：滑鼠點擊、拖曳或觸控可產生水波與藍色流光，第一次點擊啟動水聲旋律；也可按 Enter 或空白鍵。" />
    <div class="water-shade" aria-hidden="true" />
    <header class="water-topbar">
      <router-link to="/portal" class="water-logo" aria-label="AQUATIC 品牌首頁"><TwinIcon name="drop" :size="26"/><strong>AQUATIC<span>.</span></strong></router-link>
      <div class="water-menu-area">
        <button class="water-icon" aria-label="開啟功能選單" :aria-expanded="menuOpen" aria-controls="water-menu" @click="menuOpen=!menuOpen"><TwinIcon :name="menuOpen?'close':'layers'" :size="21" /></button>
        <nav v-if="menuOpen" id="water-menu" class="water-menu" aria-label="功能選單"><a v-for="item in PROCESS_LINKS" :key="item.to" :href="`#${item.to}`" @click.prevent="enter(item)"><TwinIcon :name="item.icon" :size="19"/><span>{{item.name}}</span><TwinIcon name="arrow" :size="16"/></a></nav>
      </div>
    </header>
    <div class="water-hint" aria-hidden="true"><span class="water-touch-mark"/><span>觸碰水面</span></div>
    <div class="water-controls">
      <button class="water-icon" :aria-label="audio==='running'?'靜音水聲與旋律':'開啟水聲與旋律'" :aria-pressed="audio==='running'" @click="toggleSound"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4V9Z"/><path v-if="audio==='running'" d="M16 8a6 6 0 0 1 0 8 M19 5a10 10 0 0 1 0 14"/><path v-else d="m17 9 5 6 m0-6-5 6"/></svg></button>
      <button class="water-icon" :disabled="!ready" :aria-label="paused?'播放水面流動':'暫停水面流動'" :aria-pressed="paused" @click="toggleMotion"><TwinIcon :name="paused?'play':'pause'" :size="18"/></button>
    </div>
    <nav class="water-navigation" aria-label="水系統功能入口"><a v-for="item in PROCESS_LINKS" :key="item.to" :href="`#${item.to}`" :class="{'is-selected':entering===item.to}" @click.prevent="enter(item)"><TwinIcon :name="item.icon" :size="19"/><span>{{item.name}}</span><TwinIcon name="arrow" :size="15"/></a></nav>
    <div class="water-entry-veil" aria-hidden="true"/>
  </main>
</template>
