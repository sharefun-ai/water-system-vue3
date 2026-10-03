import test from 'node:test'
import assert from 'node:assert/strict'
import {dropFall,introDuration,wordmarkLayout,INTRO_DROP_START,INTRO_SLOW_START,INTRO_SLOW_END,INTRO_IMPACT} from '../src/brand/waterIntro.js'

test('the droplet reaches the impact continuously without reversing or overshooting',()=>{
  let previous=0
  for(let t=INTRO_DROP_START;t<INTRO_IMPACT+.1;t+=.002){const position=dropFall(t);assert.ok(Number.isFinite(position)&&position>=previous-1e-10&&position>=0&&position<=1);previous=position}
  assert.equal(dropFall(INTRO_DROP_START-1),0)
  assert.equal(dropFall(INTRO_IMPACT),1)
  const step=.00001
  for(const boundary of [INTRO_SLOW_START,INTRO_SLOW_END]){
    const left=(dropFall(boundary)-dropFall(boundary-step))/step,right=(dropFall(boundary+step)-dropFall(boundary))/step
    assert.ok(Math.abs(left-right)<.001,'The slow-motion edit must not introduce a visible velocity jump')
  }
})

test('slow motion is perceptibly slower and finishes before the actual impact',()=>{
  const slowSpeed=(dropFall(INTRO_SLOW_END)-dropFall(INTRO_SLOW_START))/(INTRO_SLOW_END-INTRO_SLOW_START)
  const earlySpeed=dropFall(INTRO_SLOW_START)/(INTRO_SLOW_START-INTRO_DROP_START)
  const lateSpeed=(1-dropFall(INTRO_SLOW_END))/(INTRO_IMPACT-INTRO_SLOW_END)
  assert.ok(slowSpeed<earlySpeed*.30&&slowSpeed<lateSpeed*.30)
  assert.ok(INTRO_SLOW_END<INTRO_IMPACT)
})

test('desktop, portrait and landscape leave time for every glyph to respond before fading',()=>{
  for(const aspect of [.35,.46,.75,1,1.78,2.8]){
    const speed=.17,letters=wordmarkLayout(aspect)
    assert.equal(letters.length,8)
    for(const letter of letters){
      assert.ok(letter.x-letter.halfWidth>0&&letter.x+letter.halfWidth<1)
      const farthestEdge=Math.hypot((Math.abs(letter.x-.5)+letter.halfWidth)*aspect,.04)
      assert.ok(introDuration(aspect,speed)>INTRO_IMPACT+farthestEdge/speed+1.95)
    }
  }
})
