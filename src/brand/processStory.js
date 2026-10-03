// Brand chapters use the existing engineering equipment / branch IDs.
// These are visual emphasis groups, not PLC commands or live operating states.
export const PROCESS_CHAPTERS = [
  { name: '回收原水', tag: 'T-01', anchor: 'T01', equipment: ['T01','143','144','I107','I106'], circuits: ['feed'] },
  { name: '超濾淨化', tag: 'UF-01', anchor: 'UF', equipment: ['UF','I101','I102','I103','I104'], circuits: ['feed','product'] },
  { name: '產水與回收', tag: 'T-02', anchor: 'T02', equipment: ['T02','145','146','NAOCL','T03','147','148','149'], circuits: ['product','backwash','drain'] },
  { name: '感測與自動控制', tag: 'EC · TU · PT · FIT', anchor: 'I112', equipment: ['I112','I113','I106','I107','I108','I101','I102','I103','I104'], circuits: ['product','chemical'] },
]
export const PROCESS_LINKS = [
  { name:'數位圖控', to:'/scada', icon:'cube' },
  { name:'數據趨勢', to:'/data-trend', icon:'chart' },
  { name:'警報紀錄', to:'/alert-history', icon:'alarm' },
  { name:'運行報表', to:'/report', icon:'report' },
]
export const OPENING_SECONDS = 14
export function chapterAt(seconds, intro = true) {
  const clock = intro && seconds < OPENING_SECONDS ? seconds / 3.5 : ((seconds - OPENING_SECONDS + 36) % 36) / 9
  return Math.min(3, Math.max(0, Math.floor(clock)))
}
