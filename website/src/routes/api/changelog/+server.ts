import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { changelogRelease, changelogChange } from '$lib/server/db/schema';
import { asc, desc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const releases = await db
		.select({
			id: changelogRelease.id,
			version: changelogRelease.version,
			title: changelogRelease.title,
			summary: changelogRelease.summary,
			coverImage: changelogRelease.coverImage,
			coverImageIsExternal: changelogRelease.coverImageIsExternal,
			releasedAt: changelogRelease.releasedAt
		})
		.from(changelogRelease)
		.orderBy(desc(changelogRelease.releasedAt));

	const changes = await db
		.select({
			releaseId: changelogChange.releaseId,
			category: changelogChange.category,
			text: changelogChange.text
		})
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
