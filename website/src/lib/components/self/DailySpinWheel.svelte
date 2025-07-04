<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Gift, Clock, Loader2, CheckIcon } from 'lucide-svelte';
	import { USER_DATA } from '$lib/stores/user-data';
	import { fetchPortfolioSummary } from '$lib/stores/portfolio-data';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { formatTimeRemaining, playSound } from '$lib/utils';
	import { onMount } from 'svelte';

	interface RewardStatus {
		canClaim: boolean;
		rewardAmount: number;
		baseReward: number;
		prestigeBonus?: number;
		prestigeLevel?: number;
		timeRemaining: number;
		nextClaimTime: string | null;
		totalRewardsClaimed: number;
		lastRewardClaim: string | null;
		loginStreak: number;
	}

	type ClaimState = 'idle' | 'loading' | 'success' | 'spinning';

	let rewardStatus: RewardStatus | null = null;
	let claimState: ClaimState = 'idle';
	let error: string | null = null;
	let rotation = 0;
	let prizeSegments: number[] = [];
	let finalReward = 0;

	const NUM_SEGMENTS = 12;
	const COLORS = [
		'#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3',
		'#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43', '#EE5A24', '#0984E3'
	];

	onMount(() => {
		let interval: ReturnType<typeof setInterval> | null = null;

		if ($USER_DATA !== undefined) {
			fetchRewardStatus();
			interval = setInterval(() => {
				if (rewardStatus && !rewardStatus.canClaim) {
					fetchRewardStatus();
				}
			}, 60000);
		}

		return () => {
			if (interval) clearInterval(interval);
		};
	});

	async function fetchRewardStatus() {
		try {
			const response = await fetch('/api/rewards/claim');
			if (response.ok) {
				const result = await response.json();
				rewardStatus = result;
				if (rewardStatus?.canClaim && rewardStatus.baseReward !== undefined) {
					generatePrizeSegments(rewardStatus.baseReward);
				}
				error = null;
			} else {
				error = 'Failed to fetch reward status';
			}
		} catch (err) {
			error = 'Network error';
			console.error('Error fetching reward status:', err);
		}
	}

	function generatePrizeSegments(baseReward: number) {
		const segments: number[] = [];
		for (let i = 0; i < NUM_SEGMENTS; i++) {
			let prize: number;
			if (i === 0) prize = baseReward * 0.75;
			else if (i === NUM_SEGMENTS - 1) prize = baseReward * 1.2;
			else prize = baseReward * (0.8 + 0.4 * Math.random());
			segments.push(Math.round(prize));
		}

		const targetRewardIndex = findClosestPrizeIndex(baseReward, segments);
		segments[targetRewardIndex] = baseReward;

		prizeSegments = segments;
	}

	function findClosestPrizeIndex(target: number, segments: number[]) {
		let closestIndex = 0;
		let minDiff = Infinity;
		for (let i = 0; i < segments.length; i++) {
			const diff = Math.abs(segments[i] - target);
			if (diff < minDiff) {
				minDiff = diff;
				closestIndex = i;
			}
		}
		return closestIndex;
	}

	async function claimReward() {
		if (!rewardStatus?.canClaim || claimState !== 'idle') return;

		claimState = 'loading';
		error = null;

		try {
			const response = await fetch('/api/rewards/claim', { method: 'POST' });

			if (!response.ok) {
				const errorData = await response.json();
				if (response.status === 429) {
					toast.info('Daily reward on cooldown', {
						description: `Next reward available in ${formatTimeRemaining(errorData.timeRemaining)}. Come back later!`
					});
				} else {
					toast.error('Failed to claim reward');
				}
				claimState = 'idle';
				return;
			}

			const result = await response.json();
			finalReward = result.rewardAmount;

			let winningSegmentIndex = prizeSegments.findIndex(p => p === finalReward);
			if (winningSegmentIndex === -1) {
				winningSegmentIndex = findClosestPrizeIndex(finalReward, prizeSegments);
				prizeSegments[winningSegmentIndex] = finalReward;
			}

			const baseRotations = 8 * 360;
			const segmentAngle = 360 / NUM_SEGMENTS;
			const targetAngleForWheel = (winningSegmentIndex * segmentAngle) + (segmentAngle / 2);
			const offsetWithinSegment = (Math.random() - 0.5) * (segmentAngle * 0.4);
			const finalRotation = baseRotations + (360 - targetAngleForWheel) + offsetWithinSegment;

			rotation = finalRotation;
			claimState = 'spinning';
			playSound('spin');

			setTimeout(() => {
				claimState = 'success';
				playSound('win');

				toast.success(`You won $${formatCurrency(result.rewardAmount)}!`, {
					description: `Your daily spin reward has been added to your balance.`,
					action: { label: 'View Portfolio', onClick: () => goto('/portfolio') }
				});

				fetchPortfolioSummary();

				setTimeout(() => {
					fetchRewardStatus();
					claimState = 'idle';
				}, 2000);

			}, 5200);

		} catch (err) {
			error = 'Network error';
			toast.error('Network error');
			claimState = 'idle';
		}
	}

	function formatCurrency(value: number): string {
		return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
	}

	function getSegmentPath(index: number) {
		const angle = 360 / NUM_SEGMENTS;
		const startAngle = (index * angle - 90) * (Math.PI / 180);
		const endAngle = ((index + 1) * angle - 90) * (Math.PI / 180);
		
		const radius = 120;
		const x1 = Math.cos(startAngle) * radius;
		const y1 = Math.sin(startAngle) * radius;
		const x2 = Math.cos(endAngle) * radius;
		const y2 = Math.sin(endAngle) * radius;
		
		const largeArc = angle > 180 ? 1 : 0;
		
		return `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
	}

	function getTextPosition(index: number) {
		const angle = 360 / NUM_SEGMENTS;
		const textAngle = (index * angle + angle / 2 - 90) * (Math.PI / 180);
		const textRadius = 80;
		const x = Math.cos(textAngle) * textRadius;
		const y = Math.sin(textAngle) * textRadius;
		
		// Calculate rotation for better readability - add 90 degrees to make text more visible
		let textRotation = (index * angle + angle / 2 + 90) % 360;
		
		// Adjust rotation so text is always readable (not upside down)
		if (textRotation > 90 && textRotation < 270) {
			textRotation = textRotation + 180;
		}
		
		return { x, y, rotation: textRotation };
	}
</script>

<div class="flex flex-col items-center justify-center p-6 bg-card space-y-6">
	{#if rewardStatus?.canClaim && claimState !== 'success'}
		<div class="wheel-container">
			<div class="wheel-backdrop"></div>
			<svg 
				class="wheel" 
				width="280" 
				height="280" 
				viewBox="-140 -140 280 280"
				style="transform: rotate({rotation}deg); transition: {claimState === 'spinning' ? 'transform 5s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none'};"
			>
				<defs>
					<filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
						<feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3"/>
					</filter>
				</defs>
				
				<!-- Segments -->
				{#each prizeSegments as prize, i}
					{@const segmentColor = COLORS[i % COLORS.length]}
					{@const textPos = getTextPosition(i)}
					
					<path
						d={getSegmentPath(i)}
						fill={segmentColor}
						stroke="#ffffff"
						stroke-width="2"
						filter="url(#shadow)"
					/>
					
					<!-- Prize text -->
					<text
						x={textPos.x}
						y={textPos.y}
						text-anchor="middle"
						dominant-baseline="middle"
						fill="white"
						font-size="14"
						font-weight="bold"
						text-shadow="1px 1px 2px rgba(0,0,0,0.8)"
						transform="rotate({textPos.rotation} {textPos.x} {textPos.y})"
					>
						${formatCurrency(prize)}
					</text>
				{/each}
				
				<!-- Center circle -->
				<circle
					cx="0"
					cy="0"
					r="25"
					fill="hsl(var(--primary))"
					stroke="#ffffff"
					stroke-width="3"
					filter="url(#shadow)"
				/>
				
				<!-- Center icon -->
				<text
					x="0"
					y="0"
					text-anchor="middle"
					dominant-baseline="middle"
					fill="white"
					font-size="16"
					font-weight="bold"
				>
					🎁
				</text>
			</svg>
			
			<!-- Pointer -->
			<div class="pointer"></div>
		</div>
	{/if}

	{#if claimState === 'success'}
		<div class="success-display">
			<div class="success-animation">
				<div class="success-circle">
					<CheckIcon class="h-8 w-8 text-white" />
				</div>
			</div>
			<p class="text-sm text-muted-foreground mb-2">Congratulations! You won</p>
			<p class="text-4xl font-bold text-green-600 mb-2">${formatCurrency(finalReward)}</p>
			<p class="text-xs text-muted-foreground">Added to your portfolio balance</p>
		</div>
	{/if}

	<Button
		onclick={claimReward}
		disabled={claimState !== 'idle' || !rewardStatus?.canClaim}
		class="wheel-button"
		size="lg"
		variant={rewardStatus?.canClaim && claimState === 'idle' ? 'default' : 'outline'}
	>
		{#if !rewardStatus}
			<Loader2 class="h-4 w-4 animate-spin" />
			<span>Loading...</span>
		{:else if claimState === 'loading'}
			<Loader2 class="h-4 w-4 animate-spin" />
			<span>Preparing Spin...</span>
		{:else if claimState === 'spinning'}
			<Loader2 class="h-4 w-4 animate-spin" />
			<span>Spinning...</span>
		{:else if claimState === 'success'}
			<CheckIcon class="h-4 w-4" />
			<span>Claimed!</span>
		{:else if rewardStatus.canClaim}
			<Gift class="h-4 w-4" />
			<span>Spin for Daily Reward</span>
		{:else}
			<Clock class="h-4 w-4" />
			<span>Next in {formatTimeRemaining(rewardStatus.timeRemaining)}</span>
		{/if}
	</Button>
</div>

<style>
	.wheel-container {
		position: relative;
		width: 300px;
		height: 300px;
		margin: 0 auto;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.wheel-backdrop {
		position: absolute;
		width: 300px;
		height: 300px;
		border-radius: 50%;
		background: radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.2) 100%);
		box-shadow: 
			0 0 30px rgba(0,0,0,0.3),
			inset 0 0 20px rgba(255,255,255,0.1);
		z-index: 1;
	}

	.wheel {
		position: relative;
		z-index: 2;
		filter: drop-shadow(0 4px 20px rgba(0,0,0,0.25));
	}

	.pointer {
		position: absolute;
		top: -8px;
		left: 50%;
		transform: translateX(-50%);
		width: 0;
		height: 0;
		border-left: 18px solid transparent;
		border-right: 18px solid transparent;
		border-top: 35px solid hsl(var(--primary));
		z-index: 10;
		filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
	}

	.pointer::after {
		content: '';
		position: absolute;
		top: -32px;
		left: -15px;
		width: 0;
		height: 0;
		border-left: 15px solid transparent;
		border-right: 15px solid transparent;
		border-top: 25px solid hsl(var(--primary-foreground));
	}

	.success-display {
		text-align: center;
		padding: 2rem;
		background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%);
		border-radius: 16px;
		border: 1px solid rgba(16, 185, 129, 0.2);
		backdrop-filter: blur(10px);
		position: relative;
		overflow: hidden;
	}

	.success-display::before {
		content: '';
		position: absolute;
		top: -50%;
		left: -50%;
		width: 200%;
		height: 200%;
		background: radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%);
		animation: shimmer 2s ease-in-out infinite;
	}

	.success-animation {
		margin-bottom: 1rem;
	}

	.success-circle {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		background: linear-gradient(135deg, #10b981, #059669);
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto;
		animation: successPulse 1s ease-out;
		box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
	}

	:global(.wheel-button) {
		width: 100%;
		min-height: 56px;
		font-size: 1.1rem;
		font-weight: 600;
		border-radius: 12px;
		transition: all 0.3s ease;
		position: relative;
		overflow: hidden;
	}

	:global(.wheel-button:hover:not(:disabled)) {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(0,0,0,0.15);
	}

	:global(.wheel-button:active:not(:disabled)) {
		transform: translateY(0);
	}

	@keyframes shimmer {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	@keyframes successPulse {
		0% { 
			transform: scale(0);
			opacity: 0;
		}
		50% {
			transform: scale(1.2);
			opacity: 1;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}
</style>