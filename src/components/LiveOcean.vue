<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import oceanTexture from '../assets/ocean-depth.webp'
import TwinIcon from '../digital-twin/TwinIcon.vue'
const props = defineProps({ active: { type: Boolean, default: true } })

const surface = ref(null), canvas = ref(null), ready = ref(false), mounted = ref(false), paused = ref(false), reduced = ref(false)
// This water interface starts with gentle movement; an explicit pause remains saved.
// The system's reduced-motion preference slows the surface instead of hiding it.
const animated = computed(() => !paused.value)
let gl, program, texture, buffer, frame, observer, resizeObserver, media, image, disposed = false, visible = true, time = 0, previous = 0, lastDraw = 0, frames = 0
const vertex = `attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`
const fragment = `precision mediump float;
varying vec2 uv; uniform sampler2D ocean; uniform vec2 resolution; uniform float clock;
void main(){
  float aspect=resolution.x/resolution.y; float imageAspect=1.7768;
  vec2 p=uv;
  if(aspect<imageAspect){float r=aspect/imageAspect;p.x=p.x*r+(1.-r)*.65;}else{float r=imageAspect/aspect;p.y=p.y*r+(1.-r);}
  p=mix(vec2(.018),vec2(.982),p);
  vec2 q=p*vec2(imageAspect,1.);
  float a=dot(q,vec2(19.,13.))-clock*.72;
  float b=dot(q,vec2(-33.,24.))-clock*.94;
  float c=dot(q,vec2(61.,37.))-clock*1.24;
  float d=dot(q,vec2(-95.,73.))-clock*1.57;
  float h=sin(a)*.50+sin(b)*.25+sin(c)*.12+sin(d)*.055;
  vec2 slope=cos(a)*vec2(19.,13.)*.50+cos(b)*vec2(-33.,24.)*.25+cos(c)*vec2(61.,37.)*.12+cos(d)*vec2(-95.,73.)*.055;
  vec2 drift=vec2(sin(clock*.13),cos(clock*.11))*.002;
  vec2 refracted=clamp(p+slope*.00030+drift,vec2(.005),vec2(.995));
  vec3 color=texture2D(ocean,refracted).rgb;
  vec3 normal=normalize(vec3(-slope*.018,1.));
  float reflection=pow(max(dot(reflect(normalize(vec3(-.35,-.65,-1.6)),normal),vec3(0.,0.,1.)),0.),34.);
  float brightness=dot(color,vec3(.2126,.7152,.0722));
  color*=1.+h*.05;
  color+=vec3(.70,.92,.87)*reflection*.075*smoothstep(.12,.65,brightness);
  gl_FragColor=vec4(color,1.);
}`
function stop() { cancelAnimationFrame(frame); frame = null; previous = 0 }
function canRun() { return props.active && ready.value && !disposed && !document.hidden && visible && animated.value }
function draw(stamp) {
  if (!canRun()) { stop(); return }
  frame = requestAnimationFrame(draw)
  const interval = surface.value.clientWidth < 768 || reduced.value ? 50 : 33
  if (stamp - lastDraw < interval) return
  time += previous ? Math.min((stamp - previous) / 1000, .1) * (reduced.value ? .45 : 1) : 0; previous = stamp; lastDraw = stamp
  gl.uniform1f(gl.getUniformLocation(program, 'clock'), time)
  gl.drawArrays(gl.TRIANGLES, 0, 6)
  frames++; if (frames % 20 === 0) canvas.value.dataset.frames = String(frames)
}
function resume() { stop(); if (canRun()) frame = requestAnimationFrame(draw) }
watch(() => props.active, resume)
function toggle() {
  paused.value = animated.value
  try { localStorage.setItem('aquatic-ocean-motion', paused.value ? 'off' : 'on') } catch { /* Motion can still be controlled for this visit. */ }
  resume()
}
function motionChange() { reduced.value = media.matches; resume() }
function resize() {
  if (!gl || disposed) return
  const width = surface.value.clientWidth, height = surface.value.clientHeight
  if (!width || !height || gl.isContextLost()) return
  // Cover the whole document without allocating an unbounded canvas on long pages.
  const ratio = Math.min(window.devicePixelRatio || 1, width < 768 ? 1 : 1.25, Math.sqrt(2400000 / (width * height)), 4096 / width, 4096 / height)
  canvas.value.width = Math.max(1, Math.floor(width * ratio)); canvas.value.height = Math.max(1, Math.floor(height * ratio))
  gl.viewport(0, 0, canvas.value.width, canvas.value.height)
  gl.uniform2f(gl.getUniformLocation(program, 'resolution'), canvas.value.width, canvas.value.height)
  gl.uniform1f(gl.getUniformLocation(program, 'clock'), time); gl.drawArrays(gl.TRIANGLES, 0, 6)
}
function shader(type, source) {
  const result = gl.createShader(type); gl.shaderSource(result, source); gl.compileShader(result)
  if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) { gl.deleteShader(result); throw new Error('Ocean shader unavailable') }
  return result
}
function lost(event) { event.preventDefault(); ready.value = false; stop() }
onMounted(() => {
  mounted.value = true
  media = window.matchMedia('(prefers-reduced-motion: reduce)'); reduced.value = media.matches
  try { paused.value = localStorage.getItem('aquatic-ocean-motion') === 'off' } catch { /* Default gentle movement still works without browser storage. */ }
  media.addEventListener('change', motionChange); document.addEventListener('visibilitychange', resume)
  canvas.value.addEventListener('webglcontextlost', lost)
  try {
    gl = canvas.value.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' })
    if (!gl) return
    const vs = shader(gl.VERTEX_SHADER, vertex), fs = shader(gl.FRAGMENT_SHADER, fragment)
    program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program)
    gl.deleteShader(vs); gl.deleteShader(fs)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Ocean program unavailable')
    gl.useProgram(program); buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    image = new Image(); image.onload = () => {
      if (disposed || gl.isContextLost()) return
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image)
      resize(); ready.value = true
      resizeObserver = new ResizeObserver(resize); resizeObserver.observe(surface.value)
      observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; resume() }); observer.observe(surface.value)
      resume()
    }; image.src = oceanTexture
  } catch { ready.value = false /* The photographic background remains visible if WebGL is unavailable. */ }
})
onBeforeUnmount(() => {
  disposed = true; stop(); observer?.disconnect(); resizeObserver?.disconnect()
  media?.removeEventListener('change', motionChange); document.removeEventListener('visibilitychange', resume)
  canvas.value?.removeEventListener('webglcontextlost', lost); if (image) image.onload = null
  if (gl) { if (texture) gl.deleteTexture(texture); if (buffer) gl.deleteBuffer(buffer); if (program) gl.deleteProgram(program); gl.getExtension('WEBGL_lose_context')?.loseContext() }
})
</script>

<template>
  <div ref="surface" class="living-ocean" :class="{ 'is-playing': animated && active, 'uses-gpu': ready, 'is-quiet': reduced, 'is-inactive': !active }" aria-hidden="true" :data-renderer="ready ? 'ready' : 'fallback'" :data-motion="animated ? 'playing' : 'paused'" :data-active="active" :style="{ backgroundImage: `url(${oceanTexture})` }"><div class="living-ocean-photo"/><canvas ref="canvas" :class="{ 'is-ready': ready }" /><div class="living-ocean-shade" /></div>
  <button v-if="mounted" v-show="active" class="ocean-motion-control" :aria-pressed="animated" :aria-label="animated ? '暫停海面流動' : '播放海面流動'" @click="toggle"><TwinIcon :name="animated ? 'pause' : 'play'" :size="12" /><span>{{ animated ? '水面流動' : '播放水面' }}</span></button>
</template>

<style>
.living-ocean{position:fixed;inset:var(--aquatic-header-height,68px) 0 0 var(--aquatic-rail-width,60px);z-index:-1;background-size:cover;background-position:65% top;pointer-events:none;overflow:hidden}
.living-ocean.is-inactive{visibility:hidden}
.living-ocean-photo{position:absolute;inset:-3%;background-image:inherit;background-size:cover;background-position:65% top;animation:ocean-fallback-drift 24s ease-in-out infinite alternate paused}
.living-ocean.is-playing .living-ocean-photo{animation-play-state:running}
.living-ocean.uses-gpu .living-ocean-photo{display:none}
.living-ocean.is-quiet .living-ocean-photo{animation-duration:48s}
@keyframes ocean-fallback-drift{from{transform:translate3d(-.6%,-.4%,0) scale(1.01)}to{transform:translate3d(.6%,.4%,0) scale(1.025)}}
.living-ocean canvas{position:absolute;inset:0;display:block;width:100%;height:100%;opacity:0;transition:opacity .7s}
.living-ocean canvas.is-ready{opacity:1}
.living-ocean-shade{position:absolute;inset:0;background:linear-gradient(180deg,#0b182110 0%,#0b182135 25%,#0b1821e0 76%,#0b1821 100%),linear-gradient(110deg,#071824a8 10%,#0b273955 62%,#07473b33)}
.ocean-motion-control{position:fixed;top:calc(var(--aquatic-header-height,68px) + 1px);right:42px;z-index:2;display:flex;align-items:center;gap:6px;min-height:36px;border:0!important;border-radius:5px;background:transparent!important;color:#afcec9!important;font:9px Inter,'Noto Sans TC',sans-serif!important;cursor:pointer;opacity:.8;padding:0 4px!important}.ocean-motion-control:hover{opacity:1}.ocean-motion-control:focus-visible{outline:2px solid #9bf2d2;outline-offset:2px}@media(max-width:767px){.ocean-motion-control{right:15px;min-height:44px;font-size:8px!important}}@media(prefers-reduced-motion:reduce){.living-ocean canvas{transition:none}}
</style>
