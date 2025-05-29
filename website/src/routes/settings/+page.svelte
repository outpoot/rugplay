<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { getPublicUrl, debounce } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Card from '$lib/components/ui/card';
	import { Slider } from '$lib/components/ui/slider';
	import { onMount, onDestroy } from 'svelte';
	import { CheckIcon, Volume2Icon, VolumeXIcon } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { MAX_FILE_SIZE } from '$lib/data/constants';
	import { volumeSettings } from '$lib/stores/volume-settings';
	import { USER_DATA } from '$lib/stores/user-data';

	let name = $state($USER_DATA?.name || '');
	let bio = $state($USER_DATA?.bio ?? '');
	let username = $state($USER_DATA?.username || '');

	const initialUsername = $USER_DATA?.username || '';
	let avatarFile: FileList | undefined = $state(undefined);

	let previewUrl: string | null = $state(null);
	let currentAvatarUrl = $derived(previewUrl || getPublicUrl($USER_DATA?.image ?? null));

	let isDirty = $derived(
		name !== ($USER_DATA?.name || '') ||
			bio !== ($USER_DATA?.bio ?? '') ||
			username !== ($USER_DATA?.username || '') ||
			avatarFile !== undefined
	);

	let fileInput: HTMLInputElement;

	let loading = $state(false);
	let usernameAvailable: boolean | null = $state(null);
	let checkingUsername = $state(false);

	let masterVolume = $state(($USER_DATA?.volumeMaster || 0) * 100);
	let isMuted = $state($USER_DATA?.volumeMuted || false);

	function beforeUnloadHandler(e: BeforeUnloadEvent) {
		if (isDirty) {
			e.preventDefault();
		}
	}

	onMount(() => {
		window.addEventListener('beforeunload', beforeUnloadHandler);
		volumeSettings.setMaster($USER_DATA?.volumeMaster || 0);
		volumeSettings.setMuted($USER_DATA?.volumeMuted || false);
	});

	onDestroy(() => {
		window.removeEventListener('beforeunload', beforeUnloadHandler);
	});

	function handleAvatarClick() {
		fileInput.click();
	}
	function handleAvatarChange(e: Event) {
		const f = (e.target as HTMLInputElement).files?.[0];
		if (f) {
			// Check file size
			if (f.size > MAX_FILE_SIZE) {
				toast.error('Profile picture must be smaller than 1MB');
				(e.target as HTMLInputElement).value = '';
				return;
			}

			// Check file type
			if (!f.type.startsWith('image/')) {
				toast.error('Please select a valid image file');
				(e.target as HTMLInputElement).value = '';
				return;
			}

			previewUrl = URL.createObjectURL(f);
			const files = (e.target as HTMLInputElement).files;
			if (files) avatarFile = files;
		}
	}

	const checkUsername = debounce(async (val: string) => {
		if (val.length < 3) return (usernameAvailable = null);
		checkingUsername = true;
		const res = await fetch(`/api/settings/check-username?username=${val}`);
		usernameAvailable = (await res.json()).available;
		checkingUsername = false;
	}, 500);

	$effect(() => {
		if (username !== initialUsername) checkUsername(username);
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;

		try {
			const fd = new FormData();
			fd.append('name', name);
			fd.append('bio', bio);
			fd.append('username', username);
			if (avatarFile?.[0]) fd.append('avatar', avatarFile[0]);

			const res = await fetch('/api/settings', { method: 'POST', body: fd });

			if (res.ok) {
				await invalidateAll();
				toast.success('Settings updated successfully!', {
					action: { label: 'Refresh', onClick: () => window.location.reload() }
				});
			} else {
				const result = await res.json();
				toast.error('Failed to update settings', {
					description: result.message || 'An error occurred while updating your settings'
				});
			}
		} catch (error) {
			toast.error('Failed to update settings', {
				description: 'An unexpected error occurred'
			});
		} finally {
			loading = false;
		}
	}

	const debouncedSaveVolume = debounce(async (settings: { master: number; muted: boolean }) => {
		try {
			const response = await fetch('/api/settings/volume', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(settings)
			});

			if (!response.ok) {
				throw new Error('Failed to save volume settings');
			}
		} catch (error) {
			console.error('Failed to save volume settings:', error);
			toast.error('Failed to save volume settings');
		}
	}, 500);

	async function saveVolumeToServer(settings: { master: number; muted: boolean }) {
		debouncedSaveVolume(settings);
	}

	function handleMasterVolumeChange(value: number) {
		masterVolume = value;
		const normalizedValue = value / 100;
		volumeSettings.setMaster(normalizedValue);
		saveVolumeToServer({ master: normalizedValue, muted: isMuted });
	}

	function toggleMute() {
		isMuted = !isMuted;
		volumeSettings.setMuted(isMuted);
		saveVolumeToServer({ master: masterVolume / 100, muted: isMuted });
	}
</script>

<div class="container mx-auto max-w-2xl p-6">
	<h1 class="mb-6 text-2xl font-bold">Settings</h1>

	<div class="space-y-6">
		<Card.Root>
			<Card.Header>
				<Card.Title>Profile Settings</Card.Title>
				<Card.Description>Update your profile information</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="mb-6 flex items-center gap-4">
					<div
						class="group relative cursor-pointer"
						role="button"
						tabindex="0"
						onclick={handleAvatarClick}
						onkeydown={(e) => e.key === 'Enter' && handleAvatarClick()}
					>
						<Avatar.Root class="size-20">
							<Avatar.Image src={currentAvatarUrl} alt={name} />
							<Avatar.Fallback>?</Avatar.Fallback>
						</Avatar.Root>
						<div
							class="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
						>
							<span class="text-xs text-white">Change</span>
						</div>
					</div>
					<div>
						<h3 class="text-lg font-semibold">{name}</h3>
						<p class="text-muted-foreground text-sm">@{username}</p>
					</div>
				</div>

				<input
					type="file"
					accept="image/*"
					class="hidden"
					bind:this={fileInput}
					onchange={handleAvatarChange}
				/>

				<form onsubmit={handleSubmit} class="space-y-4">
					<div class="space-y-2">
						<Label for="name">Display Name</Label>
						<Input id="name" bind:value={name} required />
					</div>

					<div class="space-y-2">
						<Label for="username">Username</Label>
						<div class="relative">
							<span class="text-muted-foreground absolute left-3 top-4 -translate-y-1/2 transform"
								>@</span
							>
							<Input
								id="username"
								bind:value={username}
								required
								pattern={'^[a-zA-Z0-9_]{3,30}$'}
								class="pl-8"
							/>
							<div class="absolute right-3 top-1.5">
								{#if checkingUsername}
									<span class="text-muted-foreground text-sm">Checking…</span>
								{:else if username !== initialUsername}
									{#if usernameAvailable}
										<CheckIcon class="text-success" />
									{:else}
										<span class="text-destructive text-sm">Taken</span>
									{/if}
								{/if}
							</div>
						</div>
						<p class="text-muted-foreground text-xs">
							Only letters, numbers, underscores. 3–30 characters.
						</p>
					</div>

					<div class="space-y-2">
						<Label for="bio">Bio</Label>
						<Textarea id="bio" bind:value={bio} rows={4} placeholder="Tell us about yourself" />
					</div>

					<Button type="submit" disabled={loading || !isDirty}>
						{loading ? 'Saving…' : 'Save Changes'}
					</Button>
				</form>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Audio Settings</Card.Title>
				<Card.Description>Adjust volume for game sounds</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<Label class="text-base font-medium">Volume</Label>
						<div class="flex items-center gap-2">
							<Button variant="ghost" size="sm" onclick={toggleMute} class="h-8 w-8 p-0">
								{#if isMuted}
									<VolumeXIcon class="h-4 w-4" />
								{:else}
									<Volume2Icon class="h-4 w-4" />
								{/if}
							</Button>
							<span class="text-muted-foreground w-10 text-right text-sm"
								>{Math.round(masterVolume)}%</span
							>
						</div>
					</div>
					<Slider
						type="single"
						value={masterVolume}
						onValueChange={handleMasterVolumeChange}
						max={100}
						step={1}
						disabled={isMuted}
					/>
					<p class="text-muted-foreground text-xs">
						Controls all game sounds including effects and background audio
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
