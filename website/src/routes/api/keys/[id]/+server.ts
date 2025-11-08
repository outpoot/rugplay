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

	const keyId = event.params.id;

	try {
		const key = await auth.api.getApiKey({
			query: { id: keyId },
			headers: event.request.headers
		});

		if (!key) {
			throw error(404, 'API key not found');
		}

		return json(key);
	} catch (err) {
		throw error(404, 'API key not found');
	}
};

export const DELETE: RequestHandler = async (event) => {
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	if (!session?.user) {
		throw error(401, 'Not authenticated');
	}

	const keyId = event.params.id;

	await auth.api.deleteApiKey({
		body: { keyId },
		headers: event.request.headers
	});

	return json({ success: true });
};
