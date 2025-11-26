# Fase 1: Build Image
FROM node:18-alpine AS builder

# Crea la directory di lavoro principale per l'applicazione
WORKDIR /usr/src/app

# Copia l'intero contenuto del progetto nella directory di lavoro del container
# Questo include server/, client/, .env, etc.
COPY . .

# Entra nella directory del server per installare le dipendenze
WORKDIR /usr/src/app/server

# Installa le dipendenze di produzione (salta le devDependencies)
RUN npm install --omit=dev


# --- Fase 2: Immagine Finale di Produzione ---
FROM node:18-alpine

# Crea la directory di lavoro principale per l'applicazione
WORKDIR /usr/src/app

# Copia il server e i suoi node_modules dalla fase di build
COPY --from=builder /usr/src/app/server ./server/

# Copia la cartella client dalla fase di build
COPY --from=builder /usr/src/app/client ./client/

# Espone la porta su cui l'applicazione sarà in ascolto
EXPOSE 3000

# Imposta la directory di lavoro per l'esecuzione del comando
# Il comando node index.js deve essere eseguito dalla directory del server
WORKDIR /usr/src/app/server
CMD ["node", "index.js"]
