<script lang="ts">
	import { page } from '$app/stores';
	import * as Card from '$lib/components/ui/card';
	import { AlertTriangle } from 'lucide-svelte';

	let reason = $derived($page.url.searchParams.get('reason') || 'none');
</script>

<div class="container mx-auto max-w-2xl py-20">
	<Card.Root class="border-primary">
		<Card.Header class="text-center">
			<div
				class="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
			>
				<AlertTriangle class="text-primary h-8 w-8" />
			</div>
			<Card.Title class="text-primary text-2xl">Account Suspended</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4 text-center">
			<p class="text-muted-foreground">
				REASON PROVIDED BY ADMINS: {reason}
			</p>
			<p class="text-muted-foreground text-sm">
				If you believe this is an error, <a
					href="https://discord.gg/cKWNV2uZUP"
					class="text-primary underline">please contact support</a
				>.
			</p>
		</Card.Content>
	</Card.Root>
</div>
