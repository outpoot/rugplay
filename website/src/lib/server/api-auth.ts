import { auth } from "$lib/auth";
import { error } from "@sveltejs/kit";
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function verifyApiKeyAndGetUser(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        throw error(401, 'API key required. Use Authorization: Bearer <api-key>');
    }

    const apiKeyStr = authHeader.substring(7);
    const { valid, error: verifyError, key } = await auth.api.verifyApiKey({
        body: { key: apiKeyStr }
    });

    if (verifyError || !valid || !key) {
        throw error(401, 'Invalid API key');
    }

    const [owner] = await db.select({ isBanned: user.isBanned }).from(user)
        .where(eq(user.id, Number(key.userId))).limit(1);
    if (!owner || owner.isBanned) throw error(403, 'Account unavailable');

    return key.userId;
}
