import { createHmac, randomBytes, createHash } from 'crypto';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { publishArcadeActivity } from '$lib/server/arcade-activity';
import { checkAndAwardAchievements } from '$lib/server/achievements';

// --- CRASH Game Constants ---
// House edge of 3% ensures the game is deflationary (prevents economy inflation).
// P(crash >= M) = (1 - houseEdge) / M, so EV per $1 wagered = 0.97 (97% RTP).
export const CRASH_HOUSE_EDGE = 0.03;
// Multiplier growth rate per second: multiplier(t) = e^(rate * t)
export const CRASH_RATE = 0.1;
export const CRASH_WAITING_DURATION = 8000; // ms to place bets
export const CRASH_PAUSE_DURATION = 5000; // ms after crash before next round
export const CRASH_MAX_BET = 100_000;
export const CRASH_MIN_BET = 0.01;
export const CRASH_MAX_PAYOUT = 2_000_000; // anti-inflation cap per bet
export const CRASH_MAX_POINT = 10_000; // cap crash point to keep rounds reasonable
export const CRASH_MAX_BETS = 1000; // max bets per round

export const CRASH_ROUND_KEY = 'crash:round';
export const CRASH_HISTORY_KEY = 'crash:history';
export const CRASH_CHANNEL = 'crash:round';

export interface CrashBet {
	userId: number;
	betAmount: number;
	cashedOut: boolean;
	cashoutMultiplier: number | null;
	payout: number | null;
}

export interface CrashRound {
	roundId: number;
	status: 'waiting' | 'running' | 'crashed';
	crashPoint: number;
	serverSeed: string;
	serverSeedHash: string;
	nonce: number;
	waitingStartedAt: number;
	startTime: number;
	crashedAt: number;
	settled: boolean;
	bets: Record<string, CrashBet>;
	lastActivity: number;
}

// --- Provably fair helpers ---
export function generateServerSeed(): string {
	return randomBytes(32).toString('hex');
}

export function hashServerSeed(seed: string): string {
	return createHash('sha256').update(seed).digest('hex');
}

/**
 * Derives the crash point from the server seed + nonce using HMAC-SHA256.
 * The result is uniform in [0, 1), giving P(crash >= M) = (1 - houseEdge) / M.
 */
export function generateCrashPoint(
	serverSeed: string,
	nonce: number,
	houseEdge = CRASH_HOUSE_EDGE
): number {
	const hmac = createHmac('sha256', serverSeed).update(String(nonce)).digest();
	// Use 6 bytes (48-bit) integer — stays within Number.MAX_SAFE_INTEGER (2^53)
	// to guarantee a uniform distribution in [0, 1) with no precision loss.
	const h = hmac.readUInt32BE(0) * 2 ** 16 + hmac.readUInt16BE(4);
	const r = h / 2 ** 48; // uniform in [0, 1)
	const crashPoint = Math.max(1, (1 - houseEdge) / r);
	const rounded = Math.round(crashPoint * 100) / 100;
	return Math.min(rounded, CRASH_MAX_POINT);
}

/** Multiplier at a given elapsed time (ms) since the round started running. */
export function crashMultiplierAt(elapsedMs: number): number {
	if (elapsedMs <= 0) return 1;
	return Math.floor(Math.exp(CRASH_RATE * (elapsedMs / 1000)) * 100) / 100;
}

/** Time (ms) for the multiplier to reach a given point. */
export function crashTimeForPoint(point: number): number {
	return (Math.log(point) / CRASH_RATE) * 1000;
}

function newRound(now: number): CrashRound {
	const serverSeed = generateServerSeed();
	return {
		roundId: 1,
		status: 'waiting',
		crashPoint: 0,
		serverSeed,
		serverSeedHash: hashServerSeed(serverSeed),
		nonce: 0,
		waitingStartedAt: now,
		startTime: 0,
		crashedAt: 0,
		settled: false,
		bets: {},
		lastActivity: now
	};
}

async function getRound(): Promise<CrashRound | null> {
	const raw = await redis.get(CRASH_ROUND_KEY);
	return raw ? (JSON.parse(raw) as CrashRound) : null;
}

async function ensureRound(): Promise<CrashRound> {
	const existing = await getRound();
	if (existing) return existing;
	const round = newRound(Date.now());
	const result = await redis.set(CRASH_ROUND_KEY, JSON.stringify(round), { NX: true });
	if (result === 'OK') return round;
	const created = await getRound();
	if (created) return created;
	return round;
}

async function publishRound(round: CrashRound, includeHistoryEntry = false) {
	const payload: Record<string, unknown> = {
		type: 'crash_round',
		roundId: round.roundId,
		status: round.status,
		crashPoint: round.status === 'crashed' ? round.crashPoint : null,
		serverSeedHash: round.serverSeedHash,
		serverSeed: round.status === 'crashed' ? round.serverSeed : null,
		nonce: round.nonce,
		waitingStartedAt: round.waitingStartedAt,
		startTime: round.startTime,
		crashedAt: round.crashedAt,
		currentMultiplier:
			round.status === 'running' ? crashMultiplierAt(Date.now() - round.startTime) : 1,
		betCount: Object.keys(round.bets).length
	};

	// Only attach the history entry on the publish that immediately follows the
	// waiting/settled transition to "crashed" — republishes of the same crashed
	// round (e.g. after a server restart) must NOT resend it, or WS clients
	// would duplicate the entry in their local history array.
	if (round.status === 'crashed' && includeHistoryEntry) {
		payload.historyEntry = {
			roundId: round.roundId,
			crashPoint: round.crashPoint,
			serverSeed: round.serverSeed,
			serverSeedHash: round.serverSeedHash,
			nonce: round.nonce,
			crashedAt: round.crashedAt
		};
	}

	await redis.publish(CRASH_CHANNEL, JSON.stringify(payload));
}

// --- Lua scripts (atomic Redis operations) ---
const TRANSITION_TO_RUNNING = `
local roundRaw = redis.call("get", KEYS[1])
if not roundRaw then return 0 end
local round = cjson.decode(roundRaw)
if round.status ~= "waiting" then return 0 end
round.status = "running"
round.startTime = tonumber(ARGV[1])
round.crashPoint = tonumber(ARGV[2])
round.lastActivity = tonumber(ARGV[1])
redis.call("set", KEYS[1], cjson.encode(round))
return 1
`;

const TRANSITION_TO_CRASHED = `
local roundRaw = redis.call("get", KEYS[1])
if not roundRaw then return 0 end
local round = cjson.decode(roundRaw)
if round.status ~= "running" then return 0 end
round.status = "crashed"
round.crashedAt = tonumber(ARGV[1])
round.settled = false
round.lastActivity = tonumber(ARGV[1])
redis.call("set", KEYS[1], cjson.encode(round))
local hist = { roundId = round.roundId, crashPoint = round.crashPoint, serverSeed = round.serverSeed, serverSeedHash = round.serverSeedHash, nonce = round.nonce, crashedAt = round.crashedAt }
redis.call("lpush", KEYS[2], cjson.encode(hist))
redis.call("ltrim", KEYS[2], 0, 49)
return 1
`;

const MARK_SETTLED = `
local roundRaw = redis.call("get", KEYS[1])
if not roundRaw then return 0 end
local round = cjson.decode(roundRaw)
if round.status ~= "crashed" then return 0 end
if round.settled then return 0 end
round.settled = true
redis.call("set", KEYS[1], cjson.encode(round))
return 1
`;

const START_NEW_ROUND = `
local roundRaw = redis.call("get", KEYS[1])
if not roundRaw then return 0 end
local round = cjson.decode(roundRaw)
if round.status ~= "crashed" then return 0 end
if not round.settled then return 0 end
local now = tonumber(ARGV[1])
if now - round.crashedAt < tonumber(ARGV[2]) then return 0 end
local newRound = {
  roundId = round.roundId + 1,
  status = "waiting",
  crashPoint = 0,
  serverSeed = ARGV[3],
  serverSeedHash = ARGV[4],
  nonce = 0,
  waitingStartedAt = now,
  startTime = 0,
  crashedAt = 0,
  settled = false,
  bets = {},
  lastActivity = now
}
redis.call("set", KEYS[1], cjson.encode(newRound))
return 1
`;

const ADD_BET = `
local roundRaw = redis.call("get", KEYS[1])
if not roundRaw then return {0, "no_round"} end
local round = cjson.decode(roundRaw)
if round.status ~= "waiting" then return {0, "not_waiting"} end
local betKey = "user:" .. ARGV[1]
if round.bets[betKey] then return {0, "already_bet"} end
local count = 0
for k, v in pairs(round.bets) do count = count + 1 end
if count >= tonumber(ARGV[3]) then return {0, "round_full"} end
round.bets[betKey] = {
  userId = tonumber(ARGV[1]),
  betAmount = tonumber(ARGV[2]),
  cashedOut = false
}
round.lastActivity = tonumber(ARGV[4])
redis.call("set", KEYS[1], cjson.encode(round))
return {1, "ok"}
`;

const CASHOUT = `
local roundRaw = redis.call("get", KEYS[1])
if not roundRaw then return {0, "no_round"} end
local round = cjson.decode(roundRaw)
if round.status ~= "running" then return {0, "not_running"} end
local betKey = "user:" .. ARGV[1]
local bet = round.bets[betKey]
if not bet then return {0, "no_bet"} end
if bet.cashedOut then return {0, "already_cashed"} end
local now = tonumber(ARGV[2])
local rate = tonumber(ARGV[4])
local elapsed = (now - round.startTime) / 1000
local mult = math.floor(math.exp(rate * elapsed) * 100) / 100
if mult >= round.crashPoint then return {0, "crashed"} end
local payout = math.floor(bet.betAmount * mult * 100000000) / 100000000
local maxPayout = tonumber(ARGV[3])
if payout > maxPayout then payout = maxPayout end
bet.cashedOut = true
bet.cashoutMultiplier = mult
bet.payout = payout
round.bets[betKey] = bet
round.lastActivity = now
redis.call("set", KEYS[1], cjson.encode(round))
return {1, tostring(payout), tostring(mult), tostring(bet.betAmount)}
`;

// --- Settlement of losing bets when a round crashes ---
async function settleLosses(round: CrashRound) {
	const uncashed = Object.values(round.bets).filter((b) => !b.cashedOut);
	for (const bet of uncashed) {
		try {
			await db.transaction(async (tx) => {
				const [row] = await tx
					.select({
						arcadeLosses: user.arcadeLosses,
						totalArcadeGamesPlayed: user.totalArcadeGamesPlayed,
						arcadeWinStreak: user.arcadeWinStreak,
						totalArcadeWagered: user.totalArcadeWagered
					})
					.from(user)
					.where(eq(user.id, bet.userId))
					.for('update')
					.limit(1);
				if (!row) return;
				await tx
					.update(user)
					.set({
						arcadeLosses: `${Number(row.arcadeLosses || 0) + bet.betAmount}`,
						totalArcadeGamesPlayed: (row.totalArcadeGamesPlayed || 0) + 1,
						totalArcadeWagered: `${Number(row.totalArcadeWagered || 0) + bet.betAmount}`,
						arcadeWinStreak: 0,
						updatedAt: new Date()
					})
					.where(eq(user.id, bet.userId));
			});

			if (bet.betAmount >= 1000) {
				await publishArcadeActivity(bet.userId, bet.betAmount, false, 'crash', 0);
			}
			await checkAndAwardAchievements(bet.userId, ['arcade'], {
				arcadeWon: false,
				arcadeWager: bet.betAmount
			});
		} catch (e) {
			console.error(`Failed to settle crash loss for user ${bet.userId}:`, e);
		}
	}
}

// --- Round advancement (called by the scheduler) ---
export async function crashAdvanceRounds() {
	const now = Date.now();
	const round = await ensureRound();

	if (round.status === 'waiting') {
		if (now - round.waitingStartedAt >= CRASH_WAITING_DURATION) {
			const crashPoint = generateCrashPoint(round.serverSeed, round.nonce);
			const updated = (await redis.eval(TRANSITION_TO_RUNNING, {
				keys: [CRASH_ROUND_KEY],
				arguments: [String(now), String(crashPoint)]
			})) as number;
			if (updated) {
				const updatedRound = await getRound();
				if (updatedRound) await publishRound(updatedRound);
			}
		}
	} else if (round.status === 'running') {
		const currentMult = crashMultiplierAt(now - round.startTime);
		if (currentMult >= round.crashPoint) {
			const updated = (await redis.eval(TRANSITION_TO_CRASHED, {
				keys: [CRASH_ROUND_KEY, CRASH_HISTORY_KEY],
				arguments: [String(now)]
			})) as number;
			if (updated) {
				const updatedRound = await getRound();
				if (updatedRound) {
					await publishRound(updatedRound, true);
					await settleLosses(updatedRound);
					await redis.eval(MARK_SETTLED, { keys: [CRASH_ROUND_KEY], arguments: [] });
				}
			}
		}
	} else if (round.status === 'crashed') {
		if (!round.settled) {
			await settleLosses(round);
			await redis.eval(MARK_SETTLED, { keys: [CRASH_ROUND_KEY], arguments: [] });
			const updatedRound = await getRound();
			if (updatedRound) await publishRound(updatedRound);
		} else if (now - round.crashedAt >= CRASH_PAUSE_DURATION) {
			const serverSeed = generateServerSeed();
			const updated = (await redis.eval(START_NEW_ROUND, {
				keys: [CRASH_ROUND_KEY],
				arguments: [
					String(now),
					String(CRASH_PAUSE_DURATION),
					serverSeed,
					hashServerSeed(serverSeed)
				]
			})) as number;
			if (updated) {
				const updatedRound = await getRound();
				if (updatedRound) await publishRound(updatedRound);
			}
		}
	}
}

// --- Public API helpers ---
export async function placeCrashBet(
	userId: number,
	betAmount: number
): Promise<{ newBalance: number; roundId: number }> {
	const now = Date.now();

	// 1. Debit the bet in a DB transaction (row lock)
	const newBalance = await db.transaction(async (tx) => {
		const [row] = await tx
			.select({ baseCurrencyBalance: user.baseCurrencyBalance })
			.from(user)
			.where(eq(user.id, userId))
			.for('update')
			.limit(1);
		if (!row) throw new Error('User not found');
		const balance = Math.round(Number(row.baseCurrencyBalance) * 100000000) / 100000000;
		if (betAmount > balance) {
			throw new Error(
				`Insufficient funds. You need $${betAmount.toFixed(2)} but only have $${balance.toFixed(2)}`
			);
		}
		const newBal = Math.round((balance - betAmount) * 100000000) / 100000000;
		await tx
			.update(user)
			.set({ baseCurrencyBalance: newBal.toFixed(8), updatedAt: new Date() })
			.where(eq(user.id, userId));
		return newBal;
	});

	// 2. Atomically add the bet to the Redis round (only if waiting)
	// NB: Refund on ANY failure (including a Lua script exception) so the
	// player's balance is never debited without a bet being recorded.
	const refundBet = async () => {
		await db.transaction(async (tx) => {
			const [row] = await tx
				.select({ baseCurrencyBalance: user.baseCurrencyBalance })
				.from(user)
				.where(eq(user.id, userId))
				.for('update')
				.limit(1);
			if (row) {
				const balance = Math.round(Number(row.baseCurrencyBalance) * 100000000) / 100000000;
				const newBal = Math.round((balance + betAmount) * 100000000) / 100000000;
				await tx
					.update(user)
					.set({ baseCurrencyBalance: newBal.toFixed(8), updatedAt: new Date() })
					.where(eq(user.id, userId));
			}
		});
	};

	let errorMessage: string | null = null;

	try {
		const result = (await redis.eval(ADD_BET, {
			keys: [CRASH_ROUND_KEY],
			arguments: [String(userId), String(betAmount), String(CRASH_MAX_BETS), String(now)]
		})) as [number, string];

		if (result[0] === 1) {
			const round = await getRound();
			return { newBalance, roundId: round?.roundId ?? 0 };
		}

		errorMessage =
			result[1] === 'not_waiting'
				? 'Betting is closed for this round'
				: result[1] === 'already_bet'
					? 'You already have a bet in this round'
					: result[1] === 'round_full'
						? 'This round is full'
						: 'Unable to place bet';
	} catch (e) {
		console.error('Crash ADD_BET error, refunding bet:', e);
		errorMessage = 'Unable to place bet';
	}

	// Bet was not successfully recorded — refund the debited amount.
	await refundBet();
	throw new Error(errorMessage);
}

export async function cashoutCrashBet(
	userId: number
): Promise<{ payout: number; multiplier: number; betAmount: number; newBalance: number }> {
	const now = Date.now();
	const result = (await redis.eval(CASHOUT, {
		keys: [CRASH_ROUND_KEY],
		arguments: [String(userId), String(now), String(CRASH_MAX_PAYOUT), String(CRASH_RATE)]
	})) as [number, string, string, string];

	if (result[0] !== 1) {
		const code = result[1];
		throw new Error(
			code === 'crashed'
				? 'The round has crashed'
				: code === 'not_running'
					? 'The round is not running'
					: code === 'already_cashed'
						? 'You already cashed out'
						: code === 'no_bet'
							? 'You have no active bet in this round'
							: 'Unable to cash out'
		);
	}

	const payout = parseFloat(result[1]);
	const multiplier = parseFloat(result[2]);
	const betAmount = parseFloat(result[3]);
	const net = Math.round((payout - betAmount) * 100000000) / 100000000;

	// Credit the payout in a DB transaction (row lock)
	const newBalance = await db.transaction(async (tx) => {
		const [row] = await tx
			.select({
				baseCurrencyBalance: user.baseCurrencyBalance,
				arcadeWins: user.arcadeWins,
				arcadeWinStreak: user.arcadeWinStreak,
				arcadeBestWinStreak: user.arcadeBestWinStreak,
				totalArcadeGamesPlayed: user.totalArcadeGamesPlayed,
				totalArcadeWagered: user.totalArcadeWagered
			})
			.from(user)
			.where(eq(user.id, userId))
			.for('update')
			.limit(1);
		if (!row) throw new Error('User not found');
		const balance = Math.round(Number(row.baseCurrencyBalance) * 100000000) / 100000000;
		const newBal = Math.round((balance + payout) * 100000000) / 100000000;
		const won = net > 0;

		const update: Record<string, unknown> = {
			baseCurrencyBalance: newBal.toFixed(8),
			totalArcadeGamesPlayed: (row.totalArcadeGamesPlayed || 0) + 1,
			totalArcadeWagered: `${Number(row.totalArcadeWagered || 0) + betAmount}`,
			updatedAt: new Date()
		};

		if (won) {
			update.arcadeWins = `${Number(row.arcadeWins || 0) + net}`;
			const streak = (row.arcadeWinStreak || 0) + 1;
			update.arcadeWinStreak = streak;
			update.arcadeBestWinStreak = Math.max(streak, row.arcadeBestWinStreak || 0);
		}

		await tx.update(user).set(update).where(eq(user.id, userId));
		return newBal;
	});

	// Publish arcade activity for wins >= $1000
	if (payout >= 1000) {
		await publishArcadeActivity(userId, payout, true, 'crash', 0);
	}
	await checkAndAwardAchievements(userId, ['arcade'], {
		arcadeWon: true,
		arcadeWager: betAmount
	});

	return { payout, multiplier, betAmount, newBalance };
}

export async function getCrashState(userId: number | null) {
	const round = await getRound();
	if (!round) {
		return { round: null, userBet: null, history: [] };
	}

	const currentMultiplier =
		round.status === 'running' ? crashMultiplierAt(Date.now() - round.startTime) : 1;

	const userBet = userId ? round.bets[`user:${userId}`] : null;

	const historyRaw = (await redis.lRange(
		CRASH_HISTORY_KEY,
		0,
		49
	)) as unknown as string[] | null;
	const history = (historyRaw ?? []).map((h) => JSON.parse(h));

	return {
		round: {
			roundId: round.roundId,
			status: round.status,
			crashPoint: round.status === 'crashed' ? round.crashPoint : null,
			serverSeedHash: round.serverSeedHash,
			serverSeed: round.status === 'crashed' ? round.serverSeed : null,
			nonce: round.nonce,
			waitingStartedAt: round.waitingStartedAt,
			startTime: round.startTime,
			crashedAt: round.crashedAt,
			currentMultiplier,
			betCount: Object.keys(round.bets).length
		},
		userBet: userBet
			? {
					betAmount: userBet.betAmount,
					cashedOut: userBet.cashedOut,
					cashoutMultiplier: userBet.cashoutMultiplier,
					payout: userBet.payout
				}
			: null,
		history
	};
}