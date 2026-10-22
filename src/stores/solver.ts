/**
 * Shared application state (a tiny singleton store – no Pinia needed).
 * Holds the puzzle, the chosen algorithm and the playback state of the visualiser.
 */
import { computed, ref, shallowRef, watch } from 'vue'
import {
  DEFAULT_GOAL,
  DEFAULT_INITIAL,
  generateRandomPuzzle,
  isSolvable,
  isValidBoard,
  type Board,
  type Difficulty,
} from '@/engine/puzzle'
import type { HeuristicId } from '@/engine/heuristics'
import { solve } from '@/engine/search'
import type { AlgorithmId, NodeInfo, SearchResult, TraceStep } from '@/engine/types'

export type Frame =
  | { kind: 'search'; step: TraceStep; number: number }
  | { kind: 'solution'; node: NodeInfo; index: number; total: number }

/** Delay (ms) between frames for speed 1…10. */
const DELAYS = [1600, 1100, 800, 550, 380, 260, 160, 90, 45, 15]

const initial = ref<Board>(DEFAULT_INITIAL)
const goal = ref<Board>(DEFAULT_GOAL)
const algorithm = ref<AlgorithmId>('gbfs')
const heuristic = ref<HeuristicId>('manhattan')
const depthLimit = ref(10)
const difficulty = ref<Difficulty>('hard')
const speed = ref(4)

/** Results can hold thousands of frames, so keep them out of Vue's deep reactivity. */
const result = shallowRef<SearchResult | null>(null)
const cursor = ref(0)
const playing = ref(false)
const solving = ref(false)
const notice = ref<string | null>(null)

let timer: ReturnType<typeof setTimeout> | undefined

const valid = computed(() => isValidBoard(initial.value) && isValidBoard(goal.value))
const solvable = computed(() => valid.value && isSolvable(initial.value, goal.value))

const searchFrames = computed(() => result.value?.trace.length ?? 0)
const solutionFrames = computed(() => (result.value?.found ? result.value.path.length : 0))
const totalFrames = computed(() => searchFrames.value + solutionFrames.value)

const frame = computed<Frame | null>(() => {
  const r = result.value
  if (!r || totalFrames.value === 0) return null
  if (cursor.value < r.trace.length) {
    return { kind: 'search', step: r.trace[cursor.value] as TraceStep, number: cursor.value + 1 }
  }
  const index = cursor.value - r.trace.length
  const node = r.path[index]
  return node ? { kind: 'solution', node, index, total: r.path.length } : null
})

/** The state shown on the big board. */
const currentBoard = computed<Board>(() => {
  const f = frame.value
  if (!f) return initial.value
  return f.kind === 'search' ? f.step.current.board : f.node.board
})

const atEnd = computed(() => totalFrames.value > 0 && cursor.value >= totalFrames.value - 1)

function stopTimer(): void {
  if (timer !== undefined) clearTimeout(timer)
  timer = undefined
}

function schedule(): void {
  stopTimer()
  timer = setTimeout(tick, DELAYS[speed.value - 1] ?? 550)
}

function tick(): void {
  if (!playing.value) return
  if (cursor.value < totalFrames.value - 1) {
    cursor.value++
    schedule()
  } else {
    playing.value = false
  }
}

function pause(): void {
  playing.value = false
  stopTimer()
}

function resume(): void {
  if (!result.value || totalFrames.value === 0) return
  if (atEnd.value) cursor.value = 0
  playing.value = true
  schedule()
}

function clearResult(): void {
  pause()
  result.value = null
  cursor.value = 0
}

function reset(): void {
  clearResult()
  notice.value = null
}

/** Run the selected algorithm on the current puzzle. Returns false if it could not start. */
async function compute(): Promise<boolean> {
  pause()
  notice.value = null
  if (!valid.value) {
    notice.value = 'Fix the highlighted puzzle first: each of 0–8 (blank) must appear exactly once.'
    return false
  }
  if (!solvable.value) {
    notice.value =
      'This initial state cannot reach the goal state (parity of inversions differs). Edit a state or generate a random puzzle.'
    return false
  }
  solving.value = true
  // Let the browser paint the "Searching…" state before the synchronous search starts.
  await new Promise((r) => setTimeout(r, 30))
  try {
    result.value = solve(initial.value, goal.value, {
      algorithm: algorithm.value,
      heuristic: heuristic.value,
      depthLimit: depthLimit.value,
      recordTrace: true,
    })
    cursor.value = 0
    return true
  } catch (error) {
    notice.value = error instanceof Error ? error.message : String(error)
    return false
  } finally {
    solving.value = false
  }
}

async function run(): Promise<void> {
  if (await compute()) resume()
}

async function next(): Promise<void> {
  if (!result.value) {
    if (!(await compute())) return
    return // first press just opens frame 1 (paused)
  }
  pause()
  if (cursor.value < totalFrames.value - 1) cursor.value++
}

function previous(): void {
  pause()
  if (cursor.value > 0) cursor.value--
}

function seek(index: number): void {
  pause()
  cursor.value = Math.max(0, Math.min(index, Math.max(totalFrames.value - 1, 0)))
}

function jumpToSolution(): void {
  if (solutionFrames.value > 0) seek(searchFrames.value)
}

function randomize(): void {
  initial.value = generateRandomPuzzle(goal.value, difficulty.value)
}

function swapStates(): void {
  const a = initial.value
  initial.value = goal.value
  goal.value = a
}

function loadExample(): void {
  initial.value = DEFAULT_INITIAL
  goal.value = DEFAULT_GOAL
}

// Any change to the problem definition invalidates the previous result.
watch([initial, goal, algorithm, heuristic, depthLimit], clearResult)
watch(speed, () => {
  if (playing.value) schedule()
})

export function useSolver() {
  return {
    // inputs
    initial,
    goal,
    algorithm,
    heuristic,
    depthLimit,
    difficulty,
    speed,
    // derived
    valid,
    solvable,
    // output
    result,
    cursor,
    playing,
    solving,
    notice,
    frame,
    currentBoard,
    totalFrames,
    searchFrames,
    solutionFrames,
    atEnd,
    animationMs: computed(() => Math.min(420, (DELAYS[speed.value - 1] ?? 550) * 0.8)),
    // actions
    run,
    pause,
    resume,
    next,
    previous,
    reset,
    seek,
    jumpToSolution,
    randomize,
    swapStates,
    loadExample,
  }
}
