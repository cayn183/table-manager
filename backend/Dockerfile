ARG BUILD_SHA=unknown
ARG BUILD_VERSION=unknown

FROM node:18-bullseye-slim AS backend-build
ARG BUILD_SHA
ARG BUILD_VERSION
ENV BUILD_SHA=${BUILD_SHA}
ENV BUILD_VERSION=${BUILD_VERSION}
WORKDIR /build/backend

# Build backend (install deps, build TS)
COPY backend/package*.json ./
RUN npm ci
COPY backend/tsconfig.json ./tsconfig.json
COPY backend/src ./src
COPY backend/db ./db
RUN npm run build

FROM node:18-bullseye-slim AS frontend-build
ARG BUILD_SHA
ARG BUILD_VERSION
# export Vite build env vars so `npm run build` picks them up during the frontend build
ENV VITE_BUILD_SHA=${BUILD_SHA}
ENV VITE_BUILD_VERSION=${BUILD_VERSION}
WORKDIR /build/app
COPY package*.json ./
RUN npm ci
COPY src ./src
COPY index.html ./
COPY scripts ./scripts
COPY vite.config.ts ./vite.config.ts
RUN npm run build

FROM node:18-bullseye-slim
WORKDIR /app

# Copy backend built artifacts and backend production deps
COPY --from=backend-build /build/backend/dist /app/backend/dist
COPY --from=backend-build /build/backend/node_modules /app/backend/node_modules
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
