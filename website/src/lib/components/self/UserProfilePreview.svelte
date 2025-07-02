<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import ProfileBadges from './ProfileBadges.svelte';
	import { getPublicUrl, formatValue } from '$lib/utils';
	import { Calendar, Wallet } from 'lucide-svelte';
	import type { UserProfileData } from '$lib/types/user-profile';

	let { userId, showBio = true }: { userId: number, showBio?: boolean } = $props();

	let userData = $state<UserProfileData | null>(null);
	let loading = $state(true);
	let error = $state(false);

	async function fetchUserData() {
		loading = true;
		error = false;

		try {
			const response = await fetch(`/api/user/${userId}`);
			if (response.ok) {
				userData = await response.json();
			} else {
				error = true;
			}
		} catch (e) {
			console.error('Failed to fetch user data:', e);
			error = true;
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (userId) {
			const abortController = new AbortController();
			fetchUserData();

			return () => {
				abortController.abort();
			};
		}
	});

	let profile = $derived(userData?.profile);
	let stats = $derived(userData?.stats);
</script>

<div class="p-4">
	{#if loading}
		<div class="flex gap-4">
			<Skeleton class="size-14 shrink-0 rounded-full" />
			<div class="min-w-0 flex-1 space-y-2">
				<div class="flex items-center space-x-2">
					<Skeleton class="h-5 w-[150px]" />
					<Skeleton class="h-5 w-[80px]" />
				</div>
				<Skeleton class="h-4 w-[130px]" />
				<Skeleton class="h-4 w-[200px]" />
				<Skeleton class="h-4 w-[200px]" />
				<Skeleton class="h-4 w-[200px]" />
				<Skeleton class="h-4 w-[200px]" />
				<div class="space-y-1 pt-2">
					<div class="flex items-center justify-between">
						<Skeleton class="h-4 w-[80px]" />
						<Skeleton class="h-4 w-[100px]" />
					</div>
					<div class="flex items-center justify-between">
						<Skeleton class="h-4 w-[50px]" />
						<Skeleton class="h-4 w-[90px]" />
					</div>
				</div>
				<Skeleton class="h-4 w-[180px]" />
			</div>
		</div>
	{:else if error}
		<div class="flex items-center justify-center py-8">
			<span class="text-muted-foreground text-sm">Failed to load profile</span>
		</div>
	{:else if profile}
		<div class="flex gap-4">
			<Avatar.Root class="h-14 w-14 shrink-0">
				<Avatar.Image src={getPublicUrl(profile.image)} alt={profile.name} />
				<Avatar.Fallback class="text-sm">{profile.name?.charAt(0) || '?'}</Avatar.Fallback>
			</Avatar.Root>
			<div class="min-w-0 flex-1 space-y-1">
				<div class="flex min-w-0 items-center gap-2">
					<h4 class="max-w-[150px] truncate text-sm font-semibold sm:max-w-[200px]">
						{profile.name}
					</h4>
					<ProfileBadges user={profile} showId={true} size="sm" />
				</div>
				<p class="text-muted-foreground text-sm">@{profile.username}</p>

				{#if profile.bio && showBio}
					<p class="text-sm">{profile.bio}</p>
				{/if}

				{#if stats}
					<div class="space-y-1 pt-2">
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground flex items-center gap-1 text-xs">
								<Wallet class="h-3 w-3" />
								Portfolio
							</span>
							<span class="font-mono text-sm font-medium">
								{formatValue(stats.totalPortfolioValue)}
							</span>
						</div>

						<div class="flex items-center justify-between">
							<span class="text-muted-foreground flex items-center gap-1 text-xs">
								<Wallet class="h-3 w-3" />
								Cash
							</span>
							<span class="text-success font-mono text-sm font-medium">
								{formatValue(stats.baseCurrencyBalance)}
							</span>
						</div>
					</div>
				{/if}

				<div class="flex items-center pt-2">
					<Calendar class="mr-2 h-4 w-4 opacity-70" />
					<span class="text-muted-foreground text-xs">
						Joined {new Date(profile.createdAt).toLocaleDateString('en-US', {
							year: 'numeric',
							month: 'long'
						})}
					</span>
				</div>
			</div>
		</div>
	{/if}
</div>
