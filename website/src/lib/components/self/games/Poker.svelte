<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { formatValue } from '$lib/utils';
	import { volumeSettings } from '$lib/stores/volume-settings';
	import { fetchPortfolioSummary } from '$lib/stores/portfolio-data';
	import { analyze } from './poker/lib/handAnalysis';
	import PokerTableUI from './poker/components/PokerTableUI.svelte';
	import PokerLobby from './poker/components/PokerLobby.svelte';
	import PokerJoinDialog from './poker/components/PokerJoinDialog.svelte';
	import type { GameState } from './poker/types';
	import {
		screen, gameState, me, turn, isHost, isSpectator, canStart, toCall, canCheck, canCall, canRaise,
		turnTimeLeft, turnProgress, raiseAmount, raiseDisplay, raiseDisabled, raiseInvalid, isLoading, playerActionLabels
	} from './poker/stores';
	import { createTable, requestJoin, reenterAndJoin, startHand, Action, leaveTable, copyInviteLink, setBalanceStore, setOnBalanceUpdate, refreshState } from './poker/api/actions';
	import { startTurnTimer, resetTurnTimer, stopTurnTimer, checkAndResetTimer, ensureTurnTimerRunning } from './poker/api/timer';
	import { handleRaiseInput, handleRaiseBlur, setRaise } from './poker/api/handlers';
	import { handleStateUpdate } from './poker/api/effects';


    /*
        Poker is a crapton of dogshit, multiplayer is hard and its overall hard to make.
        So the engine, table and most of the logic is just "adapted" from codepen projects to stackoverflow.
        And since it is fairly complicated, its split into a really large amount of files.

        This is the main one, the rest is in poker split up into the respective parts.
        Large chunks from blackjack as well
    */

	let { balance = $bindable(), onBalanceUpdate, code = '' }: { balance: number; onBalanceUpdate?: (newBalance: number) => void; code?: string } = $props();
	let pollInterval: ReturnType<typeof setInterval> | null = null;

	$effect(() => {
		setBalanceStore(balance);
		if (onBalanceUpdate) setOnBalanceUpdate(onBalanceUpdate);
	});

	$effect(() => {
		if ($turn && $me && $gameState) {
			const minTotal = (get(toCall) || 0) + ($gameState.minRaise ?? 0);
			raiseAmount.set(minTotal);
			raiseDisplay.set(minTotal.toLocaleString());
		}
	});

	$effect(() => {
		const effectiveRaise = Math.max(0, (get(raiseAmount) || 0) - (get(toCall) || 0));
		const minRaise = $gameState?.minRaise ?? 0;
		const myChips = $me?.chips ?? Infinity;
		const wouldAllIn = (get(toCall) || 0) + effectiveRaise >= myChips;
		raiseDisabled.set(Boolean($isLoading || (effectiveRaise < minRaise && !wouldAllIn)));
		raiseInvalid.set(Boolean(!$isLoading && effectiveRaise < minRaise && !wouldAllIn));
	});

	function startPolling() {
		if (pollInterval) clearInterval(pollInterval);
		pollInterval = setInterval(refreshState, 3000);
	}

	function stopPolling() {
		if (pollInterval) {
			clearInterval(pollInterval);
			pollInterval = null;
		}
	}

	$effect(() => {
		if ($screen === 'table' && $gameState) startPolling();
		else stopPolling();
	});

	$effect(() => {
		if ($screen === 'table' && $gameState && $gameState?.phase !== 'waiting' && $gameState?.phase !== 'showdown' && $turn && !$isLoading) {
			const shouldReset = checkAndResetTimer($gameState.activePlayerIndex);
			if (shouldReset) startTurnTimer();
			else ensureTurnTimerRunning();
		} else {
			resetTurnTimer();
		}
	});

	onMount(async () => {
		volumeSettings.load();
		try {
			const data = await fetchPortfolioSummary();
			if (data) {
				balance = data.baseCurrencyBalance;
				onBalanceUpdate?.(data.baseCurrencyBalance);
			}
		} catch {}

		let alreadyAtTable = false;
		try {
			const res = await fetch('/api/arcade/poker');
			if (res.ok) {
				const { table } = await res.json();
				if (table) {
					gameState.set(table);
					screen.set('table');
					alreadyAtTable = true;
				}
			}
		} catch {}

		if (!alreadyAtTable && code && /^\d{4}$/.test(code)) {
			await requestJoin(code);
		}
	});

	onDestroy(() => {
		stopPolling();
		stopTurnTimer();
	});
</script>

<Card>
	<CardHeader>
		<div class="flex items-start justify-between">
			<div>
				<CardTitle>Poker</CardTitle>
				<CardDescription>Play with friends!</CardDescription>
			</div>
			<div class="text-right">
				<p class="text-muted-foreground text-xs">Balance</p>
				<p class="text-lg font-bold">{formatValue(balance)}</p>
			</div>
		</div>
	</CardHeader>

	<CardContent class="space-y-4 p-0">
		{#if $screen === 'lobby'}
			<PokerLobby/>
		{:else if $gameState}
			<div class="pk-table">
				<div class="pk-code-row">
					<span class="pk-code-badge">Room: <strong>{$gameState.code}</strong></span>
					<div class="flex items-center gap-2">
						<span class="text-muted-foreground text-xs">
							{$gameState.players.length}/{$gameState.maxPlayers} players
							{#if $gameState.handNumber > 0} / Hand #{$gameState.handNumber}{/if}
						</span>
						<Button size="sm" variant="outline" onclick={copyInviteLink} disabled={!$gameState?.code}>
							Copy Link
						</Button>
					</div>
				</div>

				<PokerTableUI gameState={$gameState} me={$me} myHandAnalysis={analyze($me, $gameState?.communityCards ?? [])} playerActionLabels={$playerActionLabels} />
			</div>

			<!-- got its own showdown phase where it basically dispalys all possible outcomes respectively to the users -->
			{#if $gameState.phase === 'showdown' && $gameState.winners}
				{@const iWon = $gameState.winners.some(w => w.userId === $me?.userId)}
				<div class="pk-winners">
					{#if iWon}
						<div class="pk-result-banner pk-result-win">You won!</div>
					{:else if $isSpectator}
						<div class="pk-result-banner pk-result-spectator">
							<div>Looks like you're a Spectator. This hand is over, do you want to join?</div>
							<div style="margin-top:0.6rem;">
								<Button onclick={reenterAndJoin}>Join for {formatValue($gameState.buyIn)}</Button>
							</div>
						</div>
					{:else if $me && $me.chips <= 0}
						<div class="pk-result-banner pk-result-bust">
							<div>Out of chips! You can re-join though.</div>
							<div style="margin-top:0.6rem;">
								<Button onclick={reenterAndJoin}>Re-buy</Button>
							</div>
						</div>
					{:else}
						<div class="pk-result-banner pk-result-lose">You lost this hand</div>
					{/if}
					{#each $gameState.winners as w}
						{@const isMe = w.userId === $me?.userId}
						<div class="pk-winner-row" class:pk-winner-me={isMe}>
							<span class="font-semibold">{isMe ? 'You' : $gameState.players.find((p) => p.userId === w.userId)?.username ?? '?'}</span>
							<span class="text-muted-foreground text-xs">{w.handName}</span>
							<span class="font-bold" class:text-green-500={isMe}>+{formatValue(w.amount)}</span>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Displays the stuff for the player list, room code etc. (man I use etc often dont i?) -->
			<div class="space-y-3 px-6 pb-6">
				{#if $gameState.phase === 'waiting' || $gameState.phase === 'showdown'}
					<div class="pk-player-list">
						<div class="pk-player-list-header">
							<span class="text-xs font-semibold">Players ({$gameState.players.length}/{$gameState.maxPlayers})</span>
							<span class="pk-code-label">Code: <strong>{$gameState.code}</strong></span>
						</div>
						{#each $gameState.players as player, i}
							<div class="pk-player-row">
								<span class="pk-player-name">
									{#if player.avatar}
										<img src={"/api/proxy/s3/" + player.avatar} alt="{player.username} avatar" class="pk-avatar pk-avatar-sm" onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} />
									{:else}
										<div class="pk-avatar pk-avatar-fallback pk-avatar-sm">{player.username[0].toUpperCase()}</div>
									{/if}
									{i === $gameState.yourIndex ? 'You' : player.username}
									{#if player.userId === $gameState.hostUserId}
										<span class="pk-tag-host">HOST</span>
									{/if}
								</span>
								<span class="pk-chips">{formatValue(player.chips)}</span>
							</div>
						{/each}
						{#if $isSpectator && $gameState.phase === 'waiting'}
							<div class="pk-player-row pk-spectator-join">
								<span class="text-sm">You are spectating</span>
								<Button size="sm" onclick={reenterAndJoin}>Join as Player (for {formatValue($gameState.buyIn)})</Button>
							</div>
						{/if}
						{#if $gameState.players.length < $gameState.maxPlayers}
							<div class="pk-player-row pk-player-empty">
								<span class="text-muted-foreground text-xs italic">Empty seat</span>
							</div>
						{/if}
					</div>

					<div class="flex gap-2">
						{#if $isHost}
							<Button class="flex-1" disabled={!$canStart || $isLoading} onclick={startHand}>
								{#if $gameState.players.filter((p) => p.chips > 0).length < 2}
									Waiting for players?
								{:else if $gameState.handNumber === 0}
									Start Game
								{:else}
									Deal Next Hand
								{/if}
							</Button>
						{:else}
							<p class="text-muted-foreground flex-1 self-center text-center text-sm">Waiting for host</p>
						{/if}
						<Button onclick={leaveTable} disabled={$isLoading}>Leave</Button>
					</div>
				{:else if $turn}
                    <!-- The buttons to raise, dcall and the auto fold stuff-->
					<div class="space-y-1">
						<div class="text-muted-foreground text-center text-xs">
							Auto-fold in {Math.ceil($turnTimeLeft)}s
						</div>
						<div class="pk-turn-timer-track">
							<div class="pk-turn-timer-fill" class:pk-turn-timer-urgent={$turnTimeLeft <= 10} style={`width: ${$turnProgress}%`}></div>
						</div>
					</div>
					<div class="grid grid-cols-3 gap-2">
						<Button onclick={() => Action('fold')} disabled={$isLoading}>Fold</Button>
						{#if $canCheck}
							<Button variant="outline" onclick={() => Action('check')} disabled={$isLoading}>Check</Button>
						{:else if $canCall}
							<Button onclick={() => Action('call')} disabled={$isLoading}>Call {formatValue(Math.min(get(toCall), $me?.chips ?? 0))}</Button>
						{/if}
						<Button onclick={() => Action('all_in')} disabled={$isLoading || !$me || $me.chips <= 0}>All In</Button>
					</div>
					{#if $canRaise}
						<div class="flex gap-2">
							<Input type="text" value={$raiseDisplay} oninput={handleRaiseInput} onblur={handleRaiseBlur} placeholder="Raise amount" disabled={$isLoading} class={`flex-1 ${$raiseInvalid ? 'border-red-500' : ''}`} />
							<Button onclick={() => Action('raise', Math.max(0, get(raiseAmount) - get(toCall)))} disabled={$raiseDisabled}>Raise</Button>
						</div>
						{#if $raiseInvalid}
							<p class="text-destructive text-xs mt-1">Min: {formatValue((get(toCall) || 0) + ($gameState?.minRaise ?? 0))}</p>
						{/if}
						<div class="grid grid-cols-4 gap-1">
							<Button size="sm" variant="outline" onclick={() => setRaise(0.25, $me?.chips ?? 0, get(toCall), $gameState?.minRaise ?? 0)}>25%</Button>
							<Button size="sm" variant="outline" onclick={() => setRaise(0.5, $me?.chips ?? 0, get(toCall), $gameState?.minRaise ?? 0)}>50%</Button>
							<Button size="sm" variant="outline" onclick={() => setRaise(0.75, $me?.chips ?? 0, get(toCall), $gameState?.minRaise ?? 0)}>75%</Button>
							<Button size="sm" variant="outline" onclick={() => setRaise(1, $me?.chips ?? 0, get(toCall), $gameState?.minRaise ?? 0)}>Max</Button>
						</div>
					{/if}
					<div class="mt-2">
						<Button class="w-full" onclick={leaveTable} disabled={$isLoading}>Leave Table</Button>
					</div>
				{:else}
					<p class="text-muted-foreground text-center text-sm">
						{#if $me?.folded}
							You folded this hand.
						{:else if $me?.allIn}
							All-in. Waiting for showdown
						{:else}
							Waiting for {$gameState.players[$gameState.activePlayerIndex]?.username ?? '?'} to act
						{/if}
					</p>
					<Button class="pk-leave w-full" onclick={leaveTable} disabled={$isLoading}>Leave Table</Button>
				{/if}
			</div>
		{/if}
	</CardContent>
</Card>

<PokerJoinDialog {balance} />

<!-- CSS Heavily copied from codepen -->
<style>
	.pk-table {
		background: var(--muted);
		border-top: 1px solid var(--border);
		border-bottom: 1px solid var(--border);
		padding: 16px 20px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.pk-code-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.pk-code-badge {
		font-size: 0.7rem;
		padding: 3px 10px;
		border-radius: 6px;
		background: var(--background);
		border: 1px solid var(--border);
		color: var(--foreground);
		letter-spacing: 0.15em;
	}
	.pk-avatar {
		width: 24px;
		height: 24px;
		border-radius: 999px;
		object-fit: cover;
		border: 1px solid var(--border);
		flex-shrink: 0;
	}
	.pk-avatar-sm {
		width: 18px;
		height: 18px;
	}
	.pk-avatar-fallback {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in oklch, var(--primary) 15%, transparent);
		color: var(--primary);
		font-size: 0.65rem;
		font-weight: 800;
	}
	.pk-chips {
		font-size: 0.68rem;
		font-weight: 600;
		color: var(--muted-foreground);
		font-variant-numeric: tabular-nums;
	}
	.pk-turn-timer-track {
		height: 6px;
		width: 100%;
		background: var(--muted);
		border-radius: 999px;
		overflow: hidden;
		border: 1px solid var(--border);
	}
	.pk-turn-timer-fill {
		height: 100%;
		background: color-mix(in oklch, var(--primary) 65%, transparent);
		transition: width 0.1s linear;
	}
	.pk-turn-timer-urgent {
		background: color-mix(in oklch, var(--destructive) 75%, transparent);
	}

	.pk-winners {
		padding: 0 20px 8px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.pk-winner-row {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.8rem;
		padding: 6px 10px;
		border-radius: 6px;
		background: color-mix(in oklch, var(--success) 8%, transparent);
		border: 1px solid color-mix(in oklch, var(--success) 20%, transparent);
	}
	.pk-winner-me {
		background: color-mix(in oklch, var(--success) 18%, transparent);
		border-color: color-mix(in oklch, var(--success) 35%, transparent);
	}

	.pk-player-list {
		border: 1px solid var(--border);
		border-radius: 8px;
		overflow: hidden;
	}
	.pk-player-list-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px;
		background: var(--muted);
		border-bottom: 1px solid var(--border);
	}
	.pk-player-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px;
		border-bottom: 1px solid var(--border);
	}
	.pk-player-row:last-child {
		border-bottom: none;
	}
	.pk-player-empty {
		opacity: 0.5;
	}
	.pk-player-name {
		font-size: 0.78rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.pk-tag-host {
		font-size: 0.55rem;
		font-weight: 800;
		padding: 1px 5px;
		border-radius: 3px;
		background: color-mix(in oklch, var(--primary) 15%, transparent);
		color: var(--primary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.pk-code-label {
		font-size: 0.68rem;
		color: var(--muted-foreground);
		letter-spacing: 0.05em;
	}

	.pk-result-banner {
		text-align: center;
		font-size: 1rem;
		font-weight: 800;
		padding: 10px 16px;
		border-radius: 8px;
		letter-spacing: 0.02em;
	}
	.pk-result-win {
		background: color-mix(in oklch, #22c55e 18%, transparent);
		color: #22c55e;
		border: 1px solid color-mix(in oklch, #22c55e 35%, transparent);
	}
	.pk-result-lose {
		background: color-mix(in oklch, var(--destructive) 12%, transparent);
		color: var(--destructive);
		border: 1px solid color-mix(in oklch, var(--destructive) 25%, transparent);
	}
	.pk-result-spectator {
		background: color-mix(in oklch, #3b82f6 15%, transparent);
		color: #3b82f6;
		border: 1px solid color-mix(in oklch, #3b82f6 30%, transparent);
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 1.5rem;
		text-align: center;
	}
	.pk-spectator-join {
		justify-content: space-between;
		background: color-mix(in oklch, #3b82f6 10%, transparent);
		border: 1px dashed color-mix(in oklch, #3b82f6 30%, transparent);
		margin: 8px 12px;
		padding: 8px 12px;
		border-radius: 8px;
	}
	.pk-result-bust {
		background: color-mix(in oklch, var(--destructive) 12%, transparent);
		color: var(--destructive);
		border: 1px solid color-mix(in oklch, var(--destructive) 25%, transparent);
	}

	@media (max-width: 720px) {
		.pk-table {
			padding: 12px;
		}
		.pk-code-row {
			flex-direction: column;
			align-items: flex-start;
			gap: 8px;
		}
	}
</style>

