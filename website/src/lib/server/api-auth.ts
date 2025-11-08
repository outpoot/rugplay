import { auth } from '$lib/auth';
import { error } from '@sveltejs/kit';

export async function verifyApiKeyAndGetUser(request: Request) {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		throw error(401, 'API key required. Use Authorization: Bearer <api-key>');
	}

	const apiKeyStr = authHeader.substring(7);
	const {
		valid,
		error: verifyError,
		key
	} = await auth.api.verifyApiKey({
		body: { key: apiKeyStr }
	});

	if (verifyError || !valid || !key) {
		throw error(401, 'Invalid API key');
	}

	return key.userId;
}
