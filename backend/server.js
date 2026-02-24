require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Inicializar base de datos
require('./config/database');

const app = express();

// ✅ CORS HANDLER - DEBE SER LO PRIMERO
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Preflight
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});

// Middleware CORS adicional
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/actividades', require('./routes/actividades'));
app.use('/api/ventas', require('./routes/ventas'));
app.use('/api/tareas', require('./routes/tareas'));
app.use('/api/metricas', require('./routes/metricas'));
app.use('/api/embudo', require('./routes/embudo'));
app.use('/api/prospector', require('./routes/prospector'));
app.use('/api/closer', require('./routes/closer'));
app.use('/api/closer/prospectors', require('./routes/prospector-monitoring'));
app.use('/api/google', require('./routes/google'));

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ 
        mensaje: '🚀 API CRM Infiniguard SYS funcionando correctamente',
        env: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

// Health check para Railway
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    res.status(500).json({ 
        mensaje: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 4000;
const HOST = '0.0.0.0'; // Railway requiere escuchar en 0.0.0.0

const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 Servidor corriendo en ${HOST}:${PORT}`);
    console.log(`📡 Modo: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📴 Recibido SIGTERM, cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor cerrado');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('📴 Recibido SIGINT, cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor cerrado');
        process.exit(0);
    });
});

