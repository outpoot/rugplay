import { get } from 'svelte/store';
import { playSound, showConfetti } from '$lib/utils';
import { haptic } from '$lib/stores/haptics';
import { action } from '../lib/playerActions';
import { gameState, prevPhase, prevActiveIdx, playerActionLabels } from '../stores';
import { checkAndResetTimer } from './timer';
import { pendingJoinCode, pendingJoinInfo, pendingJoinIsSpectator, showJoinConfirm } from '../stores';
import type { GameState, WinnerInfo } from '../types';
import confetti from 'canvas-confetti';

// confetti currently broken, some sounds as well I believe

export function handleStateUpdate(newState: GameState) {
	const oldState = get(gameState);
	const oldPhase = get(prevPhase);
	const oldActiveIdx = get(prevActiveIdx);
	const myIdx = newState.yourIndex;
	const myPlayer = newState.players[myIdx];

	playerActionLabels.update((labels) => action(oldState, newState, labels));

	checkAndResetTimer(newState.activePlayerIndex);

	// the beautifull sounds of rugplay (slowed+reverb)
	if (newState.phase === 'preflop' && oldPhase !== 'preflop') {
		playSound('flip');
	}
	if (
		(newState.phase === 'flop' && oldPhase !== 'flop') ||
		(newState.phase === 'turn' && oldPhase !== 'turn') ||
		(newState.phase === 'river' && oldPhase !== 'river')
	) {
		playSound('flip');
	}

	if (newState.phase === 'showdown' && newState.winners && oldPhase !== 'showdown') {
		const iWon = newState.winners.some((w: WinnerInfo) => w.userId === myPlayer?.userId);
		if (iWon) {
			haptic.trigger('success');
			showConfetti(confetti);
			playSound('win');
		} else {
			haptic.trigger('error');
			playSound('lose');
		}
	}

	if (
		newState.phase !== 'waiting' &&
		newState.phase !== 'showdown' &&
		newState.activePlayerIndex === myIdx &&
		oldActiveIdx !== myIdx
	) {
		playSound('click');
		haptic.trigger('selection');
	}

	// spectator stuff
	if (myPlayer?.isSpectator && newState.phase === 'preflop' && oldPhase !== 'preflop') {
		const activePlayersCount = newState.players.filter((p) => !p.isSpectator).length;
		if (activePlayersCount < newState.maxPlayers) {
			pendingJoinCode.set(newState.code);
			pendingJoinInfo.set({
				buyIn: newState.buyIn,
				hostUsername: newState.players.find((p) => p.userId === newState.hostUserId)?.username ?? 'Host',
				playerCount: activePlayersCount,
				maxPlayers: newState.maxPlayers
			});
			pendingJoinIsSpectator.set(false);
			showJoinConfirm.set(true);
		}
	}

	prevPhase.set(newState.phase);
	prevActiveIdx.set(newState.activePlayerIndex);
}
