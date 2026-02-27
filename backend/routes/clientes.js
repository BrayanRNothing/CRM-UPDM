const express = require('express');
const router = express.Router();
const dbHelper = require('../config/db-helper');
const { auth, esSuperUser } = require('../middleware/auth');
const { toMongoFormat } = require('../lib/helpers');
const { buildDynamicQuery, buildUpdate } = require('../lib/query-builder');

router.get('/', auth, esSuperUser, async (req, res) => {
    try {
        const { estado, busqueda } = req.query;
        const baseSql = 'SELECT c.*, u.nombre as vendedorNombre FROM clientes c JOIN usuarios u ON c.vendedorAsignado = u.id WHERE 1=1';
        const conditions = [];

        // Removed specific vendor check
        if (estado) {
            conditions.push({ condition: estado, sql: ' AND c.estado = ?', values: estado });
        }
        if (busqueda) {
            const like = '%' + busqueda + '%';
            conditions.push({
                condition: busqueda,
                sql: ' AND (c.nombres ILIKE ? OR c.apellidoPaterno ILIKE ? OR c.empresa ILIKE ?)',
                values: [like, like, like]
            });
        }

        const { sql, params } = buildDynamicQuery(baseSql, conditions);
        const rows = await dbHelper.getAll(`${sql} ORDER BY c.ultimaInteraccion DESC`, params);
        const clientes = rows.map(r => {
            const { vendedorNombre, ...c } = r;
            const out = toMongoFormat(c);
            if (out) out.vendedorAsignado = { nombre: vendedorNombre };
            return out || c;
        });
        res.json(clientes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.get('/:id', auth, esSuperUser, async (req, res) => {
    try {
        const row = await dbHelper.getOne('SELECT c.*, u.nombre as vendedorNombre FROM clientes c JOIN usuarios u ON c.vendedorAsignado = u.id WHERE c.id = $1', [parseInt(req.params.id)]);
        if (!row) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
        if (req.usuario.rol === 'vendedor' && row.vendedorAsignado !== parseInt(req.usuario.id)) {
            return res.status(403).json({ mensaje: 'No tiene permiso' });
        }
        const { vendedorNombre, ...c } = row;
        const cliente = toMongoFormat(c);
        if (cliente) cliente.vendedorAsignado = { nombre: vendedorNombre };
        res.json(cliente || row);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.post('/', auth, esSuperUser, async (req, res) => {
    try {
        const { nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, estado, vendedorAsignado, etapaEmbudo } = req.body;
        if (!nombres || !apellidoPaterno || !telefono || !correo) {
            return res.status(400).json({ mensaje: 'Complete los campos requeridos' });
        }
        const vendedorId = req.usuario.rol === 'admin' && vendedorAsignado ? parseInt(vendedorAsignado) : parseInt(req.usuario.id);
        const etapa = etapaEmbudo || 'prospecto_nuevo';
        const now = new Date().toISOString();
        const hist = JSON.stringify([{ etapa, fecha: now, vendedor: vendedorId }]);

        const createdCliente = await dbHelper.getOne(
            'INSERT INTO clientes (nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, estado, etapaEmbudo, historialEmbudo, vendedorAsignado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [nombres, apellidoPaterno || '', apellidoMaterno || '', telefono, correo, empresa || '', estado || 'proceso', etapa, hist, vendedorId]
        );

        res.status(201).json({ mensaje: 'Cliente creado', cliente: toMongoFormat(createdCliente) || createdCliente });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.put('/:id', auth, esSuperUser, async (req, res) => {
    try {
        const c = await dbHelper.getOne('SELECT * FROM clientes WHERE id = $1', [parseInt(req.params.id)]);
        if (!c) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
        if (req.usuario.rol === 'vendedor' && c.vendedorAsignado !== parseInt(req.usuario.id)) {
            return res.status(403).json({ mensaje: 'No tiene permiso' });
        }
        const { nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, estado, notas, vendedorAsignado } = req.body;
        const updates = {};
        if (nombres) updates.nombres = nombres;
        if (apellidoPaterno) updates.apellidoPaterno = apellidoPaterno;
        if (apellidoMaterno !== undefined) updates.apellidoMaterno = apellidoMaterno;
        if (telefono) updates.telefono = telefono;
        if (correo) updates.correo = correo;
        if (empresa !== undefined) updates.empresa = empresa;
        if (estado) updates.estado = estado;
        if (notas !== undefined) updates.notas = notas;
        if (req.usuario.rol === 'admin' && vendedorAsignado) updates.vendedorAsignado = parseInt(vendedorAsignado);

        updates.ultimaInteraccion = new Date().toISOString();

        const { sql, params } = buildUpdate('clientes', updates, { id: parseInt(req.params.id) });
        await dbHelper.run(sql, params);
        const row = await dbHelper.getOne('SELECT * FROM clientes WHERE id = $1', [parseInt(req.params.id)]);
        res.json({ mensaje: 'Cliente actualizado', cliente: toMongoFormat(row) || row });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.delete('/:id', auth, esSuperUser, async (req, res) => {
    try {
        const r = await dbHelper.run('DELETE FROM clientes WHERE id = $1', [parseInt(req.params.id)]);
        if (r.changes === 0) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
        res.json({ mensaje: 'Cliente eliminado' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.patch('/:id/etapa', auth, esSuperUser, async (req, res) => {
    try {
        const { etapaNueva } = req.body;
        if (!etapaNueva) return res.status(400).json({ mensaje: 'etapaNueva requerida' });
        const c = await dbHelper.getOne('SELECT * FROM clientes WHERE id = $1', [parseInt(req.params.id)]);
        if (!c) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
        if (req.usuario.rol === 'vendedor' && c.vendedorAsignado !== parseInt(req.usuario.id)) {
            return res.status(403).json({ mensaje: 'No tiene permiso' });
        }
        const now = new Date().toISOString();
        const hist = c.historialEmbudo ? JSON.parse(c.historialEmbudo) : [];
        hist.push({ etapa: etapaNueva, fecha: now, vendedor: parseInt(req.usuario.id) });
        let estado = 'proceso';
        if (etapaNueva === 'ganado') estado = 'ganado';
        else if (etapaNueva === 'perdido') estado = 'perdido';
        
        await dbHelper.run(
            'UPDATE clientes SET etapaEmbudo = $1, fechaUltimaEtapa = $2, ultimaInteraccion = $3, historialEmbudo = $4, estado = $5 WHERE id = $6',
            [etapaNueva, now, now, JSON.stringify(hist), estado, parseInt(req.params.id)]
        );
        
        const row = await dbHelper.getOne('SELECT * FROM clientes WHERE id = $1', [parseInt(req.params.id)]);
        res.json({ mensaje: 'Etapa actualizada', cliente: toMongoFormat(row) || row });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
