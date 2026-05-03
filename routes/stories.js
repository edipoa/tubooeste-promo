'use strict';

const express    = require('express');
const cloudinary = require('cloudinary').v2;
const { db }     = require('../database');
const { gerarHtmlTemplate } = require('../services/storyHtmlTemplates');
const { gerarHtmlLayout }   = require('../services/gemini');
const { renderHtmlToPng }   = require('../services/htmlRenderer');

const router = express.Router({ mergeParams: true });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function getLoja(lojaId, accountId) {
  return db.getOne(
    'SELECT * FROM lojas WHERE id = $1 AND account_id = $2',
    [lojaId, accountId]
  );
}

async function getPromocao(promocaoId, lojaId) {
  if (!promocaoId) return {};
  return await db.getOne(
    'SELECT * FROM promocoes WHERE id = $1 AND loja_id = $2',
    [promocaoId, lojaId]
  ) || {};
}

// GET /api/admin/lojas/:lojaId/stories
router.get('/', async (req, res) => {
  try {
    if (!await getLoja(req.params.lojaId, req.account.accountId))
      return res.status(404).json({ error: 'Loja não encontrada' });

    const stories = await db.getAll(
      `SELECT id, imagem_url, promocao_id, template_id, criado_em
       FROM stories WHERE loja_id = $1 ORDER BY criado_em DESC`,
      [req.params.lojaId]
    );
    res.json(stories);
  } catch (err) {
    console.error('[stories/list]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/admin/lojas/:lojaId/stories/preview-html
// Body: { template?, prompt?, promocao_id? }
// Retorna { html } — string HTML pronto para iframe srcdoc ou renderização
router.post('/preview-html', async (req, res) => {
  try {
    const loja = await getLoja(req.params.lojaId, req.account.accountId);
    if (!loja) return res.status(404).json({ error: 'Loja não encontrada' });

    const { template, prompt, promocao_id, logo_url } = req.body;
    const promocao = await getPromocao(promocao_id, req.params.lojaId);

    // Allow caller to override logo for live preview experimentation
    const lojaEfetiva = logo_url ? { ...loja, logo_url } : loja;

    let html;
    if (template) {
      html = gerarHtmlTemplate(template, { loja: lojaEfetiva, promocao });
    } else if (prompt) {
      html = await gerarHtmlLayout({ prompt, promocao, loja: lojaEfetiva });
    } else {
      return res.status(400).json({ error: 'Informe template ou prompt' });
    }

    res.json({ html });
  } catch (err) {
    console.error('[stories/preview-html]', err.message);
    res.status(500).json({ error: 'Erro ao gerar preview' });
  }
});

// POST /api/admin/lojas/:lojaId/stories/renderizar
// Body: { html, promocao_id?, story_id? }
// Se story_id fornecido: atualiza story existente; senão cria novo
router.post('/renderizar', async (req, res) => {
  try {
    const loja = await getLoja(req.params.lojaId, req.account.accountId);
    if (!loja) return res.status(404).json({ error: 'Loja não encontrada' });

    const { html, promocao_id, story_id } = req.body;
    if (!html) return res.status(400).json({ error: 'html é obrigatório' });

    const pngBuffer = await renderHtmlToPng(html);
    const dataUrl   = 'data:image/png;base64,' + pngBuffer.toString('base64');
    const upload    = await cloudinary.uploader.upload(dataUrl, {
      folder:        `promovix/${req.params.lojaId}/stories`,
      resource_type: 'image',
    });

    let story;
    if (story_id) {
      story = await db.getOne(
        `UPDATE stories SET imagem_url = $1, html = $2, promocao_id = COALESCE($3, promocao_id)
         WHERE id = $4 AND loja_id = $5
         RETURNING id, imagem_url, criado_em`,
        [upload.secure_url, html, promocao_id || null, story_id, req.params.lojaId]
      );
      if (!story) return res.status(404).json({ error: 'Story não encontrado' });
    } else {
      story = await db.getOne(
        `INSERT INTO stories (loja_id, promocao_id, imagem_url, html)
         VALUES ($1, $2, $3, $4) RETURNING id, imagem_url, criado_em`,
        [req.params.lojaId, promocao_id || null, upload.secure_url, html]
      );
    }

    res.status(story_id ? 200 : 201).json(story);
  } catch (err) {
    console.error('[stories/renderizar]', err.message);
    res.status(500).json({ error: 'Erro ao renderizar story' });
  }
});

// GET /api/admin/lojas/:lojaId/stories/:id/html
router.get('/:id/html', async (req, res) => {
  try {
    if (!await getLoja(req.params.lojaId, req.account.accountId))
      return res.status(404).json({ error: 'Loja não encontrada' });

    const story = await db.getOne(
      'SELECT html FROM stories WHERE id = $1 AND loja_id = $2',
      [req.params.id, req.params.lojaId]
    );
    if (!story) return res.status(404).json({ error: 'Story não encontrado' });
    res.json({ html: story.html || '' });
  } catch (err) {
    console.error('[stories/html]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// DELETE /api/admin/lojas/:lojaId/stories/:id
router.delete('/:id', async (req, res) => {
  try {
    const story = await db.getOne(
      'SELECT id FROM stories WHERE id = $1 AND loja_id = $2',
      [req.params.id, req.params.lojaId]
    );
    if (!story) return res.status(404).json({ error: 'Story não encontrado' });

    await db.query('DELETE FROM stories WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[stories/delete]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
