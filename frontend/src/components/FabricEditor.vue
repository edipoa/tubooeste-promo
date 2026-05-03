<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { fabric } from 'fabric'
import api from '@/services/api'

const props = defineProps({
  canvasJson: { type: Object, default: null },
  lojaId:     { type: String, default: null },
})

const emit = defineEmits(['export'])

const canvasEl    = ref(null)
const fillColor   = ref('#ffffff')
const fontSize    = ref(48)
const uploading   = ref(false)

let fc = null

// ── Zoom responsivo ───────────────────────────────────────
function getZoom() {
  return Math.min((window.innerHeight * 0.72) / 1920, 0.38)
}

function applyZoom() {
  if (!fc) return
  const z = getZoom()
  fc.setZoom(z)
  fc.setDimensions({ width: 1080 * z, height: 1920 * z })
}

// ── Init ──────────────────────────────────────────────────
onMounted(() => {
  fc = new fabric.Canvas(canvasEl.value, {
    width: 1080, height: 1920,
    backgroundColor: '#1a1a2e',
    preserveObjectStacking: true,
  })
  applyZoom()
  if (props.canvasJson) loadJson(props.canvasJson)
  window.addEventListener('resize', applyZoom)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', applyZoom)
  fc?.dispose()
})

watch(() => props.canvasJson, (val) => {
  if (val && fc) loadJson(val)
})

// ── Carregar JSON ─────────────────────────────────────────
function loadJson(json) {
  if (!fc || !json) return
  const zoom = fc.getZoom()
  try {
    const imgDefs = (json.objects || [])
      .filter(o => o.type === 'image' && o.src)
      .map(o => ({ name: o.name, width: o.width, height: o.height, left: o.left, top: o.top }))

    fc.loadFromJSON(json, () => {
      const imgs = fc.getObjects('image')
      imgs.forEach((img, i) => {
        const def = imgDefs[i]
        if (!def) return
        const el = img.getElement()
        if (!el || !el.naturalWidth) return

        const tw = def.width
        const th = def.height
        if (!tw && !th) return

        const sx = tw ? tw / el.naturalWidth  : Infinity
        const sy = th ? th / el.naturalHeight : Infinity

        if (def.name === 'bg') {
          // cover — preenche o canvas todo, corta as bordas se necessário
          const scale = Math.max(sx, sy)
          const left  = def.left - (el.naturalWidth  * scale - (tw || el.naturalWidth  * scale)) / 2
          const top   = def.top  - (el.naturalHeight * scale - (th || el.naturalHeight * scale)) / 2
          img.set({ scaleX: scale, scaleY: scale, left, top })
        } else {
          // contain — encaixa preservando proporção
          const scale = Math.min(sx, sy)
          img.set({ scaleX: scale, scaleY: scale, left: def.left, top: def.top })
        }
      })
      fc.setZoom(zoom)
      fc.setDimensions({ width: 1080 * zoom, height: 1920 * zoom })
      fc.renderAll()
    })
  } catch (err) {
    console.error('[FabricEditor] loadJson erro:', err)
  }
}

// ── Obter objeto selecionado ──────────────────────────────
function getActive() { return fc?.getActiveObject() }

// ── Ferramentas ───────────────────────────────────────────
function addText() {
  const t = new fabric.Textbox('Texto', {
    left: 100, top: 200, width: 880,
    fontSize: fontSize.value,
    fill: fillColor.value,
    fontFamily: 'Arial', fontWeight: 'bold',
  })
  fc.add(t)
  fc.setActiveObject(t)
  fc.renderAll()
}

function addRect() {
  const r = new fabric.Rect({
    left: 140, top: 400, width: 800, height: 160,
    fill: fillColor.value, rx: 16, ry: 16,
  })
  fc.add(r)
  fc.setActiveObject(r)
  fc.renderAll()
}

function addCircle() {
  const c = new fabric.Circle({
    left: 440, top: 800, radius: 120,
    fill: fillColor.value,
  })
  fc.add(c)
  fc.setActiveObject(c)
  fc.renderAll()
}

function onImageUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  uploading.value = true
  const reader = new FileReader()
  reader.onload = async (ev) => {
    try {
      const folder = props.lojaId ? `lojas/${props.lojaId}/canvas` : 'canvas'
      const { data } = await api.post('/admin/upload', { data_url: ev.target.result, folder })
      fabric.Image.fromURL(data.url, (img) => {
        img.scaleToWidth(800)
        img.set({ left: 140, top: 300, crossOrigin: 'anonymous' })
        fc.add(img)
        fc.setActiveObject(img)
        fc.renderAll()
      }, { crossOrigin: 'anonymous' })
    } catch {
      // fallback: add as local dataURL (won't persist in JSON nicely but unblocks user)
      fabric.Image.fromURL(ev.target.result, (img) => {
        img.scaleToWidth(800)
        img.set({ left: 140, top: 300 })
        fc.add(img)
        fc.setActiveObject(img)
        fc.renderAll()
      })
    } finally {
      uploading.value = false
    }
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

function applyColor() {
  const obj = getActive()
  if (!obj) return
  const prop = ['textbox', 'text', 'i-text'].includes(obj.type) ? 'fill' : 'fill'
  obj.set(prop, fillColor.value)
  fc.renderAll()
}

function applyFontSize() {
  const obj = getActive()
  if (obj && ['textbox', 'text', 'i-text'].includes(obj.type)) {
    obj.set('fontSize', fontSize.value)
    fc.renderAll()
  }
}

function bringFront() { getActive()?.bringToFront(); fc.renderAll() }
function sendBack()   { getActive()?.sendToBack();   fc.renderAll() }

function deleteSelected() {
  const obj = getActive()
  if (!obj) return
  if (obj.type === 'activeSelection') obj.forEachObject(o => fc.remove(o))
  else fc.remove(obj)
  fc.discardActiveObject()
  fc.renderAll()
}

function duplicar() {
  const obj = getActive()
  if (!obj) return
  obj.clone((cloned) => {
    cloned.set({ left: obj.left + 20, top: obj.top + 20 })
    fc.add(cloned)
    fc.setActiveObject(cloned)
    fc.renderAll()
  })
}

// ── Exportar PNG 1080×1920 ────────────────────────────────
function exportarPng() {
  if (!fc) return
  const zoom = fc.getZoom()
  try {
    // Remove broken image objects (failed to load — element is null/undefined)
    fc.getObjects('image').forEach(img => {
      if (!img._element || !img._element.complete) fc.remove(img)
    })

    fc.setZoom(1)
    fc.setDimensions({ width: 1080, height: 1920 })
    const dataUrl    = fc.toDataURL({ format: 'png', quality: 1 })
    const canvasJson = fc.toJSON()
    emit('export', { dataUrl, canvasJson })
  } catch (err) {
    console.error('[FabricEditor] exportarPng erro:', err)
    alert('Erro ao exportar. Tente remover imagens que não carregaram.')
  } finally {
    fc.setZoom(zoom)
    fc.setDimensions({ width: 1080 * zoom, height: 1920 * zoom })
    fc.renderAll()
  }
}
</script>

<template>
  <div class="editor-wrap">

    <!-- Toolbar -->
    <div class="toolbar">
      <!-- Adicionar elementos -->
      <div class="toolbar-group">
        <button @click="addText"   title="Texto">T</button>
        <button @click="addRect"   title="Retângulo">▭</button>
        <button @click="addCircle" title="Círculo">○</button>
        <label class="tb-btn" :title="uploading ? 'Enviando…' : 'Imagem'" :style="uploading ? 'opacity:.5;cursor:not-allowed' : ''">
          {{ uploading ? '⏳' : '🖼' }}
          <input v-if="!uploading" type="file" accept="image/*" style="display:none" @change="onImageUpload" />
        </label>
      </div>

      <!-- Cor -->
      <div class="toolbar-group">
        <label title="Cor de preenchimento">
          <input type="color" v-model="fillColor" @change="applyColor" />
        </label>
      </div>

      <!-- Fonte -->
      <div class="toolbar-group">
        <select v-model.number="fontSize" @change="applyFontSize" title="Tamanho da fonte">
          <option v-for="s in [18,24,32,48,64,80,96,128,160]" :key="s" :value="s">{{ s }}px</option>
        </select>
      </div>

      <!-- Ordem + ações -->
      <div class="toolbar-group">
        <button @click="bringFront" title="Trazer para frente">↑</button>
        <button @click="sendBack"   title="Mandar para trás">↓</button>
        <button @click="duplicar"   title="Duplicar">⎘</button>
        <button @click="deleteSelected" class="btn-delete" title="Excluir">✕</button>
      </div>

      <!-- Exportar -->
      <div class="toolbar-group ml-auto">
        <button class="btn-export" @click="exportarPng">⬇ Exportar PNG</button>
      </div>
    </div>

    <!-- Canvas -->
    <div class="canvas-scroll">
      <canvas ref="canvasEl" />
    </div>

  </div>
</template>

<style scoped>
.editor-wrap {
  display: flex;
  flex-direction: column;
  gap: .75rem;
  height: 100%;
  min-height: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: .4rem;
  background: #1a1a2e;
  border-radius: 10px;
  padding: .5rem .75rem;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: .35rem;
  padding-right: .6rem;
  border-right: 1px solid rgba(255,255,255,.1);
}
.toolbar-group:last-child { border-right: none; padding-right: 0; }
.ml-auto { margin-left: auto; }

.toolbar button, .tb-btn {
  background: rgba(255,255,255,.08);
  color: #fff;
  border: none;
  border-radius: 6px;
  width: 34px; height: 34px;
  font-size: .95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background .15s;
  flex-shrink: 0;
}
.toolbar button:hover, .tb-btn:hover { background: rgba(255,255,255,.18); }
.btn-delete { color: #ff7070 !important; }

.toolbar select {
  background: rgba(255,255,255,.08);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: .2rem .4rem;
  font-size: .82rem;
  cursor: pointer;
  height: 34px;
}
.toolbar select option { background: #1a1a2e; color: #fff; }

.toolbar input[type="color"] {
  width: 34px; height: 34px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  padding: 2px;
  background: none;
}

.btn-export {
  width: auto !important;
  padding: 0 1rem !important;
  background: #1a73e8 !important;
  font-weight: 700 !important;
  font-size: .85rem !important;
  white-space: nowrap;
}
.btn-export:hover { background: #1558b0 !important; }

.canvas-scroll {
  flex: 1;
  overflow: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: #111;
  border-radius: 10px;
  padding: 1rem;
  min-height: 0;
}
</style>
