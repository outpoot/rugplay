import { hands } from "./constants";
import { cardValue } from "./deck";

// This is just for dispaly the "High Card" (etc.) infos for the people that don't know poker well. 
// Might be completely wrong but seemed fine in testing. General idea from discords pokernight, suggested by @ahbrakadraba


function combos<T>(arr: T[], k: number): T[][] {
    if (k === 0) return [[]];
    if (arr.length < k) return [];
    const [first, ...rest] = arr;
    return [
        ...combos(rest, k - 1).map(c => [first, ...c]),
        ...combos(rest, k)
    ];
}

// This is the main checking part, that looks at the 5 cards and checks what hand it is etc.
function eval5(cards: string[]): { score: number[]; rank: number } {
    const values = cards.map(cardValue).sort((a, b) => b - a);
    const suits = cards.map(c => c.slice(-1));
    const isFlush = suits.every(s => s === suits[0]);

    const counts: Record<number, number> = {};
    for (const v of values) counts[v] = (counts[v] || 0) + 1;
    const groups = Object.entries(counts)
        .map(([v, c]) => ({ value: Number(v), count: c }))
        .sort((a, b) => b.count - a.count || b.value - a.value);

    const unique = values.filter((v, i, arr) => arr.indexOf(v) === i).sort((a, b) => b - a);    let isStraight = false;
    let straightHigh = 0;

    if (unique.length === 5) {
        if (unique[0] - unique[4] === 4) {
            isStraight = true;
            straightHigh = unique[0];
        }
        if (unique[0] === 14 && unique[1] === 5 && unique[4] === 2) {
            isStraight = true;
            straightHigh = 5;
        }
    }

    if (isFlush && isStraight) return { score: [straightHigh === 14 ? 9 : 8, straightHigh], rank: straightHigh === 14 ? 9 : 8 };
    if (groups[0].count === 4) return { score: [7, groups[0].value, groups[1].value], rank: 7 };
    if (groups[0].count === 3 && groups[1].count === 2) return { score: [6, groups[0].value, groups[1].value], rank: 6 };
    if (isFlush) return { score: [5, ...values], rank: 5 };
    if (isStraight) return { score: [4, straightHigh], rank: 4 };
    if (groups[0].count === 3) {
        const kickers = groups.filter(g => g.count === 1).map(g => g.value).sort((a, b) => b - a);
        return { score: [3, groups[0].value, ...kickers], rank: 3 };
    }
    if (groups[0].count === 2 && groups[1].count === 2) {
        const pairs = [groups[0].value, groups[1].value].sort((a, b) => b - a);
        return { score: [2, ...pairs, groups[2].value], rank: 2 };
    }
    if (groups[0].count === 2) {
        const kickers = groups.filter(g => g.count === 1).map(g => g.value).sort((a, b) => b - a);
        return { score: [1, groups[0].value, ...kickers], rank: 1 };
    }

    return { score: [0, ...values], rank: 0 };
}

// compares hands
export function compare(a: number[], b: number[]): number {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const diff = (a[i] ?? 0) - (b[i] ?? 0);
        if (diff !== 0) return diff > 0 ? 1 : -1;
    }
    return 0;
}

// actual highlighting basically
export function evalHand(hole: string[], community: string[]): { score: number[]; rank: number; name: string } {
    const allCombos = combos([...hole, ...community], 5);
    let best = { score: [-1], rank: -1, name: "" };

    for (const combo of allCombos) {
        const handResult = eval5(combo);
        if (compare(handResult.score, best.score) > 0) {
            best = { ...handResult, name: hands[handResult.rank] };
        }
    }

    return best;
}