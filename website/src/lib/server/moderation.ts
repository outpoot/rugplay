const MODERATION_URL = process.env.MODERATION_URL ?? 'http://moderation-moderation-service-1:9999';
const TIMEOUT_MS = Number(process.env.MODERATION_TIMEOUT_MS ?? 2500);
const MAX_NAME_LENGTH = 100;
const CACHE_TTL_MS = Number(process.env.MODERATION_CACHE_TTL_MS ?? 60_000);

type CacheEntry = { exp: number; value: boolean };
const cache = new Map<string, CacheEntry>();

export async function isNameAppropriate(name: string): Promise<boolean> {
	if (typeof name !== 'string') return true;

	const cleaned = name.replace(/\0/g, '').trim().slice(0, MAX_NAME_LENGTH);
	if (!cleaned) return true;

	const now = Date.now();
	const cached = cache.get(cleaned);
	if (cached && cached.exp > now) return cached.value;

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

		const response = await fetch(MODERATION_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ name: cleaned }),
			signal: controller.signal,
		});

		clearTimeout(timeout);

		if (!response.ok) {
			console.error('Moderation service error:', response.status, response.statusText);
			cache.set(cleaned, { exp: now + CACHE_TTL_MS, value: true });
			return true;
		}

		const result = await response.json().catch(() => null);
		const appropriate = result && typeof result.appropriate === 'boolean' ? result.appropriate : true;

		cache.set(cleaned, { exp: now + CACHE_TTL_MS, value: appropriate !== false });
		console.log('Checked name with moderation service:', cleaned, ' result: ', appropriate);

		return appropriate !== false;
	} catch (error) {
		console.error('Failed to check name with moderation service:', error);
		cache.set(cleaned, { exp: now + CACHE_TTL_MS, value: true });
		return true;
	}
}
