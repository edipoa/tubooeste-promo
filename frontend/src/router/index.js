import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/login',    component: () => import('@/views/LoginView.vue'),    meta: { public: true } },
  { path: '/cadastro', component: () => import('@/views/CadastroView.vue'), meta: { public: true } },

  {
    path: '/dashboard',
    component: () => import('@/views/DashboardLayout.vue'),
    children: [
      { path: '',      redirect: '/dashboard/lojas' },
      { path: 'lojas', component: () => import('@/views/LojasView.vue') },
      { path: 'lojas/:id/promocoes', component: () => import('@/views/PromocoesView.vue') },
      { path: 'lojas/:id/stories',   component: () => import('@/views/StoriesView.vue') },
      { path: 'lojas/:id/config',    component: () => import('@/views/ConfigLojaView.vue') },
      { path: 'conta',               component: () => import('@/views/ContaView.vue') },
    ],
  },

  { path: '/', redirect: '/dashboard' },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Guard global — redireciona para /login se não autenticado
router.beforeEach(async (to) => {
  if (to.meta.public) return true

  const auth = useAuthStore()
  if (!auth.user) await auth.fetchMe()
  if (!auth.user) return '/login'

  return true
})

export default router
