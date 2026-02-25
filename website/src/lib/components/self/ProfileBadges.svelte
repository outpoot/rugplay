<script lang="ts">
	import type { UserProfile } from '$lib/types/user-profile';
	import SilentBadge from './SilentBadge.svelte';
	import {
		HashtagIcon,
		KnightShieldIcon,
		Fire02Icon,
		StarIcon,
		Rocket01Icon,
	} from '@hugeicons/core-free-icons';
	import { getPrestigeName, getPrestigeColor } from '$lib/utils';

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
	let prestigeColor = $derived(user.prestigeLevel ? getPrestigeColor(user.prestigeLevel) : 'text-gray-500');
</script>

<div class="flex items-center gap-1">
	{#if showId}
		<SilentBadge icon={HashtagIcon} class="text-muted-foreground {badgeClass}" text="#{user.id} to join" />
	{/if}
	{#if prestigeName}
		<SilentBadge icon={StarIcon} text={prestigeName} class="{prestigeColor} {badgeClass}" />
	{/if}
	{#if user.loginStreak && user.loginStreak > 1}
		<SilentBadge
			icon={Fire02Icon}
			text="{user.loginStreak} day streak"
			class="text-orange-500 {badgeClass}"
		/>
	{/if}
	{#if user.isAdmin}
		<SilentBadge icon={KnightShieldIcon} text="Admin" class="text-primary {badgeClass}" />
	{/if}
	{#if user.founderBadge}
		<SilentBadge icon={Rocket01Icon} text="Supporter" class="text-cyan-400 {badgeClass}" />
	{/if}
	{#if user.halloweenBadge2025}
		<SilentBadge icon="/pumpkin.png" text="Halloween 2025" class="text-primary {badgeClass}" />
	{/if}
</div>
