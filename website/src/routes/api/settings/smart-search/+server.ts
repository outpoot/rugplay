import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function POST({ request }) {
    const session = await auth.api.getSession({
        headers: request.headers
    });

    if (!session?.user) {
        throw error(401, 'Not authenticated');
    }

    const { smartSearchEnabled } = await request.json();

    if (typeof smartSearchEnabled !== 'boolean') {
        throw error(400, 'Invalid value for smartSearchEnabled');
    }

    await db.update(user)
        .set({ smartSearchEnabled, updatedAt: new Date() })
        .where(eq(user.id, Number(session.user.id)));

    return json({ success: true });
}
