// FILE UPLOAD
export const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

// COIN CREATION COSTS
export const CREATION_FEE = 100; // $100 creation fee
export const FIXED_SUPPLY = 1000000000; // 1 billion tokens
export const STARTING_PRICE = 0.000001; // $0.000001 per token
export const INITIAL_LIQUIDITY = FIXED_SUPPLY * STARTING_PRICE; // $1000
export const TOTAL_COST = CREATION_FEE + INITIAL_LIQUIDITY; // $1100
