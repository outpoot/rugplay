export const SEASON_LENGTH_DAYS = 30;
export const SEASON_LENGTH_MS = SEASON_LENGTH_DAYS * 24 * 60 * 60 * 1000;
export const RANKED_STAKE = 100_000;

export type SeasonTrophyTier =
	| 'CHAMPION'
	| 'RUNNER_UP'
	| 'THIRD'
	| 'TOP_10'
	| 'TOP_100'
	| 'PARTICIPANT';

export function getTrophyTier(rank: number): SeasonTrophyTier {
	if (rank === 1) return 'CHAMPION';
	if (rank === 2) return 'RUNNER_UP';
	if (rank === 3) return 'THIRD';
	if (rank <= 10) return 'TOP_10';
	if (rank <= 100) return 'TOP_100';
	return 'PARTICIPANT';
}

export const TROPHY_LABELS: Record<SeasonTrophyTier, string> = {
	CHAMPION: 'Champion',
	RUNNER_UP: 'Runner-up',
	THIRD: '3rd Place',
	TOP_10: 'Top 10',
	TOP_100: 'Top 100',
	PARTICIPANT: 'Competitor'
};

export function ordinal(n: number): string {
	const mod100 = n % 100;
	if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
	switch (n % 10) {
		case 1:
			return `${n}st`;
		case 2:
			return `${n}nd`;
		case 3:
			return `${n}rd`;
		default:
			return `${n}th`;
	}
}

export function trophyTooltip(
	seasonName: string,
	rank: number,
	tier: SeasonTrophyTier,
	entrants?: number
): string {
	const placing = entrants ? `${ordinal(rank)} of ${entrants}` : ordinal(rank);
	return `${seasonName} — ${TROPHY_LABELS[tier]} (${placing})`;
}

export const TROPHY_CLASSES: Record<SeasonTrophyTier, string> = {
	CHAMPION: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
	RUNNER_UP: 'bg-slate-400/15 text-slate-600 dark:text-slate-300 border-slate-400/30',
	THIRD: 'bg-amber-700/15 text-amber-700 dark:text-amber-500 border-amber-700/30',
	TOP_10: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
	TOP_100: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
	PARTICIPANT: 'bg-muted text-muted-foreground border-border'
};

export function getSeasonName(number: number): string {
	return `Season ${number}`;
}
