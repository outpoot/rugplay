import { PUBLIC_BETTER_AUTH_URL } from '$env/static/public';
import { Polar } from '@polar-sh/sdk';
import { POLAR_ACCESS_TOKEN } from '$env/static/private';
import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const session = event.locals.userSession;
	if (!session) throw error(401, 'Unauthorized');

	const products = event.url.searchParams.getAll('products');
	if (products.length === 0) throw error(400, 'Missing products');

	const origin = PUBLIC_BETTER_AUTH_URL;

	const polar = new Polar({
		accessToken: POLAR_ACCESS_TOKEN,
		server: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
	});

	const userId = session.id;

	const result = await polar.checkouts.create({
		products,
		successUrl: `${origin}/shop?success=true&checkoutId={CHECKOUT_ID}`,
		externalCustomerId: userId,
		customerEmail: session.email ?? undefined,
		metadata: { userId },
	});

	throw redirect(302, result.url);
};
