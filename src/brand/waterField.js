import * as THREE from 'three'
import { CALM_WATER_FRAGMENT, createCalmWaterPainter } from './calmWater.js'
import { EQUIPMENT, PIPELINES } from '../digital-twin/topology.js'
import { createIntroWordmark, dropFall, introDuration, INTRO_FRAGMENT, INTRO_DROP_START, INTRO_SLOW_START, INTRO_SLOW_END, INTRO_IMPACT } from './waterIntro.js'
import { createWaterReadyGate } from './waterReadiness.js'

const QUAD_VERTEX=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`
const WAVE_STEP=`precision highp float;
varying vec2 vUv;uniform sampler2D state;uniform vec2 texel;uniform float aspect;uniform vec4 drops[8];uniform int dropCount;
void main(){
 vec2 previous=texture2D(state,vUv).rg;
 float neighbours=texture2D(state,vUv+vec2(texel.x,0.)).r+texture2D(state,vUv-vec2(texel.x,0.)).r+texture2D(state,vUv+vec2(0.,texel.y)).r+texture2D(state,vUv-vec2(0.,texel.y)).r;
 float height=(2.*previous.r-previous.g+.47*(neighbours-4.*previous.r))*.995;
 for(int i=0;i<8;i++){if(i>=dropCount)break;vec2 p=(vUv-drops[i].xy)*vec2(aspect,1.);float q=dot(p,p)/(drops[i].z*drops[i].z);height-=drops[i].w*(1.-q)*exp(-q);}
 float edge=min(min(vUv.x,1.-vUv.x)*aspect,min(vUv.y,1.-vUv.y));height*=smoothstep(0.,.018,edge);
 gl_FragColor=vec4(clamp(height,-1.5,1.5),previous.r,0.,1.);
}`
const WATER_FRAGMENT=`precision highp float;
varying vec2 vUv;uniform sampler2D field;uniform vec2 resolution;uniform vec2 texel;
uniform float clock;uniform float ambientClock;uniform float simulated;uniform float energy;uniform float entering;uniform float waveSpeed;uniform vec4 touches[8];
${CALM_WATER_FRAGMENT}
${INTRO_FRAGMENT}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
float fallbackHeight(vec2 p){float h=0.;for(int i=0;i<8;i++){float age=clock-touches[i].z;if(age<0.||age>11.)continue;float d=length(p-touches[i].xy),front=d-age*waveSpeed;float envelope=exp(-front*front/.014)*exp(-age*.37)*touches[i].w;h+=sin(front*72.)*envelope*.09;}return h;}
void main(){
 float aspect=resolution.x/resolution.y;vec2 p=vUv*vec2(aspect,1.),grad=vec2(0.);float h=0.;
 if(simulated>.5){h=texture2D(field,vUv).r;grad=vec2(texture2D(field,vUv+vec2(texel.x,0.)).r-texture2D(field,vUv-vec2(texel.x,0.)).r,texture2D(field,vUv+vec2(0.,texel.y)).r-texture2D(field,vUv-vec2(0.,texel.y)).r)*2.7;}
 else{h=fallbackHeight(p);grad=vec2(fallbackHeight(p+vec2(.003,0.))-fallbackHeight(p-vec2(.003,0.)),fallbackHeight(p+vec2(0.,.003))-fallbackHeight(p-vec2(0.,.003)))*12.;}
 float t=ambientClock;vec2 surfaceSlope;vec3 curvature;calmWaves(p-vec2(aspect*.5,.5),t,surfaceSlope,curvature);
 vec2 normalXY=grad+surfaceSlope;vec3 normal=normalize(vec3(-normalXY,1.));
 vec2 refracted=vUv+normalXY*.10/vec2(aspect,1.);
 vec3 base=calmWaterBelow(refracted,aspect,t);
 vec3 viewRay=vec3(0.,0.,-1.);float fresnel=.0204+.9796*pow(1.-normal.z,5.);
 base=mix(base,calmWaterReflection(reflect(viewRay,normal)),fresnel+.14);
 float silk=pow(max(dot(normal,normalize(vec3(-.04,.025,1.))),0.),180.);
 base+=vec3(.16,.30,.33)*silk*.12;
 float response=0.,bloom=0.;
 for(int i=0;i<8;i++){float age=clock-touches[i].z;if(age<0.||age>11.)continue;float d=length(p-touches[i].xy),front=d-age*waveSpeed;float wave=exp(-front*front/.0038)*exp(-age*.31)*touches[i].w;float ripple=.5+.5*sin(front*68.+noise(p*13.)*.7);response+=wave*pow(ripple,5.);bloom+=exp(-d*d/.018)*exp(-age*1.6)*touches[i].w;}
 float crest=min(.9,length(grad)*1.9);base+=vec3(.12,.58,.90)*(response*.16+crest*.20+bloom*.12);
 float grain=hash(floor(refracted*resolution*.36));base+=vec3(.38,.75,.92)*pow(grain,80.)*response*.22;
 base*=1.-.22*pow(length((vUv-.5)*vec2(.8,1.)),1.3);base=opening(base,vUv,aspect,grad,h,surfaceSlope);base=mix(base,vec3(.015,.06,.095),entering*.85);gl_FragColor=vec4(base,1.);
}`
const INFORMATION_VERTEX=`precision highp float;
attribute float progress;attribute float seed;uniform float aspect;uniform float clock;uniform float entering;uniform float waveSpeed;uniform vec4 touches[8];uniform float pointsMode;uniform float ratio;varying float opacity;
void main(){vec2 uv=position.xy;float response=0.;for(int i=0;i<8;i++){float age=clock-touches[i].z;if(age<0.||age>10.)continue;float d=length(uv*vec2(aspect,1.)-touches[i].xy),front=d-age*waveSpeed;response+=exp(-front*front/.012)*exp(-age*.29)*touches[i].w;}
 float moving=pow(.5+.5*sin(progress*14.-clock*1.1+seed),12.);opacity=(pointsMode>.5?.045:.006)+response*(pointsMode>.5?.31:.095)*(pointsMode>.5?1.:.35+moving*.65);opacity*=1.-entering;
 vec2 drift=vec2(sin(uv.y*21.+clock*.35),cos(uv.x*17.+clock*.3))*.0018*response;gl_Position=vec4((uv+drift)*2.-1.,.1,1.);gl_PointSize=(pointsMode>.5?3.2:1.)*ratio*(1.+response*.35);
}`
const INFORMATION_FRAGMENT=`precision highp float;uniform float pointsMode;varying float opacity;void main(){float alpha=opacity;if(pointsMode>.5){float d=length(gl_PointCoord-.5);alpha*=1.-smoothstep(.10,.5,d);}gl_FragColor=vec4(.35,.79,1.,alpha);}`

export function createWaterField(host,options={}){
 let disposed=false,paused=false,quiet=!!options.quiet,visible=true,frame,previous=0,lastDraw=0,time=0,ambientTime=0,accumulator=0,frames=0,clicks=0,energy=0,entering=0,entryTarget=0,aspect=1
 let renderer,targetA,targetB,waveMaterial,waterMaterial,observer,resizeObserver,canvas2d,ctx2d,simWidth=1,simHeight=1,simulated=false,drops=[],lastHover=0,lastPoint
 let introActive=!!options.intro,introTime=0,introLength=7,introHit=false,introState='preparing',brandTexture
 const readiness=createWaterReadyGate(()=>options.onReady?.())
 const activePointers=new Map(),touches=Array.from({length:8},()=>new THREE.Vector4(-10,-10,-100,0)),dropUniforms=Array.from({length:8},()=>new THREE.Vector4()),owned=[]
 const geometry=new THREE.PlaneGeometry(2,2),camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1),scene=new THREE.Scene(),simScene=new THREE.Scene();owned.push(geometry)
 const neutral=new THREE.DataTexture(new Uint8Array([0,0,0,0]),1,1,THREE.RGBAFormat);neutral.needsUpdate=true;owned.push(neutral)
 const paintCalmWater=createCalmWaterPainter()
 const uniforms={field:{value:neutral},resolution:{value:new THREE.Vector2(1,1)},texel:{value:new THREE.Vector2(1,1)},clock:{value:0},ambientClock:{value:0},simulated:{value:0},energy:{value:0},entering:{value:0},waveSpeed:{value:.23},touches:{value:touches},wordmark:{value:neutral},wordmarkTexel:{value:new THREE.Vector2(1,1)},introEnabled:{value:introActive?1:0},introClock:{value:0},introDuration:{value:7},introCalm:{value:quiet?.35:1}}
 let information=[]
 function updateData(){const canvas=renderer?.domElement||canvas2d;if(canvas)Object.assign(canvas.dataset,{renderer:renderer?simulated?'water-gpu-wave':'water-webgl-analytic':'water-canvas',surface:'procedural-calm-water',ready:String(readiness.ready),frames:String(frames),time:time.toFixed(2),ambientTime:ambientTime.toFixed(2),touches:String(clicks),motion:paused?'paused':'playing',energy:energy.toFixed(3),nodes:String(EQUIPMENT.length),branches:String(PIPELINES.length),intro:introActive?introState:'complete',introTime:introTime.toFixed(2)})}
 function finishIntro(){if(!introActive)return;introActive=false;uniforms.introEnabled.value=0;uniforms.wordmark.value=neutral;brandTexture?.dispose();brandTexture=undefined;options.onIntroComplete?.();updateData()}
 function updateIntro(delta){
  if(!introActive||!readiness.ready)return
  introTime=Math.min(introLength,introTime+delta)
  uniforms.introClock.value=introTime
  const state=introTime<INTRO_DROP_START?'wordmark':introTime>=INTRO_SLOW_START&&introTime<INTRO_SLOW_END?'slow-motion':introTime<INTRO_IMPACT?'droplet':'ripple'
  if(state!==introState){introState=state;options.onIntroState?.(state)}
  if(introTime>=INTRO_IMPACT&&!introHit){introHit=true;ripple(.5,.5,1.25,false,true)}
  if(introTime>=introLength)finishIntro()
 }
 function stop(){cancelAnimationFrame(frame);frame=undefined;previous=0}
 function canRun(){return !disposed&&!paused&&visible&&!document.hidden}
 function mapping(position){const u=position[0]/32+.5,v=position[2]/20+.5;return aspect<.9?[.17+v*.66,.85-u*.66]:[.12+u*.76,.82-v*.64]}
 function buildInformation(){
  information.forEach(object=>{scene.remove(object);object.geometry.dispose();object.material.dispose()});information=[];if(!renderer)return
  const uniformsFor=pointsMode=>({aspect:{value:aspect},clock:uniforms.clock,entering:uniforms.entering,waveSpeed:uniforms.waveSpeed,touches:uniforms.touches,pointsMode:{value:pointsMode},ratio:{value:renderer.getPixelRatio()}})
  const make=(positions,progresses,seeds,points)=>{
   const shape=new THREE.BufferGeometry();shape.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));shape.setAttribute('progress',new THREE.Float32BufferAttribute(progresses,1));shape.setAttribute('seed',new THREE.Float32BufferAttribute(seeds,1))
   const material=new THREE.ShaderMaterial({vertexShader:INFORMATION_VERTEX,fragmentShader:INFORMATION_FRAGMENT,uniforms:uniformsFor(points?1:0),transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending})
   const object=points?new THREE.Points(shape,material):new THREE.LineSegments(shape,material);object.frustumCulled=false;object.renderOrder=2;scene.add(object);information.push(object)
  }
  make(EQUIPMENT.flatMap(item=>[...mapping(item.position),0]),EQUIPMENT.map(()=>0),EQUIPMENT.map((_,i)=>i*.7),true)
  const positions=[],progresses=[],seeds=[]
  PIPELINES.forEach((pipe,index)=>{let distance=0;for(let i=1;i<pipe.points.length;i++){const a=mapping(pipe.points[i-1]),b=mapping(pipe.points[i]),length=Math.hypot(b[0]-a[0],b[1]-a[1]),segments=Math.max(1,Math.ceil(length/.007));for(let j=0;j<segments;j++)for(const fraction of [j/segments,(j+1)/segments]){positions.push(a[0]+(b[0]-a[0])*fraction,a[1]+(b[1]-a[1])*fraction,0);progresses.push(distance+length*fraction);seeds.push(index*.8)}distance+=length}})
  make(positions,progresses,seeds,false)
 }
 function allocateSimulation(){
  if(!simulated)return;targetA?.dispose();targetB?.dispose()
  simHeight=Math.max(80,Math.round(Math.min(256,448/aspect)));simWidth=Math.max(64,Math.round(simHeight*aspect))
  const parameters={type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false,stencilBuffer:false}
  targetA=new THREE.WebGLRenderTarget(simWidth,simHeight,parameters);targetB=targetA.clone();renderer.setRenderTarget(targetA);renderer.clearColor();renderer.setRenderTarget(targetB);renderer.clearColor();renderer.setRenderTarget(null)
  uniforms.field.value=targetA.texture;uniforms.texel.value.set(1/simWidth,1/simHeight);waveMaterial.uniforms.texel.value.copy(uniforms.texel.value);waveMaterial.uniforms.aspect.value=aspect;uniforms.waveSpeed.value=Math.sqrt(.47)*60/simHeight;accumulator=0;drops=[]
 }
 function resize(){
  if(disposed)return;const width=host.clientWidth,height=host.clientHeight;if(!width||!height)return;aspect=width/height
  if(renderer){const ratio=Math.min(window.devicePixelRatio||1,width<768?1.25:1.5,Math.sqrt(1600000/(width*height)));renderer.setPixelRatio(ratio);renderer.setSize(width,height,false);uniforms.resolution.value.set(width*ratio,height*ratio);allocateSimulation();buildInformation()}
  else if(canvas2d){canvas2d.width=Math.floor(width);canvas2d.height=Math.floor(height)}
  if(introActive){brandTexture?.dispose();brandTexture=new THREE.CanvasTexture(createIntroWordmark(aspect));brandTexture.colorSpace=THREE.NoColorSpace;brandTexture.minFilter=THREE.LinearFilter;brandTexture.generateMipmaps=false;uniforms.wordmark.value=brandTexture;uniforms.wordmarkTexel.value.set(1/brandTexture.image.width,1/brandTexture.image.height);introLength=introDuration(aspect,uniforms.waveSpeed.value);uniforms.introDuration.value=introLength}
  readiness.assetReady();drawOnce()
 }
 function simulationStep(){waveMaterial.uniforms.state.value=targetA.texture;const count=Math.min(8,drops.length);for(let i=0;i<count;i++){const drop=drops.shift();dropUniforms[i].set(drop.x,drop.y,drop.radius,drop.strength)}waveMaterial.uniforms.dropCount.value=count;renderer.setRenderTarget(targetB);renderer.render(simScene,camera);renderer.setRenderTarget(null);const swap=targetA;targetA=targetB;targetB=swap;uniforms.field.value=targetA.texture}
 function drawCanvas(){
  const w=canvas2d.width,h=canvas2d.height;paintCalmWater(ctx2d,w,h,ambientTime)
  for(const touch of touches){const age=time-touch.z;if(age<0||age>10)continue;const x=touch.x/aspect*w,y=(1-touch.y)*h,r=Math.max(1,age*uniforms.waveSpeed.value*h),alpha=Math.exp(-age*.35)*touch.w;const halo=ctx2d.createRadialGradient(x,y,Math.max(0,r-24),x,y,r+24);halo.addColorStop(0,'rgba(100,210,255,0)');halo.addColorStop(.5,`rgba(100,210,255,${alpha*.24})`);halo.addColorStop(1,'rgba(100,210,255,0)');ctx2d.fillStyle=halo;ctx2d.fillRect(x-r-30,y-r-30,r*2+60,r*2+60);for(let i=0;i<3;i++){ctx2d.beginPath();ctx2d.arc(x,y,Math.max(1,r-i*12),0,Math.PI*2);ctx2d.strokeStyle=`rgba(156,223,255,${alpha*.19/(i+1)})`;ctx2d.lineWidth=1.4;ctx2d.stroke()}}
  if(introActive&&brandTexture){
   const age=Math.max(0,introTime-INTRO_IMPACT),radius=age*uniforms.waveSpeed.value*h
   ctx2d.fillStyle=`rgba(2,15,25,${.55*(1-Math.min(1,introTime/introLength))})`;ctx2d.fillRect(0,0,w,h)
   ctx2d.save();ctx2d.globalAlpha=Math.min(1,introTime/.9)*Math.min(1,(introLength-introTime)/1.1)
   if(age>.9){ctx2d.beginPath();ctx2d.rect(0,0,w,h);ctx2d.arc(w/2,h/2,Math.max(0,radius-.9*uniforms.waveSpeed.value*h),0,Math.PI*2,true);ctx2d.clip('evenodd')}
   const source=brandTexture.image,cell=Math.max(12,Math.ceil(w/90)),scaleX=source.width/w,scaleY=source.height/h
   for(let y=h*.32;y<h*.63;y+=cell)for(let x=w*.08;x<w*.92;x+=cell){
    let dx=0,dy=0
    for(const touch of touches){const elapsed=time-touch.z;if(elapsed<0||elapsed>10)continue;const px=x/h-touch.x,py=1-y/h-touch.y,distance=Math.hypot(px,py),front=distance-elapsed*uniforms.waveSpeed.value,envelope=Math.exp(-front*front/.014-elapsed*.37)*touch.w,slope=Math.cos(front*72)*envelope;dx+=px/Math.max(.001,distance)*slope*h*.008;dy-=py/Math.max(.001,distance)*slope*h*.008}
    ctx2d.drawImage(source,x*scaleX,y*scaleY,cell*scaleX,cell*scaleY,x+dx,y+dy,cell+1,cell+1)
   }
   ctx2d.restore()
   if(introTime>INTRO_DROP_START&&introTime<INTRO_IMPACT){const fall=dropFall(introTime),x=w/2,y=h*(-.025+.525*fall),radius=h*.024,stretch=1.5+.3*fall;const glass=ctx2d.createRadialGradient(x-radius*.3,y-radius*.35,0,x,y,radius*1.1);glass.addColorStop(0,'#f2f7e6d9');glass.addColorStop(.2,'#dceff580');glass.addColorStop(.7,'#40606b60');glass.addColorStop(1,'#bbd0d9b0');ctx2d.beginPath();ctx2d.moveTo(x,y-radius*stretch);ctx2d.bezierCurveTo(x+radius*.6,y-radius*stretch*.65,x+radius*1.2,y+radius*.5,x,y+radius*stretch);ctx2d.bezierCurveTo(x-radius*1.2,y+radius*.5,x-radius*.6,y-radius*stretch*.65,x,y-radius*stretch);ctx2d.fillStyle=glass;ctx2d.fill()}
  }
 }
 function drawOnce(){if(disposed)return;if(renderer){uniforms.clock.value=time;uniforms.ambientClock.value=ambientTime;uniforms.energy.value=energy;uniforms.entering.value=entering;renderer.render(scene,camera)}else if(ctx2d)drawCanvas();if(host.clientWidth&&host.clientHeight)readiness.frameRendered();frames++;updateData()}
 function render(stamp){
  if(!canRun()){stop();return}frame=requestAnimationFrame(render);const interval=introActive?33:host.clientWidth<768||quiet?50:33;if(stamp-lastDraw<interval)return
  const delta=previous?Math.min(.07,(stamp-previous)/1000):0;previous=stamp;lastDraw=stamp;time+=delta;ambientTime+=delta*(quiet?.24:1);energy*=Math.exp(-delta*.5);entering+=(entryTarget-entering)*Math.min(1,delta*6)
  updateIntro(delta)
  if(simulated){accumulator+=delta;let steps=0;while(accumulator>=1/60&&steps++<4){simulationStep();accumulator-=1/60}}drawOnce()
 }
 function resume(){stop();if(canRun())frame=requestAnimationFrame(render)}
 function ripple(x,y,strength=1,audible=true,impact=false){
  if(disposed||paused&&!audible)return;if(paused){paused=false;options.onPause?.(false);resume()}
  x=Math.max(.005,Math.min(.995,x));y=Math.max(.005,Math.min(.995,y));touches.pop();touches.unshift(new THREE.Vector4(x*aspect,y,time,strength))
  if(drops.length<16)drops.push({x,y,radius:(audible||impact)?.031:.019,strength:strength*((audible||impact)?.25:.08)})
  energy=Math.min(1,energy+strength*.33);if(audible){clicks++;options.onTouch?.(x,y,strength);options.onInteract?.()}updateData()
 }
 function point(event){const bounds=host.getBoundingClientRect();return[(event.clientX-bounds.left)/bounds.width,1-(event.clientY-bounds.top)/bounds.height]}
 function down(event){if(!readiness.ready||event.button!==0)return;const[x,y]=point(event);activePointers.set(event.pointerId,{x,y,at:performance.now()});host.setPointerCapture?.(event.pointerId);ripple(x,y,.95,true)}
 function move(event){if(!readiness.ready)return;const[x,y]=point(event),now=performance.now(),active=activePointers.get(event.pointerId);if(active){if(now-active.at<75||Math.hypot((x-active.x)*aspect,y-active.y)<.014)return;activePointers.set(event.pointerId,{x,y,at:now});ripple(x,y,.40,true)}else if(event.pointerType==='mouse'&&now-lastHover>150&&(!lastPoint||Math.hypot((x-lastPoint[0])*aspect,y-lastPoint[1])>.035)){lastHover=now;lastPoint=[x,y];ripple(x,y,.18,false)}}
 function up(event){activePointers.delete(event.pointerId)}
 function key(event){if(event.key==='Enter'||event.key===' '){event.preventDefault();if(introActive){finishIntro();drawOnce()}else ripple(.5,.52,1,true)}}
 function visibility(){resume()}
 function lost(event){event.preventDefault();stop();options.onError?.()}
 try{
  renderer=new THREE.WebGLRenderer({alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'high-performance'});renderer.setClearColor(0x000000,1);renderer.autoClear=true
  waterMaterial=new THREE.ShaderMaterial({vertexShader:QUAD_VERTEX,fragmentShader:WATER_FRAGMENT,uniforms,depthTest:false,depthWrite:false});owned.push(waterMaterial);scene.add(new THREE.Mesh(geometry,waterMaterial))
  simulated=renderer.extensions.has('EXT_color_buffer_float');uniforms.simulated.value=simulated?1:0
  if(simulated){waveMaterial=new THREE.ShaderMaterial({vertexShader:QUAD_VERTEX,fragmentShader:WAVE_STEP,uniforms:{state:{value:null},texel:{value:new THREE.Vector2()},aspect:{value:1},drops:{value:dropUniforms},dropCount:{value:0}},depthTest:false,depthWrite:false});owned.push(waveMaterial);simScene.add(new THREE.Mesh(geometry,waveMaterial))}
  host.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');renderer.domElement.addEventListener('webglcontextlost',lost)
 }catch{
  renderer?.dispose();renderer=undefined;simulated=false
  canvas2d=document.createElement('canvas');canvas2d.setAttribute('aria-hidden','true');ctx2d=canvas2d.getContext('2d');host.appendChild(canvas2d)
 }
 host.addEventListener('pointerdown',down);host.addEventListener('pointermove',move);host.addEventListener('pointerup',up);host.addEventListener('pointercancel',up);host.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility)
 resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;resume()});observer.observe(host)
 resize();resume();if(!introActive)ripple(.56,.52,.65,false)
 return{
  ripple,skipIntro(){finishIntro();ripple(.5,.5,.65,false);drawOnce()},pause(value){paused=value;resume();updateData()},quiet(value){quiet=value;uniforms.introCalm.value=value?.35:1},enter(){entryTarget=1},reset(){entryTarget=0;entering=0;drawOnce()},
  dispose(){disposed=true;readiness.dispose();stop();resizeObserver?.disconnect();observer?.disconnect();document.removeEventListener('visibilitychange',visibility);host.removeEventListener('pointerdown',down);host.removeEventListener('pointermove',move);host.removeEventListener('pointerup',up);host.removeEventListener('pointercancel',up);host.removeEventListener('keydown',key);renderer?.domElement.removeEventListener('webglcontextlost',lost);targetA?.dispose();targetB?.dispose();brandTexture?.dispose();information.forEach(object=>{object.geometry.dispose();object.material.dispose()});owned.forEach(resource=>resource.dispose());renderer?.dispose();renderer?.forceContextLoss();host.replaceChildren();activePointers.clear();drops=[]},
 }
}
