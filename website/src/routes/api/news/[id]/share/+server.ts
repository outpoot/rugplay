import { auth } from '$lib/auth';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { newsArticle, newsArticleShare } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';

// No auth required to record the global share count — sharing (or copying
// the link) is a low-stakes action we still want to count from logged-out
// visitors, same as public view counts elsewhere on the platform. If the
// visitor IS logged in, we additionally log a per-user row so a share can
// feed into that person's own affinity profile (see news/ranking.ts) —
// sharing is a stronger positive signal than a like, since it costs more
// effort and implies the person wanted someone else to see it too.
export async function POST({ params, request }) {
	const articleId = parseInt(params.id, 10);
	if (isNaN(articleId)) {
		throw error(400, 'Invalid article id');
	}

	const session = await auth.api.getSession({ headers: request.headers });
	const userId = session?.user ? Number(session.user.id) : null;

	try {
		await db
			.update(newsArticle)
			.set({
				sharesCount: sql`${newsArticle.sharesCount} + 1`,
				trendingScore: sql`${newsArticle.trendingScore} + 2`
			})
			.where(eq(newsArticle.id, articleId));

		await db.insert(newsArticleShare).values({ userId, articleId });

		return json({ success: true });
	} catch (err) {
		console.error('Failed to record news share:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
}
