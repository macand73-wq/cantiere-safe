import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import ResetView from '../views/ResetView.vue'
import CantiereListView from '../views/CantiereListView.vue'
import CantiereFormView from '../views/CantiereFormView.vue'
import { useAuthStore } from '../stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { requiresAuth: true } },
    { path: '/login', name: 'login', component: LoginView, meta: { guestOnly: true } },
    { path: '/register', name: 'register', component: RegisterView, meta: { guestOnly: true } },
    { path: '/reset', name: 'reset', component: ResetView, meta: { guestOnly: true } },
    { path: '/cantieri', name: 'cantieri', component: CantiereListView, meta: { requiresAuth: true } },
    { path: '/cantieri/new', name: 'cantieri-new', component: CantiereFormView, meta: { requiresAuth: true } },
    { path: '/cantieri/:id/edit', name: 'cantieri-edit', component: CantiereFormView, meta: { requiresAuth: true } },
  ],
})

// Synchronous: the SDK store is restored in main.ts before the first navigation.
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.user) return { name: 'login' }
  if (to.meta.guestOnly && auth.user) return { name: 'home' }
})

export default router
