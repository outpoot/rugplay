import { get } from 'svelte/store';
import { turnTimeLeft, turnProgress, lastTurnActiveIdx } from '../stores';
import { Action } from './actions';

let turnTimerInterval: ReturnType<typeof setInterval> | null = null;

export function resetTurnTimer() {
	if (turnTimerInterval) {
		clearInterval(turnTimerInterval);
		turnTimerInterval = null;
	}
	turnTimeLeft.set(30);
	turnProgress.set(0);
}

export function startTurnTimer() {
	resetTurnTimer();
	turnTimerInterval = setInterval(() => {
		const current = get(turnTimeLeft);
		const updated = Math.max(0, Number((current - 0.1).toFixed(1)));
		turnTimeLeft.set(updated);
		turnProgress.set(((30 - updated) / 30) * 100);
		if (updated <= 0) {
			resetTurnTimer();
			void Action('fold');
		}
	}, 100);
}

export function ensureTurnTimerRunning() {
	if (turnTimerInterval === null) {
		startTurnTimer();
	}
}

export function checkAndResetTimer(newActiveIdx: number | null) {
	const lastIdx = get(lastTurnActiveIdx);
	if (newActiveIdx !== lastIdx) {
		lastTurnActiveIdx.set(newActiveIdx);
		resetTurnTimer();
		return true;
	}
	return false;
}

export function stopTurnTimer() {
	resetTurnTimer();
}
