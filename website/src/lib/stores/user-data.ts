import { writable } from 'svelte/store';

export type User = {
    id: string;
    name: string;
    username: string;
    email: string;
    isAdmin: boolean;
    image: string;
    isBanned: boolean;
    banReason: string | null;
    avatarUrl: string | null;

    baseCurrencyBalance: number;
    bio: string;

    volumeMaster: number;
    volumeMuted: boolean;

    nameColor: string | null;
    founderBadge: boolean;
    prestigeLevel: number;
    disableMentions: boolean;
    hideAds: boolean;
} | null;

export const USER_DATA = writable<User>(null);