<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import DataTable from '$lib/components/self/DataTable.svelte';
	import ProfileBadges from '$lib/components/self/ProfileBadges.svelte';
	import ProfileSkeleton from '$lib/components/self/skeletons/ProfileSkeleton.svelte';
	import SEO from '$lib/components/self/SEO.svelte';
	import { getPublicUrl, formatPrice, formatValue, formatQuantity, formatDate } from '$lib/utils';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import {
		Calendar,
		Wallet,
		TrendingUp,
		TrendingDown,
		Coins,
		Receipt,
		Activity,
		DollarSign,
		PiggyBank,
		TrendingUpDown,
		Percent
	} from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { USER_DATA } from '$lib/stores/user-data';
	import { _ } from 'svelte-i18n';
	import { defaultLocale } from '$lib/components/ui/locales/i18n.js';
	import { browser } from '$app/environment';
	let { data } = $props();
	let username = $derived(data.username);

	let profileData = $state(data.profileData);
	let recentTransactions = $state(data.recentTransactions);
	let loading = $state(false);

	let previousUsername = $state<string | null>(null);

	let isOwnProfile = $derived(
		$USER_DATA && profileData?.profile && $USER_DATA.username === profileData.profile.username
	);

	onMount(async () => {
		previousUsername = username;

		if (isOwnProfile) {
			await fetchTransactions();
		}
	});

	$effect(() => {
		if (username && previousUsername && username !== previousUsername) {
			loading = true;
			profileData = null;
			recentTransactions = [];

			fetchProfileData().then(() => {
				previousUsername = username;
			});
		}
	});

	$effect(() => {
		if (isOwnProfile && profileData) {
			fetchTransactions();
		}
	});

	async function fetchProfileData() {
		try {
			const response = await fetch(`/api/user/${username}`);
			if (response.ok) {
				profileData = await response.json();
				recentTransactions = profileData?.recentTransactions || [];
			} else {
				toast.error('Failed to load profile data');
			}
		} catch (e) {
			console.error('Failed to fetch profile data:', e);
			toast.error('Failed to load profile data');
		} finally {
			loading = false;
		}
	}

	async function fetchTransactions() {
		if (!isOwnProfile) return;

		try {
			const response = await fetch('/api/transactions?limit=10');
			if (response.ok) {
				const data = await response.json();
				recentTransactions = data.transactions || [];
			}
		} catch (e) {
			console.error('Failed to fetch transactions:', e);
		}
	}

	let memberSince = $derived(
		profileData?.profile
			? new Date(profileData.profile.createdAt).toLocaleDateString(
					browser ? window.navigator.language : defaultLocale,
					{
						year: 'numeric',
						month: 'long'
					}
				)
			: ''
	);
	let hasCreatedCoins = $derived(
		profileData?.createdCoins?.length ? profileData.createdCoins.length > 0 : false
	);

	let totalTradingVolume = $derived(
		profileData?.stats
			? Number(profileData.stats.totalBuyVolume) + Number(profileData.stats.totalSellVolume)
			: 0
	);

	let buyPercentage = $derived(
		profileData?.stats && totalTradingVolume > 0
			? (Number(profileData.stats.totalBuyVolume) / totalTradingVolume) * 100
			: 0
	);
	let sellPercentage = $derived(
		profileData?.stats && totalTradingVolume > 0
			? (Number(profileData.stats.totalSellVolume) / totalTradingVolume) * 100
			: 0
	);

	let totalPortfolioValue = $derived(
		profileData?.stats?.totalPortfolioValue ? Number(profileData.stats.totalPortfolioValue) : 0
	);
	let baseCurrencyBalance = $derived(
		profileData?.stats?.baseCurrencyBalance ? Number(profileData.stats.baseCurrencyBalance) : 0
	);
	let holdingsValue = $derived(
		profileData?.stats?.holdingsValue ? Number(profileData.stats.holdingsValue) : 0
	);
	let totalBuyVolume = $derived(
		profileData?.stats?.totalBuyVolume ? Number(profileData.stats.totalBuyVolume) : 0
	);
	let totalSellVolume = $derived(
		profileData?.stats?.totalSellVolume ? Number(profileData.stats.totalSellVolume) : 0
	);
	let buyVolume24h = $derived(
		profileData?.stats?.buyVolume24h ? Number(profileData.stats.buyVolume24h) : 0
	);
	let sellVolume24h = $derived(
		profileData?.stats?.sellVolume24h ? Number(profileData.stats.sellVolume24h) : 0
	);

	let totalTradingVolumeAllTime = $derived(totalBuyVolume + totalSellVolume);

	let totalTradingVolume24h = $derived(buyVolume24h + sellVolume24h);

	// Gambling stats
	let gamblingWins = $derived(
		profileData?.profile?.gamblingWins ? Number(profileData.profile.gamblingWins) : 0
	);
	let gamblingLosses = $derived(
		profileData?.profile?.gamblingLosses ? Number(profileData.profile.gamblingLosses) : 0
	);
	let totalGambled = $derived(gamblingWins + gamblingLosses);
	let netProfit = $derived(gamblingWins - gamblingLosses);
	let winRate = $derived(
		totalGambled > 0 ? ((gamblingWins / totalGambled) * 100).toFixed(1) : '0.0'
	);

	const createdCoinsColumns = [
		{
			key: 'coin',
			label: $_('base.coin'),
			class: 'pl-6 font-medium',
			render: (value: any, row: any) => ({
				component: 'coin',
				icon: row.icon,
				symbol: row.symbol,
				name: row.name
			})
		},
		{
			key: 'currentPrice',
			label: $_('coin.price'),
			class: 'font-mono',
			render: (value: any) => `$${formatPrice(parseFloat(value))}`
		},
		{
			key: 'marketCap',
			label: $_('coin.marketCap'),
			class: 'hidden font-mono sm:table-cell',
			render: (value: any) => formatValue(parseFloat(value))
		},
		{
			key: 'change24h',
			label: $_('coin.24hChange'),
			class: 'hidden md:table-cell',
			render: (value: any) => ({
				component: 'badge',
				variant: parseFloat(value) >= 0 ? 'success' : 'destructive',
				text: `${parseFloat(value) >= 0 ? '+' : ''}${parseFloat(value).toFixed(2)}%`
			})
		},
		{
			key: 'createdAt',
			label: $_('coin.created'),
			class: 'text-muted-foreground hidden text-sm lg:table-cell',
			render: (value: any) => formatDate(value)
		}
	];

	const transactionsColumns = [
		{
			key: 'type',
			label: $_('base.type'),
			class: 'w-[12%] min-w-[60px] md:w-[8%] pl-6',
			render: (value: any, row: any) => {
				// Handle transfer types (TRANSFER_IN, TRANSFER_OUT) from user profile API
				if (value === 'TRANSFER_IN' || value === 'TRANSFER_OUT') {
					return {
						component: 'badge',
						variant: 'default',
						text: value === 'TRANSFER_IN' ? $_('base.received') : $_('base.sent'),
						class: 'text-xs'
					};
				}
				// Handle isTransfer format from transactions API
				if (row.isTransfer) {
					return {
						component: 'badge',
						variant: 'default',
						text: row.isIncoming ? $_('base.received') : $_('base.sent'),
						class: 'text-xs'
					};
				}
				return {
					component: 'badge',
					variant: value === 'BUY' ? 'success' : 'destructive',
					text: value === 'BUY' ? $_('base.buy') : $_('base.sell'),
					class: 'text-xs'
				};
			}
		},
		{
			key: 'coin',
			label: $_('base.coin'),
			class: 'w-[20%] min-w-[100px] md:w-[12%]',
			render: (value: any, row: any) => {
				// Handle transfer format from transactions API
				if (row.isTransfer) {
					if (row.isCoinTransfer && row.coin) {
						return {
							component: 'coin',
							icon: row.coin.icon,
							symbol: row.coin.symbol,
							name: `*${row.coin.symbol}`,
							size: 4
						};
					}
					return { component: 'text', text: '-' };
				}
				// Handle transfer types from user profile API
				if (row.type === 'TRANSFER_IN' || row.type === 'TRANSFER_OUT') {
					if (row.coinSymbol && Number(row.quantity) > 0) {
						return {
							component: 'coin',
							icon: row.coinIcon,
							symbol: row.coinSymbol,
							name: `*${row.coinSymbol}`,
							size: 4
						};
					}
					return { component: 'text', text: '-' };
				}
				// Handle regular transactions from both APIs
				return {
					component: 'coin',
					icon: row.coinIcon || row.coin?.icon,
					symbol: row.coinSymbol || row.coin?.symbol,
					name: `*${row.coinSymbol || row.coin?.symbol}`,
					size: 4
				};
			}
		},
		{
			key: 'sender',
			label: $_('base.sender'),
			class: 'w-[12%] min-w-[70px] md:w-[10%]',
			render: (value: any, row: any) => {
				if (row.isTransfer) {
					return {
						component: 'text',
						text: row.sender || $_('base.unknown'),
						class: row.sender && row.sender !== 'Unknown' ? 'font-medium' : 'text-muted-foreground'
					};
				}
				if (row.type === 'TRANSFER_IN' || row.type === 'TRANSFER_OUT') {
					return {
						component: 'text',
						text: row.senderUsername || $_('base.unknown'),
						class: row.senderUsername ? 'font-medium' : 'text-muted-foreground'
					};
				}
				return {
					component: 'text',
					text: '-',
					class: 'text-muted-foreground'
				};
			}
		},
		{
			key: 'recipient',
			label: $_('base.receiver'),
			class: 'w-[12%] min-w-[70px] md:w-[10%]',
			render: (value: any, row: any) => {
				if (row.isTransfer) {
					return {
						component: 'text',
						text: row.recipient || 'Unknown',
						class:
							row.recipient && row.recipient !== 'Unknown' ? 'font-medium' : 'text-muted-foreground'
					};
				}
				if (row.type === 'TRANSFER_IN' || row.type === 'TRANSFER_OUT') {
					return {
						component: 'text',
						text: row.recipientUsername || 'Unknown',
						class: row.recipientUsername ? 'font-medium' : 'text-muted-foreground'
					};
				}
				return {
					component: 'text',
					text: '-',
					class: 'text-muted-foreground'
				};
			}
		},
		{
			key: 'quantity',
			label: $_('base.quantity'),
			class: 'w-[12%] min-w-[70px] md:w-[10%] font-mono text-sm',
			render: (value: any, row: any) => {
				if (
					(row.isTransfer && value === 0) ||
					((row.type === 'TRANSFER_IN' || row.type === 'TRANSFER_OUT') && value === 0)
				) {
					return '-';
				}
				return formatQuantity(parseFloat(value));
			}
		},
		{
			key: 'totalBaseCurrencyAmount',
			label: $_('base.amount'),
			class: 'w-[12%] min-w-[70px] md:w-[10%] font-mono text-sm font-medium',
			render: (value: any) => formatValue(parseFloat(value))
		},
		{
			key: 'timestamp',
			label: $_('base.date'),
			class: 'hidden md:table-cell md:w-[18%] text-muted-foreground text-sm',
			render: (value: any) => formatDate(value)
		}
	];
</script>

<SEO
	title={profileData?.profile?.name
		? `${profileData.profile.name} (@${profileData.profile.username}) - Rugplay`
		: `@${username} - Rugplay`}
	description={profileData?.profile?.bio
		? `${profileData.profile.bio} - View ${profileData.profile.name}'s simulated trading activity and virtual portfolio in the Rugplay cryptocurrency simulation game.`
		: `View @${username}'s profile and simulated trading activity in Rugplay - cryptocurrency trading simulation game platform.`}
	type="profile"
	image={profileData?.profile?.image
		? getPublicUrl(profileData.profile.image)
		: '/apple-touch-icon.png'}
	imageAlt={profileData?.profile?.name
		? `${profileData.profile.name}'s profile picture`
		: `@${username}'s profile`}
	keywords="crypto trader profile game, virtual trading portfolio, cryptocurrency simulation game, user portfolio simulator"
	twitterCard="summary"
/>

<div class="container mx-auto max-w-6xl p-6">
	{#if loading}
		<ProfileSkeleton />
	{:else if !profileData}
		<div class="flex h-96 items-center justify-center">
			<div class="text-center">
				<div class="text-muted-foreground mb-4 text-xl">Failed to load profile</div>
				<Button onclick={fetchProfileData}>Try Again</Button>
			</div>
		</div>
	{:else}
		<!-- Profile Header Card -->
		<Card.Root class="mb-6 py-0">
			<Card.Content class="p-6">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-start">
					<!-- Avatar -->
					<div class="flex-shrink-0">
						<Avatar.Root class="size-20 sm:size-24">
							<Avatar.Image
								src={getPublicUrl(profileData.profile.image)}
								alt={profileData.profile.name}
							/>
							<Avatar.Fallback class="text-xl"
								>{profileData.profile.name.charAt(0).toUpperCase()}</Avatar.Fallback
							>
						</Avatar.Root>
					</div>

					<!-- Profile Info -->
					<div class="min-w-0 flex-1">
						<div class="mb-3">
							<div class="mb-1 flex flex-wrap items-center gap-2">
								<h1 class="text-2xl font-bold sm:text-3xl">{profileData.profile.name}</h1>

								<!-- Badges -->
								<ProfileBadges user={profileData.profile} />
							</div>
							<p class="text-muted-foreground text-lg">@{profileData.profile.username}</p>
						</div>

						{#if profileData.profile.bio}
							<p class="text-muted-foreground mb-3 max-w-2xl leading-relaxed">
								{profileData.profile.bio}
							</p>
						{/if}

						<div class="text-muted-foreground flex items-center gap-2 text-sm">
							<Calendar class="h-4 w-4" />
							<span>{$_('user.joined').replace('{{date}}', memberSince)}</span>
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Main Portfolio Stats -->
		<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<!-- Total Portfolio Value -->
			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="text-muted-foreground text-sm font-medium">
							{$_('user.totalPortfolio.title')}
						</div>
						<Wallet class="text-muted-foreground h-4 w-4" />
					</div>
					<div class="mt-1 text-2xl font-bold">
						{formatValue(totalPortfolioValue)}
					</div>
					<p class="text-muted-foreground text-xs">
						{$_('user.totalPortfolio.description').replace(
							'{{count}}',
							profileData.stats.holdingsCount
						)}
					</p>
				</Card.Content>
			</Card.Root>

			<!-- Liquid Value -->
			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="text-muted-foreground text-sm font-medium">
							{$_('user.liquidValue.title')}
						</div>
					</div>
					<div class="text-success mt-1 text-2xl font-bold">
						{formatValue(baseCurrencyBalance)}
					</div>
					<p class="text-muted-foreground text-xs">{$_('user.liquidValue.description')}</p>
				</Card.Content>
			</Card.Root>

			<!-- Illiquid Value -->
			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="text-muted-foreground text-sm font-medium">
							{$_('user.illiquidValue.title')}
						</div>
					</div>
					<div class="text-success mt-1 text-2xl font-bold">
						{formatValue(holdingsValue)}
					</div>
					<p class="text-muted-foreground text-xs">{$_('user.illiquidValue.description')}</p>
				</Card.Content>
			</Card.Root>

			<!-- Buy/Sell Ratio -->
			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="text-muted-foreground text-sm font-medium">
							{$_('user.buySellRatio.title')}
						</div>
						<div class="flex gap-1">
							<div class="bg-success h-2 w-2 rounded-full"></div>
							<div class="h-2 w-2 rounded-full bg-red-500"></div>
						</div>
					</div>
					<div class="mt-1 flex items-center gap-2">
						<span class="text-success text-xl font-bold">{buyPercentage.toFixed(1)}%</span>
						<span class="text-muted-foreground text-xs">{$_('user.buySellRatio.buy')}</span>
						<span class="text-xl font-bold text-red-600">{sellPercentage.toFixed(1)}%</span>
						<span class="text-muted-foreground text-xs">{$_('user.buySellRatio.sell')}</span>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Buy & Sell Activity Breakdown -->
		<div class="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
			<!-- Buy Activity -->
			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="text-foreground text-sm font-medium">{$_('user.buyActivity.title')}</div>
						<TrendingUp class="text-success h-4 w-4" />
					</div>
					<div class="mt-1">
						<div class="text-success text-2xl font-bold">
							{formatValue(totalBuyVolume)}
						</div>
						<div class="text-muted-foreground text-xs">{$_('user.buyActivity.description')}</div>
					</div>
					<div class="border-muted mt-3 border-t pt-3">
						<div class="text-success text-lg font-bold">
							{formatValue(buyVolume24h)}
						</div>
						<div class="text-muted-foreground text-xs">{$_('user.buyActivity.description2')}</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Sell Activity -->
			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="text-foreground text-sm font-medium">{$_('user.sellActivity.title')}</div>
						<TrendingDown class="h-4 w-4 text-red-600" />
					</div>
					<div class="mt-1">
						<div class="text-2xl font-bold text-red-600">
							{formatValue(totalSellVolume)}
						</div>
						<div class="text-muted-foreground text-xs">{$_('user.sellActivity.description')}</div>
					</div>
					<div class="border-muted mt-3 border-t pt-3">
						<div class="text-lg font-bold text-red-600">
							{formatValue(sellVolume24h)}
						</div>
						<div class="text-muted-foreground text-xs">{$_('user.sellActivity.description2')}</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Total Trading Volume -->
			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="text-muted-foreground text-sm font-medium">
							{$_('user.totalVolume.title')}
						</div>
						<Badge variant="outline" class="text-xs">All Time</Badge>
					</div>
					<div class="mt-1 text-2xl font-bold">
						{formatValue(totalTradingVolumeAllTime)}
					</div>
					<div class="text-muted-foreground text-xs">
						{$_('user.totalVolume.description').replace(
							'{{count}}',
							profileData.stats.totalTransactions.toString()
						)}
					</div>
				</Card.Content>
			</Card.Root>

			<!-- 24h Trading Volume -->
			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="text-muted-foreground text-sm font-medium">
							{$_('user.24hTradingVolume.title')}
						</div>
						<Badge variant="outline" class="text-xs">24h</Badge>
					</div>
					<div class="mt-1 text-2xl font-bold">
						{formatValue(totalTradingVolume24h)}
					</div>
					<div class="text-muted-foreground text-xs">
						{$_('user.24hTradingVolume.description').replace(
							'{{count}}',
							(profileData.stats.transactions24h || 0).toString()
						)}
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Gambling Stats -->
		<div class="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
			<!-- Total Wins -->
			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="text-foreground text-sm font-medium">{$_('user.totalWins.title')}</div>
						<TrendingUp class="text-success h-4 w-4" />
					</div>
					<div class="text-success mt-1 text-2xl font-bold">
						{formatValue(gamblingWins)}
					</div>
					<div class="text-muted-foreground text-xs">{$_('user.totalWins.description')}</div>
				</Card.Content>
			</Card.Root>

			<!-- Total Losses -->
			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="text-foreground text-sm font-medium">{$_('user.totalLosses.title')}</div>
						<TrendingDown class="h-4 w-4 text-red-600" />
					</div>
					<div class="mt-1 text-2xl font-bold text-red-600">
						{formatValue(gamblingLosses)}
					</div>
					<div class="text-muted-foreground text-xs">{$_('user.totalLosses.description')}</div>
				</Card.Content>
			</Card.Root>

			<!-- Win Rate -->
			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="text-muted-foreground text-sm font-medium">{$_('user.winRate.title')}</div>
						<Percent class="text-muted-foreground h-4 w-4" />
					</div>
					<div class="mt-1 text-2xl font-bold">
						{winRate}%
					</div>
					<div class="text-muted-foreground text-xs">{$_('user.winRate.description')}</div>
				</Card.Content>
			</Card.Root>

			<!-- Net Profit -->
			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="text-muted-foreground text-sm font-medium">
							{$_('user.netProfit.title')}
						</div>
					</div>
					<div
						class="mt-1 text-2xl font-bold"
						class:text-success={netProfit >= 0}
						class:text-red-600={netProfit < 0}
					>
						{#if netProfit >= 0}
							{formatValue(netProfit)}
						{:else}
							-{formatValue(Math.abs(netProfit))}
						{/if}
					</div>
					<div class="text-muted-foreground text-xs">
						{netProfit >= 0
							? $_('user.netProfit.description.0')
							: $_('user.netProfit.description.1')}
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Created Coins -->
		{#if hasCreatedCoins}
			<Card.Root class="mb-6">
				<Card.Header class="pb-3">
					<Card.Title class="flex items-center gap-2">
						<Coins class="h-5 w-5" />
						{$_('user.createdCoins.title').replace(
							'{{count}}',
							profileData.createdCoins.length.toString()
						)}
					</Card.Title>
					<Card.Description
						>{$_('user.createdCoins.description').replace(
							'{{name}}',
							profileData.profile.name
						)}</Card.Description
					>
				</Card.Header>
				<Card.Content class="p-0">
					<DataTable
						columns={createdCoinsColumns}
						data={profileData.createdCoins}
						onRowClick={(coin) => goto(`/coin/${coin.symbol}`)}
					/>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Recent Trading Activity -->
		<Card.Root>
			<Card.Header class="pb-3">
				<Card.Title class="flex items-center gap-2">
					<Activity class="h-5 w-5" />
					{$_('user.recentTrading.title')}
				</Card.Title>
				<Card.Description
					>{$_('user.recentTrading.description').replace(
						'{{name}}',
						profileData.profile.name
					)}</Card.Description
				>
			</Card.Header>
			<Card.Content class="p-0">
				<DataTable
					columns={transactionsColumns}
					data={recentTransactions}
					emptyIcon={Receipt}
					emptyTitle="No recent activity"
					emptyDescription="This user hasn't made any trades yet."
				/>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
