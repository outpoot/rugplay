import { json } from '@sveltejs/kit';
import { redis } from '$lib/server/redis';
import {
    startHand, processAction, build,
    tablePrefix, codePrefix, playerPrefix,
    type PokerAction, type PokerTable,
} from '$lib/server/games/poker/engine';
import { loadTable, saveTable, publishStateToAll } from './_helpers';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// also explains itself, starts the game
export async function handleStart(userId: number, body: any) {
    const tableId = body.tableId ?? await redis.get(`${playerPrefix}${userId}`);
    if (!tableId) return json({ error: 'Not at a table.' }, { status: 400 });

    const table = await loadTable(tableId);
    if (!table.players.some(p => p.userId === userId)) return json({ error: 'You are not at this table.' }, { status: 403 });
    if (table.hostUserId !== userId) return json({ error: 'Only the host can start the game.' }, { status: 403 });
    if (table.phase !== 'waiting' && table.phase !== 'showdown') return json({ error: 'A hand is already in progress.' }, { status: 400 });

    startHand(table);
    await saveTable(table);
    await publishStateToAll(table);
    return json(build(table, userId));
}

// handles the poker actions for the srever
export async function handlePokerAction(userId: number, body: any) {
    const tableId = body.tableId ?? await redis.get(`${playerPrefix}${userId}`);
    if (!tableId) return json({ error: 'Not at a table.' }, { status: 400 });

    const move = body.move as PokerAction;
    if (!['fold', 'check', 'call', 'raise', 'all_in'].includes(move)) return json({ error: 'Invalid move.' }, { status: 400 });

    const table = await loadTable(tableId);
    try {
        processAction(table, userId, move, body.amount ? Number(body.amount) : undefined);
    } catch (e) {
        if (e instanceof Error) return json({ error: e.message }, { status: 400 });
        throw e;
    }
    await saveTable(table);
    await publishStateToAll(table);
    return json(build(table, userId));
}

export async function handleRebuy(userId: number, body: any) {
    const tableId = body.tableId ?? await redis.get(`${playerPrefix}${userId}`);
    if (!tableId) return json({ error: 'Not at a table.' }, { status: 400 });

    const table = await loadTable(tableId);
    const player = table.players.find(p => p.userId === userId);
    if (!player) return json({ error: 'You are not at this table.' }, { status: 403 });

    // Let spectators like Buy themselves in
    const upgrade = player.isSpectator;
    if (upgrade && table.phase !== 'waiting' && table.phase !== 'showdown') {
        return json({ error: 'You can only join as a player when the current hand is over.' }, { status: 400 });
    }

    const amount = body.amount ? Math.max(0, Math.floor(Number(body.amount))) : table.buyIn;
    if (amount <= 0) return json({ error: 'Invalid rebuy amount' }, { status: 400 });

    // reduce from user balance
    const [userData] = await db.select({ baseCurrencyBalance: user.baseCurrencyBalance }).from(user).where(eq(user.id, userId)).limit(1);
    const balance = Math.round(Number(userData.baseCurrencyBalance) * 100000000) / 100000000;
    if (amount > balance) return json({ error: `Insufficient funds. Rebuy is $${amount} but you have $${balance.toFixed(2)}` }, { status: 400 });

    const newBalance = balance - amount;
    await db.update(user).set({ baseCurrencyBalance: newBalance.toFixed(8), updatedAt: new Date() }).where(eq(user.id, userId));

    // Add the "chips" to player. Note: mighta ctually add chips
    player.chips += amount;
    if (upgrade) player.isSpectator = false;
    await saveTable(table);
    await publishStateToAll(table);

    return json({ ...build(table, userId), newBalance });
}

export async function handleState(userId: number, body: any) {
    const tableId = body.tableId ?? await redis.get(`${playerPrefix}${userId}`);
    if (!tableId) return json({ error: 'Not at a table.' }, { status: 400 });
    return json(build(await loadTable(tableId), userId));
}

export async function handlePeek(userId: number, body: any) {
    const code = String(body.code ?? '').trim();
    if (!/^\d{4}$/.test(code)) return json({ error: 'Invalid code.' }, { status: 400 });

    const tableId = await redis.get(`${codePrefix}${code}`);
    if (!tableId) return json({ error: 'Table not found. Check the code and try again.' }, { status: 404 });

    const raw = await redis.get(`${tablePrefix}${tableId}`);
    if (!raw) { await redis.del(`${codePrefix}${code}`); return json({ error: 'Table expired.' }, { status: 404 }); }
    const table = JSON.parse(raw) as PokerTable;
    const host = table.players.find(p => p.userId === table.hostUserId);
    const canJoinAsPlayer = (table.phase === 'waiting' || table.phase === 'showdown')
        && table.players.length < table.maxPlayers
        && !table.players.some(p => p.userId === userId);
    const canSpectate = !table.players.some(p => p.userId === userId);
    return json({
        code: table.code, buyIn: table.buyIn, blinds: table.blinds,
        playerCount: table.players.length, maxPlayers: table.maxPlayers,
        phase: table.phase, hostUsername: host?.username ?? 'Unknown',
        canJoin: canJoinAsPlayer,
        canSpectate
    });
}
