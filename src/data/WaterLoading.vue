<script setup>
import { useId } from 'vue'
defineProps({ title: { type: String, default: '正在讀取水系統資料' }, detail: String, slow: Boolean, compact: Boolean })
const id = useId().replaceAll(':', ''), clip = `${id}-water-clip`, gradient = `${id}-water-gradient`
</script>

<template>
  <div class="water-loading" :class="{ 'is-compact': compact }" role="status" aria-live="polite">
    <div class="water-loading-art" aria-hidden="true">
      <div class="water-halo" /><div class="water-orbit" />
      <svg viewBox="0 0 160 160" class="water-lens">
        <defs><clipPath :id="clip"><circle cx="80" cy="80" r="52" /></clipPath><linearGradient :id="gradient" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#a9f4df" stop-opacity=".66" /><stop offset="1" stop-color="#348ca6" stop-opacity=".13" /></linearGradient></defs>
        <circle cx="80" cy="80" r="64" fill="none" stroke="#a0dcd4" stroke-opacity=".12" />
        <circle cx="80" cy="80" r="52" fill="#142f3a" stroke="#a0dcd4" stroke-opacity=".38" />
        <g :clip-path="`url(#${clip})`"><g class="water-wave water-wave-back"><path d="M-80 88 Q-60 77-40 88T0 88T40 88T80 88T120 88T160 88T200 88T240 88V160H-80Z" fill="#67b9c2" fill-opacity=".23" /></g><g class="water-wave water-wave-front"><path d="M-80 94 Q-60 84-40 94T0 94T40 94T80 94T120 94T160 94T200 94T240 94V160H-80Z" :fill="`url(#${gradient})`" /><path d="M-80 94 Q-60 84-40 94T0 94T40 94T80 94T120 94T160 94T200 94T240 94" fill="none" stroke="#b9f9e3" stroke-opacity=".75" stroke-width="1.1" /></g></g>
        <g class="water-drop"><path d="M80 48C74 57 67 63 67 72a13 13 0 0026 0c0-9-7-15-13-24Z" fill="#c2f6e5" fill-opacity=".85" /><path d="M73 70c0 4 2 6 5 7" stroke="#f0fff8" fill="none" stroke-linecap="round" stroke-width="1.5" /></g>
        <circle cx="80" cy="16" r="2.2" fill="#b3f5dc" class="water-glint" />
      </svg>
    </div>
    <div class="water-loading-copy"><p v-if="!compact" class="water-loading-kicker">AQUATEC / WATER INTELLIGENCE</p><h3>{{ title }}</h3><p v-if="detail && !compact" class="water-loading-detail">{{ detail }}</p><span v-if="!compact" class="water-loading-hint">{{ slow ? '資料仍在讀取中，請稍候…' : '讓每一筆水的變化，逐漸清晰。' }}<i /><i /><i /></span></div>
  </div>
</template>

<style scoped>
.water-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;text-align:center;padding:20px;background:radial-gradient(ellipse at 50% 38%,#2a665637,transparent 63%);color:#dff5ed;pointer-events:none}.water-loading-art{position:relative;width:160px;height:160px;flex-shrink:0}.water-lens{width:100%;height:100%;position:relative}.water-halo{position:absolute;inset:24px;border-radius:50%;background:#6fe4c424;filter:blur(25px);animation:water-breathe 4s ease-in-out infinite}.water-orbit{position:absolute;inset:8px;border:1px solid #9decd119;border-top-color:#a3efd47a;border-radius:50%;animation:water-orbit 7s linear infinite}.water-wave{animation:water-drift 3.5s linear infinite}.water-wave-back{animation-direction:reverse;animation-duration:5s}.water-drop{animation:water-float 3.5s ease-in-out infinite}.water-glint{animation:water-breathe 4s ease-in-out infinite}.water-loading-copy{max-width:100%}.water-loading-kicker{font:8px 'Space Grotesk',monospace;letter-spacing:.19em;color:#8fc4c3;margin:0 0 10px!important}.water-loading h3{font-weight:400;font-size:17px;letter-spacing:.08em;margin:0}.water-loading-detail{font:11px 'Space Grotesk',sans-serif;color:#accbd2;margin:9px 0 0!important}.water-loading-hint{display:flex;align-items:center;justify-content:center;gap:4px;margin-top:15px;font-size:10px;color:#8eb4bf;line-height:1.6}.water-loading-hint i{display:inline-block;width:3px;height:3px;margin-left:1px;border-radius:50%;background:#91d8c6;animation:water-breathe 1.8s ease-in-out infinite}.water-loading-hint i:nth-child(2){animation-delay:.3s}.water-loading-hint i:nth-child(3){animation-delay:.6s}
.water-loading.is-compact{inset:8px 17px auto auto;flex-direction:row;gap:7px;padding:5px 12px 5px 6px;background:#12313cec;border:1px solid #658c8555;border-radius:28px;box-shadow:0 4px 18px #061a2744}.is-compact .water-loading-art{width:34px;height:34px}.is-compact .water-halo{inset:4px;filter:blur(7px)}.is-compact .water-orbit{inset:1px}.is-compact h3{font-size:10px;letter-spacing:.03em}
@keyframes water-drift{to{transform:translateX(80px)}}@keyframes water-float{50%{transform:translateY(-4px)}}@keyframes water-breathe{0%,100%{opacity:.35}50%{opacity:.9}}@keyframes water-orbit{to{transform:rotate(360deg)}}
@media(max-height:500px){.water-loading:not(.is-compact){gap:5px;padding:10px}.water-loading:not(.is-compact) .water-loading-art{width:112px;height:112px}.water-loading-kicker{margin-bottom:6px!important}.water-loading-hint{margin-top:8px}}
@media(prefers-reduced-motion:reduce){.water-loading-art *,.water-loading-hint i{animation:none!important}}
</style>
