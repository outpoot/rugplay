<script lang="ts">
	import { formatValue } from '$lib/utils';
	import PokerCard from './PokerCard.svelte';
	import type { PublicPokerPlayer } from '../types';

	let {
		player,
		isMe,
		isActive,
		isDealer,
		lastAction,
		showdown,
		side = 'right'
	}: {
		player: PublicPokerPlayer;
		isMe: boolean;
		isActive: boolean;
		isDealer: boolean;
		lastAction: string | null;
		showdown: boolean;
		side?: 'left' | 'right';
	} = $props();

	let avatarFailed = $state(false);
</script>
<!-- Really tried to be like discords poker night, didnt really work out super well, but well enough -->
<div class="pk-seat" data-side={side} class:pk-active={isActive}>
	<div class="pk-avatar-wrapper">
		{#if player.avatar && !avatarFailed}
			<img src={"/api/proxy/s3/" + player.avatar} alt="avatar" class="pk-avatar" onerror={() => (avatarFailed = true)} />
		{:else}
			<div class="pk-avatar pk-avatar-fallback">{isMe ? 'YOU' : player.username.slice(0,2).toUpperCase()}</div>
		{/if}
	</div>
	
	<div class="pk-bio-pill">
		<div class="pk-name">
			{isMe ? 'You' : player.username}
		</div>
		<div class="pk-chips">{formatValue(player.chips)}</div>
		
		{#if player.folded || player.allIn || lastAction}
			<div class="pk-action-badge" class:pk-fold={player.folded} class:pk-allin={player.allIn}>
				{player.folded ? 'FOLDED' : player.allIn ? 'ALL-IN' : lastAction}
			</div>
		{/if}
	</div>
	
	<!-- Other player cards (unrevealed) -->
	{#if !isMe && !(showdown && player.holeCards?.length > 0)}
		<div class="pk-seat-cards">
			<div class="pk-mini-card pk-mini-card-left">
				<PokerCard faceDown={true} small={true} />
			</div>
			<div class="pk-mini-card pk-mini-card-right">
				<PokerCard faceDown={true} small={true} />
			</div>
		</div>
	{/if}

	<!-- and their shown cards. Kinda look like bunny ears if you ask me -->
	{#if !isMe && showdown && player.holeCards?.length > 0}
		<div class="pk-seat-cards">
			{#each player.holeCards as card, i}
				<div class={`pk-mini-card ${i === 0 ? 'pk-mini-card-left' : 'pk-mini-card-right'}`}>
					<PokerCard {card} small={true} />
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
/* Also just the blackjack logic at its core */
.pk-seat {
	display: flex;
	align-items: center;
	position: relative;
	gap: 0;
	z-index: 10;
}
.pk-seat[data-side="left"] {
	flex-direction: row-reverse;
}

.pk-seat-cards {
	position: absolute;
	top: -24px;
	left: 50%;
	transform: translateX(-50%);
	display: flex;
	align-items: center;
	z-index: 0;
}

.pk-mini-card {
	display: flex;
}

.pk-mini-card-left {
	transform: rotate(-10deg) translateX(4px);
}

.pk-mini-card-right {
	margin-left: -14px;
	transform: rotate(10deg) translateX(-4px);
}

.pk-avatar-wrapper {
	position: relative;
	z-index: 2;
}

.pk-avatar, .pk-avatar-fallback {
	width: 56px;
	height: 56px;
	min-width: 56px;
	max-width: 56px;
	min-height: 56px;
	max-height: 56px;
	aspect-ratio: 1 / 1;
	border-radius: 9999px;
	overflow: hidden;
	border: 3px solid #3b4252;
	background: #1e293b;
	color: #fff;
	object-fit: cover;
	object-position: center;
	display: flex;
	align-items: center;
	justify-content: center;
	font-weight: bold;
	font-size: 0.9rem;
	flex-shrink: 0;
}

.pk-avatar {
	display: block;
}

.pk-avatar-fallback {
	display: flex;
}

.pk-active .pk-avatar {
	border-color: #facc15;
}

.pk-bio-pill {
	background: rgba(30, 41, 59, 0.95);
	backdrop-filter: blur(8px);
	height: 44px;
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding: 0 16px 0 24px;
	border-radius: 0 22px 22px 0;
	border: 1px solid rgba(255,255,255,0.15);
	margin-left: -18px;
	z-index: 1;
	min-width: 100px;
}

.pk-seat[data-side="left"] .pk-bio-pill {
	border-radius: 22px 0 0 22px;
	margin-left: 0;
	margin-right: -18px;
	padding: 0 24px 0 16px;
	text-align: right;
}

.pk-name {
	font-size: 0.75rem;
	font-weight: 700;
	color: #f8fafc;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 90px;
}

.pk-chips {
	font-size: 0.65rem;
	color: #94a3b8;
	font-weight: 600;
}

.pk-action-badge {
	position: absolute;
	bottom: -10px;
	left: 50%;
	transform: translateX(-50%);
	background: #3b82f6;
	color: white;
	font-size: 0.55rem;
	font-weight: 800;
	padding: 2px 8px;
	border-radius: 12px;
	text-transform: uppercase;
}
.pk-action-badge.pk-fold { background: #ef4444; }
.pk-action-badge.pk-allin { background: #eab308; color: #000; }

.pk-showdown-cards {
	position: absolute;
	top: -50px;
	left: 50%;
	transform: translateX(-50%);
	display: flex;
	gap: 4px;
	z-index: 0;
}

.pk-seat[data-side="left"] .pk-showdown-cards {
	top: -20px;
	left: -40px;
}

.pk-seat[data-side="right"] .pk-showdown-cards {
	top: -20px;
	left: 100px;
}

</style>
