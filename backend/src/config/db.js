const { Pool } = require('pg');
require('dotenv').config();

// Se estiver na nuvem, usará a variável única. Se for local, usará as variáveis granulares.
const pool = new Pool(
  process.env.DATABASE_URL 
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
      }
);

// Método query para usar diretamente nos controllers
module.exports = {
  query: (text, params) => pool.query(text, params),
};