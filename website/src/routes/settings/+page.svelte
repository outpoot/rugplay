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
	import { CheckIcon, Volume2Icon, VolumeXIcon, DownloadIcon, Trash2Icon } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { MAX_FILE_SIZE } from '$lib/data/constants';
	import { volumeSettings } from '$lib/stores/volume-settings';
	import { USER_DATA } from '$lib/stores/user-data';
	import * as Dialog from '$lib/components/ui/dialog';
	import SEO from '$lib/components/self/SEO.svelte';

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

	let deleteDialogOpen = $state(false);
	let deleteConfirmationText = $state('');
	let isDeleting = $state(false);
	let isDownloading = $state(false);

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

	async function downloadUserData() {
		isDownloading = true;
		try {
			const headResponse = await fetch('/api/settings/data-download', {
				method: 'HEAD'
			});

			if (!headResponse.ok) {
				throw new Error('Download service unavailable');
			}

			const contentLength = headResponse.headers.get('Content-Length');
			if (contentLength) {
				const sizeInMB = parseInt(contentLength) / (1024 * 1024);
				if (sizeInMB > 50) {
					const proceed = confirm(
						`Your data export is ${sizeInMB.toFixed(1)}MB. This may take a while to download. Continue?`
					);
					if (!proceed) {
						isDownloading = false;
						return;
					}
				}
			}

			const downloadUrl = '/api/settings/data-download';

			const downloadWindow = window.open(downloadUrl, '_blank');

			if (!downloadWindow || downloadWindow.closed) {
				const a = document.createElement('a');
				a.href = downloadUrl;
				a.style.display = 'none';
				a.target = '_blank';
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
			} else {
				setTimeout(() => {
					try {
						downloadWindow.close();
					} catch (e) {}
				}, 1000);
			}

			toast.success('Your data download has started');
		} catch (error) {
			console.error('Download error:', error);
			toast.error('Failed to start data download: ' + (error as Error).message);
		} finally {
			isDownloading = false;
		}
	}

	async function deleteAccount() {
		if (deleteConfirmationText !== 'DELETE MY ACCOUNT') {
			toast.error('Please type "DELETE MY ACCOUNT" to confirm');
			return;
		}

		isDeleting = true;
		try {
			const response = await fetch('/api/settings/delete-account', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					confirmationText: deleteConfirmationText
				})
			});

			const result = await response.json();

			if (!response.ok) {
				if (response.status === 409) {
					toast.error('Account deletion already scheduled', {
						description: 'You have already requested account deletion. Contact support to cancel.'
					});
				} else {
					throw new Error(result.message || 'Failed to delete account');
				}
			} else {
				toast.success('Account deletion scheduled successfully', {
					description: result.message
				});
			}
		} catch (error: any) {
			console.error('Delete account error:', error);
			toast.error('Failed to delete account: ' + error.message);
		} finally {
			isDeleting = false;
			deleteDialogOpen = false;
			deleteConfirmationText = '';
		}
	}
</script>

<SEO
	title="Settings - Rugplay"
	description="Manage your Rugplay account settings, profile information, audio preferences, and privacy options."
	noindex={true}
	keywords="game account settings, profile settings game, privacy settings, audio settings game"
/>

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

		<Card.Root>
			<Card.Header>
				<Card.Title>Data & Privacy</Card.Title>
				<Card.Description>Manage your personal data and account</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="space-y-4">
					<div class="flex items-center justify-between rounded-lg border p-4">
						<div class="space-y-1">
							<h4 class="text-sm font-medium">Download Your Data</h4>
							<p class="text-muted-foreground text-xs">
								Export a complete copy of your account data including transactions, bets, and
								profile information.
							</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							onclick={downloadUserData}
							disabled={isDownloading}
							class="ml-4"
						>
							<DownloadIcon class="h-4 w-4" />
							{isDownloading ? 'Downloading...' : 'Download Data'}
						</Button>
					</div>

					<div
						class="border-destructive/20 bg-destructive/5 flex items-center justify-between rounded-lg border p-4"
					>
						<div class="space-y-1">
							<h4 class="text-destructive text-sm font-medium">Delete Account</h4>
							<p class="text-muted-foreground text-xs">
								Schedule your account for permanent deletion. This will anonymize your data while
								preserving transaction records for compliance.
							</p>
						</div>
						<Button
							variant="destructive"
							size="sm"
							onclick={() => (deleteDialogOpen = true)}
							class="ml-4"
						>
							<Trash2Icon class="h-4 w-4" />
							Delete Account
						</Button>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>

<Dialog.Root bind:open={deleteDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="text-destructive">Delete Account</Dialog.Title>
			<Dialog.Description>
				This action cannot be undone. Your account will be scheduled for permanent deletion, after a
				grace period of <span class="font-semibold">14 days</span>. Your data will be anonymized.
			</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4">
			<div class="bg-destructive/10 rounded-lg p-4">
				<h4 class="mb-2 text-sm font-medium">What happens when you delete your account:</h4>
				<ul class="text-muted-foreground space-y-1 text-xs">
					<li>• Your profile information will be permanently removed</li>
					<li>• You will be logged out from all devices</li>
					<li>• Your comments will be anonymized</li>
					<li>• Transaction history will be preserved for compliance (anonymized)</li>
					<li>• You will not be able to recover this account</li>
				</ul>
			</div>
			<div class="space-y-2">
				<Label for="delete-confirmation">Type "DELETE MY ACCOUNT" to confirm:</Label>
				<Input
					id="delete-confirmation"
					bind:value={deleteConfirmationText}
					placeholder="DELETE MY ACCOUNT"
					class="font-mono"
				/>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (deleteDialogOpen = false)}>Cancel</Button>
			<Button
				variant="destructive"
				onclick={deleteAccount}
				disabled={isDeleting || deleteConfirmationText !== 'DELETE MY ACCOUNT'}
			>
				{isDeleting ? 'Deleting...' : 'Delete Account'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
