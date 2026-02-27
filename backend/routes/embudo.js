const express = require('express');
const router = express.Router();
const db = require('../config/database');
const dbHelper = require('../config/db-helper');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
    try {
        const etapas = ['prospecto_nuevo', 'en_contacto', 'reunion_agendada', 'reunion_realizada', 'en_negociacion', 'venta_ganada', 'perdido'];
        const conteos = {};
        for (const etapa of etapas) {
            const row = await dbHelper.getOne('SELECT COUNT(*) as c FROM clientes WHERE etapaEmbudo = $1', [etapa]);
            conteos[etapa] = row?.c || 0;
        }
        res.json(conteos);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

module.exports = router;
