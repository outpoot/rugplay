import { verifyApiKeyAndGetUser } from '$lib/server/api-auth';
import { GET as getMarketData } from '../../market/+server';

export async function GET(event) {
    await verifyApiKeyAndGetUser(event.request);
    return await getMarketData(event);
}
