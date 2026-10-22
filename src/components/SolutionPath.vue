<script setup lang="ts">
import { computed } from 'vue'
import MiniBoard from './MiniBoard.vue'
import { useSolver } from '@/stores/solver'

const s = useSolver()
const WINDOW = 18

const path = computed(() => s.result.value?.path ?? [])
const active = computed(() => {
  const f = s.frame.value
  return f && f.kind === 'solution' ? f.index : -1
})

/** Long paths (DFS can produce thousands of steps) are shown as a window that follows the animation. */
const range = computed(() => {
  const n = path.value.length
  if (n <= WINDOW) return { from: 0, to: n }
  const centre = active.value >= 0 ? active.value : 0
  const from = Math.max(0, Math.min(centre - Math.floor(WINDOW / 2), n - WINDOW))
  return { from, to: from + WINDOW }
})
const visible = computed(() =>
  path.value.slice(range.value.from, range.value.to).map((node, i) => ({ node, index: range.value.from + i })),
)

function jump(index: number): void {
  s.seek(s.searchFrames.value + index)
}
</script>

<template>
  <section v-if="s.result.value?.found" class="card" aria-labelledby="path-title">
    <h2 id="path-title" class="card-title">
      Final solution path
      <span class="font-normal text-slate-500">– {{ s.result.value.stats.moves.toLocaleString() }} moves</span>
    </h2>
    <p v-if="path.length > WINDOW" class="mb-2 text-xs text-slate-500">
      Showing steps {{ range.from }}–{{ range.to - 1 }} of {{ path.length - 1 }}; the window follows the animation.
    </p>
    <ol class="flex flex-wrap items-center gap-x-1 gap-y-3">
      <template v-for="({ node, index }, k) in visible" :key="index">
        <li v-if="k > 0" class="text-slate-400" aria-hidden="true">→</li>
        <li>
          <button
            type="button"
            class="rounded-xl p-2 text-center ring-1 transition hover:bg-indigo-50"
            :class="index === active ? 'bg-indigo-50 ring-2 ring-indigo-500' : 'bg-white ring-slate-200'"
            :aria-current="index === active ? 'step' : undefined"
            @click="jump(index)"
          >
            <div class="mb-1 text-[11px] font-semibold text-slate-600">Step {{ index }}</div>
            <MiniBoard :board="node.board" :goal="s.goal.value" size="md" />
            <div class="mt-1 text-[11px] text-slate-500">{{ node.move ? `↦ ${node.move}` : 'start' }}</div>
          </button>
        </li>
      </template>
    </ol>
  </section>
</template>
