import type { LayoutServerLoad } from './$types';
import { dev } from '$app/environment';

export const load: LayoutServerLoad = async (event) => {
    // Only set Cache-Control if not already set
    if (!event.request.headers.get('cache-control')) {
        event.setHeaders({
            'Cache-Control': dev
                ? 'no-cache'
                : 'private, max-age=30'
        });
    }

    // Use the user data already fetched and processed in hooks
    return {
        userSession: event.locals.userSession,
        url: event.url.pathname,
    };
};