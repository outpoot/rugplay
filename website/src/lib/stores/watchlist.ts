import { get, writable } from 'svelte/store';
import { toast } from 'svelte-sonner';

export const WATCHED_SYMBOLS = writable<Set<string>>(new Set());

let inFlight: Promise<void> | null = null;

export function loadWatchedSymbols(): Promise<void> {
	if (inFlight) return inFlight;
	inFlight = fetch('/api/watchlist')
		.then(async (response) => {
			if (!response.ok) return;
			const result = await response.json();
			WATCHED_SYMBOLS.set(new Set(result.coins.map((c: { symbol: string }) => c.symbol)));
		})
		.catch(() => {})
		.finally(() => {
			inFlight = null;
		});
	return inFlight;
}

const busy = new Set<string>();

export async function toggleWatched(symbol: string): Promise<void> {
	if (busy.has(symbol)) return;
	busy.add(symbol);

	const next = !get(WATCHED_SYMBOLS).has(symbol);
	const apply = (watched: boolean) =>
		WATCHED_SYMBOLS.update((current) => {
			const copy = new Set(current);
			if (watched) copy.add(symbol);
			else copy.delete(symbol);
			return copy;
		});

	apply(next);
	try {
		const response = await fetch(`/api/watchlist/${encodeURIComponent(symbol)}`, {
			method: next ? 'POST' : 'DELETE'
		});
		if (!response.ok) {
			const result = await response.json().catch(() => null);
			throw new Error(result?.message || 'Failed to update watchlist');
		}
		toast.success(next ? `Watching *${symbol}` : `Stopped watching *${symbol}`);
	} catch (e) {
		apply(!next);
		toast.error((e as Error).message);
	} finally {
		busy.delete(symbol);
	}
}
