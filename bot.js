"use strict";

const handeSend = (element) => {
    if (!element) {
        return;
    }

    const input = element.querySelector('[data-kt-element="input"]'); // textarea
    const sendButton = element.querySelector('[data-kt-element="send"]'); // button

    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                handeMessaging(element);
            }
        });
    }

    if (sendButton) {
        sendButton.addEventListener('click', () => {
            handeMessaging(element);
        });
    }
};

const handeMessaging = (element) => {
    const messages = element.querySelector('#chat_messages'); // div container
    const input = element.querySelector('[data-kt-element="input"]');
    const messageText = input.value;

    if (messageText.length === 0) {
        return;
    }

    const outgoingMessageHtml = createOutgoingMessageHTML(messageText);
    messages.insertAdjacentHTML('beforeend', outgoingMessageHtml);
    messages.scrollTop = messages.scrollHeight;
    input.value = '';

    setTimeout(() => {
        const incomingMessageHtml = createIncomingMessageHTML('Thank you for your awesome support!');
        messages.insertAdjacentHTML('beforeend', incomingMessageHtml);
        messages.scrollTop = messages.scrollHeight;
    }, 2000);
};

document.addEventListener('DOMContentLoaded', () => {
    const chatMessenger = document.querySelector('#chat_card');
    if (chatMessenger) {
        handeSend(chatMessenger);
    }
});

// Global message creation functions
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
                    <span class="fs-5 fw-bold text-primary me-1">Support</span>
                    <span class="text-muted fs-7 mb-1">Just now</span>
                </div>
            </div>
            <div class="p-5 rounded bg-message-in text-gray-900 fw-semibold mw-lg-400px text-start">${message}</div>
        </div>
    </div>
`;