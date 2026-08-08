import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'rugplay:last-seen-changelog';
const REACTIONS_KEY = 'rugplay:changelog-reactions';

function createLastSeenStore() {
	const initial = browser ? (localStorage.getItem(STORAGE_KEY) ?? '') : '';
	const { subscribe, set } = writable<string>(initial);

	return {
		subscribe,
		markSeen: (version: string) => {
			if (!version) return;
			if (browser) {
				localStorage.setItem(STORAGE_KEY, version);
			}
			set(version);
		}
	};
}

export const LAST_SEEN_VERSION = createLastSeenStore();

// Sidebar badge fetches the latest version once and compares it against
// the persisted last-seen value — see AppSidebar.svelte.
export function hasUnreadChangelog(lastSeen: string, latestVersion: string | null): boolean {
	if (!latestVersion) return false;
	return lastSeen !== latestVersion;
}

// Client-side-only like/dislike per version, mirroring the news article
// reaction shape (LIKE/DISLIKE, one active choice, click again to undo).
// There's no backend table for changelog reactions, so this is local only.
export type ChangelogReaction = 'LIKE' | 'DISLIKE';
export type ReactionState = Record<string, ChangelogReaction>;

function loadReactions(): ReactionState {
	if (!browser) return {};
	try {
		return JSON.parse(localStorage.getItem(REACTIONS_KEY) ?? '{}');
	} catch {
		return {};
	}
}

function createReactionsStore() {
	const { subscribe, update } = writable<ReactionState>(loadReactions());

	function persist(state: ReactionState) {
		if (browser) localStorage.setItem(REACTIONS_KEY, JSON.stringify(state));
	}

	return {
		subscribe,
		react: (version: string, type: ChangelogReaction) => {
			update((state) => {
				const next = { ...state };
				if (next[version] === type) {
					delete next[version];
				} else {
					next[version] = type;
				}
				persist(next);
				return next;
			});
		}
	};
}

export const CHANGELOG_REACTIONS = createReactionsStore();
