/**
 * Configuración de base de datos
 * Soporta SQLite (desarrollo local) y PostgreSQL (producción/Railway)
 */

const path = require('path');

let db;
let isPostgres = false;

if (process.env.DATABASE_URL) {
  // 🔵 PRODUCCIÓN: PostgreSQL en Railway
  const { Pool } = require('pg');
  isPostgres = true;
  
  console.log(`\n🔧 Conectando a PostgreSQL en Railway...`);
  
  const normalizeSql = (sql) => {
    if (!sql.includes('?')) {
      return sql;
    }

    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
  };

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  // Probar la conexión
  pool.connect((err, client, release) => {
    if (err) {
      console.error('❌ Error conectando a PostgreSQL:', err.message);
      process.exit(1);
    } else {
      console.log('✅ PostgreSQL conectado correctamente');
      if (client) release();
    }
  });

  // Crear wrapper para compatibilidad con SQLite API
  db = {
    // Simular db.prepare(sql).get(params)
    prepare: (sql) => ({
      get: async (param) => {
        try {
          const params = typeof param === 'object' ? 
            (Array.isArray(param) ? param : Object.values(param)) : 
            [param];
          const result = await pool.query(normalizeSql(sql), params);
          return result.rows[0] || null;
        } catch (error) {
          console.error('❌ Error en prepare.get():', error);
          throw error;
        }
      },
      all: async (...params) => {
        try {
          const flatParams = params.flat();
          const result = await pool.query(normalizeSql(sql), flatParams);
          return result.rows;
        } catch (error) {
          console.error('❌ Error en prepare.all():', error);
          throw error;
        }
      },
      run: async (...params) => {
        try {
          const flatParams = params.flat();
          const result = await pool.query(normalizeSql(sql), flatParams);
          return {
            lastID: result.rows[0]?.id,
            changes: result.rowCount
          };
        } catch (error) {
          console.error('❌ Error en prepare.run():', error);
          throw error;
        }
      }
    }),
    
    // Ejecutar directamente
    exec: async (sql) => {
      try {
        await pool.query(sql);
      } catch (error) {
        console.error('❌ Error en exec():', error);
      }
    },
    
    // Método query directo para casos especiales
    query: (sql, params) => pool.query(sql, params),
    
    // Pool para cerrar si es necesario
    pool: pool,
    isPostgres: true
  };

} else {
  // 🔴 DESARROLLO: SQLite local
  const Database = require('better-sqlite3');
  
  console.log(`\n🔧 Inicializando base de datos local SQLite...`);

  const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '..', 'database.db');
  const sqliteDb = new Database(dbPath);

  // Habilitar foreign keys
  sqliteDb.pragma('journal_mode = WAL');

  // Crear tablas
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario TEXT UNIQUE NOT NULL,
      contraseña TEXT NOT NULL,
      rol TEXT NOT NULL CHECK(rol IN ('prospector','closer')),
      nombre TEXT NOT NULL,
      email TEXT,
      telefono TEXT,
      activo INTEGER DEFAULT 1,
      fechaCreacion TEXT DEFAULT (datetime('now')),
      googleRefreshToken TEXT,
      googleAccessToken TEXT,
      googleTokenExpiry REAL
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombres TEXT NOT NULL,
      apellidoPaterno TEXT NOT NULL,
      apellidoMaterno TEXT,
      telefono TEXT NOT NULL,
      correo TEXT NOT NULL,
      empresa TEXT,
      estado TEXT DEFAULT 'proceso' CHECK(estado IN ('ganado','perdido','proceso')),
      etapaEmbudo TEXT DEFAULT 'prospecto_nuevo',
      prospectorAsignado INTEGER REFERENCES usuarios(id),
      closerAsignado INTEGER REFERENCES usuarios(id),
      fechaTransferencia TEXT,
      fechaUltimaEtapa TEXT DEFAULT (datetime('now')),
      historialEmbudo TEXT,
      vendedorAsignado INTEGER NOT NULL REFERENCES usuarios(id),
      fechaRegistro TEXT DEFAULT (datetime('now')),
      ultimaInteraccion TEXT DEFAULT (datetime('now')),
      notas TEXT,
      interes INTEGER DEFAULT 0,
      proximaLlamada TEXT
    );

    CREATE TABLE IF NOT EXISTS actividades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL CHECK(tipo IN ('llamada','mensaje','correo','whatsapp','cita','prospecto')),
      vendedor INTEGER NOT NULL REFERENCES usuarios(id),
      cliente INTEGER NOT NULL REFERENCES clientes(id),
      fecha TEXT DEFAULT (datetime('now')),
      descripcion TEXT,
      resultado TEXT DEFAULT 'pendiente' CHECK(resultado IN ('exitoso','pendiente','fallido')),
      cambioEtapa INTEGER DEFAULT 0,
      etapaAnterior TEXT,
      etapaNueva TEXT,
      notas TEXT
    );

    CREATE TABLE IF NOT EXISTS tareas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      vendedor INTEGER REFERENCES usuarios(id),
      cliente INTEGER REFERENCES clientes(id),
      estado TEXT DEFAULT 'pendiente',
      prioridad TEXT DEFAULT 'media',
      fechaLimite TEXT,
      completada INTEGER DEFAULT 0,
      fechaCreacion TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente INTEGER NOT NULL REFERENCES clientes(id),
      vendedor INTEGER NOT NULL REFERENCES usuarios(id),
      monto REAL NOT NULL,
      fecha TEXT DEFAULT (datetime('now')),
      estado TEXT DEFAULT 'pendiente',
      notas TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_clientes_prospector ON clientes(prospectorAsignado);
    CREATE INDEX IF NOT EXISTS idx_clientes_vendedor ON clientes(vendedorAsignado);
    CREATE INDEX IF NOT EXISTS idx_actividades_vendedor ON actividades(vendedor);
    CREATE INDEX IF NOT EXISTS idx_actividades_fecha ON actividades(fecha);
    CREATE INDEX IF NOT EXISTS idx_actividades_cliente ON actividades(cliente);
  `);

  // Add new columns if they don't exist in existing DB
  try {
    sqliteDb.exec(`
          ALTER TABLE usuarios ADD COLUMN googleRefreshToken TEXT;
          ALTER TABLE usuarios ADD COLUMN googleAccessToken TEXT;
          ALTER TABLE usuarios ADD COLUMN googleTokenExpiry REAL;
      `);
  } catch (error) { }

  try {
    sqliteDb.exec(`ALTER TABLE clientes ADD COLUMN interes INTEGER DEFAULT 0;`);
  } catch (error) { }

  try {
    sqliteDb.exec(`ALTER TABLE clientes ADD COLUMN proximaLlamada TEXT;`);
  } catch (error) { }

  console.log(`✅ SQLite conectado de forma permanente: ${dbPath}\n`);
  
  // Para SQLite, usar la BD directamente (ya que tiene los métodos necesarios)
  db = sqliteDb;
  db.isPostgres = false;
}

// Exportar BD
module.exports = db;


