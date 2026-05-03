const express = require('express');
const { db }  = require('../database');

const router = express.Router();

// GET /api/admin/lojas
router.get('/', async (req, res) => {
  try {
    const lojas = await db.getAll(
      `SELECT id, nome, slug, cor_primaria, cor_secundaria, logo_url, telefone,
              fallback_tagline, fallback_cidade, fallback_categorias, ativo, criado_em
       FROM lojas WHERE account_id = $1 ORDER BY criado_em`,
      [req.account.accountId]
    );
    res.json(lojas);
  } catch (err) {
    console.error('[lojas/list]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/admin/lojas
router.post('/', async (req, res) => {
  try {
    const { nome, slug } = req.body;
    if (!nome || !slug) return res.status(400).json({ error: 'Nome e slug são obrigatórios' });
    if (!/^[a-z0-9-]+$/.test(slug))
      return res.status(400).json({ error: 'Slug deve conter apenas letras minúsculas, números e hífens' });

    // Verifica limite do plano
    const conta = await db.getOne(
      `SELECT p.max_lojas,
              (SELECT COUNT(*) FROM lojas WHERE account_id = $1 AND ativo = TRUE) AS total
       FROM accounts a JOIN planos p ON p.id = a.plano_id WHERE a.id = $1`,
      [req.account.accountId]
    );
    if (parseInt(conta.total) >= conta.max_lojas)
      return res.status(403).json({ error: 'Limite de lojas do seu plano atingido. Faça upgrade para continuar.' });

    const slugExists = await db.getOne('SELECT id FROM lojas WHERE slug = $1', [slug]);
    if (slugExists) return res.status(409).json({ error: 'Slug já em uso' });

    const loja = await db.getOne(
      `INSERT INTO lojas (account_id, nome, slug) VALUES ($1, $2, $3)
       RETURNING id, nome, slug, ativo`,
      [req.account.accountId, nome, slug]
    );
    res.status(201).json(loja);
  } catch (err) {
    console.error('[lojas/create]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/admin/lojas/:id
router.get('/:id', async (req, res) => {
  try {
    const loja = await db.getOne(
      `SELECT * FROM lojas WHERE id = $1 AND account_id = $2`,
      [req.params.id, req.account.accountId]
    );
    if (!loja) return res.status(404).json({ error: 'Loja não encontrada' });
    res.json(loja);
  } catch (err) {
    console.error('[lojas/get]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /api/admin/lojas/:id
router.put('/:id', async (req, res) => {
  try {
    const { nome, cor_primaria, cor_secundaria, logo_url, telefone,
            fallback_tagline, fallback_cidade, fallback_categorias,
            tipo_negocio, imagem_fundo_url } = req.body;

    const loja = await db.getOne(
      `UPDATE lojas SET
         nome = COALESCE($1, nome),
         cor_primaria = COALESCE($2, cor_primaria),
         cor_secundaria = COALESCE($3, cor_secundaria),
         logo_url = COALESCE($4, logo_url),
         telefone = COALESCE($5, telefone),
         fallback_tagline = COALESCE($6, fallback_tagline),
         fallback_cidade = COALESCE($7, fallback_cidade),
         fallback_categorias = COALESCE($8, fallback_categorias),
         tipo_negocio = COALESCE($9, tipo_negocio),
         imagem_fundo_url = COALESCE($10, imagem_fundo_url)
       WHERE id = $11 AND account_id = $12
       RETURNING *`,
      [nome, cor_primaria, cor_secundaria, logo_url, telefone,
       fallback_tagline, fallback_cidade, fallback_categorias,
       tipo_negocio, imagem_fundo_url,
       req.params.id, req.account.accountId]
    );
    if (!loja) return res.status(404).json({ error: 'Loja não encontrada' });
    res.json(loja);
  } catch (err) {
    console.error('[lojas/update]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// DELETE /api/admin/lojas/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE lojas SET ativo = FALSE WHERE id = $1 AND account_id = $2`,
      [req.params.id, req.account.accountId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Loja não encontrada' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[lojas/delete]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
