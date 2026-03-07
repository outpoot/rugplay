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
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import SEO from '$lib/components/self/SEO.svelte';

	let { data } = $props();

	let group = $derived(data.group);
	let members = $state(data.members);
	$effect(() => {
		members = data.members;
	});

	let isOwner = $derived(!!$USER_DATA && Number($USER_DATA.id) === group.ownerId);
	let isMember = $derived(!!$USER_DATA && members.some((m) => m.userId === Number($USER_DATA!.id)));

	let showDeposit = $state(false);
	let depositAmount = $state('');
	let depositing = $state(false);

	let showTransfer = $state(false);
	let transferAmount = $state('');
	let transferTarget = $state<{ userId: number; username: string } | null>(null);
	let transferring = $state(false);

	let showSendAll = $state(false);
	let sendAllAmount = $state('');
	let sendAllConfirm = $state('');
	let sendingAll = $state(false);

	let showDisband = $state(false);
	let disbanding = $state(false);

	let joining = $state(false);
	let leaving = $state(false);

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
			if (!res.ok) {
				toast.error(d.error ?? 'Failed to join');
				return;
			}
			toast.success(`Joined ${group.name}!`);
			await invalidateAll();
		} catch {
			toast.error('Failed to join');
		} finally {
			joining = false;
		}
	}

	async function leave() {
		leaving = true;
		try {
			const res = await fetch(`/api/groups/${group.id}/leave`, { method: 'POST' });
			const d = await res.json();
			if (!res.ok) {
				toast.error(d.error ?? 'Failed to leave');
				return;
			}
			toast.success('Left the group');
			await invalidateAll();
		} catch {
			toast.error('Failed to leave');
		} finally {
			leaving = false;
		}
	}

	async function deposit() {
		const amount = Math.floor(Number(depositAmount));
		if (!amount || amount <= 0) {
			toast.error('Enter a valid amount');
			return;
		}
		depositing = true;
		try {
			const res = await fetch(`/api/groups/${group.id}/deposit`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ amount })
			});
			const d = await res.json();
			if (!res.ok) {
				toast.error(d.error ?? 'Failed to deposit');
				return;
			}
			toast.success(`Deposited ${formatValue(amount)} to the treasury`);
			showDeposit = false;
			depositAmount = '';
			await invalidateAll();
		} catch {
			toast.error('Failed to deposit');
		} finally {
			depositing = false;
		}
	}

	async function transfer() {
		if (!transferTarget) return;
		const amount = Math.floor(Number(transferAmount));
		if (!amount || amount <= 0) {
			toast.error('Enter a valid amount');
			return;
		}
		transferring = true;
		try {
			const res = await fetch(`/api/groups/${group.id}/transfer`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: transferTarget.userId, amount })
			});
			const d = await res.json();
			if (!res.ok) {
				toast.error(d.error ?? 'Failed to transfer');
				return;
			}
			toast.success(`Sent ${formatValue(amount)} to @${transferTarget.username}`);
			showTransfer = false;
			transferAmount = '';
			transferTarget = null;
			await invalidateAll();
		} catch {
			toast.error('Failed to transfer');
		} finally {
			transferring = false;
		}
	}

	async function sendToAll() {
		if (sendAllConfirm !== 'IM SURE') {
			toast.error('Type IM SURE to confirm');
			return;
		}
		const amount = Math.floor(Number(sendAllAmount));
		if (!amount || amount <= 0) {
			toast.error('Enter a valid amount');
			return;
		}
		sendingAll = true;
		try {
			const res = await fetch(`/api/groups/${group.id}/transfer-all`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ amount })
			});
			const d = await res.json();
			if (!res.ok) {
				toast.error(d.error ?? 'Failed to send');
				return;
			}
			toast.success(`Sent ${formatValue(amount)} split across ${nonOwnerMembers.length} members`);
			showSendAll = false;
			sendAllAmount = '';
			sendAllConfirm = '';
			await invalidateAll();
		} catch {
			toast.error('Failed to send');
		} finally {
			sendingAll = false;
		}
	}

	async function kick(userId: number, username: string) {
		if (!confirm(`Remove @${username} from the group?`)) return;
		try {
			const res = await fetch(`/api/groups/${group.id}/kick`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId })
			});
			const d = await res.json();
			if (!res.ok) {
				toast.error(d.error ?? 'Failed to remove member');
				return;
			}
			toast.success(`Removed @${username}`);
			await invalidateAll();
		} catch {
			toast.error('Failed to remove member');
		}
	}

	async function disband() {
		disbanding = true;
		try {
			const res = await fetch(`/api/groups/${group.id}`, { method: 'DELETE' });
			const d = await res.json();
			if (!res.ok) {
				toast.error(d.error ?? 'Failed to disband');
				return;
			}
			toast.success('Group disbanded');
			goto('/groups');
		} catch {
			toast.error('Failed to disband');
		} finally {
			disbanding = false;
		}
	}
</script>

<SEO
	title="{group.name} — Groups — Rugplay"
	description={group.description ?? `${group.name} on Rugplay`}
/>

<Dialog.Root bind:open={showDeposit}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Deposit to Treasury</Dialog.Title>
			<Dialog.Description>
				Funds go into the group treasury. Distribute them to members anytime.
			</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-3 py-2">
			<div class="space-y-1.5">
				<Label>Amount ($)</Label>
				<Input bind:value={depositAmount} type="number" min="1" placeholder="10000" />
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showDeposit = false)}>Cancel</Button>
			<Button onclick={deposit} disabled={depositing}>
				{depositing ? 'Depositing...' : 'Deposit'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={showTransfer}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Send Funds</Dialog.Title>
			{#if transferTarget}
				<Dialog.Description>
					Sending treasury funds to
					<span class="text-foreground font-semibold">@{transferTarget.username}</span>.
				</Dialog.Description>
			{/if}
		</Dialog.Header>
		<div class="space-y-3 py-2">
			<div class="space-y-1.5">
				<Label>Amount ($)</Label>
				<Input bind:value={transferAmount} type="number" min="1" placeholder="5000" />
			</div>
			<p class="text-muted-foreground text-xs">
				Available treasury:
				<span class="text-foreground font-medium">{formatValue(Number(group.balance))}</span>
			</p>
		</div>
		<Dialog.Footer>
			<Button
				variant="outline"
				onclick={() => {
					showTransfer = false;
					transferTarget = null;
				}}>Cancel</Button
			>
			<Button onclick={transfer} disabled={transferring || !transferTarget}>
				{transferring ? 'Sending...' : 'Send'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={showSendAll}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Send to All Members</Dialog.Title>
			<Dialog.Description>
				Splits the amount equally among
				<strong>{nonOwnerMembers.length}</strong>
				non-owner members.
			</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-2">
			<div class="space-y-1.5">
				<Label>Total Amount ($)</Label>
				<Input bind:value={sendAllAmount} type="number" min="1" placeholder="50000" />
				{#if Number(sendAllAmount) > 0 && nonOwnerMembers.length > 0}
					<p class="text-muted-foreground text-xs">
						≈
						<span class="text-foreground font-medium">{formatValue(sendAllPerMember())}</span>
						per member
					</p>
				{/if}
			</div>
			<p class="text-muted-foreground text-xs">
				Available treasury:
				<span class="text-foreground font-medium">{formatValue(Number(group.balance))}</span>
			</p>
			<div class="space-y-1.5">
				<Label class="text-destructive">
					Type <span class="font-mono font-bold">IM SURE</span> to confirm
				</Label>
				<Input
					bind:value={sendAllConfirm}
					placeholder="IM SURE"
					class="font-mono"
					autocomplete="off"
				/>
			</div>
		</div>
		<Dialog.Footer>
			<Button
				variant="outline"
				onclick={() => {
					showSendAll = false;
					sendAllConfirm = '';
				}}>Cancel</Button
			>
			<Button
				onclick={sendToAll}
				disabled={sendingAll || sendAllConfirm !== 'IM SURE' || !sendAllAmount}
			>
				{sendingAll ? 'Sending...' : 'Send to All'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={showDisband}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Disband Group</Dialog.Title>
			<Dialog.Description>
				This permanently deletes <strong>{group.name}</strong>. Any remaining treasury balance will
				be returned to you first.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showDisband = false)}>Cancel</Button>
			<Button variant="destructive" onclick={disband} disabled={disbanding}>
				{disbanding ? 'Disbanding...' : 'Disband Group'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<div class="container mx-auto max-w-3xl px-4 py-8">
	<button
		onclick={() => goto('/groups')}
		class="text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1.5 text-sm transition-colors"
	>
		<HugeiconsIcon icon={ArrowLeft01Icon} class="h-4 w-4" />
		Back to Groups
	</button>

	<div class="bg-card border-border mb-4 rounded-2xl border p-6">
		<div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
			<div class="flex items-start gap-4">
				<div class="bg-primary/10 border-primary/20 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border">
					<HugeiconsIcon icon={UserMultiple02Icon} class="text-primary h-7 w-7" />
				</div>
				<div>
					<h1 class="text-xl font-bold leading-tight">{group.name}</h1>
					<p class="text-muted-foreground text-sm">
						Owner: <span class="text-foreground font-medium">@{group.ownerUsername}</span>
					</p>
					{#if group.description}
						<p class="text-muted-foreground mt-2 text-sm leading-relaxed">{group.description}</p>
					{/if}
				</div>
			</div>

			<div class="flex shrink-0 flex-wrap gap-2">
				{#if isOwner}
					<Button size="sm" variant="outline" class="gap-1.5" onclick={() => (showDeposit = true)}>
						<HugeiconsIcon icon={MoneyReceive02Icon} class="h-3.5 w-3.5" />
						Deposit
					</Button>
					{#if nonOwnerMembers.length > 0}
						<Button size="sm" variant="outline" class="gap-1.5" onclick={() => (showSendAll = true)}>
							<HugeiconsIcon icon={MoneySend02Icon} class="h-3.5 w-3.5" />
							Send to All
						</Button>
					{/if}
					<Button
						size="sm"
						variant="destructive"
						class="gap-1.5"
						onclick={() => (showDisband = true)}
					>
						<HugeiconsIcon icon={Delete01Icon} class="h-3.5 w-3.5" />
						Disband
					</Button>
				{:else if isMember}
					<Button size="sm" variant="outline" class="gap-1.5" onclick={leave} disabled={leaving}>
						<HugeiconsIcon icon={Logout01Icon} class="h-3.5 w-3.5" />
						{leaving ? 'Leaving...' : 'Leave'}
					</Button>
				{:else if $USER_DATA}
					<Button size="sm" onclick={join} disabled={joining}>
						{joining ? 'Joining...' : 'Join Group'}
					</Button>
				{/if}
			</div>
		</div>

		<div class="border-border mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl border">
			<div class="bg-muted/30 px-4 py-3">
				<p class="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
					Treasury
				</p>
				<p class="text-lg font-bold" style="color: #00ff0d">
					{formatValue(Number(group.balance))}
				</p>
			</div>
			<div class="bg-muted/30 border-border border-x px-4 py-3">
				<p class="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
					Members
				</p>
				<p class="text-lg font-bold">{members.length}<span class="text-muted-foreground text-sm font-normal"> / 50</span></p>
			</div>
			<div class="bg-muted/30 px-4 py-3">
				<p class="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
					Created
				</p>
				<p class="text-sm font-semibold">{new Date(group.createdAt).toLocaleDateString()}</p>
			</div>
		</div>
	</div>

	<div class="bg-card border-border rounded-2xl border">
		<div class="border-border flex items-center justify-between border-b px-5 py-4">
			<h2 class="font-semibold">Members</h2>
			<Badge variant="secondary" class="text-xs">{members.length}</Badge>
		</div>
		<div class="divide-border divide-y">
			{#each members as member (member.userId)}
				{@const isThisOwner = member.userId === group.ownerId}
				<div class="flex items-center justify-between px-5 py-3.5">
					<button
						onclick={() => goto(`/user/${member.userId}`)}
						class="flex items-center gap-3 text-left transition-opacity hover:opacity-70"
					>
						{#if member.userImage}
							<img
								src={member.userImage}
								alt={member.username}
								class="h-9 w-9 rounded-full object-cover"
							/>
						{:else}
							<div class="bg-muted flex h-9 w-9 items-center justify-center rounded-full">
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

					{#if isOwner}
						<div class="flex items-center gap-1">
							<Button
								size="sm"
								variant="ghost"
								class="h-8 gap-1 px-2.5 text-xs"
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
									class="text-destructive hover:text-destructive h-8 gap-1 px-2.5 text-xs"
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