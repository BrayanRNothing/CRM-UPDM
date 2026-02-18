const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth } = require('../middleware/auth');
const { toMongoFormat } = require('../lib/helpers');

router.get('/', auth, (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM tareas ORDER BY fechaCreacion DESC LIMIT 100').all();
        res.json(rows.map(toMongoFormat));
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.post('/', auth, (req, res) => {
    try {
        const { titulo, descripcion, vendedor, cliente, estado, prioridad, fechaLimite } = req.body;
        if (!titulo) return res.status(400).json({ mensaje: 'Título requerido' });
        const vendedorId = vendedor ? parseInt(vendedor) : parseInt(req.usuario.id);
        db.prepare('INSERT INTO tareas (titulo, descripcion, vendedor, cliente, estado, prioridad, fechaLimite) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(titulo, descripcion || '', vendedorId, cliente ? parseInt(cliente) : null, estado || 'pendiente', prioridad || 'media', fechaLimite || null);
        const row = db.prepare('SELECT * FROM tareas ORDER BY id DESC LIMIT 1').get();
        res.status(201).json({ mensaje: 'Tarea creada', tarea: toMongoFormat(row) || row });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
