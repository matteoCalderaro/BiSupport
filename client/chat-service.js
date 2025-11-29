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
 * Invia un messaggio al backend e gestisce la risposta del bot in streaming.
 * Gestisce sia la creazione di nuove conversazioni sia l'aggiunta a quelle esistenti.
 *
 * @param {number | null} conversationId - L'ID della conversazione, o null se è una nuova chat.
 * @param {string} userMessage - Il messaggio dell'utente.
 * @param {object} callbacks - Oggetto contenente le funzioni di callback per i vari eventi dello stream.
 * @param {function(string): void} callbacks.onChunk - Chiamata per ogni pezzo di testo ricevuto.
 * @param {function(number): void} callbacks.onConversationId - Chiamata quando l'ID della conversazione è disponibile.
 * @param {function(boolean): void} callbacks.onNewConversationCreated - Chiamata per indicare se è stata creata una nuova conversazione.
 * @param {function(): void} callbacks.onComplete - Chiamata al termine dello stream.
 * @param {function(Error): void} callbacks.onError - Chiamata in caso di errore.
 */
export const streamBotCompletion = async (conversationId, userMessage, callbacks) => {
    const { onChunk, onConversationId, onNewConversationCreated, onComplete, onError } = callbacks;

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

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Errore HTTP: ${response.status} - ${errorText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                // If there's any remaining data in the buffer, process it.
                if (buffer.trim()) {
                    console.warn("Dati residui nel buffer SSE alla fine dello stream:", buffer);
                }
                break;
            }

            buffer += decoder.decode(value, { stream: true });

            let eventEndIndex;
            while ((eventEndIndex = buffer.indexOf('\n\n')) !== -1) {
                const eventString = buffer.substring(0, eventEndIndex);
                buffer = buffer.substring(eventEndIndex + 2);

                let eventType = 'message';
                let data = '';

                for (const line of eventString.split('\n')) {
                    if (line.startsWith('event: ')) {
                        eventType = line.substring(7);
                    } else if (line.startsWith('data: ')) {
                        data = line.substring(6);
                    }
                }

                if (data) {
                    try {
                        const parsedData = JSON.parse(data);
                        switch (eventType) {
                            case 'conversationId':
                                onConversationId?.(parsedData);
                                break;
                            case 'newConversationCreated':
                                onNewConversationCreated?.(parsedData);
                                break;
                            case 'chunk':
                                if (parsedData.content) {
                                    onChunk?.(parsedData.content);
                                }
                                break;
                            case 'error':
                                if (parsedData.message) {
                                    onError?.(new Error(parsedData.message));
                                }
                                break;
                            case 'end':
                                onComplete?.();
                                return; // End of stream signaled by server
                        }
                    } catch (e) {
                        console.error('Errore nel parsing dei dati SSE:', e, 'Dati:', data);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Errore in streamBotCompletion:", error);
        onError?.(error);
    } finally {
        onComplete?.(); // Ensure onComplete is called even if stream breaks unexpectedly
    }
};