# syntax = docker/dockerfile:1
ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-slim AS base-node
WORKDIR /app
ENV NODE_ENV="production"
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    node-gyp \
    pkg-config \
    python-is-python3 \
    curl \
    ca-certificates \
    unzip \
    libc6 \
    && rm -rf /var/lib/apt/lists/*

FROM base-node AS build-main
# Copy package files
COPY website/package.json website/package-lock.json* ./

# Install dependencies with platform-specific binaries
RUN npm ci --include=dev --platform=linux --arch=x64

# Copy the rest of the application
COPY website/. .

# Create .svelte-kit directory if it doesn't exist
RUN mkdir -p .svelte-kit

# Generate SvelteKit types and build

RUN npm run build

FROM base-node AS build-websocket
WORKDIR /websocket
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"
COPY website/websocket/package.json website/websocket/bun.lock* ./
COPY website/websocket/tsconfig.json ./
RUN bun install
COPY website/websocket/src ./src/
RUN bun build src/main.ts --outdir dist --target bun

FROM base-node AS production-main
COPY --from=build-main --chown=node:node /app/build ./build
COPY --from=build-main --chown=node:node /app/node_modules ./node_modules
COPY --from=build-main --chown=node:node /app/package.json ./package.json
USER node
EXPOSE 3000
CMD ["node", "build"]

FROM oven/bun:1 AS production-websocket
WORKDIR /websocket
COPY --from=build-websocket --chown=bun:bun /websocket/dist ./dist
COPY --from=build-websocket --chown=bun:bun /websocket/package.json ./package.json
USER bun
EXPOSE 8080
CMD ["bun", "run", "dist/main.js"]