import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface VolumeSettings {
	master: number;
	muted: boolean;
}

const defaultSettings: VolumeSettings = {
	master: 0.7,
	muted: false
};

function createVolumeSettings() {
	const { subscribe, set, update } = writable<VolumeSettings>(defaultSettings);

	return {
		subscribe,
		load: () => {
			if (browser) {
				const stored = localStorage.getItem('volume-settings');
				if (stored) {
					try {
						const settings = JSON.parse(stored);
						set({ ...defaultSettings, ...settings });
					} catch (e) {
						console.error('Failed to parse volume settings:', e);
					}
				}
			}
		},
		setMaster: (value: number) => {
			update((settings) => {
				const newSettings = { ...settings, master: Math.max(0, Math.min(1, value)) };
				if (browser) {
					localStorage.setItem('volume-settings', JSON.stringify(newSettings));
				}
				return newSettings;
			});
		},
		setMuted: (value: boolean) => {
			update((settings) => {
				const newSettings = { ...settings, muted: value };
				if (browser) {
					localStorage.setItem('volume-settings', JSON.stringify(newSettings));
				}
				return newSettings;
			});
		}
	};
}

export const volumeSettings = createVolumeSettings();
