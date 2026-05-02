const express = require('express');
const fs      = require('fs');
const path    = require('path');
const { db }  = require('../database');

const router = express.Router();

const GRAPH_URL      = 'https://graph.facebook.com/v21.0';
const STORIES_DIR    = path.join(__dirname, '../public/stories-export');
const DELAY_ENTRE_POSTS = 2000; // ms entre posts no publicar-todos

// ── Helpers ───────────────────────────────────────────────

async function getConfig(chave) {
  const row = await db.getAsync('SELECT valor FROM config WHERE chave = ?', [chave]);
  return row ? row.valor : null;
}

async function setConfig(chave, valor) {
  await db.runAsync(
    `INSERT INTO config (chave, valor) VALUES (?, ?)
     ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`,
    [chave, valor]
  );
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getPublicUrl() {
  const ngrokUrl = await getConfig('ngrok_url');
  if (!ngrokUrl) throw new Error('URL pública não encontrada. Verifique se o ngrok está ativo.');
  return ngrokUrl;
}

// Cria container e publica um story no Instagram
async function publicarStory(imageUrl) {
  const token  = process.env.IG_ACCESS_TOKEN;
  const userId = process.env.IG_USER_ID;

  if (!token || !userId)
    throw new Error('IG_ACCESS_TOKEN e IG_USER_ID precisam estar configurados no .env');

  // 1. Cria container de mídia
  const containerRes = await fetch(`${GRAPH_URL}/${userId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url:  imageUrl,
      media_type: 'STORIES',
      access_token: token,
    }),
  });
  const container = await containerRes.json();
  if (!container.id) {
    throw new Error(container.error?.message || 'Erro ao criar container de mídia');
  }

  // Aguarda processamento do container
  await sleep(1000);

  // 2. Publica o container
  const publishRes = await fetch(`${GRAPH_URL}/${userId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id:  container.id,
      access_token: token,
    }),
  });
  const published = await publishRes.json();
  if (!published.id) {
    throw new Error(published.error?.message || 'Erro ao publicar story');
  }

  return published.id;
}

// ── POST /api/instagram/publicar ──────────────────────────
// Body: JSON { png: "data:image/png;base64,...", nome: string }
router.post('/publicar', async (req, res) => {
  try {
    const { png, nome } = req.body;
    if (!png) return res.status(400).json({ error: 'Imagem não enviada' });

    // Salva PNG em disco
    const filename = `${nome || Date.now()}.png`;
    const filepath  = path.join(STORIES_DIR, filename);
    const base64    = png.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(filepath, Buffer.from(base64, 'base64'));

    // Monta URL pública via ngrok
    const baseUrl  = await getPublicUrl();
    const imageUrl = `${baseUrl}/stories-export/${filename}`;

    const igId = await publicarStory(imageUrl);
    res.json({ ok: true, ig_id: igId });
  } catch (err) {
    console.error('[instagram] publicar:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/instagram/publicar-todos ────────────────────
// Body: JSON { stories: [{ png: base64, nome: string }] }
router.post('/publicar-todos', async (req, res) => {
  try {
    const { stories } = req.body;
    if (!Array.isArray(stories) || stories.length === 0)
      return res.status(400).json({ error: 'Nenhum story enviado' });

    const baseUrl   = await getPublicUrl();
    const resultados = [];

    for (const story of stories) {
      try {
        const filename = `${story.nome || Date.now()}.png`;
        const filepath  = path.join(STORIES_DIR, filename);
        const base64    = story.png.replace(/^data:image\/png;base64,/, '');
        fs.writeFileSync(filepath, Buffer.from(base64, 'base64'));

        const imageUrl = `${baseUrl}/stories-export/${filename}`;
        const igId     = await publicarStory(imageUrl);
        resultados.push({ nome: story.nome, ok: true, ig_id: igId });
      } catch (err) {
        resultados.push({ nome: story.nome, ok: false, error: err.message });
      }

      await sleep(DELAY_ENTRE_POSTS);
    }

    res.json({ ok: true, resultados });
  } catch (err) {
    console.error('[instagram] publicar-todos:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/instagram/status ─────────────────────────────
router.get('/status', async (req, res) => {
  try {
    const token  = process.env.IG_ACCESS_TOKEN;
    const userId = process.env.IG_USER_ID;

    if (!token || !userId)
      return res.json({ configurado: false });

    const r    = await fetch(`${GRAPH_URL}/me?fields=id,name&access_token=${token}`);
    const data = await r.json();

    if (data.error) return res.json({ configurado: true, valido: false, erro: data.error.message });
    res.json({ configurado: true, valido: true, nome: data.name });
  } catch (err) {
    res.json({ configurado: false, erro: err.message });
  }
});

// ── GET /api/instagram/find-account ──────────────────────
// Descobre o IG_USER_ID correto via páginas do Facebook
router.get('/find-account', async (req, res) => {
  const token = process.env.IG_ACCESS_TOKEN;
  try {
    const pagesRes = await fetch(`${GRAPH_URL}/me/accounts?access_token=${token}`);
    const pages    = await pagesRes.json();

    if (pages.error) return res.json({ erro: pages.error.message });
    if (!pages.data?.length) return res.json({ erro: 'Nenhuma página encontrada no token' });

    const results = await Promise.all(pages.data.map(async page => {
      const r    = await fetch(`${GRAPH_URL}/${page.id}?fields=name,instagram_business_account&access_token=${token}`);
      const data = await r.json();
      return {
        pagina_nome: page.name,
        pagina_id:   page.id,
        ig_user_id:  data.instagram_business_account?.id || null,
      };
    }));

    res.json({ pages: results });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ── GET /api/instagram/debug ──────────────────────────────
// Diagnóstico: verifica tipo de conta, permissões e IG_USER_ID
router.get('/debug', async (req, res) => {
  const token  = process.env.IG_ACCESS_TOKEN;
  const userId = process.env.IG_USER_ID;
  const out    = { userId };

  try {
    // 1. Tipo e info da conta pelo IG_USER_ID
    const acctRes  = await fetch(`${GRAPH_URL}/${userId}?fields=id,username,name,biography,followers_count&access_token=${token}`);
    out.account    = await acctRes.json();
  } catch (e) { out.account_err = e.message; }

  try {
    // 2. Permissões do token
    const permRes  = await fetch(`${GRAPH_URL}/me/permissions?access_token=${token}`);
    out.permissions = (await permRes.json())?.data?.map(p => `${p.permission}:${p.status}`);
  } catch (e) { out.permissions_err = e.message; }

  try {
    // 3. ID real retornado pelo token (deve bater com IG_USER_ID)
    const meRes    = await fetch(`${GRAPH_URL}/me?fields=id,name&access_token=${token}`);
    out.me         = await meRes.json();
  } catch (e) { out.me_err = e.message; }

  res.json(out);
});

// ── Renovação automática do token ────────────────────────
async function renovarToken() {
  const token     = process.env.IG_ACCESS_TOKEN;
  const appId     = process.env.IG_APP_ID;
  const appSecret = process.env.IG_APP_SECRET;

  if (!token || !appId || !appSecret) return;

  try {
    // Verifica expiração do token atual
    const debugRes = await fetch(
      `${GRAPH_URL}/debug_token?input_token=${token}&access_token=${appId}|${appSecret}`
    );
    const debug = await debugRes.json();
    const expiresAt = debug?.data?.expires_at;

    if (!expiresAt) return; // token sem expiração (não expira)

    const diasRestantes = (expiresAt - Date.now() / 1000) / 86400;
    if (diasRestantes > 10) return; // ainda tem tempo

    console.log(`[instagram] Token expira em ${Math.round(diasRestantes)}d — renovando...`);

    const refreshRes = await fetch(
      `${GRAPH_URL}/oauth/access_token?grant_type=fb_exchange_token` +
      `&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${token}`
    );
    const refreshed = await refreshRes.json();

    if (!refreshed.access_token) {
      console.error('[instagram] Falha ao renovar token:', refreshed);
      return;
    }

    // Atualiza .env em memória (persiste apenas até reiniciar; suficiente com cron diário)
    process.env.IG_ACCESS_TOKEN = refreshed.access_token;
    console.log('[instagram] Token renovado com sucesso');
  } catch (err) {
    console.error('[instagram] Erro na renovação do token:', err.message);
  }
}

module.exports = { router, renovarToken };
