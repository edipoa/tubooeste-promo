<script setup>
import { ref, onMounted } from 'vue'
import api from '@/services/api'

const lojas   = ref([])
const loading = ref(true)
const erro    = ref('')
const showForm = ref(false)
const form    = ref({ nome: '', slug: '' })
const saving  = ref(false)
const formErro = ref('')

async function carregar() {
  try {
    const { data } = await api.get('/admin/lojas')
    lojas.value = data
  } catch {
    erro.value = 'Erro ao carregar lojas'
  } finally {
    loading.value = false
  }
}

async function criarLoja() {
  formErro.value = ''
  saving.value = true
  try {
    const { data } = await api.post('/admin/lojas', form.value)
    lojas.value.push(data)
    showForm.value = false
    form.value = { nome: '', slug: '' }
  } catch (e) {
    formErro.value = e.response?.data?.error || 'Erro ao criar loja'
  } finally {
    saving.value = false
  }
}

function gerarSlug() {
  form.value.slug = form.value.nome
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

onMounted(carregar)
</script>

<template>
  <div>
    <div class="header">
      <h2>Lojas</h2>
      <button class="btn-primary" @click="showForm = true">+ Nova Loja</button>
    </div>

    <div v-if="loading" class="estado">Carregando...</div>
    <div v-else-if="erro" class="estado erro">{{ erro }}</div>

    <div v-else class="grid">
      <div v-for="loja in lojas" :key="loja.id" class="card">
        <div class="card-title">{{ loja.nome }}</div>
        <div class="card-slug">{{ loja.slug }}</div>
        <div class="card-actions">
          <RouterLink :to="`/dashboard/lojas/${loja.id}/promocoes`">Promoções</RouterLink>
          <RouterLink :to="`/dashboard/lojas/${loja.id}/stories`">Stories</RouterLink>
          <RouterLink :to="`/dashboard/lojas/${loja.id}/config`">Config</RouterLink>
        </div>
      </div>
    </div>

    <!-- Modal nova loja -->
    <div v-if="showForm" class="overlay" @click.self="showForm = false">
      <div class="modal">
        <h3>Nova Loja</h3>
        <form @submit.prevent="criarLoja">
          <label>Nome da loja</label>
          <input v-model="form.nome" @input="gerarSlug" type="text" required />

          <label>Slug (URL pública)</label>
          <input v-model="form.slug" type="text" required pattern="[a-z0-9-]+" />
          <small>Será usado em: /tv/{{ form.slug }}</small>

          <p v-if="formErro" class="erro">{{ formErro }}</p>

          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="showForm = false">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? 'Criando...' : 'Criar Loja' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
h2 { margin: 0; font-size: 1.5rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
.card {
  background: #fff;
  border-radius: 10px;
  padding: 1.25rem;
  box-shadow: 0 1px 4px rgba(0,0,0,.08);
}
.card-title { font-weight: 600; font-size: 1rem; margin-bottom: .25rem; }
.card-slug { color: #888; font-size: .8rem; margin-bottom: 1rem; }
.card-actions { display: flex; gap: .5rem; flex-wrap: wrap; }
.card-actions a {
  font-size: .8rem;
  padding: .3rem .6rem;
  background: #f0f4ff;
  color: #1a73e8;
  border-radius: 5px;
  text-decoration: none;
  font-weight: 500;
}
.card-actions a:hover { background: #d8e8ff; }
.estado { color: #666; padding: 2rem 0; }
.estado.erro { color: #d32f2f; }
.btn-primary {
  background: #1a73e8; color: #fff; border: none;
  padding: .6rem 1.25rem; border-radius: 8px; font-weight: 600;
  cursor: pointer; font-size: .9rem;
}
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.btn-secondary {
  background: transparent; color: #333; border: 1px solid #ddd;
  padding: .6rem 1.25rem; border-radius: 8px; font-weight: 500;
  cursor: pointer; font-size: .9rem;
}
.overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.4);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.modal {
  background: #fff; border-radius: 12px;
  padding: 2rem; width: 100%; max-width: 420px;
}
.modal h3 { margin: 0 0 1.25rem; }
form { display: flex; flex-direction: column; gap: .75rem; }
label { font-size: .875rem; font-weight: 500; color: #333; }
input {
  padding: .625rem .75rem; border: 1px solid #ddd;
  border-radius: 8px; font-size: 1rem; outline: none;
}
input:focus { border-color: #1a73e8; }
small { color: #888; font-size: .8rem; margin-top: -.5rem; }
.modal-actions { display: flex; gap: .75rem; justify-content: flex-end; margin-top: .5rem; }
.erro { color: #d32f2f; font-size: .875rem; margin: 0; }
</style>
