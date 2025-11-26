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

