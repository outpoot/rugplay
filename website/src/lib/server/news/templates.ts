/**
 * Deterministic "smart template" article generator.
 *
 * This is the backup path used whenever AI generation is unavailable:
 *   - OPENROUTER_API_KEY isn't set
 *   - the OpenRouter call throws / times out
 *   - the AI response fails schema validation
 *
 * Templates are picked based on the magnitude of the underlying event
 * (e.g. a -90% rug reads very differently from a -21% one) so the feed
 * doesn't feel robotic even without AI. No network calls happen here —
 * this must be fast and always succeed.
 */

import type { NewsEventInput } from './types';

function pick<T>(arr: T[], seed: number): T {
	return arr[Math.abs(seed) % arr.length];
}

// Cheap deterministic seed from a string so the same event always maps to
// the same phrasing on retries, but different events read differently.
function seedOf(input: string): number {
	let h = 0;
	for (let i = 0; i < input.length; i++) {
		h = (h * 31 + input.charCodeAt(i)) | 0;
	}
	return h;
}

export function generateTemplateArticle(event: NewsEventInput): {
	headline: string;
	summary: string;
	body: string;
} {
	const seed = seedOf(JSON.stringify(event.metadata) + event.type);

	switch (event.type) {
		case 'RUG_PULL': {
			const { symbol, name, priceImpact, amountReceived, dumperUsername } = event.metadata as {
				symbol: string;
				name: string;
				priceImpact: number;
				amountReceived: number;
				dumperUsername?: string;
			};
			const severity = Math.abs(priceImpact);

			const savage = [
				`*${symbol} just got obliterated — ${severity.toFixed(1)}% wiped out in seconds`,
				`Holders of *${symbol} wake up to a crater where their bags used to be`,
				`*${symbol} down ${severity.toFixed(1)}%: another one bites the dust`
			];
			const mild = [
				`*${symbol} takes a ${severity.toFixed(1)}% hit after a large sell`,
				`Big *${symbol} sell-off sends the chart south`,
				`*${symbol} slides ${severity.toFixed(1)}% on heavy selling pressure`
			];

			const headline = pick(severity >= 60 ? savage : mild, seed);
			const who = dumperUsername ? `@${dumperUsername}` : 'A large holder';
			const summary = `${who} sold a big position in ${name}, sending the price down ${severity.toFixed(1)}% and pulling roughly $${Math.round(amountReceived).toLocaleString()} out of the pool.`;
			const body = [
				`${who} exited a significant position in ${name} (*${symbol}), triggering a ${severity.toFixed(1)}% price crash.`,
				`The sale pulled an estimated $${Math.round(amountReceived).toLocaleString()} out of the liquidity pool, leaving remaining holders facing steep losses.`,
				severity >= 60
					? `This is one of the sharper drops the market has seen recently — classic rug pull territory.`
					: `While painful, the pool has absorbed worse — some holders may see this as a buying opportunity, others as a warning sign.`,
				`As always on Rugplay: nothing here is financial advice, because none of it is real money.`
			].join('\n\n');

			return { headline, summary, body };
		}

		case 'COIN_PUMP': {
			const { symbol, name, priceChangePercent } = event.metadata as {
				symbol: string;
				name: string;
				priceChangePercent: number;
			};
			const headlines = [
				`*${symbol} is on fire, up ${priceChangePercent.toFixed(1)}% and climbing`,
				`Everyone's watching *${symbol} after a ${priceChangePercent.toFixed(1)}% surge`,
				`*${symbol} pumps ${priceChangePercent.toFixed(1)}% — is this the top, or just the start?`
			];
			const headline = pick(headlines, seed);
			const summary = `${name} rallied ${priceChangePercent.toFixed(1)}% in a short window, drawing fresh attention from traders across the market.`;
			const body = [
				`${name} (*${symbol}) has surged ${priceChangePercent.toFixed(1)}%, making it one of the market's biggest movers right now.`,
				`Sharp pumps like this can be the start of real momentum — or the calm before a rug. Keep an eye on the liquidity pool before piling in.`
			].join('\n\n');
			return { headline, summary, body };
		}

		case 'COIN_CREATED': {
			const { symbol, name, creatorUsername } = event.metadata as {
				symbol: string;
				name: string;
				creatorUsername?: string;
			};
			const headlines = [
				`New coin alert: ${name} (*${symbol}) just launched`,
				`*${symbol} enters the market — will it moon or rug?`,
				`${creatorUsername ? `@${creatorUsername}` : 'A trader'} just launched ${name} (*${symbol})`
			];
			const headline = pick(headlines, seed);
			const summary = `${name} (*${symbol}) is now live and trading on the open market.`;
			const body = [
				`${name} (*${symbol}) has just launched on Rugplay${creatorUsername ? ` courtesy of @${creatorUsername}` : ''}.`,
				`Like every new coin, it starts life with a locked trading window and a fresh liquidity pool. Whether it's a legitimate project or a future rug pull is, as always, up to the market to decide.`
			].join('\n\n');
			return { headline, summary, body };
		}

		case 'COIN_MILESTONE': {
			const { symbol, name, milestoneLabel } = event.metadata as {
				symbol: string;
				name: string;
				milestoneLabel: string;
			};
			const headline = `${name} (*${symbol}) crosses ${milestoneLabel}`;
			const summary = `${name} has reached a new milestone: ${milestoneLabel}.`;
			const body = `${name} (*${symbol}) has crossed ${milestoneLabel}, cementing its place among the market's more notable coins. Whether it holds this level is anyone's guess.`;
			return { headline, summary, body };
		}

		case 'HOPIUM_RESOLVED': {
			const { question, resolution, confidence } = event.metadata as {
				question: string;
				resolution: boolean;
				confidence: number;
			};
			const headlines = [
				`Hopium review: "${question}" resolved ${resolution ? 'YES' : 'NO'}`,
				`The verdict is in: "${question}" — ${resolution ? 'YES' : 'NO'}`
			];
			const headline = pick(headlines, seed);
			const summary = `The prediction market "${question}" has been resolved ${resolution ? 'YES' : 'NO'} with ${confidence}% confidence.`;
			const body = [
				`The Hopium question "${question}" has been resolved: ${resolution ? 'YES' : 'NO'}.`,
				`Resolution confidence: ${confidence}%. Bettors on the ${resolution ? 'YES' : 'NO'} side can now claim their winnings.`
			].join('\n\n');
			return { headline, summary, body };
		}

		case 'HOPIUM_TRENDING': {
			const { question, totalVolume } = event.metadata as { question: string; totalVolume: number };
			const headline = `Traders are piling into: "${question}"`;
			const summary = `This Hopium question has attracted $${Math.round(totalVolume).toLocaleString()} in total bets and counting.`;
			const body = `"${question}" is heating up on Hopium, with $${Math.round(totalVolume).toLocaleString()} wagered so far. Still time to weigh in before it resolves.`;
			return { headline, summary, body };
		}

		case 'WHALE_TRADE': {
			const { symbol, name, side, amount, username } = event.metadata as {
				symbol: string;
				name: string;
				side: 'BUY' | 'SELL';
				amount: number;
				username?: string;
			};
			const who = username ? `@${username}` : 'A whale';
			const verb = side === 'BUY' ? 'scooped up' : 'dumped';
			const headline = `${who} just ${verb} $${Math.round(amount).toLocaleString()} of *${symbol}`;
			const summary = `A single large ${side.toLowerCase()} order moved ${name} (*${symbol}) — worth roughly $${Math.round(amount).toLocaleString()}.`;
			const body = `${who} executed a large ${side.toLowerCase()} order on ${name} (*${symbol}) worth approximately $${Math.round(amount).toLocaleString()}, making it one of the biggest single trades on the market today.`;
			return { headline, summary, body };
		}

		case 'LEADERBOARD_SHAKEUP': {
			const { username, previousRank } = event.metadata as {
				username: string;
				previousRank?: number;
			};
			const headline = `@${username} takes the #1 spot on the leaderboard`;
			const summary = previousRank
				? `@${username} climbed from #${previousRank} to #1, dethroning the previous leader.`
				: `@${username} has claimed the top spot on the leaderboard.`;
			const body = `${headline}. ${summary} The race for the top continues as traders jostle for position.`;
			return { headline, summary, body };
		}

		case 'SEASON_EVENT': {
			const { seasonName, phase } = event.metadata as {
				seasonName: string;
				phase: 'STARTED' | 'ENDED';
			};
			const headline =
				phase === 'STARTED' ? `${seasonName} has begun!` : `${seasonName} has come to a close`;
			const summary =
				phase === 'STARTED'
					? `A new season is live. Time to climb the ranks and claim your trophy.`
					: `The season is over — check the leaderboard to see where you landed.`;
			const body = `${headline}. ${summary}`;
			return { headline, summary, body };
		}

		default: {
			const headline = (event.metadata as any)?.headline || 'Rugplay Market Update';
			const summary = (event.metadata as any)?.summary || 'A new market update is available.';
			return { headline, summary, body: summary };
		}
	}
}
