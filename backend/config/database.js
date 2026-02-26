/**
 * Configuración de base de datos - POSTGRESQL LIMPIO
 * Reescrito desde 0 (SOLO POSTGRESQL)
 */

const { Pool } = require('pg');

console.log(`\n🔧 Conectando a PostgreSQL...`);

if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL no está configurada');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('❌ Error en PostgreSQL pool:', err);
});

(async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL conectado correctamente\n');
  } catch (err) {
    console.error('❌ Error conectando a PostgreSQL:', err.message);
    process.exit(1);
  }
})();

module.exports = pool;


