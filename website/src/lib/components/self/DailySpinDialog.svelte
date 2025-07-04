<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import DailySpinWheel from './DailySpinWheel.svelte';
	import { Gift } from 'lucide-svelte';

	let { open = $bindable() } = $props<{
		open?: boolean;
	}>();
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md p-0">
		<Dialog.Header class="p-6 pb-0">
			<Dialog.Title class="flex items-center gap-2">
				<Gift class="h-5 w-5" />
				Daily Spin
			</Dialog.Title>
			<Dialog.Description>Spin the wheel to win your daily reward!</Dialog.Description>
		</Dialog.Header>
		<DailySpinWheel />
	</Dialog.Content>
</Dialog.Root>