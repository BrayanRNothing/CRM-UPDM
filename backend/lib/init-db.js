/**
 * Script de inicialización de base de datos
 * Crea tablas en PostgreSQL automáticamente
 */

const db = require('./lib/db');

const isProd = process.env.NODE_ENV === 'production';

async function initDatabase() {
    try {
        console.log('🔧 Inicializando base de datos...');

        if (isProd && process.env.DATABASE_URL) {
            console.log('📊 Usando PostgreSQL - Creando schema...');
            
            // Crear tablas en PostgreSQL
            const createTablesSQL = `
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                usuario TEXT UNIQUE NOT NULL,
                contraseña TEXT NOT NULL,
                rol TEXT NOT NULL CHECK(rol IN ('prospector','closer')),
                nombre TEXT NOT NULL,
                email TEXT UNIQUE,
                telefono TEXT,
                activo INTEGER DEFAULT 1,
                fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                googleRefreshToken TEXT,
                googleAccessToken TEXT,
                googleTokenExpiry DOUBLE PRECISION
            );

            CREATE TABLE IF NOT EXISTS clientes (
                id SERIAL PRIMARY KEY,
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
                fechaTransferencia TIMESTAMP,
                fechaUltimaEtapa TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                historialEmbudo TEXT,
                vendedorAsignado INTEGER NOT NULL REFERENCES usuarios(id),
                fechaRegistro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ultimaInteraccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notas TEXT,
                interes INTEGER DEFAULT 0,
                proximaLlamada TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS actividades (
                id SERIAL PRIMARY KEY,
                tipo TEXT NOT NULL CHECK(tipo IN ('llamada','reunion','email','whatsapp','otro')),
                resultado TEXT,
                cliente INTEGER NOT NULL REFERENCES clientes(id),
                usuario INTEGER NOT NULL REFERENCES usuarios(id),
                descripcion TEXT,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                duracion INTEGER
            );

            CREATE TABLE IF NOT EXISTS tareas (
                id SERIAL PRIMARY KEY,
                descripcion TEXT NOT NULL,
                estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente','completada','cancelada')),
                cliente INTEGER REFERENCES clientes(id),
                usuario INTEGER NOT NULL REFERENCES usuarios(id),
                fechaAsignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fechaVencimiento TIMESTAMP,
                fechaCompletacion TIMESTAMP,
                prioridad TEXT DEFAULT 'normal' CHECK(prioridad IN ('baja','normal','alta','urgente'))
            );

            CREATE TABLE IF NOT EXISTS ventas (
                id SERIAL PRIMARY KEY,
                cliente INTEGER NOT NULL REFERENCES clientes(id),
                monto DECIMAL(12, 2),
                estado TEXT DEFAULT 'abierta' CHECK(estado IN ('abierta','ganada','perdida')),
                fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fechaCierre TIMESTAMP,
                usuario INTEGER NOT NULL REFERENCES usuarios(id),
                descripcion TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_clientes_prospector ON clientes(prospectorAsignado);
            CREATE INDEX IF NOT EXISTS idx_clientes_closer ON clientes(closerAsignado);
            CREATE INDEX IF NOT EXISTS idx_actividades_cliente ON actividades(cliente);
            CREATE INDEX IF NOT EXISTS idx_actividades_usuario ON actividades(usuario);
            CREATE INDEX IF NOT EXISTS idx_tareas_usuario ON tareas(usuario);
            CREATE INDEX IF NOT EXISTS idx_ventas_usuario ON ventas(usuario);
            `;

            // Ejecutar cada comando por separado
            const statements = createTablesSQL.split(';').filter(s => s.trim());
            for (const statement of statements) {
                try {
                    await db.db.query(statement);
                } catch (error) {
                    // Ignorar errores de "ya existe"
                    if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
                        console.warn('⚠️ Advertencia:', error.message);
                    }
                }
            }

            console.log('✅ Schema PostgreSQL inicializado');
        } else {
            console.log('🗄️ Usando SQLite - Schema ya inicializado en database.js');
        }

        console.log('✅ Base de datos lista');
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error.message);
        throw error;
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    initDatabase().then(() => {
        console.log('✅ Inicialización completada');
        process.exit(0);
    }).catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
}

module.exports = initDatabase;
