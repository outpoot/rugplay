import { verifyApiKeyAndGetUser } from '$lib/server/api-auth';
import { GET as getTopCoins } from '../../coins/top/+server';

export async function GET({ request }) {
	await verifyApiKeyAndGetUser(request);
	return await getTopCoins();
}
