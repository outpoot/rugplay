import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const session = event.locals.userSession;
	if (!session) throw error(401, 'Unauthorized');

	throw error(410, 'Gem purchases are disabled');
};
