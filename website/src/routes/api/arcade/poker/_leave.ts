import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '$lib/server/s3';
import { PUBLIC_B2_BUCKET, PUBLIC_B2_ENDPOINT } from '$env/static/public';
import { removePlayer, tablePrefix, codePrefix, playerPrefix } from '$lib/server/games/poker/engine';
import { loadTable, saveTable, publishStateToAll } from './_helpers';

// leaving is also interesting, since you can leave mid game etc.
// NOTE: Not production ready probably, since you can maybe duplicate money? Not sure, gotta look into that on another occasion
export async function handleLeave(userId: number, body: any) {
    const tableId = body.tableId ?? await redis.get(`${playerPrefix}${userId}`);
    if (!tableId) return json({ error: 'You are not at a table.' }, { status: 400 });

    const table = await loadTable(tableId);
    const player = table.players.find(p => p.userId === userId);
    if (!player) {
        await redis.del(`${playerPrefix}${userId}`);
        return json({ error: 'You are not at this table.' }, { status: 400 });
    }

    if (table.phase !== 'waiting' && table.phase !== 'showdown' && !player.folded) {
        player.folded = true;
    }

    const chipsToReturn = player.chips;
    const wasHost = table.hostUserId === userId;

    // actually remove the player
    removePlayer(table, userId);

    // give them their chips
    if (chipsToReturn > 0) {
        const [userData] = await db.select({ baseCurrencyBalance: user.baseCurrencyBalance }).from(user).where(eq(user.id, userId)).limit(1);
        const balance = Math.round(Number(userData.baseCurrencyBalance) * 100000000) / 100000000;
        await db.update(user)
            .set({ baseCurrencyBalance: (balance + chipsToReturn).toFixed(8), updatedAt: new Date() })
            .where(eq(user.id, userId));
    }

    if (wasHost) {
        for (const p of table.players) {
            if (p.chips > 0) {
                const [pd] = await db.select({ baseCurrencyBalance: user.baseCurrencyBalance }).from(user).where(eq(user.id, p.userId)).limit(1);
                const bal = Math.round(Number(pd.baseCurrencyBalance) * 100000000) / 100000000;
                await db.update(user)
                    .set({ baseCurrencyBalance: (bal + p.chips).toFixed(8), updatedAt: new Date() })
                    .where(eq(user.id, p.userId));
            }
            await redis.del(`${playerPrefix}${p.userId}`);
        }

        await redis.del(`${playerPrefix}${userId}`);

        // redis clear
        await redis.del(`${tablePrefix}${tableId}`);
        await redis.del(`${codePrefix}${table.code}`);
        try {
            const imgRedisKey = `poker:image:${table.code}`;
            const existing = await redis.get(imgRedisKey);
            if (existing) {
                const parsed = JSON.parse(existing || '{}');
                const imageUrl = parsed.image as string | undefined;
                if (imageUrl) {
                    const prefix = `${PUBLIC_B2_ENDPOINT}/${PUBLIC_B2_BUCKET}/`;
                    if (imageUrl.startsWith(prefix)) {
                        const key = imageUrl.slice(prefix.length);
                        try {
                            await s3Client.send(new DeleteObjectCommand({ Bucket: PUBLIC_B2_BUCKET, Key: key }));
                        } catch (err) {
                            console.error('Failed to delete poker image from CDN:', err);
                        }
                    }
                }
                await redis.del(imgRedisKey);
            }
        } catch (err) {
            console.error('Error cleaning up poker image:', err);
        }

        const [final] = await db.select({ baseCurrencyBalance: user.baseCurrencyBalance }).from(user).where(eq(user.id, userId)).limit(1);
        return json({ left: true, chipsReturned: chipsToReturn, newBalance: Math.round(Number(final.baseCurrencyBalance) * 100000000) / 100000000 });
    }

    await redis.del(`${playerPrefix}${userId}`);

    if (table.players.length === 0) {
        await redis.del(`${tablePrefix}${tableId}`);
        await redis.del(`${codePrefix}${table.code}`);
    } else {
        await saveTable(table);
        await publishStateToAll(table);
    }

    const [final] = await db.select({ baseCurrencyBalance: user.baseCurrencyBalance }).from(user).where(eq(user.id, userId)).limit(1);
    return json({
        left: true,
        chipsReturned: chipsToReturn,
        newBalance: Math.round(Number(final.baseCurrencyBalance) * 100000000) / 100000000
    });
}
