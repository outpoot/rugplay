import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
	const { coinSymbol } = params;
	if (!coinSymbol) {
		throw error(400, 'Coin symbol is required');
	}

	const page = url.searchParams.get('page') || '1';
	const limit = url.searchParams.get('limit') || '100';

	const apiUrl = `https://api.vaaq.dev/rugplay/v1/search/?coinSymbol=${coinSymbol}&page=${page}&limit=${limit}`;

	try {
		const response = await fetch(apiUrl, {
			headers: {
				Accept: 'application/json'
			}
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`External API error: ${response.status} ${errorText}`);
			throw error(response.status, `Failed to fetch from external API: ${errorText}`);
		}

		const data = await response.json();
		return json(data);
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Proxy request failed:', err);
		throw error(500, 'Failed to proxy request');
	}
};