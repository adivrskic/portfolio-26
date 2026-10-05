/** What the intro waits for: the 3D scene's first frames (the cube fades in then), the fonts, and every
 *  card's picture (see Loader). */
type Task = 'scene' | 'fonts' | 'images'

const done: Record<Task, number> = { scene: 0, fonts: 0, images: 0 }
/** when each was in, on the page's clock (ms) */
const at: Partial<Record<Task, number>> = {}

export function reportLoad(task: Task, fraction: number) {
  done[task] = Math.max(done[task], Math.min(1, fraction))
  if (done[task] >= 1 && at[task] === undefined) at[task] = performance.now()
}

/** when the scene was in, so the cube began to fade in (ms on the page's clock), or null */
export function sceneAt() {
  return at.scene ?? null
}

/** whether everything is in */
export function allIn() {
  return done.scene >= 1 && done.fonts >= 1 && done.images >= 1
}
