require('dotenv').config();
const express = require('express');
const path    = require('path');
const fs      = require('fs');
const { initDB } = require('./database');
const promocoesRouter = require('./routes/promocoes');

const app  = express();
const PORT = process.env.PORT || 3000;

// Garante que a pasta de uploads existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Arquivos estáticos
app.use('/uploads', express.static(uploadsDir));
app.use('/assets',  express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin',    express.static(path.join(__dirname, 'public', 'admin')));
app.use('/display',  express.static(path.join(__dirname, 'public', 'display')));
app.use('/display2', express.static(path.join(__dirname, 'public', 'display2')));
app.use('/stories',  express.static(path.join(__dirname, 'public', 'stories')));

// API
app.use('/api/promocoes', promocoesRouter);

// Raiz → admin
app.get('/', (req, res) => res.redirect('/admin'));

// Inicializa banco e sobe servidor
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('  Tubo Oeste — Sistema de Promoções');
    console.log('  ───────────────────────────────────');
    console.log(`  Admin:    http://localhost:${PORT}/admin`);
    console.log(`  Display:  http://localhost:${PORT}/display`);
    console.log(`  Display2: http://localhost:${PORT}/display2`);
    console.log(`  Stories:  http://localhost:${PORT}/stories`);
    console.log('');
  });
}).catch(err => {
  console.error('Erro ao inicializar:', err);
  process.exit(1);
});
