const express    = require('express');
const cloudinary = require('cloudinary').v2;

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// POST /api/admin/upload
// Body: { data_url: string, folder?: string }
// Returns: { url: string }
router.post('/', async (req, res) => {
  try {
    const { data_url, folder = 'misc' } = req.body;
    if (!data_url) return res.status(400).json({ error: 'data_url é obrigatório' });

    const result = await cloudinary.uploader.upload(data_url, {
      folder: `promovix/${folder}`,
      resource_type: 'image',
    });
    res.json({ url: result.secure_url });
  } catch (err) {
    console.error('[upload]', err.message);
    res.status(500).json({ error: 'Erro ao fazer upload da imagem' });
  }
});

module.exports = router;
