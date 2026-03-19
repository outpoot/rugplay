import { toast } from 'svelte-sonner';
import { get } from 'svelte/store';
import {
	gameState,
	isLoading,
	buyInAmount,
	lobbyMaxPlayers,
	toCall,
	pendingJoinCode,
	showJoinConfirm,
	pendingJoinInfo,
	pendingJoinIsSpectator,
	screen,
} from '../stores';
import { resetTurnTimer } from './timer';

let currentBalance = 0;
let onBalanceUpdateCallback: ((newBalance: number) => void) | undefined;

export function setBalanceStore(balance: number) {
	currentBalance = balance;
}

export function setOnBalanceUpdate(callback: (newBalance: number) => void) {
	onBalanceUpdateCallback = callback;
}

// since the poker game is so large, I split API calls into a seperate file.
// below are the uh functions. The call function is the main interaction with the backend, the other functions should be self explanatory by their names

async function call(body: Record<string, unknown>): Promise<any> {
	isLoading.set(true);
	try {
		const response = await fetch('/api/arcade/poker', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.error || 'Request failed');
		}

		if (data.newBalance !== undefined) {
			currentBalance = data.newBalance;
			onBalanceUpdateCallback?.(data.newBalance);
		}

		return data;
	} catch (err) {
		toast.error('Action failed', {
			description: err instanceof Error ? err.message : 'Unknown error occurred'
		});
		return null;
	} finally {
		isLoading.set(false);
	}
}

export async function createTable() {
	const data = await call({
		action: 'create',
		buyIn: get(buyInAmount),
		maxPlayers: get(lobbyMaxPlayers)
	});
	if (data && data.tableId) {
		gameState.set(data);
		screen.set('table');
	}
}

export async function requestJoin(code: string) {
	isLoading.set(true);
	try {
		const res = await fetch('/api/arcade/poker', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'peek', code })
		});
		const data = await res.json();
		if (!res.ok) {
			toast.error(data.error ?? 'Table not found');
			return;
		}
		pendingJoinCode.set(code);
		pendingJoinIsSpectator.set((!data.canJoin && data.canSpectate) ?? false);
		pendingJoinInfo.set({
			buyIn: data.buyIn,
			hostUsername: data.hostUsername,
			playerCount: data.playerCount,
			maxPlayers: data.maxPlayers
		});
		showJoinConfirm.set(true);
	} catch {
		toast.error('Could not reach server');
	} finally {
		isLoading.set(false);
	}
}

export async function confirmJoin(asSpectator: boolean = false) {
	const code = get(pendingJoinCode);
	if (!code) return;
	const data = await call({ action: 'join', code, spectate: asSpectator });
	if (data && data.tableId) {
		gameState.set(data);
		screen.set('table');
		cancelJoin();
	}
}

export async function reenterAndJoin() {
	const state = get(gameState);
	const player = get(gameState)?.players[(get(gameState) as any)?.yourIndex];
	if (!state) return;
	const code = state.code;

	// You can rebuy, thats what his si for
	// since a rebuy is actually just a nice rejoin
	if (player && player.chips <= 0) {
		const amount = state.buyIn ?? 0;
		const data = await call({ action: 'rebuy', tableId: state.tableId, amount });
		if (data && data.tableId) {
			gameState.set(data);
			screen.set('table');
			return;
		}
	}

	// or normal join
	const data = await call({ action: 'join', code });
	if (data && data.tableId) {
		gameState.set(data);
		screen.set('table');
		return;
	}

	// or just show that you joined
	const state2 = get(gameState);
	if (state2) {
		pendingJoinCode.set(code ?? '');
		pendingJoinInfo.set({
			buyIn: state2.buyIn ?? 0,
			hostUsername: state2.players?.find((p) => p.userId === state2?.hostUserId)?.username ?? 'Host',
			playerCount: state2.players?.length ?? 0,
			maxPlayers: state2.maxPlayers ?? 0
		});
		showJoinConfirm.set(true);
	}
}

export async function startHand() {
	const state = get(gameState);
	if (!state) return;
	await call({ action: 'start', tableId: state.tableId });
}

// This one is a bit special though, its the main one handling all of the players things to do
export async function Action(move: string, amount?: number) {
	const state = get(gameState);
	const callAmount = get(toCall);
	if (!state) return;

	resetTurnTimer();

	let finalMove = move;
	if (move === 'call' && callAmount <= 0) {
		finalMove = 'check';
	}

	const body: Record<string, unknown> = {
		action: 'poker_action',
		tableId: state.tableId,
		move: finalMove
	};
	if (amount !== undefined) body.amount = amount;

	const data = await call(body);
	if (data) gameState.set(data);
}

export async function leaveTable() {
	const state = get(gameState);
	if (!state) return;
	const data = await call({ action: 'leave', tableId: state.tableId });
	if (data) {
		gameState.set(null);
		screen.set('lobby');
		if (data.newBalance !== undefined) {
			currentBalance = data.newBalance;
			onBalanceUpdateCallback?.(data.newBalance);
		}
		const { formatValue } = await import('$lib/utils');
		toast.success(`Returned ${formatValue(data.chipsReturned)} to balance`);
	}
}

export async function copyInviteLink() {
	const state = get(gameState);
	const code = state?.code;
	if (!code) {
		toast.error('No table code available');
		return;
	}
	const origin = typeof window !== 'undefined' ? window.location.origin : '';
	const link = `${origin}/arcade/join/poker?code=${encodeURIComponent(code)}`;
	try {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(link);
		} else {
			const ta = document.createElement('textarea');
			ta.value = link;
			document.body.appendChild(ta);
			ta.select();
			document.execCommand('copy');
			document.body.removeChild(ta);
		}
		toast.success('Invite link copied');
	} catch {
		toast.error('Could not copy link');
	}
}

export function cancelJoin() {
	showJoinConfirm.set(false);
	pendingJoinInfo.set(null);
	pendingJoinCode.set('');
	pendingJoinIsSpectator.set(false);
}

export async function refreshState() {
	const state = get(gameState);
	if (!state) return;
	try {
		const res = await fetch('/api/arcade/poker', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'state', tableId: state.tableId })
		});
		if (res.ok) {
			const data = await res.json();
			if (data && data.tableId) {
				gameState.set(data);
			} else {
				gameState.set(null);
				screen.set('lobby');
			}
		}
	} catch {}
}
