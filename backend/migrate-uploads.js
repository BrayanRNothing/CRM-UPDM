import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DOCUMENTOS_DIR = path.join(UPLOADS_DIR, 'documentos');

async function migrarArchivos() {
  try {
    console.log('🚀 Iniciando migración de archivos...\n');

    // Asegurar que existe la carpeta documentos
    if (!fs.existsSync(DOCUMENTOS_DIR)) {
      fs.mkdirSync(DOCUMENTOS_DIR, { recursive: true });
      console.log('✅ Carpeta documentos creada');
    }

    // Obtener todos los archivos PDF de la carpeta raíz uploads
    const archivos = fs.readdirSync(UPLOADS_DIR).filter(file => {
      const fullPath = path.join(UPLOADS_DIR, file);
      return fs.statSync(fullPath).isFile() && file.endsWith('.pdf');
    });

    if (archivos.length === 0) {
      console.log('ℹ️  No hay archivos PDF para migrar en uploads/');
      return;
    }

    console.log(`📄 Se encontraron ${archivos.length} archivos PDF para migrar:\n`);

    let movidosCount = 0;
    let actualizadosCount = 0;

    for (const archivo of archivos) {
      const rutaActual = path.join(UPLOADS_DIR, archivo);
      const rutaNueva = path.join(DOCUMENTOS_DIR, archivo);

      // Verificar si ya existe en destino
      if (fs.existsSync(rutaNueva)) {
        console.log(`⚠️  ${archivo} - Ya existe en documentos/, omitiendo...`);
        continue;
      }

      try {
        // Mover archivo
        fs.renameSync(rutaActual, rutaNueva);
        console.log(`✅ Movido: ${archivo}`);
        movidosCount++;

        // Actualizar referencias en la base de datos
        const rutaAntigua = `uploads/${archivo}`;
        const rutaNuevaDB = `uploads/documentos/${archivo}`;

        // Actualizar en tabla cotizaciones
        const result1 = await pool.query(
          'UPDATE cotizaciones SET pdf_url = $1 WHERE pdf_url = $2',
          [rutaNuevaDB, rutaAntigua]
        );

        // Actualizar en tabla servicios (pdfCotizacion)
        const result2 = await pool.query(
          'UPDATE servicios SET "pdfCotizacion" = $1 WHERE "pdfCotizacion" = $2',
          [rutaNuevaDB, rutaAntigua]
        );

        const totalActualizados = result1.rowCount + result2.rowCount;
        if (totalActualizados > 0) {
          console.log(`   💾 ${totalActualizados} registro(s) actualizado(s) en BD`);
          actualizadosCount += totalActualizados;
        }

      } catch (error) {
        console.error(`❌ Error con ${archivo}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Migración completada:`);
    console.log(`   📦 Archivos movidos: ${movidosCount}`);
    console.log(`   💾 Registros actualizados en BD: ${actualizadosCount}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    await pool.end();
  }
}

// Ejecutar migración
migrarArchivos();
