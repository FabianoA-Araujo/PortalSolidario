const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

module.exports = {
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Procura na tabela da Equipe
      let userQuery = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      let isClient = false;

      // Se não achou na equipe, procura na tabela de Clientes
      if (userQuery.rowCount === 0) {
        userQuery = await db.query('SELECT * FROM clients WHERE email = $1', [email]);
        isClient = true;
      }

      // Se não encontrou, o e-mail é porque não existe no sistema
      if (userQuery.rowCount === 0) {
        return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      }

      const account = userQuery.rows[0];

      // Compara a senha enviada com a senha criptografada do banco
      const validPassword = await bcrypt.compare(password, account.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      }

      // Define a Role. Se for cliente, forçamos 'CLIENT' para o React saber
      const role = isClient ? 'CLIENT' : account.role;

      // Gera o Token JWT assinado com a nossa chave secreta
      const token = jwt.sign(
        { id: account.id, role: role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' } // O token expira em 1 dia
      );

      // Devolve o token e os dados básicos (escondendo a senha)
      res.json({
        message: 'Login realizado com sucesso!',
        token,
        user: {
          id: account.id,
          name: account.name,
          email: account.email,
          role: role,
          must_change_password: account.must_change_password
        }
      });

    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};