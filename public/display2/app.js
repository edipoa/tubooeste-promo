/* ============================================================
   Tubo Oeste — Display TV v2  (estilo propaganda)
   Promoções do banco · Polling 30s · Carrossel 8s
============================================================ */

const SLIDE_DURATION = 8000;
const POLL_INTERVAL  = 30000;

let promos       = [];
let currentIndex = 0;
let slideTimer   = null;

/* ── DOM refs ─────────────────────────────────────────────── */
const elFallback  = document.getElementById('slide-fallback');
const elFooter    = document.getElementById('slide-footer');
const elDots      = document.getElementById('dots');
const elProgress  = document.getElementById('progress-bar');

// slide produto
const elProduto     = document.getElementById('slide-produto');
const elProdImg     = document.getElementById('prod-img');
const elProdTitulo  = document.getElementById('prod-titulo');
const elProdDe      = document.getElementById('prod-de');
const elProdPor     = document.getElementById('prod-por');
const elPrecoWrap   = document.getElementById('preco-wrap');
const elProdDesc    = document.getElementById('prod-desc');
const elProdVal     = document.getElementById('prod-validade');

// slide preço grande (produto sem imagem)
const elSPreco      = document.getElementById('slide-preco');
const elSpTitulo    = document.getElementById('spreco-titulo');
const elSpDe        = document.getElementById('spreco-de');
const elSpPor       = document.getElementById('spreco-por');
const elSpPrecoWrap = document.getElementById('spreco-preco-wrap');
const elSpDesc      = document.getElementById('spreco-desc');
const elSpVal       = document.getElementById('spreco-validade');

// slide banner
const elBanner      = document.getElementById('slide-banner');
const elBannerTit   = document.getElementById('banner-titulo');
const elBannerDesc  = document.getElementById('banner-desc');
const elBannerVal   = document.getElementById('banner-validade');

/* ── Utilitários ──────────────────────────────────────────── */
function formatBRL(v) {
  return parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `Válido até ${d}/${m}/${y}`;
}

function hideAll() {
  elProduto.classList.remove('active');
  elSPreco.classList.remove('active');
  elBanner.classList.remove('active');
  elFallback.classList.remove('active');
}

/* ── Tipo de slide ────────────────────────────────────────── */
function isBanner(p)  { return !p.imagem && !p.preco_por; }
function temImagem(p) { return !!p.imagem; }

/* ── Renderiza slide ──────────────────────────────────────── */
function showSlide(idx) {
  const p = promos[idx];
  hideAll();

  if (isBanner(p)) {
    // ── Banner texto ──────────────────────────────────────
    elBannerTit.textContent  = p.titulo;
    elBannerDesc.textContent = p.descricao || '';
    elBannerDesc.style.display = p.descricao ? '' : 'none';
    elBannerVal.textContent  = formatDate(p.data_validade);
    requestAnimationFrame(() => elBanner.classList.add('active'));

  } else if (temImagem(p)) {
    // ── Produto com imagem ────────────────────────────────
    elProdImg.src      = `/uploads/${p.imagem}`;
    elProdImg.alt      = p.titulo;
    elProdTitulo.textContent = p.titulo;

    if (p.preco_por) {
      elPrecoWrap.style.display = '';
      elProdPor.textContent = formatBRL(p.preco_por);
      if (p.preco_de) {
        elProdDe.textContent = formatBRL(p.preco_de);
        elProdDe.parentElement.style.display = '';
      } else {
        elProdDe.parentElement.style.display = 'none';
      }
    } else {
      elPrecoWrap.style.display = 'none';
    }

    elProdDesc.textContent = p.descricao || '';
    elProdDesc.style.display = p.descricao ? '' : 'none';
    elProdVal.textContent = formatDate(p.data_validade);
    requestAnimationFrame(() => elProduto.classList.add('active'));

  } else {
    // ── Preço grande (sem imagem, com preço) ─────────────
    elSpTitulo.textContent = p.titulo;

    if (p.preco_por) {
      elSpPrecoWrap.style.display = '';
      elSpPor.textContent = formatBRL(p.preco_por);
      if (p.preco_de) {
        elSpDe.textContent = formatBRL(p.preco_de);
        elSpDe.parentElement.style.display = '';
      } else {
        elSpDe.parentElement.style.display = 'none';
      }
    } else {
      elSpPrecoWrap.style.display = 'none';
    }

    elSpDesc.textContent = p.descricao || '';
    elSpDesc.style.display = p.descricao ? '' : 'none';
    elSpVal.textContent = formatDate(p.data_validade);
    requestAnimationFrame(() => elSPreco.classList.add('active'));
  }

  // Dots
  elDots.querySelectorAll('.dot').forEach((d, i) => {
    d.classList.toggle('active', i === idx);
  });
}

/* ── Progress bar ─────────────────────────────────────────── */
function startProgress() {
  elProgress.style.transition = 'none';
  elProgress.style.width = '0%';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    elProgress.style.transition = `width ${SLIDE_DURATION}ms linear`;
    elProgress.style.width = '100%';
  }));
}

/* ── Dots ─────────────────────────────────────────────────── */
function buildDots() {
  elDots.innerHTML = '';
  promos.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'dot' + (i === 0 ? ' active' : '');
    elDots.appendChild(d);
  });
}

/* ── Carrossel ────────────────────────────────────────────── */
function nextSlide() {
  currentIndex = (currentIndex + 1) % promos.length;
  showSlide(currentIndex);
  startProgress();
}

function startCarrossel() {
  clearInterval(slideTimer);

  if (promos.length === 0) {
    hideAll();
    elFallback.classList.add('active');
    elFooter.style.display = 'none';
    return;
  }

  elFooter.style.display = '';
  buildDots();
  currentIndex = 0;
  showSlide(0);
  startProgress();
  slideTimer = setInterval(nextSlide, SLIDE_DURATION);
}

/* ── API polling ──────────────────────────────────────────── */
async function buscarAtivas() {
  try {
    const res  = await fetch('/api/promocoes/ativas');
    const data = await res.json();

    const antesIds  = promos.map(p => p.id).join(',');
    const depoisIds = data.map(p => p.id).join(',');

    if (antesIds !== depoisIds || promos.length === 0) {
      promos = data;
      startCarrossel();
    } else {
      promos = data; // atualiza dados sem reiniciar
    }
  } catch (err) {
    console.error('[Display2] Erro ao buscar promoções:', err);
  }
}

/* ── Init ─────────────────────────────────────────────────── */
buscarAtivas();
setInterval(buscarAtivas, POLL_INTERVAL);
