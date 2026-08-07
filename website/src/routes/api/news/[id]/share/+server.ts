import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { newsArticle } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';

// No auth required — sharing (or copying the link) is a low-stakes action
// we still want to count from logged-out visitors, same as public view
// counts elsewhere on the platform.
export async function POST({ params }) {
	const articleId = parseInt(params.id, 10);
	if (isNaN(articleId)) {
		throw error(400, 'Invalid article id');
	}

	try {
		await db
			.update(newsArticle)
			.set({
				sharesCount: sql`${newsArticle.sharesCount} + 1`,
				trendingScore: sql`${newsArticle.trendingScore} + 2`
			})
			.where(eq(newsArticle.id, articleId));

		return json({ success: true });
	} catch (err) {
		console.error('Failed to record news share:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
}
