require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const path         = require('path');
const cookieParser = require('cookie-parser');
const cron         = require('node-cron');

const authRouter      = require('./routes/auth');
const publicRouter    = require('./routes/public');
const lojasRouter     = require('./routes/lojas');
const promocoesRouter = require('./routes/promocoes');
const contaRouter     = require('./routes/conta');
const templatesRouter = require('./routes/templates');
const storiesRouter   = require('./routes/stories');
const uploadRouter    = require('./routes/upload');
const webhooksRouter  = require('./routes/webhooks');
const { requireAuth }   = require('./middleware/requireAuth');
const { requireActive } = require('./middleware/requireActive');
const { processarTrialsExpirados } = require('./jobs/trialExpiry');

const app  = express();
const PORT = process.env.PORT || 3000;

// CORS — permite frontend Vercel + localhost em dev
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── Rotas públicas ─────────────────────────────────────────
app.use('/api/auth',   authRouter);
app.use('/api/public', publicRouter);
app.use('/webhooks',   webhooksRouter);

// ── Rotas admin (auth + active required) ───────────────────
app.use('/api/admin/lojas',                   requireAuth, requireActive, lojasRouter);
app.use('/api/admin/lojas/:lojaId/promocoes', requireAuth, requireActive, promocoesRouter);
app.use('/api/admin/lojas/:lojaId/templates', requireAuth, requireActive, templatesRouter);
app.use('/api/admin/lojas/:lojaId/stories',   requireAuth, requireActive, storiesRouter);
app.use('/api/admin/conta',                   requireAuth, requireActive, contaRouter);
app.use('/api/admin/upload',                  requireAuth, requireActive, uploadRouter);

// ── Display TV (HTML puro, sem auth) ───────────────────────
// /tv/:slug e /tv/:slug/moderno servem o mesmo index.html
// O JS do cliente lê o slug da URL
app.get('/tv/:slug', (_, res) => res.sendFile(path.join(__dirname, 'public', 'tv', 'index.html')));
app.get('/tv/:slug/moderno', (_, res) => res.sendFile(path.join(__dirname, 'public', 'tv', 'moderno.html')));

// ── Health check ───────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true }));

// ── Cron — verifica trials expirados todo dia às 02:00 ─────
cron.schedule('0 2 * * *', processarTrialsExpirados);

// ── Boot ──────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  Promovix API');
  console.log('  ─────────────────────────────');
  console.log(`  http://localhost:${PORT}`);
  console.log('');
});
