/**
 * @file chat-ui.js
 * @description Gestisce l'interfaccia utente della chat, gli eventi e il rendering dei messaggi, inclusa la cronologia.
 */

import { getBotCompletion, fetchConversations, fetchMessages, deleteConversation } from './chat-service.js';

// --- App State ---
const AppState = {
    conversations: [], // [{ id, title, created_at }]
    activeConversationId: null,
    activeMessages: [], // [{ role, content, timestamp }]
    isLoading: false,
};

// --- Cache degli elementi DOM ---
const DOM = {};

const cacheDOMElements = () => {
    DOM.chatCard = document.querySelector('#chat_card');
    if (!DOM.chatCard) return false;
    DOM.messagesContainer = DOM.chatCard.querySelector('#chat_messages');
    DOM.textarea = DOM.chatCard.querySelector('[data-kt-element="input"]');
    DOM.sendButton = DOM.chatCard.querySelector('[data-kt-element="send"]');
    DOM.newChatButton = document.querySelector('#new_chat_button');
    DOM.conversationsList = document.querySelector('#conversations_list');
    return true;
};

// --- Funzioni di Rendering ---
const renderConversationsList = () => {
    if (!DOM.conversationsList) return;
    DOM.conversationsList.innerHTML = ''; 

    if (AppState.conversations.length === 0) {
        DOM.conversationsList.innerHTML = '<div class="text-muted text-center mt-3 p-2">Nessuna conversazione.</div>';
        return;
    }

    AppState.conversations.forEach(conv => {
        const item = document.createElement('div');
        item.className = 'd-flex justify-content-between align-items-center p-3 mb-2 rounded conversation-item';
        item.dataset.conversationId = conv.id;
        
        if (conv.id === AppState.activeConversationId) {
            item.classList.add('bg-primary', 'text-white');
        } else {
            item.classList.add('bg-light', 'bg-hover-primary-light');
            item.style.cursor = 'pointer';
        }

        const titleContainer = document.createElement('div');
        titleContainer.className = 'flex-grow-1 text-truncate';
        titleContainer.innerHTML = `
            <div class="fw-bold text-truncate">${conv.title}</div>
            <div class="fs-7 ${conv.id === AppState.activeConversationId ? 'text-white-50' : 'text-muted'}">${new Date(conv.created_at).toLocaleDateString()}</div>
        `;
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-sm btn-icon btn-flush';
        deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
        deleteButton.title = 'Elimina conversazione';
        
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Impedisce che venga selezionata la conversazione
            handleDeleteConversation(conv.id);
        });

        item.addEventListener('click', () => {
            if (conv.id !== AppState.activeConversationId) {
                selectConversation(conv.id);
            }
        });

        item.appendChild(titleContainer);
        item.appendChild(deleteButton);
        DOM.conversationsList.appendChild(item);
    });
};

const renderMessages = () => {
    if (!DOM.messagesContainer) return;
    DOM.messagesContainer.innerHTML = '';

    if (AppState.activeMessages.length === 0 && AppState.activeConversationId === null) {
        const welcomeMessage = "Ciao, sono il tuo consulente BI. Come posso aiutarti?";
        DOM.messagesContainer.innerHTML = createIncomingMessageHTML(welcomeMessage);
    } else {
        AppState.activeMessages.forEach(msg => {
            const html = msg.role === 'user' ? createOutgoingMessageHTML(msg.content) : createIncomingMessageHTML(msg.content);
            DOM.messagesContainer.insertAdjacentHTML('beforeend', html);
        });
    }
    DOM.messagesContainer.scrollTop = DOM.messagesContainer.scrollHeight;
};

const setLoadingState = (isLoading) => {
    AppState.isLoading = isLoading;
    if (DOM.sendButton) {
        DOM.sendButton.disabled = isLoading;
        DOM.sendButton.innerHTML = isLoading ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>' : 'Send';
    }
    if (DOM.textarea) DOM.textarea.disabled = isLoading;
};

// --- Logica Chat ---
const handleDeleteConversation = async (conversationId) => {
    if (confirm('Sei sicuro di voler eliminare questa conversazione? L\'azione è irreversibile.')) {
        try {
            await deleteConversation(conversationId);
            
            // Rimuovi la conversazione dallo stato locale
            AppState.conversations = AppState.conversations.filter(c => c.id !== conversationId);
            
            // Se la conversazione eliminata era quella attiva, passa a una nuova chat
            if (AppState.activeConversationId === conversationId) {
                handleNewChat();
            } else {
                renderConversationsList(); // Altrimenti, aggiorna solo la lista
            }

        } catch (error) {
            console.error("Errore durante l\'eliminazione:", error);
            alert(`Impossibile eliminare la conversazione: ${error.message}`);
        }
    }
};

const selectConversation = async (conversationId) => {
    if (AppState.isLoading) return;
    setLoadingState(true);

    AppState.activeConversationId = conversationId;
    AppState.activeMessages = []; 
    renderMessages(); 

    try {
        AppState.activeMessages = await fetchMessages(conversationId);
    } catch (error) {
        console.error("Errore nel selezionare la conversazione:", error);
    } finally {
        setLoadingState(false);
        renderMessages();
        renderConversationsList();
    }
};

const handleNewChat = () => {
    if (AppState.isLoading) return;
    AppState.activeConversationId = null;
    AppState.activeMessages = [];
    renderMessages();
    renderConversationsList();
    if (DOM.textarea) DOM.textarea.focus();
};

const handleMessaging = async (messageText) => {
    if (AppState.isLoading || !messageText) return;
    setLoadingState(true);

    // Mostra subito il messaggio dell'utente per feedback immediato
    DOM.messagesContainer.insertAdjacentHTML('beforeend', createOutgoingMessageHTML(messageText));
    DOM.messagesContainer.scrollTop = DOM.messagesContainer.scrollHeight;
    if (DOM.textarea) {
        DOM.textarea.value = '';
        DOM.textarea.focus();
    }
    
    try {
        const response = await getBotCompletion(AppState.activeConversationId, messageText);
        
        // Aggiorna l'ID della conversazione se è stata una nuova chat
        AppState.activeConversationId = response.conversationId;

        // Ricarica tutti i messaggi per assicurare la consistenza (include messaggio utente e bot)
        AppState.activeMessages = await fetchMessages(AppState.activeConversationId);
        
        // Se era una nuova chat, aggiorna la lista delle conversazioni nella sidebar
        const isNewConversation = AppState.conversations.some(conv => conv.id === response.conversationId) === false; // Controlla se l'ID è nuovo
        if (isNewConversation) {
             AppState.conversations = await fetchConversations();
        }
        
    } catch (error) {
        console.error("Errore in handleMessaging:", error);
        AppState.activeMessages.push({ role: 'assistant', content: `Spiacente, si è verificato un errore: ${error.message}` });
    } finally {
        setLoadingState(false);
        renderMessages(); // Renderizza i messaggi aggiornati dallo stato
        renderConversationsList(); // Aggiorna per mostrare lo stato 'active' corretto e nuove conversazioni
    }
};

// --- Event Listeners ---
const setupEventListeners = () => {
    DOM.textarea.addEventListener('keydown', (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleMessaging(DOM.textarea.value.trim());
        }
    });

    DOM.sendButton.addEventListener('click', () => {
        handleMessaging(DOM.textarea.value.trim());
    });

    DOM.newChatButton.addEventListener('click', handleNewChat);
};

// --- Inizializzazione App ---
const initApp = async () => {
    if (!cacheDOMElements()) return;
    setupEventListeners();
    
    setLoadingState(true);
    try {
        AppState.conversations = await fetchConversations();
    } catch (error) {
        console.error("Errore durante l\'inizializzazione dell\'app:", error);
        DOM.messagesContainer.innerHTML = createIncomingMessageHTML(`Impossibile caricare la cronologia chat: ${error.message}`);
    } finally {
        setLoadingState(false);
    }

    renderConversationsList();
    handleNewChat(); 
};

document.addEventListener('DOMContentLoaded', initApp);

// --- Funzioni Helper per HTML ---
const formatTimestamp = () => new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

const createOutgoingMessageHTML = (message) => `
    <div class="d-flex justify-content-end mb-10">
        <div class="d-flex flex-column align-items-end mw-90">
            <div class="d-flex align-items-center mb-2">
                <div class="me-3"><span class="text-muted fs-7 mb-1">${formatTimestamp()}</span><span class="fs-5 fw-bold text-primary ms-1">You</span></div>
                <div class="d-flex justify-content-center align-items-center rounded-circle bg-message-out text-primary fw-bold" style="width: 35px; height: 35px;"><span class="fs-5">MC</span></div>
            </div>
            <div class="p-5 rounded bg-message-out text-gray-900 fw-semibold text-end">${message}</div>
        </div>
    </div>`;

const createIncomingMessageHTML = (message) => `
    <div class="d-flex justify-content-start mb-10">
        <div class="d-flex flex-column align-items-start mw-90">
            <div class="d-flex align-items-center mb-2">
                <div class="d-flex justify-content-center align-items-center rounded-circle bg-message-in" style="width: 35px; height: 35px;"><img src="/brain.png" alt="Bot Icon" style="width: 24px; height: 24px; margin-right: 2px;" /></div>
                <div class="ms-3"><span class="fs-5 fw-bold text-bisup me-1">BiSupport</span><span class="text-muted fs-7 mb-1">${formatTimestamp()}</span></div>
            </div>
            <div class="p-5 rounded bg-message-in text-gray-900 fw-semibold text-start">${message}</div>
        </div>
    </div>`;