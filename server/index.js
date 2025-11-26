// server/index.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const { initializeDatabase, getDb } = require('./database');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Funzione asincrona per avviare il server dopo l'inizializzazione del DB
const startServer = async () => {
  await initializeDatabase(); // Attendiamo l'inizializzazione del DB
  const db = getDb(); // Otteniamo l'istanza del database QUI, dopo l'inizializzazione

  // --- API Router --- (Definito e usato QUI, dopo aver ottenuto db)
  const apiRouter = express.Router(); 

  // GET /api/conversations
  apiRouter.get('/conversations', async (req, res) => {
    try {
      let conversations;
      if (process.env.NODE_ENV === 'production') {
        const result = await db.query('SELECT id, title, created_at FROM conversations ORDER BY created_at DESC');
        conversations = result.rows;
      } else {
        conversations = db.prepare('SELECT id, title, created_at FROM conversations ORDER BY created_at DESC').all();
      }
      res.json(conversations);
    } catch (error) {
      console.error('Errore nel recupero delle conversazioni:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // GET /api/conversations/:id/messages
  apiRouter.get('/conversations/:id/messages', async (req, res) => {
    const { id } = req.params;
    try {
      let messages;
      if (process.env.NODE_ENV === 'production') {
        const result = await db.query('SELECT id, role, content, timestamp FROM messages WHERE conversation_id = $1 ORDER BY timestamp ASC', [id]);
        messages = result.rows;
      } else {
        messages = db.prepare('SELECT id, role, content, timestamp FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC').all(id);
      }
      res.json(messages);
    } catch (error) {
      console.error(`Errore nel recupero dei messaggi per la conversazione ${id}:`, error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // DELETE /api/conversations/:id
  apiRouter.delete('/conversations/:id', async (req, res) => {
    const { id } = req.params;
    try {
      if (process.env.NODE_ENV === 'production') {
        await db.query('DELETE FROM conversations WHERE id = $1', [id]);
      } else {
        db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
      }
      res.status(200).json({ message: 'Conversazione eliminata con successo.' });
    } catch (error) {
      console.error(`Errore nell'eliminazione della conversazione ${id}:`, error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // POST /api/chat/complete
  apiRouter.post('/chat/complete', async (req, res) => {
      let { conversationId, userMessage } = req.body;
      if (!userMessage) { return res.status(400).json({ error: 'userMessage è richiesto.' }); }
      
      const GROQ_API_KEY = process.env.GROQ_API_KEY;
      if (!GROQ_API_KEY) { return res.status(500).json({ error: 'Chiave API Groq non configurata nel server.' }); }

      try {
          if (!conversationId) {
              const title = userMessage.substring(0, 40) + (userMessage.length > 40 ? '...' : '');
              if (process.env.NODE_ENV === 'production') {
                  const result = await db.query('INSERT INTO conversations (title) VALUES ($1) RETURNING id', [title]);
                  conversationId = result.rows[0].id;
              } else {
                  const info = db.prepare('INSERT INTO conversations (title) VALUES (?)').run(title);
                  conversationId = info.lastInsertRowid;
              }
          }

          if (process.env.NODE_ENV === 'production') {
              await db.query('INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)', [conversationId, 'user', userMessage]);
          } else {
              db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)').run(conversationId, 'user', userMessage);
          }
    
          let messagesFromDb;
          if (process.env.NODE_ENV === 'production') {
              const result = await db.query('SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY timestamp ASC', [conversationId]);
              messagesFromDb = result.rows;
          } else {
              messagesFromDb = db.prepare('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC').all(conversationId);
          }
    
          const groqMessages = messagesFromDb.map(msg => ({ role: msg.role, content: msg.content }));
    
          const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: groqMessages }),
          });
    
          if (!groqResponse.ok) { throw new Error(`Errore dall'API di Groq: ${await groqResponse.text()}`); }
          const groqData = await groqResponse.json();
          const botMessage = groqData.choices[0]?.message?.content;
          if (!botMessage) { throw new Error("Struttura della risposta API di Groq non valida."); }
    
          if (process.env.NODE_ENV === 'production') {
              await db.query('INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)', [conversationId, 'assistant', botMessage]);
          } else {
              db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)').run(conversationId, 'assistant', botMessage);
          }
    
          res.json({ botMessage: botMessage, conversationId: conversationId });
    
      } catch (error) {
          console.error('Errore in /api/chat/complete:', error);
          res.status(500).json({ error: `Errore nell'endpoint /api/chat/complete: ${error.message}` });
      }
  });

  // Monta il router API sotto il prefisso /api
  app.use('/api', apiRouter);

  // Serve i file statici del frontend DOPO le API
  app.use(express.static(path.join(__dirname, '..', 'client')));
    
  // La rotta catch-all per l'app frontend DEVE essere l'ULTIMA
  app.get(/^(?!\/api).*/, (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
  });

  // Avvia il server
  app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
  });
};

startServer(); // Chiamiamo la funzione per avviare il processo