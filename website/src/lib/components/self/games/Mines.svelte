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
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger
	} from '$lib/components/ui/select';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogTrigger
	} from '$lib/components/ui/dialog';
	import confetti from 'canvas-confetti';
	import { toast } from 'svelte-sonner';
	import { formatValue, playSound, showConfetti, showSchoolPrideCannons } from '$lib/utils';
	import { volumeSettings } from '$lib/stores/volume-settings';
	import { onMount, onDestroy } from 'svelte';
	import { ModeWatcher } from 'mode-watcher';

	interface MinesResult {
		won: boolean;
		newBalance: number;
		payout: number;
		amountWagered: number;
		sessionToken: string;
	}

	const GRID_SIZE = 5;
	const TOTAL_TILES = GRID_SIZE * GRID_SIZE;
	const MAX_BET_AMOUNT = 1000000;
	const MIN_MINES = 3;
	const AUTO_CASHOUT_TIME = 15; // 15 seconds total (10s game + 5s buffer)

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
	let lastResult = $state<MinesResult | null>(null);
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

		if (probability === 0) return 1.0;
		return Math.max(1.0, 1 / probability);
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

	function resetAutoCashoutTimer() {
		if (autoCashoutInterval) {
			clearInterval(autoCashoutInterval);
		}
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
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					sessionToken,
					tileIndex: index
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to reveal tile');
			}

			const result = await response.json();
			
			if (result.hitMine) {
				playSound('lose');
				revealedTiles = [...Array(TOTAL_TILES).keys()];
				minePositions = result.minePositions;
				isPlaying = false;
				resetAutoCashoutTimer();

				balance = result.newBalance;
				onBalanceUpdate?.(result.newBalance);
			}
 			else {
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
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					sessionToken
				})
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

			if (result.payout > betAmount) {
				showConfetti(confetti);
			}

			playSound(result.isAbort ? 'flip' : 'win');
			isPlaying = false;
			hasRevealedTile = false;
			isAutoCashout = false;
			resetAutoCashoutTimer();

			// Prevents the Tiles getting revealed when you Abort your bet.
			if (!result.isAbort) {
				revealedTiles = [...Array(TOTAL_TILES).keys()];
				minePositions = result.minePositions;
			}
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
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					betAmount,
					mineCount
				})
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
			lastResult = null;
			revealedTiles = [];
			clickedSafeTiles = [];
			currentMultiplier = 1;
			sessionToken = result.sessionToken;
		} catch (error) {
			console.error('Start game error:', error);
			toast.error('Failed to start game', {
				description: error instanceof Error ? error.message : 'Unknown error occurred'
			});
		}
	}

	// Dynmaically fetch the correct balance.
	onMount(async () => {
		volumeSettings.load();
		
		try {
			const response = await fetch('/api/portfolio/summary');
			if (!response.ok) {
				throw new Error('Failed to fetch portfolio summary');
			}
			const data = await response.json();
			balance = data.baseCurrencyBalance;
			onBalanceUpdate?.(data.baseCurrencyBalance);
		} catch (error) {
			console.error('Failed to fetch balance:', error);
		}
	});

	onDestroy(() => {
		resetAutoCashoutTimer();
	});
</script>

<Card>
	<CardHeader>
		<CardTitle>Mines</CardTitle>
		<CardDescription>
			Navigate through the minefield and cash out before hitting a mine!
			<Dialog>
				<DialogTrigger class="text-xs text-destructive hover:underline ml-1">
					Info
				</DialogTrigger>
				<DialogContent class="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Mines Game Information</DialogTitle>
					</DialogHeader>
					<div class="space-y-6">
						<div class="space-y-2">
							<h3 class="font-semibold text-lg">Winning Probabilities</h3>
							<p class="text-sm text-muted-foreground">
								The probability of winning increases with each safe tile you reveal. Here's how it works:
							</p>
							<div class="bg-muted p-4 rounded-lg space-y-3">
								<div class="text-sm">
									<p class="font-medium mb-2">For each tile you reveal:</p>
									<ul class="list-disc pl-6 space-y-1">
										<li>More mines = Higher risk = Higher potential payout</li>
										<li>Fewer mines = Lower risk = Lower potential payout</li>
										<li>Each safe tile increases your multiplier</li>
									</ul>
								</div>
								<div class="text-sm">
									<p class="font-medium mb-2">Example:</p>
									<p>With 3 mines on the board:</p>
									<ul class="list-disc pl-6 space-y-1">
										<li>First tile: 88% chance of being safe</li>
										<li>Second tile: 87% chance of being safe</li>
										<li>Third tile: 86% chance of being safe</li>
									</ul>
								</div>
							</div>
						</div>

						<div class="space-y-2">
							<h3 class="font-semibold text-lg">Game Rules & Information</h3>
							<div class="space-y-2 text-sm">
								<p class="text-muted-foreground">
									If you leave the page while playing:
								</p>
								<ul class="list-disc pl-6 space-y-1">
									<li>If you haven't revealed any tiles, your game session will be ended after 5 minutes of inactivity</li>
									<li>If you have revealed tiles, the auto cashout will process your gains within 15 seconds</li>
								</ul>
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>
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
							class:revealed={revealedTiles.includes(index)}
							class:mine={revealedTiles.includes(index) && minePositions.includes(index) && !clickedSafeTiles.includes(index)}
							class:safe={revealedTiles.includes(index) && !minePositions.includes(index) && clickedSafeTiles.includes(index)}
							class:light={document.documentElement.classList.contains('light')}
							onclick={() => handleTileClick(index)}
							disabled={!isPlaying}
						>
							{#if revealedTiles.includes(index)}
								{#if minePositions.includes(index)}
									<img
										src="/facedev/avif/bussin.avif"
										alt="Mine"
										class="h-8 w-8 object-contain"
									/>
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

			<!-- Right Side: Controls Things -->
			<div class="space-y-4">
				<!-- Mine Count Selector -->
                <div>
                    <label for="mine-count" class="block text-sm font-medium mb-2">Number of Mines</label>
                    <div id="mine-count" class="flex items-center gap-2">
                        <div class="flex gap-1 items-center">
                            <Button
                                size="sm"
                                variant="outline"
                                class="w-8 h-8 px-2 flex items-center justify-center"
                                onclick={() => mineCount = Math.max(MIN_MINES, mineCount - 1)}
                                disabled={isPlaying || mineCount <= MIN_MINES}
                            >
                             -
                            </Button>
                            <div class="text-center font-medium">{mineCount}</div>
                            <Button
                                size="sm"
                                variant="outline"
                                class="w-8 h-8 px-2 flex items-center justify-center"
                                onclick={() => mineCount = Math.min(24, mineCount + 1)}
                                disabled={isPlaying || mineCount >= 24}
                            >
                                +
                            </Button>
                            <p>Mines</p>
                        </div>
                    </div>
                </div>

				<!-- Bet Amount -->
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

				<!-- Percentage Quick Actions -->
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

				<!-- Action Buttons -->
				<div class="flex flex-col gap-2">
					{#if !isPlaying}
						<Button class="h-12 flex-1 text-lg" onclick={startGame} disabled={!canBet}>
							Start Game
						</Button>
					{:else}
						<!-- Auto Cashout Timer -->
						{#if hasRevealedTile}
							<div class="space-y-1">
								<div class="h-px w-full bg-border"></div>
								<div class="text-center text-xs text-muted-foreground">
									Auto Cashout in {Math.ceil(AUTO_CASHOUT_TIME - autoCashoutTimer)}s
								</div>
								<div class="h-1 w-full bg-muted rounded-full overflow-hidden">
									<div
										class="h-full bg-primary transition-all duration-100"
										class:urgent={autoCashoutTimer >= 7}
										style="width: {autoCashoutProgress}%"
									></div>
								</div>
								<div class="h-px w-full bg-border"></div>
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
										+{formatValue(betAmount * (calculateRawMultiplier(revealedTiles.length + 1, mineCount) - 1))}
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