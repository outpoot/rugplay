import { error } from '@sveltejs/kit';

export async function load({ params, fetch }) {
    const { username } = params;

    try {
        const response = await fetch(`/api/user/${username}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw error(404, 'User not found');
            }
            throw error(500, 'Failed to load user profile');
        }

        const profileData = await response.json();
        
        return {
            username,
            profileData,
            recentTransactions: profileData.recentTransactions || []
        };
    } catch (e) {
        console.error('Failed to fetch user profile:', e);
        throw error(500, 'Failed to load user profile');
    }
}
