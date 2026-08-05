<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { Badge } from '$lib/components/ui/badge';
	import * as Tooltip from '$lib/components/ui/tooltip';
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
	import { haptic } from '$lib/stores/haptics';
	import { onMount, onDestroy } from 'svelte';
	import { fetchPortfolioSummary } from '$lib/stores/portfolio-data';
	import { PUBLIC_WEBSOCKET_URL } from '$env/static/public';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { TradeUpIcon, Target03Icon, Clock01Icon } from '@hugeicons/core-free-icons';

	type RoundStatus = 'waiting' | 'running' | 'crashed';

	// Mirrors server-side constants (server module can't be imported client-side)
	const MAX_BET_AMOUNT = 100_000;
	const MIN_BET_AMOUNT = 0.01;
	const WAITING_MS = 8000;
	const PAUSE_MS = 5000;
	const MAX_CRASH_POINT = 10_000;
	// Fixed chart scale — the Y-axis uses a constant log range so the curve grows
	// upward naturally instead of re-normalizing every frame (which made the graph
	// shrink/diminish as the multiplier passed ~1.5x).
	const CHART_MAX_MULTIPLIER = 100;
	const CHART_MAX_POINTS = 400;

	let {
		balance = $bindable(),
		onBalanceUpdate
	}: {
		balance: number;
		onBalanceUpdate?: (newBalance: number) => void;
	} = $props();

	let bet = $state(10);
	let betDisplay = $state('10');
	let playing = $state(false);
	let hasBet = $state(false);
	let cashedOut = $state(false);
	let busy = $state(false);
	let roundStatus = $state<RoundStatus>('waiting');
	let currentMultiplier = $state(1);
	let crashPoint = $state<number | null>(null);
	let roundId = $state(0);
	let serverSeedHash = $state('');
	let serverSeed = $state<string | null>(null);
	let nonce = $state(0);
	let waitingStartedAt = $state(0);
	let startTime = $state(0);
	let crashedAt = $state(0);
	let betCount = $state(0);
	let history = $state<
		{
			roundId: number;
			crashPoint: number;
			serverSeed: string;
			serverSeedHash: string;
			nonce: number;
			crashedAt: number;
		}[]
	>([]);
	let myBetAmount = $state(0);
	let myPayout = $state(0);
	let myMultiplier = $state(0);
	let lastResult = $state<'won' | 'lost' | null>(null);
	let lastPayout = $state(0);
	let shaking = $state(false);
	let connected = $state(false);

	// Auto cash-out
	let autoCashoutEnabled = $state(false);
	let autoCashoutTarget = $state(2);
	let autoCashoutDisplay = $state('2.00');
	let autoCashoutTriggered = $state(false);

	// Countdown bars
	let waitingProgress = $state(0);
	let waitingRemaining = $state(0);
	let pauseProgress = $state(0);
	let pauseRemaining = $state(0);

	// Chart state
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let chartPoints: { x: number; y: number }[] = [];
	let chartAnimationId: number | null = null;
	let uiTickInterval: ReturnType<typeof setInterval> | null = null;
	let resizeObserver: ResizeObserver | null = null;

	// WebSocket
	let ws: WebSocket | null = null;
	let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;

	let canBet = $derived(
		bet > 0 &&
			bet <= balance &&
			bet <= MAX_BET_AMOUNT &&
			roundStatus === 'waiting' &&
			!hasBet &&
			!playing
	);

	let riskColor = $derived(
		roundStatus === 'crashed'
			? '#ef4444'
			: currentMultiplier >= 5
				? '#f59e0b'
				: currentMultiplier >= 2
					? '#eab308'
					: '#22c55e'
	);

	function setBet(amount: number) {
		const v = Math.min(amount, Math.min(balance, MAX_BET_AMOUNT));
		if (v >= 0) {
			bet = v;
			betDisplay = v.toLocaleString();
		}
	}

	function onBetInput(e: Event) {
		const raw = (e.target as HTMLInputElement).value.replace(/,/g, '');
		const n = parseFloat(raw) || 0;
		bet = Math.min(n, Math.min(balance, MAX_BET_AMOUNT));
		betDisplay = raw;
	}

	function onAutoCashoutInput(e: Event) {
		const raw = (e.target as HTMLInputElement).value;
		const n = parseFloat(raw) || 0;
		autoCashoutTarget = Math.max(1.01, n);
		autoCashoutDisplay = raw;
	}

	// --- Canvas rendering (DPI aware, gradient fill, glowing tip) ---
	function resizeCanvas() {
		if (!canvas || !ctx) return;
		const dpr = window.devicePixelRatio || 1;
		const rect = canvas.getBoundingClientRect();
		const w = Math.max(1, Math.floor(rect.width));
		const h = Math.max(1, Math.floor(rect.height));
		canvas.width = Math.floor(w * dpr);
		canvas.height = Math.floor(h * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		drawChart();
	}

	function resetChart() {
		chartPoints = [{ x: 0, y: 1 }];
		if (ctx && canvas) {
			ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
		}
	}

	function hexToRgb(hex: string): string {
		const m = hex.replace('#', '');
		const r = parseInt(m.substring(0, 2), 16);
		const g = parseInt(m.substring(2, 4), 16);
		const b = parseInt(m.substring(4, 6), 16);
		return `${r},${g},${b}`;
	}

	function drawChart() {
		if (!ctx || !canvas) return;
		const w = canvas.clientWidth;
		const h = canvas.clientHeight;
		ctx.clearRect(0, 0, w, h);

		// Background grid
		ctx.strokeStyle = 'rgba(128,128,128,0.12)';
		ctx.lineWidth = 1;
		for (let i = 1; i < 5; i++) {
			const y = (h / 5) * i;
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(w, y);
			ctx.stroke();
		}
		for (let i = 1; i < 6; i++) {
			const x = (w / 6) * i;
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, h);
			ctx.stroke();
		}

		if (chartPoints.length < 2) return;

		// Fixed scales — the curve grows naturally without re-normalizing.
		// Y-axis: constant log range from 1x to CHART_MAX_MULTIPLIER, so the curve
		// always starts at the bottom and climbs upward as the multiplier grows.
		// X-axis: scrolling window over the last CHART_MAX_POINTS points, so the
		// curve moves rightward and scrolls left instead of compressing.
		const maxLogY = Math.log(CHART_MAX_MULTIPLIER);
		const logRange = maxLogY; // log(1) = 0
		const firstX = chartPoints[0].x;
		const lastX = chartPoints[chartPoints.length - 1].x;
		const xRange = Math.max(1, lastX - firstX);
		const toXY = (p: { x: number; y: number }) => {
			const x = ((p.x - firstX) / xRange) * w;
			const logY = Math.log(Math.max(p.y, 1));
			const y = h - (logY / logRange) * (h - 24) - 12;
			return [x, y] as const;
		};

		const strokeColor = roundStatus === 'crashed' ? '#ef4444' : riskColor;
		const rgb = hexToRgb(strokeColor);

		// Gradient fill under the curve
		const gradient = ctx.createLinearGradient(0, 0, 0, h);
		gradient.addColorStop(0, `rgba(${rgb},0.35)`);
		gradient.addColorStop(1, `rgba(${rgb},0)`);

		ctx.beginPath();
		const [fx] = toXY(chartPoints[0]);
		ctx.moveTo(fx, h);
		for (let i = 0; i < chartPoints.length; i++) {
			const [x, y] = toXY(chartPoints[i]);
			ctx.lineTo(x, y);
		}
		const [lx] = toXY(chartPoints[chartPoints.length - 1]);
		ctx.lineTo(lx, h);
		ctx.closePath();
		ctx.fillStyle = gradient;
		ctx.fill();

		// Glowing stroke on top of the curve
		ctx.save();
		ctx.shadowColor = strokeColor;
		ctx.shadowBlur = 12;
		ctx.strokeStyle = strokeColor;
		ctx.lineWidth = 3;
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
		ctx.beginPath();
		for (let i = 0; i < chartPoints.length; i++) {
			const [x, y] = toXY(chartPoints[i]);
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();
		ctx.restore();

		// Glowing tip
		const last = chartPoints[chartPoints.length - 1];
		const [tx, ty] = toXY(last);
		ctx.save();
		ctx.shadowColor = strokeColor;
		ctx.shadowBlur = 18;
		ctx.beginPath();
		ctx.arc(tx, ty, 5, 0, Math.PI * 2);
		ctx.fillStyle = strokeColor;
		ctx.fill();
		ctx.restore();
	}

	function addChartPoint(mult: number) {
		const x = chartPoints.length > 0 ? chartPoints[chartPoints.length - 1].x + 1 : 0;
		chartPoints.push({ x, y: mult });
		if (chartPoints.length > CHART_MAX_POINTS) chartPoints.shift();
		drawChart();
	}

	function animateChart() {
		if (roundStatus !== 'running') return;

		if (startTime > 0) {
			const elapsed = Date.now() - startTime;
			const mult = Math.floor(Math.exp(0.1 * (elapsed / 1000)) * 100) / 100;
			currentMultiplier = mult;
			addChartPoint(mult);
		}

		chartAnimationId = requestAnimationFrame(animateChart);
	}

	function triggerShake() {
		shaking = true;
		setTimeout(() => (shaking = false), 400);
	}

	function crashBurst() {
		try {
			confetti({
				particleCount: 60,
				spread: 100,
				startVelocity: 35,
				colors: ['#ef4444', '#f97316', '#7f1d1d'],
				origin: { x: 0.5, y: 0.45 },
				ticks: 60,
				scalar: 0.9
			});
		} catch {}
	}

	// --- UI countdown ticker (waiting / pause phases) ---
	function tickCountdowns() {
		const now = Date.now();
		if (roundStatus === 'waiting' && waitingStartedAt > 0) {
			const elapsed = now - waitingStartedAt;
			waitingProgress = Math.min(100, (elapsed / WAITING_MS) * 100);
			waitingRemaining = Math.max(0, WAITING_MS - elapsed);
		}
		if (roundStatus === 'crashed' && crashedAt > 0) {
			const elapsed = now - crashedAt;
			pauseProgress = Math.min(100, (elapsed / PAUSE_MS) * 100);
			pauseRemaining = Math.max(0, PAUSE_MS - elapsed);
		}
	}

	function connectWS() {
		if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
		try {
			ws = new WebSocket(PUBLIC_WEBSOCKET_URL);
			ws.onopen = () => {
				connected = true;
			};
			ws.onmessage = (event) => {
				try {
					const msg = JSON.parse(event.data);
					if (msg.type === 'crash_round') {
						handleRoundUpdate(msg);
					}
				} catch (e) {
					console.error('Crash WS parse error:', e);
				}
			};
			ws.onclose = () => {
				ws = null;
				connected = false;
				if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
				wsReconnectTimer = setTimeout(connectWS, 5000);
			};
			ws.onerror = () => {
				ws?.close();
			};
		} catch (e) {
			console.error('Crash WS connect error:', e);
		}
	}

	function handleRoundUpdate(msg: any) {
		roundId = msg.roundId;
		roundStatus = msg.status;
		serverSeedHash = msg.serverSeedHash;
		nonce = msg.nonce;
		waitingStartedAt = msg.waitingStartedAt;
		startTime = msg.startTime;
		crashedAt = msg.crashedAt;
		betCount = msg.betCount;

		if (msg.status === 'waiting') {
			crashPoint = null;
			serverSeed = null;
			resetChart();
			currentMultiplier = 1;
			autoCashoutTriggered = false;
			// Reset bet state for new round
			hasBet = false;
			cashedOut = false;
			playing = false;
			lastResult = null;
			lastPayout = 0;
			myBetAmount = 0;
			myPayout = 0;
			myMultiplier = 0;
		} else if (msg.status === 'running') {
			crashPoint = null;
			serverSeed = null;
			resetChart();
			currentMultiplier = 1;
			if (chartAnimationId) cancelAnimationFrame(chartAnimationId);
			chartAnimationId = requestAnimationFrame(animateChart);
		} else if (msg.status === 'crashed') {
			crashPoint = msg.crashPoint;
			serverSeed = msg.serverSeed;
			if (chartAnimationId) cancelAnimationFrame(chartAnimationId);
			chartAnimationId = null;
			addChartPoint(msg.crashPoint);
			currentMultiplier = msg.crashPoint;
			playing = false;
			triggerShake();
			crashBurst();
			haptic.trigger('error');
			// If we had a bet and didn't cash out, we lost
			if (hasBet && !cashedOut) {
				lastResult = 'lost';
				lastPayout = 0;
				playSound('lose');
			}
			hasBet = false;
			cashedOut = false;

			// Prepend the newly crashed round to the recent-crashes history without
			// waiting for a page refresh / state refetch. Guard against duplicates
			// in case of reconnect replays or duplicate broadcasts.
			if (msg.historyEntry && !history.some((h) => h.roundId === msg.historyEntry.roundId)) {
				history = [msg.historyEntry, ...history].slice(0, 50);
			}
		}
	}

	async function loadState() {
		try {
			const res = await fetch('/api/arcade/crash/state');
			if (!res.ok) return;
			const data = await res.json();
			if (data.round) {
				roundId = data.round.roundId;
				roundStatus = data.round.status;
				serverSeedHash = data.round.serverSeedHash;
				serverSeed = data.round.serverSeed;
				nonce = data.round.nonce;
				waitingStartedAt = data.round.waitingStartedAt;
				startTime = data.round.startTime;
				crashedAt = data.round.crashedAt;
				betCount = data.round.betCount;
				currentMultiplier = data.round.currentMultiplier;

				if (data.round.status === 'running') {
					resetChart();
					if (chartAnimationId) cancelAnimationFrame(chartAnimationId);
					chartAnimationId = requestAnimationFrame(animateChart);
				} else if (data.round.status === 'crashed') {
					resetChart();
					crashPoint = data.round.crashPoint;
					addChartPoint(data.round.crashPoint);
					currentMultiplier = data.round.crashPoint;
				}
			}
			if (data.userBet) {
				hasBet = true;
				myBetAmount = data.userBet.betAmount;
				if (data.userBet.cashedOut) {
					cashedOut = true;
					myPayout = data.userBet.payout || 0;
					myMultiplier = data.userBet.cashoutMultiplier || 0;
				}
			}
			if (data.history) {
				history = data.history;
			}
		} catch (e) {
			console.error('Crash load state error:', e);
		}
	}

	async function placeBet() {
		if (!canBet || busy) return;
		busy = true;
		try {
			const res = await fetch('/api/arcade/crash/bet', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ amount: bet })
			});
			if (!res.ok) throw new Error((await res.json()).error || 'Failed');
			const data = await res.json();
			balance = data.newBalance;
			onBalanceUpdate?.(data.newBalance);
			hasBet = true;
			myBetAmount = bet;
			playing = true;
			autoCashoutTriggered = false;
			haptic.trigger('light');
			playSound('flip');
		} catch (err) {
			toast.error('Failed to place bet', {
				description: err instanceof Error ? err.message : 'Unknown error'
			});
		} finally {
			busy = false;
		}
	}

	async function cashout() {
		if (!hasBet || cashedOut || roundStatus !== 'running' || busy) return;
		busy = true;
		try {
			const res = await fetch('/api/arcade/crash/cashout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});
			if (!res.ok) throw new Error((await res.json()).error || 'Failed');
			const data = await res.json();
			balance = data.newBalance;
			onBalanceUpdate?.(data.newBalance);
			cashedOut = true;
			myPayout = data.payout;
			myMultiplier = data.multiplier;
			lastResult = 'won';
			lastPayout = data.payout;
			playing = false;
			if (data.payout > myBetAmount) {
				haptic.trigger('success');
				showConfetti(confetti);
				playSound('win');
			} else {
				playSound('flip');
			}
		} catch (err) {
			// Round likely crashed right before the request landed
			toast.error('Failed to cash out', {
				description: err instanceof Error ? err.message : 'Unknown error'
			});
		} finally {
			busy = false;
		}
	}

	// Client-side auto cash-out: fires once the live multiplier reaches the target.
	$effect(() => {
		if (
			autoCashoutEnabled &&
			hasBet &&
			!cashedOut &&
			!autoCashoutTriggered &&
			roundStatus === 'running' &&
			currentMultiplier >= autoCashoutTarget &&
			!busy
		) {
			autoCashoutTriggered = true;
			cashout();
		}
	});

	onMount(async () => {
		if (canvas) {
			ctx = canvas.getContext('2d');
			resizeCanvas();
			resizeObserver = new ResizeObserver(() => resizeCanvas());
			resizeObserver.observe(canvas);
		}
		volumeSettings.load();
		uiTickInterval = setInterval(tickCountdowns, 100);
		try {
			const data = await fetchPortfolioSummary();
			if (data) {
				balance = data.baseCurrencyBalance;
				onBalanceUpdate?.(data.baseCurrencyBalance);
			}
		} catch {}
		await loadState();
		connectWS();
	});

	onDestroy(() => {
		if (chartAnimationId) cancelAnimationFrame(chartAnimationId);
		if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
		if (uiTickInterval) clearInterval(uiTickInterval);
		resizeObserver?.disconnect();
		ws?.close();
	});
</script>

<Card>
	<CardHeader>
		<div class="flex items-center justify-between">
			<div>
				<CardTitle class="flex items-center gap-2">
					<HugeiconsIcon icon={TradeUpIcon} class="h-5 w-5" />
					Crash
				</CardTitle>
				<CardDescription>Watch the multiplier climb and cash out before it crashes!</CardDescription>
			</div>
			<Badge
				variant="outline"
				class="gap-1.5 {roundStatus === 'running'
					? 'border-green-500/40 text-green-500'
					: roundStatus === 'crashed'
						? 'border-red-500/40 text-red-500'
						: 'border-yellow-500/40 text-yellow-500'}"
			>
				<span
					class="h-1.5 w-1.5 rounded-full {roundStatus === 'running'
						? 'animate-pulse bg-green-500'
						: roundStatus === 'crashed'
							? 'bg-red-500'
							: 'animate-pulse bg-yellow-500'}"
				></span>
				{roundStatus === 'running' ? 'Live' : roundStatus === 'crashed' ? 'Crashed' : 'Betting Open'}
			</Badge>
		</div>
	</CardHeader>
	<CardContent>
		<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
			<!-- Chart -->
			<div class="md:col-span-2">
				<div
					class="crash-chart-wrap relative overflow-hidden rounded-lg border"
					class:shake={shaking}
					class:crashed-flash={roundStatus === 'crashed' && shaking}
				>
					<canvas bind:this={canvas} class="h-64 w-full md:h-80"></canvas>

					<!-- Overlay: big multiplier readout -->
					<div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
						{#if roundStatus === 'waiting'}
							<div class="text-center">
								<p class="text-muted-foreground mb-2 text-sm">Next round starting in</p>
								<p class="text-4xl font-bold tabular-nums">
									{(waitingRemaining / 1000).toFixed(1)}s
								</p>
								<div class="bg-muted mt-3 h-1.5 w-40 overflow-hidden rounded-full">
									<div
										class="bg-primary h-full transition-all duration-100"
										style="width: {waitingProgress}%"
									></div>
								</div>
							</div>
						{:else if roundStatus === 'running'}
							<p
								class="crash-multiplier text-5xl font-extrabold tabular-nums transition-transform duration-150 md:text-6xl"
								style="color: {riskColor}; transform: scale({1 + Math.min(currentMultiplier / 40, 0.25)});"
							>
								{currentMultiplier.toFixed(2)}x
							</p>
						{:else if roundStatus === 'crashed'}
							<div class="text-center">
								<p class="text-4xl font-extrabold text-red-500 md:text-5xl">
									Crashed @ {crashPoint?.toFixed(2)}x
								</p>
								<p class="text-muted-foreground mt-2 text-xs">
									Next round in {(pauseRemaining / 1000).toFixed(1)}s
								</p>
								<div class="bg-muted mx-auto mt-2 h-1 w-32 overflow-hidden rounded-full">
									<div
										class="h-full bg-red-500/70 transition-all duration-100"
										style="width: {pauseProgress}%"
									></div>
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- History -->
				<div class="mt-4">
					<p class="text-muted-foreground mb-2 text-sm">Recent crashes</p>
					<div class="flex flex-wrap gap-2">
						{#each history.slice(0, 20) as h (h.roundId)}
							<Tooltip.Root>
								<Tooltip.Trigger>
									<span
										class="history-chip rounded px-2 py-1 font-mono text-xs {h.crashPoint < 1.5
											? 'bg-red-500/10 text-red-500'
											: h.crashPoint < 2
												? 'bg-orange-500/10 text-orange-500'
												: h.crashPoint < 5
													? 'bg-yellow-500/10 text-yellow-500'
													: 'bg-green-500/10 text-green-500'}"
									>
										{h.crashPoint.toFixed(2)}x
									</span>
								</Tooltip.Trigger>
								<Tooltip.Content class="max-w-64">
									<p class="text-xs font-medium">Round #{h.roundId} — {h.crashPoint.toFixed(2)}x</p>
									<p class="text-muted-foreground mt-1 break-all font-mono text-[10px]">
										Seed: {h.serverSeed}
									</p>
									<p class="text-muted-foreground break-all font-mono text-[10px]">
										Hash: {h.serverSeedHash.slice(0, 24)}…
									</p>
								</Tooltip.Content>
							</Tooltip.Root>
						{/each}
						{#if history.length === 0}
							<p class="text-muted-foreground text-xs">No rounds played yet</p>
						{/if}
					</div>
				</div>
			</div>

			<!-- Controls -->
			<div class="space-y-4">
				<div class="text-center">
					<p class="text-muted-foreground text-sm">Balance</p>
					<p class="text-2xl font-bold">{formatValue(balance)}</p>
				</div>

				<div>
					<label for="crash-bet" class="mb-2 block text-sm font-medium">Bet Amount</label>
					<div class="flex gap-2">
						<Button
							size="icon"
							variant="outline"
							class="shrink-0"
							onclick={() => setBet(bet / 2)}
							disabled={hasBet || roundStatus !== 'waiting'}
							aria-label="Halve bet">½</Button
						>
						<Input
							id="crash-bet"
							type="text"
							value={betDisplay}
							oninput={onBetInput}
							onblur={() => (betDisplay = bet.toLocaleString())}
							disabled={hasBet || roundStatus !== 'waiting'}
							placeholder="Enter bet amount"
						/>
						<Button
							size="icon"
							variant="outline"
							class="shrink-0"
							onclick={() => setBet(bet * 2)}
							disabled={hasBet || roundStatus !== 'waiting'}
							aria-label="Double bet">2×</Button
						>
					</div>
					<p class="text-muted-foreground mt-1 text-xs">
						Min bet: {formatValue(MIN_BET_AMOUNT)} • Max bet: {MAX_BET_AMOUNT.toLocaleString()}
					</p>
				</div>

				<div class="grid grid-cols-4 gap-2">
					{#each [0.25, 0.5, 0.75, 1] as pct}
						<Button
							size="sm"
							variant="outline"
							onclick={() => setBet(Math.floor(Math.min(balance, MAX_BET_AMOUNT) * pct))}
							disabled={hasBet || roundStatus !== 'waiting'}
						>
							{pct === 1 ? 'Max' : `${pct * 100}%`}
						</Button>
					{/each}
				</div>

				<!-- Auto cash-out -->
				<div class="bg-muted/40 space-y-2 rounded-lg border p-3">
					<div class="flex items-center justify-between">
						<label for="auto-cashout-toggle" class="flex items-center gap-1.5 text-sm font-medium">
							<HugeiconsIcon icon={Target03Icon} class="h-4 w-4" />
							Auto Cash Out
						</label>
						<Switch
							id="auto-cashout-toggle"
							bind:checked={autoCashoutEnabled}
							disabled={hasBet}
						/>
					</div>
					{#if autoCashoutEnabled}
						<div class="flex items-center gap-2">
							<Input
								type="text"
								value={autoCashoutDisplay}
								oninput={onAutoCashoutInput}
								onblur={() => (autoCashoutDisplay = autoCashoutTarget.toFixed(2))}
								disabled={hasBet}
								class="h-8 text-sm"
							/>
							<span class="text-muted-foreground text-sm">x</span>
						</div>
					{/if}
				</div>

				<div class="flex flex-col gap-2">
					{#if !hasBet}
						<Button class="h-12 w-full text-lg" onclick={placeBet} disabled={!canBet || busy}>
							{roundStatus === 'waiting' ? 'Place Bet' : 'Betting Closed'}
						</Button>
					{:else if !cashedOut}
						<Button
							class="cashout-btn h-12 w-full text-lg"
							onclick={cashout}
							disabled={roundStatus !== 'running' || busy}
						>
							Cash Out at {currentMultiplier.toFixed(2)}x
						</Button>
					{:else}
						<Button class="h-12 w-full text-lg" disabled>
							Cashed Out at {myMultiplier.toFixed(2)}x
						</Button>
					{/if}

					{#if hasBet}
						<div class="bg-muted/50 space-y-2 rounded-lg p-3">
							<div class="flex justify-between">
								<span class="text-sm">Bet:</span>
								<span class="text-sm font-medium">{formatValue(myBetAmount)}</span>
							</div>
							{#if cashedOut}
								<div class="flex justify-between">
									<span class="text-sm">Payout:</span>
									<span class="text-success text-sm font-medium">{formatValue(myPayout)}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-sm">Multiplier:</span>
									<span class="text-sm font-medium">{myMultiplier.toFixed(2)}x</span>
								</div>
							{:else}
								<div class="flex justify-between">
									<span class="text-sm">Current value:</span>
									<span class="text-sm font-medium"
										>{formatValue(myBetAmount * currentMultiplier)}</span
									>
								</div>
								<div class="flex justify-between">
									<span class="text-sm">Profit:</span>
									<span class="text-success text-sm font-medium"
										>+{formatValue(myBetAmount * (currentMultiplier - 1))}</span
									>
								</div>
							{/if}
						</div>
					{/if}

					{#if lastResult === 'won'}
						<div class="rounded-lg border border-green-500/40 bg-green-500/10 p-3 text-center">
							<p class="font-bold text-green-500">You won {formatValue(lastPayout)}!</p>
						</div>
					{:else if lastResult === 'lost'}
						<div class="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-center">
							<p class="font-bold text-red-500">You lost {formatValue(myBetAmount)}!</p>
						</div>
					{/if}
				</div>

				<div class="text-muted-foreground space-y-1 text-xs">
					<p class="flex items-center gap-1">
						<HugeiconsIcon icon={Clock01Icon} class="h-3 w-3" />
						Round #{roundId} • {betCount} bet{betCount === 1 ? '' : 's'} • {connected
							? 'connected'
							: 'reconnecting…'}
					</p>
					<Tooltip.Root>
						<Tooltip.Trigger class="cursor-help break-all font-mono underline decoration-dotted">
							Seed hash: {serverSeedHash.slice(0, 20)}…
						</Tooltip.Trigger>
						<Tooltip.Content class="max-w-72">
							<p class="text-xs">
								This round's crash point is derived from a secret server seed, revealed only
								after the round crashes. The hash above is published in advance so you can
								verify it wasn't changed afterwards.
							</p>
							{#if serverSeed}
								<p class="text-muted-foreground mt-1 break-all font-mono text-[10px]">
									Seed: {serverSeed}
								</p>
							{/if}
						</Tooltip.Content>
					</Tooltip.Root>
				</div>
			</div>
		</div>
	</CardContent>
</Card>

<style>
	.crash-chart-wrap {
		background: radial-gradient(ellipse at bottom, var(--muted) 0%, var(--background) 100%);
		transition: box-shadow 0.2s ease;
	}

	.crash-multiplier {
		text-shadow: 0 0 24px currentColor;
	}

	:global(.cashout-btn) {
		animation: cashout-pulse 1.4s ease-in-out infinite;
	}

	.history-chip {
		transition: transform 0.15s ease;
	}

	.history-chip:hover {
		transform: translateY(-2px) scale(1.05);
	}

	@keyframes cashout-pulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
		}
		50% {
			box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
		}
	}

	@keyframes shake {
		10%,
		90% {
			transform: translateX(-1px);
		}
		20%,
		80% {
			transform: translateX(2px);
		}
		30%,
		50%,
		70% {
			transform: translateX(-4px);
		}
		40%,
		60% {
			transform: translateX(4px);
		}
	}

	.shake {
		animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
	}

	.crashed-flash {
		box-shadow: inset 0 0 60px 10px rgba(239, 68, 68, 0.35);
	}
</style>
