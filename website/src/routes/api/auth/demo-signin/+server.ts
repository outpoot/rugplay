import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { auth } from '$lib/auth';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { generateUsername } from '$lib/utils/random';

export async function POST({ request, cookies }: { request: Request; cookies: any }) {
    // Only allow demo sign-in if demo mode is enabled
    const isDemoMode = env.DEMO_MODE === 'true';
    
    if (!isDemoMode) {
        throw error(403, 'Demo mode is not enabled');
    }

    try {
        const DEMO_USER_EMAIL = 'demo@rugplay.local';
        const DEMO_USER_NAME = 'Demo User';
        
        // Check if demo user already exists
        let demoUser = await db.query.user.findFirst({
            where: eq(schema.user.email, DEMO_USER_EMAIL)
        });

        if (!demoUser) {
            // Create demo user with a random username
            const username = generateUsername();
            
            const [newUser] = await db.insert(schema.user).values({
                email: DEMO_USER_EMAIL,
                name: DEMO_USER_NAME,
                username: username,
                emailVerified: true,
                baseCurrencyBalance: '10000.00', // Give demo user some starting money
                bio: 'This is a demo user for testing purposes',
                isAdmin: false,
                isBanned: false,
                volumeMaster: '0.70',
                volumeMuted: false
            }).returning();
            
            demoUser = newUser;
        }

        // Create a session manually since we can't use credential sign-in
        const sessionToken = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
        
        await db.insert(schema.session).values({
            token: sessionToken,
            userId: demoUser.id,
            expiresAt: expiresAt,
            ipAddress: request.headers.get('x-forwarded-for') || 'demo',
            userAgent: request.headers.get('user-agent') || 'demo'
        });

        // Set the session cookie
        cookies.set('better-auth.session_token', sessionToken, {
            path: '/',
            httpOnly: true,
            secure: env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 days
        });

        return json({ 
            success: true, 
            message: 'Successfully signed in as demo user',
            user: {
                id: demoUser.id,
                name: demoUser.name,
                username: demoUser.username,
                email: demoUser.email
            }
        });
    } catch (err) {
        console.error('Demo sign-in error:', err);
        throw error(500, 'Failed to sign in as demo user');
    }
}
