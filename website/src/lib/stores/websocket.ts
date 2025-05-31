import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { PUBLIC_WEBSOCKET_URL } from '$env/static/public';

export interface LiveTrade {
    type: 'BUY' | 'SELL';
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

async function loadInitialTrades(): Promise<void> {
    if (!browser) return;

    if (!hasLoadedInitialTrades) {
        isLoadingTrades.set(true);
    }

    try {
        const [largeTradesResponse, allTradesResponse] = await Promise.all([
            fetch('/api/trades/recent?limit=5&minValue=1000'),
            fetch('/api/trades/recent?limit=100')
        ]);

        if (largeTradesResponse.ok) {
            const { trades } = await largeTradesResponse.json();
            liveTradesStore.set(trades);
        }

        if (allTradesResponse.ok) {
            const { trades } = await allTradesResponse.json();
            allTradesStore.set(trades);
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

export const websocketController = {
    connect,
    disconnect,
    setCoin,
    subscribeToComments,
    unsubscribeFromComments,
    subscribeToPriceUpdates,
    unsubscribeFromPriceUpdates,
    loadInitialTrades
};