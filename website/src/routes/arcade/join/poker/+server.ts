import { redirect } from '@sveltejs/kit';
import { redis } from '$lib/server/redis';
import {
    codePrefix,
    tablePrefix,
    type PokerTable
} from '$lib/server/games/poker/engine';
import type { RequestHandler } from '$types';
import { image } from '$lib/utils/poker/image';

// Main route that handles the Image generation. Thats why this is the link you copy when you share etc.

function formatValue(n: number): string {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
    return `$${n.toFixed(2)}`;
}

function format(n: number): string {
    if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
    return `${n.toFixed(2)}`;
}

// This requires polling of metadata to be allowed. so BETTER allow it.
export const GET: RequestHandler = async ({ url }) => {
    const code = url.searchParams.get('code') ?? '';

    if (!/^\d{4}$/.test(code)) {
        throw redirect(302, '/arcade?game=poker');
    }

    const dest = `/arcade?game=poker&code=${code}`;

    let title = `Join a Poker Match on Rugplay`;
    let description = `Poker room code ${code}. Join the table on Rugplay Arcade.`; // change how you want.
    let hostName = 'Someone';
    let buyIn = '';
    let buyInsmall = '';
    let players = '';
    let imageurl = null
    let maxPlayers = 6;
    let found = false;

    try {
        const tableId = await redis.get(`${codePrefix}${code}`);
        if (tableId) {
            const raw = await redis.get(`${tablePrefix}${tableId}`);
            if (raw) {
                const table = JSON.parse(raw) as PokerTable;

                const host = table.players.find(p => p.userId === table.hostUserId);
                hostName = host?.username ?? 'Someone';

                buyIn = formatValue(table.buyIn);
                buyInsmall = format(table.buyIn);
                maxPlayers = table.maxPlayers;

                players = `${table.players.length}/${table.maxPlayers}`;

                title = `Join ${hostName}'s Poker Table on Rugplay`;
                description = `Room Code: ${code} · Buy-in: ${buyIn} · ${players} players · Click to join`;

                found = true;
            }
        }
    } catch {}

    if (!found) {
        title = `This poker room does not exist yet`;
        description = `Join Rugplay to create your own poker room!`;
    }

    if (found) {
        const exists = await redis.exists(`poker:image:${code}`);
        if (!exists) {
            imageurl = await image(code, buyInsmall, maxPlayers.toString());
        } else {
            imageurl = await redis.get(`poker:image:${code}`);
        }
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />

<title>${title}</title>
<meta name="description" content="${description}" />

<meta property="og:site_name" content="Rugplay" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${url.href}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${imageurl}" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${imageurl}" />

<script> window.location.href = '${dest}'; </script>
</head>
<body></body>
</html>`;

    return new Response(html, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store'
        }
    });
};