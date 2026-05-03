const express = require('express');
const { db }  = require('../database');

const router = express.Router({ mergeParams: true });

async function getLoja(lojaId, accountId) {
  return db.getOne(
    'SELECT id FROM lojas WHERE id = $1 AND account_id = $2',
    [lojaId, accountId]
  );
}

// GET /api/admin/lojas/:lojaId/templates
// Retorna templates da loja + compartilhados da agência (loja_id IS NULL)
router.get('/', async (req, res) => {
  try {
    if (!await getLoja(req.params.lojaId, req.account.accountId))
      return res.status(404).json({ error: 'Loja não encontrada' });

    const templates = await db.getAll(
      `SELECT id, nome, thumbnail_url, loja_id, criado_em
       FROM layout_templates
       WHERE account_id = $1
         AND (loja_id = $2 OR loja_id IS NULL)
       ORDER BY loja_id NULLS LAST, criado_em DESC`,
      [req.account.accountId, req.params.lojaId]
    );
    res.json(templates);
  } catch (err) {
    console.error('[templates/list]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/admin/lojas/:lojaId/templates
router.post('/', async (req, res) => {
  try {
    if (!await getLoja(req.params.lojaId, req.account.accountId))
      return res.status(404).json({ error: 'Loja não encontrada' });

    const { nome, canvas_json, thumbnail_url, compartilhado = false } = req.body;
    if (!nome || !canvas_json) return res.status(400).json({ error: 'Nome e canvas_json são obrigatórios' });

    const template = await db.getOne(
      `INSERT INTO layout_templates (account_id, loja_id, nome, canvas_json, thumbnail_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, loja_id, criado_em`,
      [req.account.accountId, compartilhado ? null : req.params.lojaId, nome, canvas_json, thumbnail_url]
    );
    res.status(201).json(template);
  } catch (err) {
    console.error('[templates/create]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/admin/templates/:id/canvas  — carrega canvas_json completo
router.get('/:id/canvas', async (req, res) => {
  try {
    const template = await db.getOne(
      'SELECT canvas_json FROM layout_templates WHERE id = $1 AND account_id = $2',
      [req.params.id, req.account.accountId]
    );
    if (!template) return res.status(404).json({ error: 'Template não encontrado' });
    res.json(template.canvas_json);
  } catch (err) {
    console.error('[templates/canvas]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /api/admin/templates/:id
router.put('/:id', async (req, res) => {
  try {
    const { nome, canvas_json, thumbnail_url } = req.body;
    const template = await db.getOne(
      `UPDATE layout_templates SET
         nome = COALESCE($1, nome),
         canvas_json = COALESCE($2, canvas_json),
         thumbnail_url = COALESCE($3, thumbnail_url)
       WHERE id = $4 AND account_id = $5 RETURNING id, nome`,
      [nome, canvas_json, thumbnail_url, req.params.id, req.account.accountId]
    );
    if (!template) return res.status(404).json({ error: 'Template não encontrado' });
    res.json(template);
  } catch (err) {
    console.error('[templates/update]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// DELETE /api/admin/templates/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM layout_templates WHERE id = $1 AND account_id = $2',
      [req.params.id, req.account.accountId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Template não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[templates/delete]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
