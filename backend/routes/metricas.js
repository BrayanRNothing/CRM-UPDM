const express = require('express');
const router = express.Router();
const dbHelper = require('../config/db-helper');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
    try {
        const hoyInicio = new Date().toISOString().slice(0, 10) + ' 00:00:00';
        const llamadasHoyRow = await dbHelper.getOne('SELECT COUNT(*) as c FROM actividades WHERE tipo = $1 AND fecha >= $2', ['llamada', hoyInicio]);
        const totalLlamadasRow = await dbHelper.getOne('SELECT COUNT(*) as c FROM actividades WHERE tipo = $1', ['llamada']);
        const clientesTotalRow = await dbHelper.getOne('SELECT COUNT(*) as c FROM clientes');
        const llamadasHoy = llamadasHoyRow?.c || 0;
        const totalLlamadas = totalLlamadasRow?.c || 0;
        const clientesTotal = clientesTotalRow?.c || 0;
        res.json({
            llamadas: { hoy: llamadasHoy, totales: totalLlamadas },
            clientes: clientesTotal
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
