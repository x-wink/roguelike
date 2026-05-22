import { Application } from 'pixi.js'

export let pixiApp: Application

export async function initPixi() {
  pixiApp = new Application()

  await pixiApp.init({
    canvas: document.getElementById('pixi-canvas') as HTMLCanvasElement,
    resizeTo: window,
    backgroundColor: 0x1a1a2e,
    antialias: true,
  })
}
