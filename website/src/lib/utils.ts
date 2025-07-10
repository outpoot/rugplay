import { PUBLIC_B2_BUCKET, PUBLIC_B2_ENDPOINT } from "$env/static/public";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { volumeSettings } from '$lib/stores/volume-settings';
import { get } from 'svelte/store';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

export function getTimeBasedGreeting(name: string): string {
    const hour = new Date().getHours();

    if (hour < 12) {
        return `Good morning, ${name}`;
    } else if (hour < 17) {
        return `Good afternoon, ${name}`;
    } else if (hour < 22) {
        return `Good evening, ${name}`;
    } else {
        return `Good night, ${name}`;
    }
}

export function getPublicUrl(key: string | null): string | null {
    if (!key) return null;
    return `/api/proxy/s3/${key}`;
}

export function debounce(func: (...args: any[]) => void, wait: number) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    return function executedFunction(...args: any[]) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function formatPrice(price: number): string {
    if (typeof price !== 'number' || isNaN(price)) return '$0.00';
    if (price < 0.01) {
        return price.toFixed(6);
    } else if (price < 1) {
        return price.toFixed(4);
    } else {
        return price.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
}

export function formatValue(value: number | string): string {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (typeof numValue !== 'number' || isNaN(numValue)) return '$0.00';
    if (numValue >= 1e9) return `$${(numValue / 1e9).toFixed(2)}B`;
    if (numValue >= 1e6) return `$${(numValue / 1e6).toFixed(2)}M`;
    if (numValue >= 1e3) return `$${(numValue / 1e3).toFixed(2)}K`;

    if (numValue < 0.01) {
        const str = numValue.toString();
        const match = str.match(/^0\.0*(\d{2})/);
        if (match) {
            const zerosAfterDecimal = str.indexOf(match[1]) - 2;
            return `$${numValue.toFixed(zerosAfterDecimal + 2)}`;
        }
    }

    return `$${numValue.toFixed(2)}`;
}

export function formatQuantity(value: number): string {
    if (typeof value !== 'number' || isNaN(value)) return '0';
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toLocaleString();
}

export function formatDate(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function formatDateWithYear(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export function formatRelativeTime(timestamp: string | Date): string {
    const now = new Date();
    const past = new Date(timestamp);
    const ms = now.getTime() - past.getTime();

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return `${seconds}s`;
    if (minutes < 60) return `${minutes}m`;

    if (hours < 24) {
        const extraMinutes = minutes % 60;
        return extraMinutes === 0 ? `${hours}hr` : `${hours}hr ${extraMinutes}m`;
    }

    if (days < 7) return `${days}d`;

    const yearsDiff = now.getFullYear() - past.getFullYear();
    const monthsDiff = now.getMonth() - past.getMonth();
    const totalMonths = yearsDiff * 12 + monthsDiff;
    const adjustedMonths = totalMonths + (now.getDate() < past.getDate() ? -1 : 0);
    const years = Math.floor(adjustedMonths / 12);

    if (adjustedMonths < 1) {
        const weeks = Math.floor(days / 7);
        const extraDays = days % 7;
        return extraDays === 0 ? `${weeks}w` : `${weeks}w ${extraDays}d`;
    }

    if (years < 1) {
        const tempDate = new Date(past);
        tempDate.setMonth(tempDate.getMonth() + adjustedMonths);
        const remainingDays = Math.floor((now.getTime() - tempDate.getTime()) / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(remainingDays / 7);
        return weeks === 0 ? `${adjustedMonths}m` : `${adjustedMonths}m ${weeks}w`;
    }

    const remainingMonths = adjustedMonths % 12;
    return remainingMonths === 0 ? `${years}y` : `${years}y ${remainingMonths}m`;
}

export function formatTimeAgo(date: string) {
    const now = new Date();
    const commentDate = new Date(date);
    const diffMs = now.getTime() - commentDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}

export function formatTimeRemaining(timeMs: number): string {
    const hours = Math.floor(timeMs / (60 * 60 * 1000));
    const minutes = Math.floor((timeMs % (60 * 60 * 1000)) / (60 * 1000));

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

export function formatTimeUntil(date: Date | string | number): string {
    const now = Date.now();
    const target = typeof date === 'number'
        ? date * (date < 1e12 ? 1000 : 1)
        : new Date(date).getTime();
    let diff = Math.max(0, target - now);

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (diff < 60000) return 'less than 1m';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
}

export function getExpirationDate(option: string): string | null {
    if (!option) return null;

    const now = new Date();
    switch (option) {
        case '1h':
            return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
        case '1d':
            return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
        case '3d':
            return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
        case '7d':
            return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        case '30d':
            return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        default:
            return null;
    }
}

export function getTimeframeInSeconds(timeframe: string): number {
    switch (timeframe) {
        case '1m':
            return 60;
        case '5m':
            return 300;
        case '15m':
            return 900;
        case '1h':
            return 3600;
        case '4h':
            return 14400;
        case '1d':
            return 86400;
        default:
            return 60;
    }
}

//
let availableSounds = [1, 2, 3, 4, 5, 6, 7];

export function playRandomFireworkSound() {
    if (availableSounds.length === 0) {
        availableSounds = [1, 2, 3, 4, 5, 6, 7];
    }

    const randomIndex = Math.floor(Math.random() * availableSounds.length);
    const soundNumber = availableSounds[randomIndex];

    availableSounds = availableSounds.filter((_, index) => index !== randomIndex);

    playSound(`firework${soundNumber}`);
}

export function playSound(sound: string) {
    try {
        const settings = get(volumeSettings);

        if (settings.muted) {
            return;
        }

        const audio = new Audio(`/sound/${sound}.mp3`);
        audio.volume = Math.max(0, Math.min(1, settings.master));
        audio.play().catch(console.error);
    } catch (error) {
        console.error('Error playing sound:', error);
    }
}

export function showConfetti(confetti: any) {
    const duration = 2 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
    }

    playRandomFireworkSound();

    const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });

        if (Math.floor(timeLeft / 500) !== Math.floor((timeLeft - 250) / 500)) {
            playRandomFireworkSound();
        }
    }, 250);
}

export function showSchoolPrideCannons(confetti: any) {
    const end = Date.now() + (3 * 1000);
    const colors = ['#bb0000', '#ffffff'];
    playSound('cannon');
    playSound('win');

    setTimeout(() => {
        playSound('cannon');
    }, 100);

    (function frame() {
        confetti({
            particleCount: 2,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors
        });
        confetti({
            particleCount: 2,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    }());
}

export const formatMarketCap = formatValue;

export function timeToLocal(originalTime: number): number {
    const d = new Date(originalTime * 1000);
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()) / 1000);
}

export const PRESTIGE_COSTS = {
	1: 100_000,
	2: 250_000,
	3: 1_000_000,
	4: 5_000_000,
	5: 25_000_000
} as const;

export const PRESTIGE_NAMES = {
	1: 'Prestige I',
	2: 'Prestige II',
	3: 'Prestige III',
	4: 'Prestige IV',
	5: 'Prestige V'
} as const;

export const PRESTIGE_COLORS = {
	1: 'text-blue-500',
	2: 'text-purple-500',
	3: 'text-yellow-500',
	4: 'text-orange-500',
	5: 'text-red-500'
} as const;

export function getPrestigeName(level: number): string | null {
    if (level <= 0) return null;
    const clampedLevel = Math.min(level, 5) as keyof typeof PRESTIGE_NAMES;
    return PRESTIGE_NAMES[clampedLevel];
}

export function getPrestigeCost(level: number): number | null {
    if (level <= 0) return null;
    const clampedLevel = Math.min(level, 5) as keyof typeof PRESTIGE_COSTS;
    return PRESTIGE_COSTS[clampedLevel];
}

export function getPrestigeColor(level: number): string {
    if (level <= 0) return 'text-gray-500';
    const clampedLevel = Math.min(level, 5) as keyof typeof PRESTIGE_COLORS;
    return PRESTIGE_COLORS[clampedLevel];
}

export function getMaxPrestigeLevel(): number {
    return 5;
}

export function calculateMinesMultiplier(picks: number, mines: number, betAmount: number): number {
    const TOTAL_TILES = 25;
    const HOUSE_EDGE = 0.05;

    let probability = 1;
    for (let i = 0; i < picks; i++) {
        probability *= (TOTAL_TILES - mines - i) / (TOTAL_TILES - i);
    }
    if (probability <= 0) return 1.0;

    const fairMultiplier = (1 / probability) * (1 - HOUSE_EDGE);

    // Backend payout cap logic
    const MAX_PAYOUT = 2_000_000;
    const HIGH_BET_THRESHOLD = 50_000;
    const mineFactor = 1 + (mines / 25);
    const baseMultiplier = (1.4 + Math.pow(picks, 0.45)) * mineFactor;
    let maxPayout: number;
    if (betAmount > HIGH_BET_THRESHOLD) {
        const betRatio = Math.pow(Math.min(1, (betAmount - HIGH_BET_THRESHOLD) / (MAX_PAYOUT - HIGH_BET_THRESHOLD)), 1);
        const maxAllowedMultiplier = 1.05 + (picks * 0.1);
        const highBetMultiplier = Math.min(baseMultiplier, maxAllowedMultiplier) * (1 - (betAmount / MAX_PAYOUT) * 0.9);
        const betSizeFactor = Math.max(0.1, 1 - (betAmount / MAX_PAYOUT) * 0.9);
        const minMultiplier = (1.1 + (picks * 0.15 * betSizeFactor)) * mineFactor;
        const reducedMultiplier = highBetMultiplier - ((highBetMultiplier - minMultiplier) * betRatio);
        maxPayout = Math.min(betAmount * reducedMultiplier, MAX_PAYOUT);
    } else {
        maxPayout = Math.min(betAmount * baseMultiplier, MAX_PAYOUT);
    }
    const rawPayout = fairMultiplier * betAmount;
    const cappedPayout = Math.min(rawPayout, maxPayout);
    const effectiveMultiplier = cappedPayout / betAmount;
    return Math.max(1.0, Number(effectiveMultiplier.toFixed(2)));
}
