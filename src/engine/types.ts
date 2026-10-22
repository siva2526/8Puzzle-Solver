import type { Board, Move } from './puzzle'
import type { HeuristicId } from './heuristics'

export type AlgorithmId = 'bfs' | 'dfs' | 'dls' | 'iddls' | 'ucs' | 'gbfs' | 'astar'

export interface SearchOptions {
  algorithm: AlgorithmId
  /** Used by GBFS and A*. */
  heuristic: HeuristicId
  /** Used by DLS. */
  depthLimit: number
  /** Record a step-by-step trace for the visualiser (off for the comparison page). */
  recordTrace: boolean
  /** Maximum number of recorded expansions (memory guard for the visualiser). */
  maxTraceSteps: number
  /** Safety valve – abort once this many nodes have been generated. */
  maxGenerated: number
}

export const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  algorithm: 'gbfs',
  heuristic: 'manhattan',
  depthLimit: 10,
  recordTrace: true,
  maxTraceSteps: 1500,
  maxGenerated: 25_000_000,
}

/** Everything the UI needs to describe one search node. */
export interface NodeInfo {
  id: number
  parentId: number | null
  board: Board
  parentBoard: Board | null
  /** Direction the blank moved to create this node from its parent. */
  move: Move | null
  depth: number
  /** Path cost so far (every move costs 1). */
  g: number
  /** Heuristic estimate (0 for uninformed algorithms). */
  h: number
  /** Evaluation function: GBFS f=h, A* f=g+h, UCS/uninformed f=g. */
  f: number
}

/**
 * What happened to a generated successor:
 *  - queued:    added to the frontier
 *  - improved:  already known, but this copy is cheaper/shallower, so it replaced the old one
 *  - duplicate: already known and not better – discarded
 */
export type SuccessorStatus = 'queued' | 'improved' | 'duplicate'

export interface SuccessorInfo extends NodeInfo {
  status: SuccessorStatus
}

/** One recorded expansion – a frame of the search-process visualisation. */
export interface TraceStep {
  /** Index of this frame inside `SearchResult.trace`. */
  index: number
  current: NodeInfo
  /** True when `current` is the goal (the search stops here). */
  isGoal: boolean
  successors: SuccessorInfo[]
  /** Next nodes to be selected, in selection order (truncated for display). */
  frontier: NodeInfo[]
  frontierSize: number
  /** Most recently expanded states (oldest → newest), truncated for display. */
  explored: Board[]
  exploredSize: number
  generated: number
  expanded: number
  maxDepth: number
  /** e.g. the depth limit of the current IDDLS iteration. */
  label?: string
  /** Extra remark, e.g. "depth limit reached". */
  note?: string
  /** Expansions that happened since the previous recorded frame but were not recorded. */
  skippedBefore: number
}

export interface SearchStats {
  generated: number
  expanded: number
  /** Successors that were generated but discarded as already-known states. */
  duplicates: number
  /** Deepest node generated. */
  maxDepth: number
  /** Largest number of nodes held in frontier + explored/visited sets at once. */
  peakStored: number
  /** Approximate memory = peakStored × BYTES_PER_NODE. */
  memoryBytes: number
  timeMs: number
  /** Number of moves in the solution (0 when none). */
  moves: number
  pathCost: number
}

/** found | not-found (space exhausted) | cutoff (DLS limit too small) | aborted (node budget hit) */
export type SearchStatus = 'found' | 'not-found' | 'cutoff' | 'aborted'

export interface SearchResult {
  algorithm: AlgorithmId
  heuristic: HeuristicId | null
  status: SearchStatus
  found: boolean
  /** Solution path from the initial state to the goal (empty if none). */
  path: NodeInfo[]
  stats: SearchStats
  trace: TraceStep[]
  /** True when more expansions happened than were recorded in `trace`. */
  traceTruncated: boolean
  initial: Board
  goal: Board
}

/** Rough per-node footprint used for the "memory (approximate)" figure. */
export const BYTES_PER_NODE = 160
