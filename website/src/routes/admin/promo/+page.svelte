<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Plus, Ticket, Users, Calendar, XCircle, Loader2, CheckIcon } from 'lucide-svelte';
	import { USER_DATA } from '$lib/stores/user-data';
	import { formatDate, getExpirationDate } from '$lib/utils';
	import type { PromoCode } from '$lib/types/promo-code';

	let code = $state('');
	let rewardAmount = $state('');
	let maxUses = $state('');
	let expirationOption = $state('');
	let isCreating = $state(false);
	let createSuccess = $state(false);
	let createMessage = $state('');
	let hasCreateResult = $state(false);

	const expirationOptions = [
		{ value: '1h', label: '1 Hour' },
		{ value: '1d', label: '1 Day' },
		{ value: '3d', label: '3 Days' },
		{ value: '7d', label: '7 Days' },
		{ value: '30d', label: '30 Days' }
	];

	let currentExpirationLabel = $derived(
		expirationOptions.find((option) => option.value === expirationOption)?.label ||
			'Select expiration'
	);

	let promoCodes = $state<PromoCode[]>([]);
	let isLoading = $state(true);
	async function loadPromoCodes() {
		try {
			const response = await fetch('/api/admin/promo');
			if (response.ok) {
				const json = await response.json();

				promoCodes = json.codes;
			} else {
				console.error('Failed to load promo codes:', response.status, response.statusText);
			}
		} catch (error) {
			console.error('Failed to load promo codes:', error);
		} finally {
			isLoading = false;
		}
	}

	let isFormValid = $derived(code.trim() && rewardAmount);

	async function createPromoCode() {
		if (!code.trim() || !rewardAmount) return;

		isCreating = true;
		hasCreateResult = false;

		try {
			const response = await fetch('/api/admin/promo', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					code: code.trim().toUpperCase(),
					rewardAmount: parseFloat(rewardAmount),
					maxUses: maxUses.trim() ? parseInt(maxUses) : null,
					expiresAt: expirationOption ? getExpirationDate(expirationOption) : null
				})
			});

			const result = await response.json();

			createSuccess = response.ok;
			createMessage = response.ok
				? 'Promo code created successfully!'
				: result.error || 'Failed to create promo code';
			hasCreateResult = true;

			if (response.ok) {
				code = '';
				rewardAmount = '';
				maxUses = '';
				expirationOption = '';
				await loadPromoCodes();
			}
		} catch (error) {
			createSuccess = false;
			createMessage = 'Failed to create promo code. Please try again.';
			hasCreateResult = true;
		} finally {
			isCreating = false;
		}
	}

	function handleSubmit(event: Event) {
		event.preventDefault();
		createPromoCode();
	}

	$effect(() => {
		if ($USER_DATA?.isAdmin) {
			loadPromoCodes();
		}
	});
</script>

<svelte:head>
	<title>Promo Codes - Admin | Rugplay</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if !$USER_DATA || !$USER_DATA.isAdmin}
	<div class="flex h-screen items-center justify-center">
		<div class="text-center">
			<h1 class="text-2xl font-bold">Access Denied</h1>
			<p class="text-muted-foreground">You don't have permission to access this page.</p>
		</div>
	</div>
{:else}
	<div class="container mx-auto space-y-4 p-4">
		<div class="flex items-center gap-2">
			<Ticket class="h-5 w-5" />
			<h1 class="text-2xl font-bold">Promo Codes</h1>
		</div>

		<div class="grid gap-4 lg:grid-cols-2">
			<!-- Create Promo Code Form -->
			<Card>
				<CardHeader class="pb-3">
					<CardTitle class="flex items-center gap-2 text-lg">
						<Plus class="h-4 w-4" />
						Create
					</CardTitle>
					<CardDescription class="text-sm">
						Draft a new promo code for users to redeem.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onsubmit={handleSubmit} class="space-y-3">
						<div class="grid gap-3 sm:grid-cols-2">
							<div class="space-y-1">
								<Label for="code" class="text-sm">Code *</Label>
								<Input
									id="code"
									bind:value={code}
									placeholder="WELCOME100"
									disabled={isCreating}
									class="h-8 uppercase"
									style="text-transform: uppercase;"
									required
								/>
							</div>
							<div class="space-y-1">
								<Label for="reward" class="text-sm">Reward Amount *</Label>
								<Input
									id="reward"
									type="number"
									step="0.01"
									min="0"
									bind:value={rewardAmount}
									placeholder="100.00"
									disabled={isCreating}
									class="h-8"
									required
								/>
							</div>
						</div>

						<div class="grid gap-3 sm:grid-cols-2">
							<div class="space-y-1">
								<Label for="maxUses" class="text-sm">Max Uses</Label>
								<Input
									id="maxUses"
									type="number"
									min="1"
									bind:value={maxUses}
									placeholder="Unlimited"
									disabled={isCreating}
									class="h-8"
								/>
							</div>
							<div class="space-y-1">
								<Label for="expires" class="text-sm">Expires In</Label>
								<Select.Root type="single" bind:value={expirationOption} disabled={isCreating}>
									<Select.Trigger class="h-8 w-full">
										{currentExpirationLabel}
									</Select.Trigger>
									<Select.Content>
										<Select.Group>
											{#each expirationOptions as option}
												<Select.Item value={option.value} label={option.label}>
													{option.label}
												</Select.Item>
											{/each}
										</Select.Group>
									</Select.Content>
								</Select.Root>
							</div>
						</div>

						{#if hasCreateResult}
							<Alert
								variant={createSuccess ? 'default' : 'destructive'}
								class={createSuccess ? 'text-success' : ''}
							>
								{#if createSuccess}
									<CheckIcon class="h-4 w-4 text-green-600" />
								{:else}
									<XCircle class="h-4 w-4" />
								{/if}
								<AlertDescription class={createSuccess ? 'text-green-800 dark:text-green-200' : ''}>
									{createMessage}
									{#if createSuccess && rewardAmount}
										<span class="font-semibold"> (+${rewardAmount} reward)</span>
									{/if}
								</AlertDescription>
							</Alert>
						{/if}

						<Button
							type="submit"
							disabled={!isFormValid || isCreating}
							class="h-8 w-full"
							size="sm"
						>
							{#if isCreating}
								<Loader2 class="h-3 w-3 animate-spin" />
								Creating...
							{:else}
								<Plus class="h-3 w-3" />
								Create Code
							{/if}
						</Button>
					</form>
				</CardContent>
			</Card>

			<!-- Existing Promo Codes -->
			<Card>
				<CardHeader class="pb-3">
					<CardTitle class="text-lg">Active</CardTitle>
					<CardDescription class="text-sm">Manage existing promo codes.</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="space-y-3">
						{#if isLoading}
							{#each Array(3) as _}
								<div class="space-y-2 rounded-lg border p-3">
									<div class="flex items-center justify-between">
										<Skeleton class="h-4 w-20" />
										<Skeleton class="h-5 w-14" />
									</div>
									<div class="grid grid-cols-2 gap-2">
										<Skeleton class="h-3 w-16" />
										<Skeleton class="h-3 w-12" />
									</div>
								</div>
							{/each}
						{:else if promoCodes.length === 0}
							<div class="text-muted-foreground py-6 text-center">
								<Ticket class="mx-auto mb-2 h-8 w-8 opacity-50" />
								<p class="text-sm">No codes created yet.</p>
							</div>
						{:else}
							{#each promoCodes as promo (promo.id)}
								<div class="space-y-2 rounded-lg border p-3">
									<div class="flex items-center justify-between">
										<code class="bg-muted rounded px-2 py-1 font-mono text-sm font-semibold">
											{promo.code}
										</code>
										<Badge variant={promo.isActive ? 'default' : 'secondary'} class="text-xs">
											{promo.isActive ? 'Active' : 'Inactive'}
										</Badge>
									</div>

									<div class="grid grid-cols-2 gap-3 text-xs">
										<span>${promo.rewardAmount}</span>
										<div class="flex items-center gap-1">
											<Users class="h-3 w-3" />
											<span>{promo.usedCount || 0}{promo.maxUses ? `/${promo.maxUses}` : ''}</span>
										</div>
										<div class="flex items-center gap-1">
											<Calendar class="h-3 w-3" />
											<span>{formatDate(promo.createdAt)}</span>
										</div>
										{#if promo.expiresAt}
											<div class="flex items-center gap-1">
												<Calendar class="h-3 w-3" />
												<span>Exp: {formatDate(promo.expiresAt)}</span>
											</div>
										{:else}
											<div class="flex items-center gap-1">
												<Calendar class="h-3 w-3" />
												<span>No expiry</span>
											</div>
										{/if}
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</CardContent>
			</Card>
		</div>
	</div>
{/if}
