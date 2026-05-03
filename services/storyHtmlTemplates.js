'use strict';

function fmt(val, prefix = 'R$') {
  if (!val) return '';
  const n = parseFloat(String(val).replace(',', '.'));
  if (isNaN(n)) return String(val);
  return `${prefix} ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtTel(tel) {
  if (!tel) return '';
  const d = tel.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return tel;
}

function base(head, body, fonts = '') {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1080">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;font-family:'Inter',sans-serif}
${head}
</style>
${fonts}
</head>
<body>${body}</body>
</html>`;
}

// ─── IMERSIVO ────────────────────────────────────────────────────────────────
function templateImersivo({ loja, promocao }) {
  const bg  = promocao.imagem_url || loja.imagem_fundo_url || '';
  const cor = loja.cor_primaria || '#6c63ff';

  const descBullets = (promocao.descricao || '')
    .split(/[;\n]/).map(s => s.trim()).filter(Boolean)
    .map(s => `<li>${s}</li>`).join('');

  const precoBloco = promocao.preco_por
    ? `<div class="preco-bloco">
        ${promocao.preco_de ? `<span class="preco-de">${fmt(promocao.preco_de)}</span>` : ''}
        <span class="preco-por">${fmt(promocao.preco_por)}</span>
        ${promocao.condicoes ? `<span class="condicoes">${promocao.condicoes}</span>` : ''}
       </div>` : '';

  const tel = loja.telefone ? fmtTel(loja.telefone) : '';

  const css = `
body{background:#111;position:relative}
.bg{position:absolute;inset:0;background:url('${bg}') center/cover no-repeat;z-index:0}
.grad-top{position:absolute;inset:0 0 auto 0;height:420px;background:linear-gradient(to bottom,rgba(0,0,0,.82),transparent);z-index:1}
.grad-bot{position:absolute;inset:auto 0 0 0;height:800px;background:linear-gradient(to top,rgba(0,0,0,.92) 60%,transparent);z-index:1}
.top-bar{position:absolute;top:0;left:0;right:0;z-index:10;padding:56px 64px 0;display:flex;align-items:center;gap:28px}
.logo-wrap{width:110px;height:110px;border-radius:50%;background:#fff;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 32px rgba(0,0,0,.5)}
.logo-wrap img{width:100%;height:100%;object-fit:contain}
.loja-nome{font-size:38px;font-weight:800;color:#fff;letter-spacing:-.5px;line-height:1.1;text-shadow:0 2px 12px rgba(0,0,0,.7)}
.loja-cat{font-size:26px;font-weight:400;color:rgba(255,255,255,.7);margin-top:4px}
.content{position:absolute;bottom:0;left:0;right:0;z-index:10;padding:64px 64px 0}
.card{background:rgba(255,255,255,.08);backdrop-filter:blur(28px) saturate(1.4);-webkit-backdrop-filter:blur(28px) saturate(1.4);border:1px solid rgba(255,255,255,.18);border-radius:32px;padding:52px 60px;margin-bottom:0}
.titulo{font-size:76px;font-weight:900;color:#fff;line-height:1.05;letter-spacing:-1.5px;margin-bottom:28px;text-wrap:balance}
.descricao ul{list-style:none;display:flex;flex-direction:column;gap:14px;margin-bottom:36px}
.descricao li{font-size:34px;color:rgba(255,255,255,.88);font-weight:400;padding-left:32px;position:relative;line-height:1.3}
.descricao li::before{content:'';position:absolute;left:0;top:12px;width:12px;height:12px;border-radius:50%;background:${cor}}
.preco-bloco{display:flex;align-items:baseline;gap:24px;margin-bottom:32px;flex-wrap:wrap}
.preco-de{font-size:40px;color:rgba(255,255,255,.45);text-decoration:line-through;font-weight:500}
.preco-por{font-size:96px;font-weight:900;color:#fff;letter-spacing:-2px;line-height:1}
.condicoes{font-size:28px;color:rgba(255,255,255,.65);font-weight:400;align-self:flex-end;padding-bottom:8px}
.wp-bar{background:${cor};border-radius:24px;display:flex;align-items:center;justify-content:center;gap:20px;padding:30px 48px;margin:40px 0;width:100%}
.wp-ico{font-size:44px;line-height:1}
.wp-txt{font-size:40px;font-weight:700;color:#fff;letter-spacing:.5px}
.bottom-pad{height:64px}
`;

  const body = `
<div class="bg"></div>
<div class="grad-top"></div>
<div class="grad-bot"></div>
<div class="top-bar">
  <div class="logo-wrap"${loja.logo_url ? '' : ' style="display:none"'}><img src="${loja.logo_url || ''}" alt="logo"></div>
  <div>
    <div class="loja-nome">${loja.nome || ''}</div>
    ${loja.tipo_negocio ? `<div class="loja-cat">${loja.tipo_negocio}</div>` : ''}
  </div>
</div>
<div class="content">
  <div class="card">
    <div class="titulo">${promocao.titulo || 'Oferta Especial'}</div>
    ${descBullets ? `<div class="descricao"><ul>${descBullets}</ul></div>` : ''}
    ${precoBloco}
    ${tel ? `<div class="wp-bar"><span class="wp-ico">📞</span><span class="wp-txt">${tel}</span></div>` : ''}
  </div>
  <div class="bottom-pad"></div>
</div>
`;

  return base(css, body, `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&display=swap">`);
}

// ─── CLÁSSICO ────────────────────────────────────────────────────────────────
function templateClassico({ loja, promocao }) {
  const cor  = loja.cor_primaria  || '#e53e3e';
  const cor2 = loja.cor_secundaria || '#fff';
  const prodImg = promocao.imagem_url || '';
  const tel  = loja.telefone ? fmtTel(loja.telefone) : '';

  const css = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;900&display=swap');
body{background:${cor};font-family:'Poppins',sans-serif;position:relative;overflow:hidden}
.deco1{position:absolute;width:900px;height:900px;border-radius:50%;background:rgba(255,255,255,.06);top:-200px;right:-300px}
.deco2{position:absolute;width:600px;height:600px;border-radius:50%;background:rgba(0,0,0,.08);bottom:300px;left:-200px}
.header{position:relative;z-index:2;padding:64px 72px 40px;display:flex;align-items:center;gap:32px}
.logo-circle{width:120px;height:120px;border-radius:50%;background:#fff;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 40px rgba(0,0,0,.25)}
.logo-circle img{width:100%;height:100%;object-fit:contain}
.loja-nome{font-size:44px;font-weight:900;color:#fff;letter-spacing:-.5px;line-height:1}
.loja-cat{font-size:28px;font-weight:400;color:rgba(255,255,255,.75);margin-top:6px}
.badge{position:relative;z-index:2;margin:0 72px;background:#fff;border-radius:24px;padding:20px 36px;display:inline-flex;align-items:center;gap:16px}
.badge-txt{font-size:28px;font-weight:700;color:${cor};letter-spacing:.5px;text-transform:uppercase}
.badge-dot{width:10px;height:10px;border-radius:50%;background:${cor}}
.img-wrap{position:relative;z-index:2;margin:32px 72px;border-radius:28px;overflow:hidden;height:700px;background:#fff1}
.img-wrap img{width:100%;height:100%;object-fit:contain}
.price-card{position:relative;z-index:2;margin:0 72px 32px;background:#fff;border-radius:28px;padding:40px 52px}
.titulo{font-size:60px;font-weight:900;color:${cor};letter-spacing:-1px;line-height:1.05;margin-bottom:20px}
.preco-row{display:flex;align-items:baseline;gap:20px;flex-wrap:wrap;margin-bottom:${promocao.condicoes ? '12px' : '0'}}
.preco-de{font-size:38px;font-weight:500;color:#aaa;text-decoration:line-through}
.preco-por{font-size:100px;font-weight:900;color:${cor};letter-spacing:-2px;line-height:1}
.condicoes{font-size:26px;color:#777;margin-bottom:16px}
.wp-bar{background:${cor};border-radius:20px;display:flex;align-items:center;justify-content:center;gap:20px;padding:28px 0;width:100%}
.wp-ico{font-size:40px}
.wp-txt{font-size:38px;font-weight:700;color:#fff}
`;

  const body = `
<div class="deco1"></div>
<div class="deco2"></div>
<div class="header">
  <div class="logo-circle"${loja.logo_url ? '' : ' style="display:none"'}><img src="${loja.logo_url || ''}" alt="logo"></div>
  <div>
    <div class="loja-nome">${loja.nome || ''}</div>
    ${loja.tipo_negocio ? `<div class="loja-cat">${loja.tipo_negocio}</div>` : ''}
  </div>
</div>
${promocao.titulo ? `<div class="badge"><div class="badge-dot"></div><div class="badge-txt">Oferta Especial</div><div class="badge-dot"></div></div>` : ''}
${prodImg ? `<div class="img-wrap"><img src="${prodImg}" alt="produto"></div>` : ''}
<div class="price-card">
  <div class="titulo">${promocao.titulo || 'Oferta do Dia'}</div>
  <div class="preco-row">
    ${promocao.preco_de ? `<span class="preco-de">${fmt(promocao.preco_de)}</span>` : ''}
    ${promocao.preco_por ? `<span class="preco-por">${fmt(promocao.preco_por)}</span>` : ''}
  </div>
  ${promocao.condicoes ? `<div class="condicoes">${promocao.condicoes}</div>` : ''}
  ${tel ? `<div class="wp-bar"><span class="wp-ico">📞</span><span class="wp-txt">${tel}</span></div>` : ''}
</div>
`;

  return base(css, body);
}

// ─── DARK ────────────────────────────────────────────────────────────────────
function templateDark({ loja, promocao }) {
  const cor  = loja.cor_primaria || '#00e5ff';
  const prodImg = promocao.imagem_url || '';
  const tel = loja.telefone ? fmtTel(loja.telefone) : '';

  const css = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap');
body{background:#0a0a0f;font-family:'Space Grotesk',sans-serif;position:relative}
.grid-bg{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:60px 60px;z-index:0}
.glow{position:absolute;width:800px;height:800px;border-radius:50%;background:radial-gradient(circle,${cor}22 0%,transparent 70%);top:600px;left:50%;transform:translateX(-50%);z-index:0;pointer-events:none}
.header{position:relative;z-index:2;padding:64px 72px 0;display:flex;align-items:center;gap:32px}
.logo-ring{width:110px;height:110px;border-radius:50%;border:2px solid ${cor};overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#111}
.logo-ring img{width:90%;height:90%;object-fit:contain}
.loja-nome{font-size:42px;font-weight:700;color:#fff;letter-spacing:-.5px}
.loja-cat{font-size:26px;color:${cor};margin-top:4px;font-weight:500}
.pill{position:relative;z-index:2;display:inline-block;margin:48px 72px 0;background:${cor}22;border:1px solid ${cor}55;border-radius:100px;padding:14px 36px}
.pill-txt{font-size:24px;font-weight:500;color:${cor};text-transform:uppercase;letter-spacing:2px}
.img-area{position:relative;z-index:2;margin:40px 72px;border-radius:28px;overflow:hidden;height:680px;background:#111;border:1px solid rgba(255,255,255,.07)}
.img-area img{width:100%;height:100%;object-fit:contain}
.info{position:relative;z-index:2;margin:0 72px}
.titulo{font-size:68px;font-weight:700;color:#fff;letter-spacing:-1.5px;line-height:1.05;margin-bottom:32px}
.preco-row{display:flex;align-items:baseline;gap:20px;flex-wrap:wrap;margin-bottom:20px}
.preco-de{font-size:36px;color:#555;text-decoration:line-through;font-weight:500}
.preco-por{font-size:108px;font-weight:700;color:${cor};letter-spacing:-3px;line-height:1}
.preco-label{font-size:28px;color:#777;align-self:flex-end;padding-bottom:12px}
.condicoes{font-size:28px;color:#777;margin-bottom:40px}
.divider{height:1px;background:rgba(255,255,255,.08);margin-bottom:40px}
.wp-bar{display:flex;align-items:center;justify-content:center;gap:24px;padding:32px 0;border:1px solid ${cor}44;border-radius:20px;background:${cor}11}
.wp-ico{font-size:44px}
.wp-txt{font-size:38px;font-weight:700;color:#fff}
`;

  const body = `
<div class="grid-bg"></div>
<div class="glow"></div>
<div class="header">
  <div class="logo-ring"${loja.logo_url ? '' : ' style="display:none"'}><img src="${loja.logo_url || ''}" alt="logo"></div>
  <div>
    <div class="loja-nome">${loja.nome || ''}</div>
    ${loja.tipo_negocio ? `<div class="loja-cat">${loja.tipo_negocio}</div>` : ''}
  </div>
</div>
<div class="pill"><span class="pill-txt">Oferta Especial</span></div>
${prodImg ? `<div class="img-area"><img src="${prodImg}" alt="produto"></div>` : ''}
<div class="info">
  <div class="titulo">${promocao.titulo || 'Produto Destaque'}</div>
  <div class="preco-row">
    ${promocao.preco_de ? `<span class="preco-de">${fmt(promocao.preco_de)}</span>` : ''}
    ${promocao.preco_por ? `<span class="preco-por">${fmt(promocao.preco_por)}</span>` : ''}
    ${promocao.preco_por ? `<span class="preco-label">à vista</span>` : ''}
  </div>
  ${promocao.condicoes ? `<div class="condicoes">${promocao.condicoes}</div>` : ''}
  <div class="divider"></div>
  ${tel ? `<div class="wp-bar"><span class="wp-ico">📞</span><span class="wp-txt">${tel}</span></div>` : ''}
</div>
`;

  return base(css, body);
}

// ─── MINIMALISTA ─────────────────────────────────────────────────────────────
function templateMinimalista({ loja, promocao }) {
  const cor  = loja.cor_primaria || '#2563eb';
  const prodImg = promocao.imagem_url || '';
  const tel = loja.telefone ? fmtTel(loja.telefone) : '';

  const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');
body{background:#f8f8f6;font-family:'DM Sans',sans-serif;position:relative}
.top-stripe{position:absolute;top:0;left:0;right:0;height:8px;background:${cor}}
.header{position:relative;z-index:2;padding:72px 80px 0;display:flex;align-items:center;gap:32px}
.logo-sq{width:108px;height:108px;border-radius:20px;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#fff;box-shadow:0 2px 16px rgba(0,0,0,.1)}
.logo-sq img{width:90%;height:90%;object-fit:contain}
.loja-nome{font-size:44px;font-weight:700;color:#111;letter-spacing:-.5px;line-height:1}
.loja-cat{font-size:26px;color:#888;margin-top:6px}
.divider-line{height:2px;background:#eee;margin:60px 80px 0}
.img-area{margin:52px 80px;border-radius:32px;overflow:hidden;height:760px;background:#fff;box-shadow:0 4px 40px rgba(0,0,0,.08)}
.img-area img{width:100%;height:100%;object-fit:contain}
.price-section{margin:0 80px}
.label{font-size:22px;font-weight:500;color:${cor};text-transform:uppercase;letter-spacing:2px;margin-bottom:16px}
.titulo{font-size:64px;font-weight:700;color:#111;letter-spacing:-1px;line-height:1.05;margin-bottom:36px}
.preco-box{background:${cor};border-radius:24px;padding:36px 52px;display:inline-flex;flex-direction:column;gap:8px;margin-bottom:28px;width:100%}
.preco-de{font-size:32px;color:rgba(255,255,255,.6);text-decoration:line-through;font-weight:500}
.preco-por{font-size:96px;font-weight:700;color:#fff;letter-spacing:-2px;line-height:1}
.condicoes{font-size:26px;color:rgba(255,255,255,.75)}
.wp-bar{display:flex;align-items:center;justify-content:center;gap:20px;padding:32px 0;border-radius:20px;border:2px solid ${cor};margin-top:28px}
.wp-ico{font-size:40px}
.wp-txt{font-size:38px;font-weight:700;color:${cor}}
`;

  const body = `
<div class="top-stripe"></div>
<div class="header">
  <div class="logo-sq"${loja.logo_url ? '' : ' style="display:none"'}><img src="${loja.logo_url || ''}" alt="logo"></div>
  <div>
    <div class="loja-nome">${loja.nome || ''}</div>
    ${loja.tipo_negocio ? `<div class="loja-cat">${loja.tipo_negocio}</div>` : ''}
  </div>
</div>
<div class="divider-line"></div>
${prodImg ? `<div class="img-area"><img src="${prodImg}" alt="produto"></div>` : ''}
<div class="price-section">
  <div class="label">Oferta Especial</div>
  <div class="titulo">${promocao.titulo || 'Produto em Destaque'}</div>
  <div class="preco-box">
    ${promocao.preco_de ? `<span class="preco-de">${fmt(promocao.preco_de)}</span>` : ''}
    ${promocao.preco_por ? `<span class="preco-por">${fmt(promocao.preco_por)}</span>` : ''}
    ${promocao.condicoes ? `<span class="condicoes">${promocao.condicoes}</span>` : ''}
  </div>
  ${tel ? `<div class="wp-bar"><span class="wp-ico">📞</span><span class="wp-txt">${tel}</span></div>` : ''}
</div>
`;

  return base(css, body);
}

// ─── MAPA ────────────────────────────────────────────────────────────────────
const GENERATORS = {
  imersivo:    templateImersivo,
  classico:    templateClassico,
  dark:        templateDark,
  minimalista: templateMinimalista,
};

function gerarHtmlTemplate(templateKey, { loja, promocao }) {
  const fn = GENERATORS[templateKey] || GENERATORS.classico;
  return fn({ loja: loja || {}, promocao: promocao || {} });
}

module.exports = { gerarHtmlTemplate };
