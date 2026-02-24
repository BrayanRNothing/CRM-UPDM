import React, { useMemo, useState, useEffect } from 'react';
import { Search, Filter, Star, Plus, X, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { getToken } from '../../utils/authUtils';
import { loadProspectos, saveProspectos } from '../../utils/prospectosStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const CRMClientes = () => {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    const getAuthHeaders = () => ({
        'x-auth-token': getToken() || ''
    });

    const cargarClientes = async () => {
        setLoading(true);
        try {
            // Determinar el rol del usuario desde la URL o del token
            const rol = localStorage.getItem('userRole')?.toLowerCase() || 'prospector';
            
            const res = await axios.get(
                `${API_URL}/api/${rol}/clientes-ganados`,
                { headers: getAuthHeaders() }
            );
            setClientes(res.data || []);
        } catch (error) {
            console.error('Error al cargar clientes:', error);
            setClientes([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarClientes();
    }, []);

    const clientesFiltrados = useMemo(() => {
        return clientes.filter((cliente) => {
            const matchBusqueda =
                busqueda === '' ||
                (cliente.nombres || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                (cliente.apellidoPaterno || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                (cliente.empresa || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                (cliente.correo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                (cliente.telefono || '').includes(busqueda);
            return matchBusqueda;
        });
    }, [clientes, busqueda]);


    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-[1400px] mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
                        <p className="text-gray-500">Cartera de clientes ganados.</p>
                    </div>
                    <button
                        onClick={cargarClientes}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar clientes por nombre, empresa, teléfono..."
                            value={busqueda}
                            onChange={(event) => setBusqueda(event.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                        <RefreshCw className="w-8 h-8 text-teal-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-500">Cargando clientes...</p>
                    </div>
                ) : clientesFiltrados.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-gray-500">
                        No hay clientes registrados aún.
                    </div>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-100/70 text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Nombre</th>
                                        <th className="px-4 py-3 text-left">Empresa</th>
                                        <th className="px-4 py-3 text-left">Teléfono</th>
                                        <th className="px-4 py-3 text-left">Correo</th>
                                        <th className="px-4 py-3 text-left">Convertido el</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {clientesFiltrados.map((cliente) => (
                                        <tr key={cliente._id || cliente.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                {cliente.nombres} {cliente.apellidoPaterno}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{cliente.empresa || '—'}</td>
                                            <td className="px-4 py-3 text-gray-600">{cliente.telefono || '—'}</td>
                                            <td className="px-4 py-3 text-teal-600">{cliente.correo || '—'}</td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {cliente.fechaUltimaEtapa 
                                                    ? new Date(cliente.fechaUltimaEtapa).toLocaleDateString('es-MX')
                                                    : '—'
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                    ✓ Ganado
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CRMClientes;
