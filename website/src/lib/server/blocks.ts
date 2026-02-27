import { db } from './db';
import { userBlock } from './db/schema';
import { eq } from 'drizzle-orm';

export async function getBlockedBySet(userId: number): Promise<Set<number>> {
	const rows = await db
		.select({ blockerId: userBlock.blockerId })
		.from(userBlock)
		.where(eq(userBlock.blockedId, userId));
	return new Set(rows.map((r) => r.blockerId));
}

export async function getBlockedSet(userId: number): Promise<Set<number>> {
	const rows = await db
		.select({ blockedId: userBlock.blockedId })
		.from(userBlock)
		.where(eq(userBlock.blockerId, userId));
	return new Set(rows.map((r) => r.blockedId));
}
