import { writable } from 'svelte/store';

export const GEMS_BALANCE = writable<number | null>(null);

export async function fetchGemsBalance() {
	try {
		const response = await fetch('/api/shop/inventory');
		if (!response.ok) return;
		const data = await response.json();
		GEMS_BALANCE.set(data.gems ?? 0);
	} catch (e) {
		console.error('Error fetching gems balance:', e);
	}
}
