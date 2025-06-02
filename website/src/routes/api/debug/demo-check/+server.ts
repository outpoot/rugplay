import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { PUBLIC_DEMO_MODE } from '$env/static/public';

export async function GET() {
    return json({
        demoMode: env.DEMO_MODE === 'true',
        publicDemoMode: PUBLIC_DEMO_MODE === 'true',
        message: 'Demo mode configuration check'
    });
}
