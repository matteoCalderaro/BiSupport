/**
 * @file chat-ui.js
 * @description Gestisce l'interfaccia utente della chat, gli eventi e il rendering dei messaggi, inclusa la cronologia.
 */

import { streamBotCompletion, fetchConversations, fetchMessages, deleteConversation, updateConversationTitle } from './chat-service.js';

// --- App State ---
const AppState = {
    conversations: [], // [{ id, title, created_at }]
    activeConversationId: null,
    activeMessages: [], // [{ role, content, timestamp }]
    isLoading: false,
    currentBotMessageElement: null, // Riferimento all'elemento del messaggio del bot attualmente in costruzione
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
    DOM.toggleConversationsContainer = document.querySelector('.toggle_conversations_container');
    DOM.conversationContainer = document.querySelector('.conversation_container');
    DOM.globalLoadingOverlay = document.querySelector('#global_loading_overlay');
    DOM.headerProgressBar = document.querySelector('#header_progress_bar');
    return true;
};

// --- Funzioni di Utilità per Dropdown Conversazioni ---
const setupConversationItemDropdown = (item) => {
    const dropdownButton = item.querySelector('.dropdown-toggle');
    const dropdownMenuElement = item.querySelector('.dropdown-menu');
    if (!dropdownButton || !dropdownMenuElement) return;

    // Store original parent of the dropdown menu for later
    dropdownButton._originalDropdownMenuParent = dropdownMenuElement.parentNode;
    dropdownButton._dropdownMenuElement = dropdownMenuElement; // Store menu element itself

    // Manually initialize dropdown with container: 'body' to solve positioning issues
    new bootstrap.Dropdown(dropdownButton, {
        container: 'body'
    });

    // Dropdown freeze logic (positioning and hiding other dropdowns)
    dropdownButton.addEventListener('show.bs.dropdown', () => {
        // Hide any other open dropdowns
        const allDropdownButtons = DOM.conversationsList.querySelectorAll('.dropdown-toggle');
        allDropdownButtons.forEach(btn => {
            if (btn !== dropdownButton) {
                const instance = bootstrap.Dropdown.getInstance(btn);
                if (instance) instance.hide();
            }
        });
        item.classList.add('dropdown-expanded');

        // --- MANUAL DOM MANIPULATION FOR POSITIONING ---
        // Remove from original parent and append to body
        const originalParent = dropdownButton._originalDropdownMenuParent;
        const menuElement = dropdownButton._dropdownMenuElement;
        if (menuElement && originalParent && originalParent.contains(menuElement)) { // Check if it's still in original parent
            originalParent.removeChild(menuElement);
            document.body.appendChild(menuElement);
        }
        // ------------------------------------------------
    });

    dropdownButton.addEventListener('hide.bs.dropdown', () => {
        item.classList.remove('dropdown-expanded');

        // --- MANUAL DOM MANIPULATION FOR POSITIONING ---
        // Move menu back to original parent
        const originalParent = dropdownButton._originalDropdownMenuParent;
        const menuElement = dropdownButton._dropdownMenuElement;
        if (menuElement && originalParent && document.body.contains(menuElement)) { // Check if it's currently in body
            document.body.removeChild(menuElement);
            originalParent.appendChild(menuElement);
        }
        // ------------------------------------------------
    });
};

const attachConversationActionListeners = (item, dropdownMenuElement) => {
    const renameButton = dropdownMenuElement.querySelector('.rename-btn');
    const deleteButton = dropdownMenuElement.querySelector('.delete-btn');

    if (renameButton) {
        renameButton.addEventListener('click', (e) => {
            closeAllOpenDropdowns();
            e.preventDefault();
            e.stopPropagation();
            const conversationId = item.dataset.conversationId;
            const titleElement = item.querySelector('.title');
            const conversationTitle = titleElement ? titleElement.title : ''; // Safely get title, default to empty string
            handleRenameConversation(conversationId, conversationTitle);
        });
    }
    if (deleteButton) {
        deleteButton.addEventListener('click', (e) => {
            closeAllOpenDropdowns();
            e.preventDefault();
            e.stopPropagation();
            const conversationId = item.dataset.conversationId;
            const titleElement = item.querySelector('.title');
            const conversationTitle = titleElement ? titleElement.title : ''; // Safely get title, default to empty string
            handleDeleteConversation(conversationId);
        });
    }
};

// Funzione helper per capitalizzare la prima lettera di una stringa
const capitalizeFirstLetter = (string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
};

// --- Funzioni di Rendering ---
const renderConversationsList = () => {
    if (!DOM.conversationsList) return;

    if (AppState.conversations.length === 0) {
        DOM.conversationsList.innerHTML = '<div class="text-muted text-center mt-3 p-2">Nessuna conversazione.</div>';
        return;
    }

    // 1. Generate all HTML strings using template literals
    DOM.conversationsList.innerHTML = AppState.conversations.map(conv => {
        const isActive = conv.id == AppState.activeConversationId;
        const itemClasses = `d-flex justify-content-between align-items-center py-2 px-3 mb-2 rounded conversation-item position-relative ${isActive ? 'is-active-conversation' : ''}`;
        
        return `
            <div class="${itemClasses}" data-conversation-id="${conv.id}" ${!isActive ? 'style="cursor: pointer;"' : ''}>
                <div class="flex-grow-1 overflow-hidden me-2">
                    <div class="fs-7 text-muted" style="line-height: 1; margin-bottom: 0.1rem;">${new Date(conv.created_at).toLocaleDateString()}</div>
                    <div class="title fw-semibold text-truncate" title="${conv.title}" style="line-height: 1.2;">${capitalizeFirstLetter(conv.title)}</div>
                </div>
                <div class="dropdown ms-2 conversation-actions">
                    <button class="btn btn-sm btn-icon btn-flush dropdown-toggle" type="button" aria-expanded="false" title="Opzioni conversazione">
                        <i class="bi bi-three-dots-vertical"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-start shadow-sm">
                        <li><a class="dropdown-item rename-btn" href="#"><i class="bi bi-pencil me-2"></i>Rinomina</a></li>
                        <li><a class="dropdown-item text-danger delete-btn" href="#"><i class="bi bi-trash me-2"></i>Elimina</a></li>
                    </ul>
                </div>
            </div>
        `;
    }).join('');

    // 2. Attach listeners and initialize components after rendering
    DOM.conversationsList.querySelectorAll('.conversation-item').forEach(item => {
        setupConversationItemDropdown(item);
        attachConversationActionListeners(item, item.querySelector('.dropdown-menu'));

    });
    setTimeout(() => { // Introduce a small delay to ensure DOM is rendered and scrollHeight is calculated
        DOM.conversationsList.scrollTop = 0; // Scroll to TOP
    }, 0);
};

const renderMessages = () => {
    if (!DOM.messagesContainer) return;

    if (DOM.chatCard) {
        const welcomeMessage = DOM.chatCard.querySelector('#welcome-message');
        if (welcomeMessage) {
            welcomeMessage.classList.add('d-none');
        }
        const footer = DOM.chatCard.querySelector('#chat_card-footer');
        if (footer) {
            footer.classList.remove('footer-expanded');
        }
    }


    // Clear only if it's not currently building a streaming message
    if (!AppState.currentBotMessageElement) {
        DOM.messagesContainer.innerHTML = '';
        AppState.activeMessages.forEach(msg => {
            const html = msg.role === 'user' ? createOutgoingMessageHTML(msg.content) : createIncomingMessageHTML(msg.content);
            DOM.messagesContainer.insertAdjacentHTML('beforeend', html);
        });
    } else {
        // If streaming, only add new user messages or update existing streaming message
        const renderedMessageCount = DOM.messagesContainer.children.length;
        const messagesToRender = AppState.activeMessages.slice(renderedMessageCount);

        messagesToRender.forEach(msg => {
            if (msg.role === 'user') { // Always render user messages
                DOM.messagesContainer.insertAdjacentHTML('beforeend', createOutgoingMessageHTML(msg.content));
            }
            // For assistant messages, they are handled by streaming updates, not full re-renders here
        });
    }

    if (AppState.activeMessages.length === 0 && AppState.activeConversationId === null && !AppState.currentBotMessageElement) {
        const welcomeMessage = "Ciao Matteo! Come posso aiutarti?";
        DOM.messagesContainer.insertAdjacentHTML('beforeend', createWelcomeMessageHTML(welcomeMessage));
    }
    
    DOM.messagesContainer.scrollTop = DOM.messagesContainer.scrollHeight;
};

const setLoadingState = (isLoading) => {
    AppState.isLoading = isLoading;
    updateGlobalLoadingUI(isLoading); // Update global loading overlay based on new loading status
    updateHeaderLoadingBar(isLoading); // Update header progress bar based on new loading status
};

// Funzione per aggiornare la visibilità dell'overlay di caricamento globale
const updateGlobalLoadingUI = (isLoading) => {
    if (DOM.globalLoadingOverlay) {
        if (isLoading) {
            DOM.globalLoadingOverlay.classList.remove('d-none'); // Mostra overlay
        } else {
            DOM.globalLoadingOverlay.classList.add('d-none'); // Nascondi overlay
        }
    }
};

// Funzione per aggiornare la visibilità e l'animazione della progress bar nell'header
const updateHeaderLoadingBar = (isLoading) => {
    if (DOM.headerProgressBar) {
        if (isLoading) {
            DOM.headerProgressBar.classList.add('active'); // Attiva l'animazione
        } else {
            DOM.headerProgressBar.classList.remove('active'); // Disattiva l'animazione
        }
    }
};

// Funzione helper per aggiornare lo stato del bottone di invio
const updateSendButtonState = () => {
    const isTextareaContentValid = DOM.textarea && DOM.textarea.value.trim() !== '';
    DOM.sendButton.disabled = !isTextareaContentValid;
};

// Funzione per gestire specificamente lo stato di "busy" dell'area input messaggi
const setMessagingBusyState = (isBusy) => {
    // La textarea rimane abilitata per permettere la digitazione del messaggio successivo.
    // Il pulsante di invio viene disabilitato per prevenire invii multipli.
    if (DOM.sendButton) {
        DOM.sendButton.disabled = isBusy; // Disabilita/abilita il pulsante Invia
        const arrow = DOM.sendButton.querySelector('.arrow-icon');
        const spinner = DOM.sendButton.querySelector('.spinner-icon');

        if (arrow && spinner) {
            if (isBusy) {
                arrow.classList.add('d-none');
                spinner.classList.remove('d-none');
            } else {
                arrow.classList.remove('d-none');
                spinner.classList.add('d-none');
            }
        }
    }
    // Note: sendButton.disabled is managed by updateSendButtonState based on textarea content
};


// --- Funzioni di Utilità SweetAlert2 ---
// --- Funzioni di Utilità SweetAlert2 ---
// Modificata per accettare tutte le opzioni di Swal.fire tramite restOptions
const showCustomSwal = async ({ type, title, text, confirmButtonText, showCancelButton, icon, cancelButtonText, ...restOptions }) => {
    return await Swal.fire({
        icon: icon || type, // usa 'type' come icona di default se non specificato
        title: title,
        text: text,
        confirmButtonText: confirmButtonText || 'Ok',
        showCancelButton: showCancelButton || false,
        cancelButtonText: cancelButtonText || 'Annulla', // Aggiunto per gestire il testo del pulsante Annulla
        heightAuto: false, // Impedisce a swal di modificare l'altezza di body e html
        customClass: {
            confirmButton: 'btn btn-primary',
            cancelButton: 'btn btn-light me-3'
        },
        buttonsStyling: false,
        reverseButtons: true,
        ...restOptions // <--- Passa tutte le opzioni aggiuntive qui
    });
};

// --- Logica Chat ---
const handleDeleteConversation = async (conversationId) => {
    const result = await showCustomSwal({
        type: 'warning',
        title: 'Sei sicuro?',
        text: 'Questa azione eliminerà permanentemente la conversazione e non può essere annullata!',
        showCancelButton: true,
        confirmButtonText: 'Sì, elimina!',
        cancelButtonText: 'Annulla'
    });

    if (result.isConfirmed) {
        setLoadingState(true); // <-- Add setLoadingState(true)
        try {
            await deleteConversation(conversationId);
            
            // Rimuovi la conversazione dallo stato locale
            AppState.conversations = AppState.conversations.filter(c => c.id != conversationId);
            

            // Flag per determinare quale logica di rendering eseguire dopo la chiusura dello Swal
            const wasActive = AppState.activeConversationId == conversationId;

            // Mostra prima il messaggio di successo
            await showCustomSwal({ // Messaggio di successo (awaiting qui per assicurarsi che sia visualizzato)
                type: 'success',
                title: 'Eliminata!',
                text: 'La conversazione è stata eliminata con successo.',
                showConfirmButton: false,
                timer: 1500,
                didClose: () => { 
                    if (wasActive) {
                        handleNewChat(); // Renderizzerà la nuova UI
                    } else {
                        renderConversationsList(); // Aggiorna solo la lista
                        if (DOM.textarea) DOM.textarea.focus();
                    }
                }
            });
            

        } catch (error) {
            console.error("Errore durante l\'eliminazione:", error);
            showCustomSwal({ // Error message
                type: 'error',
                title: 'Errore!',
                text: `Impossibile eliminare la conversazione: ${error.message}`,
            });
        } finally { // <-- Add finally block
            setLoadingState(false); // <-- Add setLoadingState(false)
        }
    }
};

const handleRenameConversation = async (conversationId, currentTitle) => {
    const { value: newTitle, isConfirmed, isDismissed } = await Swal.fire({
        title: 'Rinomina Conversazione',
        input: 'text',
        inputLabel: 'Nuovo titolo per la conversazione',
        inputValue: currentTitle,
        showCancelButton: true,
        confirmButtonText: 'Salva',
        cancelButtonText: 'Annulla',
        inputValidator: (value) => {
            if (!value || value.trim() === '') {
                return 'Devi inserire un titolo!';
            }
            if (value.trim() === currentTitle.trim()) {
                return 'Il nuovo titolo è uguale a quello attuale.';
            }
            return null; // Return null if validation passes
        },
        heightAuto: false, // Prevents swal from modifying body/html height
        customClass: {
            confirmButton: 'btn btn-primary',
            cancelButton: 'btn btn-light me-3'
        },
        buttonsStyling: false,
        reverseButtons: true,
    });

    if (isConfirmed) {
        setLoadingState(true);
        try {
            await updateConversationTitle(conversationId, newTitle);
            
            // Aggiorna lo stato locale
            const conversationToUpdate = AppState.conversations.find(conv => conv.id == conversationId);
            if (conversationToUpdate) {
                conversationToUpdate.title = newTitle;
            }
            renderConversationsList(); // Aggiorna la UI
            showCustomSwal({
                type: 'success',
                title: 'Rinominata!',
                text: 'La conversazione è stata rinominata con successo.',
                showConfirmButton: false,
                timer: 1500, 
            });
        } catch (error) {
            console.error("Errore durante la rinomina della conversazione:", error);
            showCustomSwal({
                type: 'error',
                title: 'Errore!',
                text: `Impossibile rinominare la conversazione: ${error.message}`,
            });
        } finally {
            setLoadingState(false);
            if (DOM.textarea) DOM.textarea.focus();
        }
    } else if (isDismissed) {
        // User cancelled, do nothing.
    }
    // The case where newTitle.trim() === currentTitle.trim() is now fully handled by inputValidator,
    // which prevents confirmation. So the 'else if' for info message is no longer reachable.
};

const closeAllOpenDropdowns = () => {
    const expandedItems = DOM.conversationsList.querySelectorAll('.dropdown-expanded');
    expandedItems.forEach(item => {
        const dropdownButton = item.querySelector('.dropdown-toggle');
        if (dropdownButton) {
            const instance = bootstrap.Dropdown.getInstance(dropdownButton);
            if (instance) {
                instance.hide(); // This will trigger our hide.bs.dropdown listener
            }
        }
    });
};

const selectConversation = async (conversationId) => {
    if (AppState.isLoading) return;
    setLoadingState(true);

    closeAllOpenDropdowns(); // <-- NEW: Close any open dropdowns before re-rendering

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
        if (DOM.textarea) DOM.textarea.focus();
    }
};

const handleNewChat = () => {
    
    closeAllOpenDropdowns(); // <-- NEW: Close any open dropdowns before re-rendering

    AppState.activeConversationId = null;
    AppState.activeMessages = [];
    renderMessages();
    renderConversationsList();
    if (DOM.textarea) DOM.textarea.focus();

    // Applica stili per la schermata di nuova chat vuota
    if (DOM.chatCard) {
        const footer = DOM.chatCard.querySelector('#chat_card-footer');
        if (footer) {
            footer.classList.add('footer-expanded');
        }
    }
};

// --- Funzioni Helper per la Creazione di Messaggi HTML ---




// Funzione helper per aggiungere un nuovo messaggio in arrivo (del bot) e ottenere un riferimento al suo content-body
const appendIncomingMessageHTML = (initialContent = '') => {
    const messageId = `bot-message-${Date.now()}`;
    const html = _createBaseIncomingMessageHTML({
        content: initialContent,
        isStreaming: true,
        messageId: messageId,
    });
    
    DOM.messagesContainer.insertAdjacentHTML('beforeend', html);
    const newMessageElement = DOM.messagesContainer.querySelector(`[data-message-id="${messageId}"] .bot-message-content`);
    DOM.messagesContainer.scrollTop = DOM.messagesContainer.scrollHeight;
    return newMessageElement;
};

const handleMessaging = async (messageText) => {
    // If global loading is active, prevent new messaging actions.
    // Also prevent if message is empty after trim.
    if (AppState.isLoading || !messageText) return;

    // Set messaging specific busy state (disables textarea, shows spinner)
    setMessagingBusyState(true); 

    // Ripristina gli stili con animazione
    
    if (DOM.chatCard) {
        const welcomeMessage = DOM.chatCard.querySelector('#welcome-message');
        if (welcomeMessage) {
            welcomeMessage.classList.add('d-none');
        }
        const footer = DOM.chatCard.querySelector('#chat_card-footer');
        if (footer) {
            footer.classList.remove('footer-expanded');
        }
    }

    // 1. Add user's message to state and render immediately (Optimistic Update)
    AppState.activeMessages.push({ role: 'user', content: messageText, timestamp: new Date().toISOString() });
    DOM.messagesContainer.insertAdjacentHTML('beforeend', createOutgoingMessageHTML(messageText)); // Render user message immediately
    DOM.messagesContainer.scrollTop = DOM.messagesContainer.scrollHeight;

    if (DOM.textarea) {
        DOM.textarea.value = '';
        autoResizeTextarea(DOM.textarea); // Resetta l'altezza
    }
    
    // 2. Prepare for bot's streaming response
    AppState.currentBotMessageElement = appendIncomingMessageHTML(); // Create an empty container for the bot's message
    let botFullMessage = ''; // Accumulate bot's message

    try {
        await streamBotCompletion(AppState.activeConversationId, messageText, {
            onConversationId: (id) => {
                AppState.activeConversationId = id;
            },
            onNewConversationCreated: async (isNew) => {
                if (isNew) {
                    AppState.conversations = await fetchConversations();
                    renderConversationsList();
                }
            },
            onChunk: (chunk) => {
                botFullMessage += chunk;
                if (AppState.currentBotMessageElement) {
                    // Update content, keeping the cursor at the end
                    const htmlContent = marked.parse(botFullMessage);
                    AppState.currentBotMessageElement.innerHTML = htmlContent + '<span class="streaming-cursor"></span>';
                    DOM.messagesContainer.scrollTop = DOM.messagesContainer.scrollHeight;
                }
            },
            onComplete: async () => {
                // Remove the streaming cursor
                if (AppState.currentBotMessageElement) {
                    const cursor = AppState.currentBotMessageElement.querySelector('.streaming-cursor');
                    if (cursor) cursor.remove();
                }

                // Add the completed bot message to state
                AppState.activeMessages.push({
                    role: 'assistant',
                    content: botFullMessage,
                    timestamp: new Date().toISOString(),
                });
                AppState.currentBotMessageElement = null; // Reset reference

                // but safer for cases where title updates on existing conversations too.
                AppState.conversations = await fetchConversations(); 
                renderConversationsList();
            },
            onError: (error) => {
                console.error("Errore in handleMessaging (streaming):", error);
                // Remove cursor if present
                if (AppState.currentBotMessageElement) {
                    const cursor = AppState.currentBotMessageElement.querySelector('.streaming-cursor');
                    if (cursor) cursor.remove();
                    AppState.currentBotMessageElement.innerHTML += ` <span class="text-danger">(Errore: ${error.message})</span>`;
                } else {
                    // Fallback if no message element was created (e.g., error before first chunk)
                    AppState.activeMessages.push({ role: 'assistant', content: `Spiacente, si è verificato un errore: ${error.message}` });
                    renderMessages();
                }
                AppState.currentBotMessageElement = null;
            }
        });

    } catch (error) {
        console.error("Errore generico in handleMessaging:", error);
        AppState.activeMessages.push({ role: 'assistant', content: `Spiacente, si è verificato un errore generico: ${error.message}` });
        renderMessages();
    } finally {
        setMessagingBusyState(false);
        updateSendButtonState(); // Ricalcola lo stato del bottone (disabilitandolo se la textarea è vuota)
        if (DOM.textarea) DOM.textarea.focus();
        // Ensure final scroll
        DOM.messagesContainer.scrollTop = DOM.messagesContainer.scrollHeight;
    }
};

// --- Event Listeners ---
const setupConversationListClickListener = () => {
    if (!DOM.conversationsList) return;

    DOM.conversationsList.addEventListener('click', (e) => {
        const item = e.target.closest('.conversation-item');
        if (!item) return;

        const conversationId = item.dataset.conversationId;
        const conversationTitle = item.querySelector('.title')?.title;

        // Case 3: Clicked on the dropdown toggle button
        const dropdownToggleElement = e.target.closest('.dropdown-toggle');
        if (dropdownToggleElement) {
            e.stopPropagation();
            // Manually get the instance (which was created on render) and toggle it.
            const instance = bootstrap.Dropdown.getInstance(dropdownToggleElement);
            if (instance) {
                instance.toggle();
            }
            return; 
        }

        // Case 4: Clicked on the conversation item itself (but not an active one)
        if (!item.classList.contains('is-active-conversation')) {
            selectConversation(conversationId);
        }
    });
};

const setupGlobalDropdownCloser = () => {
    document.addEventListener('click', (e) => {
        closeAllOpenDropdowns();
    });
};

// Funzione per il ridimensionamento automatico della textarea
const autoResizeTextarea = (element) => {
    // Resetta l'altezza per ricalcolare la scrollHeight corretta
    element.style.height = 'auto';
    // Imposta la nuova altezza basata sul contenuto, aggiungendo 2px per evitare una scrollbar flash
    element.style.height = (element.scrollHeight) + 'px';
};

const setupEventListeners = () => {
    updateSendButtonState(); // Set initial state of send button

    DOM.textarea.addEventListener('keydown', (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleMessaging(DOM.textarea.value.trim());
        }
    });

    // Aggiungi l'evento per l'auto-ridimensionamento
    DOM.textarea.addEventListener('input', () => {
        autoResizeTextarea(DOM.textarea);
        updateSendButtonState(); // Aggiorna anche lo stato del bottone
    });

    DOM.sendButton.addEventListener('click', () => {
        handleMessaging(DOM.textarea.value.trim());
    });

    DOM.newChatButton.addEventListener('click', handleNewChat);

    if (DOM.toggleConversationsContainer && DOM.conversationContainer) { // Ensure elements exist
        DOM.toggleConversationsContainer.addEventListener('click', () => {
            DOM.conversationContainer.classList.toggle('expanded'); // Toggle 'expanded' instead of 'd-none'
            DOM.toggleConversationsContainer.classList.toggle('open');
            setTimeout(() => { // Ensure DOM is stable before scrolling
                DOM.conversationsList.scrollTop = 0; // Scroll to TOP
            }, 0);
        });
    }

    setupConversationListClickListener(); // Setup the delegated listener
    setupGlobalDropdownCloser(); // NEW: Setup global dropdown closer
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
        showCustomSwal({ // Error message for initialization
            type: 'error',
            title: 'Errore di Caricamento!',
            text: `Impossibile caricare la cronologia chat: ${error.message}`,
        });
        // NOTA: Questo blocco catch non verrà attivato direttamente dai fallimenti di
        // fetchConversations() perché attualmente quella funzione ritorna [] e non lancia errori.
        // Se si desidera attivare questo popup per i fallimenti di fetchConversations(),
        // fetchConversations() dovrebbe essere modificata per lanciare l'errore.
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
        <div class="px-5 py-3 bg-message-out text-gray-900">${message}</div>
    </div>`;

const createWelcomeMessageHTML = (message) => `
    <div id="welcome-message" class="d-flex justify-content-center w-100  mb-10 mt-auto">
            <div class="fs-1 text-bisup">${message}</div>
    </div>`;

const createIncomingMessageHTML = (message) => {
    const htmlContent = marked.parse(message);
    // Chiama la funzione base con isStreaming: false per un messaggio normale
    return _createBaseIncomingMessageHTML({ content: htmlContent, isStreaming: false });
};

/**
 * Funzione base unificata per creare l'HTML di un messaggio in arrivo (bot).
 * Gestisce sia i messaggi normali che quelli in streaming.
 * @param {object} options - Opzioni per la creazione del messaggio.
 * @param {string} options.content - Il contenuto testuale del messaggio.
 * @param {boolean} options.isStreaming - Se true, aggiunge gli elementi per lo streaming (ID, classe, cursore).
 * @param {string|null} options.messageId - L'ID univoco per il messaggio in streaming.
 * @returns {string} L'HTML completo del messaggio.
 */
const _createBaseIncomingMessageHTML = ({ content = '', isStreaming = false, messageId = null }) => {
    const messageIdAttr = messageId ? `data-message-id="${messageId}"` : '';
    const contentClass = isStreaming ? 'bot-message-content' : '';
    const streamingCursor = isStreaming ? '<span class="streaming-cursor"></span>' : '';

    return `
        <div class="d-flex justify-content-start mb-10" ${messageIdAttr}>
            <div class="d-flex flex-column align-items-start">
                <span class="fs-5 fw-bold text-bisup mb-1">BiChat</span>
                <div class="rounded text-gray-900 ${contentClass}">${content}${streamingCursor}</div>
            </div>
        </div>`;
};
