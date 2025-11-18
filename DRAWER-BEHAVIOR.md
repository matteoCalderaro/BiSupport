# Configurazione del Drawer della Chat

Questo documento descrive come configurare la visibilità del drawer della chat. La logica è gestita da `chat.js` e si adatta in base alla presenza della classe `d-none` sull'elemento `#chat_toggle` nel file `chat.html`.

## Modalità di Visualizzazione

### 1. Drawer Sempre Visibile (Default)

Questa è la modalità predefinita. Il drawer è sempre aperto e non togglabile.

*   **Configurazione `chat.html`:**
    *   `#chat_drawer`: **Deve avere** `chat_drawer_on`.
        *   Esempio: `<div id="chat_drawer" class="chat_drawer_end chat_drawer_on">`
    *   `#chat_toggle`: **Deve avere** `d-none` (per nasconderlo).
        *   Esempio: `<div id="chat_toggle" class="... d-none">`

### 2. Drawer Selettivo (Toggle)

Il drawer è inizialmente nascosto e può essere aperto/chiuso dall'utente.

*   **Configurazione `chat.html`:**
    *   `#chat_drawer`: **Non deve avere** `chat_drawer_on`.
        *   Esempio: `<div id="chat_drawer" class="chat_drawer_end">`
    *   `#chat_toggle`: **Non deve avere** `d-none`.
        *   Esempio: `<div id="chat_toggle" class="...">`

---

**Per passare dalla modalità "Sempre Visibile" a "Selettivo":**
Rimuovi la classe `d-none` dall'elemento `#chat_toggle` e assicurati che `#chat_drawer` non abbia `chat_drawer_on`.

**Nota:** La classe `chat_drawer_end` su `#chat_drawer` gestisce la posizione, non la visibilità iniziale, ed è mantenuta in entrambe le configurazioni.
