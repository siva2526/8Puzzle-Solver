<script setup lang="ts">
import { ref } from 'vue'
import { Link, Outlet } from '@tanstack/vue-router'
import { student } from '@/config/student'

const open = ref(false)
const links = [
  { to: '/', label: 'Home' },
  { to: '/solver', label: 'Solver' },
  { to: '/compare', label: 'Comparison' },
  { to: '/algorithms', label: 'Algorithms' },
] as const
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
      Skip to content
    </a>
    <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" class="flex items-center gap-2 font-bold text-slate-900">
          <span class="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm text-white" aria-hidden="true">8</span>
          <span>8-Puzzle Visualizer</span>
        </Link>

        <button
          type="button"
          class="btn-secondary md:hidden"
          :aria-expanded="open"
          aria-controls="main-nav"
          @click="open = !open"
        >
          {{ open ? 'Close' : 'Menu' }}
        </button>

        <nav
          id="main-nav"
          aria-label="Primary"
          class="absolute left-0 right-0 top-full flex-col gap-1 border-b border-slate-200 bg-white p-3 md:static md:flex md:flex-row md:border-0 md:bg-transparent md:p-0"
          :class="open ? 'flex' : 'hidden md:flex'"
        >
          <Link
            v-for="l in links"
            :key="l.to"
            :to="l.to"
            class="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            active-class="!bg-indigo-50 !text-indigo-700"
            :active-options="{ exact: l.to === '/' }"
            @click="open = false"
          >
            {{ l.label }}
          </Link>
        </nav>
      </div>
    </header>

    <main id="main" class="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <Outlet />
    </main>

    <footer class="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
      {{ student.course }} · {{ student.name }} ({{ student.registrationNumber }}) · Algorithm: {{ student.assignedAlgorithm }}
    </footer>
  </div>
</template>
