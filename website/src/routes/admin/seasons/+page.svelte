<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { USER_DATA } from '$lib/stores/user-data';
	import { toast } from 'svelte-sonner';

	let current = $state<any>(null);
	let upcoming = $state<any>(null);
	let name = $state('');
	let backgroundImage = $state('');
	let loading = $state(false);
	let saving = $state(false);
	let loaded = false;

	function formatDate(value: string | Date) {
		return new Date(value).toLocaleString();
	}

	function fillForm(season: any) {
		name = season?.name ?? `Season ${(current?.number ?? 0) + 1}`;
		backgroundImage = season?.backgroundImage ?? '';
	}

	async function load() {
		loading = true;
		try {
			const response = await fetch('/api/admin/seasons');
			if (!response.ok) throw new Error('Failed to load seasons');
			const data = await response.json();
			current = data.current;
			upcoming = data.upcoming;
			fillForm(upcoming);
		} catch (error) {
			console.error(error);
			toast.error('Failed to load season settings');
		} finally {
			loading = false;
		}
	}

	async function save() {
		saving = true;
		try {
			const response = await fetch('/api/admin/seasons', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, backgroundImage })
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error ?? 'Failed to save season settings');
			upcoming = data.season;
			fillForm(upcoming);
			toast.success(`Season ${upcoming.number} is scheduled`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to save season settings');
		} finally {
			saving = false;
		}
	}

	$effect(() => {
		if ($USER_DATA?.isAdmin && !loaded) {
			loaded = true;
			load();
		}
	});
</script>

<svelte:head>
	<title>Seasons - Admin | Rugplay</title>
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
	<div class="container mx-auto max-w-3xl space-y-4 p-4">
		<div>
			<h1 class="text-2xl font-bold">Season settings</h1>
			<p class="text-muted-foreground text-sm">Schedule the next season and choose its cover image.</p>
		</div>

		{#if current}
			<Card.Root>
				<Card.Header class="pb-3">
					<Card.Title class="text-lg">Current: {current.name}</Card.Title>
					<Card.Description>Ends {formatDate(current.endsAt)}</Card.Description>
				</Card.Header>
				<Card.Content class="text-sm">The next season begins immediately after this one ends.</Card.Content>
			</Card.Root>
		{/if}

		<Card.Root>
			<Card.Header>
				<Card.Title>{upcoming ? `Edit ${upcoming.name}` : 'Schedule next season'}</Card.Title>
				<Card.Description>
					Use a site path such as <code>/season2_background.webp</code> or an HTTPS image URL.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<form class="space-y-4" onsubmit={(event) => { event.preventDefault(); save(); }}>
					<div class="space-y-2">
						<Label for="season-name">Season name</Label>
						<Input id="season-name" bind:value={name} maxlength={80} required disabled={loading || saving} />
					</div>
					<div class="space-y-2">
						<Label for="background-image">Background image</Label>
						<Input
							id="background-image"
							type="url"
							bind:value={backgroundImage}
							placeholder="/season2_background.webp"
							disabled={loading || saving}
						/>
						<p class="text-muted-foreground text-xs">Leave blank for no cover image.</p>
					</div>
					{#if backgroundImage}
						<img src={backgroundImage} alt="Season background preview" class="h-40 w-full rounded-md border object-cover" />
					{/if}
					<Button type="submit" disabled={loading || saving || !name.trim()}>
						{saving ? 'Saving…' : upcoming ? 'Save season' : 'Schedule season'}
					</Button>
				</form>
			</Card.Content>
		</Card.Root>
	</div>
{/if}
