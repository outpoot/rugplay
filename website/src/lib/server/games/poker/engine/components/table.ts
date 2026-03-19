import { maxPlayers as max } from "./constants";
import type { PokerTable, PokerPlayer, PublicPokerState } from "./types";

export function generateCode(): string {
    const bytes = new Uint8Array(2);
    crypto.getRandomValues(bytes);
    return ((bytes[0] * 256 + bytes[1]) % 10000).toString().padStart(4, "0");
}

export function generateTableId(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function makePlayer(
    userId: number, username: string, avatar: string | null,
    chips: number, seatIndex: number,
    isSpectator: boolean = false
): PokerPlayer {
    return {
        userId, username, avatar, chips, holeCards: [],
        chipsBet: 0, currentBet: 0, folded: false, allIn: false,
        hasActed: false, alreadyBet: false,
        seatIndex, isConnected: true, lastSeen: Date.now()
        , isSpectator
    };
}

export function createTable(
    tableId: string, code: string, hostUserId: number,
    hostUsername: string, hostAvatar: string | null, buyIn: number,
    maxPlayers?: number
): PokerTable {
    const smallBlind = Math.max(1, Math.floor(buyIn / 100));
    const boundedMaxPlayers = Math.max(2, Math.min(max, Math.floor(maxPlayers ?? max)));
    return {
        tableId, code, hostUserId, buyIn,
        blinds: { small: smallBlind, big: smallBlind * 2 },
        maxPlayers: boundedMaxPlayers,
        players: [makePlayer(hostUserId, hostUsername, hostAvatar, buyIn, 0, false)],
        deck: [], communityCards: [], pot: 0,
        callAmount: 0, lastRaiseAmount: 0, sidepots: [],
        phase: "waiting", dealerIndex: 0, activePlayerIndex: -1,
        lastActivity: Date.now(), handNumber: 0, winners: null
    };
}

export function addPlayer(
    table: PokerTable, userId: number,
    username: string, avatar: string | null, chips: number,
    isSpectator: boolean = false
): void {
    const usedSeats = new Set(table.players.map(p => p.seatIndex));
    let seat = 0;
    while (usedSeats.has(seat)) seat++;
    table.players.push(makePlayer(userId, username, avatar, chips, seat, isSpectator));
    table.lastActivity = Date.now();
}

export function removePlayer(table: PokerTable, userId: number): PokerPlayer | null {
    const idx = table.players.findIndex(p => p.userId === userId);
    if (idx === -1) return null;
    const [player] = table.players.splice(idx, 1);
    if (table.hostUserId === userId && table.players.length > 0) {
        // Prefer assigning a new host who is not a spectator; otherwise fall back to first player
        const newHost = table.players.find(p => !p.isSpectator) ?? table.players[0];
        if (newHost) table.hostUserId = newHost.userId;
    }
    table.lastActivity = Date.now();
    return player;
}

export function build(table: PokerTable, forUserId: number): PublicPokerState {
    const isShowdown = table.phase === "showdown";
    // Enforce a fixed minimum raise floor of 10 plus the usual previous-raise/blind logic
    const minRaise = Math.max(table.lastRaiseAmount || 0, table.blinds.big, 10);
    return {
        tableId: table.tableId, code: table.code, hostUserId: table.hostUserId,
        buyIn: table.buyIn, blinds: table.blinds, maxPlayers: table.maxPlayers,
        phase: table.phase, communityCards: table.communityCards,
        pot: table.pot, currentBet: table.callAmount, minRaise,
        sidepots: table.sidepots, dealerIndex: table.dealerIndex,
        activePlayerIndex: table.activePlayerIndex,
        handNumber: table.handNumber, winners: table.winners,
        players: table.players.map(p => ({
            userId: p.userId, username: p.username, avatar: p.avatar, chips: p.chips,
            holeCards: p.userId === forUserId ? p.holeCards : (isShowdown && !p.folded ? p.holeCards : []),
            cardCount: p.holeCards.length,
            currentBet: p.currentBet,
            totalBet: p.chipsBet,
            folded: p.folded, allIn: p.allIn, hasActed: p.hasActed,
            seatIndex: p.seatIndex, isConnected: p.isConnected,
            isSpectator: p.isSpectator ?? false
        })),
        yourIndex: table.players.findIndex(p => p.userId === forUserId)
    };
}
