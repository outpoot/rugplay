import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { changelogRelease, changelogChange, user } from '$lib/server/db/schema';
import { eq, ne, and } from 'drizzle-orm';
import { uploadChangelogImage, deleteObject } from '$lib/server/s3';
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

export const PATCH: RequestHandler = async ({ request, params }) => {
	const userId = await requireAdmin(request);

	const allowed = await checkRateLimit(userId, 'changelog-write', 20, 60);
	if (!allowed) throw error(429, 'Slow down — too many changelog edits in a short time');

	const releaseId = parseInt(params.id, 10);
	if (isNaN(releaseId)) return json({ error: 'Invalid release id' }, { status: 400 });

	const [existing] = await db
		.select()
		.from(changelogRelease)
		.where(eq(changelogRelease.id, releaseId))
		.limit(1);
	if (!existing) return json({ error: 'Release not found' }, { status: 404 });

	const formData = await request.formData();
	const version = (formData.get('version') as string | null)?.trim();
	const title = (formData.get('title') as string | null)?.trim() || null;
	const summary = (formData.get('summary') as string | null)?.trim() || null;
	const releasedAtRaw = formData.get('releasedAt') as string | null;
	const imageUrl = (formData.get('imageUrl') as string | null)?.trim() || null;
	const imageFile = formData.get('image') as File | null;
	const removeImage = formData.get('removeImage') === 'true';
	const changesRaw = formData.get('changes') as string | null;

	if (!version) return json({ error: 'Version is required' }, { status: 400 });
	if (version.length > 50) {
		return json({ error: 'Version must be 50 characters or fewer' }, { status: 400 });
	}

	const [conflict] = await db
		.select({ id: changelogRelease.id })
		.from(changelogRelease)
		.where(and(eq(changelogRelease.version, version), ne(changelogRelease.id, releaseId)))
		.limit(1);
	if (conflict) {
		return json({ error: 'Another release already uses this version' }, { status: 400 });
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

	let parsedChanges: { category: Category; text: string }[] | null = null;
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

	// Figure out the cover image update. Three cases: swap to a new
	// uploaded file, swap to a URL, or explicit removal. Only delete the
	// old object-storage key if it was an internal upload (not a URL).
	let coverImage = existing.coverImage;
	let coverImageIsExternal = existing.coverImageIsExternal;
	const oldInternalKey = !existing.coverImageIsExternal ? existing.coverImage : null;

	if (removeImage) {
		coverImage = null;
		coverImageIsExternal = false;
	} else if (imageUrl) {
		coverImage = imageUrl;
		coverImageIsExternal = true;
	} else if (imageFile && imageFile.size > 0) {
		const arrayBuffer = await imageFile.arrayBuffer();
		const key = await uploadChangelogImage(releaseId, new Uint8Array(arrayBuffer), imageFile.type);
		coverImage = key;
		coverImageIsExternal = false;
	}

	const [updated] = await db
		.update(changelogRelease)
		.set({
			version,
			title,
			summary,
			releasedAt: releasedAtRaw ? new Date(releasedAtRaw) : existing.releasedAt,
			coverImage,
			coverImageIsExternal,
			updatedBy: userId,
			updatedAt: new Date()
		})
		.where(eq(changelogRelease.id, releaseId))
		.returning();

	if (oldInternalKey && oldInternalKey !== coverImage) {
		deleteObject(oldInternalKey).catch(console.error);
	}

	if (parsedChanges) {
		await db.delete(changelogChange).where(eq(changelogChange.releaseId, releaseId));
		if (parsedChanges.length > 0) {
			await db.insert(changelogChange).values(
				parsedChanges.map((c, i) => ({
					releaseId,
					category: c.category,
					text: c.text,
					sortOrder: i
				}))
			);
		}
	}

	return json({ success: true, release: updated });
};

export const DELETE: RequestHandler = async ({ request, params }) => {
	const userId = await requireAdmin(request);

	const allowed = await checkRateLimit(userId, 'changelog-write', 20, 60);
	if (!allowed) throw error(429, 'Slow down — too many changelog edits in a short time');

	const releaseId = parseInt(params.id, 10);
	if (isNaN(releaseId)) return json({ error: 'Invalid release id' }, { status: 400 });

	const [existing] = await db
		.select()
		.from(changelogRelease)
		.where(eq(changelogRelease.id, releaseId))
		.limit(1);
	if (!existing) return json({ error: 'Release not found' }, { status: 404 });

	// changelog_change rows cascade on delete via the FK.
	await db.delete(changelogRelease).where(eq(changelogRelease.id, releaseId));

	if (!existing.coverImageIsExternal && existing.coverImage) {
		deleteObject(existing.coverImage).catch(console.error);
	}

	return json({ success: true });
};
