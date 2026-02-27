import { auth } from '$lib/auth';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { userBlock, user } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST({
	request,
	params
}: {
	request: Request;
	params: { username: string };
}) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Not authenticated');

	const blockerId = Number(session.user.id);
	const targetUsername = params.username;

	const [targetUser] = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.username, targetUsername))
		.limit(1);

	if (!targetUser) throw error(404, 'User not found');
	if (targetUser.id === blockerId) throw error(400, 'Cannot block yourself');

	await db.insert(userBlock).values({ blockerId, blockedId: targetUser.id }).onConflictDoNothing();

	return json({ success: true });
}

export async function DELETE({
	request,
	params
}: {
	request: Request;
	params: { username: string };
}) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw error(401, 'Not authenticated');

	const blockerId = Number(session.user.id);
	const targetUsername = params.username;

	const [targetUser] = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.username, targetUsername))
		.limit(1);

	if (!targetUser) throw error(404, 'User not found');

	await db
		.delete(userBlock)
		.where(and(eq(userBlock.blockerId, blockerId), eq(userBlock.blockedId, targetUser.id)));

	return json({ success: true });
}
