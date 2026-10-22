<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import {
  FlexRender,
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  useTable,
} from '@tanstack/vue-table'
import MiniBoard from '@/components/MiniBoard.vue'
import { getAlgorithmDoc } from '@/config/algorithms'
import { runComparison, type ComparisonRow } from '@/engine/compare'
import { encode } from '@/engine/puzzle'
import { formatBytes, formatTime, memoryClass } from '@/engine/search'
import { useSolver } from '@/stores/solver'

const s = useSolver()
const progress = ref({ done: 0, total: 9 })

/* ───────── TanStack Query: runs all algorithms on the current puzzle and caches the result ───────── */
const query = useQuery(
  computed(() => ({
    queryKey: ['comparison', encode(s.initial.value), encode(s.goal.value), s.depthLimit.value] as const,
    queryFn: () => {
      progress.value = { done: 0, total: progress.value.total }
      return runComparison(s.initial.value, s.goal.value, s.depthLimit.value, (done, total) => {
        progress.value = { done, total }
      })
    },
    enabled: s.solvable.value,
    staleTime: Number.POSITIVE_INFINITY, // identical puzzle ⇒ reuse the cached comparison
    refetchOnWindowFocus: false,
  })),
)

/* ───────── table rows ───────── */
interface CompareRow {
  key: string
  name: string
  heuristic: string
  assigned: boolean
  found: string
  foundOk: boolean
  generated: number
  expanded: number
  moves: number | undefined
  timeMs: number
  memoryBytes: number
  memoryClass: string
}

function statusText(row: ComparisonRow): string {
  switch (row.result.status) {
    case 'found':
      return 'Yes'
    case 'cutoff':
      return 'No (cutoff)'
    case 'aborted':
      return 'Aborted'
    default:
      return 'No'
  }
}

const rows = computed<CompareRow[]>(() =>
  (query.data.value ?? []).map((row) => ({
    key: row.key,
    name: getAlgorithmDoc(row.algorithm).shortName + (row.algorithm === 'dls' ? ` (l=${s.depthLimit.value})` : ''),
    heuristic: row.heuristicLabel,
    assigned: row.algorithm === 'gbfs',
    found: statusText(row),
    foundOk: row.result.found,
    generated: row.result.stats.generated,
    expanded: row.result.stats.expanded,
    moves: row.result.found ? row.result.stats.moves : undefined,
    timeMs: row.result.stats.timeMs,
    memoryBytes: row.result.stats.memoryBytes,
    memoryClass: memoryClass(row.result.stats.peakStored),
  })),
)

const best = computed(() => {
  const ok = rows.value.filter((r) => r.foundOk)
  const min = (pick: (r: CompareRow) => number | undefined) => {
    const values = ok.map(pick).filter((v): v is number => v !== undefined)
    return values.length ? Math.min(...values) : undefined
  }
  return {
    generated: min((r) => r.generated),
    expanded: min((r) => r.expanded),
    moves: min((r) => r.moves),
    timeMs: min((r) => r.timeMs),
    memoryBytes: min((r) => r.memoryBytes),
  }
})
const maxExpanded = computed(() => Math.max(1, ...rows.value.map((r) => r.expanded)))

/* ───────── TanStack Table ───────── */
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { basic: sortFn_basic, text: sortFn_text },
})
const col = createColumnHelper<typeof features, CompareRow>()

const best1 = (isBest: boolean) => (isBest ? 'rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-800' : '')

const columns = col.columns([
  col.accessor('name', {
    header: 'Algorithm',
    cell: (info) =>
      h('span', { class: 'font-semibold text-slate-900' }, [
        info.getValue(),
        info.row.original.assigned
          ? h('span', { class: 'chip ml-1.5 bg-amber-100 text-amber-800' }, 'assigned')
          : null,
      ]),
  }),
  col.accessor('heuristic', { header: 'Heuristic' }),
  col.accessor('found', {
    header: 'Solution found',
    cell: (info) =>
      h(
        'span',
        { class: ['chip', info.row.original.foundOk ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'] },
        info.getValue(),
      ),
  }),
  col.accessor('generated', {
    header: 'Nodes generated',
    cell: (info) => h('span', { class: best1(info.getValue() === best.value.generated && info.row.original.foundOk) }, info.getValue().toLocaleString()),
  }),
  col.accessor('expanded', {
    header: 'Nodes expanded',
    cell: (info) =>
      h('div', { class: 'min-w-[8rem]' }, [
        h('span', { class: best1(info.getValue() === best.value.expanded && info.row.original.foundOk) }, info.getValue().toLocaleString()),
        h('div', { class: 'mt-1 h-1.5 rounded-full bg-slate-100', 'aria-hidden': 'true' }, [
          h('div', {
            class: 'h-full rounded-full bg-indigo-400',
            style: { width: `${Math.max(2, (info.getValue() / maxExpanded.value) * 100)}%` },
          }),
        ]),
      ]),
  }),
  col.accessor('moves', {
    header: 'Moves',
    sortUndefined: 'last',
    cell: (info) => {
      const v = info.getValue()
      return v === undefined ? '–' : h('span', { class: best1(v === best.value.moves) }, v.toLocaleString())
    },
  }),
  col.accessor('timeMs', {
    header: 'Time',
    cell: (info) => h('span', { class: best1(info.getValue() === best.value.timeMs && info.row.original.foundOk) }, formatTime(info.getValue())),
  }),
  col.accessor('memoryBytes', {
    header: 'Memory (approx.)',
    cell: (info) =>
      h('span', {}, [
        formatBytes(info.getValue()),
        h('span', { class: 'ml-1.5 text-xs text-slate-500' }, info.row.original.memoryClass),
      ]),
  }),
])

const table = useTable({ features, columns, data: rows })

const sortIcon = (state: false | 'asc' | 'desc') => (state === 'asc' ? ' ▲' : state === 'desc' ? ' ▼' : '')

/* ───────── generated insight ───────── */
const insight = computed(() => {
  const data = rows.value
  const gbfs = data.find((r) => r.key === 'gbfs-manhattan')
  const bfs = data.find((r) => r.key === 'bfs-none')
  const astar = data.find((r) => r.key === 'astar-manhattan')
  if (!gbfs?.foundOk || !bfs?.foundOk || !astar?.foundOk || gbfs.moves === undefined || astar.moves === undefined) return null
  const ratio = bfs.expanded / Math.max(gbfs.expanded, 1)
  const extra = gbfs.moves - astar.moves
  return `GBFS (Manhattan) expanded ${gbfs.expanded.toLocaleString()} nodes versus ${bfs.expanded.toLocaleString()} for BFS – about ${ratio.toFixed(1)}× fewer. ${
    extra > 0
      ? `Its solution has ${gbfs.moves} moves, ${extra} more than the optimal ${astar.moves} found by A*: greedy search trades path quality for speed.`
      : `Here its solution happens to be optimal (${gbfs.moves} moves), but GBFS does not guarantee that.`
  }`
})

function setLimit(event: Event): void {
  const n = Math.floor(Number((event.target as HTMLInputElement).value))
  s.depthLimit.value = Number.isFinite(n) ? Math.max(0, Math.min(n, 60)) : 0
}
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">Algorithm comparison</h1>
      <p class="mt-1 max-w-3xl text-slate-600">
        Every algorithm is run on the <em>same</em> puzzle instance. Click a column header to sort. Best values among successful runs are highlighted.
      </p>
    </header>

    <section class="card" aria-labelledby="inst-title">
      <h2 id="inst-title" class="card-title">Puzzle instance</h2>
      <div class="flex flex-wrap items-end gap-6">
        <div><span class="field-label">Initial</span><MiniBoard :board="s.initial.value" :goal="s.goal.value" size="md" /></div>
        <div class="pb-2 text-xl text-slate-400" aria-hidden="true">→</div>
        <div><span class="field-label">Goal</span><MiniBoard :board="s.goal.value" :goal="s.goal.value" size="md" /></div>
        <div>
          <label class="field-label" for="cmp-limit">DLS depth limit</label>
          <input
            id="cmp-limit"
            type="number"
            min="0"
            max="60"
            :value="s.depthLimit.value"
            class="w-24 rounded-lg border-0 bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-indigo-500"
            @input="setLimit"
          />
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn-secondary" @click="s.randomize()">🎲 New random puzzle</button>
          <button type="button" class="btn-primary" :disabled="!s.solvable.value || query.isFetching.value" @click="query.refetch()">
            ↻ Re-run comparison
          </button>
        </div>
      </div>
      <p class="mt-3 text-xs text-slate-500">
        Edit the puzzle on the <strong>Solver</strong> page – both pages share the same puzzle. Results for an identical puzzle are cached by TanStack Query.
      </p>
    </section>

    <p v-if="!s.solvable.value" class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200" role="alert">
      The current puzzle is invalid or unsolvable, so there is nothing to compare. Fix it on the Solver page or generate a new random puzzle.
    </p>

    <section v-else class="card overflow-hidden" aria-labelledby="table-title">
      <h2 id="table-title" class="card-title">Results</h2>

      <p v-if="query.isFetching.value" class="mb-3 flex items-center gap-2 text-sm text-slate-600" role="status">
        <span class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" aria-hidden="true" />
        Running algorithms… {{ progress.done }} / {{ progress.total }}
        <span class="text-xs text-slate-400">(IDDLS can take a few seconds on hard puzzles)</span>
      </p>
      <p v-if="query.isError.value" class="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
        {{ query.error.value?.message }}
      </p>

      <div v-if="rows.length" class="-mx-5 overflow-x-auto px-5">
        <table class="w-full min-w-[46rem] text-left text-sm">
          <thead>
            <tr v-for="group in table.getHeaderGroups()" :key="group.id" class="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th
                v-for="header in group.headers"
                :key="header.id"
                scope="col"
                class="whitespace-nowrap py-2 pr-4 font-semibold"
                :aria-sort="header.column.getIsSorted() === 'asc' ? 'ascending' : header.column.getIsSorted() === 'desc' ? 'descending' : 'none'"
              >
                <button
                  v-if="header.column.getCanSort()"
                  type="button"
                  class="inline-flex items-center rounded uppercase tracking-wide hover:text-indigo-700"
                  @click="header.column.toggleSorting()"
                >
                  <FlexRender :header="header" />{{ sortIcon(header.column.getIsSorted()) }}
                </button>
                <FlexRender v-else :header="header" />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in table.getRowModel().rows"
              :key="row.id"
              class="border-b border-slate-100 last:border-0"
              :class="row.original.assigned ? 'bg-amber-50/50' : ''"
            >
              <td v-for="cell in row.getAllCells()" :key="cell.id" class="py-2.5 pr-4 align-top tabular-nums">
                <FlexRender :cell="cell" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="insight" class="mt-4 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-900 ring-1 ring-indigo-200">💡 {{ insight }}</p>

      <ul class="mt-4 list-disc space-y-1 pl-5 text-xs text-slate-500">
        <li>Nodes generated = every successor produced (plus the root); nodes expanded = nodes whose successors were produced.</li>
        <li>Memory is the peak count of stored nodes × 160 B; Low &lt; 5,000, Medium &lt; 40,000, High ≥ 40,000 nodes.</li>
        <li>Times are wall-clock for this browser tab and vary slightly between runs.</li>
        <li>DFS is complete here but returns very long paths; DLS fails with a <em>cutoff</em> if the limit is below the solution depth.</li>
      </ul>
    </section>
  </div>
</template>
