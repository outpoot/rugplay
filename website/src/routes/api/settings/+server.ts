import { auth } from '$lib/auth';
import { uploadProfilePicture } from '$lib/server/s3';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { MAX_FILE_SIZE } from '$lib/data/constants';
import { isNameAppropriate } from '$lib/server/moderation';

async function validateInputs(name: string, bio: string, username: string, avatarFile: File | null) {
    if (name && name.trim().length < 1) {
        throw error(400, 'Name cannot be empty');
    }

    if (name && !(await isNameAppropriate(name.trim()))) {
        throw error(400, 'Name contains inappropriate content');
    }

    if (bio && bio.length > 160) {
        throw error(400, 'Bio must be 160 characters or less');
    }

    if (username && (username.length < 3 || username.length > 30)) {
        throw error(400, 'Username must be between 3 and 30 characters');
    }

    if (username) {
        const alphanumericRegex = /^[a-z0-9_]+$/;
        if (!alphanumericRegex.test(username)) {
            throw error(400, 'Username must contain only lowercase letters, numbers, and underscores');
        }
    }

    if (username && !(await isNameAppropriate(username))) {
        throw error(400, 'Username contains inappropriate content');
    }

    if (bio && !(await isNameAppropriate(bio))) {
        throw error(400, 'Bio contains inappropriate content');
    }

    if (avatarFile && avatarFile.size > MAX_FILE_SIZE) {
        throw error(400, 'Avatar file must be smaller than 1MB');
    }
}

export async function POST({ request }) {
    const session = await auth.api.getSession({
        headers: request.headers
    });

    if (!session?.user) {
        throw error(401, 'Not authenticated');
    }

    const formData = await request.formData();
    const name = (formData.get('name') as string)?.trim();
    const bio = formData.get('bio') as string;
    const username = (formData.get('username') as string)?.toLowerCase().trim();
    const avatarFile = formData.get('avatar') as File | null;

    await validateInputs(name, bio, username, avatarFile);

    const updates: Record<string, any> = {
        name,
        bio,
        username,
        updatedAt: new Date()
    };

    if (avatarFile && avatarFile.size > 0) {
        try {
            const arrayBuffer = await avatarFile.arrayBuffer();
            const key = await uploadProfilePicture(
                session.user.id,
                new Uint8Array(arrayBuffer),
                avatarFile.type,
                avatarFile.size
            );
            updates.image = key;
        } catch (e) {
            console.error('Avatar upload failed, continuing without update:', e);
        }
    }

    await db.update(user)
        .set(updates)
        .where(eq(user.id, Number(session.user.id)));

    return json({ success: true });
}
