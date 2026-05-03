const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');

let genAI;
let groqClient;

function getGemini() {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
}

function getGroq() {
  if (!groqClient) groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groqClient;
}

const SYSTEM_PROMPT = `És um Diretor de Arte Sénior e Especialista em Fabric.js, focado na criação de Instagram Stories de alta conversão para QUALQUER tipo de negócio (Retalho, Serviços, Turismo, Restauração).
A tua tarefa é gerar um layout PROFISSIONAL e IMPACTANTE, retornando EXCLUSIVAMENTE um JSON válido do Fabric.js.

REGRAS TÉCNICAS E DE SAÍDA (CRÍTICAS):
- Canvas: 1080x1920 pixels.
- Retorna APENAS um JSON válido. Sem markdown, sem introduções.
- Estrutura obrigatória: { "version": "5.3.0", "objects": [...] }
- Propriedades permitidas:
  - rect: type, left, top, width, height, fill, rx, ry, opacity, angle
  - textbox: type, left, top, width, text, fontSize, fontWeight, fontFamily, fill, textAlign, lineHeight
  - image: type, left, top, width, height, src, crossOrigin ("anonymous")

DIRETRIZES DE DESIGN ADAPTATIVO (ESCOLHE O MELHOR ESTILO):

ESTILO 1: RETALHO/PRODUTO (Ex: Materiais, Eletrónica, Moda)
- Fundo: Usa um 'rect' de 1080x1920 com a cor primária da marca.
- Dinamismo: Adiciona 1 ou 2 'rects' grandes e angulados (angle: 15 ou -45) no fundo com a cor secundária ou opacidade baixa para criar geometria.
- Produto: Imagem grande e centralizada (width: 700-800).
- Preço/Badge: Cria um 'rect' vermelho ou chamativo (rx: 10), sobreposto à imagem ou na base, com o preço em tipografia gigante e bold.

ESTILO 2: IMERSIVO/SERVIÇOS (Ex: Turismo, Imobiliária, Eventos)
- Fundo: Usa uma 'image' (1080x1920) cobrindo todo o canvas.
- Glassmorphism (Cartão de Informação): Cria um 'rect' central ou inferior (ex: width: 960, rx: 30) com fill: "#000000" e opacity: 0.6. Coloca os textos descritivos, ícones (se houver) e preços SOBRE este retângulo para garantir legibilidade.
- Título: Tipografia gigante no topo (fontSize: 120-150), cor branca, com um pequeno 'rect' fino por baixo simulando sublinhado.

REGRAS UNIVERSAIS (PARA TODOS OS ESTILOS):
1. FÓRMULA DE CENTRALIZAÇÃO: Para centralizar no eixo X, usa: left = (1080 - width) / 2.
2. HIERARQUIA: Logo discreto no topo ou rodapé -> Título/Produto em destaque -> Informações/Preço -> Contacto (WhatsApp) no rodapé.
3. TIPOGRAFIA: Usa fontes de impacto como "Arial Black", "Impact", "Montserrat" ou "Helvetica". Títulos nunca inferiores a fontSize 80.
4. CONTRASTE: Texto branco sobre fundos escuros. Texto escuro sobre fundos muito claros. NUNCA sacrifiques a legibilidade.
5. RODAPÉ INSTITUCIONAL: Reserva a área inferior (top: 1750-1920) para os contactos da loja (Telefone/WhatsApp) e logo, usando um 'rect' de fundo para separar se necessário.

Analisa os dados fornecidos e constrói a melhor composição utilizando sobreposição de camadas (ordem do array). Retorna APENAS o JSON.`;

function buildUserPrompt(dados) {
  // Tornamos os campos genéricos para acomodar qualquer negócio
  return `Gera o JSON do story com os seguintes dados:
- Tipo de Negócio / Contexto: ${dados.tipo_negocio || 'Comércio Geral'}
- Imagem de Fundo (se aplicável ao Estilo 2): ${dados.imagem_fundo_url || ''}
- Imagem Principal/Produto: ${dados.imagem_principal_url || ''}
- Título/Nome: ${dados.titulo || 'Destaque'}
- Descrição/Tópicos: ${dados.descricao || ''}
- Preço Antigo: ${dados.preco_antigo ? 'R$ ' + dados.preco_antigo : ''}
- Preço Atual/Mensalidade: ${dados.preco_atual ? 'R$ ' + dados.preco_atual : ''}
- Condições (ex: 10x sem juros): ${dados.condicoes || ''}
- URL do Logo: ${dados.logo_url || ''}
- Telefone/Contacto: ${dados.contacto || ''}
- Cor Primária da Marca: ${dados.cor_primaria || '#CC0000'}
- Cor Secundária da Marca: ${dados.cor_secundaria || '#FFFFFF'}
- Instrução extra do cliente: ${dados.prompt_extra || 'Cria um design moderno, seguindo as diretrizes do teu sistema.'}`;
}


function evalMathExprs(str) {
  // Some models output arithmetic like "left": (1080 - 200) / 2 instead of computed values
  return str.replace(/:\s*(\([0-9\s+\-*/().]+\))/g, (match, expr) => {
    try {
      // eslint-disable-next-line no-new-func
      const val = Function(`"use strict";return(${expr})`)()
      return ': ' + Math.round(val)
    } catch { return match }
  })
}

function parseJson(text) {
  const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(evalMathExprs(clean));
}

// Tenta Gemini, cai para Groq se falhar
async function gerarLayout({ prompt, promocao, loja }) {
  const userPrompt = buildUserPrompt({
    tipo_negocio:      loja.tipo_negocio,
    imagem_fundo_url:  loja.imagem_fundo_url,
    imagem_principal_url: promocao.imagem_url,
    titulo:            promocao.titulo,
    descricao:         promocao.descricao,
    preco_antigo:      promocao.preco_de,
    preco_atual:       promocao.preco_por,
    condicoes:         promocao.condicoes,
    logo_url:          loja.logo_url,
    contacto:          loja.telefone,
    cor_primaria:      loja.cor_primaria,
    cor_secundaria:    loja.cor_secundaria,
    prompt_extra:      prompt,
  });

  // 1. Tenta Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const model = getGemini().getGenerativeModel({
        model: 'gemini-3-flash-preview',
        systemInstruction: SYSTEM_PROMPT,
      });
      const result = await model.generateContent(userPrompt);
      const text   = result.response.text().trim();
      console.log('[gemini] ✓ layout gerado');
      return parseJson(text);
    } catch (err) {
      console.warn('[gemini] falhou, tentando Groq:', err.message);
    }
  }

  // 2. Fallback: Groq (Llama)
  if (process.env.GROQ_API_KEY) {
    const completion = await getGroq().chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    });
    const text = completion.choices[0].message.content.trim();
    console.log('[groq] ✓ layout gerado');
    return parseJson(text);
  }

  throw new Error('Nenhuma API de IA configurada (GEMINI_API_KEY ou GROQ_API_KEY)');
}

// ─── HTML layout via IA ───────────────────────────────────────────────────────

const HTML_SYSTEM_PROMPT = `Você é um Designer Senior especializado em Instagram Stories de alta conversão para negócios brasileiros.
Sua tarefa é gerar um documento HTML COMPLETO e AUTOSSUFICIENTE representando um Instagram Story (1080×1920px).

REGRAS OBRIGATÓRIAS:
- Retorne APENAS o HTML completo — sem markdown, sem explicações, sem blocos de código.
- O HTML deve começar com <!DOCTYPE html> e terminar com </html>.
- Todo CSS deve ser inline (<style>) no <head>. Nenhum arquivo externo exceto Google Fonts.
- Dimensões: html e body devem ter exatamente width:1080px e height:1920px; overflow:hidden.
- Use Google Fonts via @import no CSS: fontes modernas como Inter, Poppins, Space Grotesk, DM Sans.
- As imagens fornecidas devem ser referenciadas pelo URL exato — nunca altere os URLs.
- Utilize background-image:url() em vez de <img> para imagens de fundo full-bleed (use background-size:cover).
- Use <img> com object-fit:contain para produto/logo. A imagem da logo DEVE ter class="logo" (ex: <img src="..." class="logo" alt="logo">).
- Design deve ser MODERNO: glassmorphism, gradientes, tipografia bold, espaçamento generoso.
- Não use JavaScript.
- Adapte o estilo ao tipo de negócio e ao pedido do cliente.

ESTILOS REFERÊNCIA (escolha o mais adequado ou misture):
1. Imersivo: foto de fundo full-bleed, gradientes escuros no topo/base, card frosted-glass com produto e preço
2. Clássico vibrante: fundo colorido sólido, formas decorativas, card branco com produto e preço
3. Dark premium: fundo #0a0a0f, grid sutil, glow neon, tipografia grande
4. Minimalista clean: fundo claro, linha de cor no topo, fontes finas, caixa de preço colorida`;

function buildHtmlUserPrompt(dados) {
  return `Gere o HTML do story com os dados abaixo:
- Tipo de negócio: ${dados.tipo_negocio || 'Comércio Geral'}
- Nome da loja: ${dados.nome_loja || ''}
- Logo URL: ${dados.logo_url || ''}
- Cor primária: ${dados.cor_primaria || '#e53e3e'}
- Cor secundária: ${dados.cor_secundaria || '#ffffff'}
- Imagem de fundo URL: ${dados.imagem_fundo_url || ''}
- Imagem do produto URL: ${dados.imagem_produto_url || ''}
- Título da promoção: ${dados.titulo || ''}
- Descrição: ${dados.descricao || ''}
- Preço antigo: ${dados.preco_de ? 'R$ ' + dados.preco_de : ''}
- Preço atual: ${dados.preco_por ? 'R$ ' + dados.preco_por : ''}
- Condições: ${dados.condicoes || ''}
- Telefone/WhatsApp: ${dados.telefone || ''}
- Pedido extra do cliente: ${dados.prompt_extra || 'Design moderno e impactante'}`;
}

async function gerarHtmlLayout({ prompt, promocao, loja }) {
  const userPrompt = buildHtmlUserPrompt({
    tipo_negocio:     loja.tipo_negocio,
    nome_loja:        loja.nome,
    logo_url:         loja.logo_url,
    cor_primaria:     loja.cor_primaria,
    cor_secundaria:   loja.cor_secundaria,
    imagem_fundo_url: loja.imagem_fundo_url,
    imagem_produto_url: promocao.imagem_url,
    titulo:           promocao.titulo,
    descricao:        promocao.descricao,
    preco_de:         promocao.preco_de,
    preco_por:        promocao.preco_por,
    condicoes:        promocao.condicoes,
    telefone:         loja.telefone,
    prompt_extra:     prompt,
  });

  if (process.env.GEMINI_API_KEY) {
    try {
      const model = getGemini().getGenerativeModel({
        model: 'gemini-3-flash-preview',
        systemInstruction: HTML_SYSTEM_PROMPT,
      });
      const result = await model.generateContent(userPrompt);
      const text   = result.response.text().trim();
      // Strip markdown fences if model added them
      const html = text.replace(/^```(?:html)?\n?/i, '').replace(/\n?```$/i, '').trim();
      console.log('[gemini-html] ✓ HTML gerado');
      return html;
    } catch (err) {
      console.warn('[gemini-html] falhou:', err.message);
    }
  }

  if (process.env.GROQ_API_KEY) {
    const completion = await getGroq().chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: HTML_SYSTEM_PROMPT },
        { role: 'user',   content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 8192,
    });
    const text = completion.choices[0].message.content.trim();
    const html = text.replace(/^```(?:html)?\n?/i, '').replace(/\n?```$/i, '').trim();
    console.log('[groq-html] ✓ HTML gerado');
    return html;
  }

  throw new Error('Nenhuma API de IA configurada');
}

module.exports = { gerarLayout, gerarHtmlLayout };
