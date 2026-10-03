// Small surface-normal waves in physical screen-height coordinates. The light
// below the water uses an organic connected mesh rather than closed contours.
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
 vec2 p=(uv-.5)*vec2(aspect,1.);
 p+=vec2(sin(p.y*16.1+sin(p.x*4.3+t*.09)*1.2-t*.075),sin(p.x*15.7+cos(p.y*5.2-t*.08)*1.1+t*.065))*.040;
 p=p*9.2+vec2(.13,-.08);
 vec2 cell=floor(p),f=fract(p);float first=8.,second=8.;
 // Light joins into a continuous, gently bending mesh. The old curvature
 // contour produced isolated oval outlines that read as floating objects.
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
  vec2 offset=vec2(float(x),float(y)),n=cell+offset;
  vec3 q=fract(vec3(n.x,n.y,n.x)*vec3(.1031,.1030,.0973));q+=dot(q,q.yzx+33.33);
  vec2 phase=fract((q.xx+q.yz)*q.zy)*6.2831853;
  vec2 site=offset+.5+sin(phase+t*.22)*.36;
  float distance=length(site-f);
  if(distance<first){second=first;first=distance;}else second=min(second,distance);
 }
 float edge=max(0.,second-first),ribbon=exp(-pow(edge/.060,2.)),core=exp(-pow(edge/.017,2.));
 float openness=smoothstep(.18,.80,.5+.5*sin(p.x*.56+p.y*.71+t*.10+cos(p.y*1.23-t*.08)));
 vec2 light=(uv-vec2(.74,.77))*vec2(aspect*.75,1.);
 float illumination=exp(-dot(light,light)*1.8);
 vec3 bed=mix(vec3(.016,.070,.120),vec3(.055,.260,.360),illumination*.88);
 bed+=vec3(.50,.80,.89)*ribbon*openness*(.085+.07*illumination);
 bed+=vec3(.64,.85,.93)*core*openness*.035;
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

const fract=value=>value-Math.floor(value)
function movingSite(x,y,time){
  let a=fract(x*.1031),b=fract(y*.1030),c=fract(x*.0973)
  const dot=a*(b+33.33)+b*(c+33.33)+c*(a+33.33)
  a+=dot;b+=dot;c+=dot
  return [.5+Math.sin(fract((a+b)*c)*6.2831853+time*.22)*.36,.5+Math.sin(fract((a+c)*b)*6.2831853+time*.22)*.36]
}

export function sampleCalmWater(u, v, aspect, time, sites) {
  const px=(u-.5)*aspect,py=v-.5
  const x=(px+Math.sin(py*16.1+Math.sin(px*4.3+time*.09)*1.2-time*.075)*.040)*9.2+.13,y=(py+Math.sin(px*15.7+Math.cos(py*5.2-time*.08)*1.1+time*.065)*.040)*9.2-.08
  const cellX=Math.floor(x),cellY=Math.floor(y),fx=fract(x),fy=fract(y)
  let first=8,second=8
  for(let dy=-1;dy<=1;dy++){
    let row=sites?.get(cellY+dy)
    if(sites&&!row){row=new Map();sites.set(cellY+dy,row)}
    for(let dx=-1;dx<=1;dx++){
      let site=row?.get(cellX+dx)
      if(!site){site=movingSite(cellX+dx,cellY+dy,time);row?.set(cellX+dx,site)}
      const deltaX=dx+site[0]-fx,deltaY=dy+site[1]-fy,distance=deltaX*deltaX+deltaY*deltaY
      if(distance<first){second=first;first=distance}else second=Math.min(second,distance)
    }
  }
  const edge=Math.max(0,Math.sqrt(second)-Math.sqrt(first)),ribbon=Math.exp(-((edge/.060)**2)),core=Math.exp(-((edge/.017)**2))
  const lightWeight=Math.max(0,Math.min(1,((.5+.5*Math.sin(x*.56+y*.71+time*.10+Math.cos(y*1.23-time*.08)))-.18)/.62))
  const openness=lightWeight*lightWeight*(3-2*lightWeight)
  const illumination=Math.exp(-(((u-.74)*aspect*.75)**2+(v-.77)**2)*1.8)
  return [.016,.070,.120].map((base,i)=>base+([.055,.260,.360][i]-base)*illumination*.88+[.50,.80,.89][i]*ribbon*openness*(.085+.07*illumination)+[.64,.85,.93][i]*core*openness*.035)
}

export function createCalmWaterPainter() {
  let canvas,context,pixels
  return (target,width,height,time)=>{
    const aspect=width/height,bufferHeight=Math.max(80,Math.round(Math.min(170,280/aspect))),bufferWidth=Math.max(64,Math.round(bufferHeight*aspect))
    if(!canvas){canvas=document.createElement('canvas');context=canvas.getContext('2d')}
    if(canvas.width!==bufferWidth||canvas.height!==bufferHeight){canvas.width=bufferWidth;canvas.height=bufferHeight;pixels=context.createImageData(bufferWidth,bufferHeight)}
    const sites=new Map()
    for(let y=0;y<bufferHeight;y++)for(let x=0;x<bufferWidth;x++){
      const color=sampleCalmWater(x/bufferWidth,1-y/bufferHeight,aspect,time,sites),index=(y*bufferWidth+x)*4
      for(let i=0;i<3;i++)pixels.data[index+i]=Math.round(color[i]*255)
      pixels.data[index+3]=255
    }
    context.putImageData(pixels,0,0);target.drawImage(canvas,0,0,width,height)
  }
}
