<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import {
		Moon,
		Sun,
		Home,
		Store,
		BriefcaseBusiness,
		Coins,
		ChevronsUpDownIcon,
		LogOutIcon,
		Wallet,
		Trophy,
		Activity,
		TrendingUp,
		TrendingDown,
		User,
		Settings,
		Gift,
		Shield,
		Ticket,
		PiggyBank,
		ChartColumn,
		TrendingUpDown,
		Scale,
		ShieldCheck,
		Hammer,
		BookOpen,
		Info,
		Bell,
		Crown,
		Key
	} from 'lucide-svelte';
	import { mode, setMode } from 'mode-watcher';
	import type { HTMLAttributes } from 'svelte/elements';
	import { USER_DATA } from '$lib/stores/user-data';
	import { PORTFOLIO_SUMMARY, fetchPortfolioSummary } from '$lib/stores/portfolio-data';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import SignInConfirmDialog from './SignInConfirmDialog.svelte';
	import DailyRewards from './DailyRewards.svelte';
	import PromoCodeDialog from './PromoCodeDialog.svelte';
	import UserManualModal from './UserManualModal.svelte';
	import { signOut } from '$lib/auth-client';
	import { formatValue, getPublicUrl } from '$lib/utils';
	import { goto } from '$app/navigation';
	import { liveTradesStore, isLoadingTrades, halloweenEventStore } from '$lib/stores/websocket';
	import { onMount } from 'svelte';
	import { UNREAD_COUNT, fetchNotifications } from '$lib/stores/notifications';
	import { GAMBLING_STATS, fetchGamblingStats } from '$lib/stores/gambling-stats';

	const data = {
		navMain: [
			{ title: 'Home', url: '/', icon: Home },
			{ title: 'Market', url: '/market', icon: Store },
			{ title: 'Hopium', url: '/hopium', icon: TrendingUpDown },
			{ title: 'Gambling', url: '/gambling', icon: PiggyBank },
			{ title: 'Leaderboard', url: '/leaderboard', icon: Trophy },
			{ title: 'Portfolio', url: '/portfolio', icon: BriefcaseBusiness },
			{ title: 'Treemap', url: '/treemap', icon: ChartColumn },
			{ title: 'Create coin', url: '/coin/create', icon: Coins },
			{ title: 'Notifications', url: '/notifications', icon: Bell },
			{ title: 'About', url: '/about', icon: Info }
		]
	};
	type MenuButtonProps = HTMLAttributes<HTMLAnchorElement | HTMLButtonElement>;

	const { setOpenMobile, isMobile } = useSidebar();
	let shouldSignIn = $state(false);
	let showPromoCode = $state(false);
	let showUserManual = $state(false);
	let halloweenEventData = $state<any>(null);

	const currentEventData = $derived(
		$halloweenEventStore || halloweenEventData || { totalCommunityLosses: 0, goal: 200000000 }
	);
	const shouldShowEvent = $derived(true);

	async function fetchHalloweenEventData() {
		try {
			const response = await fetch('/api/event/halloween-badge');
			if (response.ok) {
				halloweenEventData = await response.json();
			}
		} catch (error) {
			console.error('Failed to fetch Halloween event data:', error);
		}
	}

	onMount(() => {
		fetchHalloweenEventData();

		if ($USER_DATA) {
			fetchPortfolioSummary();
			fetchNotifications();
			fetchGamblingStats();
		} else {
			PORTFOLIO_SUMMARY.set(null);
			GAMBLING_STATS.set(null);
		}
	});

	function handleNavClick(title: string) {
		setOpenMobile(false);
	}

	function handleModeToggle() {
		setMode(mode.current === 'light' ? 'dark' : 'light');
		// Remove setOpenMobile(false) to keep menu open
	}

	function formatCurrency(value: number): string {
		return value.toLocaleString('en-US', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		});
	}

	function handleLiveTradesClick() {
		goto('/live');
		setOpenMobile(false);
	}

	async function handleTradeClick(coinSymbol: string, trade: any) {
		if (trade.type === 'TRANSFER_IN' || trade.type === 'TRANSFER_OUT') {
			const targetPath = `/user/${trade.username}`;
			await goto(targetPath, { invalidateAll: true });
		} else {
			const targetPath = `/coin/${coinSymbol.toLowerCase()}`;
			await goto(targetPath, { invalidateAll: true });
		}
		setOpenMobile(false);
	}

	function handleAccountClick() {
		if ($USER_DATA) {
			goto(`/user/${$USER_DATA.id}`);
			setOpenMobile(false);
		}
	}

	function handleSettingsClick() {
		goto('/settings');
		setOpenMobile(false);
	}

	function handleAdminClick() {
		goto('/admin');
		setOpenMobile(false);
	}

	function handleUserManagementClick() {
		goto('/admin/users');
		setOpenMobile(false);
	}

	function handlePromoCodesClick() {
		goto('/admin/promo');
		setOpenMobile(false);
	}

	function handleTermsClick() {
		goto('/legal/terms');
		setOpenMobile(false);
	}

	function handlePrivacyClick() {
		goto('/legal/privacy');
		setOpenMobile(false);
	}

	function handleUserManualClick() {
		showUserManual = true;
		setOpenMobile(false);
	}

	function handlePrestigeClick() {
		goto('/prestige');
		setOpenMobile(false);
	}

	function handleAPIClick() {
		goto('/api');
		setOpenMobile(false);
	}

	function handleEventClick() {
		goto('/event/halloween-2025');
		setOpenMobile(false);
	}
</script>

<SignInConfirmDialog bind:open={shouldSignIn} />
<PromoCodeDialog bind:open={showPromoCode} />
<UserManualModal bind:open={showUserManual} />
<Sidebar.Root collapsible="offcanvas">
	<Sidebar.Header>
		<div class="flex items-center gap-2 px-2 py-2">
			<img src="/rugplay.svg" class="h-5 w-5" alt="twoblade" />
			<div class="flex items-center gap-2">
				<span class="text-base font-semibold">Rugplay</span>
				{#if $USER_DATA?.isAdmin}
					<span class="text-muted-foreground text-xs">| Admin</span>
				{/if}
			</div>
		</div>
	</Sidebar.Header>

	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each data.navMain as item}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton>
								{#snippet child({ props }: { props: MenuButtonProps })}
									<a
										href={item.url || '/'}
										onclick={() => handleNavClick(item.title)}
										class={`${props.class} ${item.title === 'Notifications' && !$USER_DATA ? 'pointer-events-none opacity-50' : ''}`}
									>
										<item.icon />
										<span>{item.title}</span>
										{#if item.title === 'Notifications' && $UNREAD_COUNT > 0 && $USER_DATA}
											<Sidebar.MenuBadge class="bg-primary text-primary-foreground">
												{$UNREAD_COUNT > 99 ? '99+' : $UNREAD_COUNT}
											</Sidebar.MenuBadge>
										{/if}
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>

		<!-- Halloween Event 2025 -->
		{#if shouldShowEvent}
			<Sidebar.Group>
				<Sidebar.GroupContent>
					<button
						onclick={handleEventClick}
						class="hover:bg-muted/20 w-full cursor-pointer rounded px-2 py-2"
						aria-label="View Halloween 2025 Event"
					>
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<span class="flex items-center gap-2 text-sm font-medium">
									<img src="/pumpkin.png" alt="Halloween 2025" class="h-5 w-5" />
									<span>Halloween 2025</span>
								</span>
								<span class="font-mono text-xs">
									{formatValue(currentEventData.totalCommunityLosses)}
								</span>
							</div>
							<div class="relative">
								<div class="bg-secondary h-2 w-full overflow-hidden rounded-full">
									<div
										class="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-300"
										style="width: {Math.min(
											(currentEventData.totalCommunityLosses /
												(currentEventData.goal || 200000000)) *
												100,
											100
										)}%"
									></div>
								</div>
							</div>
						</div>
					</button>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		{/if}

		<!-- Daily Rewards -->
		{#if $USER_DATA}
			<Sidebar.Group>
				<Sidebar.GroupContent>
					<div class="px-2 py-1">
						{#if !$PORTFOLIO_SUMMARY}
							<div class="space-y-2">
								<Skeleton class="h-8 w-full rounded" />
							</div>
						{:else}
							<DailyRewards />
						{/if}
					</div>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		{/if}

		<!-- Live Trades -->
		<Sidebar.Group>
			<Sidebar.GroupLabel class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<Activity class="h-4 w-4" />
					<span>Live Trades</span>
				</div>
				<button
					onclick={handleLiveTradesClick}
					class="text-muted-foreground hover:text-foreground cursor-pointer text-xs transition-colors"
				>
					View All
				</button>
			</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<div class="space-y-1 px-2 py-1">
					{#if $isLoadingTrades}
						{#each Array(5) as _, i}
							<div class="flex items-center gap-2 py-1 text-xs">
								<div class="flex items-center gap-1">
									<Skeleton class="h-3 w-3 rounded-full" />
									<Skeleton class="h-4 w-8" />
								</div>
								<div class="flex-1">
									<div class="flex items-center gap-1">
										<Skeleton class="h-3 w-12" />
										<Skeleton class="h-3 w-28" />
									</div>
								</div>
							</div>
						{/each}
					{:else if $liveTradesStore.length === 0}
						<div class="text-muted-foreground py-2 text-center text-xs">No big trades yet...</div>
					{:else}
						{#each $liveTradesStore.slice(0, 5) as trade, index (`${trade.timestamp}-${trade.username}-${trade.coinSymbol}-${index}`)}
							<button
								onclick={() => handleTradeClick(trade.coinSymbol, trade)}
								class="hover:bg-muted/50 flex w-full cursor-pointer items-center gap-2 rounded px-1 py-1 text-left text-xs transition-colors"
							>
								<div class="flex items-center gap-1">
									{#if trade.type === 'TRANSFER_IN' || trade.type === 'TRANSFER_OUT'}
										<Activity class="h-3 w-3 text-blue-500" />
										<Badge
											variant="outline"
											class="h-4 border-blue-500 px-1 py-0 text-[10px] text-blue-500"
										>
											{trade.type === 'TRANSFER_IN' ? 'REC' : 'SENT'}
										</Badge>
									{:else if trade.type === 'BUY'}
										<TrendingUp class="h-3 w-3 text-green-500" />
										<Badge
											variant="outline"
											class="h-4 border-green-500 px-1 py-0 text-[10px] text-green-500"
										>
											BUY
										</Badge>
									{:else}
										<TrendingDown class="h-3 w-3 text-red-500" />
										<Badge
											variant="outline"
											class="h-4 border-red-500 px-1 py-0 text-[10px] text-red-500"
										>
											SELL
										</Badge>
									{/if}
								</div>
								<div class="flex-1 truncate">
									<div class="flex items-center gap-1">
										<span class="text-foreground font-medium">
											{formatValue(trade.totalValue)}
										</span>
										{#if trade.type === 'TRANSFER_IN' || trade.type === 'TRANSFER_OUT'}
											{#if trade.amount > 0}
												<span class="text-muted-foreground">*{trade.coinSymbol}</span>
											{/if}
											<span class="text-muted-foreground">
												{trade.type === 'TRANSFER_IN' ? 'to' : 'from'}
											</span>
										{:else}
											<span class="text-muted-foreground">*{trade.coinSymbol}</span>
											<span class="text-muted-foreground">by</span>
										{/if}
										<span class="text-muted-foreground">@{trade.username}</span>
									</div>
								</div>
							</button>
						{/each}
					{/if}
				</div>
			</Sidebar.GroupContent>
		</Sidebar.Group>

		<!-- Portfolio Summary -->
		{#if $USER_DATA}
			<Sidebar.Group>
				<Sidebar.GroupLabel>Portfolio</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<div class="space-y-2 px-2 py-1">
						{#if !$PORTFOLIO_SUMMARY}
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<Skeleton class="h-4 w-4 rounded" />
									<Skeleton class="h-4 w-16" />
								</div>
								<Skeleton class="h-5 w-16 rounded" />
							</div>
							<div class="space-y-1">
								<div class="flex justify-between">
									<Skeleton class="h-3 w-8" />
									<Skeleton class="h-3 w-12" />
								</div>
								<div class="flex justify-between">
									<Skeleton class="h-3 w-10" />
									<Skeleton class="h-3 w-12" />
								</div>
							</div>
						{:else}
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<Wallet class="text-muted-foreground h-4 w-4" />
									<span class="text-sm font-medium">Total Value</span>
								</div>
								<Badge variant="secondary" class="font-mono">
									${formatCurrency($PORTFOLIO_SUMMARY.totalValue)}
								</Badge>
							</div>
							<div class="text-muted-foreground space-y-1 text-xs">
								<div class="flex justify-between">
									<span>Cash:</span>
									<span class="font-mono"
										>${formatCurrency($PORTFOLIO_SUMMARY.baseCurrencyBalance)}</span
									>
								</div>
								<div class="flex justify-between">
									<span>Coins:</span>
									<span class="font-mono">${formatCurrency($PORTFOLIO_SUMMARY.totalCoinValue)}</span
									>
								</div>
							</div>
						{/if}
					</div>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		{/if}
	</Sidebar.Content>

	{#if $USER_DATA}
		<Sidebar.Footer>
			<Sidebar.Menu>
				<Sidebar.MenuItem>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Sidebar.MenuButton
									size="lg"
									class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
									{...props}
								>
									<Avatar.Root class="size-8 rounded-lg">
										<Avatar.Image src={getPublicUrl($USER_DATA.image)} alt={$USER_DATA.name} />
										<Avatar.Fallback class="rounded-lg">?</Avatar.Fallback>
									</Avatar.Root>
									<div class="grid flex-1 text-left text-sm leading-tight">
										<span class="truncate font-medium">{$USER_DATA.name}</span>
										<span class="truncate text-xs">@{$USER_DATA.username}</span>
									</div>
									<ChevronsUpDownIcon class="ml-auto size-4" />
								</Sidebar.MenuButton>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content
							class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg p-2"
							side={isMobile ? 'bottom' : 'right'}
							align="end"
							sideOffset={4}
						>
							<DropdownMenu.Label class="p-0 font-normal">
								<div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
									<Avatar.Root class="size-8 rounded-lg">
										<Avatar.Image src={getPublicUrl($USER_DATA.image)} alt={$USER_DATA.name} />
										<Avatar.Fallback class="rounded-lg">?</Avatar.Fallback>
									</Avatar.Root>
									<div class="grid flex-1 text-left text-sm leading-tight">
										<span class="truncate font-medium">{$USER_DATA.name}</span>
										<span class="truncate text-xs">@{$USER_DATA.username}</span>
									</div>
								</div>
							</DropdownMenu.Label>
							<DropdownMenu.Separator />

							<!-- Profile & Settings Group -->
							<DropdownMenu.Group>
								<DropdownMenu.Item onclick={handleAccountClick}>
									<User />
									Account
								</DropdownMenu.Item>
								<DropdownMenu.Item onclick={handleSettingsClick}>
									<Settings />
									Settings
								</DropdownMenu.Item>
								<DropdownMenu.Item onclick={handlePrestigeClick}>
									<Crown />
									Prestige
								</DropdownMenu.Item>
							</DropdownMenu.Group>

							<DropdownMenu.Separator />

							<!-- Features Group -->
							<DropdownMenu.Group>
								<DropdownMenu.Item onclick={handleAPIClick}>
									<Key />
									API
								</DropdownMenu.Item>
								<DropdownMenu.Item
									onclick={() => {
										showPromoCode = true;
										setOpenMobile(false);
									}}
								>
									<Gift />
									Promo code
								</DropdownMenu.Item>
								<DropdownMenu.Item onclick={handleUserManualClick}>
									<BookOpen />
									User Manual
								</DropdownMenu.Item>
								<DropdownMenu.Item onclick={handleModeToggle}>
									{#if mode.current === 'light'}
										<Moon />
										Dark Mode
									{:else}
										<Sun />
										Light Mode
									{/if}
								</DropdownMenu.Item>
							</DropdownMenu.Group>

							{#if $USER_DATA?.isAdmin}
								<DropdownMenu.Separator />
								<!-- Admin Group -->
								<DropdownMenu.Group>
									<DropdownMenu.Item
										onclick={handleAdminClick}
										class="text-primary hover:text-primary!"
									>
										<Shield class="text-primary" />
										Admin Panel
									</DropdownMenu.Item>
									<DropdownMenu.Item
										onclick={handleUserManagementClick}
										class="text-primary hover:text-primary!"
									>
										<Hammer class="text-primary" />
										User Management
									</DropdownMenu.Item>
									<DropdownMenu.Item
										onclick={handlePromoCodesClick}
										class="text-primary hover:text-primary!"
									>
										<Ticket class="text-primary" />
										Manage codes
									</DropdownMenu.Item>
								</DropdownMenu.Group>
							{/if}

							<DropdownMenu.Separator />

							<!-- Legal Group -->
							<DropdownMenu.Group>
								<DropdownMenu.Item onclick={handleTermsClick}>
									<Scale />
									Terms of Service
								</DropdownMenu.Item>
								<DropdownMenu.Item onclick={handlePrivacyClick}>
									<ShieldCheck />
									Privacy Policy
								</DropdownMenu.Item>
							</DropdownMenu.Group>

							<DropdownMenu.Separator />

							<!-- Sign Out -->
							<DropdownMenu.Item
								onclick={() => {
									signOut().then(() => {
										USER_DATA.set(null);
										window.location.reload();
									});
								}}
							>
								<LogOutIcon />
								Log out
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		</Sidebar.Footer>
	{:else}
		<Sidebar.Footer>
			<Sidebar.Menu>
				<Sidebar.MenuItem>
					<Sidebar.MenuButton>
						{#snippet child({ props }: { props: MenuButtonProps })}
							<a href="/legal/terms" onclick={handleTermsClick} class={`${props.class}`}>
								<Scale />
								<span>Terms of Service</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
				<Sidebar.MenuItem>
					<Sidebar.MenuButton>
						{#snippet child({ props }: { props: MenuButtonProps })}
							<a href="/legal/privacy" onclick={handlePrivacyClick} class={`${props.class}`}>
								<ShieldCheck />
								<span>Privacy Policy</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		</Sidebar.Footer>
	{/if}
</Sidebar.Root>
