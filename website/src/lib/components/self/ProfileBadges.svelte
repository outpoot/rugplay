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
	import type { SeasonTrophyTier } from '$lib/data/seasons';
	import { Trophy } from 'lucide-svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';

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

	let best = $derived((user as any).bestTrophy ?? null);
	let seasonTrophies = $derived(
		((user as any).seasonTrophies ?? []) as Array<{ seasonName: string; rank: number }>
	);

	let trophyColor = $derived(
		best
			? {
					CHAMPION: 'text-yellow-500',
					RUNNER_UP: 'text-slate-400',
					THIRD: 'text-amber-700',
					TOP_10: 'text-purple-500',
					TOP_100: 'text-blue-500',
					PARTICIPANT: 'text-muted-foreground'
				}[best.tier as SeasonTrophyTier]
			: 'text-muted-foreground'
	);

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
	{#if best}
		<Tooltip.Root>
			<Tooltip.Trigger>
				<div class="cursor-pointer rounded-full p-1 opacity-80 hover:opacity-100 {trophyColor} {badgeClass}">
					<Trophy class="h-4 w-4" />
				</div>
			</Tooltip.Trigger>
			<Tooltip.Content
				class="bg-secondary text-secondary-foreground ring-border ring-1"
				arrowClasses="bg-secondary"
			>
				<div class="space-y-1">
					{#each seasonTrophies as trophy (trophy.seasonName)}
						<p>{trophy.seasonName}: #{trophy.rank}</p>
					{/each}
				</div>
			</Tooltip.Content>
		</Tooltip.Root>
	{/if}
</div>
