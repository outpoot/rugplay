# Websocket Server

This is the websocket server component of Rugplay, built with [Bun](https://bun.sh) - a fast all-in-one JavaScript runtime.

## Prerequisites

- [Bun](https://bun.sh) (v1.2.11 or later)
- [Redis](https://redis.io/downloads/) running in the background

## Development

### Initial Setup

```bash
bun install
```

### Running the Server

```bash
bun run src/main.ts
```

## Production

For production deployment, you do not need to start the WebSocket server separately. Simply run `build.sh` in the main directory, and the WebSocket server will be included as part of the deployment process.

## Notes

- This project was created using `bun init` in bun v1.2.11
- The websocket server handles real-time updates for the trading platform
- Make sure Redis is running before starting the server
