<script setup>
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const auth   = useAuthStore()
const router = useRouter()

async function sair() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="brand">Promovix</div>

      <nav>
        <RouterLink to="/dashboard/lojas">Lojas</RouterLink>
        <RouterLink to="/dashboard/conta">Minha Conta</RouterLink>
      </nav>

      <div class="user-info">
        <span>{{ auth.user?.email }}</span>
        <button @click="sair">Sair</button>
      </div>
    </aside>

    <main class="content">
      <div v-if="auth.user?.status === 'suspended'" class="banner-suspenso">
        Sua conta está suspensa. <RouterLink to="/dashboard/conta">Regularize seu pagamento</RouterLink> para continuar usando o painel.
      </div>
      <div v-if="auth.user?.status === 'trial'" class="banner-trial">
        Trial ativo — {{ diasRestantes }} dias restantes.
        <RouterLink to="/dashboard/conta">Assinar agora</RouterLink>
      </div>
      <RouterView />
    </main>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
export default {
  setup() {
    const auth = useAuthStore()
    const diasRestantes = computed(() => {
      if (!auth.user?.trial_ends_at) return 0
      const diff = new Date(auth.user.trial_ends_at) - Date.now()
      return Math.max(0, Math.ceil(diff / 86400000))
    })
    return { diasRestantes }
  }
}
</script>

<style scoped>
.layout { display: flex; min-height: 100vh; }
.sidebar {
  width: 220px;
  background: #1a1a2e;
  color: #fff;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
  gap: 1.5rem;
  flex-shrink: 0;
}
.brand { font-size: 1.25rem; font-weight: 700; color: #4fc3f7; }
nav { display: flex; flex-direction: column; gap: .5rem; flex: 1; }
nav a {
  color: #ccc;
  text-decoration: none;
  padding: .5rem .75rem;
  border-radius: 6px;
  font-size: .9rem;
  transition: background .2s;
}
nav a:hover, nav a.router-link-active { background: rgba(255,255,255,.1); color: #fff; }
.user-info { display: flex; flex-direction: column; gap: .5rem; }
.user-info span { font-size: .8rem; color: #aaa; word-break: break-all; }
.user-info button {
  background: transparent;
  border: 1px solid #555;
  color: #ccc;
  padding: .4rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: .85rem;
  transition: border-color .2s;
}
.user-info button:hover { border-color: #fff; color: #fff; }
.content { flex: 1; padding: 2rem; background: #f8f9fa; overflow-y: auto; }
.banner-suspenso {
  background: #ffebee;
  border: 1px solid #ffcdd2;
  color: #c62828;
  padding: .75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: .9rem;
}
.banner-trial {
  background: #fff8e1;
  border: 1px solid #ffe082;
  color: #f57f17;
  padding: .75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: .9rem;
}
.banner-suspenso a, .banner-trial a { font-weight: 600; }
</style>
