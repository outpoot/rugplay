# syntax = docker/dockerfile:1

ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-slim AS base-node
WORKDIR /app
ENV NODE_ENV="production"

# Install system dependencies for building native modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    node-gyp \
    pkg-config \
    python-is-python3 \
    curl \
    ca-certificates \
    unzip && \
    rm -rf /var/lib/apt/lists/*

FROM base-node AS build-main

# Copy package files
COPY website/package.json website/package-lock.json* ./

RUN npm install

# Copy source files
COPY website/. ./

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev

FROM base-node AS build-websocket
WORKDIR /websocket

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Copy websocket package files
COPY website/websocket/package.json website/websocket/bun.lock* ./
COPY website/websocket/tsconfig.json ./

# Install dependencies
RUN bun install

# Copy websocket source
COPY website/websocket/src ./src/

# Build websocket
RUN bun build src/main.ts --outdir dist --target bun

FROM base-node AS production-main

# Copy built application from build stage
COPY --from=build-main --chown=node:node /app/build ./build
COPY --from=build-main --chown=node:node /app/node_modules ./node_modules
COPY --from=build-main --chown=node:node /app/package.json ./package.json

# Copy cluster server
COPY cluster-server.js ./cluster-server.js

USER node
EXPOSE 3000

# Use cluster server for better performance
CMD ["node", "cluster-server.js"]

FROM base-node AS production-websocket
WORKDIR /websocket

# Install Bun in production stage
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Copy built websocket from build stage
COPY --from=build-websocket /websocket/node_modules ./node_modules
COPY --from=build-websocket /websocket/dist ./dist
COPY --from=build-websocket /websocket/package.json ./package.json

USER node
EXPOSE 8080
CMD ["bun", "run", "dist/main.js"]