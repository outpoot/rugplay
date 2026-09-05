import { createClient } from 'redis';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';

const redisUrl = env.REDIS_URL || 'redis://localhost:6379';

function createMemoryRedis() {
    const store = new Map<string, { value: string; expiresAt: number | null }>();

    const isLive = (entry: { expiresAt: number | null } | undefined) =>
        !!entry && (entry.expiresAt === null || entry.expiresAt > Date.now());

    const read = (key: string) => {
        const entry = store.get(key);
        if (!isLive(entry)) {
            store.delete(key);
            return null;
        }
        return entry!.value;
    };

    return {
        isMemoryStub: true,

        async connect() { },
        async quit() { },
        on() { },

        async get(key: string) {
            return read(key);
        },

        async set(key: string, value: string, opts?: { NX?: boolean; EX?: number; PX?: number }) {
            if (opts?.NX && read(key) !== null) return null;

            let expiresAt: number | null = null;
            if (opts?.EX) expiresAt = Date.now() + opts.EX * 1000;
            else if (opts?.PX) expiresAt = Date.now() + opts.PX;

            store.set(key, { value: String(value), expiresAt });
            return 'OK';
        },

        async del(key: string | string[]) {
            const keys = Array.isArray(key) ? key : [key];
            let removed = 0;
            for (const k of keys) if (store.delete(k)) removed++;
            return removed;
        },

        async incr(key: string) {
            const next = Number(read(key) ?? 0) + 1;
            const existing = store.get(key);
            store.set(key, { value: String(next), expiresAt: existing?.expiresAt ?? null });
            return next;
        },

        async expire(key: string, seconds: number) {
            const entry = store.get(key);
            if (!isLive(entry)) return false;
            entry!.expiresAt = Date.now() + seconds * 1000;
            return true;
        },

        async scan(_cursor: string | number, opts?: { MATCH?: string; COUNT?: number }) {
            const pattern = opts?.MATCH;
            const keys: string[] = [];

            for (const key of [...store.keys()]) {
                if (read(key) === null) continue;
                if (!pattern) { keys.push(key); continue; }
                const re = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
                if (re.test(key)) keys.push(key);
            }

            return { cursor: '0', keys };
        },

        async publish(_channel: string, _message: string) {
            return 0;
        },

        async eval(_script: string, opts?: { keys?: string[]; arguments?: string[] }) {
            const key = opts?.keys?.[0];
            const nextValue = opts?.arguments?.[0];
            const expectedVersion = Number(opts?.arguments?.[1]);
            if (!key || nextValue === undefined) return 0;

            const current = read(key);
            if (current === null) return 0;

            try {
                const state = JSON.parse(current);
                if ((state.version ?? 0) !== expectedVersion) return 0;
            } catch {
                return 0;
            }

            const existing = store.get(key);
            store.set(key, { value: nextValue, expiresAt: existing?.expiresAt ?? null });
            return 1;
        }
    };
}

async function initRedis() {
    if (env.DISABLE_REDIS === 'true') {
        console.warn('⚠️  DISABLE_REDIS=true - using in-memory stub (no live feeds, single-process only)');
        return createMemoryRedis();
    }

    const real = createClient({ url: redisUrl });
    real.on('error', (err: any) => console.error('Redis Client Error:', err));

    if (building) return real;

    try {
        await real.connect();
        return real;
    } catch (err) {
        console.warn(`⚠️  Redis unreachable at ${redisUrl} - falling back to in-memory stub.`);
        console.warn('   Live feeds are disabled. Start Redis or set DISABLE_REDIS=true to silence this.');
        real.removeAllListeners('error');
        real.on('error', () => { });
        return createMemoryRedis();
    }
}

const client = await initRedis();

export { client as redis };
