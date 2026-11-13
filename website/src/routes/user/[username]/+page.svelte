<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import DataTable from '$lib/components/self/DataTable.svelte';
	import ProfileBadges from '$lib/components/self/ProfileBadges.svelte';
	import UserName from '$lib/components/self/UserName.svelte';
	import ProfileSkeleton from '$lib/components/self/skeletons/ProfileSkeleton.svelte';
	import SEO from '$lib/components/self/SEO.svelte';
	import { getPublicUrl, formatPrice, formatValue, formatQuantity, formatDate } from '$lib/utils';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Calendar01Icon,
		Wallet01Icon,
		TradeUpIcon,
		TradeDownIcon,
		Coins01Icon,
		Activity01Icon,
		PercentIcon,
		Invoice03Icon,
		Award05Icon,
		UnavailableIcon,
		SentIcon,
		UserAdd01Icon,
		UserCheck01Icon,
		Link01Icon,
		Tick01Icon,
		Briefcase01Icon
	} from '@hugeicons/core-free-icons';
	import SendMoneyModal from '$lib/components/self/SendMoneyModal.svelte';
	import PlayerListDialog from '$lib/components/self/PlayerListDialog.svelte';
	import { FOLLOW_LIST_LIMIT } from '$lib/data/constants';
	import { fetchPortfolioData, fetchPortfolioSummary } from '$lib/stores/portfolio-data';
	import { goto } from '$app/navigation';
	import { USER_DATA } from '$lib/stores/user-data';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { haptic } from '$lib/stores/haptics';

	let { data } = $props();
	let username = $derived(data.username);

	let profileData = $state(data.profileData);
	let recentTransactions = $state(data.recentTransactions);
	let loading = $state(false);
	let userAchievements = $state<any[]>([]);

	let previousUsername = $state<string | null>(null);

	$effect(() => {
		profileData = data.profileData;
		recentTransactions = data.recentTransactions;
	});

	let isOwnProfile = $derived(
		$USER_DATA && profileData?.profile && $USER_DATA.username === profileData.profile.username
	);

	let isBlocked = $state(false);
	let blockLoading = $state(false);

	let isFollowing = $state(false);
	let followLoading = $state(false);
	let followerCount = $state(0);
	let followingCount = $state(0);

	let followListOpen = $state(false);
	let followListType = $state<'followers' | 'following'>('followers');
	let followListPlayers = $state<any[]>([]);
	let followListLoading = $state(false);
	let followListCount = $derived(followListType === 'followers' ? followerCount : followingCount);

	async function openFollowList(type: 'followers' | 'following') {
		const target = username;
		followListType = type;
		followListPlayers = [];
		followListLoading = true;
		followListOpen = true;
		try {
			const res = await fetch(`/api/user/${encodeURIComponent(target)}/follows?type=${type}`);
			const data = res.ok ? await res.json() : null;
			if (data && target === username && followListType === type) followListPlayers = data.players;
		} catch {
			toast.error('Failed to load the list');
		} finally {
			if (followListType === type) followListLoading = false;
		}
	}
	let sendMoneyOpen = $state(false);
	let linkCopied = $state(false);

	async function loadRelationship() {
		const target = username;
		isBlocked = false;
		isFollowing = false;
		try {
			const res = await fetch(`/api/user/${encodeURIComponent(target)}/relationship`);
			if (res.ok && target === username) {
				const data = await res.json();
				isBlocked = data.isBlocked;
				isFollowing = data.isFollowing;
				followerCount = data.followers;
				followingCount = data.following;
			}
		} catch { /* silent */ }
	}

	async function toggleFollow() {
		if (!$USER_DATA || isOwnProfile || followLoading) return;
		followLoading = true;
		const next = !isFollowing;
		try {
			const res = await fetch(`/api/user/${encodeURIComponent(username)}/follow`, {
				method: next ? 'POST' : 'DELETE'
			});
			if (res.ok) {
				isFollowing = next;
				followerCount = Math.max(0, followerCount + (next ? 1 : -1));
				haptic.trigger('light');
				toast.success(next ? `Following @${username}` : `Unfollowed @${username}`);
			} else {
				const data = await res.json().catch(() => null);
				toast.error(data?.message || 'Failed to update follow');
			}
		} catch {
			toast.error('Failed to update follow');
		} finally {
			followLoading = false;
		}
	}

	async function openSendMoney() {
		// The dialog reads balances from the portfolio store, which is only filled
		// on the Portfolio page otherwise.
		void fetchPortfolioData();
		sendMoneyOpen = true;
	}

	async function copyProfileLink() {
		try {
			await navigator.clipboard.writeText(`${window.location.origin}/user/${username}`);
			linkCopied = true;
			haptic.trigger('light');
			toast.success('Profile link copied');
			setTimeout(() => (linkCopied = false), 2000);
		} catch {
			toast.error('Could not copy the link');
		}
	}

	async function toggleBlock() {
		if (!$USER_DATA || isOwnProfile || blockLoading) return;
		blockLoading = true;
		try {
			const res = await fetch(`/api/user/${username}/block`, {
				method: isBlocked ? 'DELETE' : 'POST',
			});
			if (res.ok) {
				isBlocked = !isBlocked;
				haptic.trigger(isBlocked ? 'warning' : 'light');
				toast.success(isBlocked ? 'User blocked' : 'User unblocked');
			} else {
				const data = await res.json();
				toast.error(data.message || 'Failed to update block status');
			}
		} catch {
			toast.error('Failed to update block status');
		} finally {
			blockLoading = false;
		}
	}

	onMount(async () => {
		previousUsername = username;
		fetchAchievements();
		loadRelationship();

		if (isOwnProfile) {
			await fetchTransactions();
		}
	});

	$effect(() => {
		if (username && previousUsername && username !== previousUsername) {
			userAchievements = [];
			fetchAchievements();
			loadRelationship();
			previousUsername = username;
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

	async function fetchAchievements() {
		try {
			const res = await fetch(`/api/user/${username}/achievements`);
			if (res.ok) {
				const data = await res.json();
				userAchievements = data.achievements || [];
			}
		} catch {
			// silent fail
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
	let holdings = $derived<any[]>(profileData?.holdings ?? []);
	let holdingsColumns = $derived([
		{
			key: 'coin',
			label: 'Coin',
			class: 'pl-6 font-medium',
			render: (value: any, row: any) => ({
				component: 'coin',
				icon: row.icon,
				symbol: row.symbol,
				name: `*${row.symbol}`
			})
		},
		{
			key: 'quantity',
			label: 'Quantity',
			class: 'font-mono',
			sortable: true,
			render: (value: any) => formatQuantity(value)
		},
		{
			key: 'currentPrice',
			label: 'Price',
			class: 'hidden font-mono sm:table-cell',
			render: (value: any) => `$${formatPrice(value)}`
		},
		{
			key: 'change24h',
			label: '24h Change',
			class: 'hidden md:table-cell',
			sortable: true,
			render: (value: any) => ({
				component: 'badge',
				variant: value >= 0 ? 'success' : 'destructive',
				text: `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
			})
		},
		{
			key: 'value',
			label: 'Value',
			class: 'font-mono font-medium',
			sortable: true,
			defaultSort: true,
			render: (value: any) => formatValue(value)
		},
		{
			key: 'share',
			label: 'Portfolio %',
			class: 'hidden lg:table-cell',
			render: (value: any, row: any) => ({
				component: 'badge',
				variant: 'outline',
				text:
					profileData?.stats?.totalPortfolioValue > 0
						? `${((row.value / profileData.stats.totalPortfolioValue) * 100).toFixed(1)}%`
						: '-'
			})
		}
	]);

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

	// Arcade stats
	let arcadeWins = $derived(
		profileData?.profile?.arcadeWins ? Number(profileData.profile.arcadeWins) : 0
	);
	let arcadeLosses = $derived(
		profileData?.profile?.arcadeLosses ? Number(profileData.profile.arcadeLosses) : 0
	);
	let totalPlayed = $derived(arcadeWins + arcadeLosses);
	let netProfit = $derived(arcadeWins - arcadeLosses);
	let winRate = $derived(
		totalPlayed > 0 ? ((arcadeWins / totalPlayed) * 100).toFixed(1) : '0.0'
	);

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
				if (row.isTransfer) {
					return {
						component: 'text',
						text: row.sender || 'Unknown',
						class: row.sender && row.sender !== 'Unknown' ? 'font-medium' : 'text-muted-foreground'
					};
				}
				if (row.type === 'TRANSFER_IN' || row.type === 'TRANSFER_OUT') {
					return {
						component: 'text',
						text: row.senderUsername || 'Unknown',
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
			class: 'md:w-[18%] text-muted-foreground text-sm',
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
	image={profileData?.profile?.image ? getPublicUrl(profileData.profile.image) : '/apple-touch-icon.png'}
	imageAlt={profileData?.profile?.name
		? `${profileData.profile.name}'s profile picture`
		: `@${username}'s profile`}
	keywords="crypto trader profile game, virtual trading portfolio, cryptocurrency simulation game, user portfolio simulator"
	twitterCard="summary"
/>

<PlayerListDialog
	bind:open={followListOpen}
	title={`${followListType === 'followers' ? 'Followers' : 'Following'} (${followListCount.toLocaleString()})`}
	players={followListPlayers}
	loading={followListLoading}
	emptyMessage={followListType === 'followers'
		? 'No followers yet.'
		: 'Not following anyone yet.'}
	footnote={followListCount > FOLLOW_LIST_LIMIT ? `Showing the ${FOLLOW_LIST_LIMIT} most recent.` : ''}
/>

{#if $USER_DATA && !isOwnProfile}
	<SendMoneyModal
		bind:open={sendMoneyOpen}
		prefilledUsername={username}
		onSuccess={() => void fetchPortfolioSummary()}
	/>
{/if}

<div class="container mx-auto max-w-6xl py-6 sm:px-6">
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
			<Card.Content class="p-4 sm:p-6">
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
								<h1 class="min-w-0 break-words text-2xl font-bold sm:text-3xl"><UserName name={profileData.profile.name} nameColor={profileData.profile.nameColor} truncate={false} /></h1>

								<!-- Badges -->
								<ProfileBadges user={profileData.profile} />
							</div>
							<p class="text-muted-foreground truncate text-lg">@{profileData.profile.username}</p>
						</div>

						{#if profileData.profile.bio}
							<p class="text-muted-foreground mb-3 max-w-2xl break-words leading-relaxed">
								{profileData.profile.bio}
							</p>
						{/if}

						<div class="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
							<HugeiconsIcon icon={Calendar01Icon} class="h-4 w-4 shrink-0" />
							<span class="whitespace-nowrap">Joined {memberSince}</span>
							<span aria-hidden="true">·</span>
							<button
								class="hover:text-foreground cursor-pointer transition-colors hover:underline"
								onclick={() => openFollowList('followers')}
							>
								<span class="text-foreground font-medium">{followerCount.toLocaleString()}</span>
								{followerCount === 1 ? 'follower' : 'followers'}
							</button>
							<span aria-hidden="true">·</span>
							<button
								class="hover:text-foreground cursor-pointer transition-colors hover:underline"
								onclick={() => openFollowList('following')}
							>
								<span class="text-foreground font-medium">{followingCount.toLocaleString()}</span>
								following
							</button>
						</div>

					</div>
					<div class="flex flex-wrap items-center gap-2 self-start sm:ml-auto">
						{#if $USER_DATA && !isOwnProfile}
							<Button
								variant={isFollowing ? 'outline' : 'default'}
								size="sm"
								class="h-8"
								onclick={toggleFollow}
								disabled={followLoading}
								aria-pressed={isFollowing}
							>
								<HugeiconsIcon icon={isFollowing ? UserCheck01Icon : UserAdd01Icon} class="h-4 w-4" />
								{isFollowing ? 'Following' : 'Follow'}
							</Button>
							<Button variant="outline" size="sm" class="h-8" onclick={openSendMoney}>
								<HugeiconsIcon icon={SentIcon} class="h-4 w-4" />
								Send
							</Button>
						{/if}
						<Tooltip.Provider>
							<Tooltip.Root>
								<Tooltip.Trigger>
									<Button
										variant="ghost"
										size="icon"
										class="text-muted-foreground h-8 w-8"
										aria-label="Copy profile link"
										onclick={copyProfileLink}
									>
										<HugeiconsIcon icon={linkCopied ? Tick01Icon : Link01Icon} class="h-4 w-4" />
									</Button>
								</Tooltip.Trigger>
								<Tooltip.Content>{linkCopied ? 'Copied' : 'Copy profile link'}</Tooltip.Content>
							</Tooltip.Root>
						</Tooltip.Provider>
						{#if $USER_DATA && !isOwnProfile}
							<Tooltip.Provider>
								<Tooltip.Root>
									<Tooltip.Trigger>
										<Button
											variant={isBlocked ? 'outline' : 'ghost'}
											size="icon"
											onclick={toggleBlock}
											disabled={blockLoading}
											class="h-8 w-8 {isBlocked ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'}"
										>
											<HugeiconsIcon icon={UnavailableIcon} class="h-4 w-4" />
										</Button>
									</Tooltip.Trigger>
									<Tooltip.Content>{isBlocked ? 'Unblock' : 'Block'}</Tooltip.Content>
								</Tooltip.Root>
							</Tooltip.Provider>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Main Portfolio Stats -->
		<div class="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
			<!-- Total Portfolio Value -->
			<Card.Root class="py-0">
				<Card.Content class="p-3 sm:p-4">
					<div class="flex items-start justify-between gap-2">
						<div class="text-muted-foreground text-sm font-medium">Total Portfolio</div>
						<HugeiconsIcon icon={Wallet01Icon} class="text-muted-foreground h-4 w-4 shrink-0" />
					</div>
					<div class="mt-1 text-xl font-bold sm:text-2xl">
						{formatValue(totalPortfolioValue)}
					</div>
					<p class="text-muted-foreground text-xs">{profileData.stats.holdingsCount} holdings</p>
				</Card.Content>
			</Card.Root>

			<!-- Liquid Value -->
			<Card.Root class="py-0">
				<Card.Content class="p-3 sm:p-4">
					<div class="flex items-start justify-between gap-2">
						<div class="text-muted-foreground text-sm font-medium">Liquid Value</div>
					</div>
					<div class="text-success mt-1 text-xl font-bold sm:text-2xl">
						{formatValue(baseCurrencyBalance)}
					</div>
					<p class="text-muted-foreground text-xs">Available cash</p>
				</Card.Content>
			</Card.Root>

			<!-- Illiquid Value -->
			<Card.Root class="py-0">
				<Card.Content class="p-3 sm:p-4">
					<div class="flex items-start justify-between gap-2">
						<div class="text-muted-foreground text-sm font-medium">Illiquid Value</div>
					</div>
					<div class="text-success mt-1 text-xl font-bold sm:text-2xl">
						{formatValue(holdingsValue)}
					</div>
					<p class="text-muted-foreground text-xs">Coin holdings</p>
				</Card.Content>
			</Card.Root>

			<!-- Buy/Sell Ratio -->
			<Card.Root class="py-0">
				<Card.Content class="p-3 sm:p-4">
					<div class="flex items-start justify-between gap-2">
						<div class="text-muted-foreground text-sm font-medium">Buy/Sell Ratio</div>
						<div class="flex gap-1">
							<div class="bg-success h-2 w-2 rounded-full"></div>
							<div class="h-2 w-2 rounded-full bg-red-500"></div>
						</div>
					</div>
					<div class="mt-1 flex flex-wrap items-baseline gap-x-2">
						<span class="text-success text-xl font-bold">{buyPercentage.toFixed(1)}%</span>
						<span class="text-muted-foreground text-xs">buy</span>
						<span class="text-xl font-bold text-red-600">{sellPercentage.toFixed(1)}%</span>
						<span class="text-muted-foreground text-xs">sell</span>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Buy & Sell Activity Breakdown -->
		<div class="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
			<!-- Buy Activity -->
			<Card.Root class="py-0">
				<Card.Content class="p-3 sm:p-4">
					<div class="flex items-start justify-between gap-2">
						<div class="text-foreground text-sm font-medium">Buy Activity</div>
						<HugeiconsIcon icon={TradeUpIcon} class="text-success h-4 w-4" />
					</div>
					<div class="mt-1">
						<div class="text-success text-xl font-bold sm:text-2xl">
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
				<Card.Content class="p-3 sm:p-4">
					<div class="flex items-start justify-between gap-2">
						<div class="text-foreground text-sm font-medium">Sell Activity</div>
						<HugeiconsIcon icon={TradeDownIcon} class="h-4 w-4 text-red-600" />
					</div>
					<div class="mt-1">
						<div class="text-xl font-bold sm:text-2xl text-red-600">
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
				<Card.Content class="p-3 sm:p-4">
					<div class="flex items-start justify-between gap-2">
						<div class="text-muted-foreground text-sm font-medium">Total Trading Volume</div>
						<Badge variant="outline" class="hidden shrink-0 text-xs sm:inline-flex">All Time</Badge>
					</div>
					<div class="mt-1 text-xl font-bold sm:text-2xl">
						{formatValue(totalTradingVolumeAllTime)}
					</div>
					<div class="text-muted-foreground text-xs">
						{profileData.stats.totalTransactions} total trades
					</div>
				</Card.Content>
			</Card.Root>

			<!-- 24h Trading Volume -->
			<Card.Root class="py-0">
				<Card.Content class="p-3 sm:p-4">
					<div class="flex items-start justify-between gap-2">
						<div class="text-muted-foreground text-sm font-medium">24h Trading Volume</div>
						<Badge variant="outline" class="hidden shrink-0 text-xs sm:inline-flex">24h</Badge>
					</div>
					<div class="mt-1 text-xl font-bold sm:text-2xl">
						{formatValue(totalTradingVolume24h)}
					</div>
					<div class="text-muted-foreground text-xs">
						{profileData.stats.transactions24h || 0} trades today
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Arcade Stats -->
		<div class="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
			<!-- Total Wins -->
			<Card.Root class="py-0">
				<Card.Content class="p-3 sm:p-4">
					<div class="flex items-start justify-between gap-2">
						<div class="text-foreground text-sm font-medium">Total Wins</div>
						<HugeiconsIcon icon={TradeUpIcon} class="text-success h-4 w-4" />
					</div>
					<div class="text-success mt-1 text-xl font-bold sm:text-2xl">
						{formatValue(arcadeWins)}
					</div>
					<div class="text-muted-foreground text-xs">Total arcade winnings</div>
				</Card.Content>
			</Card.Root>

			<!-- Total Losses -->
			<Card.Root class="py-0">
				<Card.Content class="p-3 sm:p-4">
					<div class="flex items-start justify-between gap-2">
						<div class="text-foreground text-sm font-medium">Total Losses</div>
						<HugeiconsIcon icon={TradeDownIcon} class="h-4 w-4 text-red-600" />
					</div>
					<div class="mt-1 text-xl font-bold sm:text-2xl text-red-600">
						{formatValue(arcadeLosses)}
					</div>
					<div class="text-muted-foreground text-xs">Total arcade losses</div>
				</Card.Content>
			</Card.Root>

			<!-- Win Rate -->
			<Card.Root class="py-0">
				<Card.Content class="p-3 sm:p-4">
					<div class="flex items-start justify-between gap-2">
						<div class="text-muted-foreground text-sm font-medium">Win Rate</div>
						<HugeiconsIcon icon={PercentIcon} class="text-muted-foreground h-4 w-4" />
					</div>
					<div class="mt-1 text-xl font-bold sm:text-2xl">
						{winRate}%
					</div>
					<div class="text-muted-foreground text-xs">Percentage of wins</div>
				</Card.Content>
			</Card.Root>

			<!-- Net Profit -->
			<Card.Root class="py-0">
				<Card.Content class="p-3 sm:p-4">
					<div class="flex items-start justify-between gap-2">
						<div class="text-muted-foreground text-sm font-medium">Net Profit</div>
					</div>
					<div class="mt-1 text-xl font-bold sm:text-2xl" class:text-success={netProfit >= 0} class:text-red-600={netProfit < 0}>
						{#if netProfit >= 0}
							{formatValue(netProfit)}
						{:else}
							-{formatValue(Math.abs(netProfit))}
						{/if}
					</div>
					<div class="text-muted-foreground text-xs">
						{netProfit >= 0 ? 'Overall profit' : 'Overall loss'}
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Achievements -->
		{#if userAchievements.length > 0}
			<Card.Root class="mb-6">
				<Card.Header class="pb-3">
					<div class="flex items-center justify-between">
						<Card.Title class="flex items-center gap-2">
							<HugeiconsIcon icon={Award05Icon} class="h-5 w-5 text-yellow-500" />
							Achievements ({userAchievements.filter((a) => a.unlocked).length}/{userAchievements.length})
						</Card.Title>
						<Button variant="outline" size="sm" onclick={() => goto('/achievements')}>
							View All
						</Button>
					</div>
				</Card.Header>
				<Card.Content>
					<div class="flex flex-wrap gap-2">
						{#each userAchievements as achievement}
							<Tooltip.Root>
								<Tooltip.Trigger>
									<img
										src="/achievements/{achievement.icon}"
										alt={achievement.name}
										class="h-8 w-8 cursor-pointer transition-all {achievement.unlocked ? 'hover:scale-110' : 'brightness-[0.3] grayscale'}"
									/>
								</Tooltip.Trigger>
								<Tooltip.Content
									class="bg-secondary text-secondary-foreground ring-border ring-1"
									arrowClasses="bg-secondary"
								>
									<p class="font-semibold">{achievement.name}</p>
									<p class="text-muted-foreground text-xs">{achievement.description}</p>
									{#if !achievement.unlocked}
										<p class="mt-1 text-xs text-yellow-500">Locked</p>
									{/if}
								</Tooltip.Content>
							</Tooltip.Root>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Holdings -->
		{#if holdings.length > 0}
			<Card.Root class="mb-6">
				<Card.Header class="pb-3">
					<Card.Title class="flex items-center gap-2">
						<HugeiconsIcon icon={Briefcase01Icon} class="h-5 w-5" />
						Holdings ({profileData.stats.holdingsCount})
					</Card.Title>
					<Card.Description>
						{profileData.stats.holdingsCount > holdings.length
							? `The ${holdings.length} largest positions held by ${profileData.profile.name}`
							: `Coins held by ${profileData.profile.name}`}
					</Card.Description>
				</Card.Header>
				<Card.Content class="p-0">
					<DataTable
						columns={holdingsColumns}
						mobileColumnOrder={['coin', 'value', 'change24h']}
						data={holdings}
						onRowClick={(holding) => goto(`/coin/${holding.symbol}`)}
					/>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Created Coins -->
		{#if hasCreatedCoins}
			<Card.Root class="mb-6">
				<Card.Header class="pb-3">
					<Card.Title class="flex items-center gap-2">
						<HugeiconsIcon icon={Coins01Icon} class="h-5 w-5" />
						Created Coins ({profileData.createdCoins.length})
					</Card.Title>
					<Card.Description>Coins launched by {profileData.profile.name}</Card.Description>
				</Card.Header>
				<Card.Content class="p-0">
					<DataTable
						columns={createdCoinsColumns}
						mobileColumnOrder={['coin', 'currentPrice', 'change24h']}
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
					<HugeiconsIcon icon={Activity01Icon} class="h-5 w-5" />
					Recent Trading Activity
				</Card.Title>
				<Card.Description>Latest transactions by {profileData.profile.name}</Card.Description>
			</Card.Header>
			<Card.Content class="p-0">
				<DataTable
					columns={transactionsColumns}
					mobileColumnOrder={['type', 'coin', 'totalBaseCurrencyAmount']}
					data={recentTransactions}
					emptyIcon={Invoice03Icon}
					emptyTitle="No recent activity"
					emptyDescription="This user hasn't made any trades yet."
				/>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
