<!-- src/routes/groups/[id]/+page.svelte -->
<script lang="ts">
	import { USER_DATA } from '$lib/stores/user-data';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		UserMultiple02Icon,
		CrownIcon,
		UserIcon,
		ArrowLeft01Icon,
		Logout01Icon,
		Delete01Icon,
		MoneyReceive02Icon,
		MoneySend02Icon,
		UserRemove01Icon
	} from '@hugeicons/core-free-icons';
	import { toast } from 'svelte-sonner';
	import { formatValue } from '$lib/utils';
	import { goto, invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import SEO from '$lib/components/self/SEO.svelte';

	let { data } = $props();

	let group = $derived(data.group);
	let members = $state(data.members);
	$effect(() => { members = data.members; });

	let isOwner = $derived(!!$USER_DATA && Number($USER_DATA.id) === group.ownerId);
	let isMember = $derived(!!$USER_DATA && members.some((m) => m.userId === Number($USER_DATA!.id)));

	// Deposit
	let showDeposit = $state(false);
	let depositAmount = $state('');
	let depositing = $state(false);

	// Transfer (single)
	let showTransfer = $state(false);
	let transferAmount = $state('');
	let transferTarget = $state<{ userId: number; username: string } | null>(null);
	let transferring = $state(false);

	// Send to All
	let showSendAll = $state(false);
	let sendAllAmount = $state('');
	let sendAllConfirm = $state('');
	let sendingAll = $state(false);

	// Disband
	let showDisband = $state(false);
	let disbanding = $state(false);

	let joining = $state(false);
	let leaving = $state(false);

	// How much each member would get in send-all
	let nonOwnerMembers = $derived(members.filter((m) => m.userId !== group.ownerId));
	let sendAllPerMember = $derived(() => {
		const amt = Math.floor(Number(sendAllAmount));
		if (!amt || nonOwnerMembers.length === 0) return 0;
		return Math.floor(amt / nonOwnerMembers.length);
	});

	async function join() {
		joining = true;
		try {
			const res = await fetch(`/api/groups/${group.id}/join`, { method: 'POST' });
			const d = await res.json();
			if (!res.ok) { toast.error(d.error ?? 'Failed to join'); return; }
			toast.success(`Joined ${group.name}!`);
			await invalidateAll();
		} catch { toast.error('Failed to join'); }
		finally { joining = false; }
	}

	async function leave() {
		leaving = true;
		try {
			const res = await fetch(`/api/groups/${group.id}/leave`, { method: 'POST' });
			const d = await res.json();
			if (!res.ok) { toast.error(d.error ?? 'Failed to leave'); return; }
			toast.success('Left the group');
			await invalidateAll();
		} catch { toast.error('Failed to leave'); }
		finally { leaving = false; }
	}

	async function deposit() {
		const amount = Math.floor(Number(depositAmount));
		if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
		depositing = true;
		try {
			const res = await fetch(`/api/groups/${group.id}/deposit`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ amount })
			});
			const d = await res.json();
			if (!res.ok) { toast.error(d.error ?? 'Failed to deposit'); return; }
			toast.success(`Deposited ${formatValue(amount)} to the treasury`);
			showDeposit = false;
			depositAmount = '';
			await invalidateAll();
		} catch { toast.error('Failed to deposit'); }
		finally { depositing = false; }
	}

	async function transfer() {
		if (!transferTarget) return;
		const amount = Math.floor(Number(transferAmount));
		if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
		transferring = true;
		try {
			const res = await fetch(`/api/groups/${group.id}/transfer`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: transferTarget.userId, amount })
			});
			const d = await res.json();
			if (!res.ok) { toast.error(d.error ?? 'Failed to transfer'); return; }
			toast.success(`Sent ${formatValue(amount)} to @${transferTarget.username}`);
			showTransfer = false;
			transferAmount = '';
			transferTarget = null;
			await invalidateAll();
		} catch { toast.error('Failed to transfer'); }
		finally { transferring = false; }
	}

	async function sendToAll() {
		if (sendAllConfirm !== 'IM SURE') {
			toast.error('Type IM SURE to confirm');
			return;
		}
		const amount = Math.floor(Number(sendAllAmount));
		if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
		sendingAll = true;
		try {
			const res = await fetch(`/api/groups/${group.id}/transfer-all`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ amount })
			});
			const d = await res.json();
			if (!res.ok) { toast.error(d.error ?? 'Failed to send'); return; }
			toast.success(`Sent ${formatValue(amount)} split across ${nonOwnerMembers.length} members`);
			showSendAll = false;
			sendAllAmount = '';
			sendAllConfirm = '';
			await invalidateAll();
		} catch { toast.error('Failed to send'); }
		finally { sendingAll = false; }
	}

	async function kick(userId: number, username: string) {
		if (!confirm(`Kick @${username} from the group?`)) return;
		try {
			const res = await fetch(`/api/groups/${group.id}/kick`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId })
			});
			const d = await res.json();
			if (!res.ok) { toast.error(d.error ?? 'Failed to kick'); return; }
			toast.success(`Kicked @${username}`);
			await invalidateAll();
		} catch { toast.error('Failed to kick'); }
	}

	async function disband() {
		disbanding = true;
		try {
			const res = await fetch(`/api/groups/${group.id}`, { method: 'DELETE' });
			const d = await res.json();
			if (!res.ok) { toast.error(d.error ?? 'Failed to disband'); return; }
			toast.success('Group disbanded');
			goto('/groups');
		} catch { toast.error('Failed to disband'); }
		finally { disbanding = false; }
	}
</script>

<SEO title="{group.name} - Groups - Rugplay" description={group.description ?? `Group ${group.name} on Rugplay`} />

<!-- Deposit Dialog -->
<Dialog.Root bind:open={showDeposit}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Deposit to Treasury</Dialog.Title>
			<Dialog.Description>Funds go into the group treasury. Distribute them to members later.</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-3 py-2">
			<Label>Amount ($)</Label>
			<Input bind:value={depositAmount} type="number" min="1" placeholder="10000" />
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showDeposit = false)}>Cancel</Button>
			<Button onclick={deposit} disabled={depositing}>{depositing ? 'Depositing...' : 'Deposit'}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Transfer Dialog (single member) -->
<Dialog.Root bind:open={showTransfer}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Send Funds</Dialog.Title>
			<Dialog.Description>
				{#if transferTarget}
					Sending to <span class="text-foreground font-semibold">@{transferTarget.username}</span>
				{/if}
			</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-3 py-2">
			<Label>Amount ($)</Label>
			<Input bind:value={transferAmount} type="number" min="1" placeholder="5000" />
			<p class="text-muted-foreground text-xs">
				Treasury: <span class="text-foreground font-medium">{formatValue(Number(group.balance))}</span>
			</p>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => { showTransfer = false; transferTarget = null; }}>Cancel</Button>
			<Button onclick={transfer} disabled={transferring || !transferTarget}>
				{transferring ? 'Sending...' : 'Send'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Send to All Dialog -->
<Dialog.Root bind:open={showSendAll}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Send to All Members</Dialog.Title>
			<Dialog.Description>
				Splits the amount equally among all <strong>{nonOwnerMembers.length}</strong> non-owner members.
			</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-3 py-2">
			<div>
				<Label>Total Amount ($)</Label>
				<Input bind:value={sendAllAmount} type="number" min="1" placeholder="50000" class="mt-1.5" />
				{#if Number(sendAllAmount) > 0 && nonOwnerMembers.length > 0}
					<p class="text-muted-foreground mt-1 text-xs">
						≈ <span class="text-foreground font-medium">{formatValue(sendAllPerMember())}</span> per member
					</p>
				{/if}
			</div>
			<p class="text-muted-foreground text-xs">
				Treasury: <span class="text-foreground font-medium">{formatValue(Number(group.balance))}</span>
			</p>
			<div>
				<Label class="text-destructive">Type <span class="font-mono font-bold">IM SURE</span> to confirm</Label>
				<Input
					bind:value={sendAllConfirm}
					placeholder="IM SURE"
					class="mt-1.5 font-mono"
					autocomplete="off"
				/>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => { showSendAll = false; sendAllConfirm = ''; }}>Cancel</Button>
			<Button
				onclick={sendToAll}
				disabled={sendingAll || sendAllConfirm !== 'IM SURE' || !sendAllAmount}
			>
				{sendingAll ? 'Sending...' : 'Send to All'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Disband Dialog -->
<Dialog.Root bind:open={showDisband}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Disband Group</Dialog.Title>
			<Dialog.Description>
				Permanently deletes <strong>{group.name}</strong>. Remaining treasury balance will be returned to you.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showDisband = false)}>Cancel</Button>
			<Button variant="destructive" onclick={disband} disabled={disbanding}>
				{disbanding ? 'Disbanding...' : 'Disband'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<div class="container mx-auto max-w-3xl p-4 md:p-6">
	<!-- Back -->
	<button
		onclick={() => goto('/groups')}
		class="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1.5 text-sm transition-colors"
	>
		<HugeiconsIcon icon={ArrowLeft01Icon} class="h-4 w-4" />
		Groups
	</button>

	<!-- Group Header Card -->
	<div class="bg-card border-border mb-4 rounded-xl border p-5">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div class="flex items-start gap-3">
				<div class="bg-primary/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
					<HugeiconsIcon icon={UserMultiple02Icon} class="text-primary h-6 w-6" />
				</div>
				<div>
					<h1 class="text-xl font-bold">{group.name}</h1>
					<p class="text-muted-foreground text-sm">by @{group.ownerUsername}</p>
					{#if group.description}
						<p class="mt-1 text-sm">{group.description}</p>
					{/if}
				</div>
			</div>

			<div class="flex flex-wrap gap-2">
				{#if isOwner}
					<Button size="sm" variant="outline" class="gap-1.5" onclick={() => (showDeposit = true)}>
						<HugeiconsIcon icon={MoneyReceive02Icon} class="h-4 w-4" />
						Deposit
					</Button>
					{#if nonOwnerMembers.length > 0}
						<Button size="sm" variant="outline" class="gap-1.5" onclick={() => (showSendAll = true)}>
							<HugeiconsIcon icon={MoneySend02Icon} class="h-4 w-4" />
							Send to All
						</Button>
					{/if}
					<Button size="sm" variant="destructive" onclick={() => (showDisband = true)}>
						<HugeiconsIcon icon={Delete01Icon} class="h-4 w-4" />
						Disband
					</Button>
				{:else if isMember}
					<Button size="sm" variant="outline" onclick={leave} disabled={leaving}>
						<HugeiconsIcon icon={Logout01Icon} class="h-4 w-4" />
						{leaving ? 'Leaving...' : 'Leave'}
					</Button>
				{:else if $USER_DATA}
					<Button size="sm" onclick={join} disabled={joining}>
						{joining ? 'Joining...' : 'Join Group'}
					</Button>
				{/if}
			</div>
		</div>

		<!-- Stats -->
		<div class="border-border mt-4 grid grid-cols-2 gap-3 border-t pt-4 sm:grid-cols-3">
			<div>
				<p class="text-muted-foreground text-xs">Treasury</p>
				<p class="text-lg font-semibold" style="color: #00ff0d">{formatValue(Number(group.balance))}</p>
			</div>
			<div>
				<p class="text-muted-foreground text-xs">Members</p>
				<p class="text-lg font-semibold">{members.length} / 50</p>
			</div>
			<div>
				<p class="text-muted-foreground text-xs">Created</p>
				<p class="text-sm font-medium">{new Date(group.createdAt).toLocaleDateString()}</p>
			</div>
		</div>
	</div>

	<!-- Members List -->
	<div class="bg-card border-border rounded-xl border">
		<div class="border-border border-b px-4 py-3">
			<h2 class="font-semibold">Members</h2>
		</div>
		<div class="divide-border divide-y">
			{#each members as member (member.userId)}
				{@const isThisOwner = member.userId === group.ownerId}
				<div class="flex items-center justify-between px-4 py-3">
					<button
						onclick={() => goto(`/user/${member.userId}`)}
						class="flex items-center gap-3 text-left transition-opacity hover:opacity-80"
					>
						{#if member.userImage}
							<img src={member.userImage} alt={member.username} class="h-8 w-8 rounded-full object-cover" />
						{:else}
							<div class="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
								<HugeiconsIcon icon={UserIcon} class="text-muted-foreground h-4 w-4" />
							</div>
						{/if}
						<div>
							<div class="flex items-center gap-1.5">
								<span class="text-sm font-medium">@{member.username}</span>
								{#if isThisOwner}
									<HugeiconsIcon icon={CrownIcon} class="text-amber-400 h-3.5 w-3.5" />
								{/if}
							</div>
							<span class="text-muted-foreground text-xs">
								Joined {new Date(member.joinedAt).toLocaleDateString()}
							</span>
						</div>
					</button>

					<!-- Owner can send to anyone (including themselves) and kick non-owners -->
					{#if isOwner}
						<div class="flex items-center gap-2">
							<Button
								size="sm"
								variant="ghost"
								class="gap-1 text-xs"
								onclick={() => {
									transferTarget = { userId: member.userId, username: member.username };
									showTransfer = true;
								}}
							>
								<HugeiconsIcon icon={MoneySend02Icon} class="h-3.5 w-3.5" />
								Send
							</Button>
							{#if !isThisOwner}
								<Button
									size="sm"
									variant="ghost"
									class="text-destructive hover:text-destructive gap-1 text-xs"
									onclick={() => kick(member.userId, member.username)}
								>
									<HugeiconsIcon icon={UserRemove01Icon} class="h-3.5 w-3.5" />
									Kick
								</Button>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>