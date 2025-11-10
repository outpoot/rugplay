<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import confetti from 'canvas-confetti';
	import { toast } from 'svelte-sonner';
	import { formatValue, playSound, showConfetti, showSchoolPrideCannons } from '$lib/utils';
	import { volumeSettings } from '$lib/stores/volume-settings';
	import { onMount } from 'svelte';
	import { fetchPortfolioSummary } from '$lib/stores/portfolio-data';
	import { _ } from 'svelte-i18n';

	interface SlotsResult {
		won: boolean;
		symbols: string[];
		newBalance: number;
		payout: number;
		amountWagered: number;
		winType?: string;
	}

	let {
		balance = $bindable(),
		onBalanceUpdate
	}: {
		balance: number;
		onBalanceUpdate?: (newBalance: number) => void;
	} = $props();

	const symbols = [
		'bliptext',
		'bussin',
		'griddycode',
		'lyntr',
		'subterfuge',
		'twoblade',
		'wattesigma',
		'webx'
	];

	const BASE_SPINS_PER_REEL = [8, 10, 12];
	const NUM_RENDERED_CYCLES = Math.max(...BASE_SPINS_PER_REEL) + 3;
	const MAX_BET_AMOUNT = 1000000;

	let betAmount = $state(10);
	let betAmountDisplay = $state('10');
	let isSpinning = $state(false);

	const createReelStrip = () => {
		const strip = [];
		for (let i = 0; i < 5; i++) {
			const shuffled = [...symbols].sort(() => Math.random() - 0.5);
			strip.push(...shuffled);
		}
		return strip;
	};

	let reelSymbols = $state([createReelStrip(), createReelStrip(), createReelStrip()]);

	let reelPositions = $state([0, 0, 0]);
	let lastResult = $state<SlotsResult | null>(null);

	let displayedSymbols = $state(
		reelSymbols.map((reel_cycle_data) => {
			return reel_cycle_data[1];
		})
	);

	let canBet = $derived(
		betAmount > 0 && betAmount <= balance && betAmount <= MAX_BET_AMOUNT && !isSpinning
	);

	function setBetAmount(amount: number) {
		const clampedAmount = Math.min(amount, Math.min(balance, MAX_BET_AMOUNT));
		if (clampedAmount >= 0) {
			betAmount = clampedAmount;
			betAmountDisplay = clampedAmount.toLocaleString();
		}
	}

	function handleBetAmountInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const value = target.value.replace(/,/g, '');
		const numValue = parseFloat(value) || 0;
		const clampedValue = Math.min(numValue, Math.min(balance, MAX_BET_AMOUNT));

		betAmount = clampedValue;
		betAmountDisplay = target.value;
	}

	function handleBetAmountBlur() {
		betAmountDisplay = betAmount.toLocaleString();
	}

	async function spin() {
		if (!canBet) return;

		isSpinning = true;
		lastResult = null;

		playSound('background');

		const spinStartOffsets = [
			Math.random() * 60 - 30,
			Math.random() * 60 - 30,
			Math.random() * 60 - 30
		];

		reelPositions = reelPositions.map((pos, i) => pos + spinStartOffsets[i]);

		try {
			const response = await fetch('/api/gambling/slots', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					amount: betAmount
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to place bet');
			}

			const result: SlotsResult = await response.json();

			const targetIndices = result.symbols.map((symbol, reelIndex) => {
				const indices = reelSymbols[reelIndex]
					.map((s, i) => (s === symbol ? i : -1))
					.filter((i) => i !== -1);
				return indices[Math.floor(Math.random() * indices.length)];
			});

			const spinDurations = [2000, 2500, 3000];

			targetIndices.forEach((targetIndex, i) => {
				const symbolHeight = 60;

				const targetPosition = 60 - targetIndex * symbolHeight;
				const logicalCyclePixelHeight = reelSymbols[i].length * symbolHeight;

				const fullRotations = BASE_SPINS_PER_REEL[i] * logicalCyclePixelHeight;

				reelPositions[i] = targetPosition - fullRotations;

				setTimeout(() => {
					playSound('click');
				}, spinDurations[i]);
			});

			const maxDuration = Math.max(...spinDurations);

			setTimeout(() => {
				balance = result.newBalance;
				lastResult = result;
				onBalanceUpdate?.(result.newBalance);

				if (result.won) {
					if (result.winType === '3 OF A KIND') {
						showSchoolPrideCannons(confetti);
						showConfetti(confetti);
					} else {
						showConfetti(confetti);
					}
				} else {
					playSound('lose');
				}

				isSpinning = false;

				reelPositions = reelPositions.map((pos, i) => {
					const symbolHeight = 60;
					const logicalReelCycleLength = reelSymbols[i].length;
					const logicalCyclePixelHeight = logicalReelCycleLength * symbolHeight;
					const normalized = pos % logicalCyclePixelHeight;
					return normalized > 0 ? normalized - logicalCyclePixelHeight : normalized;
				});
			}, maxDuration + 200);
		} catch (error) {
			console.error('Slots error:', error);
			toast.error('Bet failed', {
				description: error instanceof Error ? error.message : $_("error.unknown")
			});
			isSpinning = false;
		}
	}

	function getVisibleSymbolIndex(position: number, logicalReelCycleLength: number): number {
		const symbolHeight = 60;
		let index = Math.round(1 - position / symbolHeight);
		index = ((index % logicalReelCycleLength) + logicalReelCycleLength) % logicalReelCycleLength;
		return index;
	}

	$effect(() => {
		if (!isSpinning) {
			const newDisplayedSymbols = reelSymbols.map((logicalCycle, i) => {
				const index = getVisibleSymbolIndex(reelPositions[i], logicalCycle.length);
				return logicalCycle[index];
			});

			if (!lastResult) {
				displayedSymbols = newDisplayedSymbols;
			}
		}
	});

	// Dynmaically fetch the correct balance.
	onMount(async () => {
		volumeSettings.load();

		try {
			const data = await fetchPortfolioSummary();
			if (data) {
				balance = data.baseCurrencyBalance;
				onBalanceUpdate?.(data.baseCurrencyBalance);
			}
		} catch (error) {
			console.error('Failed to fetch balance:', error);
		}
	});
</script>

<Card>
	<CardHeader>
		<CardTitle>{$_('gambling.games.slots.title')}</CardTitle>
		<CardDescription>{$_('gambling.games.slots.description')}</CardDescription>
	</CardHeader>
	<CardContent>
		<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
			<!-- Left Side: Slots Machine -->
			<div class="flex flex-col space-y-4">
				<!-- Balance Display -->
				<div class="text-center">
					<p class="text-muted-foreground text-sm">{$_('gambling.balance')}</p>
					<p class="text-2xl font-bold">{formatValue(balance)}</p>
				</div>

				<!-- Slots Machine -->
				<div class="slots-machine">
					<div class="slots-container">
						{#each reelSymbols as logicalCycleData, reelIndex}
							<div class="reel">
								<div
									class="reel-strip"
									style="transform: translateY({reelPositions[
										reelIndex
									]}px); transition: {isSpinning
										? `transform ${2 + reelIndex * 0.5}s cubic-bezier(0.17, 0.67, 0.16, 0.99)`
										: 'none'};"
								>
									{#each Array(NUM_RENDERED_CYCLES) as _, cycleInstanceIndex}
										{#each logicalCycleData as symbol, symbolIndexInCycle}
											<div class="symbol">
												<img src="/facedev/avif/{symbol}.avif" alt={symbol} class="symbol-image" />
											</div>
										{/each}
									{/each}
								</div>
							</div>
						{/each}
					</div>
					<div class="payline"></div>
				</div>

				<!-- Result Display -->
				<div class="flex items-center justify-center text-center">
					{#if lastResult && !isSpinning}
						<div class="bg-muted/50 w-full rounded-lg p-3">
							{#if lastResult?.won}
								<p class="text-success font-semibold">
									{$_(`gambling.games.slots.win.title`).replace(
										'{{winType}}',
										$_(`gambling.games.slots.win.${lastResult.winType}`)
									)}
								</p>
								<p class="text-sm">
									{$_(`gambling.games.slots.win.description`).replace(
										'{{amount}}',
										formatValue(lastResult.payout)
									)}
								</p>
							{:else}
								<p class="text-destructive font-semibold">
									{$_(`gambling.games.slots.loss.title`)}
								</p>
								<p class="text-sm">
									{$_('gambling.games.slots.loss.description').replace(
										'{{amount}}',
										formatValue(lastResult.amountWagered)
									)}
								</p>
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<!-- Right Side: Betting Controls -->
			<div class="space-y-4">
				<!-- Paytable -->
				<div>
					<div class="mb-2 block text-sm font-medium">{$_(`gambling.games.slots.paytable`)}</div>
					<div class="bg-muted/50 space-y-1 rounded-lg p-3 text-xs">
						<div class="flex justify-between">
							<span>{$_(`gambling.games.slots.5x`)}</span>
							<span class="text-success">5x</span>
						</div>
						<div class="flex justify-between">
							<span>{$_(`gambling.games.slots.2x`)}</span>
							<span class="text-success">2x</span>
						</div>
					</div>
				</div>

				<!-- Bet Amount -->
				<div>
					<label for="bet-amount" class="mb-2 block text-sm font-medium"
						>{$_(`gambling.betAmount`)}</label
					>
					<Input
						id="bet-amount"
						type="text"
						value={betAmountDisplay}
						oninput={handleBetAmountInput}
						onblur={handleBetAmountBlur}
						disabled={isSpinning}
						placeholder={$_(`gambling.betAmountPlaceholder`)}
					/>
					<p class="text-muted-foreground mt-1 text-xs">
						{$_(`gambling.maxBet`).replace('{{amount}}', MAX_BET_AMOUNT.toLocaleString())}
					</p>
				</div>

				<!-- Percentage Quick Actions -->
				<div>
					<div class="grid grid-cols-4 gap-2">
						<Button
							size="sm"
							variant="outline"
							onclick={() => setBetAmount(Math.floor(Math.min(balance, MAX_BET_AMOUNT) * 0.25))}
							disabled={isSpinning}>25%</Button
						>
						<Button
							size="sm"
							variant="outline"
							onclick={() => setBetAmount(Math.floor(Math.min(balance, MAX_BET_AMOUNT) * 0.5))}
							disabled={isSpinning}>50%</Button
						>
						<Button
							size="sm"
							variant="outline"
							onclick={() => setBetAmount(Math.floor(Math.min(balance, MAX_BET_AMOUNT) * 0.75))}
							disabled={isSpinning}>75%</Button
						>
						<Button
							size="sm"
							variant="outline"
							onclick={() => setBetAmount(Math.floor(Math.min(balance, MAX_BET_AMOUNT)))}
							disabled={isSpinning}>Max</Button
						>
					</div>
				</div>

				<!-- Spin Button -->
				<Button class="h-12 w-full text-lg" onclick={spin} disabled={!canBet}>
					{isSpinning ? $_(`gambling.games.slots.spinning`) : $_(`gambling.games.slots.spin`)}
				</Button>
			</div>
		</div>
	</CardContent>
</Card>

<style>
	.slots-machine {
		position: relative;
		background: var(--card);
	}

	.slots-container {
		display: flex;
		gap: 4px;
		background: var(--muted);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 8px;
		position: relative;
		overflow: hidden;
		height: 198px;
	}

	.reel {
		flex: 1;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: calc(var(--radius) - 2px);
		overflow: hidden;
		position: relative;
	}

	.reel::before,
	.reel::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		height: 60px;
		z-index: 5;
		pointer-events: none;
	}

	.reel::before {
		top: 0;
		background: linear-gradient(to bottom, rgba(0, 0, 0, 0.2), transparent);
	}

	.reel::after {
		bottom: 0;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.2), transparent);
	}

	.reel-strip {
		display: flex;
		flex-direction: column;
		will-change: transform;
	}

	.symbol {
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
		background: var(--card);
	}

	.symbol:last-child {
		border-bottom: none;
	}

	.symbol-image {
		width: 40px;
		height: 40px;
		object-fit: contain;
	}

	.payline {
		position: absolute;
		top: 50%;
		left: 8px;
		right: 8px;
		height: 2px;
		background: linear-gradient(90deg, transparent, var(--primary), transparent);
		transform: translateY(-1px);
		pointer-events: none;
		z-index: 10;
	}

	.payline::before,
	.payline::after {
		content: '';
		position: absolute;
		top: -4px;
		width: 8px;
		height: 10px;
		background: var(--primary);
		clip-path: polygon(0 0, 100% 50%, 0 100%);
	}

	.payline::before {
		left: -4px;
	}

	.payline::after {
		right: -4px;
		transform: rotate(180deg);
	}
</style>
