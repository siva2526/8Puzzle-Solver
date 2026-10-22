import { describe, expect, it } from 'vitest'
import { DEFAULT_GOAL, DEFAULT_INITIAL, generateRandomPuzzle, isSolvable, type Board } from './puzzle'
import { makeHeuristic, type HeuristicId } from './heuristics'
import { solve } from './search'
import type { AlgorithmId } from './types'
import { expectValidPath, mulberry32 } from './testUtils'

const ALL: AlgorithmId[] = ['bfs', 'dfs', 'dls', 'iddls', 'ucs', 'gbfs', 'astar']
const HEURISTIC_IDS: HeuristicId[] = ['misplaced', 'manhattan', 'linearConflict']

describe('assignment example (2 8 3 / 1 6 4 / 7 _ 5 → 1 2 3 / 8 _ 4 / 7 6 5)', () => {
  it.each(ALL)('%s finds a valid solution', (algorithm) => {
    const result = solve(DEFAULT_INITIAL, DEFAULT_GOAL, { algorithm, depthLimit: 12 })
    expect(result.status).toBe('found')
    expect(expectValidPath(result, DEFAULT_INITIAL, DEFAULT_GOAL)).toBeNull()
  })

  it.each(['bfs', 'iddls', 'ucs', 'astar'] as AlgorithmId[])('%s is optimal (5 moves)', (algorithm) => {
    expect(solve(DEFAULT_INITIAL, DEFAULT_GOAL, { algorithm }).stats.moves).toBe(5)
  })

  it.each(HEURISTIC_IDS)('GBFS with %s finds a solution', (heuristic) => {
    const result = solve(DEFAULT_INITIAL, DEFAULT_GOAL, { algorithm: 'gbfs', heuristic })
    expect(result.found).toBe(true)
    expect(result.heuristic).toBe(heuristic)
    expect(expectValidPath(result, DEFAULT_INITIAL, DEFAULT_GOAL)).toBeNull()
  })

  it('GBFS orders the frontier by h(n) alone and reports f = h', () => {
    const result = solve(DEFAULT_INITIAL, DEFAULT_GOAL, { algorithm: 'gbfs', heuristic: 'manhattan' })
    for (const step of result.trace) {
      for (let i = 1; i < step.frontier.length; i++) {
        expect(step.frontier[i]!.h).toBeGreaterThanOrEqual(step.frontier[i - 1]!.h)
      }
      expect(step.current.f).toBe(step.current.h)
    }
    // Root has h = 5.
    expect(result.trace[0]!.current.h).toBe(5)
  })

  it('A* reports f = g + h', () => {
    const result = solve(DEFAULT_INITIAL, DEFAULT_GOAL, { algorithm: 'astar' })
    for (const node of result.path) expect(node.f).toBe(node.g + node.h)
  })

  it('GBFS needs far fewer expansions than BFS here', () => {
    const gbfs = solve(DEFAULT_INITIAL, DEFAULT_GOAL, { algorithm: 'gbfs' })
    const bfs = solve(DEFAULT_INITIAL, DEFAULT_GOAL, { algorithm: 'bfs' })
    expect(gbfs.stats.expanded).toBeLessThan(bfs.stats.expanded)
  })
})

describe('depth limited search', () => {
  it('reports a cutoff when the limit is too small', () => {
    const result = solve(DEFAULT_INITIAL, DEFAULT_GOAL, { algorithm: 'dls', depthLimit: 4 })
    expect(result.status).toBe('cutoff')
    expect(result.found).toBe(false)
    expect(result.path).toEqual([])
  })

  it('finds the goal exactly at the optimal depth and never exceeds the limit', () => {
    const exact = solve(DEFAULT_INITIAL, DEFAULT_GOAL, { algorithm: 'dls', depthLimit: 5 })
    expect(exact.found).toBe(true)
    const loose = solve(DEFAULT_INITIAL, DEFAULT_GOAL, { algorithm: 'dls', depthLimit: 9 })
    expect(loose.found).toBe(true)
    expect(loose.stats.moves).toBeLessThanOrEqual(9)
  })
})

describe('trivial and degenerate inputs', () => {
  it.each(ALL)('%s handles initial == goal', (algorithm) => {
    const result = solve(DEFAULT_GOAL, DEFAULT_GOAL, { algorithm })
    expect(result.found).toBe(true)
    expect(result.stats.moves).toBe(0)
    expect(result.path).toHaveLength(1)
  })

  it('rejects invalid boards', () => {
    expect(() => solve([1, 1, 1, 1, 1, 1, 1, 1, 1], DEFAULT_GOAL)).toThrow()
  })

  it('exhausts the space on an unsolvable puzzle', () => {
    const goal = [1, 2, 3, 4, 5, 6, 7, 8, 0]
    const unsolvable = [1, 2, 3, 4, 5, 6, 8, 7, 0]
    expect(isSolvable(unsolvable, goal)).toBe(false)
    const result = solve(unsolvable, goal, { algorithm: 'gbfs', recordTrace: false })
    expect(result.status).toBe('not-found')
    // Half of the 9! = 362,880 arrangements are reachable.
    expect(result.stats.expanded).toBe(181_440)
  })
})

describe('correctness on random puzzles', () => {
  const rng = mulberry32(2026)
  const puzzles: Board[] = [
    ...Array.from({ length: 10 }, () => generateRandomPuzzle(DEFAULT_GOAL, 'medium', rng)),
    ...Array.from({ length: 6 }, () => generateRandomPuzzle(DEFAULT_GOAL, 'hard', rng)),
  ]

  it('every algorithm returns a legal path; optimal algorithms agree on length', () => {
    for (const puzzle of puzzles) {
      const bfs = solve(puzzle, DEFAULT_GOAL, { algorithm: 'bfs', recordTrace: false })
      expect(bfs.found).toBe(true)
      const optimal = bfs.stats.moves

      for (const algorithm of ['ucs', 'iddls'] as AlgorithmId[]) {
        const r = solve(puzzle, DEFAULT_GOAL, { algorithm, recordTrace: false })
        expect(expectValidPath(r, puzzle, DEFAULT_GOAL)).toBeNull()
        expect(r.stats.moves).toBe(optimal)
      }
      for (const heuristic of HEURISTIC_IDS) {
        const a = solve(puzzle, DEFAULT_GOAL, { algorithm: 'astar', heuristic, recordTrace: false })
        expect(expectValidPath(a, puzzle, DEFAULT_GOAL)).toBeNull()
        expect(a.stats.moves).toBe(optimal) // admissible ⇒ optimal

        const g = solve(puzzle, DEFAULT_GOAL, { algorithm: 'gbfs', heuristic, recordTrace: false })
        expect(expectValidPath(g, puzzle, DEFAULT_GOAL)).toBeNull()
        expect(g.stats.moves).toBeGreaterThanOrEqual(optimal) // greedy may be longer, never shorter

        // Admissibility: h(start) never exceeds the true distance.
        expect(makeHeuristic(heuristic, DEFAULT_GOAL)(puzzle)).toBeLessThanOrEqual(optimal)
      }
      const dfs = solve(puzzle, DEFAULT_GOAL, { algorithm: 'dfs', recordTrace: false })
      expect(expectValidPath(dfs, puzzle, DEFAULT_GOAL)).toBeNull()
      const dls = solve(puzzle, DEFAULT_GOAL, { algorithm: 'dls', depthLimit: optimal, recordTrace: false })
      expect(dls.found).toBe(true)
      expect(dls.stats.moves).toBeLessThanOrEqual(optimal)
    }
  }, 120_000)

  it('stronger heuristics never expand more nodes in A* than weaker ones (on average)', () => {
    let misplaced = 0
    let manhattan = 0
    for (const puzzle of puzzles) {
      misplaced += solve(puzzle, DEFAULT_GOAL, { algorithm: 'astar', heuristic: 'misplaced', recordTrace: false }).stats.expanded
      manhattan += solve(puzzle, DEFAULT_GOAL, { algorithm: 'astar', heuristic: 'manhattan', recordTrace: false }).stats.expanded
    }
    expect(manhattan).toBeLessThan(misplaced)
  })
})

describe('trace recording', () => {
  it('starts at the root, ends at the goal and keeps counters monotonic', () => {
    const result = solve(DEFAULT_INITIAL, DEFAULT_GOAL, { algorithm: 'gbfs' })
    const trace = result.trace
    expect(trace[0]!.current.depth).toBe(0)
    expect(trace[trace.length - 1]!.isGoal).toBe(true)
    for (let i = 1; i < trace.length; i++) {
      expect(trace[i]!.generated).toBeGreaterThanOrEqual(trace[i - 1]!.generated)
      expect(trace[i]!.expanded).toBeGreaterThanOrEqual(trace[i - 1]!.expanded)
    }
    expect(trace[trace.length - 1]!.generated).toBe(result.stats.generated)
    expect(trace[trace.length - 1]!.expanded).toBe(result.stats.expanded)
  })

  it('truncates long searches but always keeps the final goal frame', () => {
    const rng = mulberry32(7)
    const puzzle = generateRandomPuzzle(DEFAULT_GOAL, 'hard', rng)
    const result = solve(puzzle, DEFAULT_GOAL, { algorithm: 'bfs', maxTraceSteps: 50 })
    expect(result.trace.length).toBeLessThanOrEqual(50)
    expect(result.traceTruncated).toBe(true)
    expect(result.trace[result.trace.length - 1]!.isGoal).toBe(true)
    expect(result.trace[result.trace.length - 1]!.skippedBefore).toBeGreaterThan(0)
  })

  it('records nothing when tracing is off', () => {
    const result = solve(DEFAULT_INITIAL, DEFAULT_GOAL, { algorithm: 'gbfs', recordTrace: false })
    expect(result.trace).toHaveLength(0)
  })

  it('aborts when the node budget is exhausted', () => {
    const rng = mulberry32(11)
    const puzzle = generateRandomPuzzle(DEFAULT_GOAL, 'hard', rng)
    const result = solve(puzzle, DEFAULT_GOAL, { algorithm: 'bfs', maxGenerated: 100, recordTrace: false })
    expect(result.status).toBe('aborted')
  })
})
