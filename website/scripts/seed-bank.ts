// One-off seed script for RugPlay Bank: creates the treasury singleton
// row and the official "RugPlay Bank" coin, if they don't already exist.
//
// Deliberately standalone — it does NOT import from `$lib/*` because
// those aliases (and `$env/dynamic/private`) only resolve inside
// SvelteKit's own module graph. Talks to the DB directly with the same
// drizzle client shape as `src/lib/server/db/index.ts`, reading
// DATABASE_URL from process.env instead.
//
// Run once, from website/:
//   DATABASE_URL=postgresql://... bun run scripts/seed-bank.ts
// or, if you keep DATABASE_URL in .env already:
//   bun run db:seed-bank
//
// Safe to re-run — every insert is guarded (onConflictDoNothing /
// existence check), so running it twice is a no-op the second time.

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../src/lib/server/db/schema';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error('DATABASE_URL is not set. Example:\n  DATABASE_URL=postgresql://... bun run scripts/seed-bank.ts');
	process.exit(1);
}

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

const BANK_COIN_SYMBOL = 'BANK';
const BANK_COIN_NAME = 'RugPlay Bank';

// 10,000 shares total, no more ever minted. Scarce by design — this is
// what makes "extremely valuable" mean something instead of just being a
// number someone typed in.
const BANK_TOTAL_SUPPLY = 10_000;

// Seed price per share. Combined with a 10,000-share supply this puts
// the coin's starting market cap at $100,000,000 — comfortably above
// anything a user-created coin (seeded with $1,000 of liquidity) could
// realistically reach, so it lands #1 by market cap on its own even
// before the official-pin sort kicks in.
const BANK_SEED_PRICE = 10_000;

// No single wallet can hold more than this percent of supply (200
// shares at the numbers above) — the point of the cap: nobody buys their
// way to a majority stake just because they have the cash for it.
const BANK_MAX_HOLDER_PERCENT = '2.00';

async function main() {
	console.log('Seeding RugPlay Bank...');

	// --- Treasury singleton ---------------------------------------------
	const [existingTreasury] = await db
		.select()
		.from(schema.treasury)
		.where(eq(schema.treasury.id, 1))
		.limit(1);

	if (existingTreasury) {
		console.log('Treasury already exists, skipping (balance: $%s)', existingTreasury.balance);
	} else {
		await db.insert(schema.treasury).values({ id: 1 }).onConflictDoNothing();
		console.log('Created treasury singleton at $0.00');
	}

	// --- Official coin ----------------------------------------------------
	const [existingCoin] = await db
		.select({ id: schema.coin.id })
		.from(schema.coin)
		.where(eq(schema.coin.symbol, BANK_COIN_SYMBOL))
		.limit(1);

	if (existingCoin) {
		console.log(`Coin *${BANK_COIN_SYMBOL} already exists (id ${existingCoin.id}), skipping.`);
	} else {
		const marketCap = BANK_TOTAL_SUPPLY * BANK_SEED_PRICE;

		const [createdCoin] = await db
			.insert(schema.coin)
			.values({
				name: BANK_COIN_NAME,
				symbol: BANK_COIN_SYMBOL,
				icon: null, // falls back to the "BA" initials avatar — no asset dependency
				creatorId: null, // no owner, by design
				initialSupply: BANK_TOTAL_SUPPLY.toString(),
				circulatingSupply: BANK_TOTAL_SUPPLY.toString(),
				currentPrice: BANK_SEED_PRICE.toString(),
				marketCap: marketCap.toString(),
				// All supply starts in the pool, same invariant as a normal
				// coin creation — nobody holds shares until they buy some.
				poolCoinAmount: BANK_TOTAL_SUPPLY.toString(),
				poolBaseCurrencyAmount: marketCap.toString(),
				isListed: true,
				isLocked: false,
				tradingUnlocksAt: null,
				isOfficial: true,
				maxHolderPercent: BANK_MAX_HOLDER_PERCENT
			})
			.returning();

		await db.insert(schema.priceHistory).values({
			coinId: createdCoin.id,
			price: BANK_SEED_PRICE.toString()
		});

		console.log(
			`Created *${BANK_COIN_SYMBOL} (id ${createdCoin.id}): ${BANK_TOTAL_SUPPLY.toLocaleString()} shares @ $${BANK_SEED_PRICE.toLocaleString()}, ${BANK_MAX_HOLDER_PERCENT}% max holder cap, market cap $${marketCap.toLocaleString()}.`
		);
	}

	console.log('Done.');
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error('Seed failed:', err);
		process.exit(1);
	})
	.finally(() => client.end());
