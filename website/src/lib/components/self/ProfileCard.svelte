<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import UserName from './UserName.svelte';
	import ProfileBadges from './ProfileBadges.svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Calendar01Icon } from '@hugeicons/core-free-icons';
	import { getPublicUrl, formatDate } from '$lib/utils';
	import { getCardStyleByKey, getCardAnimationByKey } from '$lib/data/card-catalog';
	import type { Snippet } from 'svelte';
	import type { UserProfile } from '$lib/types/user-profile';

	/**
	 * Renders the profile header card — avatar, name, badges, bio, join
	 * date — with an equippable card style and hover/click animation
	 * applied. Used both on the real profile page and as the live preview
	 * in Settings, so both places always render identically: there is no
	 * separate mock/preview markup to keep in sync.
	 *
	 * `user` takes the same UserProfile shape ProfileBadges already
	 * requires, rather than a hand-rolled subset — callers with partial
	 * data (like the Settings preview, which doesn't have a real
	 * createdAt/totalPortfolioValue) fill in sensible placeholders for
	 * the fields this component doesn't actually render.
	 */
	let {
		user,
		joinedAt,
		cardStyle = null,
		cardAnimation = null,
		showId = true,
		actions,
	}: {
		user: UserProfile;
		/** Pre-formatted "joined" date string, or a Date to format. */
		joinedAt: string | Date;
		cardStyle?: string | null;
		cardAnimation?: string | null;
		showId?: boolean;
		/** Optional slot for page-specific controls (e.g. block button). */
		actions?: Snippet;
	} = $props();

	let styleItem = $derived(getCardStyleByKey(cardStyle));
	let animItem = $derived(getCardAnimationByKey(cardAnimation));

	let rootClasses = $derived(
		[
			'mb-6 py-0 transition-colors',
			styleItem?.classes ?? '',
			animItem?.hoverClasses ?? '',
			animItem?.activeClasses ?? '',
		]
			.filter(Boolean)
			.join(' ')
	);

	let joinedLabel = $derived(
		typeof joinedAt === 'string' ? joinedAt : formatDate(joinedAt.toISOString())
	);
</script>

<Card.Root class={rootClasses} style={styleItem?.style ?? ''}>
	<Card.Content class="p-6">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-start">
			<!-- Avatar -->
			<div class="flex-shrink-0">
				<Avatar.Root class="size-20 sm:size-24">
					<Avatar.Image src={getPublicUrl(user.image)} alt={user.name} />
					<Avatar.Fallback class="text-xl">{user.name.charAt(0).toUpperCase()}</Avatar.Fallback>
				</Avatar.Root>
			</div>

			<!-- Profile Info -->
			<div class="min-w-0 flex-1">
				<div class="mb-3">
					<div class="mb-1 flex flex-wrap items-center gap-2">
						<h1 class="text-2xl font-bold sm:text-3xl">
							<UserName name={user.name} nameColor={user.nameColor} founderBadge={user.founderBadge} />
						</h1>
						<ProfileBadges {user} {showId} />
					</div>
					<p class="text-muted-foreground text-lg">@{user.username}</p>
				</div>

				{#if user.bio}
					<p class="text-muted-foreground mb-3 max-w-2xl leading-relaxed">
						{user.bio}
					</p>
				{/if}

				<div class="text-muted-foreground flex items-center gap-2 text-sm">
					<HugeiconsIcon icon={Calendar01Icon} class="h-4 w-4" />
					<span>Joined {joinedLabel}</span>
				</div>
			</div>

			{#if actions}
				<div class="ml-auto self-start">
					{@render actions()}
				</div>
			{/if}
		</div>
	</Card.Content>
</Card.Root>
