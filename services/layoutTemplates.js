// Templates profissionais de story — estrutura fixa, conteúdo dinâmico

function formatarPreco(valor) {
  if (!valor) return ''
  return Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

function formatarData(data) {
  if (!data) return ''
  const d = new Date(data + 'T12:00:00')
  return d.toLocaleDateString('pt-BR')
}

function formatarTelefone(tel) {
  if (!tel) return ''
  const d = tel.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return tel
}

function whatsappBloco(loja, { top } = {}) {
  if (!loja.telefone) return []
  const tel = formatarTelefone(loja.telefone)
  return [
    { type: 'rect', left: 60, top, width: 960, height: 80, fill: '#25D366', rx: 40, ry: 40 },
    { type: 'circle', left: 80, top: top + 10, radius: 30, fill: 'rgba(255,255,255,0.25)' },
    { type: 'textbox', left: 80, top: top + 14, width: 60, text: '📞', fontSize: 36, fontFamily: 'Arial', textAlign: 'center', fill: '#ffffff' },
    { type: 'textbox', left: 150, top: top + 16, width: 840, text: tel, fontSize: 46, fontWeight: 'bold', fontFamily: 'Arial', fill: '#ffffff', textAlign: 'center' },
  ]
}

// ─────────────────────────────────────────────────────────────
// Template 1 — Clássico (produto em card, fundo da marca)
// Inspirado no Tubo Oeste: limpo, hierarquia clara
// ─────────────────────────────────────────────────────────────
function templateClassico({ promocao, loja }) {
  const bg     = loja.cor_primaria   || '#cc0000'
  const accent = loja.cor_secundaria || '#FFD700'
  const o = []

  // Fundo
  o.push({ type: 'rect', left: 0, top: 0, width: 1080, height: 1920, fill: bg, selectable: false })
  // Decoração geométrica sutil
  o.push({ type: 'rect', left: -150, top: 200, width: 700, height: 700, fill: 'rgba(255,255,255,0.04)', angle: 30, selectable: false })
  o.push({ type: 'rect', left: 500, top: -150, width: 600, height: 600, fill: 'rgba(255,255,255,0.04)', angle: 30, selectable: false })

  // Logo — direto no fundo, sem caixa branca
  if (loja.logo_url) {
    o.push({ type: 'image', src: loja.logo_url, left: 390, top: 55, width: 300, height: 140, crossOrigin: 'anonymous', name: 'logo' })
  }

  // Badge OFERTA
  o.push({ type: 'rect', left: 290, top: 244, width: 500, height: 90, fill: accent, rx: 45, ry: 45 })
  o.push({ type: 'textbox', left: 290, top: 258, width: 500, text: 'OFERTA', fontSize: 52, fontWeight: 'bold', fontFamily: 'Arial', fill: bg, textAlign: 'center', charSpacing: 200 })

  // Card produto — frame colorido + branco interno (shadow via frame)
  o.push({ type: 'rect', left: 55,  top: 375, width: 970, height: 810, fill: bg,       rx: 26, ry: 26 })
  o.push({ type: 'rect', left: 72,  top: 392, width: 936, height: 776, fill: '#ffffff', rx: 20, ry: 20 })
  if (promocao.imagem_url) {
    o.push({ type: 'image', src: promocao.imagem_url, left: 136, top: 412, width: 808, height: 736, crossOrigin: 'anonymous', name: 'produto' })
  }

  // Nome — maiúsculo, branco, bold
  o.push({
    type: 'textbox', left: 60, top: 1228, width: 960,
    text: (promocao.titulo || 'Produto').toUpperCase(),
    fontSize: 76, fontWeight: 'bold', fontFamily: 'Arial',
    fill: '#ffffff', textAlign: 'center', lineHeight: 1.05,
  })

  // Preço de (riscado)
  if (promocao.preco_de) {
    o.push({ type: 'textbox', left: 60, top: 1398, width: 960, text: `De: R$ ${formatarPreco(promocao.preco_de)}`, fontSize: 46, fontFamily: 'Arial', fill: 'rgba(255,255,255,0.55)', textAlign: 'center' })
    o.push({ type: 'line', x1: 272, y1: 1426, x2: 808, y2: 1426, stroke: 'rgba(255,255,255,0.55)', strokeWidth: 3 })
  }

  // POR + preço grande
  const yPreco = promocao.preco_de ? 1458 : 1418
  o.push({ type: 'textbox', left: 60, top: yPreco, width: 290, text: 'POR', fontSize: 70, fontWeight: 'bold', fontFamily: 'Arial', fill: accent, textAlign: 'right' })
  if (promocao.preco_por) {
    o.push({ type: 'textbox', left: 360, top: yPreco - 18, width: 680, text: `R$ ${formatarPreco(promocao.preco_por)}`, fontSize: 128, fontWeight: 'bold', fontFamily: 'Arial', fill: '#ffffff', textAlign: 'left', lineHeight: 1 })
  }

  // Condições
  if (promocao.condicoes) {
    o.push({ type: 'textbox', left: 60, top: 1614, width: 960, text: promocao.condicoes, fontSize: 38, fontFamily: 'Arial', fill: 'rgba(255,255,255,0.8)', textAlign: 'center' })
  }

  // Validade
  if (promocao.data_validade) {
    const yVal = promocao.condicoes ? 1660 : 1620
    o.push({ type: 'rect', left: 215, top: yVal, width: 650, height: 70, fill: 'transparent', stroke: 'rgba(255,255,255,0.35)', strokeWidth: 2, rx: 35, ry: 35 })
    o.push({ type: 'textbox', left: 215, top: yVal + 14, width: 650, text: `Válido até ${formatarData(promocao.data_validade)}`, fontSize: 38, fontFamily: 'Arial', fill: 'rgba(255,255,255,0.7)', textAlign: 'center' })
  }

  o.push(...whatsappBloco(loja, { top: 1762 }))
  return { version: '5.3.0', objects: o }
}

// ─────────────────────────────────────────────────────────────
// Template 2 — Dark (fundo quase preto, acento neon)
// ─────────────────────────────────────────────────────────────
function templateDark({ promocao, loja }) {
  const accent = loja.cor_primaria || '#e63946'
  const o = []

  o.push({ type: 'rect', left: 0, top: 0, width: 1080, height: 1920, fill: '#080808' })
  // Barra colorida topo + esquerda
  o.push({ type: 'rect', left: 0, top: 0, width: 1080, height: 8, fill: accent })
  o.push({ type: 'rect', left: 0, top: 0, width: 10, height: 1920, fill: accent })

  // Logo
  if (loja.logo_url) {
    o.push({ type: 'image', src: loja.logo_url, left: 390, top: 65, width: 300, height: 140, crossOrigin: 'anonymous', name: 'logo' })
  }

  // Produto — grande, sem card
  if (promocao.imagem_url) {
    o.push({ type: 'image', src: promocao.imagem_url, left: 90, top: 280, width: 900, height: 820, crossOrigin: 'anonymous', name: 'produto' })
  }

  // Linha colorida como divisor
  o.push({ type: 'rect', left: 60, top: 1140, width: 120, height: 8, fill: accent, rx: 4, ry: 4 })

  // Nome
  o.push({
    type: 'textbox', left: 60, top: 1168, width: 960,
    text: (promocao.titulo || 'Produto').toUpperCase(),
    fontSize: 80, fontWeight: 'bold', fontFamily: 'Arial',
    fill: '#ffffff', textAlign: 'left', lineHeight: 1.05,
  })

  // Preço de
  if (promocao.preco_de) {
    o.push({ type: 'textbox', left: 60, top: 1358, width: 600, text: `De: R$ ${formatarPreco(promocao.preco_de)}`, fontSize: 46, fontFamily: 'Arial', fill: 'rgba(255,255,255,0.4)', textAlign: 'left' })
    o.push({ type: 'line', x1: 60, y1: 1386, x2: 440, y2: 1386, stroke: 'rgba(255,255,255,0.4)', strokeWidth: 3 })
  }

  // Preço por
  if (promocao.preco_por) {
    o.push({
      type: 'textbox', left: 60, top: 1398, width: 960,
      text: `R$ ${formatarPreco(promocao.preco_por)}`,
      fontSize: 148, fontWeight: 'bold', fontFamily: 'Arial',
      fill: '#FFD700', textAlign: 'left', lineHeight: 1,
    })
  }

  // Condições
  if (promocao.condicoes) {
    o.push({ type: 'textbox', left: 60, top: 1600, width: 700, text: promocao.condicoes, fontSize: 38, fontFamily: 'Arial', fill: 'rgba(255,255,255,0.65)', textAlign: 'left' })
  }

  o.push(...whatsappBloco(loja, { top: 1762 }))
  return { version: '5.3.0', objects: o }
}

// ─────────────────────────────────────────────────────────────
// Template 3 — Minimalista (fundo claro, bloco de preço colorido)
// ─────────────────────────────────────────────────────────────
function templateMinimalista({ promocao, loja }) {
  const accent = loja.cor_primaria || '#1a73e8'
  const o = []

  o.push({ type: 'rect', left: 0, top: 0, width: 1080, height: 1920, fill: '#f4f5f9' })
  // Banner de cor no topo
  o.push({ type: 'rect', left: 0, top: 0, width: 1080, height: 210, fill: accent })

  // Logo sobre o banner
  if (loja.logo_url) {
    o.push({ type: 'image', src: loja.logo_url, left: 390, top: 34, width: 300, height: 142, crossOrigin: 'anonymous', name: 'logo' })
  }

  // Card produto branco
  o.push({ type: 'rect', left: 60, top: 230, width: 960, height: 840, fill: '#ffffff', rx: 24, ry: 24 })
  if (promocao.imagem_url) {
    o.push({ type: 'image', src: promocao.imagem_url, left: 130, top: 256, width: 820, height: 808, crossOrigin: 'anonymous', name: 'produto' })
  }

  // Nome
  o.push({
    type: 'textbox', left: 60, top: 1108, width: 960,
    text: promocao.titulo || 'Produto',
    fontSize: 80, fontWeight: 'bold', fontFamily: 'Arial',
    fill: '#1a1a2e', textAlign: 'center', lineHeight: 1.05,
  })

  // Bloco de preço colorido
  o.push({ type: 'rect', left: 60, top: 1248, width: 960, height: 340, fill: accent, rx: 24, ry: 24 })

  if (promocao.preco_de) {
    o.push({ type: 'textbox', left: 60, top: 1264, width: 960, text: `De: R$ ${formatarPreco(promocao.preco_de)}`, fontSize: 44, fontFamily: 'Arial', fill: 'rgba(255,255,255,0.6)', textAlign: 'center' })
    o.push({ type: 'line', x1: 282, y1: 1293, x2: 798, y2: 1293, stroke: 'rgba(255,255,255,0.6)', strokeWidth: 3 })
  }

  if (promocao.preco_por) {
    o.push({
      type: 'textbox', left: 60, top: 1306, width: 960,
      text: `R$ ${formatarPreco(promocao.preco_por)}`,
      fontSize: 138, fontWeight: 'bold', fontFamily: 'Arial',
      fill: '#ffffff', textAlign: 'center', lineHeight: 1,
    })
  }

  // Condições
  if (promocao.condicoes) {
    o.push({ type: 'textbox', left: 60, top: 1614, width: 960, text: promocao.condicoes, fontSize: 38, fontFamily: 'Arial', fill: '#555', textAlign: 'center' })
  }

  // Validade
  if (promocao.data_validade) {
    const yVal = promocao.condicoes ? 1660 : 1620
    o.push({ type: 'rect', left: 215, top: yVal, width: 650, height: 70, fill: 'transparent', stroke: '#ccc', strokeWidth: 2, rx: 35, ry: 35 })
    o.push({ type: 'textbox', left: 215, top: yVal + 14, width: 650, text: `Válido até ${formatarData(promocao.data_validade)}`, fontSize: 38, fontFamily: 'Arial', fill: '#777', textAlign: 'center' })
  }

  o.push(...whatsappBloco(loja, { top: 1762 }))
  return { version: '5.3.0', objects: o }
}

// ─────────────────────────────────────────────────────────────
// Template 4 — Imersivo (foto full-bleed + overlay + card frosted)
// Inspirado em agências de viagem tipo Trippin Club
// Usa imagem_fundo_url da loja (ou imagem_url do produto como fundo)
// ─────────────────────────────────────────────────────────────
function templateImersivo({ promocao, loja }) {
  const accent = loja.cor_primaria || '#E8734A'
  const o = []
  const bgUrl = loja.imagem_fundo_url || promocao.imagem_url

  // Fundo — imagem full canvas
  if (bgUrl) {
    o.push({ type: 'image', src: bgUrl, left: 0, top: 0, width: 1080, height: 1920, crossOrigin: 'anonymous', name: 'bg' })
  } else {
    o.push({ type: 'rect', left: 0, top: 0, width: 1080, height: 1920, fill: '#1a1a2e' })
  }

  // Overlays escuros (simula gradiente top→bottom)
  o.push({ type: 'rect', left: 0, top: 0,   width: 1080, height: 1920, fill: 'rgba(0,0,0,0.20)' })
  o.push({ type: 'rect', left: 0, top: 740,  width: 1080, height: 1180, fill: 'rgba(0,0,0,0.52)' })

  // Logo — oval branco canto superior direito
  if (loja.logo_url) {
    o.push({ type: 'rect', left: 800, top: 48, width: 240, height: 134, fill: '#ffffff', rx: 67, ry: 67 })
    o.push({ type: 'image', src: loja.logo_url, left: 820, top: 64, width: 200, height: 102, crossOrigin: 'anonymous', name: 'logo' })
  }

  // Título GRANDE diretamente sobre a imagem
  const titulo = (promocao.titulo || 'Destaque').toUpperCase()
  const fontSz = titulo.length > 14 ? 96 : titulo.length > 8 ? 126 : 158
  o.push({
    type: 'textbox', left: 60, top: 545, width: 720,
    text: titulo,
    fontSize: fontSz, fontWeight: 'bold', fontFamily: 'Arial',
    fill: '#ffffff', textAlign: 'left', lineHeight: 0.9,
  })

  // Sublinhado decorativo
  o.push({ type: 'rect', left: 60, top: 755, width: 160, height: 7, fill: '#ffffff', rx: 3, ry: 3 })

  // Badge
  o.push({ type: 'rect', left: 60, top: 808, width: 370, height: 72, fill: accent, rx: 14, ry: 14 })
  o.push({ type: 'textbox', left: 60, top: 822, width: 370, text: 'OFERTA ESPECIAL', fontSize: 34, fontWeight: 'bold', fontFamily: 'Arial', fill: '#ffffff', textAlign: 'center' })

  // Card frosted — descrição / serviços
  o.push({ type: 'rect', left: 40, top: 930, width: 1000, height: 450, fill: 'rgba(8,8,8,0.65)', rx: 22, ry: 22 })

  if (promocao.descricao) {
    const items = promocao.descricao.split(/[,\n]/).map(s => s.trim()).filter(Boolean).slice(0, 6)
    items.forEach((item, i) => {
      o.push({
        type: 'textbox', left: 70, top: 952 + i * 68, width: 940,
        text: `• ${item}`,
        fontSize: 40, fontFamily: 'Arial', fontWeight: 'bold',
        fill: '#ffffff', textAlign: 'left',
      })
    })
  }

  // Card de preço
  o.push({ type: 'rect', left: 40, top: 1420, width: 1000, height: 230, fill: 'rgba(8,8,8,0.70)', rx: 18, ry: 18 })

  // Esquerda: condições / validade
  const infoEsq = promocao.condicoes || (promocao.data_validade ? `Válido até ${formatarData(promocao.data_validade)}` : '')
  if (infoEsq) {
    o.push({ type: 'textbox', left: 62, top: 1434, width: 490, text: infoEsq, fontSize: 36, fontFamily: 'Arial', fontWeight: 'bold', fill: 'rgba(255,255,255,0.85)', textAlign: 'left', lineHeight: 1.2 })
  }

  // Direita: preço
  if (promocao.preco_de) {
    o.push({ type: 'textbox', left: 550, top: 1434, width: 470, text: `De R$ ${formatarPreco(promocao.preco_de)}`, fontSize: 32, fontFamily: 'Arial', fill: 'rgba(255,255,255,0.5)', textAlign: 'right' })
    o.push({ type: 'line', x1: 552, y1: 1462, x2: 1018, y2: 1462, stroke: 'rgba(255,255,255,0.5)', strokeWidth: 2 })
  }
  if (promocao.preco_por) {
    o.push({
      type: 'textbox', left: 550, top: 1465, width: 470,
      text: `R$ ${formatarPreco(promocao.preco_por)}`,
      fontSize: 100, fontWeight: 'bold', fontFamily: 'Arial',
      fill: '#ffffff', textAlign: 'right', lineHeight: 1,
    })
  }

  o.push(...whatsappBloco(loja, { top: 1692 }))
  return { version: '5.3.0', objects: o }
}

const TEMPLATES = {
  classico:   templateClassico,
  dark:       templateDark,
  minimalista: templateMinimalista,
  imersivo:   templateImersivo,
}

function gerarPorTemplate(nome, dados) {
  const fn = TEMPLATES[nome] || templateClassico
  return fn(dados)
}

module.exports = { gerarPorTemplate, TEMPLATES }
