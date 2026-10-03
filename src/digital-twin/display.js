// HUD placement and level scaling share the same definitions as the 3D scene.
export function levelFraction(value,range){
  if(value===null||value===undefined||!Number.isFinite(Number(value)))return null
  return Math.max(0,Math.min(1,(Number(value)-range[0])/(range[1]-range[0])))
}
export function flowPhase(seconds,length,speed=.85){return (seconds*speed/Math.max(length,.01))%1}
