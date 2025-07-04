import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	// This `fetch` is SvelteKit's special instance that correctly handles
	// authentication cookies for API requests made from the client or server.
	// We pass it to the page component as `data.fetcher`.
	return {
		fetcher: fetch
	};
};