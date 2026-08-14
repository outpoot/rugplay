import { json, error } from '@sveltejs/kit';
import { auth } from '$lib/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
    const session = await auth.api.getSession({
        headers: event.request.headers
    });

    if (!session?.user) {
        throw error(401, 'Not authenticated');
    }

    const keys = await auth.api.listApiKeys({
        headers: event.request.headers
    });

    return json(keys);
};

export const POST: RequestHandler = async (event) => {
    const session = await auth.api.getSession({
        headers: event.request.headers
    });

    if (!session?.user) {
        throw error(401, 'Not authenticated');
    }

    const existingKeys = await auth.api.listApiKeys({
        headers: event.request.headers
    });

    if (existingKeys.length > 0) {
        throw error(400, 'You can only have one API key at a time');
    }

    // Note: `remaining` and `permissions` can only be set from the server auth
    // instance (better-auth rejects them on authenticated requests), and a
    // non-refilling `remaining` count would exhaust the key forever. The daily
    // 2000-request limit is enforced separately by `verifyApiKeyAndGetUser`
    // with a Redis counter that resets every day.
    const apiKey = await auth.api.createApiKey({
        body: {
            name: "API Key"
        },
        headers: event.request.headers
    });

    return json(apiKey);
};
