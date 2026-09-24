const db = require('../config/db');

module.exports = {
  // Cria um feriado ou outro bloqueio no calendário
  async create(req, res) {
    try {
      const { blocked_date, description, user_id } = req.body;

      const result = await db.query(
        'INSERT INTO holidays (blocked_date, description, user_id) VALUES ($1, $2, $3) RETURNING *',
        [blocked_date, description, user_id]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      // 23505 = UNIQUE constraint violation (data já bloqueada)
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Esta data já encontra-se bloqueada no sistema.' });
      }
      // 23503 = Foreign Key constraint violation (user_id não existe)
      if (error.code === '23503') {
         return res.status(400).json({ error: 'Usuário administrador (user_id) não encontrado.' });
      }
      
      console.error('Erro ao bloquear data:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Busca todas as datas bloqueadas
  async getAll(req, res) {
    try {
      const result = await db.query(`
        SELECT 
          h.*, 
          u.name AS creator_name 
        FROM holidays h
        LEFT JOIN users u ON h.user_id = u.id
        ORDER BY h.blocked_date ASC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Erro ao buscar datas bloqueadas:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Remove um feriado/bloqueio
  async delete(req, res) {
    try {
      const { id } = req.params;

      const result = await db.query('DELETE FROM holidays WHERE id = $1 RETURNING *', [id]);

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Bloqueio não encontrado.' });
      }

      res.json({ message: 'Data liberada com sucesso!', holiday: result.rows[0] });
    } catch (error) {
      console.error('Erro ao remover bloqueio:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};