// Global types for the engine. 

export type PokerPhase = "waiting" | "preflop" | "flop" | "turn" | "river" | "showdown"; // maybe add more? idk.
export type PokerAction = "fold" | "check" | "call" | "raise" | "all_in";

export interface SidePot { // for the sidepots, since you can have multiple when multiple people go all in with different amounts.
    minChipsBet: number;
    pot: number;
}

export interface PokerPlayer { // each pokerplayer has a lot of data to them. Might need to reduce it a bit?
    userId: number;
    username: string;
    avatar: string | null;
    chips: number;
    holeCards: string[];
    chipsBet: number; // called chips across the whole engine, but its just money / bet amount for now.
    currentBet: number;
    folded: boolean;
    allIn: boolean;
    hasActed: boolean;
    alreadyBet: boolean; // checks if arleady did a action etc.
    seatIndex: number;
    isConnected: boolean;
    lastSeen: number;
    isSpectator?: boolean; // Not yet implemented fully
}

export interface WinnerInfo { // type for the player who actually wont he round
    userId: number;
    amount: number;
    handName: string;
    holeCards: string[];
}

export interface PokerTable { // also a lot of data here, explains itself though
    tableId: string; // longer server side id
    code: string; // the 4 digit code to join
    hostUserId: number; // general data and for the owner management
    buyIn: number;
    blinds: { small: number; big: number };
    maxPlayers: number; // 1-6 so far. since UI cant handle more atp.
    players: PokerPlayer[];
    deck: string[];
    communityCards: string[];
    pot: number;
    callAmount: number; // is used to basically check if the player can even stay in atp.
    lastRaiseAmount: number; // this is the stuff to automatically display and validate the raise amount based ont he last one.
    sidepots: SidePot[]; // Sidepots! For going all in etc.
    phase: PokerPhase;
    dealerIndex: number;
    activePlayerIndex: number;
    lastActivity: number;
    handNumber: number;
    winners: WinnerInfo[] | null;
}

export interface PublicPokerPlayer { // this is the data the other players get. the other one above is server side
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
    isSpectator?: boolean; // just future proofing yk. Since I already know your lazy ahh (Im talking to you face) will take ages, by the time this hopefully gets merged, I will probably have added this
}

export interface PublicPokerState { // as the one above, the data the clients actually get. For example when they reload their page, and need to re-join automatically.
    tableId: string;
    code: string;
    hostUserId: number;
    buyIn: number;
    blinds: { small: number; big: number };
    maxPlayers: number;
    phase: PokerPhase;
    communityCards: string[];
    pot: number;
    currentBet: number;
    minRaise: number;
    sidepots: SidePot[];
    dealerIndex: number;
    activePlayerIndex: number;
    handNumber: number;
    winners: WinnerInfo[] | null;
    players: PublicPokerPlayer[];
    yourIndex: number;
}
