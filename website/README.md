# Rugplay Website

This is the main website component of Rugplay, built with SvelteKit. It handles the user interface, trading functionality, and market visualization.

## Development

### Prerequisites

- Node.js (LTS version)
- Redis running in the background
- OpenRouter API key (for AI features)
- AWS S3/B2 Storage (for file uploads)

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Key variables to configure:
- `PUBLIC_BETTER_AUTH_URL`: Set to `http://localhost:3002` if you want to deploy
- `OPENROUTER_API_KEY`: Your OpenRouter API key for AI features
- AWS credentials (optional but recommended)

### Running in Development

```bash
npm install
npm run dev
```

The development server will be available at http://localhost:5173

### Building for Production

```bash
npm run build
npm run preview
```

Before deploying the Better Auth 1.7.7 upgrade, run `npm run db:migrate` from the website directory with `DATABASE_URL` set. Migration `0011_better_auth_api_key_config` adds the default API key configuration while retaining existing keys and their owners. Rebuild and replace all app replicas together, and restart any sign-ins already in progress.

### Ranked entry and arcade rounds

Entering a ranked season resets the wallet to the configured season stake and expires all open Mines and Tower rounds, including their reserved wagers. Players can settle or abort those rounds before entry. Migration `0012_arcade_wallet_generation` adds the wallet generation used to reject settlements from an earlier wallet.

For rollout, pause ranked entries and new Mines and Tower rounds, keep the scheduler running while draining existing `mines:session:*` and `tower:session:*` keys, and stop all old API and scheduler writers before applying the migration. Start only updated writers before reopening entry and games. Smoke-test a new round and an old round across entry, and monitor expired responses and settlement errors. For rollback, pause entry and arcade settlement while replacing writers, retain the additive column, and do not reopen ranked entry while any writer lacks the generation guard. Redis token claims and PostgreSQL credits are not atomic; a separate recovery design is still needed for failures between those operations.

## Project Structure

- `src/routes/`: Page components and API endpoints
- `src/lib/`: Shared components and utilities
- `src/lib/components/`: Reusable UI components
- `static/`: Static assets (images, fonts, etc.)

## Features

- User authentication and profile management
- Real-time trading interface
- Market visualization with Treemap
- Leaderboards and statistics
- Integration with websocket server for live updates

## Contributing

1. Make sure Redis is running
2. Start the websocket server (see `websocket/README.md`)
3. Run the website in development mode
4. Make your changes
5. Test thoroughly
6. Submit a pull request
