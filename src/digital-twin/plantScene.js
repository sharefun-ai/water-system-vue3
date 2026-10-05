import * as THREE from 'three'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js'
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js'
import {CIRCUITS,EQUIPMENT,PIPELINES} from './topology'
import {lineIsActive,isWarning,signalById} from './telemetry'
import {levelFraction,flowPhase} from './display'
import {lampAppearance} from './lamps'
import {fitSceneFrame} from './framing'

const V=(p)=>new THREE.Vector3(...p)
// Rounded orthogonal elbows, rather than splines that overshoot corners.
export function roundedPath(points,radius=.26){
  const pts=points.map(V),path=new THREE.CurvePath();let previous=pts[0]
  for(let i=1;i<pts.length-1;i++){
    const a=pts[i-1],b=pts[i],c=pts[i+1],r=Math.min(radius,a.distanceTo(b)*.28,b.distanceTo(c)*.28)
    const enter=b.clone().add(a.clone().sub(b).normalize().multiplyScalar(r)),exit=b.clone().add(c.clone().sub(b).normalize().multiplyScalar(r))
    if(previous.distanceTo(enter)>.001)path.add(new THREE.LineCurve3(previous,enter))
    path.add(new THREE.QuadraticBezierCurve3(enter,b,exit));previous=exit
  }
  path.add(new THREE.LineCurve3(previous,pts.at(-1)));return path
}

export function createPlantScene(host,{onSelect,onLabels=()=>{},onReady,onError,manual=false}){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#0b131e')
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:manual,preserveDrawingBuffer:!manual})
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap
  host.appendChild(renderer.domElement)
  renderer.domElement.setAttribute('aria-label','互動水系統 3D 模型，可使用設備清單選取元件')
  const camera=new THREE.OrthographicCamera(-20,20,14,-14,.1,180)
  camera.position.set(25,32,36)
  const controls=new OrbitControls(camera,renderer.domElement)
  controls.target.set(0,1,0);controls.enableDamping=true;controls.dampingFactor=.09
  controls.minZoom=.55;controls.maxZoom=4;controls.minPolarAngle=.08;controls.maxPolarAngle=Math.PI*.48
  controls.update();controls.saveState()
  if(manual)controls.enabled=false
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04)
  scene.environment=environment.texture;room.dispose();pmrem.dispose()
  scene.add(new THREE.HemisphereLight('#bfd5ee','#111b27',2.2))
  const sun=new THREE.DirectionalLight('#eef6ff',3.5);sun.position.set(-9,26,12);sun.castShadow=true
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-25,right:25,top:20,bottom:-20,near:.5,far:80});sun.shadow.bias=-.0015
  scene.add(sun)
  const rim=new THREE.DirectionalLight('#7ecbd9',2);rim.position.set(13,8,-14);scene.add(rim)
  const plant=new THREE.Group();plant.name='Aquatec_SCADA_3D';scene.add(plant)
  const mats={
    steel:new THREE.MeshStandardMaterial({color:'#b7c5d0',metalness:.82,roughness:.28}),
    dark:new THREE.MeshStandardMaterial({color:'#1b2a37',metalness:.68,roughness:.45}),
    bolts:new THREE.MeshStandardMaterial({color:'#8b9caf',metalness:.9,roughness:.24}),
    base:new THREE.MeshStandardMaterial({color:'#172635',metalness:.34,roughness:.66}),
    black:new THREE.MeshStandardMaterial({color:'#0c1620',metalness:.3,roughness:.75}),
  }
  const equipment=new Map(),pipes=[],pickables=[],labels=[],indicators=[],geometries=new Set(),materials=new Set(Object.values(mats)),textures=new Set()
  let currentValues={},currentUsable=true,cutaway=true,motion=true,allTags=true,selected=null,lastFrameTime=0,flowTime=0,frameId,disposed=false,view='iso'
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');let reduceMotion=reduced.matches
  const onReduced=(e)=>reduceMotion=e.matches;reduced.addEventListener('change',onReduced)
  function material(options){const m=new THREE.MeshStandardMaterial(options);materials.add(m);return m}
  function mesh(group,geometry,mat,position=[0,0,0],rotation){geometries.add(geometry);const m=new THREE.Mesh(geometry,mat);m.position.copy(V(position));if(rotation)m.rotation.set(...rotation);m.castShadow=true;m.receiveShadow=true;group.add(m);return m}
  const box=(g,size,pos,mat=mats.dark)=>mesh(g,new THREE.BoxGeometry(...size),mat,pos)
  const cylinder=(g,r,h,pos,mat=mats.steel,rot)=>mesh(g,new THREE.CylinderGeometry(r,r,h,28),mat,pos,rot)
  const sphere=(g,r,pos,mat)=>mesh(g,new THREE.SphereGeometry(r,18,12),mat,pos)
  function ring(g,r,tube,pos,mat=mats.steel,rot=[Math.PI/2,0,0]){return mesh(g,new THREE.TorusGeometry(r,tube,8,36),mat,pos,rot)}
  const lightCanvas=document.createElement('canvas');lightCanvas.width=64;lightCanvas.height=64
  const lightContext=lightCanvas.getContext('2d'),lightGradient=lightContext.createRadialGradient(32,32,3,32,32,32)
  lightGradient.addColorStop(0,'rgba(143,255,210,.7)');lightGradient.addColorStop(.3,'rgba(96,238,177,.25)');lightGradient.addColorStop(1,'rgba(96,238,177,0)');lightContext.fillStyle=lightGradient;lightContext.fillRect(0,0,64,64)
  const lightTexture=new THREE.CanvasTexture(lightCanvas);textures.add(lightTexture)
  function lamp(g,pos,id,radius=.18){
    const fixture=new THREE.Group();fixture.name=`INDICATOR_${id}`;fixture.position.copy(V(pos));fixture.userData={signalId:id,component:'industrial-indicator',state:'unknown'};g.add(fixture)
    cylinder(fixture,radius*.56,.22,[0,-.12,0],mats.dark)
    cylinder(fixture,radius*1.25,.10,[0,0,0],mats.steel)
    const lensMat=new THREE.MeshBasicMaterial({color:'#344551',toneMapped:false});materials.add(lensMat)
    const lens=cylinder(fixture,radius,.20,[0,.14,0],lensMat);lens.name=`LED_${id}`;lens.userData={signalId:id,component:'indicator-lens'}
    sphere(fixture,radius,[0,.24,0],lensMat).scale.y=.42
    const clear=material({color:'#b5e5de',transparent:true,opacity:.06,roughness:.35,metalness:.02,envMapIntensity:.1,depthWrite:false})
    cylinder(fixture,radius*1.1,.25,[0,.15,0],clear).castShadow=false
    const glowMat=new THREE.MeshBasicMaterial({map:lightTexture,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});materials.add(glowMat)
    const aura=mesh(fixture,new THREE.PlaneGeometry(radius*6,radius*6),glowMat,[0,.18,0]);aura.castShadow=false
    lens.aura=aura;lens.fixture=fixture;indicators.push(lens);return lens
  }
  function foundation(g,sx,sz){box(g,[sx,.20,sz],[0,.13,0],mats.base);for(const x of [-sx*.4,sx*.4])for(const z of [-sz*.38,sz*.38])cylinder(g,.07,.08,[x,.28,z],mats.bolts)}
  function flange(g,r,y){cylinder(g,r+.1,.1,[0,y,0],mats.steel);for(let i=0;i<10;i++){const a=i*Math.PI*.2;cylinder(g,.045,.045,[Math.cos(a)*(r+.04),y+.065,Math.sin(a)*(r+.04)],mats.bolts)}}
  function tagPlate(g,text,pos,width=1.1){
    const c=document.createElement('canvas');c.width=256;c.height=80;const ctx=c.getContext('2d')
    ctx.fillStyle='#112432';ctx.fillRect(0,0,256,80);ctx.strokeStyle='#557b8c';ctx.lineWidth=4;ctx.strokeRect(2,2,252,76)
    ctx.fillStyle='#e5f1fa';ctx.textAlign='center';ctx.font='600 32px monospace';ctx.fillText(text,128,51)
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;textures.add(texture)
    const mat=new THREE.MeshBasicMaterial({map:texture});materials.add(mat)
    const plate=mesh(g,new THREE.PlaneGeometry(width,width*.3125),mat,pos);plate.visible=!manual;return plate
  }
  function tank(e,g){
    const r=e.radius,h=e.height,color=CIRCUITS[e.circuit].color;foundation(g,r*2.6,r*2.6)
    const shell=material({color:'#a8ccdb',metalness:.12,roughness:.34,transparent:true,opacity:.11,depthWrite:false,side:THREE.FrontSide})
    const shellMesh=cylinder(g,r,h,[0,h/2+.45,0],shell)
    flange(g,r,.45);flange(g,r,h+.45)
    for(const y of [.9,h*.55,h+.2])ring(g,r+.025,.04,[0,y,0])
    mesh(g,new THREE.SphereGeometry(r,32,12,0,Math.PI*2,0,Math.PI/2),mats.steel,[0,h+.45,0]).scale.y=.28
    cylinder(g,.22,.25,[0,h+.78,0]);cylinder(g,.28,.05,[0,h+.92,0])
    for(const x of [-r*.65,r*.65])for(const z of [-r*.65,r*.65])cylinder(g,.08,.45,[x,.38,z],mats.dark)
    // Ladder and liquid level sight tube are separate meshes.
    for(const x of [-.22,.22])cylinder(g,.025,h,[x,h/2+.4,r+.15],mats.steel)
    for(let y=.55;y<h+.3;y+=.3)cylinder(g,.022,.44,[0,y,r+.15],mats.steel,[0,0,Math.PI/2])
    const waterMat=material({color,emissive:color,emissiveIntensity:.38,metalness:.05,roughness:.28,transparent:true,opacity:.88})
    const liquid=cylinder(g,r*.93,1,[0,.55,0],waterMat);liquid.castShadow=false
    const surface=mesh(g,new THREE.CircleGeometry(r*.93,48),waterMat,[0,.6,0],[-Math.PI/2,0,0]);surface.castShadow=false
    tagPlate(g,e.tag,[0,2.0,r+.05],1)
    box(g,[.44,h*.9,.30],[r+.30,h/2+.5,.30],mats.dark)
    const levelLamps=e.signals.slice(1).map((id,i)=>{const y=h+.04-i*.60;tagPlate(g,({120:'HH',121:'H',157:'M',122:'L',123:'LL',138:'HH',139:'H',158:'M',140:'L'})[id],[r+.69,y,.55],.42);return {id,mesh:lamp(g,[r+.30,y,.40],id,.16)}})
    return {shell:shellMesh,liquid,surface,levelLamps,labelHeight:h+1.3}
  }
  function chemicalTank(e,g){
    const r=e.radius,h=e.height;foundation(g,2.3,2.3)
    const polymer=material({color:'#445b80',metalness:.22,roughness:.3})
    cylinder(g,r,h,[0,h/2+.38,0],polymer)
    const lid=mesh(g,new THREE.SphereGeometry(r,28,12,0,Math.PI*2,0,Math.PI/2),polymer,[0,h+.38,0]);lid.scale.y=.34
    for(const y of [.6,1.25,1.85,2.5])ring(g,r+.01,.035,[0,y,0],mats.steel)
    cylinder(g,.20,.2,[0,h+.7,0],mats.dark);cylinder(g,.26,.06,[0,h+.84,0],mats.dark)
    tagPlate(g,e.tag,[0,1.7,r+.04],1.1)
    const caution=material({color:'#d6b65d',metalness:.1,roughness:.65});box(g,[.45,.12,.02],[0,.85,r+.04],caution)
    return {labelHeight:h+1.25}
  }
  function pump(e,g){
    const h=CIRCUITS[e.circuit].height,raised=h-.62;foundation(g,2.05,1.15)
    const skid=new THREE.Group();skid.position.y=raised;g.add(skid)
    for(const x of [-.8,.8])for(const z of [-.35,.35])cylinder(g,.04,Math.max(.1,raised),[x,raised/2+.23,z],mats.dark)
    box(skid,[1.9,.13,.88],[0,.28,0],mats.dark)
    const paint=material({color:'#367282',metalness:.5,roughness:.34})
    cylinder(skid,.30,.8,[-.42,.61,0],paint,[0,0,Math.PI/2])
    for(let x=-.8;x<-.12;x+=.1)cylinder(skid,.325,.035,[x,.61,0],mats.dark,[0,0,Math.PI/2])
    box(skid,[.3,.2,.24],[-.4,.96,0],paint)
    cylinder(skid,.34,.3,[.40,.62,0],mats.steel,[0,0,Math.PI/2]);cylinder(skid,.17,.32,[.4,.91,0],mats.steel)
    cylinder(skid,.2,.08,[.4,1.1,0],mats.steel)
    cylinder(skid,.1,.35,[0,.62,0],mats.bolts,[0,0,Math.PI/2])
    const rotor=new THREE.Group();rotor.position.set(-.9,.61,0);skid.add(rotor)
    for(let i=0;i<6;i++){const fin=box(rotor,[.025,.44,.025],[0,0,0],mats.steel);fin.rotation.x=i*Math.PI/3}
    const stateLamp=lamp(skid,[-.4,1.40,0],e.signalId,.20);tagPlate(skid,e.tag,[0,.37,.47],1.15)
    return {rotor,stateLamp,labelHeight:h+1.48}
  }
  function valve(e,g){
    const body=new THREE.Group();body.position.y=e.pipeHeight;body.rotation.y=e.vertical?Math.PI/2:0;g.add(body)
    cylinder(body,.19,.65,[0,0,0],mats.steel,[0,0,Math.PI/2])
    for(const x of [-.3,.3])cylinder(body,.27,.07,[x,0,0],mats.steel,[0,0,Math.PI/2])
    sphere(body,.24,[0,0,0],mats.dark);cylinder(body,.055,.44,[0,.25,0],mats.steel)
    box(body,[.42,.27,.36],[0,.6,0],mats.dark)
    const handle=box(body,[.37,.045,.08],[0,.79,0],mats.bolts),stateLamp=lamp(body,[0,1.18,0],e.signalId,.18)
    tagPlate(body,e.tag,[0,.56,.19],.45)
    return {handle,stateLamp,labelHeight:e.pipeHeight+1.86}
  }
  function instrument(e,g){
    const h=e.pipeHeight;cylinder(g,.05,.50,[0,h+.24,0],mats.steel)
    if(e.signalId===101){
      const blue=material({color:'#389cb7',metalness:.5,roughness:.3})
      cylinder(g,.28,.78,[0,.71,0],blue)
      const head=sphere(g,.28,[0,1.1,0],blue);head.scale.y=.36
      for(const x of [-.19,.19])for(const z of [-.19,.19])cylinder(g,.025,.35,[x,.23,z],mats.dark)
      ring(g,.29,.025,[0,.43,0]);ring(g,.29,.025,[0,1.05,0])
    }
    const housing=cylinder(g,.22,.18,[0,h+.59,0],mats.steel,[Math.PI/2,0,0])
    const c=document.createElement('canvas');c.width=128;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#e3ebef';ctx.beginPath();ctx.arc(64,64,60,0,Math.PI*2);ctx.fill()
    ctx.strokeStyle='#223544';for(let i=0;i<11;i++){const a=2.5+i*.43;ctx.beginPath();ctx.moveTo(64+Math.cos(a)*45,64+Math.sin(a)*45);ctx.lineTo(64+Math.cos(a)*52,64+Math.sin(a)*52);ctx.stroke()}
    ctx.fillStyle='#203a49';ctx.font='bold 20px monospace';ctx.textAlign='center';ctx.fillText(e.tag,64,85)
    const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;textures.add(tx)
    const faceMat=new THREE.MeshBasicMaterial({map:tx});materials.add(faceMat);mesh(g,new THREE.CircleGeometry(.195,24),faceMat,[0,h+.59,.10])
    const needle=box(g,[.018,.15,.015],[0,h+.63,.12],mats.dark)
    return {housing,needle,labelHeight:h+1.10}
  }
  function membrane(e,g){
    foundation(g,3.15,7.8)
    for(const x of [-1.25,1.25])for(const z of [-3.3,3.3])box(g,[.11,4.6,.11],[x,2.5,z],mats.steel)
    for(const y of [.48,4.65])for(const x of [-1.25,1.25])box(g,[.12,.12,6.7],[x,y,0],mats.steel)
    const white=material({color:'#d2dde0',metalness:.33,roughness:.27})
    for(let i=0;i<6;i++){
      const z=-2.7+i*1.07;cylinder(g,.40,3.6,[0,2.5,z],white)
      for(const y of [.8,4.15]){cylinder(g,.45,.12,[0,y,z],mats.dark);cylinder(g,.28,.3,[0,y+(y>2?.2:-.2),z],mats.steel)}
      ring(g,.406,.022,[0,2.5,z],mats.bolts)
    }
    for(const y of [.55,4.45])cylinder(g,.13,6.7,[0,y,0],mats.steel,[Math.PI/2,0,0])
    tagPlate(g,'ULTRAFILTRATION',[0,2.45,3.46],2.6)
    return {labelHeight:5.2}
  }
  // Precision machine deck, anchor bolts, soft shadows, understated coordinate grid.
  box(plant,[34,.35,22],[0,-.15,0],mats.base)
  const deck=mesh(plant,new THREE.PlaneGeometry(34,22),material({color:'#142330',roughness:.85,metalness:.2}),[0,.035,0],[-Math.PI/2,0,0]);deck.receiveShadow=true
  const grid=new THREE.GridHelper(32,32,'#3c5469','#253a4c');grid.position.y=.05;grid.material.transparent=true;grid.material.opacity=.45;plant.add(grid)
  for(const x of [-16.55,16.55])box(plant,[.06,.04,21],[x,.1,0],mats.bolts)
  for(const z of [-10.55,10.55])box(plant,[33,.04,.06],[0,.1,z],mats.bolts)
  for(const e of EQUIPMENT){
    const g=new THREE.Group();g.name=`${e.tag} — ${e.name}`;g.position.copy(V(e.position));g.userData={equipmentId:e.id,signals:e.signals,tag:e.tag,circuit:e.circuit}
    plant.add(g);const details=({tank,chemicalTank,pump,valve,instrument,membrane}[e.type])(e,g)
    g.traverse(obj=>{if(obj.isMesh){obj.userData.equipmentId=e.id;pickables.push(obj)}})
    equipment.set(e.id,{...details,group:g,definition:e})
    const name=e.type==='instrument'?signalById[e.signalId].label:e.name
    const bounds=['tank','chemicalTank','membrane'].includes(e.type)?new THREE.Box3().setFromObject(g):null,corners=[]
    if(bounds)for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])corners.push(new THREE.Vector3(x,y,z))
    labels.push({id:e.id,tag:e.tag,name:name===e.tag?'':name,type:e.type,circuit:e.circuit,position:g.position.clone().add(new THREE.Vector3(0,details.labelHeight-.35,0)),corners})
  }
  for(const line of PIPELINES){
    const path=roundedPath(line.points),length=path.getLength(),color=CIRCUITS[line.circuit].color
    const shellMat=material({color:new THREE.Color(color).lerp(new THREE.Color('#5b6977'),.62),metalness:.65,roughness:.35})
    const tube=mesh(plant,new THREE.TubeGeometry(path,Math.max(24,Math.ceil(length*5)),.115,8,false),shellMat);tube.name=`PIPE_${line.id}`
    tube.userData={pipelineId:line.id,circuit:line.circuit,gates:line.gates||[],pumpSignals:line.anyPumps||[],flowSignal:line.flowId||null}
    const flowMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:{value:0},uSpeed:{value:.45},uActive:{value:0},uLength:{value:length},uColor:{value:new THREE.Color(color)}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv;uniform float uTime,uSpeed,uActive,uLength;uniform vec3 uColor;void main(){float dash=step(.72,fract(vUv.x*uLength*.72-uTime*uSpeed));float rim=pow(abs(sin(vUv.y*6.28318)),2.0);gl_FragColor=vec4(uColor*(.65+dash*.8),uActive*(.35+.6*dash)*(.35+.65*rim));}'});materials.add(flowMat)
    const flow=mesh(plant,new THREE.TubeGeometry(path,Math.max(24,Math.ceil(length*5)),.127,8,false),flowMat);flow.castShadow=false;flow.name=`FLOW_${line.id}`
    // Flanged couplings at endpoints and sparse supports along long runs.
    for(const t of [0,1]){
      const pos=path.getPointAt(t),fl=ring(plant,.15,.037,pos.toArray(),mats.bolts,[0,0,0]);fl.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),path.getTangentAt(t).normalize())
    }
    if(length>7)for(let i=1;i<Math.floor(length/5);i++){const p=path.getPointAt(i/Math.floor(length/5));if(p.y>.3){cylinder(plant,.03,p.y-.14,[p.x,p.y/2,p.z],mats.dark);box(plant,[.33,.04,.33],[p.x,.14,p.z],mats.bolts)}}
    // Travelling pearls remain a direction cue even on a stopped/historical branch.
    // The actual valve and pump lamps always retain their own measured state.
    const pearlMat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.6,depthWrite:false});materials.add(pearlMat)
    const pearlGeometry=new THREE.SphereGeometry(.14,8,6);geometries.add(pearlGeometry)
    const pearls=Array.from({length:Math.max(2,Math.ceil(length/2.8))},(_,i)=>{const m=new THREE.Mesh(pearlGeometry,pearlMat);m.name=`DIRECTION_${line.id}_${i}`;plant.add(m);return m})
    pipes.push({line,tube,flow,shellMat,flowMat,path,length,pearls,pearlMat})
  }
  // Instrument impulse lines attach offset instrument positions to the pipe.
  for(const e of EQUIPMENT.filter(e=>e.type==='instrument')){
    const anchor=V(e.position).setY(e.pipeHeight),candidates=PIPELINES.filter(p=>p.circuit===(e.signalId===102?'feed':e.circuit))
    let nearest=null,distance=Infinity
    for(const p of candidates)for(let i=0;i<p.points.length-1;i++){
      const a=V(p.points[i]),b=V(p.points[i+1]),ab=b.clone().sub(a),t=THREE.MathUtils.clamp(anchor.clone().sub(a).dot(ab)/ab.lengthSq(),0,1),point=a.clone().addScaledVector(ab,t),d=point.distanceTo(anchor)
      if(d<distance){distance=d;nearest=point}
    }
    if(nearest&&distance>.04){const points=[nearest.toArray(),[anchor.x,nearest.y,anchor.z],anchor.toArray()].filter((p,i,a)=>i===0||V(p).distanceTo(V(a[i-1]))>.001);const path=roundedPath(points,.12);mesh(plant,new THREE.TubeGeometry(path,12,.045,6,false),mats.bolts).name=`INSTRUMENT_TAP_${e.tag}`}
  }
  // Explicit risers join nominated shared endpoints between elevation decks.
  for(const [u,v,a,b] of [[.035,.07,1.15,2.8],[.035,.2,1.15,2.8],[.74,.625,1.7,2.8],[.70,.24,1.7,2.25],[.865,.14,2.25,2.8],[.865,.725,1,2.8],[.9,.325,1.15,1.7],[.96,.23,1.15,2.25],[.50,.505,2.25,2.8]]){
    const x=(u-.5)*32,z=(v-.5)*20;cylinder(plant,.115,b-a,[x,(a+b)/2,z],mats.bolts)
  }
  const haloMaterial=material({color:'#a4f6e3',emissive:'#71dfc3',emissiveIntensity:1.4,transparent:true,opacity:.7,depthWrite:false})
  const halo=ring(plant,1.05,.028,[0,.16,0],haloMaterial);halo.visible=false
  const haloOuter=ring(plant,1.05,.014,[0,.17,0],haloMaterial.clone());materials.add(haloOuter.material);haloOuter.visible=false
  const glowCanvas=document.createElement('canvas');glowCanvas.width=128;glowCanvas.height=128
  const glowContext=glowCanvas.getContext('2d'),gradient=glowContext.createRadialGradient(64,64,8,64,64,64)
  gradient.addColorStop(0,'rgba(107,230,195,.32)');gradient.addColorStop(.55,'rgba(107,230,195,.12)');gradient.addColorStop(1,'rgba(107,230,195,0)');glowContext.fillStyle=gradient;glowContext.fillRect(0,0,128,128)
  const glowTexture=new THREE.CanvasTexture(glowCanvas);textures.add(glowTexture)
  const glowMaterial=new THREE.MeshBasicMaterial({map:glowTexture,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});materials.add(glowMaterial)
  const glow=mesh(plant,new THREE.PlaneGeometry(5,5),glowMaterial,[0,.18,0],[-Math.PI/2,0,0]);glow.visible=false;glow.castShadow=false
  let haloScale=1;const highlighted=[]
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=[0,0]
  function hit(event){const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(pickables,false).find(h=>h.object.visible&&equipment.get(h.object.userData.equipmentId)?.group.visible)}
  const pointerDown=e=>{down=[e.clientX,e.clientY]},pointerUp=e=>{if(Math.hypot(e.clientX-down[0],e.clientY-down[1])<6){const h=hit(e);if(h)onSelect(h.object.userData.equipmentId)}}
  const pointerMove=e=>{renderer.domElement.style.cursor=hit(e)?'pointer':'grab'}
  if(!manual){renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('pointermove',pointerMove)}
  const contextLost=e=>{e.preventDefault();onError('3D 顯示連線中斷，請重新載入；仍可查看右側數據。')}
  renderer.domElement.addEventListener('webglcontextlost',contextLost)
  const framingPoints=[...[-17,17].flatMap(x=>[-11,11].map(z=>new THREE.Vector3(x,0,z))),...labels.flatMap(l=>l.corners.length?l.corners:[l.position])]
  const framingTarget=new THREE.Vector3(0,1,0)
  let frameRight=0,frameBottom=0,targetRight=0,targetBottom=0,needsFrame=false
  function frameCamera(){
    const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return
    if(manual){const half=Math.max(13.4,19*h/w);Object.assign(camera,{left:-half*w/h,right:half*w/h,top:half,bottom:-half})}
    else{const rotation=camera.quaternion.clone().invert(),projected=framingPoints.map(p=>{const q=p.clone().sub(framingTarget).applyQuaternion(rotation);return[q.x,q.y]});Object.assign(camera,fitSceneFrame(w,h,projected,{right:frameRight,bottom:frameBottom}))}
    camera.updateProjectionMatrix()
  }
  function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);frameCamera()}
  const observer=new ResizeObserver(resize);observer.observe(host);resize()
  const desiredPosition=new THREE.Vector3(),desiredTarget=new THREE.Vector3();let transition=false
  function setView(next){view=next;desiredTarget.set(0,1,0);desiredPosition.copy(next==='top'?new THREE.Vector3(0,50,.01):next==='front'?new THREE.Vector3(0,17,48):new THREE.Vector3(25,32,36));transition=true;needsFrame=true;camera.zoom=1;camera.updateProjectionMatrix()}
  function focus(id){const e=equipment.get(id);if(!e)return;desiredTarget.copy(e.group.position).add(new THREE.Vector3(0,1.3,0));desiredPosition.copy(desiredTarget).add(new THREE.Vector3(14,18,20));transition=true;camera.zoom=Math.min(host.clientWidth,host.clientHeight)<500?2.8:1.7;camera.updateProjectionMatrix()}
  function select(id){
    for(const h of highlighted){h.mesh.material=h.original;h.overlay.dispose();materials.delete(h.overlay)}highlighted.length=0
    selected=id;const e=equipment.get(id);halo.visible=haloOuter.visible=glow.visible=!!e
    if(e){haloScale=e.definition.type==='tank'?1.5:e.definition.type==='membrane'?2.7:.8
      for(const m of [halo,haloOuter,glow])m.position.set(e.group.position.x,.2,e.group.position.z)
      glow.scale.setScalar(haloScale*.8)
      e.group.traverse(m=>{if(m.isMesh&&m.material.isMeshStandardMaterial&&[mats.steel,mats.dark,mats.bolts,mats.base].includes(m.material)){const original=m.material,overlay=original.clone();overlay.emissive.set('#65d9bc');overlay.emissiveIntensity=.15;materials.add(overlay);m.material=overlay;highlighted.push({mesh:m,original,overlay})}})
    }
  }
  function update(values,{usable=true,cutaway:nextCut=true,motion:nextMotion=true,allTags:nextTags=true}={}){currentValues=values;currentUsable=usable;cutaway=nextCut;motion=nextMotion;allTags=nextTags}
  function updateLamp(l,value){
    if(!l)return;const state=lampAppearance(value)
    l.material.color.set(state.color);if(l.material.emissive){l.material.emissive.set(state.emissive);l.material.emissiveIntensity=state.intensity}
    l.aura.material.opacity=state.glow;l.fixture.userData.state=state.state
    const parentQuaternion=l.aura.parent.getWorldQuaternion(new THREE.Quaternion()).invert();l.aura.quaternion.copy(parentQuaternion.multiply(camera.quaternion))
  }
  let lastLabelTime=0,lastLabelKey='',sceneVisible=true
  function render(time){
    if(disposed)return;frameId=requestAnimationFrame(render)
    if(document.hidden||!sceneVisible)return
    const dt=Math.min((time-lastFrameTime)/1000,.05);lastFrameTime=time
    if(motion)flowTime+=dt
    if(transition&&reduceMotion){camera.position.copy(desiredPosition);controls.target.copy(desiredTarget);transition=false}
    if(transition){camera.position.lerp(desiredPosition,.1);controls.target.lerp(desiredTarget,.1);if(camera.position.distanceTo(desiredPosition)<.04)transition=false}
    controls.update()
    if(Math.abs(frameRight-targetRight)>.5||Math.abs(frameBottom-targetBottom)>.5){frameRight=reduceMotion?targetRight:THREE.MathUtils.lerp(frameRight,targetRight,.12);frameBottom=reduceMotion?targetBottom:THREE.MathUtils.lerp(frameBottom,targetBottom,.12);frameCamera()}
    else if(frameRight!==targetRight||frameBottom!==targetBottom||needsFrame&&!transition){frameRight=targetRight;frameBottom=targetBottom;frameCamera();if(!transition)needsFrame=false}
    for(const e of equipment.values()){
      const def=e.definition,value=currentValues[def.signalId],warn=def.signals.some(id=>isWarning(id,currentValues[id]))
      if(e.stateLamp)updateLamp(e.stateLamp,value)
      if(e.rotor&&value===1&&motion&&currentUsable)e.rotor.rotation.x+=dt*12
      if(e.handle)e.handle.rotation.y=THREE.MathUtils.lerp(e.handle.rotation.y,value===1?Math.PI/2:0,.12)
      if(e.needle){e.needle.visible=value!==null&&value!==undefined;e.needle.rotation.z=-(value??0)/12*2.2+.8}
      if(e.shell)e.shell.material.opacity=cutaway?.10:1
      if(e.liquid){
        const level=currentValues[def.levelId],fraction=levelFraction(level,def.visualRange),height=Math.max(.01,(fraction||0)*(def.height-.12))
        e.liquid.visible=level!==null&&level!==undefined;e.surface.visible=e.liquid.visible
        e.liquid.scale.y=THREE.MathUtils.lerp(e.liquid.scale.y,height,.07);e.liquid.position.y=.48+e.liquid.scale.y/2;e.surface.position.y=.49+e.liquid.scale.y
        e.liquid.material.color.set(CIRCUITS[def.circuit].color)
        e.surface.material.emissiveIntensity=.32+(motion?Math.sin(flowTime*1.4)*.06:0)
        for(const s of e.levelLamps)updateLamp(s.mesh,currentValues[s.id])
      }
    }
    for(const p of pipes){
      const active=currentUsable&&lineIsActive(p.line,currentValues),speed=p.line.flowId?Math.min(1.8,Math.max(.55,(currentValues[p.line.flowId]||0)/85)):.85
      p.flowMat.uniforms.uActive.value=active?1:.28;p.flowMat.uniforms.uTime.value=flowTime;p.flowMat.uniforms.uSpeed.value=speed
      p.shellMat.emissive.set(CIRCUITS[p.line.circuit].color);p.shellMat.emissiveIntensity=active?.20:.045;p.pearlMat.opacity=active?.95:.48
      const phase=flowPhase(flowTime,p.length,speed*1.6)
      p.pearls.forEach((m,i)=>m.position.copy(p.path.getPointAt((phase+i/p.pearls.length)%1)))
    }
    const breathe=!motion?0:(Math.sin(flowTime*2.1)+1)/2
    halo.scale.setScalar(haloScale*(1+breathe*.07));haloOuter.scale.setScalar(haloScale*(1.12+breathe*.10));haloOuter.material.opacity=.28+breathe*.18;glow.material.opacity=.55+breathe*.2
    for(const h of highlighted)h.overlay.emissiveIntensity=.12+breathe*.12
    renderer.render(scene,camera)
    if(time-lastLabelTime>33){
      lastLabelTime=time;const w=host.clientWidth,h=host.clientHeight
      const key=[...camera.position.toArray(),...camera.quaternion.toArray(),camera.zoom,camera.left,camera.top,w,h,selected,allTags].join(',')
      if(key!==lastLabelKey){lastLabelKey=key;onLabels(labels.map(l=>{
        const p=l.position.clone().project(camera),points=l.corners.map(c=>{const q=c.clone().project(camera);return [(q.x+1)*w/2,(1-q.y)*h/2]})
        const body=points.length?{x:Math.min(...points.map(c=>c[0])),y:Math.min(...points.map(c=>c[1])),w:Math.max(...points.map(c=>c[0]))-Math.min(...points.map(c=>c[0])),h:Math.max(...points.map(c=>c[1]))-Math.min(...points.map(c=>c[1]))}:null
        return {id:l.id,tag:l.tag,name:l.name,type:l.type,circuit:l.circuit,body,x:(p.x+1)*w/2,y:(1-p.y)*h/2,visible:(allTags||selected===l.id)&&p.z>-1&&p.z<1&&Math.abs(p.x)<.99&&Math.abs(p.y)<.97}
      }))}
    }
  }

  if(!manual)frameId=requestAnimationFrame(render);onReady?.({equipment:EQUIPMENT.length,pipes:PIPELINES.length})
  return {
    update,setView,focus,select,
    setWorkspaceInsets({right=0,bottom=0}={}){targetRight=right;targetBottom=bottom},
    // The homepage shares the exact SCADA geometry and topology with its own film clock.
    presentation:manual?{scene,renderer,camera,plant,equipment,pipes,mats,grid,indicators}:null,
    setVisible(visible){sceneVisible=visible},
    zoom(delta){camera.zoom=THREE.MathUtils.clamp(camera.zoom*delta,.55,4);camera.updateProjectionMatrix()},
    async exportModel(){
      const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js');const clone=plant.clone(true);clone.traverse(o=>{if(o.isMesh&&o.material.isShaderMaterial)o.material=new THREE.MeshStandardMaterial({color:o.material.uniforms.uColor.value,transparent:true,opacity:.4})})
      const file=await new GLTFExporter().parseAsync(clone,{binary:true});return new Blob([file],{type:'model/gltf-binary'})
    },
    screenshot(){renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png')},
    dispose(){disposed=true;cancelAnimationFrame(frameId);observer.disconnect();controls.dispose();reduced.removeEventListener('change',onReduced);renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);renderer.domElement.removeEventListener('pointermove',pointerMove);renderer.domElement.removeEventListener('webglcontextlost',contextLost);for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const tx of textures)tx.dispose();grid.geometry.dispose();grid.material.dispose();environment.dispose();renderer.dispose();renderer.domElement.remove()},
  }
}
