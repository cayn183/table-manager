# Verwende Node.js 18 als Basisimage
FROM node:18-alpine

# Arbeitsverzeichnis setzen
WORKDIR /app

# package.json und package-lock.json kopieren (falls vorhanden)
COPY package*.json ./

# Alle Dependencies installieren (inkl. devDependencies für Build)
RUN npm ci

# Quellcode kopieren
COPY . .

# Build erstellen
RUN npm run build

# Port für Vite Preview Server freigeben
EXPOSE 5173

# Production Server starten
CMD ["npm", "run", "start"]