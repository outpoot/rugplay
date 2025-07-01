#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "🚀 Starting Rugplay [DEV] deployment..."

echo "📥 Pulling latest changes..."
git pull

echo "🔨 Building Docker images..."
docker compose -f docker-compose-dev.yml build --no-cache

echo "🛑 Stopping existing containers..."
docker compose -f docker-compose-dev.yml down --volumes --remove-orphans

echo "🏗️ Starting containers..."
docker compose -f docker-compose-dev.yml up -d

echo "⏳ Waiting for services to start..."
sleep 10

echo "🔍 Checking container status..."
docker compose ps

echo "📊 Checking service health..."
echo "Main app: http://localhost:3002"
echo "WebSocket: http://localhost:8081/health"

echo "📋 Tailing logs (press Ctrl+C to stop)..."
docker compose logs -f