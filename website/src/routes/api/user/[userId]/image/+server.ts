import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getPublicUrl } from '$lib/utils';

export async function GET({ params }) {
	const { userId } = params;

	try {
		const [userData] = await db
			.select({ image: user.image })
			.from(user)
			.where(eq(user.id, Number(userId)))
			.limit(1);

		if (!userData) {
			throw error(404, 'User not found');
		}

		const url = getPublicUrl(userData.image);

		return json({ url });
	} catch (e) {
		console.error('Failed to get user image:', e);
		throw error(500, 'Failed to get user image');
	}
}
