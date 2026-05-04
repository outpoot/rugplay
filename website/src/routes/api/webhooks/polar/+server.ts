import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	throw error(410, 'Gem purchase webhooks are disabled');
};
