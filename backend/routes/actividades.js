const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth, esVendedor } = require('../middleware/auth');
const { toMongoFormat } = require('../lib/helpers');

router.get('/', auth, esVendedor, async (req, res) => {
    try {
        let sql = `SELECT a.*, v.nombre as vendedorNombre, c.nombres as c_nombres, c.apellidoPaterno as c_apellido, c.empresa as c_empresa
            FROM actividades a JOIN usuarios v ON a.vendedor = v.id JOIN clientes c ON a.cliente = c.id WHERE 1=1`;
        const params = [];
        if (req.usuario.rol === 'vendedor') {
            sql += ' AND a.vendedor = ?';
            params.push(parseInt(req.usuario.id));
        }
        if (req.query.tipo) {
            sql += ' AND a.tipo = ?';
            params.push(req.query.tipo);
        }
        if (req.query.clienteId) {
            sql += ' AND a.cliente = ?';
            params.push(parseInt(req.query.clienteId));
        }
        sql += ' ORDER BY a.fecha DESC LIMIT 100';
        const rows = db.prepare(sql).all(...params);
        const actividades = rows.map(r => ({
            ...toMongoFormat(r),
            vendedor: { nombre: r.vendedorNombre },
            cliente: { nombres: r.c_nombres, apellidoPaterno: r.c_apellido, empresa: r.c_empresa }
        }));
        res.json(actividades);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.post('/', auth, esVendedor, async (req, res) => {
    try {
        const { tipo, cliente, descripcion, resultado, notas } = req.body;
        if (!tipo || !cliente) return res.status(400).json({ mensaje: 'Tipo y cliente requeridos' });
        const c = db.prepare('SELECT * FROM clientes WHERE id = ?').get(parseInt(cliente));
        if (!c) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
        if (req.usuario.rol === 'vendedor' && c.vendedorAsignado !== parseInt(req.usuario.id)) {
            return res.status(403).json({ mensaje: 'No tiene permiso' });
        }
        const now = new Date().toISOString();
        db.prepare('INSERT INTO actividades (tipo, vendedor, cliente, descripcion, resultado, notas) VALUES (?, ?, ?, ?, ?, ?)')
            .run(tipo, parseInt(req.usuario.id), parseInt(cliente), descripcion || '', resultado || 'pendiente', notas || '');
        db.prepare('UPDATE clientes SET ultimaInteraccion = ? WHERE id = ?').run(now, parseInt(cliente));
        const row = db.prepare('SELECT * FROM actividades ORDER BY id DESC LIMIT 1').get();
        res.status(201).json({ mensaje: 'Actividad registrada', actividad: toMongoFormat(row) || row });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.put('/:id', auth, esVendedor, async (req, res) => {
    try {
        const a = db.prepare('SELECT * FROM actividades WHERE id = ?').get(parseInt(req.params.id));
        if (!a) return res.status(404).json({ mensaje: 'Actividad no encontrada' });
        if (req.usuario.rol === 'vendedor' && a.vendedor !== parseInt(req.usuario.id)) {
            return res.status(403).json({ mensaje: 'No tiene permiso' });
        }
        const { descripcion, resultado, notas } = req.body;
        const updates = [];
        const params = [];
        if (descripcion !== undefined) { updates.push('descripcion = ?'); params.push(descripcion); }
        if (resultado) { updates.push('resultado = ?'); params.push(resultado); }
        if (notas !== undefined) { updates.push('notas = ?'); params.push(notas); }
        if (updates.length) {
            params.push(parseInt(req.params.id));
            db.prepare(`UPDATE actividades SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        }
        const row = db.prepare('SELECT * FROM actividades WHERE id = ?').get(parseInt(req.params.id));
        res.json({ mensaje: 'Actividad actualizada', actividad: toMongoFormat(row) || row });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
