FROM node:18-bullseye-slim AS backend-build
WORKDIR /build/backend

# Build backend (install deps, build TS)
COPY backend/package*.json ./
RUN npm ci
COPY backend/tsconfig.json ./tsconfig.json
COPY backend/src ./src
COPY backend/db ./db
RUN npm run build

FROM node:18-bullseye-slim AS frontend-build
WORKDIR /build/app

# Accept build args
ARG BUILD_SHA=unknown
ARG BUILD_VERSION=unknown

# Set as environment variables for Vite
ENV VITE_BUILD_SHA=${BUILD_SHA}
ENV VITE_BUILD_VERSION=${BUILD_VERSION}

COPY package*.json ./
RUN npm ci
COPY src ./src
COPY index.html ./
COPY scripts ./scripts
COPY vite.config.ts ./vite.config.ts
RUN npm run build

FROM node:18-bullseye-slim

# Accept build args again for final stage
ARG BUILD_SHA=unknown
ARG BUILD_VERSION=unknown

WORKDIR /app

# Set environment variables for backend
ENV BUILD_SHA=${BUILD_SHA}
ENV BUILD_VERSION=${BUILD_VERSION}

# Copy backend built artifacts and backend production deps
COPY --from=backend-build /build/backend/dist /app/backend/dist
COPY --from=backend-build /build/backend/node_modules /app/backend/node_modules
COPY --from=backend-build /build/backend/package.json /app/backend/package.json
# Include backend db schema for migrations
COPY --from=backend-build /build/backend/db /app/backend/db

# Copy frontend built files and node_modules (for vite preview)
COPY --from=frontend-build /build/app/dist /app/dist
COPY --from=frontend-build /build/app/node_modules /app/node_modules

# Entrypoint
# entrypoint is located in backend/ when building from repo root
COPY backend/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh && chmod +x /usr/local/bin/entrypoint.sh

VOLUME ["/app/data"]
EXPOSE 4000 5173
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
