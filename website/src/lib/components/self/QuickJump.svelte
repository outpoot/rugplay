<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import CoinIcon from './CoinIcon.svelte';
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
		Loading03Icon
	} from '@hugeicons/core-free-icons';
	import { goto } from '$app/navigation';
	import { formatPrice, getPublicUrl } from '$lib/utils';
	import { USER_DATA } from '$lib/stores/user-data';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	const PAGES = [
		{ title: 'Home', url: '/', icon: Home03Icon },
		{ title: 'Market', url: '/market', icon: Store01Icon },
		{ title: 'Portfolio', url: '/portfolio', icon: Briefcase01Icon, auth: true },
		{ title: 'Transactions', url: '/transactions', icon: ReceiptDollarIcon, auth: true },
		{ title: 'Hopium', url: '/hopium', icon: ArrowUpDownIcon },
		{ title: 'Arcade', url: '/arcade', icon: Joystick04Icon },
		{ title: 'Leaderboard', url: '/leaderboard', icon: ChampionIcon },
		{ title: 'Live Trades', url: '/live', icon: Activity01Icon },
		{ title: 'Treemap', url: '/treemap', icon: Analytics01Icon },
		{ title: 'Shop', url: '/shop', icon: ShoppingBasket01Icon },
		{ title: 'Achievements', url: '/achievements', icon: Award05Icon },
		{ title: 'Create coin', url: '/coin/create', icon: Coins02Icon },
		{ title: 'Notifications', url: '/notifications', icon: Notification01Icon, auth: true },
		{ title: 'Settings', url: '/settings', icon: Settings01Icon, auth: true }
	];

	type Item =
		| { kind: 'coin'; key: string; url: string; coin: any }
		| { kind: 'user'; key: string; url: string; user: any }
		| { kind: 'page'; key: string; url: string; page: (typeof PAGES)[number] };

	let query = $state('');
	let coins = $state<any[]>([]);
	let users = $state<any[]>([]);
	let searching = $state(false);
	let selected = $state(0);
	let listElement = $state<HTMLDivElement>();

	let trimmed = $derived(query.trim());

	let pages = $derived(
		PAGES.filter(
			(entry) =>
				(!entry.auth || $USER_DATA) &&
				(!trimmed || entry.title.toLowerCase().includes(trimmed.toLowerCase()))
		)
	);

	let items = $derived<Item[]>([
		...coins.map((coin) => ({
			kind: 'coin' as const,
			key: `coin:${coin.symbol}`,
			url: `/coin/${coin.symbol}`,
			coin
		})),
		...users.map((user) => ({
			kind: 'user' as const,
			key: `user:${user.username}`,
			url: `/user/${user.username}`,
			user
		})),
		...pages.map((page) => ({
			kind: 'page' as const,
			key: `page:${page.url}`,
			url: page.url,
			page
		}))
	]);

	// Reset every time the palette opens.
	$effect(() => {
		if (open) {
			query = '';
			coins = [];
			users = [];
			selected = 0;
		}
	});

	// Debounced, cancellable search: only the latest keystroke's results land.
	$effect(() => {
		const term = trimmed;
		if (!open || term.length === 0) {
			coins = [];
			users = [];
			searching = false;
			return;
		}

		const controller = new AbortController();
		searching = true;
		const timer = setTimeout(async () => {
			try {
				const coinRequest = fetch(
					`/api/market?search=${encodeURIComponent(term)}&limit=6&sortBy=marketCap&sortOrder=desc`,
					{ signal: controller.signal }
				).then((response) => (response.ok ? response.json() : null));
				const userRequest =
					term.length >= 2
						? fetch(`/api/leaderboard?search=${encodeURIComponent(term)}&limit=4`, {
								signal: controller.signal
							}).then((response) => (response.ok ? response.json() : null))
						: Promise.resolve(null);

				const [coinResult, userResult] = await Promise.all([coinRequest, userRequest]);
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

	function go(item: Item | undefined) {
		if (!item) return;
		open = false;
		goto(item.url);
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
		} else if (event.key === 'Enter') {
			event.preventDefault();
			go(items[selected]);
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="top-[12%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl [&>button:last-child]:hidden"
	>
		<Dialog.Title class="sr-only">Quick jump</Dialog.Title>
		<Dialog.Description class="sr-only">
			Search coins, players and pages. Use the arrow keys and Enter to open a result.
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
				placeholder="Search coins, players, pages..."
				class="placeholder:text-muted-foreground h-12 w-full bg-transparent text-sm outline-none"
			/>
			<kbd class="text-muted-foreground hidden rounded border px-1.5 text-[10px] font-medium sm:inline">
				Esc
			</kbd>
		</div>

		<div class="max-h-[min(60vh,420px)] overflow-y-auto p-2" bind:this={listElement}>
			{#if items.length === 0}
				<p class="text-muted-foreground py-8 text-center text-sm">
					{searching ? 'Searching...' : `Nothing found for "${trimmed}"`}
				</p>
			{/if}

			{#each items as item, index (item.key)}
				{@const previous = items[index - 1]}
				{#if !previous || previous.kind !== item.kind}
					<div class="text-muted-foreground px-2 pb-1 pt-2 text-xs font-medium">
						{item.kind === 'coin' ? 'Coins' : item.kind === 'user' ? 'Players' : 'Pages'}
					</div>
				{/if}
				<button
					type="button"
					data-index={index}
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
							<span class="text-muted-foreground ml-1 font-mono text-xs">*{item.coin.symbol}</span>
						</span>
						<span class="text-muted-foreground font-mono text-xs">
							${formatPrice(item.coin.currentPrice)}
						</span>
						<Badge
							variant={item.coin.change24h >= 0 ? 'success' : 'destructive'}
							class="shrink-0 text-xs"
						>
							{item.coin.change24h >= 0 ? '+' : ''}{item.coin.change24h.toFixed(2)}%
						</Badge>
					{:else if item.kind === 'user'}
						<Avatar.Root class="h-6 w-6">
							<Avatar.Image src={getPublicUrl(item.user.image)} alt={item.user.name} />
							<Avatar.Fallback class="text-xs">{item.user.name?.charAt(0) ?? '?'}</Avatar.Fallback>
						</Avatar.Root>
						<span class="min-w-0 flex-1 truncate">
							<span class="font-medium">{item.user.name}</span>
							<span class="text-muted-foreground ml-1 text-xs">@{item.user.username}</span>
						</span>
					{:else}
						<HugeiconsIcon icon={item.page.icon} class="text-muted-foreground h-4 w-4" />
						<span class="flex-1">{item.page.title}</span>
					{/if}
				</button>
			{/each}
		</div>
	</Dialog.Content>
</Dialog.Root>
