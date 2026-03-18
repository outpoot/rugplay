import { error } from '@sveltejs/kit';
import { redis } from '$lib/server/redis';
import { build, tablePrefix, ttl } from '$lib/server/games/poker/engine';
import type { PokerTable } from '$lib/server/games/poker/engine';

// All the helpers for the table actions
export async function loadTable(tableId: string): Promise<PokerTable> {
    const raw = await redis.get(`${tablePrefix}${tableId}`);
    if (!raw) throw error(404, 'Table not found or expired');
    return JSON.parse(raw) as PokerTable;
}

export async function saveTable(table: PokerTable): Promise<void> {
    await redis.set(`${tablePrefix}${table.tableId}`, JSON.stringify(table), { EX: ttl });
}

export async function publishStateToAll(table: PokerTable): Promise<void> {
    for (const player of table.players) {
        const state = build(table, player.userId);
        await redis.publish(`poker:player:${player.userId}`, JSON.stringify({ type: 'poker_state', ...state }));
    }
}
