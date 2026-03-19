export interface WinnerInfo { // Same Winnerinfo interface as in the engine
	userId: number;
	amount: number;
	handName: string;
	holeCards: string[];
}

export interface GameState { // Basically all of the types of the pokerengine lib pressed into one
	tableId: string;
	code: string;
	hostUserId: number;
	buyIn: number;
	blinds: { small: number; big: number };
	maxPlayers: number;
	phase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
	communityCards: string[];
	pot: number;
	currentBet: number;
	dealerIndex: number; // basically the player who can currently play
	activePlayerIndex: number;
	minRaise: number;
	handNumber: number;
	winners: WinnerInfo[] | null;
	players: PublicPokerPlayer[];
	yourIndex: number;
	newBalance?: number;
}

export interface PublicPokerPlayer { // also that public type as in the engine
	userId: number;
	username: string;
	avatar: string | null;
	chips: number;
	holeCards: string[];
	cardCount: number;
	currentBet: number;
	totalBet: number;
	folded: boolean;
	allIn: boolean;
	hasActed: boolean;
	seatIndex: number;
	isConnected: boolean;
	isSpectator?: boolean;
}
