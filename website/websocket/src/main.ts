import type { ServerWebSocket } from 'bun';
import Redis from 'ioredis';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../../.env') });

if (!process.env.REDIS_URL) {
	console.error("REDIS_URL is not defined in environment variables.");
	process.exit(1);
}

const redis = new Redis(process.env.REDIS_URL);

const HEARTBEAT_INTERVAL = 30_000;

type WebSocketData = {
	coinSymbol?: string;
	userId?: string;
	lastActivity: number;
};

const coinSockets = new Map<string, Set<ServerWebSocket<WebSocketData>>>();
const userSockets = new Map<string, Set<ServerWebSocket<WebSocketData>>>();
const pingIntervals = new WeakMap<ServerWebSocket<WebSocketData>, number>();

redis.on('error', (err) => console.error('Redis Client Error', err));

redis.on('connect', () => {
	redis.psubscribe('comments:*', 'prices:*', 'notifications:*', (err, count) => {
		if (err) console.error("Failed to psubscribe to patterns", err);
		else console.log(`Successfully psubscribed to patterns. Active psubscriptions: ${count}`);
	});

	redis.subscribe('trades:all', 'trades:large', 'arcade:activity', (err, count) => {
		if (err) console.error("Failed to subscribe to channels", err);
		else console.log(`Successfully subscribed to channels. Active subscriptions: ${count}`);
	});
});

redis.on('pmessage', (pattern, channel, msg) => {
	console.log(`[Redis pmessage RECEIVED] Pattern: "${pattern}", Channel: "${channel}", Message: "${msg}"`);
	try {
		if (channel.startsWith('comments:')) {
			const coinSymbol = channel.substring('comments:'.length);
			const sockets = coinSockets.get(coinSymbol);
			if (sockets) {
				for (const ws of sockets) {
					if (ws.readyState === 1) {
						ws.send(msg);
					}
				}
			}
		} else if (channel.startsWith('prices:')) {
			const coinSymbol = channel.substring('prices:'.length);
			const sockets = coinSockets.get(coinSymbol);
			console.log(`Received price update for ${coinSymbol}:`, msg);
			if (sockets) {
				const priceData = JSON.parse(msg);
				const priceMessage = JSON.stringify({
					type: 'price_update',
					coinSymbol,
					...priceData
				});

				for (const ws of sockets) {
					if (ws.readyState === 1) {
						ws.send(priceMessage);
					}
				}
			}
		} else if (channel.startsWith('notifications:')) {
			const userId = channel.substring('notifications:'.length);
			const sockets = userSockets.get(userId);
			console.log(`Received notification for user ${userId}:`, msg);
			if (sockets) {
				for (const ws of sockets) {
					if (ws.readyState === 1) {
						ws.send(msg);
					}
				}
			}
		}
	} catch (error) {
		console.error('Error processing Redis pmessage:', error, `Pattern: ${pattern}, Channel: ${channel}, Raw message: ${msg}`);
	}
});

redis.on('message', (channel, msg) => {
	try {
		if (channel === 'trades:all' || channel === 'trades:large') {
			const tradeData = JSON.parse(msg);

			const tradeMessage = JSON.stringify(tradeData);

			for (const [, sockets] of coinSockets.entries()) {
				for (const ws of sockets) {
					if (ws.readyState === 1) {
						ws.send(tradeMessage);
					}
				}
			}
		} else if (channel === 'arcade:activity') {
			const eventData = JSON.parse(msg);
			const eventMessage = JSON.stringify({
				type: 'arcade_activity',
				...eventData
			});

			const allSockets = new Set<ServerWebSocket<WebSocketData>>();

			for (const [, sockets] of coinSockets.entries()) {
				for (const ws of sockets) {
					allSockets.add(ws);
				}
			}

			for (const [, sockets] of userSockets.entries()) {
				for (const ws of sockets) {
					allSockets.add(ws);
				}
			}

			for (const ws of allSockets) {
				if (ws.readyState === 1) {
					ws.send(eventMessage);
				}
			}
		}
	} catch (error) {
		console.error('Error processing Redis message:', error, `Channel: ${channel}, Raw message: ${msg}`);
	}
});

function handleSetCoin(ws: ServerWebSocket<WebSocketData>, coinSymbol: string) {
	if (ws.data.coinSymbol) {
		const prev = coinSockets.get(ws.data.coinSymbol);
		if (prev) {
			prev.delete(ws);
			if (prev.size === 0) {
				coinSockets.delete(ws.data.coinSymbol);
			}
		}
	}

	ws.data.coinSymbol = coinSymbol;

	if (!coinSockets.has(coinSymbol)) {
		coinSockets.set(coinSymbol, new Set([ws]));
	} else {
		coinSockets.get(coinSymbol)!.add(ws);
	}
}

function handleSetUser(ws: ServerWebSocket<WebSocketData>, userId: string) {
	if (ws.data.userId) {
		const prev = userSockets.get(ws.data.userId);
		if (prev) {
			prev.delete(ws);
			if (prev.size === 0) {
				userSockets.delete(ws.data.userId);
			}
		}
	}

	ws.data.userId = userId;

	if (!userSockets.has(userId)) {
		userSockets.set(userId, new Set([ws]));
	} else {
		userSockets.get(userId)!.add(ws);
	}
}

function checkConnections() {
	const now = Date.now();
	for (const [coinSymbol, sockets] of coinSockets.entries()) {
		const staleSockets = Array.from(sockets).filter(ws => now - ws.data.lastActivity > HEARTBEAT_INTERVAL * 2);
		for (const socket of staleSockets) {
			socket.terminate();
		}
	}
}

setInterval(checkConnections, HEARTBEAT_INTERVAL);

const server = Bun.serve<WebSocketData, undefined>({
	port: Number(process.env.PORT) || 8080,

	fetch(request, server) {
		const url = new URL(request.url);

		if (url.pathname === '/health') {
			return new Response(JSON.stringify({
				status: 'ok',
				timestamp: new Date().toISOString(),
				activeConnections: Array.from(coinSockets.values()).reduce((total, set) => total + set.size, 0)
			}), {
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const upgraded = server.upgrade(request, {
			data: {
				coinSymbol: undefined,
				lastActivity: Date.now()
			}
		});

		return upgraded ? undefined : new Response('Upgrade failed', { status: 500 });
	},

	websocket: {
		message(ws, msg) {
			ws.data.lastActivity = Date.now();

			if (typeof msg !== 'string') return;

			try {
				const data = JSON.parse(msg) as {
					type: string;
					coinSymbol?: string;
					userId?: string;
				};

				if (data.type === 'set_coin' && data.coinSymbol) {
					handleSetCoin(ws, data.coinSymbol);
				} else if (data.type === 'set_user' && data.userId) {
					handleSetUser(ws, data.userId);
				} else if (data.type === 'pong') {
					ws.data.lastActivity = Date.now();
				}
			} catch (error) {
				console.error('Message parsing error:', error);
			}
		},
		open(ws) {
			const interval = setInterval(() => {
				if (ws.readyState === 1) {
					ws.data.lastActivity = Date.now();
					ws.send(JSON.stringify({ type: 'ping' }));
				} else {
					clearInterval(interval);
				}
			}, HEARTBEAT_INTERVAL);

			pingIntervals.set(ws, interval);
		}, close(ws) {
			const interval = pingIntervals.get(ws);
			if (interval) {
				clearInterval(interval);
				pingIntervals.delete(ws);
			}

			if (ws.data.coinSymbol) {
				const sockets = coinSockets.get(ws.data.coinSymbol);
				if (sockets) {
					sockets.delete(ws);
					if (sockets.size === 0) {
						coinSockets.delete(ws.data.coinSymbol);
					}
				}
			}

			if (ws.data.userId) {
				const sockets = userSockets.get(ws.data.userId);
				if (sockets) {
					sockets.delete(ws);
					if (sockets.size === 0) {
						userSockets.delete(ws.data.userId);
					}
				}
			}
		}
	}
});

console.log(`WebSocket server running on port ${server.port}`);
console.log('Server listening for connections...');
console.log('Health check available at: http://localhost:8080/health');
