import type { AlgorithmId } from '@/engine/types'

export interface AlgorithmDoc {
  id: AlgorithmId
  name: string
  shortName: string
  kind: 'Uninformed' | 'Informed'
  /** Assignment algorithm number. */
  number: number
  description: string
  workingPrinciple: string[]
  advantages: string[]
  limitations: string[]
  timeComplexity: string
  spaceComplexity: string
  complete: { value: 'Yes' | 'No'; note: string }
  optimal: { value: 'Yes' | 'No'; note: string }
  frontier: string
  inThisApp: string
}

export const ALGORITHM_DOCS: readonly AlgorithmDoc[] = [
  {
    id: 'bfs',
    name: 'Breadth First Search',
    shortName: 'BFS',
    kind: 'Uninformed',
    number: 1,
    description:
      'Explores the state space level by level: all states one move from the start, then all states two moves away, and so on.',
    workingPrinciple: [
      'Put the initial state in a FIFO queue.',
      'Remove the oldest state from the queue; if it is the goal, stop.',
      'Otherwise generate its successors and append every state not seen before to the back of the queue.',
      'Repeat – shallower states are therefore always expanded before deeper ones.',
    ],
    advantages: [
      'Finds the shallowest goal, i.e. the solution with the fewest moves.',
      'Complete on a finite state space.',
      'Simple and predictable.',
    ],
    limitations: [
      'Memory explodes: the whole frontier of a level must be stored.',
      'Ignores any knowledge about where the goal is, so it expands many irrelevant states.',
    ],
    timeComplexity: 'O(b^d)',
    spaceComplexity: 'O(b^d)',
    complete: { value: 'Yes', note: 'when the branching factor b is finite' },
    optimal: { value: 'Yes', note: 'when every move has the same cost (true for the 8-puzzle)' },
    frontier: 'FIFO queue',
    inThisApp:
      'Worst case on the 8-puzzle expands all 181,440 reachable states, so it is the memory-hungry baseline in the comparison table.',
  },
  {
    id: 'dfs',
    name: 'Depth First Search',
    shortName: 'DFS',
    kind: 'Uninformed',
    number: 2,
    description:
      'Follows one branch as deep as possible before backing up and trying the next branch.',
    workingPrinciple: [
      'Put the initial state on a LIFO stack.',
      'Pop the most recently added state; if it is the goal, stop.',
      'Push its unseen successors; the newest one is expanded next.',
      'When a branch has no new states, the search automatically backtracks to an older branch.',
    ],
    advantages: [
      'Very small frontier compared with BFS.',
      'Can reach a solution quickly if it happens to pick the right branch.',
    ],
    limitations: [
      'Not optimal: the first solution found can be extremely long (thousands of moves on the 8-puzzle).',
      'Without a visited set it loops forever on cycles; this app keeps one.',
    ],
    timeComplexity: 'O(b^m)',
    spaceComplexity: 'O(b·m) as tree search; O(states) with a visited set',
    complete: { value: 'Yes', note: 'only with a visited set on a finite space (as implemented here)' },
    optimal: { value: 'No', note: 'it returns the first path it stumbles on' },
    frontier: 'LIFO stack',
    inThisApp:
      'Uses a visited set. Expect very long, winding solution paths – a good illustration of why DFS is not optimal.',
  },
  {
    id: 'dls',
    name: 'Depth Limited Search',
    shortName: 'DLS',
    kind: 'Uninformed',
    number: 3,
    description:
      'Depth First Search with a hard depth limit l: nodes at depth l are not expanded, which prevents infinite descent.',
    workingPrinciple: [
      'Run depth first search from the initial state.',
      'A node at depth l is tested against the goal but never expanded (cutoff).',
      'If the goal is found within the limit, return the path.',
      'If a cutoff happened and no goal was found, report "cutoff" – a larger limit might still succeed.',
    ],
    advantages: ['Guaranteed to terminate.', 'Memory use stays close to DFS.'],
    limitations: [
      'Incomplete when the limit is smaller than the shallowest goal depth d.',
      'Not optimal when the limit is larger than d.',
      'Choosing a good limit requires knowing the problem (the 8-puzzle never needs more than 31).',
    ],
    timeComplexity: 'O(b^l)',
    spaceComplexity: 'O(b·l)',
    complete: { value: 'No', note: 'fails when l < d' },
    optimal: { value: 'No', note: 'may return a path longer than the shortest one' },
    frontier: 'LIFO stack',
    inThisApp:
      'A state is re-queued only when reached at a shallower depth than before, which keeps the search finite on the cyclic 8-puzzle graph without losing any solution within the limit.',
  },
  {
    id: 'iddls',
    name: 'Iterative Deepening Depth Limited Search',
    shortName: 'IDDLS',
    kind: 'Uninformed',
    number: 4,
    description:
      'Repeats depth limited search with limits 0, 1, 2, … until the goal is found, combining DFS memory with BFS optimality.',
    workingPrinciple: [
      'Set the limit l = 0.',
      'Run a complete depth limited search with limit l.',
      'If the goal is found, return it; otherwise increase l by one and start again.',
      'Shallow levels are regenerated many times, but they are cheap compared with the deepest level.',
    ],
    advantages: [
      'Complete and optimal for unit step costs.',
      'Needs memory proportional to the solution depth only (as tree search).',
    ],
    limitations: [
      'Re-expands upper levels in every iteration.',
      'Still exponential in time and ignores heuristic knowledge.',
    ],
    timeComplexity: 'O(b^d)',
    spaceComplexity: 'O(b·d)',
    complete: { value: 'Yes', note: 'when b is finite' },
    optimal: { value: 'Yes', note: 'when every move has the same cost' },
    frontier: 'LIFO stack (restarted for each limit)',
    inThisApp:
      'The statistics add up the work of every iteration. The limit is capped at 31, the largest optimal depth on the 3×3 board.',
  },
  {
    id: 'ucs',
    name: 'Uniform Cost Search',
    shortName: 'UCS',
    kind: 'Uninformed',
    number: 5,
    description:
      'Always expands the frontier node with the lowest path cost g(n); the generalisation of BFS to non-uniform step costs.',
    workingPrinciple: [
      'Keep the frontier in a priority queue ordered by g(n).',
      'Remove the cheapest node; if it is the goal, stop.',
      'Generate successors, computing g(child) = g(parent) + step cost.',
      'If a known state is reached by a cheaper path, replace its old entry.',
    ],
    advantages: ['Optimal for any positive step costs.', 'Complete when every step cost is above zero.'],
    limitations: ['No sense of direction – explores in all directions equally.', 'Same memory problem as BFS.'],
    timeComplexity: 'O(b^(1+⌊C*/ε⌋))',
    spaceComplexity: 'O(b^(1+⌊C*/ε⌋))',
    complete: { value: 'Yes', note: 'when every step cost ≥ ε > 0' },
    optimal: { value: 'Yes', note: 'always returns the cheapest path' },
    frontier: 'Priority queue ordered by g(n)',
    inThisApp: 'Every 8-puzzle move costs 1, so UCS behaves like BFS (same path length, similar node counts).',
  },
  {
    id: 'gbfs',
    name: 'Greedy Best First Search',
    shortName: 'GBFS',
    kind: 'Informed',
    number: 6,
    description:
      'Expands the node that looks closest to the goal according to the heuristic h(n) alone, ignoring the cost already paid.',
    workingPrinciple: [
      'Keep the frontier in a priority queue ordered by the evaluation function f(n) = h(n).',
      'Remove the node with the smallest h(n); if it is the goal, stop.',
      'Generate its successors, compute h for each and add every state not seen before to the frontier.',
      'Keep an explored (closed) list so no state is expanded twice.',
      'The path cost g(n) is tracked for reporting but never used to choose the next node.',
    ],
    advantages: [
      'Usually reaches a goal after expanding very few nodes.',
      'Small time and memory footprint in practice.',
      'Easy to implement – a priority queue plus a heuristic.',
    ],
    limitations: [
      'Not optimal: it can return a much longer path than necessary.',
      'Can be misled by the heuristic (local minima / plateaus) and wander before recovering.',
      'Worst case is still exponential and the quality depends entirely on h(n).',
    ],
    timeComplexity: 'O(b^m) worst case, often far better with a good heuristic',
    spaceComplexity: 'O(b^m) worst case (all generated nodes are kept)',
    complete: {
      value: 'Yes',
      note: 'on a finite space when an explored list is used (as here); tree search can loop forever',
    },
    optimal: { value: 'No', note: 'ignores the path cost g(n)' },
    frontier: 'Priority queue ordered by h(n), FIFO among ties',
    inThisApp:
      'The primary algorithm of this project. Choose Misplaced Tiles, Manhattan Distance or the bonus Linear Conflict heuristic and watch the open list re-sort itself by h(n) after every expansion.',
  },
  {
    id: 'astar',
    name: 'A* Search',
    shortName: 'A*',
    kind: 'Informed',
    number: 7,
    description:
      'Expands the node with the lowest f(n) = g(n) + h(n): cost so far plus estimated cost to go.',
    workingPrinciple: [
      'Keep the frontier in a priority queue ordered by f(n) = g(n) + h(n).',
      'Remove the node with the smallest f(n); if it is the goal, stop.',
      'Generate successors; if a known state is reached with a smaller g, replace the old entry (re-open it if it was closed).',
      'With an admissible heuristic the first time the goal is selected its path is optimal.',
    ],
    advantages: [
      'Complete and optimal with an admissible (tree) / consistent (graph) heuristic.',
      'Optimally efficient: no other optimal algorithm using the same heuristic expands fewer nodes.',
    ],
    limitations: [
      'Memory grows exponentially – it stores every generated node.',
      'Needs a good admissible heuristic to be practical.',
    ],
    timeComplexity: 'O(b^d) worst case, exponential in the heuristic error',
    spaceComplexity: 'O(b^d)',
    complete: { value: 'Yes', note: 'when b is finite and step costs ≥ ε > 0' },
    optimal: { value: 'Yes', note: 'with an admissible heuristic (all three heuristics here are)' },
    frontier: 'Priority queue ordered by f(n), then h(n)',
    inThisApp: 'Included for the comparison page – compare its path length with GBFS to see the price of greediness.',
  },
]

export function getAlgorithmDoc(id: AlgorithmId): AlgorithmDoc {
  const doc = ALGORITHM_DOCS.find((a) => a.id === id)
  if (!doc) throw new Error(`Unknown algorithm: ${id}`)
  return doc
}
