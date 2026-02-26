# ✅ Checklist: Backend Preparado para Railway

## Estado Actual

**Base de Datos:**
- [x] PostgreSQL en Railway creado y funcional
- [x] Estructura idéntica a SQLite
- [x] Usuarios de prueba creados (prospector/prospector123, closer/closer123)
- [x] DATABASE_URL en `.env.production`

**Adaptación de Backend:**
- [x] `backend/config/database.js` - Detecta DB y conecta automáticamente
- [x] `backend/config/db-helper.js` - Helper para queries async
- [x] `backend/routes/auth.js` - ✅ Adaptada (LOGIN LISTO)
- [x] `backend/routes/usuarios.js` - ✅ Adaptada
- [x] `backend/routes/clientes.js` - ✅ Adaptada (CRUD LISTO)
- [ ] `backend/routes/actividades.js` - Pendiente
- [ ] `backend/routes/tareas.js` - Pendiente  
- [ ] `backend/routes/ventas.js` - Pendiente
- [ ] `backend/routes/embudo.js` - Pendiente
- [ ] `backend/routes/closer.js` - Pendiente
- [ ] `backend/routes/prospector.js` - Pendiente
- [ ] `backend/routes/metricas.js` - Pendiente
- [ ] `backend/routes/prospector-monitoring.js` - Pendiente
- [ ] `backend/routes/google.js` - Revisar

## 🚀 Estado del Backend

**Lo que YA Funciona:**
- ✅ Login (POST /api/auth/login)
- ✅ Usuario actual (GET /api/auth/me)
- ✅ Crear/Listar/Editar usuarios (CRUD completo)
- ✅ Crear/Listar/Editar clientes (CRUD completo)
- ✅ Cambiar etapa de clientes

**Lo que NECESITA Adaptación:**
- ⚠️ Historial de actividades
- ⚠️ Gestión de tareas
- ⚠️ Registro de ventas
- ⚠️ Dashboards (prospector y closer)
- ⚠️ Métricas

## 📋 Próximos Pasos

### Opción A: Adaptar las Rutas Restantes (Recomendado)

Sigue la `GUIA_ADAPTACION_POSTGRESQL.md` en la raíz del proyecto para adaptar cada ruta.

**Orden de prioridad:**
1. `closer.js` - Crítica para los closers
2. `prospector.js` - Crítica para los prospectors
3. `actividades.js` - Importante para historial
4. El resto según necesidad

### Opción B: Usar el Backend como Está

Si no quieres adaptar todo ahora, el backend funcionará parcialmente:
- ✅ Inicio de sesión
- ✅ CRUD de usuarios y clientes
- ⚠️ Dashboards pueden fallar
- ⚠️ Algunas funciones no estarán disponibles

## 🔧 Cómo Adaptar Manualmente

### Ejemplo: Para la ruta `tareas.js`

1. Abre `backend/routes/tareas.js`
2. Después de la línea `const db = require('../config/database');`, agrega:
   ```javascript
   const dbHelper = require('../config/db-helper');
   ```

3. Reemplaza cada una de estas líneas:
   ```javascript
   // Antes:
   db.prepare('SELECT ...').get(id)
   db.prepare('SELECT ...').all()
   db.prepare('INSERT ...').run(...)
   
   // Después:
   await dbHelper.getOne('SELECT ...', [id])
   await dbHelper.getAll('SELECT ...')
   await dbHelper.run('INSERT ...', [...params])
   ```

4. Asegúrate que todas las funciones tengan `async`:
   ```javascript
   router.get('/', auth, async (req, res) => { ... })  // ✅ async aquí
   ```

## 🧪 Cómo Probar el Backend

```bash
# Desde la carpeta del proyecto
cd backend

# Iniciar backend
npm start

# Deberías ver:
# ✅ PostgreSQL conectado correctamente
# 🚀 Servidor corriendo en 0.0.0.0:4000
```

## 🔗 URLs para Probar

```bash
# 1. Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"prospector","contraseña":"prospector123"}'

# 2. Obtener usuario actual
curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Listar clientes
curl -X GET http://localhost:4000/api/clientes \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📦 Variables de Entorno para Railway

En el dashboard de Railway, las variables deben ser:
- `NODE_ENV=production`
- `DATABASE_URL=postgresql://...` (automática)
- `JWT_SECRET=fde99c03724fd14b03d501213831b549d839254ad669458b8211774716c2697d`
- `PORT=4000`
- `GOOGLE_CLIENT_ID=572672543982-...`
- `GOOGLE_CLIENT_SECRET=GOCSPX-...`

## 🎯 Resumen

El backend está **70% listo** para Railway:
- ✅ BD lista y funcional
- ✅ Rutas críticas adaptadas (auth, usuarios, clientes)
- ⚠️ Rutas secundarias pendientes (tareas, ventas, dashboards)

**Tiempo estimado para adaptar el resto:** 30-45 minutos si sigues la guía.

---

**Siguiente paso recomendado:** 
1. Adaptar `closer.js` y `prospector.js` 
2. Subir a Railway y probar
3. Adaptar las demás rutas según sea necesario
