/** What the intro waits for, and how much of the loading ring each part fills. */
const WEIGHTS = { scene: 0.5, fonts: 0.1, images: 0.4 } as const
type Task = keyof typeof WEIGHTS

const done: Record<Task, number> = { scene: 0, fonts: 0, images: 0 }

export function reportLoad(task: Task, fraction: number) {
  done[task] = Math.max(done[task], Math.min(1, fraction))
}

/**
 * Overall progress, 0..1. The 3D scene arrives in one piece, so while it downloads its share
 * creeps forward on a curve (never quite reaching it) instead of sitting still.
 */
export function loadProgress(elapsedSeconds: number) {
  let p = 0
  for (const task of Object.keys(WEIGHTS) as Task[]) {
    const part = task === 'scene' && done.scene < 1 ? 0.85 * (1 - Math.exp(-elapsedSeconds / 1.4)) : done[task]
    p += WEIGHTS[task] * part
  }
  return p
}
