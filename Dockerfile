# Frontend-only Dockerfile for Table-Manager
# Repository: Cayn183/table-manager

# Build stage
FROM node:18-alpine AS build
WORKDIR /build

# Build args for version info
ARG BUILD_SHA=unknown
ARG BUILD_VERSION=unknown
ENV VITE_BUILD_SHA=${BUILD_SHA}
ENV VITE_BUILD_VERSION=${BUILD_VERSION}

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY src ./src
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY scripts ./scripts
RUN npm run build

# Production stage - minimal image
FROM node:18-alpine
WORKDIR /app

# Copy built files and production dependencies
COPY --from=build /build/dist ./dist
COPY --from=build /build/node_modules ./node_modules
COPY --from=build /build/package.json ./package.json

# Expose Vite preview port
EXPOSE 5173

# Start production preview server
CMD ["npm", "run", "start"]