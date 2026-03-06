<script lang="ts">
	import { chatMessagesStore, sendChatMessage, sendTyping, typingStore } from '$lib/stores/websocket';
	import { USER_DATA } from '$lib/stores/user-data';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { MessageAdd01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
	import { getPublicUrl, formatRelativeTime, formatValue } from '$lib/utils';
	import { tick } from 'svelte';

	type Embed = { type: 'coin' | 'user'; slug: string };

	const embedCache = new Map<string, Promise<any>>();

	const allowed = /https?:\/\/(rugplay\.com|rugplay\.daimy\.xyz|localhost:\d+)\/(coin|user)\/([^\s/?"#]+)/g;

	function stripEmbedLinks(text: string): string {
		return text.replace(allowed, '').trim();
	}

	function parseEmbeds(text: string): Embed[] {
		const results: Embed[] = [];
		allowed.lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = allowed.exec(text)) !== null) {
			results.push({ type: match[2] as 'coin' | 'user', slug: match[3] });
		}
		return results;
	}

	function getCoinData(symbol: string) {
		const key = `coin:${symbol}`;
		if (!embedCache.has(key)) {
			embedCache.set(
				key,
				fetch(`/api/coin/${symbol}`)
					.then((r) => (r.ok ? r.json().then((d) => d.coin) : null))
					.catch(() => null)
			);
		}
		return embedCache.get(key)!;
	}

	function getUserData(slug: string) {
		const key = `user:${slug}`;
		if (!embedCache.has(key)) {
			embedCache.set(
				key,
				fetch(`/api/user/${slug}`)
					.then((r) => (r.ok ? r.json().then((d) => d.profile) : null))
					.catch(() => null)
			);
		}
		return embedCache.get(key)!;
	}

	let open = $state(false);
	let inputText = $state('');
	let unread = $state(0);
	let messagesEl = $state<HTMLDivElement | null>(null);
	let knownLength = $state($chatMessagesStore.length);
	let panelWidth = $state(440);
	let panelHeight = $state(620);

	const max_length = 200;

	function playPing() {
		const ctx = new AudioContext();
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.frequency.value = 880;
		gain.gain.setValueAtTime(0.08, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
		osc.start(ctx.currentTime);
		osc.stop(ctx.currentTime + 0.25);
	}

	function isMention(text: string): boolean {
		const name = $USER_DATA?.name;
		if (!name) return false;
		return text.toLowerCase().includes('@' + name.toLowerCase());
	}

	$effect(() => {
		const msgs = $chatMessagesStore;
		if (msgs.length > 0) {
			const last = msgs[msgs.length - 1];
			if (isMention(last.text) && last.userId !== String($USER_DATA?.id)) {
				playPing();
			}
		}
	});

	let typingNames = $state<string[]>([]);

	$effect(() => {
		const interval = setInterval(() => {
			const now = Date.now();
			typingStore.update(map => {
				const next = new Map(map);
				for (const [name, ts] of next.entries()) {
					if (now - ts > 3000) next.delete(name);
				}
				return next;
			});
		}, 500);
		return () => clearInterval(interval);
	});

	$effect(() => {
		typingNames = Array.from($typingStore.keys()).filter(n => n !== $USER_DATA?.name);
	});

	const typingLabel = $derived(
		typingNames.length === 0 ? ''
		: typingNames.length === 1 ? `${typingNames[0]} is typing...`
		: typingNames.length === 2 ? `${typingNames[0]} and ${typingNames[1]} are typing...`
		: `${typingNames.length} people are typing...`
	);

	let typingTimer: ReturnType<typeof setTimeout> | null = null;

	type MentionUser = { id: number; name: string; username: string; image?: string | null };

	let mentionQuery = $state('');
	let mentionResults = $state<MentionUser[]>([]);
	let mentionIndex = $state(0);
	let mentionLoading = $state(false);
	let mentionDebounce: ReturnType<typeof setTimeout> | null = null;

	function localMentionMatches(query: string): MentionUser[] {
		const seen = new Set<string>();
		const results: MentionUser[] = [];
		const q = query.toLowerCase();
		for (const msg of $chatMessagesStore) {
			if (seen.has(msg.userId)) continue;
			if (msg.username.toLowerCase().startsWith(q)) {
				seen.add(msg.userId);
				results.push({
					id: Number(msg.userId),
					name: msg.username,
					username: msg.handle ?? msg.username,
					image: msg.userImage
				});
			}
		}
		return results.slice(0, 5);
	}

	async function fetchMentionUsers(query: string): Promise<MentionUser[]> {
		try {
			const r = await fetch(`/api/user/search?q=${encodeURIComponent(query)}&limit=5`);
			if (!r.ok) return [];
			const { users } = await r.json();
			return users;
		} catch {
			return [];
		}
	}

	function updateMentions(text: string) {
		const match = text.match(/@(\w*)$/);
		if (!match) {
			mentionQuery = '';
			mentionResults = [];
			if (mentionDebounce) clearTimeout(mentionDebounce);
			mentionLoading = false;
			return;
		}
		const query = match[1];
		mentionQuery = query;

		const local = localMentionMatches(query);
		mentionResults = local;
		mentionIndex = 0;

		if (mentionDebounce) clearTimeout(mentionDebounce);
		if (local.length < 3) {
			mentionLoading = true;
			mentionDebounce = setTimeout(async () => {
				const remote = await fetchMentionUsers(query);
				const localIds = new Set(local.map(u => u.id));
				const merged = [...local, ...remote.filter(u => !localIds.has(u.id))].slice(0, 5);
				mentionResults = merged;
				mentionLoading = false;
			}, 250);
		}
	}

	function selectMention(u: MentionUser) {
		if (mentionDebounce) clearTimeout(mentionDebounce);
		mentionLoading = false;
		inputText = inputText.replace(/@\w*$/, `@${u.username} `);
		mentionQuery = '';
		mentionResults = [];
		mentionIndex = 0;
	}

	function onInputTyping() {
		if (!typingTimer) sendTyping();
		if (typingTimer) clearTimeout(typingTimer);
		typingTimer = setTimeout(() => { typingTimer = null; }, 2000);
		updateMentions(inputText);
	}

	function startResize(e: MouseEvent) {
		e.preventDefault();
		const startX = e.clientX;
		const startY = e.clientY;
		const startW = panelWidth;
		const startH = panelHeight;

		function onMove(ev: MouseEvent) {
			panelWidth = Math.max(320, startW - (ev.clientX - startX));
			panelHeight = Math.max(320, startH - (ev.clientY - startY));
		}

		function onUp() {
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
		}

		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
	}

	$effect(() => {
		const current = $chatMessagesStore.length;
		if (current > knownLength && !open) {
			unread += current - knownLength;
		}
		knownLength = current;
	});

	$effect(() => {
		if (open) {
			unread = 0;
			tick().then(() => {
				if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
			});
		}
	});

	$effect(() => {
		$chatMessagesStore;
		if (open && messagesEl) {
			tick().then(() => {
				if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
			});
		}
	});

	function send() {
		const text = inputText.trim();
		if (!text || text.length > max_length) return;
		sendChatMessage(text);
		inputText = '';
	}

	function onKeydown(e: KeyboardEvent) {
		if (mentionResults.length > 0) {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				mentionIndex = (mentionIndex + 1) % mentionResults.length;
				return;
			}
			if (e.key === 'ArrowUp') {
				e.preventDefault();
				mentionIndex = (mentionIndex - 1 + mentionResults.length) % mentionResults.length;
				return;
			}
			if (e.key === 'Enter') {
				e.preventDefault();
				selectMention(mentionResults[mentionIndex]);
				return;
			}
			if (e.key === 'Escape') {
				mentionResults = [];
				mentionQuery = '';
				return;
			}
		}
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}
</script>

<div class="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
	{#if open}
		<div
			class="bg-background border relative flex flex-col overflow-hidden rounded-xl border-border shadow-xl"
			style="width: {panelWidth}px; height: {panelHeight}px;"
		>
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<div
				role="separator"
				aria-label="Resize chat"
				class="absolute left-0 top-0 z-10 h-5 w-5 cursor-nw-resize"
				onmousedown={startResize}
			>
				<svg width="10" height="10" viewBox="0 0 10 10" class="absolute left-1.5 top-1.5 opacity-30">
					<path d="M0 8 L8 0 M0 4 L4 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			</div>
			<div class="flex items-center justify-between border-b border-border px-4 py-3">
				<div class="flex items-center gap-2">
					<span class="text-sm font-semibold">Global Chat</span>
				</div>
				<button onclick={() => (open = false)} class="text-muted-foreground hover:text-foreground">
					<HugeiconsIcon icon={Cancel01Icon} size={16} />
				</button>
			</div>

			<div bind:this={messagesEl} class="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
				{#if $chatMessagesStore.length === 0}
					<p class="text-muted-foreground py-8 text-center text-xs">No messages yet. Say something!</p>
				{/if}
				{#each $chatMessagesStore as msg (msg.userId + msg.timestamp + msg.text)}
					<div class="flex gap-2 rounded-lg px-1 py-0.5 {isMention(msg.text) ? 'bg-yellow-500/10' : ''}">
						<a href="/user/{msg.userId}" class="shrink-0">
							<Avatar.Root class="h-8 w-8">
								{#if msg.userImage}
									<Avatar.Image src={getPublicUrl(msg.userImage)} alt={msg.username} />
								{/if}
								<Avatar.Fallback class="text-xs">{msg.username[0].toUpperCase()}</Avatar.Fallback>
							</Avatar.Root>
						</a>
						<div class="flex flex-col gap-0.5">
							<div class="flex items-baseline gap-1.5">
								<a href="/user/{msg.userId}" class="text-xs font-semibold hover:underline">{msg.username}</a>{#if msg.handle}<span class="text-muted-foreground text-[10px]">(@{msg.handle})</span>{/if}
								<span class="text-muted-foreground text-[10px]">{formatRelativeTime(new Date(msg.timestamp))}</span>
							</div>
							{#if stripEmbedLinks(msg.text)}<p class="text-sm break-words">{stripEmbedLinks(msg.text)}</p>{/if}
						{#each parseEmbeds(msg.text) as embed}
							{#if embed.type === 'coin'}
								{#await getCoinData(embed.slug)}
									<div class="bg-muted h-10 animate-pulse rounded-lg"></div>
								{:then coin}
									{#if coin}
										<div class="bg-muted flex items-center gap-3 rounded-xl px-4 py-3">
											{#if coin.icon}
												<img src={getPublicUrl(coin.icon)} alt={coin.name} class="h-10 w-10 shrink-0 rounded-full" />
											{/if}
											<div class="min-w-0 flex-1">
												<p class="truncate text-sm font-semibold">{coin.name}</p>
												<p class="text-muted-foreground text-xs">{formatValue(coin.currentPrice)} / coin</p>
											</div>
											<a href="/coin/{embed.slug}" class="bg-primary text-primary-foreground shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold">View</a>
										</div>
									{/if}
								{:catch}{/await}
							{:else}
								{#await getUserData(embed.slug)}
									<div class="bg-muted h-10 animate-pulse rounded-lg"></div>
								{:then user}
									{#if user}
										<div class="bg-muted flex items-center gap-3 rounded-xl px-4 py-3">
											<Avatar.Root class="h-10 w-10 shrink-0">
												{#if user.image}
													<Avatar.Image src={getPublicUrl(user.image)} alt={user.name} />
												{/if}
												<Avatar.Fallback class="text-sm">{user.name?.[0]?.toUpperCase() ?? '?'}</Avatar.Fallback>
											</Avatar.Root>
											<div class="min-w-0 flex-1">
												<p class="truncate text-sm font-semibold">{user.name}</p>
												<p class="text-muted-foreground text-xs">{formatValue(user.totalPortfolioValue)} total</p>
											</div>
											<a href="/user/{embed.slug}" class="bg-primary text-primary-foreground shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold">View</a>
										</div>
									{/if}
								{:catch}{/await}
							{/if}
						{/each}
						</div>
					</div>
				{/each}
			</div>

			<div class="border-t border-border p-3">
				{#if mentionResults.length > 0 || mentionLoading}
					<div class="bg-background border border-border mb-2 rounded-xl overflow-hidden shadow-lg">
						{#if mentionLoading && mentionResults.length === 0}
							<div class="bg-muted h-8 animate-pulse rounded-lg mx-2 my-1.5"></div>
							<div class="bg-muted h-8 animate-pulse rounded-lg mx-2 my-1.5"></div>
						{/if}
						{#each mentionResults as u, i (u.id)}
							<button
								type="button"
								onclick={() => selectMention(u)}
								class="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-muted {i === mentionIndex ? 'bg-muted' : ''}"
							>
								<Avatar.Root class="h-6 w-6 shrink-0">
									{#if u.image}
										<Avatar.Image src={getPublicUrl(u.image)} alt={u.name} />
									{/if}
									<Avatar.Fallback class="text-[10px]">{u.name[0]?.toUpperCase() ?? '?'}</Avatar.Fallback>
								</Avatar.Root>
								<span class="text-sm font-semibold">{u.name}</span>
								{#if u.username && u.username !== u.name}
									<span class="text-muted-foreground text-[11px]">@{u.username}</span>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
				{#if typingLabel}
					<p class="text-muted-foreground mb-1.5 text-[11px] italic">{typingLabel}</p>
				{/if}
				{#if $USER_DATA}
					<div class="flex gap-2">
						<div class="relative flex-1">
							<input
								type="text"
								bind:value={inputText}
								onkeydown={onKeydown}
								placeholder="Say something..."
								maxlength={max_length}
								oninput={onInputTyping}
								class="bg-muted w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
							/>
							{#if inputText.length > 160}
								<span class="text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 text-[10px]">
									{max_length - inputText.length}
								</span>
							{/if}
						</div>
						<Button size="sm" onclick={send} disabled={!inputText.trim()}>Send</Button>
					</div>
				{:else}
					<p class="text-muted-foreground text-center text-xs">Sign in to chat</p>
				{/if}
			</div>
		</div>
	{/if}

	<button
		onclick={() => (open = !open)}
		class="bg-primary text-primary-foreground relative flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105"
	>
		<HugeiconsIcon icon={MessageAdd01Icon} size={22} />
		{#if unread > 0 && !open}
			<span class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
				{unread > 9 ? '9+' : unread}
			</span>
		{/if}
	</button>
</div>