# syntax = docker/dockerfile:1

ARG NODE_VERSION=20
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
    unzip && \
    rm -rf /var/lib/apt/lists/*

FROM base-node AS build-main

# Copy package files
COPY website/package.json website/package-lock.json* ./

RUN npm install --include=dev

COPY website/. ./

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

RUN npm install -g pm2

RUN echo 'module.exports = {\
  apps: [{\
    name: "rugplay-app",\
    script: "./build/index.js",\
    instances: "max",\
    exec_mode: "cluster",\
    env: {\
      NODE_ENV: "production",\
      PORT: 3000\
    }\
  }]\
};' > ecosystem.config.cjs

USER node
EXPOSE 3000

CMD ["pm2-runtime", "start", "ecosystem.config.cjs"]

FROM base-node AS production-websocket
WORKDIR /websocket

RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

COPY --from=build-websocket /websocket/dist ./dist
COPY --from=build-websocket /websocket/package.json ./package.json

EXPOSE 8080
CMD ["bun", "run", "dist/main.js"]