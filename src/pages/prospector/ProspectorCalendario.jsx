import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, User, Phone, CheckCircle2, ChevronLeft, ChevronRight, UserPlus, Briefcase, Mail, MapPin } from 'lucide-react';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const MOCK_CLOSERS = [
    { id: 1, nombre: 'Ana García', especialidad: 'SaaS' },
    { id: 2, nombre: 'Carlos López', especialidad: 'Consultoría' },
    { id: 3, nombre: 'Sofia Martinez', especialidad: 'Enterprise' }
];

const ProspectorCalendario = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedCloser, setSelectedCloser] = useState('');
    const [formData, setFormData] = useState({
        nombre: '',
        empresa: '',
        telefono: '',
        correo: '',
        notas: ''
    });

    // Calendar Helper Functions (Same as CloserCalendario)
    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];
        for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
        for (let day = 1; day <= daysInMonth; day++) days.push(new Date(year, month, day));
        return days;
    }, [currentDate]);

    const isSameDay = (date1, date2) => {
        if (!date1 || !date2) return false;
        return date1.toDateString() === date2.toDateString();
    };

    const isToday = (date) => {
        if (!date) return false;
        return isSameDay(date, new Date());
    };

    const previousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        alert(`Cita agendada para el ${selectedDate.toLocaleDateString()} con el closer ID: ${selectedCloser}`);
        // Reset form
        setFormData({ nombre: '', empresa: '', telefono: '', correo: '', notas: '' });
        setSelectedCloser('');
    };

    return (
        <div className="h-full flex flex-col p-5 overflow-hidden">
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden min-h-0">
                {/* Main Grid */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">

                    {/* Calendar Section (Left Side - 2 Cols) */}
                    <div className="lg:col-span-2 flex flex-col min-h-0">
                        <div className="flex-1 p-8 flex flex-col min-h-0">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <button onClick={previousMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                    <ChevronLeft className="w-6 h-6 text-gray-600" />
                                </button>
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                                </h2>
                                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                    <ChevronRight className="w-6 h-6 text-gray-600" />
                                </button>
                            </div>

                            {/* Calendar Days */}
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="grid grid-cols-7 gap-2 mb-2 flex-shrink-0">
                                    {DAYS.map(day => (
                                        <div key={day} className="text-center font-semibold text-gray-600 text-sm py-2">
                                            {day}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex-1 grid grid-cols-7 gap-2 min-h-0" style={{ gridAutoRows: '1fr' }}>
                                    {calendarDays.map((date, index) => {
                                        const isSelected = date && isSameDay(date, selectedDate);
                                        const isTodayDate = date && isToday(date);
                                        return (
                                            <button
                                                key={index}
                                                onClick={() => date && setSelectedDate(date)}
                                                disabled={!date}
                                                className={`
                                                    relative rounded-lg transition-all font-medium text-lg
                                                    ${!date ? 'invisible' : ''}
                                                    ${isSelected ? 'bg-teal-500 text-white shadow-lg scale-105' : 'hover:bg-gray-100'}
                                                    ${isTodayDate && !isSelected ? 'bg-teal-50 border-2 border-teal-500 text-teal-700' : ''}
                                                    ${!isSelected && !isTodayDate ? 'text-gray-700' : ''}
                                                `}
                                            >
                                                {date && date.getDate()}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Scheduling Panel (Right Side - 1 Col) */}
                    <div className="lg:col-span-1 flex flex-col min-h-0">
                        <div className="flex-1 bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col overflow-y-auto">
                            <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <CalendarIcon className="w-6 h-6 text-teal-600" />
                                Agendar Cita
                            </h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Programando para el <span className="font-bold text-gray-800">{selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Closer Selector */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Asignar a Closer *</label>
                                    <select
                                        value={selectedCloser}
                                        onChange={(e) => setSelectedCloser(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        required
                                    >
                                        <option value="">Seleccionar Closer...</option>
                                        {MOCK_CLOSERS.map(closer => (
                                            <option key={closer.id} value={closer.id}>{closer.nombre} - {closer.especialidad}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Time Selector (Simple for now) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Hora *</label>
                                    <input
                                        type="time"
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                        required
                                    />
                                </div>

                                <div className="border-t border-gray-200 my-4 pt-4">
                                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                        <User className="w-4 h-4" /> Datos del Cliente
                                    </h3>

                                    <div className="space-y-3">
                                        <div>
                                            <input
                                                type="text"
                                                name="nombre"
                                                placeholder="Nombre Completo"
                                                value={formData.nombre}
                                                onChange={handleInputChange}
                                                className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                                                <div className="px-3 bg-gray-50 border-r border-gray-300">
                                                    <Briefcase className="w-4 h-4 text-gray-500" />
                                                </div>
                                                <input
                                                    type="text"
                                                    name="empresa"
                                                    placeholder="Empresa"
                                                    value={formData.empresa}
                                                    onChange={handleInputChange}
                                                    className="w-full p-2 text-sm focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                                                <div className="px-2 bg-gray-50 border-r border-gray-300">
                                                    <Phone className="w-3 h-3 text-gray-500" />
                                                </div>
                                                <input
                                                    type="tel"
                                                    name="telefono"
                                                    placeholder="Teléfono"
                                                    value={formData.telefono}
                                                    onChange={handleInputChange}
                                                    className="w-full p-2 text-sm focus:outline-none"
                                                    required
                                                />
                                            </div>
                                            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                                                <div className="px-2 bg-gray-50 border-r border-gray-300">
                                                    <Mail className="w-3 h-3 text-gray-500" />
                                                </div>
                                                <input
                                                    type="email"
                                                    name="correo"
                                                    placeholder="Correo"
                                                    value={formData.correo}
                                                    onChange={handleInputChange}
                                                    className="w-full p-2 text-sm focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas / Contexto</label>
                                    <textarea
                                        name="notas"
                                        rows="3"
                                        value={formData.notas}
                                        onChange={handleInputChange}
                                        className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                        placeholder="Detalles importantes para el closer..."
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-bold shadow-md flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    Confirmar Cita
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProspectorCalendario;
