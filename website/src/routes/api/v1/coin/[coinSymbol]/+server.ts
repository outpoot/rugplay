import { GET as getCoinData } from '../../../coin/[coinSymbol]/+server';
import { verifyApiKeyAndGetUser } from '$lib/server/api-auth';

export async function GET(event) {
    await verifyApiKeyAndGetUser(event.request);

    return await getCoinData(event);
}