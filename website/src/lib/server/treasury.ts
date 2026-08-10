import { db } from './db';
import { treasury, treasuryLedger } from './db/schema';
import { eq } from 'drizzle-orm';

export type TreasuryLedgerSource =
	| 'TRADING_FEE'
	| 'CASH_TRANSFER_FEE'
	| 'DAILY_REWARD'
	| 'ARCADE_HOUSE_EDGE'
	| 'ARCADE_PAYOUT'
	| 'PROMO_CODE'
	| 'PREDICTION_MARKET_FEE'
	| 'ADMIN_ADJUSTMENT'
	| 'SEED';

interface LedgerOptions {
	userId?: number;
	referenceType?: string;
	referenceId?: number;
	description?: string;
}

// Always row id 1 — the treasury is a singleton, there's only one bank.
const TREASURY_ID = 1;

/**
 * Fetches the treasury row, creating it (starting at $0) the first time
 * it's needed. Pass `lock: true` when calling this inside a
 * `db.transaction` that's about to credit/debit it, so concurrent
 * requests serialize on the row instead of racing on a stale balance.
 */
export async function getOrCreateTreasury(queryCtx: any = db, lock = false) {
	let query = queryCtx.select().from(treasury).where(eq(treasury.id, TREASURY_ID)).limit(1);
	if (lock) query = query.for('update');
	const [existing] = await query;
	if (existing) return existing;

	const [created] = await queryCtx
		.insert(treasury)
		.values({ id: TREASURY_ID })
		.onConflictDoNothing()
		.returning();
	if (created) return created;

	// Lost a race with another request creating it first — read it back.
	const [row] = await queryCtx
		.select()
		.from(treasury)
		.where(eq(treasury.id, TREASURY_ID))
		.limit(1);
	return row;
}

async function applyTreasuryEntry(
	direction: 'IN' | 'OUT',
	amount: number,
	source: TreasuryLedgerSource,
	opts: LedgerOptions,
	queryCtx: any
) {
	if (!Number.isFinite(amount) || amount <= 0) {
		throw new Error(`Invalid treasury ${direction} amount: ${amount}`);
	}

	const current = await getOrCreateTreasury(queryCtx, true);
	const currentBalance = Number(current.balance);
	const newBalance = direction === 'IN' ? currentBalance + amount : currentBalance - amount;

	await queryCtx
		.update(treasury)
		.set({
			balance: newBalance.toFixed(8),
			totalInflow:
				direction === 'IN' ? (Number(current.totalInflow) + amount).toFixed(8) : current.totalInflow,
			totalOutflow:
				direction === 'OUT'
					? (Number(current.totalOutflow) + amount).toFixed(8)
					: current.totalOutflow,
			updatedAt: new Date()
		})
		.where(eq(treasury.id, TREASURY_ID));

	await queryCtx.insert(treasuryLedger).values({
		direction,
		source,
		amount: amount.toFixed(8),
		balanceAfter: newBalance.toFixed(8),
		userId: opts.userId ?? null,
		referenceType: opts.referenceType ?? null,
		referenceId: opts.referenceId ?? null,
		description: opts.description ?? null
	});

	return newBalance;
}

/**
 * Moves money INTO the treasury — trading fees, transfer fees, and
 * (eventually) arcade house edge, prediction market rake, etc. Call this
 * inside the same `db.transaction` as the operation that generated the
 * fee, passing that transaction as `queryCtx`, so the fee and the credit
 * commit or roll back together. Falls back to the raw `db` client for
 * one-off/non-transactional callers (e.g. the seed script).
 */
export async function creditTreasury(
	amount: number,
	source: TreasuryLedgerSource,
	opts: LedgerOptions = {},
	queryCtx: any = db
) {
	return applyTreasuryEntry('IN', amount, source, opts, queryCtx);
}

/**
 * Moves money OUT of the treasury to fund a payout — daily rewards, and
 * eventually arcade wins, promo codes, prediction market winnings.
 * Deliberately allowed to push the balance negative: payouts are never
 * blocked on treasury solvency today. A negative balance is meant to be a
 * visible signal (shown on /bank) that payouts are outrunning fee income,
 * for a human to act on — not something that silently fails a claim.
 */
export async function debitTreasury(
	amount: number,
	source: TreasuryLedgerSource,
	opts: LedgerOptions = {},
	queryCtx: any = db
) {
	return applyTreasuryEntry('OUT', amount, source, opts, queryCtx);
}
