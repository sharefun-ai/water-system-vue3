import test from 'node:test'
import assert from 'node:assert/strict'
import {fitSceneFrame} from '../src/digital-twin/framing.js'

const silhouette=[[-20,-11],[20,-11],[-18,10],[18,10],[0,12]]
for(const [width,height,right,bottom] of [[1314,556,0,12],[1314,556,330,12],[375,580,0,12],[844,250,330,12]]){
  test(`plant remains visible at ${width}x${height} with ${right}px inspector`,()=>{
    const f=fitSceneFrame(width,height,silhouette,{right,bottom})
    for(const [x,y] of silhouette){
      const px=(x-f.left)/(f.right-f.left)*width,py=(f.top-y)/(f.top-f.bottom)*height
      assert.ok(px>=0&&px<=width-right,`plant x ${px} lies in the available workspace`)
      assert.ok(py>=0&&py<=height-bottom,`plant y ${py} lies above the bottom inset`)
    }
  })
}
test('closing the floating inspector restores the whole workspace',()=>{
  const open=fitSceneFrame(1280,720,silhouette,{right:330}),closed=fitSceneFrame(1280,720,silhouette)
  assert.ok(closed.right-closed.left<=open.right-open.left)
  assert.ok(Math.abs(closed.left+closed.right)<1e-9)
  assert.ok(open.left+open.right>0)
})
