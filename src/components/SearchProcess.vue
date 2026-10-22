<script setup lang="ts">
import { computed } from 'vue'
import MiniBoard from './MiniBoard.vue'
import { isInformed } from '@/engine/search'
import { useSolver } from '@/stores/solver'
import type { NodeInfo, SuccessorStatus } from '@/engine/types'

const s = useSolver()
const result = computed(() => s.result.value)
const frame = computed(() => s.frame.value)
const informed = computed(() => (result.value ? isInformed(result.value.algorithm) : false))
const goal = computed(() => s.goal.value)
const fmt = (n: number) => n.toLocaleString()

/** What the frontier is ordered by, per algorithm – shown next to every queued node. */
function priority(node: NodeInfo): string {
  switch (result.value?.algorithm) {
    case 'gbfs':
      return `h=${node.h}`
    case 'astar':
      return `f=${node.f}`
    case 'ucs':
      return `g=${node.g}`
    default:
      return `d=${node.depth}`
  }
}

const orderText = computed(() => {
  switch (result.value?.algorithm) {
    case 'gbfs':
      return 'sorted by h(n) – smallest first'
    case 'astar':
      return 'sorted by f(n) = g(n) + h(n) – smallest first'
    case 'ucs':
      return 'sorted by g(n) – cheapest first'
    case 'bfs':
      return 'FIFO – oldest first'
    default:
      return 'LIFO – newest first'
  }
})

const statusStyle: Record<SuccessorStatus, string> = {
  queued: 'bg-emerald-100 text-emerald-800',
  improved: 'bg-amber-100 text-amber-800',
  duplicate: 'bg-slate-200 text-slate-600',
}
const statusText: Record<SuccessorStatus, string> = {
  queued: 'added to open list',
  improved: 'cheaper path – replaced',
  duplicate: 'already known – discarded',
}
</script>

<template>
  <section class="card" aria-labelledby="process-title" aria-live="polite">
    <h2 id="process-title" class="card-title">Search process</h2>

    <p v-if="!result || !frame" class="text-sm text-slate-500">
      Press <strong>Run</strong> (or <strong>Next step</strong>) to start the search. The node being expanded, its successors, the open list
      and the closed list will appear here in real time.
    </p>

    <!-- ───────────────  search phase  ─────────────── -->
    <template v-else-if="frame.kind === 'search'">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <span class="chip bg-indigo-100 text-indigo-800">
          Expansion {{ fmt(frame.number) }} of {{ fmt(s.searchFrames.value) }} recorded
        </span>
        <span v-if="frame.step.label" class="chip bg-violet-100 text-violet-800">{{ frame.step.label }}</span>
        <span v-if="frame.step.isGoal" class="chip bg-emerald-100 text-emerald-800">🎯 goal selected</span>
        <span v-if="frame.step.note" class="chip bg-amber-100 text-amber-800">{{ frame.step.note }}</span>
      </div>
      <p v-if="frame.step.skippedBefore > 0" class="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
        … {{ fmt(frame.step.skippedBefore) }} further expansions ran but were not recorded (the trace keeps at most
        {{ fmt(result.trace.length) }} frames). Counters below are exact.
      </p>

      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <div class="stat"><div class="stat-label">Nodes generated</div><div class="stat-value">{{ fmt(frame.step.generated) }}</div></div>
        <div class="stat"><div class="stat-label">Nodes expanded</div><div class="stat-value">{{ fmt(frame.step.expanded) }}</div></div>
        <div class="stat"><div class="stat-label">Current depth</div><div class="stat-value">{{ frame.step.current.depth }}</div></div>
        <div class="stat"><div class="stat-label">Max depth so far</div><div class="stat-value">{{ frame.step.maxDepth }}</div></div>
        <div class="stat"><div class="stat-label">Open / closed</div><div class="stat-value">{{ fmt(frame.step.frontierSize) }} / {{ fmt(frame.step.exploredSize) }}</div></div>
      </div>

      <div class="mt-4 grid gap-4 md:grid-cols-2">
        <div class="rounded-xl bg-indigo-50 p-3 ring-1 ring-indigo-200">
          <p class="field-label !text-indigo-700">Current node being expanded</p>
          <div class="flex flex-wrap items-center gap-4">
            <MiniBoard :board="frame.step.current.board" :goal="goal" size="md" />
            <dl class="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-sm">
              <dt class="text-slate-500">Node id</dt><dd class="font-mono">#{{ frame.step.current.id }}</dd>
              <dt class="text-slate-500">Path cost g(n)</dt><dd class="font-mono">{{ frame.step.current.g }}</dd>
              <template v-if="informed">
                <dt class="text-slate-500">Heuristic h(n)</dt><dd class="font-mono">{{ frame.step.current.h }}</dd>
                <dt class="text-slate-500">
                  Evaluation f(n)
                </dt>
                <dd class="font-mono">
                  {{ frame.step.current.f }}
                  <span class="text-xs text-slate-500">{{ result.algorithm === 'gbfs' ? '(= h)' : '(= g + h)' }}</span>
                </dd>
              </template>
            </dl>
          </div>
        </div>

        <div class="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <p class="field-label">Parent node</p>
          <div v-if="frame.step.current.parentBoard" class="flex flex-wrap items-center gap-4">
            <MiniBoard :board="frame.step.current.parentBoard" :goal="goal" size="md" />
            <dl class="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-sm">
              <dt class="text-slate-500">Parent id</dt><dd class="font-mono">#{{ frame.step.current.parentId }}</dd>
              <dt class="text-slate-500">Blank moved</dt><dd class="font-medium">{{ frame.step.current.move }}</dd>
              <dt class="text-slate-500">Edge cost</dt><dd class="font-mono">1</dd>
            </dl>
          </div>
          <p v-else class="text-sm text-slate-500">This is the root (initial state) – it has no parent.</p>
        </div>
      </div>

      <!-- successors -->
      <h3 class="mb-2 mt-5 text-sm font-semibold text-slate-900">
        Generated successor states <span class="font-normal text-slate-500">({{ frame.step.successors.length }})</span>
      </h3>
      <p v-if="frame.step.successors.length === 0" class="text-sm text-slate-500">
        {{ frame.step.isGoal ? 'Goal reached – the search stops without expanding it.' : 'No successors were generated for this node.' }}
      </p>
      <ul v-else class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <li v-for="succ in frame.step.successors" :key="succ.id" class="rounded-xl bg-white p-2.5 ring-1 ring-slate-200" :class="succ.status === 'duplicate' ? 'opacity-60' : ''">
          <div class="flex items-center gap-3">
            <MiniBoard :board="succ.board" :goal="goal" size="md" />
            <div class="min-w-0 text-xs leading-5">
              <div class="font-semibold text-slate-800">Blank ↦ {{ succ.move }}</div>
              <div v-if="informed" class="font-mono text-slate-600">h={{ succ.h }} · g={{ succ.g }} · f={{ succ.f }}</div>
              <div v-else class="font-mono text-slate-600">g={{ succ.g }}</div>
            </div>
          </div>
          <span class="chip mt-2" :class="statusStyle[succ.status]">{{ statusText[succ.status] }}</span>
        </li>
      </ul>

      <!-- open list -->
      <div class="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 class="text-sm font-semibold text-slate-900">
            Frontier / open list <span class="font-normal text-slate-500">({{ fmt(frame.step.frontierSize) }} nodes)</span>
          </h3>
          <p class="mb-2 text-xs text-slate-500">{{ orderText }}<span v-if="frame.step.frontierSize > frame.step.frontier.length"> · showing the next {{ frame.step.frontier.length }}</span></p>
          <p v-if="frame.step.frontier.length === 0" class="text-sm text-slate-500">Empty.</p>
          <ol v-else class="flex max-h-72 flex-wrap gap-1.5 overflow-y-auto rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200">
            <li
              v-for="(node, i) in frame.step.frontier"
              :key="node.id"
              class="flex items-center gap-1.5 rounded-lg bg-white px-1.5 py-1 ring-1"
              :class="i === 0 ? 'ring-2 ring-indigo-500' : 'ring-slate-200'"
              :title="`node #${node.id}, depth ${node.depth}, g=${node.g}, h=${node.h}, f=${node.f}`"
            >
              <MiniBoard :board="node.board" :goal="goal" size="xs" />
              <span class="font-mono text-[11px] text-slate-700">{{ priority(node) }}</span>
              <span v-if="i === 0" class="chip bg-indigo-100 text-indigo-800">next</span>
            </li>
          </ol>
        </div>

        <div>
          <h3 class="text-sm font-semibold text-slate-900">
            Explored / closed list <span class="font-normal text-slate-500">({{ fmt(frame.step.exploredSize) }} states)</span>
          </h3>
          <p class="mb-2 text-xs text-slate-500">most recently expanded last<span v-if="frame.step.exploredSize > frame.step.explored.length"> · showing the latest {{ frame.step.explored.length }}</span></p>
          <p v-if="frame.step.explored.length === 0" class="text-sm text-slate-500">Empty.</p>
          <ol v-else class="flex max-h-72 flex-wrap gap-1.5 overflow-y-auto rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200">
            <li v-for="(board, i) in frame.step.explored" :key="i" class="rounded-lg bg-white p-1 ring-1 ring-slate-200">
              <MiniBoard :board="board" :goal="goal" size="xs" />
            </li>
          </ol>
        </div>
      </div>
    </template>

    <!-- ───────────────  solution phase  ─────────────── -->
    <template v-else>
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <span class="chip bg-emerald-100 text-emerald-800">Replaying the solution path</span>
        <span class="chip bg-slate-100 text-slate-700">Step {{ frame.index }} of {{ frame.total - 1 }}</span>
        <span v-if="frame.node.move" class="chip bg-indigo-100 text-indigo-800">Blank moved {{ frame.node.move }}</span>
      </div>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div class="stat"><div class="stat-label">Path cost g(n)</div><div class="stat-value">{{ frame.node.g }}</div></div>
        <template v-if="informed">
          <div class="stat"><div class="stat-label">Heuristic h(n)</div><div class="stat-value">{{ frame.node.h }}</div></div>
          <div class="stat"><div class="stat-label">Evaluation f(n)</div><div class="stat-value">{{ frame.node.f }}</div></div>
        </template>
        <div class="stat"><div class="stat-label">Nodes generated / expanded</div><div class="stat-value">{{ fmt(result.stats.generated) }} / {{ fmt(result.stats.expanded) }}</div></div>
      </div>
    </template>
  </section>
</template>
