import { error } from '@sveltejs/kit';
import { generateDownloadUrl } from '$lib/server/s3.js';

export async function GET({ params }) {
    const path = params.path;

    if (!path) {
        throw error(400, 'Path is required');
    }

    if (path.includes('..') || path.includes('\0')) {
        throw error(400, 'Invalid path');
    }

    let cacheControl: string;

    if (path.includes('/coin/') || path.includes('coin-icon') || path.startsWith('coins/')) {
        cacheControl = 'public, max-age=31536000, immutable';
    } else if (path.includes('/avatars/') || path.includes('profile-') || path.includes('avatar')) {
        cacheControl = 'public, max-age=60';
    } else {
        cacheControl = 'public, max-age=86400';
    }

    try {
        const signedUrl = await generateDownloadUrl(path);

        const response = await fetch(signedUrl);

        if (!response.ok) {
            throw error(response.status, 'Failed to fetch from S3');
        }

        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const buffer = await response.arrayBuffer();

        return new Response(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': cacheControl,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
    } catch (e) {
        console.error('Proxy error:', e);
        throw error(500, 'Failed to proxy S3 request');
    }
}
