const express = require('express');
const router = express.Router();
const dbHelper = require('../config/db-helper');
const { auth } = require('../middleware/auth');
const { toMongoFormat } = require('../lib/helpers');

// GET todas las tareas del usuario
router.get('/', auth, async (req, res) => {
    try {
        const vendedorId = parseInt(req.usuario.id);
        const rows = await dbHelper.getAll(`
            SELECT t.*, c.nombres as clienteNombre, c.apellidoPaterno as clienteApellido 
            FROM tareas t
            LEFT JOIN clientes c ON t.cliente = c.id
            WHERE t.vendedor = $1
            ORDER BY 
                CASE WHEN t.estado = 'pendiente' THEN 0 ELSE 1 END,
                t.fechaLimite ASC
            LIMIT 100
        `, [vendedorId]);
        res.json(rows.map(toMongoFormat));
    } catch (error) {
        console.error('Error al obtener tareas:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// POST crear tarea
router.post('/', auth, async (req, res) => {
    try {
        const { titulo, descripcion, vendedor, cliente, estado, prioridad, fechaLimite } = req.body;
        if (!titulo) return res.status(400).json({ mensaje: 'Título requerido' });
        
        const vendedorId = vendedor ? parseInt(vendedor) : parseInt(req.usuario.id);
        
        const result = await dbHelper.getOne(
            `INSERT INTO tareas (titulo, descripcion, vendedor, cliente, estado, prioridad, fechaLimite) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                titulo, 
                descripcion || '', 
                vendedorId, 
                cliente ? parseInt(cliente) : null, 
                estado || 'pendiente', 
                prioridad || 'media', 
                fechaLimite || null
            ]
        );
        
        res.status(201).json({ mensaje: 'Tarea creada', tarea: toMongoFormat(result) || result });
    } catch (error) {
        console.error('Error al crear tarea:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// PUT actualizar tarea
router.put('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, titulo, descripcion, prioridad, fechaLimite } = req.body;
        const vendedorId = parseInt(req.usuario.id);

        const tarea = await dbHelper.getOne(
            'SELECT id, cliente FROM tareas WHERE id = $1 AND vendedor = $2', 
            [id, vendedorId]
        );
        if (!tarea) return res.status(404).json({ mensaje: 'Tarea no encontrada' });

        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (estado) { 
            updates.push(`estado = $${paramIndex}`); 
            params.push(estado); 
            paramIndex++;
        }
        if (titulo) { 
            updates.push(`titulo = $${paramIndex}`); 
            params.push(titulo); 
            paramIndex++;
        }
        if (descripcion !== undefined) { 
            updates.push(`descripcion = $${paramIndex}`); 
            params.push(descripcion); 
            paramIndex++;
        }
        if (prioridad) { 
            updates.push(`prioridad = $${paramIndex}`); 
            params.push(prioridad); 
            paramIndex++;
        }
        if (fechaLimite !== undefined) { 
            updates.push(`fechaLimite = $${paramIndex}`); 
            params.push(fechaLimite); 
            paramIndex++;
        }

        if (updates.length > 0) {
            params.push(id);
            await dbHelper.run(
                `UPDATE tareas SET ${updates.join(', ')} WHERE id = $${paramIndex}`, 
                params
            );
        }

        // Sincronización: Si se completa la tarea, limpiar proximaLlamada en clientes
        if (estado === 'completada' && tarea.cliente) {
            await dbHelper.run('UPDATE clientes SET proximaLlamada = NULL WHERE id = $1', [tarea.cliente]);
        }

        res.json({ mensaje: 'Tarea actualizada' });
    } catch (error) {
        console.error('Error al actualizar tarea:', error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
