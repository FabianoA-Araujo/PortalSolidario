const db = require('../config/db');
const bcrypt = require('bcrypt');

module.exports = {
  // Cria um novo cliente
  async create(req, res) {
    try {
      const { name, email, phone, password } = req.body;

      //Gera aleatoriedade e criptografa a senha
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Salva no banco com a senha criptografada e retorna os dados seguros
      const result = await db.query(
        'INSERT INTO clients (name, email, phone, password) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone, created_at',
        [name, email, phone, hashedPassword]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      // O código 23505 é o erro padrão do PostgreSQL para violação de UNIQUE
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
      }
      console.error('Erro ao criar cliente:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Busca todos os clientes
  async getAll(req, res) {
    try {
      // Não retornar a coluna com a senha
      const result = await db.query('SELECT id, name, email, phone, created_at FROM clients ORDER BY name ASC');
      res.json(result.rows);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};