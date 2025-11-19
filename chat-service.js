/**
 * @file chat-service.js
 * @description Service layer per la comunicazione con la nostra funzione serverless.
 */

const API_URL = "/.netlify/functions/chat"; // Endpoint della nostra funzione Netlify
const MODEL_ID = "llama-3.1-8b-instant"; // Modello che vogliamo usare

/**
 * Recupera la risposta del bot chiamando la nostra funzione serverless.
 * 
 * @param {string} userMessage - Il messaggio dell'utente.
 * @returns {Promise<string>} Il testo della risposta del bot.
 */
export const getBotResponse = async (userMessage) => {
    console.log("Chat Service: Chiamo la funzione serverless con il messaggio:", userMessage);

    const requestBody = {
        message: userMessage,
        model: MODEL_ID,
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            // Se la risposta non è ok, l'errore sarà nel corpo della risposta JSON
            throw new Error(data.error || `Errore HTTP: ${response.status}`);
        }
        
        const botMessage = data.choices[0]?.message?.content;

        if (!botMessage) {
            throw new Error("Struttura della risposta API non valida o inattesa.");
        }

        console.log("Chat Service: Risposta ottenuta dalla funzione:", botMessage);
        return botMessage;

    } catch (error) {
        console.error("Errore nel Chat Service:", error);
        return `Spiacente, si è verificato un errore: ${error.message}`;
    }
};
