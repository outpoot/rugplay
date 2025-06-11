import { writable, derived } from 'svelte/store';

export interface Notification {
    id: number;
    type: string;
    title: string;
    message: string;
    data: any;
    isRead: boolean;
    createdAt: string;
}

export const NOTIFICATIONS = writable<Notification[]>([]);
export const UNREAD_COUNT = writable<number>(0);

export async function fetchNotifications(unreadOnly = false) {
    try {
        const params = new URLSearchParams({
            unread_only: unreadOnly.toString()
        });

        const response = await fetch(`/api/notifications?${params}`);
        if (!response.ok) throw new Error('Failed to fetch notifications');

        const data = await response.json();
        
        NOTIFICATIONS.set(data.notifications);
        UNREAD_COUNT.set(data.unreadCount);
        
        return data;
    } catch (error) {
        console.error('Failed to fetch notifications:', error);
        throw error;
    }
}

export async function markNotificationsAsRead(ids: number[]) {
    try {
        const response = await fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, markAsRead: true })
        });

        if (!response.ok) throw new Error('Failed to mark notifications as read');

        NOTIFICATIONS.update(notifications => 
            notifications.map(notif => 
                ids.includes(notif.id) ? { ...notif, isRead: true } : notif
            )
        );

        UNREAD_COUNT.update(count => Math.max(0, count - ids.length));

    } catch (error) {
        console.error('Failed to mark notifications as read:', error);
        throw error;
    }
}

export const hasUnreadNotifications = derived(UNREAD_COUNT, count => count > 0);
