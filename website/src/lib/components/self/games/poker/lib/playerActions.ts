import type { GameState, PublicPokerPlayer } from '../types';

// This handles the main action the players take, although I think I might got that two times somewhere. idk. works, so none of my business
export function action(
	oldState: GameState | null,
	newState: GameState,
	playerActionLabels: Record<number, string>
): Record<number, string> {
	if (!oldState || oldState.tableId !== newState.tableId || oldState.handNumber !== newState.handNumber) {
		return {};
	}
	const next = { ...playerActionLabels };
	for (const np of newState.players) {
		const op = oldState.players.find((p: PublicPokerPlayer) => p.userId === np.userId);
		if (!op) continue;
		if (!op.folded && np.folded) {
			next[np.userId] = 'Fold';
			continue;
		}
		if (!op.allIn && np.allIn) {
			next[np.userId] = 'All-in';
			continue;
		}
		if (np.currentBet > op.currentBet) {
			const toMatch = Math.max(0, oldState.currentBet - op.currentBet);
			const increase = np.currentBet - op.currentBet;
			next[np.userId] = increase > toMatch ? 'Raise' : 'Call';
			continue;
		}
		if (!op.hasActed && np.hasActed && np.currentBet === op.currentBet) {
			next[np.userId] = 'Check';
		}
	}
	return next;
}

export function getLastAction(userId: number, actions: Record<number, string>): string {
	return actions[userId] ?? '';
}
