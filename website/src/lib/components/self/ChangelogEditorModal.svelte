<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Select from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Add01Icon,
		Delete01Icon,
		ImageAdd01Icon,
		Link01Icon,
		CancelCircleIcon,
		Loading03Icon
	} from '@hugeicons/core-free-icons';
	import { toast } from 'svelte-sonner';
	import { getPublicUrl } from '$lib/utils';
	import type { AdminChangelogRelease } from '$lib/types/changelog';

	let {
		open = $bindable(false),
		release = null,
		onSaved
	}: {
		open?: boolean;
		release?: AdminChangelogRelease | null;
		onSaved: () => void;
	} = $props();

	const CATEGORY_OPTIONS = [
		{ value: 'NEW', label: 'New' },
		{ value: 'IMPROVED', label: 'Improved' },
		{ value: 'FIXED', label: 'Fixed' },
		{ value: 'REMOVED', label: 'Removed' }
	] as const;

	type Category = (typeof CATEGORY_OPTIONS)[number]['value'];
	type DraftChange = { category: Category; text: string };

	let version = $state('');
	let title = $state('');
	let summary = $state('');
	let changes = $state<DraftChange[]>([{ category: 'NEW', text: '' }]);

	// Image: either an uploaded file or a pasted URL, never both.
	let imageMode = $state<'upload' | 'url'>('upload');
	let imageFile = $state<File | null>(null);
	let imageUrl = $state('');
	let existingImagePreview = $state<string | null>(null);
	let removeExistingImage = $state(false);

	let isSaving = $state(false);
	let isDeleting = $state(false);

	const isEditing = $derived(release !== null);

	function resetForm() {
		version = release?.version ?? '';
		title = release?.title ?? '';
		summary = release?.summary ?? '';
		changes = release?.changes?.length
			? release.changes.map((c) => ({ category: c.category as Category, text: c.text }))
			: [{ category: 'NEW', text: '' }];

		imageFile = null;
		imageUrl = '';
		removeExistingImage = false;
		if (release?.coverImage) {
			existingImagePreview = release.coverImageIsExternal
				? release.coverImage
				: getPublicUrl(release.coverImage);
			imageMode = release.coverImageIsExternal ? 'url' : 'upload';
		} else {
			existingImagePreview = null;
			imageMode = 'upload';
		}
	}

	$effect(() => {
		if (open) resetForm();
	});

	function addChangeRow() {
		changes = [...changes, { category: 'NEW', text: '' }];
	}

	function removeChangeRow(index: number) {
		changes = changes.filter((_, i) => i !== index);
	}

	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		imageFile = target.files?.[0] ?? null;
		if (imageFile) {
			removeExistingImage = false;
			imageUrl = '';
		}
	}

	function clearImage() {
		imageFile = null;
		imageUrl = '';
		existingImagePreview = null;
		removeExistingImage = true;
	}

	async function handleSave() {
		if (!version.trim()) {
			toast.error('Version is required');
			return;
		}
		const cleanChanges = changes
			.map((c) => ({ category: c.category, text: c.text.trim() }))
			.filter((c) => c.text.length > 0);

		isSaving = true;
		try {
			const formData = new FormData();
			formData.set('version', version.trim());
			formData.set('title', title.trim());
			formData.set('summary', summary.trim());
			formData.set('changes', JSON.stringify(cleanChanges));

			if (imageMode === 'upload' && imageFile) {
				formData.set('image', imageFile);
			} else if (imageMode === 'url' && imageUrl.trim()) {
				formData.set('imageUrl', imageUrl.trim());
			} else if (removeExistingImage) {
				formData.set('removeImage', 'true');
			}

			const url = isEditing ? `/api/admin/changelog/${release!.id}` : '/api/admin/changelog';
			const response = await fetch(url, {
				method: isEditing ? 'PATCH' : 'POST',
				body: formData
			});

			const result = await response.json();
			if (!response.ok) {
				toast.error(result.error || 'Failed to save changelog entry');
				return;
			}
			if (result.warning) {
				toast.warning(result.warning);
			}

			toast.success(isEditing ? 'Changelog entry updated' : 'Changelog entry created');
			open = false;
			onSaved();
		} catch {
			toast.error('Failed to save changelog entry. Please try again.');
		} finally {
			isSaving = false;
		}
	}

	async function handleDelete() {
		if (!release) return;
		if (!confirm(`Delete v${release.version}? This can't be undone.`)) return;

		isDeleting = true;
		try {
			const response = await fetch(`/api/admin/changelog/${release.id}`, { method: 'DELETE' });
			const result = await response.json();
			if (!response.ok) {
				toast.error(result.error || 'Failed to delete changelog entry');
				return;
			}
			toast.success('Changelog entry deleted');
			open = false;
			onSaved();
		} catch {
			toast.error('Failed to delete changelog entry. Please try again.');
		} finally {
			isDeleting = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="flex max-h-[85vh] w-full max-w-lg flex-col gap-0 overflow-hidden p-0 data-[state=open]:animate-none data-[state=closed]:animate-none"
	>
		<Dialog.Header class="border-b px-5 py-4">
			<Dialog.Title>{isEditing ? `Edit v${release?.version}` : 'New changelog entry'}</Dialog.Title>
			<Dialog.Description>
				{isEditing ? 'Update this release.' : 'Publish a new release to the What\'s New modal.'}
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex-1 space-y-4 overflow-y-auto px-5 py-4">
			<div class="grid grid-cols-2 gap-3">
				<div class="space-y-1.5">
					<Label for="cl-version">Version</Label>
					<Input id="cl-version" bind:value={version} placeholder="2.5.0" disabled={isSaving} />
				</div>
				<div class="space-y-1.5">
					<Label for="cl-title">Title (optional)</Label>
					<Input id="cl-title" bind:value={title} placeholder="Short headline" disabled={isSaving} />
				</div>
			</div>

			<div class="space-y-1.5">
				<Label for="cl-summary">Summary (optional)</Label>
				<Textarea
					id="cl-summary"
					bind:value={summary}
					placeholder="One or two sentences under the title"
					rows={2}
					disabled={isSaving}
				/>
			</div>

			<!-- Image: upload OR url -->
			<div class="space-y-1.5">
				<Label>Cover image (optional)</Label>
				<div class="flex gap-1.5">
					<button
						type="button"
						onclick={() => (imageMode = 'upload')}
						class="flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium {imageMode ===
						'upload'
							? 'border-primary bg-primary text-primary-foreground'
							: 'bg-background hover:bg-accent'}"
					>
						<HugeiconsIcon icon={ImageAdd01Icon} class="h-3.5 w-3.5" />
						Upload
					</button>
					<button
						type="button"
						onclick={() => (imageMode = 'url')}
						class="flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium {imageMode ===
						'url'
							? 'border-primary bg-primary text-primary-foreground'
							: 'bg-background hover:bg-accent'}"
					>
						<HugeiconsIcon icon={Link01Icon} class="h-3.5 w-3.5" />
						URL
					</button>
				</div>

				{#if imageMode === 'upload'}
					<Input
						type="file"
						accept="image/png,image/jpeg,image/gif,image/webp"
						onchange={handleFileSelect}
						disabled={isSaving}
					/>
				{:else}
					<Input
						bind:value={imageUrl}
						placeholder="https://example.com/image.png"
						disabled={isSaving}
						oninput={() => (removeExistingImage = false)}
					/>
				{/if}

				{#if existingImagePreview && !removeExistingImage}
					<div class="flex items-center gap-2">
						<img
							src={existingImagePreview}
							alt="Current cover"
							class="h-12 w-20 rounded border object-cover"
						/>
						<button
							type="button"
							onclick={clearImage}
							class="text-muted-foreground hover:text-destructive flex items-center gap-1 text-xs"
						>
							<HugeiconsIcon icon={CancelCircleIcon} class="h-3.5 w-3.5" />
							Remove image
						</button>
					</div>
				{/if}
			</div>

			<!-- Change entries -->
			<div class="space-y-1.5">
				<div class="flex items-center justify-between">
					<Label>Changes</Label>
					<button
						type="button"
						onclick={addChangeRow}
						class="text-primary flex items-center gap-1 text-xs font-medium hover:underline"
					>
						<HugeiconsIcon icon={Add01Icon} class="h-3.5 w-3.5" />
						Add line
					</button>
				</div>

				<div class="space-y-2">
					{#each changes as change, i}
						<div class="flex items-start gap-1.5">
							<Select.Root
								type="single"
								value={change.category}
								onValueChange={(v) => {
									if (v) changes[i].category = v as Category;
								}}
								disabled={isSaving}
							>
								<Select.Trigger class="h-8 w-28 shrink-0 text-xs">
									{CATEGORY_OPTIONS.find((o) => o.value === change.category)?.label}
								</Select.Trigger>
								<Select.Content>
									{#each CATEGORY_OPTIONS as option}
										<Select.Item value={option.value} label={option.label}>
											{option.label}
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>

							<Input
								bind:value={changes[i].text}
								placeholder="Describe the change"
								class="h-8 text-sm"
								disabled={isSaving}
							/>

							<button
								type="button"
								onclick={() => removeChangeRow(i)}
								disabled={changes.length === 1 || isSaving}
								class="text-muted-foreground hover:text-destructive mt-1.5 shrink-0 disabled:opacity-30"
								aria-label="Remove line"
							>
								<HugeiconsIcon icon={Delete01Icon} class="h-4 w-4" />
							</button>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<div class="flex items-center justify-between border-t px-5 py-3">
			{#if isEditing}
				<Button variant="destructive" size="sm" onclick={handleDelete} disabled={isDeleting || isSaving}>
					{#if isDeleting}
						<HugeiconsIcon icon={Loading03Icon} class="h-3.5 w-3.5 animate-spin" />
					{:else}
						<HugeiconsIcon icon={Delete01Icon} class="h-3.5 w-3.5" />
					{/if}
					Delete
				</Button>
			{:else}
				<span></span>
			{/if}

			<div class="flex gap-2">
				<Dialog.Close>
					{#snippet child({ props }: { props: Record<string, unknown> })}
						<Button {...props} size="sm" variant="secondary" disabled={isSaving}>Cancel</Button>
					{/snippet}
				</Dialog.Close>
				<Button size="sm" onclick={handleSave} disabled={isSaving || isDeleting}>
					{#if isSaving}
						<HugeiconsIcon icon={Loading03Icon} class="h-3.5 w-3.5 animate-spin" />
					{/if}
					Save Changes
				</Button>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
