#!/usr/bin/env node

/**
 * Script para limpiar y reinicializar la base de datos
 * Usa: node backend/cleanup_db.js
 */

require('dotenv').config();
const { Pool } = require('pg');

async function cleanDatabase() {
    if (!process.env.DATABASE_URL) {
        console.log('⚠️ DATABASE_URL no configurada. Verifica tu .env');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🧹 Limpiando base de datos de Railway...');
        
        // 1. Eliminar todas las tablas
        console.log('🗑️ Eliminando tablas existentes...');
        const dropSQL = `
            DROP TABLE IF EXISTS ventas CASCADE;
            DROP TABLE IF EXISTS tareas CASCADE;
            DROP TABLE IF EXISTS actividades CASCADE;
            DROP TABLE IF EXISTS clientes CASCADE;
            DROP TABLE IF EXISTS usuarios CASCADE;
        `;

        const dropStatements = dropSQL.split(';').filter(s => s.trim());
        for (const statement of dropStatements) {
            await pool.query(statement);
        }
        console.log('✅ Tablas eliminadas');

        // 2. Recrear schema limpio (IGUAL a SQLite)
        console.log('🔨 Recreando schema...');
        const createTablesSQL = `
            CREATE TABLE usuarios (
                id SERIAL PRIMARY KEY,
                usuario TEXT UNIQUE NOT NULL,
                contraseña TEXT NOT NULL,
                rol TEXT NOT NULL CHECK(rol IN ('prospector','closer')),
                nombre TEXT NOT NULL,
                email TEXT,
                telefono TEXT,
                activo INTEGER DEFAULT 1,
                fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                googleRefreshToken TEXT,
                googleAccessToken TEXT,
                googleTokenExpiry DOUBLE PRECISION
            );

            CREATE TABLE clientes (
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

            CREATE TABLE actividades (
                id SERIAL PRIMARY KEY,
                tipo TEXT NOT NULL CHECK(tipo IN ('llamada','mensaje','correo','whatsapp','cita','prospecto')),
                vendedor INTEGER NOT NULL REFERENCES usuarios(id),
                cliente INTEGER NOT NULL REFERENCES clientes(id),
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                descripcion TEXT,
                resultado TEXT DEFAULT 'pendiente' CHECK(resultado IN ('exitoso','pendiente','fallido')),
                cambioEtapa INTEGER DEFAULT 0,
                etapaAnterior TEXT,
                etapaNueva TEXT,
                notas TEXT
            );

            CREATE TABLE tareas (
                id SERIAL PRIMARY KEY,
                titulo TEXT NOT NULL,
                descripcion TEXT,
                vendedor INTEGER REFERENCES usuarios(id),
                cliente INTEGER REFERENCES clientes(id),
                estado TEXT DEFAULT 'pendiente',
                prioridad TEXT DEFAULT 'media',
                fechaLimite TIMESTAMP,
                completada INTEGER DEFAULT 0,
                fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE ventas (
                id SERIAL PRIMARY KEY,
                cliente INTEGER NOT NULL REFERENCES clientes(id),
                vendedor INTEGER NOT NULL REFERENCES usuarios(id),
                monto DECIMAL(12, 2),
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                estado TEXT DEFAULT 'pendiente',
                notas TEXT
            );

            CREATE INDEX idx_clientes_prospector ON clientes(prospectorAsignado);
            CREATE INDEX idx_clientes_vendedor ON clientes(vendedorAsignado);
            CREATE INDEX idx_actividades_vendedor ON actividades(vendedor);
            CREATE INDEX idx_actividades_fecha ON actividades(fecha);
            CREATE INDEX idx_actividades_cliente ON actividades(cliente);
        `;

        const createStatements = createTablesSQL.split(';').filter(s => s.trim());
        for (const statement of createStatements) {
            await pool.query(statement);
        }
        console.log('✅ Schema recreado');

        // 3. Crear usuarios de prueba
        console.log('👤 Creando usuarios de prueba...');
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        
        const usuarios = [
            {
                usuario: 'prospector',
                contraseña: await bcrypt.hash('prospector123', salt),
                rol: 'prospector',
                nombre: 'Usuario Prospector',
                email: 'prospector@test.com'
            },
            {
                usuario: 'closer',
                contraseña: await bcrypt.hash('closer123', salt),
                rol: 'closer',
                nombre: 'Usuario Closer',
                email: 'closer@test.com'
            }
        ];

        for (const user of usuarios) {
            await pool.query(
                'INSERT INTO usuarios (usuario, contraseña, rol, nombre, email) VALUES ($1, $2, $3, $4, $5)',
                [user.usuario, user.contraseña, user.rol, user.nombre, user.email]
            );
        }
        console.log('✅ Usuarios de prueba creados');

        console.log('\n🎉 Base de datos limpiada y reinicializada exitosamente');
        console.log('\n📝 Credenciales de prueba:');
        console.log('   • prospector / prospector123');
        console.log('   • closer / closer123');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

cleanDatabase();
