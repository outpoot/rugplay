export interface Hand {
    cards: string[];
    bet: number;
    status: 'active' | 'standing' | 'bust' | 'won' | 'lost' | 'push' | 'blackjack';
    doubled: boolean;
}

export interface BlackjackSession {
    sessionToken: string;
    userId: number;
    betAmount: number;
    insuranceBet: number;
    deck: string[];
    playerHands: Hand[];
    dealerHand: string[];
    currentHandIndex: number;
    status: 'active' | 'insurance_pending' | 'done';
    startTime: number;
    lastActivity: number;
    version: number;
}

const suits = ['H', 'D', 'C', 'S'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const sessionPrefix = 'blackjack:session:';
export const sessionTtl = 1800;

export const getSessionKey = (token: string) => `${sessionPrefix}${token}`;

export function createShuffledDeck(numDecks = 6): string[] {
    const deck: string[] = [];
    for (let d = 0; d < numDecks; d++) {
        for (const suit of suits) {
            for (const rank of ranks) {
                deck.push(`${rank}${suit}`);
            }
        }
    }
    for (let i = deck.length - 1; i > 0; i--) {
        const bytes = new Uint8Array(4);
        crypto.getRandomValues(bytes);
        const rand = (bytes[0] * 16777216 + bytes[1] * 65536 + bytes[2] * 256 + bytes[3]) / 4294967296;
        const j = Math.floor(rand * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

export function calculateHandValue(cards: string[]): number {
    let total = 0;
    let aces = 0;
    for (const card of cards) {
        const rank = card.slice(0, -1);
        if (rank === 'A') {
            aces++;
            total += 11;
        } else if (['J', 'Q', 'K'].includes(rank)) {
            total += 10;
        } else {
            total += parseInt(rank);
        }
    }
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }
    return total;
}

export function isBust(cards: string[]): boolean {
    return calculateHandValue(cards) > 21;
}

export function isBlackjack(cards: string[]): boolean {
    if (cards.length !== 2) return false;
    const cardRanks = cards.map(c => c.slice(0, -1));
    return cardRanks.includes('A') && cardRanks.some(v => ['10', 'J', 'Q', 'K'].includes(v));
}

export function dealerShouldHit(cards: string[]): boolean {
    return calculateHandValue(cards) < 17;
}

export function getCardRank(card: string): string {
    return card.slice(0, -1);
}

export function sanitizeDealerHand(dealerHand: string[], reveal: boolean): string[] {
    if (reveal || dealerHand.length === 0) return dealerHand;
    return [dealerHand[0], '??', ...dealerHand.slice(2)];
}