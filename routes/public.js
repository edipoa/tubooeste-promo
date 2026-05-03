const express = require('express');
const { db }  = require('../database');

const router = express.Router();

// GET /api/public/:slug/branding
router.get('/:slug/branding', async (req, res) => {
  try {
    const loja = await db.getOne(
      `SELECT l.nome, l.cor_primaria, l.cor_secundaria, l.logo_url, l.telefone,
              l.fallback_tagline, l.fallback_cidade, l.fallback_categorias
       FROM lojas l
       WHERE l.slug = $1`,
      [req.params.slug]
    );
    if (!loja) return res.status(404).json({ error: 'Loja não encontrada' });
    res.json(loja);
  } catch (err) {
    console.error('[public/branding]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/public/:slug/promocoes
router.get('/:slug/promocoes', async (req, res) => {
  try {
    const loja = await db.getOne('SELECT id FROM lojas WHERE slug = $1', [req.params.slug]);
    if (!loja) return res.status(404).json({ error: 'Loja não encontrada' });

    const promocoes = await db.getAll(
      `SELECT id, titulo, descricao, preco_de, preco_por, imagem_url, data_validade
       FROM promocoes
       WHERE loja_id = $1
         AND ativo = TRUE
         AND (data_validade IS NULL OR data_validade >= CURRENT_DATE)
       ORDER BY criado_em DESC`,
      [loja.id]
    );
    res.json(promocoes);
  } catch (err) {
    console.error('[public/promocoes]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
