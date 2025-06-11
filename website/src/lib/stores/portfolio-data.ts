import { writable } from 'svelte/store';

export interface PortfolioSummary {
    baseCurrencyBalance: number;
    totalCoinValue: number;
    totalValue: number;
    currency: string;
}

export interface PortfolioData extends PortfolioSummary {
    coinHoldings: Array<{
        symbol: string;
        quantity: number;
        currentPrice: number;
        value: number;
        percentageChange: number;
        change24h: number;
        icon?: string;
        portfolioPercent: number;
    }>;
}

export const PORTFOLIO_SUMMARY = writable<PortfolioSummary | null>(null);

export const PORTFOLIO_DATA = writable<PortfolioData | null>(null);

export async function fetchPortfolioSummary() {
    try {
        const response = await fetch('/api/portfolio/summary');
        if (response.ok) {
            const data = await response.json();
            PORTFOLIO_SUMMARY.set(data);
            return data;
        }
    } catch (error) {
        console.error('Failed to fetch portfolio summary:', error);
    }
    return null;
}

export async function fetchPortfolioData() {
    try {
        const response = await fetch('/api/portfolio/total');
        if (response.ok) {
            const data = await response.json();
            PORTFOLIO_DATA.set(data);
            PORTFOLIO_SUMMARY.set({
                baseCurrencyBalance: data.baseCurrencyBalance,
                totalCoinValue: data.totalCoinValue,
                totalValue: data.totalValue,
                currency: data.currency
            });
            return data;
        }
    } catch (error) {
        console.error('Failed to fetch portfolio data:', error);
    }
    return null;
}
