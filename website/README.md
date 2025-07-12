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
