export interface PromoCode {
	id: number;
	code: string;
	description?: string;
	rewardAmount: string;
	maxUses?: number;
	isActive: boolean;
	expiresAt?: string;
	createdAt: string;
	createdBy?: number;
	usedCount?: number;
}

export interface PromoCodeRedemption {
	id: number;
	userId: number;
	promoCodeId: number;
	rewardAmount: string;
	redeemedAt: string;
}
