const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');

const router = express.Router();

// ── Multer disco (uploads permanentes) ─────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use JPG, PNG ou WebP.'));
    }
  }
});

// ── Multer memória (processamento temporário) ───────────────
const uploadMem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function deleteImage(filename) {
  if (!filename) return;
  const p = path.join(__dirname, '..', 'uploads', filename);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

// ── GET /api/promocoes — todas (admin) ─────────────────────
router.get('/', async (req, res) => {
  try {
    const rows = await db.allAsync(
      'SELECT * FROM promocoes ORDER BY criado_em DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ── GET /api/promocoes/ativas — display TV ─────────────────
router.get('/ativas', async (req, res) => {
  try {
    const rows = await db.allAsync(`
      SELECT * FROM promocoes
      WHERE ativo = 1 AND date(data_validade) >= date('now')
      ORDER BY criado_em DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ── POST /api/promocoes/gerar-imagem — Hugging Face FLUX ───
router.post('/gerar-imagem', async (req, res) => {
  const { titulo } = req.body;
  if (!titulo || !titulo.trim())
    return res.status(400).json({ erro: 'Título obrigatório.' });

  const hfToken = process.env.HF_TOKEN;
  if (!hfToken || hfToken === 'SUA_CHAVE_AQUI')
    return res.status(500).json({ erro: 'HF_TOKEN não configurado no .env' });

  try {
    const prompt = `professional product photo of ${titulo.trim()}, isolated on white background, studio lighting, sharp focus, high quality`;

    const response = await fetch(
      'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: prompt }),
        signal: AbortSignal.timeout(90000),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error('[gerar-imagem] HF erro:', response.status, text);
      throw new Error(`Hugging Face retornou status ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const filename = `${uuidv4()}.jpg`;
    fs.writeFileSync(path.join(__dirname, '..', 'uploads', filename), buffer);

    res.json({ filename });
  } catch (err) {
    console.error('[gerar-imagem]', err);
    res.status(500).json({ erro: err.message || 'Erro ao gerar imagem.' });
  }
});

// ── POST /api/promocoes/remover-fundo — remove.bg ──────────
router.post('/remover-fundo', uploadMem.single('imagem'), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Imagem obrigatória.' });

  const apiKey = process.env.REMOVEBG_API_KEY;
  if (!apiKey || apiKey === 'SUA_CHAVE_AQUI')
    return res.status(500).json({ erro: 'REMOVEBG_API_KEY não configurada no .env' });

  try {
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    const formData = new FormData();
    formData.append('image_file', blob, req.file.originalname || 'image.jpg');
    formData.append('size', 'auto');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.errors?.[0]?.title || 'Erro ao remover fundo.');
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const filename = `${uuidv4()}.png`;
    fs.writeFileSync(path.join(__dirname, '..', 'uploads', filename), buffer);

    res.json({ filename });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ── POST /api/promocoes — criar ────────────────────────────
router.post('/', upload.single('imagem'), async (req, res) => {
  const { titulo, descricao, preco_de, preco_por, data_validade } = req.body;

  if (!titulo || !titulo.trim())
    return res.status(400).json({ erro: 'O título é obrigatório.' });
  if (!data_validade)
    return res.status(400).json({ erro: 'A data de validade é obrigatória.' });

  try {
    const imagem = req.file
      ? req.file.filename
      : (req.body.imagem_gerada || null);

    const result = await db.runAsync(
      `INSERT INTO promocoes (titulo, descricao, preco_de, preco_por, imagem, data_validade, ativo)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        titulo.trim(),
        descricao ? descricao.trim() : null,
        preco_de  ? parseFloat(preco_de)  : null,
        preco_por ? parseFloat(preco_por) : null,
        imagem,
        data_validade
      ]
    );
    const promo = await db.getAsync(
      'SELECT * FROM promocoes WHERE id = ?', [result.lastID]
    );
    res.status(201).json(promo);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ── PUT /api/promocoes/:id — editar / reativar ─────────────
router.put('/:id', upload.single('imagem'), async (req, res) => {
  try {
    const existing = await db.getAsync(
      'SELECT * FROM promocoes WHERE id = ?', [req.params.id]
    );
    if (!existing)
      return res.status(404).json({ erro: 'Promoção não encontrada.' });

    const titulo        = (req.body.titulo || existing.titulo).trim();
    const descricao     = req.body.descricao !== undefined
      ? (req.body.descricao ? req.body.descricao.trim() : null)
      : existing.descricao;
    const data_validade =  req.body.data_validade  || existing.data_validade;
    const ativo         = req.body.ativo !== undefined
      ? parseInt(req.body.ativo) : existing.ativo;
    const preco_de  = req.body.preco_de !== undefined
      ? (req.body.preco_de  ? parseFloat(req.body.preco_de)  : null)
      : existing.preco_de;
    const preco_por = req.body.preco_por !== undefined
      ? (req.body.preco_por ? parseFloat(req.body.preco_por) : null)
      : existing.preco_por;

    let imagem = existing.imagem;
    if (req.file) {
      deleteImage(existing.imagem);
      imagem = req.file.filename;
    } else if (req.body.imagem_gerada) {
      deleteImage(existing.imagem);
      imagem = req.body.imagem_gerada;
    } else if (req.body.remover_imagem === '1') {
      deleteImage(existing.imagem);
      imagem = null;
    }

    await db.runAsync(
      `UPDATE promocoes
       SET titulo = ?, descricao = ?, preco_de = ?, preco_por = ?, imagem = ?,
           data_validade = ?, ativo = ?
       WHERE id = ?`,
      [titulo, descricao, preco_de, preco_por, imagem, data_validade, ativo, req.params.id]
    );

    const updated = await db.getAsync(
      'SELECT * FROM promocoes WHERE id = ?', [req.params.id]
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ── DELETE /api/promocoes/:id ──────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.getAsync(
      'SELECT * FROM promocoes WHERE id = ?', [req.params.id]
    );
    if (!existing)
      return res.status(404).json({ erro: 'Promoção não encontrada.' });

    deleteImage(existing.imagem);
    await db.runAsync('DELETE FROM promocoes WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ── Multer error handler ───────────────────────────────────
router.use((err, req, res, next) => {
  if (err) return res.status(400).json({ erro: err.message });
  next(err);
});

module.exports = router;
