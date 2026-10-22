import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GOAL,
  DEFAULT_INITIAL,
  boardsEqual,
  encode,
  generateRandomPuzzle,
  inversions,
  isSolvable,
  isValidBoard,
  parseBoard,
  successors,
  type Difficulty,
} from './puzzle'
import { makeHeuristic } from './heuristics'
import { mulberry32 } from './testUtils'

describe('puzzle model', () => {
  it('encodes distinct boards to distinct keys', () => {
    expect(encode(DEFAULT_INITIAL)).not.toBe(encode(DEFAULT_GOAL))
    expect(encode(DEFAULT_GOAL)).toBe(encode([...DEFAULT_GOAL]))
  })

  it('generates 2, 3 or 4 successors depending on the blank position', () => {
    expect(successors([0, 1, 2, 3, 4, 5, 6, 7, 8])).toHaveLength(2) // corner
    expect(successors([1, 0, 2, 3, 4, 5, 6, 7, 8])).toHaveLength(3) // edge
    expect(successors([1, 2, 3, 4, 0, 5, 6, 7, 8])).toHaveLength(4) // centre
  })

  it('moves the blank in the documented order', () => {
    const moves = successors([1, 2, 3, 4, 0, 5, 6, 7, 8]).map((s) => s.move)
    expect(moves).toEqual(['Up', 'Down', 'Left', 'Right'])
  })

  it('validates boards', () => {
    expect(isValidBoard(DEFAULT_INITIAL)).toBe(true)
    expect(isValidBoard([1, 1, 2, 3, 4, 5, 6, 7, 8])).toBe(false)
    expect(isValidBoard([1, 2, 3])).toBe(false)
    expect(isValidBoard([1, 2, 3, 4, 5, 6, 7, 8, 9])).toBe(false)
  })

  it('parses text input', () => {
    expect(parseBoard('2 8 3 1 6 4 7 _ 5')).toEqual([...DEFAULT_INITIAL])
    expect(parseBoard('2,8,3,1,6,4,7,0,5')).toEqual([...DEFAULT_INITIAL])
    expect(parseBoard('2 8 3')).toBeNull()
  })

  it('knows the assignment example is solvable and a swapped pair is not', () => {
    expect(isSolvable(DEFAULT_INITIAL, DEFAULT_GOAL)).toBe(true)
    // Swapping two tiles flips parity.
    expect(isSolvable([1, 2, 3, 4, 5, 6, 8, 7, 0], [1, 2, 3, 4, 5, 6, 7, 8, 0])).toBe(false)
    expect(inversions([1, 2, 3, 4, 5, 6, 7, 8, 0])).toBe(0)
  })

  it.each<Difficulty>(['easy', 'medium', 'hard'])('random %s puzzles are always solvable', (difficulty) => {
    const rng = mulberry32(42)
    for (let i = 0; i < 60; i++) {
      const goal = i % 2 ? DEFAULT_GOAL : [1, 2, 3, 4, 5, 6, 7, 8, 0]
      const puzzle = generateRandomPuzzle(goal, difficulty, rng)
      expect(isValidBoard(puzzle)).toBe(true)
      expect(isSolvable(puzzle, goal)).toBe(true)
      expect(boardsEqual(puzzle, goal)).toBe(false)
    }
  })
})

describe('heuristics', () => {
  it('matches hand-computed values for the assignment example', () => {
    expect(makeHeuristic('misplaced', DEFAULT_GOAL)(DEFAULT_INITIAL)).toBe(4)
    expect(makeHeuristic('manhattan', DEFAULT_GOAL)(DEFAULT_INITIAL)).toBe(5)
  })

  it('is zero at the goal', () => {
    for (const id of ['misplaced', 'manhattan', 'linearConflict'] as const) {
      expect(makeHeuristic(id, DEFAULT_GOAL)(DEFAULT_GOAL)).toBe(0)
    }
  })

  it('linear conflict adds 2 for a reversed pair in a row', () => {
    const goal = [1, 2, 3, 4, 5, 6, 7, 8, 0]
    const board = [2, 1, 3, 4, 5, 6, 7, 8, 0] // 1 and 2 swapped in their goal row
    expect(makeHeuristic('manhattan', goal)(board)).toBe(2)
    expect(makeHeuristic('linearConflict', goal)(board)).toBe(4)
  })
})
