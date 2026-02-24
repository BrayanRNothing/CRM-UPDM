/**
 * Abstracción de base de datos
 * Soporta SQLite (desarrollo) y PostgreSQL (producción)
 */

const isProd = process.env.NODE_ENV === 'production';

let db = null;

if (isProd && process.env.DATABASE_URL) {
    // PostgreSQL en producción
    const { Client, Pool } = require('pg');
    db = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    db.query('SELECT NOW()')
        .then(() => console.log('✅ PostgreSQL conectado'))
        .catch(err => {
            console.error('❌ Error conectando PostgreSQL:', err.message);
            process.exit(1);
        });
} else {
    // SQLite en desarrollo
    const Database = require('better-sqlite3');
    const path = require('path');
    
    const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '..', 'database.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    
    console.log('✅ SQLite conectado');
}

/**
 * Ejecutar query (SELECT) - retorna array de filas
 */
async function query(sql, params = []) {
    try {
        if (isProd) {
            // PostgreSQL
            const result = await db.query(sql, params);
            return result.rows;
        } else {
            // SQLite
            return db.prepare(sql).all(...params);
        }
    } catch (error) {
        console.error('❌ Error en query:', error.message);
        console.error('SQL:', sql);
        console.error('Params:', params);
        throw error;
    }
}

/**
 * Ejecutar query (SELECT) - retorna una sola fila
 */
async function queryOne(sql, params = []) {
    try {
        if (isProd) {
            // PostgreSQL
            const result = await db.query(sql, params);
            return result.rows[0];
        } else {
            // SQLite
            return db.prepare(sql).get(...params);
        }
    } catch (error) {
        console.error('❌ Error en queryOne:', error.message);
        throw error;
    }
}

/**
 * Ejecutar query (INSERT, UPDATE, DELETE) - retorna numero de filas afectadas
 */
async function run(sql, params = []) {
    try {
        if (isProd) {
            // PostgreSQL
            const result = await db.query(sql, params);
            return result.rowCount;
        } else {
            // SQLite
            const stmt = db.prepare(sql);
            const result = stmt.run(...params);
            return result.changes;
        }
    } catch (error) {
        console.error('❌ Error en run:', error.message);
        console.error('SQL:', sql);
        throw error;
    }
}

/**
 * Ejecutar query con RETURNING (PostgreSQL) o lastID (SQLite)
 */
async function insertOne(sql, params = []) {
    try {
        if (isProd) {
            // PostgreSQL - asume RETURNING id al final
            const result = await db.query(sql, params);
            return result.rows[0];
        } else {
            // SQLite
            const stmt = db.prepare(sql);
            const result = stmt.run(...params);
            return { id: result.lastInsertRowid };
        }
    } catch (error) {
        console.error('❌ Error en insertOne:', error.message);
        throw error;
    }
}

/**
 * Ejecutar múltiples queries en transacción
 */
async function transaction(callback) {
    try {
        if (isProd) {
            // PostgreSQL
            const client = await db.connect();
            try {
                await client.query('BEGIN');
                const result = await callback(client);
                await client.query('COMMIT');
                return result;
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } else {
            // SQLite
            db.exec('BEGIN TRANSACTION');
            try {
                const result = await callback(db);
                db.exec('COMMIT');
                return result;
            } catch (error) {
                db.exec('ROLLBACK');
                throw error;
            }
        }
    } catch (error) {
        console.error('❌ Error en transacción:', error.message);
        throw error;
    }
}

module.exports = {
    query,
    queryOne,
    run,
    insertOne,
    transaction,
    isProd,
    db
};
