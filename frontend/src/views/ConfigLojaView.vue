<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'
import ImageUpload from '@/components/ImageUpload.vue'

const route  = useRoute()
const lojaId = route.params.id

const form   = ref({})
const loading = ref(true)
const saving  = ref(false)
const sucesso = ref(false)
const erro    = ref('')

async function carregar() {
  const { data } = await api.get(`/admin/lojas/${lojaId}`)
  form.value = data
  loading.value = false
}

async function salvar() {
  saving.value = true
  sucesso.value = false
  erro.value = ''
  try {
    await api.put(`/admin/lojas/${lojaId}`, form.value)
    sucesso.value = true
  } catch (e) {
    erro.value = e.response?.data?.error || 'Erro ao salvar'
  } finally {
    saving.value = false
  }
}

onMounted(carregar)
</script>

<template>
  <div class="config-page">
    <h2>Configurações da Loja</h2>

    <div v-if="loading" class="estado">Carregando...</div>

    <form v-else @submit.prevent="salvar" class="form-config">
      <section>
        <h3>Identidade Visual</h3>
        <label>Nome da loja</label>
        <input v-model="form.nome" required />

        <div class="row">
          <div>
            <label>Cor primária</label>
            <div class="color-field">
              <input type="color" v-model="form.cor_primaria" class="color-swatch" />
              <input type="text"  v-model="form.cor_primaria" maxlength="7" class="color-hex" placeholder="#e53e3e" spellcheck="false" />
            </div>
          </div>
          <div>
            <label>Cor secundária</label>
            <div class="color-field">
              <input type="color" v-model="form.cor_secundaria" class="color-swatch" />
              <input type="text"  v-model="form.cor_secundaria" maxlength="7" class="color-hex" placeholder="#ffffff" spellcheck="false" />
            </div>
          </div>
        </div>

        <label>Logo da loja</label>
        <ImageUpload
          v-model="form.logo_url"
          :folder="`lojas/${lojaId}/logos`"
          preview="contain"
        />

        <label>Tipo de negócio</label>
        <input
          v-model="form.tipo_negocio"
          list="tipos-negocio"
          placeholder="Ex: Material de Construção, Farmácia, Moda…"
        />
        <datalist id="tipos-negocio">
          <option value="Comércio Geral" />
          <option value="Supermercado / Mercado" />
          <option value="Farmácia / Drogaria" />
          <option value="Material de Construção" />
          <option value="Moda / Vestuário" />
          <option value="Calçados" />
          <option value="Eletrônicos / Informática" />
          <option value="Móveis e Decoração" />
          <option value="Autopeças / Oficina" />
          <option value="Pet Shop" />
          <option value="Restaurante / Alimentação" />
          <option value="Salão de Beleza / Estética" />
          <option value="Academia / Fitness" />
          <option value="Imobiliária" />
          <option value="Clínica / Saúde" />
          <option value="Escola / Curso" />
        </datalist>

        <label>Imagem de fundo (para stories com IA)</label>
        <ImageUpload
          v-model="form.imagem_fundo_url"
          :folder="`lojas/${lojaId}/fundo`"
          preview="cover"
        />

        <label>Telefone / WhatsApp</label>
        <input v-model="form.telefone" placeholder="(11) 99999-9999" />
      </section>

      <section>
        <h3>Display TV — Fallback</h3>
        <p class="hint">Exibido quando não há promoções ativas</p>

        <label>Tagline</label>
        <input v-model="form.fallback_tagline" placeholder="Ex: As melhores ofertas estão aqui!" />

        <label>Cidade</label>
        <input v-model="form.fallback_cidade" placeholder="Ex: São Paulo – SP" />

        <label>Categorias</label>
        <input v-model="form.fallback_categorias" placeholder="Ex: Eletrônicos, Roupas, Calçados" />
      </section>

      <section>
        <h3>Links do Display TV</h3>
        <div class="links-tv">
          <div class="link-item">
            <span>Clássico (HTML)</span>
            <a :href="`/tv/${form.slug}`" target="_blank">/tv/{{ form.slug }}</a>
          </div>
          <div class="link-item">
            <span>Moderno (Vue)</span>
            <a :href="`/tv/${form.slug}/moderno`" target="_blank">/tv/{{ form.slug }}/moderno</a>
          </div>
        </div>
      </section>

      <p v-if="sucesso" class="sucesso">Salvo com sucesso!</p>
      <p v-if="erro" class="erro">{{ erro }}</p>

      <button type="submit" class="btn-primary" :disabled="saving">
        {{ saving ? 'Salvando...' : 'Salvar Configurações' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.config-page { max-width: 600px; }
h2 { margin: 0 0 1.5rem; }
h3 { margin: 0 0 1rem; font-size: 1rem; color: #444; }
.form-config { display: flex; flex-direction: column; gap: 1.5rem; }
section { background: #fff; border-radius: 10px; padding: 1.5rem; box-shadow: 0 1px 4px rgba(0,0,0,.08); display: flex; flex-direction: column; gap: .75rem; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
label { font-size: .875rem; font-weight: 500; color: #333; }
input[type="text"], input[type="url"], input:not([type="color"]) {
  padding: .625rem .75rem; border: 1px solid #ddd;
  border-radius: 8px; font-size: 1rem; outline: none; width: 100%; box-sizing: border-box;
}
.color-field { display: flex; align-items: center; gap: .5rem; }
.color-swatch { height: 40px; width: 44px; flex-shrink: 0; border-radius: 8px; border: 1px solid #ddd; cursor: pointer; padding: 2px; }
.color-hex { flex: 1; font-family: 'Courier New', monospace; font-size: .95rem; letter-spacing: .04em; text-transform: uppercase; padding: .625rem .75rem !important; }
input:focus { border-color: #1a73e8; }
.hint { font-size: .8rem; color: #888; margin: -.25rem 0; }
.links-tv { display: flex; flex-direction: column; gap: .5rem; }
.link-item { display: flex; justify-content: space-between; align-items: center; padding: .5rem .75rem; background: #f8f9fa; border-radius: 8px; }
.link-item span { font-size: .85rem; color: #555; font-weight: 500; }
.link-item a { font-size: .85rem; color: #1a73e8; text-decoration: none; }
.estado { color: #666; }
.sucesso { color: #2e7d32; font-size: .875rem; background: #e8f5e9; padding: .5rem .75rem; border-radius: 6px; margin: 0; }
.erro { color: #d32f2f; font-size: .875rem; margin: 0; }
.btn-primary { background: #1a73e8; color: #fff; border: none; padding: .75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 1rem; align-self: flex-start; }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
</style>
