<script setup lang="ts">
import BoardEditor from './BoardEditor.vue'
import { useSolver } from '@/stores/solver'
import type { Difficulty } from '@/engine/puzzle'

const s = useSolver()
const difficulties: { id: Difficulty; label: string; hint: string }[] = [
  { id: 'easy', label: 'Easy', hint: '8-move scramble' },
  { id: 'medium', label: 'Medium', hint: '18-move scramble' },
  { id: 'hard', label: 'Hard', hint: 'uniformly random (avg. 22 moves)' },
]
</script>

<template>
  <section class="card" aria-labelledby="input-title">
    <h2 id="input-title" class="card-title">1 · Puzzle input</h2>

    <div class="grid gap-6 sm:grid-cols-2">
      <div>
        <p class="mb-2 text-sm font-medium text-slate-700">Method 1 – enter the states</p>
        <div class="flex flex-wrap items-start gap-5">
          <BoardEditor v-model="s.initial.value" title="Initial state" />
          <BoardEditor v-model="s.goal.value" title="Goal state" />
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" class="btn-secondary" @click="s.loadExample()">Use assignment example</button>
          <button type="button" class="btn-secondary" @click="s.swapStates()">⇄ Swap</button>
        </div>
      </div>

      <div>
        <p class="mb-2 text-sm font-medium text-slate-700">Method 2 – random solvable puzzle</p>
        <label class="field-label" for="difficulty">Difficulty</label>
        <select
          id="difficulty"
          v-model="s.difficulty.value"
          class="mb-3 w-full rounded-lg border-0 bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-indigo-500"
        >
          <option v-for="d in difficulties" :key="d.id" :value="d.id">{{ d.label }} – {{ d.hint }}</option>
        </select>
        <button type="button" class="btn-primary w-full sm:w-auto" @click="s.randomize()">🎲 Generate Random Puzzle</button>
        <p class="mt-2 text-xs text-slate-500">
          Only half of the 9! arrangements can reach a given goal. Generated puzzles are always checked against the current goal state.
        </p>
      </div>
    </div>

    <p
      v-if="s.valid.value && !s.solvable.value"
      class="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200"
      role="alert"
    >
      ⚠ Unsolvable: the inversion parity of the initial and goal states differs, so no sequence of moves connects them.
    </p>
    <p
      v-else-if="s.valid.value"
      class="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200"
    >
      ✓ Valid puzzle – the goal is reachable from the initial state.
    </p>
  </section>
</template>
