import { ServerWebSocket } from 'bun';
import Redis from 'ioredis';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// --- Configuration & Setup ---
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../../.env') });

const PORT = Number(process.env.PORT) || 8080;
const REDIS_URL = process.env.REDIS_URL;
const HEARTBEAT_INTERVAL = 30_000;

if (!REDIS_URL) {
    console.error("❌ REDIS_URL is not defined.");
    process.exit(1);
}

// --- Types ---
interface WebSocketData {
    coinSymbol?: string;
    userId?: string;
    lastActivity: number;
}

/**
 * WebSocketManager handles the orchestration of Redis messages 
 * and client socket lifecycles.
 */
class WebSocketManager {
    private redis: Redis;
    // Maps for targeted messaging
    private coinSockets = new Map<string, Set<ServerWebSocket<WebSocketData>>>();
    private userSockets = new Map<string, Set<ServerWebSocket<WebSocketData>>>();
    // Fast access for global broadcasts
    private allSockets = new Set<ServerWebSocket<WebSocketData>>();

    constructor(redisUrl: string) {
        this.redis = new Redis(redisUrl, { 
            enableReadyCheck: true,
            maxRetriesPerRequest: null 
        });
        this.setupRedisListeners();
    }

    private setupRedisListeners() {
        this.redis.on('error', (err) => console.error('Data Layer Error:', err));
        
        this.redis.on('connect', () => {
            console.log('🔗 Connected to Redis');
            // Patterns for dynamic topics
            this.redis.psubscribe('comments:*', 'prices:*', 'notifications:*');
            // Static channels
            this.redis.subscribe('trades:all', 'trades:large', 'arcade:activity');
        });

        this.redis.on('pmessage', (pattern, channel, msg) => this.handlePubSub(channel, msg));
        this.redis.on('message', (channel, msg) => this.handlePubSub(channel, msg));
    }

    /**
     * Unified message router for Redis events
     */
    private handlePubSub(channel: string, msg: string) {
        try {
            // 1. Specific Coin Updates (Comments/Prices)
            if (channel.startsWith('comments:') || channel.startsWith('prices:')) {
                const [prefix, symbol] = channel.split(':');
                const message = prefix === 'prices' 
                    ? JSON.stringify({ type: 'price_update', coinSymbol: symbol, ...JSON.parse(msg) })
                    : msg;
                
                this.broadcastToSet(this.coinSockets.get(symbol), message);
            } 
            
            // 2. User Notifications
            else if (channel.startsWith('notifications:')) {
                const userId = channel.split(':')[1];
                this.broadcastToSet(this.userSockets.get(userId), msg);
            }

            // 3. Trade Broadcasts (Global)
            else if (channel.startsWith('trades:')) {
                this.broadcastToAll(msg);
            }

            // 4. Arcade Activity (Global formatted)
            else if (channel === 'arcade:activity') {
                const eventMsg = JSON.stringify({ type: 'arcade_activity', ...JSON.parse(msg) });
                this.broadcastToAll(eventMsg);
            }
        } catch (err) {
            console.error(`Malformed message on ${channel}:`, err);
        }
    }

    // --- Helper Methods ---

    private broadcastToSet(set: Set<ServerWebSocket<WebSocketData>> | undefined, msg: string) {
        if (!set) return;
        for (const ws of set) {
            if (ws.readyState === 1) ws.send(msg);
        }
    }

    private broadcastToAll(msg: string) {
        for (const ws of this.allSockets) {
            if (ws.readyState === 1) ws.send(msg);
        }
    }

    public registerSocket(ws: ServerWebSocket<WebSocketData>) {
        this.allSockets.add(ws);
    }

    public unregisterSocket(ws: ServerWebSocket<WebSocketData>) {
        this.allSockets.delete(ws);
        if (ws.data.coinSymbol) this.removeFromMap(this.coinSockets, ws.data.coinSymbol, ws);
        if (ws.data.userId) this.removeFromMap(this.userSockets, ws.data.userId, ws);
    }

    public subscribeToCoin(ws: ServerWebSocket<WebSocketData>, symbol: string) {
        if (ws.data.coinSymbol) this.removeFromMap(this.coinSockets, ws.data.coinSymbol, ws);
        ws.data.coinSymbol = symbol;
        this.addToMap(this.coinSockets, symbol, ws);
    }

    public subscribeToUser(ws: ServerWebSocket<WebSocketData>, userId: string) {
        if (ws.data.userId) this.removeFromMap(this.userSockets, ws.data.userId, ws);
        ws.data.userId = userId;
        this.addToMap(this.userSockets, userId, ws);
    }

    private addToMap(map: Map<string, Set<ServerWebSocket<WebSocketData>>>, key: string, ws: ServerWebSocket<WebSocketData>) {
        if (!map.has(key)) map.set(key, new Set());
        map.get(key)!.add(ws);
    }

    private removeFromMap(map: Map<string, Set<ServerWebSocket<WebSocketData>>>, key: string, ws: ServerWebSocket<WebSocketData>) {
        const set = map.get(key);
        if (set) {
            set.delete(ws);
            if (set.size === 0) map.delete(key);
        }
    }

    public getActiveCount() {
        return this.allSockets.size;
    }

    public cleanupStale() {
        const now = Date.now();
        for (const ws of this.allSockets) {
            if (now - ws.data.lastActivity > HEARTBEAT_INTERVAL * 2) {
                ws.terminate();
            }
        }
    }
}

// --- Server Initialization ---

const manager = new WebSocketManager(REDIS_URL);

const server = Bun.serve<WebSocketData>({
    port: PORT,
    fetch(req, server) {
        // Health Check
        if (new URL(req.url).pathname === '/health') {
            return Response.json({
                status: 'ok',
                connections: manager.getActiveCount(),
                uptime: process.uptime()
            });
        }

        const upgraded = server.upgrade(req, {
            data: { lastActivity: Date.now() }
        });
        return upgraded ? undefined : new Response("Upgrade Failed", { status: 400 });
    },
    websocket: {
        open(ws) {
            manager.registerSocket(ws);
            // Internal Bun ping/pong is handled automatically if enabled, 
            // but we'll use a manual interval for extra stability.
        },
        message(ws, message) {
            ws.data.lastActivity = Date.now();
            try {
                const payload = JSON.parse(message.toString());
                switch (payload.type) {
                    case 'set_coin':
                        if (payload.coinSymbol) manager.subscribeToCoin(ws, payload.coinSymbol);
                        break;
                    case 'set_user':
                        if (payload.userId) manager.subscribeToUser(ws, payload.userId);
                        break;
                    case 'pong':
                        // Heartbeat acknowledgement
                        break;
                }
            } catch (e) { /* Ignore invalid JSON */ }
        },
        close(ws) {
            manager.unregisterSocket(ws);
        }
    }
});

// --- Maintenance Loops ---

// Periodically ping clients and prune dead connections
setInterval(() => {
    server.publish("heartbeat", JSON.stringify({ type: 'ping' })); // Using Bun's native pub/sub if needed
    manager.cleanupStale();
}, HEARTBEAT_INTERVAL);

console.log(`🚀 Server listening on port ${PORT}`);

// --- Graceful Shutdown ---
process.on('SIGINT', () => {
    console.log('Shutting down...');
    server.stop();
    process.exit(0);
});
