import test from 'node:test'
import assert from 'node:assert/strict'
import {sampleCalmWater} from '../src/brand/calmWater.js'

test('sunlight focusing stays finite and bounded across screen sizes and long sessions',()=>{
  for(const aspect of [.35,.46,1,1.78,2.8])for(const time of [0,.5,20,1000,86400]){
    for(let y=0;y<=10;y++)for(let x=0;x<=10;x++){
      const color=sampleCalmWater(x/10,y/10,aspect,time)
      assert.ok(color.every(channel=>Number.isFinite(channel)&&channel>=0&&channel<=1),'Focus must not blow out or generate NaN pixels')
    }
  }
})

test('the calm surface continues to change without input, with a continuous clock',()=>{
  let movement=0
  for(let y=1;y<10;y++)for(let x=1;x<10;x++){
    const initial=sampleCalmWater(x/10,y/10,1.78,3)
    const later=sampleCalmWater(x/10,y/10,1.78,5)
    const next=sampleCalmWater(x/10,y/10,1.78,3.00001)
    movement+=initial.reduce((sum,value,i)=>sum+Math.abs(value-later[i]),0)
    assert.ok(initial.every((value,i)=>Math.abs(value-next[i])<.0001),'Time must not introduce visible discontinuities')
  }
  assert.ok(movement>.1,'A still pointer must not freeze the background')
})
