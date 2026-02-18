require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./config/database');

const seedData = async () => {
    try {
        db.exec('DELETE FROM actividades');
        db.exec('DELETE FROM ventas');
        db.exec('DELETE FROM tareas');
        db.exec('DELETE FROM clientes');
        db.exec('DELETE FROM usuarios');
        console.log('🗑️  Datos anteriores eliminados');

        const hashAdmin = await bcrypt.hash('admin123', 10);
        const hashVendedor = await bcrypt.hash('vendedor123', 10);
        const hashProspector = await bcrypt.hash('prospector123', 10);
        const hashCloser = await bcrypt.hash('closer123', 10);

        db.prepare('INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono) VALUES (?, ?, ?, ?, ?, ?)')
            .run('admin', hashAdmin, 'admin', 'Administrador Principal', 'admin@infiniguard.com', '5551234567');

        db.prepare('INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono) VALUES (?, ?, ?, ?, ?, ?)')
            .run('vendedor1', hashVendedor, 'vendedor', 'Juan Pérez', 'juan@infiniguard.com', '5559876543');
        db.prepare('INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono) VALUES (?, ?, ?, ?, ?, ?)')
            .run('vendedor2', hashVendedor, 'vendedor', 'María García', 'maria@infiniguard.com', '5558765432');

        db.prepare('INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono) VALUES (?, ?, ?, ?, ?, ?)')
            .run('prospector', hashProspector, 'prospector', 'Alex Mendoza', 'prospector@infiniguard.com', '5554444444');
        db.prepare('INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono) VALUES (?, ?, ?, ?, ?, ?)')
            .run('closer', hashCloser, 'closer', 'Fernando Ruiz', 'closer@infiniguard.com', '5555555555');

        console.log('👥 Usuarios creados');

        const v1 = db.prepare('SELECT id FROM usuarios WHERE usuario = ?').get('vendedor1').id;
        const v2 = db.prepare('SELECT id FROM usuarios WHERE usuario = ?').get('vendedor2').id;
        const prospector = db.prepare('SELECT id FROM usuarios WHERE usuario = ?').get('prospector').id;

        const now = new Date().toISOString();
        const hist = JSON.stringify([{ etapa: 'prospecto_nuevo', fecha: now, vendedor: prospector }]);

        db.prepare(`INSERT INTO clientes (nombres, apellidoPaterno, telefono, correo, empresa, estado, vendedorAsignado) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run('Carlos', 'López', '5551111111', 'carlos@empresa.com', 'Tech Solutions SA', 'proceso', v1);
        db.prepare(`INSERT INTO clientes (nombres, apellidoPaterno, telefono, correo, empresa, estado, vendedorAsignado) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run('Ana', 'Rodríguez', '5552222222', 'ana@company.com', 'Digital Corp', 'ganado', v1);
        db.prepare(`INSERT INTO clientes (nombres, apellidoPaterno, telefono, correo, empresa, estado, vendedorAsignado) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run('Pedro', 'Hernández', '5553333333', 'pedro@business.com', 'Innovate Inc', 'proceso', v2);
        db.prepare(`INSERT INTO clientes (nombres, apellidoPaterno, telefono, correo, empresa, vendedorAsignado, prospectorAsignado, etapaEmbudo, historialEmbudo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run('Laura', 'Martínez', '5556666666', 'laura@empresa.com', 'Consultores SA', prospector, prospector, 'prospecto_nuevo', hist);
        db.prepare(`INSERT INTO clientes (nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, vendedorAsignado, prospectorAsignado, etapaEmbudo, historialEmbudo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run('Roberto', 'Sánchez', 'García', '5557777777', 'roberto@tech.com', 'Tech Pro', prospector, prospector, 'en_contacto', hist);

        console.log('📋 Clientes creados');

        console.log('\n✅ Seed completado');
        console.log('\n📝 Credenciales:');
        console.log('   Prospector: prospector / prospector123');
        console.log('   Closer: closer / closer123');
        console.log('   Admin: admin / admin123');
        console.log('   Vendedor: vendedor1 / vendedor123');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

seedData();
