<script setup lang="ts">
import { computed } from 'vue'
import AlgorithmSelector from '@/components/AlgorithmSelector.vue'
import PlaybackControls from '@/components/PlaybackControls.vue'
import PuzzleBoard from '@/components/PuzzleBoard.vue'
import PuzzleInput from '@/components/PuzzleInput.vue'
import SearchProcess from '@/components/SearchProcess.vue'
import SolutionPath from '@/components/SolutionPath.vue'
import SolutionSummary from '@/components/SolutionSummary.vue'
import { useSolver } from '@/stores/solver'

const s = useSolver()

const currentTitle = computed(() => {
  const f = s.frame.value
  if (!f) return 'Current state'
  return f.kind === 'search' ? `Current state · node #${f.step.current.id}` : `Solution step ${f.index} / ${f.total - 1}`
})
const caption = computed(() => {
  const f = s.frame.value
  if (!f) return 'Run the search to begin.'
  if (f.kind === 'search') return `Expanding a node at depth ${f.step.current.depth}`
  return f.node.move ? `Blank moved ${f.node.move}` : 'Start of the solution path'
})
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">Solver</h1>
      <p class="mt-1 max-w-3xl text-slate-600">
        Define a puzzle, pick an algorithm and watch it search. Tiles turn <span class="font-medium text-emerald-700">green</span> when they
        sit on their goal square.
      </p>
    </header>

    <PuzzleInput />
    <AlgorithmSelector />

    <section class="card" aria-labelledby="viz-title">
      <h2 id="viz-title" class="card-title">3 · Puzzle visualization</h2>
      <div class="grid items-start gap-6 md:grid-cols-[1fr_1.4fr_1fr]">
        <div class="order-2 mx-auto w-full max-w-[12rem] md:order-1">
          <PuzzleBoard :board="s.initial.value" :goal="s.goal.value" title="Initial state" compact :animation-ms="0" />
        </div>
        <div class="order-1 mx-auto w-full max-w-sm md:order-2">
          <PuzzleBoard :board="s.currentBoard.value" :goal="s.goal.value" :title="currentTitle" :animation-ms="s.animationMs.value" />
          <p class="mt-2 text-center text-sm text-slate-600" aria-live="polite">{{ caption }}</p>
        </div>
        <div class="order-3 mx-auto w-full max-w-[12rem]">
          <PuzzleBoard :board="s.goal.value" :goal="s.goal.value" title="Goal state" compact :animation-ms="0" />
        </div>
      </div>
    </section>

    <PlaybackControls />
    <SearchProcess />
    <SolutionPath />
    <SolutionSummary />
  </div>
</template>
