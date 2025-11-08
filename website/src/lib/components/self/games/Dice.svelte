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

	interface DiceResult {
		won: boolean;
		result: number;
		newBalance: number;
		payout: number;
		amountWagered: number;
	}

	const MAX_BET_AMOUNT = 1000000;
	const baseRotation = 'rotate3d(1, 1, 0, 340deg)';

	const faceRotations = {
		1: { x: 0, y: 0 },
		2: { x: 0, y: 90 },
		3: { x: 90, y: 0 },
		4: { x: -90, y: 0 },
		5: { x: 0, y: -90 },
		6: { x: 0, y: 180 }
	};

	const diceRotations = {
		1: { x: 0, y: 0, z: 0 },
		2: { x: 0, y: -90, z: 0 },
		3: { x: -90, y: 0, z: 0 },
		4: { x: 90, y: 0, z: 0 },
		5: { x: 0, y: 90, z: 0 },
		6: { x: 0, y: 180, z: 0 }
	};

	function getExtraSpin(spinFactor = 4) {
		const extraSpinsX = spinFactor * 360;
		const extraSpinsY = spinFactor * 360;
		const extraSpinsZ = spinFactor * 360;

		return {
			x: extraSpinsX,
			y: extraSpinsY,
			z: extraSpinsZ
		};
	}

	function getFaceRotation(face: number) {
		return faceRotations[face as keyof typeof faceRotations];
	}

	function getFaceTransform(face: number): string {
		const rotation = getFaceRotation(face);
		return `${getRotate(rotation.x, rotation.y)} translateZ(50px)`;
	}

	function getDiceRotation(face: number, addExtraSpin = false, spinFactor = 4) {
		let extraSpin = { x: 0, y: 0, z: 0 };

		if (addExtraSpin) {
			extraSpin = getExtraSpin(spinFactor);
		}

		const rotation = diceRotations[face as keyof typeof diceRotations];
		return {
			x: rotation.x + extraSpin.x,
			y: rotation.y + extraSpin.y,
			z: rotation.z + extraSpin.z
		};
	}

	function getDiceTransform(face: number, addExtraSpin = false, spinFactor = 4): string {
		const rotation = getDiceRotation(face, addExtraSpin, spinFactor);
		return `${baseRotation} ${getRotate(rotation.x, rotation.y, rotation.z)}`;
	}

	function getRotate(x?: number, y?: number, z?: number) {
		const rotateX = x !== undefined ? `rotateX(${x}deg)` : '';
		const rotateY = y !== undefined ? `rotateY(${y}deg)` : '';
		const rotateZ = z !== undefined ? `rotateZ(${z}deg)` : '';
		return `${rotateX} ${rotateY} ${rotateZ}`;
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
	let selectedNumber = $state(1);
	let isRolling = $state(false);
	let lastResult = $state<DiceResult | null>(null);
	let activeSoundTimeouts = $state<NodeJS.Timeout[]>([]);
	let diceElement: HTMLElement | null = null;

	let canBet = $derived(
		betAmount > 0 && betAmount <= balance && betAmount <= MAX_BET_AMOUNT && !isRolling
	);

	function selectNumber(num: number) {
		if (!isRolling) {
			selectedNumber = num;
			playSound('click');
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

	async function rollDice() {
		if (!canBet) return;

		isRolling = true;
		lastResult = null;

		activeSoundTimeouts.forEach(clearTimeout);
		activeSoundTimeouts = [];

		const spinFactor = 20;
		const animationDuration = 1500;

		try {
			const response = await fetch('/api/gambling/dice', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					selectedNumber,
					amount: betAmount
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to place bet');
			}

			const resultData: DiceResult = await response.json();

			playSound('dice');
			if (diceElement) {
				diceElement.style.transition = 'none';
				diceElement.style.transform = getDiceTransform(selectedNumber, false);
				void diceElement.offsetHeight;
				diceElement.style.transition = 'transform 1.5s cubic-bezier(0.1, 0.9, 0.1, 1)';
				diceElement.style.transform = getDiceTransform(resultData.result, true, spinFactor);
			}

			await new Promise((resolve) => setTimeout(resolve, animationDuration));
			await new Promise((resolve) => setTimeout(resolve, 200)); // Small delay to show the Result

			balance = resultData.newBalance;
			lastResult = resultData;
			onBalanceUpdate?.(resultData.newBalance);

			if (resultData.won) {
				showConfetti(confetti);
				showSchoolPrideCannons(confetti);
			} else {
				playSound('lose');
			}

			isRolling = false;
		} catch (error) {
			console.error('Dice roll error:', error);
			toast.error('Roll failed', {
				description: error instanceof Error ? error.message : 'Unknown error occurred'
			});
			isRolling = false;
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
		<CardTitle>Dice</CardTitle>
		<CardDescription>Choose a number and roll the dice to win 3x your bet!</CardDescription>
	</CardHeader>
	<CardContent>
		<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
			<div class="flex flex-col space-y-4">
				<div class="text-center">
					<p class="text-muted-foreground text-sm">Balance</p>
					<p class="text-2xl font-bold">{formatValue(balance)}</p>
				</div>

				<div class="flex flex-1 items-center justify-center">
					<div class="dice-container">
						<div class="dice" bind:this={diceElement}>
							{#each Array(6) as _, i}
								<div class="face" style="transform: {getFaceTransform(i + 1)}">
									<div class="dot-container">
										{#each Array(i + 1) as _}
											<div class="dot"></div>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>

				<div class="flex items-center justify-center text-center">
					{#if lastResult && !isRolling}
						<div class="bg-muted/50 w-full rounded-lg p-3">
							{#if lastResult.won}
								<p class="text-success font-semibold">WIN</p>
								<p class="text-sm">
									Won {formatValue(lastResult.payout)} on {lastResult.result}
								</p>
							{:else}
								<p class="text-destructive font-semibold">LOSS</p>
								<p class="text-sm">
									Lost {formatValue(lastResult.amountWagered)} on {lastResult.result}
								</p>
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<div class="space-y-4">
				<div>
					<div class="mb-2 block text-sm font-medium">Choose Number</div>
					<div class="grid grid-cols-3 gap-2">
						{#each Array(6) as _, i}
							<Button
								variant={selectedNumber === i + 1 ? 'default' : 'outline'}
								onclick={() => selectNumber(i + 1)}
								disabled={isRolling}
								class="h-16"
							>
								{i + 1}
							</Button>
						{/each}
					</div>
				</div>

				<div>
					<label for="bet-amount" class="mb-2 block text-sm font-medium">Bet Amount</label>
					<Input
						id="bet-amount"
						type="text"
						value={betAmountDisplay}
						oninput={handleBetAmountInput}
						onblur={handleBetAmountBlur}
						disabled={isRolling}
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
							onclick={() =>
								setBetAmount(Math.floor(Math.min(balance || 0, MAX_BET_AMOUNT) * 0.25))}
							disabled={isRolling}>25%</Button
						>
						<Button
							size="sm"
							variant="outline"
							onclick={() => setBetAmount(Math.floor(Math.min(balance || 0, MAX_BET_AMOUNT) * 0.5))}
							disabled={isRolling}>50%</Button
						>
						<Button
							size="sm"
							variant="outline"
							onclick={() =>
								setBetAmount(Math.floor(Math.min(balance || 0, MAX_BET_AMOUNT) * 0.75))}
							disabled={isRolling}>75%</Button
						>
						<Button
							size="sm"
							variant="outline"
							onclick={() => setBetAmount(Math.floor(Math.min(balance || 0, MAX_BET_AMOUNT)))}
							disabled={isRolling}>Max</Button
						>
					</div>
				</div>

				<Button class="h-12 w-full text-lg" onclick={rollDice} disabled={!canBet}>
					{isRolling ? 'Rolling...' : 'Roll'}
				</Button>
			</div>
		</div>
	</CardContent>
</Card>

<style>
	.dice-container {
		perspective: 1000px;
	}

	.dice {
		width: 100px;
		height: 100px;
		transform-style: preserve-3d;
		transform: rotate3d(0.9, 1, 0, 340deg);
		transition: transform 4s cubic-bezier(0.1, 0.9, 0.1, 1);
	}

	.face {
		position: absolute;
		width: 100px;
		height: 100px;
		background: #fff;
		border: 2px solid #363131;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		backface-visibility: hidden;
		box-sizing: border-box;
	}

	.face:nth-child(1) {
		transform: translateZ(50px);
	}
	.face:nth-child(2) {
		transform: rotateY(90deg) translateZ(50px);
	}
	.face:nth-child(3) {
		transform: rotateX(90deg) translateZ(50px);
	}
	.face:nth-child(4) {
		transform: rotateX(-90deg) translateZ(50px);
	}
	.face:nth-child(5) {
		transform: rotateY(-90deg) translateZ(50px);
	}
	.face:nth-child(6) {
		transform: rotateY(180deg) translateZ(50px);
	}

	.dot-container {
		width: 100%;
		height: 100%;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		grid-template-rows: repeat(3, 1fr);
		padding: 15%;
		gap: 10%;
		box-sizing: border-box;
	}

	.dot {
		background: #363131;
		border-radius: 50%;
		width: 100%;
		height: 100%;
	}

	/* Dot positions for each face */
	.face:nth-child(1) .dot {
		grid-area: 2 / 2;
	}
	.face:nth-child(2) .dot:nth-child(1) {
		grid-area: 1 / 1;
	}
	.face:nth-child(2) .dot:nth-child(2) {
		grid-area: 3 / 3;
	}
	.face:nth-child(3) .dot:nth-child(1) {
		grid-area: 1 / 1;
	}
	.face:nth-child(3) .dot:nth-child(2) {
		grid-area: 2 / 2;
	}
	.face:nth-child(3) .dot:nth-child(3) {
		grid-area: 3 / 3;
	}
	.face:nth-child(4) .dot:nth-child(1) {
		grid-area: 1 / 1;
	}
	.face:nth-child(4) .dot:nth-child(2) {
		grid-area: 1 / 3;
	}
	.face:nth-child(4) .dot:nth-child(3) {
		grid-area: 3 / 1;
	}
	.face:nth-child(4) .dot:nth-child(4) {
		grid-area: 3 / 3;
	}
	.face:nth-child(5) .dot:nth-child(1) {
		grid-area: 1 / 1;
	}
	.face:nth-child(5) .dot:nth-child(2) {
		grid-area: 1 / 3;
	}
	.face:nth-child(5) .dot:nth-child(3) {
		grid-area: 2 / 2;
	}
	.face:nth-child(5) .dot:nth-child(4) {
		grid-area: 3 / 1;
	}
	.face:nth-child(5) .dot:nth-child(5) {
		grid-area: 3 / 3;
	}
	.face:nth-child(6) .dot:nth-child(1) {
		grid-area: 1 / 1;
	}
	.face:nth-child(6) .dot:nth-child(2) {
		grid-area: 1 / 3;
	}
	.face:nth-child(6) .dot:nth-child(3) {
		grid-area: 2 / 1;
	}
	.face:nth-child(6) .dot:nth-child(4) {
		grid-area: 2 / 3;
	}
	.face:nth-child(6) .dot:nth-child(5) {
		grid-area: 3 / 1;
	}
	.face:nth-child(6) .dot:nth-child(6) {
		grid-area: 3 / 3;
	}
</style>
