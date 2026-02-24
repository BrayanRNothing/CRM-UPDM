// Placeholder API configuration
// Replace this with your actual backend URL when you connect your API

// Usar la variable de entorno si existe, sino usar el origen actual de la ventana (para prod en Railway),
// y como último recurso (para desarrollo local sin dominio) localhost:4000.
const API_URL = import.meta.env.VITE_API_URL ||
    (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
        ? window.location.origin
        : 'http://localhost:4000');

export default API_URL;
