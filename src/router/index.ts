import { createHashHistory, createRootRoute, createRoute, createRouter } from '@tanstack/vue-router'
import RootLayout from '@/pages/RootLayout.vue'
import HomePage from '@/pages/HomePage.vue'
import SolverPage from '@/pages/SolverPage.vue'
import ComparePage from '@/pages/ComparePage.vue'
import AlgorithmsPage from '@/pages/AlgorithmsPage.vue'
import NotFoundPage from '@/pages/NotFoundPage.vue'
import type { AlgorithmId } from '@/engine/types'

const ALGORITHM_IDS: readonly string[] = ['bfs', 'dfs', 'dls', 'iddls', 'ucs', 'gbfs', 'astar']

const rootRoute = createRootRoute({ component: RootLayout, notFoundComponent: NotFoundPage })

const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage })
const solverRoute = createRoute({ getParentRoute: () => rootRoute, path: '/solver', component: SolverPage })
const compareRoute = createRoute({ getParentRoute: () => rootRoute, path: '/compare', component: ComparePage })
const algorithmsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/algorithms',
  // Typed search param: /#/algorithms?algo=gbfs
  validateSearch: (search: Record<string, unknown>): { algo?: AlgorithmId } => ({
    algo:
      typeof search.algo === 'string' && ALGORITHM_IDS.includes(search.algo) ? (search.algo as AlgorithmId) : undefined,
  }),
  component: AlgorithmsPage,
})

const routeTree = rootRoute.addChildren([homeRoute, solverRoute, compareRoute, algorithmsRoute])

// Hash history keeps deep links working on GitHub Pages (a static host with no rewrite rules).
export const router = createRouter({
  routeTree,
  history: createHashHistory(),
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/vue-router' {
  interface Register {
    router: typeof router
  }
}
