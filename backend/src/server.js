const express = require('express');
const cors = require('cors');
const db = require('./config/db');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3333;

// Rota de teste do banco de dados
app.get('/ping-db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() AS data_atual');
    res.json({ 
      status: 'Sucesso', 
      message: 'Conexão com o PostgreSQL estabelecida!', 
      banco_respondeu: result.rows[0].data_atual 
    });
  } catch (error) {
    console.error('Erro de conexão:', error);
    res.status(500).json({ error: 'Falha ao conectar no banco de dados' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor da API Solidária rodando na porta ${PORT}`);
});