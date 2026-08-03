// FILE UPLOAD
export const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

// COIN CREATION COSTS
export const CREATION_FEE = 100; // $100 creation fee for first coin
export const FIXED_SUPPLY = 1000000000; // 1 billion tokens
export const STARTING_PRICE = 0.000001; // $0.000001 per token
export const INITIAL_LIQUIDITY = FIXED_SUPPLY * STARTING_PRICE; // $1000
export const TOTAL_COST = CREATION_FEE + INITIAL_LIQUIDITY; // $1100

// Each additional coin you create costs more than the last, so spamming coins
// isn't encouraged.
export const CREATION_FEE_GROWTH = 1.5; // +50%/coin
export const MAX_CREATION_FEE = 1_000_000;

export function getCreationFee(coinsCreated: number): number {
	const n = Math.max(0, Math.floor(coinsCreated));
	const fee = CREATION_FEE * Math.pow(CREATION_FEE_GROWTH, n);
	return Math.min(Math.round(fee * 100) / 100, MAX_CREATION_FEE);
}

export function getCreationTotalCost(coinsCreated: number): number {
	return getCreationFee(coinsCreated) + INITIAL_LIQUIDITY;
}

// TRADING FEES
// removes currency from circulation on every trade for a tiny whiny fee
export const SWAP_FEE_RATE = 0.003; // 0.3%

// TRANSFER FEES
// Burned on cash transfers between users
export const CASH_TRANSFER_FEE_RATE = 0.01; // 1%

// PROMO CODES
export const MAX_PROMO_REWARD = 1_000_000;
