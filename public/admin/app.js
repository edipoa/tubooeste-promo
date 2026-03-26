/* ============================================================
   Tubo Oeste — Admin App
============================================================ */

const API = '/api/promocoes';

// ── Formatação ─────────────────────────────────────────────
function formatBRL(val) {
  if (val === null || val === undefined || val === '') return null;
  return parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function hoje() {
  return new Date().toISOString().split('T')[0];
}

function isExpirada(promo) {
  return promo.data_validade < hoje() || promo.ativo === 0;
}

// ── Render ─────────────────────────────────────────────────
function renderCard(promo, expirada = false) {
  const card = document.createElement('div');
  card.className = 'promo-card' + (expirada ? ' expirada' : '');
  card.dataset.id = promo.id;

  // Thumb
  let thumbHTML;
  if (promo.imagem) {
    thumbHTML = `<img class="promo-thumb" src="/uploads/${promo.imagem}" alt="${promo.titulo}" loading="lazy">`;
  } else {
    thumbHTML = `
      <div class="promo-thumb-placeholder" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227
               1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14
               1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233
               2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394
               48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746
               2.25 5.14 2.25 6.741v6.018Z"/>
        </svg>
      </div>`;
  }

  // Preço
  let precoHTML = '';
  if (promo.preco_por) {
    precoHTML = `<p class="promo-preco">`;
    if (promo.preco_de) precoHTML += `<span class="de">${formatBRL(promo.preco_de)}</span>`;
    precoHTML += `${formatBRL(promo.preco_por)}</p>`;
  }

  // Validade
  const vencida = promo.data_validade < hoje();
  const validadeClass = vencida ? ' vencida' : '';
  const validadeLabel = expirada ? 'Expirou' : 'Válido até';

  // Ações
  let acoesHTML;
  if (expirada) {
    acoesHTML = `
      <div class="promo-actions">
        <button class="btn-icon success" data-action="reativar" data-id="${promo.id}" title="Reativar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993
                 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031
                 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/>
          </svg>
        </button>
        <button class="btn-icon danger" data-action="excluir" data-id="${promo.id}" title="Excluir">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107
                 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244
                 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456
                 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114
                 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964
                 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09
                 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/>
          </svg>
        </button>
      </div>`;
  } else {
    acoesHTML = `
      <div class="promo-actions">
        <button class="btn-icon" data-action="editar" data-id="${promo.id}" title="Editar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582
                 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1
                 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25
                 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25
                 0 0 1 5.25 6H10"/>
          </svg>
        </button>
        <button class="btn-icon danger" data-action="excluir" data-id="${promo.id}" title="Excluir">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107
                 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244
                 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456
                 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114
                 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964
                 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09
                 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/>
          </svg>
        </button>
      </div>`;
  }

  card.innerHTML = `
    ${thumbHTML}
    <div class="promo-info">
      <p class="promo-titulo">${promo.titulo}</p>
      ${precoHTML}
      <p class="promo-validade${validadeClass}">${validadeLabel}: ${formatDate(promo.data_validade)}</p>
    </div>
    ${acoesHTML}
  `;

  return card;
}

function renderListas(promos) {
  const ativas    = promos.filter(p => p.ativo === 1 && p.data_validade >= hoje());
  const expiradas = promos.filter(p => p.ativo === 0 || p.data_validade < hoje());

  const listaAtivas    = document.getElementById('lista-ativas');
  const listaExpiradas = document.getElementById('lista-expiradas');
  const countAtivas    = document.getElementById('count-ativas');
  const countExpiradas = document.getElementById('count-expiradas');

  countAtivas.textContent    = ativas.length;
  countExpiradas.textContent = expiradas.length;

  listaAtivas.innerHTML = '';
  if (ativas.length === 0) {
    listaAtivas.innerHTML = '<p class="empty-msg">Nenhuma promoção ativa.</p>';
  } else {
    ativas.forEach(p => listaAtivas.appendChild(renderCard(p, false)));
  }

  listaExpiradas.innerHTML = '';
  if (expiradas.length === 0) {
    listaExpiradas.innerHTML = '<p class="empty-msg">Nenhuma promoção expirada.</p>';
  } else {
    expiradas.forEach(p => listaExpiradas.appendChild(renderCard(p, true)));
  }
}

// ── API calls ───────────────────────────────────────────────
async function carregarPromos() {
  const res   = await fetch(API);
  const dados = await res.json();
  renderListas(dados);
}

async function salvarPromo(formData, id) {
  const url    = id ? `${API}/${id}` : API;
  const method = id ? 'PUT' : 'POST';
  const res    = await fetch(url, { method, body: formData });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.erro || 'Erro ao salvar.');
  }
  return res.json();
}

async function excluirPromo(id) {
  const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erro ao excluir.');
}

async function reativarPromo(id, novaData) {
  const body = new FormData();
  body.append('data_validade', novaData);
  body.append('ativo', '1');
  const res = await fetch(`${API}/${id}`, { method: 'PUT', body });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.erro || 'Erro ao reativar.');
  }
}

// ── Modal helpers ───────────────────────────────────────────
function abrirModal(id) {
  const el = document.getElementById(id);
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
}

function fecharModal(id) {
  const el = document.getElementById(id);
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
}

// ── Modal formulário ────────────────────────────────────────
let imagemRemovida = false;
let imagemGerada   = null; // filename já salvo no servidor via IA ou remove.bg

function setPreview(src, filename) {
  const preview = document.getElementById('preview-img');
  preview.src = src;
  preview.style.display = 'block';
  document.getElementById('upload-placeholder').style.display = 'none';
  document.getElementById('btn-remover-img').style.display    = 'inline';
  document.getElementById('btn-remover-fundo').style.display  = 'inline-flex';
  if (filename) {
    imagemGerada = filename;
    document.getElementById('imagem-gerada').value = filename;
  }
}

function clearPreview() {
  document.getElementById('imagem').value                          = '';
  document.getElementById('preview-img').style.display            = 'none';
  document.getElementById('upload-placeholder').style.display     = 'flex';
  document.getElementById('btn-remover-img').style.display        = 'none';
  document.getElementById('btn-remover-fundo').style.display      = 'none';
  document.getElementById('imagem-gerada').value                  = '';
  imagemGerada   = null;
  imagemRemovida = true;
}

function resetForm() {
  document.getElementById('promo-id').value          = '';
  document.getElementById('titulo').value            = '';
  document.getElementById('descricao').value         = '';
  document.getElementById('preco_de').value          = '';
  document.getElementById('preco_por').value         = '';
  document.getElementById('data_validade').value     = '';
  document.getElementById('imagem').value            = '';
  document.getElementById('imagem-gerada').value     = '';
  document.getElementById('preview-img').style.display            = 'none';
  document.getElementById('upload-placeholder').style.display     = 'flex';
  document.getElementById('btn-remover-img').style.display        = 'none';
  document.getElementById('btn-remover-fundo').style.display      = 'none';
  document.getElementById('form-error').style.display             = 'none';
  document.getElementById('modal-titulo').textContent = 'Nova Promoção';
  imagemRemovida = false;
  imagemGerada   = null;
}

function preencherForm(promo) {
  document.getElementById('promo-id').value      = promo.id;
  document.getElementById('titulo').value        = promo.titulo;
  document.getElementById('descricao').value     = promo.descricao || '';
  document.getElementById('preco_de').value      = promo.preco_de  || '';
  document.getElementById('preco_por').value     = promo.preco_por || '';
  document.getElementById('data_validade').value = promo.data_validade;
  document.getElementById('modal-titulo').textContent = 'Editar Promoção';

  if (promo.imagem) {
    setPreview(`/uploads/${promo.imagem}`, null);
  }
}

document.getElementById('btn-nova').addEventListener('click', () => {
  resetForm();
  abrirModal('modal-backdrop');
});

document.getElementById('btn-fechar').addEventListener('click', () => fecharModal('modal-backdrop'));
document.getElementById('btn-cancelar').addEventListener('click', () => fecharModal('modal-backdrop'));

document.getElementById('modal-backdrop').addEventListener('click', e => {
  if (e.target === e.currentTarget) fecharModal('modal-backdrop');
});

// Preview imagem ao selecionar arquivo
document.getElementById('imagem').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;
  imagemGerada = null;
  document.getElementById('imagem-gerada').value = '';
  setPreview(URL.createObjectURL(file), null);
  imagemRemovida = false;
});

document.getElementById('btn-remover-img').addEventListener('click', clearPreview);

// ── Gerar imagem com IA ─────────────────────────────────────
document.getElementById('btn-gerar-ia').addEventListener('click', async () => {
  const titulo = document.getElementById('titulo').value.trim();
  if (!titulo) {
    document.getElementById('form-error').textContent = 'Preencha o título antes de gerar a imagem.';
    document.getElementById('form-error').style.display = 'block';
    return;
  }
  document.getElementById('form-error').style.display = 'none';

  const btn = document.getElementById('btn-gerar-ia');
  btn.disabled = true;
  btn.textContent = 'Gerando… (pode levar até 30s)';

  try {
    const res  = await fetch('/api/promocoes/gerar-imagem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || 'Erro ao gerar imagem.');

    setPreview(`/uploads/${data.filename}`, data.filename);
    imagemRemovida = false;
  } catch (err) {
    document.getElementById('form-error').textContent = err.message;
    document.getElementById('form-error').style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5
           4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75
           12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375
           3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0
           2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75
           6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"/>
    </svg> Gerar imagem com IA`;
  }
});

// ── Remover fundo ───────────────────────────────────────────
document.getElementById('btn-remover-fundo').addEventListener('click', async () => {
  const previewImg = document.getElementById('preview-img');
  if (!previewImg.src || previewImg.style.display === 'none') return;

  const btn = document.getElementById('btn-remover-fundo');
  btn.disabled = true;
  btn.textContent = 'Removendo fundo…';

  try {
    // Obtém a imagem atual (arquivo local ou URL do servidor)
    let blob;
    const fileInput = document.getElementById('imagem');
    if (fileInput.files[0]) {
      blob = fileInput.files[0];
    } else {
      const r = await fetch(previewImg.src);
      blob = await r.blob();
    }

    const formData = new FormData();
    formData.append('imagem', blob, 'image.jpg');

    const res  = await fetch('/api/promocoes/remover-fundo', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || 'Erro ao remover fundo.');

    // Limpa o file input pois a imagem agora está no servidor
    document.getElementById('imagem').value = '';
    setPreview(`/uploads/${data.filename}`, data.filename);
    imagemRemovida = false;
  } catch (err) {
    document.getElementById('form-error').textContent = err.message;
    document.getElementById('form-error').style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5
           1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5M4.5
           16.5h15M12 3v9"/>
    </svg> Remover fundo`;
  }
});

// Submit form
document.getElementById('form-promo').addEventListener('submit', async function (e) {
  e.preventDefault();

  const errorEl = document.getElementById('form-error');
  errorEl.style.display = 'none';

  const id    = document.getElementById('promo-id').value;
  const titulo = document.getElementById('titulo').value.trim();
  const data   = document.getElementById('data_validade').value;

  if (!titulo) {
    errorEl.textContent = 'O título é obrigatório.';
    errorEl.style.display = 'block';
    return;
  }
  if (!data) {
    errorEl.textContent = 'A data de validade é obrigatória.';
    errorEl.style.display = 'block';
    return;
  }

  const formData = new FormData();
  formData.append('titulo',        titulo);
  formData.append('descricao',     document.getElementById('descricao').value);
  formData.append('preco_de',      document.getElementById('preco_de').value);
  formData.append('preco_por',     document.getElementById('preco_por').value);
  formData.append('data_validade', data);

  const fileInput = document.getElementById('imagem');
  if (fileInput.files[0]) {
    formData.append('imagem', fileInput.files[0]);
  } else if (imagemGerada) {
    formData.append('imagem_gerada', imagemGerada);
  } else if (imagemRemovida && id) {
    formData.append('remover_imagem', '1');
  }

  const btn = document.getElementById('btn-salvar');
  btn.textContent = 'Salvando...';
  btn.disabled = true;

  try {
    await salvarPromo(formData, id || null);
    fecharModal('modal-backdrop');
    await carregarPromos();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  } finally {
    btn.textContent = 'Salvar';
    btn.disabled = false;
  }
});

// ── Delegação de eventos nas listas ────────────────────────
let pendingDeleteId = null;
let pendingReativarId = null;

document.getElementById('lista-ativas').addEventListener('click', handleCardAction);
document.getElementById('lista-expiradas').addEventListener('click', handleCardAction);

function handleCardAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id     = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === 'editar') {
    fetch(`${API}`).then(r => r.json()).then(promos => {
      const promo = promos.find(p => String(p.id) === String(id));
      if (!promo) return;
      resetForm();
      preencherForm(promo);
      abrirModal('modal-backdrop');
    });
  }

  if (action === 'excluir') {
    pendingDeleteId = id;
    abrirModal('modal-delete');
  }

  if (action === 'reativar') {
    pendingReativarId = id;
    const novaData = document.getElementById('nova-data-validade');
    novaData.value = '';
    novaData.min   = hoje();
    document.getElementById('reativar-error').style.display = 'none';
    abrirModal('modal-reativar');
  }
}

// Modal excluir
document.getElementById('btn-cancel-delete').addEventListener('click',  () => fecharModal('modal-delete'));
document.getElementById('modal-delete').addEventListener('click', e => {
  if (e.target === e.currentTarget) fecharModal('modal-delete');
});

document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  try {
    await excluirPromo(pendingDeleteId);
    fecharModal('modal-delete');
    await carregarPromos();
  } catch {
    fecharModal('modal-delete');
  }
  pendingDeleteId = null;
});

// Modal reativar
document.getElementById('btn-cancel-reativar').addEventListener('click', () => fecharModal('modal-reativar'));
document.getElementById('modal-reativar').addEventListener('click', e => {
  if (e.target === e.currentTarget) fecharModal('modal-reativar');
});

document.getElementById('btn-confirm-reativar').addEventListener('click', async () => {
  const novaData  = document.getElementById('nova-data-validade').value;
  const errorEl   = document.getElementById('reativar-error');

  if (!novaData) {
    errorEl.textContent = 'Escolha uma nova data de validade.';
    errorEl.style.display = 'block';
    return;
  }
  if (novaData < hoje()) {
    errorEl.textContent = 'A data deve ser hoje ou no futuro.';
    errorEl.style.display = 'block';
    return;
  }

  try {
    await reativarPromo(pendingReativarId, novaData);
    fecharModal('modal-reativar');
    await carregarPromos();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  }
  pendingReativarId = null;
});

// ── Init ────────────────────────────────────────────────────
carregarPromos();
