// Fit the actual projected plant silhouette into the available workspace.
// A floating inspector shifts the composition without shrinking the canvas.
export function fitSceneFrame(width,height,projected,{right=0,bottom=0}={}){
  const w=Math.max(1,width),h=Math.max(1,height)
  const r=Math.max(0,Math.min(right,w*.45)),b=Math.max(0,Math.min(bottom,h*.36))
  const x=Math.max(1,...projected.map(p=>Math.abs(p[0]))),y=Math.max(1,...projected.map(p=>Math.abs(p[1])))
  const half=Math.max(y*h/((h-b)*.9),x*h/((w-r)*.9))
  const shiftX=half*r/h,shiftY=-half*b/h
  return {left:-half*w/h+shiftX,right:half*w/h+shiftX,top:half+shiftY,bottom:-half+shiftY}
}
