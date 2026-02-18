const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth } = require('../middleware/auth');
const { toMongoFormat, toMongoFormatMany } = require('../lib/helpers');

const esProspector = (req, res, next) => {
    if (req.usuario.rol !== 'prospector' && req.usuario.rol !== 'admin') {
        return res.status(403).json({ msg: 'Acceso denegado. Solo prospectores.' });
    }
    next();
};

// GET /api/prospector/dashboard
router.get('/dashboard', [auth, esProspector], async (req, res) => {
    try {
        const prospectorId = parseInt(req.usuario.id);
        const clientes = db.prepare(
            'SELECT * FROM clientes WHERE prospectorAsignado = ?'
        ).all(prospectorId);

        const embudo = {
            total: clientes.length,
            prospecto_nuevo: clientes.filter(c => c.etapaEmbudo === 'prospecto_nuevo').length,
            en_contacto: clientes.filter(c => c.etapaEmbudo === 'en_contacto').length,
            reunion_agendada: clientes.filter(c => c.etapaEmbudo === 'reunion_agendada').length,
            transferidos: clientes.filter(c => c.closerAsignado).length
        };

        const hoyInicio = new Date().toISOString().slice(0, 10) + ' 00:00:00';
        const hoyFin = new Date().toISOString().slice(0, 10) + ' 23:59:59';
        const actividadesHoy = db.prepare(
            'SELECT * FROM actividades WHERE vendedor = ? AND fecha >= ? AND fecha <= ?'
        ).all(prospectorId, hoyInicio, hoyFin);

        const llamadasHoy = actividadesHoy.filter(a => a.tipo === 'llamada').length;
        const contactosExitosos = actividadesHoy.filter(a => a.tipo === 'llamada' && a.resultado === 'exitoso').length;

        const totalLlamadas = db.prepare('SELECT COUNT(*) as c FROM actividades WHERE vendedor = ? AND tipo = ?').get(prospectorId, 'llamada');
        const totalExitosas = db.prepare('SELECT COUNT(*) as c FROM actividades WHERE vendedor = ? AND tipo = ? AND resultado = ?').get(prospectorId, 'llamada', 'exitoso');

        const metricas = {
            llamadas: { hoy: llamadasHoy, totales: totalLlamadas?.c || 0 },
            contactosExitosos: { hoy: contactosExitosos, totales: totalExitosas?.c || 0 },
            reunionesAgendadas: {
                hoy: clientes.filter(c => c.etapaEmbudo === 'reunion_agendada').length,
                totales: embudo.reunion_agendada
            }
        };

        const tasasConversion = {
            contacto: embudo.total > 0 ? ((embudo.en_contacto + embudo.reunion_agendada) / embudo.total * 100).toFixed(1) : 0,
            agendamiento: (embudo.en_contacto + embudo.reunion_agendada) > 0 ? (embudo.reunion_agendada / (embudo.en_contacto + embudo.reunion_agendada) * 100).toFixed(1) : 0
        };

        // Campos que el frontend espera
        if (!metricas.prospectosHoy) metricas.prospectosHoy = 0;
        if (!metricas.reunionesAgendadas.semana) metricas.reunionesAgendadas.semana = metricas.reunionesAgendadas.totales;
        if (!metricas.correosEnviados) metricas.correosEnviados = 0;

        res.json({ embudo, metricas, tasasConversion });
    } catch (error) {
        console.error('Error en dashboard prospector:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// GET /api/prospector/prospectos
router.get('/prospectos', [auth, esProspector], async (req, res) => {
    try {
        const prospectorId = parseInt(req.usuario.id);
        const { etapa, busqueda } = req.query;

        let sql = 'SELECT c.*, u.nombre as closerNombre FROM clientes c LEFT JOIN usuarios u ON c.closerAsignado = u.id WHERE c.prospectorAsignado = ?';
        const params = [prospectorId];

        if (etapa && etapa !== 'todos') {
            sql += ' AND c.etapaEmbudo = ?';
            params.push(etapa);
        }
        if (busqueda) {
            sql += ' AND (c.nombres LIKE ? OR c.apellidoPaterno LIKE ? OR c.empresa LIKE ? OR c.telefono LIKE ?)';
            const like = '%' + busqueda + '%';
            params.push(like, like, like, like);
        }
        sql += ' ORDER BY c.fechaUltimaEtapa DESC';

        const rows = db.prepare(sql).all(...params);
        const prospectos = rows.map(r => {
            const { closerNombre, ...c } = r;
            const out = toMongoFormat(c);
            if (out && closerNombre) out.closerAsignado = { nombre: closerNombre };
            return out || c;
        });

        res.json(prospectos);
    } catch (error) {
        console.error('Error al obtener prospectos:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/prospector/crear-prospecto
router.post('/crear-prospecto', [auth, esProspector], async (req, res) => {
    try {
        const { nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, notas } = req.body;
        if (!nombres || !apellidoPaterno || !telefono || !correo) {
            return res.status(400).json({ msg: 'Nombres, apellido paterno, teléfono y correo son requeridos' });
        }

        const prospectorId = parseInt(req.usuario.id);
        const now = new Date().toISOString();

        const stmt = db.prepare(`
            INSERT INTO clientes (nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, notas, vendedorAsignado, prospectorAsignado, etapaEmbudo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'prospecto_nuevo')
        `);
        const result = stmt.run(
            nombres.trim(),
            (apellidoPaterno || '').trim(),
            (apellidoMaterno || '').trim(),
            String(telefono).trim(),
            String(correo).trim().toLowerCase(),
            (empresa || '').trim(),
            (notas || '').trim(),
            prospectorId,
            prospectorId
        );

        const row = db.prepare('SELECT * FROM clientes WHERE id = ?').get(result.lastInsertRowid);
        const cliente = toMongoFormat(row);
        if (cliente) cliente.prospectorAsignado = { nombre: req.usuario.nombre };

        res.status(201).json({ msg: 'Prospecto creado', cliente: cliente || row });
    } catch (error) {
        console.error('Error al crear prospecto:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/prospector/registrar-actividad
router.post('/registrar-actividad', [auth, esProspector], async (req, res) => {
    try {
        const { clienteId, tipo, resultado, descripcion, notas, fechaCita } = req.body;
        const tiposValidos = ['llamada', 'mensaje', 'correo', 'whatsapp', 'cita', 'prospecto'];
        const resultadosValidos = ['exitoso', 'pendiente', 'fallido'];

        if (!clienteId || !tipo) {
            return res.status(400).json({ msg: 'Cliente y tipo de actividad son requeridos' });
        }
        if (!tiposValidos.includes(tipo)) {
            return res.status(400).json({ msg: 'Tipo de actividad no válido' });
        }

        const cid = parseInt(clienteId);
        const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(cid);
        if (!cliente) {
            return res.status(404).json({ msg: 'Cliente no encontrado' });
        }
        const prospectorId = parseInt(req.usuario.id);
        if (cliente.prospectorAsignado !== prospectorId && req.usuario.rol !== 'admin') {
            return res.status(403).json({ msg: 'No tienes permiso para registrar actividades de este cliente' });
        }

        const resultadoFinal = resultado && resultadosValidos.includes(resultado) ? resultado : 'pendiente';
        const fechaActividad = tipo === 'cita' && fechaCita ? new Date(fechaCita).toISOString() : new Date().toISOString();

        const ins = db.prepare(`
            INSERT INTO actividades (tipo, vendedor, cliente, fecha, descripcion, resultado, notas)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(tipo, prospectorId, cid, fechaActividad, descripcion || `${tipo} registrada`, resultadoFinal, notas || '');

        const now = new Date().toISOString();
        db.prepare('UPDATE clientes SET ultimaInteraccion = ? WHERE id = ?').run(now, cid);

        if (tipo === 'llamada' && resultadoFinal === 'exitoso' && cliente.etapaEmbudo === 'prospecto_nuevo') {
            const hist = cliente.historialEmbudo ? JSON.parse(cliente.historialEmbudo) : [];
            hist.push({ etapa: 'en_contacto', fecha: now, vendedor: prospectorId });
            db.prepare('UPDATE clientes SET etapaEmbudo = ?, fechaUltimaEtapa = ?, historialEmbudo = ? WHERE id = ?')
                .run('en_contacto', now, JSON.stringify(hist), cid);
        }

        const actRow = db.prepare('SELECT * FROM actividades WHERE id = ?').get(ins.lastInsertRowid);
        const actividad = toMongoFormat(actRow);
        if (actividad) actividad.cliente = { nombres: cliente.nombres, apellidoPaterno: cliente.apellidoPaterno, empresa: cliente.empresa };

        res.status(201).json({ msg: 'Actividad registrada', actividad: actividad || actRow });
    } catch (error) {
        console.error('Error al registrar actividad:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// GET /api/prospector/actividades-hoy
router.get('/actividades-hoy', [auth, esProspector], async (req, res) => {
    try {
        const prospectorId = parseInt(req.usuario.id);
        const hoyInicio = new Date().toISOString().slice(0, 10) + ' 00:00:00';
        const hoyFin = new Date().toISOString().slice(0, 10) + ' 23:59:59';

        const rows = db.prepare(`
            SELECT a.*, c.nombres as c_nombres, c.apellidoPaterno as c_apellidoPaterno, c.empresa as c_empresa, c.telefono as c_telefono
            FROM actividades a
            JOIN clientes c ON a.cliente = c.id
            WHERE a.vendedor = ? AND a.fecha >= ? AND a.fecha <= ?
            ORDER BY a.fecha DESC
        `).all(prospectorId, hoyInicio, hoyFin);

        const actividades = rows.map(r => ({
            ...toMongoFormat(r),
            cliente: {
                nombres: r.c_nombres,
                apellidoPaterno: r.c_apellidoPaterno,
                empresa: r.c_empresa,
                telefono: r.c_telefono
            }
        }));

        res.json(actividades);
    } catch (error) {
        console.error('Error al obtener actividades:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/prospector/agendar-reunion
router.post('/agendar-reunion', [auth, esProspector], async (req, res) => {
    try {
        const { clienteId, closerId, fechaReunion, notas } = req.body;
        if (!clienteId || !closerId || !fechaReunion) {
            return res.status(400).json({ msg: 'Faltan datos requeridos' });
        }

        const cid = parseInt(clienteId);
        const closerIdNum = parseInt(closerId);
        const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(cid);
        if (!cliente) {
            return res.status(404).json({ msg: 'Cliente no encontrado' });
        }

        const prospectorId = parseInt(req.usuario.id);
        if (cliente.prospectorAsignado !== prospectorId && req.usuario.rol !== 'admin') {
            return res.status(403).json({ msg: 'No tienes permiso para agendar reunión con este cliente' });
        }

        const now = new Date().toISOString();
        const hist = cliente.historialEmbudo ? JSON.parse(cliente.historialEmbudo) : [];
        hist.push({ etapa: 'reunion_agendada', fecha: now, vendedor: prospectorId });

        db.prepare(`
            UPDATE clientes SET etapaEmbudo = ?, closerAsignado = ?, fechaTransferencia = ?, fechaUltimaEtapa = ?, ultimaInteraccion = ?, historialEmbudo = ?
            WHERE id = ?
        `).run('reunion_agendada', closerIdNum, now, now, now, JSON.stringify(hist), cid);

        const fechaReunionISO = new Date(fechaReunion).toISOString();
        db.prepare(`
            INSERT INTO actividades (tipo, vendedor, cliente, fecha, descripcion, resultado, notas, cambioEtapa, etapaAnterior, etapaNueva)
            VALUES (?, ?, ?, ?, ?, 'pendiente', ?, 1, 'en_contacto', 'reunion_agendada')
        `).run('cita', closerIdNum, cid, fechaReunionISO, `Reunión agendada por prospector ${req.usuario.nombre}`, notas || '');

        const clienteActualizado = db.prepare('SELECT * FROM clientes WHERE id = ?').get(cid);
        const actividadRow = db.prepare('SELECT * FROM actividades WHERE cliente = ? ORDER BY id DESC LIMIT 1').get(cid);

        res.json({
            msg: 'Reunión agendada exitosamente',
            cliente: toMongoFormat(clienteActualizado),
            actividad: toMongoFormat(actividadRow)
        });
    } catch (error) {
        console.error('Error al agendar reunión:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// GET /api/prospector/estadisticas
router.get('/estadisticas', [auth, esProspector], async (req, res) => {
    try {
        const prospectorId = parseInt(req.usuario.id);
        const clientes = db.prepare('SELECT * FROM clientes WHERE prospectorAsignado = ?').all(prospectorId);
        const actividades = db.prepare('SELECT * FROM actividades WHERE vendedor = ?').all(prospectorId);

        const llamadas = actividades.filter(a => a.tipo === 'llamada');
        const llamadasExitosas = llamadas.filter(a => a.resultado === 'exitoso');
        const reunionesAgendadas = clientes.filter(c => c.etapaEmbudo === 'reunion_agendada' || c.closerAsignado);

        const tasaContacto = llamadas.length > 0 ? (llamadasExitosas.length / llamadas.length * 100).toFixed(1) : 0;
        const tasaAgendamiento = llamadasExitosas.length > 0 ? (reunionesAgendadas.length / llamadasExitosas.length * 100).toFixed(1) : 0;

        const distribucion = {
            prospecto_nuevo: clientes.filter(c => c.etapaEmbudo === 'prospecto_nuevo').length,
            en_contacto: clientes.filter(c => c.etapaEmbudo === 'en_contacto').length,
            reunion_agendada: clientes.filter(c => c.etapaEmbudo === 'reunion_agendada').length,
            transferidos: reunionesAgendadas.length
        };

        res.json({
            totalClientes: clientes.length,
            totalLlamadas: llamadas.length,
            llamadasExitosas: llamadasExitosas.length,
            reunionesAgendadas: reunionesAgendadas.length,
            tasaContacto: parseFloat(tasaContacto),
            tasaAgendamiento: parseFloat(tasaAgendamiento),
            distribucion
        });
    } catch (error) {
        console.error('Error en estadísticas prospector:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

module.exports = router;
