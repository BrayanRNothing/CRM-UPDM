import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import CELLS from 'vanta/dist/vanta.cells.min.js';
import Login from './Login';


// URL DEL BACKEND (Ajústala si pruebas en local)
import API_URL from '../../config/api';
// const API_URL = 'http://localhost:4000'; 

const Register = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const vantaRef = useRef(null);
    const vantaInstanceRef = useRef(null);

    useEffect(() => {
        // Inicialización del efecto de fondo (Vanta JS)
        if (vantaRef.current && !vantaInstanceRef.current) {
            try {
                vantaInstanceRef.current = CELLS({
                    el: vantaRef.current,
                    THREE: THREE,
                    mouseControls: true,
                    touchControls: true,
                    gyroControls: false,
                    minHeight: 200.00,
                    minWidth: 200.00,
                    scale: 1.00,
                    color1: 0x101025,
                    color2: 0x35b1f2,
                    size: 5.00,
                    speed: 0.90
                });
            } catch (error) {
                console.error("Error al iniciar Vanta:", error);
            }
        }
        return () => {
            if (vantaInstanceRef.current) {
                vantaInstanceRef.current.destroy();
                vantaInstanceRef.current = null;
            }
        };
    }, []);

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        // Validación de contraseñas
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (!username.trim()) {
            setError('El nombre de usuario es requerido');
            return;
        }

        if (username.length < 3) {
            setError('El nombre de usuario debe tener al menos 3 caracteres');
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setError('El usuario solo puede contener letras, números y guiones bajos');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, nombre: name, telefono: phone, email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Login exitoso
                sessionStorage.setItem('user', JSON.stringify(data.user));

                // Redirigimos según el rol
                const { rol } = data.user;
                switch (rol) {
                    case 'admin': navigate('/admin'); break;
                    case 'tecnico': navigate('/tecnico'); break;
                    case 'distribuidor': navigate('/distribuidor'); break;
                    case 'usuario': navigate('/usuario'); break;
                    default: navigate('/'); // Por seguridad
                }
            } else {
                setError(data.message || 'Error al registrar usuario');
            }
        } catch (err) {
            console.error('Error:', err);
            setError('No hay conexión con el servidor ⚠️');
        } finally {
            setLoading(false);
        }
    };

    // Calcular fortaleza de contraseña
    const getPasswordStrength = () => {
        if (!password) return { level: 0, text: '', color: '' };

        let strength = 0;
        if (password.length >= 6) strength++;
        if (password.length >= 10) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        if (strength <= 1) return { level: 1, text: 'Débil', color: 'bg-red-500' };
        if (strength <= 3) return { level: 2, text: 'Media', color: 'bg-yellow-500' };
        return { level: 3, text: 'Fuerte', color: 'bg-green-500' };
    };

    const passwordStrength = getPasswordStrength();

    return (
        <div ref={vantaRef} className="flex min-h-screen items-center justify-center text-white px-4 sm:px-6 lg:px-8">

            {/* Tarjeta con efecto Glass - Ancho MÁS GRANDE (max-w-4xl) */}
            <div className="z-10 w-full max-w-4xl bg-black/40 backdrop-blur-lg p-8 rounded-2xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">

                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold tracking-wider mb-2">Infiniguard SYS</h1>
                    <p className="text-blue-200 text-sm font-light tracking-widest uppercase">Sistema de Gestión</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-6">

                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded-xl text-sm flex items-center justify-center gap-2 animate-pulse mb-6">
                            <span>🚫</span> {error}
                        </div>
                    )}

                    {/* GRID DE DOS COLUMNAS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* COLUMNA IZQUIERDA: Datos Personales */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-blue-200 uppercase mb-2 ml-1">Nombre</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition hover:bg-white/10"
                                    placeholder="Nombre completo"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-blue-200 uppercase mb-2 ml-1">Usuario *</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition hover:bg-white/10"
                                    placeholder="tu_usuario"
                                    required
                                />
                                <p className="text-xs text-gray-400 mt-1 ml-1">Solo letras, números y guiones bajos</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-blue-200 uppercase mb-2 ml-1">Email (Opcional)</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition hover:bg-white/10"
                                    placeholder="correo@ejemplo.com"
                                />
                                <p className="text-xs text-gray-400 mt-1 ml-1">Solo para recibir notificaciones</p>
                            </div>
                        </div>

                        {/* COLUMNA DERECHA: Seguridad y Contacto */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-blue-200 uppercase mb-2 ml-1">Teléfono</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition hover:bg-white/10"
                                    placeholder="123 456 7890"
                                />
                            </div>

                            <div className="pb-5">
                                <label className="block text-xs font-bold text-blue-200 uppercase mb-2 ml-1">Contraseña</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition hover:bg-white/10"
                                    placeholder="••••••••"
                                    required
                                />
                                {/* Indicador de fortaleza */}
                                {password && (
                                    <div className="mt-2">
                                        <div className="flex gap-1 mb-1">
                                            {[1, 2, 3].map((level) => (
                                                <div
                                                    key={level}
                                                    className={`h-1 flex-1 rounded-full transition-all ${level <= passwordStrength.level
                                                        ? passwordStrength.color
                                                        : 'bg-white/10'
                                                        }`}
                                                ></div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-blue-200">
                                            Fortaleza: <span className="font-semibold">{passwordStrength.text}</span>
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-blue-200 uppercase mb-2 ml-1">Confirmar Contraseña</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:border-transparent outline-none transition hover:bg-white/10 ${confirmPassword && password !== confirmPassword
                                        ? 'border-red-500 focus:ring-red-500'
                                        : 'border-white/10 focus:ring-blue-500'
                                        }`}
                                    placeholder="••••••••"
                                    required
                                />
                                {confirmPassword && password !== confirmPassword && (
                                    <p className="text-xs text-red-400 mt-1 ml-1">Las contraseñas no coinciden</p>
                                )}
                                {confirmPassword && password === confirmPassword && (
                                    <p className="text-xs text-green-400 mt-1 ml-1">✓ Las contraseñas coinciden</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-4 rounded-xl transition-all duration-300 shadow-lg transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Validando...' : 'CREAR CUENTA'}
                        </button>
                    </div>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-400">¿Ya tienes una cuenta? <a href="/" className="text-blue-400 hover:text-blue-300 font-semibold hover:underline transition-colors">Iniciar Sesión</a></p>
                </div>
            </div>
        </div>
    );
};

export default Register;