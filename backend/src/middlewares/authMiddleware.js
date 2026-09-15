const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // O token é enviado no cabeçalho (Header) "Authorization"
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido. Acesso negado.' });
  }

  // O padrão é vir como "Bearer <token>".
  const [, token] = authHeader.split(' ');

  try {
    // Tenta decodificar o token usando a mesma chave secreta do login
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Se deu certo, segura os dados do usuário na requisição (req). Assim o Controller saberá exatamente quem está logado.
    
    req.user = decoded;

    // next() manda a requisição seguir em frente para o Controller
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};