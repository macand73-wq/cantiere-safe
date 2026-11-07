import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import ResetView from '../views/ResetView.vue'
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
  ],
})

// Synchronous: the SDK store is restored in main.ts before the first navigation.
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.user) return { name: 'login' }
  if (to.meta.guestOnly && auth.user) return { name: 'home' }
})

export default router
