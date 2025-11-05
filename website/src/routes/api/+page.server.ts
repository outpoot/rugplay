import { auth } from '$lib/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    const session = await auth.api.getSession({ headers: event.request.headers });

    if (!session?.user) {
        return { apiKey: null, todayUsage: 0 };
    }

    const keys = await auth.api.listApiKeys({ headers: event.request.headers });
    const key = keys.length > 0 ? keys[0] : null;

    const todayUsage = key ? 2000 - (key.remaining || 0) : 0;

    return {
        apiKey: key,
        todayUsage
    };
};
