require('dotenv').config();
const express     = require('express');
const path        = require('path');
const fs          = require('fs');
const session     = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt      = require('bcrypt');
const cron        = require('node-cron');

const DEV = process.env.NODE_ENV !== 'production';

const { initDB, db }  = require('./database');
const { requireAuth } = require('./middleware/auth');
const promocoesRouter = require('./routes/promocoes');
const authRouter      = require('./routes/auth');
const { router: instagramRouter, renovarToken } = require('./routes/instagram');

const app  = express();
const PORT = process.env.PORT || 3000;

// Garante pastas necessárias
const uploadsDir       = path.join(__dirname, 'uploads');
const storiesExportDir = path.join(__dirname, 'public', 'stories-export');
[uploadsDir, storiesExportDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Live reload (dev only)
if (DEV) {
  const livereload        = require('livereload');
  const connectLivereload = require('connect-livereload');
  const lrServer = livereload.createServer();
  lrServer.watch(path.join(__dirname, 'public'));
  app.use(connectLivereload());
  console.log('  [livereload] ativo — monitorando public/');
}

// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sessão
const SESSION_TTL = parseInt(process.env.SESSION_TTL || '28800'); // 8h em segundos
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: __dirname }),
  name: 'sid',
  secret: process.env.SESSION_SECRET || 'tubooeste-troque-este-segredo',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'strict', maxAge: SESSION_TTL * 1000 },
}));

// ── Arquivos estáticos públicos ───────────────────────────
app.use('/uploads',        express.static(uploadsDir));
app.use('/assets',         express.static(path.join(__dirname, 'assets')));
app.use('/stories-export', express.static(storiesExportDir));

// Arquivos raiz (logo, favicon)
app.get('/logo.png', (req, res) => res.sendFile(path.join(__dirname, 'public', 'logo.png')));
app.get('/favicon.ico', (req, res) => {
  const p = path.join(__dirname, 'public', 'favicon.ico');
  if (fs.existsSync(p)) return res.sendFile(p);
  res.status(204).end();
});

// ── Auth ──────────────────────────────────────────────────
app.use('/auth', authRouter);

// GET /login
app.get('/login', (req, res) => {
  if (req.session?.userId) return res.redirect('/admin');
  res.sendFile(path.join(__dirname, 'public', 'login', 'index.html'));
});

// GET /setup — só ativo enquanto não houver usuário
app.get('/setup', async (req, res) => {
  const user = await db.getAsync('SELECT id FROM usuarios LIMIT 1').catch(() => null);
  if (user) return res.status(404).send('Not found');
  res.sendFile(path.join(__dirname, 'public', 'setup', 'index.html'));
});

// POST /setup
app.post('/setup', async (req, res) => {
  try {
    const user = await db.getAsync('SELECT id FROM usuarios LIMIT 1');
    if (user) return res.status(404).json({ error: 'Not found' });

    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Usuário e senha obrigatórios' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });

    const hash = await bcrypt.hash(password, 12);
    await db.runAsync('INSERT INTO usuarios (username, password) VALUES (?, ?)', [username, hash]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[setup]', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ── Rotas protegidas ──────────────────────────────────────
app.use('/admin',    requireAuth, express.static(path.join(__dirname, 'public', 'admin')));
app.use('/stories',  requireAuth, express.static(path.join(__dirname, 'public', 'stories')));
app.use('/display',  express.static(path.join(__dirname, 'public', 'display')));
app.use('/display2', express.static(path.join(__dirname, 'public', 'display2')));

app.use('/api/promocoes', requireAuth, promocoesRouter);
app.use('/api/instagram', requireAuth, instagramRouter);

// Raiz → admin
app.get('/', (req, res) => res.redirect('/admin'));

// ── Inicia tunnel (localtunnel) ───────────────────────────
async function startTunnel() {
  if (process.env.TUNNEL_DISABLED === 'true') {
    console.log('  [tunnel] desativado via TUNNEL_DISABLED=true');
    return;
  }
  const localtunnel = require('localtunnel');
  const subdomain   = process.env.TUNNEL_SUBDOMAIN || undefined;

  async function connect() {
    try {
      const tunnel = await localtunnel({ port: PORT, subdomain });
      const url = tunnel.url;

      await db.runAsync(
        `INSERT INTO config (chave, valor) VALUES ('ngrok_url', ?)
         ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`,
        [url]
      );
      console.log(`  tunnel:   ${url}`);

      tunnel.on('close', () => {
        console.warn('  [tunnel] conexão encerrada — reconectando em 5s...');
        setTimeout(connect, 5000);
      });
      tunnel.on('error', (err) => {
        console.error('  [tunnel] erro:', err.message);
      });
    } catch (err) {
      console.error('  [tunnel] falha ao conectar:', err.message, '— tentando novamente em 10s');
      setTimeout(connect, 10000);
    }
  }

  await connect();
}

// ── Boot ──────────────────────────────────────────────────
initDB().then(async () => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('  Tubo Oeste — Sistema de Promoções');
    console.log('  ───────────────────────────────────');
    console.log(`  Admin:    http://localhost:${PORT}/admin`);
    console.log(`  Display:  http://localhost:${PORT}/display`);
    console.log(`  Display2: http://localhost:${PORT}/display2`);
    console.log(`  Stories:  http://localhost:${PORT}/stories`);
    console.log(`  Setup:    http://localhost:${PORT}/setup  (apenas 1ª vez)`);
  });

  await startTunnel();

  // Verifica/renova token do Instagram diariamente às 03:00
  cron.schedule('0 3 * * *', renovarToken);
  await renovarToken(); // verifica também na inicialização

  console.log('');
}).catch(err => {
  console.error('Erro ao inicializar:', err);
  process.exit(1);
});
