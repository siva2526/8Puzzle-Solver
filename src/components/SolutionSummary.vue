<script setup lang="ts">
import { computed } from 'vue'
import { useSolver } from '@/stores/solver'
import { formatBytes, formatTime, memoryClass } from '@/engine/search'
import { heuristicName } from '@/engine/heuristics'
import { getAlgorithmDoc } from '@/config/algorithms'

const s = useSolver()
const r = computed(() => s.result.value)
const fmt = (n: number) => n.toLocaleString()

const banner = computed(() => {
  switch (r.value?.status) {
    case 'found':
      return { text: 'Solution found', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200', icon: '✓' }
    case 'cutoff':
      return {
        text: 'Solution not found – depth limit reached (cutoff). Try a larger limit.',
        cls: 'bg-amber-50 text-amber-800 ring-amber-200',
        icon: '✕',
      }
    case 'aborted':
      return { text: 'Search aborted – node budget exceeded.', cls: 'bg-amber-50 text-amber-800 ring-amber-200', icon: '!' }
    default:
      return { text: 'Solution not found – the whole reachable state space was searched.', cls: 'bg-rose-50 text-rose-800 ring-rose-200', icon: '✕' }
  }
})
</script>

<template>
  <section v-if="r" class="card" aria-labelledby="summary-title">
    <h2 id="summary-title" class="card-title">
      Solution summary
      <span class="font-normal text-slate-500">
        – {{ getAlgorithmDoc(r.algorithm).shortName }}<template v-if="r.heuristic"> · {{ heuristicName(r.heuristic) }}</template>
      </span>
    </h2>
    <p class="mb-3 rounded-lg px-3 py-2 text-sm font-medium ring-1" :class="banner.cls" role="status">
      <span aria-hidden="true">{{ banner.icon }}</span> {{ banner.text }}
    </p>
    <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      <div class="stat"><div class="stat-label">Total moves</div><div class="stat-value">{{ r.found ? fmt(r.stats.moves) : '—' }}</div></div>
      <div class="stat"><div class="stat-label">Path cost</div><div class="stat-value">{{ r.found ? fmt(r.stats.pathCost) : '—' }}</div></div>
      <div class="stat"><div class="stat-label">Nodes generated</div><div class="stat-value">{{ fmt(r.stats.generated) }}</div></div>
      <div class="stat"><div class="stat-label">Nodes expanded</div><div class="stat-value">{{ fmt(r.stats.expanded) }}</div></div>
      <div class="stat"><div class="stat-label">Max search depth</div><div class="stat-value">{{ r.stats.maxDepth }}</div></div>
      <div class="stat"><div class="stat-label">Execution time</div><div class="stat-value">{{ formatTime(r.stats.timeMs) }}</div></div>
      <div class="stat">
        <div class="stat-label">Memory (approx.)</div>
        <div class="stat-value">{{ formatBytes(r.stats.memoryBytes) }} <span class="text-sm font-medium text-slate-500">{{ memoryClass(r.stats.peakStored) }}</span></div>
      </div>
      <div class="stat"><div class="stat-label">Duplicates discarded</div><div class="stat-value">{{ fmt(r.stats.duplicates) }}</div></div>
    </div>
    <p class="mt-3 text-xs text-slate-500">
      Memory ≈ peak number of stored nodes ({{ fmt(r.stats.peakStored) }}) × 160 bytes – an estimate, not a heap measurement.
    </p>
  </section>
</template>
