/**
 * State-space search for the 8-Puzzle – implemented from scratch.
 *
 *   Uninformed: BFS, DFS, DLS, IDDLS, UCS
 *   Informed:   GBFS (primary algorithm of this project), A*
 *
 * Conventions (identical for every algorithm so the comparison page is fair):
 *  - Every move costs 1, so path cost g(n) equals depth.
 *  - The goal test is applied when a node is SELECTED from the frontier.
 *  - "Generated" counts every successor produced plus the root;
 *    "expanded" counts nodes whose successors were produced (the goal node is selected, not expanded).
 *  - Successors are always produced in the order Up, Down, Left, Right (blank movement).
 *  - Ties are broken first-in-first-out, so every run is deterministic.
 */
import {
  boardsEqual,
  encode,
  isValidBoard,
  successors,
  type Board,
  type Move,
} from './puzzle'
import { makeHeuristic, type Heuristic } from './heuristics'
import { PriorityFrontier, QueueFrontier, StackFrontier, type Frontier } from './frontier'
import {
  BYTES_PER_NODE,
  DEFAULT_SEARCH_OPTIONS,
  type AlgorithmId,
  type NodeInfo,
  type SearchOptions,
  type SearchResult,
  type SearchStatus,
  type SuccessorInfo,
  type SuccessorStatus,
  type TraceStep,
} from './types'

/** Longest possible optimal solution on the 3×3 board (the diameter of the state graph). */
export const MAX_SOLUTION_DEPTH = 31
const FRONTIER_PREVIEW = 30
const EXPLORED_PREVIEW = 30

export const INFORMED_ALGORITHMS: readonly AlgorithmId[] = ['gbfs', 'astar']

export function isInformed(id: AlgorithmId): boolean {
  return INFORMED_ALGORITHMS.includes(id)
}

interface Node {
  id: number
  board: Board
  key: number
  parent: Node | null
  move: Move | null
  depth: number
  g: number
  h: number
  f: number
}

function toInfo(node: Node): NodeInfo {
  return {
    id: node.id,
    parentId: node.parent ? node.parent.id : null,
    board: node.board,
    parentBoard: node.parent ? node.parent.board : null,
    move: node.move,
    depth: node.depth,
    g: node.g,
    h: node.h,
    f: node.f,
  }
}

interface FrameInput {
  current: Node
  isGoal: boolean
  successors: SuccessorInfo[]
  frontier: () => Node[]
  frontierSize: number
  exploredSize: number
  label?: string
  note?: string
}

/** Shared bookkeeping for one search run: counters, node factory, trace recorder. */
class Run {
  generated = 0
  expanded = 0
  duplicates = 0
  maxDepth = 0
  peakStored = 0
  private nextId = 0
  private readonly startedAt = performance.now()
  readonly goalKey: number
  readonly heuristic: Heuristic
  readonly informed: boolean
  private readonly steps: TraceStep[] = []
  private skipped = 0
  private truncated = false
  private readonly expandedLog: Board[] = []

  constructor(
    readonly initial: Board,
    readonly goal: Board,
    readonly opts: SearchOptions,
  ) {
    this.goalKey = encode(goal)
    this.informed = isInformed(opts.algorithm)
    this.heuristic = this.informed ? makeHeuristic(opts.heuristic, goal) : () => 0
  }

  newNode(board: Board, parent: Node | null, move: Move | null): Node {
    const depth = parent ? parent.depth + 1 : 0
    const g = depth
    const h = this.heuristic(board)
    const f = this.opts.algorithm === 'gbfs' ? h : g + h
    this.generated++
    if (depth > this.maxDepth) this.maxDepth = depth
    return { id: this.nextId++, board, key: encode(board), parent, move, depth, g, h, f }
  }

  noteStored(count: number): void {
    if (count > this.peakStored) this.peakStored = count
  }

  logExpanded(board: Board): void {
    if (this.opts.recordTrace) this.expandedLog.push(board)
  }

  info(node: Node, status: SuccessorStatus): SuccessorInfo {
    return { ...toInfo(node), status }
  }

  /** Record a frame – or count it as skipped once the trace budget is used up. */
  frame(input: FrameInput): void {
    if (!this.opts.recordTrace) return
    // Always keep room for the final (goal) frame so the trace ends at the goal.
    if (!input.isGoal && this.steps.length >= this.opts.maxTraceSteps - 1) {
      this.skipped++
      this.truncated = true
      return
    }
    this.steps.push({
      index: this.steps.length,
      current: toInfo(input.current),
      isGoal: input.isGoal,
      successors: input.successors,
      frontier: input.frontier().map(toInfo),
      frontierSize: input.frontierSize,
      explored: this.expandedLog.slice(-EXPLORED_PREVIEW),
      exploredSize: input.exploredSize,
      generated: this.generated,
      expanded: this.expanded,
      maxDepth: this.maxDepth,
      label: input.label,
      note: input.note,
      skippedBefore: this.skipped,
    })
    this.skipped = 0
  }

  finish(status: SearchStatus, goalNode: Node | null): SearchResult {
    const nodes: Node[] = []
    for (let n = goalNode; n; n = n.parent) nodes.push(n)
    nodes.reverse()
    const moves = goalNode ? nodes.length - 1 : 0
    return {
      algorithm: this.opts.algorithm,
      heuristic: this.informed ? this.opts.heuristic : null,
      status,
      found: status === 'found',
      path: nodes.map(toInfo),
      stats: {
        generated: this.generated,
        expanded: this.expanded,
        duplicates: this.duplicates,
        maxDepth: this.maxDepth,
        peakStored: this.peakStored,
        memoryBytes: this.peakStored * BYTES_PER_NODE,
        timeMs: performance.now() - this.startedAt,
        moves,
        pathCost: moves,
      },
      trace: this.steps,
      traceTruncated: this.truncated,
      initial: this.initial,
      goal: this.goal,
    }
  }
}

/* ------------------------------------------------------------------ */
/*  BFS, DFS, UCS, GBFS, A*  – graph search with explored set          */
/* ------------------------------------------------------------------ */

function createFrontier(algorithm: AlgorithmId): Frontier<Node> {
  switch (algorithm) {
    case 'bfs':
      return new QueueFrontier<Node>()
    case 'dfs':
      return new StackFrontier<Node>()
    case 'ucs':
      return new PriorityFrontier<Node>((a, b) => a.g - b.g || a.id - b.id)
    case 'gbfs':
      // Greedy: order by h(n) only. FIFO among equal h.
      return new PriorityFrontier<Node>((a, b) => a.h - b.h || a.id - b.id)
    case 'astar':
      return new PriorityFrontier<Node>((a, b) => a.f - b.f || a.h - b.h || a.id - b.id)
    default:
      throw new Error(`Not a graph-search algorithm: ${algorithm}`)
  }
}

function graphSearch(run: Run): SearchResult {
  const { algorithm } = run.opts
  const frontier = createFrontier(algorithm)
  // UCS and A* may find a cheaper route to a known state; the others never revisit a known state.
  const canImprove = algorithm === 'ucs' || algorithm === 'astar'

  /** States currently waiting in the frontier (the live entry for each state). */
  const open = new Map<number, Node>()
  /** States already expanded (the closed list). */
  const closed = new Map<number, Node>()
  const isLive = (n: Node) => open.get(n.key) === n

  const root = run.newNode(run.initial, null, null)
  frontier.push(root)
  open.set(root.key, root)
  run.noteStored(1)

  while (open.size > 0) {
    if (run.generated > run.opts.maxGenerated) return run.finish('aborted', null)

    const node = frontier.pop()
    if (!node || !isLive(node)) continue // stale entry replaced by a cheaper copy
    open.delete(node.key)

    if (node.key === run.goalKey) {
      run.frame({
        current: node,
        isGoal: true,
        successors: [],
        frontier: () => frontier.peek(FRONTIER_PREVIEW, isLive),
        frontierSize: open.size,
        exploredSize: closed.size,
      })
      return run.finish('found', node)
    }

    closed.set(node.key, node)
    run.expanded++
    run.logExpanded(node.board)

    const infos: SuccessorInfo[] = []
    const toQueue: Node[] = []
    for (const { board, move } of successors(node.board)) {
      const child = run.newNode(board, node, move)
      const known = open.get(child.key) ?? closed.get(child.key)
      let status: SuccessorStatus = 'queued'

      if (known) {
        if (canImprove && child.g < known.g) {
          status = 'improved'
          closed.delete(child.key) // re-open if it had been expanded
        } else {
          status = 'duplicate'
          run.duplicates++
        }
      }

      if (status !== 'duplicate') {
        open.set(child.key, child)
        toQueue.push(child)
      }
      infos.push(run.info(child, status))
    }

    // Stack: push in reverse so the first successor (Up) is explored first.
    if (algorithm === 'dfs') toQueue.reverse()
    for (const child of toQueue) frontier.push(child)

    run.noteStored(open.size + closed.size)
    run.frame({
      current: node,
      isGoal: false,
      successors: infos,
      frontier: () => frontier.peek(FRONTIER_PREVIEW, isLive),
      frontierSize: open.size,
      exploredSize: closed.size,
    })
  }

  return run.finish('not-found', null)
}

/* ------------------------------------------------------------------ */
/*  DLS and IDDLS – depth-limited search                               */
/* ------------------------------------------------------------------ */

type PassOutcome =
  | { status: 'found'; goal: Node }
  | { status: 'cutoff' }
  | { status: 'failure' }
  | { status: 'aborted' }

/**
 * One depth-limited depth-first pass.
 *
 * To keep the search finite on the 8-puzzle's cyclic state graph we remember, for every
 * state, the shallowest depth at which it has been reached in this pass; a state is only
 * (re-)queued when reached at a strictly shallower depth. This never loses a solution that
 * lies within the limit, and prunes the exponential re-expansion of plain tree search.
 */
function depthLimitedPass(run: Run, limit: number, label?: string): PassOutcome {
  const stack = new StackFrontier<Node>()
  const bestDepth = new Map<number, number>()
  const isLive = (n: Node) => bestDepth.get(n.key) === n.depth

  const root = run.newNode(run.initial, null, null)
  stack.push(root)
  bestDepth.set(root.key, 0)
  let cutoffHit = false

  while (stack.length > 0) {
    if (run.generated > run.opts.maxGenerated) return { status: 'aborted' }

    const node = stack.pop() as Node
    if (!isLive(node)) continue // a shallower copy of this state superseded it

    if (node.key === run.goalKey) {
      run.frame({
        current: node,
        isGoal: true,
        successors: [],
        frontier: () => stack.peek(FRONTIER_PREVIEW, isLive),
        frontierSize: stack.length,
        exploredSize: run.expanded,
        label,
      })
      return { status: 'found', goal: node }
    }

    if (node.depth >= limit) {
      cutoffHit = true
      run.frame({
        current: node,
        isGoal: false,
        successors: [],
        frontier: () => stack.peek(FRONTIER_PREVIEW, isLive),
        frontierSize: stack.length,
        exploredSize: run.expanded,
        label,
        note: `Depth limit ${limit} reached – node not expanded (cutoff)`,
      })
      continue
    }

    run.expanded++
    run.logExpanded(node.board)

    const infos: SuccessorInfo[] = []
    const toQueue: Node[] = []
    for (const { board, move } of successors(node.board)) {
      const child = run.newNode(board, node, move)
      const previous = bestDepth.get(child.key)
      let status: SuccessorStatus = 'queued'
      if (previous !== undefined) {
        if (child.depth < previous) {
          status = 'improved'
        } else {
          status = 'duplicate'
          run.duplicates++
        }
      }
      if (status !== 'duplicate') {
        bestDepth.set(child.key, child.depth)
        toQueue.push(child)
      }
      infos.push(run.info(child, status))
    }
    toQueue.reverse() // first successor is explored first
    for (const child of toQueue) stack.push(child)

    run.noteStored(bestDepth.size + stack.length)
    run.frame({
      current: node,
      isGoal: false,
      successors: infos,
      frontier: () => stack.peek(FRONTIER_PREVIEW, isLive),
      frontierSize: stack.length,
      exploredSize: run.expanded,
      label,
    })
  }

  return cutoffHit ? { status: 'cutoff' } : { status: 'failure' }
}

function depthLimitedSearch(run: Run): SearchResult {
  const limit = Math.max(0, Math.floor(run.opts.depthLimit))
  const outcome = depthLimitedPass(run, limit, `limit = ${limit}`)
  return outcome.status === 'found'
    ? run.finish('found', outcome.goal)
    : run.finish(outcome.status === 'failure' ? 'not-found' : outcome.status, null)
}

function iterativeDeepeningSearch(run: Run): SearchResult {
  for (let limit = 0; limit <= MAX_SOLUTION_DEPTH; limit++) {
    const outcome = depthLimitedPass(run, limit, `limit = ${limit}`)
    if (outcome.status === 'found') return run.finish('found', outcome.goal)
    if (outcome.status === 'aborted') return run.finish('aborted', null)
    if (outcome.status === 'failure') return run.finish('not-found', null) // whole space exhausted
  }
  // No solution within the 8-puzzle's maximum optimal depth ⇒ unreachable goal.
  return run.finish('not-found', null)
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function solve(initial: Board, goal: Board, options: Partial<SearchOptions> = {}): SearchResult {
  if (!isValidBoard(initial) || !isValidBoard(goal)) {
    throw new Error('Initial and goal states must each contain the numbers 0–8 exactly once.')
  }
  const opts: SearchOptions = { ...DEFAULT_SEARCH_OPTIONS, ...options }
  const run = new Run(initial, goal, opts)

  if (boardsEqual(initial, goal)) {
    // Trivial: the root is already the goal – works for every algorithm.
    const root = run.newNode(initial, null, null)
    run.noteStored(1)
    run.frame({
      current: root,
      isGoal: true,
      successors: [],
      frontier: () => [],
      frontierSize: 0,
      exploredSize: 0,
    })
    return run.finish('found', root)
  }

  switch (opts.algorithm) {
    case 'dls':
      return depthLimitedSearch(run)
    case 'iddls':
      return iterativeDeepeningSearch(run)
    default:
      return graphSearch(run)
  }
}

/** Qualitative memory class for the comparison table. */
export type MemoryClass = 'Low' | 'Medium' | 'High'

export function memoryClass(peakStored: number): MemoryClass {
  if (peakStored < 5_000) return 'Low'
  if (peakStored < 40_000) return 'Medium'
  return 'High'
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function formatTime(ms: number): string {
  if (ms < 1) return `${ms.toFixed(2)} ms`
  if (ms < 1000) return `${ms.toFixed(1)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}
