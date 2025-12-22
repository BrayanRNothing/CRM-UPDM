import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import Database from 'better-sqlite3';

const app = express();
const PORT = process.env.PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- BASE DE DATOS SQLITE ---
// Si usas volumen en Railway, cambia esto, si no, déjalo así.
const DB_PATH = 'database.db';
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Inicializar Tablas
const initDB = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rol TEXT NOT NULL,
      nombre TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS servicios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT,
      cliente TEXT,
      usuario TEXT,
      tecnico TEXT,
      tipo TEXT,
      cantidad INTEGER,
      direccion TEXT,
      telefono TEXT,
      descripcion TEXT,
      pdf TEXT,
      foto TEXT, 
      estado TEXT,
      respuestaCotizacion TEXT,
      precioEstimado TEXT,
      estadoCliente TEXT,
      fecha TEXT
    )
  `);

  // Usuario Admin por defecto
  const stmt = db.prepare('SELECT count(*) as count FROM usuarios');
  const result = stmt.get();
  if (result.count === 0) {
    console.log('⚡ Creando usuario admin por defecto...');
    const insert = db.prepare('INSERT INTO usuarios (email, password, rol, nombre) VALUES (?, ?, ?, ?)');
    insert.run('administrador@infiniguard.com', '123', 'admin', 'Administrador');
  }
};
initDB();

// --- CONFIGURACIÓN DE CARGA DE ARCHIVOS ---
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Limpiamos el nombre de caracteres raros
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, uniqueSuffix + '-' + cleanName);
  }
});
const upload = multer({ storage });

// MIDDLEWARES
app.use(cors());
app.use(express.json());
// Servir la carpeta uploads públicamente
app.use('/uploads', express.static(UPLOADS_DIR));

// --- RUTAS API ---

// 1. LOGIN
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const stmt = db.prepare('SELECT * FROM usuarios WHERE email = ? AND password = ?');
  const user = stmt.get(email, password);

  if (user) {
    const { password, ...datosSeguros } = user;
    res.json({ success: true, user: datosSeguros });
  } else {
    res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
  }
});

// 2. OBTENER SERVICIOS (GET)
app.get('/api/servicios', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM servicios ORDER BY id DESC');
    const servicios = stmt.all();
    
    // Parseamos la foto (que viene como string JSON) a un array real
    const serviciosFormateados = servicios.map(s => ({
      ...s,
      foto: s.foto ? JSON.parse(s.foto) : [] 
    }));

    res.json(serviciosFormateados);
  } catch (error) {
    console.error(error);
    res.status(500).json([]);
  }
});

// 3. CREAR SERVICIO (POST) - AQUI ESTABA EL ERROR EN TU CÓDIGO VIEJO
app.post('/api/servicios', upload.fields([{ name: 'foto', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), (req, res) => {
  const data = req.body;
  
  // Guardamos rutas como strings
  let fotoPath = JSON.stringify([]); 
  let pdfPath = null;

  if (req.files['foto'] && req.files['foto'][0]) {
    // Guardamos: ["uploads/archivo.jpg"]
    fotoPath = JSON.stringify([`uploads/${req.files['foto'][0].filename}`]);
  }

  if (req.files['pdf'] && req.files['pdf'][0]) {
    pdfPath = `uploads/${req.files['pdf'][0].filename}`;
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO servicios (
        titulo, cliente, usuario, tecnico, tipo, cantidad, direccion, telefono, 
        descripcion, pdf, foto, estado, fecha, precioEstimado, respuestaCotizacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      data.titulo, 
      data.cliente || null, 
      data.usuario || 'Anónimo', 
      data.tecnico || null, 
      data.tipo, 
      data.cantidad || 1, 
      data.direccion || '', 
      data.telefono || '', 
      data.descripcion || '', 
      pdfPath, 
      fotoPath, 
      data.tecnico ? 'aprobado' : 'pendiente', 
      new Date().toISOString().split('T')[0],
      null,
      null
    );

    res.json({ success: true, id: info.lastInsertRowid });
  } catch (error) {
    console.error("Error al guardar:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. ACTUALIZAR / RESPONDER (PUT)
app.put('/api/servicios/:id', upload.single('archivo'), (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  
  const check = db.prepare('SELECT * FROM servicios WHERE id = ?').get(id);
  if (!check) return res.status(404).json({ success: false, message: 'Servicio no encontrado' });

  if (req.file) {
    const pdfPath = `uploads/${req.file.filename}`;
    db.prepare('UPDATE servicios SET pdf = ? WHERE id = ?').run(pdfPath, id);
  }

  if (updateData.estado) db.prepare('UPDATE servicios SET estado = ? WHERE id = ?').run(updateData.estado, id);
  if (updateData.respuestaAdmin) db.prepare('UPDATE servicios SET respuestaCotizacion = ? WHERE id = ?').run(updateData.respuestaAdmin, id);
  if (updateData.precio) db.prepare('UPDATE servicios SET precioEstimado = ? WHERE id = ?').run(updateData.precio, id);

  res.json({ success: true, message: 'Actualizado' });
});

// 5. USUARIOS
app.get('/api/usuarios', (req, res) => {
  const users = db.prepare('SELECT id, nombre, email, rol FROM usuarios').all();
  res.json(users);
});

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor SQLite corriendo en puerto: ${PORT}`);
});