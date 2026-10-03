// UV positions refer to the artwork, with Y measured downwards from the top edge.
export const ATLAS_DESTINATIONS = [
  { name: '數位圖控', to: '/scada', icon: 'cube', color: '#baf4df', landscape: [.299, .287], portrait: [.264, .284] },
  { name: '數據趨勢', to: '/data-trend', icon: 'chart', color: '#b7e9fa', landscape: [.695, .295], portrait: [.748, .386] },
  { name: '警報紀錄', to: '/alert-history', icon: 'alarm', color: '#f5dfb7', landscape: [.320, .632], portrait: [.252, .605] },
  { name: '運行報表', to: '/report', icon: 'report', color: '#c9dfed', landscape: [.730, .652], portrait: [.735, .729] },
]
export function atlasFrame(width, height, zoom = 1, center = [.5, .5]) {
  const portrait = width / height < 1, imageAspect = portrait ? 941 / 1672 : 1672 / 941, aspect = width / height
  return { width, height, portrait, imageAspect, span: [Math.min(1, aspect / imageAspect) / zoom, Math.min(1, imageAspect / aspect) / zoom], center }
}
export function projectAtlasPoint(point, frame) { return { x: ((point[0] - frame.center[0]) / frame.span[0] + .5) * frame.width, y: ((point[1] - frame.center[1]) / frame.span[1] + .5) * frame.height } }
export const ATLAS_REGIONS = {
  landscape: [[.299,.260,.134,.143],[.696,.259,.139,.160],[.323,.622,.138,.159],[.729,.627,.137,.164]],
  portrait: [[.270,.267,.236,.081],[.741,.370,.242,.091],[.255,.600,.232,.086],[.742,.707,.242,.094]],
}
export function atlasDestinationAt(point, portrait) { return ATLAS_REGIONS[portrait ? 'portrait' : 'landscape'].findIndex(([x,y,rx,ry]) => Math.hypot((point[0]-x)/rx,(point[1]-y)/ry) < .95) }
