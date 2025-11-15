import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface VolumeSettings {
	master: number;
	muted: boolean;
}

const STORAGE_KEY = 'volume-settings';
const defaultSettings: VolumeSettings = { master: 0.7, muted: false };
const SAVE_DEBOUNCE_MS = 200;

function safeGet(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function safeSet(key: string, value: string): void {
	try {
		localStorage.setItem(key, value);
	} catch {
		//
	}
}

function createVolumeSettings() {
	const { subscribe, set, update } = writable<VolumeSettings>(defaultSettings);
	let saveTimeout: ReturnType<typeof setTimeout> | undefined;

	function scheduleSave(settings: VolumeSettings) {
		if (!browser) return;
		if (saveTimeout) clearTimeout(saveTimeout);
		saveTimeout = setTimeout(() => {
			try {
				safeSet(STORAGE_KEY, JSON.stringify(settings));
			} finally {
				saveTimeout = undefined;
			}
		}, SAVE_DEBOUNCE_MS);
	}

	function applySettings(obj: any) {
		if (!obj) return;
		const master = typeof obj.master === 'number' ? Math.max(0, Math.min(1, obj.master)) : defaultSettings.master;
		const muted = typeof obj.muted === 'boolean' ? obj.muted : defaultSettings.muted;
		set({ master: Math.round(master * 100) / 100, muted });
	}

	function handleStorageEvent(e: StorageEvent) {
		if (e.key !== STORAGE_KEY) return;
		if (e.newValue === null) {
			set(defaultSettings);
			return;
		}
		try {
			const parsed = JSON.parse(e.newValue);
			applySettings(parsed);
		} catch {
			//
		}
	}

	if (browser) {
		window.addEventListener('storage', handleStorageEvent);
	}

	return {
		subscribe,
		load: () => {
			if (!browser) return;
			try {
				const stored = safeGet(STORAGE_KEY);
				if (!stored) {
					safeSet(STORAGE_KEY, JSON.stringify(defaultSettings));
					set(defaultSettings);
					return;
				}
				const parsed = JSON.parse(stored);
				applySettings(parsed);
			} catch {
				set(defaultSettings);
			}
		},
		setMaster: (value: number) => {
			const clean = Math.max(0, Math.min(1, Number(value) || 0));
			update((settings) => {
				const newSettings = { ...settings, master: Math.round(clean * 100) / 100 };
				if (browser) scheduleSave(newSettings);
				return newSettings;
			});
		},
		setMuted: (value: boolean) => {
			update((settings) => {
				const newSettings = { ...settings, muted: Boolean(value) };
				if (browser) scheduleSave(newSettings);
				return newSettings;
			});
		}
	};
}

export const volumeSettings = createVolumeSettings();

if (browser) {
	try {
		volumeSettings.load();
	} catch {
		//
	}
}
