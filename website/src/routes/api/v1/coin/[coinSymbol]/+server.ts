import { GET as getCoinData } from '../../../coin/[coinSymbol]/+server';
import { verifyApiKeyAndGetUser } from '$lib/server/api-auth';

export async function GET({ params, url, request }) {
	await verifyApiKeyAndGetUser(request);

	return await getCoinData({ params, url });
}
