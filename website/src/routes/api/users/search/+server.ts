import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user, userBlock } from '$lib/server/db/schema';
import { and, eq, ilike, ne, notInArray, or, sql } from 'drizzle-orm';
import { checkRateLimit } from '$lib/server/ratelimit';
import type { RequestHandler } from './$types';

const MAX_RESULTS = 8;

export const GET: RequestHandler = async ({ request, url }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Not authenticated');

	const currentUserId = Number(session.user.id);

	const allowed = await checkRateLimit(currentUserId, 'user-search', 30, 60);
	if (!allowed) throw error(429, 'Slow down — too many searches in a short time');

	const q = (url.searchParams.get('q') ?? '').trim();
	if (!q) return json({ users: [] });
	if (q.length > 50) return json({ users: [] });

	// Optional override so callers (like @mention autocomplete) can request
	// smart matching regardless of the searcher's saved setting, e.g. a
	// caller that already knows the viewer wants it for this one search.
	const forceSmartParam = url.searchParams.get('smart');

	const [currentUser] = await db
		.select({ smartSearchEnabled: user.smartSearchEnabled })
		.from(user)
		.where(eq(user.id, currentUserId))
		.limit(1);

	const smartSearch =
		forceSmartParam !== null ? forceSmartParam === 'true' : (currentUser?.smartSearchEnabled ?? false);

	// Don't suggest users who've blocked the searcher, or who the searcher
	// has blocked — same pairing already used for comment mentions.
	const blocks = await db
		.select({ blockerId: userBlock.blockerId, blockedId: userBlock.blockedId })
		.from(userBlock)
		.where(or(eq(userBlock.blockerId, currentUserId), eq(userBlock.blockedId, currentUserId)));

	const hiddenUserIds = new Set<number>();
	for (const b of blocks) {
		if (b.blockerId === currentUserId) hiddenUserIds.add(b.blockedId);
		if (b.blockedId === currentUserId) hiddenUserIds.add(b.blockerId);
	}

	const pattern = `%${q}%`;
	const matchCondition = smartSearch
		? or(ilike(user.username, pattern), ilike(user.name, pattern), ilike(user.bio, pattern))
		: ilike(user.username, pattern);

	const whereClauses = [ne(user.id, currentUserId), eq(user.isBanned, false), matchCondition];
	if (hiddenUserIds.size > 0) {
		whereClauses.push(notInArray(user.id, [...hiddenUserIds]));
	}

	const results = await db
		.select({
			id: user.id,
			username: user.username,
			name: user.name,
			image: user.image,
			bio: user.bio,
			isAdmin: user.isAdmin
		})
		.from(user)
		.where(and(...whereClauses))
		// Prioritize username-prefix matches first, then trigram similarity
		// so "closest match" ranks above "matched anywhere in a long bio".
		.orderBy(
			sql`CASE WHEN ${user.username} ILIKE ${q + '%'} THEN 0 ELSE 1 END`,
			sql`similarity(${user.username}, ${q}) DESC`
		)
		.limit(MAX_RESULTS);

	return json({ users: results, smartSearch });
};
