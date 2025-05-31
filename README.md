# Rugplay

A realistic cryptocurrency trading simulation platform built with SvelteKit and Svelte 5, focusing on decentralized exchange mechanics and the inherent risks of "rug pulls."

## Features

- **Coin Creation**: Create simulated cryptocurrencies with customizable parameters
- **Liquidity Pools**: AMM-based trading with realistic price mechanics and slippage
- **Trading**: Buy/sell coins against base currency (*BUSS) with supply/demand pricing
- **Rug Pull Simulation**: Experience realistic market crashes when large holders sell
- **Portfolio Tracking**: Monitor holdings and transaction history
- **Real-time Updates**: WebSocket-powered live price feeds and trade notifications
- **Prediction Markets**: "Hopium" betting system for market predictions
- **Gambling**: Coinflip and slots games
- **Leaderboards**: Track top performers

## Tech Stack

- **Frontend**: SvelteKit + Svelte 5 with runes
- **Backend**: Node.js API routes
- **WebSocket**: Bun-based real-time server
- **Database**: PostgreSQL with Drizzle ORM
- **Cache**: Redis for real-time messaging
- **Storage**: AWS S3/Backblaze B2 compatible
- **Auth**: Better Auth with Google OAuth
- **UI**: ShadCN UI components + Tailwind CSS

## Pre-Deployment Checklist

Before running on your Linux machine, ensure:

- [ ] **Docker & Docker Compose installed**: `docker --version && docker compose version`
- [ ] **Ports available**: 3002, 8081, 5432, 6379 are not in use
- [ ] **Git access**: Repository is cloned with all files
- [ ] **Environment configured**: `website/.env` file created from `website/.env.example`
- [ ] **Permissions set**: `chmod +x build.sh` executed
- [ ] **Minimum system requirements**: 2GB RAM, 10GB disk space
- [ ] **Clothing**: Thigh Highs, and a crop top.
### Essential Environment Variables

The following must be configured in `website/.env`:

```bash
# Required for database connection
DATABASE_URL=postgresql://rugplay_user:your_secure_password@postgres:5432/rugplay
POSTGRES_USER=rugplay_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=rugplay

# Required for real-time features
REDIS_URL=redis://redis:6379

# Required for authentication (generate a 32+ character random string)
PRIVATE_BETTER_AUTH_SECRET=your_super_secret_auth_key_minimum_32_characters
PUBLIC_BETTER_AUTH_URL=http://localhost:3002
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Git

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd rugplay
   ```

2. **Configure environment**:
   ```bash
   cp website/.env.example website/.env
   # Edit website/.env with your actual values (see Configuration section)
   ```

3. **Deploy**:
   ```bash
   chmod +x build.sh
   ./build.sh
   ```

The application will be available at:
- **Main App**: http://localhost:3002
- **WebSocket**: http://localhost:8081
- **Database**: localhost:5432
- **Redis**: localhost:6379

## Configuration

### Required Environment Variables

Copy `website/.env.example` to `website/.env` and configure:

```bash
# Database Configuration
DATABASE_URL=postgresql://rugplay_user:your_secure_password@postgres:5432/rugplay
POSTGRES_USER=rugplay_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=rugplay

# Redis Configuration
REDIS_URL=redis://redis:6379

# Authentication
PRIVATE_BETTER_AUTH_SECRET=your_super_secret_auth_key_minimum_32_chars
PUBLIC_BETTER_AUTH_URL=http://localhost:3002
```

### Optional Environment Variables

```bash
# Google OAuth (for social login)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# AWS S3/Backblaze B2 Storage (for file uploads)
PRIVATE_B2_KEY_ID=your_b2_key_id
PRIVATE_B2_APP_KEY=your_b2_app_key
PUBLIC_B2_BUCKET=your_bucket_name
PUBLIC_B2_ENDPOINT=https://s3.us-west-002.backblazeb2.com
PUBLIC_B2_REGION=us-west-002

# OpenAI (for AI features)
OPENAI_API_KEY=your_openai_api_key

# Application Settings
NODE_ENV=production
PORT=3000
```

## Architecture

### Services

- **app**: Main SvelteKit application (port 3002)
- **websocket**: Bun-based WebSocket server for real-time features (port 8081)
- **postgres**: PostgreSQL database with pgvector extension
- **redis**: Redis for caching and pub/sub messaging

### Key Components

- **AMM Trading**: Automated Market Maker with constant product formula (x*y=k)
- **Real-time Price Updates**: WebSocket broadcasting for live price feeds
- **Comment System**: Real-time coin discussions
- **Prediction Markets**: AI-resolved betting on future events
- **Portfolio Management**: Track holdings across multiple coins
- **Admin Panel**: Manage promo codes and system settings

## Development

### Local Development

```bash
# Start only database and redis
docker compose up -d postgres redis

# Install dependencies and run main app
cd website
npm install
npm run dev

# Run websocket server (in separate terminal)
cd website/websocket
bun install
bun run src/main.ts
```

### Database Management

```bash
# Run migrations
docker compose exec app npm run db:migrate

# Open Drizzle Studio
docker compose exec app npm run db:studio

# Push schema changes
docker compose exec app npm run db:push
```

## Deployment Commands

### Manual Deployment

```bash
# Build and start all services
docker compose build --no-cache
docker compose up -d

# Check service status
docker compose ps

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f app
docker compose logs -f websocket
```

### Maintenance

```bash
# Restart all services
docker compose restart

# Stop services
docker compose down

# Clean rebuild (removes volumes - WARNING: deletes data)
docker compose down --volumes --remove-orphans
docker compose build --no-cache
docker compose up -d

# Update and redeploy
git pull
./build.sh
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3002, 8081, 5432, 6379 are available
2. **Database connection**: Check DATABASE_URL format and postgres service status
3. **WebSocket issues**: Verify REDIS_URL and redis service connectivity
4. **File uploads**: Confirm S3/B2 credentials and bucket permissions

### Health Checks

```bash
# Check all container status
docker compose ps

# Test main app
curl http://localhost:3002

# Test websocket health
curl http://localhost:8081/health

# Check database connectivity
docker compose exec postgres pg_isready -U rugplay_user

# Check redis connectivity
docker compose exec redis redis-cli ping
```

### Log Analysis

```bash
# Follow all logs
docker compose logs -f

# Application errors
docker compose logs app | grep -i error

# WebSocket logs
docker compose logs websocket

# Database logs
docker compose logs postgres
```

## Production Considerations

### Security

- [ ] Change all default passwords and secrets
- [ ] Use strong PRIVATE_BETTER_AUTH_SECRET (minimum 32 characters)
- [ ] Configure firewall rules for exposed ports
- [ ] Use HTTPS in production (reverse proxy recommended)
- [ ] Rotate API keys and database credentials regularly

### Performance

- [ ] Configure PostgreSQL for your hardware
- [ ] Set up Redis persistence if needed
- [ ] Monitor container resource usage
- [ ] Configure log rotation
- [ ] Set up database connection pooling

### Monitoring

- [ ] Set up health check endpoints
- [ ] Configure log aggregation
- [ ] Monitor database performance
- [ ] Track WebSocket connection metrics
- [ ] Set up alerts for service failures

### Backup Strategy

- [ ] Database backups: `pg_dump` scheduled backups
- [ ] Redis persistence: Configure RDB snapshots
- [ ] File storage: S3/B2 versioning and backup
- [ ] Configuration: Version control for .env files (encrypted)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker locally
5. Submit a pull request

## License

[Add your license here]

## Support

For issues and questions:
- Open GitHub issues for bugs
- Check logs first: `docker compose logs -f`
- Verify environment configuration
- Test with clean rebuild if needed
