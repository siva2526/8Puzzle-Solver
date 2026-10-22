<script setup lang="ts">
import { Link } from '@tanstack/vue-router'
</script>

<template>
  <div class="card mx-auto max-w-md text-center">
    <h1 class="text-xl font-bold text-slate-900">Page not found</h1>
    <p class="mt-2 text-slate-600">That page does not exist.</p>
    <Link to="/" class="btn-primary mt-4">Back to home</Link>
  </div>
</template>
