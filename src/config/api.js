// Detección automática de entorno
const isDevelopment = import.meta.env.MODE === 'development';

// URL del Backend
const API_URL = isDevelopment
    ? 'http://localhost:4000'  // Desarrollo local
    : 'https://infiniguardsys-production-67b0.up.railway.app';  // Producción en Railway

export default API_URL;
