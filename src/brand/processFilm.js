import * as THREE from 'three'
import { createPlantScene } from '../digital-twin/plantScene.js'
import { PROCESS_CHAPTERS, OPENING_SECONDS, chapterAt } from './processStory.js'

// A directed film of the real diagram, sharing all vessels, instruments, fittings,
// indicators and 24 branches. Cinematic light is separate from measured LED state.
export function createProcessFilm(host, { intro = true, quiet = false, onReady, onError, onChapter, onComplete } = {}) {
  const plantApi = createPlantScene(host, { manual: true, onError, onSelect: () => {} })
  const { scene, renderer, camera, plant, equipment, pipes, mats, grid, indicators } = plantApi.presentation
  scene.background = null
  renderer.setClearColor('#06171c', 0)
  renderer.domElement.setAttribute('aria-hidden', 'true')
  renderer.domElement.removeAttribute('aria-label')
  renderer.domElement.dataset.renderer = 'process-film-webgl'
  renderer.domElement.dataset.equipment = String(equipment.size)
  renderer.domElement.dataset.branches = String(pipes.length)
  renderer.toneMappingExposure = 1.08
  renderer.shadowMap.autoUpdate = false
  grid.visible = false
  mats.steel.color.set('#d0e3e7'); mats.steel.roughness = .23
  mats.bolts.color.set('#b4ccd3'); mats.dark.color.set('#24404b')
  mats.base.color.set('#0d2730'); mats.base.roughness = .34
  const ownedMaterials = [], ownedGeometry = [], added = []
  function add(object) { scene.add(object); added.push(object); return object }
  function ownMaterial(material) { ownedMaterials.push(material); return material }
  function ownGeometry(geometry) { ownedGeometry.push(geometry); return geometry }
  // Quiet the technical deck; its geometry and all connection positions stay intact.
  for (const child of plant.children) {
    if (child.isMesh && child.geometry.type === 'PlaneGeometry' && child.geometry.parameters.width === 34) {
      child.material.color.set('#102b33'); child.material.metalness = .5; child.material.roughness = .3
    }
  }
  for (const e of equipment.values()) {
    if (e.shell) { e.shell.material.opacity = .16; e.shell.material.color.set('#c7e5e7') }
    if (e.liquid) {
      // Brand cutaway volumes explain collection; no measured value is generated.
      const h = e.definition.height * (e.definition.id === 'T01' ? .54 : .72)
      e.liquid.scale.y = h; e.liquid.position.y = .48 + h / 2; e.surface.position.y = .49 + h
      e.liquid.material.color.set(e.definition.id === 'T01' ? '#73beca' : '#83e0cf')
      e.liquid.material.emissive.set('#246e76'); e.liquid.material.emissiveIntensity = .18
      e.liquid.material.opacity = .65
    }
    if (e.needle) e.needle.visible = false
  }
  for (const indicator of indicators) { indicator.material.color.set('#6d8a94'); indicator.aura.material.opacity = 0 }
  for (const p of pipes) {
    p.pearls.forEach(m => { m.visible = false })
    p.shellMat.color.set(p.line.circuit === 'product' ? '#579a8f' : '#587b89'); p.shellMat.roughness = .3; p.shellMat.metalness = .5
    // Smooth travelling highlights follow each existing TubeGeometry UV, including elbows.
    p.flowMat.fragmentShader = `varying vec2 vUv; uniform float uTime,uSpeed,uActive,uLength; uniform vec3 uColor;
      void main(){float travel=fract(vUv.x*uLength*.25-uTime*uSpeed);float soft=exp(-pow((travel-.5)*7.0,2.0));
        float edge=.35+.65*pow(abs(sin(vUv.y*6.283185)),2.0);
        gl_FragColor=vec4(uColor*(.6+soft*.6),uActive*(.08+soft*.68)*edge);}`
    p.flowMat.uniforms.uColor.value.set(p.line.circuit === 'feed' ? '#9adbec' : p.line.circuit === 'product' ? '#8bffe0' : p.line.circuit === 'backwash' ? '#d4e9c5' : p.line.circuit === 'chemical' ? '#b4cddd' : '#a0d0c5')
    p.flowMat.needsUpdate = true
  }
  const light = add(new THREE.DirectionalLight('#c3ffea', 1.6)); light.position.set(-14, 12, -7)
  // Two front cartridges are cut away to expose the filter fibres and the water
  // passing through them, at the existing UF rack positions and original dimensions.
  const membrane = equipment.get('UF')
  const cartridgeShells = []
  membrane.group.traverse(o => {
    if(o.isMesh && o.geometry.type === 'CylinderGeometry' && o.geometry.parameters.radiusTop === .4 && o.geometry.parameters.height === 3.6 && o.position.z > 1) cartridgeShells.push(o)
  })
  const cartridgeWater = ownMaterial(new THREE.MeshPhysicalMaterial({ color:'#7ed9d0', roughness:.09, metalness:.02, transparent:true, opacity:.62, depthWrite:false, transmission:.28, thickness:.35, ior:1.333, emissive:'#145d61', emissiveIntensity:.13 }))
  const fibreMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color:'#d5f3ed', metalness:.1, roughness:.28 }))
  const cartridgeGeometry = ownGeometry(new THREE.CylinderGeometry(.32,.32,3.4,24))
  const fibreGeometry = ownGeometry(new THREE.CylinderGeometry(.016,.016,3.35,6))
  for(const shell of cartridgeShells) {
    const glass = ownMaterial(shell.material.clone());glass.transparent=true;glass.opacity=.17;glass.depthWrite=false;glass.metalness=.02;glass.roughness=.18;shell.material=glass
    const water = new THREE.Mesh(cartridgeGeometry,cartridgeWater);water.position.copy(shell.position);membrane.group.add(water);added.push(water)
    for(let i=0;i<9;i++) {
      const fibre = new THREE.Mesh(fibreGeometry,fibreMaterial)
      fibre.position.copy(shell.position);fibre.position.x+=(i%3-1)*.13;fibre.position.z+=(Math.floor(i/3)-1)*.13
      membrane.group.add(fibre);added.push(fibre)
    }
  }
  const caustic = ownMaterial(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `varying vec2 vUv;uniform float uTime;
      void main(){vec2 p=(vUv-.5)*32.;float d=length(p*vec2(.8,1.2));
        float a=sin(p.x*.8+sin(p.y*.7+uTime*.16)*1.2-uTime*.13);
        float b=sin(p.y*.85+sin(p.x*.6-uTime*.12)*1.3+uTime*.18);
        float c=pow(max(0.,1.-abs(a+b)*.7),12.);float mask=exp(-d*.10)*(1.-smoothstep(10.,23.,d));
        gl_FragColor=vec4(mix(vec3(.035,.14,.18),vec3(.23,.58,.55),c*.35),mask*(.22+c*.09));}`,
  }))
  const waterLight = add(new THREE.Mesh(ownGeometry(new THREE.PlaneGeometry(72, 54)), caustic))
  waterLight.rotation.x = -Math.PI / 2; waterLight.position.y = -.42
  const deckLight = add(new THREE.Mesh(ownGeometry(new THREE.PlaneGeometry(33.6, 21.6)), caustic))
  deckLight.rotation.x = -Math.PI / 2; deckLight.position.y = .042
  // Sensor feedback is a restrained halo on real instruments, with no invented control wiring.
  const sensing = []
  for (const e of equipment.values()) {
    if (!['tank','membrane','instrument'].includes(e.definition.type)) continue
    const material = ownMaterial(new THREE.MeshBasicMaterial({ color:'#8fe8d0', transparent:true, opacity:0, depthWrite:false, blending:THREE.AdditiveBlending }))
    const radius = e.definition.type === 'tank' ? 1.5 : e.definition.type === 'membrane' ? 2 : .42
    const ring = add(new THREE.Mesh(ownGeometry(new THREE.RingGeometry(radius, radius + .015, 64)), material))
    ring.rotation.x = -Math.PI / 2; ring.position.copy(e.group.position); ring.position.y = .19
    sensing.push({ ring, e, material })
  }
  let disposed = false, paused = false, visible = true, frame = 0, elapsed = intro && !quiet ? 0 : OPENING_SECONDS
  let motionTime = 0, previous = 0, lastDraw = 0, frames = 0, chapter = -1, completed = !intro || quiet, manualReplay = false
  let entryTime = -1, destination = '/scada', frameDelta = 0
  const pointer = new THREE.Vector2(), easedPointer = new THREE.Vector2()
  const look = new THREE.Vector3(), shot = new THREE.Vector3(), rotation = new THREE.Quaternion()
  const bounds = new THREE.Box3(new THREE.Vector3(-17, -.4, -11), new THREE.Vector3(17, 5.6, 11))
  const corners = []
  for (const x of [bounds.min.x,bounds.max.x]) for (const y of [bounds.min.y,bounds.max.y]) for (const z of [bounds.min.z,bounds.max.z]) corners.push(new THREE.Vector3(x,y,z))
  let width = 1, height = 1, halfY = 17, minX = 0, maxX = 0, minY = 0, maxY = 0
  const smooth = x => { x = THREE.MathUtils.clamp(x,0,1); return x*x*(3-2*x) }
  function resize() {
    if (disposed) return
    const rect = host.getBoundingClientRect(); width = Math.max(1,rect.width); height = Math.max(1,rect.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 700 ? 1.1 : 1.4, Math.sqrt(1800000 / (width*height))))
    renderer.setSize(width,height,false); draw()
  }
  function frameCamera() {
    const portrait = width / height < .85
    // Portrait turns the same connected plant along the long axis, instead of shrinking a desktop shot.
    const azimuth = portrait ? 1.50 : .71
    const drift = quiet && !manualReplay ? 0 : Math.sin(motionTime*.042)*.025 + easedPointer.x*.014
    const direction = new THREE.Vector3(Math.sin(azimuth+drift)*40, portrait ? 46 : 29, Math.cos(azimuth+drift)*40)
    camera.position.copy(direction); camera.lookAt(0,1.5,0); rotation.copy(camera.quaternion).invert()
    minX = minY = Infinity; maxX = maxY = -Infinity
    for (const c of corners) { const p = c.clone().applyQuaternion(rotation); minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y) }
    const aspect = width/height, safeX = width < 600 ? .87 : .86, safeY = height < 520 ? .67 : portrait ? .64 : .76
    halfY = Math.max((maxY-minY)/safeY/2,(maxX-minX)/safeX/aspect/2)
    const open = quiet && !manualReplay ? 1 : smooth(elapsed/OPENING_SECONDS)
    const zoom = 1 + (1-open)*.19 + (entryTime >= 0 ? smooth(entryTime/.7)*.10 : 0)
    // Film starts already recognisable, with a gentle dolly out, never a clipped abstract object.
    camera.left=-halfY*aspect;camera.right=halfY*aspect;camera.top=halfY;camera.bottom=-halfY;camera.zoom=zoom
    const stage = PROCESS_CHAPTERS[chapterAt(elapsed,true)]
    const anchor = equipment.get(stage.anchor).group.position
    const nudge = (1-open)*.16
    look.set(anchor.x*nudge,1.5,anchor.z*nudge)
    const centerY = (minY+maxY)/2
    const centerX = (minX+maxX)/2
    const shift = new THREE.Vector3(centerX,centerY,0).applyQuaternion(camera.quaternion)
    look.add(shift); look.y += portrait ? -.5 : .25
    shot.copy(direction).add(look);camera.position.copy(shot);camera.lookAt(look);camera.updateProjectionMatrix();camera.updateMatrixWorld()
    host.dataset.layout = portrait ? 'portrait' : 'landscape'
  }
  function draw() {
    if (disposed) return
    const index = chapterAt(elapsed,true), current = PROCESS_CHAPTERS[index]
    if (chapter !== index) { chapter=index;onChapter?.(index);host.dataset.chapter=String(index) }
    if (elapsed >= OPENING_SECONDS && !completed) { completed=true;onComplete?.() }
    host.dataset.intro = completed ? 'complete' : 'playing'
    frameCamera()
    caustic.uniforms.uTime.value=motionTime
    for (const p of pipes) {
      const primary = current.circuits.includes(p.line.circuit)
      p.flowMat.uniforms.uTime.value=motionTime
      p.flowMat.uniforms.uSpeed.value=.17
      const target = primary ? .86 : .19
      p.flowMat.uniforms.uActive.value=THREE.MathUtils.lerp(p.flowMat.uniforms.uActive.value,target,paused ? 1 : .09)
      p.shellMat.emissive.set(p.flowMat.uniforms.uColor.value)
      p.shellMat.emissiveIntensity=primary ? .07 : .018
    }
    for (const {ring,e,material} of sensing) {
      const highlight=current.equipment.includes(e.definition.id)
      const breathe=.5+.5*Math.sin(motionTime*.9+e.group.position.x*.12)
      material.opacity=highlight ? .20+breathe*.15 : .015
      ring.scale.setScalar(1+breathe*.035)
    }
    for (const e of equipment.values()) if (e.surface) {
      e.surface.material.emissiveIntensity=.17+Math.sin(motionTime*.7)*.025
    }
    for(const e of equipment.values()) if(e.rotor) {
      const driven=(e.definition.id==='143'&&index<2)||(e.definition.id==='145'&&index===2)||(e.definition.id==='149'&&index===3)
      if(driven&&!paused)e.rotor.rotation.x+=frameDelta*2.5
    }
    cartridgeWater.emissiveIntensity=.12+(index===1?.08:0)+Math.sin(motionTime*.8)*.025
    renderer.render(scene,camera)
    frameDelta=0
    frames++;renderer.domElement.dataset.frames=String(frames)
    host.dataset.clock=motionTime.toFixed(2);host.dataset.storyTime=elapsed.toFixed(2)
  }
  function canRun() { return !disposed && !paused && visible && !document.hidden }
  function stop() { if(frame)cancelAnimationFrame(frame);frame=0;previous=0 }
  function tick(stamp) {
    if (!canRun()) { stop();return }
    frame=requestAnimationFrame(tick)
    if (stamp-lastDraw < (quiet || width<700 ? 50 : 33)) return
    const dt=previous ? Math.min((stamp-previous)/1000,.12) : 0; previous=stamp;lastDraw=stamp
    frameDelta=dt*(quiet&&!manualReplay?.3:1);motionTime+=frameDelta;elapsed+=dt
    if(entryTime>=0)entryTime+=dt
    easedPointer.lerp(pointer,.025);draw()
  }
  function resume() { if(canRun()&&!frame)frame=requestAnimationFrame(tick) }
  function visibility() { if(document.hidden)stop();else resume() }
  function move(event) { const r=host.getBoundingClientRect();pointer.set((event.clientX-r.left)/width*2-1,(event.clientY-r.top)/height*2-1) }
  function leave() { pointer.set(0,0) }
  const observer=new ResizeObserver(resize);observer.observe(host)
  const visibleObserver=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)resume();else stop()});visibleObserver.observe(host)
  host.addEventListener('pointermove',move);host.addEventListener('pointerleave',leave);document.addEventListener('visibilitychange',visibility)
  resize();renderer.shadowMap.needsUpdate=true;draw();resume();onReady?.()
  return {
    pause(value) { paused=value;host.dataset.paused=String(value);if(value)stop();else resume() },
    replay() { paused=false;manualReplay=true;elapsed=0;completed=false;chapter=-1;entryTime=-1;host.dataset.paused='false';draw();resume() },
    skip() { elapsed=OPENING_SECONDS;completed=true;manualReplay=false;onComplete?.();draw() },
    quiet(value) { quiet=value;if(value&&!completed){elapsed=OPENING_SECONDS;completed=true;onComplete?.()}manualReplay=false;draw() },
    enter(to) { destination=to;entryTime=0;host.dataset.destination=destination;draw() },
    reset() { entryTime=-1;draw() },
    dispose() {
      disposed=true;stop();observer.disconnect();visibleObserver.disconnect()
      host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);document.removeEventListener('visibilitychange',visibility)
      for(const o of added)o.removeFromParent()
      for(const m of ownedMaterials)m.dispose();for(const g of ownedGeometry)g.dispose()
      plantApi.dispose();renderer.forceContextLoss()
    },
  }
}
