import { GET as getHoldersData } from '../../../coin/[coinSymbol]/holders/+server';
import { verifyApiKeyAndGetUser } from '$lib/server/api-auth';

export async function GET(event) {
    await verifyApiKeyAndGetUser(event.request);

    return await getHoldersData(event);
}
