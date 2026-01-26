FROM node:18-alpine

WORKDIR /app

# Install deps (including dev deps for build)
COPY package*.json ./
RUN npm ci

# Copy source
COPY tsconfig.json ./
COPY src ./src
COPY db ./db
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Build TypeScript
RUN npm run build

EXPOSE 4000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
