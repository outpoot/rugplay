import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'achievements_new_count';

function getStoredCount(): number {
	if (!browser) return 0;
	try {
		return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
	} catch {
		return 0;
	}
}

function createNewAchievementsStore() {
	const { subscribe, set, update } = writable<number>(getStoredCount());

	return {
		subscribe,
		set: (n: number) => {
			set(n);
			if (browser) localStorage.setItem(STORAGE_KEY, String(n));
		},
		increment: () => {
			update((n) => {
				const next = n + 1;
				if (browser) localStorage.setItem(STORAGE_KEY, String(next));
				return next;
			});
		},
		reset: () => {
			set(0);
			if (browser) localStorage.setItem(STORAGE_KEY, '0');
		}
	};
}

export const NEW_ACHIEVEMENTS_COUNT = createNewAchievementsStore();
