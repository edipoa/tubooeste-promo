const express = require('express');
const bcrypt  = require('bcrypt');
const { db }  = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 12;

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Usuário e senha obrigatórios' });

    const user = await db.getAsync('SELECT * FROM usuarios WHERE username = ?', [username]);
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Credenciais inválidas' });

    req.session.userId   = user.id;
    req.session.username = user.username;
    res.json({ ok: true });
  } catch (err) {
    console.error('[auth] login:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sid');
    res.json({ ok: true });
  });
});

// POST /auth/trocar-senha  (requer login)
router.post('/trocar-senha', requireAuth, async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body;
    if (!senhaAtual || !novaSenha)
      return res.status(400).json({ error: 'Preencha todos os campos' });
    if (novaSenha.length < 6)
      return res.status(400).json({ error: 'Nova senha deve ter no mínimo 6 caracteres' });

    const user  = await db.getAsync('SELECT * FROM usuarios WHERE id = ?', [req.session.userId]);
    const match = await bcrypt.compare(senhaAtual, user.password);
    if (!match) return res.status(401).json({ error: 'Senha atual incorreta' });

    const hash = await bcrypt.hash(novaSenha, SALT_ROUNDS);
    await db.runAsync('UPDATE usuarios SET password = ? WHERE id = ?', [hash, user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[auth] trocar-senha:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
