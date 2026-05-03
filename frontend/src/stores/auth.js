import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  const user   = ref(null)
  const loading = ref(false)

  async function fetchMe() {
    try {
      loading.value = true
      const { data } = await api.get('/auth/me')
      user.value = data
    } catch {
      user.value = null
    } finally {
      loading.value = false
    }
  }

  async function login(email, senha) {
    await api.post('/auth/login', { email, senha })
    await fetchMe()
  }

  async function logout() {
    await api.post('/auth/logout')
    user.value = null
  }

  async function cadastro(payload) {
    await api.post('/auth/cadastro', payload)
    await fetchMe()
  }

  return { user, loading, fetchMe, login, logout, cadastro }
})
