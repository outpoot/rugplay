<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { formatValue } from '$lib/utils';
	import { showJoinConfirm, pendingJoinInfo, pendingJoinIsSpectator, isLoading } from '../stores';
	import { confirmJoin, cancelJoin } from '../api/actions';

	let { balance }: { balance: number } = $props();
</script>
<!-- handles the little dialog you see when you join someone -->
{#if $showJoinConfirm && $pendingJoinInfo}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<Card class="w-full max-w-sm mx-4">
			<CardHeader>
				<CardTitle>Confirm Join</CardTitle>
				<CardDescription>Review your entry before joining</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="space-y-2 text-sm">
					<div class="flex justify-between">
						<span class="text-muted-foreground">Hosted by</span>
						<span class="font-semibold">{$pendingJoinInfo.hostUsername}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Buy-in</span>
						<span class="font-semibold">{formatValue($pendingJoinInfo.buyIn)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Players</span>
						<span class="font-semibold">{$pendingJoinInfo.playerCount}/{$pendingJoinInfo.maxPlayers}</span>
					</div>
					{#if balance < $pendingJoinInfo.buyIn && !$pendingJoinIsSpectator}
						<div class="bg-destructive/10 border border-destructive/30 rounded p-2 mt-3">
							<p class="text-xs text-destructive font-semibold">Insufficient balance to buy-in. Join as spectator instead.</p>
						</div>
					{/if}
				</div>

				<div class="flex gap-2 pt-2">
					<Button variant="outline" onclick={cancelJoin} disabled={$isLoading} class="flex-1">
						Cancel
					</Button>
					{#if $pendingJoinIsSpectator}
						<Button onclick={() => confirmJoin(true)} disabled={$isLoading} class="flex-1">
							Join as Spectator
						</Button>
					{:else}
						<Button onclick={() => confirmJoin(false)} disabled={$isLoading || balance < $pendingJoinInfo.buyIn} class="flex-1">
							Join
						</Button>
					{/if}
				</div>
			</CardContent>
		</Card>
	</div>
{/if}
