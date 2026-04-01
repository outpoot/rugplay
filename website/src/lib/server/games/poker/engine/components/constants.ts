// Redis
export const tablePrefix = "poker:table:";
export const codePrefix = "poker:code:";
export const playerPrefix = "poker:player:";
export const imagePrefix = "poker:image:";
export const ttl = 7200;

// General game settings
export const minBuyIn = 100;
export const maxBuyIn = 10000000;
export const maxPlayers = 22;
export const minPlayersToStart = 2;

// Card Logic

// card values for each card accordingly.
export const values: Record<string, number> = {
    "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8,
    "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13, "A": 14
};

export const suits = ["H", "D", "C", "S"];
export const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

// based on the values above, the engine selects the 
export const hands = [
    "High Card", "One Pair", "Two Pair", "Three of a Kind",
    "Straight", "Flush", "Full House", "Four of a Kind",
    "Straight Flush", "Royal Flush"
];
