import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import {
    createTable, generateCode, generateTableId, build,
    codePrefix, playerPrefix, ttl, minBuyIn, maxBuyIn
} from '$lib/server/games/poker/engine';
import { saveTable } from './_helpers';


// Explains itself, creates a table
export async function handleCreate(userId: number, body: any) {
    const buyIn = Number(body.buyIn);
    if (!buyIn || buyIn < minBuyIn || buyIn > maxBuyIn) {
        return json({ error: `Buy-in must be between $${minBuyIn} and $${maxBuyIn}` }, { status: 400 });
    }

    const existing = await redis.get(`${playerPrefix}${userId}`);
    if (existing) return json({ error: 'You are already at a table. Leave first.' }, { status: 400 });

    const [userData] = await db
        .select({ baseCurrencyBalance: user.baseCurrencyBalance, username: user.username, image: user.image })
        .from(user).where(eq(user.id, userId)).limit(1);

    const balance = Math.round(Number(userData.baseCurrencyBalance) * 100000000) / 100000000;
    if (buyIn > balance) {
        return json({ error: `Insufficient funds. You need $${buyIn} but have $${balance.toFixed(2)}` }, { status: 400 });
    }

    let code = generateCode();
    let attempts = 0;
    while (await redis.get(`${codePrefix}${code}`)) {
        code = generateCode();
        if (++attempts > 50) return json({ error: 'Could not generate a table code. Try again.' }, { status: 500 });
    }

    const tableId = generateTableId();
    // Validate optional lobby settings from host (bounded server-side)
    const requestedMaxPlayers = Number(body.maxPlayers) || undefined;

    const table = createTable(
        tableId, code, userId, userData.username, userData.image ?? null, buyIn,
        requestedMaxPlayers
    );
    const newBalance = balance - buyIn;

    await db.update(user).set({ baseCurrencyBalance: newBalance.toFixed(8), updatedAt: new Date() }).where(eq(user.id, userId));
    await saveTable(table);
    await redis.set(`${codePrefix}${code}`, tableId, { EX: ttl });
    await redis.set(`${playerPrefix}${userId}`, tableId, { EX: ttl });

    return json({ ...build(table, userId), newBalance });
}
