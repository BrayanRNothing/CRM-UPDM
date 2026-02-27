const express = require('express');
const router = express.Router();
const dbHelper = require('../config/db-helper');
const { auth } = require('../middleware/auth');
const { toMongoFormat, toMongoFormatMany } = require('../lib/helpers');
const { buildUpdate } = require('../lib/query-builder');

const esCloser = (req, res, next) => {
    if (req.usuario.rol !== 'closer') {
        return res.status(403).json({ msg: 'Acceso denegado. Solo closers.' });
    }
    next();
};

router.get('/dashboard', [auth, esCloser], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        const clientes = await dbHelper.getAll('SELECT * FROM clientes WHERE closerAsignado = $1', [closerId]);

        const embudo = {
            total: clientes.length,
            reunion_agendada: clientes.length, // Todo cliente asignado pasa por agendada
            reunion_realizada: 0,
            propuesta_enviada: 0,
            venta_ganada: 0,
            en_negociacion: 0,
            perdido: 0
        };

        const analisisPerdidas = {
            no_asistio: 0,
            no_interesado: 0
        };

        for (const c of clientes) {
            if (c.etapaEmbudo === 'en_negociacion') embudo.en_negociacion++;
            if (c.etapaEmbudo === 'perdido') embudo.perdido++;

            const hist = c.historialEmbudo ? JSON.parse(c.historialEmbudo) : [];
            const results = hist.map(h => h.resultado).filter(Boolean);
            const rLast = results.length > 0 ? results[results.length - 1] : null;

            let realized = false;
            let propuesta = false;
            let venta = false;

            if (c.etapaEmbudo === 'venta_ganada') {
                realized = true; propuesta = true; venta = true;
            } else if (c.etapaEmbudo === 'en_negociacion') {
                realized = true; propuesta = true;
            } else if (c.etapaEmbudo === 'reunion_realizada') {
                realized = true;
            } else if (c.etapaEmbudo === 'perdido') {
                if (rLast === 'no_asistio' || results.includes('no_asistio')) {
                    analisisPerdidas.no_asistio++;
                } else {
                    realized = true;
                    analisisPerdidas.no_interesado++;
                }
            } else {
                if (rLast === 'venta') {
                    realized = true; propuesta = true; venta = true;
                } else if (rLast === 'cotizacion') {
                    realized = true; propuesta = true;
                } else if (rLast === 'no_venta' || rLast === 'otra_reunion') {
                    realized = true;
                    if (rLast === 'no_venta') analisisPerdidas.no_interesado++;
                } else if (rLast === 'no_asistio') {
                    analisisPerdidas.no_asistio++;
                }
            }

            if (realized) embudo.reunion_realizada++;
            if (propuesta) embudo.propuesta_enviada++;
            if (venta) embudo.venta_ganada++;
        }

        const hoyInicioDate = new Date();
        hoyInicioDate.setHours(0, 0, 0, 0);
        const hoyInicio = hoyInicioDate.toISOString();

        const hoyFinDate = new Date();
        hoyFinDate.setHours(23, 59, 59, 999);
        const hoyFin = hoyFinDate.toISOString();

        const reunionesHoy = await dbHelper.getAll(
            'SELECT * FROM actividades WHERE vendedor = $1 AND tipo = $2 AND fecha >= $3 AND fecha <= $4',
            [closerId, 'cita', hoyInicio, hoyFin]
        );

        const actividadesHoy = await dbHelper.getAll(
            'SELECT * FROM actividades WHERE vendedor = $1 AND fecha >= $2 AND fecha <= $3',
            [closerId, hoyInicio, hoyFin]
        );

        const reunionesRealizadasHoy = actividadesHoy.filter(a => a.tipo === 'cita' && a.resultado !== 'pendiente').length;
        const propuestasHoy = actividadesHoy.filter(a => a.descripcion && a.descripcion.toLowerCase().includes('cotización')).length;

        const inicioMesDate = new Date();
        inicioMesDate.setDate(1);
        inicioMesDate.setHours(0, 0, 0, 0);
        const inicioMes = inicioMesDate.toISOString();

        const ventasMes = await dbHelper.getAll('SELECT * FROM ventas WHERE vendedor = $1 AND fecha >= $2', [closerId, inicioMes]);
        const ventasHoy = await dbHelper.getAll('SELECT * FROM ventas WHERE vendedor = $1 AND fecha >= $2 AND fecha <= $3', [closerId, hoyInicio, hoyFin]);
        const montoTotalMes = ventasMes.reduce((sum, v) => sum + (v.monto || 0), 0);

        const tasasConversion = {
            asistencia: embudo.reunion_agendada > 0 ? ((embudo.reunion_realizada / embudo.reunion_agendada) * 100).toFixed(1) : '0.0',
            interes: embudo.reunion_realizada > 0 ? ((embudo.propuesta_enviada / embudo.reunion_realizada) * 100).toFixed(1) : '0.0',
            cierre: embudo.propuesta_enviada > 0 ? ((embudo.venta_ganada / embudo.propuesta_enviada) * 100).toFixed(1) : '0.0',
            global: embudo.reunion_agendada > 0 ? ((embudo.venta_ganada / embudo.reunion_agendada) * 100).toFixed(1) : '0.0'
        };

        res.json({
            embudo,
            metricas: {
                reuniones: { hoy: reunionesHoy.length, pendientes: clientes.filter(c => c.etapaEmbudo === 'reunion_agendada').length, realizadas: embudo.reunion_realizada, realizadasHoy: reunionesRealizadasHoy, propuestasHoy: propuestasHoy },
                ventas: { mes: ventasMes.length, montoMes: montoTotalMes, totales: embudo.venta_ganada, ventasHoy: ventasHoy.length },
                negociaciones: { activas: embudo.en_negociacion }
            },
            tasasConversion,
            analisisPerdidas
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

router.get('/calendario', [auth, esCloser], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        
        // Obtener todas las citas pendientes de la BD
        const rows = await dbHelper.getAll(`
            SELECT a.*, c.nombres as c_nombres, c.apellidoPaterno as c_apellido, c.empresa as c_empresa, c.telefono as c_telefono, c.correo as c_correo, c.etapaEmbudo as c_etapa,
            u.nombre as v_nombre FROM actividades a
            JOIN clientes c ON a.cliente = c.id
            JOIN usuarios u ON a.vendedor = u.id
            WHERE c.closerAsignado = $1 AND a.tipo = $2 AND a.resultado = 'pendiente'
            ORDER BY a.fecha ASC
        `, [closerId, 'cita']);

        // Filtrar citas que ya pasaron automáticamente
        const ahora = new Date();
        let reuniones = rows.filter(r => {
            const fechaCita = new Date(r.fecha);
            return fechaCita >= ahora;
        }).map(r => ({
            ...toMongoFormat(r),
            cliente: { nombres: r.c_nombres, apellidoPaterno: r.c_apellido, empresa: r.c_empresa, telefono: r.c_telefono, correo: r.c_correo, etapaEmbudo: r.c_etapa },
            vendedor: { nombre: r.v_nombre }
        }));

        // Marcar como fallidas las citas que ya pasaron
        const citasPasadas = rows.filter(r => new Date(r.fecha) < ahora);
        for (const cita of citasPasadas) {
            await dbHelper.run(
                        `UPDATE actividades SET resultado = 'fallido', notas = COALESCE(notas || ' ', '') || '[Auto] Cita pasada sin registrar' WHERE id = $1`,
                        [cita.id]
            );
        }

        // Intentar sincronizar con Google Calendar si está conectado
        try {
            const usuario = await dbHelper.getOne('SELECT googleRefreshToken, googleAccessToken, googleTokenExpiry FROM usuarios WHERE id = $1', [closerId]);
            
            if (usuario && (usuario.googleRefreshToken || usuario.googleAccessToken)) {
                const { OAuth2Client } = require('google-auth-library');
                const { google } = require('googleapis');

                const client = new OAuth2Client(
                    process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET
                );

                client.setCredentials({
                    refresh_token: usuario.googleRefreshToken,
                    access_token: usuario.googleAccessToken,
                    expiry_date: usuario.googleTokenExpiry
                });

                // Actualizar tokens si se refrescan
                client.on('tokens', async (tokens) => {
                    const updates = {};
                    if (tokens.refresh_token) updates.googleRefreshToken = tokens.refresh_token;
                    if (tokens.access_token) updates.googleAccessToken = tokens.access_token;
                    if (tokens.expiry_date) updates.googleTokenExpiry = tokens.expiry_date;

                    if (Object.keys(updates).length > 0) {
                        const { sql, params } = buildUpdate('usuarios', updates, { id: closerId });
                        await dbHelper.run(sql, params);
                    }
                });

                const calendar = google.calendar({ version: 'v3', auth: client });

                // Obtener eventos de Google Calendar desde ahora hasta 30 días adelante
                const timeMax = new Date();
                timeMax.setDate(timeMax.getDate() + 30);

                const response = await calendar.events.list({
                    calendarId: 'primary',
                    timeMin: ahora.toISOString(),
                    timeMax: timeMax.toISOString(),
                    singleEvents: true,
                    orderBy: 'startTime'
                });

                const eventosGoogle = response.data.items || [];
                
                // Verificar cada cita pendiente si todavía existe en Google Calendar
                const reunionesActualizadas = [];
                for (const reunion of reuniones) {
                    const fechaReunion = new Date(reunion.fecha);
                    
                    // Buscar si existe un evento en Google Calendar cercano a esta fecha (+/- 5 minutos)
                    const existeEnGoogle = eventosGoogle.some(evento => {
                        if (!evento.start || !evento.start.dateTime) return false;
                        const fechaEvento = new Date(evento.start.dateTime);
                        const diferencia = Math.abs(fechaEvento - fechaReunion);
                        return diferencia < 5 * 60 * 1000; // 5 minutos de tolerancia
                    });

                    if (existeEnGoogle) {
                        // La cita todavía existe en Google Calendar
                        reunionesActualizadas.push(reunion);
                    } else {
                        // La cita fue eliminada de Google Calendar, marcarla como cancelada
                        await dbHelper.run(
                            `UPDATE actividades SET resultado = 'fallido', notas = COALESCE(notas || ' ', '') || '[Sync] Eliminada de Google Calendar' WHERE id = $1`,
                            [reunion.id || reunion._id]
                        );
                    }
                }

                reuniones = reunionesActualizadas;
            }
        } catch (syncError) {
            // Si falla la sincronización con Google, continuar con los datos locales
            console.error('Error al sincronizar con Google Calendar:', syncError.message);
        }

        res.json(reuniones);
    } catch (error) {
        console.error('Error en calendario:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

router.get('/reuniones-pendientes', [auth, esCloser], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        const rows = await dbHelper.getAll(`
            SELECT c.*, u.nombre as prospectorNombre FROM clientes c
            LEFT JOIN usuarios u ON c.prospectorAsignado = u.id
            WHERE c.closerAsignado = $1 AND c.etapaEmbudo = $2
        `, [closerId, 'reunion_agendada']);
        const clientes = rows.map(r => {
            const { prospectorNombre, ...c } = r;
            const out = toMongoFormat(c);
            if (out) out.prospectorAsignado = { nombre: prospectorNombre };
            return out;
        });
        res.json(clientes);
    } catch (error) {
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

router.get('/prospectos', [auth, esCloser], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        const rows = await dbHelper.getAll(`
            SELECT c.*, u.nombre as prospectorNombre FROM clientes c
            LEFT JOIN usuarios u ON c.prospectorAsignado = u.id
            WHERE c.closerAsignado = $1 AND c.etapaEmbudo != $2
            ORDER BY c.fechaTransferencia DESC
        `, [closerId, 'venta_ganada']);
        res.json(rows.map(r => {
            const { prospectorNombre, ...c } = r;
            const out = toMongoFormat(c);
            if (out) out.prospectorAsignado = { nombre: prospectorNombre };
            return out;
        }));
    } catch (error) {
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// GET /api/closer/clientes-ganados
router.get('/clientes-ganados', [auth, esCloser], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);
        const rows = await dbHelper.getAll(`
            SELECT c.*, u.nombre as prospectorNombre FROM clientes c
            LEFT JOIN usuarios u ON c.prospectorAsignado = u.id
            WHERE c.closerAsignado = $1 AND c.etapaEmbudo = $2
            ORDER BY c.fechaUltimaEtapa DESC
        `, [closerId, 'venta_ganada']);
        res.json(rows.map(r => {
            const { prospectorNombre, ...c } = r;
            const out = toMongoFormat(c);
            if (out) out.prospectorAsignado = { nombre: prospectorNombre };
            return out;
        }));
    } catch (error) {
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/closer/crear-prospecto
router.post('/crear-prospecto', [auth, esCloser], async (req, res) => {
    try {
        const { nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, notas } = req.body;
        if (!nombres || !telefono) {
            return res.status(400).json({ msg: 'Nombres y teléfono son requeridos' });
        }

        const closerId = parseInt(req.usuario.id);
        const now = new Date().toISOString();

        const row = await dbHelper.getOne(
            `INSERT INTO clientes (nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, notas, closerAsignado, etapaEmbudo)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'prospecto_nuevo') RETURNING *`,
            [
                nombres.trim(),
                (apellidoPaterno || '').trim(),
                (apellidoMaterno || '').trim(),
                String(telefono).trim(),
                String(correo || '').trim().toLowerCase(),
                (empresa || '').trim(),
                (notas || '').trim(),
                closerId
            ]
        );
        const cliente = toMongoFormat(row);
        if (cliente) cliente.closerAsignado = { nombre: req.usuario.nombre };

        res.status(201).json({ msg: 'Prospecto creado', cliente: cliente || row });
    } catch (error) {
        console.error('Error al crear prospecto:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/closer/registrar-actividad
router.post('/registrar-actividad', [auth, esCloser], async (req, res) => {
    try {
        const { clienteId, tipo, resultado, descripcion, notas, fechaCita } = req.body;
        const tiposValidos = ['llamada', 'mensaje', 'correo', 'whatsapp', 'cita', 'cliente', 'descartado'];
        const resultadosValidos = ['exitoso', 'pendiente', 'fallido', 'convertido', 'descartado', 'enviado'];

        if (!clienteId || !tipo) {
            return res.status(400).json({ msg: 'Cliente y tipo de actividad son requeridos' });
        }
        if (!tiposValidos.includes(tipo)) {
            return res.status(400).json({ msg: 'Tipo de actividad no válido' });
        }

        const cid = parseInt(clienteId);
        const cliente = await dbHelper.getOne('SELECT * FROM clientes WHERE id = $1', [cid]);
        if (!cliente) {
            return res.status(404).json({ msg: 'Cliente no encontrado' });
        }
        const closerId = parseInt(req.usuario.id);

        // MEJORADO: Validar que el closer esté asignado O que sea un prospector registrando
        // (permitir que prospector registre actividades de sus propios clientes)
        const esCloserAsignado = parseInt(cliente.closerAsignado) === closerId;
        const esProspectorDelCliente = parseInt(cliente.prospectorAsignado) === closerId && String(req.usuario.rol).toLowerCase() === 'prospector';

        if (!esCloserAsignado && !esProspectorDelCliente) {
            return res.status(403).json({ msg: 'No tienes permiso para registrar actividades de este cliente' });
        }

        const resultadoFinal = resultado && resultadosValidos.includes(resultado) ? resultado : 'pendiente';
        const fechaActividad = tipo === 'cita' && fechaCita ? new Date(fechaCita).toISOString() : new Date().toISOString();

        await dbHelper.run(
            `INSERT INTO actividades (tipo, vendedor, cliente, fecha, descripcion, resultado, notas)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [tipo, closerId, cid, fechaActividad, descripcion || `${tipo} registrada`, resultadoFinal, notas || '']
        );

        const now = new Date().toISOString();
        await dbHelper.run('UPDATE clientes SET ultimaInteraccion = $1 WHERE id = $2', [now, cid]);

        const actRow = await dbHelper.getOne('SELECT * FROM actividades ORDER BY id DESC LIMIT 1');
        const actividad = toMongoFormat(actRow);
        if (actividad) actividad.cliente = { nombres: cliente.nombres, apellidoPaterno: cliente.apellidoPaterno, empresa: cliente.empresa };

        res.status(201).json({ msg: 'Actividad registrada', actividad: actividad || actRow });
    } catch (error) {
        console.error('Error al registrar actividad:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// GET /api/closer/prospecto/:id/historial-completo
// NUEVO: Historial COMPLETO para closer y prospector que trabajaron el caso
router.get('/prospecto/:id/historial-completo', [auth, esCloser], async (req, res) => {
    try {
        const prospectoId = parseInt(req.params.id);
        const usuarioId = parseInt(req.usuario.id);

        // Obtener cliente
        const cliente = await dbHelper.getOne('SELECT * FROM clientes WHERE id = $1', [prospectoId]);
        if (!cliente) {
            return res.status(404).json({ msg: 'Prospecto no encontrado' });
        }

        // Validar permisos: solo el closer o prospector asignado pueden ver
        const esCloserAsignado = parseInt(cliente.closerAsignado) === usuarioId;
        if (!esCloserAsignado) {
            return res.status(403).json({ msg: 'No tienes permiso para ver este historial' });
        }

        // Obtener TODAS las actividades del cliente (de prospector Y closer)
        const actividades = await dbHelper.getAll(`
            SELECT a.*, u.nombre as vendedorNombre, u.rol as vendedorRol
            FROM actividades a
            LEFT JOIN usuarios u ON a.vendedor = u.id
            WHERE a.cliente = $1
            ORDER BY a.fecha ASC
        `, [prospectoId]);

        // Obtener historial del embudo
        const historialEmbudo = cliente.historialEmbudo ? JSON.parse(cliente.historialEmbudo) : [];

        // Construir timeline completo
        const timeline = [];

        // Agregar cambios de etapa (FILTRAR los redundantes con actividades de cita)
        // Las etapas de reunion_agendada y reunion_realizada ya se muestran como actividades tipo 'cita'
        const etapasRelacionadasConCitas = ['reunion_agendada', 'reunion_realizada'];
        
        historialEmbudo.forEach(h => {
            // Solo agregar cambios de etapa que NO sean redundantes con actividades de cita
            const esRedundante = etapasRelacionadasConCitas.includes(h.etapa) && 
                                 actividades.some(a => a.tipo === 'cita' && 
                                                      Math.abs(new Date(a.fecha) - new Date(h.fecha)) < 60000); // 1 minuto tolerancia
            
            if (!esRedundante) {
                timeline.push({
                    tipo: 'cambio_etapa',
                    etapa: h.etapa,
                    fecha: h.fecha,
                    vendedorId: h.vendedor,
                    descripcion: h.descripcion || `Cambio a etapa: ${h.etapa}`,
                    resultado: h.resultado || null
                });
            }
        });

        // Agregar actividades
        actividades.forEach(a => {
            const mongoAct = toMongoFormat(a);
            timeline.push({
                tipo: 'actividad',
                id: mongoAct?.id || a.id,
                tipoActividad: a.tipo,
                fecha: a.fecha,
                vendedorId: a.vendedor,
                vendedorNombre: a.vendedorNombre || 'Desconocido',
                vendedorRol: a.vendedorRol || 'vendedor',
                descripcion: a.descripcion,
                resultado: a.resultado,
                notas: a.notas
            });
        });

        // Ordenar por fecha
        timeline.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        res.json({
            cliente: toMongoFormat(cliente) || cliente,
            timeline,
            resumen: {
                totalActividades: actividades.length,
                etapaActual: cliente.etapaEmbudo,
                ultimaInteraccion: cliente.ultimaInteraccion,
                prospectorAsignado: cliente.prospectorAsignado,
                closerAsignado: cliente.closerAsignado,
                vendedoresInvolucrados: [...new Set(actividades.map(a => a.vendedorNombre).filter(Boolean))]
            }
        });
    } catch (error) {
        console.error('Error al obtener historial completo:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// GET /api/closer/prospectos/:id/actividades
router.get('/prospectos/:id/actividades', auth, async (req, res) => {
    try {
        const prospectoId = parseInt(req.params.id);
        const closerId = parseInt(req.usuario.id);

        const cliente = await dbHelper.getOne('SELECT id, closerAsignado FROM clientes WHERE id = $1', [prospectoId]);
        if (!cliente) return res.status(404).json({ msg: 'Prospecto no encontrado' });
        if (parseInt(cliente.closerAsignado) !== closerId) return res.status(403).json({ msg: 'No tienes permiso' });

        const acts = await dbHelper.getAll('SELECT a.*, u.nombre as vendedorNombre FROM actividades a LEFT JOIN usuarios u ON a.vendedor = u.id WHERE a.cliente = $1 ORDER BY a.fecha DESC', [prospectoId]);
        const actividades = acts.map(a => {
            const { vendedorNombre, ...act } = a;
            const out = toMongoFormat(act);
            if (out && vendedorNombre) out.vendedorNombre = vendedorNombre;
            return out || act;
        });
        res.json(actividades);
    } catch (error) {
        res.status(500).json({ msg: 'Error al obtener actividades' });
    }
});

router.post('/registrar-reunion', [auth, esCloser], async (req, res) => {
    try {
        const { clienteId, resultado, notas } = req.body;

        const resultadosValidos = ['no_asistio', 'no_venta', 'otra_reunion', 'cotizacion', 'venta'];
        if (!clienteId || !resultado || !resultadosValidos.includes(resultado)) {
            return res.status(400).json({ msg: 'clienteId y resultado son requeridos' });
        }

        const cid = parseInt(clienteId);
        const closerId = parseInt(req.usuario.id);
        const c = await dbHelper.getOne('SELECT * FROM clientes WHERE id = $1', [cid]);
        if (!c || parseInt(c.closerAsignado) !== closerId) return res.status(403).json({ msg: 'No autorizado' });

        // Mapa de resultado → etapa del embudo
        const etapaMap = {
            no_asistio: 'perdido',
            no_venta: 'perdido',
            otra_reunion: 'reunion_agendada',
            cotizacion: 'en_negociacion',
            venta: 'venta_ganada'
        };

        // Descripción legible para el historial
        const descMap = {
            no_asistio: 'Reunión — Cliente no asistió',
            no_venta: 'Reunión realizada — No le interesó',
            otra_reunion: 'Reunión realizada — Quiere otra reunión',
            cotizacion: 'Reunión realizada — Quiere cotización',
            venta: 'Reunión realizada — ¡Venta cerrada!'
        };

        const etapaNueva = etapaMap[resultado];
        const descripcion = descMap[resultado];
        const now = new Date().toISOString();

        const hist = c.historialEmbudo ? JSON.parse(c.historialEmbudo) : [];
        hist.push({ etapa: etapaNueva, fecha: now, vendedor: closerId, resultado, descripcion });

        const estado = etapaNueva === 'venta_ganada' ? 'ganado'
            : etapaNueva === 'perdido' ? 'perdido'
                : 'proceso';

        await dbHelper.run(
            'UPDATE clientes SET etapaEmbudo = $1, estado = $2, fechaUltimaEtapa = $3, ultimaInteraccion = $4, historialEmbudo = $5 WHERE id = $6',
            [etapaNueva, estado, now, now, JSON.stringify(hist), cid]
        );

        const resStatus = resultado === 'venta' ? 'exitoso' : (resultado === 'no_asistio' || resultado === 'no_venta' ? 'fallido' : 'exitoso');

        // Cerrar citas pendientes previas para que no salgan en el dashboard
        await dbHelper.run(
            `UPDATE actividades SET resultado = $1 WHERE cliente = $2 AND tipo = 'cita' AND resultado = 'pendiente'`,
            [resStatus, cid]
        );

        await dbHelper.run(
            'INSERT INTO actividades (tipo, vendedor, cliente, fecha, descripcion, resultado, notas) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            ['cita', closerId, cid, now, descripcion, resStatus, notas || '']
        );

        const row = await dbHelper.getOne('SELECT * FROM clientes WHERE id = $1', [cid]);
        res.json({ msg: 'Reunión registrada', cliente: toMongoFormat(row) || row });
    } catch (error) {
        console.error('Error al registrar reunión:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// PUT /api/closer/prospectos/:id/editar
router.put('/prospectos/:id/editar', [auth, esCloser], async (req, res) => {
    try {
        const prospectoId = parseInt(req.params.id);
        const { nombres, apellidoPaterno, apellidoMaterno, telefono, correo, empresa, ubicacion, notas } = req.body;
        const closerId = parseInt(req.usuario.id);

        if (!nombres || !telefono) {
            return res.status(400).json({ msg: 'Nombres y teléfono son requeridos' });
        }

        const cliente = await dbHelper.getOne('SELECT id, closerAsignado FROM clientes WHERE id = $1', [prospectoId]);
        if (!cliente) return res.status(404).json({ msg: 'Prospecto no encontrado' });
        if (parseInt(cliente.closerAsignado) !== closerId) return res.status(403).json({ msg: 'No tienes permiso para editar este prospecto' });

        await dbHelper.run(
            `UPDATE clientes 
             SET nombres = $1, apellidoPaterno = $2, apellidoMaterno = $3, telefono = $4, correo = $5, empresa = $6, notas = $7
             WHERE id = $8`,
            [
                nombres.trim(),
                (apellidoPaterno || '').trim(),
                (apellidoMaterno || '').trim(),
                String(telefono).trim(),
                String(correo || '').trim().toLowerCase(),
                (empresa || '').trim(),
                (notas || '').trim(),
                prospectoId
            ]
        );

        res.json({ msg: 'Prospecto actualizado exitosamente' });
    } catch (error) {
        console.error('Error al editar prospecto:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/closer/pasar-a-cliente/:id
router.post('/pasar-a-cliente/:id', [auth, esCloser], async (req, res) => {
    try {
        const { notas } = req.body;
        const clienteId = parseInt(req.params.id);
        const closerId = parseInt(req.usuario.id);

        const cliente = await dbHelper.getOne('SELECT * FROM clientes WHERE id = $1', [clienteId]);
        if (!cliente) {
            return res.status(404).json({ msg: 'Prospecto no encontrado' });
        }

        if (parseInt(cliente.closerAsignado) !== closerId) {
            return res.status(403).json({ msg: 'No tienes permiso para modificar este prospecto' });
        }

        const now = new Date().toISOString();

        // Registrar la actividad de conversión
        await dbHelper.run(
            `INSERT INTO actividades (tipo, vendedor, cliente, fecha, descripcion, resultado, notas)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            ['prospecto', closerId, clienteId, now, 'Prospecto convertido a cliente', 'exitoso', notas || 'Convertido a cliente']
        );

        // Actualizar etapa del prospecto
        const hist = cliente.historialEmbudo ? JSON.parse(cliente.historialEmbudo) : [];
        hist.push({ etapa: 'venta_ganada', fecha: now, vendedor: closerId });

        await dbHelper.run(
            'UPDATE clientes SET etapaEmbudo = $1, estado = $2, fechaUltimaEtapa = $3, ultimaInteraccion = $4, historialEmbudo = $5 WHERE id = $6',
            ['venta_ganada', 'ganado', now, now, JSON.stringify(hist), clienteId]
        );

        res.json({ msg: '✓ Prospecto convertido a cliente' });
    } catch (error) {
        console.error('Error al pasar a cliente:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/closer/descartar-prospecto/:id
router.post('/descartar-prospecto/:id', [auth, esCloser], async (req, res) => {
    try {
        const { notas } = req.body;
        const clienteId = parseInt(req.params.id);
        const closerId = parseInt(req.usuario.id);

        const cliente = await dbHelper.getOne('SELECT * FROM clientes WHERE id = $1', [clienteId]);
        if (!cliente) {
            return res.status(404).json({ msg: 'Prospecto no encontrado' });
        }

        if (parseInt(cliente.closerAsignado) !== closerId) {
            return res.status(403).json({ msg: 'No tienes permiso para modificar este prospecto' });
        }

        const now = new Date().toISOString();

        // Registrar la actividad de descarte
        await dbHelper.run(
            `INSERT INTO actividades (tipo, vendedor, cliente, fecha, descripcion, resultado, notas)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            ['prospecto', closerId, clienteId, now, 'Prospecto descartado', 'fallido', notas || 'Descartado']
        );

        // Actualizar etapa del prospecto
        const hist = cliente.historialEmbudo ? JSON.parse(cliente.historialEmbudo) : [];
        hist.push({ etapa: 'perdido', fecha: now, vendedor: closerId });

        await dbHelper.run(
            'UPDATE clientes SET etapaEmbudo = $1, fechaUltimaEtapa = $2, ultimaInteraccion = $3, historialEmbudo = $4 WHERE id = $5',
            ['perdido', now, now, JSON.stringify(hist), clienteId]
        );

        res.json({ msg: '✓ Prospecto descartado' });
    } catch (error) {
        console.error('Error al descartar prospecto:', error);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// POST /api/closer/marcar-evento-completado
// Guarda localmente que un evento de Google Calendar fue completado
router.post('/marcar-evento-completado', [auth, esCloser], async (req, res) => {
    try {
        const { googleEventId, clienteId, resultado, notas } = req.body;

        if (!googleEventId) {
            return res.status(400).json({ msg: 'googleEventId es requerido' });
        }

        const closerId = parseInt(req.usuario.id);
        const now = new Date().toISOString();

        // Crear tabla si no existe (PostgreSQL)
        await dbHelper.run(`
            CREATE TABLE IF NOT EXISTS google_events_completed (
                id SERIAL PRIMARY KEY,
                googleEventId TEXT NOT NULL UNIQUE,
                closerId INTEGER NOT NULL,
                clienteId INTEGER,
                resultado TEXT,
                notas TEXT,
                fechaCompletado TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Guardar o actualizar
        await dbHelper.run(
            `INSERT INTO google_events_completed (googleEventId, closerId, clienteId, resultado, notas)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (googleEventId) DO UPDATE SET
                closerId = EXCLUDED.closerId,
                clienteId = EXCLUDED.clienteId,
                resultado = EXCLUDED.resultado,
                notas = EXCLUDED.notas`,
            [googleEventId, closerId, clienteId || null, resultado || null, notas || null]
        );

        console.log(`✅ Evento ${googleEventId} marcado como completado en BD`);

        res.json({ msg: 'Evento marcado como completado', googleEventId });
    } catch (error) {
        console.error('❌ Error al marcar evento completado:', error);
        res.status(500).json({ msg: 'Error al marcar evento', error: error.message });
    }
});

// GET /api/closer/google-events-completados
// Obtiene lista de eventos completados para verificar en frontend
router.get('/google-events-completados', [auth, esCloser], async (req, res) => {
    try {
        const closerId = parseInt(req.usuario.id);

        // Tabla podría no existir aún
        try {
            const completados = await dbHelper.getAll(
                'SELECT googleEventId, resultado FROM google_events_completed WHERE closerId = $1',
                [closerId]
            );
            res.json(completados);
        } catch (err) {
            // Tabla no existe aún
            res.json([]);
        }
    } catch (error) {
        console.error('Error al traer eventos completados:', error);
        res.json([]);
    }
});

module.exports = router;
