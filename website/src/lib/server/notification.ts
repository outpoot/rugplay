import { db } from './db';
import { notifications, notificationTypeEnum } from './db/schema';
import { redis } from './redis';

export type NotificationType = typeof notificationTypeEnum.enumValues[number];

export async function createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
    extras?: Record<string, unknown>,
): Promise<void> {
    await db.insert(notifications).values({
        userId: parseInt(userId),
        type,
        title,
        message,
        link
    });

    try {
        const channel = `notifications:${userId}`;

        const payload = {
            type: 'notification',
            timestamp: new Date().toISOString(),
            userId,
            notificationType: type,
            title,
            message,
            link,
            ...extras
        };

        await redis.publish(channel, JSON.stringify(payload));
    } catch (error) {
        console.error('Failed to send notification via Redis:', error);
    }
}
