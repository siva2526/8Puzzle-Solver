<script setup lang="ts">
import { computed } from 'vue'
import type { Board } from '@/engine/puzzle'

const props = withDefaults(
  defineProps<{
    board: Board
    /** When given, tiles already on their goal square are tinted green. */
    goal?: Board
    size?: 'xs' | 'sm' | 'md'
  }>(),
  { size: 'sm', goal: undefined },
)

const cells = computed(() =>
  props.board.map((value, i) => ({
    value,
    correct: value !== 0 && props.goal !== undefined && props.goal[i] === value,
  })),
)

const sizeClass = { xs: 'h-4 w-4 text-[9px]', sm: 'h-6 w-6 text-xs', md: 'h-8 w-8 text-sm' } as const
const label = computed(() => props.board.map((v) => (v === 0 ? 'blank' : v)).join(' '))
</script>

<template>
  <div class="inline-grid grid-cols-3 gap-0.5 rounded-md bg-slate-200 p-0.5" role="img" :aria-label="`Board: ${label}`">
    <div
      v-for="(cell, i) in cells"
      :key="i"
      class="flex items-center justify-center rounded-[3px] font-semibold"
      :class="[
        sizeClass[size],
        cell.value === 0
          ? 'bg-slate-100'
          : cell.correct
            ? 'bg-emerald-500 text-white'
            : 'bg-indigo-500 text-white',
      ]"
    >
      {{ cell.value === 0 ? '' : cell.value }}
    </div>
  </div>
</template>
