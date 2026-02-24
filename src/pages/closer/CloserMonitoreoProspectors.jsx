import React, { useState, useEffect } from 'react';
import { Users, Phone, Calendar, TrendingUp, RefreshCw, Activity, Target, AlertCircle, CheckCircle2, X, ChevronRight, BarChart3, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const CloserMonitoreoProspectors = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [periodo, setPeriodo] = useState('diario');
    const [usandoMock, setUsandoMock] = useState(false);
    const [selectedProspector, setSelectedProspector] = useState(null);
    const [viewMode, setViewMode] = useState('cards'); // 'cards' o 'table'

    const mockData = {
        periodo: 'diario',
        totalProspectors: 3,
        prospectors: [
            {
                prospector: { id: '1', nombre: 'Juan Pérez', correo: 'juan@example.com' },
                metricas: {
                    llamadas: { total: 15, exitosas: 8 },
                    citas: { agendadas: 2, transferidas: 2 },
                    prospectos: { total: 45, nuevos: 5, revisados: 15 },
                    tasas: { contacto: 53.3, agendamiento: 25.0 }
                },
                distribucion: { prospecto_nuevo: 20, en_contacto: 15, reunion_agendada: 10 },
                rendimiento: { estado: 'excelente', color: 'green', descripcion: 'Rendimiento excelente - Cumpliendo metas' }
            },
            {
                prospector: { id: '2', nombre: 'María García', correo: 'maria@example.com' },
                metricas: {
                    llamadas: { total: 10, exitosas: 5 },
                    citas: { agendadas: 1, transferidas: 1 },
                    prospectos: { total: 38, nuevos: 3, revisados: 10 },
                    tasas: { contacto: 50.0, agendamiento: 20.0 }
                },
                distribucion: { prospecto_nuevo: 18, en_contacto: 12, reunion_agendada: 8 },
                rendimiento: { estado: 'bueno', color: 'yellow', descripcion: 'Buen rendimiento - En camino' }
            },
            {
                prospector: { id: '3', nombre: 'Carlos López', correo: 'carlos@example.com' },
                metricas: {
                    llamadas: { total: 5, exitosas: 2 },
                    citas: { agendadas: 0, transferidas: 0 },
                    prospectos: { total: 30, nuevos: 2, revisados: 5 },
                    tasas: { contacto: 40.0, agendamiento: 0 }
                },
                distribucion: { prospecto_nuevo: 15, en_contacto: 10, reunion_agendada: 5 },
                rendimiento: { estado: 'bajo', color: 'orange', descripcion: 'Rendimiento bajo - Necesita atención' }
            }
        ]
    };

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/api/closer/prospectors/monitoring`, {
                params: { periodo },
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setData(response.data);
            setUsandoMock(false);
        } catch (error) {
            console.error('Error al cargar monitoreo:', error);
            setData(mockData);
            setUsandoMock(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, [periodo]);

    const getColorClasses = (color) => {
        const colors = {
            green: {
                bg: 'bg-green-50',
                border: 'border-green-200',
                text: 'text-green-700',
                badge: 'bg-green-500 text-white',
            },
            yellow: {
                bg: 'bg-yellow-50',
                border: 'border-yellow-200',
                text: 'text-yellow-700',
                badge: 'bg-yellow-500 text-white',
            },
            orange: {
                bg: 'bg-orange-50',
                border: 'border-orange-200',
                text: 'text-orange-700',
                badge: 'bg-orange-500 text-white',
            },
            red: {
                bg: 'bg-red-50',
                border: 'border-red-200',
                text: 'text-red-700',
                badge: 'bg-red-500 text-white',
            }
        };
        return colors[color] || colors.green;
    };

    const getEstadoIcon = (estado) => {
        switch (estado) {
            case 'excelente': return <CheckCircle2 className="w-4 h-4" />;
            case 'bueno': return <TrendingUp className="w-4 h-4" />;
            case 'bajo': return <AlertCircle className="w-4 h-4" />;
            case 'critico': return <AlertCircle className="w-4 h-4" />;
            default: return <Activity className="w-4 h-4" />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen p-6 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Cargando monitoreo...</p>
                </div>
            </div>
        );
    }

    if (!data || !data.prospectors || data.prospectors.length === 0) {
        return (
            <div className="min-h-screen p-6 flex items-center justify-center">
                <p className="text-gray-600">No hay datos disponibles</p>
            </div>
        );
    }

    // Si hay un prospector seleccionado, mostrar vista de detalles expandida
    if (selectedProspector) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
                <div className="max-w-7xl mx-auto">
                    {/* Header Expandido */}
                    <div className={`${
                        selectedProspector.rendimiento.color === 'green' ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200' :
                        selectedProspector.rendimiento.color === 'yellow' ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200' :
                        selectedProspector.rendimiento.color === 'orange' ? 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200' :
                        'bg-gradient-to-r from-red-50 to-red-100 border-red-200'
                    } border rounded-xl p-4 mb-4`}>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-md border-3 border-white flex-shrink-0">
                                        <Users className="w-7 h-7 text-gray-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <h1 className="text-2xl font-bold text-gray-900 truncate">{selectedProspector.prospector.nombre}</h1>
                                        <p className="text-gray-600 text-xs truncate">{selectedProspector.prospector.correo}</p>
                                    </div>
                                </div>
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 ${
                                    selectedProspector.rendimiento.color === 'green' ? 'bg-green-500 text-white' :
                                    selectedProspector.rendimiento.color === 'yellow' ? 'bg-yellow-500 text-white' :
                                    selectedProspector.rendimiento.color === 'orange' ? 'bg-orange-500 text-white' :
                                    'bg-red-500 text-white'
                                } rounded-full text-xs font-bold shadow-md`}>
                                    {getEstadoIcon(selectedProspector.rendimiento.estado)}
                                    <span className="capitalize">{selectedProspector.rendimiento.estado.toUpperCase()}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedProspector(null)}
                                className="p-2 hover:bg-white rounded-full transition-all shadow-md flex-shrink-0"
                            >
                                <X className="w-5 h-5 text-gray-700" />
                            </button>
                        </div>
                    </div>

                    {/* Contenido Grid Compacto */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Columna Izquierda - Métricas Principales */}
                        <div className="lg:col-span-2 space-y-4">
                            {/* Métricas Rápidas - 2x2 */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-2">
                                        <Phone className="w-5 h-5 text-blue-600" />
                                        <span className="text-xs font-semibold text-blue-700 bg-white px-2 py-0.5 rounded-full">HOY</span>
                                    </div>
                                    <p className="text-3xl font-bold text-gray-900">3<span className="text-lg text-gray-500">/12</span></p>
                                    <p className="text-xs text-blue-700 mt-1">Llamadas realizadas</p>
                                </div>

                                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-2">
                                        <Calendar className="w-5 h-5 text-green-600" />
                                        <span className="text-xs font-semibold text-green-700 bg-white px-2 py-0.5 rounded-full">HOY</span>
                                    </div>
                                    <p className="text-3xl font-bold text-gray-900">1<span className="text-lg text-gray-500">/2</span></p>
                                    <p className="text-xs text-green-700 mt-1">Citas agendadas</p>
                                </div>

                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-2">
                                        <Users className="w-5 h-5 text-purple-600" />
                                        <span className="text-xs font-semibold text-purple-700 bg-white px-2 py-0.5 rounded-full">HOY</span>
                                    </div>
                                    <p className="text-3xl font-bold text-gray-900">5<span className="text-lg text-gray-500">/8</span></p>
                                    <p className="text-xs text-purple-700 mt-1">Prospectos contactados</p>
                                </div>

                                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-2">
                                        <Target className="w-5 h-5 text-orange-600" />
                                        <span className="text-xs font-semibold text-orange-700 bg-white px-2 py-0.5 rounded-full">HOY</span>
                                    </div>
                                    <p className="text-3xl font-bold text-gray-900">{(5/8*100).toFixed(0)}<span className="text-lg text-gray-500">%</span></p>
                                    <p className="text-xs text-orange-700 mt-1">Tasa de contacto</p>
                                </div>
                            </div>

                            {/* Tasas de Conversión de Hoy */}
                            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-blue-600" />
                                    Metas de Hoy
                                </h3>
                                <div className="space-y-2">
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-semibold text-gray-700">Contactos</span>
                                            <span className="text-lg font-bold text-blue-600">5/8</span>
                                        </div>
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                                                style={{ width: `${(5/8)*100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-semibold text-gray-700">Citas Agendadas</span>
                                            <span className="text-lg font-bold text-purple-600">1/2</span>
                                        </div>
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-500"
                                                style={{ width: `${(1/2)*100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Columna Derecha - Distribución y Recomendaciones */}
                        <div className="space-y-4">
                            {/* Distribución del Embudo */}
                            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-green-600" />
                                    Estado Hoy
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between p-2 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                                        <div>
                                            <p className="text-xs text-blue-700 font-semibold">En Inicio</p>
                                            <p className="text-xl font-bold text-blue-900">3</p>
                                        </div>
                                        <div className="text-xl">📍</div>
                                    </div>
                                    <div className="flex items-center justify-between p-2 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
                                        <div>
                                            <p className="text-xs text-yellow-700 font-semibold">En Llamadas</p>
                                            <p className="text-xl font-bold text-yellow-900">2</p>
                                        </div>
                                        <div className="text-xl">📞</div>
                                    </div>
                                    <div className="flex items-center justify-between p-2 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                                        <div>
                                            <p className="text-xs text-green-700 font-semibold">Conversiones</p>
                                            <p className="text-xl font-bold text-green-900">1</p>
                                        </div>
                                        <div className="text-xl">✓</div>
                                    </div>
                                </div>
                            </div>

                            {/* Recomendaciones */}
                            <div className={`${
                                selectedProspector.rendimiento.color === 'green' ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' :
                                selectedProspector.rendimiento.color === 'yellow' ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200' :
                                selectedProspector.rendimiento.color === 'orange' ? 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200' :
                                'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
                            } border rounded-lg p-4 shadow-sm`}>
                                <h4 className={`text-xs font-bold mb-2 flex items-center gap-1 ${
                                    selectedProspector.rendimiento.color === 'green' ? 'text-green-700' :
                                    selectedProspector.rendimiento.color === 'yellow' ? 'text-yellow-700' :
                                    selectedProspector.rendimiento.color === 'orange' ? 'text-orange-700' :
                                    'text-red-700'
                                }`}>
                                    <AlertCircle className="w-3 h-3" />
                                    Estado de Hoy
                                </h4>
                                
                                {(5/8) >= 0.75 && (
                                    <div className="text-xs text-green-700 space-y-1 font-semibold">
                                        <p>✓ Lleva buen ritmo</p>
                                        <p>✓ Continúa así</p>
                                    </div>
                                )}
                                {(5/8) >= 0.5 && (5/8) < 0.75 && (
                                    <div className="text-xs text-yellow-700 space-y-1 font-semibold">
                                        <p>→ Va por buen camino</p>
                                        <p>→ Intensifica contactos</p>
                                    </div>
                                )}
                                {(5/8) < 0.5 && (
                                    <div className="text-xs text-orange-700 space-y-1 font-semibold">
                                        <p>⚠ Necesita acelerar</p>
                                        <p>⚠ 3 contactos más</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Botón Cerrar */}
                    <div className="flex justify-center mt-4">
                        <button
                            onClick={() => setSelectedProspector(null)}
                            className="px-6 py-2 bg-gray-700 hover:bg-gray-800 text-white font-semibold rounded-lg transition-all shadow-md text-sm"
                        >
                            ← Volver al Monitoreo
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Users className="w-8 h-8 text-green-600" />
                            Monitoreo de Prospectors
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Seguimiento del desempeño de tu equipo de prospección
                            {usandoMock && (
                                <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-md border border-yellow-200">
                                    Datos de demostración
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex rounded-lg border border-gray-300 shadow-sm">
                            <button
                                onClick={() => setViewMode('cards')}
                                className={`px-4 py-2 transition-colors ${viewMode === 'cards' ? 'bg-green-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                            >
                                <Eye className="w-4 h-4 inline mr-1" /> Vista
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`px-4 py-2 transition-colors border-l border-gray-300 ${viewMode === 'table' ? 'bg-green-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                            >
                                <BarChart3 className="w-4 h-4 inline mr-1" /> Tabla
                            </button>
                        </div>
                        <button
                            onClick={cargarDatos}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 shadow-md"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Actualizar
                        </button>
                    </div>
                </div>

                {/* Filtros de Período */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-4">
                        <span className="text-gray-700 font-medium">Período:</span>
                        <div className="flex gap-2">
                            {['diario', 'semanal', 'mensual'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPeriodo(p)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all ${periodo === p
                                        ? 'bg-green-500 text-white shadow-lg'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </button>
                            ))}
                        </div>
                        <div className="ml-auto text-sm text-gray-600">
                            Total: <span className="text-gray-900 font-bold">{data.totalProspectors}</span> prospectors
                        </div>
                    </div>
                </div>

                {/* Resumen General */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                            <span className="text-2xl font-bold text-gray-900">
                                {data.prospectors.filter(p => p.rendimiento.estado === 'excelente').length}
                            </span>
                        </div>
                        <p className="text-green-700 text-sm font-semibold">Excelente</p>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <TrendingUp className="w-6 h-6 text-yellow-600" />
                            <span className="text-2xl font-bold text-gray-900">
                                {data.prospectors.filter(p => p.rendimiento.estado === 'bueno').length}
                            </span>
                        </div>
                        <p className="text-yellow-700 text-sm font-semibold">Bueno</p>
                    </div>

                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <AlertCircle className="w-6 h-6 text-orange-600" />
                            <span className="text-2xl font-bold text-gray-900">
                                {data.prospectors.filter(p => p.rendimiento.estado === 'bajo').length}
                            </span>
                        </div>
                        <p className="text-orange-700 text-sm font-semibold">Bajo</p>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <AlertCircle className="w-6 h-6 text-red-600" />
                            <span className="text-2xl font-bold text-gray-900">
                                {data.prospectors.filter(p => p.rendimiento.estado === 'critico').length}
                            </span>
                        </div>
                        <p className="text-red-700 text-sm font-semibold">Crítico</p>
                    </div>
                </div>

                {/* Grid de Prospectors - COMPACT */}
                {viewMode === 'cards' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.prospectors.map((item) => {
                            const colorClasses = getColorClasses(item.rendimiento.color);

                            return (
                                <div
                                    key={item.prospector.id}
                                    className={`${colorClasses.bg} border ${colorClasses.border} rounded-xl p-4 transition-all hover:shadow-lg cursor-pointer`}
                                    onClick={() => setSelectedProspector(item)}
                                >
                                    {/* Header Compacto */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-bold text-gray-900 truncate">{item.prospector.nombre}</h3>
                                            <p className="text-gray-600 text-xs truncate">{item.prospector.correo}</p>
                                        </div>
                                        <div className={`flex items-center gap-1 px-2 py-1 ${colorClasses.badge} rounded-lg shadow-sm ml-2 flex-shrink-0`}>
                                            {getEstadoIcon(item.rendimiento.estado)}
                                            <span className="font-semibold capitalize text-xs">{item.rendimiento.estado}</span>
                                        </div>
                                    </div>

                                    {/* Métricas Rápidas */}
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        <div className="text-center">
                                            <p className="text-xl font-bold text-gray-900">{item.metricas.llamadas.total}</p>
                                            <p className="text-xs text-gray-600">Llamadas</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xl font-bold text-gray-900">{item.metricas.citas.agendadas}</p>
                                            <p className="text-xs text-gray-600">Citas</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xl font-bold text-gray-900">{item.metricas.tasas.contacto}%</p>
                                            <p className="text-xs text-gray-600">Contacto</p>
                                        </div>
                                    </div>

                                    {/* Botón Ver Detalles */}
                                    <button
                                        className="w-full bg-white border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedProspector(item);
                                        }}
                                    >
                                        Ver Detalles
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    // VISTA TABLA
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-6 py-4 text-gray-700 font-semibold text-sm">Prospector</th>
                                    <th className="text-center px-6 py-4 text-gray-700 font-semibold text-sm">Llamadas</th>
                                    <th className="text-center px-6 py-4 text-gray-700 font-semibold text-sm">Exitosas</th>
                                    <th className="text-center px-6 py-4 text-gray-700 font-semibold text-sm">Tasa</th>
                                    <th className="text-center px-6 py-4 text-gray-700 font-semibold text-sm">Citas</th>
                                    <th className="text-center px-6 py-4 text-gray-700 font-semibold text-sm">Transferencias</th>
                                    <th className="text-center px-6 py-4 text-gray-700 font-semibold text-sm">Prospectos</th>
                                    <th className="text-center px-6 py-4 text-gray-700 font-semibold text-sm">Estado</th>
                                    <th className="text-center px-6 py-4 text-gray-700 font-semibold text-sm">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.prospectors.map((item, index) => {
                                    const colorClasses = getColorClasses(item.rendimiento.color);
                                    return (
                                        <tr key={item.prospector.id} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-semibold text-gray-900 text-sm">{item.prospector.nombre}</p>
                                                    <p className="text-gray-600 text-xs">{item.prospector.correo}</p>
                                                </div>
                                            </td>
                                            <td className="text-center px-6 py-4 text-gray-900 font-bold">{item.metricas.llamadas.total}</td>
                                            <td className="text-center px-6 py-4 text-green-600 font-bold">{item.metricas.llamadas.exitosas}</td>
                                            <td className="text-center px-6 py-4">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                                    {item.metricas.tasas.contacto}%
                                                </span>
                                            </td>
                                            <td className="text-center px-6 py-4 text-purple-600 font-bold">{item.metricas.citas.agendadas}</td>
                                            <td className="text-center px-6 py-4 text-gray-600">{item.metricas.citas.transferidas}</td>
                                            <td className="text-center px-6 py-4 text-gray-600">{item.metricas.prospectos.total}</td>
                                            <td className="text-center px-6 py-4">
                                                <div className={`inline-flex items-center gap-1 px-2 py-1 ${colorClasses.badge} rounded-lg`}>
                                                    {getEstadoIcon(item.rendimiento.estado)}
                                                    <span className="capitalize text-xs font-semibold">{item.rendimiento.estado}</span>
                                                </div>
                                            </td>
                                            <td className="text-center px-6 py-4">
                                                <button
                                                    onClick={() => setSelectedProspector(item)}
                                                    className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                                                >
                                                    Ver
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CloserMonitoreoProspectors;
