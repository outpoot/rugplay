import { verifyApiKeyAndGetUser } from '$lib/server/api-auth';
import { GET as getMarketData } from '../../market/+server';

export async function GET({ url, request }) {
    await verifyApiKeyAndGetUser(request);
    return await getMarketData({ url });
}
