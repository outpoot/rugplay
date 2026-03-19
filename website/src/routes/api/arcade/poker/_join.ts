import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import {
    addPlayer, build,
    codePrefix, playerPrefix, ttl, maxPlayers
} from '$lib/server/games/poker/engine';
import { loadTable, saveTable, publishStateToAll } from './_helpers';

// joining is a bit different, since you can join as already being a spectator in the lobby etc. so there are a lot of checks
export async function handleJoin(userId: number, body: any) {
    const code = String(body.code ?? '').trim();
    if (!/^\d{4}$/.test(code)) return json({ error: 'Invalid code. Enter a 4-digit number.' }, { status: 400 });

    const existing = await redis.get(`${playerPrefix}${userId}`);
    if (existing) return json({ error: 'You are already at a table. Leave first.' }, { status: 400 });

    const tableId = await redis.get(`${codePrefix}${code}`);
    if (!tableId) return json({ error: 'Table not found. Check the code and try again.' }, { status: 404 });

    const table = await loadTable(tableId);
    // spectator?
    const joiningAsSpectator = (table.phase !== 'waiting' && table.phase !== 'showdown') || table.players.length >= table.maxPlayers;
    if (table.players.some(p => p.userId === userId)) return json({ error: 'You are already at this table.' }, { status: 400 });

    const [userData] = await db
        .select({ baseCurrencyBalance: user.baseCurrencyBalance, username: user.username, image: user.image })
        .from(user).where(eq(user.id, userId)).limit(1);

    const balance = Math.round(Number(userData.baseCurrencyBalance) * 100000000) / 100000000;

    if (joiningAsSpectator) {
        // spectators dont gotta pay
        addPlayer(table, userId, userData.username, userData.image ?? null, 0, true);
        await saveTable(table);
        await redis.set(`${playerPrefix}${userId}`, tableId, { EX: ttl });
        await publishStateToAll(table);
        return json({ ...build(table, userId), spectator: true });
    }

    // normal player
    if (table.buyIn > balance) {
        return json({ error: `Insufficient funds. Buy-in is $${table.buyIn} but you have $${balance.toFixed(2)}` }, { status: 400 });
    }

    const newBalance = balance - table.buyIn;
    await db.update(user).set({ baseCurrencyBalance: newBalance.toFixed(8), updatedAt: new Date() }).where(eq(user.id, userId));
    addPlayer(table, userId, userData.username, userData.image ?? null, table.buyIn, false);
    await saveTable(table);
    await redis.set(`${playerPrefix}${userId}`, tableId, { EX: ttl });
    await publishStateToAll(table);

    return json({ ...build(table, userId), newBalance });
}
