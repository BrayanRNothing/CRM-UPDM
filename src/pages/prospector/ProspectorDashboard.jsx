import React, { useState, useEffect } from 'react';
import { Phone, UserPlus, Calendar, TrendingUp, RefreshCw, Clock, CheckCircle2, Target, MessageSquare } from 'lucide-react';
import axios from 'axios';
import FunnelVisual from '../../components/FunnelVisual';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const PERIODOS = [
    { key: 'dia', label: 'Hoy' },
    { key: 'semana', label: 'Semana' },
    { key: 'mes', label: 'Mes' },
    { key: 'total', label: 'Total' },
];

const EMPTY_PERIODO = { llamadas: 0, mensajes: 0, prospectos: 0, reuniones: 0 };
const EMPTY_DATA = {
    embudo: { prospecto_nuevo: 0, en_contacto: 0, reunion_agendada: 0, transferidos: 0, total: 0 },
    tasasConversion: { contacto: 0, agendamiento: 0 },
    periodos: { dia: EMPTY_PERIODO, semana: EMPTY_PERIODO, mes: EMPTY_PERIODO, total: EMPTY_PERIODO }
};

const getAuthHeaders = () => ({ 'x-auth-token': localStorage.getItem('token') || '' });

const ProspectorDashboard = () => {
    const [data, setData] = useState(null);
    const [tareas, setTareas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingTareas, setLoadingTareas] = useState(false);
    const [sinDatos, setSinDatos] = useState(false);
    const [periodo, setPeriodo] = useState('dia');

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/api/prospector/dashboard`, { headers: getAuthHeaders() });
            // Normalizar respuesta para siempre tener `periodos`
            const raw = response.data;
            if (!raw.periodos) {
                // backend viejo: construir periodos desde metricas para compatibilidad
                raw.periodos = {
                    dia: { llamadas: raw.metricas?.llamadas?.hoy || 0, mensajes: raw.metricas?.correosEnviados || 0, prospectos: raw.metricas?.prospectosHoy || 0, reuniones: raw.metricas?.reunionesAgendadas?.hoy || 0 },
                    semana: { llamadas: 0, mensajes: 0, prospectos: 0, reuniones: raw.metricas?.reunionesAgendadas?.semana || 0 },
                    mes: { llamadas: 0, mensajes: 0, prospectos: 0, reuniones: 0 },
                    total: { llamadas: raw.metricas?.llamadas?.totales || 0, mensajes: 0, prospectos: raw.embudo?.total || 0, reuniones: raw.metricas?.reunionesAgendadas?.totales || 0 }
                };
            }
            setData(raw);
            setSinDatos(false);
        } catch (error) {
            console.error('Error al cargar datos:', error);
            setData(EMPTY_DATA);
            setSinDatos(true);
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
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-[#14b8a6] animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Cargando dashboard...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-600">No hay datos disponibles</p>
            </div>
        );
    }

    const m = data.periodos?.[periodo] || EMPTY_PERIODO;
    const tareasPendientes = tareas.filter(t => t.estado === 'pendiente');

    return (
        <div className="h-full flex flex-col p-5 overflow-hidden">
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden min-h-0">

                {/* Header — Embudo + Tabs */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-md flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <TrendingUp className="w-6 h-6 text-[#0d9488]" />
                            Embudo de Prospección
                        </h2>

                        {/* Tabs de período */}
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                            {PERIODOS.map(p => (
                                <button
                                    key={p.key}
                                    onClick={() => setPeriodo(p.key)}
                                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${periodo === p.key
                                            ? 'bg-white text-[#0d9488] shadow-sm border border-gray-200'
                                            : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {sinDatos && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-md border border-gray-200 font-semibold">
                                Sin datos
                            </span>
                        )}
                    </div>

                    {/* Visualización del Embudo */}
                    <div className="w-full overflow-hidden">
                        <FunnelVisual
                            stages={[
                                {
                                    etapa: 'Prospectos',
                                    cantidad: data.embudo.prospecto_nuevo,
                                    color: 'bg-blue-500',
                                    contadorHoy: data.periodos?.dia?.prospectos ?? 0,
                                    labelContador: 'recibidos hoy',
                                    cantidadExito: data.embudo.en_contacto,
                                    cantidadPerdida: data.embudo.prospecto_nuevo - data.embudo.en_contacto,
                                    porcentajeExito: data.tasasConversion.contacto,
                                    porcentajePerdida: (100 - data.tasasConversion.contacto).toFixed(1),
                                    labelExito: 'contactados',
                                    labelPerdida: 'sin contacto'
                                },
                                {
                                    etapa: 'Llamadas/Contacto',
                                    cantidad: data.embudo.en_contacto,
                                    color: 'bg-teal-500',
                                    cantidadExito: data.embudo.reunion_agendada,
                                    cantidadPerdida: data.embudo.en_contacto - data.embudo.reunion_agendada,
                                    porcentajeExito: data.tasasConversion.agendamiento,
                                    porcentajePerdida: (100 - data.tasasConversion.agendamiento).toFixed(1),
                                    labelExito: 'agendan cita',
                                    labelPerdida: 'no agendan'
                                },
                                {
                                    etapa: 'Citas Agendadas',
                                    cantidad: data.embudo.reunion_agendada,
                                    color: 'bg-green-500',
                                    cantidadExito: data.embudo.reunion_agendada,
                                    porcentajeExito: 100,
                                    labelExito: 'transferidas'
                                }
                            ]}
                            type="prospector"
                        />
                    </div>
                </div>

                {/* Main Content: Metrics Grid + Tasks Sidebar */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">

                    {/* Left Side: Metrics Grid */}
                    <div className="lg:col-span-2 flex flex-col min-h-0">
                        <div className="grid grid-cols-2 grid-rows-3 gap-4 flex-1">

                            {/* Llamadas */}
                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <Phone className="w-8 h-8 text-[#0d9488] mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{m.llamadas}</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Llamadas Hechas</p>
                            </div>

                            {/* Prospectos Nuevos */}
                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <UserPlus className="w-8 h-8 text-blue-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{m.prospectos}</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Prospectos Nuevos</p>
                            </div>

                            {/* Mensajes */}
                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <MessageSquare className="w-8 h-8 text-purple-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{m.mensajes}</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Mensajes Enviados</p>
                            </div>

                            {/* Citas Agendadas */}
                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <Calendar className="w-8 h-8 text-green-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{m.reuniones}</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Citas Agendadas</p>
                            </div>

                            {/* Tasa de Contacto */}
                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-indigo-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{data.tasasConversion.contacto}%</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Tasa de Contacto</p>
                            </div>

                            {/* Tasa de Agendamiento */}
                            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md flex flex-col items-center justify-center">
                                <Target className="w-8 h-8 text-orange-600 mb-2" />
                                <span className="text-3xl font-bold text-gray-900 mb-1">{data.tasasConversion.agendamiento}%</span>
                                <p className="text-gray-600 text-xs font-semibold text-center">Tasa Agendamiento</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Tasks Sidebar */}
                    <div className="lg:col-span-2 flex flex-col min-h-0">
                        <div className="flex-1 bg-white border border-gray-200 rounded-xl p-6 shadow-md flex flex-col overflow-hidden">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2 flex-shrink-0">
                                <Target className="w-6 h-6 text-green-600" />
                                Tareas Pendientes
                            </h2>

                            <div className="flex-1 space-y-4 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#14b8a6 #f3f4f6' }}>
                                {loadingTareas ? (
                                    <div className="flex justify-center items-center h-20">
                                        <RefreshCw className="w-6 h-6 animate-spin text-teal-500" />
                                    </div>
                                ) : tareasPendientes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                                        <CheckCircle2 className="w-10 h-10 opacity-20" />
                                        <p className="text-sm">¡Todo listo! No hay tareas para hoy.</p>
                                    </div>
                                ) : (
                                    tareasPendientes.map((t) => (
                                        <div key={t.id || t._id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between group hover:border-teal-300 transition-colors shadow-sm">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`w-2 h-2 rounded-full ${t.prioridad === 'alta' ? 'bg-red-500' : 'bg-teal-500'}`}></span>
                                                    <h3 className="font-bold text-gray-900 text-sm truncate">{t.titulo}</h3>
                                                </div>
                                                <p className="text-xs text-gray-500 line-clamp-1">{t.descripcion}</p>
                                                {t.clienteNombre && (
                                                    <p className="text-[10px] text-teal-600 font-bold mt-1 uppercase tracking-wider">
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
                                                className="bg-white border-2 border-teal-500 text-teal-600 h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-teal-500 hover:text-white transition-all shrink-0"
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

export default ProspectorDashboard;
