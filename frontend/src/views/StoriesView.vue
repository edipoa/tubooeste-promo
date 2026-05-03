<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'
import ImageUpload from '@/components/ImageUpload.vue'

const route  = useRoute()
const lojaId = route.params.id

const stories     = ref([])
const promocoes   = ref([])
const loading     = ref(true)

const showEditor   = ref(false)
const gerando      = ref(false)
const renderizando = ref(false)
const aviso        = ref('')
const exportOk     = ref(false)

const promocaoSel  = ref('')
const templateSel  = ref('classico')
const prompt       = ref('')
const htmlAtual    = ref('')
const modoIA       = ref(false)
const logoOverride = ref('')
const editandoId      = ref(null)
const carregandoHtml  = ref(false)

const previewWrapEl = ref(null)
const iframeScale   = ref(0.28)
let ro = null

const TEMPLATES = [
  { key: 'imersivo',    label: 'Imersivo',     desc: 'Foto full-bleed + frosted glass', icon: '🌄' },
  { key: 'classico',    label: 'Clássico',     desc: 'Fundo colorido + card produto',   icon: '🔴' },
  { key: 'dark',        label: 'Dark',         desc: 'Fundo escuro, acento neon',       icon: '⚫' },
  { key: 'minimalista', label: 'Minimalista',  desc: 'Clean, preço em bloco colorido',  icon: '⬜' },
]

function updateScale() {
  if (!previewWrapEl.value) return
  const { clientWidth, clientHeight } = previewWrapEl.value
  const sx = clientWidth  / 1080
  const sy = clientHeight / 1920
  iframeScale.value = Math.min(sx, sy) * 0.97
}

watch(showEditor, async (val) => {
  if (!val) { ro?.disconnect(); ro = null; return }
  await nextTick()
  if (!previewWrapEl.value) return
  ro = new ResizeObserver(updateScale)
  ro.observe(previewWrapEl.value)
  updateScale()
})

async function carregar() {
  const [s, p] = await Promise.all([
    api.get(`/admin/lojas/${lojaId}/stories`),
    api.get(`/admin/lojas/${lojaId}/promocoes`),
  ])
  stories.value   = s.data
  promocoes.value = p.data
  loading.value   = false
}

function abrirEditor() {
  htmlAtual.value      = ''
  aviso.value          = ''
  exportOk.value       = false
  modoIA.value         = false
  logoOverride.value   = ''
  editandoId.value     = null
  carregandoHtml.value = false
  promocaoSel.value    = ''
  showEditor.value     = true
}

async function editarStory(story) {
  aviso.value         = ''
  exportOk.value      = false
  logoOverride.value  = ''
  editandoId.value    = story.id
  htmlAtual.value     = ''
  carregandoHtml.value = true
  // Pré-seleciona a promoção do story para facilitar regeneração
  if (story.promocao_id) promocaoSel.value = story.promocao_id
  showEditor.value = true
  try {
    const { data } = await api.get(`/admin/lojas/${lojaId}/stories/${story.id}/html`)
    if (data.html) {
      htmlAtual.value = data.html
    } else {
      aviso.value = 'Este story foi criado antes do editor HTML. Selecione um template abaixo para gerar uma nova versão.'
    }
  } catch (e) {
    aviso.value = 'Erro ao carregar o story: ' + (e.response?.data?.error || e.message)
  } finally {
    carregandoHtml.value = false
  }
}

async function gerarPreview() {
  aviso.value   = ''
  gerando.value = true
  try {
    const body = { promocao_id: promocaoSel.value || undefined }
    if (modoIA.value) {
      if (!prompt.value) return
      body.prompt = prompt.value
    } else {
      body.template = templateSel.value
    }
    const { data } = await api.post(`/admin/lojas/${lojaId}/stories/preview-html`, body)
    htmlAtual.value = data.html
  } catch (e) {
    aviso.value = e.response?.data?.error || 'Erro ao gerar preview'
  } finally {
    gerando.value = false
  }
}

function aplicarLogo() {
  if (!logoOverride.value || !htmlAtual.value) return
  const novoSrc = logoOverride.value
  let html = htmlAtual.value

  // 1. Tenta substituir em <img alt="logo"> (templates controlados)
  html = html.replace(/<img([^>]*)alt="logo"([^>]*)>/g, (tag) => {
    const comSrc = tag.includes('src="')
      ? tag.replace(/src="[^"]*"/, `src="${novoSrc}"`)
      : tag.replace('<img', `<img src="${novoSrc}"`)
    return comSrc
  })

  // 2. Se achou o padrão dos templates mas o wrapper estava display:none, exibe
  html = html.replace(
    /(class="(?:logo-wrap|logo-circle|logo-ring|logo-sq)")[^>]*style="display:none"/g,
    '$1'
  )

  // 3. Fallback para IA: primeiro <img class="logo"> ou <img> dentro de <header>
  if (html === htmlAtual.value) {
    html = html.replace(/<img([^>]*)class="logo"([^>]*)>/,
      (tag) => tag.replace(/src="[^"]*"/, `src="${novoSrc}"`)
    )
  }

  htmlAtual.value = html
}

async function renderizarESalvar() {
  if (!htmlAtual.value) return
  renderizando.value = true
  exportOk.value     = false
  aviso.value        = ''
  try {
    const { data } = await api.post(`/admin/lojas/${lojaId}/stories/renderizar`, {
      html:        htmlAtual.value,
      promocao_id: promocaoSel.value || undefined,
      story_id:    editandoId.value || undefined,
    })
    if (editandoId.value) {
      const idx = stories.value.findIndex(s => s.id === editandoId.value)
      if (idx !== -1) stories.value[idx] = data
    } else {
      stories.value.unshift(data)
    }
    exportOk.value = true
  } catch (e) {
    aviso.value = e.response?.data?.error || 'Erro ao renderizar'
  } finally {
    renderizando.value = false
  }
}

async function baixar(story) {
  try {
    const res  = await fetch(story.imagem_url)
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `story-${story.id}.png`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    window.open(story.imagem_url, '_blank')
  }
}

async function excluir(story) {
  if (!confirm('Excluir este story?')) return
  await api.delete(`/admin/lojas/${lojaId}/stories/${story.id}`)
  stories.value = stories.value.filter(s => s.id !== story.id)
}

onMounted(carregar)
onBeforeUnmount(() => ro?.disconnect())
</script>

<template>
  <div class="stories-page">
    <div class="header">
      <h2>Stories</h2>
      <button class="btn-primary" @click="abrirEditor">+ Novo Story</button>
    </div>

    <div v-if="loading" class="estado">Carregando...</div>

    <div v-else-if="!stories.length && !showEditor" class="vazio">
      <p>Nenhum story ainda.</p>
      <button class="btn-primary" @click="abrirEditor">Criar primeiro story</button>
    </div>

    <div v-else class="grid">
      <div v-for="s in stories" :key="s.id" class="card">
        <img v-if="s.imagem_url" :src="s.imagem_url" class="thumb" />
        <div class="card-info">
          <span class="data">{{ new Date(s.criado_em).toLocaleDateString('pt-BR') }}</span>
          <div class="card-actions">
            <button class="btn-editar" @click="editarStory(s)">Editar</button>
            <button class="btn-baixar" @click="baixar(s)">Baixar</button>
            <button class="btn-danger" @click="excluir(s)">Excluir</button>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showEditor" class="overlay">
        <div class="modal-fullscreen">

          <div class="modal-header">
            <h3>{{ editandoId ? 'Editar Story' : 'Novo Story' }}</h3>
            <button class="close" @click="showEditor = false">✕</button>
          </div>

          <div class="modal-body">

            <!-- Painel esquerdo: controles -->
            <div class="panel-left">
              <label>Promoção</label>
              <select v-model="promocaoSel">
                <option value="">— Nenhuma —</option>
                <option v-for="p in promocoes" :key="p.id" :value="p.id">{{ p.titulo }}</option>
              </select>

              <!-- Tabs -->
              <div class="mode-tabs">
                <button :class="['mode-tab', { active: !modoIA }]" @click="modoIA = false">🎨 Templates</button>
                <button :class="['mode-tab', { active: modoIA }]" @click="modoIA = true">✨ Gemini IA</button>
              </div>

              <!-- Templates -->
              <template v-if="!modoIA">
                <div class="template-grid">
                  <button
                    v-for="t in TEMPLATES" :key="t.key"
                    class="tpl-btn" :class="{ active: templateSel === t.key }"
                    @click="templateSel = t.key"
                  >
                    <span class="tpl-icon">{{ t.icon }}</span>
                    <span class="tpl-name">{{ t.label }}</span>
                    <span class="tpl-desc">{{ t.desc }}</span>
                  </button>
                </div>
                <button class="btn-primary w-full" @click="gerarPreview" :disabled="gerando">
                  {{ gerando ? '⏳ Gerando...' : '🎨 Pré-visualizar' }}
                </button>
              </template>

              <!-- IA -->
              <template v-else>
                <textarea v-model="prompt" rows="4"
                  placeholder="Ex: fundo escuro, preço em amarelo, logo no topo…" />
                <button class="btn-outline w-full" @click="gerarPreview" :disabled="!prompt || gerando">
                  {{ gerando ? '⏳ Gerando...' : '✨ Gerar com IA' }}
                </button>
              </template>

              <p v-if="aviso" class="aviso">{{ aviso }}</p>

              <!-- Logo override -->
              <div v-if="htmlAtual" class="logo-override-section">
                <div class="section-label">Trocar logo no preview</div>
                <ImageUpload
                  v-model="logoOverride"
                  :folder="`lojas/${lojaId}/logos`"
                  preview="contain"
                />
                <button
                  v-if="logoOverride"
                  class="btn-outline w-full"
                  @click="aplicarLogo"
                >
                  🔄 Aplicar nova logo
                </button>
              </div>

              <!-- Salvar -->
              <div v-if="htmlAtual" class="render-section">
                <p class="render-info">
                  Preview pronto! Clique em <strong>Salvar Story</strong> para gerar o PNG em 1080×1920 e salvar.
                </p>
                <button class="btn-render w-full" @click="renderizarESalvar" :disabled="renderizando">
                  {{ renderizando ? '⏳ Renderizando...' : editandoId ? '💾 Atualizar Story' : '⬇ Salvar Story (PNG)' }}
                </button>
              </div>

              <p v-if="exportOk" class="sucesso">✅ Story salvo com sucesso!</p>
            </div>

            <!-- Painel direito: preview -->
            <div class="panel-right" ref="previewWrapEl">
              <div v-if="carregandoHtml" class="preview-empty">
                <div class="preview-hint">
                  <span class="spinner">⏳</span>
                  <p>Carregando story...</p>
                </div>
              </div>
              <div v-else-if="!htmlAtual" class="preview-empty">
                <div class="preview-hint">
                  <span>📱</span>
                  <p>{{ editandoId ? 'Selecione um template e clique em Pré-visualizar para gerar nova versão' : 'Selecione um template ou escreva para a IA e clique em Pré-visualizar' }}</p>
                </div>
              </div>
              <template v-else>
                <div class="preview-label">Pré-visualização</div>
                <div class="iframe-outer"
                  :style="`width:${1080 * iframeScale}px; height:${1920 * iframeScale}px`">
                  <iframe
                    class="story-iframe"
                    :srcdoc="htmlAtual"
                    :style="`transform: scale(${iframeScale}); transform-origin: top left;`"
                  />
                </div>
              </template>
            </div>

          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.stories-page { height: 100%; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
h2 { margin: 0; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
.card { background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.thumb { width: 100%; aspect-ratio: 9/16; object-fit: cover; }
.card-info { padding: .75rem; }
.data { font-size: .8rem; color: #888; }
.card-actions { display: flex; gap: .5rem; margin-top: .5rem; align-items: center; }
.btn-editar  { background: none; border: none; color: #555; cursor: pointer; font-size: .8rem; font-weight: 500; padding: 0; }
.btn-editar:hover { color: #111; }
.btn-baixar  { background: none; border: none; color: #1a73e8; cursor: pointer; font-size: .8rem; font-weight: 500; padding: 0; }
.btn-danger  { background: none; border: none; color: #d32f2f; cursor: pointer; font-size: .8rem; font-weight: 500; }
.btn-primary { background: #1a73e8; color: #fff; border: none; padding: .6rem 1.25rem; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: .9rem; }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.estado, .vazio { color: #666; padding: 3rem 0; text-align: center; display: flex; flex-direction: column; gap: 1rem; align-items: center; }
.w-full { width: 100%; }

/* Modal */
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,.7); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 1rem; }
.modal-fullscreen { background: #f8f9fa; border-radius: 16px; width: 100%; max-width: 1200px; height: 90vh; display: flex; flex-direction: column; overflow: hidden; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; background: #fff; border-bottom: 1px solid #eee; flex-shrink: 0; }
.modal-header h3 { margin: 0; font-size: 1.1rem; }
.close { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #666; }
.modal-body { display: grid; grid-template-columns: 280px 1fr; flex: 1; min-height: 0; overflow: hidden; }

/* Painel esquerdo */
.panel-left { padding: 1.25rem; border-right: 1px solid #eee; background: #fff; overflow-y: auto; display: flex; flex-direction: column; gap: .75rem; }
label { font-size: .875rem; font-weight: 500; color: #333; }
select, textarea { padding: .6rem .75rem; border: 1px solid #ddd; border-radius: 8px; font-size: .9rem; outline: none; width: 100%; box-sizing: border-box; resize: vertical; }
select:focus, textarea:focus { border-color: #1a73e8; }

.mode-tabs { display: flex; gap: .4rem; }
.mode-tab { flex: 1; padding: .5rem; border: 1.5px solid #ddd; border-radius: 8px; background: #fafafa; cursor: pointer; font-size: .82rem; font-weight: 500; color: #666; transition: all .15s; }
.mode-tab.active { border-color: #1a73e8; background: #f0f4ff; color: #1a73e8; }

.template-grid { display: flex; flex-direction: column; gap: .4rem; }
.tpl-btn { display: grid; grid-template-columns: 1.5rem 1fr; grid-template-rows: auto auto; column-gap: .5rem; padding: .55rem .75rem; border: 2px solid #eee; border-radius: 8px; background: #fafafa; cursor: pointer; text-align: left; transition: border-color .15s, background .15s; }
.tpl-btn.active { border-color: #1a73e8; background: #f0f4ff; }
.tpl-btn:hover:not(.active) { border-color: #c5d8ff; background: #f8faff; }
.tpl-icon { grid-row: 1 / 3; align-self: center; font-size: 1.1rem; }
.tpl-name { font-size: .85rem; font-weight: 600; color: #222; line-height: 1.2; }
.tpl-desc { font-size: .72rem; color: #888; line-height: 1.2; }

.btn-outline { background: #fff; color: #1a73e8; border: 1.5px solid #1a73e8; padding: .6rem 1.25rem; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: .9rem; width: 100%; }
.btn-outline:disabled { opacity: .5; cursor: not-allowed; }
.btn-outline:not(:disabled):hover { background: #f0f4ff; }

.section-label { font-size: .72rem; color: #999; text-transform: uppercase; letter-spacing: .06em; }
.logo-override-section { border-top: 1px solid #eee; padding-top: .75rem; display: flex; flex-direction: column; gap: .6rem; }
.render-section { border-top: 1px solid #eee; padding-top: .75rem; display: flex; flex-direction: column; gap: .6rem; }
.render-info { font-size: .8rem; color: #555; background: #fff8e1; border-radius: 8px; padding: .5rem .75rem; line-height: 1.5; margin: 0; }
.btn-render { background: #2e7d32; color: #fff; border: none; padding: .65rem 1.25rem; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: .9rem; transition: background .15s; }
.btn-render:hover:not(:disabled) { background: #1b5e20; }
.btn-render:disabled { opacity: .6; cursor: not-allowed; }

.aviso  { font-size: .82rem; color: #f57f17; background: #fff8e1; padding: .5rem .75rem; border-radius: 6px; margin: 0; }
.sucesso{ font-size: .82rem; color: #2e7d32; background: #e8f5e9; padding: .5rem .75rem; border-radius: 6px; margin: 0; }

/* Painel direito */
.panel-right {
  background: #111;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: .75rem;
  min-height: 0;
  overflow: hidden;
  padding: 1rem;
}

.preview-empty { display: flex; align-items: center; justify-content: center; height: 100%; }
.preview-hint { text-align: center; }
.preview-hint span { font-size: 3rem; display: block; margin-bottom: 1rem; }
.preview-hint p { font-size: .9rem; max-width: 240px; line-height: 1.5; color: #888; margin: 0 auto; }
.preview-label { font-size: .72rem; color: #666; letter-spacing: .06em; text-transform: uppercase; flex-shrink: 0; }

/* iframe scaling box */
.iframe-outer {
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 8px 48px rgba(0,0,0,.7);
  flex-shrink: 0;
}
.story-iframe {
  width: 1080px;
  height: 1920px;
  border: none;
  display: block;
}
</style>
