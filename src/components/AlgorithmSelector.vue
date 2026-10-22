<script setup lang="ts">
import { computed } from 'vue'
import { ALGORITHM_DOCS } from '@/config/algorithms'
import { HEURISTICS } from '@/engine/heuristics'
import { isInformed } from '@/engine/search'
import { student } from '@/config/student'
import { useSolver } from '@/stores/solver'

const s = useSolver()
const uninformed = ALGORITHM_DOCS.filter((a) => a.kind === 'Uninformed')
const informed = ALGORITHM_DOCS.filter((a) => a.kind === 'Informed')
const usesHeuristic = computed(() => isInformed(s.algorithm.value))
const isAssigned = (name: string) => student.assignedAlgorithm.includes(`(${name})`)

function setLimit(event: Event): void {
  const n = Math.floor(Number((event.target as HTMLInputElement).value))
  s.depthLimit.value = Number.isFinite(n) ? Math.max(0, Math.min(n, 60)) : 0
}
</script>

<template>
  <section class="card" aria-labelledby="algo-title">
    <h2 id="algo-title" class="card-title">2 · Algorithm</h2>

    <div class="grid gap-4 md:grid-cols-2">
      <fieldset>
        <legend class="field-label">Uninformed</legend>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="a in uninformed"
            :key="a.id"
            class="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium ring-1 transition has-[:checked]:bg-indigo-600 has-[:checked]:text-white has-[:checked]:ring-indigo-600 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-indigo-500"
            :class="s.algorithm.value === a.id ? '' : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50'"
          >
            <input v-model="s.algorithm.value" type="radio" name="algorithm" class="sr-only" :value="a.id" />
            {{ a.shortName }}
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend class="field-label">Informed</legend>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="a in informed"
            :key="a.id"
            class="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium ring-1 transition has-[:checked]:bg-indigo-600 has-[:checked]:text-white has-[:checked]:ring-indigo-600 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-indigo-500"
            :class="s.algorithm.value === a.id ? '' : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50'"
          >
            <input v-model="s.algorithm.value" type="radio" name="algorithm" class="sr-only" :value="a.id" />
            {{ a.shortName }}
            <span v-if="isAssigned(a.shortName)" class="chip ml-1 bg-amber-100 text-amber-800">assigned</span>
          </label>
        </div>
      </fieldset>
    </div>

    <div v-if="s.algorithm.value === 'dls'" class="mt-4 max-w-xs">
      <label class="field-label" for="depth-limit">Depth limit (0–60)</label>
      <input
        id="depth-limit"
        type="number"
        min="0"
        max="60"
        :value="s.depthLimit.value"
        class="w-28 rounded-lg border-0 bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-indigo-500"
        @input="setLimit"
      />
      <p class="mt-1 text-xs text-slate-500">Nodes at this depth are tested but not expanded. Too small a limit ends in a cutoff.</p>
    </div>

    <fieldset v-if="usesHeuristic" class="mt-4">
      <legend class="field-label">Heuristic function</legend>
      <div class="grid gap-2 lg:grid-cols-3">
        <label
          v-for="h in HEURISTICS"
          :key="h.id"
          class="cursor-pointer rounded-xl p-3 ring-1 transition has-[:checked]:bg-indigo-50 has-[:checked]:ring-2 has-[:checked]:ring-indigo-500 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-indigo-500"
          :class="s.heuristic.value === h.id ? '' : 'bg-white ring-slate-200 hover:bg-slate-50'"
        >
          <input v-model="s.heuristic.value" type="radio" name="heuristic" class="sr-only" :value="h.id" />
          <span class="block text-sm font-semibold text-slate-900">{{ h.name }}</span>
          <span class="mt-0.5 block font-mono text-[11px] leading-snug text-slate-600">{{ h.formula }}</span>
        </label>
      </div>
    </fieldset>
  </section>
</template>
