/**
 * 8-Puzzle state model.
 *
 * A board is a flat, row-major array of 9 numbers. `0` is the blank tile.
 * Moves are described from the point of view of the BLANK tile
 * (e.g. "Up" = the blank moves up, swapping with the tile above it).
 */

export type Board = readonly number[]
export type Move = 'Up' | 'Down' | 'Left' | 'Right'
export type Difficulty = 'easy' | 'medium' | 'hard'

export const SIZE = 3
export const CELLS = SIZE * SIZE

/** Fixed successor ordering – keeps every algorithm deterministic and reproducible. */
export const MOVE_ORDER: readonly Move[] = ['Up', 'Down', 'Left', 'Right']

export const DEFAULT_INITIAL: Board = [2, 8, 3, 1, 6, 4, 7, 0, 5]
export const DEFAULT_GOAL: Board = [1, 2, 3, 8, 0, 4, 7, 6, 5]

const POW9 = Array.from({ length: CELLS }, (_, i) => 9 ** i)

/** Unique integer id of a board (base-9 number, < 9^9 so it is a safe JS integer). */
export function encode(board: Board): number {
  let key = 0
  for (let i = 0; i < CELLS; i++) key += (board[i] as number) * (POW9[i] as number)
  return key
}

export function boardsEqual(a: Board, b: Board): boolean {
  for (let i = 0; i < CELLS; i++) if (a[i] !== b[i]) return false
  return true
}

export function blankIndex(board: Board): number {
  return board.indexOf(0)
}

/** Does the blank have a legal move in this direction from index `b`? */
function targetIndex(b: number, move: Move): number {
  const row = Math.floor(b / SIZE)
  const col = b % SIZE
  switch (move) {
    case 'Up':
      return row > 0 ? b - SIZE : -1
    case 'Down':
      return row < SIZE - 1 ? b + SIZE : -1
    case 'Left':
      return col > 0 ? b - 1 : -1
    case 'Right':
      return col < SIZE - 1 ? b + 1 : -1
  }
}

export function applyMove(board: Board, move: Move): Board | null {
  const b = blankIndex(board)
  const t = targetIndex(b, move)
  if (t < 0) return null
  const next = board.slice()
  next[b] = board[t] as number
  next[t] = 0
  return next
}

export interface Successor {
  board: Board
  move: Move
}

export function successors(board: Board): Successor[] {
  const result: Successor[] = []
  for (const move of MOVE_ORDER) {
    const next = applyMove(board, move)
    if (next) result.push({ board: next, move })
  }
  return result
}

/** A valid board contains each of 0..8 exactly once. */
export function isValidBoard(board: readonly number[]): boolean {
  if (board.length !== CELLS) return false
  const seen = new Set<number>()
  for (const v of board) {
    if (!Number.isInteger(v) || v < 0 || v >= CELLS || seen.has(v)) return false
    seen.add(v)
  }
  return true
}

/** Number of inversions, ignoring the blank. */
export function inversions(board: Board): number {
  let count = 0
  for (let i = 0; i < CELLS; i++) {
    const a = board[i] as number
    if (a === 0) continue
    for (let j = i + 1; j < CELLS; j++) {
      const b = board[j] as number
      if (b !== 0 && a > b) count++
    }
  }
  return count
}

/**
 * On a 3x3 board (odd width) a move never changes inversion parity, so goal is
 * reachable from initial exactly when both have the same parity.
 * This works for ANY goal configuration, not only the canonical one.
 */
export function isSolvable(initial: Board, goal: Board): boolean {
  return inversions(initial) % 2 === inversions(goal) % 2
}

/** Fisher–Yates shuffle with an injectable RNG (so tests are reproducible). */
function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j] as T, a[i] as T]
  }
  return a
}

const SCRAMBLE_MOVES: Record<Exclude<Difficulty, 'hard'>, number> = {
  easy: 8,
  medium: 18,
}

/**
 * Generate a random puzzle that is guaranteed to be solvable towards `goal`.
 *  - easy / medium: random walk of N moves away from the goal (never undoing the previous move)
 *  - hard: uniformly random solvable permutation (average optimal depth ≈ 22)
 */
export function generateRandomPuzzle(
  goal: Board,
  difficulty: Difficulty = 'hard',
  rng: () => number = Math.random,
): Board {
  if (difficulty !== 'hard') {
    let board = goal
    let last: Move | null = null
    const opposite: Record<Move, Move> = { Up: 'Down', Down: 'Up', Left: 'Right', Right: 'Left' }
    for (let i = 0; i < SCRAMBLE_MOVES[difficulty]; i++) {
      const options = successors(board).filter((s) => !last || s.move !== opposite[last])
      const pick = options[Math.floor(rng() * options.length)] as Successor
      board = pick.board
      last = pick.move
    }
    // Extremely unlikely, but never hand back a puzzle that is already solved.
    return boardsEqual(board, goal) ? generateRandomPuzzle(goal, difficulty, rng) : board
  }

  for (;;) {
    let board = shuffle(Array.from({ length: CELLS }, (_, i) => i), rng)
    if (!isSolvable(board, goal)) {
      // Swapping any two non-blank tiles flips parity.
      const idx = board.map((v, i) => (v !== 0 ? i : -1)).filter((i) => i >= 0)
      const [x, y] = [idx[0] as number, idx[1] as number]
      board = board.slice()
      ;[board[x], board[y]] = [board[y] as number, board[x] as number]
    }
    if (!boardsEqual(board, goal)) return board
  }
}

/** Parse "2 8 3 1 6 4 7 _ 5" (spaces/commas/newlines; `_`, `0` or `-` for blank). */
export function parseBoard(text: string): Board | null {
  const tokens = text
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((t) => (t === '_' || t === '-' ? 0 : Number(t)))
  return isValidBoard(tokens) ? tokens : null
}

export function formatBoard(board: Board): string {
  return board.map((v) => (v === 0 ? '_' : String(v))).join(' ')
}
