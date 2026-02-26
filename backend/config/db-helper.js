/**
 * Helper LIMPIO para PostgreSQL
 * Simplifica las queries (SOLO POSTGRESQL)
 */

const pool = require('./database');

const dbHelper = {
  /**
   * Obtener una sola fila
   * @param {string} sql - Query SQL con placeholders $1, $2, etc.
   * @param {array} params - Parámetros
   */
  async getOne(sql, params = []) {
    try {
      const result = await pool.query(sql, params);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ dbHelper.getOne Error:', sql);
      console.error('   Params:', params);
      console.error('   Message:', error.message);
      throw error;
    }
  },

  /**
   * Obtener múltiples filas
   * @param {string} sql - Query SQL
   * @param {array} params - Parámetros
   */
  async getAll(sql, params = []) {
    try {
      const result = await pool.query(sql, params);
      return result.rows || [];
    } catch (error) {
      console.error('❌ dbHelper.getAll Error:', sql);
      console.error('   Params:', params);
      console.error('   Message:', error.message);
      throw error;
    }
  },

  /**
   * Ejecutar INSERT, UPDATE, DELETE
   * @param {string} sql - Query SQL
   * @param {array} params - Parámetros
   */
  async run(sql, params = []) {
    try {
      const result = await pool.query(sql, params);
      return {
        lastID: result.rows[0]?.id || null,
        changes: result.rowCount
      };
    } catch (error) {
      console.error('❌ dbHelper.run Error:', sql);
      console.error('   Params:', params);
      console.error('   Message:', error.message);
      throw error;
    }
  },

  /**
   * Query directo (para queries complejas)
   */
  async query(sql, params = []) {
    try {
      return await pool.query(sql, params);
    } catch (error) {
      console.error('❌ dbHelper.query Error:', sql);
      console.error('   Params:', params);
      console.error('   Message:', error.message);
      throw error;
    }
  }
};

module.exports = dbHelper;
