import { env } from '$env/dynamic/private';

const TURNSTILE_SECRET = env.TURNSTILE_SECRET_KEY;

export async function verifyTurnstile(token: string, request: Request): Promise<boolean> {
	if (!TURNSTILE_SECRET) return false;
	const ip = request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined;
	const body = new URLSearchParams({
		secret: TURNSTILE_SECRET,
		response: token,
		...(ip ? { remoteip: ip } : {})
	});
	const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
		method: 'POST',
		body,
		headers: { 'content-type': 'application/x-www-form-urlencoded' }
	});
	const data = await res.json();
	return !!data.success;
}
