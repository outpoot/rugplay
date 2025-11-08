import { error } from '@sveltejs/kit';

export async function load({ params, fetch }) {
	const questionId = parseInt(params.id);

	if (isNaN(questionId)) {
		throw error(400, 'Invalid question ID');
	}

	try {
		const response = await fetch(`/api/hopium/questions/${questionId}`);

		if (!response.ok) {
			if (response.status === 404) {
				throw error(404, 'Question not found');
			}
			throw error(500, 'Failed to load question');
		}

		const result = await response.json();

		return {
			questionId,
			question: result.question || result,
			probabilityData: result.probabilityHistory || []
		};
	} catch (e) {
		console.error('Failed to fetch question:', e);
		throw error(500, 'Failed to load question');
	}
}
