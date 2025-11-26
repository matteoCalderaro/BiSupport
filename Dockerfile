# Usa un'immagine base di Node.js
FROM node:18-alpine

# Imposta la directory di lavoro all'interno del container
WORKDIR /app

# Copia i file di configurazione delle dipendenze del server
COPY server/package.json server/package-lock.json ./server/

# Installa le dipendenze del server
RUN npm install --prefix ./server

# Copia il resto del codice del server
COPY server/ ./server/

# Copia l'intera cartella client
COPY client/ ./client/

# Espone la porta su cui l'applicazione sarà in ascolto
EXPOSE 3000

# Definisce il comando per avviare l'applicazione
# Render cercherà questo script "start" nel package.json del server
CMD ["npm", "start", "--prefix", "./server"]
