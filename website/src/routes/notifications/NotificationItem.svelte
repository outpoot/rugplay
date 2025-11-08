<script lang="ts">
	interface Notification {
		type: 'HOPIUM' | 'TRANSFER' | 'RUG_PULL' | 'SYSTEM';
		link?: string;
		isRead: boolean;
	}

	export let notification: Notification;
	export let isNew = false;

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
</script>

{#if notification.link}
	<a
		href={notification.link}
		class={getNotificationColorClasses(notification.type, isNew, notification.isRead)}
	>
		<slot />
	</a>
{:else}
	<div class={getNotificationColorClasses(notification.type, isNew, notification.isRead)}>
		<slot />
	</div>
{/if}
