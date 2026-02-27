const express = require('express');
const router = express.Router();
const dbHelper = require('../config/db-helper');
const { auth } = require('../middleware/auth');

const esCloserOAdmin = (req, res, next) => {
    if (req.usuario.rol !== 'closer') {
        return res.status(403).json({ msg: 'Acceso denegado. Solo closers.' });
    }
    next();
};

const calcularEstado = (llamadas, citas, periodo = 'diario') => {
    if (periodo === 'diario') {
        if (llamadas >= 12 && citas >= 1) return { estado: 'excelente', color: 'green' };
        if (llamadas >= 8 || citas >= 1) return { estado: 'bueno', color: 'yellow' };
        if (llamadas >= 4) return { estado: 'bajo', color: 'orange' };
        return { estado: 'critico', color: 'red' };
    } else if (periodo === 'semanal') {
        if (llamadas >= 60 && citas >= 8) return { estado: 'excelente', color: 'green' };
        if (llamadas >= 40 || citas >= 5) return { estado: 'bueno', color: 'yellow' };
        if (llamadas >= 20 || citas >= 2) return { estado: 'bajo', color: 'orange' };
        return { estado: 'critico', color: 'red' };
    } else if (periodo === 'mensual') {
        if (llamadas >= 240 && citas >= 32) return { estado: 'excelente', color: 'green' };
        if (llamadas >= 160 || citas >= 20) return { estado: 'bueno', color: 'yellow' };
        if (llamadas >= 80 || citas >= 8) return { estado: 'bajo', color: 'orange' };
        return { estado: 'critico', color: 'red' };
    }
    return { estado: 'sin_datos', color: 'gray' };
};

function getDescripcionEstado(estado) {
    const descripciones = {
        'excelente': 'Rendimiento excelente - Cumpliendo metas',
        'bueno': 'Buen rendimiento - En camino',
        'bajo': 'Rendimiento bajo - Necesita atención',
        'critico': 'Rendimiento crítico - Requiere intervención',
        'sin_datos': 'Sin datos suficientes'
    };
    return descripciones[estado] || 'Estado desconocido';
}

router.get('/monitoring', [auth, esCloserOAdmin], async (req, res) => {
    try {
        const { periodo = 'diario' } = req.query;
        const ahora = new Date();

        const hoy = new Date(ahora);
        hoy.setHours(0, 0, 0, 0);
        const hoyStr = hoy.toISOString();

        const semana = new Date(ahora);
        semana.setDate(ahora.getDate() - 7);
        semana.setHours(0, 0, 0, 0);
        const semanaStr = semana.toISOString();

        let fechaInicio = new Date();
        if (periodo === 'diario') {
            fechaInicio.setHours(0, 0, 0, 0);
        } else if (periodo === 'semanal') {
            fechaInicio.setDate(ahora.getDate() - 7);
            fechaInicio.setHours(0, 0, 0, 0);
        } else if (periodo === 'mensual') {
            fechaInicio.setDate(ahora.getDate() - 30);
            fechaInicio.setHours(0, 0, 0, 0);
        }
        const fechaInicioStr = fechaInicio.toISOString();
        const ahoraStr = ahora.toISOString();

        const prospectors = await dbHelper.getAll('SELECT id, nombre, email as correo FROM usuarios WHERE rol = $1', ['prospector']);
        const prospectorsConMetricas = [];

        for (const prospector of prospectors) {
            const prospectorId = prospector.id;
            const clientesTotalesRow = await dbHelper.getOne('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = $1', [prospectorId]);
            const clientesNuevosRow = await dbHelper.getOne('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = $1 AND fechaRegistro::date >= $2::date', [prospectorId, fechaInicioStr]);
            const actividades = await dbHelper.getAll('SELECT * FROM actividades WHERE vendedor = $1 AND fecha >= $2 AND fecha <= $3', [prospectorId, fechaInicioStr, ahoraStr]);

            const llamadas = actividades.filter(a => a.tipo === 'llamada');
            const llamadasExitosas = llamadas.filter(a => a.resultado === 'exitoso');
            const mensajes = actividades.filter(a => ['mensaje', 'correo', 'whatsapp'].includes(a.tipo));

            const citasAgendadasRow = await dbHelper.getOne('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = $1 AND etapaEmbudo = $2 AND fechaUltimaEtapa::date >= $3::date', [prospectorId, 'reunion_agendada', fechaInicioStr]);
            const transferenciasRow = await dbHelper.getOne('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = $1 AND closerAsignado IS NOT NULL AND fechaTransferencia::date >= $2::date', [prospectorId, fechaInicioStr]);

            const clientesTotales = clientesTotalesRow?.c || 0;
            const clientesNuevos = clientesNuevosRow?.c || 0;
            const citasAgendadas = citasAgendadasRow?.c || 0;
            const transferencias = transferenciasRow?.c || 0;

            const rendimiento = calcularEstado(llamadas.length, citasAgendadas, periodo);
            const tasaContacto = llamadas.length > 0 ? ((llamadasExitosas.length / llamadas.length) * 100).toFixed(1) : 0;
            const tasaAgendamiento = llamadasExitosas.length > 0 ? ((citasAgendadas / llamadasExitosas.length) * 100).toFixed(1) : 0;

            const distribucion = {
                prospecto_nuevo: (await dbHelper.getOne('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = $1 AND etapaEmbudo = $2', [prospectorId, 'prospecto_nuevo']))?.c || 0,
                en_contacto: (await dbHelper.getOne('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = $1 AND etapaEmbudo = $2', [prospectorId, 'en_contacto']))?.c || 0,
                reunion_agendada: (await dbHelper.getOne('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = $1 AND etapaEmbudo = $2', [prospectorId, 'reunion_agendada']))?.c || 0
            };

            const actsHoy = await dbHelper.getAll('SELECT * FROM actividades WHERE vendedor = $1 AND fecha >= $2 AND fecha <= $3', [prospectorId, hoyStr, ahoraStr]);
            const llamadasHoy = actsHoy.filter(a => a.tipo === 'llamada');
            const llamadasExitosasHoy = llamadasHoy.filter(a => a.resultado === 'exitoso');
            const mensajesHoy = actsHoy.filter(a => ['mensaje', 'correo', 'whatsapp'].includes(a.tipo));
            const citasHoyRow = await dbHelper.getOne('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = $1 AND etapaEmbudo = $2 AND fechaUltimaEtapa::date >= $3::date', [prospectorId, 'reunion_agendada', hoyStr]);
            const clientesNuevosHoyRow = await dbHelper.getOne('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = $1 AND fechaRegistro::date >= $2::date', [prospectorId, hoyStr]);
            const citasHoy = citasHoyRow?.c || 0;
            const clientesNuevosHoy = clientesNuevosHoyRow?.c || 0;
            const rendimientoHoy = calcularEstado(llamadasHoy.length, citasHoy, 'diario');

            const detalleHoy = {
                llamadas: llamadasHoy.length,
                llamadasExitosas: llamadasExitosasHoy.length,
                mensajes: mensajesHoy.length,
                citasAgendadas: citasHoy,
                prospectosRegistrados: clientesNuevosHoy,
                estado: rendimientoHoy.estado,
                color: rendimientoHoy.color
            };

            const actsSemana = await dbHelper.getAll('SELECT * FROM actividades WHERE vendedor = $1 AND fecha >= $2 AND fecha <= $3', [prospectorId, semanaStr, ahoraStr]);
            const llamadasSemana = actsSemana.filter(a => a.tipo === 'llamada');
            const llamadasExitosasSemana = llamadasSemana.filter(a => a.resultado === 'exitoso');
            const mensajesSemana = actsSemana.filter(a => ['mensaje', 'correo', 'whatsapp'].includes(a.tipo));
            const citasSemanaRow = await dbHelper.getOne('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = $1 AND etapaEmbudo = $2 AND fechaUltimaEtapa::date >= $3::date', [prospectorId, 'reunion_agendada', semanaStr]);
            const clientesNuevosSemanaRow = await dbHelper.getOne('SELECT COUNT(*) as c FROM clientes WHERE prospectorAsignado = $1 AND fechaRegistro::date >= $2::date', [prospectorId, semanaStr]);
            const citasSemana = citasSemanaRow?.c || 0;
            const clientesNuevosSemana = clientesNuevosSemanaRow?.c || 0;
            const rendimientoSemana = calcularEstado(llamadasSemana.length, citasSemana, 'semanal');

            const detalleSemana = {
                llamadas: llamadasSemana.length,
                llamadasExitosas: llamadasExitosasSemana.length,
                mensajes: mensajesSemana.length,
                citasAgendadas: citasSemana,
                prospectosRegistrados: clientesNuevosSemana,
                estado: rendimientoSemana.estado,
                color: rendimientoSemana.color
            };

            prospectorsConMetricas.push({
                prospector: { id: String(prospector.id), nombre: prospector.nombre, correo: prospector.correo || '' },
                metricas: {
                    llamadas: { total: llamadas.length, exitosas: llamadasExitosas.length },
                    mensajes: { total: mensajes.length },
                    citas: { agendadas: citasAgendadas, transferidas: transferencias },
                    prospectos: { total: clientesTotales, nuevos: clientesNuevos, revisados: llamadas.length },
                    tasas: { contacto: parseFloat(tasaContacto), agendamiento: parseFloat(tasaAgendamiento) }
                },
                distribucion,
                rendimiento: {
                    estado: rendimiento.estado,
                    color: rendimiento.color,
                    descripcion: getDescripcionEstado(rendimiento.estado)
                },
                periodo,
                detalleHoy,
                detalleSemana
            });
        }

        const ordenEstado = { 'excelente': 0, 'bueno': 1, 'bajo': 2, 'critico': 3, 'sin_datos': 4 };
        prospectorsConMetricas.sort((a, b) => ordenEstado[a.rendimiento.estado] - ordenEstado[b.rendimiento.estado]);

        res.json({
            periodo,
            fechaInicio: fechaInicioStr,
            fechaFin: ahoraStr,
            totalProspectors: prospectorsConMetricas.length,
            prospectors: prospectorsConMetricas
        });
    } catch (error) {
        console.error('Error en monitoreo:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

module.exports = router;
