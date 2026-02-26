const express = require('express');
const router = express.Router();
const db = require('../config/database');
const dbHelper = require('../config/db-helper');
const { auth, esSuperUser } = require('../middleware/auth');
const { toMongoFormat } = require('../lib/helpers');

router.get('/', auth, esSuperUser, async (req, res) => {
    try {
        const { estado, busqueda } = req.query;
        let sql = 'SELECT c.*, u.nombre as vendedorNombre FROM clientes c JOIN usuarios u ON c.vendedorAsignado = u.id WHERE 1=1';
        const params = [];

        // Removed specific vendor check
        if (estado) {
            sql += ' AND c.estado = ?';
            params.push(estado);
        }
        if (busqueda) {
            sql += ' AND (c.nombres LIKE ? OR c.apellidoPaterno LIKE ? OR c.empresa LIKE ?)';
            const like = '%' + busqueda + '%';
            params.push(like, like, like);
        }
        sql += ' ORDER BY c.ultimaInteraccion DESC';

        const rows = await dbHelper.getAll(sql, params);
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
        const row = await dbHelper.getOne('SELECT c.*, u.nombre as vendedorNombre FROM clientes c JOIN usuarios u ON c.vendedorAsignado = u.id WHERE c.id = ?', [parseInt(req.params.id)]);
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

        const result = await dbHelper.run(
            'INSERT INTO clientes (nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, estado, etapaEmbudo, historialEmbudo, vendedorAsignado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *',
            [nombres, apellidoPaterno || '', apellidoMaterno || '', telefono, correo, empresa || '', estado || 'proceso', etapa, hist, vendedorId]
        );

        let createdCliente;
        if (db.isPostgres) {
            createdCliente = await dbHelper.getOne('SELECT * FROM clientes WHERE id = $1', [result.lastID]);
        } else {
            createdCliente = await dbHelper.getOne('SELECT * FROM clientes ORDER BY id DESC LIMIT 1');
        }

        res.status(201).json({ mensaje: 'Cliente creado', cliente: toMongoFormat(createdCliente) || createdCliente });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.put('/:id', auth, esSuperUser, async (req, res) => {
    try {
        const c = await dbHelper.getOne('SELECT * FROM clientes WHERE id = ?', [parseInt(req.params.id)]);
        if (!c) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
        if (req.usuario.rol === 'vendedor' && c.vendedorAsignado !== parseInt(req.usuario.id)) {
            return res.status(403).json({ mensaje: 'No tiene permiso' });
        }
        const { nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, estado, notas, vendedorAsignado } = req.body;
        const updates = [];
        const params = [];
        let paramIndex = 1;
        
        if (nombres) { 
            updates.push(db.isPostgres ? `nombres = $${paramIndex}` : 'nombres = ?'); 
            params.push(nombres); 
            paramIndex++;
        }
        if (apellidoPaterno) { 
            updates.push(db.isPostgres ? `apellidoPaterno = $${paramIndex}` : 'apellidoPaterno = ?'); 
            params.push(apellidoPaterno); 
            paramIndex++;
        }
        if (apellidoMaterno !== undefined) { 
            updates.push(db.isPostgres ? `apellidoMaterno = $${paramIndex}` : 'apellidoMaterno = ?'); 
            params.push(apellidoMaterno); 
            paramIndex++;
        }
        if (telefono) { 
            updates.push(db.isPostgres ? `telefono = $${paramIndex}` : 'telefono = ?'); 
            params.push(telefono); 
            paramIndex++;
        }
        if (correo) { 
            updates.push(db.isPostgres ? `correo = $${paramIndex}` : 'correo = ?'); 
            params.push(correo); 
            paramIndex++;
        }
        if (empresa !== undefined) { 
            updates.push(db.isPostgres ? `empresa = $${paramIndex}` : 'empresa = ?'); 
            params.push(empresa); 
            paramIndex++;
        }
        if (estado) { 
            updates.push(db.isPostgres ? `estado = $${paramIndex}` : 'estado = ?'); 
            params.push(estado); 
            paramIndex++;
        }
        if (notas !== undefined) { 
            updates.push(db.isPostgres ? `notas = $${paramIndex}` : 'notas = ?'); 
            params.push(notas); 
            paramIndex++;
        }
        if (req.usuario.rol === 'admin' && vendedorAsignado) { 
            updates.push(db.isPostgres ? `vendedorAsignado = $${paramIndex}` : 'vendedorAsignado = ?'); 
            params.push(parseInt(vendedorAsignado)); 
            paramIndex++;
        }
        
        updates.push(db.isPostgres ? `ultimaInteraccion = $${paramIndex}` : 'ultimaInteraccion = ?');
        params.push(new Date().toISOString());
        paramIndex++;
        params.push(parseInt(req.params.id));
        
        const sql = db.isPostgres ? 
            `UPDATE clientes SET ${updates.join(', ')} WHERE id = $${paramIndex}` :
            `UPDATE clientes SET ${updates.join(', ')} WHERE id = ?`;
        
        await dbHelper.run(sql, params);
        const row = await dbHelper.getOne('SELECT * FROM clientes WHERE id = ?', [parseInt(req.params.id)]);
        res.json({ mensaje: 'Cliente actualizado', cliente: toMongoFormat(row) || row });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.delete('/:id', auth, esSuperUser, async (req, res) => {
    try {
        const r = await dbHelper.run('DELETE FROM clientes WHERE id = ?', [parseInt(req.params.id)]);
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
        const c = await dbHelper.getOne('SELECT * FROM clientes WHERE id = ?', [parseInt(req.params.id)]);
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
            'UPDATE clientes SET etapaEmbudo = ?, fechaUltimaEtapa = ?, ultimaInteraccion = ?, historialEmbudo = ?, estado = ? WHERE id = ?',
            [etapaNueva, now, now, JSON.stringify(hist), estado, parseInt(req.params.id)]
        );
        
        const row = await dbHelper.getOne('SELECT * FROM clientes WHERE id = ?', [parseInt(req.params.id)]);
        res.json({ mensaje: 'Etapa actualizada', cliente: toMongoFormat(row) || row });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
