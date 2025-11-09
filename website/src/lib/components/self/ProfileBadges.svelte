<script lang="ts">
	import type { UserProfile } from '$lib/types/user-profile';
	import SilentBadge from './SilentBadge.svelte';
	import { Hash, Hammer, Flame, Star } from 'lucide-svelte';
	import { getPrestigeName, getPrestigeColor } from '$lib/utils';
	import { _ } from 'svelte-i18n';

	let {
		user,
		showId = true,
		size = 'default'
	}: {
		user: UserProfile;
		showId?: boolean;
		size?: 'sm' | 'default';
	} = $props();

	let badgeClass = $derived(size === 'sm' ? 'text-xs' : '');
	let prestigeName = $derived(user.prestigeLevel ? getPrestigeName(user.prestigeLevel) : null);
	let prestigeColor = $derived(
		user.prestigeLevel ? getPrestigeColor(user.prestigeLevel) : 'text-gray-500'
	);
</script>

<div class="flex items-center gap-1">
	{#if showId}
		<SilentBadge
			icon={Hash}
			class="text-muted-foreground {badgeClass}"
			text={$_('user.id').replace('{{id}}', user.id.toString())}
		/>
	{/if}
	{#if prestigeName}
		<SilentBadge icon={Star} text={prestigeName} class="{prestigeColor} {badgeClass}" />
	{/if}
	{#if user.loginStreak && user.loginStreak > 1}
		<SilentBadge
			icon={Flame}
			text={$_("user.streak").replace("{{days}}", user.loginStreak.toLocaleString())}
			class="text-orange-500 {badgeClass}"
		/>
	{/if}
	{#if user.isAdmin}
		<SilentBadge icon={Hammer} text="Admin" class="text-primary {badgeClass}" />
	{/if}
	{#if user.halloweenBadge2025}
		<SilentBadge icon="/pumpkin.png" text="Halloween 2025" class="text-primary {badgeClass}" />
	{/if}
</div>
