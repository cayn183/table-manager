FROM node:18-alpine AS backend-build
WORKDIR /build/backend

# Build backend (install deps, build TS)
COPY backend/package*.json ./
RUN npm ci
COPY backend/tsconfig.json ./tsconfig.json
COPY backend/src ./src
COPY backend/db ./db
RUN npm run build

FROM node:18-alpine AS frontend-build
WORKDIR /build/app
COPY package*.json ./
RUN npm ci
COPY src ./src
COPY index.html ./
COPY styles ./styles
RUN npm run build

FROM node:18-alpine
WORKDIR /app

# Copy backend built artifacts and backend production deps
COPY --from=backend-build /build/backend/dist /app/backend/dist
COPY --from=backend-build /build/backend/node_modules /app/backend/node_modules

# Copy frontend built files and node_modules (for vite preview)
COPY --from=frontend-build /build/app/dist /app/dist
COPY --from=frontend-build /build/app/node_modules /app/node_modules

# Entrypoint
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh && chmod +x /usr/local/bin/entrypoint.sh

VOLUME ["/app/data"]
EXPOSE 4000 5173
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
