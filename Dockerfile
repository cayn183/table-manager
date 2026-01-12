# Verwende Node.js 18 als Basisimage
FROM node:18-alpine

# Arbeitsverzeichnis setzen
WORKDIR /app

# package.json und package-lock.json kopieren (falls vorhanden)
COPY package*.json ./

# Dependencies installieren
RUN npm ci --only=production

# Quellcode kopieren
COPY . .

# Build erstellen
RUN npm run build

# Port für Vite Preview Server freigeben
EXPOSE 5173

# Production Server starten
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]