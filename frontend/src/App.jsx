import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function App() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  
  // States para armazenar os dados do formulário
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // States para a recuperação de senha
  const [adminContacts, setAdminContacts] = useState([]);
  const [showContacts, setShowContacts] = useState(false);
  
  // States de sucesso ou erro
  const [feedback, setFeedback] = useState({ message: '', isError: false });

  // Função para formatar o telefone no padrão (XX) XXXXX-XXXX
  const formatPhone = (value) => {
    if (!value) return '';
    // Remove tudo que não for número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara gradativamente enquanto o usuário digita
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  //Função disparada ao clicar no botão de submit
  const handleSubmit = async (e) => {
    e.preventDefault(); // Evita que a página recarregue
    setFeedback({ message: '', isError: false }); // Limpa avisos anteriores

    // Apontando para API no Render quando estiver em produção
    //const API_URL = 'https://portalsolidario.onrender.com/api';

    // Aponta local para API Docker quando estiver em homologação
    const API_URL = import.meta.env.VITE_API_URL;

    try {
      if (!isLogin) {
        // --- FLUXO DE CADASTRO ---
        const response = await fetch(`${API_URL}/clients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, phone })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao realizar o cadastro.');
        }

        // Sucesso: Avisa o usuário, limpa a senha e volta para a tela de login
        setFeedback({ message: 'Conta criada com sucesso! Faça login.', isError: false });
        setIsLogin(true);
        setPassword('');
        setPhone('');
        
      } else {
        // --- FLUXO DE LOGIN ---
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao realizar login. Verifique suas credenciais.');
        }

        // Salva o token e os dados do usuário no navegador
        localStorage.setItem('@PortalSolidario:token', data.token);
        localStorage.setItem('@PortalSolidario:user', JSON.stringify(data.user));

        setFeedback({ message: 'Login realizado com sucesso!', isError: false });
        
      // Logs de sucesso
        console.log('Token recebido e salvo:', data.token);
        console.log('Dados do usuário:', data.user);

        // --- TRAVA DE SEGURANÇA: Intercepta se precisar mudar a senha ---
        if (data.user.must_change_password) {
          navigate('/definir-senha');
        } else {
          // Redireciona para o dashboard normalmente se não tiver trava
          navigate('/dashboard');
        }
      }
    } catch (error) {
      setFeedback({ message: error.message, isError: true });
    }
  };

  // Função para buscar e exibir os contatos
    const handleForgotPassword = async () => {
    if (showContacts) {
      setShowContacts(false);
      return;
    }
    
    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API_URL}/users/contacts`); 
      
      if (response.ok) {
        const data = await response.json();
        setAdminContacts(data);
        setShowContacts(true);
      }
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md bg-petroleo-800 rounded-lg shadow-2xl p-8 border border-petroleo-700">
        
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Portal Solidário</h1>
          <p className="text-cinza-400">
            {isLogin ? 'Faça login para acessar a agenda' : 'Crie sua conta para participar'}
          </p>
        </div>

        {/* Exibe as mensagens de erro ou sucesso na tela */}
        {feedback.message && (
          <div className={`mb-4 p-3 rounded text-sm text-center font-medium ${
            feedback.isError ? 'bg-red-900/50 text-red-200 border border-red-800' : 'bg-green-900/50 text-green-200 border border-green-800'
          }`}>
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-cinza-200 mb-1">Nome Completo</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin} // Torna obrigatório apenas no cadastro
                placeholder="Seu nome"
                className="w-full px-4 py-2 bg-petroleo-900 border border-petroleo-700 rounded-md text-white placeholder-cinza-400 focus:outline-none focus:ring-2 focus:ring-petroleo-700"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-cinza-200 mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
              className="w-full px-4 py-2 bg-petroleo-900 border border-petroleo-700 rounded-md text-white placeholder-cinza-400 focus:outline-none focus:ring-2 focus:ring-petroleo-700"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-cinza-200 mb-1">Telefone</label>
              <input 
                type="text" 
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                maxLength="15"
                required={!isLogin}
                placeholder="(00) 00000-0000"
                className="w-full px-4 py-2 bg-petroleo-900 border border-petroleo-700 rounded-md text-white placeholder-cinza-400 focus:outline-none focus:ring-2 focus:ring-petroleo-700"
              />
            </div>
          )}          

<div>
            <label className="block text-sm font-medium text-cinza-200 mb-1">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="3"
              placeholder="*******"
              className="w-full px-4 py-2 bg-petroleo-900 border border-petroleo-700 rounded-md text-white placeholder-cinza-400 focus:outline-none focus:ring-2 focus:ring-petroleo-700"
            />
            
            {/* NOVO: Botão Esqueceu a Senha */}
            {isLogin && (
              <div className="text-right mt-1">
                <button 
                  type="button" 
                  onClick={handleForgotPassword}
                  className="text-xs text-cinza-400 hover:text-white transition-colors"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}
          </div>

          <button 
            type="submit"
            className="w-full bg-petroleo-700 hover:bg-petroleo-900 border border-petroleo-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200"
          >
            {isLogin ? 'Entrar no Sistema' : 'Cadastrar'}
          </button>
        </form>

        {/* NOVO: Caixa de exibição dos contatos FICA FORA DO FORMULÁRIO */}
        {showContacts && isLogin && (
          <div className="mt-4 p-4 bg-petroleo-900 border border-petroleo-700 rounded-md text-sm text-center">
            <p className="text-cinza-300 mb-3">
              Para redefinir sua senha, entre em contato com a administração:
            </p>
            <div className="space-y-2">
              {adminContacts.length > 0 ? (
                adminContacts.map((admin, index) => (
                  <div key={index} className="text-white font-medium bg-petroleo-800 py-2 px-3 rounded border border-petroleo-700">
                    {admin.name} <br/>
                    <span className="text-cinza-400 text-xs">{admin.email}</span>
                    <span className="text-cinza-400 text-xs ml-3">{admin.phone}</span>
                  </div>
                ))
              ) : (
                <p className="text-red-400">Nenhum administrador encontrado.</p>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-sm">
          <span className="text-cinza-400">
            {isLogin ? 'Ainda não tem uma conta? ' : 'Já possui uma conta? '}
          </span>
          <button 
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setFeedback({ message: '', isError: false }); // Limpa erros ao trocar de tela
            }}
            className="text-white hover:underline font-medium"
          >
            {isLogin ? 'Cadastre-se aqui' : 'Faça login'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default App;