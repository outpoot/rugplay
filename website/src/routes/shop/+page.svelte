<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import SEO from '$lib/components/self/SEO.svelte';
	import { USER_DATA } from '$lib/stores/user-data';
	import { GEMS_BALANCE, fetchGemsBalance } from '$lib/stores/gems';
	import {
		GEM_PACKAGES,
		NAME_COLOR_CATALOG,
		CRATE_TIERS,
		RARITY_LABEL,
		RARITY_CLASS,
	} from '$lib/data/shop-catalog';
	import type { CrateTierId, CrateTier, Rarity, GemPackage } from '$lib/data/shop-catalog';
	import confetti from 'canvas-confetti';
	import { playSound, showConfetti, showSchoolPrideCannons } from '$lib/utils';
	import { volumeSettings } from '$lib/stores/volume-settings';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		GemIcon,
		ShoppingBasket01Icon,
		Loading02Icon,
		InformationCircleIcon,
	} from '@hugeicons/core-free-icons';
	import {
		PUBLIC_POLAR_PRODUCT_GEMS_500,
		PUBLIC_POLAR_PRODUCT_GEMS_1300,
		PUBLIC_POLAR_PRODUCT_GEMS_2800,
		PUBLIC_POLAR_PRODUCT_GEMS_8000,
	} from '$env/static/public';

	let PolarEmbedCheckout: any = null;

	const PRODUCT_ID_MAP: Record<string, string> = {
		PUBLIC_POLAR_PRODUCT_GEMS_500,
		PUBLIC_POLAR_PRODUCT_GEMS_1300,
		PUBLIC_POLAR_PRODUCT_GEMS_2800,
		PUBLIC_POLAR_PRODUCT_GEMS_8000,
	};

	let loadingPackage = $state<string | null>(null);
	let showSuccessModal = $state(false);

	let confirmTier = $state<CrateTierId | null>(null);

	let gemsNeededDialog = $state<{ tierId: CrateTierId; needed: number; pkg: GemPackage } | null>(null);

	// Per-crate state
	let activeLootbox = $state<CrateTierId | null>(null);
	let openingBox = $state(false);
	let lootboxResult = $state<any | null>(null);
	let lootboxPhase = $state<'idle' | 'opening' | 'cycling' | 'reveal'>('idle');
	let spotlightColor = $state<string>('');

	// Cycling state
	interface CycleItem { label: string; classes: string; style?: string; }
	let cycleItems = $state<CycleItem[]>([]);
	let cycleIndex = $state(0);
	let cycleTimers: ReturnType<typeof setTimeout>[] = [];
	let shaking = $state(false);
	let spotlightIntensity = $state(0);
	let revealTriggered = $state(false);

	const RARITY_RAY_COLOR: Record<string, string> = {
		uncommon: '#10b981',
		rare: '#3b82f6',
		epic: '#a855f7',
		legendary: '#eab308',
	};

	// Inventory state
	let ownedColors = $state<string[]>([]);
	let equippedColor = $state<string | null>(null);

	const CRATE_LIST: CrateTier[] = [
		CRATE_TIERS.standard,
		CRATE_TIERS.premium,
		CRATE_TIERS.legendary,
		CRATE_TIERS.mythic,
	];
	let cycleBackground: HTMLAudioElement | null = null;

	onMount(async () => {
		volumeSettings.load();
		const mod = await import('@polar-sh/checkout/embed');
		PolarEmbedCheckout = mod.PolarEmbedCheckout;
		PolarEmbedCheckout.init();

		const params = new URLSearchParams(window.location.search);
		if (params.get('success') === 'true') {
			showSuccessModal = true;
			window.history.replaceState({}, '', '/shop');
		}

		if ($USER_DATA) {
			await loadInventory();
		}
	});

	async function loadInventory() {
		const res = await fetch('/api/shop/inventory');
		if (res.ok) {
			const data = await res.json();
			ownedColors = data.nameColors ?? [];
			GEMS_BALANCE.set(data.gems ?? 0);
			equippedColor = $USER_DATA?.nameColor ?? null;
		}
	}

	async function handlePurchaseGems(pkg: (typeof GEM_PACKAGES)[0]) {
		if (!$USER_DATA) { goto('/'); return; }
		if (!PolarEmbedCheckout) { toast.error('Checkout not ready, please wait.'); return; }

		const productId = PRODUCT_ID_MAP[pkg.productEnvKey];
		if (!productId) {
			toast.error('Product not configured. Please try again later.');
			return;
		}

		loadingPackage = pkg.id;
		try {
			const checkoutUrl = `${window.location.origin}/api/checkout/polar?products=${encodeURIComponent(productId)}`;
			const checkout = await PolarEmbedCheckout.create(checkoutUrl, { theme: 'dark' });
			checkout.addEventListener('success', () => {
				loadingPackage = null;
				showSuccessModal = true;
				setTimeout(() => fetchGemsBalance(), 3000);
			});
			checkout.addEventListener('close', () => { loadingPackage = null; });
		} catch (e) {
			console.error('Checkout error:', e);
			toast.error('Failed to open checkout');
			loadingPackage = null;
		}
	}

	async function handleEquipColor(key: string | null) {
		const res = await fetch('/api/shop/equip', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ itemType: 'namecolor', itemKey: key }),
		});
		if (res.ok) {
			equippedColor = key;
			toast.success(key ? 'Color equipped!' : 'Color unequipped');
		} else {
			const data = await res.json();
			toast.error(data.error ?? 'Failed to equip');
		}
	}

	function requestOpenLootbox(tierId: CrateTierId) {
		if (openingBox) return;
		if (!$USER_DATA) { goto('/'); return; }
		const tier = CRATE_TIERS[tierId];
		const balance = $GEMS_BALANCE ?? 0;
		if (balance < tier.cost) {
			const needed = tier.cost - balance;
			const pkg = GEM_PACKAGES.find(p => p.gems >= needed) ?? GEM_PACKAGES[GEM_PACKAGES.length - 1];
			gemsNeededDialog = { tierId, needed, pkg };
			return;
		}
		confirmTier = tierId;
	}

	type DescriptionPart = { text: string; rarity?: Rarity };
	function parseDescription(text: string): DescriptionPart[] {
		const pattern = /\b(uncommon|rare|epic|legendary)\b/gi;
		const parts: DescriptionPart[] = [];
		let lastIndex = 0;
		let m: RegExpExecArray | null;
		while ((m = pattern.exec(text)) !== null) {
			if (m.index > lastIndex) parts.push({ text: text.slice(lastIndex, m.index) });
			parts.push({ text: m[0], rarity: m[0].toLowerCase() as Rarity });
			lastIndex = pattern.lastIndex;
		}
		if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex) });
		return parts;
	}

	function playSoundWithPitch(sound: string, pitch: number = 1.0) {
		try {
			const settings = get(volumeSettings);
			if (settings.muted) return;
			const audio = new Audio(`/sound/${sound}.mp3`);
			audio.volume = Math.max(0, Math.min(1, settings.master));
			audio.playbackRate = pitch;
			audio.play().catch(console.error);
		} catch (e) {
			console.error(e);
		}
	}

	function startCyclingBackground() {
		stopCyclingBackground();
		try {
			const settings = get(volumeSettings);
			if (settings.muted) return;
			const audio = new Audio('/sound/background.mp3');
			audio.volume = Math.max(0, Math.min(1, settings.master)) * 0.55;
			audio.loop = true;
			audio.play().catch(console.error);
			cycleBackground = audio;
		} catch (e) {
			console.error(e);
		}
	}

	function stopCyclingBackground() {
		if (cycleBackground) {
			cycleBackground.pause();
			cycleBackground = null;
		}
	}

	function confirmAndOpen() {
		if (!confirmTier) return;
		const tierId = confirmTier;
		confirmTier = null;
		handleOpenLootbox(tierId);
	}

	function generateCyclePool(tier: CrateTier): CycleItem[] {
		const pool: CycleItem[] = [];
		for (const reward of tier.rewards) {
			if (reward.type === 'buss') {
				for (let i = 0; i < 2; i++) {
					const amt = Math.floor(Math.random() * (reward.max - reward.min) + reward.min);
					pool.push({ label: `$${amt.toLocaleString()}`, classes: 'text-green-500' });
				}
			} else if (reward.rarity) {
				for (const color of NAME_COLOR_CATALOG.filter(c => c.rarity === reward.rarity)) {
					pool.push({ label: color.label, classes: color.classes, style: color.style });
				}
			}
		}
		return pool;
	}

	function rewardToCycleItem(reward: any): CycleItem {
		if (reward.type === 'buss') {
			return { label: `$${reward.bussAmount.toFixed(2)}`, classes: 'text-green-500' };
		}
		const c = reward.colorKey ? NAME_COLOR_CATALOG.find(x => x.key === reward.colorKey) : null;
		if (c) return { label: c.label, classes: c.classes, style: c.style };
		return { label: `$${(reward.bussAmount ?? 0).toFixed(2)}`, classes: 'text-green-500' };
	}

	function shuffleArray<T>(arr: T[]): T[] {
		const a = [...arr];
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	const RARITY_ORDER: Rarity[] = ['uncommon', 'rare', 'epic', 'legendary'];
	const CYCLE_TICK_MS = 100;
	const CYCLE_TICKS_PER_STAGE = 14; // ~1.4s per stage
	const CYCLE_PITCHES = [1.0, 1.15, 1.3, 1.5, 1.75];

	function getRarityStagePool(rarityIdx: number): CycleItem[] {
		return NAME_COLOR_CATALOG
			.filter(c => c.rarity === RARITY_ORDER[rarityIdx])
			.map(c => ({ label: c.label, classes: c.classes, style: c.style }));
	}

	function startCycling(tier: CrateTier, reward: any) {
		const resultRarity: Rarity | null = reward.colorRarity ?? null;
		const resultRarityIdx = resultRarity ? RARITY_ORDER.indexOf(resultRarity) : -1;

		// build the list of rarity stages the animation escalates through
		const stageRarities: Rarity[] = [];
		if (resultRarityIdx >= 0) {
			const startIdx = Math.min(resultRarityIdx, 1);
			for (let r = startIdx; r <= resultRarityIdx; r++) {
				stageRarities.push(RARITY_ORDER[r]);
			}
		}
		const numStages = 1 + stageRarities.length;

		const allPool = shuffleArray(generateCyclePool(tier));
		const stagePools: CycleItem[][] = [allPool];
		for (const rarity of stageRarities) {
			stagePools.push(shuffleArray(getRarityStagePool(RARITY_ORDER.indexOf(rarity))));
		}

		const flatItems: CycleItem[] = [];
		for (let s = 0; s < numStages; s++) {
			const pool = stagePools[s];
			for (let t = 0; t < CYCLE_TICKS_PER_STAGE; t++) {
				flatItems.push(pool[t % pool.length]);
			}
		}

		cycleItems = flatItems;
		cycleIndex = 0;
		lootboxPhase = 'cycling';
		spotlightColor = RARITY_RAY_COLOR['uncommon'];
		spotlightIntensity = 0;
		revealTriggered = false;

		startCyclingBackground();

		for (let i = 0; i < flatItems.length; i++) {
			const idx = i;
			cycleTimers.push(setTimeout(() => { cycleIndex = idx; }, idx * CYCLE_TICK_MS));
		}

		for (let s = 1; s < numStages; s++) {
			const rarity = stageRarities[s - 1];
			const pitch = CYCLE_PITCHES[s] ?? 1.75;
			const t = s * CYCLE_TICKS_PER_STAGE * CYCLE_TICK_MS;
			const intensity = s;
			cycleTimers.push(setTimeout(() => {
				spotlightColor = RARITY_RAY_COLOR[rarity] ?? tier.accent;
				spotlightIntensity = intensity;
				playSoundWithPitch('flip', pitch);
				playSoundWithPitch('click', pitch);
				shaking = true;
				setTimeout(() => { shaking = false; }, 300);
			}, t));
		}

		const totalMs = flatItems.length * CYCLE_TICK_MS;
		cycleTimers.push(setTimeout(() => {
			if (revealTriggered) return;
			revealTriggered = true;
			stopCyclingBackground();
			const rewardItem = rewardToCycleItem(reward);
			cycleItems = [rewardItem];
			cycleIndex = 0;
			spotlightColor = resultRarity ? (RARITY_RAY_COLOR[resultRarity] ?? tier.accent) : '#22c55e';
			spotlightIntensity = numStages;
			playSoundWithPitch('chest_end', 1.0);
			setTimeout(() => triggerReveal(), 600);
		}, totalMs));
	}

	function skipToReveal() {
		if (lootboxPhase !== 'cycling' || revealTriggered) return;
		revealTriggered = true;
		for (const t of cycleTimers) clearTimeout(t);
		cycleTimers = [];
		stopCyclingBackground();
		if (lootboxResult) {
			const rarity: Rarity | null = lootboxResult.colorRarity ?? null;
			const tier = activeLootbox ? CRATE_TIERS[activeLootbox] : null;
			const rewardItem = rewardToCycleItem(lootboxResult);
			cycleItems = [rewardItem];
			cycleIndex = 0;
			spotlightColor = rarity ? (RARITY_RAY_COLOR[rarity] ?? tier?.accent ?? '#fff') : '#22c55e';
			const rarityIdx = rarity ? RARITY_ORDER.indexOf(rarity) : -1;
			const stageCount = rarityIdx >= 0 ? 1 + (rarityIdx - Math.min(rarityIdx, 1) + 1) : 1;
			spotlightIntensity = stageCount;
		}
		playSoundWithPitch('chest_end', 1.0);
		setTimeout(() => triggerReveal(), 300);
	}

	function triggerReveal() {
		lootboxPhase = 'reveal';
		const rarity = lootboxResult?.colorRarity;
		if (rarity === 'legendary') {
			showSchoolPrideCannons(confetti);
			showConfetti(confetti);
		} else if (rarity === 'epic') {
			showConfetti(confetti);
		}
	}

	async function handleOpenLootbox(tierId: CrateTierId) {
		if (openingBox) return;
		const tier = CRATE_TIERS[tierId];

		activeLootbox = tierId;
		openingBox = true;
		lootboxPhase = 'opening';
		playSound('chest');

		const fetchPromise = fetch('/api/shop/crate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ tier: tierId }),
		});

		await new Promise(r => setTimeout(r, 1200));

		const res = await fetchPromise;
		const data = await res.json();

		if (res.ok) {
			lootboxResult = data.reward;
			GEMS_BALANCE.set(data.newGems);
			if (data.reward.type === 'color' && data.reward.colorKey) {
				ownedColors = [...ownedColors, data.reward.colorKey];
			}

			spotlightColor = tier.accent;
			startCycling(tier, data.reward);
		} else {
			toast.error(data.error ?? 'Failed to open lootbox');
			lootboxPhase = 'idle';
		}
		openingBox = false;
	}

	function resetLootbox() {
		for (const t of cycleTimers) clearTimeout(t);
		cycleTimers = [];
		stopCyclingBackground();
		cycleItems = [];
		cycleIndex = 0;
		lootboxResult = null;
		spotlightColor = '';
		spotlightIntensity = 0;
		shaking = false;
		revealTriggered = false;
		lootboxPhase = 'idle';
		activeLootbox = null;
	}
</script>

<SEO
	title="Shop - Rugplay"
	description="Buy Gems to unlock name colors and cosmetics in Rugplay. Open crates for random rewards."
	keywords="rugplay shop, gems, name colors, cosmetics, crates"
/>

<!-- Success modal -->
{#if showSuccessModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
		<Card.Root class="w-full max-w-md">
			<Card.Header class="text-center">
				<div class="mb-3 flex justify-center">
					<HugeiconsIcon icon={GemIcon} size={56} color="#ca00ff" strokeWidth={1.5} />
				</div>
				<Card.Title class="text-2xl">Thanks for the purchase!</Card.Title>
				<Card.Description>Your Gems will appear in your balance shortly.</Card.Description>
			</Card.Header>
			<Card.Footer class="flex gap-3">
				<Button variant="outline" class="flex-1" onclick={() => (showSuccessModal = false)}>
					Continue
				</Button>
			</Card.Footer>
		</Card.Root>
	</div>
{/if}

<!-- Not enough gems dialog -->
{#if gemsNeededDialog}
	{@const { needed, pkg } = gemsNeededDialog}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
		<Card.Root class="w-full max-w-sm text-center">
			<Card.Header>
				<div class="mb-2 flex justify-center">
					<HugeiconsIcon icon={GemIcon} size={40} color="#ca00ff" strokeWidth={1.5} />
				</div>
				<Card.Title class="text-lg">Not enough Gems</Card.Title>
				<Card.Description class="mt-1">
					You need
					<span class="font-bold" style="color: #ca00ff">{needed.toLocaleString()}</span>
					more Gems to open this crate.
				</Card.Description>
			</Card.Header>
			<Card.Content class="pb-2">
				<p class="text-muted-foreground text-sm">
					Purchase the
					<span class="text-foreground font-semibold">{pkg.gems.toLocaleString()} Gems</span>
					pack for
					<span class="text-foreground font-semibold">${pkg.price.toFixed(2)}</span>?
				</p>
			</Card.Content>
			<Card.Footer class="flex gap-3">
				<Button
					variant="outline"
					class="flex-1"
					onclick={() => (gemsNeededDialog = null)}
				>
					No, thanks
				</Button>
				<Button
					class="flex-1"
					onclick={() => { handlePurchaseGems(pkg); gemsNeededDialog = null; }}
					disabled={loadingPackage !== null}
				>
					{#if loadingPackage}
						<HugeiconsIcon icon={Loading02Icon} class="animate-spin" size={16} />
					{:else}
						Yes, purchase
					{/if}
				</Button>
			</Card.Footer>
		</Card.Root>
	</div>
{/if}

<!-- Purchase confirmation -->
{#if confirmTier}
	{@const tier = CRATE_TIERS[confirmTier]}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
		<Card.Root class="w-full max-w-xs text-center">
			<Card.Header>
				<div class="mx-auto">
					<div
						class="chest-sprite chest-idle mx-auto"
						style="background-image: url('{tier.sprite.idle}');"
					></div>
				</div>
				<Card.Title class="text-lg">Open {tier.label}?</Card.Title>
				<Card.Description>
					<span class="flex items-center justify-center gap-1.5">
						This will cost
						<HugeiconsIcon icon={GemIcon} size={14} color="#ca00ff" strokeWidth={2} />
						<span class="font-mono font-bold" style="color: #ca00ff">{tier.cost}</span>
						Gems
					</span>
				</Card.Description>
			</Card.Header>
			<Card.Footer class="flex gap-3">
				<Button variant="outline" class="flex-1" onclick={() => (confirmTier = null)}>
					Cancel
				</Button>
				<Button class="flex-1" onclick={confirmAndOpen}>
					Open
				</Button>
			</Card.Footer>
		</Card.Root>
	</div>
{/if}

<!-- Crate opening overlay -->
{#if activeLootbox}
	{@const tier = CRATE_TIERS[activeLootbox]}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
		<Card.Root class="w-full max-w-sm text-center overflow-hidden {shaking ? 'crate-shake' : ''}">
			<Card.Header>
				<Card.Title class="text-xl">{tier.label}</Card.Title>
			</Card.Header>
			<Card.Content>
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div onclick={skipToReveal} class={lootboxPhase === 'cycling' ? 'cursor-pointer' : ''}>
					<div class="lootbox-stage">
						{#if lootboxPhase === 'cycling' || lootboxPhase === 'reveal'}
							<!-- Spotlight glow background -->
							<div
								class="spotlight"
								style="--spotlight-color: {spotlightColor}; --spotlight-scale: {1 + spotlightIntensity * 0.6}; --spotlight-opacity: {Math.round((0.4 + spotlightIntensity * 0.15) * 100)}%;"
							></div>
							<!-- Content layer on top -->
							<div class="lootbox-content">
								{#if lootboxPhase === 'reveal' && lootboxResult}
									{@const colorItem = lootboxResult.colorKey
										? NAME_COLOR_CATALOG.find(c => c.key === lootboxResult.colorKey)
										: null}
									<div class="reveal-item flex flex-col items-center gap-2">
										{#if lootboxResult.type === 'buss'}
											<div class="rounded-lg bg-black/40 px-5 py-3">
												<p class="text-4xl font-bold text-green-500">+${lootboxResult.bussAmount.toFixed(2)}</p>
											</div>
										{:else if colorItem}
											<div class="rounded-lg bg-black/40 px-5 py-3">
												<p class="text-4xl font-bold {colorItem.classes}" style={colorItem.style ?? ''}>
													{lootboxResult.colorLabel ?? lootboxResult.colorKey}
												</p>
											</div>
											<p class="text-sm capitalize {lootboxResult.colorRarity === 'legendary' ? 'text-black dark:text-black font-semibold' : 'text-muted-foreground'}">{lootboxResult.colorRarity} name color</p>
											{#if lootboxResult.bussAmount > 0}
												<p class="text-sm text-green-500">+${lootboxResult.bussAmount.toFixed(2)}</p>
											{/if}
										{:else}
											<div class="rounded-lg bg-black/40 px-5 py-3">
												<p class="text-4xl font-bold text-green-500">+${(lootboxResult.bussAmount ?? 0).toFixed(2)}</p>
											</div>
										{/if}
									</div>
								{:else if lootboxPhase === 'cycling' && cycleItems.length > 0}
									{#key cycleIndex}
										{@const item = cycleItems[cycleIndex]}
										<div class="cycle-item flex flex-col items-center gap-1">
											<div class="rounded-lg bg-black/30 px-4 py-2">
												<p class="text-4xl font-bold {item.classes}" style={item.style ?? ''}>{item.label}</p>
											</div>
										</div>
									{/key}
								{/if}
							</div>
						{:else if lootboxPhase === 'opening'}
							<div
								class="chest-sprite chest-open lootbox-opening"
								style="background-image: url('{tier.sprite.open}');"
							></div>
						{:else}
							<div
								class="chest-sprite chest-idle"
								style="background-image: url('{tier.sprite.idle}');"
							></div>
						{/if}
					</div>
					{#if lootboxPhase === 'cycling'}
						<p class="text-muted-foreground mt-2 animate-pulse text-xs">Click to skip</p>
					{/if}
				</div>
			</Card.Content>
			<Card.Footer class="flex justify-center gap-3">
				{#if lootboxPhase === 'reveal'}
					<Button variant="outline" onclick={resetLootbox}>Close</Button>
				{/if}
			</Card.Footer>
		</Card.Root>
	</div>
{/if}

<div class="container mx-auto max-w-5xl space-y-14">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="flex items-center gap-2 text-2xl font-bold">
				<HugeiconsIcon icon={ShoppingBasket01Icon} class="h-7 w-7" />
				Shop
			</h1>
			<p class="text-muted-foreground mt-1 text-sm">Unlock cosmetics with Gems</p>
		</div>
		<div class="flex items-center gap-2 rounded-lg border px-4 py-2">
			<HugeiconsIcon icon={GemIcon} size={20} color="#ca00ff" strokeWidth={2} />
			<span class="font-mono font-bold">
				{$GEMS_BALANCE !== null ? $GEMS_BALANCE.toLocaleString() : '—'}
			</span>
			<span class="text-muted-foreground text-sm">Gems</span>
		</div>
	</div>

	<!-- Crates -->
	<section>
		<div class="mb-5">
			<h2 class="text-xl font-bold">Crates</h2>
			<p class="text-muted-foreground text-sm">Open crates to win name colors and bonuses</p>
		</div>
		{#if !$USER_DATA}
			<div class="py-16 text-center">
				<p class="text-muted-foreground mb-4">Sign in to open crates.</p>
				<Button onclick={() => goto('/')}>Sign In</Button>
			</div>
		{:else}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{#each CRATE_LIST as tier}
				<button
					class="lootbox-card group relative flex flex-col items-center rounded-xl border text-left transition-all
						{!openingBox ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}"
					style="--accent: {tier.accent}; border-color: color-mix(in srgb, {tier.accent} 40%, transparent);"
					disabled={openingBox}
						onclick={() => requestOpenLootbox(tier.id)}
					>
						<!-- Accent glow -->
						<div class="pointer-events-none absolute inset-0 rounded-xl opacity-60 transition-opacity group-hover:opacity-100" style="background: radial-gradient(ellipse at 50% 0%, color-mix(in srgb, {tier.accent} 15%, transparent), transparent 70%);"></div>

						<!-- Top content -->
						<div class="relative z-10 flex flex-1 flex-col items-center p-5 pb-3">
							<!-- Chest sprite -->
							<div
								class="chest-sprite chest-idle-card"
								style="background-image: url('{tier.sprite.idle}');"
							></div>

							<div class="mt-2 flex flex-col items-center gap-1.5">
								<h3 class="text-base font-bold" style="color: {tier.accent}">{tier.label}</h3>
								<p class="text-muted-foreground text-center text-xs leading-tight">{#each parseDescription(tier.description) as part}{#if part.rarity}<span class={RARITY_CLASS[part.rarity]}>{part.text}</span>{:else}{part.text}{/if}{/each}</p>
							</div>
						</div>

						<!-- Price footer -->
						<div class="relative z-10 flex w-full items-center justify-center gap-1.5 rounded-b-xl border-t py-2.5 bg-input/30">
							<HugeiconsIcon icon={GemIcon} size={14} color="#ca00ff" strokeWidth={2} />
							<span class="font-mono text-lg font-bold" style="color: #ca00ff">{tier.cost}</span>
							<Tooltip.Root>
								<Tooltip.Trigger>
									<HugeiconsIcon icon={InformationCircleIcon} class="text-muted-foreground h-3.5 w-3.5 cursor-help" />
								</Tooltip.Trigger>
								<Tooltip.Content class="max-w-xs bg-popover text-popover-foreground border shadow-md" arrowClasses="bg-popover">
									<div class="space-y-1 text-xs">
										{#each tier.rewards as reward}
											<div class="flex justify-between gap-4">
												<span class="{reward.rarity ? RARITY_CLASS[reward.rarity] : 'text-muted-foreground'}">{reward.label}</span>
												<span class="font-mono">{reward.weight}%</span>
											</div>
										{/each}
										<div class="text-muted-foreground border-t pt-1">Duplicate colors award Rugplay money instead.</div>
									</div>
								</Tooltip.Content>
							</Tooltip.Root>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Get Gems -->
	<section>
		<div class="mb-5">
			<h2 class="text-xl font-bold">Get Gems</h2>
			<p class="text-muted-foreground text-sm">Purchase Gems to spend in the shop</p>
		</div>
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{#each GEM_PACKAGES as pkg}
				{@const isFeatured = pkg.id === 'whale'}
				{@const isMostPopular = pkg.id === 'builder'}
				{@const isDisabled = !$USER_DATA || loadingPackage === pkg.id}
				<div class="relative pt-3">
					{#if isFeatured}
						<div class="absolute -top-0 left-1/2 z-20 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-bold" style="background: #ca00ff; color: white;">
							Best Value
						</div>
					{/if}
					{#if isMostPopular}
						<div class="absolute -top-0 left-1/2 z-20 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-bold" style="background: #0ea5e9; color: white;">
							Most Popular
						</div>
					{/if}
				<button
					class="gem-card group relative flex w-full flex-col items-center rounded-xl border text-left transition-all h-full
						{isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
						{isFeatured ? 'ring-1 ring-[#ca00ff]/40' : isMostPopular ? 'ring-1 ring-sky-500/40' : ''}"
					style="--accent: #ca00ff; border-color: color-mix(in srgb, #ca00ff 30%, transparent);"
					disabled={isDisabled}
					onclick={() => $USER_DATA ? handlePurchaseGems(pkg) : goto('/')}
				>
					<div class="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity group-hover:opacity-100" style="background: radial-gradient(ellipse at 50% 0%, color-mix(in srgb, #ca00ff 12%, transparent), transparent 70%);"></div>
					<div class="relative z-10 flex flex-col items-center flex-1 p-5 pb-3">
						{#if loadingPackage === pkg.id}
							<HugeiconsIcon icon={Loading02Icon} size={40} class="animate-spin" color="#ca00ff" />
						{:else}
							<HugeiconsIcon icon={GemIcon} size={40} color="#ca00ff" strokeWidth={1.5} />
						{/if}
						<div class="mt-2 flex flex-col items-center gap-0.5">
							<span class="text-2xl font-bold">{pkg.gems.toLocaleString()}</span>
							{#if pkg.bonusPct > 0}
								<Badge variant="secondary" class="mt-1 text-xs">+{pkg.bonusPct}% bonus</Badge>
							{/if}
						</div>
					</div>
					<div class="relative z-10 flex w-full items-center justify-center rounded-b-xl border-t py-2.5 bg-input/30">
						<span class="font-mono text-lg font-semibold">${pkg.price.toFixed(2)}</span>
					</div>
				</button>
				</div>
			{/each}
		</div>
		<p class="text-muted-foreground mt-6 text-center text-xs">
			Gems have no real-world monetary value and are non-refundable. Purchases are for cosmetic items only.
		</p>
	</section>

	<!-- Inventory -->
	<section>
		<div class="mb-5">
			<h2 class="text-xl font-bold">Inventory</h2>
			<p class="text-muted-foreground text-sm">All unlockable name colors</p>
		</div>
		{#if $USER_DATA && equippedColor}
			<div class="mb-4 flex items-center justify-between rounded-lg border px-4 py-3">
				<span class="text-sm">Currently equipped: <strong>{NAME_COLOR_CATALOG.find(c => c.key === equippedColor)?.label ?? equippedColor}</strong></span>
				<Button variant="outline" size="sm" onclick={() => handleEquipColor(null)}>Unequip</Button>
			</div>
		{/if}
		<Card.Root>
			<Card.Content class="p-6">
				{#each (['uncommon', 'rare', 'epic', 'legendary'] as const) as rarity, i}
					{@const rarityColors = NAME_COLOR_CATALOG.filter(c => c.rarity === rarity)}
					{#if i > 0}
						<div class="my-4 border-t"></div>
					{/if}
					<h3 class="mb-3 text-sm font-semibold" style="color: {RARITY_RAY_COLOR[rarity] ?? ''}">{RARITY_LABEL[rarity]}</h3>
					<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
						{#each rarityColors as color}
							{@const owned = ownedColors.includes(color.key)}
							{@const equipped = equippedColor === color.key}
							<div class="flex items-center justify-between rounded-lg border px-4 py-3 transition-opacity
								{owned ? '' : 'opacity-40'}
								{equipped ? 'border-primary' : ''}">
								<span class="{color.classes} font-semibold" style={color.style ?? ''}>{color.label}</span>
								{#if owned && $USER_DATA}
									<Button variant={equipped ? 'default' : 'outline'} size="sm" onclick={() => handleEquipColor(equipped ? null : color.key)}>
										{equipped ? 'Equipped ✓' : 'Equip'}
									</Button>
								{:else}
									<span class="text-muted-foreground text-xs">Locked</span>
								{/if}
							</div>
						{/each}
					</div>
				{/each}
			</Card.Content>
		</Card.Root>
	</section>
</div>

<style>
	/* Sprite frames: 5 frames, each 256×128 in a 1280×128 strip */
	.chest-sprite {
		width: 256px;
		height: 128px;
		background-size: 1280px 128px;
		background-repeat: no-repeat;
		image-rendering: pixelated;
	}

	/* Card-size sprites (50% scale) */
	.chest-idle-card {
		width: 128px;
		height: 64px;
		background-size: 640px 64px;
	}

	/* Idle: loop through 5 frames */
	.chest-idle, .chest-idle-card {
		animation: sprite-idle 0.8s steps(5) infinite;
	}
	@keyframes sprite-idle {
		from { background-position: 0 0; }
		to { background-position: -1280px 0; }
	}
	.chest-idle-card {
		animation-name: sprite-idle-card;
	}
	@keyframes sprite-idle-card {
		from { background-position: 0 0; }
		to { background-position: -640px 0; }
	}

	/* Open: play once then hold last frame */
	.chest-open {
		animation: sprite-open 1.2s steps(5) forwards;
	}
	@keyframes sprite-open {
		from { background-position: 0 0; }
		to { background-position: -1280px 0; }
	}

	.lootbox-stage {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 200px;
		overflow: visible;
	}

	.lootbox-content {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}

	@keyframes lootbox-opening-shake {
		0%   { transform: scale(1) rotate(0deg); opacity: 1; }
		15%  { transform: scale(1.1) rotate(-8deg); opacity: 1; }
		30%  { transform: scale(1.15) rotate(8deg); opacity: 1; }
		45%  { transform: scale(1.2) rotate(-10deg); opacity: 1; }
		60%  { transform: scale(1.25) rotate(10deg); opacity: 1; }
		75%  { transform: scale(1.2) rotate(-5deg); opacity: 0.8; }
		90%  { transform: scale(1.1) rotate(3deg); opacity: 0.5; }
		100% { transform: scale(0) rotate(0deg); opacity: 0; }
	}
	.lootbox-opening {
		animation: sprite-open 1.2s steps(5) forwards, lootbox-opening-shake 1.2s ease-in-out forwards;
	}

	.spotlight {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 300px;
		height: 300px;
		margin-left: -150px;
		margin-top: -150px;
		border-radius: 50%;
		background: radial-gradient(circle, color-mix(in srgb, var(--spotlight-color, #fff) var(--spotlight-opacity, 40%), transparent) 0%, transparent 70%);
		scale: var(--spotlight-scale, 1);
		transition: scale 0.4s ease-out, background 0.4s ease-out;
		animation: spotlight-enter 0.6s ease-out forwards;
		pointer-events: none;
		z-index: 0;
	}
	@keyframes spotlight-enter {
		0%   { scale: 0; opacity: 0; }
		100% { scale: var(--spotlight-scale, 1); opacity: 1; }
	}

	.cycle-item {
		animation: cycle-pop 0.1s ease-out both;
		z-index: 10;
		position: relative;
	}
	@keyframes cycle-pop {
		0%   { transform: scale(0.7); opacity: 0.3; }
		100% { transform: scale(1); opacity: 1; }
	}

	@keyframes reveal-pop {
		0%   { transform: scale(0) rotate(-12deg); opacity: 0; }
		55%  { transform: scale(1.18) rotate(3deg); opacity: 1; }
		75%  { transform: scale(0.94) rotate(-1deg); }
		100% { transform: scale(1) rotate(0deg); opacity: 1; }
	}
	.reveal-item {
		animation: reveal-pop 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) both;
		z-index: 10;
		position: relative;
	}

	.lootbox-card, .gem-card {
		background: hsl(var(--card));
		overflow: hidden;
		transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
	}
	.lootbox-card:not(:disabled):hover, .gem-card:not(:disabled):hover {
		transform: translateY(-3px);
		box-shadow: 0 8px 24px color-mix(in srgb, var(--accent) 25%, transparent);
		border-color: var(--accent);
	}
	.lootbox-card:not(:disabled):active, .gem-card:not(:disabled):active {
		transform: translateY(0);
	}

	@keyframes crate-shake-anim {
		0%, 100% { transform: translateX(0) translateY(0); }
		10% { transform: translateX(-3px) translateY(1px); }
		20% { transform: translateX(3px) translateY(-1px); }
		30% { transform: translateX(-2px) translateY(2px); }
		40% { transform: translateX(2px) translateY(-2px); }
		50% { transform: translateX(-1px) translateY(1px); }
		60% { transform: translateX(1px) translateY(-1px); }
		70% { transform: translateX(-2px) translateY(0); }
		80% { transform: translateX(2px) translateY(1px); }
		90% { transform: translateX(-1px) translateY(-1px); }
	}
	:global(.crate-shake) {
		animation: crate-shake-anim 0.3s ease-in-out;
	}
</style>
