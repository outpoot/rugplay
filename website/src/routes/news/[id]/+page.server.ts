import { error } from '@sveltejs/kit';
import type { NewsArticle } from '$lib/types/news';

export async function load({ params, fetch }) {
	const { id } = params;

	try {
		const response = await fetch(`/api/news/${id}`);

		if (!response.ok) {
			if (response.status === 404) {
				throw error(404, 'Article not found');
			}
			throw error(500, 'Failed to load article');
		}

		const article: NewsArticle = await response.json();

		return { article };
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) {
			throw e;
		}
		console.error('Failed to fetch news article:', e);
		throw error(500, 'Failed to load article');
	}
}
