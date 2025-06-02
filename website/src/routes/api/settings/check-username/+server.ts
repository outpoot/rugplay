import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { isNameAppropriate } from '$lib/server/moderation';

export async function GET({ url }) {
    let username = url.searchParams.get('username')?.toLowerCase().trim();
    if (!username) {
        return json({ available: false });
    }

    username = username.trim().replace(/\s+/g, ' ');

    if (username.length < 3 || username.length > 30) {
        return json({
            available: false,
            reason: 'Username must be between 3 and 30 characters'
        });
    }

    const alphanumericRegex = /^[a-z0-9_]+$/;
    if (!alphanumericRegex.test(username)) {
        return json({
            available: false,
            reason: 'Username must contain only lowercase letters, numbers, and underscores'
        });
    }

    if (!(await isNameAppropriate(username))) {
        return json({ available: false, reason: 'Inappropriate content' });
    }

    const exists = await db.query.user.findFirst({
        where: eq(user.username, username)
    });

    return json({ available: !exists });
}
