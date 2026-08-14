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

    await auth.api.deleteApiKey({
        body: { keyId: event.params.id },
        headers: event.request.headers
    });

    // Same as create: `remaining`, `permissions`, and rate-limit fields can only
    // be set from the server auth instance, and a non-refilling `remaining`
    // would exhaust the key forever. The daily limit is enforced separately in
    // `verifyApiKeyAndGetUser`, and default permissions come from the plugin
    // config.
    const newKey = await auth.api.createApiKey({
        body: {
            name: existingKey.name ?? undefined,
            metadata: existingKey.metadata
        },
        headers: event.request.headers
    });

    return json(newKey);
};