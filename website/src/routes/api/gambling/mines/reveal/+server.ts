import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { activeGames, calculateMultiplier } from '$lib/server/games/mines';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
    const session = await auth.api.getSession({
        headers: request.headers
    });

    if (!session?.user) {
        throw error(401, 'Not authenticated');
    }

    try {
        const { sessionToken, tileIndex } = await request.json();
        const game = activeGames.get(sessionToken);

        if (!game) {
            return json({ error: 'Invalid session' }, { status: 400 });
        }

        if (game.revealedTiles.includes(tileIndex)) {
            return json({ error: 'Tile already revealed' }, { status: 400 });
        }

        // Update last activity time
        game.lastActivity = Date.now();

        // Check if hit mine

        if (game.minePositions.includes(tileIndex)) {
            game.status = 'lost';
            const minePositions = game.minePositions;
        
            // Fetch user balance to return after loss
            const userId = Number(session.user.id);
            const [userData] = await db
                .select({ baseCurrencyBalance: user.baseCurrencyBalance })
                .from(user)
                .where(eq(user.id, userId))
                .limit(1);
        
            activeGames.delete(sessionToken);
        
            return json({
                hitMine: true,
                minePositions,
                newBalance: Number(userData.baseCurrencyBalance), 
                status: 'lost'
            });
        }


        // Safe tile
        game.revealedTiles.push(tileIndex);
        game.currentMultiplier = calculateMultiplier(
            game.revealedTiles.length,
            game.mineCount,
            game.betAmount
        );
        
        // Check if all safe tiles are revealed. Crazy when you get this :)
        if (game.revealedTiles.length === 25 - game.mineCount) {
            game.status = 'won';
        }

        return json({
            hitMine: false,
            currentMultiplier: game.currentMultiplier,
            status: game.status
        });
    } catch (e) {
        console.error('Mines reveal error:', e);
        const errorMessage = e instanceof Error ? e.message : 'Internal server error';
        return json({ error: errorMessage }, { status: 400 });
    }
}; 