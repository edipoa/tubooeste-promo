<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'
import ImageUpload from '@/components/ImageUpload.vue'

const route     = useRoute()
const lojaId    = route.params.id
const promocoes = ref([])
const loading   = ref(true)
const showForm  = ref(false)
const saving    = ref(false)
const formErro  = ref('')
const form      = ref({ titulo: '', descricao: '', preco_de: '', preco_por: '', imagem_url: '', data_validade: '', condicoes: '' })

async function carregar() {
  try {
    const { data } = await api.get(`/admin/lojas/${lojaId}/promocoes`)
    promocoes.value = data
  } finally {
    loading.value = false
  }
}

async function salvar() {
  formErro.value = ''
  saving.value = true
  try {
    const { data } = await api.post(`/admin/lojas/${lojaId}/promocoes`, form.value)
    promocoes.value.unshift(data)
    showForm.value = false
    form.value = { titulo: '', descricao: '', preco_de: '', preco_por: '', imagem_url: '', data_validade: '', condicoes: '' }
  } catch (e) {
    formErro.value = e.response?.data?.error || 'Erro ao salvar'
  } finally {
    saving.value = false
  }
}

async function toggleAtivo(p) {
  await api.put(`/admin/lojas/${lojaId}/promocoes/${p.id}`, { ativo: !p.ativo })
  p.ativo = !p.ativo
}

async function excluir(p) {
  if (!confirm('Excluir esta promoção?')) return
  await api.delete(`/admin/lojas/${lojaId}/promocoes/${p.id}`)
  promocoes.value = promocoes.value.filter(x => x.id !== p.id)
}

onMounted(carregar)
</script>

<template>
  <div>
    <div class="header">
      <h2>Promoções</h2>
      <button class="btn-primary" @click="showForm = true">+ Nova Promoção</button>
    </div>

    <div v-if="loading" class="estado">Carregando...</div>

    <table v-else class="tabela">
      <thead>
        <tr>
          <th>Título</th><th>Preço por</th><th>Validade</th><th>Ativo</th><th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in promocoes" :key="p.id">
          <td>{{ p.titulo }}</td>
          <td>{{ p.preco_por ? `R$ ${p.preco_por}` : '—' }}</td>
          <td>{{ p.data_validade || '—' }}</td>
          <td>
            <button class="toggle" :class="{ ativo: p.ativo }" @click="toggleAtivo(p)">
              {{ p.ativo ? 'Ativo' : 'Inativo' }}
            </button>
          </td>
          <td><button class="btn-danger" @click="excluir(p)">Excluir</button></td>
        </tr>
      </tbody>
    </table>

    <div v-if="showForm" class="overlay" @click.self="showForm = false">
      <div class="modal">
        <h3>Nova Promoção</h3>
        <form @submit.prevent="salvar">
          <label>Título *</label>
          <input v-model="form.titulo" required />
          <label>Descrição</label>
          <textarea
            v-model="form.descricao"
            rows="4"
            placeholder="Descreva o produto. Use Enter para separar itens — cada linha vira um bullet point no story."
            class="descricao-area"
          />
          <div class="row">
            <div>
              <label>Preço de</label>
              <input v-model="form.preco_de" type="number" step=".01" min="0" />
            </div>
            <div>
              <label>Preço por</label>
              <input v-model="form.preco_por" type="number" step=".01" min="0" />
            </div>
          </div>
          <label>Imagem do produto</label>
          <ImageUpload
            v-model="form.imagem_url"
            :folder="`lojas/${lojaId}/promocoes`"
            preview="contain"
          />
          <label>Condições de pagamento</label>
          <input v-model="form.condicoes" placeholder="Ex: 10x sem juros, Pix com 5% off…" />

          <label>Válida até</label>
          <input v-model="form.data_validade" type="date" />
          <p v-if="formErro" class="erro">{{ formErro }}</p>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="showForm = false">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
h2 { margin: 0; }
.tabela { width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
th, td { padding: .75rem 1rem; text-align: left; border-bottom: 1px solid #f0f0f0; font-size: .9rem; }
th { background: #fafafa; font-weight: 600; color: #555; }
.toggle { padding: .25rem .6rem; border-radius: 12px; border: none; cursor: pointer; font-size: .8rem; font-weight: 500; background: #eee; color: #666; }
.toggle.ativo { background: #e8f5e9; color: #2e7d32; }
.btn-danger { background: none; border: none; color: #d32f2f; cursor: pointer; font-size: .85rem; font-weight: 500; }
.btn-primary { background: #1a73e8; color: #fff; border: none; padding: .6rem 1.25rem; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: .9rem; }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.btn-secondary { background: transparent; color: #333; border: 1px solid #ddd; padding: .6rem 1.25rem; border-radius: 8px; font-weight: 500; cursor: pointer; font-size: .9rem; }
.estado { color: #666; padding: 2rem 0; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: #fff; border-radius: 12px; padding: 2rem; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; }
.modal h3 { margin: 0 0 1.25rem; }
form { display: flex; flex-direction: column; gap: .75rem; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
label { font-size: .875rem; font-weight: 500; color: #333; }
input { padding: .625rem .75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; outline: none; width: 100%; box-sizing: border-box; }
input:focus { border-color: #1a73e8; }
.descricao-area { padding: .625rem .75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; outline: none; width: 100%; box-sizing: border-box; resize: vertical; font-family: inherit; line-height: 1.5; }
.descricao-area:focus { border-color: #1a73e8; }
.modal-actions { display: flex; gap: .75rem; justify-content: flex-end; margin-top: .5rem; }
.erro { color: #d32f2f; font-size: .875rem; margin: 0; }
</style>
