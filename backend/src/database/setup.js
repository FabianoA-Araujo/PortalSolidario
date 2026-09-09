const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function setupDatabase() {
  try {
    console.log('Lendo o arquivo schema.sql...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executando as queries no banco de dados...');
    await db.query(schema);
    
    console.log('Tabelas criadas com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao criar tabelas:', error);
    process.exit(1);
  }
}

setupDatabase();