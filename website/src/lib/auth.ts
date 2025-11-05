// src/lib/auth.ts (or your auth config file)
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { db } from "./server/db";
import * as schema from "./server/db/schema";
import { generateUsername } from "./utils/random";
import { uploadProfilePicture } from "./server/s3";
import { apiKey } from "better-auth/plugins";

if (!privateEnv.GOOGLE_CLIENT_ID) throw new Error('GOOGLE_CLIENT_ID is not set');
if (!privateEnv.GOOGLE_CLIENT_SECRET) throw new Error('GOOGLE_CLIENT_SECRET is not set');
if (!publicEnv.PUBLIC_BETTER_AUTH_URL) throw new Error('PUBLIC_BETTER_AUTH_URL is not set');

export const auth = betterAuth({
    baseURL: publicEnv.PUBLIC_BETTER_AUTH_URL,
    secret: privateEnv.PRIVATE_BETTER_AUTH_SECRET,
    appName: "Rugplay",

    trustedOrigins: [
        publicEnv.PUBLIC_BETTER_AUTH_URL,
        "http://rugplay.com",
        "http://localhost:5173",
    ],

    plugins: [
        apiKey({
            defaultPrefix: 'rgpl_',
            rateLimit: {
                enabled: true,
                timeWindow: 1000 * 60 * 60 * 24, // 1 day
                maxRequests: 2000 // 2000 requests per day
            },
            permissions: {
                defaultPermissions: {
                    api: ['read']
                }
            }
        }),
    ],
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: schema,
    }),
    socialProviders: {
        google: {
            clientId: privateEnv.GOOGLE_CLIENT_ID,
            clientSecret: privateEnv.GOOGLE_CLIENT_SECRET,
            mapProfileToUser: async (profile) => {
                const newUsername = generateUsername();
                let s3ImageKey: string | null = null;

                if (profile.picture) {
                    try {
                        const response = await fetch(profile.picture);
                        if (!response.ok) {
                            console.error(`Failed to fetch profile picture: ${response.statusText}`);
                        } else {
                            const blob = await response.blob();
                            const arrayBuffer = await blob.arrayBuffer();
                            s3ImageKey = await uploadProfilePicture(
                                profile.sub,
                                new Uint8Array(arrayBuffer),
                                blob.type || 'image/jpeg'
                            );
                        }
                    } catch (error) {
                        console.error('Failed to upload profile picture during social login:', error);
                    }
                }

                return {
                    name: profile.name,
                    email: profile.email,
                    image: s3ImageKey,
                    username: newUsername,
                };
            },
        }
    },
    user: {
        additionalFields: {
            username: { type: "string", required: true, input: false },
            isAdmin: { type: "boolean", required: true, input: false },
            isBanned: { type: "boolean", required: false, input: false },
            banReason: { type: "string", required: false, input: false },
            baseCurrencyBalance: { type: "string", required: false, input: false },
            bio: { type: "string", required: false },
            volumeMaster: { type: "string", required: false, input: false },
            volumeMuted: { type: "boolean", required: false, input: false },
        }
    },
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 60 * 5,
        }
    },
    advanced: {
        database: {
            generateId: false,
        }
    }
});