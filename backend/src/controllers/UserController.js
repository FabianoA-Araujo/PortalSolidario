const db = require('../config/db');
const bcrypt = require('bcrypt');

module.exports = {
  async create(req, res) {
    try {
      const { name, email, password, role } = req.body;

      // Criptografa a senha do administrador/staff
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Insere no banco e retorna os dados sem a senha
      const result = await db.query(
        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
        [name, email, hashedPassword, role]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Este e-mail já está cadastrado para um usuário da equipe.' });
      }
      console.error('Erro ao criar usuário:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  async getAll(req, res) {
    try {
      const result = await db.query('SELECT id, name, email, role, created_at FROM users ORDER BY name ASC');
      res.json(result.rows);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};