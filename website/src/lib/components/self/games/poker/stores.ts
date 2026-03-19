import { writable, derived } from 'svelte/store';
import type { GameState } from './types';

// Main game stores and that kinda stuff:

export const buyInAmount = writable(1000);
export const buyInDisplay = writable('1000');
export const joinCode = writable('');
export const lobbyMaxPlayers = writable(6);
export const lobbyMaxPlayersDisplay = writable('6');

// states
export const gameState = writable<GameState | null>(null);
export const screen = writable<'lobby' | 'table'>('lobby');
export const isLoading = writable(false);

// betting logic
export const raiseAmount = writable(0);
export const raiseDisplay = writable('0');
export const raiseDisabled = writable(false);
export const raiseInvalid = writable(false);

// auto fold timer from some random poker website I did "field research" in.
export const turnTimeLeft = writable(30);
export const turnProgress = writable(0);
export const lastTurnActiveIdx = writable<number | null>(null);

// super cool dialog if you want to join
export const showJoinConfirm = writable(false);
export const pendingJoinCode = writable('');
export const pendingJoinIsSpectator = writable(false);
export const pendingJoinInfo = writable<{
	buyIn: number;
	hostUsername: string;
	playerCount: number;
	maxPlayers: number;
} | null>(null);

// tracking for animations, sounds etc.
export const prevPhase = writable<string | null>(null);
export const prevActiveIdx = writable<number | null>(null);
export const playerActionLabels = writable<Record<number, string>>({});

// frontend constants
export const minBuyIn = 100;
export const maxBuyIn = 10000000;


// derived so it can change accordingly. because svelte needs that for some reason I guess. at least https://svelte.dev/docs/svelte/$derived told me to
export const me = derived(gameState, ($gameState) => {
	return $gameState ? $gameState.players[$gameState.yourIndex] ?? null : null;
});

export const turn = derived([gameState, me], ([$gameState, $me]) => {
	return (
		$gameState !== null &&
		$me !== null &&
		$gameState.activePlayerIndex === $gameState.yourIndex &&
		!$me.folded &&
		!$me.allIn
	);
});

export const isHost = derived([gameState, me], ([$gameState, $me]) => {
	return $gameState !== null && $me !== null && $gameState.hostUserId === $me.userId;
});

export const isSpectator = derived(me, ($me) => {
	return $me?.isSpectator ?? false;
});

export const canStart = derived([gameState, isHost], ([$gameState, $isHost]) => {
	return (
		$gameState !== null &&
		$isHost &&
		($gameState.phase === 'waiting' || $gameState.phase === 'showdown') &&
		$gameState.players.filter((p) => p.chips > 0).length >= 2
	);
});

export const toCall = derived([me, gameState], ([$me, $gameState]) => {
	return $me && $gameState ? Math.max(0, $gameState.currentBet - $me.currentBet) : 0;
});

export const canCheck = derived([turn, toCall], ([$turn, $toCall]) => {
	return $turn && $toCall === 0;
});

export const canCall = derived([turn, toCall], ([$turn, $toCall]) => {
	return $turn && $toCall > 0;
});

export const canRaise = derived([turn, me], ([$turn, $me]) => {
	return $turn && $me !== null && $me.chips > 0;
});
