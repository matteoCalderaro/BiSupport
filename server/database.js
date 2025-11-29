// server/database.js
const { Pool } = require('pg'); // Per PostgreSQL in produzione

let db;

async function initializeDatabase() {
  // Inizializzazione PostgreSQL (sempre)
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL non è configurata. Impossibile connettersi a PostgreSQL.");
    process.exit(1);
  }
  const config = {
    connectionString: connectionString,
  };

  // Only enable SSL if not connecting to localhost
  if (connectionString.includes('localhost') || connectionString.includes('127.0.0.1')) {
    config.ssl = false; // Disable SSL for local connections
    console.log('Database: Connessione locale a PostgreSQL senza SSL.');
  } else {
    config.ssl = {
      rejectUnauthorized: false // Accetta certificati auto-firmati per Render (o altri hosting)
    };
    console.log('Database: Connesso a PostgreSQL con SSL.');
  }
  db = new Pool(config); // Use the prepared config

  // Creazione delle tabelle (se non esistono)
  await createTables(db);
}

async function createTables(databaseInstance) {
  const createConversationsTableSQL = `
    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  const createMessagesTableSQL = `
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `;

  try {
    await databaseInstance.query(createConversationsTableSQL);
    await databaseInstance.query(createMessagesTableSQL);
    console.log('Database: Tabelle create o già esistenti.');
  } catch (error) {
    console.error('Database: Errore durante la creazione delle tabelle:', error);
    process.exit(1);
  }
}

function getDb() {
  if (!db) {
    throw new Error('Database non inizializzato. Chiamare initializeDatabase() prima.');
  }
  return db;
}

module.exports = {
  initializeDatabase,
  getDb
};