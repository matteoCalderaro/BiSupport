# Fase 1: Build Image
FROM node:18-alpine AS builder

# Crea la directory di lavoro principale per l'applicazione
WORKDIR /usr/src/app

# Copia la cartella del server
COPY server/ ./server/

# Entra nella directory del server per installare le dipendenze
WORKDIR /usr/src/app/server

# Installa le dipendenze di produzione (salta le devDependencies)
RUN npm install --omit=dev

# Copia la cartella client nella root dell'applicazione /usr/src/app/
# (Nota: torniamo alla root dell'app per questa copia)
WORKDIR /usr/src/app
COPY client/ ./client/


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
# Il comando npm start deve essere eseguito dalla directory del server
WORKDIR /usr/src/app/server

# Comando per avviare l'applicazione
CMD ["npm", "start"]
