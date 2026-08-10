import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { changelogRelease, changelogChange, user } from '$lib/server/db/schema';
import { eq, asc, desc } from 'drizzle-orm';
import { uploadChangelogImage } from '$lib/server/s3';
import { checkRateLimit } from '$lib/server/ratelimit';
import { MAX_FILE_SIZE } from '$lib/data/constants';
import type { RequestHandler } from './$types';

const VALID_CATEGORIES = ['NEW', 'IMPROVED', 'FIXED', 'REMOVED'] as const;
type Category = (typeof VALID_CATEGORIES)[number];

async function requireAdmin(request: Request) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(403, 'Admin access required');

	const [currentUser] = await db
		.select({ isAdmin: user.isAdmin })
		.from(user)
		.where(eq(user.id, Number(session.user.id)))
		.limit(1);
	if (!currentUser?.isAdmin) throw error(403, 'Admin access required');

	return Number(session.user.id);
}

function isValidCategory(value: unknown): value is Category {
	return typeof value === 'string' && (VALID_CATEGORIES as readonly string[]).includes(value);
}

function isValidHttpUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}

export const GET: RequestHandler = async ({ request }) => {
	await requireAdmin(request);

	const releases = await db
		.select()
		.from(changelogRelease)
		.orderBy(desc(changelogRelease.releasedAt));

	const changes = await db
		.select()
		.from(changelogChange)
		.orderBy(asc(changelogChange.sortOrder));

	const changesByRelease = new Map<number, typeof changes>();
	for (const change of changes) {
		const list = changesByRelease.get(change.releaseId) ?? [];
		list.push(change);
		changesByRelease.set(change.releaseId, list);
	}

	return json({
		releases: releases.map((release) => ({
			...release,
			changes: changesByRelease.get(release.id) ?? []
		}))
	});
};

export const POST: RequestHandler = async ({ request }) => {
	const userId = await requireAdmin(request);

	const allowed = await checkRateLimit(userId, 'changelog-write', 20, 60);
	if (!allowed) throw error(429, 'Slow down — too many changelog edits in a short time');

	const formData = await request.formData();
	const version = (formData.get('version') as string | null)?.trim();
	const title = (formData.get('title') as string | null)?.trim() || null;
	const summary = (formData.get('summary') as string | null)?.trim() || null;
	const releasedAtRaw = formData.get('releasedAt') as string | null;
	const imageUrl = (formData.get('imageUrl') as string | null)?.trim() || null;
	const imageFile = formData.get('image') as File | null;
	const changesRaw = formData.get('changes') as string | null;

	if (!version) {
		return json({ error: 'Version is required' }, { status: 400 });
	}
	if (version.length > 50) {
		return json({ error: 'Version must be 50 characters or fewer' }, { status: 400 });
	}

	let parsedChanges: { category: Category; text: string }[] = [];
	if (changesRaw) {
		try {
			const raw = JSON.parse(changesRaw);
			if (!Array.isArray(raw)) throw new Error('changes must be an array');
			parsedChanges = raw.map((c: unknown) => {
				if (
					typeof c !== 'object' ||
					c === null ||
					!isValidCategory((c as { category?: unknown }).category) ||
					typeof (c as { text?: unknown }).text !== 'string' ||
					!(c as { text: string }).text.trim()
				) {
					throw new Error('Each change needs a valid category and non-empty text');
				}
				return {
					category: (c as { category: Category }).category,
					text: (c as { text: string }).text.trim().slice(0, 280)
				};
			});
		} catch (e) {
			return json(
				{ error: e instanceof Error ? e.message : 'Invalid changes payload' },
				{ status: 400 }
			);
		}
	}

	if (imageFile && imageFile.size > 0 && imageUrl) {
		return json({ error: 'Provide either an uploaded image or an image URL, not both' }, {
			status: 400
		});
	}
	if (imageFile && imageFile.size > MAX_FILE_SIZE) {
		return json({ error: 'Image is too large (max 1MB)' }, { status: 400 });
	}
	if (imageUrl && !isValidHttpUrl(imageUrl)) {
		return json({ error: 'Image URL must be a valid http(s) URL' }, { status: 400 });
	}

	const [existing] = await db
		.select({ id: changelogRelease.id })
		.from(changelogRelease)
		.where(eq(changelogRelease.version, version))
		.limit(1);
	if (existing) {
		return json({ error: 'A release with this version already exists' }, { status: 400 });
	}

	const [created] = await db
		.insert(changelogRelease)
		.values({
			version,
			title,
			summary,
			releasedAt: releasedAtRaw ? new Date(releasedAtRaw) : new Date(),
			coverImage: imageUrl || null,
			coverImageIsExternal: Boolean(imageUrl),
			createdBy: userId,
			updatedBy: userId
		})
		.returning();

	// Upload after the row exists so the storage key can reference its id.
	if (imageFile && imageFile.size > 0) {
		try {
			const arrayBuffer = await imageFile.arrayBuffer();
			const key = await uploadChangelogImage(created.id, new Uint8Array(arrayBuffer), imageFile.type);
			await db
				.update(changelogRelease)
				.set({ coverImage: key, coverImageIsExternal: false })
				.where(eq(changelogRelease.id, created.id));
			created.coverImage = key;
		} catch (e) {
			// Release row already exists; surface the image failure but don't
			// roll back the whole release for it.
			return json({
				success: true,
				release: created,
				warning: e instanceof Error ? e.message : 'Image upload failed'
			});
		}
	}

	if (parsedChanges.length > 0) {
		await db.insert(changelogChange).values(
			parsedChanges.map((c, i) => ({
				releaseId: created.id,
				category: c.category,
				text: c.text,
				sortOrder: i
			}))
		);
	}

	return json({ success: true, release: created });
};
