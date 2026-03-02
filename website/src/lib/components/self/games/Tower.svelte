<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import confetti from 'canvas-confetti';
	import { toast } from 'svelte-sonner';
	import {
		formatValue,
		playSound,
		showConfetti,
		showSchoolPrideCannons,
		calculateTowerMultiplier,
		twr_difficulty_config,
		type TowerDifficulty
	} from '$lib/utils';
	import { volumeSettings } from '$lib/stores/volume-settings';
	import { onMount } from 'svelte';
	import { fetchPortfolioSummary } from '$lib/stores/portfolio-data';

	const twr_floors = 10;
	const max_bet = 1000000;

	let {
		balance = $bindable(),
		onBalanceUpdate
	}: {
		balance: number;
		onBalanceUpdate?: (newBalance: number) => void;
	} = $props();

	let bet = $state(10);
	let betDisplay = $state('10');
	let difficulty = $state<TowerDifficulty>('easy');
	let playing = $state(false);
	let floor = $state(0);
	let multiplier = $state(1);
	let token = $state<string | null>(null);
	let safePicks = $state<Record<number, number>>({});
	let allBombs = $state<number[][] | null>(null);
	let bombFloor = $state<number | null>(null);
	let busy = $state(false);
	let justRevealed = $state<string | null>(null);
	let gameResult = $state<'won' | 'lost' | null>(null);

	const floorList = Array.from({ length: twr_floors }, (_, i) => twr_floors - 1 - i);

	let canBet = $derived(bet > 0 && bet <= balance && bet <= max_bet && !playing);

	function floorStatus(f: number): 'locked' | 'active' | 'cleared' | 'bomb-hit' | 'revealed' {
		if (playing) {
			if (f < floor) return 'cleared';
			if (f === floor) return 'active';
			return 'locked';
		}
		if (allBombs) {
			if (f === bombFloor) return 'bomb-hit';
			if (f < floor) return 'cleared';
			return 'revealed';
		}
		return 'locked';
	}

	function tileStatus(f: number, t: number, fs: ReturnType<typeof floorStatus>): 'hidden' | 'safe' | 'bomb' {
		if (fs === 'bomb-hit' || fs === 'cleared' || fs === 'revealed') {
			if (allBombs && allBombs[f].includes(t)) return 'bomb';
			if (safePicks[f] === t) return 'safe';
		}
		return 'hidden';
	}

	function setBet(amount: number) {
		const v = Math.min(amount, Math.min(balance, max_bet));
		if (v >= 0) { bet = v; betDisplay = v.toLocaleString(); }
	}

	function onBetInput(e: Event) {
		const raw = (e.target as HTMLInputElement).value.replace(/,/g, '');
		const n = parseFloat(raw) || 0;
		bet = Math.min(n, Math.min(balance, max_bet));
		betDisplay = raw;
	}

	async function step(f: number, t: number) {
		if (!playing || f !== floor || busy) return;
		busy = true;
		try {
			const res = await fetch('/api/arcade/tower/step', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionToken: token, tileIndex: t })
			});
			if (!res.ok) throw new Error((await res.json()).error || 'Failed');
			const data = await res.json();
			if (data.hitBomb) {
				playSound('lose');
				bombFloor = f;
				allBombs = data.allBombPositions;
				playing = false;
				token = null;
				gameResult = 'lost';
				balance = data.newBalance;
				onBalanceUpdate?.(data.newBalance);
			} else {
				justRevealed = `${f}-${t}`;
				setTimeout(() => (justRevealed = null), 400);
				playSound('flip');
				safePicks = { ...safePicks, [f]: t };
				floor = data.currentFloor;
				multiplier = data.currentMultiplier;
				if (data.status === 'won') {
					allBombs = data.allBombPositions;
					playing = false;
					token = null;
					gameResult = 'won';
					balance = data.newBalance;
					onBalanceUpdate?.(data.newBalance);
					if (data.payout > bet) showConfetti(confetti);
					showSchoolPrideCannons(confetti);
					playSound('win');
				}
			}
		} catch (err) {
			toast.error('Failed', { description: err instanceof Error ? err.message : 'Unknown error' });
		} finally {
			busy = false;
		}
	}

	async function cashout() {
		if (!playing || !token || busy) return;
		busy = true;
		try {
			const res = await fetch('/api/arcade/tower/cashout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionToken: token })
			});
			if (!res.ok) throw new Error((await res.json()).error || 'Failed');
			const data = await res.json();
			balance = data.newBalance;
			onBalanceUpdate?.(balance);
			allBombs = data.allBombPositions;
			if (data.payout > bet) showConfetti(confetti);
			playSound(data.isAbort ? 'flip' : 'win');
			playing = false;
			token = null;
			if (!data.isAbort) gameResult = 'won';
		} catch (err) {
			toast.error('Failed to cash out', { description: err instanceof Error ? err.message : 'Unknown error' });
		} finally {
			busy = false;
		}
	}

	async function start() {
		if (!canBet) return;
		gameResult = null;
		balance -= bet;
		onBalanceUpdate?.(balance);
		try {
			const res = await fetch('/api/arcade/tower/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ betAmount: bet, difficulty })
			});
			if (!res.ok) {
				balance += bet;
				onBalanceUpdate?.(balance);
				throw new Error((await res.json()).error || 'Failed');
			}
			const data = await res.json();
			playing = true;
			floor = 0;
			multiplier = 1;
			safePicks = {};
			allBombs = null;
			bombFloor = null;
			token = data.sessionToken;
		} catch (err) {
			toast.error('Failed to start', { description: err instanceof Error ? err.message : 'Unknown error' });
		}
	}

	onMount(async () => {
		volumeSettings.load();
		try {
			const data = await fetchPortfolioSummary();
			if (data) { balance = data.baseCurrencyBalance; onBalanceUpdate?.(data.baseCurrencyBalance); }
		} catch {}
	});
</script>

<Card>
	<CardHeader>
		<CardTitle>Tower</CardTitle>
		<CardDescription>Climb the tower by picking safe tiles. Cash out before hitting a bomb!</CardDescription>
	</CardHeader>
	<CardContent>
		<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
			<div class="flex flex-col gap-[3px]">
				{#if gameResult === 'won'}
					<div class="win-banner mb-2">Top reached! 🏆</div>
				{:else if gameResult === 'lost'}
					<div class="lose-banner mb-2">Bombed out 💥</div>
				{/if}

				{#each floorList as f}
					{@const fs = floorStatus(f)}
					{@const cfg = twr_difficulty_config[difficulty]}
					{@const isActive = fs === 'active'}
					<div
						class="tower-floor"
						class:floor-active={isActive}
						class:floor-cleared={fs === 'cleared'}
						class:floor-bomb={fs === 'bomb-hit'}
						class:floor-revealed={fs === 'revealed'}
						class:floor-locked={fs === 'locked'}
					>
						<span class="arrow-indicator">{isActive ? '▶' : ''}</span>
						<span class="floor-label" class:label-active={isActive} class:label-cleared={fs === 'cleared'}>{f + 1}</span>
						<span
							class="floor-mult"
							class:mult-active={isActive}
							class:mult-cleared={fs === 'cleared'}
						>{calculateTowerMultiplier(f + 1, difficulty).toFixed(2)}x</span>
						<div class="flex flex-1 justify-center gap-2">
							{#each Array(cfg.tiles) as _, t}
								{@const ts = tileStatus(f, t, fs)}
								{@const key = `${f}-${t}`}
								<button
									class="tower-tile"
									class:tile-active={isActive}
									class:tile-safe={ts === 'safe'}
									class:tile-bomb={ts === 'bomb'}
									class:tile-pop={justRevealed === key}
									onclick={() => step(f, t)}
									disabled={!isActive || busy}
									aria-label="Tile {t + 1} floor {f + 1}"
								>
									{#if ts === 'safe'}
										<img src="/facedev/avif/twoblade.avif" alt="Safe" class="h-5 w-5 object-contain" />
									{:else if ts === 'bomb'}
										<img src="/facedev/avif/bussin.avif" alt="Bomb" class="h-5 w-5 object-contain" />
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>

			<div class="space-y-4">
				<div class="text-center">
					<p class="text-muted-foreground text-sm">Balance</p>
					<p class="text-2xl font-bold">{formatValue(balance)}</p>
				</div>

				<div>
					<label class="mb-2 block text-sm font-medium">Difficulty</label>
					<div class="grid grid-cols-3 gap-2">
						{#each (['easy', 'medium', 'hard'] as TowerDifficulty[]) as d}
							<Button
								variant={difficulty === d ? 'default' : 'outline'}
								size="sm"
								onclick={() => (difficulty = d)}
								disabled={playing}
							>
								{twr_difficulty_config[d].label}
							</Button>
						{/each}
					</div>
					<p class="text-muted-foreground mt-1 text-xs">
						{twr_difficulty_config[difficulty].tiles - twr_difficulty_config[difficulty].bombs} safe /
						{twr_difficulty_config[difficulty].tiles} tiles per floor
					</p>
				</div>

				<div>
					<label for="tower-bet" class="mb-2 block text-sm font-medium">Bet Amount</label>
					<Input
						id="tower-bet"
						type="text"
						value={betDisplay}
						oninput={onBetInput}
						onblur={() => (betDisplay = bet.toLocaleString())}
						disabled={playing}
						placeholder="Enter bet amount"
					/>
					<p class="text-muted-foreground mt-1 text-xs">Max bet: {max_bet.toLocaleString()}</p>
				</div>

				<div class="grid grid-cols-4 gap-2">
					{#each [0.25, 0.5, 0.75, 1] as pct}
						<Button
							size="sm"
							variant="outline"
							onclick={() => setBet(Math.floor(Math.min(balance, max_bet) * pct))}
							disabled={playing}
						>
							{pct === 1 ? 'Max' : `${pct * 100}%`}
						</Button>
					{/each}
				</div>

				<div class="flex flex-col gap-2">
					{#if !playing}
						<Button class="h-12 w-full text-lg" onclick={start} disabled={!canBet}>
							Start Game
						</Button>
					{:else}
						<Button class="h-12 w-full text-lg" onclick={cashout} disabled={busy}>
							{floor === 0 ? 'Abort Bet' : 'Cash Out'}
						</Button>
					{/if}

					{#if playing && floor > 0}
						<div class="bg-muted/50 space-y-2 rounded-lg p-3">
							<div class="flex justify-between">
								<span class="text-sm">Profit:</span>
								<span class="text-success text-sm font-medium">+{formatValue(bet * (multiplier - 1))}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-sm">Next floor:</span>
								<span class="text-sm">+{formatValue(bet * (calculateTowerMultiplier(floor + 1, difficulty) - 1))}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-sm">Multiplier:</span>
								<span class="text-sm font-medium">{multiplier.toFixed(2)}x</span>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</CardContent>
</Card>

<style>
	.win-banner {
		text-align: center;
		font-weight: 700;
		font-size: 13px;
		padding: 6px 10px;
		border-radius: calc(var(--radius) - 2px);
		background: rgba(34, 197, 94, 0.15);
		border: 1px solid rgba(34, 197, 94, 0.4);
		color: rgb(34, 197, 94);
		animation: fade-in 0.3s ease;
	}

	.lose-banner {
		text-align: center;
		font-weight: 700;
		font-size: 13px;
		padding: 6px 10px;
		border-radius: calc(var(--radius) - 2px);
		background: rgba(239, 68, 68, 0.12);
		border: 1px solid rgba(239, 68, 68, 0.35);
		color: rgb(239, 68, 68);
		animation: fade-in 0.3s ease;
	}

	.tower-floor {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 3px 6px;
		border-radius: calc(var(--radius) - 2px);
		border: 1px solid transparent;
		transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
	}

	.floor-active {
		border-color: var(--primary);
		background: color-mix(in srgb, var(--primary) 10%, transparent);
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--primary) 25%, transparent);
	}

	.floor-cleared { background: rgba(34, 197, 94, 0.07); }
	.floor-bomb { background: rgba(239, 68, 68, 0.14); border-color: rgba(239, 68, 68, 0.5); }
	.floor-revealed { opacity: 0.35; }
	.floor-locked { opacity: 0.25; }

	.arrow-indicator {
		width: 10px;
		font-size: 9px;
		color: var(--primary);
		flex-shrink: 0;
		text-align: center;
	}

	.floor-label {
		font-size: 11px;
		color: var(--muted-foreground);
		width: 14px;
		text-align: right;
		flex-shrink: 0;
		transition: color 0.15s ease;
	}

	.label-active { color: var(--primary); font-weight: 600; }
	.label-cleared { color: rgb(34, 197, 94); }

	.floor-mult {
		font-size: 11px;
		color: var(--muted-foreground);
		width: 44px;
		text-align: right;
		flex-shrink: 0;
		font-variant-numeric: tabular-nums;
		transition: color 0.15s ease, font-weight 0.15s ease;
	}

	.mult-active { color: var(--primary); font-weight: 700; }
	.mult-cleared { color: rgb(34, 197, 94); font-weight: 600; }

	.tower-tile {
		width: 52px;
		height: 36px;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: calc(var(--radius) - 4px);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.12s ease, border-color 0.12s ease, transform 0.12s ease;
		cursor: not-allowed;
	}

	.tile-active {
		cursor: pointer;
		border-color: color-mix(in srgb, var(--primary) 60%, transparent);
		animation: tile-pulse 2s ease-in-out infinite;
	}

	.tile-active:hover:not(:disabled) {
		background: var(--accent);
		transform: translateY(-3px);
		border-color: var(--primary);
		box-shadow: 0 3px 8px color-mix(in srgb, var(--primary) 20%, transparent);
	}

	.tile-active:active:not(:disabled) { transform: translateY(0); }

	.tile-safe {
		background-color: rgba(34, 197, 94, 0.2);
		border: 2px solid rgb(34, 197, 94);
		cursor: default;
	}

	.tile-bomb {
		background-color: rgba(239, 68, 68, 0.3);
		border: 2px solid rgb(239, 68, 68);
		cursor: default;
		animation: shake 0.4s ease;
	}

	.tile-pop { animation: pop 0.35s ease forwards; }

	@keyframes tile-pulse {
		0%, 100% { box-shadow: none; }
		50% { box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 20%, transparent); }
	}

	@keyframes pop {
		0% { transform: scale(1); }
		40% { transform: scale(1.25); }
		100% { transform: scale(1); }
	}

	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		20% { transform: translateX(-4px); }
		40% { transform: translateX(4px); }
		60% { transform: translateX(-3px); }
		80% { transform: translateX(3px); }
	}

	@keyframes fade-in {
		from { opacity: 0; transform: translateY(-4px); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>