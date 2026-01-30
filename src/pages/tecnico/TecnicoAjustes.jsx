import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import API_URL from '../../config/api';
import { logout } from '../../utils/authUtils';

const TecnicoAjustes = () => {
    const [usuario, setUsuario] = useState(null);

    useEffect(() => {
        const userGuardado = JSON.parse(sessionStorage.getItem('user'));
        setUsuario(userGuardado);
    }, []);

    return (
        <div className="max-w-md mx-auto pb-4">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Ajustes</h1>
                <p className="text-gray-500 text-sm mt-1">Configura tu perfil y preferencias</p>
            </div>

            {/* Sección de Perfil */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 mb-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Mi Perfil</h2>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600 text-sm font-medium">Email (Opcional):</span>
                        <input
                            type="email"
                            defaultValue={usuario?.email || ''}
                            placeholder="correo@ejemplo.com"
                            onBlur={async (e) => {
                                const user = JSON.parse(sessionStorage.getItem('user') || '{}');
                                try {
                                    const res = await fetch(`${API_URL}/api/usuarios/${user.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            nombre: user.nombre,
                                            email: e.target.value || null,
                                            rol: user.rol,
                                            telefono: user.telefono
                                        })
                                    });
                                    if (res.ok) {
                                        toast.success('✅ Email actualizado');
                                        const updatedUser = { ...user, email: e.target.value };
                                        sessionStorage.setItem('user', JSON.stringify(updatedUser));
                                        setUsuario(updatedUser);
                                    }
                                } catch (error) {
                                    console.error(error);
                                    toast.error('Error al actualizar');
                                }
                            }}
                            className="font-bold text-gray-900 bg-white px-3 py-1 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 text-sm"
                        />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600 text-sm font-medium">Teléfono (Opcional):</span>
                        <input
                            type="tel"
                            defaultValue={usuario?.telefono || ''}
                            placeholder="+52 123 456 7890"
                            onBlur={async (e) => {
                                const user = JSON.parse(sessionStorage.getItem('user') || '{}');
                                try {
                                    const res = await fetch(`${API_URL}/api/usuarios/${user.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            nombre: user.nombre,
                                            email: user.email,
                                            rol: user.rol,
                                            telefono: e.target.value || null
                                        })
                                    });
                                    if (res.ok) {
                                        toast.success('✅ Teléfono actualizado');
                                        const updatedUser = { ...user, telefono: e.target.value };
                                        sessionStorage.setItem('user', JSON.stringify(updatedUser));
                                        setUsuario(updatedUser);
                                    }
                                } catch (error) {
                                    console.error(error);
                                    toast.error('Error al actualizar');
                                }
                            }}
                            className="font-bold text-gray-900 bg-white px-3 py-1 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Sección de Notificaciones */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 mb-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Preferencias de Notificaciones</h2>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1 pr-4">
                        <p className="font-semibold text-gray-800 text-sm">Recibir notificaciones por email</p>
                        <p className="text-xs text-gray-500 mt-1">Recibe actualizaciones sobre servicios asignados</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            defaultChecked={!!usuario?.email}
                            disabled={!usuario?.email}
                            onChange={async (e) => {
                                if (!usuario?.email) {
                                    toast.error('⚠️ Debes configurar un email primero');
                                    e.target.checked = false;
                                    return;
                                }
                                
                                try {
                                    const res = await fetch(`${API_URL}/api/usuarios/${usuario.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            nombre: usuario.nombre,
                                            email: usuario.email,
                                            rol: usuario.rol,
                                            telefono: usuario.telefono,
                                            notificaciones_activas: e.target.checked
                                        })
                                    });
                                    
                                    if (res.ok) {
                                        if (e.target.checked) {
                                            toast.success('✅ Notificaciones activadas');
                                        } else {
                                            toast.success('🔕 Notificaciones desactivadas');
                                        }
                                    } else {
                                        toast.error('Error al actualizar preferencias');
                                        e.target.checked = !e.target.checked;
                                    }
                                } catch (error) {
                                    console.error(error);
                                    toast.error('Error de conexión');
                                    e.target.checked = !e.target.checked;
                                }
                            }}
                        />
                        <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                    </label>
                </div>
                {!usuario?.email && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                        <span>⚠️</span> Configura tu email arriba para activar las notificaciones
                    </p>
                )}
            </div>

            {/* Botón Cerrar Sesión */}
            <button
                onClick={() => {
                    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                        logout();
                        window.location.href = '/';
                    }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold text-lg rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.01] active:scale-95"
            >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
                Cerrar Sesión
            </button>
        </div>
    );
};

export default TecnicoAjustes;
