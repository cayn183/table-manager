# Verwende Node.js 18 als Basisimage
FROM node:18-alpine

# Arbeitsverzeichnis setzen
WORKDIR /app

# package.json und package-lock.json kopieren (falls vorhanden)
COPY package*.json ./

# Dependencies installieren
RUN npm install

# Quellcode kopieren
COPY . .

# Port für Vite Dev Server freigeben
EXPOSE 5173

# Dev-Server starten
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]