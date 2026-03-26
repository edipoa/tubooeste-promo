/* ============================================================
   Tubo Oeste — Display TV
   Carrossel automático · Polling a cada 30s
============================================================ */

const SLIDE_DURATION  = 8000;   // ms por slide
const POLL_INTERVAL   = 30000;  // ms entre atualizações da API
const TRANSITION_TIME = 700;    // ms da transição CSS

let promos       = [];
let currentIndex = 0;
let slideTimer   = null;
let progressTimer = null;
let progressStart = null;

// ── Elementos ──────────────────────────────────────────────
const elProduto   = document.getElementById('slide-produto');
const elBanner    = document.getElementById('slide-banner');
const elFallback  = document.getElementById('slide-fallback');
const elFooter    = document.getElementById('slide-footer');
const elDots      = document.getElementById('dots');
const elProgress  = document.getElementById('progress-bar');

// produto
const elProdImg      = document.getElementById('prod-img');
const elProdTitulo   = document.getElementById('prod-titulo');
const elProdDe       = document.getElementById('prod-de');
const elProdPor      = document.getElementById('prod-por');
const elProdPrecoW   = document.getElementById('prod-preco-wrap');
const elProdValidade = document.getElementById('prod-validade');

// banner
const elBannerTitulo    = document.getElementById('banner-titulo');
const elBannerDescricao = document.getElementById('banner-descricao');
const elBannerValidade  = document.getElementById('banner-validade');

// ── Formatação ─────────────────────────────────────────────
function formatBRL(v) {
  return parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ── Renderiza slide ─────────────────────────────────────────
function isBanner(p) {
  return !p.imagem && !p.preco_de && !p.preco_por;
}

function showSlide(index) {
  const p = promos[index];

  // esconde todos
  elProduto.classList.remove('active');
  elBanner.classList.remove('active');
  elFallback.classList.remove('active');

  if (isBanner(p)) {
    // Banner texto livre
    elBannerTitulo.textContent = p.titulo;
    if (p.descricao) {
      elBannerDescricao.textContent = p.descricao;
      elBannerDescricao.style.display = '';
    } else {
      elBannerDescricao.style.display = 'none';
    }
    elBannerValidade.textContent = `Válido até ${formatDate(p.data_validade)}`;
    requestAnimationFrame(() => elBanner.classList.add('active'));
  } else {
    // Slide produto
    if (p.imagem) {
      elProdImg.src = `/uploads/${p.imagem}`;
      elProdImg.alt = p.titulo;
      elProdImg.parentElement.style.display = '';
    } else {
      elProdImg.parentElement.style.display = 'none';
    }

    elProdTitulo.textContent = p.titulo;

    if (p.preco_por) {
      elProdPrecoW.style.display = '';
      elProdPor.textContent = formatBRL(p.preco_por);
      if (p.preco_de) {
        elProdDe.textContent = `De: ${formatBRL(p.preco_de)}`;
        elProdDe.style.display = '';
      } else {
        elProdDe.style.display = 'none';
      }
    } else {
      elProdPrecoW.style.display = 'none';
    }

    elProdValidade.textContent = `Válido até ${formatDate(p.data_validade)}`;
    requestAnimationFrame(() => elProduto.classList.add('active'));
  }

  // Dots
  document.querySelectorAll('.dot').forEach((d, i) => {
    d.classList.toggle('active', i === index);
  });
}

function showFallback() {
  elProduto.classList.remove('active');
  elBanner.classList.remove('active');
  requestAnimationFrame(() => elFallback.classList.add('active'));
  elFooter.style.display = 'none';
}

// ── Build dots ──────────────────────────────────────────────
function buildDots() {
  elDots.innerHTML = '';
  promos.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'dot' + (i === 0 ? ' active' : '');
    elDots.appendChild(d);
  });
}

// ── Progress bar ────────────────────────────────────────────
function startProgress() {
  elProgress.style.transition = 'none';
  elProgress.style.width = '0%';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      elProgress.style.transition = `width ${SLIDE_DURATION}ms linear`;
      elProgress.style.width = '100%';
    });
  });
}

// ── Carrossel ───────────────────────────────────────────────
function nextSlide() {
  if (promos.length === 0) return;
  currentIndex = (currentIndex + 1) % promos.length;
  showSlide(currentIndex);
  startProgress();
}

function startCarrossel() {
  if (slideTimer) clearInterval(slideTimer);
  if (promos.length === 0) {
    showFallback();
    return;
  }

  elFooter.style.display = '';
  buildDots();
  currentIndex = 0;
  showSlide(0);
  startProgress();
  slideTimer = setInterval(nextSlide, SLIDE_DURATION);
}

// ── API ─────────────────────────────────────────────────────
async function buscarAtivas() {
  try {
    const res  = await fetch('/api/promocoes/ativas');
    const data = await res.json();

    const antes = JSON.stringify(promos.map(p => p.id));
    const depois = JSON.stringify(data.map(p => p.id));

    // Só reinicia carrossel se a lista mudou
    if (antes !== depois || promos.length === 0) {
      promos = data;
      startCarrossel();
    } else {
      // Atualiza dados sem reiniciar (ex: preço pode ter mudado)
      promos = data;
    }
  } catch (err) {
    console.error('[Display] Erro ao buscar promoções:', err);
  }
}

// ── Init ────────────────────────────────────────────────────
buscarAtivas();
setInterval(buscarAtivas, POLL_INTERVAL);
