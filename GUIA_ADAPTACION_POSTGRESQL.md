# 🚀 Guía: Preparar Backend para Railway

Ahora que PostgreSQL en Railway está lista, el backend necesita ser modificado para funcionar con ambas BDs (SQLite local y PostgreSQL en Railway).

## ✅ Cambios Completados

- [x] **database.js** - Detecta automáticamente DATABASE_URL y usa PostgreSQL o SQLite
- [x] **db-helper.js** - Helper para queries que funciona con ambas BDs
- [x] **usuarios.js** - Ruta adaptada al 100%

## ⚠️ Cambios Pendientes

Las siguientes rutas usan `db.prepare()` y necesitan cambiar a `dbHelper`:

1. **auth.js** - Login y /me endpoint
2. **actividades.js** - Historial de actividades
3. **clientes.js** - CRUD de clientes
4. **closer.js** - Dashboard y calendarios
5. **embudo.js** - Etapas del embudo
6. **metricas.js** - Métricas de vendedores
7. **tareas.js** - Gestión de tareas
8. **ventas.js** - Registro de ventas
9. **prospector.js** - Dashboard de prospectors
10. **prospector-monitoring.js** - Monitoreo

## 🔧 Cómo Adaptar Cada Ruta

### Patrón General de Cambio

**ANTES (SQLite):**
```javascript
const rows = db.prepare('SELECT * FROM usuarios').all();
const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(123);
const result = db.prepare('INSERT INTO usuarios ...').run(params);
```

**DESPUÉS (Compatible):**
```javascript
const dbHelper = require('../config/db-helper');

const rows = await dbHelper.getAll('SELECT * FROM usuarios');
const user = await dbHelper.getOne('SELECT * FROM usuarios WHERE id = ?', [123]);
const result = await dbHelper.run('INSERT INTO usuarios ...', [...params]);
```

## 📋 Cambios Específicos

### 1. Importar dbHelper
En **cada ruta**, añade después del `const db`:
```javascript
const dbHelper = require('../config/db-helper');
```

### 2. Cambiar db.prepare().get() → dbHelper.getOne()
```javascript
// Antes:
const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);

// Después:
const user = await dbHelper.getOne('SELECT * FROM usuarios WHERE id = ?', [id]);
```

### 3. Cambiar db.prepare().all() → dbHelper.getAll()
```javascript
// Antes:
const rows = db.prepare('SELECT * FROM usuarios').all();

// Después:
const rows = await dbHelper.getAll('SELECT * FROM usuarios', []);
```

### 4. Cambiar db.prepare().run() → dbHelper.run()
```javascript
// Antes:
const result = db.prepare('INSERT INTO usuarios ...').run(param1, param2);

// Después:
const result = await dbHelper.run('INSERT INTO usuarios ...', [param1, param2]);
```

## 🚨 Casos Especiales

### LIMIT 1 (Obtener último registro)
```javascript
// Ambas BDs funcionan igual
const lastRow = await dbHelper.getOne('SELECT * FROM table ORDER BY id DESC LIMIT 1');
```

### Variables Dinámicas en SQL
```javascript
// Para PostgreSQL, usar $N en lugar de ?
let sql = 'SELECT * FROM users WHERE id = ?';
if (db.isPostgres) {
    sql = 'SELECT * FROM users WHERE id = $1';
}
const result = await dbHelper.getOne(sql, [id]);
```

O mejor aún, dbHelper maneja esto automáticamente en muchos casos.

### lastInsertRowid vs RETURNING
En `db-helper.js` ya está manejado. Solo retorna `lastID`.

## 📝 Archivos a Modificar (Orden de Importancia)

1. **auth.js** - Crítico (login podría fallar)
2. **clientes.js** - Crítico (CRUD principal)
3. **actividades.js** - Importante
4. **closer.js** - Importante
5. **tareas.js** - Normal
6. **ventas.js** - Normal
7. **prospector.js** - Normal
8. **embudo.js** - Normal
9. **metricas.js** - Normal
10. **prospector-monitoring.js** - Normal

## 🔍 Pasos Generales para Cada Archivo

Para **auth.js**, **clientes.js**, etc:

1. Abrir el archivo
2. Agregar: `const dbHelper = require('../config/db-helper');`
3. Reemplazar cada:
   - `db.prepare('...').get(...)` con `await dbHelper.getOne('...', [...])`
   - `db.prepare('...').all(...)` con `await dbHelper.getAll('...', [...])`
   - `db.prepare('...').run(...)` con `await dbHelper.run('...', [...])`
   - `db.prepare('...').all()` con `await dbHelper.getAll('...', [])`
4. Asegurar que todas las funciones sean `async`
5. Agregar `await` antes de cada `dbHelper`

## ⚡ Atajo: Buscar y Reemplazar

En VS Code, abre cada archivo y:
1. **Ctrl+H** (Buscar y Reemplazar)
2. Busca: `db\.prepare\(`
3. Reemplaza con: `dbHelper.` (según sea getOne/getAll/run)

## ✅ Verificación Final

Después de cambios, en terminal:
```bash
cd backend
npm start
```

Deberías ver:
```
✅ PostgreSQL conectado correctamente
🚀 Servidor corriendo en 0.0.0.0:4000
```

## 🎯 Variables de Entorno

Asegurate que en Railway estén configuradas:
- ✅ `NODE_ENV=production`
- ✅ `DATABASE_URL=postgresql://...`
- ✅ `JWT_SECRET=...`
- ✅ `PORT=4000`

## 💡 Notas Importantes

- PostgreSQL usa placeholders `$1, $2` (dbHelper lo maneja automáticamente)
- SQLite usa placeholders `?` (original)
- dbHelper traduce automáticamente de `?` a `$N` cuando detecta PostgreSQL
- Las columnas en PostgreSQL son case-insensitive (pero se guardan como lowercase)
- Aunque las queries devuelven lowercase, el código formatters las manejan

---

**Ayuda rápida:** Si una ruta sigue sin funcionar después de cambiarla, revisa:
1. ¿Está importado dbHelper?
2. ¿La función es async?
3. ¿Hay await ante dbHelper calls?
4. ¿Los parámetros están en un array?
