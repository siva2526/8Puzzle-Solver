<script setup lang="ts">
import { computed } from 'vue'
import { useSolver } from '@/stores/solver'

const s = useSolver()
const hasResult = computed(() => s.result.value !== null)
const canResume = computed(() => hasResult.value && !s.playing.value && !s.atEnd.value)
const phase = computed(() => {
  const f = s.frame.value
  if (!f) return 'Ready'
  return f.kind === 'search'
    ? `Search step ${f.number} of ${s.searchFrames.value}`
    : `Solution step ${f.index} of ${f.total - 1}`
})
</script>

<template>
  <section class="card" aria-labelledby="controls-title">
    <h2 id="controls-title" class="card-title">4 · Controls</h2>

    <div class="flex flex-wrap gap-2">
      <button type="button" class="btn-primary" :disabled="s.solving.value" @click="s.run()">
        <span aria-hidden="true">▶</span> {{ s.solving.value ? 'Searching…' : 'Run' }}
      </button>
      <button type="button" class="btn-secondary" :disabled="!s.playing.value" @click="s.pause()">
        <span aria-hidden="true">⏸</span> Pause
      </button>
      <button type="button" class="btn-secondary" :disabled="!canResume" @click="s.resume()">
        <span aria-hidden="true">⏯</span> Resume
      </button>
      <button type="button" class="btn-secondary" :disabled="!hasResult || s.cursor.value === 0" @click="s.previous()">
        <span aria-hidden="true">⏮</span> Previous step
      </button>
      <button type="button" class="btn-secondary" :disabled="s.solving.value || (hasResult && s.atEnd.value)" @click="s.next()">
        Next step <span aria-hidden="true">⏭</span>
      </button>
      <button type="button" class="btn-secondary" :disabled="s.solutionFrames.value === 0" @click="s.jumpToSolution()">
        Jump to solution
      </button>
      <button type="button" class="btn-secondary" @click="s.reset()"><span aria-hidden="true">↺</span> Reset</button>
    </div>

    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      <div>
        <label class="field-label" for="speed">Speed: {{ s.speed.value }} / 10</label>
        <input id="speed" v-model.number="s.speed.value" type="range" min="1" max="10" step="1" class="w-full accent-indigo-600" />
      </div>
      <div>
        <label class="field-label" for="scrub">{{ phase }}</label>
        <input
          id="scrub"
          type="range"
          min="0"
          :max="Math.max(s.totalFrames.value - 1, 0)"
          :value="s.cursor.value"
          :disabled="!hasResult"
          class="w-full accent-indigo-600"
          @input="s.seek(Number(($event.target as HTMLInputElement).value))"
        />
      </div>
    </div>

    <p v-if="s.notice.value" class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200" role="alert">
      {{ s.notice.value }}
    </p>
  </section>
</template>
