type Card = string;

const values: Record<string, number> = {
    "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8,
    "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13, "A": 14
};
const suits = ["H", "D", "C", "S"];
const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

// shuffling basically
export function createDeck(): Card[] {
    const deck = suits.flatMap(s => ranks.map(r => r + s));

    for (let i = deck.length - 1; i > 0; i--) {
        const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
}

export const cardValue = (card: Card) =>
    values[card.slice(0, -1)];