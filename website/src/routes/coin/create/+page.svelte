<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Separator } from '$lib/components/ui/separator';
	import { Info, Loader2, Coins, ImagePlus } from 'lucide-svelte';
	import { PORTFOLIO_DATA, fetchPortfolioData } from '$lib/stores/portfolio-data';
	import { onMount } from 'svelte';
	import { CREATION_FEE, INITIAL_LIQUIDITY, TOTAL_COST } from '$lib/data/constants';
	import { toast } from 'svelte-sonner';
	import SEO from '$lib/components/self/SEO.svelte';
	import SignInConfirmDialog from '$lib/components/self/SignInConfirmDialog.svelte';

	let name = $state('');
	let symbol = $state('');
	let iconFile = $state<File | null>(null);
	let iconPreview = $state<string | null>(null);
	let isSubmitting = $state(false);
	let error = $state('');

	onMount(() => {
		fetchPortfolioData();
	});

	let nameError = $derived(
		name.length > 0 && (name.length < 2 || name.length > 255)
			? 'Name must be between 2 and 255 characters'
			: ''
	);

	let symbolError = $derived(
		symbol.length > 0 && (symbol.length < 2 || symbol.length > 10)
			? 'Symbol must be between 2 and 10 characters'
			: ''
	);

	let iconError = $derived(
		iconFile && iconFile.size > 1 * 1024 * 1024 ? 'Icon must be smaller than 1MB' : ''
	);

	let isFormValid = $derived(
		name.length >= 2 && symbol.length >= 2 && !nameError && !symbolError && !iconError
	);

	let hasEnoughFunds = $derived(
		$PORTFOLIO_DATA ? $PORTFOLIO_DATA.baseCurrencyBalance >= TOTAL_COST : false
	);

	let canSubmit = $derived(isFormValid && hasEnoughFunds && !isSubmitting);

	function handleIconChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (file) {
			if (file.type.startsWith('image/')) {
				iconFile = file;
				console.log(iconFile.size);
				const reader = new FileReader();
				reader.onload = (e) => {
					iconPreview = e.target?.result as string;
				};
				reader.readAsDataURL(file);
			} else {
				error = 'Please select a valid image file';
				target.value = '';
			}
		} else {
			iconFile = null;
			iconPreview = null;
		}
	}

	async function handleSubmit(event: { preventDefault: () => void }) {
		event.preventDefault();

		if (!canSubmit) return;

		isSubmitting = true;
		error = '';

		try {
			const formData = new FormData();
			formData.append('name', name);
			formData.append('symbol', symbol.toUpperCase());

			if (iconFile) {
				formData.append('icon', iconFile);
			}

			const response = await fetch('/api/coin/create', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || 'Failed to create coin');
			}

			await fetchPortfolioData();

			goto(`/coin/${result.coin.symbol}`);
		} catch (e) {
			toast.error('Failed to create coin', {
				description: (e as Error).message || 'An error occurred while creating the coin'
			});
		} finally {
			isSubmitting = false;
		}
	}

	let shouldSignIn = $state(false);
</script>

<SEO
	title="Create Coin - Rugplay"
	description="Launch your own virtual cryptocurrency in the Rugplay simulation game. Create coins with custom names, symbols, and icons."
	keywords="create virtual cryptocurrency, coin creation game, launch crypto simulation, virtual token creation, cryptocurrency game creator"
/>

<SignInConfirmDialog bind:open={shouldSignIn} />

<div class="container mx-auto max-w-5xl px-4 py-6">
	{#if !$PORTFOLIO_DATA}
		<div class="flex h-96 items-center justify-center">
			<div class="text-center">
				<div class="text-muted-foreground mb-4 text-xl">Sign in to create your own coin</div>
				<p class="text-muted-foreground mb-4 text-sm">You need an account to create coins.</p>
				<Button onclick={() => (shouldSignIn = true)} class="w-fit">
					Sign in to continue
				</Button>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Main Form Column -->
			<div class="lg:col-span-2">
				<Card>
					<CardHeader>
						<CardTitle class="text-lg">Coin Details</CardTitle>
					</CardHeader>
					<CardContent>
						<form onsubmit={handleSubmit} class="space-y-6">
							<!-- Icon Upload -->
							<div>
								<Label for="icon">Coin Icon (Optional)</Label>
								<div class="mt-2 space-y-2">
									<label for="icon" class="block cursor-pointer">
										<div
											class="border-muted-foreground/25 bg-muted/50 hover:border-muted-foreground/50 group h-24 w-24 overflow-hidden rounded-full border-2 border-dashed transition-colors"
										>
											<Input
												id="icon"
												type="file"
												accept="image/*"
												onchange={handleIconChange}
												class="hidden"
											/>
											{#if iconPreview}
												<img src={iconPreview} alt="Preview" class="h-full w-full object-cover" />
											{:else}
												<div class="flex h-full items-center justify-center">
													<ImagePlus class="text-muted-foreground h-8 w-8" />
												</div>
											{/if}
										</div>
									</label>
									<p class="{iconError ? 'text-destructive' : 'text-muted-foreground'} text-sm">
										{#if iconError}
											{iconError}
										{:else if iconFile}
											{iconFile.name} ({(iconFile.size / 1024).toFixed(2)} KB)
										{:else}
											Click to upload your coin's icon (PNG or JPG, max 1MB)
										{/if}
									</p>
								</div>
							</div>

							<!-- Name Input -->
							<div class="space-y-2">
								<Label for="name">Coin Name</Label>
								<Input
									id="name"
									type="text"
									bind:value={name}
									placeholder="e.g., Bitcoin"
									required
								/>
								{#if nameError}
									<p class="text-destructive text-xs">{nameError}</p>
								{:else}
									<p class="text-muted-foreground text-sm">
										Choose a memorable name for your cryptocurrency
									</p>
								{/if}
							</div>

							<!-- Symbol Input -->
							<div class="space-y-2">
								<Label for="symbol">Symbol</Label>
								<div class="relative">
									<span
										class="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-sm"
										>*</span
									>
									<Input
										id="symbol"
										type="text"
										bind:value={symbol}
										placeholder="BTC"
										class="pl-8 uppercase"
										required
									/>
								</div>
								{#if symbolError}
									<p class="text-destructive text-xs">{symbolError}</p>
								{:else}
									<p class="text-muted-foreground text-sm">
										Short identifier for your coin (e.g., BTC for Bitcoin). Will be displayed as *{symbol ||
											'SYMBOL'}
									</p>
								{/if}
							</div>

							<!-- Fair Launch Info -->
							<Alert variant="default" class="bg-muted/50">
								<Info class="h-4 w-4" />
								<AlertDescription class="space-y-2">
									<p class="font-medium">Fair Launch Settings</p>
									<div class="text-muted-foreground space-y-1 text-sm">
										<p>• Total Supply: <span class="font-medium">1,000,000,000 tokens</span></p>
										<p>• Starting Price: <span class="font-medium">$0.000001 per token</span></p>
										<p>• You receive <span class="font-medium">100%</span> of the supply</p>
										<p>• Initial Market Cap: <span class="font-medium">$1,000</span></p>
										<p class="mt-2 text-sm">
											These settings ensure a fair start for all traders. The price will increase
											naturally as people buy tokens.
										</p>
									</div>
								</AlertDescription>
							</Alert>

							<!-- Submit Button -->
							<Button type="submit" disabled={!canSubmit} class="w-full" size="lg">
								{#if isSubmitting}
									<Loader2 class="h-4 w-4 animate-spin" />
									Creating...
								{:else}
									<Coins class="h-4 w-4" />
									Create Coin (${TOTAL_COST.toFixed(2)})
								{/if}
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>

			<!-- Right Column - Preview and Info -->
			<div class="space-y-4">
				<!-- Cost Summary Card -->
				{#if $PORTFOLIO_DATA}
					<Card>
						<CardHeader class="pb-2">
							<div class="flex items-center justify-between">
								<CardTitle class="text-base">Cost Summary</CardTitle>
								<div class="text-sm">
									<span class="text-muted-foreground">Balance: </span>
									<span class={hasEnoughFunds ? 'text-green-600' : 'text-destructive'}>
										${$PORTFOLIO_DATA.baseCurrencyBalance.toLocaleString()}
									</span>
								</div>
							</div>
						</CardHeader>
						<CardContent class="space-y-2">
							<div class="flex justify-between text-sm">
								<span class="text-muted-foreground">Creation Fee</span>
								<span>${CREATION_FEE}</span>
							</div>
							<div class="flex justify-between text-sm">
								<span class="text-muted-foreground">Initial Liquidity</span>
								<span>${INITIAL_LIQUIDITY}</span>
							</div>
							<Separator class="my-2" />
							<div class="flex justify-between font-medium">
								<span>Total Cost</span>
								<span class="text-primary">${TOTAL_COST}</span>
							</div>
						</CardContent>
					</Card>
				{/if}

				<!-- Info Card -->
				<Card>
					<CardHeader class="pb-2">
						<CardTitle class="text-base">What Happens After Launch?</CardTitle>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="space-y-3">
							<div class="flex gap-3">
								<div
									class="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-medium"
								>
									1
								</div>
								<div>
									<p class="font-medium">Fair Distribution</p>
									<p class="text-muted-foreground text-sm">
										Everyone starts buying at the same price - no pre-sales or hidden allocations
									</p>
								</div>
							</div>
							<div class="flex gap-3">
								<div
									class="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-medium"
								>
									2
								</div>
								<div>
									<p class="font-medium">Price Discovery</p>
									<p class="text-muted-foreground text-sm">
										Token price increases automatically as more people buy, following a bonding
										curve
									</p>
								</div>
							</div>
							<div class="flex gap-3">
								<div
									class="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-medium"
								>
									3
								</div>
								<div>
									<p class="font-medium">Instant Trading</p>
									<p class="text-muted-foreground text-sm">
										Trading begins immediately - buy, sell, or distribute your tokens as you wish
									</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	{/if}
</div>

<style>
	.container {
		min-height: calc(100vh - 4rem);
	}
</style>
