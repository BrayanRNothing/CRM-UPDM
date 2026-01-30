import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import CELLS from 'vanta/dist/vanta.cells.min.js';
import Register from './Register';
import { getUser, saveUser } from '../../utils/authUtils';

// URL DEL BACKEND (Ajústala si pruebas en local)
import API_URL from '../../config/api';
// const API_URL = 'http://localhost:4000'; 

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const vantaRef = useRef(null);
  const vantaInstanceRef = useRef(null);

  useEffect(() => {
    // Auto-login si hay sesión guardada
    const user = getUser();
    if (user) {
      const { rol } = user;
      switch (rol) {
        case 'admin': navigate('/admin'); break;
        case 'tecnico': navigate('/tecnico'); break;
        case 'distribuidor': navigate('/distribuidor'); break;
        case 'usuario': navigate('/usuario'); break;
        default: break;
      }
    }

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
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Login exitoso - guardar según preferencia de "recordar sesión"
        saveUser(data.user, rememberMe);

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
        setError(data.message || 'Credenciales incorrectas');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('No hay conexión con el servidor ⚠️');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={vantaRef} className="flex min-h-screen items-center justify-center text-white px-4 sm:px-6 lg:px-8">

      {/* Tarjeta con efecto Glass */}
      <div className="z-10 w-full max-w-md bg-black/40 backdrop-blur-lg p-8 rounded-2xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-wider mb-2">Infiniguard SYS</h1>
          <p className="text-blue-200 text-sm font-light tracking-widest uppercase"></p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded-xl text-sm flex items-center justify-center gap-2 animate-pulse">
              <span>🚫</span> {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-blue-200 uppercase mb-2 ml-1">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition hover:bg-white/10"
                placeholder="usuario"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-blue-200 uppercase mb-2 ml-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition hover:bg-white/10"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {/* Checkbox Recordar Sesión - Diseño Toggle Moderno */}
          <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-500/20 rounded-lg">
                <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <label htmlFor="rememberMe" className="text-sm font-semibold text-white cursor-pointer select-none block">
                  Recordar sesión
                </label>
                <p className="text-xs text-blue-200/70">Mantener sesión activa</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-600 peer-checked:to-blue-500 shadow-inner"></div>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3.5 rounded-xl transition-all duration-300 shadow-lg transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Validando...' : 'INICIAR SESIÓN'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">No tienes una cuenta? <a href='/register' className="text-blue-500 hover:underline">Registrate</a></p>
        </div>
      </div>

      {/* Versión en la esquina inferior */}
      <div className="fixed bottom-4 left-4 z-20">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-black/30 backdrop-blur-sm border border-white/10 rounded-full">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium text-white/70">v1.0.0 Producción</span>
        </div>
      </div>
    </div>
  );
};

export default Login;