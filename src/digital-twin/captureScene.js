import {equipmentById,CIRCUITS} from './topology'
import {ANALOG,signalById,formatSignal,isWarning} from './telemetry'
// The image uses the real WebGL render plus a separate, stationary meter column.
export async function captureScene(scene,values,{width,height,selectedId,status,labels=[]}){
  const image=new Image();image.src=await scene.screenshot();await image.decode()
  const side=290,head=52,foot=65,h=Math.max(height,690),canvas=document.createElement('canvas')
  canvas.width=(width+side)*2;canvas.height=(h+head+foot)*2
  const c=canvas.getContext('2d');c.scale(2,2);c.fillStyle='#0b131e';c.fillRect(0,0,width+side,h+head+foot)
  const text=(str,x,y,size=11,color='#bfd4e2')=>{c.font=`${size>=18?'600':'500'} ${size}px "Noto Sans TC",sans-serif`;c.fillStyle=color;c.fillText(str,x,y)}
  text('AQUATIC · 水系統數位圖控',18,32,18,'#b1efd7');text(status+' · 管線流向示意',width+12,30,10)
  c.drawImage(image,0,head+(h-height)/2,width,height)
  c.save();c.translate(0,head+(h-height)/2)
  for(const l of labels){c.strokeStyle=CIRCUITS[l.circuit].color;c.globalAlpha=l.id===selectedId?.9:.6;c.lineWidth=l.id===selectedId?1.4:1;c.beginPath();c.moveTo(l.ax,l.ay);c.lineTo(l.ex,l.ey);c.stroke();c.beginPath();c.arc(l.ax,l.ay,l.id===selectedId?3:2,0,Math.PI*2);c.fillStyle=CIRCUITS[l.circuit].color;c.fill()}
  c.globalAlpha=1
  for(const l of labels){
    const active=l.id===selectedId;c.fillStyle=active?'#193830':'#122431';c.strokeStyle=active?'#a0e9ce':'#5c7b8e';c.lineWidth=1;c.beginPath();c.roundRect(l.x,l.y,l.w,l.h,6);c.fill();c.stroke()
    if(l.signalIds){
      const compact=l.w<160,id=l.signalIds[0],secondary=l.signalIds[1],left=l.x+8
      c.font='600 10px monospace';c.fillStyle=CIRCUITS[l.circuit].color;c.fillText(l.tag,left,l.y+14)
      text(l.name,left+c.measureText(l.tag).width+6,l.y+14,compact?9:10)
      text(formatSignal(id,values[id]),left,l.y+(compact?36:42),compact?22:25,isWarning(id,values[id])?'#efbb85':'#a1e9d1')
      c.textAlign='right';text(signalById[id].unit,l.x+l.w-8,l.y+(compact?36:42),compact?8:9);c.textAlign='left'
      if(secondary){c.strokeStyle='#3b5667';c.beginPath();c.moveTo(left,l.y+l.h-23);c.lineTo(l.x+l.w-8,l.y+l.h-23);c.stroke();text('累計',left,l.y+l.h-9,9);c.textAlign='right';text(`${formatSignal(secondary,values[secondary])} ${signalById[secondary].unit}`,l.x+l.w-8,l.y+l.h-9,compact?10:11);c.textAlign='left'}
    }else{
      c.font=`600 ${l.tagFont}px monospace`;c.fillStyle=CIRCUITS[l.circuit].color;c.fillText(l.tag,l.x+9,l.y+l.h/2+4);const tagWidth=c.measureText(l.tag).width;if(l.name)text(l.name,l.x+18+tagWidth,l.y+l.h/2+4,l.font,'#e0eff7')
    }
  }
  c.restore()
  c.fillStyle='#142431';c.fillRect(width,head,side,h);c.strokeStyle='#385566';c.beginPath();c.moveTo(width,head);c.lineTo(width,head+h);c.stroke()
  let y=head+28
  for(const group of [{name:'壓力',ids:[101,102,103,104]},{name:'瞬間流量',ids:[106,107,108]},{name:'水質 / 液位',ids:[112,113,114,115]},{name:'累計水量',ids:[109,110,111]}]){
    text(group.name,width+15,y,12);y+=12
    group.ids.forEach((id,i)=>{const x=width+14+(i%2)*132,cy=y+Math.floor(i/2)*63;c.fillStyle='#1b2e3b';c.beginPath();c.roundRect(x,cy,124,55,6);c.fill();text(signalById[id].label,x+8,cy+17,9);const value=formatSignal(id,values[id]);text(value,x+8,cy+40,id>=109&&id<=111?18:22,isWarning(id,values[id])?'#efbb85':'#9ae7cc');text(signalById[id].unit,x+91,cy+40,8)})
    y+=Math.ceil(group.ids.length/2)*63+22
  }
  const selected=equipmentById[selectedId];c.fillStyle='#1b3039';c.fillRect(0,head+h,width+side,foot)
  text(selected.tag+'  '+selected.name,18,head+h+25,15,'#b8f4db')
  let x=18;for(const s of selected.signals.map(id=>signalById[id]).filter(s=>ANALOG.includes(s))){text(`${s.label}  ${formatSignal(s.id,values[s.id])} ${s.unit}`,x,head+h+49,11);x+=190}
  return new Promise(resolve=>canvas.toBlob(resolve,'image/png'))
}
