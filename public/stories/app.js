/* ============================================================
   Tubo Oeste — Stories Export
   Gera PNGs 1080×1920 para Instagram Stories
============================================================ */

const WPP_NUM    = '(49) 98409-7960';
const WPP_ICON   = `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15
           -.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475
           -.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52
           .149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207
           -.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372
           -.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096
           3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118
           .571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.119.554 4.107 1.523 5.83L.057 23.25
           a.75.75 0 0 0 .916.932l5.656-1.476A11.943 11.943 0 0 0 12 24c6.627 0
           12-5.373 12-12S18.627 0 12 0zm0 22c-1.88 0-3.638-.5-5.153-1.374l-.36-.213
           -3.762.982.999-3.651-.234-.374A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12
           2s10 4.477 10 10-4.477 10-10 10z"/>
</svg>`;

function formatBRL(v) {
  return parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `Válido até ${d}/${m}/${y}`;
}

function isBanner(p)  { return !p.imagem && !p.preco_por; }
function temImagem(p) { return !!p.imagem; }

/* ── Monta HTML do slide 1080×1920 ───────────────────────── */
function buildSlide(p) {
  const slide = document.createElement('div');
  slide.className = 'story-slide';

  // Badge
  const badge = isBanner(p) ? 'NOVIDADE' : 'OFERTA';

  // Imagem
  let imgHTML = '';
  if (temImagem(p)) {
    imgHTML = `
      <div class="sl-img-wrap">
        <img class="sl-img" src="/uploads/${p.imagem}" alt="${p.titulo}" crossorigin="anonymous">
      </div>`;
  }

  // Preço
  let precoHTML = '';
  if (p.preco_por) {
    const deHTML = p.preco_de
      ? `<span class="sl-de">De: ${formatBRL(p.preco_de)}</span>` : '';
    precoHTML = `
      <div class="sl-preco-wrap">
        ${deHTML}
        <div class="sl-por-row">
          <span class="sl-por-label">Por</span>
          <span class="sl-por">${formatBRL(p.preco_por)}</span>
        </div>
      </div>`;
  }

  // Descrição (banners)
  const descHTML = (isBanner(p) && p.descricao)
    ? `<p class="sl-descricao">${p.descricao}</p>` : '';

  const tituloClass = !temImagem(p) ? 'sl-titulo sem-img' : 'sl-titulo';

  slide.innerHTML = `
    <div class="sl-header">
      <img class="sl-logo" src="/logo.png" alt="Tubo Oeste" crossorigin="anonymous">
    </div>

    <div class="sl-body">
      <span class="sl-badge">${badge}</span>
      ${imgHTML}
      <h1 class="${tituloClass}">${p.titulo}</h1>
      ${precoHTML}
      ${descHTML}
      <p class="sl-validade">${formatDate(p.data_validade)}</p>
    </div>

    <footer class="sl-footer">
      <div class="sl-wpp-icon">${WPP_ICON}</div>
      <div class="sl-wpp-info">
        <span class="sl-wpp-num">${WPP_NUM}</span>
      </div>
    </footer>
  `;

  return slide;
}

/* ── Captura um slide como PNG ───────────────────────────── */
async function captureSlide(slide) {
  // Clona sem transform para captura em resolução real (1080×1920)
  const clone = slide.cloneNode(true);
  clone.style.cssText = [
    'position:fixed',
    'top:-9999px',
    'left:-9999px',
    'width:1080px',
    'height:1920px',
    'transform:none',
    'z-index:-1',
    'overflow:hidden',
  ].join(';');
  document.body.appendChild(clone);

  try {
    const canvas = await html2canvas(clone, {
      width:  1080,
      height: 1920,
      scale:  1,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: '#8b0000',
    });
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  } finally {
    document.body.removeChild(clone);
  }
}

/* ── Sanitiza nome de arquivo ────────────────────────────── */
function slugify(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 40);
}

/* ── Download individual ─────────────────────────────────── */
async function downloadSlide(slide, titulo, btn) {
  btn.disabled = true;
  btn.textContent = 'Gerando…';
  try {
    const blob = await captureSlide(slide);
    saveAs(blob, `story_${slugify(titulo)}.png`);
  } finally {
    btn.disabled = false;
    btn.textContent = '⬇ Baixar PNG';
  }
}

/* ── Download todos em ZIP ───────────────────────────────── */
async function downloadAll(cards, promos) {
  const btn = document.getElementById('btn-zip');
  btn.disabled = true;
  btn.textContent = 'Gerando ZIP…';

  const zip = new JSZip();
  for (let i = 0; i < cards.length; i++) {
    const { slide, promo } = cards[i];
    btn.textContent = `Gerando ${i + 1}/${cards.length}…`;
    const blob = await captureSlide(slide);
    zip.file(`story_${String(i + 1).padStart(2, '0')}_${slugify(promo.titulo)}.png`, blob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, 'stories_tuboOeste.zip');

  btn.disabled = false;
  btn.textContent = '⬇ Baixar todos (ZIP)';
}

/* ── Renderiza grid ──────────────────────────────────────── */
function renderGrid(promos) {
  const grid    = document.getElementById('grid');
  const emptyEl = document.getElementById('empty-msg');
  const zipBtn  = document.getElementById('btn-zip');

  if (promos.length === 0) {
    emptyEl.style.display = 'block';
    return;
  }

  zipBtn.style.display = 'inline-block';
  const cards = [];

  promos.forEach(p => {
    const card  = document.createElement('div');
    card.className = 'story-card';

    const wrap  = document.createElement('div');
    wrap.className = 'story-wrap';

    const slide = buildSlide(p);
    wrap.appendChild(slide);

    const label = document.createElement('p');
    label.className = 'story-card-label';
    label.textContent = p.titulo;

    const btn = document.createElement('button');
    btn.className = 'btn-download';
    btn.textContent = '⬇ Baixar PNG';
    btn.addEventListener('click', () => downloadSlide(slide, p.titulo, btn));

    card.appendChild(wrap);
    card.appendChild(label);
    card.appendChild(btn);
    grid.appendChild(card);

    cards.push({ slide, promo: p });
  });

  document.getElementById('btn-zip').addEventListener('click', () => downloadAll(cards, promos));
}

/* ── Init ─────────────────────────────────────────────────── */
fetch('/api/promocoes/ativas')
  .then(r => r.json())
  .then(renderGrid)
  .catch(() => {
    document.getElementById('empty-msg').textContent = 'Erro ao carregar promoções.';
    document.getElementById('empty-msg').style.display = 'block';
  });
