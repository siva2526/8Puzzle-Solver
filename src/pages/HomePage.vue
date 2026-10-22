<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Link } from '@tanstack/vue-router'
import PuzzleBoard from '@/components/PuzzleBoard.vue'
import { student } from '@/config/student'
import { DEFAULT_GOAL, DEFAULT_INITIAL } from '@/engine/puzzle'
import { solve } from '@/engine/search'

// Live demo: GBFS solving the assignment's example, looped (lingers one tick on the goal).
const demo = solve(DEFAULT_INITIAL, DEFAULT_GOAL, { algorithm: 'gbfs', heuristic: 'manhattan', recordTrace: false })
const last = demo.path.length - 1
const tick = ref(0)
const step = computed(() => Math.min(tick.value, last))
const demoNode = computed(() => demo.path[step.value])
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => {
    tick.value = tick.value > last ? 0 : tick.value + 1
  }, 1100)
})
onBeforeUnmount(() => clearInterval(timer))

const cards = [
  { to: '/solver', title: 'Solver', icon: '🧩', text: 'Enter or generate a puzzle, choose an algorithm and heuristic, and animate the search step by step.' },
  { to: '/compare', title: 'Comparison', icon: '📊', text: 'Run every algorithm on the same puzzle and compare nodes, moves, time and memory.' },
  { to: '/algorithms', title: 'Algorithms', icon: '📚', text: 'Description, working principle, complexity, completeness and optimality of each algorithm.' },
] as const
</script>

<template>
  <div class="space-y-10">
    <section class="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div>
        <p class="text-sm font-semibold uppercase tracking-wide text-indigo-600">{{ student.course }} · Digital Assignment (Case Study)</p>
        <h1 class="mt-2 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">{{ student.assignmentTitle }}</h1>
        <dl class="mt-5 grid max-w-xl grid-cols-2 gap-3">
          <div class="stat"><dt class="stat-label">Student name</dt><dd class="text-base font-semibold text-slate-900">{{ student.name }}</dd></div>
          <div class="stat"><dt class="stat-label">Registration number</dt><dd class="text-base font-semibold text-slate-900">{{ student.registrationNumber }}</dd></div>
          <div class="stat col-span-2"><dt class="stat-label">Assigned algorithm</dt><dd class="text-base font-semibold text-slate-900">{{ student.assignedAlgorithm }}</dd></div>
        </dl>
        <div class="mt-6 flex flex-wrap gap-3">
          <Link to="/solver" class="btn-primary">Open the solver →</Link>
          <Link to="/algorithms" :search="{ algo: 'gbfs' }" class="btn-secondary">How GBFS works</Link>
        </div>
      </div>

      <div class="card mx-auto w-full max-w-sm" aria-label="Live demonstration">
        <PuzzleBoard v-if="demoNode" :board="demoNode.board" :goal="DEFAULT_GOAL" title="GBFS · live demo" :animation-ms="600" />
        <p class="mt-3 text-center text-sm text-slate-600">
          Step {{ step }} of {{ demo.path.length - 1 }}
          <span v-if="demoNode"> · h(n) = {{ demoNode.h }}</span>
        </p>
      </div>
    </section>

    <section class="card" aria-labelledby="intro-title">
      <h2 id="intro-title" class="card-title text-lg">The 8-Puzzle problem</h2>
      <div class="grid gap-6 text-slate-700 md:grid-cols-2">
        <div class="space-y-3 text-sm leading-relaxed">
          <p>
            The 8-puzzle is a sliding-tile puzzle played on a 3×3 grid. Eight numbered tiles share the board with one empty square (the
            <em>blank</em>). A move slides a tile next to the blank into it – equivalently, the blank moves up, down, left or right.
            The task is to turn a given <strong>initial state</strong> into a given <strong>goal state</strong> using as few (or as quickly found) moves as possible.
          </p>
          <p>
            It is a classic AI benchmark because it is small enough to solve exhaustively yet large enough to show why search strategy
            matters. <strong>Greedy Best First Search</strong> – this project's assigned algorithm – leans on a heuristic estimate of the
            distance to the goal and usually finds a solution after expanding only a tiny fraction of the space, at the price of
            not guaranteeing the shortest path.
          </p>
        </div>
        <div>
          <h3 class="mb-2 text-sm font-semibold text-slate-900">As a state-space search problem</h3>
          <ul class="list-disc space-y-1 pl-5 text-sm">
            <li><strong>State:</strong> an arrangement of tiles 1–8 and the blank on the 3×3 grid.</li>
            <li><strong>Initial / goal state:</strong> chosen by the user.</li>
            <li><strong>Actions:</strong> move the blank Up, Down, Left or Right (2–4 are legal).</li>
            <li><strong>Transition cost:</strong> 1 per move.</li>
            <li><strong>Size:</strong> 9! = 362,880 arrangements, of which exactly 181,440 are reachable from any one of them.</li>
            <li><strong>Solvability:</strong> goal reachable ⇔ both states have the same inversion parity.</li>
            <li><strong>Longest optimal solution:</strong> 31 moves.</li>
          </ul>
        </div>
      </div>
    </section>

    <nav aria-label="Main sections" class="grid gap-4 md:grid-cols-3">
      <Link v-for="c in cards" :key="c.to" :to="c.to" class="card group block transition hover:shadow-md hover:ring-indigo-300">
        <div class="text-2xl" aria-hidden="true">{{ c.icon }}</div>
        <h3 class="mt-2 text-base font-semibold text-slate-900 group-hover:text-indigo-700">{{ c.title }}</h3>
        <p class="mt-1 text-sm text-slate-600">{{ c.text }}</p>
      </Link>
    </nav>
  </div>
</template>
