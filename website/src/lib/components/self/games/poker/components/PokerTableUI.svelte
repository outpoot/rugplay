<script lang="ts">
	import { formatValue } from '$lib/utils';
	import type { GameState } from '../types';
	import PokerSeat from './PokerSeat.svelte';
	import PokerCard from './PokerCard.svelte';
	import PokerHand from './PokerHand.svelte';

	let { gameState, me, myHandAnalysis, playerActionLabels }: {
		gameState: GameState;
		me: any;
		myHandAnalysis: any;
		playerActionLabels: Record<number, string>;
	} = $props();

	// this seats the palyers round the table, might have to fix it a bit though
	function seats(playerIndex: number, totalPlayers: number, yourIndex: number) {
		if (totalPlayers <= 0) return { style: 'left:50%; top:50%;', side: 'right' as const };

		const normalized = (playerIndex - yourIndex + totalPlayers) % totalPlayers;
		const angleDeg = 90 + (normalized / totalPlayers) * 360; 
		const rad = (angleDeg * Math.PI) / 180;

		const radiusX = 58;
		const radiusY = 50;

		const x = 50 + Math.cos(rad) * radiusX;
		const y = 50 + Math.sin(rad) * radiusY;

		const side: 'left' | 'right' = Math.cos(rad) >= 0 ? 'right' : 'left';
		return { style: `left:${x}%; top:${y}%;`, side };
	}
</script>

<div class="pk-arcade mergegaming">
	<div class="table container">
		<div class="background">
			<!-- the 5 center cards -->
			<div class="pk-round-center">
				{#if gameState.pot > 0}
					<div class="pk-pot">POT {formatValue(gameState.pot)}</div>
				{/if}

				<div class="pk-community-cards">
					{#each { length: 5 } as _, i}
						{#if gameState.communityCards[i]}
							<div class="pk-comm-card-anim" style="animation-delay: {i * 0.1}s">
								<PokerCard
									card={gameState.communityCards[i]}
									highlight={myHandAnalysis.highlightedCommunity.includes(i)}
								/>
							</div>
						{:else}
							<PokerCard faceDown={true} />
						{/if}
					{/each}
				</div>
			</div>

			<!-- Player seats -->
			<div class="pk-seat-ring">
				{#each gameState.players as player, i}
					{@const seat = seats(i, gameState.players.length, gameState.yourIndex)}
					<div class="pk-seat-slot" style={seat.style}>
						<div class="pk-seat-counter-rotate" class:pk-hidden-self={i === gameState.yourIndex}>
							<PokerSeat
								{player}
								isMe={i === gameState.yourIndex}
								isActive={i === gameState.activePlayerIndex && gameState.phase !== 'waiting' && gameState.phase !== 'showdown'}
								isDealer={i === gameState.dealerIndex}
								lastAction={playerActionLabels[player.userId] ?? null}
								showdown={gameState.phase === 'showdown'}
								side={seat.side}
							/>
						</div>
					</div>
				{/each}
			</div>

			<!-- Your hand (super tuff animation right?) -->
			{#if me}
				<div class="pk-my-hand-container">
					<PokerHand
						cards={me.holeCards}
						handName={myHandAnalysis.handName}
						highlights={myHandAnalysis.highlightedHole}
					/>
				</div>
			{:else}
				<div class="pk-my-hand-container">
					<PokerHand
						cards={[]}
						handName="Spectating"
					/>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- CSS Heavily copied from codepen -->
<style>
.pk-my-hand-container {
	position: absolute;
	bottom: -45px;
	left: 50%;
	transform: translateX(-50%);
	z-index: 20;
}

.pk-arcade {
	width: 100%;
	display: flex;
	justify-content: center;
	padding: 10px 0;
}

.pk-arcade.mergegaming {
	background: transparent;
}

.table.container {
	width: 100%;
	max-width: 900px;
	aspect-ratio: 16 / 9;
	margin: 0 auto;
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	box-sizing: border-box;
}

.background {
	width: 75%;
	height: 80%;
	border-radius: 120px;
	position: relative;
	display: flex;
	overflow: visible;
	background: radial-gradient(circle at center, #0a2f1a 0%, #05140d 100%);
	box-shadow:
		0 0 0 8px #1a1a1a,
		0 0 0 10px #333,
		inset 0 0 50px rgba(0, 0, 0, 0.8),
		0 20px 40px rgba(0, 0, 0, 0.6);
}

.background::before {
	content: '';
	position: absolute;
	inset: 10px;
	border: 2px solid rgba(255, 255, 255, 0.05);
	border-radius: inherit;
	pointer-events: none;
}

.pk-round-center {
	position: absolute;
	z-index: 5;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
	top: 45%;
	left: 50%;
	transform: translate(-50%, -50%);
}

.pk-pot {
	background: rgba(0, 0, 0, 0.5);
	color: #fff;
	font-weight: 700;
	font-size: 1rem;
	padding: 4px 16px;
	border-radius: 30px;
	border: 1px solid rgba(255,255,255,0.1);
	box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.pk-community-cards {
	display: flex;
	gap: 6px;
}

.pk-seat-ring {
	position: absolute;
	inset: 0;
	z-index: 12;
	pointer-events: none;
}

.pk-seat-slot {
	position: absolute;
	transform: translate(-50%, -50%);
}

.pk-seat-counter-rotate {
	pointer-events: auto;
}

.pk-seat-counter-rotate.pk-hidden-self {
	opacity: 0;
	pointer-events: none;
}

.pk-comm-card-anim {
	animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) backwards;
}

@keyframes popIn {
	0% { opacity: 0; transform: scale(0.6) translateY(-10px); }
	100% { opacity: 1; transform: scale(1) translateY(0); }
}

@media (max-width: 600px) {
	.table.container {
		aspect-ratio: 1 / 1.5;
		padding: 0;
		max-width: 100vw;
	}

	.background {
		width: 90%;
		height: 90%;
		border-radius: 120px;
	}

	.pk-round-center {
		top: 50%;
		gap: 4px;
	}

	.pk-community-cards {
		flex-wrap: wrap;
		justify-content: center;
		max-width: 120px;
		gap: 2px;
	}

	.pk-pot {
		font-size: 0.75rem;
		padding: 2px 8px;
	}

	.pk-seat-counter-rotate {
		transform: scale(0.7);
	}
}
</style>