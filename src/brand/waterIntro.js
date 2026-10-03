// The opening belongs to this visit, not to each Vue route mount.
let introduced = false
export function claimWaterIntro() {
  if (introduced) return false
  introduced = true
  return true
}

export const INTRO_IMPACT = 2.35

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
  ctx.lineWidth = 1.55
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#e4f5ff'
  ctx.shadowColor = '#5cbbef'
  ctx.shadowBlur = 9
  for (const letter of LETTERS) {
    ctx.stroke(new Path2D(letter.path))
    ctx.translate(letter.width + gap, 0)
  }
  ctx.fillStyle = '#8ddcff'
  ctx.shadowBlur = 18
  ctx.beginPath(); ctx.arc(4, 85, 3.8, 0, Math.PI * 2); ctx.fill()
  return canvas
}

export function introDuration(aspect, speed) {
  const extent = (aspect < .9 ? .43 : .32) * aspect
  return INTRO_IMPACT + extent / Math.max(.1, speed) + 1.4
}

export const INTRO_FRAGMENT = `
uniform sampler2D wordmark;
uniform float introEnabled;
uniform float introClock;
uniform float introDuration;
uniform float introCalm;
float introGrain(vec2 p){return fract(sin(dot(p,vec2(123.4,345.6)))*45678.9);}
vec3 opening(vec3 water,vec2 uv,float aspect,vec2 gradient){
 if(introEnabled<.5)return water;
 float t=introClock,age=max(0.,t-2.35),distance=length((uv-vec2(.5,.5))*vec2(aspect,1.));
 float front=age*waveSpeed,nearWave=exp(-pow((distance-front)/.036,2.));
 float reveal=smoothstep(.12,1.35,t),finish=smoothstep(introDuration-1.2,introDuration,t);
 water*=mix(.44,1.,smoothstep(2.4,introDuration,t));
 float grain=introGrain(floor(uv*resolution*.55));
 float washed=smoothstep(-.045,.11,front-distance+(grain-.5)*.045)*step(2.35,t);
 vec2 direction=normalize((uv-vec2(.5,.5))*vec2(aspect,1.)+vec2(.0001));
 vec2 warp=direction/vec2(aspect,1.)*nearWave*sin((distance-front)*125.)*.009*introCalm;
 warp+=gradient*.004*step(2.35,t)*introCalm;
 vec3 ink=texture2D(wordmark,clamp(uv+warp,vec2(0.),vec2(1.))).rgb;
 float alpha=texture2D(wordmark,clamp(uv+warp,vec2(0.),vec2(1.))).a;
 float dissolve=(1.-washed)*reveal*(1.-finish);
 water=mix(water,ink+vec3(.05,.12,.16)*nearWave,alpha*dissolve*.94);
 // Faint light follows the departing ink; it falls back into the same water.
 vec2 carried=uv-direction/vec2(aspect,1.)*.016*washed;
 float dust=texture2D(wordmark,clamp(carried,vec2(0.),vec2(1.))).a;
 water+=vec3(.22,.55,.77)*dust*nearWave*pow(grain,9.)*.34*(1.-finish);
 water+=vec3(.08,.30,.44)*nearWave*.14*exp(-age*.5)*step(2.35,t);
 // A refractive teardrop accelerates toward the water. Coordinates are isotropic.
 float falling=clamp((t-1.25)/1.10,0.,1.),fall=falling*falling;
 vec2 center=vec2(.5,1.025-.525*fall);
 vec2 d=(uv-center)*vec2(aspect,1.);
 float ry=.029+fall*.010;vec2 q=vec2(d.x/(.017*(1.-clamp(d.y/ry,-1.,1.)*.23)),d.y/ry);
 float sphere=dot(q,q),edge=1.-smoothstep(.92,1.10,sphere);
 float present=smoothstep(1.28,1.55,t)*(1.-smoothstep(2.31,2.36,t));
 vec3 normal=normalize(vec3(q,sqrt(max(.001,1.-min(sphere,.999)))));
 float rim=pow(1.-max(normal.z,0.),2.2),shine=pow(max(dot(normal,normalize(vec3(-.4,.6,1.))),0.),22.);
 vec3 glass=texture2D(ocean,clamp(uv+q*.022,vec2(.01),vec2(.99))).rgb*.6;
 glass+=vec3(.12,.36,.5)+vec3(.38,.72,.91)*rim*.85+vec3(.75,.95,1.)*shine;
 water=mix(water,glass,edge*present*.88);
 float trail=exp(-d.x*d.x/.000035)*smoothstep(.035,.055,d.y)*(1.-smoothstep(.055,.20,d.y));
 water+=vec3(.24,.60,.79)*trail*.10*present;
 float impact=exp(-distance*distance/.0025)*exp(-age*7.)*step(2.35,t);
 water+=vec3(.32,.67,.91)*impact*.40*introCalm;
 return water;
}
`
