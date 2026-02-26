const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const dbHelper = require('../config/db-helper');
const { auth, esSuperUser } = require('../middleware/auth');

// Helper para formatear respuesta (simulando lo que hacía toMongoFormat si es necesario, o simplificando)
const formatUser = (row) => ({
    id: row.id,
    usuario: row.usuario,
    nombre: row.nombre,
    rol: row.rol,
    email: row.email,
    telefono: row.telefono,
    activo: !!row.activo,
    fechaCreacion: row.fechaCreacion || row.fechacreacion,
    googleLinked: !!(row.googleRefreshToken || row.googlerefreshtoken || row.googleAccessToken || row.googleaccesstoken)
});

// @route   GET api/usuarios
// @desc    Obtener todos los usuarios (Solo Admin o para listar en sidebar si se permite)
// @access  Private (Admin o usuarios autenticados para ver equipo)
router.get('/', auth, async (req, res) => {
    try {
        // Permitir a todos los autenticados ver la lista de usuarios (para el sidebar)
        // O restringir si es necesario. Por ahora abierto a autenticados.
        const rows = await dbHelper.getAll(
            'SELECT id, usuario, nombre, rol, email, telefono, activo, fechaCreacion, googleRefreshToken, googleAccessToken FROM usuarios WHERE activo = 1 ORDER BY nombre ASC',
            []
        );
        res.json(rows.map(formatUser));
    } catch (error) {
        console.error("Error in GET /api/usuarios:", error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// @route   POST api/usuarios
// @desc    Crear nuevo usuario
// @access  Private (Admin)
router.post('/', auth, esSuperUser, async (req, res) => {
    try {
        const { usuario, contraseña, nombre, email, telefono, rol } = req.body;

        if (!usuario || !contraseña || !nombre || !rol) {
            return res.status(400).json({ mensaje: 'Complete los campos requeridos' });
        }

        const existe = await dbHelper.getOne('SELECT id FROM usuarios WHERE usuario = ?', [usuario.trim()]);
        if (existe) return res.status(400).json({ mensaje: 'Usuario ya existe' });

        const hash = await bcrypt.hash(contraseña, 10);

        const info = await dbHelper.run(
            'INSERT INTO usuarios (usuario, contraseña, rol, nombre, email, telefono) VALUES (?, ?, ?, ?, ?, ?) RETURNING *' +
            (db.isPostgres ? '' : ' WHERE id = last_insert_rowid()'),
            [usuario.trim(), hash, rol, nombre.trim(), (email || '').trim(), (telefono || '').trim()]
        );

        let row;
        if (db.isPostgres) {
            row = await dbHelper.getOne('SELECT * FROM usuarios WHERE id = $1', [info.lastID]);
        } else {
            row = await dbHelper.getOne('SELECT * FROM usuarios WHERE id = ?', [info.lastID]);
        }
        
        res.status(201).json({ mensaje: 'Usuario creado', usuario: formatUser(row) });
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// @route   PUT api/usuarios/:id
// @desc    Actualizar usuario
// @access  Private (Admin)
router.put('/:id', auth, esSuperUser, async (req, res) => {
    try {
        const { nombre, email, telefono, activo, contraseña, rol } = req.body;
        const id = parseInt(req.params.id);

        const row = await dbHelper.getOne('SELECT * FROM usuarios WHERE id = ?', [id]);
        if (!row) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (nombre) { 
            updates.push(db.isPostgres ? `nombre = $${paramIndex}` : 'nombre = ?'); 
            params.push(nombre); 
            paramIndex++;
        }
        if (email !== undefined) { 
            updates.push(db.isPostgres ? `email = $${paramIndex}` : 'email = ?'); 
            params.push(email); 
            paramIndex++;
        }
        if (telefono !== undefined) { 
            updates.push(db.isPostgres ? `telefono = $${paramIndex}` : 'telefono = ?'); 
            params.push(telefono); 
            paramIndex++;
        }
        if (activo !== undefined) { 
            updates.push(db.isPostgres ? `activo = $${paramIndex}` : 'activo = ?'); 
            params.push(activo ? 1 : 0); 
            paramIndex++;
        }
        if (rol) { 
            updates.push(db.isPostgres ? `rol = $${paramIndex}` : 'rol = ?'); 
            params.push(rol); 
            paramIndex++;
        }
        if (contraseña) {
            const hash = await bcrypt.hash(contraseña, 10);
            updates.push(db.isPostgres ? `contraseña = $${paramIndex}` : 'contraseña = ?');
            params.push(hash);
            paramIndex++;
        }

        if (updates.length > 0) {
            params.push(id);
            const sql = db.isPostgres ? 
                `UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${paramIndex}` :
                `UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`;
            await dbHelper.run(sql, params);
        }

        const updated = await dbHelper.getOne('SELECT * FROM usuarios WHERE id = ?', [id]);
        res.json({ mensaje: 'Usuario actualizado', usuario: formatUser(updated) });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// @route   DELETE api/usuarios/:id
// @desc    Desactivar usuario
// @access  Private (Admin)
router.delete('/:id', auth, esSuperUser, async (req, res) => {
    try {
        await dbHelper.run('UPDATE usuarios SET activo = 0 WHERE id = ?', [parseInt(req.params.id)]);
        res.json({ mensaje: 'Usuario desactivado' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
