import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { ilike, or, sql } from 'drizzle-orm';

export async function GET({ url }) {
	const query = (url.searchParams.get('q') ?? '').trim().replace(/^@/, '');
	const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '6') || 6, 1), 20);

	if (query.length < 2 || query.length > 50) {
		return json({ results: [] });
	}

	// Escape LIKE wildcards so "100%" or "a_b" are matched literally.
	const escaped = query.replace(/[\\%_]/g, '\\$&');
	const contains = `%${escaped}%`;
	const prefix = `${escaped}%`;

	const results = await db
		.select({
			id: user.id,
			name: user.name,
			username: user.username,
			image: user.image,
			nameColor: user.nameColor
		})
		.from(user)
		.where(or(ilike(user.username, contains), ilike(user.name, contains)))
		.orderBy(
			sql`CASE
				WHEN lower(${user.username}) = lower(${query}) THEN 0
				WHEN lower(${user.name}) = lower(${query}) THEN 1
				WHEN ${user.username} ILIKE ${prefix} THEN 2
				WHEN ${user.name} ILIKE ${prefix} THEN 3
				ELSE 4
			END`,
			sql`length(${user.username})`,
			user.username
		)
		.limit(limit);

	return json({ results });
}
