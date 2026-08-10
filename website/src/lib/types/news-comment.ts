export interface NewsComment {
	id: number;
	content: string;
	likesCount: number;
	createdAt: string;
	updatedAt: string;
	userId: number;
	userName: string;
	userUsername: string;
	userImage: string | null;
	userNameColor: string | null;
	isLikedByUser: boolean;
}

export interface NewsReactionCreator {
	userId: number | null;
	username: string | null;
	name: string | null;
	nameColor: string | null;
}

export interface NewsReactionSlot {
	id: number;
	emoji: string;
	count: number;
	reactedByMe: boolean;
	createdByUserId: number | null;
	createdByUsername: string | null;
	createdByName: string | null;
	createdByNameColor: string | null;
}
