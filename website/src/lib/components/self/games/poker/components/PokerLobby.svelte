<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { handleBuyInInput, handleBuyInBlur, handleLobbyMaxPlayersInput } from '../api/handlers';
	import { buyInDisplay, lobbyMaxPlayersDisplay, isLoading } from '../stores';
	import { createTable, requestJoin } from '../api/actions';

	let code = $state('');
</script>

<div class="space-y-6 px-6 py-6">
	<!-- Creating the game basically. just the input fields -->
	<div class="space-y-3">
		<h3 class="font-bold text-sm">Create Game</h3>
		<div class="space-y-2">
			<div>
				<label for="buyInInput" class="text-xs text-muted-foreground">Buy-in amount</label>
				<Input
					id="buyInInput"
					type="text"
					value={$buyInDisplay}
					oninput={handleBuyInInput}
					onblur={handleBuyInBlur}
					placeholder="Enter buy-in"
					disabled={$isLoading}
					class="text-sm"
				/>
			</div>
			<div>
				<label for="maxPlayersInput" class="text-xs text-muted-foreground">Max players</label>
				<Input
					id="maxPlayersInput"
					type="number"
					value={$lobbyMaxPlayersDisplay}
					oninput={handleLobbyMaxPlayersInput}
					placeholder="Enter max players"
					min="2"
					max="6"
					disabled={$isLoading}
					class="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
				/>
			</div>
			<Button class="w-full" onclick={createTable} disabled={$isLoading}>
				{$isLoading ? 'Creating...' : 'Create Game'}
			</Button>
		</div>
	</div>

	<!-- And the join game part -->
	<div class="space-y-3">
		<h3 class="font-bold text-sm">Join Game</h3>
		<div class="space-y-2">
			<div>
				<label for="codeInput" class="text-xs text-muted-foreground">4-digit code</label>
				<Input
					id="codeInput"
					type="text"
					value={code}
					onchange={(e) => (code = (e.target as HTMLInputElement).value.toUpperCase())}
					placeholder="e.g. 1234"
					maxlength={4}
					disabled={$isLoading}
					class="text-sm text-center font-mono tracking-widest"
				/>
			</div>
			<Button
				class="w-full"
				variant="outline"
				onclick={() => code && requestJoin(code)}
				disabled={!code || $isLoading || code.length !== 4}
			>
				{$isLoading ? 'Joining...' : 'Join'}
			</Button>
		</div>
	</div>
</div>
