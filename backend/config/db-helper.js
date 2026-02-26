/**
 * Helper para queries de base de datos
 * Funciona con SQLite y PostgreSQL
 */

const db = require('./database');

const isPostgres = db.isPostgres || !!process.env.DATABASE_URL;

const normalizeSql = (sql) => {
  if (!isPostgres) {
    return sql;
  }

  if (!sql.includes('?')) {
    return sql;
  }

  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
};

const dbHelper = {
  /**
   * Obtener una sola fila
   * @param {string} sql - Query SQL con placeholders (? para SQLite, $1/$2 para PG)
   * @param {array} params - Parámetros
   */
  async getOne(sql, params = []) {
    try {
      if (isPostgres) {
        const result = await db.query(normalizeSql(sql), params);
        return result.rows?.[0] || null;
      } else {
        const stmt = db.prepare(sql);
        return stmt.get(...params) || null;
      }
    } catch (error) {
      console.error('❌ Error en getOne:', error);
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
      if (isPostgres) {
        const result = await db.query(normalizeSql(sql), params);
        return Array.isArray(result.rows) ? result.rows : [];
      } else {
        const stmt = db.prepare(sql);
        return stmt.all(...params);
      }
    } catch (error) {
      console.error('❌ Error en getAll:', error);
      throw error;
    }
  },

  /**
   * Ejecutar INSERT, UPDATE, DELETE
   * @param {string} sql - Query SQL
   * @param {array} params - Parámetros
   * @returns {object} - { lastID, changes }
   */
  async run(sql, params = []) {
    try {
      if (isPostgres) {
        const result = await db.query(normalizeSql(sql), params);
        // Para INSERT, necesitamos RETURNING id
        return {
          lastID: result.rows[0]?.id || null,
          changes: result.rowCount
        };
      } else {
        const stmt = db.prepare(sql);
        const info = stmt.run(...params);
        return {
          lastID: info.lastInsertRowid,
          changes: info.changes
        };
      }
    } catch (error) {
      console.error('❌ Error en run:', error);
      throw error;
    }
  },

  /**
   * Obtener una sola fila y la última ID insertada
   * (Para crear recurso y devolverlo)
   */
  async getOneWithId(sql, params = []) {
    try {
      if (db.isPostgres) {
        const result = await db.query(normalizeSql(sql), params);
        return result.rows[0] || null;
      } else {
        const stmt = db.prepare(sql);
        return stmt.get(...params) || null;
      }
    } catch (error) {
      console.error('❌ Error en getOneWithId:', error);
      throw error;
    }
  }
};

module.exports = dbHelper;
