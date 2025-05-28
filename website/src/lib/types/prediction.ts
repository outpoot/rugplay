export interface PredictionQuestion {
	id: number;
	question: string;
	description: string;
	aiResolution: boolean;
	status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED';
	resolutionDate: string;
	totalAmount: number;
	yesAmount: number;
	noAmount: number;
	yesPercentage: number;
	noPercentage: number;
	createdAt: string;
	resolvedAt: string | null;
	requiresWebSearch: boolean;
	creator: {
		id: number;
		name: string;
		username: string;
		image: string;
	};
	userBets?: {
		yesAmount: number;
		noAmount: number;
		totalAmount?: number;
		estimatedYesWinnings?: number;
		estimatedNoWinnings?: number;
	};
	recentBets?: Array<{
		id: number;
		side: boolean;
		amount: number;
		createdAt: string;
		user: {
			id: number;
			name: string;
			username: string;
			image: string;
		};
	}>;
}
