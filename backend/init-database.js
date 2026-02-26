/**
 * Script de inicialización de BD
 * Se ejecuta una sola vez cuando el servidor inicia
 */

const pool = require('./config/database');

async function initializeDatabase() {
  try {
    console.log('\n🔧 Verificando/creando schema PostgreSQL...\n');

    // Drop tablas viejas (solo para desarrollo)
    await pool.query('DROP TABLE IF EXISTS actividades CASCADE');
    await pool.query('DROP TABLE IF EXISTS ventas CASCADE');
    await pool.query('DROP TABLE IF EXISTS tareas CASCADE');
    await pool.query('DROP TABLE IF EXISTS clientes CASCADE');
    await pool.query('DROP TABLE IF EXISTS usuarios CASCADE');

    // Crear tabla usuarios
    await pool.query(`
      CREATE TABLE usuarios (
        id SERIAL PRIMARY KEY,
        usuario VARCHAR(255) UNIQUE NOT NULL,
        contraseña VARCHAR(255) NOT NULL,
        rol VARCHAR(50) NOT NULL CHECK(rol IN ('prospector','closer','admin')),
        nombre VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        telefono VARCHAR(20),
        activo INTEGER DEFAULT 1,
        fechaCreacion TIMESTAMP DEFAULT NOW(),
        googleRefreshToken TEXT,
        googleAccessToken TEXT,
        googleTokenExpiry BIGINT
      )
    `);

    // Crear tabla clientes
    await pool.query(`
      CREATE TABLE clientes (
        id SERIAL PRIMARY KEY,
        nombres VARCHAR(255) NOT NULL,
        apellidoPaterno VARCHAR(255) NOT NULL,
        apellidoMaterno VARCHAR(255),
        telefono VARCHAR(20) NOT NULL,
        correo VARCHAR(255) NOT NULL,
        empresa VARCHAR(255),
        estado VARCHAR(50) DEFAULT 'proceso' CHECK(estado IN ('ganado','perdido','proceso')),
        etapaEmbudo VARCHAR(50) DEFAULT 'prospecto_nuevo',
        prospectorAsignado INTEGER REFERENCES usuarios(id),
        closerAsignado INTEGER REFERENCES usuarios(id),
        vendedorAsignado INTEGER NOT NULL REFERENCES usuarios(id),
        fechaTransferencia TIMESTAMP,
        fechaUltimaEtapa TIMESTAMP DEFAULT NOW(),
        fechaRegistro TIMESTAMP DEFAULT NOW(),
        ultimaInteraccion TIMESTAMP DEFAULT NOW(),
        historialEmbudo TEXT DEFAULT '[]',
        notas TEXT,
        interes INTEGER DEFAULT 0,
        proximaLlamada TIMESTAMP
      )
    `);

    // Crear table actividades
    await pool.query(`
      CREATE TABLE actividades (
        id SERIAL PRIMARY KEY,
        tipo VARCHAR(50) NOT NULL CHECK(tipo IN ('llamada','mensaje','correo','whatsapp','cita','prospecto')),
        vendedor INTEGER NOT NULL REFERENCES usuarios(id),
        cliente INTEGER NOT NULL REFERENCES clientes(id),
        fecha TIMESTAMP DEFAULT NOW(),
        descripcion TEXT,
        resultado VARCHAR(50) DEFAULT 'pendiente' CHECK(resultado IN ('exitoso','pendiente','fallido')),
        cambioEtapa INTEGER DEFAULT 0,
        etapaAnterior VARCHAR(50),
        etapaNueva VARCHAR(50),
        notas TEXT
      )
    `);

    // Crear table tareas
    await pool.query(`
      CREATE TABLE tareas (
        id SERIAL PRIMARY KEY,
        titulo VARCHAR(255) NOT NULL,
        descripcion TEXT,
        vendedor INTEGER REFERENCES usuarios(id),
        cliente INTEGER REFERENCES clientes(id),
        estado VARCHAR(50) DEFAULT 'pendiente',
        prioridad VARCHAR(50) DEFAULT 'media',
        fechaLimite TIMESTAMP,
        completada INTEGER DEFAULT 0,
        fechaCreacion TIMESTAMP DEFAULT NOW()
      )
    `);

    //Crear table ventas
    await pool.query(`
      CREATE TABLE ventas (
        id SERIAL PRIMARY KEY,
        cliente INTEGER NOT NULL REFERENCES clientes(id),
        vendedor INTEGER NOT NULL REFERENCES usuarios(id),
        monto DECIMAL(10,2) NOT NULL,
        fecha TIMESTAMP DEFAULT NOW(),
        estado VARCHAR(50) DEFAULT 'pendiente',
        notas TEXT
      )
    `);

    // Crear índices
    await pool.query('CREATE INDEX idx_clientes_prospector ON clientes(prospectorAsignado)');
    await pool.query('CREATE INDEX idx_clientes_vendedor ON clientes(vendedorAsignado)');
    await pool.query('CREATE INDEX idx_clientes_closer ON clientes(closerAsignado)');
    await pool.query('CREATE INDEX idx_actividades_vendedor ON actividades(vendedor)');
    await pool.query('CREATE INDEX idx_actividades_fecha ON actividades(fecha)');
    await pool.query('CREATE INDEX idx_actividades_cliente ON actividades(cliente)');
    await pool.query('CREATE INDEX idx_tareas_vendedor ON tareas(vendedor)');
    await pool.query('CREATE INDEX idx_tareas_estado ON tareas(estado)');

    console.log('✅ Schema creado correctamente');

    // Insertar usuario de prueba
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash('admin123', 10);

    await pool.query(`
      INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono, activo)
      VALUES ($1, $2, $3, $4, $5, $6, 1)
      ON CONFLICT (usuario) DO NOTHING
    `, ['admin', hashed, 'prospector', 'Admin Test', 'admin@test.com', '1234567890']);

    console.log('✅ Usuario de prueba creado (usuario: admin / contraseña: admin123)\n');

  } catch (error) {
    console.error('❌ Error inicializando BD:', error.message);
    // No salir del proceso, dejar que continúe
  }
}

module.exports = { initializeDatabase };
