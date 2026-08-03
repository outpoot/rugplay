import { error, json } from '@sveltejs/kit';
import { auth } from '$lib/auth';
import { db } from '$lib/server/db';
import { season, user } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { RANKED_STAKE, SEASON_LENGTH_MS, getSeasonName } from '$lib/data/seasons';
import { ensureSeasonExists, getActiveSeason } from '$lib/server/seasons';

async function requireAdmin(request: Request) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(403, 'Admin access required');

	const [currentUser] = await db
		.select({ isAdmin: user.isAdmin })
		.from(user)
		.where(eq(user.id, Number(session.user.id)))
		.limit(1);
	if (!currentUser?.isAdmin) throw error(403, 'Admin access required');
}

function serializeSeason(value: typeof season.$inferSelect) {
	return {
		id: value.id,
		number: value.number,
		name: value.name,
		backgroundImage: value.backgroundImage,
		status: value.status,
		startsAt: value.startsAt,
		endsAt: value.endsAt,
		rankedStake: Number(value.rankedStake)
	};
}

function normalizeBackgroundImage(value: unknown): string | null {
	if (value == null || value === '') return null;
	if (typeof value !== 'string') throw error(400, 'Background image must be a URL or site path');

	const image = value.trim();
	if (image.length > 2048 || (!image.startsWith('/') && !image.startsWith('https://'))) {
		throw error(400, 'Background image must start with / or https://');
	}
	return image;
}

export const GET: RequestHandler = async ({ request }) => {
	await requireAdmin(request);
	await ensureSeasonExists();

	const current = await getActiveSeason();
	if (!current) throw error(404, 'No active season found');

	const [upcoming] = await db
		.select()
		.from(season)
		.where(and(eq(season.number, current.number + 1), eq(season.status, 'UPCOMING')))
		.limit(1);

	return json({ current: serializeSeason(current), upcoming: upcoming ? serializeSeason(upcoming) : null });
};

export const POST: RequestHandler = async ({ request }) => {
	await requireAdmin(request);
	await ensureSeasonExists();

	const { name, backgroundImage } = await request.json();
	const normalizedName = typeof name === 'string' ? name.trim() : '';
	if (!normalizedName || normalizedName.length > 80) {
		throw error(400, 'Season name is required and must be at most 80 characters');
	}

	const current = await getActiveSeason();
	if (!current) throw error(404, 'No active season found');

	const nextNumber = current.number + 1;
	const startsAt = current.endsAt;
	const endsAt = new Date(startsAt.getTime() + SEASON_LENGTH_MS);
	const values = {
		name: normalizedName,
		backgroundImage: normalizeBackgroundImage(backgroundImage),
		startsAt,
		endsAt,
		rankedStake: RANKED_STAKE.toFixed(8)
	};

	const [existing] = await db
		.select()
		.from(season)
		.where(eq(season.number, nextNumber))
		.limit(1);

	let saved: typeof season.$inferSelect;
	if (existing) {
		if (existing.status !== 'UPCOMING') throw error(409, 'The next season has already started');
		const [updated] = await db.update(season).set(values).where(eq(season.id, existing.id)).returning();
		saved = updated;
	} else {
		const [created] = await db
			.insert(season)
			.values({ number: nextNumber, status: 'UPCOMING', ...values })
			.returning();
		saved = created;
	}

	return json({ success: true, season: serializeSeason(saved) });
};
