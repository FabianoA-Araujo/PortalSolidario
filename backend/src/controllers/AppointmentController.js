const db = require('../config/db');

module.exports = {
  // Cria um novo agendamento com validação de regras de negócio
  async create(req, res) {
    try {
      const { client_id, service_id, scheduled_at } = req.body;
      
      // Validação de Dia e Horário
      const appointmentDate = new Date(scheduled_at);
      const dayOfWeek = appointmentDate.getDay(); // 0 = Domingo, 1 = Segunda...
      const hour = appointmentDate.getHours();

      if (dayOfWeek === 0) {
        return res.status(400).json({ error: 'Não realizamos atendimentos aos domingos.' });
      }
      if (hour < 9 || hour >= 16) {
        return res.status(400).json({ error: 'O horário de atendimento é das 09:00 às 16:00.' });
      }

      // Validação de Feriados/Dias Bloqueados
      const holidayCheck = await db.query(
        'SELECT id FROM holidays WHERE blocked_date = $1::date',
        [scheduled_at]
      );
      if (holidayCheck.rowCount > 0) {
        return res.status(400).json({ error: 'Esta data está bloqueada ou é feriado.' });
      }

      // Apenas 1 agendamento por dia, ignorando os com status CANCELED
      // Compara a data
      const existingAppointment = await db.query(
        "SELECT id FROM appointments WHERE scheduled_at::date = $1::date AND status != 'CANCELED'",
        [scheduled_at]
      );
      
      if (existingAppointment.rowCount > 0) {
        return res.status(400).json({ error: 'Já existe um agendamento solidário preenchido para este dia.' });
      }

      // Se for passou por todas as travas, insere no banco
      const result = await db.query(
        'INSERT INTO appointments (client_id, service_id, scheduled_at) VALUES ($1, $2, $3) RETURNING *',
        [client_id, service_id, scheduled_at]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Busca a agenda com JOIN para trazer os nomes e filtro de privacidade
  async getAll(req, res) {
    try {
      const { id, role } = req.user; 

      const query = `
        SELECT 
          a.id, 
          a.scheduled_at, 
          a.status,
          a.client_id,
          a.user_id,
          c.name AS client_name,
          c.phone AS client_phone,
          s.name AS service_name,
          s.duration_minutes
        FROM appointments a
        JOIN clients c ON a.client_id = c.id
        JOIN services s ON a.service_id = s.id
        ORDER BY a.scheduled_at ASC
      `;

      const result = await db.query(query);
      let dataToSend = result.rows;

      // 2. Filtro de Privacidade
      if (role === 'CLIENT') {
        dataToSend = result.rows.map(app => {
          // Se o agendamento não for deste cliente, limpa os dados sensíveis
          if (app.client_id !== id) {
            return {
              id: app.id,
              scheduled_at: app.scheduled_at,
              status: app.status
            };
          }
          // Se for dele, envia o objeto completo
          return app;
        });
      }

      res.json(dataToSend);
    } catch (error) {
      console.error('Erro ao buscar agenda:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Altera o status do agendamento
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body; 

      // Validação para aceitar apenas os status permitidos
      const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELED', 'COMPLETED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Status inválido.' });
      }

      const result = await db.query(
        'UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Agendamento não encontrado.' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Atribui o profissional/atendente ao agendamento
  async assignStaff(req, res) {
    try {
      const { id } = req.params;
      const { user_id } = req.body;

      // O PostgreSQL fará a validação automática se o user_id existe na tabela users
      // devido à chave estrangeira configurada no schema.sql
      const result = await db.query(
        'UPDATE appointments SET user_id = $1 WHERE id = $2 RETURNING *',
        [user_id, id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Agendamento não encontrado.' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      // 23503 = Foreign Key constraint violation (user_id não existe)
      if (error.code === '23503') {
        return res.status(400).json({ error: 'Profissional não encontrado no sistema.' });
      }
      console.error('Erro ao atribuir profissional:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};