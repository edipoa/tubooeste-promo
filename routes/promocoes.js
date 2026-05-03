const express = require('express');
const { db }  = require('../database');

const router = express.Router({ mergeParams: true });

// Garante que a loja pertence ao account
async function getLoja(lojaId, accountId) {
  return db.getOne(
    'SELECT id FROM lojas WHERE id = $1 AND account_id = $2 AND ativo = TRUE',
    [lojaId, accountId]
  );
}

// GET /api/admin/lojas/:lojaId/promocoes
router.get('/', async (req, res) => {
  try {
    if (!await getLoja(req.params.lojaId, req.account.accountId))
      return res.status(404).json({ error: 'Loja não encontrada' });

    const promocoes = await db.getAll(
      `SELECT id, titulo, descricao, preco_de, preco_por, imagem_url, data_validade, ativo, criado_em
       FROM promocoes WHERE loja_id = $1 ORDER BY criado_em DESC`,
      [req.params.lojaId]
    );
    res.json(promocoes);
  } catch (err) {
    console.error('[promocoes/list]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/admin/lojas/:lojaId/promocoes
router.post('/', async (req, res) => {
  try {
    if (!await getLoja(req.params.lojaId, req.account.accountId))
      return res.status(404).json({ error: 'Loja não encontrada' });

    const { titulo, descricao, preco_de, preco_por, imagem_url, data_validade, condicoes } = req.body;
    if (!titulo) return res.status(400).json({ error: 'Título é obrigatório' });

    const promo = await db.getOne(
      `INSERT INTO promocoes (loja_id, titulo, descricao, preco_de, preco_por, imagem_url, data_validade, condicoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.params.lojaId, titulo, descricao, preco_de, preco_por, imagem_url, data_validade, condicoes]
    );
    res.status(201).json(promo);
  } catch (err) {
    console.error('[promocoes/create]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /api/admin/lojas/:lojaId/promocoes/:id
router.put('/:id', async (req, res) => {
  try {
    if (!await getLoja(req.params.lojaId, req.account.accountId))
      return res.status(404).json({ error: 'Loja não encontrada' });

    const { titulo, descricao, preco_de, preco_por, imagem_url, data_validade, ativo, condicoes } = req.body;

    const promo = await db.getOne(
      `UPDATE promocoes SET
         titulo = COALESCE($1, titulo),
         descricao = COALESCE($2, descricao),
         preco_de = COALESCE($3, preco_de),
         preco_por = COALESCE($4, preco_por),
         imagem_url = COALESCE($5, imagem_url),
         data_validade = COALESCE($6, data_validade),
         ativo = COALESCE($7, ativo),
         condicoes = COALESCE($8, condicoes)
       WHERE id = $9 AND loja_id = $10
       RETURNING *`,
      [titulo, descricao, preco_de, preco_por, imagem_url, data_validade, ativo, condicoes,
       req.params.id, req.params.lojaId]
    );
    if (!promo) return res.status(404).json({ error: 'Promoção não encontrada' });
    res.json(promo);
  } catch (err) {
    console.error('[promocoes/update]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// DELETE /api/admin/lojas/:lojaId/promocoes/:id
router.delete('/:id', async (req, res) => {
  try {
    if (!await getLoja(req.params.lojaId, req.account.accountId))
      return res.status(404).json({ error: 'Loja não encontrada' });

    const result = await db.query(
      'DELETE FROM promocoes WHERE id = $1 AND loja_id = $2',
      [req.params.id, req.params.lojaId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Promoção não encontrada' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[promocoes/delete]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
