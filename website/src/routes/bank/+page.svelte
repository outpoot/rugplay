<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
	import CoinIcon from '$lib/components/self/CoinIcon.svelte';
	import SEO from '$lib/components/self/SEO.svelte';
	import { formatValue, formatPrice, formatMarketCap } from '$lib/utils';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let loading = $state(true);
	let error = $state<string | null>(null);
	let treasuryData = $state<any>(null);
	let ledger = $state<any[]>([]);
	let bankCoin = $state<any>(null);

	const SOURCE_LABELS: Record<string, string> = {
		TRADING_FEE: 'Trading fee',
		CASH_TRANSFER_FEE: 'Transfer fee',
		DAILY_REWARD: 'Daily reward',
		ARCADE_HOUSE_EDGE: 'Arcade edge',
		ARCADE_PAYOUT: 'Arcade payout',
		PROMO_CODE: 'Promo code',
		PREDICTION_MARKET_FEE: 'Hopium fee',
		ADMIN_ADJUSTMENT: 'Adjustment',
		SEED: 'Capitalization'
	};

	let creditPortion = $derived.by(() => {
		if (!treasuryData) return 50;
		const inflow = treasuryData.totalInflow;
		const outflow = treasuryData.totalOutflow;
		const sum = inflow + outflow;
		if (sum <= 0) return 50;
		return Math.round((inflow / sum) * 1000) / 10;
	});

	onMount(async () => {
		try {
			const response = await fetch('/api/treasury');
			if (!response.ok) throw new Error('Failed to load treasury data');
			const data = await response.json();
			treasuryData = data.treasury;
			ledger = data.ledger;
			bankCoin = data.bankCoin;
		} catch (e) {
			console.error('Failed to fetch treasury data:', e);
			error = 'Failed to load bank data';
		} finally {
			loading = false;
		}
	});

	function formatDate(d: string) {
		const date = new Date(d);
		const now = new Date();
		const sameDay = date.toDateString() === now.toDateString();
		if (sameDay) {
			return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
		}
		return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}
</script>

<SEO
	title="RugPlay Bank"
	description="The central treasury behind Rugplay's economy — every trading fee and transfer fee flows in, every daily reward flows out. Fully transparent, publicly auditable."
	keywords="rugplay bank, central bank, treasury, official coin"
/>

<div class="bank-page">
	<!-- Hero -->
	<div class="hero">
		<div class="engrave" aria-hidden="true"></div>
		<div class="hero-inner">
			<div class="seal" aria-hidden="true">
				<svg viewBox="0 0 100 100" class="seal-svg">
					<circle cx="50" cy="50" r="47" class="seal-ring-outer" />
					<circle cx="50" cy="50" r="39" class="seal-ring-inner" />
					{#each Array(36) as _, i}
						<line
							x1="50"
							y1="4"
							x2="50"
							y2="9"
							class="seal-tick"
							transform="rotate({i * 10} 50 50)"
						/>
					{/each}
					<text x="50" y="58" text-anchor="middle" class="seal-mark">RB</text>
				</svg>
			</div>
			<div class="eyebrow">Central Treasury · Est. 2026</div>
			<h1 class="wordmark">RugPlay Bank</h1>
			<p class="tagline">
				Where every trading fee and transfer fee lands, and where every daily reward pays out
				from. No hidden ledger — this page is it.
			</p>
		</div>
	</div>

	<div class="content">
		{#if loading}
			<div class="statement-card">
				<Skeleton class="h-8 w-40" />
				<Skeleton class="mt-4 h-14 w-64" />
				<Skeleton class="mt-6 h-3 w-full" />
				<div class="mt-6 flex gap-8">
					<Skeleton class="h-16 w-32" />
					<Skeleton class="h-16 w-32" />
				</div>
			</div>
		{:else if error}
			<div class="error-block">{error}</div>
		{:else}
			<!-- Statement of reserves -->
			<section class="statement-card">
				<div class="statement-label">Statement of Reserves</div>
				<div class="balance-row">
					<span class="balance-figure" class:negative={treasuryData.balance < 0}>
						{formatValue(treasuryData.balance)}
					</span>
					{#if treasuryData.balance < 0}
						<span class="deficit-flag">Deficit</span>
					{/if}
				</div>
				{#if treasuryData.balance < 0}
					<p class="deficit-note">Payouts have outrun fee income — running a deficit.</p>
				{/if}

				<div class="flow-bar" role="img" aria-label="Credits vs debits proportion">
					<div class="flow-bar-credit" style="width: {creditPortion}%"></div>
				</div>

				<div class="flow-cols">
					<div class="flow-col">
						<div class="flow-col-label">
							<span class="dot dot-credit"></span>Lifetime Credits
						</div>
						<div class="flow-col-figure credit">{formatValue(treasuryData.totalInflow)}</div>
						<div class="flow-col-caption">Trading fees + transfer fees</div>
					</div>
					<div class="flow-divider" aria-hidden="true"></div>
					<div class="flow-col">
						<div class="flow-col-label">
							<span class="dot dot-debit"></span>Lifetime Debits
						</div>
						<div class="flow-col-figure debit">{formatValue(treasuryData.totalOutflow)}</div>
						<div class="flow-col-caption">Daily reward payouts</div>
					</div>
				</div>
			</section>

			<!-- Official coin — certificate -->
			{#if bankCoin}
				<section class="cert-wrap">
					<div class="section-label">The Official Coin</div>
					<button
						type="button"
						class="cert"
						onclick={() => goto(`/coin/${bankCoin.symbol}`)}
					>
						<div class="cert-corner cert-corner-tl" aria-hidden="true"></div>
						<div class="cert-corner cert-corner-tr" aria-hidden="true"></div>
						<div class="cert-corner cert-corner-bl" aria-hidden="true"></div>
						<div class="cert-corner cert-corner-br" aria-hidden="true"></div>

						<div class="cert-inner">
							<div class="cert-icon-frame">
								<CoinIcon icon={bankCoin.icon} symbol={bankCoin.symbol} name={bankCoin.name} size={10} />
							</div>
							<div class="cert-id">
								<div class="cert-name-row">
									<span class="cert-name">{bankCoin.name}</span>
									<span class="cert-seal">✓ OFFICIAL</span>
								</div>
								<div class="cert-symbol">*{bankCoin.symbol}</div>
							</div>
							<div class="cert-metric">
								<div class="cert-metric-value">${formatPrice(bankCoin.currentPrice)}</div>
								<div class="cert-metric-change" class:negative={bankCoin.change24h < 0}>
									{bankCoin.change24h >= 0 ? '+' : ''}{bankCoin.change24h.toFixed(2)}%
								</div>
							</div>
							<div class="cert-metric">
								<div class="cert-metric-label">Market Cap</div>
								<div class="cert-metric-value">{formatMarketCap(bankCoin.marketCap)}</div>
							</div>
						</div>
					</button>
					{#if bankCoin.maxHolderPercent}
						<p class="cert-finePrint">
							Issued with no owner. Capped at {bankCoin.circulatingSupply.toLocaleString()} total
							shares — no wallet may hold more than {bankCoin.maxHolderPercent}% of supply.
						</p>
					{/if}
				</section>
			{/if}

			<!-- Ledger -->
			<section class="ledger-wrap">
				<div class="section-label">Recent Activity</div>
				{#if ledger.length === 0}
					<div class="ledger-empty">No treasury activity yet.</div>
				{:else}
					<div class="ledger">
						<div class="ledger-head">
							<span>Description</span>
							<span class="ledger-head-amount">Amount</span>
						</div>
						{#each ledger as entry (entry.id)}
							<div class="ledger-row">
								<span class="ledger-row-dot" class:debit={entry.direction === 'OUT'} aria-hidden="true"
								></span>
								<div class="ledger-row-main">
									<div class="ledger-row-desc">
										{entry.description || SOURCE_LABELS[entry.source] || entry.source}
									</div>
									<div class="ledger-row-meta">
										<span class="ledger-tag">{SOURCE_LABELS[entry.source] || entry.source}</span>
										{#if entry.username}<span>@{entry.username}</span>{/if}
										<span>{formatDate(entry.createdAt)}</span>
									</div>
								</div>
								<span class="ledger-row-amount" class:debit={entry.direction === 'OUT'}>
									{entry.direction === 'IN' ? '+' : '−'}{formatValue(entry.amount)}
								</span>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		{/if}
	</div>
</div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

	.bank-page {
		--seal-gold: oklch(0.795 0.184 86.047);
		--seal-gold-dim: oklch(0.795 0.184 86.047 / 0.35);
		font-family: 'Inter', sans-serif;
	}

	/* ---------- Hero ---------- */
	.hero {
		position: relative;
		overflow: hidden;
		background: linear-gradient(180deg, oklch(0.16 0.01 285 / 1), var(--color-background));
		border-bottom: 1px solid var(--color-border);
		padding: 3.5rem 1.5rem 3rem;
	}
	.engrave {
		position: absolute;
		inset: 0;
		opacity: 0.5;
		background-image: repeating-linear-gradient(
			115deg,
			oklch(1 0 0 / 0.025) 0px,
			oklch(1 0 0 / 0.025) 1px,
			transparent 1px,
			transparent 10px
		);
		mask-image: radial-gradient(ellipse 60% 80% at 50% 0%, black 40%, transparent 90%);
	}
	.hero-inner {
		position: relative;
		max-width: 42rem;
		margin: 0 auto;
		text-align: center;
	}
	.seal {
		width: 4.5rem;
		height: 4.5rem;
		margin: 0 auto 1.25rem;
	}
	.seal-svg {
		width: 100%;
		height: 100%;
	}
	.seal-ring-outer,
	.seal-ring-inner {
		fill: none;
		stroke: var(--seal-gold);
		stroke-width: 1.1;
	}
	.seal-ring-inner {
		stroke-opacity: 0.6;
	}
	.seal-tick {
		stroke: var(--seal-gold);
		stroke-width: 1.4;
		stroke-opacity: 0.75;
	}
	.seal-mark {
		font-family: 'Fraunces', serif;
		font-weight: 600;
		font-size: 26px;
		fill: var(--seal-gold);
	}
	.eyebrow {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.7rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--seal-gold);
		margin-bottom: 0.75rem;
	}
	.wordmark {
		font-family: 'Fraunces', serif;
		font-weight: 600;
		font-size: clamp(2.25rem, 6vw, 3.25rem);
		letter-spacing: -0.01em;
		color: var(--color-foreground);
		margin-bottom: 0.75rem;
	}
	.tagline {
		color: var(--color-muted-foreground);
		font-size: 0.95rem;
		line-height: 1.55;
		max-width: 34rem;
		margin: 0 auto;
	}

	/* ---------- Content shell ---------- */
	.content {
		max-width: 42rem;
		margin: 0 auto;
		padding: 2.5rem 1.25rem 4rem;
	}
	.section-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.7rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-muted-foreground);
		margin-bottom: 0.75rem;
	}
	.error-block {
		text-align: center;
		padding: 3rem 0;
		color: var(--color-muted-foreground);
	}

	/* ---------- Statement of reserves ---------- */
	.statement-card {
		background: var(--color-card);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: 1.75rem;
	}
	.statement-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.7rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-muted-foreground);
	}
	.balance-row {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		margin-top: 0.6rem;
		flex-wrap: wrap;
	}
	.balance-figure {
		font-family: 'IBM Plex Mono', monospace;
		font-weight: 600;
		font-size: clamp(2rem, 7vw, 2.75rem);
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.02em;
		color: var(--color-foreground);
	}
	.balance-figure.negative {
		color: var(--color-destructive);
	}
	.deficit-flag {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.65rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-destructive);
		border: 1px solid var(--color-destructive);
		border-radius: 999px;
		padding: 0.2rem 0.55rem;
	}
	.deficit-note {
		margin-top: 0.35rem;
		font-size: 0.8rem;
		color: var(--color-destructive);
	}

	.flow-bar {
		margin-top: 1.5rem;
		height: 6px;
		border-radius: 999px;
		background: var(--color-destructive);
		opacity: 0.85;
		overflow: hidden;
	}
	.flow-bar-credit {
		height: 100%;
		background: var(--color-success);
	}

	.flow-cols {
		margin-top: 1.5rem;
		display: flex;
		align-items: stretch;
		gap: 1.5rem;
	}
	.flow-col {
		flex: 1;
		min-width: 0;
	}
	.flow-col-label {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		color: var(--color-muted-foreground);
	}
	.dot {
		width: 7px;
		height: 7px;
		border-radius: 999px;
		flex-shrink: 0;
	}
	.dot-credit {
		background: var(--color-success);
	}
	.dot-debit {
		background: var(--color-destructive);
	}
	.flow-col-figure {
		font-family: 'IBM Plex Mono', monospace;
		font-weight: 600;
		font-size: 1.4rem;
		font-variant-numeric: tabular-nums;
		margin-top: 0.3rem;
	}
	.flow-col-figure.credit {
		color: var(--color-success);
	}
	.flow-col-figure.debit {
		color: var(--color-destructive);
	}
	.flow-col-caption {
		font-size: 0.72rem;
		color: var(--color-muted-foreground);
		margin-top: 0.15rem;
	}
	.flow-divider {
		width: 1px;
		background: var(--color-border);
	}

	/* ---------- Certificate (official coin) ---------- */
	.cert-wrap {
		margin-top: 2.5rem;
	}
	.cert {
		position: relative;
		width: 100%;
		text-align: left;
		background: linear-gradient(160deg, oklch(0.21 0.006 285.885), var(--color-card));
		border: 1px solid var(--seal-gold-dim);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		cursor: pointer;
		transition: border-color 0.15s ease, transform 0.15s ease;
	}
	.cert:hover {
		border-color: var(--seal-gold);
		transform: translateY(-1px);
	}
	.cert-corner {
		position: absolute;
		width: 14px;
		height: 14px;
		border: 1.5px solid var(--seal-gold);
		opacity: 0.7;
	}
	.cert-corner-tl {
		top: 8px;
		left: 8px;
		border-right: none;
		border-bottom: none;
	}
	.cert-corner-tr {
		top: 8px;
		right: 8px;
		border-left: none;
		border-bottom: none;
	}
	.cert-corner-bl {
		bottom: 8px;
		left: 8px;
		border-right: none;
		border-top: none;
	}
	.cert-corner-br {
		bottom: 8px;
		right: 8px;
		border-left: none;
		border-top: none;
	}
	.cert-inner {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
	}
	.cert-icon-frame {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3.25rem;
		height: 3.25rem;
		border-radius: 999px;
		border: 1.5px solid var(--seal-gold-dim);
		padding: 2px;
		flex-shrink: 0;
	}
	.cert-id {
		flex: 1;
		min-width: 8rem;
	}
	.cert-name-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.cert-name {
		font-family: 'Fraunces', serif;
		font-weight: 600;
		font-size: 1.15rem;
		color: var(--color-foreground);
	}
	.cert-seal {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.62rem;
		letter-spacing: 0.08em;
		color: var(--seal-gold);
		border: 1px solid var(--seal-gold-dim);
		border-radius: 999px;
		padding: 0.15rem 0.5rem;
	}
	.cert-symbol {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.8rem;
		color: var(--color-muted-foreground);
		margin-top: 0.15rem;
	}
	.cert-metric {
		text-align: right;
	}
	.cert-metric-label {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-muted-foreground);
	}
	.cert-metric-value {
		font-family: 'IBM Plex Mono', monospace;
		font-weight: 600;
		font-size: 1.05rem;
		font-variant-numeric: tabular-nums;
		color: var(--color-foreground);
	}
	.cert-metric-change {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.8rem;
		color: var(--color-success);
	}
	.cert-metric-change.negative {
		color: var(--color-destructive);
	}
	.cert-finePrint {
		margin-top: 0.75rem;
		font-size: 0.75rem;
		line-height: 1.5;
		color: var(--color-muted-foreground);
	}

	/* ---------- Ledger ---------- */
	.ledger-wrap {
		margin-top: 2.5rem;
	}
	.ledger-empty {
		text-align: center;
		padding: 2.5rem 0;
		font-size: 0.85rem;
		color: var(--color-muted-foreground);
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-lg);
	}
	.ledger {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}
	.ledger-head {
		display: flex;
		justify-content: space-between;
		padding: 0.6rem 1rem;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.65rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-muted-foreground);
		background: var(--color-card);
		border-bottom: 1px solid var(--color-border);
	}
	.ledger-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border);
	}
	.ledger-row:last-child {
		border-bottom: none;
	}
	.ledger-row:nth-child(odd) {
		background: color-mix(in oklch, var(--color-card) 40%, transparent);
	}
	.ledger-row-dot {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: var(--color-success);
		flex-shrink: 0;
	}
	.ledger-row-dot.debit {
		background: var(--color-destructive);
	}
	.ledger-row-main {
		flex: 1;
		min-width: 0;
	}
	.ledger-row-desc {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--color-foreground);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.ledger-row-meta {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		font-size: 0.7rem;
		color: var(--color-muted-foreground);
		margin-top: 0.15rem;
	}
	.ledger-tag {
		font-family: 'IBM Plex Mono', monospace;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.ledger-row-amount {
		font-family: 'IBM Plex Mono', monospace;
		font-weight: 600;
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
		color: var(--color-success);
		flex-shrink: 0;
	}
	.ledger-row-amount.debit {
		color: var(--color-destructive);
	}

	@media (prefers-reduced-motion: reduce) {
		.cert {
			transition: none;
		}
	}
</style>
