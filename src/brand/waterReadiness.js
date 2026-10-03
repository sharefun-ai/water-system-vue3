// Prepared resources are not yet a presented frame. Keep the opening clock at
// zero until the water material and wordmark have passed through the renderer.
export function createWaterReadyGate(onReady) {
  let assetsReady = false, ready = false, active = true
  return {
    get ready() { return ready },
    assetReady() { if (active) assetsReady = true },
    frameRendered() {
      if (!active || !assetsReady || ready) return
      ready = true
      onReady?.()
    },
    dispose() { active = false },
  }
}
