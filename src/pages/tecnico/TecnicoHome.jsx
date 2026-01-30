
// Página principal del técnico: muestra tareas asignadas, completadas y solicitudes propias
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import ServiceCard from '../../components/ui/ServiceCard';
import ServicioDetalleModal from '../../components/tecnico/ServicioDetalleModal';
import ConfirmarFinalizarModal from '../../components/tecnico/ConfirmarFinalizarModal';
import API_URL from '../../config/api';


const TecnicoHome = () => {
  // Estado para la pestaña activa (tareas pendientes, completadas o solicitudes propias)
  const [activeTab, setActiveTab] = useState('pendientes');
  // Lista de tareas asignadas al técnico
  const [tareas, setTareas] = useState([]);
  // Solicitudes creadas por el propio técnico
  const [misSolicitudes, setMisSolicitudes] = useState([]);
  // Usuario logueado
  const [usuario, setUsuario] = useState(null);
  // Estado de carga
  const [loading, setLoading] = useState(true);
  // Servicio seleccionado para ver detalles
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  // Servicio a finalizar
  const [servicioAFinalizar, setServicioAFinalizar] = useState(null);


  // 1. Cargar datos al iniciar o refrescar
  // Obtiene servicios y filtra los que corresponden al técnico y sus solicitudes
  const cargarDatos = async () => {
    setLoading(true);
    const userGuardado = JSON.parse(sessionStorage.getItem('user'));
    setUsuario(userGuardado);

    try {
      // Traer todos los servicios del backend
      const res = await fetch(`${API_URL}/api/servicios`);
      const data = await res.json();

      // FILTRO A: Tareas asignadas al técnico (por id, por nombre o servicios generales sin asignar)
      const miTecnicoId = userGuardado?.id;
      const trabajoTodo = data.filter(item => {
        // Asignado por id
        const asignadoPorId = miTecnicoId != null && item.tecnicoid != null && String(item.tecnicoid) === String(miTecnicoId);
        // Asignado por nombre (campo antiguo)
        const asignadoPorNombre = item.tecnico === userGuardado?.nombre;
        // Asignado por nombre (campo nuevo desde admin)
        const asignadoPorNombreNuevo = item.tecnicoasignado === userGuardado?.nombre;
        // Servicios generales aprobados, sin técnico asignado
        const esGeneralSinAsignar =
          (item.estado === 'aprobado' || item.estado === 'en-proceso' || item.estado === 'finalizado') &&
          item.tipo === 'servicio_general' &&
          !item.tecnico &&
          !item.tecnicoasignado &&
          item.tecnicoid == null;

        return asignadoPorId || asignadoPorNombre || asignadoPorNombreNuevo || esGeneralSinAsignar;
      });
      setTareas(trabajoTodo);

      // FILTRO B: Solicitudes creadas por el técnico (equipos, garantías, cotizaciones, etc)
      const misPedidos = data.filter(item => {
        return item.usuario === userGuardado?.nombre;
      });
      setMisSolicitudes(misPedidos);

    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };


  // 2. Efecto: cargar datos al montar y refrescar cada 10 segundos
  useEffect(() => {
    cargarDatos();
    // Auto-refresh cada 10 segundos
    const interval = setInterval(() => {
      cargarDatos();
    }, 10000);
    return () => clearInterval(interval);
  }, []);


  // 3. Marcar una tarea como finalizada (PUT al backend)
  const handleFinalizar = async (id) => {
    // Buscar el servicio para mostrarlo en el modal
    const servicio = tareas.find(t => t.id === id);
    if (servicio) {
      setServicioAFinalizar(servicio);
    }
  };

  // Confirmar finalización del servicio
  const confirmarFinalizacion = async (notasFinales) => {
    if (!servicioAFinalizar) return;

    try {
      const res = await fetch(`${API_URL}/api/servicios/${servicioAFinalizar.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'finalizado',
          notasFinales: notasFinales || undefined
        })
      });
      if (res.ok) {
        toast.success('¡Excelente trabajo! Servicio completado.');
        setServicioAFinalizar(null);
        cargarDatos(); // Recargar para moverlo al historial
      } else {
        toast.error('Error al finalizar el servicio');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error de conexión');
    }
  };


  // 4. Renderizado condicional según la pestaña activa
  // Muestra tareas activas, completadas o solicitudes propias
  const renderContenido = () => {
    if (loading) return <div className="text-center py-10">Cargando...</div>;

    // --- PESTAÑA 1: TAREAS ACTIVAS ---
    if (activeTab === 'pendientes') {
      // Filtra tareas no finalizadas
      const pendientes = tareas.filter(t => t.estado !== 'finalizado');
      if (pendientes.length === 0) return <div className="text-center py-10 text-gray-400">No tienes tareas activas 🎉</div>;
      // Muestra cada tarea como ServiceCard, con botón de detalles y finalizar
      return pendientes.map(t => (
        <ServiceCard
          key={t.id}
          id={t.id}
          titulo={t.titulo}
          empresa={t.cliente}
          direccion={t.direccion || 'Ubicación no especificada'}
          fecha={t.fecha}
          estado={t.estado}
          onDetalles={() => setServicioSeleccionado(t)}
          onFinalizar={handleFinalizar}
        />
      ));
    }

    // --- PESTAÑA 2: COMPLETADAS ---
    if (activeTab === 'completadas') {
      // Filtra tareas finalizadas
      const finalizadas = tareas.filter(t => t.estado === 'finalizado');
      if (finalizadas.length === 0) return <div className="text-center py-10 text-gray-400">Aún no has completado servicios.</div>;
      // Muestra cada tarea finalizada como ServiceCard
      return finalizadas.map(t => (
        <ServiceCard
          key={t.id}
          id={t.id}
          titulo={t.titulo}
          empresa={t.cliente}
          direccion={t.direccion || 'Finalizado'}
          fecha={t.fecha}
          estado={t.estado}
          onDetalles={() => setServicioSeleccionado(t)}
        />
      ));
    }
  };


  // Render principal: título, tabs y contenido dinámico
  return (
    <div className="max-w-md mx-auto">
      {/* Saludo y subtítulo */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Hola, {usuario?.nombre || 'Técnico'} 👋</h1>
        <p className="text-gray-500 text-sm">Panel de Operaciones</p>
      </div>

      {/* --- MENU DE PESTAÑAS (TABS) --- */}
      <div className="flex p-1 bg-gray-200 rounded-xl mb-6">
        <button
          onClick={() => setActiveTab('pendientes')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'pendientes' ? 'bg-white text-blue-600 shadow' : 'text-gray-500'}`}
        >
          Activas
        </button>
        <button
          onClick={() => setActiveTab('completadas')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'completadas' ? 'bg-white text-blue-600 shadow' : 'text-gray-500'}`}
        >
          Completadas
        </button>
      </div>

      {/* --- CONTENIDO DINÁMICO --- */}
      <div className="space-y-4">
        {renderContenido()}
      </div>

      {/* Modal de Detalles */}
      {servicioSeleccionado && (
        <ServicioDetalleModal
          servicio={servicioSeleccionado}
          onClose={() => setServicioSeleccionado(null)}
        />
      )}

      {/* Modal de Confirmación de Finalización */}
      {servicioAFinalizar && (
        <ConfirmarFinalizarModal
          servicio={servicioAFinalizar}
          onConfirm={confirmarFinalizacion}
          onCancel={() => setServicioAFinalizar(null)}
        />
      )}
    </div>
  );
};

export default TecnicoHome;
