import type { Board } from './puzzle'
import type { HeuristicId } from './heuristics'
import { heuristicName } from './heuristics'
import { solve } from './search'
import type { AlgorithmId, SearchResult } from './types'

export interface ComparisonConfig {
  algorithm: AlgorithmId
  heuristic?: HeuristicId
}

/** The runs shown on the comparison page – GBFS and A* are run with both required heuristics. */
export const COMPARISON_CONFIGS: readonly ComparisonConfig[] = [
  { algorithm: 'bfs' },
  { algorithm: 'dfs' },
  { algorithm: 'dls' },
  { algorithm: 'iddls' },
  { algorithm: 'ucs' },
  { algorithm: 'gbfs', heuristic: 'misplaced' },
  { algorithm: 'gbfs', heuristic: 'manhattan' },
  { algorithm: 'astar', heuristic: 'misplaced' },
  { algorithm: 'astar', heuristic: 'manhattan' },
]

export interface ComparisonRow {
  key: string
  algorithm: AlgorithmId
  heuristic: HeuristicId | null
  heuristicLabel: string
  result: SearchResult
}

const nextTick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

/**
 * Run every configuration on the same puzzle. Yields to the event loop between runs so
 * the page stays responsive (IDDLS on a hard puzzle can take a few seconds).
 */
export async function runComparison(
  initial: Board,
  goal: Board,
  depthLimit: number,
  onProgress?: (done: number, total: number) => void,
): Promise<ComparisonRow[]> {
  const rows: ComparisonRow[] = []
  for (const [i, config] of COMPARISON_CONFIGS.entries()) {
    await nextTick()
    const result = solve(initial, goal, {
      algorithm: config.algorithm,
      heuristic: config.heuristic ?? 'manhattan',
      depthLimit,
      recordTrace: false,
    })
    rows.push({
      key: `${config.algorithm}-${config.heuristic ?? 'none'}`,
      algorithm: config.algorithm,
      heuristic: config.heuristic ?? null,
      heuristicLabel: config.heuristic ? heuristicName(config.heuristic) : '—',
      result,
    })
    onProgress?.(i + 1, COMPARISON_CONFIGS.length)
  }
  return rows
}
