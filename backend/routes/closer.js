const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth } = require('../middleware/auth');
const { toMongoFormat, toMongoFormatMany } = require('../lib/helpers');

const esCloser = (req, res, next) => {
    if (req.usuario.rol !== 'closer' && req.usuario.rol !== 'admin') {
        return res.status(403).json({ msg: 'Acceso denegado. Solo closers.' });
    }
    next();
};

router.get('/dashboard', [auth, esCloser], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        const clientes = db.prepare('SELECT * FROM clientes WHERE closerAsignado = ?').all(closerId);

        const embudo = {
            total: clientes.length,
            reunion_agendada: clientes.filter(c => c.etapaEmbudo === 'reunion_agendada').length,
            reunion_realizada: clientes.filter(c => c.etapaEmbudo === 'reunion_realizada').length,
            en_negociacion: clientes.filter(c => c.etapaEmbudo === 'en_negociacion').length,
            venta_ganada: clientes.filter(c => c.etapaEmbudo === 'venta_ganada').length,
            perdido: clientes.filter(c => c.etapaEmbudo === 'perdido').length
        };

        const hoyInicio = new Date().toISOString().slice(0, 10) + ' 00:00:00';
        const hoyFin = new Date().toISOString().slice(0, 10) + ' 23:59:59';
        const reunionesHoy = db.prepare('SELECT * FROM actividades WHERE vendedor = ? AND tipo = ? AND fecha >= ? AND fecha <= ?')
            .all(closerId, 'cita', hoyInicio, hoyFin);

        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);
        const ventasMes = db.prepare('SELECT * FROM ventas WHERE vendedor = ? AND fecha >= ?').all(closerId, inicioMes.toISOString());
        const montoTotalMes = ventasMes.reduce((sum, v) => sum + (v.monto || 0), 0);

        const totalReuniones = embudo.reunion_realizada + embudo.en_negociacion + embudo.venta_ganada + embudo.perdido;
        const tasasConversion = {
            asistencia: embudo.total > 0 ? ((totalReuniones / embudo.total) * 100).toFixed(1) : 0,
            negociacion: totalReuniones > 0 ? (((embudo.en_negociacion + embudo.venta_ganada) / totalReuniones) * 100).toFixed(1) : 0,
            cierre: (embudo.en_negociacion + embudo.venta_ganada) > 0 ? ((embudo.venta_ganada / (embudo.en_negociacion + embudo.venta_ganada)) * 100).toFixed(1) : 0,
            global: embudo.total > 0 ? ((embudo.venta_ganada / embudo.total) * 100).toFixed(1) : 0
        };

        res.json({
            embudo,
            metricas: {
                reuniones: { hoy: reunionesHoy.length, pendientes: embudo.reunion_agendada, realizadas: totalReuniones },
                ventas: { mes: ventasMes.length, montoMes: montoTotalMes, totales: embudo.venta_ganada },
                negociaciones: { activas: embudo.en_negociacion }
            },
            tasasConversion
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

router.get('/calendario', [auth, esCloser], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        const rows = db.prepare(`
            SELECT a.*, c.nombres as c_nombres, c.apellidoPaterno as c_apellido, c.empresa as c_empresa, c.telefono as c_telefono, c.correo as c_correo, c.etapaEmbudo as c_etapa,
            u.nombre as v_nombre FROM actividades a
            JOIN clientes c ON a.cliente = c.id
            JOIN usuarios u ON a.vendedor = u.id
            WHERE a.vendedor = ? AND a.tipo = ?
            ORDER BY a.fecha ASC
        `).all(closerId, 'cita');
        const reuniones = rows.map(r => ({
            ...toMongoFormat(r),
            cliente: { nombres: r.c_nombres, apellidoPaterno: r.c_apellido, empresa: r.c_empresa, telefono: r.c_telefono, correo: r.c_correo, etapaEmbudo: r.c_etapa },
            vendedor: { nombre: r.v_nombre }
        }));
        res.json(reuniones);
    } catch (error) {
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

router.get('/reuniones-pendientes', [auth, esCloser], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        const rows = db.prepare(`
            SELECT c.*, u.nombre as prospectorNombre FROM clientes c
            LEFT JOIN usuarios u ON c.prospectorAsignado = u.id
            WHERE c.closerAsignado = ? AND c.etapaEmbudo = ?
        `).all(closerId, 'reunion_agendada');
        const clientes = rows.map(r => {
            const { prospectorNombre, ...c } = r;
            const out = toMongoFormat(c);
            if (out) out.prospectorAsignado = { nombre: prospectorNombre };
            return out;
        });
        res.json(clientes);
    } catch (error) {
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

router.get('/prospectos', [auth, esCloser], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        const rows = db.prepare(`
            SELECT c.*, u.nombre as prospectorNombre FROM clientes c
            LEFT JOIN usuarios u ON c.prospectorAsignado = u.id
            WHERE c.closerAsignado = ?
            ORDER BY c.fechaTransferencia DESC
        `).all(closerId);
        res.json(rows.map(r => {
            const { prospectorNombre, ...c } = r;
            const out = toMongoFormat(c);
            if (out) out.prospectorAsignado = { nombre: prospectorNombre };
            return out;
        }));
    } catch (error) {
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

router.post('/registrar-reunion', [auth, esCloser], async (req, res) => {
    try {
        const { clienteId, asistio, resultado, notas } = req.body;
        if (!clienteId || asistio === undefined) return res.status(400).json({ msg: 'Datos requeridos' });
        const cid = parseInt(clienteId);
        const closerId = parseInt(req.usuario.id);
        const c = db.prepare('SELECT * FROM clientes WHERE id = ?').get(cid);
        if (!c || c.closerAsignado !== closerId) return res.status(403).json({ msg: 'No autorizado' });

        const etapaNueva = asistio ? (resultado === 'venta' ? 'venta_ganada' : resultado === 'negociacion' ? 'en_negociacion' : 'reunion_realizada') : 'perdido';
        const now = new Date().toISOString();
        const hist = c.historialEmbudo ? JSON.parse(c.historialEmbudo) : [];
        hist.push({ etapa: etapaNueva, fecha: now, vendedor: closerId });
        const estado = etapaNueva === 'venta_ganada' ? 'ganado' : etapaNueva === 'perdido' ? 'perdido' : 'proceso';

        db.prepare('UPDATE clientes SET etapaEmbudo = ?, estado = ?, fechaUltimaEtapa = ?, ultimaInteraccion = ?, historialEmbudo = ? WHERE id = ?')
            .run(etapaNueva, estado, now, now, JSON.stringify(hist), cid);

        db.prepare('INSERT INTO actividades (tipo, vendedor, cliente, descripcion, resultado, notas) VALUES (?, ?, ?, ?, ?, ?)')
            .run('cita', closerId, cid, 'Reunión registrada', asistio ? 'exitoso' : 'fallido', notas || '');

        const row = db.prepare('SELECT * FROM clientes WHERE id = ?').get(cid);
        res.json({ msg: 'Reunión registrada', cliente: toMongoFormat(row) || row });
    } catch (error) {
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

module.exports = router;
