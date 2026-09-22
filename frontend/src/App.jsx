import { useState } from 'react';

function App() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    // Div principal centralizando o conteúdo vertical e horizontalmente
    <div className="flex items-center justify-center min-h-screen px-4">
      
      {/* Card */}
      <div className="w-full max-w-md bg-petroleo-800 rounded-lg shadow-2xl p-8 border border-petroleo-700">
        
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Portal Solidário</h1>
          <p className="text-cinza-400">
            {isLogin ? 'Faça login para acessar a agenda' : 'Crie sua conta para participar'}
          </p>
        </div>

        {/* Formulário Base */}
        <form className="space-y-5">
          
          {/* Campo Nome (Aparece apenas no Cadastro) */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-cinza-200 mb-1">Nome Completo</label>
              <input 
                type="text" 
                placeholder="Seu nome"
                className="w-full px-4 py-2 bg-petroleo-900 border border-petroleo-700 rounded-md text-white placeholder-cinza-400 focus:outline-none focus:ring-2 focus:ring-petroleo-700"
              />
            </div>
          )}

          {/* Campo Email */}
          <div>
            <label className="block text-sm font-medium text-cinza-200 mb-1">Email</label>
            <input 
              type="email" 
              placeholder="seu@email.com"
              className="w-full px-4 py-2 bg-petroleo-900 border border-petroleo-700 rounded-md text-white placeholder-cinza-400 focus:outline-none focus:ring-2 focus:ring-petroleo-700"
            />
          </div>

          {/* Campo Senha */}
          <div>
            <label className="block text-sm font-medium text-cinza-200 mb-1">Senha</label>
            <input 
              type="password" 
              placeholder="*********"
              className="w-full px-4 py-2 bg-petroleo-900 border border-petroleo-700 rounded-md text-white placeholder-cinza-400 focus:outline-none focus:ring-2 focus:ring-petroleo-700"
            />
          </div>

          {/* Botão de Ação */}
          <button 
            type="submit"
            className="w-full bg-petroleo-700 hover:bg-petroleo-900 border border-petroleo-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200"
          >
            {isLogin ? 'Entrar no Sistema' : 'Cadastrar'}
          </button>
        </form>

        {/* Alternância entre Login e Cadastro */}
        <div className="mt-6 text-center text-sm">
          <span className="text-cinza-400">
            {isLogin ? 'Ainda não tem uma conta? ' : 'Já possui uma conta? '}
          </span>
          <button 
            onClick={() => setIsLogin(!isLogin)}
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