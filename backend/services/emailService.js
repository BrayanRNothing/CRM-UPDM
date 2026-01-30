import nodemailer from 'nodemailer';

/**
 * Servicio de Email para InfiniguardSYS
 * Configuración simple con Gmail
 */

// Configurar transporter con Gmail
// NOTA: Necesitas configurar las variables de entorno en .env:
// EMAIL_USER=tu-email@gmail.com
// EMAIL_PASS=tu-app-password (no la contraseña normal, sino App Password de Google)
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Enviar email de bienvenida al registrarse
 */
export const enviarEmailBienvenida = async (usuario) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('⚠️ Email no configurado - Saltando envío');
    return { success: false, message: 'Email no configurado' };
  }

  const transporter = createTransporter();

  const mailOptions = {
    from: `"Infiniguard SYS" <${process.env.EMAIL_USER}>`,
    to: usuario.email,
    subject: '¡Bienvenido a Infiniguard SYS! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡Bienvenido a Infiniguard SYS!</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${usuario.nombre}</strong>,</p>
            <p>Tu cuenta ha sido creada exitosamente. Ahora puedes acceder a nuestro sistema de gestión.</p>
            <p><strong>Detalles de tu cuenta:</strong></p>
            <ul>
              <li>Email: ${usuario.email}</li>
              <li>Rol: ${usuario.rol}</li>
            </ul>
            <p>Recibirás notificaciones sobre el estado de tus servicios en este correo.</p>
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'https://infiniguard-sys.vercel.app'}" class="button">Ir a Infiniguard SYS</a>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Infiniguard SYS - Sistema de Gestión</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email de bienvenida enviado a ${usuario.email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error al enviar email de bienvenida:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Notificar a TODOS los admins con notificaciones activas sobre nueva cotización
 */
export const notificarNuevaCotizacion = async (cotizacion, pool) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('⚠️ Email no configurado - Saltando envío');
    return { success: false, message: 'Email no configurado' };
  }

  // Obtener todos los admins con email y notificaciones activas
  try {
    const admins = await pool.query(
      'SELECT email, nombre FROM usuarios WHERE rol = $1 AND email IS NOT NULL AND notificaciones_activas = TRUE',
      ['admin']
    );

    if (admins.rows.length === 0) {
      console.log('⚠️ No hay admins con notificaciones activas');
      return { success: false, message: 'No hay destinatarios' };
    }

    const transporter = createTransporter();
    const emails = admins.rows.map(admin => admin.email);

    const mailOptions = {
      from: `"Infiniguard SYS" <${process.env.EMAIL_USER}>`,
      to: emails.join(', '), // Enviar a todos los admins
      subject: `🔔 Nueva Cotización: ${cotizacion.titulo}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0; border-radius: 5px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Nueva Solicitud de Cotización</h1>
          </div>
          <div class="content">
            <p>Se ha recibido una nueva solicitud de cotización:</p>
            <div class="info-box">
              <p><strong>Título:</strong> ${cotizacion.titulo}</p>
              <p><strong>Cliente:</strong> ${cotizacion.cliente || cotizacion.usuario}</p>
              <p><strong>Tipo:</strong> ${cotizacion.tipoServicio || 'No especificado'}</p>
              <p><strong>Fecha:</strong> ${new Date(cotizacion.fecha).toLocaleDateString('es-ES')}</p>
              ${cotizacion.descripcion ? `<p><strong>Descripción:</strong> ${cotizacion.descripcion}</p>` : ''}
            </div>
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'https://infiniguard-sys.vercel.app'}/admin" class="button">Ver en el Sistema</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Notificación de cotización enviada a ${emails.length} admin(s)`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error al enviar notificación:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Notificar al cliente sobre cambio de estado
 */
export const notificarCambioEstado = async (clienteEmail, servicio, pool) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !clienteEmail) {
    console.log('⚠️ Email no configurado o cliente sin email - Saltando envío');
    return { success: false, message: 'Email no configurado' };
  }

  // Verificar si el cliente tiene notificaciones activas
  try {
    const usuario = await pool.query(
      'SELECT notificaciones_activas FROM usuarios WHERE email = $1',
      [clienteEmail]
    );

    if (!usuario.rows[0] || !usuario.rows[0].notificaciones_activas) {
      console.log('⚠️ Cliente tiene notificaciones desactivadas');
      return { success: false, message: 'Notificaciones desactivadas' };
    }
  } catch (error) {
    console.error('Error verificando notificaciones:', error);
  }

  const transporter = createTransporter();

  const estadoTexto = {
    'pendiente': 'Pendiente de Revisión',
    'cotizado': 'Cotizado',
    'aprobado': 'Aprobado',
    'en-proceso': 'En Proceso',
    'finalizado': 'Finalizado',
    'rechazado': 'Rechazado'
  };

  const estadoColor = {
    'pendiente': '#f59e0b',
    'cotizado': '#3b82f6',
    'aprobado': '#10b981',
    'en-proceso': '#8b5cf6',
    'finalizado': '#6b7280',
    'rechazado': '#ef4444'
  };

  const mailOptions = {
    from: `"Infiniguard SYS" <${process.env.EMAIL_USER}>`,
    to: clienteEmail,
    subject: `Actualización de Servicio: ${servicio.titulo}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; color: white; font-weight: bold; margin: 10px 0; }
          .info-box { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Actualización de Servicio</h1>
          </div>
          <div class="content">
            <p>Tu servicio ha sido actualizado:</p>
            <div class="info-box">
              <p><strong>Servicio:</strong> ${servicio.titulo}</p>
              <p><strong>Nuevo Estado:</strong></p>
              <span class="status-badge" style="background: ${estadoColor[servicio.estado] || '#6b7280'}">
                ${estadoTexto[servicio.estado] || servicio.estado}
              </span>
              ${servicio.tecnicoAsignado ? `<p><strong>Técnico Asignado:</strong> ${servicio.tecnicoAsignado}</p>` : ''}
              ${servicio.fechaProgramada ? `<p><strong>Fecha Programada:</strong> ${new Date(servicio.fechaProgramada).toLocaleDateString('es-ES')}</p>` : ''}
            </div>
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'https://infiniguard-sys.vercel.app'}/usuario" class="button">Ver Detalles</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Notificación de cambio de estado enviada a ${clienteEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error al enviar notificación:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Notificar al técnico sobre nueva tarea asignada
 */
export const notificarTecnicoNuevaTarea = async (tecnicoEmail, servicio, pool) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !tecnicoEmail) {
    console.log('⚠️ Email no configurado o técnico sin email - Saltando envío');
    return { success: false, message: 'Email no configurado' };
  }

  // Verificar si el técnico tiene notificaciones activas
  try {
    const usuario = await pool.query(
      'SELECT notificaciones_activas FROM usuarios WHERE email = $1',
      [tecnicoEmail]
    );

    if (!usuario.rows[0] || !usuario.rows[0].notificaciones_activas) {
      console.log('⚠️ Técnico tiene notificaciones desactivadas');
      return { success: false, message: 'Notificaciones desactivadas' };
    }
  } catch (error) {
    console.error('Error verificando notificaciones:', error);
  }

  const transporter = createTransporter();

  const mailOptions = {
    from: `"Infiniguard SYS" <${process.env.EMAIL_USER}>`,
    to: tecnicoEmail,
    subject: `🔧 Nueva Tarea Asignada: ${servicio.titulo}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 15px; border-left: 4px solid #8b5cf6; margin: 15px 0; border-radius: 5px; }
          .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
          .priority-high { color: #ef4444; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔧 Nueva Tarea Asignada</h1>
          </div>
          <div class="content">
            <p>Se te ha asignado una nueva tarea:</p>
            <div class="info-box">
              <p><strong>Servicio:</strong> ${servicio.titulo}</p>
              <p><strong>Cliente:</strong> ${servicio.cliente || 'No especificado'}</p>
              <p><strong>Tipo:</strong> ${servicio.tipo || 'Servicio general'}</p>
              ${servicio.direccion ? `<p><strong>Ubicación:</strong> ${servicio.direccion}</p>` : ''}
              ${servicio.fechaProgramada ? `<p><strong>Fecha Programada:</strong> ${new Date(servicio.fechaProgramada).toLocaleDateString('es-ES')}</p>` : ''}
              ${servicio.prioridad === 'alta' ? `<p class="priority-high">⚠️ PRIORIDAD ALTA</p>` : ''}
              ${servicio.descripcion ? `<p><strong>Descripción:</strong> ${servicio.descripcion}</p>` : ''}
            </div>
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'https://infiniguard-sys.vercel.app'}/tecnico" class="button">Ver Tarea</a>
            </div>
            <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
              💡 <em>Puedes ver todos los detalles y actualizar el estado desde tu panel de técnico.</em>
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Notificación de nueva tarea enviada a ${tecnicoEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error al enviar notificación al técnico:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Notificar a TODOS los admins con notificaciones activas sobre servicio completado
 */
export const notificarAdminServicioCompletado = async (servicio, tecnico, pool) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('⚠️ Email no configurado - Saltando envío');
    return { success: false, message: 'Email no configurado' };
  }

  // Obtener todos los admins con email y notificaciones activas
  try {
    const admins = await pool.query(
      'SELECT email, nombre FROM usuarios WHERE rol = $1 AND email IS NOT NULL AND notificaciones_activas = TRUE',
      ['admin']
    );

    if (admins.rows.length === 0) {
      console.log('⚠️ No hay admins con notificaciones activas');
      return { success: false, message: 'No hay destinatarios' };
    }

    const transporter = createTransporter();
    const emails = admins.rows.map(admin => admin.email);

    const mailOptions = {
      from: `"Infiniguard SYS" <${process.env.EMAIL_USER}>`,
      to: emails.join(', '), // Enviar a todos los admins
      subject: `✅ Servicio Completado: ${servicio.titulo}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #10b981; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Servicio Completado</h1>
          </div>
          <div class="content">
            <p>Un servicio ha sido marcado como finalizado:</p>
            <div class="info-box">
              <p><strong>Servicio:</strong> ${servicio.titulo}</p>
              <p><strong>Cliente:</strong> ${servicio.cliente || 'No especificado'}</p>
              <p><strong>Técnico:</strong> ${tecnico || servicio.tecnicoAsignado || 'No especificado'}</p>
              <p><strong>Fecha de Finalización:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
              ${servicio.notasFinales ? `<p><strong>Notas del Técnico:</strong> ${servicio.notasFinales}</p>` : ''}
            </div>
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'https://infiniguard-sys.vercel.app'}/admin/servicios" class="button">Ver en el Sistema</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Notificación de servicio completado enviada a ${emails.length} admin(s)`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error al enviar notificación:', error);
    return { success: false, error: error.message };
  }
};
