import type { SceneId } from '../game/campaign'
import { backgroundCanvas } from './background'

const cache = new Map<string, string>()

/** JPEG data URL of a battle backdrop, for use as a CSS background. */
export function sceneImage(scene: SceneId, width = 1000): string {
  const key = `${scene}@${width}`
  const hit = cache.get(key)
  if (hit) return hit
  const src = backgroundCanvas(scene, 1)
  const h = Math.round((width * src.height) / src.width)
  const c = document.createElement('canvas')
  c.width = width
  c.height = h
  c.getContext('2d')!.drawImage(src, 0, 0, width, h)
  const url = c.toDataURL('image/jpeg', 0.82)
  cache.set(key, url)
  return url
}
