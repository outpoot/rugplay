<script lang="ts">
	// https://github.com/gre/bezier-easing
	// BezierEasing - use bezier curve for transition easing function
	// by Gaëtan Renaudeau 2014 - 2015 – MIT License

	// These values are established by empiricism with tests (tradeoff: performance VS precision)
	const NEWTON_ITERATIONS = 4;
	const NEWTON_MIN_SLOPE = 0.001;
	const SUBDIVISION_PRECISION = 0.0000001;
	const SUBDIVISION_MAX_ITERATIONS = 10;

	const kSplineTableSize = 11;
	const kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

	const float32ArraySupported = typeof Float32Array === 'function';

	function A(aA1: number, aA2: number) {
		return 1.0 - 3.0 * aA2 + 3.0 * aA1;
	}
	function B(aA1: number, aA2: number) {
		return 3.0 * aA2 - 6.0 * aA1;
	}
	function C(aA1: number) {
		return 3.0 * aA1;
	}

	// Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
	function calcBezier(aT: number, aA1: number, aA2: number) {
		return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT;
	}

	// Returns dx/dt given t, x1, and x2, or dy/dt given t, y1, and y2.
	function getSlope(aT: number, aA1: number, aA2: number) {
		return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1);
	}

	function binarySubdivide(aX: number, aA: number, aB: number, mX1: number, mX2: number) {
		let currentX,
			currentT,
			i = 0;
		do {
			currentT = aA + (aB - aA) / 2.0;
			currentX = calcBezier(currentT, mX1, mX2) - aX;
			if (currentX > 0.0) {
				aB = currentT;
			} else {
				aA = currentT;
			}
		} while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
		return currentT;
	}

	function newtonRaphsonIterate(aX: number, aGuessT: number, mX1: number, mX2: number) {
		for (let i = 0; i < NEWTON_ITERATIONS; ++i) {
			const currentSlope = getSlope(aGuessT, mX1, mX2);
			if (currentSlope === 0.0) {
				return aGuessT;
			}
			const currentX = calcBezier(aGuessT, mX1, mX2) - aX;
			aGuessT -= currentX / currentSlope;
		}
		return aGuessT;
	}

	function LinearEasing(x: number) {
		return x;
	}

	function bezier(mX1: number, mY1: number, mX2: number, mY2: number): (x: number) => number {
		if (!(0 <= mX1 && mX1 <= 1 && 0 <= mX2 && mX2 <= 1)) {
			throw new Error('bezier x values must be in [0, 1] range');
		}

		if (mX1 === mY1 && mX2 === mY2) {
			return LinearEasing;
		}

		// Precompute samples table
		const sampleValues: Float32Array | number[] = float32ArraySupported
			? new Float32Array(kSplineTableSize)
			: new Array(kSplineTableSize);
		for (let i = 0; i < kSplineTableSize; ++i) {
			sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
		}

		function getTForX(aX: number) {
			let intervalStart = 0.0;
			let currentSample = 1;
			const lastSample = kSplineTableSize - 1;

			for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
				intervalStart += kSampleStepSize;
			}
			--currentSample;

			// Interpolate to provide an initial guess for t
			const dist =
				(aX - sampleValues[currentSample]) /
				(sampleValues[currentSample + 1] - sampleValues[currentSample]);
			const guessForT = intervalStart + dist * kSampleStepSize;

			const initialSlope = getSlope(guessForT, mX1, mX2);
			if (initialSlope >= NEWTON_MIN_SLOPE) {
				return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
			} else if (initialSlope === 0.0) {
				return guessForT;
			} else {
				return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
			}
		}

		return function BezierEasing(x: number) {
			// Because JavaScript number are imprecise, we should guarantee the extremes are right.
			if (x === 0 || x === 1) {
				return x;
			}
			return calcBezier(getTForX(x), mY1, mY2);
		};
	}

	function getNormalizedTimeForProgress(
		targetProgress: number,
		easingFunction: (t: number) => number,
		tolerance = 0.0001,
		maxIterations = 100
	): number {
		if (targetProgress <= 0) return 0;
		if (targetProgress >= 1) return 1;

		let minT = 0;
		let maxT = 1;
		let t = 0.5;

		for (let i = 0; i < maxIterations; i++) {
			const currentProgress = easingFunction(t);
			const error = currentProgress - targetProgress;

			if (Math.abs(error) < tolerance) {
				return t;
			}

			if (error < 0) {
				minT = t;
			} else {
				maxT = t;
			}
			t = (minT + maxT) / 2;
		}
		return t;
	}
	// --- End of bezier-easing code ---

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
	import { formatValue, playSound, showConfetti } from '$lib/utils';
	import { volumeSettings } from '$lib/stores/volume-settings';
	import { onMount } from 'svelte';
	import { fetchPortfolioSummary } from '$lib/stores/portfolio-data';
	import { _ } from 'svelte-i18n';

	interface CoinflipResult {
		won: boolean;
		result: 'heads' | 'tails';
		newBalance: number;
		payout: number;
		amountWagered: number;
	}

	const cssEaseInOut = bezier(0.42, 0, 0.58, 1.0);
	const MAX_BET_AMOUNT = 1000000;

	let {
		balance = $bindable(),
		onBalanceUpdate
	}: {
		balance: number;
		onBalanceUpdate?: (newBalance: number) => void;
	} = $props();

	let betAmount = $state(10);
	let betAmountDisplay = $state('10');
	let selectedSide = $state('heads');
	let isFlipping = $state(false);
	let coinRotation = $state(0);
	let lastResult = $state<CoinflipResult | null>(null);
	let activeSoundTimeouts = $state<NodeJS.Timeout[]>([]);

	let canBet = $derived(
		betAmount > 0 && betAmount <= balance && betAmount <= MAX_BET_AMOUNT && !isFlipping
	);

	function selectSide(side: string) {
		if (!isFlipping) {
			selectedSide = side;
		}
	}

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

	async function flipCoin() {
		if (!canBet) return;

		isFlipping = true;
		lastResult = null;

		activeSoundTimeouts.forEach(clearTimeout);
		activeSoundTimeouts = [];

		try {
			const response = await fetch('/api/gambling/coinflip', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					side: selectedSide,
					amount: betAmount
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || $_("gambling.failed"));
			}

			const resultData: CoinflipResult = await response.json();

			const baseSpinsDegrees = 1800;
			const currentRotationValue = coinRotation;

			let rotationDeltaForThisFlip = baseSpinsDegrees;

			const faceAfterBaseSpins =
				(currentRotationValue + baseSpinsDegrees) % 360 < 180 ? 'heads' : 'tails';

			if (faceAfterBaseSpins !== resultData.result) {
				rotationDeltaForThisFlip += 180;
			}

			if (rotationDeltaForThisFlip === 0) {
				rotationDeltaForThisFlip = 360;
			}

			coinRotation = currentRotationValue + rotationDeltaForThisFlip;

			const animationDuration = 2000;

			if (rotationDeltaForThisFlip >= 180) {
				const numHalfSpins = Math.floor(rotationDeltaForThisFlip / 180);

				for (let i = 1; i <= numHalfSpins; i++) {
					const targetEasedProgress = (i * 180) / rotationDeltaForThisFlip;
					const normalizedTime = getNormalizedTimeForProgress(targetEasedProgress, cssEaseInOut);
					const timeToPlaySound = normalizedTime * animationDuration;

					const timeoutId = setTimeout(() => {
						playSound('flip');
					}, timeToPlaySound);
					activeSoundTimeouts.push(timeoutId);
				}
			}

			setTimeout(() => {
				balance = resultData.newBalance;
				lastResult = resultData;
				onBalanceUpdate?.(resultData.newBalance);

				if (resultData.won) {
					showConfetti(confetti);
				}

				setTimeout(() => {
					isFlipping = false;
					if (!resultData.won) {
						playSound('lose');
					}
				}, 500);
			}, animationDuration);
		} catch (error) {
			console.error('Coinflip error:', error);
			toast.error($_("gambling.failed"), {
				description: error instanceof Error ? error.message : $_("error.unknown")
			});
			isFlipping = false;
			activeSoundTimeouts.forEach(clearTimeout);
			activeSoundTimeouts = [];
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
		<CardTitle>{$_('gambling.games.coinflip.title')}</CardTitle>
		<CardDescription>{$_('gambling.games.coinflip.description')}</CardDescription>
	</CardHeader>
	<CardContent>
		<!-- Main Layout: Coin/Balance Left, Controls Right -->
		<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
			<!-- Left Side: Coin, Balance, and Result -->
			<div class="flex flex-col space-y-4">
				<!-- Balance Display -->
				<div class="text-center">
					<p class="text-muted-foreground text-sm">{$_('gambling.balance')}</p>
					<p class="text-2xl font-bold">{formatValue(balance)}</p>
				</div>

				<!-- Coin Animation -->
				<div class="flex justify-center">
					<div class="coin-container">
						<div class="coin" style="transform: rotateY({coinRotation}deg)">
							<div class="coin-face coin-heads">
								<img
									src="/facedev/avif/bliptext.avif"
									alt="Heads"
									class="h-32 w-32 object-contain"
								/>
							</div>
							<div class="coin-face coin-tails">
								<img
									src="/facedev/avif/wattesigma.avif"
									alt="Tails"
									class="h-32 w-32 object-contain"
								/>
							</div>
						</div>
					</div>
				</div>

				<!-- Result Display (Reserve Space) -->
				<div class="flex items-center justify-center text-center">
					{#if lastResult && !isFlipping}
						<div class="bg-muted/50 w-full rounded-lg p-3">
							{#if lastResult.won}
								<p class="text-success font-semibold">{$_('gambling.games.coinflip.win.0')}</p>
								<p class="text-sm">
									{$_('gambling.games.coinflip.win.1')
										.replace('{{amount}}', formatValue(lastResult.payout))
										.replace('{{lastR}}', $_(`gambling.games.coinflip.${lastResult.result}`))}
								</p>
							{:else}
								<p class="text-destructive font-semibold">{$_('gambling.games.coinflip.loss.0')}</p>
								<p class="text-sm">
									{$_('gambling.games.coinflip.loss.1')
										.replace('{{amount}}', formatValue(lastResult.amountWagered))
										.replace('{{lastR}}', $_(`gambling.games.coinflip.${lastResult.result}`))}
								</p>
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<!-- Right Side: Betting Controls -->
			<div class="space-y-4">
				<!-- Side Selection (Inline) -->
				<div>
					<div class="mb-2 block text-sm font-medium">
						{$_('gambling.games.coinflip.chooseSide')}
					</div>
					<div class="flex gap-3">
						<Button
							variant={selectedSide === 'heads' ? 'default' : 'outline'}
							onclick={() => selectSide('heads')}
							disabled={isFlipping}
							class="side-button h-16 flex-1"
						>
							<div class="text-center">
								<img
									src="/facedev/avif/bliptext.avif"
									alt={$_('gambling.games.coinflip.heads')}
									class="mx-auto mb-1 h-8 w-8 object-contain"
								/>
								<div>{$_('gambling.games.coinflip.heads')}</div>
							</div>
						</Button>
						<Button
							variant={selectedSide === 'tails' ? 'default' : 'outline'}
							onclick={() => selectSide('tails')}
							disabled={isFlipping}
							class="side-button h-16 flex-1"
						>
							<div class="text-center">
								<img
									src="/facedev/avif/wattesigma.avif"
									alt={$_('gambling.games.coinflip.tails')}
									class="mx-auto mb-1 h-8 w-8 object-contain"
								/>
								<div>{$_('gambling.games.coinflip.tails')}</div>
							</div>
						</Button>
					</div>
				</div>

				<!-- Bet Amount -->
				<div>
					<label for="bet-amount" class="mb-2 block text-sm font-medium"
						>{$_('gambling.betAmount')}</label
					>
					<Input
						id="bet-amount"
						type="text"
						value={betAmountDisplay}
						oninput={handleBetAmountInput}
						onblur={handleBetAmountBlur}
						disabled={isFlipping}
						placeholder={$_('gambling.betAmountPlaceholder')}
					/>
					<p class="text-muted-foreground mt-1 text-xs">
						{$_('gambling.maxBet').replace('{{amount}}', MAX_BET_AMOUNT.toLocaleString())}
					</p>
				</div>

				<!-- Percentage Quick Actions -->
				<div>
					<div class="grid grid-cols-4 gap-2">
						<Button
							size="sm"
							variant="outline"
							onclick={() =>
								setBetAmount(Math.floor(Math.min(balance || 0, MAX_BET_AMOUNT) * 0.25))}
							disabled={isFlipping}>25%</Button
						>
						<Button
							size="sm"
							variant="outline"
							onclick={() => setBetAmount(Math.floor(Math.min(balance || 0, MAX_BET_AMOUNT) * 0.5))}
							disabled={isFlipping}>50%</Button
						>
						<Button
							size="sm"
							variant="outline"
							onclick={() =>
								setBetAmount(Math.floor(Math.min(balance || 0, MAX_BET_AMOUNT) * 0.75))}
							disabled={isFlipping}>75%</Button
						>
						<Button
							size="sm"
							variant="outline"
							onclick={() => setBetAmount(Math.floor(Math.min(balance || 0, MAX_BET_AMOUNT)))}
							disabled={isFlipping}>Max</Button
						>
					</div>
				</div>

				<!-- Flip Button -->
				<Button class="h-12 w-full text-lg" onclick={flipCoin} disabled={!canBet}>
					{isFlipping ? $_('gambling.games.coinflip.flipping') : $_('gambling.games.coinflip.flip')}
				</Button>
			</div>
		</div>
	</CardContent>
</Card>

<style>
	.coin-container {
		position: relative;
		width: 8rem; /* 128px */
		height: 8rem; /* 128px */
		perspective: 1000px;
	}

	.coin {
		width: 100%;
		height: 100%;
		position: relative;
		transform-style: preserve-3d;
		transition: transform 2s ease-in-out;
	}

	.coin-face {
		position: absolute;
		width: 100%;
		height: 100%;
		backface-visibility: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.coin-heads {
		transform: rotateY(0deg);
	}

	.coin-tails {
		transform: rotateY(180deg);
	}

	:global(.side-button) {
		box-sizing: border-box !important;
		border: 2px solid transparent !important;
	}

	:global(.side-button[data-variant='outline']) {
		border-color: hsl(var(--border)) !important;
	}

	:global(.side-button[data-variant='default']) {
		border-color: hsl(var(--primary)) !important;
	}
</style>
