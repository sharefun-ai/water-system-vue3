// Digital states stay independent of hydraulic flow and analog warnings.
export function lampAppearance(value){
  if(value===1)return {color:'#71f1b9',emissive:'#42d99a',intensity:1.8,glow:.38,state:'on'}
  if(value===0)return {color:'#344551',emissive:'#000000',intensity:0,glow:0,state:'off'}
  return {color:'#b79257',emissive:'#b78538',intensity:.3,glow:.10,state:'unknown'}
}
