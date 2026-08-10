/**
 * AI news writer. Uses OpenRouter's free-model router (see MODEL below)
 * rather than a paid model, since news articles are a nice-to-have, not
 * a core feature — this is fully optional: every call site in
 * `pipeline.ts` falls back to `generateTemplateArticle` if this module
 * throws, times out, or isn't configured. Nothing here should ever be
 * allowed to block article creation.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '$env/dynamic/private';
import type { NewsEventInput } from './types';

const OPENROUTER_API_KEY = env.OPENROUTER_API_KEY;

const openai = OPENROUTER_API_KEY
	? new OpenAI({
			baseURL: 'https://openrouter.ai/api/v1',
			apiKey: OPENROUTER_API_KEY
		})
	: null;

// openrouter/free: OpenRouter's own router that randomly selects a free
// model from whatever's currently available, filtered to ones that
// support the features this call needs (structured JSON output). This
// avoids hardcoding a specific ":free" model slug, since individual free
// models get added/removed/rate-limited on their own schedule — the
// router absorbs that churn instead of this file needing updates every
// time a specific model disappears. See:
// https://openrouter.ai/openrouter/free
const MODEL = 'openrouter/free';

const ArticleSchema = z.object({
	headline: z.string().min(8).max(150),
	summary: z.string().min(20).max(260),
	body: z.string().min(40).max(1200)
});

export type AiArticleResult = z.infer<typeof ArticleSchema>;

const SYSTEM_PROMPT = `You are the newsroom AI for Rugplay, a satirical fake-crypto trading simulator.
Write short, punchy market news articles about in-game events (fake coins, fake money, fake "rug pulls").
Tone: witty tabloid financial journalism — think CNBC chyrons crossed with degen Twitter. Never mean-spirited toward real people.
Always make clear (implicitly, through tone) that this is a simulation with fake money — never write as if real financial harm occurred.
Do not use markdown formatting, headers, or bullet points. Plain prose only.
Respond with ONLY a JSON object: { "headline": string, "summary": string, "body": string }.
- headline: under 150 chars, no clickbait ALL CAPS spam, one exclamation point max.
- summary: 1-2 sentences, under 260 chars, for a compact card view.
- body: 2-4 short paragraphs, under 1200 chars, for a full article view.`;

function eventToPrompt(event: NewsEventInput): string {
	return `Event type: ${event.type}\nEvent data: ${JSON.stringify(event.metadata, null, 2)}\n\nWrite a news article about this event.`;
}

/**
 * Attempts AI generation. Returns null (never throws) if the AI is
 * unavailable or the response fails validation — callers should treat
 * null as "use the template fallback".
 */
export async function generateAiArticle(event: NewsEventInput): Promise<AiArticleResult | null> {
	if (!openai) return null;

	try {
		const completion = await Promise.race([
			openai.chat.completions.create({
				model: MODEL,
				messages: [
					{ role: 'system', content: SYSTEM_PROMPT },
					{ role: 'user', content: eventToPrompt(event) }
				],
				temperature: 0.8,
				response_format: { type: 'json_object' }
			}),
			// Hard timeout — a news article is never worth blocking the
			// triggering request (a trade, a coin creation, etc).
			new Promise<never>((_, reject) => setTimeout(() => reject(new Error('AI news timeout')), 8000))
		]);

		const content = completion.choices[0]?.message?.content;
		if (!content) return null;

		const parsed = ArticleSchema.safeParse(JSON.parse(content));
		if (!parsed.success) {
			console.warn('AI news article failed validation:', parsed.error.flatten());
			return null;
		}

		return parsed.data;
	} catch (error) {
		console.error('AI news generation failed, will fall back to template:', error);
		return null;
	}
}
