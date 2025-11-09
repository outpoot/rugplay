<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Progress } from '$lib/components/ui/progress';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Avatar from '$lib/components/ui/avatar';
	import { AlertTriangle, Loader2, Star } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { USER_DATA } from '$lib/stores/user-data';
	import { formatValue, getPublicUrl, PRESTIGE_COSTS } from '$lib/utils';
	import SEO from '$lib/components/self/SEO.svelte';
	import SignInConfirmDialog from '$lib/components/self/SignInConfirmDialog.svelte';
	import ProfileBadges from '$lib/components/self/ProfileBadges.svelte';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import PrestigeSkeleton from '$lib/components/self/skeletons/PrestigeSkeleton.svelte';
	import { _ } from 'svelte-i18n';

	let isPrestiging = $state(false);
	let error = $state('');
	let shouldSignIn = $state(false);
	let loading = $state(true);
	let showConfirmDialog = $state(false);
	let confirmationText = $state('');
	let prestigeData = $state<any>(null);

	let userData = $derived($USER_DATA);

	const currentPrestige = $derived(prestigeData?.profile?.prestigeLevel || 0);
	const nextPrestige = $derived(currentPrestige + 1);
	const prestigeCost = $derived.by(() => {
		if (!prestigeData) return null;
		const nextLevel = currentPrestige + 1;
		return PRESTIGE_COSTS[nextLevel as keyof typeof PRESTIGE_COSTS] || null;
	});
	const prestigeName = $derived.by(() => {
		if (!prestigeData) return null;
		const nextLevel = currentPrestige + 1;
		return $_(`prestige.levels.d.${nextLevel}`) || null;
	});
	const currentBalance = $derived(prestigeData?.profile?.baseCurrencyBalance || 0);
	const holdingsValue = $derived(prestigeData?.stats?.holdingsValue || 0);
	const totalValue = $derived(prestigeData?.profile?.totalPortfolioValue || 0);
	const canAfford = $derived(prestigeCost ? currentBalance >= prestigeCost : false);
	const hasMaxPrestige = $derived(!prestigeCost);
	const progressPercentage = $derived(
		prestigeCost ? Math.min((currentBalance / prestigeCost) * 100, 100) : 100
	);
	const amountNeeded = $derived(prestigeCost ? Math.max(prestigeCost - currentBalance, 0) : 0);

	onMount(async () => {
		await fetchPrestigeData();
		loading = false;
	});

	async function fetchPrestigeData() {
		if (!userData) return;

		try {
			const response = await fetch('/api/prestige');
			if (!response.ok) throw new Error($_("prestige.err"));
			prestigeData = await response.json();
		} catch (e) {
			console.error('Failed to fetch prestige data:', e);
			toast.error($_("prestige.err"));
		}
	}

	async function handlePrestige() {
		if (!canAfford || !userData) return;

		isPrestiging = true;
		error = '';

		try {
			const response = await fetch('/api/prestige', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || $_("prestige.popup.err"));
			}

			toast.success($_("prestige.popup.done").replace("{{name}}", prestigeName ?? ''));
			await fetchPrestigeData();
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : $_("error.unknown");
			error = errorMessage;
			toast.error(errorMessage);
		} finally {
			isPrestiging = false;
			showConfirmDialog = false;
			confirmationText = '';
		}
	}

	function openConfirmDialog() {
		if (!canAfford || !userData) return;
		showConfirmDialog = true;
	}

	function closeConfirmDialog() {
		showConfirmDialog = false;
		confirmationText = '';
	}
	$effect(() => {
		console.log(currentPrestige);
	});
	const canConfirmPrestige = $derived(confirmationText.toUpperCase() === 'PRESTIGE');
</script>

<SEO
	title="Prestige - Rugplay"
	description="Advance your trading status and reset your progress for prestige rewards in the Rugplay cryptocurrency simulation."
	noindex={true}
/>

<SignInConfirmDialog bind:open={shouldSignIn} />

<!-- Prestige Confirmation Dialog -->
<Dialog.Root bind:open={showConfirmDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<AlertTriangle class="text-destructive h-5 w-5" />
				{$_("prestige.popup.title")}
			</Dialog.Title>
			<Dialog.Description>
				{$_("prestige.popup.description")}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<Alert variant="destructive">
				<AlertTriangle class="h-4 w-4" />
				<AlertDescription>
					<strong>{$_("prestige.popup.lose.0")}</strong>
					<ul class="mt-2 list-disc space-y-1 pl-4">
						<li>{$_("prestige.popup.lose.1").replace("{{amount}}", formatValue(currentBalance))}</li>
						{#if holdingsValue > 0}
							<li>{$_("prestige.popup.lose.2").replace("{{amount}}", formatValue(holdingsValue))}</li>
						{/if}
						<li>{$_("prestige.popup.lose.3").replace("{{amount}}", formatValue(totalValue))}</li>
					</ul>
					<strong class="mt-2 block text-green-600">{$_("prestige.popup.gain.0")}</strong>
					<ul class="mt-1 list-disc space-y-1 pl-4">
						<li>{$_("prestige.popup.gain.1")}</li>
						<li>{$_("prestige.popup.gain.2")}</li>
						<li>{$_("prestige.popup.gain.3")}</li>
					</ul>
					{$_("prestige.popup.gain.4")}
				</AlertDescription>
			</Alert>

			<div class="space-y-2">
				<Label for="confirmation" class="text-sm font-medium">{$_("prestige.popup.confirm.0")}</Label>
				<Input
					id="confirmation"
					bind:value={confirmationText}
					placeholder={$_("prestige.popup.confirm.1")}
					class="uppercase"
				/>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="ghost" onclick={closeConfirmDialog}>{$_("base.cancel")}</Button>
			<Button onclick={handlePrestige} disabled={!canConfirmPrestige || isPrestiging}>
				{#if isPrestiging}
					<Loader2 class="h-4 w-4 animate-spin" />
					{$_("prestige.popup.proceed.0")}
				{:else}
					{$_("prestige.popup.proceed.1")}
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<div class="container mx-auto max-w-7xl p-6">
	<header class="mb-8">
		<div class="text-center">
			<div class="mb-2 flex items-center justify-center gap-3">
				<Star class="h-8 w-8 text-yellow-500" />
				<h1 class="text-3xl font-bold">{$_('prestige.title')}</h1>
			</div>
			<p class="text-muted-foreground mb-6">{$_('prestige.description')}</p>
		</div>
	</header>

	{#if loading}
		<PrestigeSkeleton />
	{:else if !userData}
		<div class="flex h-96 items-center justify-center">
			<div class="text-center">
				<div class="text-muted-foreground mb-4 text-xl">{$_("prestige.signin.title")}</div>
				<p class="text-muted-foreground mb-4 text-sm">{$_("prestige.signin.description")}</p>
				<Button onclick={() => (shouldSignIn = true)}>{$_("signin.button")}</Button>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Main Content Column -->
			<div class="flex flex-col lg:col-span-2">
				<!-- How -->
				<Card.Root class="mb-6 gap-1">
					<Card.Header class="pb-2">
						<Card.Title class="text-base">{$_("prestige.how.0")}</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
							<div class="flex gap-3">
								<div
									class="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-medium"
								>
									1
								</div>
								<div>
									<p class="font-medium">{$_("prestige.how.1.0")}</p>
									<p class="text-muted-foreground text-sm">
										{$_("prestige.how.1.1")}
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
									<p class="font-medium">{$_("prestige.how.2.0")}</p>
									<p class="text-muted-foreground text-sm">
										{$_("prestige.how.2.1")}
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
									<p class="font-medium">{$_("prestige.how.3.0")}</p>
									<p class="text-muted-foreground text-sm">
										{$_("prestige.how.3.1")}
									</p>
								</div>
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				{#if !hasMaxPrestige}
					<!-- Prestige Requirements -->
					<Card.Root class="flex flex-1 flex-col gap-1">
						<Card.Header>
							<Card.Title class="flex items-center gap-2">
								<Star class="h-5 w-5" />
								{$_("prestige.progress.title")}
							</Card.Title>
						</Card.Header>
						<Card.Content class="flex flex-1 flex-col space-y-6">
							<!-- Progress Section -->
							<div class="space-y-6">
								<div class="space-y-2">
									<div class="flex items-center justify-between text-sm">
										<span class="font-medium">{$_("prestige.progress.description").replace("{{name}}",prestigeName ?? '')}</span>
										<span class="font-mono">{progressPercentage.toFixed(1)}%</span>
									</div>
									<Progress value={progressPercentage} class="h-2" />
								</div>

								<!-- Financial Details Table -->
								<div class="overflow-hidden rounded-xl border">
									<table class="w-full text-sm">
										<tbody class="divide-y">
											<tr>
												<td class="text-muted-foreground px-3 py-2 font-medium">{$_("prestige.progress.required")}:</td>
												<td class="px-3 py-2 text-right font-mono font-bold">
													{formatValue(prestigeCost || 0)}
												</td>
											</tr>
											<tr>
												<td class="text-muted-foreground px-3 py-2 font-medium">{$_("prestige.progress.yourCash")}:</td>
												<td
													class="px-3 py-2 text-right font-mono font-bold"
													class:text-green-600={canAfford}
													class:text-red-600={!canAfford}
												>
													{formatValue(currentBalance)}
												</td>
											</tr>
											{#if !canAfford}
												<tr>
													<td class="text-muted-foreground px-3 py-2 font-medium">{$_("prestige.progress.stillNeeded")}:</td>
													<td class="px-3 py-2 text-right font-mono font-bold text-red-600">
														{formatValue(amountNeeded)}
													</td>
												</tr>
											{/if}
										</tbody>
									</table>
								</div>
							</div>

							{#if !canAfford}
								<Label>{$_("prestige.progress.tip")}</Label>
							{:else}
								<Alert variant="destructive">
									<AlertTriangle class="h-4 w-4" />
									<AlertDescription>{$_("prestige.progress.perma")}</AlertDescription>
								</Alert>
							{/if}

							<!-- Prestige Button -->
							<Button
								onclick={canAfford ? openConfirmDialog : undefined}
								disabled={!canAfford || isPrestiging}
								class="w-full"
								size="lg"
								variant={canAfford ? 'default' : 'secondary'}
							>
								{#if isPrestiging}
									<Loader2 class="h-4 w-4 animate-spin" />
									{$_("prestige.progress.button.2").replace("{{name}}", prestigeName ?? '')}
								{:else if !canAfford}
									{$_("prestige.progress.button.0").replace("{{bal}}", formatValue(amountNeeded))}
								{:else}
									{$_("prestige.progress.button.1")}
								{/if}
							</Button>
						</Card.Content>
					</Card.Root>
				{:else}
					<!-- Max Prestige Card -->
					<Card.Root class="flex flex-1 flex-col gap-1">
						<Card.Content class="py-16 text-center">
							<Star class="mx-auto mb-6 h-20 w-20 text-yellow-500" />
							<h3 class="mb-3 text-2xl font-bold">{$_("prestige.progress.star.0")}</h3>
							<p class="text-muted-foreground">
								{$_("prestige.progress.star.1")}
							</p>
						</Card.Content>
					</Card.Root>
				{/if}

				<!-- Error Messages -->
				{#if error}
					<Alert class="mt-6">
						<AlertTriangle class="h-4 w-4" />
						<AlertDescription class="text-red-600">
							❌ {error}
						</AlertDescription>
					</Alert>
				{/if}
			</div>

			<!-- Right Column - Info -->
			<div class="flex flex-col space-y-4">
				<!-- Profile Preview Card -->
				{#if userData}
					<Card.Root class="flex-1 gap-1">
						<Card.Header class="pb-2">
							<Card.Title class="text-base">{$_("prestige.preview.title")}</Card.Title>
						</Card.Header>
						<Card.Content class="space-y-4">
							<!-- Current Profile -->
							<div class="space-y-2">
								<Label class="text-muted-foreground text-xs">{$_("prestige.preview.current")}</Label>
								<div class="flex items-center gap-3 rounded-lg border p-3">
									<Avatar.Root class="h-10 w-10 shrink-0">
										<Avatar.Image src={getPublicUrl(userData.image)} alt={userData.name} />
										<Avatar.Fallback class="text-sm"
											>{userData.name?.charAt(0) || '?'}</Avatar.Fallback
										>
									</Avatar.Root>
									<div class="min-w-0 flex-1">
										<div class="flex min-w-0 items-center gap-2">
											<h4 class="truncate text-sm font-medium">{userData.name}</h4>
											<ProfileBadges
												user={{
													...userData,
													id: parseInt(userData.id),
													prestigeLevel: currentPrestige,
													createdAt: new Date(),
													totalPortfolioValue: totalValue,
													loginStreak: 0
												}}
												showId={false}
												size="sm"
											/>
										</div>
										<p class="text-muted-foreground truncate text-xs">@{userData.username}</p>
									</div>
								</div>
							</div>

							<!-- Prestige Preview -->
							<div class="space-y-2">
								<Label class="text-muted-foreground text-xs">{$_("prestige.preview.after")}</Label>
								<div
									class="flex items-center gap-3 rounded-lg border-2 border-yellow-500/30 bg-yellow-50/50 p-3 dark:bg-yellow-950/20"
								>
									<Avatar.Root class="h-10 w-10 shrink-0">
										<Avatar.Image src={getPublicUrl(userData.image)} alt={userData.name} />
										<Avatar.Fallback class="text-sm"
											>{userData.name?.charAt(0) || '?'}</Avatar.Fallback
										>
									</Avatar.Root>
									<div class="min-w-0 flex-1">
										<div class="flex min-w-0 items-center gap-2">
											<h4 class="truncate text-sm font-medium">{userData.name}</h4>
											<ProfileBadges
												user={{
													...userData,
													id: parseInt(userData.id),
													prestigeLevel: nextPrestige,
													createdAt: new Date(),
													totalPortfolioValue: totalValue,
													loginStreak: 0
												}}
												showId={false}
												size="sm"
											/>
										</div>
										<p class="text-muted-foreground truncate text-xs">@{userData.username}</p>
									</div>
								</div>
							</div>
							<p class="text-xs">{$_("prestige.preview.description").replace("{{percent}}", "25")}</p>
						</Card.Content>
					</Card.Root>
				{/if}

				<!-- All Prestige Levels -->
				<Card.Root class="flex-1 gap-1">
					<Card.Header class="pb-2">
						<Card.Title class="text-base">{$_("prestige.levels.title")}</Card.Title>
					</Card.Header>
					<Card.Content>
						{#each Object.entries(PRESTIGE_COSTS) as [level, cost]}
							{@const levelNum = parseInt(level)}
							{@const isCurrentNext = levelNum === nextPrestige && !hasMaxPrestige}
							{@const isAchieved = levelNum <= currentPrestige}
							<div
								class="flex items-center justify-between py-1"
								class:opacity-50={!isAchieved && !isCurrentNext}
							>
								<div class="flex items-center gap-2">
									{#if isAchieved}
										<Star class="h-4 w-4 text-yellow-500" />
									{:else if isCurrentNext}
										<ChevronRight class="h-4 w-4 text-blue-500" />
									{:else}
										<div class="h-4 w-4"></div>
									{/if}
									<span class="text-sm font-medium" class:text-yellow-600={isAchieved}>
										{$_(`prestige.levels.d.${levelNum}`)}
									</span>
								</div>
								<span class="font-mono text-xs">{formatValue(cost)}</span>
							</div>
						{/each}
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	{/if}
</div>

<style>
	.container {
		min-height: calc(100vh - 4rem);
	}
</style>
