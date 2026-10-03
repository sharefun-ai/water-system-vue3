import * as THREE from 'three'

// Brand artwork: the miniature explains the process; it is not a live instrument.
export function createBrandScene(host, { onProgress, onReady, onError, quiet = false, intro = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  renderer.domElement.setAttribute('aria-hidden', 'true')
  renderer.domElement.dataset.renderer = 'brand-webgl'
  host.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 70)
  const materials = new Set(), geometries = new Set()
  const material = (Type, params) => { const m = new Type(params); materials.add(m); return m }
  const mesh = (geometry, m, group, position = [0, 0, 0]) => {
    geometries.add(geometry)
    const o = new THREE.Mesh(geometry, m); o.position.set(...position); group.add(o); return o
  }
  const environmentScene = new THREE.Scene()
  environmentScene.background = new THREE.Color('#0b2330')
  // Studio panels create clean, coherent reflections on the water volume.
  for (const [position, size, color, intensity] of [
    [[-4, 3, 3], [2, 7], '#dafbfa', 4], [[4, 1, 2], [1, 8], '#99ddcf', 3],
    [[0, 5, -1], [6, 2], '#ffffff', 5], [[0, -3, 3], [8, 1], '#357e99', 2],
  ]) {
    const panel = mesh(new THREE.PlaneGeometry(...size), material(THREE.MeshBasicMaterial, { color, toneMapped: false }), environmentScene, position)
    panel.material.color.multiplyScalar(intensity); panel.lookAt(0, 0, 0)
  }
  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = pmrem.fromScene(environmentScene, .06)
  scene.environment = environment.texture; pmrem.dispose()
  scene.add(new THREE.HemisphereLight('#d4f4ff', '#092125', 2.6))
  const key = new THREE.DirectionalLight('#e3faff', 3.5); key.position.set(-4, 7, 5); scene.add(key)
  const rim = new THREE.DirectionalLight('#72dfc5', 2.5); rim.position.set(5, 2, -3); scene.add(rim)

  const sculpture = new THREE.Group(); sculpture.position.y = .32; scene.add(sculpture)
  const waterUniform = { value: 0 }, revealUniform = { value: 0 }
  const water = material(THREE.MeshPhysicalMaterial, {
    color: '#c8f5ef', roughness: .06, metalness: 0, transmission: .96,
    thickness: 1.5, ior: 1.333, clearcoat: 1, clearcoatRoughness: .06,
    attenuationColor: '#8ee3db', attenuationDistance: 4, envMapIntensity: 1.1,
  })
  water.onBeforeCompile = shader => {
    shader.uniforms.brandTime = waterUniform; shader.uniforms.brandReveal = revealUniform
    shader.vertexShader = 'uniform float brandTime; uniform float brandReveal;\n' + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      vec3 transformed = vec3(position);
      float ripple = sin(position.y * 4.5 + brandTime * .55) * sin(position.x * 3.0 - brandTime * .42);
      transformed += normal * (ripple * .055 + sin(position.z * 5.0 + brandTime * .4) * .025);
      transformed.y *= 1.13 + (1.0 - brandReveal) * .24;
      transformed.xz *= 1.0 - max(position.y, 0.0) * .075;
    `)
  }
  const shell = mesh(new THREE.SphereGeometry(1.7, 64, 48), water, sculpture)
  shell.renderOrder = 5

  const mini = new THREE.Group(); mini.position.set(0, -.25, .13); mini.rotation.set(.18, -.3, .03); sculpture.add(mini)
  const silver = material(THREE.MeshStandardMaterial, { color: '#a9d1dd', metalness: .68, roughness: .3 })
  const white = material(THREE.MeshStandardMaterial, { color: '#dfeeea', metalness: .2, roughness: .23 })
  const teal = material(THREE.MeshStandardMaterial, { color: '#55cbb1', emissive: '#145b4b', emissiveIntensity: .35, metalness: .32, roughness: .22 })
  const liquid = material(THREE.MeshStandardMaterial, { color: '#57c9cc', emissive: '#125959', emissiveIntensity: .45, transparent: true, opacity: .76, metalness: .25, roughness: .15 })
  const pipeMat = material(THREE.MeshStandardMaterial, { color: '#a2efdd', emissive: '#236356', emissiveIntensity: .65, metalness: .4, roughness: .25 })
  const dim = material(THREE.MeshStandardMaterial, { color: '#254751', metalness: .55, roughness: .45 })
  function tank(x, z, size) {
    const group = new THREE.Group(); group.position.set(x, 0, z); mini.add(group)
    const r = size * .3, h = size
    // The open front reads as a cutaway storage vessel, with a clear water volume.
    mesh(new THREE.CylinderGeometry(r, r, h, 28, 1, true, .55, 4.9), silver, group)
    mesh(new THREE.CylinderGeometry(r * .9, r * .9, h * .59, 24), liquid, group, [0, -h * .19, 0])
    mesh(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), silver, group, [0, h / 2, 0]).scale.y = .35
    for (const y of [-h / 2, h / 2]) {
      const ring = mesh(new THREE.TorusGeometry(r + .01, .023, 8, 32), white, group, [0, y, 0]); ring.rotation.x = Math.PI / 2
    }
    for (const x of [-r * .7, r * .7]) mesh(new THREE.BoxGeometry(.035, .15, .035), silver, group, [x, -h / 2 - .07, 0])
    for (let i = 0; i < 4; i++) mesh(new THREE.SphereGeometry(.019, 8, 6), teal, group, [r + .04, .23 - .15 * i, .09])
  }
  tank(-.83, .16, .97); tank(.24, -.49, .7)
  const membranes = new THREE.Group(); membranes.position.set(.75, .0, .14); mini.add(membranes)
  for (let i = 0; i < 5; i++) {
    mesh(new THREE.CylinderGeometry(.071, .071, .9, 16), white, membranes, [i * .15 - .3, 0, 0])
    for (const y of [-.36, .36]) mesh(new THREE.CylinderGeometry(.08, .08, .035, 12), silver, membranes, [i * .15 - .3, y, 0])
  }
  for (const y of [-.53, .53]) mesh(new THREE.BoxGeometry(.83, .036, .18), silver, membranes, [0, y, 0])
  for (const x of [-.42, .42]) mesh(new THREE.BoxGeometry(.025, 1.1, .025), silver, membranes, [x, 0, 0])
  const pump = new THREE.Group(); pump.position.set(-.12, -.43, .6); mini.add(pump)
  mesh(new THREE.BoxGeometry(.48, .04, .27), silver, pump)
  mesh(new THREE.CylinderGeometry(.115, .115, .28, 16), teal, pump, [-.08, .13, 0]).rotation.z = Math.PI / 2
  mesh(new THREE.SphereGeometry(.12, 16, 12), silver, pump, [.15, .12, 0])
  const paths = []
  function path(points) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal')
    mesh(new THREE.TubeGeometry(curve, 44, .027, 8, false), pipeMat, mini); paths.push(curve)
  }
  path([[-.82,-.36,.18],[-.65,-.43,.56],[-.18,-.35,.6],[.23,-.35,.6],[.75,-.47,.2]])
  path([[.75,.48,.15],[.98,.69,-.03],[.23,.67,-.44],[.24,.4,-.49]])
  path([[.24,-.32,-.49],[-.1,-.58,-.52],[-.88,-.56,-.35],[-1.14,.02,-.27],[-.83,.57,.17]])
  mesh(new THREE.BoxGeometry(2.15, .045, 1.36), dim, mini, [0, -.65, .0])
  const streamMaterial = material(THREE.MeshBasicMaterial, { color: '#baffec', transparent: true, opacity: .8, toneMapped: false })
  const pulses = paths.flatMap((curve, index) => Array.from({ length: 6 }, (_, i) => ({
    curve, offset: i / 6 + index * .12, o: mesh(new THREE.SphereGeometry(.038, 8, 6), streamMaterial, mini),
  })))

  const ribbonGroup = new THREE.Group(); sculpture.add(ribbonGroup)
  const ribbonMat = material(THREE.MeshBasicMaterial, { color: '#69cdb7', transparent: true, opacity: .32, blending: THREE.AdditiveBlending, depthWrite: false })
  const ribbons = []
  for (let j = 0; j < 3; j++) {
    const points = Array.from({ length: 85 }, (_, i) => {
      const a = i / 84 * Math.PI * 2
      return new THREE.Vector3(Math.cos(a) * (2.05 + j * .13), Math.sin(a * 2 + j) * .36 - .25, Math.sin(a) * (1.55 + j * .1))
    })
    const curve = new THREE.CatmullRomCurve3(points, true)
    const o = mesh(new THREE.TubeGeometry(curve, 100, .009, 5, true), ribbonMat, ribbonGroup)
    o.rotation.z = .32 + j * .27; ribbons.push({ curve, o })
  }
  const dropletMaterial = material(THREE.MeshPhysicalMaterial, { color: '#b1f5e0', metalness: .05, roughness: .07, transmission: .8, thickness: .3, ior: 1.333 })
  const droplets = Array.from({ length: 10 }, (_, i) => ({ o: mesh(new THREE.SphereGeometry(.07 + (i % 3) * .025, 16, 12), dropletMaterial, sculpture), a: i * 2.4, radius: 2.0 + i % 3 * .2 }))

  const floorTime = { value: 0 }
  const floorMat = material(THREE.ShaderMaterial, {
    transparent: true, depthWrite: false, uniforms: { uTime: floorTime },
    vertexShader: `varying vec2 vUv; uniform float uTime;
      void main(){vUv=uv;vec3 p=position;p.z+=sin(p.x*2.4+uTime*.36)*.02+sin(p.y*2.2-uTime*.3)*.028;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
    fragmentShader: `varying vec2 vUv;uniform float uTime;
      void main(){vec2 p=(vUv-.5)*14.;float d=length(p);float ring=pow(.5+.5*sin(d*5.5-uTime*.55),8.);
      float caustic=pow(.5+.5*sin(p.x*3.+sin(p.y*2.+uTime*.3)),7.)*pow(.5+.5*sin(p.y*3.3+sin(p.x*1.8-uTime*.3)),5.);
      float mask=exp(-d*.48)*(1.0-smoothstep(3.,7.,d));vec3 c=mix(vec3(.045,.13,.16),vec3(.28,.67,.61),ring*.35+caustic*.5);
      gl_FragColor=vec4(c,mask*.68);}`,
  })
  const floor = mesh(new THREE.PlaneGeometry(14, 14, 38, 38), floorMat, scene, [0, -1.8, 0]); floor.rotation.x = -Math.PI / 2
  const grid = new THREE.GridHelper(8, 28, '#30645f', '#1b403f'); grid.position.y = -1.77; grid.material.transparent = true; grid.material.opacity = .14; scene.add(grid)
  const dustPositions = new Float32Array(180 * 3)
  for (let i = 0; i < 180; i++) { dustPositions[i * 3] = Math.sin(i * 76.12) * 4; dustPositions[i * 3 + 1] = Math.cos(i * 53.4) * 2.6; dustPositions[i * 3 + 2] = Math.sin(i * 14.1) * 3 }
  const dustGeometry = new THREE.BufferGeometry(); geometries.add(dustGeometry); dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
  const dust = new THREE.Points(dustGeometry, material(THREE.PointsMaterial, { color: '#96dcca', size: .014, transparent: true, opacity: .35, depthWrite: false })); scene.add(dust)

  let frame, disposed = false, paused = false, visible = true, elapsed = 0, introTime = intro && !quiet ? 0 : 6, lastStamp = 0, lastDraw = 0, lastPhase = -1, count = 0
  const pointer = new THREE.Vector2(), currentPointer = new THREE.Vector2()
  const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b)
  function resize() {
    if (disposed) return
    const { width, height } = host.getBoundingClientRect(); if (!width || !height) return
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 700 ? 1.15 : 1.5, Math.sqrt(2000000 / (width * height))))
    renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); render()
  }
  function report() {
    const phase = introTime < 1.7 ? 0 : introTime < 3.5 ? 1 : 2
    if (phase !== lastPhase) { lastPhase = phase; onProgress?.({ phase, complete: introTime >= 5.5 }) }
    if (introTime >= 5.5 && host.dataset.intro !== 'complete') { host.dataset.intro = 'complete'; onProgress?.({ phase: 2, complete: true }) }
  }
  function render() {
    const reveal = smooth(.2, 3.6, introTime), connected = smooth(1.5, 4.3, introTime)
    const scale = .35 + reveal * .65
    sculpture.scale.setScalar(scale); sculpture.rotation.y = Math.sin(elapsed * .08) * .1 + currentPointer.x * .08
    sculpture.position.y = .32 + Math.sin(elapsed * .35) * .045
    mini.scale.setScalar(.005 + connected * .995); mini.visible = connected > .03
    waterUniform.value = elapsed; revealUniform.value = reveal; floorTime.value = elapsed
    ribbonGroup.scale.setScalar(.55 + .45 * connected); ribbonGroup.rotation.y = elapsed * .035
    ribbonGroup.visible = reveal > .2
    dust.rotation.y = elapsed * .014
    for (const { curve, offset, o } of pulses) o.position.copy(curve.getPointAt((elapsed * .065 + offset) % 1))
    for (const { o, a, radius } of droplets) {
      const angle = a + elapsed * .045, r = radius + (1 - reveal) * .6
      o.position.set(Math.cos(angle) * r, Math.sin(angle * 1.4) * 1.15, Math.sin(angle) * r * .72)
      o.scale.setScalar(.35 + .65 * (1 - connected * .45))
    }
    camera.position.set(.16 + currentPointer.x * .15, 1.03 + currentPointer.y * .12, 9.5 - reveal * 1.6)
    camera.lookAt(0, -.05, 0); renderer.render(scene, camera)
    report()
  }
  function canRun() { return !disposed && !paused && visible && !document.hidden }
  function stop() { cancelAnimationFrame(frame); frame = 0; lastStamp = 0 }
  function tick(stamp) {
    if (!canRun()) { stop(); return }
    frame = requestAnimationFrame(tick)
    if (stamp - lastDraw < (quiet || host.clientWidth < 700 ? 50 : 33)) return
    const dt = lastStamp ? Math.min((stamp - lastStamp) / 1000, .1) : 0; lastStamp = stamp; lastDraw = stamp
    elapsed += dt * (quiet ? .4 : 1); introTime += dt
    currentPointer.lerp(pointer, .035); render(); count++
    if (count % 20 === 0) renderer.domElement.dataset.frames = String(count)
  }
  function resume() { stop(); if (canRun()) frame = requestAnimationFrame(tick) }
  function move(e) { const r = host.getBoundingClientRect(); pointer.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1)) }
  function leave() { pointer.set(0, 0) }
  function contextLost(e) { e.preventDefault(); stop(); paused = true; onError?.('fallback') }
  const resizer = new ResizeObserver(resize); resizer.observe(host)
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; resume() }); observer.observe(host)
  host.addEventListener('pointermove', move); host.addEventListener('pointerleave', leave)
  document.addEventListener('visibilitychange', resume); renderer.domElement.addEventListener('webglcontextlost', contextLost)
  resize(); resume(); onReady?.()
  return {
    pause(value) { paused = value; resume() },
    quiet(value) { quiet = value; if (value) introTime = 6; render(); resume() },
    skip() { introTime = 6; render() },
    replay() { introTime = 0; lastPhase = -1; host.dataset.intro = 'playing'; paused = false; resume() },
    dive() { shell.scale.setScalar(1.04) },
    dispose() {
      disposed = true; stop(); observer.disconnect(); resizer.disconnect()
      host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave); document.removeEventListener('visibilitychange', resume)
      renderer.domElement.removeEventListener('webglcontextlost', contextLost)
      materials.forEach(m => m.dispose()); geometries.forEach(g => g.dispose()); grid.geometry.dispose(); grid.material.dispose(); environment.dispose()
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove()
    },
  }
}
