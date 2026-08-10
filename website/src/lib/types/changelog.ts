export type ChangelogCategory = 'NEW' | 'IMPROVED' | 'FIXED' | 'REMOVED';

export interface ChangelogChangeRow {
	category: ChangelogCategory;
	text: string;
}

export interface PublicChangelogRelease {
	id: number;
	version: string;
	title: string | null;
	summary: string | null;
	coverImage: string | null;
	coverImageIsExternal: boolean;
	releasedAt: string;
	changes: ChangelogChangeRow[];
}

export interface AdminChangelogRelease extends PublicChangelogRelease {
	createdBy: number | null;
	updatedBy: number | null;
	createdAt: string;
	updatedAt: string;
}
