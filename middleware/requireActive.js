const { db } = require('../database');

async function requireActive(req, res, next) {
  const account = await db.getOne(
    'SELECT status FROM accounts WHERE id = $1',
    [req.account.accountId]
  );
  if (!account || account.status === 'suspended') {
    return res.status(403).json({ error: 'Conta suspensa. Regularize seu pagamento para continuar.' });
  }
  next();
}

module.exports = { requireActive };
