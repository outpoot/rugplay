import { db } from './db';
import { session } from './db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import type { RequestEvent } from '@sveltejs/kit';

export interface CreateSessionOptions {
    userId: number;
    request: Request;
    cookies: RequestEvent['cookies'];
    expirationDays?: number;
}

/**
 * Creates a session programmatically for a user
 * @param options - Configuration for session creation
 * @returns The created session token
 */
export async function createSession(options: CreateSessionOptions): Promise<string> {
    const { userId, request, cookies, expirationDays = 7 } = options;
    
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);
    
    // Insert session into database
    await db.insert(session).values({
        token: sessionToken,
        userId: userId,
        expiresAt: expiresAt,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
    });
    
    // Set the session cookie
    cookies.set('better-auth.session_token', sessionToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * expirationDays
    });
    
    return sessionToken;
}

/**
 * Invalidates all sessions for a user (useful for logout)
 * @param userId - The user ID to invalidate sessions for
 */
export async function invalidateUserSessions(userId: number): Promise<void> {
    await db.delete(session).where(eq(session.userId, userId));
}

/**
 * Invalidates a specific session
 * @param sessionToken - The session token to invalidate
 */
export async function invalidateSession(sessionToken: string): Promise<void> {
    await db.delete(session).where(eq(session.token, sessionToken));
}
