import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { or, ilike } from 'drizzle-orm';

export async function GET({ url }) {
    const q = url.searchParams.get('q')?.trim() ?? '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '5'), 10);

    if (!q || q.length < 1) {
        return json({ users: [] });
    }

    try {
        const results = await db
            .select({
                id: user.id,
                name: user.name,
                username: user.username,
                image: user.image,
            })
            .from(user)
            .where(
                or(
                    ilike(user.username, `${q}%`),
                    ilike(user.name, `${q}%`)
                )
            )
            .limit(limit);

        return json({ users: results });
    } catch (e) {
        console.error('User search failed:', e);
        throw error(500, 'Search failed');
    }
}