import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfToday, differenceInCalendarMonths, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';


function Dashboard() {
  const navigate = useNavigate();

  // Puxa os dados do usuário salvo no login
  const user = JSON.parse(localStorage.getItem('@PortalSolidario:user')) || {};

  // Estados para armazenar os dados da API e as seleções do usuário
  const [services, setServices] = useState([]);
  const [selectedAudience, setSelectedAudience] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');

  // Estados do Calendário
  const [currentMonth, setCurrentMonth] = useState(startOfToday());
  const [selectedDate, setSelectedDate] = useState(null);

  // Estados do horário
  const [selectedTime, setSelectedTime] = useState('');

  // Estados de Bloqueios e Modal
  const [holidays, setHolidays] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [holidayReason, setHolidayReason] = useState('');
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

  // --- Estados da Aba de Gestão ---
  const [activeTab, setActiveTab] = useState('calendar');
  const [appointments, setAppointments] = useState([]);


  // Busca os serviços automaticamente quando o Dashboard carrega
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL;
        const response = await fetch(`${API_URL}/services`);
        if (response.ok) {
          const data = await response.json();
          setServices(data);
        }

        const token = localStorage.getItem('@PortalSolidario:token');
        const holidayResponse = await fetch(`${API_URL}/holidays`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (holidayResponse.ok) {
          const holidayData = await holidayResponse.json();
          // Garante que as dates stringifadas sejam interpretadas localmente e salvas no estado
          setHolidays(holidayData); 
        }
      } catch (error) {
        console.error('Erro ao buscar serviços:', error);
      }
    };
    fetchServices();
  }, []);

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('@PortalSolidario:token');
    localStorage.removeItem('@PortalSolidario:user');
    navigate('/');
  };

  // Extrai os públicos da lista de serviços
  const audiences = [...new Set(services.map(s => s.target_audience))].filter(Boolean);

  //Filtra a lista de serviços baseada no público escolhido no primeiro dropdown
  const filteredServices = services.filter(s => s.target_audience === selectedAudience);

  // Limpa o serviço se o usuário altera o publico
  const handleAudienceChange = (e) => {
    setSelectedAudience(e.target.value);
    setSelectedServiceId(''); 
  };

  // --- Lógica do Calendário ---
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const today = startOfToday();
  const diffMonths = differenceInCalendarMonths(currentMonth, today);

  const nextMonth = () => {
    if (diffMonths < 5) setCurrentMonth(addMonths(currentMonth, 1));
   };
  const prevMonth = () => {
    if (diffMonths > -1) setCurrentMonth(subMonths(currentMonth, 1));
  };

  const getBlockInfo = (day) => {
    if (getDay(day) === 0) return { isBlocked: true, reason: 'Fechado aos Domingos' };
    
    const dateString = format(day, 'yyyy-MM-dd');
    const holiday = Array.isArray(holidays) 
      ? holidays.find(h => h?.date?.startsWith(dateString) || h?.blocked_date?.startsWith(dateString)) 
      : null;
      
    if (holiday) return { isBlocked: true, reason: holiday.description, id: holiday.id, creatorName: holiday.creator_name };
    
    return { isBlocked: false, reason: null, id: null, creatorName: null };
  };
  

  // Se clicar no mesmo dia, limpa (null). Se for um novo, seleciona.
  const handleDateSelect = (day) => {
    setSelectedDate(prev => prev && isSameDay(prev, day) ? null : day);
    setSelectedTime(''); // <- Limpa o horário sempre que a data mudar
  };

  //Verificando se a data selecionada está bloqueada
  const isSelectedDateBlocked = selectedDate ? getBlockInfo(selectedDate).isBlocked : false;

  // --- Ações do Admin para Feriados ---
  const handleBlockDate = async () => {
    if (!holidayReason) return alert('Por favor, digite um motivo para o bloqueio.');
    
    try {
      const token = localStorage.getItem('@PortalSolidario:token');
      const API_URL = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${API_URL}/holidays`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          blocked_date: format(selectedDate, 'yyyy-MM-dd'),
          description: holidayReason,
          user_id: user.id
        })
      });

      if (response.ok) {
        const newHoliday = await response.json();
        setHolidays([...holidays, newHoliday]); // Adiciona na tela instantaneamente
        setHolidayReason(''); // Limpa o input
      } else {
        alert('Erro ao bloquear a data.');
      }
    } catch (error) {
      console.error('Erro ao bloquear data:', error);
    }
  };

  const handleUnblockDate = async (holidayId) => {
    try {
      const token = localStorage.getItem('@PortalSolidario:token');
      const API_URL = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${API_URL}/holidays/${holidayId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        // Remove da tela instantaneamente filtrando pelo ID
        setHolidays(holidays.filter(h => h.id !== holidayId)); 
      } else {
        alert('Erro ao desbloquear a data.');
      }
    } catch (error) {
      console.error('Erro ao desbloquear data:', error);
    }
  };

  // --- Confirmar agendamento ---
  const handleSchedule = async () => {
    try {
      const token = localStorage.getItem('@PortalSolidario:token');
      const API_URL = import.meta.env.VITE_API_URL;
      
      // Monta o timestamp combinando a data e o horário escolhidos
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const scheduledAt = `${dateString}T${selectedTime}:00`;

      const response = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          client_id: user.id,
          service_id: selectedServiceId,
          scheduled_at: scheduledAt
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Agendamento realizado com sucesso!');
        // Limpa a tela para o estado inicial
        setSelectedServiceId('');
        setSelectedAudience('');
        setSelectedDate(null);
        setSelectedTime('');
      } else {
        // Exibe o erro vindo do backend (ex: "Você já possui um agendamento hoje")
        alert(data.error || 'Erro ao realizar o agendamento.');
      }
    } catch (error) {
      console.error('Erro no agendamento:', error);
      alert('Erro de conexão ao tentar agendar.');
    }
  };

  // Dicionário de Status e Cores
  const statusMap = {
    PENDING: { label: 'Pendente', color: 'text-yellow-400 bg-yellow-900/30 border-yellow-800' },
    CONFIRMED: { label: 'Confirmado', color: 'text-blue-400 bg-blue-900/30 border-blue-800' },
    COMPLETED: { label: 'Concluído', color: 'text-green-400 bg-green-900/30 border-green-800' },
    CANCELED: { label: 'Cancelado', color: 'text-red-400 bg-red-900/30 border-red-800' }
  };

  // --- Ações de Admin ---
  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('@PortalSolidario:token');
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API_URL}/appointments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAppointments(data);
      }
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    }
  };

  // Dispara a busca automaticamente toda vez que o ADMIN clicar na aba "Gestão"
  useEffect(() => {
    if (activeTab === 'management') {
      fetchAppointments();
    }
  }, [activeTab]);

  const handleStatusChange = async (appointmentId, newStatus) => {
    const confirmChange = window.confirm('Deseja realmente alterar o status deste agendamento?');
    if (!confirmChange) return;

    try {
      const token = localStorage.getItem('@PortalSolidario:token');
      const API_URL = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${API_URL}/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        // Atualiza a lista na tela instantaneamente sem recarregar a página
        setAppointments(prev => 
          prev.map(app => app.id === appointmentId ? { ...app, status: newStatus } : app)
        );
      } else {
        alert('Erro ao atualizar o status.');
      }
    } catch (error) {
      console.error('Erro ao mudar status:', error);
    }
  };

return (
    <div className="min-h-screen bg-petroleo-900 text-cinza-200 p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-center bg-petroleo-800 p-6 rounded-lg shadow-lg border border-petroleo-700">
          <div>
            <h1 className="text-2xl font-bold text-white">Área Logada</h1>
            <p className="text-cinza-400">Bem-vindo(a), {user?.name}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-800 font-semibold py-2 px-4 rounded-md transition duration-200"
          >
            Sair
          </button>
        </div>
        
        {/* --- Guias de navegação para admins */}
        {isAdmin && (
          <div className="flex gap-4 mt-6 mb-6 border-b border-petroleo-700 pb-2">
            <button 
              onClick={() => setActiveTab('calendar')}
              className={`font-semibold pb-2 px-4 border-b-2 transition-colors ${activeTab === 'calendar' ? 'border-cinza-200 text-white' : 'border-transparent text-cinza-400 hover:text-cinza-200'}`}
            >
              Agendar Serviço
            </button>
            <button 
              onClick={() => setActiveTab('management')}
              className={`font-semibold pb-2 px-4 border-b-2 transition-colors ${activeTab === 'management' ? 'border-cinza-200 text-white' : 'border-transparent text-cinza-400 hover:text-cinza-200'}`}
            >
              Gestão de Agendamentos
            </button>
          </div>
        )}        
        {/* ABA: CALENDÁRIO */}
        {activeTab === 'calendar' && (
        <div className="space-y-8 mt-8">
            {/* Dropdowns de Seleção */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-petroleo-800 p-6 rounded-lg border border-petroleo-700 shadow-lg">
            
            {/* Dropdown de Público */}
            <div>
                <label className="block text-sm font-medium text-cinza-200 mb-2">Para quem é o serviço?</label>
                <select 
                value={selectedAudience} 
                onChange={handleAudienceChange}
                className="w-full px-4 py-3 bg-petroleo-900 border border-petroleo-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-petroleo-700 cursor-pointer appearance-none"
                >
                <option value="" disabled>Selecione o público...</option>
                {audiences.map((audience, index) => (
                    <option key={index} value={audience}>{audience}</option>
                ))}
                </select>
            </div>

            {/* Dropdown de Serviço (Desabilitado se nenhum público for escolhido) */}
            <div>
                <label className="block text-sm font-medium text-cinza-200 mb-2">Qual serviço deseja?</label>
                <select 
                value={selectedServiceId} 
                onChange={(e) => setSelectedServiceId(e.target.value)}
                disabled={!selectedAudience}
                className="w-full px-4 py-3 bg-petroleo-900 border border-petroleo-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-petroleo-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                >
                <option value="" disabled>
                    {!selectedAudience ? 'Escolha o público primeiro' : 'Selecione o serviço...'}
                </option>
                {filteredServices.map(service => (
                    <option key={service.id} value={service.id}>
                    {service.name}
                    </option>
                ))}
                </select>
            </div>
            </div>

            {/* Calendário (Placeholder visual por enquanto) */}
            <div className="mt-8 p-6 bg-petroleo-800 rounded-lg border border-petroleo-700 shadow-lg select-none">
            
            {/* Navegação e Mês/Ano */}
            <div className="flex justify-between items-center mb-6">
                <button 
                    onClick={prevMonth} 
                    disabled={diffMonths <= -1}
                    className="text-cinza-200 hover:text-white px-3 py-1 bg-petroleo-900 rounded-md border border-petroleo-700 font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                >&lt;
                </button>
                <h2 className="text-xl font-bold text-white capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </h2>
                <button 
                    onClick={nextMonth} 
                    disabled={diffMonths >= 5}
                    className="text-cinza-200 hover:text-white px-3 py-1 bg-petroleo-900 rounded-md border border-petroleo-700 font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                >&gt;
                </button>
            </div>
            
            {/* Grid de Dias */}
            <div className="grid grid-cols-7 gap-2 text-center">
                {/* Cabeçalho dos dias da semana */}
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="text-sm font-bold text-cinza-400 py-2">{day}</div>
                ))}
                
                {/* Espaços vazios para o mês começar no dia da semana correto */}
                {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, index) => (
                <div key={`empty-${index}`} />
                ))}

                {/* Renderização dos dias */}
                {daysInMonth.map(day => {
                const { isBlocked, reason } = getBlockInfo(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isPast = isBefore(day, startOfToday());
                
                // Regra de Clique: Desabilita se for passado OR (bloqueado E não for Admin)
                const isDisabled = isPast || (isBlocked && !isAdmin);

                return (
                    <button
                    key={day.toString()}
                    onClick={() => !isDisabled && handleDateSelect(day)}
                    disabled={isDisabled}
                    title={reason || ''} // Tooltip nativo
                    className={`
                        py-2 rounded-md transition-colors text-sm font-medium
                        ${isPast ? 'opacity-30 cursor-not-allowed text-cinza-400' : 'hover:bg-petroleo-700 text-cinza-200'}
                        ${isBlocked && !isPast ? 'bg-red-900/50 text-red-200 border border-red-800' : ''}
                        ${isSelected ? 'bg-white text-petroleo-900 font-bold hover:bg-cinza-200 shadow-md border-0' : (!isBlocked ? 'bg-petroleo-900' : '')}
                    `}
                    >
                    {format(day, 'd')}
                    </button>
                )
                })}
            </div>
            </div>
            {/* Seleção de horário */}
            {selectedDate && !isSelectedDateBlocked && (
            <div className="mt-8 p-6 bg-petroleo-800 rounded-lg border border-petroleo-700 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4">
                Horários disponíveis para {format(selectedDate, 'dd/MM')}
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'].map(time => (
                    <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`py-2 rounded-md font-medium transition-colors border ${
                        selectedTime === time
                        ? 'bg-white text-petroleo-900 border-white shadow-md'
                        : 'bg-petroleo-900 text-cinza-200 border-petroleo-700 hover:bg-petroleo-700'
                    }`}
                    >
                    {time}
                    </button>
                ))}
                </div>
            </div>
            )}        
            {/* Painel de Gerenciamento do Admin (Visível apenas se Admin selecionou uma data) */}
            {isAdmin && selectedDate && (
            <div className="mt-6 p-5 bg-petroleo-900 border border-petroleo-700 rounded-lg shadow-inner">
                <h3 className="text-lg font-bold text-white mb-4">
                Gerenciamento Admin: <span className="text-cinza-400">{format(selectedDate, 'dd/MM/yyyy')}</span>
                </h3>
                
                {isSelectedDateBlocked ? (
                // Cenário A: Data já está bloqueada
                getBlockInfo(selectedDate).id ? (
                    // É um feriado cadastrado (pode desbloquear)
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-red-900/20 p-4 rounded-md border border-red-900/50">
                    <span className="text-red-300 font-medium">Motivo: {getBlockInfo(selectedDate).reason}</span>
                    <span className="text-red-400 text-sm">Bloqueado por: {getBlockInfo(selectedDate).creatorName || 'Sistema'}</span>
                    <button 
                        onClick={() => handleUnblockDate(getBlockInfo(selectedDate).id)}
                        className="w-full sm:w-auto bg-green-700 hover:bg-green-600 text-white py-2 px-6 rounded-md font-semibold transition"
                    >
                        Desbloquear Data
                    </button>
                    </div>
                ) : (
                    // É um domingo (bloqueio fixo, não exibe botão)
                    <div className="bg-petroleo-800 p-4 rounded-md">
                    <span className="text-cinza-400 font-medium">Esta data possui um bloqueio fixo do sistema (Domingo).</span>
                    </div>
                )
                ) : (
                // Cenário B: Data está Livre
                <div className="flex flex-col sm:flex-row gap-4">
                    <input 
                    type="text" 
                    value={holidayReason}
                    onChange={(e) => setHolidayReason(e.target.value)}
                    placeholder="Descreva o motivo do bloqueio..."
                    className="flex-1 px-4 py-2 bg-petroleo-800 border border-petroleo-700 rounded-md text-white placeholder-cinza-400 focus:outline-none focus:ring-2 focus:ring-petroleo-700"
                    />
                    <button 
                    onClick={handleBlockDate}
                    className="w-full sm:w-auto bg-red-800 hover:bg-red-700 text-white py-2 px-6 rounded-md font-semibold transition shadow-md"
                    >
                    Bloquear Data
                    </button>
                </div>
                )}
            </div>
            )}        

            {/* Botão de Confirmação (Desabilitado até ter serviço e data) */}
            <button
            onClick={handleSchedule}
            disabled={!selectedServiceId || !selectedDate || isSelectedDateBlocked || !selectedTime }
            className="w-full mt-8 bg-petroleo-700 hover:bg-petroleo-900 border border-petroleo-700 text-white font-semibold py-4 px-4 rounded-md transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
            Confirmar Agendamento
            </button>
        </div>
        )}

        {/* Aba de gerenciamento */}
        {activeTab === 'management' && isAdmin && (
          <div className="mt-8 bg-petroleo-800 rounded-lg border border-petroleo-700 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-cinza-200">
                <thead className="bg-petroleo-900 text-cinza-400 border-b border-petroleo-700">
                  <tr>
                    <th className="px-6 py-4 font-medium">Data / Hora</th>
                    <th className="px-6 py-4 font-medium">Cliente</th>
                    <th className="px-6 py-4 font-medium">Serviço</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-petroleo-700">
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-cinza-400">Nenhum agendamento encontrado.</td>
                    </tr>
                  ) : (
                    appointments.map(app => (
                      <tr key={app.id} className="hover:bg-petroleo-700/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {format(new Date(app.scheduled_at), "dd/MM/yyyy 'às' HH:mm")}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-white">{app.client_name}</p>
                          <p className="text-xs text-cinza-400">{app.client_phone}</p>
                        </td>
                        <td className="px-6 py-4 text-cinza-200">{app.service_name}</td>
                        <td className="px-6 py-4">
                          <select 
                            value={app.status} 
                            onChange={(e) => handleStatusChange(app.id, e.target.value)}
                            className={`px-3 py-1.5 rounded-md font-semibold text-xs border cursor-pointer focus:outline-none ${statusMap[app.status]?.color || statusMap['PENDING'].color}`}
                          >
                            {Object.keys(statusMap).map(key => (
                              <option key={key} value={key} className="bg-petroleo-900 text-white">
                                {statusMap[key].label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}        

      </div>
    </div>
  );
}

export default Dashboard;