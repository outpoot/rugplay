<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		GiftIcon,
		CancelCircleIcon,
		Loading03Icon,
		Tick01Icon
	} from '@hugeicons/core-free-icons';

	let { open = $bindable() } = $props();

	let promoCode = $state('');
	let isVerifying = $state(false);
	let isSuccess = $state(false);
	let message = $state('');
	let hasResult = $state(false);

	async function verifyPromoCode() {
		if (!promoCode.trim()) return;

		isVerifying = true;
		hasResult = false;

		try {
			const response = await fetch('/api/promo/verify', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ code: promoCode.trim() })
			});

			const result = await response.json();

			isSuccess = response.ok;
			message = response.ok ? result.message : result.error;
			hasResult = true;
		} catch (error) {
			isSuccess = false;
			message = 'Failed to verify promo code. Please try again.';
			hasResult = true;
		} finally {
			isVerifying = false;
		}
	}

	function handleSubmit(event: Event) {
		event.preventDefault();
		verifyPromoCode();
	}

	function resetDialog() {
		promoCode = '';
		isSuccess = false;
		message = '';
		hasResult = false;
		isVerifying = false;
	}

	$effect(() => {
		if (!open) {
			resetDialog();
		}
	});
</script>

<Dialog.Root
	bind:open
	onOpenChange={(isOpen) => {
		if (!isOpen) resetDialog();
	}}
>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<HugeiconsIcon icon={GiftIcon} class="h-5 w-5" />
				Promo Code
			</Dialog.Title>
			<Dialog.Description>
				Enter your promo code below to redeem rewards and bonuses.
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleSubmit} class="space-y-4">
			<div class="space-y-2">
				<Label for="promo-code">Promo Code</Label>
				<Input
					id="promo-code"
					bind:value={promoCode}
					placeholder="CODE..."
					disabled={isVerifying}
					class="uppercase"
					style="text-transform: uppercase;"
				/>
			</div>

			{#if hasResult}
				<Alert
					variant={isSuccess ? 'default' : 'destructive'}
					class={isSuccess ? 'text-success' : ''}
				>
					{#if isSuccess}
						<HugeiconsIcon icon={Tick01Icon} class="h-4 w-4" />
					{:else}
						<HugeiconsIcon icon={CancelCircleIcon} class="h-4 w-4" />
					{/if}
					<AlertDescription>
						{message}
					</AlertDescription>
				</Alert>
			{/if}

			<div class="flex justify-end gap-2">
				<Button
					type="button"
					variant="outline"
					onclick={() => (open = false)}
					disabled={isVerifying}
				>
					Cancel
				</Button>
				<Button type="submit" disabled={!promoCode.trim() || isVerifying}>
					{#if isVerifying}
						<HugeiconsIcon icon={Loading03Icon} class="h-4 w-4 animate-spin" />
						Verifying...
					{:else}
						Redeem Code
					{/if}
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
