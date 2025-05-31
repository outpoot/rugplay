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
		Activity
	} from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import type { UserProfileData } from '$lib/types/user-profile';
	import { USER_DATA } from '$lib/stores/user-data';

	let { data } = $props();
	const username = data.username;

	let profileData = $state<UserProfileData | null>(null);
	let recentTransactions = $state<any[]>([]);
	let loading = $state(true);

	let isOwnProfile = $derived(
		$USER_DATA && profileData?.profile && $USER_DATA.username === profileData.profile.username
	);
	onMount(async () => {
		await fetchProfileData();
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
			? new Date(profileData.profile.createdAt).toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long'
				})
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

	const createdCoinsColumns = [
		{
			key: 'coin',
			label: 'Coin',
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
			label: 'Price',
			class: 'font-mono',
			render: (value: any) => `$${formatPrice(parseFloat(value))}`
		},
		{
			key: 'marketCap',
			label: 'Market Cap',
			class: 'hidden font-mono sm:table-cell',
			render: (value: any) => formatValue(parseFloat(value))
		},
		{
			key: 'change24h',
			label: '24h Change',
			class: 'hidden md:table-cell',
			render: (value: any) => ({
				component: 'badge',
				variant: parseFloat(value) >= 0 ? 'success' : 'destructive',
				text: `${parseFloat(value) >= 0 ? '+' : ''}${parseFloat(value).toFixed(2)}%`
			})
		},
		{
			key: 'createdAt',
			label: 'Created',
			class: 'text-muted-foreground hidden text-sm lg:table-cell',
			render: (value: any) => formatDate(value)
		}
	];
	const transactionsColumns = [
		{
			key: 'type',
			label: 'Type',
			class: 'w-[12%] min-w-[60px] md:w-[8%] pl-6',
			render: (value: any, row: any) => {
				// Handle transfer types (TRANSFER_IN, TRANSFER_OUT) from user profile API
				if (value === 'TRANSFER_IN' || value === 'TRANSFER_OUT') {
					return {
						component: 'badge',
						variant: 'default',
						text: value === 'TRANSFER_IN' ? 'Received' : 'Sent',
						class: 'text-xs'
					};
				}
				// Handle isTransfer format from transactions API
				if (row.isTransfer) {
					return {
						component: 'badge',
						variant: 'default',
						text: row.isIncoming ? 'Received' : 'Sent',
						class: 'text-xs'
					};
				}
				return {
					component: 'badge',
					variant: value === 'BUY' ? 'success' : 'destructive',
					text: value === 'BUY' ? 'Buy' : 'Sell',
					class: 'text-xs'
				};
			}
		},
		{
			key: 'coin',
			label: 'Coin',
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
			label: 'Sender',
			class: 'w-[12%] min-w-[70px] md:w-[10%]',
			render: (value: any, row: any) => {
				// Handle transactions API format
				if (row.isTransfer) {
					return {
						component: 'text',
						text: row.sender || 'Unknown',
						class: row.sender && row.sender !== 'Unknown' ? 'font-medium' : 'text-muted-foreground'
					};
				}
				// Handle user profile API format (no sender/recipient data available)
				if (row.type === 'TRANSFER_IN' || row.type === 'TRANSFER_OUT') {
					return {
						component: 'text',
						text: 'Unknown',
						class: 'text-muted-foreground'
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
			label: 'Receiver',
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
						text: 'Unknown',
						class: 'text-muted-foreground'
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
			label: 'Quantity',
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
			label: 'Amount',
			class: 'w-[12%] min-w-[70px] md:w-[10%] font-mono text-sm font-medium',
			render: (value: any) => formatValue(parseFloat(value))
		},
		{
			key: 'timestamp',
			label: 'Date',
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
	image={profileData?.profile?.image ? getPublicUrl(profileData.profile.image) : '/rugplay.svg'}
	imageAlt={profileData?.profile?.name
		? `${profileData.profile.name}'s profile picture`
		: `@${username}'s profile`}
	keywords="crypto trader profile game, virtual trading portfolio, cryptocurrency simulation game, user portfolio simulator"
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
							<span>Joined {memberSince}</span>
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
						<div class="text-muted-foreground text-sm font-medium">Total Portfolio</div>
						<Wallet class="text-muted-foreground h-4 w-4" />
					</div>
					<div class="mt-1 text-2xl font-bold">
						{formatValue(totalPortfolioValue)}
					</div>
					<p class="text-muted-foreground text-xs">{profileData.stats.holdingsCount} holdings</p>
				</Card.Content>
			</Card.Root>

			<!-- Liquid Value -->
			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="text-muted-foreground text-sm font-medium">Liquid Value</div>
					</div>
					<div class="text-success mt-1 text-2xl font-bold">
						{formatValue(baseCurrencyBalance)}
					</div>
					<p class="text-muted-foreground text-xs">Available cash</p>
				</Card.Content>
			</Card.Root>

			<!-- Illiquid Value -->
			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="text-muted-foreground text-sm font-medium">Illiquid Value</div>
					</div>
					<div class="text-success mt-1 text-2xl font-bold">
						{formatValue(holdingsValue)}
					</div>
					<p class="text-muted-foreground text-xs">Coin holdings</p>
				</Card.Content>
			</Card.Root>

			<!-- Buy/Sell Ratio -->
			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="text-muted-foreground text-sm font-medium">Buy/Sell Ratio</div>
						<div class="flex gap-1">
							<div class="bg-success h-2 w-2 rounded-full"></div>
							<div class="h-2 w-2 rounded-full bg-red-500"></div>
						</div>
					</div>
					<div class="mt-1 flex items-center gap-2">
						<span class="text-success text-xl font-bold">{buyPercentage.toFixed(1)}%</span>
						<span class="text-muted-foreground text-xs">buy</span>
						<span class="text-xl font-bold text-red-600">{sellPercentage.toFixed(1)}%</span>
						<span class="text-muted-foreground text-xs">sell</span>
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
						<div class="text-foreground text-sm font-medium">Buy Activity</div>
						<TrendingUp class="text-success h-4 w-4" />
					</div>
					<div class="mt-1">
						<div class="text-success text-2xl font-bold">
							{formatValue(totalBuyVolume)}
						</div>
						<div class="text-muted-foreground text-xs">Total amount spent</div>
					</div>
					<div class="border-muted mt-3 border-t pt-3">
						<div class="text-success text-lg font-bold">
							{formatValue(buyVolume24h)}
						</div>
						<div class="text-muted-foreground text-xs">24h buy volume</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Sell Activity -->
			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="text-foreground text-sm font-medium">Sell Activity</div>
						<TrendingDown class="h-4 w-4 text-red-600" />
					</div>
					<div class="mt-1">
						<div class="text-2xl font-bold text-red-600">
							{formatValue(totalSellVolume)}
						</div>
						<div class="text-muted-foreground text-xs">Total amount received</div>
					</div>
					<div class="border-muted mt-3 border-t pt-3">
						<div class="text-lg font-bold text-red-600">
							{formatValue(sellVolume24h)}
						</div>
						<div class="text-muted-foreground text-xs">24h sell volume</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Total Trading Volume -->
			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="text-muted-foreground text-sm font-medium">Total Trading Volume</div>
						<Badge variant="outline" class="text-xs">All Time</Badge>
					</div>
					<div class="mt-1 text-2xl font-bold">
						{formatValue(totalTradingVolumeAllTime)}
					</div>
					<div class="text-muted-foreground text-xs">
						{profileData.stats.totalTransactions} total trades
					</div>
				</Card.Content>
			</Card.Root>

			<!-- 24h Trading Volume -->
			<Card.Root class="py-0">
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="text-muted-foreground text-sm font-medium">24h Trading Volume</div>
						<Badge variant="outline" class="text-xs">24h</Badge>
					</div>
					<div class="mt-1 text-2xl font-bold">
						{formatValue(totalTradingVolume24h)}
					</div>
					<div class="text-muted-foreground text-xs">
						{profileData.stats.transactions24h || 0} trades today
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
						Created Coins ({profileData.createdCoins.length})
					</Card.Title>
					<Card.Description>Coins launched by {profileData.profile.name}</Card.Description>
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
					Recent Trading Activity
				</Card.Title>
				<Card.Description>Latest transactions by {profileData.profile.name}</Card.Description>
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
