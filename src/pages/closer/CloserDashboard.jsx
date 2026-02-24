import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Users, RefreshCw, Award, Clock, BarChart3, Target, CheckCircle2, DollarSign, AlertTriangle, TrendingDown, Zap } from 'lucide-react';
import axios from 'axios';
import FunnelVisual from '../../components/FunnelVisual';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Datos iniciales en 0 cuando no hay conexión
const INITIAL_DATA = {
    embudo: {
        reunion_agendada: 0,
        reunion_realizada: 0,
        propuesta_enviada: 0,
        venta_ganada: 0
    },
    metricas: {
        reuniones: { hoy: 0, pendientes: 0, realizadas: 0 },
        ventas: { mes: 0, montoMes: 0, totales: 0, montoTotal: 0 },
        clientes: { totales: 0 },
        negociaciones: { activas: 0 }
    },
    tasasConversion: {
        asistencia: 0,
        interes: 0,
        cierre: 0,
        global: 0
    },
    analisisPerdidas: {
        no_asistio: 0,
        no_interesado: 0
    }
};

const CloserDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [tareas, setTareas] = useState([]);
    const [loadingTareas, setLoadingTareas] = useState(false);
    const [usandoMock, setUsandoMock] = useState(false);

    // Función para sanitizar datos y evitar NaN
    const sanitizeData = (rawData) => {
        if (!rawData) return INITIAL_DATA;
        
        const getNumero = (val) => {
            const num = parseFloat(val);
            return isNaN(num) || num === null ? 0 : num;
        };

        return {
            ...rawData,
            embudo: {
                reunion_agendada: getNumero(rawData?.embudo?.reunion_agendada),
                reunion_realizada: getNumero(rawData?.embudo?.reunion_realizada),
                propuesta_enviada: getNumero(rawData?.embudo?.propuesta_enviada),
                venta_ganada: getNumero(rawData?.embudo?.venta_ganada)
            },
            metricas: {
                reuniones: {
                    hoy: getNumero(rawData?.metricas?.reuniones?.hoy),
                    pendientes: getNumero(rawData?.metricas?.reuniones?.pendientes),
                    realizadas: getNumero(rawData?.metricas?.reuniones?.realizadas)
                },
                ventas: {
                    mes: getNumero(rawData?.metricas?.ventas?.mes),
                    montoMes: getNumero(rawData?.metricas?.ventas?.montoMes),
                    totales: getNumero(rawData?.metricas?.ventas?.totales),
                    montoTotal: getNumero(rawData?.metricas?.ventas?.montoTotal)
                },
                clientes: {
                    totales: getNumero(rawData?.metricas?.clientes?.totales)
                },
                negociaciones: {
                    activas: getNumero(rawData?.metricas?.negociaciones?.activas)
                }
            },
            tasasConversion: {
                asistencia: getNumero(rawData?.tasasConversion?.asistencia),
                interes: getNumero(rawData?.tasasConversion?.interes),
                cierre: getNumero(rawData?.tasasConversion?.cierre),
                global: getNumero(rawData?.tasasConversion?.global)
            },
            analisisPerdidas: {
                no_asistio: getNumero(rawData?.analisisPerdidas?.no_asistio),
                no_interesado: getNumero(rawData?.analisisPerdidas?.no_interesado)
            }
        };
    };

    const getAuthHeaders = () => ({
        'x-auth-token': localStorage.getItem('token') || ''
    });

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            if (!token) {
                setData(INITIAL_DATA);
                setUsandoMock(true);
                setLoading(false);
                return;
            }

            const config = { headers: { 'x-auth-token': token } };

            try {
                const res = await axios.get(`${API_URL}/api/closer/dashboard`, config);
                setData(sanitizeData(res.data));
                setUsandoMock(false);
            } catch (error) {
                console.log('⚠️ Usando datos iniciales (sin backend):', error.message);
                setData(INITIAL_DATA);
                setUsandoMock(true);
            }
        } catch (error) {
            setData(INITIAL_DATA);
            setUsandoMock(true);
        } finally {
            setLoading(false);
        }
    };

    const cargarTareas = async () => {
        setLoadingTareas(true);
        try {
            const response = await axios.get(`${API_URL}/api/tareas`, { headers: getAuthHeaders() });
            setTareas(response.data);
        } catch (error) {
            console.error('Error al cargar tareas:', error);
        } finally {
            setLoadingTareas(false);
        }
    };

    const completarTarea = async (id) => {
        try {
            await axios.put(`${API_URL}/api/tareas/${id}`, { estado: 'completada' }, { headers: getAuthHeaders() });
            setTareas(prev => prev.map(t => (t.id === id || t._id === id) ? { ...t, estado: 'completada' } : t));
            setTimeout(cargarTareas, 1000);
        } catch (error) {
            console.error('Error al completar tarea:', error);
        }
    };

    useEffect(() => {
        cargarDatos();
        cargarTareas();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen p-6 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Cargando dashboard...</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const tareasPendientes = tareas.filter(t => t.estado === 'pendiente');

    return (
        <div className="h-full flex flex-col p-5 overflow-hidden">
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden min-h-0">
                {/* Embudo Header - White Section */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-md flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-green-600" />
                            Embudo de Ventas
                        </h2>
                        {usandoMock && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-md border border-gray-200 font-semibold">
                                Sin datos
                            </span>
                        )}
                    </div>
                    <FunnelVisual
                        stages={[
                            {
                                etapa: 'Reuniones Agendadas',
                                cantidad: data.embudo.reunion_agendada,
                                color: 'bg-blue-500',
                                contadorHoy: data.metricas.reuniones.hoy,
                                labelContador: 'hoy',
                                cantidadExito: data.embudo.reunion_realizada,
                                cantidadPerdida: data.embudo.reunion_agendada - data.embudo.reunion_realizada,
                                porcentajeExito: Math.round(data.tasasConversion.asistencia) || 0,
                                porcentajePerdida: ((100 - (data.tasasConversion.asistencia || 0))).toFixed(1),
                                labelExito: 'asisten',
                                labelPerdida: 'no asisten'
                            },
                            {
                                etapa: 'Reuniones Realizadas',
                                cantidad: data.embudo.reunion_realizada,
                                color: 'bg-cyan-500',
                                cantidadExito: data.embudo.propuesta_enviada,
                                cantidadPerdida: data.embudo.reunion_realizada - data.embudo.propuesta_enviada,
                                porcentajeExito: Math.round(data.tasasConversion.interes) || 0,
                                porcentajePerdida: ((100 - (data.tasasConversion.interes || 0))).toFixed(1),
                                labelExito: 'piden propuesta',
                                labelPerdida: 'no interesados'
                            },
                            {
                                etapa: 'Propuestas Enviadas',
                                cantidad: data.embudo.propuesta_enviada,
                                color: 'bg-orange-500',
                                cantidadExito: data.embudo.venta_ganada,
                                cantidadPerdida: data.embudo.propuesta_enviada - data.embudo.venta_ganada,
                                porcentajeExito: Math.round(data.tasasConversion.cierre) || 0,
                                porcentajePerdida: ((100 - (data.tasasConversion.cierre || 0))).toFixed(1),
                                labelExito: 'aceptada',
                                labelPerdida: 'rechazada'
                            },
                            {
                                etapa: 'Ventas Cerradas',
                                cantidad: data.embudo.venta_ganada,
                                color: 'bg-green-500',
                                cantidadExito: data.embudo.venta_ganada,
                                porcentajeExito: 100,
                                labelExito: 'ganadas'
                            }
                        ]}
                        type="closer"
                    />
                </div>

                {/* Main Content: Metrics Grid + Tasks Sidebar */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
                    {/* Left Side: Metrics Grid (2 columns) */}
                    <div className="lg:col-span-2 flex flex-col min-h-0">
                        <div className="grid grid-cols-2 grid-rows-3 gap-4 flex-1">
                            {/* Row 1 */}
                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <Calendar className="w-8 h-8 text-blue-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{data.metricas.reuniones.hoy}</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Reuniones Hoy</p>
                            </div>

                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <Users className="w-8 h-8 text-orange-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{data.metricas.clientes?.totales || 0}</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Clientes Totales</p>
                            </div>

                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-cyan-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{Math.round(data.tasasConversion.asistencia) || 0}%</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Tasa de Asistencia</p>
                            </div>

                            {/* Row 2 */}
                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <TrendingUp className="w-8 h-8 text-green-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{Math.round(data.tasasConversion.cierre) || 0}%</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Tasa de Cierre</p>
                            </div>

                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <DollarSign className="w-8 h-8 text-emerald-600 mb-2" />
                                <span className="text-2xl font-bold text-gray-900 mb-1">${(data.metricas.ventas.montoMes || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Monto del Mes</p>
                            </div>

                            {/* Row 3 */}
                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <Award className="w-8 h-8 text-purple-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{Math.round(data.tasasConversion.interes) || 0}%</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Tasa de Interés</p>
                            </div>

                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <TrendingUp className="w-8 h-8 text-pink-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{data.metricas.ventas.mes}</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Ventas del Mes</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Tasks/Goals Sidebar - White Section (2 columns) */}
                    <div className="lg:col-span-2 flex flex-col min-h-0">
                        <div className="flex-1 bg-white border border-gray-200 rounded-xl p-6 shadow-md flex flex-col overflow-hidden">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2 flex-shrink-0">
                                <Target className="w-6 h-6 text-green-600" />
                                Tareas Pendientes
                            </h2>

                            <div className="flex-1 space-y-4 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#8bc34a #f3f4f6' }}>
                                {loadingTareas ? (
                                    <div className="flex justify-center items-center h-20">
                                        <RefreshCw className="w-6 h-6 animate-spin text-green-500" />
                                    </div>
                                ) : tareasPendientes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                                        <CheckCircle2 className="w-10 h-10 opacity-20" />
                                        <p className="text-sm">No hay tareas pendientes en este momento.</p>
                                    </div>
                                ) : (
                                    tareasPendientes.map((t) => (
                                        <div key={t.id || t._id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between group hover:border-green-300 transition-colors shadow-sm">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`w-2 h-2 rounded-full ${t.prioridad === 'alta' ? 'bg-red-500' : 'bg-green-500'}`}></span>
                                                    <h3 className="font-bold text-gray-900 text-sm truncate">{t.titulo}</h3>
                                                </div>
                                                <p className="text-xs text-gray-500 line-clamp-1">{t.descripcion}</p>
                                                {t.clienteNombre && (
                                                    <p className="text-[10px] text-green-600 font-bold mt-1 uppercase tracking-wider">
                                                        👤 {t.clienteNombre} {t.clienteApellido}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Clock className="w-3 h-3 text-gray-400" />
                                                    <span className="text-[10px] text-gray-400 font-medium">
                                                        {t.fechaLimite ? new Date(t.fechaLimite).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : 'Sin fecha'}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => completarTarea(t.id || t._id)}
                                                className="bg-white border-2 border-green-500 text-green-600 h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-green-500 hover:text-white transition-all shrink-0"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                                Cerrar
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CloserDashboard;
