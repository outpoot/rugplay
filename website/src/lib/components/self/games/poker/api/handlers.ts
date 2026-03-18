import { get } from 'svelte/store';
import {
	buyInAmount,
	buyInDisplay,
	raiseAmount,
	raiseDisplay,
	lobbyMaxPlayers,
	lobbyMaxPlayersDisplay,
	maxBuyIn,
	minBuyIn
} from '../stores';

// All the handlers for the individual actions, should be self explanatory as well by the function names below:

export function handleBuyInInput(event: Event) {
	const target = event.target as HTMLInputElement;
	const value = target.value.replace(/,/g, '');
	const numValue = parseFloat(value) || 0;
	buyInAmount.set(Math.max(minBuyIn, Math.min(numValue, maxBuyIn)));
	buyInDisplay.set(target.value);
}

export function handleBuyInBlur() {
	buyInDisplay.set(get(buyInAmount).toLocaleString());
}

export function handleLobbyMaxPlayersInput(event: Event) {
	const target = event.target as HTMLSelectElement;
	const value = parseInt(target.value, 10);
	const num = Math.max(2, Math.min(22, value || 6));
	lobbyMaxPlayers.set(num);
	lobbyMaxPlayersDisplay.set(num.toString());
}

export function handleRaiseInput(event: Event) {
	const target = event.target as HTMLInputElement;
	const value = target.value.replace(/,/g, '');
	raiseAmount.set(Math.max(0, parseFloat(value) || 0));
	raiseDisplay.set(target.value);
}

export function handleRaiseBlur() {
	raiseDisplay.set(get(raiseAmount).toLocaleString());
}

export function setRaise(fraction: number, meChips: number, callAmount: number, minRaise: number) {
	const maxRaise = meChips - callAmount;
	const raiseDelta = Math.max(minRaise, Math.floor(maxRaise * fraction));
	const total = callAmount + raiseDelta;
	raiseAmount.set(total);
	raiseDisplay.set(total.toLocaleString());
}
