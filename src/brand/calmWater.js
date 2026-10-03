// Travelling normals and a photographic optical texture; no bottom line pattern.
const MODES = [
  [7.27,9.19,.0070,1.08,.4],[-11.43,6.61,.0048,1.37,2.1],
  [19.37,13.83,.0018,1.82,1.3],[-17.79,27.27,.0011,2.21,4.2],
  [38.21,-21.53,.00055,2.75,2.8],[-43.39,-32.11,.00035,3.12,5.1],
]
const gl=value=>Number(value).toFixed(8)
const mix=(a,b,t)=>a+(b-a)*t
const clamp=value=>Math.max(0,Math.min(1,value))

export const CALM_WATER_FRAGMENT=`
uniform sampler2D calmSurface;uniform vec2 calmSurfaceSize;uniform float calmSurfaceLoaded;
void calmWave(vec2 p,float t,vec2 k,float amplitude,float speed,float phase,inout vec2 slope,inout vec3 curvature){
 float angle=dot(p,k)-t*speed+phase;
 slope+=k*(amplitude*cos(angle));curvature-=vec3(k.x*k.x,k.x*k.y,k.y*k.y)*(amplitude*sin(angle));
}
void calmWaves(vec2 p,float t,out vec2 slope,out vec3 curvature){
 p+=vec2(sin(p.y*3.4+p.x*.73-t*.15),sin(p.x*4.1-p.y*1.15+t*.13))*.055;
 slope=vec2(0.);curvature=vec3(0.);
 ${MODES.map(([x,y,a,s,p])=>`calmWave(p,t,vec2(${gl(x)},${gl(y)}),${gl(a)},${gl(s)},${gl(p)},slope,curvature);`).join('\n ')}
}
vec2 calmCoverUv(vec2 uv,float aspect){
 float imageAspect=calmSurfaceSize.x/calmSurfaceSize.y;
 vec2 cover=aspect>imageAspect?vec2(1.,imageAspect/aspect):vec2(aspect/imageAspect,1.);
 return .5+(uv-.5)*cover*.92;
}
vec3 calmWaterReflection(vec3 ray){
 float sky=clamp(ray.z*.7+.3,0.,1.);
 vec3 reflected=mix(vec3(.19,.36,.44),vec3(.68,.82,.86),sky);
 float cloud=exp(-pow((ray.x+.27)/.28,2.))*exp(-pow((ray.y-.45)/.36,2.));
 return reflected+vec3(.18,.17,.14)*cloud;
}
vec3 calmOptics(vec2 uv,vec2 slope){
 vec3 normal=normalize(vec3(-slope,1.)),incident=normalize(vec3((uv.x-.5)*.28,.72+(uv.y-.5)*.22,-.68));
 float cosine=clamp(dot(-incident,normal),0.,1.),fresnel=.0204+.9796*pow(1.-cosine,5.);
 float depth=clamp(.55+uv.y*.23+sin(uv.x*3.+uv.y*2.)*.08,0.,1.);
 vec3 transmitted=mix(vec3(.065,.28,.35),vec3(.13,.43,.49),depth);
 vec3 color=mix(transmitted,calmWaterReflection(reflect(incident,normal)),fresnel);
 float glint=pow(max(dot(normal,normalize(vec3(.12,-.18,1.))),0.),140.);
 return color+vec3(.12,.14,.13)*glint;
}
vec3 calmWaterBelow(vec2 uv,float aspect,float t){
 vec2 p=(uv-.5)*vec2(aspect,1.),slope=vec2(0.);vec3 curvature=vec3(0.);calmWaves(p,t,slope,curvature);
 vec3 result=calmOptics(uv,slope);
 if(calmSurfaceLoaded>.5){
 vec2 flow=vec2(.032+.018*sin(p.y*3.1+p.x*1.7),.008+.014*cos(p.x*3.7-p.y*2.3));
 float offset=.17*sin(p.x*3.1+p.y*2.7),phase0=fract(t/7.+offset),phase1=fract(t/7.+offset+.5);
 // Each half-cycle resets only while its weight is zero. Local advection
 // avoids whole-image panning and keeps loop boundaries invisible.
 float weight=.5-.5*cos(phase0*6.2831853);vec2 motion=slope*.042;
 vec3 a=texture2D(calmSurface,calmCoverUv(uv+(motion-flow*(phase0-.5))/vec2(aspect,1.),aspect)).rgb;
 vec3 b=texture2D(calmSurface,calmCoverUv(uv+(motion-flow*(phase1-.5))/vec2(aspect,1.),aspect)).rgb;
 result=mix(b,a,weight)*vec3(.82,.88,.91);
 }
 return result;
}
`
function surfaceSlope(u,v,aspect,time){
 let x=(u-.5)*aspect,y=v-.5;const px=x,py=y;
 x+=Math.sin(py*3.4+px*.73-time*.15)*.055;y+=Math.sin(px*4.1-py*1.15+time*.13)*.055;
 let sx=0,sy=0;
 for(const [kx,ky,a,speed,phase] of MODES){const c=a*Math.cos(x*kx+y*ky-time*speed+phase);sx+=kx*c;sy+=ky*c}
 return [sx,sy]
}
// Asset-free optical fallback, also used to validate long-running normals.
export function sampleCalmWater(u,v,aspect,time){
 const [sx,sy]=surfaceSlope(u,v,aspect,time),nl=Math.hypot(sx,sy,1),n=[-sx/nl,-sy/nl,1/nl];
 const incident=[(u-.5)*.28,.72+(v-.5)*.22,-.68],il=Math.hypot(...incident),ray=incident.map(value=>value/il);
 const dot=ray.reduce((sum,value,i)=>sum+value*n[i],0),reflected=ray.map((value,i)=>value-2*dot*n[i]);
 const sky=clamp(reflected[2]*.7+.3),cloud=Math.exp(-(((reflected[0]+.27)/.28)**2)-(((reflected[1]-.45)/.36)**2));
 const fresnel=.0204+.9796*(1-clamp(-dot))**5,depth=clamp(.55+v*.23+Math.sin(u*3+v*2)*.08);
 const sun=[.12,-.18,1],sl=Math.hypot(...sun),glint=Math.max(0,n.reduce((sum,value,i)=>sum+value*sun[i]/sl,0))**140;
 return [.065,.28,.35].map((value,i)=>clamp(mix(mix(value,[.13,.43,.49][i],depth),mix([.19,.36,.44][i],[.68,.82,.86][i],sky)+[.18,.17,.14][i]*cloud,fresnel)+[.12,.14,.13][i]*glint))
}
export function createCalmWaterPainter(){
 let canvas,context,pixels,image;
 const paint=(target,width,height,time)=>{
  if(image){
   const scale=Math.max(width/image.width,height/image.height)/.92,sw=width/scale,sh=height/scale,sx=(image.width-sw)/2,sy=(image.height-sh)/2;
   // Canvas fallback uses inexpensive moving strips instead of GPU advection.
   for(let y=0;y<height;y+=8){const offset=Math.sin(y/height*15-time*.8)*width*.003;target.drawImage(image,sx+offset/scale,sy+y/scale,sw,Math.min(8,height-y)/scale,0,y,width,Math.min(8,height-y))}
   target.fillStyle='rgba(5,30,43,.14)';target.fillRect(0,0,width,height);return;
  }
  const aspect=width/height,bh=Math.max(80,Math.round(Math.min(150,240/aspect))),bw=Math.max(64,Math.round(bh*aspect));
  if(!canvas){canvas=document.createElement('canvas');context=canvas.getContext('2d')}
  if(canvas.width!==bw||canvas.height!==bh){canvas.width=bw;canvas.height=bh;pixels=context.createImageData(bw,bh)}
  for(let y=0;y<bh;y++)for(let x=0;x<bw;x++){
   const color=sampleCalmWater(x/bw,1-y/bh,aspect,time),index=(y*bw+x)*4;
   for(let i=0;i<3;i++)pixels.data[index+i]=Math.round(color[i]*255);pixels.data[index+3]=255;
  }
  context.putImageData(pixels,0,0);target.drawImage(canvas,0,0,width,height)
 }
 paint.setImage=value=>{image=value};return paint;
}
