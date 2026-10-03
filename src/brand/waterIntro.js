// The opening belongs to this visit, not to each Vue route mount.
let introduced = false
export function claimWaterIntro() {
  if (introduced) return false
  introduced = true
  return true
}

export const INTRO_DROP_START = 1.15
export const INTRO_SLOW_START = 1.85
export const INTRO_SLOW_END = 2.75
export const INTRO_IMPACT = 3.55

function hermite(a, b, startSpeed, endSpeed, u, duration) {
  return (2*u*u*u-3*u*u+1)*a+(u*u*u-2*u*u+u)*startSpeed*duration+(-2*u*u*u+3*u*u)*b+(u*u*u-u*u)*endSpeed*duration
}
// Continuous position and velocity across the cinematic time stretch.
export function dropFall(time) {
  if (time <= INTRO_DROP_START) return 0
  if (time < INTRO_SLOW_START) return hermite(0,.44,0,.10,(time-INTRO_DROP_START)/.70,.70)
  if (time < INTRO_SLOW_END) return hermite(.44,.55,.10,.15,(time-INTRO_SLOW_START)/.90,.90)
  if (time < INTRO_IMPACT) return hermite(.55,1,.15,1.04,(time-INTRO_SLOW_END)/.80,.80)
  return 1
}

// Hand-drawn, open geometric letterforms: no font download or raster logo.
const LETTERS = [
  { width: 70, path: 'M 2 88 L 35 2 L 68 88 M 15 56 L 55 56' },
  { width: 76, path: 'M 73 45 C 73 18 60 2 38 2 C 16 2 3 18 3 45 C 3 72 16 88 38 88 C 60 88 73 72 73 45 M 46 66 L 76 96' },
  { width: 70, path: 'M 3 2 L 3 56 C 3 77 14 88 35 88 C 56 88 67 77 67 56 L 67 2' },
  { width: 70, path: 'M 2 88 L 35 2 L 68 88 M 15 56 L 55 56' },
  { width: 66, path: 'M 2 2 L 64 2 M 33 2 L 33 88' },
  { width: 12, path: 'M 6 2 L 6 88' },
  { width: 70, path: 'M 66 15 C 58 6 49 2 35 2 C 15 2 3 19 3 45 C 3 71 15 88 35 88 C 49 88 59 83 67 75' },
]
let letterOffset = 0
export const WORDMARK_LETTERS = LETTERS.map(letter => {
  const result = { ...letter, x: letterOffset }
  letterOffset += letter.width + 32
  return result
})
export const WORDMARK_WIDTH = letterOffset + 9

export function wordmarkLayout(aspect) {
  const fraction = aspect < .9 ? .79 : .58, left = (1-fraction)/2
  return [...WORDMARK_LETTERS.map(letter => ({x:left+(letter.x+letter.width/2)/WORDMARK_WIDTH*fraction,halfWidth:(letter.width/2+17)/WORDMARK_WIDTH*fraction})),{x:left+(WORDMARK_WIDTH-5)/WORDMARK_WIDTH*fraction,halfWidth:18/WORDMARK_WIDTH*fraction}]
}

export function createIntroWordmark(aspect) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.min(1536, Math.round(2304 * aspect))
  canvas.height = Math.round(canvas.width / aspect)
  const ctx = canvas.getContext('2d'), gap = 32
  const width = WORDMARK_WIDTH
  const fraction = aspect < .9 ? .79 : .58
  const scale = canvas.width * fraction / width
  ctx.translate((canvas.width - width * scale) / 2, canvas.height * .46 - 45 * scale)
  ctx.scale(scale, scale)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  // Bake a rounded height profile rather than luminous ink. The shader derives
  // surface normals from this texture and refracts the ocean through each stroke.
  const profile = Array.from({length:28},(_,i)=>{const width=8*(1-i/28);return [width,Math.max(.035,Math.sqrt(1-(width/8)**2))]})
  for (const letter of LETTERS) {
    for (const [width,height] of profile) {
      const value = Math.round(height*255)
      ctx.lineWidth=width;ctx.strokeStyle=`rgb(${value},${value},${value})`;ctx.stroke(new Path2D(letter.path))
    }
    ctx.translate(letter.width + gap, 0)
  }
  for(const [radius,height] of [[5,.10],[4.5,.45],[3.5,.78],[2,1]]){const value=Math.round(height*255);ctx.fillStyle=`rgb(${value},${value},${value})`;ctx.beginPath();ctx.arc(4,85,radius,0,Math.PI*2);ctx.fill()}
  return canvas
}

export function introDuration(aspect, speed) {
  const extent = (aspect < .9 ? .43 : .32) * aspect
  return INTRO_IMPACT + extent / Math.max(.1, speed) + 2.4
}

export const INTRO_FRAGMENT = `
uniform sampler2D wordmark;
uniform float introEnabled;
uniform float introClock;
uniform float introDuration;
uniform float introCalm;
uniform vec2 wordmarkTexel;
uniform vec4 introLetters[8];
float introGrain(vec2 p){return fract(sin(dot(p,vec2(123.4,345.6)))*45678.9);}
float dropHermite(float a,float b,float m0,float m1,float u,float duration){float u2=u*u,u3=u2*u;return (2.*u3-3.*u2+1.)*a+(u3-2.*u2+u)*m0*duration+(-2.*u3+3.*u2)*b+(u3-u2)*m1*duration;}
float fallPosition(float t){
 if(t<=${INTRO_DROP_START})return 0.;
 if(t<${INTRO_SLOW_START})return dropHermite(0.,.44,0.,.10,(t-${INTRO_DROP_START})/.70,.70);
 if(t<${INTRO_SLOW_END})return dropHermite(.44,.55,.10,.15,(t-${INTRO_SLOW_START})/.90,.90);
 if(t<${INTRO_IMPACT})return dropHermite(.55,1.,.15,1.04,(t-${INTRO_SLOW_END})/.80,.80);
 return 1.;
}
vec2 introOceanUv(vec2 uv,float aspect){float photoAspect=1.7768;if(aspect<photoAspect)uv.x=(uv.x-.5)*(aspect/photoAspect)+.58;else uv.y=(uv.y-.5)*(photoAspect/aspect)+.5;return clamp(uv,vec2(.005),vec2(.995));}
vec3 sunEnvironment(vec3 ray){
 float sky=clamp(ray.y*.55+.55,0.,1.);vec3 color=mix(vec3(.035,.08,.11),vec3(.67,.79,.84),pow(sky,.65));
 vec3 sun=normalize(vec3(.53,.63,.57));float alignment=max(dot(ray,sun),0.);
 color+=vec3(1.,.94,.82)*(pow(alignment,110.)*17.+pow(alignment,18.)*.35);
 color+=vec3(.78,.90,.97)*exp(-pow((ray.y-.56)/.12,2.))*.75;
 return color;
}
vec3 opening(vec3 water,vec2 uv,float aspect,vec2 gradient){
 if(introEnabled<.5)return water;
 float t=introClock,age=max(0.,t-${INTRO_IMPACT}),distance=length((uv-vec2(.5,.5))*vec2(aspect,1.));
 float front=age*waveSpeed,nearWave=exp(-pow((distance-front)/.035,2.));
 float reveal=smoothstep(.12,1.35,t),finish=smoothstep(introDuration-1.2,introDuration,t);
 water*=mix(.48,1.,smoothstep(${INTRO_IMPACT},introDuration,t));
 float grain=introGrain(floor(uv*resolution*.55));
 // Allow each stroke to respond to the impact before it dissolves.
 float washed=smoothstep(.90,1.95,age-distance/waveSpeed+(grain-.5)*.23)*step(${INTRO_IMPACT},t);
 vec2 direction=normalize((uv-vec2(.5,.5))*vec2(aspect,1.)+vec2(.0001));
 vec2 glyphUv=uv;float settled=0.;
 for(int i=0;i<8;i++){
  vec4 letter=introLetters[i];if(abs(uv.x-letter.x)>letter.y)continue;
  vec2 center=vec2(letter.x,.54);float arrival=length((center-vec2(.5,.5))*vec2(aspect,1.))/waveSpeed;
  float elapsed=max(0.,age-arrival),pulse=step(arrival,age)*step(${INTRO_IMPACT},t),damping=exp(-elapsed*1.6);
  float spring=sin(elapsed*10.5)*damping*pulse,angle=sin(elapsed*8.8)*damping*pulse*.055*mix(.50,1.,introCalm);
  vec2 local=(uv-center)*vec2(aspect,1.);local=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*local;
  glyphUv=center+local/vec2(aspect,1.)-vec2(spring*.003/aspect,spring*.016)*mix(.50,1.,introCalm);settled=pulse*damping;
  break;
 }
 vec2 warp=direction/vec2(aspect,1.)*nearWave*sin((distance-front)*100.)*.004*introCalm;
 warp+=gradient*.009*step(${INTRO_IMPACT},t)*introCalm;
 warp+=vec2(sin(uv.y*31.+t*.55),cos(uv.x*19.-t*.42))*.00045;
 glyphUv=clamp(glyphUv+warp,vec2(.001),vec2(.999));vec4 glyph=texture2D(wordmark,glyphUv);
 float dissolve=(1.-washed)*reveal*(1.-finish);vec3 viewRay=vec3(0.,0.,-1.);
 if(glyph.a*dissolve>.001){
 float hx=texture2D(wordmark,glyphUv+vec2(wordmarkTexel.x,0.)).r-texture2D(wordmark,glyphUv-vec2(wordmarkTexel.x,0.)).r;
 float hy=texture2D(wordmark,glyphUv+vec2(0.,wordmarkTexel.y)).r-texture2D(wordmark,glyphUv-vec2(0.,wordmarkTexel.y)).r;
 vec3 letterNormal=normalize(vec3(-vec2(hx,hy)*2.5-gradient*settled*.7,.68));
 vec3 letterRefracted=refract(viewRay,letterNormal,1./1.333);
 vec3 letterWater=texture2D(ocean,introOceanUv(uv+letterRefracted.xy*.036,aspect)).rgb;
 float letterFresnel=.0204+.9796*pow(1.-max(letterNormal.z,0.),5.);
 vec3 letterReflection=sunEnvironment(reflect(viewRay,letterNormal));
 vec3 liquid=letterWater*.73+vec3(.055,.075,.08);
 liquid=mix(liquid,letterReflection,letterFresnel*.84+.19);
 liquid+=vec3(.80,.89,.91)*pow(1.-abs(glyph.r-.7),9.)*.28;
 float glint=pow(max(dot(reflect(viewRay,letterNormal),normalize(vec3(.53,.63,.57))),0.),48.);
 liquid+=vec3(1.,.96,.85)*glint*.55;
 water=mix(water,liquid,glyph.a*dissolve*.92);
 }
 // Faint light follows the departing ink; it falls back into the same water.
 vec2 carried=uv-direction/vec2(aspect,1.)*.016*washed;
 if(nearWave>.01){float dust=texture2D(wordmark,clamp(carried,vec2(0.),vec2(1.))).a;water+=vec3(.22,.55,.77)*dust*nearWave*pow(grain,9.)*.22*(1.-finish);}
 water+=vec3(.08,.30,.44)*nearWave*.12*exp(-age*.5)*step(${INTRO_IMPACT},t);
 // Refraction through both interfaces of a rounded water droplet (IOR 1.333).
 float fall=fallPosition(t),slow=smoothstep(1.65,1.95,t)*(1.-smoothstep(2.60,2.90,t));
 vec2 center=vec2(.5,1.025-.525*fall);
 vec2 d=(uv-center)*vec2(aspect,1.);
 float rx=.025+slow*.005,ry=rx*(1.13+.035*sin(t*4.5));
 vec2 q=vec2(d.x/rx,d.y/ry);q.x*=1.+q.y*.045;
 float sphere=dot(q,q),edge=1.-smoothstep(.92,1.10,sphere);
 float present=smoothstep(${INTRO_DROP_START},1.40,t)*(1.-smoothstep(${INTRO_IMPACT-.03},${INTRO_IMPACT+.02},t));
 if(edge*present>.001){
 vec3 normal=normalize(vec3(q,sqrt(max(.001,1.-min(sphere,.999)))));
 vec3 inside=refract(viewRay,normal,1./1.333),exitPoint=normal+inside*(-2.*dot(normal,inside));
 vec3 through=refract(inside,-normalize(exitPoint),1.333);
 vec2 lensUv=uv+(exitPoint.xy-normal.xy)*rx+through.xy*.095;
 vec3 transmitted=texture2D(ocean,introOceanUv(lensUv,aspect)).rgb*1.08;
 float transmittedLuma=dot(transmitted,vec3(.2126,.7152,.0722));transmitted=mix(transmitted,vec3(transmittedLuma)*vec3(.97,1.,1.02),.40);
 float fresnel=.0204+.9796*pow(1.-max(normal.z,0.),5.);
 vec3 glass=mix(transmitted,sunEnvironment(reflect(viewRay,normal)),fresnel);
 float meniscus=exp(-pow((sqrt(sphere)-.91)/.055,2.));glass+=vec3(.68,.80,.84)*meniscus*.12;
 float internalCaustic=exp(-pow((length(q-vec2(-.21,-.17))-.67)/.075,2.))*smoothstep(-.15,.35,-q.y)*slow;
 glass+=vec3(1.,.94,.80)*internalCaustic*.40;
 vec2 sunPoint=q-vec2(.30,.34);float sunshine=exp(-dot(sunPoint,sunPoint)/.007);
 float opticalGlare=exp(-sunPoint.x*sunPoint.x/.0004-abs(sunPoint.y)*16.)+exp(-sunPoint.y*sunPoint.y/.0004-abs(sunPoint.x)*16.);
 glass+=vec3(1.,.98,.90)*(sunshine*1.20+opticalGlare*.10)*(.40+.60*slow);
 water=mix(water,glass,edge*present);
 }
 // The sun passes through the lens into a short, restrained shaft of light.
 vec2 sunlight=normalize(vec2(-.53,-.63));float along=dot(d,sunlight),across=dot(d,vec2(-sunlight.y,sunlight.x));
 float beam=exp(-pow(across/(.008+max(along,0.)*.10),2.))*smoothstep(.027,.06,along)*(1.-smoothstep(.06,.19,along));
 water+=vec3(.85,.88,.80)*beam*.12*present*slow*mix(.65,1.,introCalm);
 float incoming=exp(-pow(across/.025,2.))*smoothstep(.04,.10,-along)*(1.-smoothstep(.12,.29,-along));
 water+=vec3(.85,.88,.80)*incoming*.025*present*slow;
 float focus=exp(-dot(d-sunlight*.075,d-sunlight*.075)/.00011);
 water+=vec3(.93,.94,.83)*focus*.23*slow*present;
 float impact=exp(-distance*distance/.0025)*exp(-age*7.)*step(${INTRO_IMPACT},t);
 water+=vec3(.32,.67,.91)*impact*.30*introCalm;
 return water;
}
`
