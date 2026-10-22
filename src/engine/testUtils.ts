import { applyMove, boardsEqual, type Board } from './puzzle'
import type { SearchResult } from './types'

/** Small deterministic RNG so tests are reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Replays a result's path and checks every step is a legal blank move ending at the goal. */
export function expectValidPath(result: SearchResult, initial: Board, goal: Board): string | null {
  if (!result.found) return 'result is not marked found'
  const path = result.path
  if (path.length === 0) return 'empty path'
  if (!boardsEqual(path[0]!.board, initial)) return 'path does not start at the initial state'
  if (!boardsEqual(path[path.length - 1]!.board, goal)) return 'path does not end at the goal'
  for (let i = 1; i < path.length; i++) {
    const step = path[i]!
    const replay = step.move ? applyMove(path[i - 1]!.board, step.move) : null
    if (!replay || !boardsEqual(replay, step.board)) return `illegal move at step ${i}`
  }
  if (result.stats.moves !== path.length - 1) return 'stats.moves disagrees with path length'
  return null
}
