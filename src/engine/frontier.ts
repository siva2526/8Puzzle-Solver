/**
 * Frontier (open list) data structures. Each one can also `peek` at the next
 * entries *without* removing them so the visualiser can display the open list.
 */

export interface Frontier<T> {
  push(item: T): void
  pop(): T | undefined
  /** Raw number of stored entries (may include stale ones for lazy-deletion searches). */
  readonly length: number
  /** The next `limit` live entries, in the order they would be selected. */
  peek(limit: number, isLive?: (item: T) => boolean): T[]
}

/** FIFO – Breadth First Search. */
export class QueueFrontier<T> implements Frontier<T> {
  private items: T[] = []
  private head = 0

  get length(): number {
    return this.items.length - this.head
  }

  push(item: T): void {
    this.items.push(item)
  }

  pop(): T | undefined {
    if (this.head >= this.items.length) return undefined
    const item = this.items[this.head++]
    // Reclaim memory occasionally.
    if (this.head > 4096 && this.head * 2 > this.items.length) {
      this.items = this.items.slice(this.head)
      this.head = 0
    }
    return item
  }

  peek(limit: number, isLive?: (item: T) => boolean): T[] {
    const out: T[] = []
    for (let i = this.head; i < this.items.length && out.length < limit; i++) {
      const item = this.items[i] as T
      if (!isLive || isLive(item)) out.push(item)
    }
    return out
  }
}

/** LIFO – Depth First / Depth Limited Search. */
export class StackFrontier<T> implements Frontier<T> {
  private items: T[] = []

  get length(): number {
    return this.items.length
  }

  push(item: T): void {
    this.items.push(item)
  }

  pop(): T | undefined {
    return this.items.pop()
  }

  peek(limit: number, isLive?: (item: T) => boolean): T[] {
    const out: T[] = []
    for (let i = this.items.length - 1; i >= 0 && out.length < limit; i--) {
      const item = this.items[i] as T
      if (!isLive || isLive(item)) out.push(item)
    }
    return out
  }
}

/**
 * Binary min-heap – Uniform Cost, Greedy Best First and A*.
 * The comparator decides the order; ties must be broken inside it (we use the
 * node creation id, i.e. FIFO) so results are deterministic.
 */
export class PriorityFrontier<T> implements Frontier<T> {
  private heap: T[] = []

  constructor(private readonly compare: (a: T, b: T) => number) {}

  get length(): number {
    return this.heap.length
  }

  push(item: T): void {
    const heap = this.heap
    heap.push(item)
    let i = heap.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.compare(heap[i] as T, heap[parent] as T) >= 0) break
      ;[heap[i], heap[parent]] = [heap[parent] as T, heap[i] as T]
      i = parent
    }
  }

  pop(): T | undefined {
    const heap = this.heap
    if (heap.length === 0) return undefined
    const top = heap[0] as T
    const last = heap.pop() as T
    if (heap.length > 0) {
      heap[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let smallest = i
        if (l < heap.length && this.compare(heap[l] as T, heap[smallest] as T) < 0) smallest = l
        if (r < heap.length && this.compare(heap[r] as T, heap[smallest] as T) < 0) smallest = r
        if (smallest === i) break
        ;[heap[i], heap[smallest]] = [heap[smallest] as T, heap[i] as T]
        i = smallest
      }
    }
    return top
  }

  /**
   * Smallest `limit` live entries in order, found by walking the heap best-first
   * with a small auxiliary candidate list – O(limit²) instead of sorting the heap.
   */
  peek(limit: number, isLive?: (item: T) => boolean): T[] {
    const heap = this.heap
    const out: T[] = []
    if (heap.length === 0) return out
    const candidates: number[] = [0]
    let visited = 0
    const visitCap = Math.max(limit * 40, 200) // stale entries must not make this unbounded
    while (candidates.length > 0 && out.length < limit && visited < visitCap) {
      let best = 0
      for (let c = 1; c < candidates.length; c++) {
        if (this.compare(heap[candidates[c] as number] as T, heap[candidates[best] as number] as T) < 0) best = c
      }
      const index = candidates.splice(best, 1)[0] as number
      visited++
      const item = heap[index] as T
      if (!isLive || isLive(item)) out.push(item)
      const l = 2 * index + 1
      if (l < heap.length) candidates.push(l)
      if (l + 1 < heap.length) candidates.push(l + 1)
    }
    return out
  }
}
