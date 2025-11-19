/**
 * @file chat-ui.js
 * @description Gestisce l'interfaccia utente della chat, gli eventi e il rendering dei messaggi.
 */

import { getBotResponse } from './chat-service.js';

const setupEventListeners = (textarea, sendButton, messages) => {
    if (!textarea || !sendButton || !messages) {
        console.error("Elementi della chat non trovati. Impossibile inizializzare.");
        return;
    }

    const handleUserMessage = () => {
        const messageText = textarea.value.trim();
        if (messageText.length > 0) {
            handleMessaging(messages, textarea, messageText);
        }
    };

    textarea.addEventListener('keydown', (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleUserMessage();
        }
    });

    sendButton.addEventListener('click', handleUserMessage);
};

const handleMessaging = async (messages, textarea, messageText) => {
    // 1. Mostra il messaggio dell'utente
    const outgoingMessageHtml = createOutgoingMessageHTML(messageText);
    messages.insertAdjacentHTML('beforeend', outgoingMessageHtml);
    messages.scrollTop = messages.scrollHeight;
    textarea.value = '';
    textarea.focus();

    // 2. Ottieni la risposta del bot dal service layer
    const botMessage = await getBotResponse(messageText);

    // 3. Mostra la risposta del bot
    const incomingMessageHtml = createIncomingMessageHTML(botMessage);
    messages.insertAdjacentHTML('beforeend', incomingMessageHtml);
    messages.scrollTop = messages.scrollHeight;
};

document.addEventListener('DOMContentLoaded', () => {
    const chatCard = document.querySelector('#chat_card');
    if (chatCard) {
        const messages = chatCard.querySelector('#chat_messages');
        const textarea = chatCard.querySelector('[data-kt-element="input"]');
        const sendButton = chatCard.querySelector('[data-kt-element="send"]');
        
        setupEventListeners(textarea, sendButton, messages);
    }
});

// Funzioni per creare l'HTML dei messaggi
const createOutgoingMessageHTML = (message) => `
    <div class="d-flex justify-content-end mb-10">
        <div class="d-flex flex-column align-items-end">
            <div class="d-flex align-items-center mb-2">
                <div class="me-3">
                    <span class="text-muted fs-7 mb-1">Just now</span>
                    <span class="fs-5 fw-bold text-primary ms-1">You</span>
                </div>
                <div class="d-flex justify-content-center align-items-center rounded-circle bg-message-out text-primary fw-bold" style="width: 35px; height: 35px;">
                    <span class="fs-5">MC</span>
                </div>
            </div>
            <div class="p-5 rounded bg-message-out text-gray-900 fw-semibold mw-lg-400px text-end">${message}</div>
        </div>
    </div>
`;

const createIncomingMessageHTML = (message) => `
    <div class="d-flex justify-content-start mb-10">
        <div class="d-flex flex-column align-items-start">
            <div class="d-flex align-items-center mb-2">
                <div class="d-flex justify-content-center align-items-center rounded-circle bg-message-in" style="width: 35px; height: 35px;">
                    <i class="bi bi-robot fs-3 text-primary"></i>
                </div>
                <div class="ms-3">
                    <span class="fs-5 fw-bold text-primary me-1">BiSupport</span>
                    <span class="text-muted fs-7 mb-1">Just now</span>
                </div>
            </div>
            <div class="p-5 rounded bg-message-in text-gray-900 fw-semibold mw-lg-400px text-start">${message}</div>
        </div>
    </div>
`;
