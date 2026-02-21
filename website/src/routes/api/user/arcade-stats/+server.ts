import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
    const session = await auth.api.getSession({
        headers: request.headers
    });

    if (!session?.user) {
        throw error(401, 'Not authenticated');
    }

    try {
        const userId = Number(session.user.id);

        const [userData] = await db
            .select({
                arcadeLosses: user.arcadeLosses,
                arcadeWins: user.arcadeWins
            })
            .from(user)
            .where(eq(user.id, userId))
            .limit(1);

        if (!userData) {
            throw error(404, 'User not found');
        }

        const losses = Number(userData.arcadeLosses || 0);
        const wins = Number(userData.arcadeWins || 0);

        return json({
            losses,
            wins,
            totalPlayed: losses + wins
        });
    } catch (e) {
        console.error('Arcade stats API error:', e);
        const errorMessage = e instanceof Error ? e.message : 'Internal server error';
        return json({ error: errorMessage }, { status: 500 });
    }
};