<script setup>
import { ref } from 'vue'
import api from '@/services/api'

const props = defineProps({
  modelValue: { type: String, default: '' },
  folder:     { type: String, default: 'misc' },
  preview:    { type: String, default: 'contain' }, // 'contain' | 'cover'
})

const emit = defineEmits(['update:modelValue'])

const uploading = ref(false)
const erro      = ref('')

function pickFile() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    uploading.value = true
    erro.value = ''
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const { data } = await api.post('/admin/upload', {
          data_url: ev.target.result,
          folder:   props.folder,
        })
        emit('update:modelValue', data.url)
      } catch {
        erro.value = 'Erro ao enviar imagem. Tente novamente.'
      } finally {
        uploading.value = false
      }
    }
    reader.readAsDataURL(file)
  }
  input.click()
}
</script>

<template>
  <div class="img-upload">
    <!-- Preview -->
    <div class="preview" :class="{ empty: !modelValue }">
      <img v-if="modelValue" :src="modelValue" :style="{ objectFit: preview }" />
      <span v-else class="empty-label">Sem imagem</span>
    </div>

    <!-- Botão escolher -->
    <button type="button" class="btn-pick" @click="pickFile" :disabled="uploading">
      {{ uploading ? '⏳ Enviando…' : '📷 Escolher arquivo' }}
    </button>

    <p v-if="erro" class="erro">{{ erro }}</p>

    <!-- Fallback: colar URL manualmente -->
    <input
      class="url-input"
      type="url"
      placeholder="Ou cole uma URL de imagem…"
      :value="modelValue"
      @input="emit('update:modelValue', $event.target.value)"
    />
  </div>
</template>

<style scoped>
.img-upload { display: flex; flex-direction: column; gap: .5rem; }

.preview {
  width: 100%; height: 140px;
  border-radius: 8px;
  background: #f3f4f6;
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.preview img { width: 100%; height: 100%; }
.preview.empty { border: 2px dashed #e0e0e0; }
.empty-label { font-size: .8rem; color: #bbb; }

.btn-pick {
  background: #f8f9fa;
  border: 1.5px dashed #d0d0d0;
  border-radius: 8px;
  padding: .5rem .75rem;
  cursor: pointer;
  font-size: .875rem;
  font-weight: 500;
  color: #444;
  text-align: center;
  transition: background .15s, border-color .15s;
}
.btn-pick:not(:disabled):hover { background: #f0f4ff; border-color: #1a73e8; color: #1a73e8; }
.btn-pick:disabled { opacity: .55; cursor: not-allowed; }

.url-input {
  padding: .45rem .65rem;
  border: 1px solid #eee;
  border-radius: 6px;
  font-size: .78rem;
  color: #777;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
.url-input:focus { border-color: #1a73e8; color: #333; }

.erro { font-size: .8rem; color: #d32f2f; margin: 0; }
</style>
