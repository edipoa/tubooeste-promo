const { db } = require('../database');

async function processarTrialsExpirados() {
  try {
    const result = await db.query(
      `UPDATE accounts SET status = 'suspended'
       WHERE status = 'trial' AND trial_ends_at < NOW()`
    );
    if (result.rowCount > 0)
      console.log(`[cron/trial] ${result.rowCount} conta(s) suspensa(s) por trial expirado`);
  } catch (err) {
    console.error('[cron/trial] Erro:', err.message);
  }
}

module.exports = { processarTrialsExpirados };
