/**
 * @file chat-service.js
 * @description Service layer per la comunicazione con il backend Node.js.
 */

const API_URL = "/api"; // Base URL per le nostre API

/**
 * Recupera la lista di tutte le conversazioni.
 * @returns {Promise<Array>} Un array di oggetti conversazione ({ id, title, created_at }).
 */
export const fetchConversations = async () => {
    try {
        const response = await fetch(`${API_URL}/conversations`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Errore HTTP: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Errore nel recupero delle conversazioni:", error);
        return [];
    }
};

/**
 * Recupera i messaggi per una conversazione specifica.
 * @param {number} conversationId - L'ID della conversazione.
 * @returns {Promise<Array>} Un array di oggetti messaggio ({ role, content, timestamp }).
 */
export const fetchMessages = async (conversationId) => {
    try {
        const response = await fetch(`${API_URL}/conversations/${conversationId}/messages`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Errore HTTP: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Errore nel recupero dei messaggi per la conversazione ${conversationId}:`, error);
        return [];
    }
};

/**
 * Elimina una conversazione specifica.
 * @param {number} conversationId - L'ID della conversazione da eliminare.
 * @returns {Promise<Object>} L'oggetto di risposta dal server.
 */
export const deleteConversation = async (conversationId) => {
    try {
        const response = await fetch(`${API_URL}/conversations/${conversationId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Errore HTTP: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Errore nell'eliminazione della conversazione ${conversationId}:`, error);
        throw error;
    }
};

/**
 * Aggiorna il titolo di una conversazione specifica.
 * @param {number} conversationId - L'ID della conversazione da aggiornare.
 * @param {string} newTitle - Il nuovo titolo per la conversazione.
 * @returns {Promise<Object>} L'oggetto di risposta dal server.
 */
export const updateConversationTitle = async (conversationId, newTitle) => {
    try {
        const response = await fetch(`${API_URL}/conversations/${conversationId}/title`, {
            method: 'PUT', // or PATCH, depending on backend implementation
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: newTitle })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Errore HTTP: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Errore nell'aggiornamento del titolo per la conversazione ${conversationId}:`, error);
        throw error;
    }
};

/**
 * Invia un messaggio al backend e ottiene la risposta del bot.
 * Gestisce sia la creazione di nuove conversazioni sia l'aggiunta a quelle esistenti.
 * 
 * @param {number | null} conversationId - L'ID della conversazione, o null se è una nuova chat.
 * @param {string} userMessage - Il messaggio dell'utente.
 * @returns {Promise<Object>} Un oggetto contenente { botMessage, conversationId }.
 */
export const getBotCompletion = async (conversationId, userMessage) => {
    console.log("Chat Service: Chiamo /api/chat/complete con:", { conversationId, userMessage });

    const requestBody = {
        conversationId: conversationId,
        userMessage: userMessage,
    };

    try {
        const response = await fetch(`${API_URL}/chat/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Errore HTTP: ${response.status}`);
        }

        if (!data.botMessage || !data.conversationId) {
            throw new Error("Risposta API non valida: mancano botMessage o conversationId.");
        }

        console.log("Chat Service: Risposta ottenuta:", data);
        return data; // Restituisce { botMessage, conversationId }

    } catch (error) {
        console.error("Errore in getBotCompletion:", error);
        throw error; // Rilancia l'errore per gestirlo nell'UI
    }
};