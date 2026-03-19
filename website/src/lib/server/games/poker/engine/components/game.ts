import { minPlayersToStart } from "./constants";
import type { PokerTable, PokerPlayer, PokerAction } from "./types";
import { createDeck } from "./deck";
import { splitPot, resolveFoldWin, resolveShowdown } from "./resolution";

// Root Game.

function activePlayers(table: PokerTable): PokerPlayer[] {
    return table.players.filter(p => !p.folded && !p.isSpectator);
}

// as the name says, players that arent all inget returned
function activeNonAllIn(table: PokerTable): PokerPlayer[] {
    return table.players.filter(p => !p.folded && !p.allIn && !p.isSpectator);
}

function nextActorIndex(table: PokerTable, from: number): number {
    const n = table.players.length;
    for (let i = 1; i <= n; i++) {
        const p = table.players[(from + i) % n];
        if (!p.isSpectator && !p.folded && !p.allIn && p.chips > 0) return (from + i) % n;
    }
    return -1;
}

// Pays a players chips, or well since i dont got that stuff added yet, money into the pot.
function payPlayer(table: PokerTable, player: PokerPlayer, amount: number): void {
    player.chips -= amount;
    player.chipsBet += amount;
    player.currentBet += amount;
    table.pot += amount;
    if (player.chips === 0) player.allIn = true;
    if (player.allIn || table.players.some(p => p.allIn)) splitPot(table);
}

// Only reset per round things
function resetRound(table: PokerTable): void {
    for (const p of table.players) {
        p.currentBet = 0;
        p.hasActed = false;
        p.alreadyBet = false;
    }
    // sets the little minraise value to the automatically calcula. Or well sets it at 0 first here:
    table.lastRaiseAmount = 0;
}

// simple check if betting is, well, done. its just a bool returned:
function bettingDone(table: PokerTable): boolean {
    const canAct = activeNonAllIn(table);
    if (canAct.length === 0) return true;
    return canAct.every(p => p.hasActed && p.chipsBet === table.callAmount);
}

function dealCards(table: PokerTable, count: number): void {
    table.deck.pop(); // burn em
    for (let i = 0; i < count; i++) table.communityCards.push(table.deck.pop()!);
}

function runOut(table: PokerTable): void {
    while (table.communityCards.length < 5) { table.deck.pop(); table.communityCards.push(table.deck.pop()!); }
}

// There are a few phases, this switches through them
function advancePhase(table: PokerTable): void {
    if (activePlayers(table).length <= 1) { resolveFoldWin(table); return; }
    const canAct = activeNonAllIn(table);
    switch (table.phase) {
        case "preflop": table.phase = "flop"; dealCards(table, 3); break;
        case "flop":    table.phase = "turn"; dealCards(table, 1); break;
        case "turn":    table.phase = "river"; dealCards(table, 1); break;
        case "river":   resolveShowdown(table); return;
        default: return;
    }
    resetRound(table);
    const first = nextActorIndex(table, table.dealerIndex);
    table.activePlayerIndex = first;
    if (first === -1 || canAct.length <= 1) { runOut(table); resolveShowdown(table); }
    table.lastActivity = Date.now();
}

export function startHand(table: PokerTable): void {
    // remove the brokies
    table.players = table.players.filter(p => p.isSpectator ? true : p.chips > 0);
    // checks if the game has enough to start
    const activeCount = table.players.filter(p => !p.isSpectator && p.chips > 0).length;
    if (activeCount < minPlayersToStart) throw new Error(`Need at least ${minPlayersToStart} players`);

    table.handNumber++;
    table.deck = createDeck();
    table.communityCards = [];
    table.pot = 0;
    table.callAmount = 0;
    table.lastRaiseAmount = 0;
    table.sidepots = [];
    table.winners = null;

    for (const p of table.players) {
        p.holeCards = [];
        p.chipsBet = 0;
        p.currentBet = 0;
        p.folded = false;
        p.allIn = false;
        p.hasActed = false;
        p.alreadyBet = false;
    }

    // switches the dealer around from player to player
    const playable = table.players.map((p, idx) => ({ p, idx })).filter(x => !x.p.isSpectator && x.p.chips > 0);
    if (table.handNumber > 1) {
        // move dealer
        const cur = playable.findIndex(x => x.idx === table.dealerIndex);
        const nextDealer = playable[(cur + 1 + playable.length) % playable.length];
        table.dealerIndex = nextDealer.idx;
    } else {
        if (!playable.some(x => x.idx === table.dealerIndex)) {
            table.dealerIndex = playable[0].idx;
        }
    }

    const n = playable.length;
    const headsUp = n === 2;
    const dealerPos = playable.findIndex(x => x.idx === table.dealerIndex);
    const sbIdx = headsUp ? table.dealerIndex : playable[(dealerPos + 1) % n].idx;
    const bbIdx = headsUp ? playable[(dealerPos + 1) % n].idx : playable[(dealerPos + 2) % n].idx;

    // Post the blinds
    payPlayer(table, table.players[sbIdx], Math.min(table.blinds.small, table.players[sbIdx].chips));
    payPlayer(table, table.players[bbIdx], Math.min(table.blinds.big, table.players[bbIdx].chips));
    table.callAmount = table.players[bbIdx].chipsBet;

    // Deal hole cards
    for (let round = 0; round < 2; round++) {
        for (let i = 0; i < n; i++) table.players[(sbIdx + i) % n].holeCards.push(table.deck.pop()!);
    }

    table.phase = "preflop"; 

    const firstToActPlayerIdx = (() => {
        if (headsUp) return sbIdx;
        const bbPlayableIndex = playable.findIndex(x => x.idx === bbIdx);
        return playable[(bbPlayableIndex + 1) % playable.length].idx;
    })();

    table.activePlayerIndex = nextActorIndex(table, firstToActPlayerIdx === 0 ? table.players.length - 1 : firstToActPlayerIdx - 1);

    if (table.activePlayerIndex === -1 || activeNonAllIn(table).length === 0) { runOut(table); resolveShowdown(table); }
    table.lastActivity = Date.now();
}

// Actual management of the game. Basically the root
export function processAction(table: PokerTable, userId: number, action: PokerAction, amount?: number): void {
    const pidx = table.players.findIndex(p => p.userId === userId);
    if (pidx === -1) throw new Error("Player not at table");
    if (pidx !== table.activePlayerIndex) throw new Error("Not your turn");
    if (table.phase === "waiting" || table.phase === "showdown") throw new Error("No active hand");

    const player = table.players[pidx];
    if (player.folded || player.allIn) throw new Error("Cannot act");

    switch (action) { // the actions are simple.
        case "fold": // folds
            player.folded = true;
            player.hasActed = true;
            break;

        case "check": // checks
            if (player.chipsBet < table.callAmount) throw new Error("Cannot check - must call or raise");
            player.hasActed = true;
            break;

        case "call": { // calls
            const toCall = table.callAmount - player.chipsBet;
            if (toCall <= 0) {
                player.hasActed = true;
                break;
            }
            payPlayer(table, player, Math.min(toCall, player.chips));
            player.hasActed = true;
            break;
        }

        case "raise": { // raises (bit complex)
            const raiseSize = amount ?? 0;
            const toCall = table.callAmount - player.chipsBet;
            const minRaiseSize = Math.max(table.lastRaiseAmount, table.blinds.big, 10);

            if (raiseSize < minRaiseSize && (toCall + raiseSize) < player.chips) {
                throw new Error(`Minimum raise is ${minRaiseSize}`);
            }

            payPlayer(table, player, Math.min(toCall + raiseSize, player.chips));

            // checks for all in etc.
            if (player.chipsBet > table.callAmount) {
                const actualRaise = player.chipsBet - table.callAmount;
                if (!player.allIn || actualRaise >= minRaiseSize) {
                    table.lastRaiseAmount = actualRaise;
                    for (const p of table.players) {
                        if (p.userId !== userId && !p.folded && !p.allIn) {
                            p.hasActed = false;
                            p.alreadyBet = false;
                        }
                    }
                }
                table.callAmount = player.chipsBet;
            }
            player.hasActed = true;
            player.alreadyBet = true;
            break;
        }

        case "all_in": { // yolo I guess. Better be sure what your doing
            payPlayer(table, player, player.chips);
            if (player.chipsBet > table.callAmount) {
                const raiseAmt = player.chipsBet - table.callAmount;
                const minRaiseSize = Math.max(table.lastRaiseAmount, table.blinds.big, 10);
                if (raiseAmt >= minRaiseSize) {
                    table.lastRaiseAmount = raiseAmt;
                    for (const p of table.players) {
                        if (p.userId !== userId && !p.folded && !p.allIn) {
                            p.hasActed = false;
                            p.alreadyBet = false;
                        }
                    }
                }
                table.callAmount = player.chipsBet;
            }
            player.hasActed = true;
            break;
        }
    }

    if (activePlayers(table).length <= 1) { resolveFoldWin(table); return; }
    if (bettingDone(table)) { advancePhase(table); return; }

    const next = nextActorIndex(table, pidx);
    if (next === -1) { advancePhase(table); return; }
    table.activePlayerIndex = next;
    table.lastActivity = Date.now();
}
