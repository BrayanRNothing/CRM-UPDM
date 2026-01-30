# 📧 Guía de Implementación de Notificaciones por Email

## ✅ Sistema de Notificaciones Globales

### 🎯 Cómo Funciona

El sistema envía notificaciones **automáticamente** a todos los usuarios que cumplan estas condiciones:
1. ✅ Tengan un **email configurado** en su perfil
2. ✅ Tengan las **notificaciones activadas** (toggle en Ajustes)

### 📬 Tipos de Notificaciones

#### Para ADMINS (todos los que tengan notis activadas):
- 🔔 Nueva cotización/solicitud creada
- ✅ Servicio completado por técnico
- 📊 Actualizaciones importantes del sistema

#### Para TÉCNICOS (individual):
- 🔧 Nueva tarea asignada
- 📍 Detalles de servicio con ubicación
- ⚠️ Servicios prioritarios

#### Para CLIENTES (individual):
- 🔄 Cambio de estado de su servicio
- 👤 Técnico asignado
- 📅 Fecha programada

---

## 1️⃣ Configuración de Gmail (5 minutos)

#### Paso 1: Crear una contraseña de aplicación en Google
1. Ve a https://myaccount.google.com/security
2. Activa "Verificación en 2 pasos" si no la tienes
3. Busca "Contraseñas de aplicaciones"
4. Selecciona "Correo" y "Otro dispositivo"
5. Copia la contraseña de 16 caracteres que te genera

#### Paso 2: Agregar variables de entorno
En tu archivo `.env` del backend, agrega:

```env
# Configuración de Email
EMAIL_USER=tuempresa@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx  # La contraseña de aplicación de 16 caracteres
FRONTEND_URL=https://infiniguard-sys.vercel.app  # O tu dominio
```

### 2️⃣ Funciones Disponibles

Ya tienes estas funciones listas en `emailService.js`:

#### ✅ `enviarEmailBienvenida(usuario)`
- Se envía al registrarse un nuevo usuario
- Incluye detalles de la cuenta

#### ✅ `notificarNuevaCotizacion(adminEmail, cotizacion)`
- Notifica al admin sobre nueva cotización
- Ya está implementado en el código

#### ✅ `notificarCambioEstado(clienteEmail, servicio)`
- Notifica al cliente cuando cambia el estado de su servicio
- Ya está implementado en el código

#### ✅ `notificarTecnicoNuevaTarea(tecnicoEmail, servicio)` **[NUEVA]**
- Notifica al técnico cuando se le asigna una nueva tarea
- Con link directo a su panel

#### ✅ `notificarAdminServicioCompletado(adminEmail, servicio, tecnico)` **[NUEVA]**
- Notifica al admin cuando un técnico completa un servicio

---

## 🔧 Dónde Agregar las Llamadas

### Para notificar al técnico cuando se le asigna una tarea:

En `backend/index.js`, en la ruta **PUT /api/servicios/:id**, agrega:

```javascript
// Después de la línea que actualiza tecnicoAsignado (línea ~466)
if (update.tecnicoAsignado) {
  await pool.query('UPDATE servicios SET tecnicoAsignado = $1 WHERE id = $2', [update.tecnicoAsignado, id]);
  
  // 🆕 NOTIFICAR AL TÉCNICO
  const tecnicoResult = await pool.query('SELECT email FROM usuarios WHERE nombre = $1', [update.tecnicoAsignado]);
  if (tecnicoResult.rows[0]?.email) {
    const servicioResult = await pool.query('SELECT * FROM servicios WHERE id = $1', [id]);
    await notificarTecnicoNuevaTarea(tecnicoResult.rows[0].email, servicioResult.rows[0]);
  }
}
```

### Para notificar al admin cuando un técnico finaliza:

En `backend/index.js`, en la ruta **PUT /api/servicios/:id**, agrega:

```javascript
// Cuando se cambia el estado a 'finalizado' (línea ~442)
if (update.estado) {
  await pool.query('UPDATE servicios SET estado = $1 WHERE id = $2', [update.estado, id]);
  estadoCambiado = true;
  
  // 🆕 SI ES FINALIZADO, NOTIFICAR AL ADMIN
  if (update.estado === 'finalizado') {
    const servicioResult = await pool.query('SELECT * FROM servicios WHERE id = $1', [id]);
    const adminResult = await pool.query('SELECT email FROM usuarios WHERE rol = $1 LIMIT 1', ['admin']);
    if (adminResult.rows[0]?.email) {
      await notificarAdminServicioCompletado(
        adminResult.rows[0].email, 
        servicioResult.rows[0],
        servicioResult.rows[0].tecnicoAsignado
      );
    }
  }
}
```

### Asegúrate de importar las nuevas funciones al inicio de index.js:

```javascript
import { 
  enviarEmailBienvenida, 
  notificarNuevaCotizacion, 
  notificarCambioEstado,
  notificarTecnicoNuevaTarea,        // 🆕 AGREGAR
  notificarAdminServicioCompletado    // 🆕 AGREGAR
} from './services/emailService.js';
```

---

## 🎯 Flujo Completo de Notificaciones

### Cuando se crea un servicio:
1. Cliente crea solicitud → ✅ Admin recibe email

### Cuando admin asigna técnico:
1. Admin asigna técnico → ✅ Técnico recibe email "Nueva tarea asignada"
2. Admin cambia estado → ✅ Cliente recibe email "Actualización de servicio"

### Cuando técnico finaliza:
1. Técnico marca como finalizado → ✅ Admin recibe email "Servicio completado"
2. → ✅ Cliente recibe email "Tu servicio fue completado"

---

## ⚙️ Cómo funciona la detección de email

El sistema verifica automáticamente:
- Si el usuario tiene email configurado en su perfil
- Si las variables de entorno están configuradas
- Si no hay email, simplemente no envía (no genera error)

**Importante:** Solo se envían emails a usuarios que tienen email en su perfil.

---

## 🧪 Probar las notificaciones

### Opción 1: Probar localmente
1. Usa tu email de Gmail personal
2. Configura el `.env` con tu email
3. Haz cambios en la aplicación y verifica que lleguen los emails

### Opción 2: Usar Mailtrap (para desarrollo)
Si no quieres usar Gmail real durante desarrollo:

```env
# En lugar de Gmail
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=tu-usuario-mailtrap
SMTP_PASS=tu-password-mailtrap
```

Y modifica `createTransporter()` en `emailService.js`

---

## 🔴 Errores Comunes

### "Invalid login"
- Verifica que usaste la contraseña de aplicación, no tu contraseña normal
- Asegúrate de tener 2FA activado en Google

### "No se envían emails"
- Verifica que `EMAIL_USER` y `EMAIL_PASS` estén en el `.env`
- Verifica que los usuarios tengan email en su perfil
- Revisa la consola del backend para ver logs

### "Email no configurado - Saltando envío"
- Es normal si no configuraste las variables de entorno
- El sistema sigue funcionando sin emails

---

## 📊 Ventajas del Sistema

✅ **Totalmente opcional** - Si no configuras email, el sistema funciona igual
✅ **Discreto** - Solo envía a usuarios con email configurado
✅ **Profesional** - Emails con diseño HTML bonito
✅ **Informativo** - Incluye toda la información relevante
✅ **Con links directos** - Un clic y van directo a la tarea/servicio

---

## 💡 Próximos Pasos

1. Configura el `.env` con tu Gmail
2. Agrega las llamadas en `index.js` como se indica arriba
3. Reinicia el servidor backend
4. ¡Prueba! Asigna una tarea y revisa tu email
