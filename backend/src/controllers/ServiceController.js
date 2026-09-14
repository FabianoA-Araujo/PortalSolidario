const db = require('../config/db');

module.exports = {
  // Cria um novo serviço no banco
  async create(req, res) {
    try {
      // Pega os dados que vieram no corpo da requisição
      const { name, description, duration_minutes } = req.body;
      
      // Executa o SQL
      const result = await db.query(
        'INSERT INTO services (name, description, duration_minutes) VALUES ($1, $2, $3) RETURNING *',
        [name, description, duration_minutes]
      );

      // Devolve o serviço criado com status 201 (Created)
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Erro ao criar serviço:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Busca todos os serviços
  async getAll(req, res) {
    try {
      const result = await db.query('SELECT * FROM services ORDER BY name ASC');
      res.json(result.rows);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Atualiza um serviço existente
  async update(req, res) {
    try {
      const { id } = req.params; // Pega o ID que vem na URL
      const { name, description, duration_minutes } = req.body;

      const result = await db.query(
        'UPDATE services SET name = $1, description = $2, duration_minutes = $3 WHERE id = $4 RETURNING *',
        [name, description, duration_minutes, id]
      );

      // Se o banco não retornou nenhuma linha, o ID não existe
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Serviço não encontrado' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Erro ao atualizar serviço:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

};