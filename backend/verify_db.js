#!/usr/bin/env node

/**
 * Script para verificar la estructura de la BD
 */

require('dotenv').config();
const { Pool } = require('pg');

async function verifyDatabase() {
    if (!process.env.DATABASE_URL) {
        console.log('❌ DATABASE_URL no configurada');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('📋 Verificando estructura de la BD en Railway...\n');

        // Obtener todas las tablas
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        console.log('📊 Tablas:');
        for (const row of tablesResult.rows) {
            console.log(`  ✓ ${row.table_name}`);
        }

        // Verificar columnas de cada tabla
        const tables = ['usuarios', 'clientes', 'actividades', 'tareas', 'ventas'];

        for (const table of tables) {
            const columnsResult = await pool.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [table]);

            console.log(`\n📍 Tabla: ${table}`);
            for (const col of columnsResult.rows) {
                const nullable = col.is_nullable === 'YES' ? '(nullable)' : '';
                console.log(`    • ${col.column_name}: ${col.data_type} ${nullable}`);
            }
        }

        // Verificar usuarios de prueba
        console.log('\n👤 Usuarios de prueba:');
        const usersResult = await pool.query('SELECT id, usuario, rol FROM usuarios');
        for (const user of usersResult.rows) {
            console.log(`    • ${user.usuario} (${user.rol})`);
        }

        console.log('\n✅ Base de datos verificada correctamente');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

verifyDatabase();
