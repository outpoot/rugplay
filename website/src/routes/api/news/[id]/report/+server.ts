import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { newsArticle, newsArticleReport } from '$lib/server/db/schema';
import { eq, and, sql, count } from 'drizzle-orm';

// Auto-hide an article pending review once it collects this many distinct
// reports — mirrors the "soft hide" pattern used elsewhere (isBanned,
// isDeleted) rather than hard-deleting content admins may want to review.
const AUTO_HIDE_THRESHOLD = 5;

export async function POST({ request, params }) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		throw error(401, 'Not authenticated');
	}
	const userId = Number(session.user.id);
	const articleId = parseInt(params.id, 10);
	if (isNaN(articleId)) {
		throw error(400, 'Invalid article id');
	}

	const body = await request.json().catch(() => ({}));
	const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 300) : null;

	try {
		const [existing] = await db
			.select({ id: newsArticleReport.id })
			.from(newsArticleReport)
			.where(
				and(eq(newsArticleReport.userId, userId), eq(newsArticleReport.articleId, articleId))
			)
			.limit(1);

		if (existing) {
			return json({ message: 'You already reported this article' }, { status: 409 });
		}

		await db.insert(newsArticleReport).values({ userId, articleId, reason });

		const [{ value: reportCount }] = await db
			.select({ value: count() })
			.from(newsArticleReport)
			.where(eq(newsArticleReport.articleId, articleId));

		if (reportCount >= AUTO_HIDE_THRESHOLD) {
			await db.update(newsArticle).set({ isHidden: true }).where(eq(newsArticle.id, articleId));
		}

		return json({ success: true, reportCount });
	} catch (err) {
		console.error('Failed to report news article:', err);
		return json({ message: 'Internal server error' }, { status: 500 });
	}
}
