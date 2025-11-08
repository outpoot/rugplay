import { writable } from 'svelte/store';

interface GamblingStats {
	losses: number;
	wins: number;
	totalGambled: number;
}

export const GAMBLING_STATS = writable<GamblingStats | null>(null);

export async function fetchGamblingStats() {
	try {
		const response = await fetch('/api/user/gambling-stats');

		if (!response.ok) {
			throw new Error('Failed to fetch gambling stats');
		}

		const stats = await response.json();
		GAMBLING_STATS.set(stats);
		return stats;
	} catch (error) {
		console.error('Error fetching gambling stats:', error);
		GAMBLING_STATS.set(null);
		return null;
	}
}
