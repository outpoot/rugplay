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
	import { onMount, onDestroy } from 'svelte';
	import { ModeWatcher } from 'mode-watcher';
	import { fetchPortfolioSummary } from '$lib/stores/portfolio-data';

	const GRID_SIZE = 5;
	const TOTAL_TILES = GRID_SIZE * GRID_SIZE;
	const MAX_BET_AMOUNT = 1000000;
	const MIN_MINES = 3;
	const AUTO_CASHOUT_TIME = 15;
	const MIN_BET_AMOUNT = 0.01;

	let {
		balance = $bindable(),
		onBalanceUpdate
	}: {
		balance: number;
		onBalanceUpdate?: (newBalance: number) => void;
	} = $props();

	let betAmount = $state(10);
	let betAmountDisplay = $state('10');
	let mineCount = $state(3);
	let isPlaying = $state(false);
	let revealedTiles = $state<number[]>([]);
	let minePositions = $state<number[]>([]);
	let currentMultiplier = $state(1);
	let autoCashoutTimer = $state(0);
	let autoCashoutProgress = $state(0);
	let sessionToken = $state<string | null>(null);
	let autoCashoutInterval: ReturnType<typeof setInterval>;
	let hasRevealedTile = $state(false);
	let isAutoCashout = $state(false);
	let lastClickedTile = $state<number | null>(null);
	let clickedSafeTiles = $state<number[]>([]);

	let canBet = $derived(
		betAmount > 0 && betAmount <= balance && betAmount <= MAX_BET_AMOUNT && !isPlaying
	);

	function calculateProbability(picks: number, mines: number): string {
		let probability = 1;
		for (let i = 0; i < picks; i++) {
			probability *= (TOTAL_TILES - mines - i) / (TOTAL_TILES - i);
		}
		return (probability * 100).toFixed(2);
	}

	function calculateRawMultiplier(picks: number, mines: number): number {
		let probability = 1;
		for (let i = 0; i < picks; i++) {
			probability *= (TOTAL_TILES - mines - i) / (TOTAL_TILES - i);
		}
		return probability === 0 ? 1.0 : Math.max(1.0, 1 / probability);
	}

	function setBetAmount(amount: number) {
		const clamped = Math.min(amount, Math.min(balance, MAX_BET_AMOUNT));
		if (clamped >= 0) {
			betAmount = clamped;
			betAmountDisplay = clamped.toLocaleString();
		}
	}

	function handleBetAmountInput(event: Event) {
		const input = (event.target as HTMLInputElement).value.replace(/,/g, '');
		let num = parseFloat(input);

		if (!isFinite(num) || num < MIN_BET_AMOUNT) {
			num = MIN_BET_AMOUNT;
		}

		const clamped = Math.min(num, Math.min(balance, MAX_BET_AMOUNT));

		betAmount = clamped;
		betAmountDisplay = clamped.toString();
	}

	function handleBetAmountBlur() {
		betAmountDisplay = betAmount.toLocaleString();
	}

	function resetAutoCashoutTimer() {
		if (autoCashoutInterval) clearInterval(autoCashoutInterval);
		autoCashoutTimer = 0;
		autoCashoutProgress = 0;
	}

	function startAutoCashoutTimer() {
		if (!hasRevealedTile) return;
		resetAutoCashoutTimer();
		autoCashoutInterval = setInterval(() => {
			if (autoCashoutTimer < AUTO_CASHOUT_TIME) {
				autoCashoutTimer += 0.1;
				autoCashoutProgress = (autoCashoutTimer / AUTO_CASHOUT_TIME) * 100;
			}
			if (autoCashoutTimer >= AUTO_CASHOUT_TIME) {
				isAutoCashout = true;
				clearInterval(autoCashoutInterval);
				cashOut();
			}
		}, 100);
	}

	async function handleTileClick(index: number) {
		if (!isPlaying || revealedTiles.includes(index) || !sessionToken) return;
		lastClickedTile = index;
		try {
			const response = await fetch('/api/gambling/mines/reveal', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionToken, tileIndex: index })
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to reveal tile');
			}
			const result = await response.json();
			if (result.hitMine) {
				playSound('lose');
				revealedTiles = [...revealedTiles, index];
				minePositions = result.minePositions;
				isPlaying = false;
				resetAutoCashoutTimer();
				balance = result.newBalance;
				onBalanceUpdate?.(result.newBalance);
			} else {
				playSound('flip');
				revealedTiles = [...revealedTiles, index];
				clickedSafeTiles = [...clickedSafeTiles, index];
				currentMultiplier = result.currentMultiplier;
				hasRevealedTile = true;
				startAutoCashoutTimer();
				if (result.status === 'won') {
					showSchoolPrideCannons(confetti);
					showConfetti(confetti);
					await cashOut();
				}
			}
		} catch (error) {
			console.error('Mines error:', error);
			toast.error('Failed to reveal tile', {
				description: error instanceof Error ? error.message : 'Unknown error occurred'
			});
		}
	}

	async function cashOut() {
		if (!isPlaying || !sessionToken) return;
		try {
			const response = await fetch('/api/gambling/mines/cashout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionToken })
			});
			if (!response.ok) {
				const errorData = await response.json();
				if (!isAutoCashout || errorData.error !== 'Invalid session') {
					throw new Error(errorData.error || 'Failed to cash out');
				}
				return;
			}
			const result = await response.json();
			balance = result.newBalance;
			onBalanceUpdate?.(balance);
			if (result.payout > betAmount) showConfetti(confetti);
			playSound(result.isAbort ? 'flip' : 'win');
			isPlaying = false;
			hasRevealedTile = false;
			isAutoCashout = false;
			resetAutoCashoutTimer();
			minePositions = [];
		} catch (error) {
			console.error('Cashout error:', error);
			toast.error('Failed to cash out', {
				description: error instanceof Error ? error.message : 'Unknown error occurred'
			});
		}
	}

	async function startGame() {
		if (!canBet) return;
		balance -= betAmount;
		onBalanceUpdate?.(balance);
		try {
			const response = await fetch('/api/gambling/mines/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ betAmount, mineCount })
			});
			if (!response.ok) {
				const errorData = await response.json();
				balance += betAmount;
				onBalanceUpdate?.(balance);
				throw new Error(errorData.error || 'Failed to start game');
			}
			const result = await response.json();
			isPlaying = true;
			hasRevealedTile = false;
			revealedTiles = [];
			clickedSafeTiles = [];
			currentMultiplier = 1;
			sessionToken = result.sessionToken;
			minePositions = [];
		} catch (error) {
			console.error('Start game error:', error);
			toast.error('Failed to start game', {
				description: error instanceof Error ? error.message : 'Unknown error occurred'
			});
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

	onDestroy(resetAutoCashoutTimer);
</script>

<Card>
	<CardHeader>
		<CardTitle>Mines</CardTitle>
		<CardDescription>
			Navigate through the minefield and cash out before hitting a mine!
		</CardDescription>
	</CardHeader>
	<CardContent>
		<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
			<!-- Left Side: Grid and Stats -->
			<div class="flex flex-col space-y-4">
				<!-- Balance Display -->
				<div class="text-center">
					<p class="text-muted-foreground text-sm">Balance</p>
					<p class="text-2xl font-bold">{formatValue(balance)}</p>
				</div>

				<!-- Mines Grid -->
				<div class="mines-grid" class:pulse-warning={isPlaying && autoCashoutTimer >= 7}>
					{#each Array(TOTAL_TILES) as _, index}
						<ModeWatcher />
						<button
							class="mine-tile"
							onclick={() => handleTileClick(index)}
							disabled={!isPlaying}
							class:revealed={revealedTiles.includes(index)}
							class:mine={revealedTiles.includes(index) &&
								minePositions.includes(index) &&
								!clickedSafeTiles.includes(index)}
							class:safe={revealedTiles.includes(index) &&
								!minePositions.includes(index) &&
								clickedSafeTiles.includes(index)}
							class:light={document.documentElement.classList.contains('light')}
							aria-label="Tile"
						>
							{#if revealedTiles.includes(index)}
								{#if minePositions.includes(index)}
									<img src="/facedev/avif/bussin.avif" alt="Mine" class="h-8 w-8 object-contain" />
								{:else}
									<img
										src="/facedev/avif/twoblade.avif"
										alt="Safe"
										class="h-8 w-8 object-contain"
									/>
								{/if}
							{/if}
						</button>
					{/each}
				</div>
			</div>
			<!-- Right Side: Controls -->
			<div class="space-y-4">
				<div>
					<label for="mine-count" class="mb-2 block text-sm font-medium">Number of Mines</label>
					<div class="flex items-center gap-2">
						<Button
							variant="secondary"
							size="sm"
							onclick={() => (mineCount = Math.max(mineCount - 1, MIN_MINES))}
							disabled={isPlaying || mineCount <= MIN_MINES}
							aria-label="Decrease mines">-</Button
						>
						<Input
							id="mine-count"
							type="number"
							min={MIN_MINES}
							max={24}
							value={mineCount}
							oninput={(e) => {
								const target = e.target as HTMLInputElement | null;
								const val = Math.max(
									MIN_MINES,
									Math.min(24, parseInt(target?.value ?? '') || MIN_MINES)
								);
								mineCount = val;
							}}
							disabled={isPlaying}
							class="w-12 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
						/>
						<Button
							variant="secondary"
							size="sm"
							onclick={() => (mineCount = Math.min(mineCount + 1, 24))}
							disabled={isPlaying || mineCount >= 24}
							aria-label="Increase mines">+</Button
						>
					</div>
					<p class="text-muted-foreground mt-1 text-xs">
						You will get
						<span class="text-success font-semibold">
							{calculateRawMultiplier(isPlaying ? revealedTiles.length + 1 : 1, mineCount).toFixed(
								2
							)}x
						</span>
						per tile, probability of winning:
						<span class="text-success font-semibold">
							{calculateProbability(isPlaying ? 1 : 1, mineCount)}%
						</span>
					</p>
					<span class="text-muted-foreground text-xs">
						Note: Maximum payout per game is capped at $2,000,000.
					</span>
				</div>
				<div>
					<label for="bet-amount" class="mb-2 block text-sm font-medium">Bet Amount</label>
					<Input
						id="bet-amount"
						type="text"
						value={betAmountDisplay}
						oninput={handleBetAmountInput}
						onblur={handleBetAmountBlur}
						disabled={isPlaying}
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
							onclick={() => setBetAmount(Math.floor(Math.min(balance, MAX_BET_AMOUNT) * 0.25))}
							disabled={isPlaying}>25%</Button
						>
						<Button
							size="sm"
							variant="outline"
							onclick={() => setBetAmount(Math.floor(Math.min(balance, MAX_BET_AMOUNT) * 0.5))}
							disabled={isPlaying}>50%</Button
						>
						<Button
							size="sm"
							variant="outline"
							onclick={() => setBetAmount(Math.floor(Math.min(balance, MAX_BET_AMOUNT) * 0.75))}
							disabled={isPlaying}>75%</Button
						>
						<Button
							size="sm"
							variant="outline"
							onclick={() => setBetAmount(Math.floor(Math.min(balance, MAX_BET_AMOUNT)))}
							disabled={isPlaying}>Max</Button
						>
					</div>
				</div>
				<div class="flex flex-col gap-2">
					{#if !isPlaying}
						<Button class="h-12 flex-1 text-lg" onclick={startGame} disabled={!canBet}>
							Start Game
						</Button>
					{:else}
						{#if hasRevealedTile}
							<div class="space-y-1">
								<div class="bg-border h-px w-full"></div>
								<div class="text-muted-foreground text-center text-xs">
									Auto Cashout in {Math.ceil(AUTO_CASHOUT_TIME - autoCashoutTimer)}s
								</div>
								<div class="bg-muted h-1 w-full overflow-hidden rounded-full">
									<div
										class="bg-primary h-full transition-all duration-100"
										class:urgent={autoCashoutTimer >= 7}
										style="width: {autoCashoutProgress}%"
									></div>
								</div>
								<div class="bg-border h-px w-full"></div>
							</div>
						{/if}
						<Button class="h-12 flex-1 text-lg" onclick={cashOut} disabled={!isPlaying}>
							{hasRevealedTile ? 'Cash Out' : 'Abort Bet'}
						</Button>
						<!-- Current Stats -->
						{#if hasRevealedTile}
							<div class="bg-muted/50 space-y-2 rounded-lg p-3">
								<div class="flex justify-between">
									<span>Current Profit:</span>
									<span class="text-success">
										+{formatValue(betAmount * (currentMultiplier - 1))}
									</span>
								</div>
								<div class="flex justify-between">
									<span>Next Tile:</span>
									<span>
										+{formatValue(
											betAmount * (calculateRawMultiplier(revealedTiles.length + 1, mineCount) - 1)
										)}
									</span>
								</div>
								<div class="flex justify-between">
									<span>Current Multiplier:</span>
									<span>{currentMultiplier.toFixed(2)}x</span>
								</div>
							</div>
						{/if}
					{/if}
				</div>
			</div>
		</div>
	</CardContent>
</Card>

<style>
	.mines-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 4px;
		background: var(--muted);
		border: 2px solid var(--border);
		border-radius: var(--radius);
		padding: 8px;
		transition: all 0.3s ease;
	}

	.mines-grid.pulse-warning {
		position: relative;
	}

	.mines-grid.pulse-warning::before {
		content: '';
		position: absolute;
		top: -2px;
		right: -2px;
		bottom: -2px;
		left: -2px;
		border: 2px solid var(--ring);
		border-radius: var(--radius);
		animation: pulse 1s ease-in-out infinite;
	}

	@keyframes pulse {
		0% {
			opacity: 0.4;
		}
		50% {
			opacity: 1;
		}
		100% {
			opacity: 0.4;
		}
	}

	.urgent {
		position: relative;
	}

	.urgent::before {
		content: '';
		position: absolute;
		top: -2px;
		right: -2px;
		bottom: -2px;
		left: -2px;
		border: 2px solid var(--ring);
		border-radius: 9999px;
		animation: pulse 0.5s ease-in-out infinite;
	}

	.mine-tile {
		aspect-ratio: 1;
		background: var(--card);
		border: 1px solid black;
		border-radius: calc(var(--radius) - 2px);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		transform-style: preserve-3d;
		position: relative;
		cursor: pointer;
	}

	.mine-tile:hover:not(:disabled) {
		background: var(--accent);
	}

	.mine-tile.revealed {
		background: var(--muted);
		transform: rotateY(180deg);
	}

	.mine-tile.mine {
		background-color: rgba(239, 68, 68, 0.3);
		border: 2px solid rgb(239, 68, 68);
	}

	.mine-tile.mine img {
		filter: brightness(0.9) contrast(1.4);
	}

	.mine-tile.safe {
		background-color: rgba(34, 197, 94, 0.2);
		border: 2px solid rgb(34, 197, 94);
	}

	.mine-tile img {
		backface-visibility: hidden;
		transform: rotateY(180deg);
		width: 32px;
		height: 32px;
		object-fit: contain;
	}
</style>
