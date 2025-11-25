// netlify/functions/chat.js

// Importiamo 'node-fetch' se necessario, ma Netlify fornisce un 'fetch' globale.
// Per compatibilità locale, potremmo dover installare 'node-fetch'.
// Per ora, assumiamo che 'fetch' sia disponibile come nelle versioni recenti di Node.

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

exports.handler = async (event, context) => {
  // Definiamo gli header CORS che verranno usati in tutte le risposte
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Permette a qualsiasi origine di accedere. Per maggiore sicurezza in produzione, si potrebbe limitare a un dominio specifico.
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Il browser invia una richiesta 'OPTIONS' (preflight) prima della POST per verificare i permessi CORS.
  // Dobbiamo rispondere con successo a questa richiesta.
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204, // No Content
      headers: corsHeaders,
      body: '',
    };
  }

  // 1. Controlla che la richiesta sia un POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      body: 'Method Not Allowed',
    };
  }

  // 2. Recupera la chiave API dalle variabili d'ambiente sicure di Netlify
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'La chiave API di Groq non è configurata sul server.' }),
    };
  }

  try {
    // 3. Estrae il corpo della richiesta inviata dal nostro frontend
    const requestBody = JSON.parse(event.body);
    const userMessage = requestBody.message;
    const model = requestBody.model || 'llama3-8b-8192'; // Usa un default se non specificato

    if (!userMessage) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Il messaggio dell\'utente è mancante.' }),
      };
    }

    // 4. Prepara e invia la richiesta a Groq
    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      return {
        statusCode: groqResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Errore dall'API di Groq: ${errorText}` }),
      };
    }

    const groqData = await groqResponse.json();

    // 5. Restituisce la risposta al frontend
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(groqData),
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: `Errore interno del server: ${error.message}` }),
    };
  }
};
