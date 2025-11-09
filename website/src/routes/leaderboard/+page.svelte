<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import DataTable from '$lib/components/self/DataTable.svelte';
	import LeaderboardSkeleton from '$lib/components/self/skeletons/LeaderboardSkeleton.svelte';
	import SEO from '$lib/components/self/SEO.svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import {
		TrendingDown,
		Crown,
		Skull,
		Target,
		RefreshCw,
		Trophy,
		Search,
		SearchX,
		X,
		Wallet,
		Calendar
	} from 'lucide-svelte';
	import { formatValue, getPublicUrl } from '$lib/utils';
	import Input from '$lib/components/ui/input/input.svelte';
	import UserProfilePreview from '$lib/components/self/UserProfilePreview.svelte';
	import LeaderboardSearchSkeleton from '$lib/components/self/skeletons/LeaderboardSearchSkeleton.svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import ProfileBadges from '$lib/components/self/ProfileBadges.svelte';
	import { _ } from 'svelte-i18n';
	import { browser } from '$app/environment';
	let searchOffset = $state(0);
	let searchQuery = $state('');
	let searchQueryValue = $state('');
	let searchQueryTimeout = $state<NodeJS.Timeout | null>(null);
	let leaderboardData = $state<any>(null);
	let loading = $state(true);

	onMount(async () => {
		const urlParams = new URLSearchParams(window.location.search);
		const search = urlParams.get('search');

		searchQuery = search || '';
		searchQueryValue = search || '';

		await fetchLeaderboardData();
	});

	function handleSearchKeydown(event: KeyboardEvent) {
		if (!/^[a-zA-Z0-9]$/.test(event.key) && event.key !== 'Enter') {
			return;
		}
		if (searchQueryTimeout) {
			clearTimeout(searchQueryTimeout);
		}

		if (event.key === 'Enter') {
			searchQueryValue = searchQuery;
			fetchLeaderboardData();
			return;
		}

		searchQueryTimeout = setTimeout(() => {
			searchQueryValue = searchQuery;
			fetchLeaderboardData();
		}, 500);
	}

	async function fetchLeaderboardData(offset = 0) {
		loading = true;
		try {
			const response = await fetch(`/api/leaderboard?search=${searchQueryValue}&offset=${offset}`);
			if (response.ok) {
				leaderboardData = await response.json();
			} else {
				toast.error($_('leaderboard.err'));
			}
		} catch (e) {
			console.error('Failed to fetch leaderboard data:', e);
			toast.error($_('leaderboard.err'));
		} finally {
			loading = false;
		}
	}

	function getRankIcon(index: number) {
		switch (index) {
			case 0:
				return { icon: Crown, color: 'text-yellow-500' };
			case 1:
				return { icon: Trophy, color: 'text-gray-400' };
			case 2:
				return { icon: Trophy, color: 'text-orange-600' };
			default:
				return { icon: Target, color: 'text-muted-foreground' };
		}
	}

	function getLiquidityWarning(liquidityRatio: number) {
		if (liquidityRatio < 0.1) return { text: '90%+ illiquid', color: 'text-destructive' };
		if (liquidityRatio < 0.3) return { text: '70%+ illiquid', color: 'text-orange-600' };
		if (liquidityRatio < 0.5) return { text: '50%+ illiquid', color: 'text-yellow-600' };
		return { text: 'Mostly liquid', color: 'text-success' };
	}

	const searchColumns = [
		{
			key: 'user',
			label: $_('base.user'),
			render: (value: any, row: any) => ({
				component: 'user',
				image: row.image,
				name: row.name,
				username: row.username
			})
		}
	];

	const rugpullersColumns = [
		{
			key: 'rank',
			label: $_('base.rank'),
			render: (value: any, row: any, index: number) => {
				const rankInfo = getRankIcon(index);
				return {
					component: 'rank',
					icon: rankInfo.icon,
					color: rankInfo.color,
					number: index + 1
				};
			}
		},
		{
			key: 'user',
			label: $_('base.user'),
			render: (value: any, row: any) => ({
				component: 'user',
				image: row.image,
				name: row.name,
				username: row.username
			})
		},
		{
			key: 'totalExtracted',
			label: $_('leaderboard.topRugpullers.profit'),
			class: 'text-success font-mono text-sm font-bold',
			render: (value: any) => formatValue(value)
		}
	];

	const losersColumns = [
		{
			key: 'rank',
			label: $_('base.rank'),
			render: (value: any, row: any, index: number) => {
				const rankInfo = getRankIcon(index);
				return {
					component: 'rank',
					icon: rankInfo.icon,
					color: rankInfo.color,
					number: index + 1
				};
			}
		},
		{
			key: 'user',
			label: $_('base.user'),
			render: (value: any, row: any) => ({
				component: 'user',
				image: row.image,
				name: row.name,
				username: row.username
			})
		},
		{
			key: 'totalLoss',
			label: $_('leaderboard.biggestLosses.loss'),
			class: 'text-destructive font-mono text-sm font-bold',
			render: (value: any) => `-${formatValue(value)}`
		}
	];

	const cashKingsColumns = [
		{
			key: 'rank',
			label: $_('base.rank'),
			render: (value: any, row: any, index: number) => {
				const rankInfo = getRankIcon(index);
				return {
					component: 'rank',
					icon: rankInfo.icon,
					color: rankInfo.color,
					number: index + 1
				};
			}
		},
		{
			key: 'user',
			label: $_('base.user'),
			render: (value: any, row: any) => ({
				component: 'user',
				image: row.image,
				name: row.name,
				username: row.username
			})
		},
		{
			key: 'baseCurrencyBalance',
			label: $_('leaderboard.topCash.cash'),
			class: 'text-success font-mono text-sm font-bold',
			render: (value: any) => formatValue(value)
		}
	];

	const millionairesColumns = [
		{
			key: 'rank',
			label: $_('base.rank'),
			render: (value: any, row: any, index: number) => {
				const rankInfo = getRankIcon(index);
				return {
					component: 'rank',
					icon: rankInfo.icon,
					color: rankInfo.color,
					number: index + 1
				};
			}
		},
		{
			key: 'user',
			label: $_('base.user'),
			render: (value: any, row: any) => ({
				component: 'user',
				image: row.image,
				name: row.name,
				username: row.username
			})
		},
		{
			key: 'totalPortfolioValue',
			label: $_('portfolio.title'),
			class: 'text-success font-mono text-sm font-bold',
			render: (value: any) => formatValue(value)
		},
		{
			key: 'liquidityRatio',
			label: $_('leaderboard.highestPortfolio.liquidity'),
			render: (value: any) => {
				const info = getLiquidityWarning(value);
				return {
					component: 'badge',
					variant: 'secondary',
					class: `text-xs ${info.color}`,
					text: info.text
				};
			}
		}
	];
</script>

<SEO
	title="Leaderboard - Rugplay"
	description="View top performers in the Rugplay cryptocurrency simulation game. See rankings for biggest profits, losses, cash holders, and portfolio values in our virtual trading game."
	keywords="crypto game leaderboard, trading simulation rankings, virtual portfolio rankings, crypto game winners"
/>

<div class="container mx-auto max-w-7xl p-4 md:p-6">
	<header class="mb-6 md:mb-8">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h1 class="text-2xl font-bold md:text-3xl">{$_('leaderboard.title')}</h1>
				<p class="text-muted-foreground text-sm md:text-base">{$_('leaderboard.description')}</p>
			</div>
			<div class="flex items-center gap-4">
				<div class="relative flex flex-grow items-center">
					<Search size={16} class="pointer-events-none absolute left-3"></Search>
					<Input
						type="text"
						placeholder={$_('leaderboard.search.placeholder')}
						class="flex-grow pl-10"
						bind:value={searchQuery}
						onkeydown={handleSearchKeydown}
					/>
				</div>
				{#if searchQueryValue}
					<Button
						variant="outline"
						onclick={() => {
							searchQuery = '';
							searchQueryValue = '';
							fetchLeaderboardData();
						}}
						disabled={loading}
						class="w-fit"
					>
						<X class="h-4 w-4" />
					</Button>
				{/if}
				<Button
					variant="outline"
					onclick={() => fetchLeaderboardData(searchOffset)}
					disabled={loading}
					class="w-fit"
				>
					<RefreshCw class="h-4 w-4" />
				</Button>
			</div>
		</div>
	</header>
	{#if loading}
		{#if searchQueryValue}
			<LeaderboardSearchSkeleton />
		{:else}
			<LeaderboardSkeleton />
		{/if}
	{:else if !leaderboardData}
		<div class="flex h-96 items-center justify-center">
			<div class="text-center">
				<div class="text-muted-foreground mb-4 text-lg md:text-xl">Failed to load leaderboard</div>
				<Button onclick={() => fetchLeaderboardData()}>Try Again</Button>
			</div>
		</div>
	{:else}
		<div class="grid gap-4 md:gap-6 xl:grid-cols-2">
			{#if searchQueryValue}
				{#if leaderboardData.results.length > 0}
					<div class="flex flex-col xl:col-span-2">
						<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
							{#each leaderboardData.results as user}
								<Card.Root
									class="hover:bg-muted/50 cursor-pointer gap-1 transition duration-200"
									onclick={() => goto(`/user/${user.username}`)}
								>
									<Card.Content>
										<div class="flex items-start gap-4">
											<Avatar.Root class="h-12 w-12 shrink-0">
												<Avatar.Image src={getPublicUrl(user.image)} alt={user.name} />
												<Avatar.Fallback class="text-sm"
													>{user.name?.charAt(0) || '?'}</Avatar.Fallback
												>
											</Avatar.Root>
											<div class="flex flex-grow flex-col">
												<div class="flex items-center gap-2">
													<h4 class="max-w-[150px] truncate text-sm font-semibold sm:max-w-[200px]">
														{user.name}
													</h4>
													<ProfileBadges {user} showId={true} size="sm" />
												</div>
												<p class="text-muted-foreground text-sm">@{user.username}</p>
												<div class="mt-2 flex flex-col gap-1">
													<div class="flex items-center justify-between">
														<span class="text-muted-foreground flex items-center gap-2 text-xs">
															<Wallet class="h-3 w-3" />
															{$_('portfolio.title')}
														</span>
														<span class="font-mono text-sm font-medium">
															{formatValue(user.totalPortfolioValue)}
														</span>
													</div>

													<div class="flex items-center justify-between">
														<span class="text-muted-foreground flex items-center gap-2 text-xs">
															<Wallet class="h-3 w-3" />
															{$_('sidebar.portfolio.cash')}
														</span>
														<span class="text-success font-mono text-sm font-medium">
															{formatValue(user.baseCurrencyBalance)}
														</span>
													</div>
												</div>
												<div class="mt-2 flex items-center gap-2">
													<Calendar class="text-muted-foreground h-4 w-4" />
													<p class="text-muted-foreground text-xs">
														{$_('user.joined').replace(
															'{{date}}',
															new Date(user.createdAt).toLocaleDateString(
																browser ? window.navigator.language : 'en-US',
																{
																	year: 'numeric',
																	month: 'long'
																}
															)
														)}
													</p>
												</div>
											</div>
										</div>
									</Card.Content>
								</Card.Root>
							{/each}
						</div>
					</div>
					<div class="flex flex-col items-center justify-between gap-2 lg:flex-row xl:col-span-2">
						<h2 class="text-muted-foreground text-sm">
							{$_('leaderboard.search.description')
								.replace('{{1}}', (1 + searchOffset).toLocaleString())
								.replace(
									'{{2}}',
									(Math.min(leaderboardData.results.length, 9) + searchOffset).toLocaleString()
								)
								.replace('{{3}}', leaderboardData.total.toString())}
						</h2>
						<div
							class="flex w-full flex-grow items-center justify-center gap-2 overflow-x-auto lg:w-auto lg:justify-end"
						>
							{#each Array(Math.ceil(leaderboardData.total / 9)) as _, index}
								<Button
									variant={searchOffset === index * 9 ? 'outline' : 'ghost'}
									onclick={() => {
										if (searchOffset === index * 9) return;
										if (index * 9 > leaderboardData.total) return;

										searchOffset = index * 9;
										fetchLeaderboardData(searchOffset);
									}}
								>
									<h2 class="text-sm">{index + 1}</h2>
								</Button>
							{/each}
						</div>
					</div>
				{:else}
					<div class="flex h-60 flex-col items-center justify-center xl:col-span-2">
						<h2 class="mb-4 text-xl">{$_('leaderboard.search.noFound.title')}</h2>
						<p class="text-muted-foreground mb-4 text-sm md:text-base">
							{$_('leaderboard.search.noFound.description').replace('{{search}}', searchQueryValue)}
						</p>
						<Button
							variant="outline"
							onclick={() => {
								searchQuery = '';
								searchQueryValue = '';
								fetchLeaderboardData();
							}}
						>
							<h2 class="text-sm">{$_('leaderboard.search.noFound.clear')}</h2>
						</Button>
					</div>
				{/if}
			{:else}
				<!-- Top Profit Makers -->
				<Card.Root class="overflow-hidden">
					<Card.Header class="pb-3 md:pb-4">
						<Card.Title class="flex items-center gap-2 text-lg text-red-600 md:text-xl">
							<Skull class="h-5 w-5 md:h-6 md:w-6" />
							<span class="truncate">{$_('leaderboard.topRugpullers.title')}</span>
						</Card.Title>
						<Card.Description class="text-xs md:text-sm">
							{$_('leaderboard.topRugpullers.description')}
						</Card.Description>
					</Card.Header>
					<Card.Content class="p-3 pt-0 md:p-6 md:pt-0">
						<DataTable
							columns={rugpullersColumns}
							data={leaderboardData.topRugpullers}
							onRowClick={(user) => goto(`/user/${user.userUsername || user.username}`)}
							emptyMessage={$_('leaderboard.topRugpullers.noData')}
							enableUserPreview={true}
						/>
					</Card.Content>
				</Card.Root>

				<!-- Biggest Losses -->
				<Card.Root class="overflow-hidden">
					<Card.Header class="pb-3 md:pb-4">
						<Card.Title class="flex items-center gap-2 text-lg text-orange-600 md:text-xl">
							<TrendingDown class="h-5 w-5 md:h-6 md:w-6" />
							<span class="truncate">{$_('leaderboard.biggestLosses.title')}</span>
						</Card.Title>
						<Card.Description class="text-xs md:text-sm"
							>{$_('leaderboard.biggestLosses.description')}</Card.Description
						>
					</Card.Header>
					<Card.Content class="p-3 pt-0 md:p-6 md:pt-0">
						<DataTable
							columns={losersColumns}
							data={leaderboardData.biggestLosers}
							onRowClick={(user) => goto(`/user/${user.userUsername || user.username}`)}
							emptyMessage={$_('leaderboard.biggestLosses.noData')}
							enableUserPreview={true}
						/>
					</Card.Content>
				</Card.Root>

				<!-- Top Cash Holders -->
				<Card.Root class="overflow-hidden">
					<Card.Header class="pb-3 md:pb-4">
						<Card.Title class="flex items-center gap-2 text-lg text-green-600 md:text-xl">
							<Crown class="h-5 w-5 md:h-6 md:w-6" />
							<span class="truncate">{$_('leaderboard.topCash.title')}</span>
						</Card.Title>
						<Card.Description class="text-xs md:text-sm"
							>{$_('leaderboard.topCash.description')}</Card.Description
						>
					</Card.Header>
					<Card.Content class="p-3 pt-0 md:p-6 md:pt-0">
						<DataTable
							columns={cashKingsColumns}
							data={leaderboardData.cashKings}
							onRowClick={(user) => goto(`/user/${user.userUsername || user.username}`)}
							emptyMessage={$_('leaderboard.topCash.noData')}
							enableUserPreview={true}
						/>
					</Card.Content>
				</Card.Root>

				<!-- Top Portfolio Values -->
				<Card.Root class="overflow-hidden">
					<Card.Header class="pb-3 md:pb-4">
						<Card.Title class="flex items-center gap-2 text-lg text-cyan-600 md:text-xl">
							<Trophy class="h-5 w-5 md:h-6 md:w-6" />
							<span class="truncate">{$_('leaderboard.highestPortfolio.title')}</span>
						</Card.Title>
						<Card.Description class="text-xs md:text-sm"
							>{$_('leaderboard.highestPortfolio.description')}</Card.Description
						>
					</Card.Header>
					<Card.Content class="p-3 pt-0 md:p-6 md:pt-0">
						<DataTable
							columns={millionairesColumns}
							data={leaderboardData.paperMillionaires}
							onRowClick={(user) => goto(`/user/${user.userUsername || user.username}`)}
							emptyMessage={$_('leaderboard.highestPortfolio.noData')}
							enableUserPreview={true}
						/>
					</Card.Content>
				</Card.Root>
			{/if}
		</div>
	{/if}
</div>
