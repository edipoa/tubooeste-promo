const sqlite3 = require('sqlite3').verbose();
const path    = require('path');

const DB_PATH = path.join(__dirname, 'promocoes.db');

const db = new sqlite3.Database(DB_PATH, err => {
  if (err) {
    console.error('[DB] Erro ao abrir banco:', err.message);
    process.exit(1);
  }
  console.log('[DB] Banco inicializado em', DB_PATH);
});

// Helpers que retornam Promises para usar com async/await
db.runAsync = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    })
  );

db.getAsync = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    })
  );

db.allAsync = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    })
  );

async function initDB() {
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS promocoes (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo        TEXT    NOT NULL,
      descricao     TEXT,
      preco_de      REAL,
      preco_por     REAL,
      imagem        TEXT,
      data_validade TEXT    NOT NULL,
      ativo         INTEGER NOT NULL DEFAULT 1,
      criado_em     TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  // Migração: adiciona coluna descricao se o banco já existia sem ela
  await db.runAsync(`ALTER TABLE promocoes ADD COLUMN descricao TEXT`)
    .catch(() => {}); // ignora se coluna já existe
}

module.exports = { db, initDB };
