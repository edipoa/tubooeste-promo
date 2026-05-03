<script setup>
import { ref, onMounted } from 'vue'
import api from '@/services/api'

const conta   = ref(null)
const loading = ref(true)
const upgrading = ref(false)
const upErro  = ref('')

const senhaForm = ref({ senhaAtual: '', novaSenha: '' })
const senhaSaving = ref(false)
const senhaErro  = ref('')
const senhaOk    = ref(false)

async function carregar() {
  const { data } = await api.get('/admin/conta/plano')
  conta.value = data
  loading.value = false
}

async function upgrade(planoId) {
  upErro.value = ''
  upgrading.value = true
  try {
    await api.post('/admin/conta/upgrade', { plano_id: planoId })
    await carregar()
  } catch (e) {
    upErro.value = e.response?.data?.error || 'Erro ao trocar plano'
  } finally {
    upgrading.value = false
  }
}

async function trocarSenha() {
  senhaErro.value = ''
  senhaOk.value = false
  senhaSaving.value = true
  try {
    await api.post('/auth/trocar-senha', senhaForm.value)
    senhaOk.value = true
    senhaForm.value = { senhaAtual: '', novaSenha: '' }
  } catch (e) {
    senhaErro.value = e.response?.data?.error || 'Erro ao trocar senha'
  } finally {
    senhaSaving.value = false
  }
}

onMounted(carregar)
</script>

<template>
  <div class="conta-page">
    <h2>Minha Conta</h2>

    <div v-if="loading" class="estado">Carregando...</div>

    <template v-else>
      <!-- Status atual -->
      <section>
        <h3>Plano Atual</h3>
        <div class="plano-atual">
          <div>
            <strong>{{ conta.plano_nome }}</strong>
            <span class="badge" :class="conta.status">{{ conta.status }}</span>
          </div>
          <div class="uso">
            {{ conta.lojas_ativas }} / {{ conta.max_lojas }} lojas ativas
            &nbsp;·&nbsp; R$ {{ conta.preco }}/mês
          </div>
          <div v-if="conta.status === 'trial'" class="trial-info">
            Trial até {{ new Date(conta.trial_ends_at).toLocaleDateString('pt-BR') }}
          </div>
        </div>
      </section>

      <!-- Planos disponíveis -->
      <section>
        <h3>Trocar Plano</h3>
        <p v-if="upErro" class="erro">{{ upErro }}</p>
        <div class="planos-grid">
          <div
            v-for="p in conta.planos" :key="p.id"
            class="plano-card"
            :class="{ atual: p.nome === conta.plano_nome }"
          >
            <div class="plano-nome">{{ p.nome }}</div>
            <div class="plano-lojas">até {{ p.max_lojas }} loja{{ p.max_lojas > 1 ? 's' : '' }}</div>
            <div class="plano-preco">R$ {{ p.preco }}<small>/mês</small></div>
            <button
              v-if="p.nome !== conta.plano_nome"
              class="btn-primary"
              @click="upgrade(p.id)"
              :disabled="upgrading"
            >
              Selecionar
            </button>
            <span v-else class="badge active">Plano atual</span>
          </div>
        </div>
      </section>

      <!-- Trocar senha -->
      <section>
        <h3>Trocar Senha</h3>
        <form @submit.prevent="trocarSenha" class="senha-form">
          <label>Senha atual</label>
          <input v-model="senhaForm.senhaAtual" type="password" required />
          <label>Nova senha</label>
          <input v-model="senhaForm.novaSenha" type="password" required minlength="6" />
          <p v-if="senhaErro" class="erro">{{ senhaErro }}</p>
          <p v-if="senhaOk" class="sucesso">Senha alterada com sucesso!</p>
          <button type="submit" class="btn-primary" :disabled="senhaSaving">
            {{ senhaSaving ? 'Salvando...' : 'Trocar Senha' }}
          </button>
        </form>
      </section>
    </template>
  </div>
</template>

<style scoped>
.conta-page { max-width: 700px; }
h2 { margin: 0 0 1.5rem; }
h3 { margin: 0 0 1rem; font-size: 1rem; color: #444; }
section { background: #fff; border-radius: 10px; padding: 1.5rem; box-shadow: 0 1px 4px rgba(0,0,0,.08); margin-bottom: 1.25rem; }
.plano-atual { display: flex; flex-direction: column; gap: .5rem; }
.plano-atual > div:first-child { display: flex; align-items: center; gap: .75rem; font-size: 1.1rem; }
.uso { color: #555; font-size: .9rem; }
.trial-info { font-size: .85rem; color: #f57f17; background: #fff8e1; padding: .4rem .75rem; border-radius: 6px; display: inline-block; }
.badge { font-size: .75rem; padding: .2rem .5rem; border-radius: 12px; font-weight: 600; }
.badge.trial { background: #fff8e1; color: #f57f17; }
.badge.active { background: #e8f5e9; color: #2e7d32; }
.badge.suspended { background: #ffebee; color: #c62828; }
.planos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; }
.plano-card { border: 2px solid #eee; border-radius: 10px; padding: 1rem; display: flex; flex-direction: column; gap: .5rem; align-items: center; text-align: center; transition: border-color .2s; }
.plano-card.atual { border-color: #1a73e8; }
.plano-nome { font-weight: 700; font-size: .9rem; text-transform: capitalize; }
.plano-lojas { font-size: .8rem; color: #666; }
.plano-preco { font-size: 1.2rem; font-weight: 700; color: #1a1a2e; }
.plano-preco small { font-size: .75rem; font-weight: 400; color: #888; }
.senha-form { display: flex; flex-direction: column; gap: .75rem; max-width: 340px; }
label { font-size: .875rem; font-weight: 500; color: #333; }
input { padding: .625rem .75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; outline: none; }
input:focus { border-color: #1a73e8; }
.btn-primary { background: #1a73e8; color: #fff; border: none; padding: .6rem 1.25rem; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: .9rem; }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.estado { color: #666; }
.erro { color: #d32f2f; font-size: .875rem; background: #ffebee; padding: .5rem .75rem; border-radius: 6px; margin: 0; }
.sucesso { color: #2e7d32; font-size: .875rem; background: #e8f5e9; padding: .5rem .75rem; border-radius: 6px; margin: 0; }
</style>
