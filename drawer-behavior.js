// ==========================================================================================
// ChatDrawerVisibility: Manages the selective visibility (toggle) of the chat drawer.
// ==========================================================================================
const ChatDrawerVisibility = {
    toggleButton: null,
    drawer: null,
    overlay: null,

    init: function() {
        this.toggleButton = document.querySelector('#chat_toggle');
        this.drawer = document.querySelector('#chat_drawer');

        if (!this.toggleButton || !this.drawer) {
            console.error('Chat drawer visibility elements (#chat_toggle or #chat_drawer) not found.');
            return;
        }

        // Ensure the drawer is initially hidden by removing 'chat_drawer_on' if present from HTML.
        this.drawer.classList.remove('chat_drawer_on');
        this.hide(); // Ensures no overlay is present at start

        // Attach event listeners for toggling
        this.toggleButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggle();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isDrawerVisible()) {
                this.hide();
            }
        });
    },

    isDrawerVisible: function() {
        return this.drawer && this.drawer.classList.contains('chat_drawer_on');
    },

    show: function() {
        if (!this.drawer) return;

        if (!this.overlay) {
            this.overlay = document.createElement('div');
            this.overlay.id = 'chat_overlay';
            document.body.appendChild(this.overlay);
            this.overlay.addEventListener('click', () => this.hide());
        }

        this.drawer.classList.add('chat_drawer_on');
        this.toggleButton.classList.add('active');
    },

    hide: function() {
        if (!this.drawer) return;

        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }

        this.drawer.classList.remove('chat_drawer_on');
        this.toggleButton.classList.remove('active');
    },

    toggle: function() {
        if (this.isDrawerVisible()) {
            this.hide();
        } else {
            this.show();
        }
    }
};


// ==========================================================================================
// Main Initialization
// ==========================================================================================
document.addEventListener('DOMContentLoaded', () => {
   
    // Conditionally initialize drawer visibility logic.
    // This logic is only needed if the drawer is meant to be toggleable.
    const toggleButton = document.querySelector('#chat_toggle');
    if (toggleButton && !toggleButton.classList.contains('d-none')) {
        ChatDrawerVisibility.init();
    }
});
