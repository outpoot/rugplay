export interface Comment {
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

    userBio: string | null;
    userCreatedAt: string;
    userIsAdmin: boolean;
}

export interface CommentLike {
    userId: number;
    commentId: number;
    createdAt: string;
}
