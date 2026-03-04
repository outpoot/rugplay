// src/routes/api/coin-chat/[coinSymbol]/+server.ts
// GET  → last 50 chat messages for the coin
// POST → post a new chat message (max 300 chars, rate-limited to 1 per 5s via Redis)

import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { comment, coin, user } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import type { RequestHandler } from './$types';

const MAX_CHARS = 300;
const RATE_LIMIT_SECONDS = 5;

async function getCoin(symbol: string) {
    const [c] = await db
        .select({ id: coin.id, symbol: coin.symbol, isListed: coin.isListed })
        .from(coin)
        .where(eq(coin.symbol, symbol.toUpperCase()))
        .limit(1);
    return c ?? null;
}

export const GET: RequestHandler = async ({ params }) => {
    const coinRow = await getCoin(params.coinSymbol);
    if (!coinRow) throw error(404, 'Coin not found');

    const messages = await db
        .select({
            id: comment.id,
            content: comment.content,
            likesCount: comment.likesCount,
            createdAt: comment.createdAt,
            userId: user.id,
            username: user.username,
            userImage: user.image,
            prestigeLevel: user.prestigeLevel,
            nameColor: user.nameColor,
            founderBadge: user.founderBadge,
            isAdmin: user.isAdmin,
        })
        .from(comment)
        .leftJoin(user, eq(comment.userId, user.id))
        .where(
            and(
                eq(comment.coinId, coinRow.id),
                eq(comment.isDeleted, false),
                eq(comment.isChat, true)
            )
        )
        .orderBy(desc(comment.createdAt))
        .limit(50);

    // Return in ascending order so the UI can append new messages at the bottom
    return json(messages.reverse());
};

export const POST: RequestHandler = async ({ request, params }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw error(401, 'Not authenticated');

    const userId = Number(session.user.id);
    const coinRow = await getCoin(params.coinSymbol);
    if (!coinRow) throw error(404, 'Coin not found');
    if (!coinRow.isListed) throw error(403, 'Coin is not listed');

    // ── Rate limit: 1 message per RATE_LIMIT_SECONDS via Redis ──────────────
    const rateLimitKey = `chat_rl:${userId}:${coinRow.id}`;
    const existing = await redis.get(rateLimitKey);
    if (existing) {
        throw error(429, `Please wait ${RATE_LIMIT_SECONDS} seconds between messages`);
    }
    await redis.set(rateLimitKey, '1', 'EX', RATE_LIMIT_SECONDS);

    const body = await request.json();
    const content = String(body?.content ?? '').trim();

    if (!content) throw error(400, 'Message cannot be empty');
    if (content.length > MAX_CHARS) throw error(400, `Message too long (max ${MAX_CHARS} chars)`);

    const [newMsg] = await db
        .insert(comment)
        .values({
            userId,
            coinId: coinRow.id,
            content,
            isChat: true,
        })
        .returning({ id: comment.id, createdAt: comment.createdAt });

    // Fetch the full row with user info to return to the client
    const [full] = await db
        .select({
            id: comment.id,
            content: comment.content,
            likesCount: comment.likesCount,
            createdAt: comment.createdAt,
            userId: user.id,
            username: user.username,
            userImage: user.image,
            prestigeLevel: user.prestigeLevel,
            nameColor: user.nameColor,
            founderBadge: user.founderBadge,
            isAdmin: user.isAdmin,
        })
        .from(comment)
        .leftJoin(user, eq(comment.userId, user.id))
        .where(eq(comment.id, newMsg.id))
        .limit(1);

    return json(full, { status: 201 });
};
