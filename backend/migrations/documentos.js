import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Migración para agregar soporte de documentos sincronizados
 * Agrega columnas JSON para almacenar documentos e historial
 */
export function migrarDocumentos(db) {
    console.log('🔄 Iniciando migración de documentos...');

    try {
        // Agregar columna para almacenar documentos (JSON)
        try {
            db.exec(`ALTER TABLE servicios ADD COLUMN documentos TEXT DEFAULT '[]'`);
            console.log('✅ Columna "documentos" agregada');
        } catch (e) {
            if (e.message.includes('duplicate column name')) {
                console.log('ℹ️  Columna "documentos" ya existe');
            } else {
                throw e;
            }
        }

        // Agregar columna para almacenar historial (JSON)
        try {
            db.exec(`ALTER TABLE servicios ADD COLUMN historial TEXT DEFAULT '[]'`);
            console.log('✅ Columna "historial" agregada');
        } catch (e) {
            if (e.message.includes('duplicate column name')) {
                console.log('ℹ️  Columna "historial" ya existe');
            } else {
                throw e;
            }
        }

        // Inicializar columnas vacías para registros existentes
        const updateStmt = db.prepare(`
      UPDATE servicios 
      SET documentos = '[]', historial = '[]' 
      WHERE documentos IS NULL OR historial IS NULL
    `);
        const result = updateStmt.run();

        if (result.changes > 0) {
            console.log(`✅ ${result.changes} registros actualizados con valores por defecto`);
        }

        console.log('✅ Migración de documentos completada exitosamente');
        return true;
    } catch (error) {
        console.error('❌ Error en migración de documentos:', error);
        throw error;
    }
}

/**
 * Helpers para trabajar con documentos en SQLite
 */
export const DocumentoHelpers = {
    /**
     * Obtener documentos de un servicio
     */
    obtenerDocumentos(db, servicioId) {
        const stmt = db.prepare('SELECT documentos FROM servicios WHERE id = ?');
        const row = stmt.get(servicioId);

        if (!row) {
            throw new Error(`Servicio ${servicioId} no encontrado`);
        }

        try {
            return JSON.parse(row.documentos || '[]');
        } catch (e) {
            console.error('Error parseando documentos:', e);
            return [];
        }
    },

    /**
     * Agregar documento a un servicio
     */
    agregarDocumento(db, servicioId, documento) {
        const documentos = this.obtenerDocumentos(db, servicioId);
        documentos.push(documento);

        const stmt = db.prepare('UPDATE servicios SET documentos = ? WHERE id = ?');
        stmt.run(JSON.stringify(documentos), servicioId);

        return documentos;
    },

    /**
     * Obtener historial de un servicio
     */
    obtenerHistorial(db, servicioId) {
        const stmt = db.prepare('SELECT historial FROM servicios WHERE id = ?');
        const row = stmt.get(servicioId);

        if (!row) {
            throw new Error(`Servicio ${servicioId} no encontrado`);
        }

        try {
            return JSON.parse(row.historial || '[]');
        } catch (e) {
            console.error('Error parseando historial:', e);
            return [];
        }
    },

    /**
     * Agregar evento al historial
     */
    agregarEvento(db, servicioId, evento) {
        const historial = this.obtenerHistorial(db, servicioId);
        historial.push(evento);

        const stmt = db.prepare('UPDATE servicios SET historial = ? WHERE id = ?');
        stmt.run(JSON.stringify(historial), servicioId);

        return historial;
    },

    /**
     * Buscar documento por tipo y número
     */
    buscarDocumento(db, servicioId, tipo, numero = null) {
        const documentos = this.obtenerDocumentos(db, servicioId);

        if (numero) {
            return documentos.find(doc => doc.tipo === tipo && doc.numero === numero);
        }

        return documentos.filter(doc => doc.tipo === tipo);
    }
};
