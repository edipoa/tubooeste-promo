const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const db = {
  query: (text, params) => pool.query(text, params),

  async getOne(text, params) {
    const { rows } = await pool.query(text, params);
    return rows[0] || null;
  },

  async getAll(text, params) {
    const { rows } = await pool.query(text, params);
    return rows;
  },
};

module.exports = { db, pool };
