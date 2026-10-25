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

  // Listar os usuários
  async getAll(req, res) {
    try {
      const result = await db.query('SELECT id, name, email, role, created_at FROM users ORDER BY name ASC');
      res.json(result.rows);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  //Alterar o nível de acesso (Role) do usuário
  async updateRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      // Validação para evitar roles inexistentes
      if (!['STAFF', 'ADMIN', 'SUPERADMIN'].includes(role)) {
        return res.status(400).json({ error: 'Nível de acesso inválido.' });
      }

      const result = await db.query(
        'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role',
        [role, id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Erro ao atualizar role:', error);
      res.status(500).json({ error: 'Erro interno do servidor.' });
    }
  },

  //Para usuários SuperAdmin resetar a senha por uma temporária que deve, obrigatoriamente, ser trocada no próximo acesso do usuário
  async resetPassword(req, res) {
    try {
      const { id } = req.params;
      
      // Define a senha provisória padrão
      const tempPassword = 'Mudar@123';
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const result = await db.query(
        'UPDATE users SET password = $1, must_change_password = true WHERE id = $2 RETURNING id, name, email',
        [hashedPassword, id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      // Retorna a senha provisória para o React exibir no alert do SuperAdmin
      res.json({ 
        message: 'Senha resetada com sucesso.', 
        tempPassword: tempPassword,
        user: result.rows[0]
      });
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      res.status(500).json({ error: 'Erro interno do servidor.' });
    }
  },

  // Usuário cadastra sua senha definitiva (Remove a trava)
  async updatePassword(req, res) {
    try {
      const userId = req.user.id; 
      const { newPassword } = req.body;

      const passwordRegex = /^(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,}$/;

      if (!newPassword || !passwordRegex.test(newPassword)) {
        return res.status(400).json({ 
          error: 'A senha deve ter no mínimo 6 caracteres, uma letra maiúscula e um caractere especial (ex: @, #, !).' 
        });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await db.query(
        'UPDATE users SET password = $1, must_change_password = false WHERE id = $2',
        [hashedPassword, userId]
      );

      res.json({ message: 'Senha atualizada com sucesso.' });
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      res.status(500).json({ error: 'Erro interno do servidor.' });
    }
  }  
};