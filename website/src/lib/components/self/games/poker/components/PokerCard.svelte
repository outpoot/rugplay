<script lang="ts">
	// This whole file is basically just a fancy way of showing the same cards blackjack has. Many credits to blackjack for this.

	export function getCardDisplay(
		card: string
	): { rank: string; suit: string; isRed: boolean } {
		if (card === '??') return { rank: '?', suit: '', isRed: false };
		const suit = card.slice(-1);
		const rank = card.slice(0, -1);
		const suitMap: Record<string, string> = { H: '♥', D: '♦', C: '♣', S: '♠' };
		return { rank, suit: suitMap[suit] ?? suit, isRed: suit === 'H' || suit === 'D' };
	}


	let { card = null, highlight = false, faceDown = false, small = false, style = '', class: className = '' }:
		{ 
			card?: string | null;
			highlight?: boolean; 
			faceDown?: boolean; 
			small?: boolean; 
			style?: string;
			class?: string;
		} = $props();
</script>

{#if !card || faceDown}
	<div class="bj-card bj-card-back {className}" class:pk-card-sm={small} {style}>
		<div class="bj-card-back-face"></div>
	</div>
{:else}
	{@const d = getCardDisplay(card)}
	<div class="bj-card bj-card-face {className}" class:pk-card-highlight={highlight} class:pk-card-sm={small} {style}>
		<div class="bj-corner bj-tl">
			<span class="bj-rank" class:bj-red={d.isRed}>{d.rank}</span>
			<span class="bj-suit-sm" class:bj-red={d.isRed}>{d.suit}</span>
		</div>
		<span class="bj-suit-lg" class:bj-red={d.isRed}>{d.suit}</span>
		<div class="bj-corner bj-br">
			<span class="bj-rank" class:bj-red={d.isRed}>{d.rank}</span>
			<span class="bj-suit-sm" class:bj-red={d.isRed}>{d.suit}</span>
		</div>
	</div>
{/if}

<style>
/* CSS copied from Blackjack */
.bj-card {
	width: var(--card-w, 64px);
	height: var(--card-h, 90px);
	border-radius: 6px;
	position: relative;
	flex-shrink: 0;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	background: #ffffff;
}
.bj-card.pk-card-sm {
	--card-w: 44px;
	--card-h: 62px;
}
.bj-card-face {
	border: 1px solid rgba(0, 0, 0, 0.1);
}
.bj-card-back {
	background: hsl(220 60% 25%);
	border: 1px solid hsl(220 60% 30%);
	overflow: hidden;
}
.bj-card-back-face {
	position: absolute;
	inset: 4px;
	border-radius: 3px;
	border: 1px solid rgba(255, 255, 255, 0.1);
	background-image: repeating-linear-gradient(
			45deg,
			transparent,
			transparent 3px,
			rgba(255, 255, 255, 0.04) 3px,
			rgba(255, 255, 255, 0.04) 6px
		),
		repeating-linear-gradient(
			-45deg,
			transparent,
			transparent 3px,
			rgba(255, 255, 255, 0.04) 3px,
			rgba(255, 255, 255, 0.04) 6px
		);
}
.bj-corner {
	position: absolute;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1px;
	padding: 4px 5px;
	line-height: 1;
}
.bj-tl { top: 0; left: 0; }
.bj-br { bottom: 0; right: 0; transform: rotate(180deg); }
.pk-card-sm .bj-corner { padding: 2px 3px; }
.bj-rank { font-size: 0.78rem; font-weight: 900; color: #1a1a1a; font-family: Georgia, serif; }
.pk-card-sm .bj-rank { font-size: 0.6rem; }
.bj-suit-sm { font-size: 0.5rem; color: #1a1a1a; }
.pk-card-sm .bj-suit-sm { font-size: 0.4rem; }
.bj-suit-lg {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	font-size: 1.5rem;
	color: #1a1a1a;
	user-select: none;
}
.pk-card-sm .bj-suit-lg { font-size: 1.1rem; }
.bj-red { color: #dc2626 !important; }
.pk-card-highlight {
	outline: 3px solid #facc15;
	outline-offset: 2px;
	box-shadow: 0 0 8px rgba(250, 204, 21, 0.6);
}
</style>
