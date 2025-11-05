import { json, error } from '@sveltejs/kit';
import { auth } from '$lib/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
    const session = await auth.api.getSession({
        headers: event.request.headers
    });

    if (!session?.user) {
        throw error(401, 'Not authenticated');
    }

    const existingKey = await auth.api.getApiKey({
        query: { id: event.params.id },
        headers: event.request.headers
    });

    if (!existingKey) {
        throw error(404, 'API key not found');
    }

    if (existingKey.userId !== session.user.id) {
        throw error(403, 'Not authorized to regenerate this API key');
    }

    console.log(existingKey.remaining)
    await auth.api.deleteApiKey({
        body: { keyId: event.params.id },
        headers: event.request.headers
    });

    let parsedPermissions: Record<string, string[]> | undefined = existingKey.permissions as Record<string, string[]> | undefined;
    if (typeof existingKey.permissions === 'string') {
        try {
            const parsed = JSON.parse(existingKey.permissions);
            parsedPermissions = parsed && typeof parsed === 'object' ? parsed : undefined;
        } catch {
            parsedPermissions = undefined;
        }
    }

    const newKey = await auth.api.createApiKey({
        body: {
            name: existingKey.name ?? undefined,
            userId: existingKey.userId,
            remaining: existingKey.remaining,
            refillAmount: existingKey.refillAmount ?? undefined,
            refillInterval: existingKey.refillInterval ?? undefined,
            rateLimitEnabled: existingKey.rateLimitEnabled,
            rateLimitTimeWindow: existingKey.rateLimitTimeWindow ?? undefined,
            rateLimitMax: existingKey.rateLimitMax ?? undefined,
            permissions: parsedPermissions,
            metadata: existingKey.metadata
        },
        headers: event.request.headers
    });
    console.log(existingKey.remaining)
    console.log(newKey.remaining)

    return json(newKey);
};