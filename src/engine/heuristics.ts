import { CELLS, SIZE, type Board } from './puzzle'

export type HeuristicId = 'misplaced' | 'manhattan' | 'linearConflict'
export type Heuristic = (board: Board) => number

export interface HeuristicInfo {
  id: HeuristicId
  name: string
  formula: string
  description: string
}

export const HEURISTICS: readonly HeuristicInfo[] = [
  {
    id: 'misplaced',
    name: 'Misplaced Tiles',
    formula: 'h(n) = number of tiles (excluding the blank) that are not on their goal square',
    description:
      'Counts how many tiles are out of place. Cheap to compute and admissible, but it ignores how far each tile has to travel, so it is the weaker of the two required heuristics.',
  },
  {
    id: 'manhattan',
    name: 'Manhattan Distance',
    formula: 'h(n) = Σ ( |row − goalRow| + |col − goalCol| ) over all tiles except the blank',
    description:
      'Sums the number of horizontal and vertical steps every tile needs to reach its goal square. Admissible and consistent, and much better informed than Misplaced Tiles.',
  },
  {
    id: 'linearConflict',
    name: 'Linear Conflict (bonus)',
    formula: 'h(n) = Manhattan(n) + 2 × (tiles that must leave their row/column to let others pass)',
    description:
      'Extends Manhattan Distance: two tiles that sit in their goal row (or column) but in reversed order must detour, costing at least 2 extra moves. Still admissible, and usually the sharpest of the three.',
  },
]

export function heuristicName(id: HeuristicId): string {
  return HEURISTICS.find((h) => h.id === id)?.name ?? id
}

/** Length of the longest increasing subsequence (inputs are tiny: ≤ 3 items). */
function lis(values: number[]): number {
  const best: number[] = values.map(() => 1)
  let overall = 0
  for (let i = 0; i < values.length; i++) {
    for (let j = 0; j < i; j++) {
      if ((values[j] as number) < (values[i] as number)) {
        best[i] = Math.max(best[i] as number, (best[j] as number) + 1)
      }
    }
    overall = Math.max(overall, best[i] as number)
  }
  return overall
}

/** Build a heuristic function specialised for the given goal state. */
export function makeHeuristic(id: HeuristicId, goal: Board): Heuristic {
  const goalRow: number[] = new Array(CELLS).fill(0)
  const goalCol: number[] = new Array(CELLS).fill(0)
  for (let i = 0; i < CELLS; i++) {
    const tile = goal[i] as number
    goalRow[tile] = Math.floor(i / SIZE)
    goalCol[tile] = i % SIZE
  }

  const misplaced: Heuristic = (board) => {
    let count = 0
    for (let i = 0; i < CELLS; i++) {
      const tile = board[i] as number
      if (tile !== 0 && tile !== goal[i]) count++
    }
    return count
  }

  const manhattan: Heuristic = (board) => {
    let sum = 0
    for (let i = 0; i < CELLS; i++) {
      const tile = board[i] as number
      if (tile === 0) continue
      sum +=
        Math.abs(Math.floor(i / SIZE) - (goalRow[tile] as number)) +
        Math.abs((i % SIZE) - (goalCol[tile] as number))
    }
    return sum
  }

  const linearConflict: Heuristic = (board) => {
    let extra = 0
    for (let line = 0; line < SIZE; line++) {
      // Rows: tiles currently in `line` whose goal row is also `line`, read left→right.
      const rowGoalCols: number[] = []
      // Columns: tiles currently in `line` whose goal column is also `line`, read top→bottom.
      const colGoalRows: number[] = []
      for (let k = 0; k < SIZE; k++) {
        const rowTile = board[line * SIZE + k] as number
        if (rowTile !== 0 && goalRow[rowTile] === line) rowGoalCols.push(goalCol[rowTile] as number)
        const colTile = board[k * SIZE + line] as number
        if (colTile !== 0 && goalCol[colTile] === line) colGoalRows.push(goalRow[colTile] as number)
      }
      extra += (rowGoalCols.length - lis(rowGoalCols)) * 2
      extra += (colGoalRows.length - lis(colGoalRows)) * 2
    }
    return manhattan(board) + extra
  }

  switch (id) {
    case 'misplaced':
      return misplaced
    case 'manhattan':
      return manhattan
    case 'linearConflict':
      return linearConflict
  }
}
