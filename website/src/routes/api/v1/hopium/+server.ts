import { GET as getHopiumQuestions } from '../../hopium/questions/+server';
import { verifyApiKeyAndGetUser } from '$lib/server/api-auth';

export async function GET({ url, request }) {
	await verifyApiKeyAndGetUser(request);

	const hopiumEvent = {
		request,
		url,
		cookies: arguments[0].cookies,
		fetch: arguments[0].fetch,
		getClientAddress: arguments[0].getClientAddress,
		locals: arguments[0].locals,
		platform: arguments[0].platform,
		route: { id: '/api/hopium/questions' }
	};

	return await getHopiumQuestions(hopiumEvent as any);
}
