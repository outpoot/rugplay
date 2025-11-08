<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import SEO from '$lib/components/self/SEO.svelte';
	import NotificationsSkeleton from '$lib/components/self/skeletons/NotificationsSkeleton.svelte';
	import { Bell, Target, Settings, TrendingUp, AlertTriangle } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import {
		NOTIFICATIONS,
		fetchNotifications,
		markNotificationsAsRead
	} from '$lib/stores/notifications';
	import { USER_DATA } from '$lib/stores/user-data';
	import { formatTimeAgo, formatValue } from '$lib/utils';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import NotificationItem from './NotificationItem.svelte';
	import { _ } from 'svelte-i18n';

	let loading = $state(true);
	let newNotificationIds = $state<number[]>([]);

	onMount(async () => {
		if (!$USER_DATA) {
			goto('/');
			return;
		}

		try {
			await fetchNotifications();

			const unreadIds = ($NOTIFICATIONS || []).filter((n) => !n.isRead).map((n) => n.id);
			newNotificationIds = unreadIds;

			await markNotificationsAsRead();
		} catch (error) {
			toast.error('Failed to load notifications');
		} finally {
			loading = false;
		}
	});

	function getNotificationIcon(type: string) {
		switch (type) {
			case 'HOPIUM':
				return Target;
			case 'TRANSFER':
				return TrendingUp;
			case 'RUG_PULL':
				return AlertTriangle;
			case 'SYSTEM':
				return Settings;
			default:
				return Bell;
		}
	}

	function getNotificationColorClasses(type: string, isNew: boolean, isRead: boolean) {
		const base =
			'hover:bg-muted/50 flex w-full items-start gap-4 rounded-md p-3 text-left transition-all duration-200';

		if (isNew) {
			return `${base} bg-primary/10`;
		}

		if (!isRead) {
			const colors = {
				HOPIUM: 'bg-blue-50/50 dark:bg-blue-950/10',
				TRANSFER: 'bg-green-50/50 dark:bg-green-950/10',
				RUG_PULL: 'bg-red-50/50 dark:bg-red-950/10',
				SYSTEM: 'bg-purple-50/50 dark:bg-purple-950/10'
			};
			return `${base} ${colors[type as keyof typeof colors] || 'bg-muted/20'}`;
		}

		return base;
	}

	function getNotificationIconColorClasses(type: string) {
		const colors = {
			HOPIUM: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
			TRANSFER: 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400',
			RUG_PULL: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400',
			SYSTEM: 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400'
		};
		return colors[type as keyof typeof colors] || 'bg-muted text-muted-foreground';
	}
</script>

<SEO
	title="Notifications - Rugplay"
	description="View your notifications and updates from Rugplay."
/>

<div class="container mx-auto max-w-4xl p-6">
	<header class="mb-8">
		<div class="text-center">
			<h1 class="mb-2 text-3xl font-bold">{$_('notifications.title')}</h1>
			<p class="text-muted-foreground mb-6">{$_('notifications.description')}</p>
		</div>
	</header>

	<Card.Root class="gap-1">
		<Card.Content>
			{#if !$USER_DATA}
				<div class="py-12 text-center">
					<div
						class="bg-muted mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
					>
						<Bell class="text-muted-foreground h-8 w-8" />
					</div>
					<h3 class="mb-2 text-lg font-semibold">{$_('notifications.signin.title')}</h3>
					<p class="text-muted-foreground">{$_('notifications.signin.description')}</p>
				</div>
			{:else if loading}
				<NotificationsSkeleton />
			{:else if !$NOTIFICATIONS || $NOTIFICATIONS.length === 0}
				<div class="py-12 text-center">
					<div
						class="bg-muted mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
					>
						<Bell class="text-muted-foreground h-8 w-8" />
					</div>
					<h3 class="mb-2 text-lg font-semibold">{$_('notifications.noNotifications.title')}</h3>
					<p class="text-muted-foreground">{$_('notifications.noNotifications.description')}</p>
				</div>
			{:else}
				<ScrollArea class="h-[600px]">
					<div class="space-y-1">
						{#each $NOTIFICATIONS as notification, index (notification.id)}
							{@const IconComponent = getNotificationIcon(notification.type)}
							{@const isNewNotification = newNotificationIds.includes(notification.id)}
							<NotificationItem {notification} isNew={isNewNotification}>
								<div
									class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full {getNotificationIconColorClasses(
										notification.type
									)}"
								>
									<IconComponent class="h-4 w-4" />
								</div>
								<div class="min-w-0 flex-1">
									<div class="mb-1 flex items-center gap-2">
										<h3 class="truncate text-sm font-medium">{notification.title}</h3>
										{#if !notification.isRead && !isNewNotification}
											<div class="bg-primary h-2 w-2 flex-shrink-0 rounded-full"></div>
										{/if}
										{#if isNewNotification}
											<Badge variant="default" class="px-1.5 py-0.5 text-xs">New</Badge>
										{/if}
									</div>

									<p class="text-muted-foreground text-xs leading-relaxed">
										{notification.message}
									</p>

									{#if notification.data}
										<div class="mt-1 flex flex-wrap gap-1">
											{#if notification.data.profit !== undefined}
												<Badge
													variant={notification.data.profit > 0 ? 'success' : 'destructive'}
													class="px-1.5 py-0.5 text-xs"
												>
													{notification.data.profit > 0 ? '+' : ''}{formatValue(
														notification.data.profit
													)}
												</Badge>
											{/if}
											{#if notification.data.resolution}
												<Badge variant="outline" class="px-1.5 py-0.5 text-xs">
													Resolved: {notification.data.resolution}
												</Badge>
											{/if}
										</div>
									{/if}
								</div>

								<div class="flex flex-shrink-0 flex-col items-end justify-center gap-1">
									<p class="text-muted-foreground text-right text-xs">
										{formatTimeAgo(notification.createdAt)}
									</p>
								</div>
							</NotificationItem>

							{#if index < $NOTIFICATIONS.length - 1}
								<Separator />
							{/if}
						{/each}
					</div>
				</ScrollArea>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
