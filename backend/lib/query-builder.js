/**
 * Herramientas para manejar queries dinámicas con placeholders
 */

/**
 * Construye una query con placeholders dinámicos $1, $2, etc.
 * Útil para WHERE con condiciones variables
 * 
 * Ejemplo:
 *   const { sql, params } = buildDynamicQuery(
 *     'SELECT * FROM clientes WHERE 1=1',
 *     [
 *       { condition: prospectorId, sql: ' AND prospectorAsignado = ?' },
 *       { condition: etapa, sql: ' AND etapaEmbudo = ?' }
 *     ]
 *   )
 *   // Result: { sql: 'SELECT * FROM clientes WHERE 1=1 AND prospectorAsignado = $1 AND etapaEmbudo = $2', params: [prospectorId, etapa] }
 */
function buildDynamicQuery(baseSql, conditions = []) {
  let sql = baseSql;
  const params = [];
  let paramIndex = 1;

  for (const cond of conditions) {
    if (cond.condition !== null && cond.condition !== undefined && cond.condition !== '') {
      // Reemplazar ? con $N en la condición
      const condSql = cond.sql.replace(/\?/g, () => `$${paramIndex++}`);
      sql += condSql;

      // Agregar el parámetro
      if (Array.isArray(cond.values)) {
        params.push(...cond.values);
      } else {
        params.push(cond.values || cond.condition);
      }
    }
  }

  return { sql, params };
}

/**
 * Construye un UPDATE dinámico
 * 
 * Ejemplo:
 *   const { sql, params } = buildUpdate('tareas', 
 *     { estado: 'completada', titulo: 'Nuevo título' },
 *     { id_col: 'id', id_val: 123 }
 *   )
 */
function buildUpdate(table, updates = {}, where = {}) {
  if (Object.keys(updates).length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  const setClauses = [];
  const params = [];
  let paramIndex = 1;

  // Construir SET
  for (const [key, value] of Object.entries(updates)) {
    setClauses.push(`${key} = $${paramIndex++}`);
    params.push(value);
  }

  // Construir WHERE
  const whereClauses = [];
  for (const [key, value] of Object.entries(where)) {
    whereClauses.push(`${key} = $${paramIndex++}`);
    params.push(value);
  }

  const sql = `UPDATE ${table} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`;
  return { sql, params };
}

module.exports = {
  buildDynamicQuery,
  buildUpdate
};
