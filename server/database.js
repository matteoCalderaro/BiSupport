// server/database.js
const Database = require('better-sqlite3'); // Per SQLite in sviluppo
const { Pool } = require('pg'); // Per PostgreSQL in produzione
const path = require('path');

let db;

async function initializeDatabase() { // Funzione resa async
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Inizializzazione PostgreSQL
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error("DATABASE_URL non è configurata per l'ambiente di produzione.");
      process.exit(1);
    }
    db = new Pool({
      connectionString: connectionString,
      ssl: {
        rejectUnauthorized: false // Accetta certificati auto-firmati per Render (da verificare in base alla configurazione Render)
      }
    });
    console.log('Database: Connesso a PostgreSQL (produzione)');
  } else {
    // Inizializzazione SQLite
    const dbPath = path.join(__dirname, 'dev.db');
    db = new Database(dbPath);
    console.log(`Database: Connesso a SQLite in ${dbPath} (sviluppo)`);
  }

  // Creazione delle tabelle (se non esistono)
  await createTables(db, isProduction); // await qui
}

async function createTables(databaseInstance, isProduction) { // Funzione resa async
  let createConversationsTableSQL;
  let createMessagesTableSQL;

  if (isProduction) {
    // PostgreSQL
    createConversationsTableSQL = `
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    createMessagesTableSQL = `
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );
    `;
  } else {
    // SQLite
    createConversationsTableSQL = `
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
    createMessagesTableSQL = `
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );
    `;
  }

  try {
    if (isProduction) {
      await databaseInstance.query(createConversationsTableSQL); // await qui
      await databaseInstance.query(createMessagesTableSQL);      // await qui
    } else {
      databaseInstance.exec(createConversationsTableSQL);
      databaseInstance.exec(createMessagesTableSQL);
    }
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