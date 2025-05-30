export async function isNameAppropriate(name: string): Promise<boolean> {
    try {
        const response = await fetch('http://moderation-moderation-service-1:9999', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name }),
        });

        if (!response.ok) {
            console.error('Moderation service error:', response.status, response.statusText);
            return true;
        }

        const result = await response.json();
        return result.appropriate !== false;
    } catch (error) {
        console.error('Failed to check name with moderation service:', error);
        return true;
    }
}
