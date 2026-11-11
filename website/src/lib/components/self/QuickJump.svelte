<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import CoinIcon from './CoinIcon.svelte';
	import Kbd from './Kbd.svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Search01Icon,
		Home03Icon,
		Store01Icon,
		ArrowUpDownIcon,
		Joystick04Icon,
		ChampionIcon,
		ShoppingBasket01Icon,
		Award05Icon,
		Briefcase01Icon,
		Analytics01Icon,
		Coins02Icon,
		Notification01Icon,
		Activity01Icon,
		ReceiptDollarIcon,
		Settings01Icon,
		Loading03Icon,
		UserIcon,
		CrownIcon,
		Key01Icon,
		InformationCircleIcon,
		Shield01Icon,
		Moon01Icon,
		Sun01Icon,
		MessageQuestionIcon,
		StarIcon,
		Clock01Icon
	} from '@hugeicons/core-free-icons';
	import { afterNavigate, goto } from '$app/navigation';
	import { mode, setMode } from 'mode-watcher';
	import { formatPrice, getPublicUrl } from '$lib/utils';
	import { USER_DATA } from '$lib/stores/user-data';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	type PageEntry = {
		title: string;
		url: string;
		icon: any;
		auth?: boolean;
		admin?: boolean;
		keywords?: string;
	};

	const PAGES: PageEntry[] = [
		{ title: 'Home', url: '/', icon: Home03Icon },
		{ title: 'Market', url: '/market', icon: Store01Icon, keywords: 'coins browse' },
		{ title: 'Portfolio', url: '/portfolio', icon: Briefcase01Icon, auth: true, keywords: 'holdings' },
		{ title: 'Transactions', url: '/transactions', icon: ReceiptDollarIcon, auth: true, keywords: 'history' },
		{ title: 'Hopium', url: '/hopium', icon: ArrowUpDownIcon, keywords: 'predictions bets' },
		{ title: 'Arcade', url: '/arcade', icon: Joystick04Icon, keywords: 'games gamble' },
		{ title: 'Arcade: Coinflip', url: '/arcade?game=coinflip', icon: Joystick04Icon, keywords: 'game' },
		{ title: 'Arcade: Slots', url: '/arcade?game=slots', icon: Joystick04Icon, keywords: 'game' },
		{ title: 'Arcade: Mines', url: '/arcade?game=mines', icon: Joystick04Icon, keywords: 'game' },
		{ title: 'Arcade: Dice', url: '/arcade?game=dice', icon: Joystick04Icon, keywords: 'game' },
		{ title: 'Arcade: Tower', url: '/arcade?game=tower', icon: Joystick04Icon, keywords: 'game' },
		{ title: 'Leaderboard', url: '/leaderboard', icon: ChampionIcon, keywords: 'top rich' },
		{ title: 'Season', url: '/season', icon: ChampionIcon, keywords: 'ranked' },
		{ title: 'Live Trades', url: '/live', icon: Activity01Icon, keywords: 'stream feed' },
		{ title: 'Treemap', url: '/treemap', icon: Analytics01Icon },
		{ title: 'Shop', url: '/shop', icon: ShoppingBasket01Icon, keywords: 'gems crates cosmetics' },
		{ title: 'Achievements', url: '/achievements', icon: Award05Icon },
		{ title: 'Create coin', url: '/coin/create', icon: Coins02Icon, keywords: 'new launch' },
		{ title: 'Notifications', url: '/notifications', icon: Notification01Icon, auth: true },
		{ title: 'Prestige', url: '/prestige', icon: CrownIcon, auth: true },
		{ title: 'Settings', url: '/settings', icon: Settings01Icon, auth: true, keywords: 'account profile' },
		{ title: 'API', url: '/api', icon: Key01Icon, auth: true, keywords: 'keys developer' },
		{ title: 'About', url: '/about', icon: InformationCircleIcon },
		{ title: 'Admin: Users', url: '/admin/users', icon: Shield01Icon, admin: true },
		{ title: 'Admin: Promo codes', url: '/admin/promo', icon: Shield01Icon, admin: true },
		{ title: 'Admin: Seasons', url: '/admin/seasons', icon: Shield01Icon, admin: true }
	];

	const FILTERS = [
		{ id: 'all', label: 'All' },
		{ id: 'coin', label: 'Coins' },
		{ id: 'user', label: 'Players' },
		{ id: 'question', label: 'Hopium' },
		{ id: 'page', label: 'Pages' }
	] as const;
	type FilterId = (typeof FILTERS)[number]['id'];

	type Item = {
		kind: 'coin' | 'user' | 'question' | 'page' | 'action';
		group: string;
		key: string;
		url?: string;
		run?: () => void;
		coin?: any;
		user?: any;
		question?: any;
		page?: PageEntry;
		title?: string;
		icon?: any;
	};

	const RECENTS_KEY = 'rugplay:quick-jump-recents';
	const MAX_RECENTS = 5;
	type Recent = { kind: 'coin' | 'user'; id: string };

	let query = $state('');
	let filter = $state<FilterId>('all');
	let coins = $state<any[]>([]);
	let users = $state<any[]>([]);
	let questions = $state<any[] | null>(null);
	let watchlist = $state<any[]>([]);
	let following = $state<any[]>([]);
	let recents = $state<Recent[]>([]);
	let searching = $state(false);
	let selected = $state(0);
	let listElement = $state<HTMLDivElement>();

	let trimmed = $derived(query.trim());
	let needle = $derived(trimmed.toLowerCase());
	const shows = (kind: FilterId) => filter === 'all' || filter === kind;

	let pageItems = $derived<Item[]>(
		!shows('page')
			? []
			: [
					...($USER_DATA && (!needle || 'my profile account'.includes(needle))
						? [
								{
									kind: 'page' as const,
									group: 'Pages',
									key: 'page:profile',
									url: `/user/${$USER_DATA.username}`,
									page: { title: 'My profile', url: '', icon: UserIcon }
								}
							]
						: []),
					...PAGES.filter(
						(entry) =>
							(!entry.auth || $USER_DATA) &&
							(!entry.admin || $USER_DATA?.isAdmin) &&
							// With nothing typed keep the list short: no per-game or admin rows.
							(needle
								? `${entry.title} ${entry.keywords ?? ''}`.toLowerCase().includes(needle)
								: !entry.admin && !entry.title.startsWith('Arcade:'))
					).map((entry) => ({
						kind: 'page' as const,
						group: 'Pages',
						key: `page:${entry.url}`,
						url: entry.url,
						page: entry
					}))
				]
	);

	let actionItems = $derived<Item[]>(
		filter !== 'all' ||
			(needle &&
				(needle.length < 3 ||
					!['toggle', 'switch', 'dark', 'light', 'mode', 'theme'].some((word) =>
						word.startsWith(needle)
					)))
			? []
			: [
					{
						kind: 'action' as const,
						group: 'Actions',
						key: 'action:theme',
						title: mode.current === 'light' ? 'Switch to dark mode' : 'Switch to light mode',
						icon: mode.current === 'light' ? Moon01Icon : Sun01Icon,
						run: () => setMode(mode.current === 'light' ? 'dark' : 'light')
					}
				]
	);

	let questionItems = $derived<Item[]>(
		!shows('question') || !questions || (!needle && filter !== 'question')
			? []
			: questions
					.filter((entry) => !needle || entry.question.toLowerCase().includes(needle))
					.slice(0, filter === 'question' ? 12 : 4)
					.map((entry) => ({
						kind: 'question' as const,
						group: 'Hopium',
						key: `question:${entry.id}`,
						url: `/hopium/${entry.id}`,
						question: entry
					}))
	);

	const coinItem = (coin: any, group: string): Item => ({
		kind: 'coin',
		group,
		key: `${group}:${coin.symbol}`,
		url: `/coin/${coin.symbol}`,
		coin
	});

	// Nothing typed yet: lead with the player's own shortcuts.
	let idleItems = $derived<Item[]>(
		needle
			? []
			: [
					...(shows('coin') ? watchlist.slice(0, 5).map((coin) => coinItem(coin, 'Your watchlist')) : []),
					...(shows('user')
						? following.slice(0, filter === 'user' ? 12 : 4).map((user) => ({
								kind: 'user' as const,
								group: 'Following',
								key: `following:${user.username}`,
								url: `/user/${user.username}`,
								user
							}))
						: []),
					...recents
						.filter((recent) => shows(recent.kind))
						.map((recent) =>
							recent.kind === 'coin'
								? coinItem({ symbol: recent.id, name: `*${recent.id}` }, 'Recently viewed')
								: {
										kind: 'user' as const,
										group: 'Recently viewed',
										key: `recent-user:${recent.id}`,
										url: `/user/${recent.id}`,
										user: { username: recent.id, name: recent.id }
									}
						)
				]
	);

	let items = $derived<Item[]>([
		...idleItems,
		...(shows('coin') ? coins.map((coin) => coinItem(coin, 'Coins')) : []),
		...(shows('user')
			? users.map((user) => ({
					kind: 'user' as const,
					group: 'Players',
					key: `user:${user.username}`,
					url: `/user/${user.username}`,
					user
				}))
			: []),
		...questionItems,
		...pageItems,
		...actionItems
	]);

	function loadRecents(): Recent[] {
		try {
			const stored = JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]');
			return Array.isArray(stored) ? stored.slice(0, MAX_RECENTS) : [];
		} catch {
			return [];
		}
	}

	// Remember the coins and players you open, however you got there.
	afterNavigate(({ to }) => {
		const routeId = to?.route.id;
		const recent: Recent | null =
			routeId === '/coin/[coinSymbol]' && to?.params?.coinSymbol
				? { kind: 'coin', id: to.params.coinSymbol.toUpperCase() }
				: routeId === '/user/[username]' && to?.params?.username
					? { kind: 'user', id: to.params.username }
					: null;
		if (!recent) return;

		try {
			const next = [
				recent,
				...loadRecents().filter((entry) => entry.kind !== recent.kind || entry.id !== recent.id)
			].slice(0, MAX_RECENTS);
			localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
		} catch {
			// Storage unavailable: recents are simply not kept.
		}
	});

	// Reset on every open, and load what the idle view and Hopium search need.
	$effect(() => {
		if (!open) return;

		query = '';
		filter = 'all';
		coins = [];
		users = [];
		selected = 0;
		recents = loadRecents();

		const controller = new AbortController();
		const load = (url: string) =>
			fetch(url, { signal: controller.signal })
				.then((response) => (response.ok ? response.json() : null))
				.catch(() => null);

		if ($USER_DATA) {
			load('/api/watchlist').then((result) => {
				if (result && !controller.signal.aborted) watchlist = result.coins;
			});
			load('/api/following').then((result) => {
				if (result && !controller.signal.aborted) following = result.players;
			});
		} else {
			watchlist = [];
			following = [];
		}
		// The questions endpoint has no text search, so fetch the active ones once
		// and match them here.
		load('/api/hopium/questions?status=ACTIVE&limit=50').then((result) => {
			if (result && !controller.signal.aborted) questions = result.questions ?? [];
		});

		return () => controller.abort();
	});

	// Debounced, cancellable search: only the latest keystroke's results land.
	$effect(() => {
		const term = trimmed;
		const wantCoins = shows('coin');
		const wantUsers = shows('user') && term.length >= 2;
		if (!open || term.length === 0 || (!wantCoins && !wantUsers)) {
			coins = [];
			users = [];
			searching = false;
			return;
		}

		const controller = new AbortController();
		searching = true;
		const load = (url: string) =>
			fetch(url, { signal: controller.signal }).then((response) =>
				response.ok ? response.json() : null
			);
		const timer = setTimeout(async () => {
			try {
				const [coinResult, userResult] = await Promise.all([
					wantCoins
						? load(
								`/api/market?search=${encodeURIComponent(term)}&limit=${filter === 'coin' ? 12 : 6}&sortBy=marketCap&sortOrder=desc`
							)
						: null,
					wantUsers
						? load(
								`/api/users/search?q=${encodeURIComponent(term)}&limit=${filter === 'user' ? 10 : 4}`
							)
						: null
				]);
				if (controller.signal.aborted) return;
				coins = coinResult?.coins ?? [];
				users = userResult?.results ?? [];
				selected = 0;
			} catch {
				// Aborted or offline: keep whatever is on screen.
			} finally {
				if (!controller.signal.aborted) searching = false;
			}
		}, 180);

		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	});

	// Keep the highlight inside the list as it changes under it.
	$effect(() => {
		if (selected >= items.length) selected = Math.max(0, items.length - 1);
	});

	function go(item: Item | undefined) {
		if (!item) return;
		open = false;
		if (item.run) item.run();
		else if (item.url) goto(item.url);
	}

	function setFilter(next: FilterId) {
		filter = next;
		selected = 0;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			if (items.length === 0) return;
			const delta = event.key === 'ArrowDown' ? 1 : -1;
			selected = (selected + delta + items.length) % items.length;
			listElement
				?.querySelector(`[data-index="${selected}"]`)
				?.scrollIntoView({ block: 'nearest' });
		} else if (event.key === 'Tab') {
			event.preventDefault();
			const index = FILTERS.findIndex((entry) => entry.id === filter);
			const delta = event.shiftKey ? -1 : 1;
			setFilter(FILTERS[(index + delta + FILTERS.length) % FILTERS.length].id);
		} else if (event.key === 'Enter') {
			event.preventDefault();
			go(items[selected]);
		}
	}

	let emptyMessage = $derived(
		searching
			? 'Searching...'
			: trimmed
				? `Nothing found for "${trimmed}"`
				: filter === 'user'
					? 'Type at least two letters of a name or username'
					: filter === 'coin'
						? 'Type a coin name or symbol'
						: 'Nothing here yet'
	);
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="top-[12%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl [&>button:last-child]:hidden"
	>
		<Dialog.Title class="sr-only">Quick jump</Dialog.Title>
		<Dialog.Description class="sr-only">
			Search coins, players, predictions and pages. Use the arrow keys and Enter to open a result,
			Tab to switch category.
		</Dialog.Description>

		<div class="flex items-center gap-3 border-b px-4">
			<HugeiconsIcon
				icon={searching ? Loading03Icon : Search01Icon}
				class="text-muted-foreground h-4 w-4 shrink-0 {searching ? 'animate-spin' : ''}"
			/>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				bind:value={query}
				onkeydown={handleKeydown}
				autofocus
				autocomplete="off"
				spellcheck="false"
				placeholder="Search coins, players, predictions, pages..."
				class="placeholder:text-muted-foreground h-12 w-full bg-transparent text-sm outline-none"
			/>
			<Kbd class="text-muted-foreground hidden sm:inline-flex">Esc</Kbd>
		</div>

		<div class="flex items-center gap-1 border-b px-3 py-2" role="tablist" aria-label="Result type">
			{#each FILTERS as entry (entry.id)}
				<button
					type="button"
					role="tab"
					aria-selected={filter === entry.id}
					tabindex="-1"
					class="cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors {filter ===
					entry.id
						? 'bg-primary text-primary-foreground'
						: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
					onclick={() => setFilter(entry.id)}
				>
					{entry.label}
				</button>
			{/each}
			<span class="text-muted-foreground ml-auto hidden items-center gap-1 text-[10px] sm:flex">
				<Kbd>Tab</Kbd> to switch
			</span>
		</div>

		<div class="max-h-[min(60vh,440px)] overflow-y-auto p-2" bind:this={listElement}>
			{#if items.length === 0}
				<p class="text-muted-foreground py-8 text-center text-sm">{emptyMessage}</p>
			{/if}

			{#each items as item, index (item.key)}
				{@const previous = items[index - 1]}
				{#if !previous || previous.group !== item.group}
					<div class="text-muted-foreground flex items-center gap-1.5 px-2 pb-1 pt-2 text-xs font-medium">
						{#if item.group === 'Your watchlist'}
							<HugeiconsIcon icon={StarIcon} class="h-3 w-3 fill-yellow-400 text-yellow-500" />
						{:else if item.group === 'Recently viewed'}
							<HugeiconsIcon icon={Clock01Icon} class="h-3 w-3" />
						{/if}
						{item.group}
					</div>
				{/if}
				<button
					type="button"
					data-index={index}
					tabindex="-1"
					class="flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-left text-sm {index ===
					selected
						? 'bg-accent text-accent-foreground'
						: ''}"
					onmousemove={() => (selected = index)}
					onclick={() => go(item)}
				>
					{#if item.kind === 'coin'}
						<CoinIcon icon={item.coin.icon} symbol={item.coin.symbol} name={item.coin.name} size={6} />
						<span class="min-w-0 flex-1 truncate">
							<span class="font-medium">{item.coin.name}</span>
							{#if item.coin.name !== `*${item.coin.symbol}`}
								<span class="text-muted-foreground ml-1 font-mono text-xs">*{item.coin.symbol}</span>
							{/if}
						</span>
						{@const price = item.coin.currentPrice ?? item.coin.price}
						{#if price !== undefined}
							<span class="text-muted-foreground font-mono text-xs">${formatPrice(price)}</span>
							<Badge
								variant={item.coin.change24h >= 0 ? 'success' : 'destructive'}
								class="shrink-0 text-xs"
							>
								{item.coin.change24h >= 0 ? '+' : ''}{item.coin.change24h.toFixed(2)}%
							</Badge>
						{/if}
					{:else if item.kind === 'user'}
						<Avatar.Root class="h-6 w-6">
							<Avatar.Image src={getPublicUrl(item.user.image)} alt={item.user.name} />
							<Avatar.Fallback class="text-xs">
								{item.user.name?.charAt(0)?.toUpperCase() ?? '?'}
							</Avatar.Fallback>
						</Avatar.Root>
						<span class="min-w-0 flex-1 truncate">
							{#if item.user.name !== item.user.username}
								<span class="font-medium">{item.user.name}</span>
							{/if}
							<span class="text-muted-foreground ml-1 text-xs">@{item.user.username}</span>
						</span>
					{:else if item.kind === 'question'}
						<HugeiconsIcon icon={MessageQuestionIcon} class="text-muted-foreground h-4 w-4 shrink-0" />
						<span class="min-w-0 flex-1 truncate">{item.question.question}</span>
						<Badge variant="outline" class="shrink-0 text-xs">
							{item.question.yesPercentage.toFixed(0)}% yes
						</Badge>
					{:else if item.kind === 'page' && item.page}
						<HugeiconsIcon icon={item.page.icon} class="text-muted-foreground h-4 w-4" />
						<span class="flex-1">{item.page.title}</span>
					{:else}
						<HugeiconsIcon icon={item.icon} class="text-muted-foreground h-4 w-4" />
						<span class="flex-1">{item.title}</span>
					{/if}
				</button>
			{/each}
		</div>
	</Dialog.Content>
</Dialog.Root>
