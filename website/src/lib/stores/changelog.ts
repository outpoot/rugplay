import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { getLatestVersion } from '$lib/data/changelog';

const STORAGE_KEY = 'rugplay:last-seen-changelog';
const REACTIONS_KEY = 'rugplay:changelog-reactions';

function createLastSeenStore() {
	const initial = browser ? (localStorage.getItem(STORAGE_KEY) ?? '') : '';
	const { subscribe, set } = writable<string>(initial);

	return {
		subscribe,
		markSeen: (version: string = getLatestVersion()) => {
			if (browser) {
				localStorage.setItem(STORAGE_KEY, version);
			}
			set(version);
		}
	};
}

export const LAST_SEEN_VERSION = createLastSeenStore();

export function hasUnreadChangelog(lastSeen: string): boolean {
	return lastSeen !== getLatestVersion();
}

// Lightweight client-side-only reaction tally per version, e.g. { "2.4.0": { fire: 3, skull: 1 } }
export type ReactionKey = 'fire' | 'skull' | 'rocket';
export type ReactionTally = Record<string, Partial<Record<ReactionKey, number>>>;

function loadReactions(): ReactionTally {
	if (!browser) return {};
	try {
		return JSON.parse(localStorage.getItem(REACTIONS_KEY) ?? '{}');
	} catch {
		return {};
	}
}

function createReactionsStore() {
	const { subscribe, update, set } = writable<ReactionTally>(loadReactions());

	return {
		subscribe,
		react: (version: string, key: ReactionKey) => {
			update((tally) => {
				const versionTally = { ...(tally[version] ?? {}) };
				versionTally[key] = (versionTally[key] ?? 0) + 1;
				const next = { ...tally, [version]: versionTally };
				if (browser) {
					localStorage.setItem(REACTIONS_KEY, JSON.stringify(next));
				}
				return next;
			});
		},
		reset: () => {
			if (browser) localStorage.removeItem(REACTIONS_KEY);
			set({});
		}
	};
}

export const CHANGELOG_REACTIONS = createReactionsStore();
