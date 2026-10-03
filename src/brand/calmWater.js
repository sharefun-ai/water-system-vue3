// Small capillary waves, in physical screen-height coordinates. The shader and
// Canvas fallback share these modes, so neither relies on a photographed sea.
const DETAIL = 2.2
const MODES = [
  [8.27, 6.19, .0025, .32, .4],
  [-6.43, 11.61, .0022, .41, 2.1],
  [15.37, 9.83, .0011, .48, 1.3],
  [-13.79, 18.27, .0009, .56, 4.2],
  [25.21, -14.53, .0005, .65, 2.8],
  [-22.39, -19.11, .0004, .72, 5.1],
].map(([x,y,amplitude,speed,phase])=>[x*DETAIL,y*DETAIL,amplitude/(DETAIL*DETAIL),speed,phase])
const gl = value => Number(value).toFixed(8)

export const CALM_WATER_FRAGMENT = `
void calmWave(vec2 p,float t,vec2 k,float amplitude,float speed,float phase,inout vec2 slope,inout vec3 curvature){
 float angle=dot(p,k)-t*speed+phase;
 slope+=k*(amplitude*cos(angle));
 curvature-=vec3(k.x*k.x,k.x*k.y,k.y*k.y)*(amplitude*sin(angle));
}
void calmWaves(vec2 p,float t,out vec2 slope,out vec3 curvature){
 p+=vec2(sin(p.y*3.4+p.x*.73-t*.075),sin(p.x*4.1-p.y*1.15+t*.065))*.14;
 slope=vec2(0.);curvature=vec3(0.);
 ${MODES.map(([x,y,a,s,p])=>`calmWave(p,t,vec2(${gl(x)},${gl(y)}),${gl(a)},${gl(s)},${gl(p)},slope,curvature);`).join('\n ')}
}
vec3 calmWaterBelow(vec2 uv,float aspect,float t){
 vec2 p=(uv-.5)*vec2(aspect,1.),slope;vec3 curvature;
 calmWaves(p+vec2(.13,-.08),t,slope,curvature);
 // The determinant of the refracted light map concentrates sunlight into
 // moving caustic ribbons. A finite aperture keeps the focus soft and bounded.
 float depth=1.35,determinant=(1.+depth*curvature.x)*(1.+depth*curvature.z)-pow(depth*curvature.y,2.);
 float caustic=.15/(abs(determinant)+.14);
 vec2 light=(uv-vec2(.74,.77))*vec2(aspect*.75,1.);
 float illumination=exp(-dot(light,light)*1.8);
 vec3 bed=mix(vec3(.009,.040,.065),vec3(.035,.175,.180),illumination*.88);
 bed+=vec3(.19,.56,.60)*caustic*(.10+.15*illumination);
 bed+=vec3(.10,.20,.22)*exp(-abs(determinant)*5.)*.06;
 return bed;
}
vec3 calmWaterReflection(vec3 ray){
 float sky=clamp(ray.y*.6+.6,0.,1.);
 vec3 reflected=mix(vec3(.025,.07,.12),vec3(.27,.46,.53),sky);
 float skylight=exp(-pow((ray.x+ray.y*.65-.025)/.075,2.));
 reflected+=vec3(.62,.78,.81)*skylight*.42;
 return reflected;
}
`

export function sampleCalmWater(u, v, aspect, time) {
  const px=(u-.5)*aspect+.13,py=v-.5-.08
  const x=px+Math.sin(py*3.4+px*.73-time*.075)*.14,y=py+Math.sin(px*4.1-py*1.15+time*.065)*.14
  let xx=0,xy=0,yy=0
  for(const [kx,ky,amplitude,speed,phase] of MODES){
    const curve=-amplitude*Math.sin(x*kx+y*ky-time*speed+phase)
    xx+=kx*kx*curve;xy+=kx*ky*curve;yy+=ky*ky*curve
  }
  const determinant=(1+1.35*xx)*(1+1.35*yy)-(1.35*xy)**2
  const caustic=.15/(Math.abs(determinant)+.14)
  const illumination=Math.exp(-(((u-.74)*aspect*.75)**2+(v-.77)**2)*1.8)
  const focus=Math.exp(-Math.abs(determinant)*5)*.06
  return [.009,.040,.065].map((base,i)=>base+([.035,.175,.180][i]-base)*illumination*.88+[.19,.56,.60][i]*caustic*(.10+.15*illumination)+[.10,.20,.22][i]*focus)
}

export function createCalmWaterPainter() {
  let canvas,context,pixels
  return (target,width,height,time)=>{
    const aspect=width/height,bufferHeight=Math.max(80,Math.round(Math.min(170,280/aspect))),bufferWidth=Math.max(64,Math.round(bufferHeight*aspect))
    if(!canvas){canvas=document.createElement('canvas');context=canvas.getContext('2d')}
    if(canvas.width!==bufferWidth||canvas.height!==bufferHeight){canvas.width=bufferWidth;canvas.height=bufferHeight;pixels=context.createImageData(bufferWidth,bufferHeight)}
    for(let y=0;y<bufferHeight;y++)for(let x=0;x<bufferWidth;x++){
      const color=sampleCalmWater(x/bufferWidth,1-y/bufferHeight,aspect,time),index=(y*bufferWidth+x)*4
      for(let i=0;i<3;i++)pixels.data[index+i]=Math.round(color[i]*255)
      pixels.data[index+3]=255
    }
    context.putImageData(pixels,0,0);target.drawImage(canvas,0,0,width,height)
  }
}
