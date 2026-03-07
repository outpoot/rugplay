import OpenAI from 'openai';
import { OPENROUTER_API_KEY } from '$env/static/private';

let openai: OpenAI | null = null;

if (!OPENROUTER_API_KEY) {
    console.warn("OPENROUTER_API_KEY is not set – AI features are disabled.");
} else {
    openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: OPENROUTER_API_KEY,
    });
}

export { openai };