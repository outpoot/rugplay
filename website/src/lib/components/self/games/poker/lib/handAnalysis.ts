import { type PublicPokerPlayer } from "../types";

// This whole code is for the little text that says "High Card" etc. and is mostly taken from stackoverflow

const RANKS: Record<string, number> = {
	A: 14, K: 13, Q: 12, J: 11, T: 10
};

const toRank = (rankStr: string) => RANKS[rankStr] ?? +rankStr;

interface EvalCard {
	raw: string;
	rank: number;
	suit: string;
	source: 'hole' | 'community';
	sourceIndex: number;
}

const parseCard = (raw: string, source: EvalCard['source'], index: number): EvalCard => ({
	raw,
	rank: toRank(raw.slice(0, -1)),
	suit: raw.at(-1)!,
	source,
	sourceIndex: index
});

const groupBy = <T, K>(items: T[], getKey: (item: T) => K) =>
	items.reduce((map, item) => {
		const key = getKey(item);
		(map.get(key) ?? map.set(key, []).get(key)!).push(item);
		return map;
	}, new Map<K, T[]>());

const findStraight = (cards: EvalCard[]) => {
	const byRank = new Map<number, EvalCard>();
	for (const card of [...cards].sort((a, b) => b.rank - a.rank)) {
		if (!byRank.has(card.rank)) byRank.set(card.rank, card);
	}
	if (byRank.has(14)) byRank.set(1, byRank.get(14)!);

	for (let high = 14; high >= 5; high--) {
		const sequence = [high, high - 1, high - 2, high - 3, high - 4];
		if (sequence.every(rank => byRank.has(rank))) {
			return sequence.map(rank => byRank.get(rank)!);
		}
	}

	return [];
};

export function analyze(player: PublicPokerPlayer | null, community: string[]) {
	if (!player) return emptyResult();

	const cards = [
		...player.holeCards.map((c, i) => parseCard(c, 'hole', i)),
		...community.map((c, i) => parseCard(c, 'community', i))
	];
	if (!cards.length) return emptyResult();

	const byRank = [...groupBy(cards, card => card.rank)]
		.map(([rank, groupCards]) => ({ rank, cards: groupCards }))
		.sort((a, b) => b.cards.length - a.cards.length || b.rank - a.rank);

	const bySuit = groupBy(cards, card => card.suit);

	const pick = (handName: string, chosen: EvalCard[]) => {
		const highlightedHole: number[] = [];
		const highlightedCommunity: number[] = [];

		for (const card of chosen) {
			(card.source === 'hole' ? highlightedHole : highlightedCommunity).push(card.sourceIndex);
		}

		return { handName, highlightedHole, highlightedCommunity };
	};

	// Check for Straight Flush
	for (const suited of bySuit.values()) {
		if (suited.length >= 5) {
			const straightFlush = findStraight(suited);
			if (straightFlush.length) return pick('Straight Flush', straightFlush);
		}
	}

	// Four of a Kind
	if (byRank[0]?.cards.length === 4) return pick('Four of a Kind', byRank[0].cards);

	const trips = byRank.filter(group => group.cards.length >= 3);
	const pairsForFullHouse = byRank.filter(group => group.cards.length >= 2 && group.rank !== trips[0]?.rank);

	// Full House
	if (trips.length && pairsForFullHouse.length) {
		return pick(
			'Full House',
			[...trips[0].cards.slice(0, 3), ...pairsForFullHouse[0].cards.slice(0, 2)]
		);
	}

	// Flush
	for (const suited of bySuit.values()) {
		if (suited.length >= 5) {
			return pick('Flush', suited.sort((a, b) => b.rank - a.rank).slice(0, 5));
		}
	}

	// Straight
	const straight = findStraight(cards);
	if (straight.length) return pick('Straight', straight);

	// Three of a Kind
	if (byRank[0]?.cards.length === 3) return pick('Three of a Kind', byRank[0].cards.slice(0, 3));

	const allPairs = byRank.filter(group => group.cards.length >= 2);

	// Two Pair
	if (allPairs.length >= 2) {
		return pick(
			'Two Pair',
			[...allPairs[0].cards.slice(0, 2), ...allPairs[1].cards.slice(0, 2)]
		);
	}

	// One Pair
	if (allPairs.length === 1) return pick('One Pair', allPairs[0].cards.slice(0, 2));

	// High Card
	const highestCard = cards.reduce((prev, curr) => (curr.rank > prev.rank ? curr : prev));
	return pick('High Card', [highestCard]);
}

const emptyResult = () => ({
	handName: '',
	highlightedHole: [] as number[],
	highlightedCommunity: [] as number[]
});