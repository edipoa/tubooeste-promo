const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const { db }  = require('../database');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 8 * 60 * 60 * 1000, // 8h
};

function makeToken(accountId, tipo) {
  return jwt.sign({ accountId, tipo }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

// POST /api/auth/cadastro
router.post('/cadastro', async (req, res) => {
  try {
    const { nome, email, senha, tipo = 'direct' } = req.body;

    if (!nome || !email || !senha)
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    if (senha.length < 6)
      return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
    if (!['direct', 'agency'].includes(tipo))
      return res.status(400).json({ error: 'Tipo inválido' });

    const exists = await db.getOne('SELECT id FROM accounts WHERE email = $1', [email]);
    if (exists) return res.status(409).json({ error: 'E-mail já cadastrado' });

    const plano = await db.getOne('SELECT id FROM planos WHERE nome = $1', ['starter']);
    const senhaHash = await bcrypt.hash(senha, 12);
    const trialDays = parseInt(process.env.TRIAL_DAYS || '20');
    const trialEndsAt = new Date(Date.now() + trialDays * 86400 * 1000);

    const account = await db.getOne(
      `INSERT INTO accounts (nome, email, senha_hash, tipo, plano_id, trial_ends_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, tipo`,
      [nome, email, senhaHash, tipo, plano.id, trialEndsAt]
    );

    // Cria loja inicial para clientes diretos
    if (tipo === 'direct') {
      const slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + Date.now();
      await db.query(
        `INSERT INTO lojas (account_id, nome, slug) VALUES ($1, $2, $3)`,
        [account.id, nome, slug]
      );
    }

    const token = makeToken(account.id, account.tipo);
    res.cookie('token', token, COOKIE_OPTS);
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[auth/cadastro]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha)
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });

    const account = await db.getOne(
      'SELECT id, tipo, senha_hash FROM accounts WHERE email = $1',
      [email]
    );
    if (!account) return res.status(401).json({ error: 'Credenciais inválidas' });

    const ok = await bcrypt.compare(senha, account.senha_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = makeToken(account.id, account.tipo);
    res.cookie('token', token, COOKIE_OPTS);
    res.json({ ok: true });
  } catch (err) {
    console.error('[auth/login]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const account = await db.getOne(
      `SELECT a.id, a.nome, a.email, a.tipo, a.status, a.trial_ends_at,
              p.nome AS plano_nome, p.max_lojas, p.preco
       FROM accounts a
       JOIN planos p ON p.id = a.plano_id
       WHERE a.id = $1`,
      [req.account.accountId]
    );
    if (!account) return res.status(404).json({ error: 'Conta não encontrada' });

    const lojas = await db.getAll(
      'SELECT id, nome, slug, ativo FROM lojas WHERE account_id = $1 ORDER BY criado_em',
      [req.account.accountId]
    );

    res.json({ ...account, lojas });
  } catch (err) {
    console.error('[auth/me]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/auth/trocar-senha
router.post('/trocar-senha', requireAuth, async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body;
    if (!senhaAtual || !novaSenha)
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    if (novaSenha.length < 6)
      return res.status(400).json({ error: 'Nova senha deve ter no mínimo 6 caracteres' });

    const account = await db.getOne(
      'SELECT senha_hash FROM accounts WHERE id = $1',
      [req.account.accountId]
    );
    const ok = await bcrypt.compare(senhaAtual, account.senha_hash);
    if (!ok) return res.status(401).json({ error: 'Senha atual incorreta' });

    const hash = await bcrypt.hash(novaSenha, 12);
    await db.query('UPDATE accounts SET senha_hash = $1 WHERE id = $2', [hash, req.account.accountId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[auth/trocar-senha]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
