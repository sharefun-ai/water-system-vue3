import { ATLAS_DESTINATIONS, atlasFrame, atlasDestinationAt } from './atlasLayout.js'

// Cinematic matte painting + a live GPU water layer. Island architecture stays stable.
const vertex = `attribute vec2 position; varying vec2 vUv;
void main(){vUv=vec2(position.x*.5+.5,.5-position.y*.5);gl_Position=vec4(position,0.,1.);}`
const fragment = `precision highp float;
varying vec2 vUv;
uniform sampler2D sceneImage;
uniform vec2 uSpan,uCenter,uResolution,uTarget;
uniform float uClock,uImageAspect,uPortrait,uFocus,uReveal;
float island(vec2 p,vec2 center,vec2 radius){return 1.-smoothstep(.65,1.15,length((p-center)/radius));}
void main(){
  vec2 p=uCenter+(vUv-.5)*uSpan;
  p=clamp(p,vec2(.001),vec2(.999));
  float protect;
  if(uPortrait>.5){
    protect=max(max(island(p,vec2(.270,.267),vec2(.236,.081)),island(p,vec2(.741,.370),vec2(.242,.091))),
                max(island(p,vec2(.255,.600),vec2(.232,.086)),island(p,vec2(.742,.707),vec2(.242,.094))));
  }else{
    protect=max(max(island(p,vec2(.299,.260),vec2(.134,.143)),island(p,vec2(.696,.259),vec2(.139,.160))),
                max(island(p,vec2(.323,.622),vec2(.138,.159)),island(p,vec2(.729,.627),vec2(.137,.164))));
  }
  vec3 base=texture2D(sceneImage,p).rgb;
  float sea=smoothstep(.012,.095,base.b-base.r)*smoothstep(.01,.12,base.g-base.r)*(1.-protect);
  vec2 q=p*vec2(uImageAspect,1.);
  float a=dot(q,vec2(24.,17.))-uClock*.84;
  float b=dot(q,vec2(-39.,32.))-uClock*1.10;
  float c=dot(q,vec2(79.,51.))-uClock*1.61;
  float d=dot(q,vec2(-134.,93.))-uClock*2.13;
  float height=sin(a)*.5+sin(b)*.25+sin(c)*.11+sin(d)*.035;
  vec2 slope=cos(a)*vec2(24.,17.)*.5+cos(b)*vec2(-39.,32.)*.25+cos(c)*vec2(79.,51.)*.11+cos(d)*vec2(-134.,93.)*.035;
  vec2 relative=(p-uTarget)*vec2(uImageAspect,1.);float radius=length(relative);
  float ripple=sin(radius*210.-uClock*2.8)*exp(-radius*18.)*uFocus;
  vec2 wake=normalize(relative+vec2(.0001))*ripple*.0010;
  vec2 flow=vec2(sin(q.y*11.+uClock*.29),cos(q.x*9.-uClock*.23))*.00065;
  vec2 refracted=clamp(p+(slope*.00016+flow+wake)*sea,vec2(.001),vec2(.999));
  vec3 color=texture2D(sceneImage,refracted).rgb;
  vec3 normal=normalize(vec3(-slope*.020,1.));
  float sun=pow(max(dot(reflect(normalize(vec3(-.38,-.5,-1.6)),normal),vec3(0.,0.,1.)),0.),42.);
  float brightness=dot(color,vec3(.2126,.7152,.0722));
  color*=1.+height*.042*sea;
  color+=vec3(.83,.96,.88)*sun*.075*sea*smoothstep(.15,.85,brightness);
  float shoreLight=smoothstep(.2,.6,color.g)*sea;
  float caustic=pow(.5+.5*sin(q.x*84.+sin(q.y*40.-uClock*.22)+uClock*.34),12.)*pow(.5+.5*sin(q.y*71.+sin(q.x*43.+uClock*.18)),8.);
  color+=vec3(.48,.9,.79)*caustic*.024*shoreLight;
  float halo=exp(-radius*radius*280.)*uFocus;
  color+=vec3(.24,.65,.61)*halo*.065*sea;
  float grain=fract(sin(dot(gl_FragCoord.xy+floor(uClock*12.),vec2(12.9898,78.233)))*43758.5453)-.5;
  color+=grain*.003;
  color*=mix(.45,1.,uReveal);
  gl_FragColor=vec4(color,1.);
}`

export function createWaterAtlas(host, { landscape, portrait, quiet = false, intro = true, onFrame, onReady, onComplete, onError, onNavigate, onHover } = {}) {
  const surface = host.querySelector('.atlas-surface'), canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true'); canvas.dataset.renderer = 'water-atlas-webgl'; surface.appendChild(canvas)
  const gl = canvas.getContext('webgl', { alpha: false, depth: false, stencil: false, antialias: false, powerPreference: 'low-power' })
  if (!gl) { canvas.remove(); throw new Error('WebGL is unavailable') }
  let program, buffer, animation = 0, disposed = false, visible = true, paused = false, ready = false, elapsed = 0, age = intro ? 0 : 6, previous = 0, lastDraw = 0, count = 0, complete = false
  let currentKind = '', requestedKind = '', width = 1, height = 1, target = -1, focus = 0, diveAge = -1, diveIndex = -1, explicitReplay = false
  const textures = new Map(), pending = new Map(), images = new Set(), pointer = [0, 0], smoothPointer = [0, 0]
  let frame = atlasFrame(1, 1), lastPlacement = ''
  function compile(type, source) {
    const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const error = gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(error || 'Water shader compilation failed') }
    return shader
  }
  try {
    const vs = compile(gl.VERTEX_SHADER, vertex), fs = compile(gl.FRAGMENT_SHADER, fragment)
    program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program); gl.deleteShader(vs); gl.deleteShader(fs)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Water shader linking failed')
    gl.useProgram(program); buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
  } catch (error) { if (program) gl.deleteProgram(program); if (buffer) gl.deleteBuffer(buffer); canvas.remove(); throw error }
  const uniforms = Object.fromEntries(['sceneImage','uSpan','uCenter','uResolution','uTarget','uClock','uImageAspect','uPortrait','uFocus','uReveal'].map(name => [name, gl.getUniformLocation(program, name)]))
  gl.uniform1i(uniforms.sceneImage, 0)
  const smooth = x => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t) }
  function load(kind) {
    if (textures.has(kind)) return Promise.resolve(textures.get(kind))
    if (pending.has(kind)) return pending.get(kind)
    const promise = new Promise((resolve, reject) => {
      const img = new Image(); images.add(img)
      img.onload = () => {
        images.delete(img); if (disposed || gl.isContextLost()) { resolve(null); return }
        try {
          const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img)
          const value = { texture, aspect: img.naturalWidth / img.naturalHeight }; textures.set(kind, value); resolve(value)
        } catch (error) { reject(error) }
      }
      img.onerror = () => { images.delete(img); reject(new Error('Water map image unavailable')) }
      img.src = kind === 'portrait' ? portrait : landscape
    })
    pending.set(kind, promise); return promise
  }
  function stop() { cancelAnimationFrame(animation); animation = 0; previous = 0 }
  function canRun() { return ready && !disposed && !paused && visible && !document.hidden && !gl.isContextLost() }
  function resume() { stop(); if (canRun()) animation = requestAnimationFrame(tick) }
  function render() {
    if (!ready || disposed || gl.isContextLost()) return
    const allowCamera = !quiet || explicitReplay, reveal = smooth(age / (quiet && !explicitReplay ? 1.2 : 2.1)), approach = 1 - smooth(age / 6)
    let zoom = allowCamera ? 1.005 + approach * .085 + Math.sin(elapsed * .055) * .0025 : 1
    let center = allowCamera ? [.5 + smoothPointer[0] * .0025 + Math.sin(elapsed * .043) * .001, .5 + smoothPointer[1] * .0018 + approach * .006] : [.5, .5]
    const isPortrait = width / height < 1
    if (diveAge >= 0) {
      const amount = smooth(diveAge / .8), point = ATLAS_DESTINATIONS[diveIndex][isPortrait ? 'portrait' : 'landscape']
      zoom += amount * (quiet ? .04 : .95)
      center = center.map((v,i) => v + (point[i] - v) * amount * (quiet ? .08 : .72))
    }
    frame = atlasFrame(width, height, zoom, center)
    const signature = [...frame.span, ...center, width, height].join(',')
    if (signature !== lastPlacement) { lastPlacement = signature; onFrame?.(frame) }
    const image = textures.get(currentKind); if (!image) return
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, image.texture)
    gl.uniform2f(uniforms.uSpan, ...frame.span); gl.uniform2f(uniforms.uCenter, ...frame.center)
    gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height); gl.uniform1f(uniforms.uImageAspect, image.aspect)
    gl.uniform1f(uniforms.uPortrait, isPortrait ? 1 : 0); gl.uniform1f(uniforms.uClock, elapsed); gl.uniform1f(uniforms.uFocus, focus); gl.uniform1f(uniforms.uReveal, reveal)
    const point = target >= 0 ? ATLAS_DESTINATIONS[target][isPortrait ? 'portrait' : 'landscape'] : [-5, -5]
    gl.uniform2f(uniforms.uTarget, ...point); gl.drawArrays(gl.TRIANGLES, 0, 6)
    if (!complete && age >= 6) { complete = true; host.dataset.intro = 'complete'; onComplete?.() }
  }
  function tick(stamp) {
    if (!canRun()) { stop(); return }
    animation = requestAnimationFrame(tick)
    if (stamp - lastDraw < (quiet || width < 768 ? 50 : 33)) return
    const dt = previous ? Math.min((stamp - previous) / 1000, .1) : 0; previous = stamp; lastDraw = stamp
    elapsed += dt * (quiet ? .65 : 1); age += dt; if (diveAge >= 0) diveAge += dt
    smoothPointer.forEach((v,i) => { smoothPointer[i] = v + (pointer[i] - v) * .06 })
    focus += ((target >= 0 ? 1 : 0) - focus) * .12; render(); count++
    if (count % 20 === 0) { canvas.dataset.frames = String(count); canvas.dataset.clock = elapsed.toFixed(2) }
  }
  function resize() {
    if (disposed || gl.isContextLost()) return
    const bounds = host.getBoundingClientRect(); width = bounds.width; height = bounds.height; if (!width || !height) return
    const ratio = Math.min(window.devicePixelRatio || 1, width < 768 ? 1 : 1.25, Math.sqrt(2200000 / (width * height)), 4096 / width, 4096 / height)
    canvas.width = Math.max(1, Math.round(width * ratio)); canvas.height = Math.max(1, Math.round(height * ratio)); gl.viewport(0, 0, canvas.width, canvas.height)
    const kind = width / height < 1 ? 'portrait' : 'landscape'
    if (kind !== requestedKind) {
      requestedKind = kind; ready = false; stop(); canvas.style.visibility = 'hidden'
      load(kind).then(image => {
        if (disposed || requestedKind !== kind || !image) return
        currentKind = kind; ready = true; canvas.style.visibility = 'visible'; canvas.dataset.composition = kind
        render(); onReady?.(); resume()
      }).catch(() => { if (!disposed) { stop(); ready = false; onError?.() } })
    } else render()
  }
  function hit(event) {
    const r = host.getBoundingClientRect()
    const uv = [frame.center[0] + ((event.clientX-r.left)/r.width-.5)*frame.span[0], frame.center[1] + ((event.clientY-r.top)/r.height-.5)*frame.span[1]]
    return atlasDestinationAt(uv, frame.portrait)
  }
  function move(event) {
    const r = host.getBoundingClientRect(); pointer[0] = (event.clientX - r.left) / r.width * 2 - 1; pointer[1] = (event.clientY - r.top) / r.height * 2 - 1
    if (event.target.closest('.atlas-node,.atlas-topbar,.atlas-controls')) return
    target = hit(event); host.style.cursor = target >= 0 ? 'pointer' : ''; onHover?.(target)
  }
  function click(event) { if (event.target.closest('.atlas-node,.atlas-topbar,.atlas-controls') || diveAge >= 0) return; const index = hit(event); if (index >= 0) onNavigate?.(index) }
  function leave() { pointer[0] = pointer[1] = 0; target = -1; host.style.cursor = ''; onHover?.(-1) }
  function lost(event) { event.preventDefault(); ready = false; stop(); onError?.() }
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; resume() }); observer.observe(host)
  const resizer = new ResizeObserver(resize); resizer.observe(host)
  host.addEventListener('pointermove', move); host.addEventListener('pointerleave', leave); host.addEventListener('click', click); document.addEventListener('visibilitychange', resume); canvas.addEventListener('webglcontextlost', lost)
  host.dataset.intro = intro ? 'playing' : 'complete'; resize()
  return {
    resize,
    pause(value) { paused = value; canvas.dataset.paused = String(value); resume() },
    quiet(value) { quiet = value; render(); resume() },
    hover(index) { target = index; if (paused) render() },
    replay() { age = 0; complete = false; explicitReplay = true; paused = false; diveAge = -1; canvas.dataset.paused = 'false'; host.dataset.intro = 'playing'; resume() },
    enter(index) { diveIndex = index; diveAge = 0; paused = false; resume() },
    reset() { diveAge = -1; render(); resume() },
    dispose() {
      disposed = true; stop(); observer.disconnect(); resizer.disconnect()
      images.forEach(img => { img.onload = img.onerror = null; img.src = '' }); images.clear()
      host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave); host.removeEventListener('click', click); document.removeEventListener('visibilitychange', resume); canvas.removeEventListener('webglcontextlost', lost)
      textures.forEach(({ texture }) => gl.deleteTexture(texture)); gl.deleteBuffer(buffer); gl.deleteProgram(program)
      gl.getExtension('WEBGL_lose_context')?.loseContext(); canvas.remove()
    },
  }
}
