<script lang="ts">
	import PokerCard from './PokerCard.svelte';

	let { cards = [], handName = '', highlights = [] }: {
		cards: string[];
		handName?: string;
		highlights?: number[];
	} = $props();
</script>
<!-- The two little cards with their little animation -->
<div class="pk-my-hand-area">
	{#if handName}
		<div class="pk-hand-name">{handName}</div>
	{/if}
	
	<div class="pk-my-cards">
		{#if cards.length > 0}
			{#each cards as card, i}
				<div class="pk-my-card-wrap" style="transform: rotate({i === 0 ? '-8deg' : '8deg'}) translateY({i === 0 ? '4px' : '0'}) translateX({i === 0 ? '10px' : '-10px'}); z-index: {i};">
					<PokerCard {card} highlight={highlights.includes(i)} class="pk-my-card-size" />
				</div>
			{/each}
		{:else}
			<div class="pk-my-card-wrap" style="transform: rotate(-8deg) translateY(4px) translateX(10px); z-index: 0;">
				<PokerCard faceDown={true} class="pk-my-card-size" />
			</div>
			<div class="pk-my-card-wrap" style="transform: rotate(8deg) translateY(0) translateX(-10px); z-index: 1;">
				<PokerCard faceDown={true} class="pk-my-card-size" />
			</div>
		{/if}
	</div>
</div>

<style>
/* This shows the two little cards you got */
.pk-my-hand-area {
	display: flex;
	flex-direction: column;
	align-items: center;
	z-index: 20;
}

.pk-hand-name {
	background: rgba(0, 0, 0, 0.7);
	color: #ffffff;
	font-weight: 800;
	font-size: 0.8rem;
	padding: 4px 16px;
	border-radius: 12px;
	margin-bottom: 8px;
	border: 1px solid rgba(255, 255, 255, 0.4);
	box-shadow: 0 4px 12px rgba(0,0,0,0.5);
	transform: translateY(10px);
	z-index: 2;
}

.pk-my-cards {
	display: flex;
	filter: drop-shadow(0 8px 16px rgba(0,0,0,0.4));
}

.pk-my-card-wrap {
	transition: transform 0.2s, z-index 0s;
}

.pk-my-card-wrap:hover {
	transform: rotate(0) translateY(-20px) !important;
	z-index: 10 !important;
}

:global(.pk-my-card-size) {
	width: 72px !important;
	height: 100px !important;
}

@media (max-width: 720px) {
	:global(.pk-my-card-size) {
		width: 60px !important;
		height: 84px !important;
	}
}
</style>
