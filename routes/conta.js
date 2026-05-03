const express = require('express');
const { db }  = require('../database');

const router = express.Router();

// GET /api/admin/conta/plano
router.get('/plano', async (req, res) => {
  try {
    const conta = await db.getOne(
      `SELECT a.status, a.trial_ends_at,
              p.nome AS plano_nome, p.max_lojas, p.preco,
              (SELECT COUNT(*) FROM lojas WHERE account_id = a.id AND ativo = TRUE) AS lojas_ativas
       FROM accounts a JOIN planos p ON p.id = a.plano_id
       WHERE a.id = $1`,
      [req.account.accountId]
    );
    const planos = await db.getAll('SELECT id, nome, max_lojas, preco FROM planos ORDER BY max_lojas');
    res.json({ ...conta, planos });
  } catch (err) {
    console.error('[conta/plano]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/admin/conta/upgrade
router.post('/upgrade', async (req, res) => {
  try {
    const { plano_id } = req.body;
    if (!plano_id) return res.status(400).json({ error: 'plano_id é obrigatório' });

    const plano = await db.getOne('SELECT id, nome, preco FROM planos WHERE id = $1', [plano_id]);
    if (!plano) return res.status(404).json({ error: 'Plano não encontrado' });

    await db.query('UPDATE accounts SET plano_id = $1 WHERE id = $2', [plano_id, req.account.accountId]);

    // TODO: atualizar assinatura no Asaas quando integração estiver ativa
    res.json({ ok: true, plano: plano.nome });
  } catch (err) {
    console.error('[conta/upgrade]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
