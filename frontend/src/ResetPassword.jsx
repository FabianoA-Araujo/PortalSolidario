import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function ResetPassword() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('@PortalSolidario:user')) || {};
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validação no frontend
    if (newPassword !== confirmPassword) {
      return setError('As senhas não coincidem.');
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,}$/;
    if (!passwordRegex.test(newPassword)) {
      return setError('A senha deve ter no mínimo 6 caracteres, incluindo pelo menos uma letra maiúscula e um caractere especial (ex: @, #, !).');
    }

    try {
      const token = localStorage.getItem('@PortalSolidario:token');
      const API_URL = import.meta.env.VITE_API_URL;
      
      // Define a rota correta baseada no tipo de usuário
      const endpoint = user.role ? '/users/update-password' : '/clients/update-password';

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });

      if (response.ok) {
        // Atualiza o localStorage para refletir que a trava foi tirada
        const updatedUser = { ...user, must_change_password: false };
        localStorage.setItem('@PortalSolidario:user', JSON.stringify(updatedUser));
        
        alert('Senha atualizada com sucesso! Bem-vindo(a).');
        navigate('/dashboard');
      } else {
        const data = await response.json();
        setError(data.error || 'Erro ao atualizar a senha.');
      }
    } catch (error) {
      console.error('Erro:', error);
      setError('Erro de conexão com o servidor.');
    }
  };

  return (
    <div className="min-h-screen bg-petroleo-900 flex items-center justify-center p-4">
      <div className="bg-petroleo-800 p-8 rounded-lg shadow-lg border border-petroleo-700 w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-2">Redefinição Obrigatória</h2>
        <p className="text-cinza-400 mb-6 text-sm">
          Por questões de segurança, você precisa cadastrar uma nova senha definitiva para acessar o sistema.
        </p>

        {error && (
          <div className="bg-red-900/50 border border-red-800 text-red-200 p-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-cinza-200 mb-2">Nova Senha</label>
            <input 
              type="password" 
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 bg-petroleo-900 border border-petroleo-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-petroleo-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-cinza-200 mb-2">Confirmar Nova Senha</label>
            <input 
              type="password" 
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 bg-petroleo-900 border border-petroleo-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-petroleo-700"
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-green-700 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-md transition duration-200 shadow-md mt-4"
          >
            Salvar e Acessar
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;