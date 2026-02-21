import { writable } from 'svelte/store';

interface ArcadeStats {
    losses: number;
    wins: number;
    totalPlayed: number;
}

export const ARCADE_STATS = writable<ArcadeStats | null>(null);

export async function fetchArcadeStats() {
    try {
        const response = await fetch('/api/user/arcade-stats');

        if (!response.ok) {
            throw new Error('Failed to fetch arcade stats');
        }

        const stats = await response.json();
        ARCADE_STATS.set(stats);
        return stats;
    } catch (error) {
        console.error('Error fetching arcade stats:', error);
        ARCADE_STATS.set(null);
        return null;
    }
}