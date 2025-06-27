import { GET as getHopiumQuestion } from '../../../hopium/questions/[id]/+server';
import { verifyApiKeyAndGetUser } from '$lib/server/api-auth';

export async function GET(event) {
   await verifyApiKeyAndGetUser(event.request);

    const hopiumEvent = {
        params: event.params,
        request: event.request,
        url: event.url,
        cookies: event.cookies,
        fetch: event.fetch,
        getClientAddress: event.getClientAddress,
        locals: event.locals,
        platform: event.platform,
        route: { id: "/api/hopium/questions/[id]" }
    };

    return await getHopiumQuestion(hopiumEvent as any);
}
