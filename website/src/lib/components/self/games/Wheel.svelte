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
	import { haptic } from '$lib/stores/haptics';

	import { WHEEL_SEGMENTS } from '$lib/data/wheel';

	const SEGMENT_COUNT = WHEEL_SEGMENTS.length;
	const SEGMENT_DEG = 360 / SEGMENT_COUNT;
	const MAX_BET_AMOUNT = 1000000;
	const WHEEL_RADIUS = 100;

	const segmentColors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];

	const wheelGradient = `conic-gradient(${WHEEL_SEGMENTS.map((multiplier, i) => {
		const color = multiplier === 0 ? '#334155' : segmentColors[i % segmentColors.length];
		return `${color} ${i * SEGMENT_DEG}deg ${(i + 1) * SEGMENT_DEG}deg`;
	}).join(', ')})`;

	interface WheelResult {
		segmentIndex: number;
		multiplier: number;
		won: boolean;
		payout: number;
		newBalance: number;
		amountWagered: number;
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
	let isSpinning = $state(false);
	let lastResult = $state<WheelResult | null>(null);
	let rotation = $state(0);
	let wheelElement: HTMLElement | null = null;

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

	function spinTo(index: number) {
		// Segment i's center sits at i*30+15 degrees clockwise from the top.
		// The pointer is fixed at the top, so the wheel must end rotated so that
		// segment center lines up with it: rotation mod 360 == 360 - center.
		const segmentCenter = index * SEGMENT_DEG + SEGMENT_DEG / 2;
		const currentMod = ((rotation % 360) + 360) % 360;
		const targetMod = (360 - segmentCenter + 360) % 360;
		let delta = (targetMod - currentMod + 360) % 360;
		const spins = 6;
		rotation = rotation + spins * 360 + delta;

		if (wheelElement) {
			wheelElement.style.transform = `rotate(${rotation}deg)`;
		}
	}

	async function spin() {
		if (!canBet) return;

		isSpinning = true;
		lastResult = null;

		try {
			const response = await fetch('/api/arcade/wheel', {
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

			const resultData: WheelResult = await response.json();

			playSound('dice');
			if (wheelElement) {
				wheelElement.style.transition = 'none';
				wheelElement.style.transform = `rotate(${rotation}deg)`;
				void wheelElement.offsetHeight;
				wheelElement.style.transition = 'transform 4s cubic-bezier(0.1, 0.9, 0.1, 1)';
				spinTo(resultData.segmentIndex);
			}

			await new Promise(resolve => setTimeout(resolve, 4200));

			balance = resultData.newBalance;
			lastResult = resultData;
			onBalanceUpdate?.(resultData.newBalance);

			if (resultData.won) {
				haptic.trigger('success');
				showConfetti(confetti);
				showSchoolPrideCannons(confetti);
			} else {
				haptic.trigger('error');
				playSound('lose');
			}
		} catch (error) {
			console.error('Wheel spin error:', error);
			haptic.trigger('error');
			toast.error('Spin failed', {
				description: error instanceof Error ? error.message : 'Unknown error occurred'
			});
		} finally {
			isSpinning = false;
		}
	}

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
		<CardTitle>Wheel of Fortune</CardTitle>
		<CardDescription>
			Spin the wheel and land on a multiplier. Watch out for the zero segments!
		</CardDescription>
	</CardHeader>
	<CardContent>
		<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
			<div class="flex flex-col space-y-4">
				<div class="text-center">
					<p class="text-muted-foreground text-sm">Balance</p>
					<p class="text-2xl font-bold">{formatValue(balance)}</p>
				</div>

				<!-- Wheel -->
				<div class="relative mx-auto flex h-64 w-64 items-center justify-center">
					<!-- Pointer (fixed at top) -->
					<div class="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2">
						<div class="border-x-[10px] border-t-[18px] border-x-transparent border-t-white drop-shadow"></div>
					</div>

					<div class="wheel" bind:this={wheelElement} style="background: {wheelGradient}">
						{#each WHEEL_SEGMENTS as multiplier, i}
							<span
								class="wheel-label"
								style="--angle: {i * SEGMENT_DEG + SEGMENT_DEG / 2}deg; --radius: {WHEEL_RADIUS}px"
							>
								{multiplier === 0 ? '0' : `${multiplier}x`}
							</span>
						{/each}
						<div class="wheel-hub"></div>
					</div>
				</div>

				<div class="flex items-center justify-center text-center">
					{#if lastResult && !isSpinning}
						<div class="bg-muted/50 w-full rounded-lg p-3">
							{#if lastResult.won}
								<p class="text-success font-semibold">WIN {lastResult.multiplier}x</p>
								<p class="text-sm">
									Won {formatValue(lastResult.payout)} on {lastResult.multiplier}x
								</p>
							{:else}
								<p class="text-destructive font-semibold">LOSS</p>
								<p class="text-sm">
									Lost {formatValue(lastResult.amountWagered)} on {lastResult.multiplier}x
								</p>
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<div class="space-y-4">
				<div>
					<label for="bet-amount" class="mb-2 block text-sm font-medium">Bet Amount</label>
					<Input
						id="bet-amount"
						type="text"
						value={betAmountDisplay}
						oninput={handleBetAmountInput}
						onblur={handleBetAmountBlur}
						disabled={isSpinning}
						placeholder="Enter bet amount"
					/>
					<p class="text-muted-foreground mt-1 text-xs">
						Max bet: {MAX_BET_AMOUNT.toLocaleString()}
					</p>
				</div>

				<div>
					<div class="grid grid-cols-4 gap-2">
						<Button
							size="sm"
							variant="outline"
							onclick={() => setBetAmount(Math.floor(Math.min(balance || 0, MAX_BET_AMOUNT) * 0.25))}
							disabled={isSpinning}>25%</Button
						>
						<Button
							size="sm"
							variant="outline"
							onclick={() => setBetAmount(Math.floor(Math.min(balance || 0, MAX_BET_AMOUNT) * 0.5))}
							disabled={isSpinning}>50%</Button
						>
						<Button
							size="sm"
							variant="outline"
							onclick={() => setBetAmount(Math.floor(Math.min(balance || 0, MAX_BET_AMOUNT) * 0.75))}
							disabled={isSpinning}>75%</Button
						>
						<Button
							size="sm"
							variant="outline"
							onclick={() => setBetAmount(Math.floor(Math.min(balance || 0, MAX_BET_AMOUNT)))}
							disabled={isSpinning}>Max</Button
						>
					</div>
				</div>

				<Button class="h-12 w-full text-lg" onclick={spin} disabled={!canBet}>
					{isSpinning ? 'Spinning...' : 'Spin'}
				</Button>

				<div class="bg-muted/50 space-y-1.5 rounded-lg p-3 text-xs">
					<p class="text-muted-foreground mb-2 font-medium">Payouts</p>
					<div class="flex flex-wrap gap-1.5">
						{#each WHEEL_SEGMENTS as multiplier, i}
							<span
								class="rounded px-1.5 py-0.5 font-mono font-medium"
								class:text-green-500={multiplier > 1}
								class:text-yellow-500={multiplier === 1}
								class:text-destructive={multiplier === 0}
								class:text-muted-foreground={multiplier > 0 && multiplier < 1}
							>
								{multiplier === 0 ? '0' : `${multiplier}x`}
							</span>
						{/each}
					</div>
					<p class="text-muted-foreground mt-2">
						Land on a multiplier to win your bet times that amount. Zero segments lose your bet.
					</p>
				</div>
			</div>
		</div>
	</CardContent>
</Card>

<style>
	.wheel {
		position: relative;
		width: 260px;
		height: 260px;
		border-radius: 50%;
		border: 4px solid var(--border);
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.35);
		transition: transform 4s cubic-bezier(0.1, 0.9, 0.1, 1);
	}

	.wheel-label {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%) rotate(var(--angle)) translateY(calc(-1 * var(--radius))) rotate(calc(-1 * var(--angle)));
		color: #fff;
		font-size: 0.95rem;
		font-weight: 700;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
		user-select: none;
		pointer-events: none;
	}

	.wheel-hub {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--card);
		border: 3px solid var(--border);
		transform: translate(-50%, -50%);
		z-index: 2;
	}
</style>
