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
  const isSuperAdmin = user?.role === 'SUPERADMIN';

  // --- Estados da Aba de Gestão ---
  const [activeTab, setActiveTab] = useState('calendar');
  const [appointments, setAppointments] = useState([]);
  const [staffList, setStaffList] = useState([]);

  // --- Estados da Aba de Serviços ---
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [serviceFormName, setServiceFormName] = useState('');
  const [serviceFormDescription, setServiceFormDescription] = useState('');
  const [serviceFormDuration, setServiceFormDuration] = useState('');
  const [serviceFormAudience, setServiceFormAudience] = useState('');

  // --- Estados da Aba de Gestão de Equipe (SuperAdmin) ---
  const [staffMembers, setStaffMembers] = useState([]);
  const [staffFormName, setStaffFormName] = useState('');
  const [staffFormEmail, setStaffFormEmail] = useState('');
  const [staffFormPassword, setStaffFormPassword] = useState('');
  const [staffFormRole, setStaffFormRole] = useState('STAFF');
  const [staffFormPhone, setStaffFormPhone] = useState ('')

  // --- Estados para Alteração de Senha do Cliente ---
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [clientNewPassword, setClientNewPassword] = useState('');
  const [clientConfirmPassword, setClientConfirmPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState({ message: '', type: '' });

  // Função para formatar o telefone no padrão (XX) XXXXX-XXXX
  const formatPhone = (value) => {
    if (!value) return '';
    // Remove tudo que não for número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara gradativamente
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

// Força a exibição da data e hora sempre no fuso de Brasília.
  const formatDateBR = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    
    const dayMonth = new Intl.DateTimeFormat('pt-BR', { 
      timeZone: 'America/Sao_Paulo', 
      day: '2-digit', 
      month: 'long' 
    }).format(date);

    const time = new Intl.DateTimeFormat('pt-BR', { 
      timeZone: 'America/Sao_Paulo', 
      hour: '2-digit', 
      minute: '2-digit' 
    }).format(date);

    return `${dayMonth} às ${time}`;
  };

  // Busca os serviços automaticamente quando o Dashboard carrega
  useEffect(() => {
      const fetchData = async () => {
          try {
              const API_URL = import.meta.env.VITE_API_URL;
          
              // 1. Busca Serviços
              const resServices = await fetch(`${API_URL}/services`);
              if (resServices.ok) setServices(await resServices.json());

              // 2. Busca Feriados e Agendamentos (Requer Token)
              const token = localStorage.getItem('@PortalSolidario:token');
              if (token) {
                  const headers = { 'Authorization': `Bearer ${token}` };
                  
                  const resHolidays = await fetch(`${API_URL}/holidays`, { headers });
                  
                  if (resHolidays.ok) setHolidays(await resHolidays.json());
              }
          } catch (error) {
              console.error('Erro ao buscar dados iniciais:', error);
          }
      };
      fetchData();
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
    if (getDay(day) === 0) return { isBlocked: true, reason: 'Fechado aos Domingos', type: 'system' };
    
    const dateString = format(day, 'yyyy-MM-dd');
    
    // Verifica Feriados
    const holiday = Array.isArray(holidays) 
      ? holidays.find(h => h?.date?.startsWith(dateString) || h?.blocked_date?.startsWith(dateString)) 
      : null;
    if (holiday) return { isBlocked: true, reason: holiday.description, id: holiday.id, creatorName: holiday.creator_name, type: 'holiday' };
    
    // Verifica Agenda Lotada, ou seja, 1 agendamento por dia que não esteja com status 
    const booked = Array.isArray(appointments)
      ? appointments.find(a => a?.scheduled_at?.startsWith(dateString) && a?.status !== 'CANCELED')
      : null;
    if (booked) return { isBlocked: true, reason: 'Agenda lotada', id: booked.id, creatorName: null, type: 'booked' };

    return { isBlocked: false, reason: null, id: null, creatorName: null, type: 'free' };
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

  const fetchStaff = async () => {
    // debug cronometro início
    console.time('Tempo da API - Staff')
    try {
      const token = localStorage.getItem('@PortalSolidario:token');
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Guarda no estado apenas os usuários com a role STAFF
        setStaffList(data.filter(u => u.role === 'STAFF'));
      }
    } catch (error) {
      console.error('Erro ao buscar profissionais:', error);
    } finally{
      // debug cronometro fim
      console.timeEnd('Tempo da API - Staff')
    }
  };

  // Dispara as buscas sempre que clicar na aba
  useEffect(() => {
    fetchAppointments();

    if (activeTab === 'management') {
      fetchStaff();
    }

    if (activeTab === 'staff'){
      fetchAllUsers();
    }
  }, [activeTab]);

  const fetchAppointments = async () => {
    // debug cronometro início
    console.time('Tempo da API - Agendamentos')

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
    } finally{
      //debug cronometro fim
      console.timeEnd('Tempo da API - Agendamentos')
    }
  };

  // --- Ações de Gestão de Serviços ---
  const handleSaveService = async (e) => {
    e.preventDefault(); // Evita recarregar a página no submit do form
    try {
      const token = localStorage.getItem('@PortalSolidario:token');
      const API_URL = import.meta.env.VITE_API_URL;
      
      const method = editingServiceId ? 'PUT' : 'POST';
      const url = editingServiceId ? `${API_URL}/services/${editingServiceId}` : `${API_URL}/services`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: serviceFormName,
          description: serviceFormDescription,
          duration_minutes: parseInt(serviceFormDuration),
          target_audience: serviceFormAudience
        })
      });

      if (response.ok) {
        const savedService = await response.json();
        
        // Atualiza a lista na tela imediatamente
        if (editingServiceId) {
          setServices(prev => prev.map(s => s.id === editingServiceId ? savedService : s));
        } else {
          setServices(prev => [...prev, savedService]);
        }
        
        // Limpa o formulário
        setServiceFormName('');
        setServiceFormDuration('');
        setServiceFormDescription('');
        setServiceFormAudience('');
        setEditingServiceId(null);
        alert('Serviço salvo com sucesso!');
      } else {
        alert('Erro ao salvar serviço. Verifique os dados e tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao salvar serviço:', error);
    }
  };

  // --- Ações de Gestão de Equipe (Apenas SuperAdmin) ---
  const handleSaveStaff = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('@PortalSolidario:token');
      const API_URL = import.meta.env.VITE_API_URL;

      const passwordRegex = /^(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,}$/;
      if (!passwordRegex.test(staffFormPassword)) {
        alert('A senha deve ter no mínimo 6 caracteres, incluindo pelo menos uma letra maiúscula e um caractere especial (ex: @, #, !).');
        return;
      }
      
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: staffFormName,
          email: staffFormEmail,
          password: staffFormPassword,
          role: staffFormRole,
          phone: staffFormPhone
        })
      });

      if (response.ok) {
        alert('Membro da equipe cadastrado com sucesso!');
        // Limpa o formulário
        setStaffFormName('');
        setStaffFormEmail('');
        setStaffFormPassword('');
        setStaffFormRole('STAFF');
        
        // Se o seu backend tiver uma rota GET /users, poderíamos chamar uma função fetchStaff() aqui para atualizar a tabela.
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao cadastrar membro da equipe.');
      }
    } catch (error) {
      console.error('Erro ao salvar equipe:', error);
    }
  };

  const handleEditServiceClick = (service) => {
    setEditingServiceId(service.id);
    setServiceFormName(service.name);
    setServiceFormDescription('');
    setServiceFormDescription(service.description || '');
    setServiceFormDuration(service.duration_minutes);
    setServiceFormAudience(service.target_audience);
  };

  const handleCancelEdit = () => {
    setEditingServiceId(null);
    setServiceFormName('');
    setServiceFormDuration('');
    setServiceFormAudience('');
  };

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

const handleStaffAssign = async (appointmentId, staffId) => {
    if (!staffId) return;

    const selectedStaff = staffList.find(s => s.id === staffId);
    const staffName = selectedStaff ? selectedStaff.name : 'este profissional';
    const confirmAssign = window.confirm(`Tem certeza que deseja atribuir ${staffName} para realizar este serviço?`);
  
    if (!confirmAssign) return;

    try {
      const token = localStorage.getItem('@PortalSolidario:token');
      const API_URL = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${API_URL}/appointments/${appointmentId}/staff`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: staffId }) 
      });

      if (response.ok) {
        setAppointments(prev => 
          prev.map(app => app.id === appointmentId ? { ...app, user_id: staffId } : app)
        );
      } else {
        alert('Erro ao atribuir profissional.');
      }
    } catch (error) {
      console.error('Erro ao atribuir profissional:', error);
    }
  };

// Para o cliente cancelar o seu próprio agendamento
  const handleClientCancel = async (appointmentId) => {
    const confirmCancel = window.confirm('Tem certeza que deseja cancelar este agendamento?');
    if (!confirmCancel) return;
    
    try {
      const token = localStorage.getItem('@PortalSolidario:token');
      const API_URL = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${API_URL}/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'CANCELED' })
      });

      if (response.ok) {
        // Atualiza a tela instantaneamente
        setAppointments(prev => 
          prev.map(app => app.id === appointmentId ? { ...app, status: 'CANCELED' } : app)
        );
      } else {
        alert('Erro ao cancelar o agendamento.');
      }
    } catch (error) {
      console.error('Erro ao cancelar:', error);
    }
  };

// Busca todos os usuários para a tabela de gestão (SuperAdmin)
  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem('@PortalSolidario:token');
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setStaffMembers(await response.json());
      }
    } catch (error) {
      console.error('Erro ao buscar equipe:', error);
    }
  };

  // Altera a Role
  const handleChangeRole = async (userId, userName, newRole) => {
    const confirm = window.confirm(`Tem certeza que deseja alterar o acesso de ${userName} para ${newRole}?`);
    if (!confirm) return;

    try {
      const token = localStorage.getItem('@PortalSolidario:token');
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API_URL}/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        setStaffMembers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } else {
        alert('Erro ao atualizar permissão.');
      }
    } catch (error) {
      console.error('Erro ao mudar role:', error);
    }
  };

  // Reseta a Senha
  const handleResetPassword = async (userId, userName) => {
    const confirm = window.confirm(`Gerar senha provisória para ${userName}? Isso forçará a troca no próximo login.`);
    if (!confirm) return;

    try {
      const token = localStorage.getItem('@PortalSolidario:token');
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API_URL}/users/${userId}/reset-password`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // Alert com quebra de linha nativa para destacar a senha nova
        alert(`Senha gerada com sucesso para ${userName}!\n\nSenha Provisória: ${data.tempPassword}\n\nCopie e envie esta senha para o usuário.`);
      } else {
        alert('Erro ao resetar senha.');
      }
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
    }
  };

  // Função para o Cliente trocar a própria senha logado
  const handleClientPasswordChange = async (e) => {
    e.preventDefault();
    setPasswordFeedback({ message: '', type: '' });

    if (clientNewPassword !== clientConfirmPassword) {
      return setPasswordFeedback({ message: 'As senhas não coincidem.', type: 'error' });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,}$/;
    if (!passwordRegex.test(clientNewPassword)) {
      return setPasswordFeedback({ message: 'A senha deve ter no mínimo 6 caracteres, 1 maiúscula e 1 caractere especial.', type: 'error' });
    }

    try {
      const token = localStorage.getItem('@PortalSolidario:token');
      const API_URL = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${API_URL}/clients/update-password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: clientNewPassword })
      });

      if (response.ok) {
        setPasswordFeedback({ message: 'Senha atualizada com sucesso!', type: 'success' });
        setClientNewPassword('');
        setClientConfirmPassword('');
        
        // Fecha o formulário automaticamente após 3 segundos
        setTimeout(() => {
          setIsChangingPassword(false);
          setPasswordFeedback({ message: '', type: '' });
        }, 3000);
      } else {
        const data = await response.json();
        setPasswordFeedback({ message: data.error || 'Erro ao atualizar a senha.', type: 'error' });
      }
    } catch (error) {
      console.error('Erro:', error);
      setPasswordFeedback({ message: 'Erro de conexão com o servidor.', type: 'error' });
    }
  };

return (
    <div className="min-h-screen bg-petroleo-900 text-cinza-200 p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-center bg-petroleo-800 p-6 rounded-lg shadow-lg border border-petroleo-700">
          <div>
            <h1 className="text-2xl font-bold text-white">Área Logada</h1>
            <p className="text-cinza-400">Bem-vindo(a), {user?.name}!</p>
          </div>          
          <button 
            onClick={handleLogout}
            className="bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-800 font-semibold py-2 px-4 rounded-md transition duration-200"
          >
            Sair
          </button>
        </div>

        {/* Opção visível apenas para clientes */}
        {user.role === 'CLIENT' && (
          <div className="mb-6">
            <button 
              onClick={() => setIsChangingPassword(!isChangingPassword)}
              className="text-sm font-medium text-cinza-400 hover:text-white transition-colors"
            >
              {isChangingPassword ? 'Cancelar alteração de senha' : '🔒 Alterar minha senha'}
            </button>
            
            {isChangingPassword && (
              <div className="mt-4 p-5 bg-petroleo-800 border border-petroleo-700 rounded-lg max-w-sm shadow-lg animate-fade-in">
                <h3 className="text-white font-semibold mb-3">Definir Nova Senha</h3>
                
                {passwordFeedback.message && (
                  <div className={`mb-3 p-2 rounded text-sm font-medium ${passwordFeedback.type === 'error' ? 'bg-red-900/50 text-red-200 border border-red-800' : 'bg-green-900/50 text-green-200 border border-green-800'}`}>
                    {passwordFeedback.message}
                  </div>
                )}

                <form onSubmit={handleClientPasswordChange} className="space-y-3">
                  <div>
                    <input 
                      type="password" 
                      placeholder="Nova senha"
                      value={clientNewPassword}
                      onChange={(e) => setClientNewPassword(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-petroleo-900 border border-petroleo-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-700 placeholder-cinza-500"
                    />
                  </div>
                  <div>
                    <input 
                      type="password" 
                      placeholder="Confirme a nova senha"
                      value={clientConfirmPassword}
                      onChange={(e) => setClientConfirmPassword(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-petroleo-900 border border-petroleo-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-700 placeholder-cinza-500"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-petroleo-700 hover:bg-petroleo-600 border border-petroleo-600 text-white font-semibold py-2 px-4 rounded-md transition duration-200 text-sm mt-2"
                  >
                    Salvar Senha
                  </button>
                </form>
              </div>
            )}
          </div>
        )}        
        
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
            <button 
              onClick={() => setActiveTab('services')}
              className={`font-semibold pb-2 px-4 border-b-2 transition-colors ${activeTab === 'services' ? 'border-cinza-200 text-white' : 'border-transparent text-cinza-400 hover:text-cinza-200'}`}
            >
              Catálogo de Serviços
            </button>            
            {isSuperAdmin && (
              <button 
                onClick={() => setActiveTab('staff')}
                className={`font-semibold pb-2 px-4 border-b-2 transition-colors ${activeTab === 'staff' ? 'border-cinza-200 text-white' : 'border-transparent text-cinza-400 hover:text-cinza-200'}`}
              >
                Gestão de Equipe
              </button>
            )}  
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
                const { isBlocked, reason, type } = getBlockInfo(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isPast = isBefore(day, startOfToday());
                
                const isDisabled = isPast || type === 'system' || type === 'booked' || (type === 'holiday' && !isAdmin);

                return (
                    <button
                    key={day.toString()}
                    onClick={() => !isDisabled && handleDateSelect(day)}
                    disabled={isDisabled}
                    title={reason || ''} 
                    className={`
                        py-2 rounded-md transition-colors text-sm font-medium
                        ${isPast ? 'opacity-30 cursor-not-allowed text-cinza-400' : 'hover:bg-petroleo-700 text-cinza-200'}
                        ${isBlocked && !isPast && type === 'holiday' ? 'bg-red-900/50 text-red-200 border border-red-800' : ''}
                        ${isBlocked && !isPast && type === 'booked' ? 'bg-yellow-900/50 text-yellow-200 border border-yellow-800 cursor-not-allowed opacity-70' : ''}
                        ${isSelected ? 'bg-white text-petroleo-900 font-bold hover:bg-cinza-200 shadow-md border-0' : (type === 'free' ? 'bg-petroleo-900' : '')}
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
                    <th className="px-6 py-4 font-medium">Profissional</th>
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
                          {formatDateBR(app.scheduled_at)}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-white">{app.client_name}</p>
                          <p className="text-xs text-cinza-400">{app.client_phone}</p>
                        </td>
                        <td className="px-6 py-4 text-cinza-200">{app.service_name}</td>
                        <td className="px-6 py-4">
                          <select 
                            value={app.user_id || ''}
                            onChange={(e) => handleStaffAssign(app.id, e.target.value)}
                            disabled={app.status === 'CANCELED'}
                            className="w-full px-3 py-1.5 bg-petroleo-900 border border-petroleo-700 rounded-md text-white text-xs focus:outline-none focus:ring-2 focus:ring-petroleo-700 cursor-pointer"
                          >
                            <option value="">Não atribuído</option>
                            {staffList.map(staff => (
                              <option key={staff.id} value={staff.id}>
                                {staff.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <select 
                            value={app.status} 
                            onChange={(e) => handleStatusChange(app.id, e.target.value)}
                            disabled={app.status === 'CANCELED'}
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

        {/* ABA DE NAVEGAÇÃO PARA CLIENTE*/}
        {!isAdmin && (
          <div className="flex gap-4 mt-6 mb-6 border-b border-petroleo-700 pb-2">
            <button 
              onClick={() => setActiveTab('calendar')}
              className={`font-semibold pb-2 px-4 border-b-2 transition-colors ${activeTab === 'calendar' ? 'border-cinza-200 text-white' : 'border-transparent text-cinza-400 hover:text-cinza-200'}`}
            >
              Agendar Serviço
            </button>
            <button 
              onClick={() => setActiveTab('my_appointments')}
              className={`font-semibold pb-2 px-4 border-b-2 transition-colors ${activeTab === 'my_appointments' ? 'border-cinza-200 text-white' : 'border-transparent text-cinza-400 hover:text-cinza-200'}`}
            >
              Meus Agendamentos
            </button>
          </div>
        )}

        {/* ABA MEUS AGENDAMENTOS (CLIENTE) */}
        {activeTab === 'my_appointments' && !isAdmin && (
          <div className="mt-8 bg-petroleo-800 rounded-lg border border-petroleo-700 shadow-lg p-6">
            <h2 className="text-xl font-bold text-white mb-6">Meus Agendamentos</h2>
            <div className="space-y-4">
              {appointments.filter(app => app.client_id === user.id).length === 0 ? (
                <p className="text-cinza-400">Você ainda não possui agendamentos.</p>
              ) : (
                appointments.filter(app => app.client_id === user.id).map(app => (
                  <div key={app.id} className="flex flex-col sm:flex-row justify-between items-center p-4 bg-petroleo-900 border border-petroleo-700 rounded-md">
                    <div>
                      <p className="font-bold text-white capitalize">{formatDateBR(app.scheduled_at)}</p>
                      <p className="text-cinza-400 text-sm">{app.service_name}</p>
                      <span className={`inline-block mt-2 px-2 py-1 text-xs font-semibold rounded-md ${statusMap[app.status]?.color}`}>
                        {statusMap[app.status]?.label}
                      </span>
                    </div>
                    
                    {/* Exibe o botão de cancelar apenas se o agendamento ainda estiver ativo */}
                    {app.status !== 'CANCELED' && app.status !== 'COMPLETED' && (
                      <button 
                        onClick={() => handleClientCancel(app.id)}
                        className="mt-4 sm:mt-0 bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-800 font-semibold py-2 px-4 rounded-md transition duration-200"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ABA GESTÃO DE SERVIÇOS (ADMIN) */}
        {activeTab === 'services' && isAdmin && (
          <div className="mt-8 space-y-8">
            
            {/* Formulário de Cadastro/Edição */}
            <div className="bg-petroleo-800 rounded-lg border border-petroleo-700 shadow-lg p-6">
              <h2 className="text-xl font-bold text-white mb-6">
                {editingServiceId ? 'Editar Serviço' : 'Novo Serviço'}
              </h2>
              <form onSubmit={handleSaveService} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-cinza-200 mb-2">Nome do Serviço</label>
                  <input 
                    type="text" 
                    required
                    value={serviceFormName}
                    onChange={(e) => setServiceFormName(e.target.value)}
                    placeholder="Ex: Corte de Cabelo Masculino"
                    className="w-full px-4 py-2 bg-petroleo-900 border border-petroleo-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-petroleo-700"
                  />
                </div>
                <div className="md:col-span-4 mt-2">
                  <label className="block text-sm font-medium text-cinza-200 mb-2">Descrição do Serviço</label>
                  <textarea 
                    value={serviceFormDescription}
                    onChange={(e) => setServiceFormDescription(e.target.value)}
                    placeholder="Ex: Corte clássico na tesoura, com acabamento na navalha"
                    rows="2"
                    className="w-full px-4 py-2 bg-petroleo-900 border border-petroleo-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-petroleo-700 resize-none"
                  ></textarea>
                </div>                
                <div>
                  <label className="block text-sm font-medium text-cinza-200 mb-2">Duração (minutos)</label>
                  <input 
                    type="number" 
                    required
                    min="15"
                    step="15"
                    value={serviceFormDuration}
                    onChange={(e) => setServiceFormDuration(e.target.value)}
                    placeholder="Ex: 60"
                    className="w-full px-4 py-2 bg-petroleo-900 border border-petroleo-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-petroleo-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cinza-200 mb-2">Público-Alvo</label>
                  <select 
                    required
                    value={serviceFormAudience}
                    onChange={(e) => setServiceFormAudience(e.target.value)}
                    className="w-full px-4 py-2 bg-petroleo-900 border border-petroleo-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-petroleo-700"
                  >
                    <option value="" disabled>Selecione...</option>
                    <option value="Masculino">MASCULINO</option>
                    <option value="Feminino">FEMININO</option>
                    <option value="Geral">GERAL</option>
                  </select>
                </div>
                <div className="md:col-span-4 flex gap-4 mt-4">
                  <button 
                    type="submit"
                    className="bg-green-700 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-md transition duration-200"
                  >
                    {editingServiceId ? 'Salvar Alterações' : 'Cadastrar Serviço'}
                  </button>
                  {editingServiceId && (
                    <button 
                      type="button"
                      onClick={handleCancelEdit}
                      className="bg-petroleo-700 hover:bg-petroleo-600 text-white font-semibold py-2 px-6 rounded-md transition duration-200"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Lista de Serviços */}
            <div className="bg-petroleo-800 rounded-lg border border-petroleo-700 shadow-lg overflow-hidden">
              <table className="w-full text-left text-sm text-cinza-200">
                <thead className="bg-petroleo-900 text-cinza-400 border-b border-petroleo-700">
                  <tr>
                    <th className="px-6 py-4 font-medium">Serviço</th>
                    <th className="px-6 py-4 font-medium">Duração</th>
                    <th className="px-6 py-4 font-medium">Público</th>
                    <th className="px-6 py-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-petroleo-700">
                  {services.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-cinza-400">Nenhum serviço cadastrado.</td>
                    </tr>
                  ) : (
                    services.map(service => (
                      <tr key={service.id} className="hover:bg-petroleo-700/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-white">{service.name}</td>
                        <td className="px-6 py-4">{service.duration_minutes} min</td>
                        <td className="px-6 py-4">{service.target_audience}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleEditServiceClick(service)}
                            className="text-blue-400 hover:text-blue-300 font-semibold px-3 py-1 bg-blue-900/30 border border-blue-800 rounded-md transition-colors"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA GESTÃO DE EQUIPE APENAS SUPERADMIN */}
        {activeTab === 'staff' && isSuperAdmin && (
          <div className="mt-8 space-y-8">
            <div className="bg-petroleo-800 rounded-lg border border-petroleo-700 shadow-lg p-6">
              <h2 className="text-xl font-bold text-white mb-6">Cadastrar Novo Membro da Equipe</h2>
              
              <form onSubmit={handleSaveStaff} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cinza-200 mb-2">Nome Completo</label>
                  <input 
                    type="text" 
                    required
                    value={staffFormName}
                    onChange={(e) => setStaffFormName(e.target.value)}
                    placeholder="Ex: João Barbeiro"
                    className="w-full px-4 py-2 bg-petroleo-900 border border-petroleo-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-petroleo-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cinza-200 mb-2">E-mail (Login)</label>
                  <input 
                    type="email" 
                    required
                    value={staffFormEmail}
                    onChange={(e) => setStaffFormEmail(e.target.value)}
                    placeholder="joao@salao.com"
                    className="w-full px-4 py-2 bg-petroleo-900 border border-petroleo-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-petroleo-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cinza-200 mb-2">Senha Provisória</label>
                  <input 
                    type="password" 
                    required
                    value={staffFormPassword}
                    onChange={(e) => setStaffFormPassword(e.target.value)}
                    placeholder="senha"
                    className="w-full px-4 py-2 bg-petroleo-900 border border-petroleo-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-petroleo-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cinza-200 mb-2">Nível de Acesso (Role)</label>
                  <select 
                    required
                    value={staffFormRole}
                    onChange={(e) => setStaffFormRole(e.target.value)}
                    className="w-full px-4 py-2 bg-petroleo-900 border border-petroleo-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-petroleo-700 cursor-pointer"
                  >
                    <option value="STAFF">STAFF (Realiza os serviços)</option>
                    <option value="ADMIN">ADMIN (Gerencia agenda e bloqueios)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-cinza-200 mb-1">Telefone</label>
                  <input 
                    type="text" 
                    value={staffFormPhone}
                    onChange={(e) => setStaffFormPhone(formatPhone(e.target.value))}
                    required
                    maxLength="15"
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-2 bg-petroleo-900 border border-petroleo-700 rounded-md text-white"
                  />
                </div>                
                
                <div className="md:col-span-2 mt-4">
                  <button 
                    type="submit"
                    className="bg-green-700 hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-md transition duration-200 shadow-md"
                  >
                    Cadastrar Usuário
                  </button>
                </div>
              </form>
              {/* Lista de Membros da Equipe */}
              <div className="bg-petroleo-800 rounded-lg border border-petroleo-700 shadow-lg overflow-hidden mt-8">
                <table className="w-full text-left text-sm text-cinza-200">
                  <thead className="bg-petroleo-900 text-cinza-400 border-b border-petroleo-700">
                    <tr>
                      <th className="px-6 py-4 font-medium">Nome</th>
                      <th className="px-6 py-4 font-medium">E-mail</th>
                      <th className="px-6 py-4 font-medium">Nível de Acesso</th>
                      <th className="px-6 py-4 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-petroleo-700">
                    {staffMembers.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-6 py-8 text-center text-cinza-400">Nenhum membro encontrado.</td>
                      </tr>
                    ) : (
                      staffMembers.map(member => (
                        <tr key={member.id} className="hover:bg-petroleo-700/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-white">{member.name}</td>
                          <td className="px-6 py-4">{member.email}</td>
                          <td className="px-6 py-4">
                            <select 
                              value={member.role}
                              onChange={(e) => handleChangeRole(member.id, member.name, e.target.value)}
                              disabled={member.id === user.id} // Impede o SuperAdmin de rebaixar a si mesmo acidentalmente
                              className="px-3 py-1.5 bg-petroleo-900 border border-petroleo-700 rounded-md text-white text-xs focus:outline-none focus:ring-2 focus:ring-petroleo-700 cursor-pointer disabled:opacity-50"
                            >
                              <option value="STAFF">STAFF</option>
                              <option value="ADMIN">ADMIN</option>
                              <option value="SUPERADMIN">SUPERADMIN</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => handleResetPassword(member.id, member.name)}
                              className="text-yellow-400 hover:text-yellow-300 font-semibold px-3 py-1 bg-yellow-900/30 border border-yellow-800 rounded-md transition-colors"
                            >
                              Gerar Senha
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}

export default Dashboard;