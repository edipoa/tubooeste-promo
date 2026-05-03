<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth   = useAuthStore()

const email  = ref('')
const senha  = ref('')
const erro   = ref('')
const loading = ref(false)

async function submit() {
  erro.value = ''
  loading.value = true
  try {
    await auth.login(email.value, senha.value)
    router.push('/dashboard')
  } catch (e) {
    erro.value = e.response?.data?.error || 'Erro ao fazer login'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>Promovix</h1>
      <p class="subtitle">Acesse sua conta</p>

      <form @submit.prevent="submit">
        <label>E-mail</label>
        <input v-model="email" type="email" required autocomplete="email" />

        <label>Senha</label>
        <input v-model="senha" type="password" required autocomplete="current-password" />

        <p v-if="erro" class="erro">{{ erro }}</p>

        <button type="submit" :disabled="loading">
          {{ loading ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>

      <p class="link">
        Não tem conta? <RouterLink to="/cadastro">Criar conta grátis</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}
.auth-card {
  background: #fff;
  border-radius: 12px;
  padding: 2.5rem 2rem;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 2px 16px rgba(0,0,0,.08);
}
h1 { margin: 0 0 .25rem; font-size: 1.75rem; color: #1a73e8; }
.subtitle { color: #666; margin: 0 0 1.5rem; }
form { display: flex; flex-direction: column; gap: .75rem; }
label { font-size: .875rem; font-weight: 500; color: #333; }
input {
  padding: .625rem .75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  outline: none;
  transition: border-color .2s;
}
input:focus { border-color: #1a73e8; }
button {
  margin-top: .5rem;
  padding: .75rem;
  background: #1a73e8;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background .2s;
}
button:disabled { opacity: .6; cursor: not-allowed; }
button:hover:not(:disabled) { background: #1558b0; }
.erro { color: #d32f2f; font-size: .875rem; margin: 0; }
.link { text-align: center; margin-top: 1.25rem; font-size: .875rem; color: #666; }
.link a { color: #1a73e8; text-decoration: none; font-weight: 500; }
</style>
