import {EQUIPMENT} from './topology.js'
import {ANALOG,signalById} from './telemetry.js'

// Every original measurement belongs to a tank or instrument. The membrane
// shares pressure signals with its instruments, so it must not duplicate them.
export const READOUT_SIGNALS=Object.fromEntries(EQUIPMENT.filter(e=>['tank','instrument'].includes(e.type)).map(e=>[e.id,e.signals.filter(id=>ANALOG.some(s=>s.id===id))]))
export function valueAnnotations(projected,width,height=Infinity){
  const compact=width<720||height<400
  const cardWidth=compact?Math.min(142,Math.floor((width-70)/2)):170
  return projected.filter(l=>READOUT_SIGNALS[l.id]?.length).map(l=>({...l,signalIds:READOUT_SIGNALS[l.id],name:signalById[READOUT_SIGNALS[l.id][0]].label.replace(/^T-0[12] /,''),cardWidth,cardHeight:READOUT_SIGNALS[l.id].length>1?(compact?72:84):(compact?52:62)}))
}

// Screen-space cards: zoom changes the model, never the text size.
export function placeAnnotations(projected,width,height,selectedId,previous=[],obstacles){
  const compact=width<720,landscape=compact&&height<400,placed=[],prior=new Map(previous.filter(l=>l.layoutWidth===width&&l.layoutHeight===height).map(l=>[l.id,l]))
  const font=compact?12:13,tagFont=compact?10:11,defaultHeight=compact?28:32,gap=5
  const textWidth=(text,size)=>[...text].reduce((n,c)=>n+(/[\u2e80-\uffff]/.test(c)?size:size*.61),0)
  const bounds={left:8,top:landscape?28:38,right:width-(landscape?8:58),bottom:height-(landscape?6:30)}
  const overlap=(a,b,pad=0)=>Math.max(0,Math.min(a.x+a.w+pad,b.x+b.w+pad)-Math.max(a.x-pad,b.x-pad))*Math.max(0,Math.min(a.y+a.h+pad,b.y+b.h+pad)-Math.max(a.y-pad,b.y-pad))
  const bodies=obstacles||projected.filter(l=>l.visible&&l.body).map(l=>l.body)
  const priority={tank:0,membrane:1,chemicalTank:2,instrument:3,pump:4,valve:5}
  const items=projected.filter(l=>l.visible).sort((a,b)=>(b.id===selectedId)-(a.id===selectedId)||priority[a.type]-priority[b.type]||a.id.localeCompare(b.id))
  for(const l of items){
    const w=Math.min(bounds.right-bounds.left,l.cardWidth||Math.ceil(20+textWidth(l.tag,tagFont)+(l.name?9+textWidth(l.name,font):0))),h=l.cardHeight||defaultHeight
    const ax=l.x,ay=l.y,old=prior.get(l.id);let best=null,score=Infinity
    const consider=(cx,cy)=>{
      const box={x:Math.max(bounds.left,Math.min(bounds.right-w,cx)),y:Math.max(bounds.top,Math.min(bounds.bottom-h,cy)),w,h}
      const collisions=placed.reduce((n,p)=>n+overlap(box,p,gap/2),0)
      const covered=bodies.reduce((n,p)=>n+overlap(box,p),0)
      const tools=landscape?overlap(box,{x:width-150,y:height-52,w:150,h:52},3):0
      const distance=Math.hypot(box.x+w/2-ax,box.y+h/2-ay)
      const movement=old?Math.hypot(box.x-old.x,box.y-old.y):0
      const cost=(collisions+tools)*1e6+covered*2+distance*3+movement*.15
      if(cost<score){score=cost;best={...l,...box,ax,ay,font,tagFont,layoutWidth:width,layoutHeight:height}}
    }
    if(old)consider(old.x,old.y)
    for(let r=0;r<=8;r++)for(let d=0;d<(r?16:1);d++){
      const angle=d*Math.PI/8;consider(ax-w/2+Math.cos(angle)*r*28,ay-h-10+Math.sin(angle)*r*25)
    }
    if(placed.some(p=>overlap(best,p,gap/2)>0)){
      for(let y=bounds.top;y<=bounds.bottom-h;y+=8)for(let x=bounds.left;x<=bounds.right-w;x+=12)consider(x,y)
    }
    // End on the nearest edge so the line always points back to its own device.
    const ex=Math.max(best.x+5,Math.min(best.x+w-5,ax)),ey=Math.max(best.y+4,Math.min(best.y+h-4,ay))
    if(ax>=best.x&&ax<=best.x+w&&ay>=best.y&&ay<=best.y+h){
      const edges=[[ax,best.y],[ax,best.y+h],[best.x,ay],[best.x+w,ay]].sort((a,b)=>Math.hypot(a[0]-ax,a[1]-ay)-Math.hypot(b[0]-ax,b[1]-ay));best.ex=edges[0][0];best.ey=edges[0][1]
    }else{best.ex=ex;best.ey=ey}
    placed.push(best)
  }
  // On small screens, pack into separated rows when nearby labels exhaust the gaps.
  // Keep every name readable instead of shrinking type or stacking name cards.
  if(placed.some((a,i)=>placed.slice(i+1).some(b=>overlap(a,b)>0))){
    const rows=[],rowGap=4,available=bounds.right-bounds.left
    for(const l of [...placed].sort((a,b)=>b.h-a.h||b.w-a.w)){
      let row=rows.find(r=>r.width+l.w+rowGap<=available)
      if(!row){row={items:[],width:0,height:0};rows.push(row)}
      row.height=Math.max(row.height,l.h)
      row.width+=l.w+(row.items.length?rowGap:0);row.items.push(l)
    }
    rows.sort((a,b)=>a.items.reduce((n,l)=>n+l.ay,0)/a.items.length-b.items.reduce((n,l)=>n+l.ay,0)/b.items.length)
    const bottom=landscape?height-54:bounds.bottom,totalHeight=rows.reduce((sum,r)=>sum+r.height,0),rowSpacing=Math.min(11,(bottom-bounds.top-totalHeight)/Math.max(1,rows.length-1))
    if(rowSpacing>=1){
      const packed=[]
      let rowY=bounds.top
      rows.forEach(row=>{
        row.items.sort((a,b)=>a.ax-b.ax)
        const center=row.items.reduce((n,l)=>n+l.ax,0)/row.items.length
        let x=Math.max(bounds.left,Math.min(bounds.right-row.width,center-row.width/2))
        for(const l of row.items){const y=rowY,ex=Math.max(x+5,Math.min(x+l.w-5,l.ax)),ey=l.ay<y+l.h/2?y:y+l.h;packed.push({...l,x,y,ex,ey});x+=l.w+rowGap}
        rowY+=row.height+rowSpacing
      })
      return packed
    }
  }
  return placed
}
