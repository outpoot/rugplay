import type { PokerTable, WinnerInfo } from "./types";
import { evalHand, compare } from "./eval";

function activePlayers(table: PokerTable) {
    return table.players.filter(p => !p.folded);
}

// This is the main sidepot / split logic. Basically for payout etc.


export function splitPot(table: PokerTable): void {
    let bets = table.players.map(p => p.chipsBet).sort((a, b) => a - b);
    table.sidepots = [];

    if (bets[0] === bets[bets.length - 1]) return;

    let bet: number | undefined;
    while ((bet = bets.shift()) !== undefined && bet >= 0) {
        if (bet > 0) {
            const prev = table.sidepots[table.sidepots.length - 1];
            const minChipsBet = prev ? bet + prev.minChipsBet : bet;
            table.sidepots.push({ minChipsBet, pot: bet * (bets.length + 1) });
            bets = bets.map(v => v - bet!);
        }
    }
}

export function resolveFoldWin(table: PokerTable): void {
    const winner = activePlayers(table)[0];
    if (!winner) return;
    winner.chips += table.pot;
    table.winners = [{ userId: winner.userId, amount: table.pot, handName: "Everyone folded", holeCards: winner.holeCards }];
    table.phase = "showdown";
    table.pot = 0;
    table.activePlayerIndex = -1;
    table.lastActivity = Date.now();
}

export function resolveShowdown(table: PokerTable): void {
    table.phase = "showdown";
    table.activePlayerIndex = -1;

    const active = activePlayers(table);
    const evals = active.map(p => ({
        userId: p.userId,
        holeCards: p.holeCards,
        chipsBet: p.chipsBet,
        ...evalHand(p.holeCards, table.communityCards)
    }));

    const winners: WinnerInfo[] = [];

    // sidepot resolve
    const pots = table.sidepots.length > 0
        ? table.sidepots
        : [{ minChipsBet: table.callAmount, pot: table.pot }];

    for (const sidepot of pots) {
        const eligible = evals
            .filter(e => e.chipsBet >= sidepot.minChipsBet)
            .sort((a, b) => compare(b.score, a.score));

        if (eligible.length === 0) continue;

        const best = eligible[0].score;
        const potWinners = eligible.filter(e => compare(e.score, best) === 0);
        const share = Math.floor(sidepot.pot / potWinners.length);
        let remainder = sidepot.pot - share * potWinners.length;

        for (const w of potWinners) {
            const player = table.players.find(p => p.userId === w.userId)!;
            const amount = share + (remainder-- > 0 ? 1 : 0);
            player.chips += amount;
            const existing = winners.find(x => x.userId === w.userId);
            if (existing) existing.amount += amount;
            else winners.push({ userId: w.userId, amount, handName: w.name, holeCards: w.holeCards });
        }
    }

    table.winners = winners;
    table.pot = 0;
    table.lastActivity = Date.now();
}
