# Fase 1: Build Image
FROM node:18-alpine AS builder

# Imposta la directory di lavoro principale per l'applicazione
WORKDIR /usr/src/app

# Copia la cartella server (inclusi package.json e package-lock.json)
COPY server/ ./server/

# Entra nella directory del server per installare le dipendenze
WORKDIR /usr/src/app/server

# Installa le dipendenze di produzione (salta le devDependencies)
RUN npm install --omit=dev

# Copia la cartella client nella root dell'applicazione (al livello di /usr/src/app/)
# Torna alla root dell'applicazione prima di copiare il client
WORKDIR /usr/src/app
COPY client/ ./client/


# --- Fase 2: Immagine Finale di Produzione ---
FROM node:18-alpine

# Imposta la directory di lavoro principale per l'applicazione
WORKDIR /usr/src/app

# Copia il server (inclusi codice e node_modules) dalla fase di build
COPY --from=builder /usr/src/app/server ./server/

# Copia la cartella client dalla fase di build
COPY --from=builder /usr/src/app/client ./client/

# Espone la porta su cui l'applicazione sarà in ascolto
EXPOSE 3000

# Imposta la directory di lavoro per l'esecuzione del comando
# Il comando node index.js deve essere eseguito dalla directory del server
WORKDIR /usr/src/app/server
CMD ["node", "index.js"]