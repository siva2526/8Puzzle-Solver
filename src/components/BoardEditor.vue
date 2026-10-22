<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CELLS, type Board } from '@/engine/puzzle'

/**
 * 3×3 grid of inputs. Type 1–8 for tiles and `_` (or 0) for the blank.
 * Invalid cells are reported to the parent as -1 so the app can block Run until fixed.
 */
const model = defineModel<Board>({ required: true })
defineProps<{ title: string }>()

const toText = (board: Board): string[] => board.map((v) => (v === 0 ? '_' : v > 0 ? String(v) : ''))
const toValue = (text: string): number => {
  if (text === '_' || text === '0' || text === '-') return 0
  return /^[1-8]$/.test(text) ? Number(text) : -1
}

const drafts = ref<string[]>(toText(model.value))
const inputs = ref<(HTMLInputElement | null)[]>([])

watch(model, (board) => {
  const current = drafts.value.map(toValue)
  if (board.some((v, i) => v !== current[i])) drafts.value = toText(board)
})

const values = computed(() => drafts.value.map(toValue))
const duplicates = computed(() => {
  const counts = new Map<number, number>()
  for (const v of values.value) if (v >= 0) counts.set(v, (counts.get(v) ?? 0) + 1)
  return counts
})
const bad = (i: number): boolean => {
  const v = values.value[i] as number
  return v < 0 || (duplicates.value.get(v) ?? 0) > 1
}
const missing = computed(() => {
  const present = new Set(values.value)
  return Array.from({ length: CELLS }, (_, n) => n)
    .filter((n) => !present.has(n))
    .map((n) => (n === 0 ? '_' : String(n)))
})
const hasError = computed(() => values.value.some((_, i) => bad(i)) || missing.value.length > 0)

function onInput(i: number, event: Event): void {
  const el = event.target as HTMLInputElement
  const typed = el.value.trim().slice(-1)
  drafts.value[i] = typed
  el.value = typed
  model.value = drafts.value.map(toValue)
  if (typed !== '' && inputs.value[i + 1]) inputs.value[i + 1]?.focus()
}

function onKey(i: number, event: KeyboardEvent): void {
  const move: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }
  const delta = move[event.key]
  if (delta === undefined) return
  const target = inputs.value[i + delta]
  if (target) {
    event.preventDefault()
    target.focus()
  }
}
</script>

<template>
  <div>
    <span class="field-label">{{ title }}</span>
    <div class="inline-grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-2 ring-1 ring-slate-200" role="group" :aria-label="title">
      <input
        v-for="(text, i) in drafts"
        :key="i"
        :ref="(el) => (inputs[i] = el as HTMLInputElement | null)"
        :value="text"
        maxlength="2"
        inputmode="text"
        autocomplete="off"
        :aria-label="`${title}, row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}`"
        :aria-invalid="bad(i)"
        class="h-11 w-11 rounded-lg border-0 text-center text-lg font-semibold shadow-sm ring-1 transition focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:h-12 sm:w-12"
        :class="
          bad(i)
            ? 'bg-rose-50 text-rose-700 ring-rose-400'
            : text === '_'
              ? 'bg-slate-200 text-slate-500 ring-slate-300'
              : 'bg-white text-slate-900 ring-slate-300'
        "
        @input="onInput(i, $event)"
        @keydown="onKey(i, $event)"
        @focus="($event.target as HTMLInputElement).select()"
      />
    </div>
    <p v-if="hasError" class="mt-1.5 max-w-[11rem] text-xs text-rose-600" role="alert">
      Use each of 1–8 and <code class="font-mono">_</code> once.
      <span v-if="missing.length">Missing: {{ missing.join(', ') }}</span>
    </p>
  </div>
</template>
