<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import confetti from 'canvas-confetti';
	import { toast } from 'svelte-sonner';
	import { formatValue, playSound, showConfetti } from '$lib/utils';
	import { volumeSettings } from '$lib/stores/volume-settings';
	import { onMount } from 'svelte';
	import { fetchPortfolioSummary } from '$lib/stores/portfolio-data';
	import { haptic } from '$lib/stores/haptics';

	interface HandState {
		cards: string[];
		bet: number;
		status: 'active' | 'standing' | 'bust' | 'won' | 'lost' | 'push' | 'blackjack';
		doubled: boolean;
		value: number;
	}

	interface GameState {
		sessionToken: string;
		status: 'active' | 'insurance_pending' | 'done';
		playerHands: HandState[];
		dealerHand: string[];
		dealerValue: number | null;
		currentHandIndex: number;
		betAmount: number;
		insuranceBet: number;
		newBalance?: number;
		requiresInsurance?: boolean;
	}

	let {
		balance = $bindable(),
		onBalanceUpdate
	}: {
		balance: number;
		onBalanceUpdate?: (newBalance: number) => void;
	} = $props();

	let betAmount = $state(10);
	let betAmountDisplay = $state('10');
	let gameState = $state<GameState | null>(null);
	let isLoading = $state(false);
	const maxBetAmount = 100000;

	let currentHand = $derived(
		gameState ? gameState.playerHands[gameState.currentHandIndex] ?? null : null
	);
	let canHit = $derived(
		gameState?.status === 'active' && currentHand?.status === 'active' && !isLoading
	);
	let canStand = $derived(canHit);
	let canDouble = $derived(canHit && currentHand?.cards.length === 2 && currentHand.bet <= balance);
	let canSplit = $derived(
		canHit &&
			currentHand?.cards.length === 2 &&
			(gameState?.playerHands.length ?? 0) < 2 &&
			currentHand !== null &&
			currentHand.cards[0].slice(0, -1) === currentHand.cards[1].slice(0, -1) &&
			currentHand.bet <= balance
	);
	let canDeal = $derived(
		!gameState && betAmount > 0 && betAmount <= balance && betAmount <= maxBetAmount && !isLoading
	);

	function getCardDisplay(card: string): { rank: string; suit: string; isRed: boolean } {
		if (card === '??') return { rank: '?', suit: '', isRed: false };
		const suit = card.slice(-1);
		const rank = card.slice(0, -1);
		const suitMap: Record<string, string> = { H: '♥', D: '♦', C: '♣', S: '♠' };
		return { rank, suit: suitMap[suit] ?? suit, isRed: suit === 'H' || suit === 'D' };
	}

	function getHandStatusLabel(status: string): string {
		if (status === 'won') return 'WIN';
		if (status === 'lost') return 'LOSS';
		if (status === 'push') return 'PUSH';
		if (status === 'bust') return 'BUST';
		if (status === 'blackjack') return 'BLACKJACK!';
		return '';
	}

	function setBetAmount(amount: number) {
		const clamped = Math.min(amount, Math.min(balance, maxBetAmount));
		betAmount = clamped;
		betAmountDisplay = clamped.toLocaleString();
	}

	function handleBetInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const value = target.value.replace(/,/g, '');
		const numValue = parseFloat(value) || 0;
		const clamped = Math.min(numValue, Math.min(balance, maxBetAmount));
		betAmount = clamped;
		betAmountDisplay = target.value;
	}

	function handleBetBlur() {
		betAmountDisplay = betAmount.toLocaleString();
	}

	async function callApi(body: Record<string, unknown>): Promise<GameState | null> {
		isLoading = true;
		try {
			const response = await fetch('/api/arcade/blackjack', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Request failed');
			}

			const data: GameState = await response.json();
			gameState = data;

			if (data.newBalance !== undefined) {
				balance = data.newBalance;
				onBalanceUpdate?.(data.newBalance);
			}

			if (data.status === 'done') {
				const anyWon = data.playerHands.some((h) => h.status === 'won' || h.status === 'blackjack');
				const allLost = data.playerHands.every((h) => h.status === 'lost' || h.status === 'bust');
				if (anyWon) {
					haptic.trigger('success');
					showConfetti(confetti);
					playSound('win');
				} else if (allLost) {
					haptic.trigger('error');
					playSound('lose');
				}
			}

			return data;
		} catch (err) {
			toast.error('Action failed', {
				description: err instanceof Error ? err.message : 'Unknown error occurred'
			});
			return null;
		} finally {
			isLoading = false;
		}
	}

	async function deal() {
		if (!canDeal) return;
		await callApi({ action: 'deal', betAmount });
	}

	async function hit() {
		if (!canHit || !gameState) return;
		await callApi({ action: 'hit', sessionToken: gameState.sessionToken });
	}

	async function stand() {
		if (!canStand || !gameState) return;
		await callApi({ action: 'stand', sessionToken: gameState.sessionToken });
	}

	async function doubleDown() {
		if (!canDouble || !gameState) return;
		await callApi({ action: 'double', sessionToken: gameState.sessionToken });
	}

	async function split() {
		if (!canSplit || !gameState) return;
		await callApi({ action: 'split', sessionToken: gameState.sessionToken });
	}

	async function takeInsurance(take: boolean) {
		if (!gameState) return;
		await callApi({ action: 'insurance', sessionToken: gameState.sessionToken, take });
	}

	function playAgain() {
		gameState = null;
	}

	onMount(async () => {
		volumeSettings.load();
		try {
			const data = await fetchPortfolioSummary();
			if (data) {
				balance = data.baseCurrencyBalance;
				onBalanceUpdate?.(data.baseCurrencyBalance);
			}
		} catch {}
	});
</script>

<Card>
	<CardHeader>
		<div class="flex items-start justify-between">
			<div>
				<CardTitle>Blackjack</CardTitle>
				<CardDescription>Classic Vegas rules · Blackjack pays 3:2</CardDescription>
			</div>
			<div class="text-right">
				<p class="text-muted-foreground text-xs">Balance</p>
				<p class="text-lg font-bold">{formatValue(balance)}</p>
			</div>
		</div>
	</CardHeader>

	<CardContent class="space-y-4 p-0">
		<div class="bj-table">
			<div class="bj-zone">
				<div class="bj-zone-label-row">
					<span class="bj-zone-label">Dealer</span>
					{#if gameState?.dealerValue !== null && gameState?.dealerValue !== undefined}
						<span class="bj-score">{gameState.dealerValue}</span>
					{/if}
				</div>
				<div class="bj-cards">
					{#if gameState}
						{#each gameState.dealerHand as card}
							{#if card === '??'}
								<div class="bj-card bj-card-back">
									<div class="bj-card-back-face"></div>
								</div>
							{:else}
								{@const d = getCardDisplay(card)}
								<div class="bj-card bj-card-face">
									<div class="bj-corner bj-tl">
										<span class="bj-rank" class:bj-red={d.isRed}>{d.rank}</span>
										<span class="bj-suit-sm" class:bj-red={d.isRed}>{d.suit}</span>
									</div>
									<span class="bj-suit-lg" class:bj-red={d.isRed}>{d.suit}</span>
									<div class="bj-corner bj-br">
										<span class="bj-rank" class:bj-red={d.isRed}>{d.rank}</span>
										<span class="bj-suit-sm" class:bj-red={d.isRed}>{d.suit}</span>
									</div>
								</div>
							{/if}
						{/each}
					{:else}
						<div class="bj-card bj-card-empty"></div>
						<div class="bj-card bj-card-empty"></div>
					{/if}
				</div>
			</div>

			<div class="bj-divider"></div>

			<div class="bj-zone">
				<div class="bj-zone-label-row">
					<span class="bj-zone-label">You</span>
				</div>
				{#if gameState}
					<div class="space-y-3">
						{#each gameState.playerHands as hand, i}
							{@const isActive = i === gameState.currentHandIndex && gameState.status === 'active'}
							<div class="bj-hand" class:bj-hand-active={isActive}>
								<div class="bj-hand-meta">
									<div class="flex items-center gap-2">
										<span class="bj-score">{hand.value}</span>
										{#if gameState.playerHands.length > 1}
											<span class="text-muted-foreground text-xs">Hand {i + 1}</span>
										{/if}
										{#if hand.doubled}
											<span class="bj-tag-doubled">2×</span>
										{/if}
										<span class="text-muted-foreground text-xs">{formatValue(hand.bet)}</span>
									</div>
									{#if getHandStatusLabel(hand.status)}
										<span class="bj-result bj-result-{hand.status}">
											{getHandStatusLabel(hand.status)}
										</span>
									{/if}
								</div>
								<div class="bj-cards">
									{#each hand.cards as card}
										{@const d = getCardDisplay(card)}
										<div class="bj-card bj-card-face">
											<div class="bj-corner bj-tl">
												<span class="bj-rank" class:bj-red={d.isRed}>{d.rank}</span>
												<span class="bj-suit-sm" class:bj-red={d.isRed}>{d.suit}</span>
											</div>
											<span class="bj-suit-lg" class:bj-red={d.isRed}>{d.suit}</span>
											<div class="bj-corner bj-br">
												<span class="bj-rank" class:bj-red={d.isRed}>{d.rank}</span>
												<span class="bj-suit-sm" class:bj-red={d.isRed}>{d.suit}</span>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="bj-cards">
						<div class="bj-card bj-card-empty"></div>
						<div class="bj-card bj-card-empty"></div>
					</div>
				{/if}
			</div>
		</div>

		<div class="space-y-3 px-6 pb-6">
			{#if gameState?.status === 'insurance_pending'}
				<div class="bj-insurance">
					<div class="flex-1">
						<p class="text-sm font-semibold">Dealer shows Ace</p>
						<p class="text-muted-foreground text-xs">
							Insurance pays 2:1 · Cost {formatValue(Math.floor(gameState.betAmount * 0.5 * 100) / 100)}
						</p>
					</div>
					<div class="flex gap-2">
						<Button size="sm" onclick={() => takeInsurance(true)} disabled={isLoading}>
							Take Insurance
						</Button>
						<Button size="sm" variant="outline" onclick={() => takeInsurance(false)} disabled={isLoading}>
							Skip
						</Button>
					</div>
				</div>
			{:else if gameState?.status === 'active'}
				<div class="grid grid-cols-4 gap-2">
					<Button onclick={hit} disabled={!canHit}>Hit</Button>
					<Button variant="outline" onclick={stand} disabled={!canStand}>Stand</Button>
					<Button variant="outline" onclick={doubleDown} disabled={!canDouble}>Double</Button>
					<Button variant="outline" onclick={split} disabled={!canSplit}>Split</Button>
				</div>
			{:else if gameState?.status === 'done'}
				<Button class="w-full" onclick={playAgain}>Play Again</Button>
			{:else}
				<div class="space-y-3">
					<div>
						<label for="bj-bet" class="mb-2 block text-sm font-medium">Bet Amount</label>
						<Input
							id="bj-bet"
							type="text"
							value={betAmountDisplay}
							oninput={handleBetInput}
							onblur={handleBetBlur}
							disabled={isLoading}
							placeholder="Enter bet amount"
						/>
						<p class="text-muted-foreground mt-1 text-xs">Max bet: {maxBetAmount.toLocaleString()}</p>
					</div>
					<div class="grid grid-cols-4 gap-2">
						<Button size="sm" variant="outline" onclick={() => setBetAmount(Math.floor(Math.min(balance || 0, maxBetAmount) * 0.25))} disabled={isLoading}>25%</Button>
						<Button size="sm" variant="outline" onclick={() => setBetAmount(Math.floor(Math.min(balance || 0, maxBetAmount) * 0.5))} disabled={isLoading}>50%</Button>
						<Button size="sm" variant="outline" onclick={() => setBetAmount(Math.floor(Math.min(balance || 0, maxBetAmount) * 0.75))} disabled={isLoading}>75%</Button>
						<Button size="sm" variant="outline" onclick={() => setBetAmount(Math.floor(Math.min(balance || 0, maxBetAmount)))} disabled={isLoading}>Max</Button>
					</div>
					<Button class="h-12 w-full text-lg" onclick={deal} disabled={!canDeal}>
						{isLoading ? 'Dealing…' : 'Deal'}
					</Button>
				</div>
			{/if}
		</div>
	</CardContent>
</Card>

<style>
	.bj-table {
		background: var(--muted);
		border-top: 1px solid var(--border);
		border-bottom: 1px solid var(--border);
		padding: 20px 24px;
		display: flex;
		flex-direction: column;
		gap: 0;
		position: relative;
		overflow: hidden;
	}

.bj-zone {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 10px 0;
	}

	.bj-zone-label-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.bj-zone-label {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--muted-foreground);
		font-weight: 600;
	}

	.bj-score {
		font-size: 0.68rem;
		font-weight: 700;
		padding: 2px 7px;
		border-radius: 4px;
		background: var(--background);
		border: 1px solid var(--border);
		color: var(--foreground);
		font-variant-numeric: tabular-nums;
	}

	.bj-divider {
		height: 1px;
		background: var(--border);
		margin: 2px 0;
	}

	.bj-cards {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		justify-content: center;
	}

	.bj-card {
		width: 64px;
		height: 90px;
		border-radius: 6px;
		position: relative;
		flex-shrink: 0;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	.bj-card-face {
		background: #ffffff;
		border: 1px solid rgba(0, 0, 0, 0.1);
	}

	.bj-card-back {
		background: hsl(220 60% 25%);
		border: 1px solid hsl(220 60% 30%);
		overflow: hidden;
	}

	.bj-card-back-face {
		position: absolute;
		inset: 5px;
		border-radius: 3px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background-image:
			repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255, 255, 255, 0.04) 3px, rgba(255, 255, 255, 0.04) 6px),
			repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(255, 255, 255, 0.04) 3px, rgba(255, 255, 255, 0.04) 6px);
	}

	.bj-card-empty {
		background: transparent;
		border: 1.5px dashed var(--border);
		box-shadow: none;
	}

	.bj-corner {
		position: absolute;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1px;
		padding: 4px 5px;
		line-height: 1;
	}

	.bj-tl {
		top: 0;
		left: 0;
	}

	.bj-br {
		bottom: 0;
		right: 0;
		transform: rotate(180deg);
	}

	.bj-rank {
		font-size: 0.78rem;
		font-weight: 900;
		color: #1a1a1a;
		line-height: 1;
		font-family: Georgia, serif;
	}

	.bj-suit-sm {
		font-size: 0.5rem;
		color: #1a1a1a;
		line-height: 1;
	}

	.bj-suit-lg {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: 1.5rem;
		color: #1a1a1a;
		line-height: 1;
		user-select: none;
	}

	.bj-red {
		color: #dc2626 !important;
	}

	.bj-hand {
		border-radius: 8px;
		padding: 8px;
		border: 1.5px solid transparent;
		transition: border-color 0.15s, background 0.15s;
	}

	.bj-hand-active {
		border-color: var(--primary);
		background: color-mix(in oklch, var(--primary) 8%, transparent);
	}

	.bj-hand-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
	}

	.bj-tag-doubled {
		background: color-mix(in oklch, var(--primary) 15%, transparent);
		color: var(--primary);
		font-size: 0.62rem;
		font-weight: 800;
		padding: 1px 5px;
		border-radius: 3px;
	}

	.bj-result {
		font-size: 0.65rem;
		font-weight: 800;
		padding: 2px 8px;
		border-radius: 4px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.bj-result-won,
	.bj-result-blackjack {
		background: color-mix(in oklch, var(--success) 15%, transparent);
		color: var(--success);
		border: 1px solid color-mix(in oklch, var(--success) 25%, transparent);
	}

	.bj-result-lost,
	.bj-result-bust {
		background: color-mix(in oklch, var(--destructive) 15%, transparent);
		color: var(--destructive);
		border: 1px solid color-mix(in oklch, var(--destructive) 25%, transparent);
	}

	.bj-result-push {
		background: color-mix(in oklch, var(--muted-foreground) 15%, transparent);
		color: var(--muted-foreground);
		border: 1px solid color-mix(in oklch, var(--muted-foreground) 25%, transparent);
	}

	.bj-insurance {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
		border-radius: 8px;
		background: color-mix(in oklch, var(--primary) 8%, transparent);
		border: 1px solid color-mix(in oklch, var(--primary) 25%, transparent);
	}
</style>