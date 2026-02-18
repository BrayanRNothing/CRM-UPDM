const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth } = require('../middleware/auth');

router.get('/', auth, (req, res) => {
    try {
        const hoyInicio = new Date().toISOString().slice(0, 10) + ' 00:00:00';
        const llamadasHoy = db.prepare('SELECT COUNT(*) as c FROM actividades WHERE tipo = ? AND fecha >= ?').get('llamada', hoyInicio).c;
        const totalLlamadas = db.prepare('SELECT COUNT(*) as c FROM actividades WHERE tipo = ?').get('llamada').c;
        const clientesTotal = db.prepare('SELECT COUNT(*) as c FROM clientes').get().c;
        res.json({
            llamadas: { hoy: llamadasHoy, totales: totalLlamadas },
            clientes: clientesTotal
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
