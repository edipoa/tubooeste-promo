const express = require('express');
const { db }  = require('../database');

const router = express.Router();

const STATUS_MAP = {
  PAYMENT_RECEIVED:       'active',
  PAYMENT_CONFIRMED:      'active',
  PAYMENT_OVERDUE:        'suspended',
  SUBSCRIPTION_CANCELLED: 'suspended',
};

// POST /webhooks/asaas
router.post('/asaas', async (req, res) => {
  try {
    const { event, payment, subscription } = req.body;
    const novoStatus = STATUS_MAP[event];
    if (!novoStatus) return res.json({ ok: true }); // evento ignorado

    const asaasId = payment?.customer || subscription?.customer;
    if (!asaasId) return res.json({ ok: true });

    await db.query(
      'UPDATE accounts SET status = $1 WHERE asaas_id = $2',
      [novoStatus, asaasId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[webhook/asaas]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
