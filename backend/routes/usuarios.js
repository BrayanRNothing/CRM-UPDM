const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { auth, esAdmin } = require('../middleware/auth');
const { toMongoFormat } = require('../lib/helpers');

router.get('/', auth, esAdmin, async (req, res) => {
    try {
        const rows = db.prepare('SELECT id, usuario, nombre, rol, email, telefono, activo, fechaCreacion FROM usuarios ORDER BY fechaCreacion DESC').all();
        res.json(rows.map(r => ({ ...toMongoFormat(r), contraseña: undefined })));
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.post('/', auth, esAdmin, async (req, res) => {
    try {
        const { usuario, contraseña, nombre, email, telefono, rol } = req.body;
        if (!usuario || !contraseña || !nombre || !rol) {
            return res.status(400).json({ mensaje: 'Complete los campos requeridos' });
        }
        const existe = db.prepare('SELECT id FROM usuarios WHERE usuario = ?').get(usuario.trim());
        if (existe) return res.status(400).json({ mensaje: 'Usuario ya existe' });

        const hash = await bcrypt.hash(contraseña, 10);
        db.prepare('INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono) VALUES (?, ?, ?, ?, ?, ?)')
            .run(usuario.trim(), hash, rol, nombre.trim(), (email || '').trim(), (telefono || '').trim());

        const row = db.prepare('SELECT id, usuario, nombre, rol, email, telefono FROM usuarios ORDER BY id DESC LIMIT 1').get();
        res.status(201).json({ mensaje: 'Usuario creado', usuario: toMongoFormat(row) || row });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.put('/:id', auth, esAdmin, async (req, res) => {
    try {
        const { nombre, email, telefono, activo, contraseña, rol } = req.body;
        const row = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(parseInt(req.params.id));
        if (!row) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const updates = [];
        const params = [];
        if (nombre) { updates.push('nombre = ?'); params.push(nombre); }
        if (email !== undefined) { updates.push('email = ?'); params.push(email); }
        if (telefono !== undefined) { updates.push('telefono = ?'); params.push(telefono); }
        if (activo !== undefined) { updates.push('activo = ?'); params.push(activo ? 1 : 0); }
        if (rol) { updates.push('rol = ?'); params.push(rol); }
        if (contraseña) {
            const hash = await bcrypt.hash(contraseña, 10);
            updates.push('contraseña = ?');
            params.push(hash);
        }
        if (updates.length) {
            params.push(parseInt(req.params.id));
            db.prepare(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        }
        const updated = db.prepare('SELECT id, usuario, nombre, rol, email, telefono, activo FROM usuarios WHERE id = ?').get(parseInt(req.params.id));
        res.json({ mensaje: 'Usuario actualizado', usuario: toMongoFormat(updated) || updated });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

router.delete('/:id', auth, esAdmin, async (req, res) => {
    try {
        db.prepare('UPDATE usuarios SET activo = 0 WHERE id = ?').run(parseInt(req.params.id));
        res.json({ mensaje: 'Usuario desactivado' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
