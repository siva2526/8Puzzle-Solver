<script setup lang="ts">
import { computed } from 'vue'
import { SIZE, type Board } from '@/engine/puzzle'

const props = withDefaults(
  defineProps<{
    board: Board
    goal?: Board
    /** Slide duration in ms for tile movement. */
    animationMs?: number
    title?: string
    compact?: boolean
  }>(),
  { goal: undefined, animationMs: 350, title: undefined, compact: false },
)

/**
 * Tiles are absolutely positioned and keyed by their number, so when the board changes the
 * tile next to the blank simply slides into the old blank square (CSS transition on transform).
 */
const tiles = computed(() => {
  const result: { value: number; row: number; col: number; correct: boolean }[] = []
  for (let value = 1; value < SIZE * SIZE; value++) {
    const index = props.board.indexOf(value)
    if (index < 0) continue
    result.push({
      value,
      row: Math.floor(index / SIZE),
      col: index % SIZE,
      correct: props.goal !== undefined && props.goal[index] === value,
    })
  }
  return result
})

const label = computed(() => props.board.map((v) => (v === 0 ? 'blank' : v)).join(', '))
</script>

<template>
  <figure class="m-0">
    <figcaption v-if="title" class="mb-1.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
      {{ title }}
    </figcaption>
    <div
      class="aspect-square w-full select-none rounded-2xl bg-slate-300/70 p-1.5 shadow-inner"
      role="img"
      :aria-label="`${title ?? 'Board'}: ${label}`"
    >
      <div class="relative h-full w-full">
        <!-- empty slots (the blank shows through as a darker hole) -->
        <div class="absolute inset-0 grid grid-cols-3 grid-rows-3">
          <div v-for="n in 9" :key="n" class="p-[3px]"><div class="h-full w-full rounded-xl bg-slate-400/25" /></div>
        </div>
        <div
          v-for="tile in tiles"
          :key="tile.value"
          class="absolute left-0 top-0 h-1/3 w-1/3 p-[3px] will-change-transform"
          :style="{
            transform: `translate(${tile.col * 100}%, ${tile.row * 100}%)`,
            transition: `transform ${animationMs}ms cubic-bezier(0.3, 0.7, 0.3, 1)`,
          }"
        >
          <div
            class="flex h-full w-full items-center justify-center rounded-xl font-bold text-white shadow transition-colors duration-300"
            :class="[
              compact ? 'text-xl' : 'text-3xl sm:text-4xl',
              tile.correct ? 'bg-emerald-500' : 'bg-indigo-600',
            ]"
          >
            {{ tile.value }}
          </div>
        </div>
      </div>
    </div>
  </figure>
</template>
