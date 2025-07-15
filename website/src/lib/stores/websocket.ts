import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { PUBLIC_WEBSOCKET_URL } from '$env/static/public';
import { NOTIFICATIONS, UNREAD_COUNT } from './notifications';
import { USER_DATA } from './user-data';
import { toast } from 'svelte-sonner';
import { goto } from '$app/navigation';

export interface LiveTrade {
    type: 'BUY' | 'SELL' | 'TRANSFER_IN' | 'TRANSFER_OUT';
    username: string;
    amount: number;
    coinSymbol: string;
    coinName?: string;
    coinIcon?: string;
    totalValue: number;
    price: number;
    timestamp: number;
    userId: string;
    userImage?: string;
}

export interface PriceUpdate {
    coinSymbol: string;
    currentPrice: number;
    marketCap: number;
    change24h: number;
    volume24h: number;
    poolCoinAmount?: number;
    poolBaseCurrencyAmount?: number;
}

// Constants
const WEBSOCKET_URL = PUBLIC_WEBSOCKET_URL;
const RECONNECT_DELAY = 5000;
const MAX_LIVE_TRADES = 5;
const MAX_ALL_TRADES = 100;

// WebSocket state
let socket: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let activeCoin: string = '@global';

// Stores
export const liveTradesStore = writable<LiveTrade[]>([]);
export const allTradesStore = writable<LiveTrade[]>([]);
export const isConnectedStore = writable<boolean>(false);
export const isLoadingTrades = writable<boolean>(false);
export const priceUpdatesStore = writable<Record<string, PriceUpdate>>({});

let hasLoadedInitialTrades = false;

// Comment callbacks
const commentSubscriptions = new Map<string, (message: any) => void>();

// Price update callbacks
const priceUpdateSubscriptions = new Map<string, (priceUpdate: PriceUpdate) => void>();

export async function loadInitialTrades(mode: 'preview' | 'expanded' = 'preview'): Promise<void> {
    if (!browser) return;

    if (!hasLoadedInitialTrades) {
        isLoadingTrades.set(true);
    }

    try {
        const params = new URLSearchParams();

        if (mode === 'preview') {
            params.set('limit', '5');
            params.set('minValue', '1000');
        } else {
            params.set('limit', '100');
        }

        const response = await fetch(`/api/trades/recent?${params.toString()}`);

        if (response.ok) {
            const { trades } = await response.json();

            if (mode === 'preview') {
                liveTradesStore.set(trades);
            } else {
                allTradesStore.set(trades);
            }
        }

        hasLoadedInitialTrades = true;
    } catch (error) {
        console.error('Failed to load initial trades:', error);
    } finally {
        isLoadingTrades.set(false);
    }
}

function clearReconnectTimer(): void {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
}

function scheduleReconnect(): void {
    clearReconnectTimer();
    reconnectTimer = setTimeout(connect, RECONNECT_DELAY);
}

function isSocketConnected(): boolean {
    return socket?.readyState === WebSocket.OPEN;
}

function isSocketConnecting(): boolean {
    return socket?.readyState === WebSocket.CONNECTING;
}

function sendMessage(message: object): void {
    if (isSocketConnected()) {
        socket!.send(JSON.stringify(message));
    }
}

function subscribeToChannels(): void {
    sendMessage({ type: 'subscribe', channel: 'trades:all' });
    sendMessage({ type: 'subscribe', channel: 'trades:large' });
    sendMessage({ type: 'set_coin', coinSymbol: activeCoin });
}

function handleTradeMessage(message: any): void {
    const trade: LiveTrade = {
        ...message.data,
        timestamp: Number(message.data.timestamp)
    };

    if (message.type === 'live-trade') {
        liveTradesStore.update(trades => [trade, ...trades.slice(0, MAX_LIVE_TRADES - 1)]);
    } else if (message.type === 'all-trades') {
        allTradesStore.update(trades => [trade, ...trades.slice(0, MAX_ALL_TRADES - 1)]);
    }
}

function handleCommentMessage(message: any): void {
    const callback = commentSubscriptions.get(activeCoin);
    if (callback) {
        callback(message);
    }
}

function handlePriceUpdateMessage(message: any): void {
    const priceUpdate: PriceUpdate = {
        coinSymbol: message.coinSymbol,
        currentPrice: message.currentPrice,
        marketCap: message.marketCap,
        change24h: message.change24h,
        volume24h: message.volume24h,
        poolCoinAmount: message.poolCoinAmount,
        poolBaseCurrencyAmount: message.poolBaseCurrencyAmount
    };

    priceUpdatesStore.update(updates => ({
        ...updates,
        [message.coinSymbol]: priceUpdate
    }));

    // Call specific coin callback if subscribed
    const callback = priceUpdateSubscriptions.get(message.coinSymbol);
    if (callback) {
        callback(priceUpdate);
    }
}

function handleWebSocketMessage(event: MessageEvent): void {
    try {
        const message = JSON.parse(event.data);

        switch (message.type) {
            case 'live-trade':
            case 'all-trades':
                handleTradeMessage(message);
                break;

            case 'price_update':
                handlePriceUpdateMessage(message);
                break;

            case 'ping':
                sendMessage({ type: 'pong' });
                break;

            case 'new_comment':
            case 'comment_liked':
                handleCommentMessage(message);
                break;

            case 'notification':
                const notification = {
                    id: Date.now(),
                    type: message.notificationType,
                    title: message.title,
                    message: message.message,
                    link: message.link,
                    isRead: false,
                    createdAt: message.timestamp,
                    data: message.amount ? { amount: message.amount } : null
                };

                NOTIFICATIONS.update(notifications => [notification, ...notifications]);
                UNREAD_COUNT.update(count => count + 1);

                toast.success(message.title, {
                    description: message.message,
                    action: {
                        label: 'View',
                        onClick: () => {
                            goto('/notifications');
                        }
                    },
                    duration: 5000
                });
                break;

            default:
                console.log('Unhandled message type:', message.type, message);
        }
    } catch (error) {
        console.error('Failed to process WebSocket message:', error);
    }
}

function connect(): void {
    if (!browser) return;

    // Don't connect if already connected or connecting
    if (isSocketConnected() || isSocketConnecting()) {
        return;
    }

    clearReconnectTimer();

    socket = new WebSocket(WEBSOCKET_URL);

    loadInitialTrades();

    socket.onopen = () => {
        console.log('WebSocket connected');
        isConnectedStore.set(true);
        clearReconnectTimer();
        subscribeToChannels();
        
        USER_DATA.subscribe(user => {
            if (user?.id && isSocketConnected()) {
                console.log('Setting user subscription for user:', user.id);
                socket!.send(JSON.stringify({
                    type: 'set_user',
                    userId: String(user.id)
                }));
            }
        })();
    };

    socket.onmessage = handleWebSocketMessage;

    socket.onclose = (event) => {
        console.log(`WebSocket disconnected. Code: ${event.code}`);
        isConnectedStore.set(false);
        socket = null;
        scheduleReconnect();
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnectedStore.set(false);
    };
}

function setCoin(coinSymbol: string): void {
    if (activeCoin !== coinSymbol && activeCoin !== '@global') {
        unsubscribeFromPriceUpdates(activeCoin);
    }

    activeCoin = coinSymbol;
    sendMessage({ type: 'set_coin', coinSymbol });
}

function disconnect(): void {
    clearReconnectTimer();

    if (socket) {
        socket.close();
        socket = null;
    }

    isConnectedStore.set(false);
}

function subscribeToComments(coinSymbol: string, callback: (message: any) => void): void {
    commentSubscriptions.set(coinSymbol, callback);
}

function unsubscribeFromComments(coinSymbol: string): void {
    commentSubscriptions.delete(coinSymbol);
}

function subscribeToPriceUpdates(coinSymbol: string, callback: (priceUpdate: PriceUpdate) => void): void {
    priceUpdateSubscriptions.set(coinSymbol, callback);
}

function unsubscribeFromPriceUpdates(coinSymbol: string): void {
    priceUpdateSubscriptions.delete(coinSymbol);
}

class WebSocketController {
    connect() {
        connect();
    }

    disconnect() {
        disconnect();
    }

    setCoin(coinSymbol: string) {
        setCoin(coinSymbol);
    }

    subscribeToComments(coinSymbol: string, callback: (message: any) => void) {
        subscribeToComments(coinSymbol, callback);
    }

    unsubscribeFromComments(coinSymbol: string) {
        unsubscribeFromComments(coinSymbol);
    }

    subscribeToPriceUpdates(coinSymbol: string, callback: (priceUpdate: PriceUpdate) => void) {
        subscribeToPriceUpdates(coinSymbol, callback);
    }

    unsubscribeFromPriceUpdates(coinSymbol: string) {
        unsubscribeFromPriceUpdates(coinSymbol);
    }

    loadInitialTrades(mode: 'preview' | 'expanded' = 'preview') {
        loadInitialTrades(mode);
    }

    setUser(userId: string) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'set_user',
                userId
            }));
        }
    }
}

// Auto-connect user when USER_DATA changes
if (typeof window !== 'undefined') {
    USER_DATA.subscribe(user => {
        if (user?.id) {
            websocketController.setUser(user.id.toString());
        }
    });
}

export const websocketController = new WebSocketController();