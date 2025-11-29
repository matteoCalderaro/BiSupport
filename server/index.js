// server/index.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const { initializeDatabase, getDb } = require('./database');

const app = express();
const port = process.env.PORT || 3000;

// --- Configurable Delay for Debugging ---
const DELAY_MS = process.env.DEBUG_API_DELAY ? parseInt(process.env.DEBUG_API_DELAY, 10) : 500; // Default to 3 seconds for visibility
// Helper function to introduce a delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
      const result = await db.query('SELECT id, title, created_at FROM conversations ORDER BY created_at DESC');
      const conversations = result.rows; // Directly use result.rows for PostgreSQL
      await delay(DELAY_MS);
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
      const result = await db.query('SELECT id, role, content, timestamp FROM messages WHERE conversation_id = $1 ORDER BY timestamp ASC', [id]);
      const messages = result.rows; // Directly use result.rows for PostgreSQL
      await delay(DELAY_MS);
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
      // Always use PostgreSQL query syntax and RETURNING id to count affected rows
      const result = await db.query('DELETE FROM conversations WHERE id = $1 RETURNING id', [id]);
      const changes = result.rows.length; // For PostgreSQL, result.rows.length tells how many rows were affected

      if (changes === 0) {
        await delay(DELAY_MS); // Apply delay before 404 response as well
        return res.status(404).json({ error: `Conversazione con ID ${id} non trovata.` });
      }

      await delay(DELAY_MS);
      res.status(200).json({ message: 'Conversazione eliminata con successo.' });
    } catch (error) {
      console.error(`Errore nell'eliminazione della conversazione ${id}:`, error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });

  // PUT /api/conversations/:id/title
  apiRouter.put('/conversations/:id/title', async (req, res) => {
    const { id } = req.params;
    const { title } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Il titolo è richiesto e deve essere una stringa non vuota.' });
    }

    try {
      // Always use PostgreSQL query syntax
      const result = await db.query('UPDATE conversations SET title = $1 WHERE id = $2', [title, id]);
      
      // Optional: Check if any row was actually updated (result.rowCount for pg)
      if (result.rowCount === 0) {
        await delay(DELAY_MS);
        return res.status(404).json({ error: `Conversazione con ID ${id} non trovata.` });
      }

      await delay(DELAY_MS); // <--- ADDED DELAY
      res.status(200).json({ message: 'Titolo conversazione aggiornato con successo.' });
    } catch (error) {
      console.error(`Errore nell'aggiornamento del titolo per la conversazione ${id}:`, error);
      res.status(500).json({ error: 'Errore interno del server durante l\'aggiornamento del titolo.' });
    }
  });

  // POST /api/chat/complete - Streaming
  apiRouter.post('/chat/complete', async (req, res) => {
    let { conversationId, userMessage } = req.body;
    if (!userMessage) {
      return res.status(400).json({ error: 'userMessage è richiesto.' });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: 'Chiave API Groq non configurata nel server.' });
    }

    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering

    let fullBotMessage = ''; // To store the complete message for database
    let newConversationCreated = false;

    try {
      if (!conversationId) {
        const title = userMessage.substring(0, 40) + (userMessage.length > 40 ? '...' : '');
        const result = await db.query('INSERT INTO conversations (title) VALUES ($1) RETURNING id', [title]);
        conversationId = result.rows[0].id;
        newConversationCreated = true;
      }

      // Save user message to database
      await db.query('INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)', [conversationId, 'user', userMessage]);

      // Fetch previous messages for context
      const resultMessages = await db.query('SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY timestamp ASC', [conversationId]);
      const messagesFromDb = resultMessages.rows;
      const groqMessages = messagesFromDb.map(msg => ({ role: msg.role, content: msg.content }));
      console.log(groqMessages)
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: groqMessages,
          stream: true, // IMPORTANT: Enable streaming
        }),
      });

      if (!groqResponse.ok) {
        throw new Error(`Errore dall'API di Groq: ${await groqResponse.text()}`);
      }

      const reader = groqResponse.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      // Send initial data for conversationId
      res.write(`event: conversationId\ndata: ${JSON.stringify(conversationId)}\n\n`);
      res.write(`event: newConversationCreated\ndata: ${JSON.stringify(newConversationCreated)}\n\n`);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true }); // Append new data to buffer
        const lines = buffer.split('\n'); // Split into lines

        // Keep the last, potentially incomplete, line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            if (data.trim() === '[DONE]') {
              break;
            }
            try {
              const parsedData = JSON.parse(data);
              const content = parsedData.choices[0]?.delta?.content || '';
              if (content) {
                fullBotMessage += content;
                // Send each content chunk as an SSE event
                res.write(`event: chunk\ndata: ${JSON.stringify({ content })}\n\n`);
              }
            } catch (parseError) {
              console.error('Errore nel parsing del chunk JSON di Groq:', parseError, 'Chunk:', data);
            }
          }
        }
      }

      // Process any remaining data in the buffer after the loop
      if (buffer.startsWith('data: ')) {
        const data = buffer.substring(6);
        if (data.trim() !== '[DONE]') {
           try {
              const parsedData = JSON.parse(data);
              const content = parsedData.choices[0]?.delta?.content || '';
              if (content) {
                fullBotMessage += content;
                res.write(`event: chunk\ndata: ${JSON.stringify({ content })}\n\n`);
              }
            } catch (parseError) {
              console.error('Errore nel parsing del chunk JSON di Groq (buffer finale):', parseError, 'Chunk:', data);
            }
        }
      }

      // Save complete bot message to database
      await db.query('INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)', [conversationId, 'assistant', fullBotMessage]);
    
    } catch (error) {
      console.error('Errore nello streaming di /api/chat/complete:', error);
      res.write(`event: error\ndata: ${JSON.stringify({ message: `Errore nell'endpoint /api/chat/complete: ${error.message}` })}\n\n`);
      res.status(500).end(); // End the response with an error
      return;
    }

    // Signal end of stream
    res.write(`event: end\ndata: ${JSON.stringify("stream completed")}\n\n`);
    res.end(); // Close the connection
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
  app.listen(port, '0.0.0.0', () => {
      console.log(`Server is running on http://0.0.0.0:${port}`);
  });
};

startServer(); // Chiamiamo la funzione per avviare il processo