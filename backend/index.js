import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const PORT = 4000; // El puerto donde vivirá tu servidor

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''; // opcional (recomendado)

const hasValidToken = (req) => {
  if (!ADMIN_TOKEN) return true; // sin token configurado, no bloqueamos (modo demo)
  const headerToken = req.get('x-admin-token');
  return headerToken && headerToken === ADMIN_TOKEN;
};

const buildSnapshot = ({ includePasswords }) => {
  const usuariosSnapshot = includePasswords
    ? usuarios
    : usuarios.map(({ password, ...rest }) => rest);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    usuarios: usuariosSnapshot,
    servicios,
  };
};

const loadSnapshotIntoMemory = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object') throw new Error('Snapshot inválido');
  if (!Array.isArray(snapshot.usuarios)) throw new Error('Snapshot inválido: usuarios debe ser array');
  if (!Array.isArray(snapshot.servicios)) throw new Error('Snapshot inválido: servicios debe ser array');

  // Reemplazamos por completo el estado actual
  usuarios.length = 0;
  usuarios.push(...snapshot.usuarios);
  servicios = snapshot.servicios;
};

const tryLoadDbFromDisk = async () => {
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8');
    const snapshot = JSON.parse(raw);
    // db.json puede incluir o no passwords; no validamos extra campos
    loadSnapshotIntoMemory(snapshot);
    console.log(`✅ DB cargada desde archivo: ${DB_FILE}`);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      console.log('ℹ️ No existe db.json; iniciando con datos en memoria.');
      return;
    }
    console.error('⚠️ No se pudo cargar db.json:', err);
  }
};

const saveDbToDisk = async (options = {}) => {
  const { includePasswords = true } = options;
  const snapshot = buildSnapshot({ includePasswords });
  await fs.writeFile(DB_FILE, JSON.stringify(snapshot, null, 2), 'utf8');
  return snapshot;
};

// Middlewares
app.use(cors()); // Permite que React (puerto 5173) hable con Node (puerto 4000)
app.use(express.json({ limit: '10mb' })); // Entiende JSON y permite hasta 10MB (para imágenes Base64)
app.use(express.urlencoded({ limit: '10mb', extended: true })); // Para formularios con imágenes

console.log('✅ Servidor con CRUD de usuarios activo - v2.0');

// ==========================================
// 🧠 BASE DE DATOS FALSA (En Memoria RAM)
// ==========================================

// 1. Tabla de Usuarios
const usuarios = [
  // Admin
  { id: 1, email: 'cesar@infiniguard.com', password: '123', rol: 'admin', nombre: 'Cesar' },
  
  // Técnicos
  { id: 2, email: 'julio@infiniguard.com', password: '123', rol: 'tecnico', nombre: 'Julio' },
  { id: 3, email: 'brayan@infiniguard.com', password: '123', rol: 'tecnico', nombre: 'Brayan' },
  { id: 4, email: 'pedrito@infiniguard.com', password: '123', rol: 'tecnico', nombre: 'Pedrito' },
  
  // Distribuidores
  { id: 5, email: 'roberto@infiniguard.com', password: '123', rol: 'distribuidor', nombre: 'Roberto' },
  { id: 6, email: 'sandra@infiniguard.com', password: '123', rol: 'distribuidor', nombre: 'Sandra' },
  { id: 7, email: 'miguel@infiniguard.com', password: '123', rol: 'distribuidor', nombre: 'Miguel' },
  
  // Clientes
  { id: 8, email: 'carlos@infiniguard.com', password: '123', rol: 'cliente', nombre: 'Carlos' },
  { id: 9, email: 'maria@infiniguard.com', password: '123', rol: 'cliente', nombre: 'Maria' },
  { id: 10, email: 'jorge@infiniguard.com', password: '123', rol: 'cliente', nombre: 'Jorge' },
  { id: 11, email: 'ana@infiniguard.com', password: '123', rol: 'cliente', nombre: 'Ana' },
  { id: 12, email: 'luis@infiniguard.com', password: '123', rol: 'cliente', nombre: 'Luis' },
];

// 2. Tabla de Servicios / Cotizaciones
let servicios = [];

// Cargar DB persistida (si existe) al arrancar
await tryLoadDbFromDisk();

// ==========================================
// 🔌 RUTAS (ENDPOINTS)
// ==========================================

// RUTA 0: Exportar / Importar respaldo de la “BD”
// Nota: si defines ADMIN_TOKEN en el servidor, debes enviar header: x-admin-token
app.get('/api/db/export', (req, res) => {
  if (!hasValidToken(req)) return res.status(401).json({ success: false, message: 'No autorizado' });
  const includePasswords = String(req.query.includePasswords || 'false') === 'true';
  res.json({ success: true, snapshot: buildSnapshot({ includePasswords }) });
});

app.post('/api/db/import', async (req, res) => {
  if (!hasValidToken(req)) return res.status(401).json({ success: false, message: 'No autorizado' });

  try {
    const snapshot = req.body?.snapshot || req.body;
    loadSnapshotIntoMemory(snapshot);
    await saveDbToDisk({ includePasswords: true });
    res.json({ success: true, message: 'DB importada y guardada', counts: { usuarios: usuarios.length, servicios: servicios.length } });
  } catch (err) {
    res.status(400).json({ success: false, message: err?.message || 'Snapshot inválido' });
  }
});

// Guardar/cargar manualmente (útil si no quieres exportar/importar)
app.post('/api/db/save', async (req, res) => {
  if (!hasValidToken(req)) return res.status(401).json({ success: false, message: 'No autorizado' });
  try {
    const snapshot = await saveDbToDisk({ includePasswords: true });
    res.json({ success: true, message: 'DB guardada', file: DB_FILE, counts: { usuarios: snapshot.usuarios.length, servicios: snapshot.servicios.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'No se pudo guardar db.json' });
  }
});

app.post('/api/db/load', async (req, res) => {
  if (!hasValidToken(req)) return res.status(401).json({ success: false, message: 'No autorizado' });
  await tryLoadDbFromDisk();
  res.json({ success: true, message: 'DB cargada (si existía)', counts: { usuarios: usuarios.length, servicios: servicios.length } });
});

// RUTA 1: Login (Verificar usuario y contraseña)
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  // Buscar en el array de usuarios
  const usuarioEncontrado = usuarios.find(u => u.email === email && u.password === password);

  if (usuarioEncontrado) {
    // Si existe, respondemos con sus datos (menos el password por seguridad)
    const { password, ...datosSeguros } = usuarioEncontrado;
    res.json({ success: true, user: datosSeguros });
  } else {
    res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
  }
});

// RUTA 2: Obtener todos los servicios (Para el Admin o Técnico)
app.get('/api/servicios', (req, res) => {
  // Aquí podríamos filtrar. Ej: si es técnico, solo devolver LAS SUYAS.
  // Por ahora, devolvemos todas.
  res.json(servicios);
});

// RUTA 2B: Obtener lista de técnicos disponibles
app.get('/api/tecnicos', (req, res) => {
  const tecnicos = usuarios.filter(u => u.rol === 'tecnico');
  res.json(tecnicos);
});

// RUTA 3: Crear nueva cotización (Para Cliente, Técnico o Distribuidor)
app.post('/api/servicios', (req, res) => {
  const nuevosDatos = req.body;
  
  const nuevoServicio = {
    id: Date.now(), // Generamos ID aleatorio basado en la hora
    titulo: nuevosDatos.titulo,
    cliente: nuevosDatos.cliente || null, // SOLO si viene del cliente
    usuario: nuevosDatos.usuario || null, // SOLO si viene del técnico/distribuidor
    tecnico: nuevosDatos.tecnico || null,
    tipo: nuevosDatos.tipo,
    modelo: nuevosDatos.modelo || '',
    cantidad: nuevosDatos.cantidad || 1,
    direccion: nuevosDatos.direccion || '',
    telefono: nuevosDatos.telefono || '',
    notas: nuevosDatos.notas || '',
    foto: nuevosDatos.foto || null, // URL base64 o path de la foto
    // Estados de cotización
    estado: nuevosDatos.tecnico ? 'aprobado' : 'pendiente', // pendiente | cotizado | aprobado-cliente | rechazado-cliente | en-proceso | finalizado
    respuestaCotizacion: nuevosDatos.respuestaCotizacion || null, // Respuesta del admin
    precioEstimado: nuevosDatos.precioEstimado || null,
    estadoCliente: null, // null | 'aprobado' | 'rechazado' | 'contactar'
    fecha: new Date().toISOString().split('T')[0] // Fecha de hoy
  };

  servicios.push(nuevoServicio); // ¡Guardamos en el Array!

  // Persistencia best-effort
  saveDbToDisk({ includePasswords: true }).catch(() => {});
  
  console.log("Nueva solicitud recibida:", nuevoServicio);
  res.json({ success: true, servicio: nuevoServicio });
});

// RUTA 4: Actualizar servicio (estado, cotización, técnico asignado, respuesta cliente)
app.put('/api/servicios/:id', (req, res) => {
  const { id } = req.params;
  const actualizacion = req.body;
  
  const index = servicios.findIndex(s => s.id == id);
  
  if (index !== -1) {
    // Actualizar solo los campos enviados
    Object.keys(actualizacion).forEach(key => {
      servicios[index][key] = actualizacion[key];
    });
    
    console.log(`Servicio ${id} actualizado:`, actualizacion);
    // Persistencia best-effort
    saveDbToDisk({ includePasswords: true }).catch(() => {});
    res.json({ success: true, servicio: servicios[index] });
  } else {
    res.status(404).json({ success: false, message: 'Servicio no encontrado' });
  }
});

// RUTA 5: Obtener todos los usuarios
app.get('/api/usuarios', (req, res) => {
  res.json(usuarios);
});

// RUTA 6: Crear nuevo usuario
app.post('/api/usuarios', (req, res) => {
  const { nombre, email, password, rol } = req.body;
  
  // Verificar si el email ya existe
  const existe = usuarios.find(u => u.email === email);
  if (existe) {
    return res.status(400).json({ success: false, message: 'El email ya está registrado' });
  }
  
  const nuevoUsuario = {
    id: Date.now(),
    nombre,
    email,
    password,
    rol
  };
  
  usuarios.push(nuevoUsuario);
  // Persistencia best-effort
  saveDbToDisk({ includePasswords: true }).catch(() => {});
  res.json({ success: true, user: nuevoUsuario });
});

// RUTA 7: Actualizar usuario
app.put('/api/usuarios/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, email, password, rol } = req.body;
  
  const index = usuarios.findIndex(u => u.id == id);
  
  if (index !== -1) {
    // Si se proporciona nueva contraseña, actualizarla
    if (password && password.trim() !== '') {
      usuarios[index] = { ...usuarios[index], nombre, email, password, rol };
    } else {
      // Mantener contraseña anterior
      usuarios[index] = { ...usuarios[index], nombre, email, rol };
    }
    
    // Persistencia best-effort
    saveDbToDisk({ includePasswords: true }).catch(() => {});
    res.json({ success: true, user: usuarios[index] });
  } else {
    res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  }
});

// RUTA 8: Eliminar usuario
app.delete('/api/usuarios/:id', (req, res) => {
  const { id } = req.params;
  const index = usuarios.findIndex(u => u.id == id);
  
  if (index !== -1) {
    usuarios.splice(index, 1);
    // Persistencia best-effort
    saveDbToDisk({ includePasswords: true }).catch(() => {});
    res.json({ success: true, message: 'Usuario eliminado' });
  } else {
    res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  }
});

// Arrancar
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor TEMPORAL corriendo en: http://localhost:${PORT}`);
  console.log(`⚠️  ADVERTENCIA: Si reinicias este servidor, los datos nuevos se borran.`);
});