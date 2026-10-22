<script setup lang="ts">
import { computed } from 'vue'
import { Link, useSearch } from '@tanstack/vue-router'
import { ALGORITHM_DOCS, getAlgorithmDoc } from '@/config/algorithms'
import { HEURISTICS } from '@/engine/heuristics'
import type { AlgorithmId } from '@/engine/types'

const search = useSearch({ from: '/algorithms' })
const selectedId = computed<AlgorithmId>(() => search.value.algo ?? 'gbfs')
const doc = computed(() => getAlgorithmDoc(selectedId.value))
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">Algorithm information</h1>
      <p class="mt-1 max-w-3xl text-slate-600">
        <em>b</em> = branching factor (≤ 4 for the 8-puzzle), <em>d</em> = depth of the shallowest goal, <em>m</em> = maximum depth of the
        search space, <em>l</em> = depth limit.
      </p>
    </header>

    <nav class="flex flex-wrap gap-2" aria-label="Choose an algorithm">
      <Link
        v-for="a in ALGORITHM_DOCS"
        :key="a.id"
        to="/algorithms"
        :search="{ algo: a.id }"
        class="rounded-lg px-3 py-1.5 text-sm font-medium ring-1 transition"
        :class="selectedId === a.id ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50'"
        :aria-current="selectedId === a.id ? 'page' : undefined"
      >
        {{ a.shortName }}
      </Link>
    </nav>

    <article class="card" :aria-labelledby="`doc-${doc.id}`">
      <div class="flex flex-wrap items-center gap-2">
        <h2 :id="`doc-${doc.id}`" class="text-xl font-bold text-slate-900">{{ doc.name }}</h2>
        <span class="chip" :class="doc.kind === 'Informed' ? 'bg-violet-100 text-violet-800' : 'bg-slate-200 text-slate-700'">{{ doc.kind }}</span>
        <span v-if="doc.id === 'gbfs'" class="chip bg-amber-100 text-amber-800">assigned algorithm</span>
      </div>
      <p class="mt-2 text-slate-700">{{ doc.description }}</p>

      <div class="mt-5 grid gap-6 md:grid-cols-2">
        <section>
          <h3 class="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Working principle</h3>
          <ol class="list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
            <li v-for="(step, i) in doc.workingPrinciple" :key="i">{{ step }}</li>
          </ol>
          <p class="mt-3 text-sm text-slate-700"><span class="font-semibold">Frontier:</span> {{ doc.frontier }}</p>
          <p class="mt-1 text-sm text-slate-700"><span class="font-semibold">In this app:</span> {{ doc.inThisApp }}</p>
        </section>

        <div class="space-y-5">
          <section>
            <h3 class="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">Advantages</h3>
            <ul class="list-disc space-y-1 pl-5 text-sm text-slate-700"><li v-for="(a, i) in doc.advantages" :key="i">{{ a }}</li></ul>
          </section>
          <section>
            <h3 class="mb-2 text-sm font-semibold uppercase tracking-wide text-rose-700">Limitations</h3>
            <ul class="list-disc space-y-1 pl-5 text-sm text-slate-700"><li v-for="(a, i) in doc.limitations" :key="i">{{ a }}</li></ul>
          </section>
        </div>
      </div>

      <dl class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div class="stat"><dt class="stat-label">Time complexity</dt><dd class="font-mono text-sm font-semibold text-slate-900">{{ doc.timeComplexity }}</dd></div>
        <div class="stat"><dt class="stat-label">Space complexity</dt><dd class="font-mono text-sm font-semibold text-slate-900">{{ doc.spaceComplexity }}</dd></div>
        <div class="stat">
          <dt class="stat-label">Completeness</dt>
          <dd class="text-sm"><span class="font-semibold" :class="doc.complete.value === 'Yes' ? 'text-emerald-700' : 'text-rose-700'">{{ doc.complete.value }}</span> – {{ doc.complete.note }}</dd>
        </div>
        <div class="stat">
          <dt class="stat-label">Optimality</dt>
          <dd class="text-sm"><span class="font-semibold" :class="doc.optimal.value === 'Yes' ? 'text-emerald-700' : 'text-rose-700'">{{ doc.optimal.value }}</span> – {{ doc.optimal.note }}</dd>
        </div>
      </dl>
    </article>

    <section class="card overflow-x-auto" aria-labelledby="overview-title">
      <h2 id="overview-title" class="card-title">All algorithms at a glance</h2>
      <table class="w-full min-w-[40rem] text-left text-sm">
        <thead>
          <tr class="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th scope="col" class="py-2 pr-4">Algorithm</th><th scope="col" class="pr-4">Type</th><th scope="col" class="pr-4">Time</th>
            <th scope="col" class="pr-4">Space</th><th scope="col" class="pr-4">Complete</th><th scope="col">Optimal</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in ALGORITHM_DOCS" :key="a.id" class="border-b border-slate-100 last:border-0" :class="a.id === 'gbfs' ? 'bg-amber-50/60' : ''">
            <th scope="row" class="py-2 pr-4 font-semibold text-slate-900">{{ a.shortName }}</th>
            <td class="pr-4">{{ a.kind }}</td>
            <td class="pr-4 font-mono text-xs">{{ a.timeComplexity.split(' ')[0] }}</td>
            <td class="pr-4 font-mono text-xs">{{ a.spaceComplexity.split(' ')[0] }}</td>
            <td class="pr-4">{{ a.complete.value }}</td>
            <td>{{ a.optimal.value }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="card" aria-labelledby="heur-title">
      <h2 id="heur-title" class="card-title">Heuristic functions (GBFS and A*)</h2>
      <div class="grid gap-4 md:grid-cols-3">
        <div v-for="h in HEURISTICS" :key="h.id" class="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <h3 class="font-semibold text-slate-900">{{ h.name }}</h3>
          <p class="mt-1 font-mono text-xs text-slate-600">{{ h.formula }}</p>
          <p class="mt-2 text-sm text-slate-700">{{ h.description }}</p>
        </div>
      </div>
      <p class="mt-4 text-sm text-slate-600">
        All three are <strong>admissible</strong> (never overestimate the true remaining moves) and <strong>consistent</strong>, so A* with any of
        them returns an optimal path. GBFS ignores g(n) and therefore uses them only as a "closeness" score.
      </p>
    </section>
  </div>
</template>
