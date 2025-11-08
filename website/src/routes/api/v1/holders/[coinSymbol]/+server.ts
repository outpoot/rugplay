import { GET as getHoldersData } from '../../../coin/[coinSymbol]/holders/+server';
import { verifyApiKeyAndGetUser } from '$lib/server/api-auth';

export async function GET({ params, url, request }) {
	await verifyApiKeyAndGetUser(request);

	return await getHoldersData({ params, url });
}
